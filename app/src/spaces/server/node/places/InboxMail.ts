import {
  FILES_COLLECTION,
  type PlaceChange,
  type PlaceEvent,
  type PlaceRow,
  type ThingChange
} from "spell/places/places.types"
import { SaveQueue } from "spell/places/SaveQueue"
import { SRV } from "spell/server"
import type { FolderPlace } from "spell/server/places"
import type { Mail, Mailer, ReadCredentials } from "spell/server/signIn"
import { SP } from "spell/parser/spell"
import { INBOX_MAIL, INBOX_SUBSCRIPTIONS } from "spell/app/spaces/models/spaceNames"
import type { PairedSpace } from "spell/app/spaces/server/node/people/OrgRoles"
import type { PeopleStore } from "spell/app/spaces/server/node/people/PeopleStore"

import { Followers } from "./Followers"
import type { ArrivedMessage, PersonInbox } from "./PersonInbox"

/** Where a mail's stop link goes:  `GET` with who, what and this server's signature. */
export const MAIL_STOP_PATH = "/api/mail/stop"

/** Where a mail's link opens the person's inbox:  the built-in inbox program, as the cloud serves it. */
export const INBOX_PAGE_PATH = "/apps/@spell/examples/Inbox"

/** The hour of the day, on the server's clock, from which a day's digest goes:  the round looks each hour. */
export const DIGEST_HOUR = 7

/** How long after a mail that didn't go it tries again, ms. */
const RETRY_MS = 5000

/** The storage key of what's waiting for each person's digest, and the day each last went. */
const DIGESTS_KEY = "inbox-mail:digests"

/** The id of the mail choice a stop link makes, for someone who never chose. */
const STOPPED_CHOICE = "stopped"

/** The longest line a mail quotes of a message, in characters. */
const LONGEST_LINE = 140

/** The fields a new thing in a space is told by, in order:  the first with text is its line. */
const LINE_FIELDS = ["title", "name", "text", "line", "summary"]

/****************
 * ### `InboxMail`
 * How people hear of their inbox by mail, and of the spaces they subscribe to (epic `atmosphere` P30).
 *
 * ```ts
 * // each person says how, in their inbox's first mail choice:  { how: "each" | "digest" | "none" }
 * mail.arrived({ person: "bo@rs", id, fields })      // PersonInbox, as each copy lands:  mailed now, kept for the digest, or nothing
 * await mail.sendDigestsIfDue()                      // the daily round:  one mail each with what came since the last
 * // Cy subscribes to the Events Team:  { space: "events_team@rs" } in his inbox's `subscriptions`;
 * // a new thing in its shared space reaches his inbox as an UPDATE (Q24 A), and is mailed as his choice says
 * ```
 *
 * - Who hears, and how:  the ONE look-up, `Followers` (P38's alerts ask it too).
 * - Every mail goes through the ONE mail seam (`Mailer`):  the local catcher on this machine;  a real sender once P18 is
 *   built.  One at a time, through the ONE retry queue (Q19 A), on the server's disk:  a mail that didn't go goes again.
 * - Every mail has a way to stop it:  a STOP LINK, signed by this server (`ReadCredentials.sign()`), at
 *   `MAIL_STOP_PATH`;  opening it sets the inbox's choice to `"none"`, or ends that subscription.
 * - An UPDATE is a message Spell writes into each subscriber's inbox, from the space (`PersonInbox.sendAsSpell()`),
 *   for each thing made there by someone else:  a post, a row or a file, never an app.
 * - Node only;  made by the app's `SpaceFolders`, which hands it each inbox (`inboxOf`) and place (`placeAt`).
 ****************/
export class InboxMail {
  /** Who follows what. */
  readonly followers: Followers
  /** Where each mail goes. */
  private readonly mailer: Mailer
  /** People and orgs:  each person's email. */
  private readonly people: PeopleStore
  /** A space's own place, by its address, opened as Spell. */
  private readonly placeAt: (address: string) => Promise<FolderPlace | undefined>
  /** A person's inbox, to send an update from. */
  private readonly inboxOf: (person: string) => Promise<PersonInbox | undefined>
  /** Signs each stop link, and knows one again. */
  private readonly credentials: ReadCredentials
  /** This server's address, as a mail's links start:  `https://spell.app`. */
  private readonly address: () => string
  /** Where the waiting digests are kept, beside the mail not yet gone. */
  private readonly storage: SRV.FileStorage
  /** The time now, ms. */
  private readonly now: () => number
  /** Each mail not yet gone, sent in order until each goes. */
  private readonly queue: SaveQueue
  /** Each new thing a space's write check let through, by `<address>\n<collection>\n<id>`:  who made it. */
  private readonly making = new Map<string, string>()

