import { spawn } from "node:child_process"

import { MailCatcher } from "./MailCatcher"
import type { CaughtMail, Mail, Mailer } from "./signIn.types"

/** Where a Mac or Linux machine keeps its mail command. */
const SENDMAIL = "/usr/sbin/sendmail"

/**
 * - `-t`:  who it's to comes from the message's headers
 * - `-i`:  a line holding only a dot doesn't end the message
 */
const SENDMAIL_ARGS = ["-t", "-i"]

/** How long the mail command may take, ms:  then it's stopped, and the mail counts as not sent. */
const SENDMAIL_MS = 30_000

/** One plain email address:  with `-t` a second one in the `To` header would be mailed too. */
const ONE_ADDRESS = /^[^\s<>,;:"()@]+@[^\s<>,;:"()@]+$/

/** The most of a subject, in bytes, each encoded word holds:  a header line's limit, once encoded. */
const ENCODED_WORD_BYTES = 45

/****************
 * ### `SendmailSender`
 * Real mail through this machine's own `sendmail` command, a `Mailer` (epic `atmosphere` T55):
 * for a machine whose mail is already set up, such as a Mac whose postfix relays to a mail service.
 *
 * ```ts
 * new SendmailSender({ from: "Spell <sign-in@spell.app>", keep: new MailCatcher({ folder }) })
 * ```
 *
 * - Each mail is piped in as a whole message, with its headers (`messageFor()`).
 * - Run without a shell, and a `To` must be one plain address, so what a mail says can't add a recipient.
 * - Throws if the command fails, so the sign-in says so and the retry queue tries again.
 * - Once sent, each is kept in its catcher too, so `spell space cloud mail` still shows it.
 * - On only when asked for:  `mailerFor()`.
 * - Node only;  it knows nothing of who's signing in, or why.
 ****************/
export class SendmailSender implements Mailer {
  /** Who it's from:  `sign-in@spell.app`, or `Spell <sign-in@spell.app>`. */
  private readonly from: string
  /** Where each mail is kept, once sent. */
  private readonly keep: MailCatcher
  /** The mail command. */
  private readonly sendmail: string
  /** The time now. */
  private readonly now: () => Date

  /** - throws `TypeError` for a `from` that isn't one line */
  constructor({ from, keep, sendmail = SENDMAIL, now = () => new Date() }: SendmailSenderProps) {
    if (!from.trim() || /[\r\n]/.test(from)) {
      throw new TypeError(
        "SendmailSender:  no usable From address;  set SPELL_MAIL_FROM to one line, sign-in@spell.app"
      )
    }
    this.from = from.trim()
    this.keep = keep
    this.sendmail = sendmail
    this.now = now
  }

  /**
   * SIDE EFFECT:  `mail` goes out, then it's kept.
   * - throws `TypeError` for a `to` that isn't one plain address;  `Error` if the mail command fails
   */
  async send(mail: Mail): Promise<void> {
    await this.pipe(messageFor(mail, this.from, this.now()))
    await this.keep.send(mail)
  }

  /** Every mail it sent, newest first. */
  caught(): Promise<CaughtMail[]> {
    return this.keep.caught()
  }

  /** Hand `message` to the mail command.  - throws if it can't be run, or says no */
  private pipe(message: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const child = spawn(this.sendmail, SENDMAIL_ARGS, {
        stdio: ["pipe", "ignore", "pipe"],
        timeout: SENDMAIL_MS
      })
      let said = ""
      child.stderr.on("data", (chunk) => (said += chunk))
      child.on("error", (error) => reject(new Error(`can't run ${this.sendmail}:  ${error.message}`, { cause: error })))
      child.on("close", (code) => {
        if (code === 0) return resolve()
        reject(new Error(`${this.sendmail} failed (${code ?? "stopped"}):  ${said.trim() || "it said nothing"}`))
      })
      // a command that exits early is reported by "close":  this only stops the broken pipe from throwing
      child.stdin.on("error", (ignored) => console.error("SendmailSender:  the mail command stopped reading", ignored))
      child.stdin.end(message, "utf8")
    })
  }
}

/** Constructor props of a `SendmailSender`. */
export type SendmailSenderProps = {
  /** Who it's from:  `sign-in@spell.app`, or `Spell <sign-in@spell.app>`. */
  from: string
  /** Where each mail is kept, once sent. */
  keep: MailCatcher
  /** The mail command:  default the system's.  A test's own, so a test never sends. */
  sendmail?: string
  /** The time now;  default the clock. */
  now?: () => Date
}

/**
 * How a server sends its mail:  the local catcher, or the system's `sendmail` when `via` says so.
 * - The page server and the cloud each ask this, with the folder their mail is kept in.
 * - throws `TypeError` for a `via` it doesn't know, or `"sendmail"` with no `from`
 */
export function mailerFor({ folder, via, from, sendmail }: MailerSetting): Mailer {
  const keep = new MailCatcher({ folder })
  if (!via) return keep
  if (via !== "sendmail")
    throw new TypeError(`mailerFor():  SPELL_MAIL is "${via}";  it can only be "sendmail", or unset`)
  return new SendmailSender({ from: from ?? "", keep, ...(sendmail && { sendmail }) })
}

/** What `mailerFor()` takes. */
export type MailerSetting = {
  /** Where the mail is kept. */
  folder: string
  /** How it's sent:  `"sendmail"`;  left out or empty, only caught. */
  via?: string
  /** Who it's from, with `sendmail`. */
  from?: string
  /** The mail command:  default the system's. */
  sendmail?: string
}

/**
 * `mail` as a whole message, for the mail command:  its headers, a blank line, its text.
 * - Lines end in a plain newline:  the mail command turns them into the network's.
 * - throws `TypeError` for a `to` that isn't one plain address
 */
export function messageFor(mail: Mail, from: string, date: Date): string {
  if (!ONE_ADDRESS.test(mail.to)) {
    throw new TypeError(`SendmailSender:  "${mail.to}" isn't one plain email address, so nothing was sent`)
  }
  return [
    `From: ${from}`,
    `To: ${mail.to}`,
    `Subject: ${subjectHeader(mail.subject)}`,
    `Date: ${date.toUTCString().replace(/GMT$/, "+0000")}`,
    "MIME-Version: 1.0",
    "Content-Type: text/plain; charset=UTF-8",
    "Content-Transfer-Encoding: 8bit",
    "",
    mail.text.replace(/\r\n?/g, "\n"),
    ""
  ].join("\n")
}

/** A subject as a header's value:  on one line, and encoded when it isn't plain ASCII. */
function subjectHeader(subject: string): string {
  const oneLine = subject.replace(/[\r\n]+/g, " ")
  if (/^[\x20-\x7e]*$/.test(oneLine)) return oneLine
  const words: string[] = []
  let word = ""
  for (const letter of oneLine) {
    if (Buffer.byteLength(word + letter) > ENCODED_WORD_BYTES) {
      words.push(word)
      word = ""
    }
    word += letter
  }
  words.push(word)
  return words.map((each) => `=?UTF-8?B?${Buffer.from(each).toString("base64")}?=`).join("\n ")
}
