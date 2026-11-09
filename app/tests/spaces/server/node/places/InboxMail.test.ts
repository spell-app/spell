/**
 * Email and subscriptions (epic `atmosphere` P30):  each person chooses how they hear of their inbox, one mail per
 * message, a daily digest or nothing;  anyone in the org subscribes to a shared space, and hears what's new there.
 * - A small RS:  Ana is the Board, Ada an Admin, Bo manages the Events Team;  Cy and Vic are in RS.
 * - Through the page server's places (`SpaceFolders`), as each person, every mail caught in a folder (`MailCatcher`).
 */
import { mkdtempSync, rmSync } from "fs"
import { tmpdir } from "os"
import { join } from "path"
import { afterAll, beforeAll, describe, expect, test } from "vite-plus/test"

import type { PlaceChange, PlaceRow } from "spell/places/places.types"
import { MailCatcher, ReadCredentials, type CaughtMail, type Mail, type Mailer } from "spell/server/signIn"
import { SP } from "spell/parser/spell"
import { OrgRoles } from "spell/app/spaces/server/node/people/OrgRoles"
import { PeopleStore, orgFile, personFile } from "spell/app/spaces/server/node/people/PeopleStore"
import { InboxMail } from "spell/app/spaces/server/node/places/InboxMail"
import { SpaceFolders } from "spell/app/spaces/server/node/places/SpaceFolders"
import { DiskStorage } from "spell/app/spaces/server/node/storage/DiskStorage"

/** RS's people, and their role in its org file. */
const RS: Record<string, string> = { ana: "editor", ada: "editor", bo: "editor", cy: "editor", vic: "viewer" }

/** The server's address, as each mail's links start. */
const ADDRESS = "https://spell.test"

const root = mkdtempSync(join(tmpdir(), "spell-inbox-mail-"))
const storage = new DiskStorage(root)
const people = new PeopleStore(storage)
const catcher = new MailCatcher({ folder: join(root, "mail") })

/** Fails its first `failures` sends, then hands each to the catcher:  the retry queue's test. */
class FlakyMailer implements Mailer {
  failures = 0
  async send(mail: Mail): Promise<void> {
    if (this.failures > 0) {
      this.failures--
      throw new Error("the mail service didn't answer")
    }
    await catcher.send(mail)
  }
}
const mailer = new FlakyMailer()

/** Where an address's folder is, under the test's root. */
const folderFor = (address: string) => join(root, ...SP.SpellUrls.folderFor(address)!.path.split("/"))

const folders = new SpaceFolders({
  folderFor,
  people,
  personFor: (request) => request.get("x-person") ?? "nobody@rs",
  queueFile: join(root, "queue.json"),
  credentials: new ReadCredentials(),
  mailer,
  address: () => ADDRESS
})
const roles: OrgRoles = folders.orgRoles
const mail: InboxMail = folders.mail!

/** `person` writes `changes` into the folder at `address`, as themselves. */
async function write(person: string, address: string, changes: PlaceChange[]) {
  const place = await folders.placeFor(address, person)
  return place!.apply!(changes, { identity: person })
}

/** `sender` sends `fields` as message `id`, and every copy and mail has gone. */
async function send(sender: string, id: string, fields: PlaceRow) {
  await write(sender, `${sender}/__inbox`, [{ kind: "insert", collection: "messages", id, fields: { id, ...fields } }])
  await (await folders.inboxOf(sender))!.settled
  await settled()
}

/** `person` says how they hear of their inbox. */
async function choose(person: string, how: string) {
  await write(person, `${person}/__inbox`, [
    { kind: "insert", collection: "mail_choices", id: "choice", fields: { id: "choice", how } }
  ])
}

/** Every mail sent so far, to `to`, oldest first. */
async function mailsTo(to: string): Promise<CaughtMail[]> {
  return (await catcher.caught()).filter((each) => each.to === to).reverse()
}

/** Wait for the mail an arrival queues:  its choice is read first, so it lands a moment after the copy. */
async function settled() {
  for (let tries = 0; tries < 50; tries++) {
    await new Promise((resolve) => setTimeout(resolve, 20))
    if (!mail.unsent.length) break
  }
  await mail.settled
}

