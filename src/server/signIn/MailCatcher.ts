import { randomBytes } from "node:crypto"
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"

import type { CaughtMail, Mail, Mailer } from "./signIn.types"

/****************
 * ### `MailCatcher`
 * Spell's own local mail catcher:  every mail is a file in a folder, and nothing leaves the machine (epic `atmosphere` P3).
 *
 * ```ts
 * new SignInCheck({ signIns, mailer: new MailCatcher({ folder: "~/.spell/sign-in/mail" }), accounts })
 * ```
 *
 * - One JSON file per mail, `<time>-<order>-<random>.json`:  `{ to, subject, text, sentAt }`.
 *   - `<order>` counts the mails sent in the same millisecond, so the newest still sorts first:
 *     with the random part alone, two mails in one millisecond came back in either order.
 * - `caught()`:  every one, newest first.
 *   The sign-in's mail page lists them (`MAIL_PAGE`), and tests read the link and code from them.
 * - For tests and this machine.
 *   Real mail goes through a mail service, behind the same `Mailer` seam, once Q12 is answered.
 ****************/
export class MailCatcher implements Mailer {
  /** Where the mail goes. */
  readonly folder: string
  /** The time now, ms. */
  private readonly now: () => number
  /** The last mail's time, ms, and how many went at that time before the next. */
  private last = { sentAt: 0, count: 0 }

  constructor({ folder, now = Date.now }: MailCatcherProps) {
    this.folder = folder
    this.now = now
  }

  /** Keep `mail`, a file of its own. */
  async send(mail: Mail): Promise<void> {
    mkdirSync(this.folder, { recursive: true })
    const sentAt = this.now()
    this.last = sentAt === this.last.sentAt ? { sentAt, count: this.last.count + 1 } : { sentAt, count: 0 }
    const order = String(this.last.count).padStart(4, "0")
    const file = `${sentAt}-${order}-${randomBytes(4).toString("hex")}.json`
    writeFileSync(join(this.folder, file), `${JSON.stringify({ ...mail, sentAt }, null, 2)}\n`, { mode: 0o600 })
  }

  /** Every mail it kept, newest first.  A file that won't read is left out. */
  async caught(): Promise<CaughtMail[]> {
    let files: string[]
    try {
      files = readdirSync(this.folder).filter((file) => file.endsWith(".json"))
    } catch {
      return []
    }
    const mails: CaughtMail[] = []
    for (const file of files.sort().reverse()) {
      try {
        mails.push({ ...(JSON.parse(readFileSync(join(this.folder, file), "utf8")) as CaughtMail), file })
      } catch (ignored) {
        console.error(`MailCatcher:  ${file} won't read`, ignored)
      }
    }
    return mails
  }

  /** The newest mail to `to`;  `undefined` for none.  For a test, and the mail page. */
  async newestTo(to: string): Promise<CaughtMail | undefined> {
    return (await this.caught()).find((mail) => mail.to === to)
  }
}

/** Constructor props of a `MailCatcher`. */
export type MailCatcherProps = {
  /** Where the mail goes:  a folder, made as the first mail comes. */
  folder: string
  /** The time now, ms;  default `Date.now`. */
  now?: () => number
}
