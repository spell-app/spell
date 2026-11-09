import {
  BY_FIELD,
  OWNER_FIELD,
  PlaceError,
  type PlaceChange,
  type PlaceEvent,
  type PlaceRow,
  type ThingChange
} from "spell/places/places.types"
import { SaveQueue } from "spell/places/SaveQueue"
import type { SRV } from "spell/server"
import type { FolderPlace } from "spell/server/places"
import { SP } from "spell/parser/spell"
import {
  INBOX_MAIL,
  INBOX_MESSAGES,
  INBOX_SPACE,
  INBOX_SUBSCRIPTIONS,
  MAIL_CHOICES
} from "spell/app/spaces/models/spaceNames"
import type { MemberSpace, OrgRoles } from "spell/app/spaces/server/node/people/OrgRoles"
import type { PeopleStore } from "spell/app/spaces/server/node/people/PeopleStore"

import type { SpaceMembers } from "./SpaceMembers"

/** How long after a copy an inbox didn't take it tries again, ms. */
const RETRY_MS = 5000

/** What separates a message's recipients, as a page types them:  `bo@rs, cy@rs`. */
const RECIPIENTS = /[\s,;]+/

/****************
 * ### `PersonInbox`
 * One person's INBOX in an org (epic `atmosphere` P29, Q23 A):  `bo@rs/__inbox`, where Spell writes the messages
 * people in RS send him.  People call it "the inbox";  in code it's `PersonInbox`, never the epic engine's review inbox.
 *
 * ```ts
 * // Ana's page adds a message to her own inbox's messages:  that's sending it
 * { text: "Can you bring chairs?", recipients: "bo@rs, cy@rs" }
 * // Spell then writes a copy into Bo's inbox and Cy's, the same id in each, and fills in Ana's:
 * { text: "Can you bring chairs?", recipients: "bo@rs, cy@rs", from: "ana@rs", thread: "<its id>", sent: "2026-11-07T..." }
 * ```
 *
 * - A COPY IN EACH INBOX, as with email:  deleting hers leaves his.
 *   - Spell writes each copy as itself (no identity, as the org), after Ana's own write went through (`written()`).
 *   - A copy an inbox didn't take waits in the ONE retry queue (Q19 A), the kit's `SaveQueue`, on the server's disk,
 *     and goes again.
 * - A THREAD:  every copy carries one `thread`, the first message's id unless the page names one, so a reply to it
 *   draws as one conversation, however many people it's to.
 * - NEVER EDITED:  a message can't be changed once sent (`SpaceMembers`);  its person removes her own copies.
 * - A POINTER:  a message naming a TRUSTED page (`page`), a title, a line and the private facts the page needs (`facts`).
 *   - Worked out when it's opened:  the page runs as whoever opens it, so "You have used 2 of your invitations" is
 *     always current, and its links live.
 *   - Trusted:  a page in one of the org's paired spaces, sent by someone who manages that space;  anyone else sends
 *     plain messages (`sendOrDie()`).
 *   - A FIXED one names one saved version of its page (`saved_version`):  kept for good, whatever the project's
 *     retention says (`keepVersion`, the app's `ProjectDrafts.keepForGood()`).
 * - Who it's to, its `recipients`:  people in the inbox's org, each by their address;  anyone else is refused before anything's written.
 * - Who reads an inbox is its list's to say (`SpaceMembers`):  its person, and the org's Board and Admins.
 * - Spell sends too, with no person behind it (`sendAsSpell()`):  an invitation's pointer (P31), a space's update (P30).
 * - Two more collections its person writes (P30):  her mail choice (`mail_choices`) and what she subscribes to
 *   (`subscriptions`), each checked here;  each copy landing tells her mail (`onArrived`, the app's `InboxMail`).
 * - Node only;  made by the app's `SpaceFolders`, one per inbox.  Knows nothing of where folders are:  its places
 *   are handed in (`placeAt`).
 ****************/