/** The stop link in `text`. */
function stopLinkIn(text: string, words: RegExp): URL {
  const line = text.split("\n").find((each) => words.test(each))!
  return new URL(line.slice(line.indexOf("https://")))
}

/** Follow a stop link, as its server's route does. */
async function follow(link: URL) {
  const { person = "", what = "", signature = "" } = Object.fromEntries(link.searchParams)
  return mail.stop({ person, what, signature })
}

beforeAll(async () => {
  for (const id of Object.keys(RS)) {
    await storage.write(
      personFile(id, "rs"),
      JSON.stringify({ $type: "Person", id, names: id, emails: [`${id}@example.com`] })
    )
  }
  const members = Object.entries(RS).map(([id, role]) => ({
    $type: "Membership",
    person: { $ref: `Person#${id}@rs` },
    role
  }))
  await storage.write(orgFile("rs"), JSON.stringify({ $type: "Org", id: "rs", name: "RS", members }))
  await roles.setUp("rs", { board: "ana@rs" })
  await roles.give("rs", { role: "admins", person: "ada@rs" }, { by: "ana@rs" })
  await roles.addTeam("rs", { id: "events_team", name: "Events Team" }, { by: "ada@rs" })
  await roles.give("rs", { role: "team-manager", person: "bo@rs", of: "events_team" }, { by: "ada@rs" })
})

afterAll(() => {
  mail.close()
  folders.close()
  storage.close()
  rmSync(root, { recursive: true, force: true })
})

