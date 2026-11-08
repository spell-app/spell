/**
 * `SendmailSender`:  real mail through the system's mail command (epic `atmosphere` T55).
 * - Always a stand-in command, written here:  a test NEVER runs the real `sendmail`.
 */
import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterAll, describe, expect, test } from "vite-plus/test"

import { MailCatcher, SendmailSender, mailerFor, messageFor } from "spell/server/signIn"

const folder = mkdtempSync(join(tmpdir(), "spell-sendmail-"))
const received = join(folder, "received.txt")
const argsGiven = join(folder, "args.txt")
const MAIL = { to: "ana@example.com", subject: "Sign in to Spell", text: "Your code:\n123456\n" }
const NOW = new Date("2026-11-08T18:00:00Z")

/** A stand-in mail command running `script`. */
function fakeSendmail(name: string, script: string): string {
  const file = join(folder, name)
  writeFileSync(file, `#!/bin/sh\n${script}\n`)
  chmodSync(file, 0o755)
  return file
}

/** A sender using `sendmail`, keeping its mail in a folder named `name`. */
function senderWith(sendmail: string, name: string) {
  const keep = new MailCatcher({ folder: join(folder, name) })
  return { keep, sender: new SendmailSender({ from: "sign-in@spell.app", keep, sendmail, now: () => NOW }) }
}

afterAll(() => rmSync(folder, { recursive: true, force: true }))

describe("a mail through the system's mail command", () => {
  const WORKS = () => fakeSendmail("works", `echo "$@" > "${argsGiven}"\ncat > "${received}"`)

  test("the whole message is piped in, and who it's to comes from its headers", async () => {
    await senderWith(WORKS(), "works-mail").sender.send(MAIL)
    expect(readFileSync(argsGiven, "utf8").trim()).toBe("-t -i")
    expect(readFileSync(received, "utf8")).toBe(
      [
        "From: sign-in@spell.app",
        "To: ana@example.com",
        "Subject: Sign in to Spell",
        "Date: Sun, 08 Nov 2026 18:00:00 +0000",
        "MIME-Version: 1.0",
        "Content-Type: text/plain; charset=UTF-8",
        "Content-Transfer-Encoding: 8bit",
        "",
        "Your code:",
        "123456",
        "",
        ""
      ].join("\n")
    )
  })

  test("once sent, it's kept too, so the catcher still shows it", async () => {
    const { keep, sender } = senderWith(WORKS(), "kept-mail")
    await sender.send(MAIL)
    expect((await keep.newestTo(MAIL.to))?.text).toBe(MAIL.text)
    expect(await sender.caught()).toHaveLength(1)
  })

  test("a command that says no fails loudly, and nothing is kept:  the retry queue tries again", async () => {
    const { keep, sender } = senderWith(fakeSendmail("fails", 'echo "no relay" >&2\nexit 75'), "failed-mail")
    await expect(sender.send(MAIL)).rejects.toThrow(/failed \(75\):  no relay/)
    expect(await keep.caught()).toEqual([])
  })

  test("a command that isn't there fails loudly", async () => {
    await expect(senderWith(join(folder, "nothing-here"), "missing-mail").sender.send(MAIL)).rejects.toThrow(
      /can't run/
    )
  })

  test("nothing a mail says adds a recipient, or a header", async () => {
    for (const to of ["ana@example.com\nBcc: eve@example.com", "ana@example.com, eve@example.com", "$(rm -rf /)"]) {
      expect(() => messageFor({ ...MAIL, to }, "a@spell.app", NOW), to).toThrow(TypeError)
    }
    const message = messageFor({ ...MAIL, subject: "Hi\r\nBcc: eve@example.com" }, "a@spell.app", NOW)
    expect(message).toContain("Subject: Hi Bcc: eve@example.com\n")
    expect(message).not.toMatch(/^Bcc:/m)
  })

  test("a subject that isn't plain ASCII is encoded, in header-sized words", () => {
    const subject = "Tu bandeja en la organización:  ".repeat(4)
    const header = /^Subject: ((?:.*\n )*.*)$/m.exec(messageFor({ ...MAIL, subject }, "a@spell.app", NOW))![1]!
    const words = header.split("\n ")
    expect(words.length).toBeGreaterThan(1)
    for (const word of words) expect(word.length).toBeLessThanOrEqual(75)
    const decoded = words.map((word) => Buffer.from(word.slice(10, -2), "base64").toString()).join("")
    expect(decoded).toBe(subject)
  })
})

describe("mailerFor()", () => {
  const at = join(folder, "chosen")

  test("unset:  only the catcher", () => {
    expect(mailerFor({ folder: at })).toBeInstanceOf(MailCatcher)
    expect(mailerFor({ folder: at, via: "", from: "a@spell.app" })).toBeInstanceOf(MailCatcher)
  })

  test("sendmail:  the sender, which needs a From", () => {
    const sendmail = join(folder, "never-run")
    expect(mailerFor({ folder: at, via: "sendmail", from: "a@spell.app", sendmail })).toBeInstanceOf(SendmailSender)
    expect(() => mailerFor({ folder: at, via: "sendmail", sendmail })).toThrow(/SPELL_MAIL_FROM/)
  })

  test("anything else is a mistake, said out loud", () => {
    expect(() => mailerFor({ folder: at, via: "smtp" })).toThrow(/SPELL_MAIL/)
  })
})