export class PersonInbox {
  /** The inbox's address:  `bo@rs/__inbox`. */
  readonly address: string
  /** Whose, and their org. */
  private readonly owner: MemberSpace
  /** The inbox's members:  its person, the Board and the Admins. */
  private readonly members: SpaceMembers
  /** People and orgs:  who's in the org a message is sent in. */
  private readonly people: PeopleStore
  /** Who manages what:  who may send a pointer to which page. */
  private readonly orgRoles: OrgRoles
  /** A space's own place, by its address:  each inbox a copy goes into. */
  private readonly placeAt: (address: string) => Promise<FolderPlace | undefined>
  /** Keep version `version` of the project at `page` for good;  - throws for no such version */
  private readonly keepVersion: (page: string, version: string, by: string) => Promise<void>
  /** Each copy not yet written, sent in order until each goes through. */
  private readonly queue: SaveQueue
  /** Told of each copy written into someone's inbox but its sender's:  their mail (`InboxMail`, P30). */
  private readonly onArrived: ((arrived: ArrivedMessage) => void) | undefined

  constructor({
    address,
    owner,
    members,
    people,
    orgRoles,
    placeAt,
    keepVersion,
    queueStorage,
    retry = RETRY_MS,
    onArrived
  }: PersonInboxProps) {
    this.address = address
    this.owner = owner
    this.members = members
    this.people = people
    this.orgRoles = orgRoles
    this.placeAt = placeAt
    this.keepVersion = keepVersion
    this.onArrived = onArrived
    this.queue = new SaveQueue({
      key: `inbox:${address}`,
      storage: () => queueStorage,
      save: () => this.sendQueued(),
      wait: 0,
      retry
    })
    // what a restart left unsent goes now
    if (this.unsent.length) this.queue.changed({ now: true })
  }

  /**
   * `bo@rs/__inbox`, the inbox of person `person` (`bo@rs`) in org `org`, default their own.
   * - A Spell account in an org (`owen@spell` in RS, J163) has theirs under their id there:  `owen@rs/__inbox`.
   */
  static addressOf(person: string, org?: string): string {
    const [id, home] = person.split("@")
    return `${id}@${org ?? home}/${INBOX_SPACE}`
  }

  /** Resolves once every copy has gone, or failed and waits to try again:  `true` when nothing's left. */
  get settled(): Promise<boolean> {
    return this.queue.settled
  }

  /** The copies not yet written, oldest first. */
  get unsent(): readonly QueuedCopy[] {
    return this.queue.kept<QueuedCopy[]>() ?? []
  }

  ////////////////
  // ## Sending
  ////////////////

  /**
   * The inbox's write check:  its members' (`SpaceMembers`, only its person sends, nothing's edited), then what a new
   * message says (`sendOrDie()`), a mail choice (P30) or a subscription (P30).
   * What the space's `FolderPlace` is handed, in place of the members' own.
   */
  changeOrDie = async (change: ThingChange): Promise<void> => {
    await this.members.changeOrDie(change)
    if (change.action === "remove") return
    const fields = change.fields ?? {}
    if (change.collection === INBOX_MESSAGES) await this.sendOrDie(change.identity, fields)
    else if (change.collection === INBOX_MAIL) mailChoiceOrDie(fields)
    else if (change.collection === INBOX_SUBSCRIPTIONS) await this.subscriptionOrDie(fields)
  }

  /**
   * - throws `PlaceError` `"refused"`, `"place"`, unless `fields.space` is a SHARED space of the inbox's org
   *   (`events_team@rs`):  a team's or a project's, or the org's own;  a private one's news isn't for everyone
   */
  private async subscriptionOrDie(fields: PlaceRow): Promise<void> {
    const space = textOf(fields.space)
    const paired = SP.SpellLocation.isAddress(space) ? await this.orgRoles.spaceAt(space) : undefined
    if (paired?.org !== this.owner.org || paired.side !== "shared") {
      refuse(
        `You subscribe to one of @${this.owner.org}'s shared spaces, as events_team@${this.owner.org}:  not ${JSON.stringify(space)}`
      )
    }
  }

  /**
   * May `sender` send `fields`, a new message in their own inbox?
   * - SIDE EFFECT:  a fixed pointer's version is kept for good, as it's sent
   * - throws `PlaceError` `"refused"`, `"place"`:  no one to send it to, someone outside the org, an empty message,
   *   a `from` that isn't the sender, a pointer to a page that isn't trusted
   */
  private async sendOrDie(sender: string, fields: PlaceRow): Promise<void> {
    const recipients = recipientsOf(fields.recipients)
    if (!recipients.length) refuse("A message is sent to someone:  name them, as bo@rs")
    const inOrg = await this.peopleInOrg()
    const named = await Promise.all(recipients.map((each) => this.people.memberCalled(this.owner.org, each)))
    const outside = recipients.filter((_each, index) => !inOrg.includes(named[index]!))
    if (outside.length) refuse(`${outside.join(", ")} ${outside.length > 1 ? "aren't" : "isn't"} in @${this.owner.org}`)
    if (fields.from !== undefined && fields.from !== "" && fields.from !== sender) {
      refuse(`A message is from whoever sends it:  ${sender}, not ${JSON.stringify(fields.from)}`)
    }
    if (typeof fields.page === "string" && fields.page) await this.trustedPageOrDie(sender, fields)
    else if (!textOf(fields.text)) refuse("A message says something:  its text is empty")
  }