  constructor({
    mailer,
    people,
    placeAt,
    inboxOf,
    credentials,
    address,
    queueStorage,
    now = Date.now,
    retry = RETRY_MS
  }: InboxMailProps) {
    this.mailer = mailer
    this.people = people
    this.placeAt = placeAt
    this.inboxOf = inboxOf
    this.credentials = credentials
    this.address = address
    this.storage = queueStorage
    this.now = now
    this.followers = new Followers({ people, placeAt })
    this.queue = new SaveQueue({
      key: "inbox-mail:queue",
      storage: () => queueStorage,
      save: () => this.sendQueued(),
      wait: 0,
      retry
    })
    // what a restart left unsent goes now
    if (this.unsent.length) this.queue.changed({ now: true })
  }

  /** Resolves once every mail has gone, or failed and waits to try again:  `true` when nothing's left. */
  get settled(): Promise<boolean> {
    return this.queue.settled
  }

  /** The mails not yet gone, oldest first. */
  get unsent(): readonly Mail[] {
    return this.queue.kept<Mail[]>() ?? []
  }

  /** Stop sending:  what's unsent stays on the disk, for the next start. */
  close(): void {
    this.queue.stop()
  }

  ////////////////
  // ## A message arrives
  ////////////////

  /**
   * SIDE EFFECT:  a copy landed in `person`'s inbox:  mailed now (`"each"`), kept for their digest (`"digest"`), or
   * nothing (`"none"`).  What `PersonInbox` is handed as `onArrived`.  NEVER throws:  a failure is logged.
   */
  arrived = (arrived: ArrivedMessage): void => {
    void this.mailArrived(arrived).catch((error: unknown) => {
      console.error(`InboxMail:  ${arrived.person}'s message ${arrived.id} wasn't mailed`, error)
    })
  }

  /** See `arrived()`. */
  private async mailArrived({ person, id, fields }: ArrivedMessage): Promise<void> {
    const how = await this.followers.mailChoiceOf(person)
    if (how === "none") return
    const entry: DigestEntry = { id, ...linesOf(fields) }
    if (how === "digest") {
      const digests = this.digests()
      const waiting = (digests[person] ??= { entries: [] })
      if (!waiting.entries.some((each) => each.id === id)) waiting.entries.push(entry)
      return this.keepDigests(digests)
    }
    const to = await this.emailOf(person)
    if (!to) return
    const stops = [this.stopLine(person, "inbox"), ...this.updateStops(person, [entry])]
    this.send({
      to,
      subject: entry.title ? `${entry.from}:  ${entry.title}` : `${entry.from} wrote to you`,
      text: [`From ${entry.from}`, "", ...entryLines(entry, this.inboxLink()), "", ...stops].join("\n")
    })
  }

  ////////////////
  // ## The daily digest
  ////////////////

  /**
   * SIDE EFFECT:  each person with messages waiting, and no digest yet today, mailed one, once it's `DIGEST_HOUR`.
   * The daily round's job:  it asks every hour.
   */
  async sendDigestsIfDue(): Promise<void> {
    const now = new Date(this.now())
    if (now.getHours() < DIGEST_HOUR) return
    await this.sendDigests(dayOf(now))
  }

  /** SIDE EFFECT:  each person with messages waiting, and no digest on `day` yet, mailed one. */
  async sendDigests(day = dayOf(new Date(this.now()))): Promise<void> {
    const digests = this.digests()
    for (const [person, waiting] of Object.entries(digests)) {
      if (!waiting.entries.length || waiting.lastDay === day) continue
      const to = await this.emailOf(person)
      if (to) {
        const { entries } = waiting
        const count = entries.length === 1 ? "1 new message" : `${entries.length} new messages`
        const org = person.split("@")[1]
        const body = entries.flatMap((entry) => [`${entry.from}`, ...entryLines(entry, this.inboxLink()), ""])
        const stops = [this.stopLine(person, "inbox"), ...this.updateStops(person, entries)]
        this.send({ to, subject: `Your inbox in @${org}:  ${count}`, text: [...body, ...stops].join("\n") })
      }
      digests[person] = { entries: [], lastDay: day }
    }
    this.keepDigests(digests)
  }

  /** What's waiting for each person's digest, as kept. */
  private digests(): Record<string, WaitingDigest> {
    const kept = this.storage.getItem(DIGESTS_KEY)
    return kept ? (JSON.parse(kept) as Record<string, WaitingDigest>) : {}
  }

  /** Keep `digests`, on the disk. */
  private keepDigests(digests: Record<string, WaitingDigest>): void {
    this.storage.setItem(DIGESTS_KEY, JSON.stringify(digests))
  }

  ////////////////
  // ## Subscriptions:  updates from a shared space
  ////////////////