describe("how each person hears of their inbox", () => {
  test("Ana picks one mail per message:  Bo's message reaches her at once, with a link and a way to stop", async () => {
    await choose("ana@rs", "each")
    await send("bo@rs", "m-1", { text: "Can you bring chairs?", recipients: "ana@rs" })
    const [mailed] = await mailsTo("ana@example.com")
    expect(mailed!.subject).toBe("bo@rs wrote to you")
    expect(mailed!.text).toContain("Can you bring chairs?")
    expect(mailed!.text).toContain(`${ADDRESS}/apps/@spell/examples/Inbox`)
    expect(mailed!.text).toMatch(/Stop these mails:  https:\/\/spell\.test\/api\/mail\/stop\?/)
    // the sender hears nothing of their own copy
    expect(await mailsTo("bo@example.com")).toEqual([])
  })

  test("Bo never chose:  a daily digest, one mail the next morning with every new message", async () => {
    await send("ana@rs", "m-2", { text: "Thanks!", recipients: "bo@rs" })
    await send("cy@rs", "m-3", { text: "I'll bring the grill", recipients: "bo@rs" })
    expect(await mailsTo("bo@example.com")).toEqual([])

    await mail.sendDigests("2026-11-08")
    await settled()
    const digests = await mailsTo("bo@example.com")
    expect(digests).toHaveLength(1)
    expect(digests[0]!.subject).toBe("Your inbox in @rs:  2 new messages")
    expect(digests[0]!.text).toContain("Thanks!")
    expect(digests[0]!.text).toContain("I'll bring the grill")
    expect(digests[0]!.text).toMatch(/Stop these mails:  /)

    // once a day:  the same day sends nothing more, nor does a day with nothing new
    await send("cy@rs", "m-4", { text: "And the chairs", recipients: "bo@rs" })
    await mail.sendDigests("2026-11-08")
    await settled()
    expect(await mailsTo("bo@example.com")).toHaveLength(1)
    await mail.sendDigests("2026-11-09")
    await settled()
    expect((await mailsTo("bo@example.com")).map(({ subject }) => subject)).toEqual([
      "Your inbox in @rs:  2 new messages",
      "Your inbox in @rs:  1 new message"
    ])
  })

  test("Vic picks nothing:  no mail at all;  a choice that isn't one is refused", async () => {
    await choose("vic@rs", "none")
    await send("ana@rs", "m-5", { text: "Welcome, Vic", recipients: "vic@rs" })
    await mail.sendDigests("2026-11-10")
    await settled()
    expect(await mailsTo("vic@example.com")).toEqual([])
    await expect(choose("vic@rs", "hourly")).rejects.toThrow(/one of each, digest, none:  not "hourly"/)
  })

  test("a stop link stops it:  Ana's choice becomes nothing;  a link this server didn't sign is refused", async () => {
    const [first] = await mailsTo("ana@example.com")
    const link = stopLinkIn(first!.text, /^Stop these mails/)
    expect(await follow(link)).toMatch(/won't get mail about your inbox in @rs/)
    expect(await mail.followers.mailChoiceOf("ana@rs")).toBe("none")
    await send("bo@rs", "m-6", { text: "Still there?", recipients: "ana@rs" })
    expect(await mailsTo("ana@example.com")).toHaveLength(1)

    link.searchParams.set("person", "bo@rs")
    await expect(follow(link)).rejects.toMatchObject({ status: 403 })
  })

  test("a mail that didn't go goes again:  the one retry queue", async () => {
    await choose("cy@rs", "each")
    mailer.failures = 1
    await write("ana@rs", "ana@rs/__inbox", [
      {
        kind: "insert",
        collection: "messages",
        id: "m-7",
        fields: { id: "m-7", text: "Grill at 5", recipients: "cy@rs" }
      }
    ])
    await (await folders.inboxOf("ana@rs"))!.settled
    for (let tries = 0; tries < 100 && !(await mailsTo("cy@example.com")).length; tries++) {
      await new Promise((resolve) => setTimeout(resolve, 100))
      await mail.settled
    }
    expect((await mailsTo("cy@example.com")).map(({ subject }) => subject)).toEqual(["ana@rs wrote to you"])
  }, 30_000)
})

describe("subscriptions", () => {
  test("Cy subscribes to the Events Team;  a private space, or another org's, can't be subscribed to", async () => {
    await write("cy@rs", "cy@rs/__inbox", [
      { kind: "insert", collection: "subscriptions", id: "s-1", fields: { id: "s-1", space: "events_team@rs" } }
    ])
    expect(await mail.followers.subscribersOf("events_team@rs")).toEqual(["cy@rs"])
    for (const space of ["events_team@rs/__private", "@other", "nonsense"]) {
      await expect(
        write("cy@rs", "cy@rs/__inbox", [
          { kind: "insert", collection: "subscriptions", id: "s-x", fields: { id: "s-x", space } }
        ])
      ).rejects.toThrow(/You subscribe to one of @rs's shared spaces/)
    }
  })

  test("Bo posts in the Events Team's space:  Cy hears of it as an update, mailed as he chose;  Bo doesn't", async () => {
    const before = (await mailsTo("cy@example.com")).length
    await write("bo@rs", "events_team@rs/news", [
      { kind: "insert", collection: "posts", id: "p-1", fields: { id: "p-1", title: "Picnic on Saturday" } }
    ])
    for (let tries = 0; tries < 50 && (await mailsTo("cy@example.com")).length === before; tries++) {
      await new Promise((resolve) => setTimeout(resolve, 50))
      await (await folders.inboxOf("cy@rs"))!.settled
      await mail.settled
    }
    const place = await folders.placeFor("cy@rs/__inbox", "cy@rs")
    const { rows } = await place!.list("messages", {}, { identity: "cy@rs" })
    const updates = rows.filter((row) => row.from === "events_team@rs")
    expect(updates).toHaveLength(1)
    const mailed = (await mailsTo("cy@example.com")).at(-1)!
    expect(mailed.subject).toBe("events_team@rs:  New in events_team@rs")
    expect(mailed.text).toContain("Picnic on Saturday")
    expect(mailed.text).toMatch(/Stop updates from events_team@rs:  https:/)

    // following its stop link ends the subscription
    expect(await follow(stopLinkIn(mailed.text, /^Stop updates/))).toMatch(/won't get updates from events_team@rs/)
    expect(await mail.followers.subscribersOf("events_team@rs")).toEqual([])
  })
})