  /**
   * - SIDE EFFECT:  a fixed pointer's version kept for good
   * - throws `PlaceError` `"refused"`, `"place"`, unless `page` is in one of the org's paired spaces and `sender`
   *   manages it:  only a page a Manager put in the org's spaces runs as whoever opens it
   */
  private async trustedPageOrDie(sender: string, fields: PlaceRow): Promise<void> {
    const page = String(fields.page)
    const space = SP.SpellLocation.isAddress(page) ? await this.orgRoles.spaceAt(page) : undefined
    if (space?.org !== this.owner.org || !(await this.orgRoles.managersOfSpace(space)).includes(sender)) {
      refuse(
        `Only a page a Manager put in @${this.owner.org}'s spaces can be sent, by its Manager:  ${page} isn't one ` +
          "of yours;  send a plain message"
      )
    }
    const version = fields.saved_version
    if (typeof version === "string" && version) await this.keepVersion(page, version, sender)
  }

  /**
   * SIDE EFFECT:  these writes went through on the inbox:  each new message's copies queued, and sent.  NEVER throws.
   * - A new message:  one of the person's own (its `by`), not sent yet (an empty `sent`).  A copy Spell wrote has one.
   */
  written = (written: readonly PlaceEvent[]): void => {
    const sending = written.filter(({ collection, row }) => {
      return collection === INBOX_MESSAGES && row?.[BY_FIELD] === this.owner.person && !textOf(row.sent)
    })
    if (!sending.length) return
    const copies = sending.flatMap(({ id, row }) => this.copiesOf(id, row!, this.owner.person))
    this.queue.keep([...this.unsent, ...copies])
    this.queue.changed({ now: true })
  }

  /**
   * SIDE EFFECT:  send a message as Spell, with no person behind it, into each of its `recipients`' inboxes:  an invitation's
   * pointer (P31).  Returns its id.
   * - `from`:  who it says it's from;  default the org, `@rs`
   * - Spell's own code is trusted:  a pointer's page isn't checked
   */
  sendAsSpell(
    message: PlaceRow & { recipients: string },
    { id = newMessageId(), from = `@${this.owner.org}` } = {}
  ): string {
    const copies = recipientsOf(message.recipients).map((person) => this.copyFor(person, id, { ...message, from }))
    this.queue.keep([...this.unsent, ...copies])
    this.queue.changed({ now: true })
    return id
  }

  /** Stop sending:  what's unsent stays on the disk, for the next start. */
  stop(): void {
    this.queue.stop()
  }

  ////////////////
  // ## Copies
  ////////////////

  /** A new message's copies:  its sender's own filled in (`from`, `thread`, `sent`), and one for each person it's to. */
  private copiesOf(id: string, row: PlaceRow, sender: string): QueuedCopy[] {
    const filled = { ...row, from: sender }
    return [sender, ...recipientsOf(row.recipients).filter((each) => each !== sender)].map((person) =>
      this.copyFor(person, id, filled)
    )
  }

  /** The copy of message `id` for `person`'s inbox:  what it says, with its thread and when it was sent. */
  private copyFor(person: string, id: string, row: PlaceRow): QueuedCopy {
    const fields: PlaceRow = {}
    for (const [field, value] of Object.entries(row)) {
      if (field !== BY_FIELD && field !== OWNER_FIELD) fields[field] = value
    }
    fields.thread = textOf(row.thread) || id
    fields.sent = textOf(row.sent) || new Date().toISOString()
    return { into: PersonInbox.addressOf(person, this.owner.org), id, fields }
  }