  /**
   * The write check of a shared space's folder at `address`, wrapping its own:  remembers each new thing it let
   * through, so `written()` tells its subscribers once the write goes through.
   */
  checkFor(address: string, changeOrDie: (change: ThingChange) => Promise<void>) {
    return async (change: ThingChange): Promise<void> => {
      await changeOrDie(change)
      if (change.action === "make" && change.id && isNews(change.collection)) {
        this.making.set(`${address}\n${change.collection}\n${change.id}`, change.identity)
      }
    }
  }

  /**
   * What a shared space's folder at `address`, in paired space `space`, is told of its writes:  each new thing someone
   * made there sent to the space's subscribers as an UPDATE, but the one who made it.  NEVER throws.
   */
  writtenFor(address: string, space: PairedSpace) {
    return (written: readonly PlaceEvent[]): void => {
      const made = written.flatMap((event) => {
        const key = `${address}\n${event.collection}\n${event.id}`
        const by = this.making.get(key)
        this.making.delete(key)
        return by && event.row ? [{ event, by }] : []
      })
      if (!made.length) return
      void this.sendUpdates(address, space, made).catch((error: unknown) => {
        console.error(`InboxMail:  ${space.address}'s updates weren't sent`, error)
      })
    }
  }

  /** Send each of `made` to the subscribers of `space`, but who made it:  from the space, as Spell. */
  private async sendUpdates(address: string, space: PairedSpace, made: { event: PlaceEvent; by: string }[]) {
    const subscribers = await this.followers.subscribersOf(space.address)
    for (const { event, by } of made) {
      const recipients = subscribers.filter((each) => each !== by)
      const [first] = recipients
      const inbox = first && (await this.inboxOf(first))
      if (!inbox) continue
      inbox.sendAsSpell(
        {
          kind: "update",
          recipients: recipients.join(", "),
          title: `New in ${space.address}`,
          line: lineOf(event.row!) || `${by} added to ${event.collection}`,
          text: `${by} added to ${address}`,
          space: space.address,
          page: address
        },
        { from: space.address }
      )
    }
  }

  ////////////////
  // ## Stopping
  ////////////////

  /** Add the stop link's route to `router`:  only its signature lets it in, as a mail carries no sign-in. */
  route(router: SRV.Router, guard: SRV.Guard): this {
    router.get(MAIL_STOP_PATH, guard.hostCheck, async (request, reply) => {
      const { person = "", what = "", signature = "" } = request.query as Record<string, string | undefined>
      reply.type("text/plain").send(`${await this.stop({ person, what, signature })}\n`)
    })
    return this
  }

  /**
   * SIDE EFFECT:  stop what a stop link says, for `person`:  `"inbox"`, their inbox's mail (its choice set to
   * `"none"`);  `"space:<address>"`, that subscription.  Returns what it did, in words.
   * - throws `SRV.HttpError(403)` for a link this server didn't sign
   */
  async stop({ person, what, signature }: { person: string; what: string; signature: string }): Promise<string> {
    if (!this.credentials.isSigned(stopText(person, what), signature)) {
      throw new SRV.HttpError(403, "That stop link isn't one of this server's:  open your inbox to choose")
    }
    const inbox = await this.placeAt(`${person}/__inbox`)
    if (!inbox) throw new SRV.HttpError(404, `${person} has no inbox here`)
    if (what === "inbox") {
      // every mail choice says none, or a first one does
      const choices = await this.followers.mailChoicesOf(person)
      const changes: PlaceChange[] = choices.length
        ? choices.map(({ id }) => ({ kind: "update", collection: INBOX_MAIL, id: String(id), fields: { how: "none" } }))
        : [{ kind: "insert", collection: INBOX_MAIL, id: STOPPED_CHOICE, fields: { id: STOPPED_CHOICE, how: "none" } }]
      await inbox.apply(changes)
      return `You won't get mail about your inbox in @${person.split("@")[1]} any more:  your messages are still there.`
    }
    const space = what.slice("space:".length)
    const gone = (await this.followers.subscriptionsOf(person)).filter((row) => row.space === space)
    const changes: PlaceChange[] = gone.map(({ id }) => ({
      kind: "delete",
      collection: INBOX_SUBSCRIPTIONS,
      id: String(id)
    }))
    if (changes.length) await inbox.apply(changes)
    return `You won't get updates from ${space} any more.`
  }

  /** The stop link's line for `person`'s `what`. */
  private stopLine(person: string, what: string): string {
    const words = what === "inbox" ? "Stop these mails" : `Stop updates from ${what.slice("space:".length)}`
    return `${words}:  ${this.stopLinkFor(person, what)}`
  }