  /** Send every queued copy, oldest first, each kept until it's gone.  - throws an inbox's refusal for now */
  private async sendQueued(): Promise<void> {
    for (let [next] = this.unsent; next; [next] = this.unsent) {
      await this.send(next)
      this.queue.keep(this.unsent.slice(1))
    }
  }

  /**
   * One copy into its inbox, as Spell itself:  the whole message, written over a copy already there.
   * - SIDE EFFECT:  its person told, unless it's the sender's own copy (`onArrived`)
   */
  private async send({ into, id, fields }: QueuedCopy): Promise<void> {
    const inbox = await this.placeAt(into)
    if (!inbox) return console.error(`PersonInbox:  ${into} has no folder;  message ${id} dropped`)
    const change: PlaceChange = { kind: "insert", collection: INBOX_MESSAGES, id, fields }
    await inbox.apply([change])
    const person = into.slice(0, -`/${INBOX_SPACE}`.length)
    if (into !== PersonInbox.addressOf(textOf(fields.from), this.owner.org)) this.onArrived?.({ person, id, fields })
  }

  /** Everyone in the inbox's org, by address. */
  private async peopleInOrg(): Promise<string[]> {
    const org = await this.people.org(this.owner.org)
    return (org?.members.items ?? []).flatMap((each) => (each.person ? [this.people.addressOf(each.person)] : []))
  }
}

/** Constructor props of `PersonInbox`. */
export type PersonInboxProps = {
  /** The inbox's address:  `bo@rs/__inbox`. */
  address: string
  /** Whose, and their org (`OrgRoles.inboxAt()`). */
  owner: MemberSpace
  /** The inbox's members. */
  members: SpaceMembers
  /** People and orgs. */
  people: PeopleStore
  /** Who manages what in the org. */
  orgRoles: OrgRoles
  /** A space's own place, by its address. */
  placeAt: (address: string) => Promise<FolderPlace | undefined>
  /** Keep version `version` of the project at `page` for good, asked by `by`;  - throws for no such version */
  keepVersion: (page: string, version: string, by: string) => Promise<void>
  /** Where its unsent copies are kept:  one file for every inbox's (`SRV.FileStorage`). */
  queueStorage: SRV.FileStorage
  /** How long after a copy an inbox didn't take it tries again, ms:  default `RETRY_MS`. */
  retry?: number
  /** Told of each copy written into someone's inbox but its sender's own (P30):  their mail.  NEVER throws. */
  onArrived?: (arrived: ArrivedMessage) => void
}

/** A message just written into someone's inbox (`PersonInboxProps.onArrived`). */
export type ArrivedMessage = {
  /** Whose inbox, by address:  `bo@rs`. */
  person: string
  /** The message's id, the same in every inbox. */
  id: string
  /** What it says, whole:  `from`, `text`, `title`, `line`, `page` ... */
  fields: PlaceRow
}

/** One copy waiting for its inbox. */
type QueuedCopy = {
  /** The inbox's address:  `bo@rs/__inbox`. */
  into: string
  /** The message's id, the same in every inbox. */
  id: string
  /** What it says, whole. */
  fields: PlaceRow
}

/** The people `recipients` names, by address:  `"bo@rs, cy@rs"`, or a list of them;  each once. */
function recipientsOf(recipients: unknown): string[] {
  const named = Array.isArray(recipients)
    ? recipients.map(String)
    : typeof recipients === "string"
      ? recipients.split(RECIPIENTS)
      : []
  return [...new Set(named.map((each) => each.trim()).filter(Boolean))]
}

/** `value` as trimmed text:  `""` for anything that isn't text. */
function textOf(value: unknown): string {
  return typeof value === "string" ? value.trim() : ""
}

/** A new message's id, when Spell sends one:  a time, then a random tail, so ids sort by when they were made. */
function newMessageId(): string {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`
}

/** - throws `PlaceError` `"refused"`, `"place"`, unless `fields.how` is one of `MAIL_CHOICES` */
function mailChoiceOrDie(fields: PlaceRow): void {
  if (!(MAIL_CHOICES as readonly unknown[]).includes(fields.how)) {
    refuse(`How you hear of your inbox is one of ${MAIL_CHOICES.join(", ")}:  not ${JSON.stringify(fields.how)}`)
  }
}

/** - throws `PlaceError` `"refused"`, `"place"`, saying `why` */
function refuse(why: string): never {
  throw new PlaceError(why, { cause: { kind: "refused", whyNot: "place" } })
}