  /** The stop lines for the spaces `entries`' updates came from. */
  private updateStops(person: string, entries: readonly DigestEntry[]): string[] {
    const spaces = [...new Set(entries.flatMap(({ space }) => (space ? [space] : [])))]
    return spaces.map((space) => this.stopLine(person, `space:${space}`))
  }

  /** The link that stops `what` for `person`, signed by this server. */
  stopLinkFor(person: string, what: string): string {
    const query = new URLSearchParams({ person, what, signature: this.credentials.sign(stopText(person, what)) })
    return `${this.address()}${MAIL_STOP_PATH}?${query}`
  }

  ////////////////
  // ## Mail
  ////////////////

  /** Queue `mail`, and send it.  NEVER throws. */
  private send(mail: Mail): void {
    this.queue.keep([...this.unsent, mail])
    this.queue.changed({ now: true })
  }

  /** Send every queued mail, oldest first, each kept until it's gone.  - throws the mailer's failure, for now */
  private async sendQueued(): Promise<void> {
    for (let [next] = this.unsent; next; [next] = this.unsent) {
      await this.mailer.send(next)
      this.queue.keep(this.unsent.slice(1))
    }
  }

  /** `person`'s email (`bo@rs`):  their file's first;  `undefined` for none, logged. */
  private async emailOf(person: string): Promise<string | undefined> {
    const parts = SP.SpellLocation.accountParts(person)
    const found = parts && (await this.people.person(parts.id, parts.org)).person
    const email = found?.emails.items[0]
    if (!email) console.warn(`InboxMail:  ${person} has no email in their file;  nothing mailed`)
    return email
  }

  /** The link that opens the person's inbox. */
  private inboxLink(): string {
    return `${this.address()}${INBOX_PAGE_PATH}`
  }
}

/** Constructor props of `InboxMail`. */
export type InboxMailProps = {
  /** Where each mail goes:  the local catcher until P18's sender. */
  mailer: Mailer
  /** People and orgs. */
  people: PeopleStore
  /** A space's own place, by its address, opened as Spell. */
  placeAt: (address: string) => Promise<FolderPlace | undefined>
  /** A person's inbox. */
  inboxOf: (person: string) => Promise<PersonInbox | undefined>
  /** Signs each stop link:  the server's own, so a restart keeps them good. */
  credentials: ReadCredentials
  /** This server's address, as a mail's links start. */
  address: () => string
  /** Where the mail not yet gone and the waiting digests are kept:  the one retry queue's file. */
  queueStorage: SRV.FileStorage
  /** The time now, ms;  default `Date.now`. */
  now?: () => number
  /** How long after a mail that didn't go it tries again, ms:  default `RETRY_MS`. */
  retry?: number
}

/** One message as a mail tells it. */
type DigestEntry = {
  /** The message's id. */
  id: string
  /** Who it's from. */
  from: string
  /** Its title, if it has one:  a pointer's, an update's. */
  title?: string
  /** What it says, a line of it. */
  line: string
  /** The space an update came from:  its stop link. */
  space?: string
}

/** What's waiting for one person's digest. */
type WaitingDigest = {
  /** Each message since the last digest. */
  entries: DigestEntry[]
  /** The day the last went, `2026-11-07`. */
  lastDay?: string
}

/** What a mail tells of a message:  who it's from, its title, a line of it, the space an update came from. */
function linesOf(fields: PlaceRow): Omit<DigestEntry, "id"> {
  const text = (field: string) => (typeof fields[field] === "string" ? (fields[field] as string).trim() : "")
  const line = text("line") || text("text")
  return {
    from: text("from") || "Someone",
    line: line.length > LONGEST_LINE ? `${line.slice(0, LONGEST_LINE - 1)}…` : line,
    ...(text("title") && { title: text("title") }),
    ...(fields.kind === "update" && text("space") && { space: text("space") })
  }
}

/** A mail's lines for `entry`:  its title, its line, and the link to the inbox. */
function entryLines(entry: DigestEntry, link: string): string[] {
  return [...(entry.title ? [entry.title] : []), ...(entry.line ? [entry.line] : []), link]
}

/** A new thing's line:  the first of its `LINE_FIELDS` with text. */
function lineOf(row: PlaceRow): string {
  for (const field of LINE_FIELDS) {
    const value = row[field]
    if (typeof value === "string" && value.trim()) return value.trim()
  }
  return ""
}

/** Is a new thing in `collection` news for a space's subscribers:  a post, a row, a file;  never an app or Spell's own. */
function isNews(collection: string): boolean {
  return collection === FILES_COLLECTION || !collection.startsWith("__")
}

/** What a stop link's signature signs. */
function stopText(person: string, what: string): string {
  return `mail-stop\n${person}\n${what}`
}

/** `date`'s day, on the server's clock:  `2026-11-07`. */
function dayOf(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0")
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`
}
