import {
  PlaceError,
  SPACE_SHEET_OPERATIONS,
  type PlaceContext,
  type PlaceEvent,
  type PlaceRow,
  type SheetMost,
  type SheetRules,
  type ThingChange
} from "spell/places/places.types"
import type { FolderOperation, SignUpAsk } from "spell/server/places"
import { SP } from "spell/parser/spell"
import type { DiskStorage } from "spell/app/spaces/server/node/storage/DiskStorage"
import { readJSON5, writeJSON5 } from "spell/app/spaces/server/node/storage/json5"

import type { PersonInbox } from "./PersonInbox"
import type { SpaceMembers } from "./SpaceMembers"

/** Where a space keeps its sign-up sheet's rules:  in its `__settings/`, so never listed, read direct or exported. */
const SHEET_FILE = "__settings/sheet.json5"

/** The field a list of who may sign up names each one by:  an attendee's `person`. */
const LISTED_FIELD = "person"

/** The field a manager confirms a row with (P31):  `status`, set to `CONFIRMED`. */
const STATUS_FIELD = "status"

/** What a confirmed row's `status` says. */
const CONFIRMED = "confirmed"

/** Who a confirmed row puts in the attendees' space:  its `guest`, else its `person`. */
const GUEST_FIELD = "guest"

/** The role a confirmed guest gets in the attendees' space:  they read it, and post where it lets them. */
const GUEST_ROLE = "viewer"

/** The conversation each person's count of their allowance is sent in, in their inbox (P31). */
const ALLOWANCE_THREAD = "invitations"

/****************
 * ### `SpaceSheets`
 * A space's folder as a SIGN-UP SHEET (epic `atmosphere` P27):  who signs up, who's on the list, how many a shift takes.
 *
 * ```ts
 * await sheets.set({ signUpsFrom: "picnic@rs", onlyFrom: "attendees", mostEach: { field: "shift", most: 2 } }, context)
 * // the space's FolderPlace asks it of each write:  space.signUpOrDie
 * ```
 *
 * - A program says it in lines under its place:
 *   - `- open to sign-ups from "picnic@rs"`:  anyone who reads that space adds rows here, and changes or removes only
 *     their own, though they can't read this one:  the master in an event's private space, organizers' notes and all
 *   - `- only its attendees add rows` (J101):  only the people its `attendees` list names, by each one's `person`
 *   - `- at most 2 rows for each shift`:  a shift's last place goes to one person, the other is told it's gone;
 *     several such lines each hold (`- at most 40 rows for each event`, P31)
 *   - `- each person asks for at most their "invitations" tickets` (P31):  as many as their row on the list says,
 *     one more refused, `"used up"`;  each change sends them their count, an update in their inbox
 *   - `- confirmed tickets join "picnic@rs/__attendees"` (P31):  a manager setting a ticket's `status` to
 *     `"confirmed"` puts its `guest` (else its `person`) on the attendees' space's list;  nobody else sets `status`
 * - A manager's page tells this space as it opens the place (`setSheet`), which keeps it in `__settings/sheet.json5`;
 *   anyone else is refused, which changes nothing.
 * - Every collection of the folder is a sheet, but the list it names.
 * - Checked where each write lands (the kit's `FolderPlace`, one write at a time), so a room's write and a plain save
 *   are held to the same rules, and two asking for the last place at once can't both get it.
 * - A manager isn't held to the list, but is to a shift's places.
 * - Node only;  made by the app's `SpaceFolders`, one per space.  It knows nothing of rooms, projections or pages.
 ****************/
export class SpaceSheets {
  /** The space's address:  `picnic@rs/__private/signups`. */
  readonly address: string
  /** The space's files:  its settings. */
  private readonly storage: DiskStorage
  /** The space's members, for who may set its rules. */
  private readonly members: SpaceMembers
  /** A space's members, by its address:  for who reads the space sign-ups come from. */
  private readonly membersAt: (address: string) => SpaceMembers | undefined
  /** A person's inbox, by their address:  where their count is sent (P31). */
  private readonly inboxOf: ((person: string) => Promise<PersonInbox | undefined>) | undefined
  /** Its rules, read once. */
  private kept: Promise<SheetRules | undefined> | undefined
  /** Each allowance change being written, by the row's id:  whose, and their count once it lands (`written`). */
  private readonly counting = new Map<string, AllowanceCount>()

  constructor({ address, storage, members, membersAt, inboxOf }: SpaceSheetsProps) {
    this.address = address
    this.storage = storage
    this.members = members
    this.membersAt = membersAt
    this.inboxOf = inboxOf
  }

  /** Its rules:  `undefined` for a folder that's no sign-up sheet. */
  rules(): Promise<SheetRules | undefined> {
    return (this.kept ??= readJSON5<SheetRules>(this.storage, SHEET_FILE).catch(() => undefined))
  }

  /** What `SpaceFolders` merges into the space's own operations:  see `SPACE_SHEET_OPERATIONS`. */
  get operations(): Record<string, FolderOperation> {
    return {
      [SPACE_SHEET_OPERATIONS.sheet]: async (_input, context) => {
        await this.members.askerOrDie(context, "see its sign-up rules", "canRead")
        return (await this.rules()) ?? {}
      },
      [SPACE_SHEET_OPERATIONS.set]: (input, context) => this.set(rulesOrDie(input), context)
    }
  }

  /**
   * Keep `rules` as the folder's:  the same again changes nothing.
   * - throws `PlaceError` `"refused"`, `"role"`, for anyone but a manager
   */
  async set(rules: SheetRules, context: PlaceContext = {}): Promise<{ unchanged?: true }> {
    await this.members.askerOrDie(context, "make it a sign-up sheet", "canManage")
    if (JSON.stringify(await this.rules()) === JSON.stringify(rules)) return { unchanged: true }
    this.kept = Promise.resolve(rules)
    await writeJSON5(this.storage, SHEET_FILE, rules)
    return {}
  }

  /**
   * The space's `FolderPlace` asks this first, of every write by someone:  see `FolderSpace.signUpOrDie()`.
   * - `true` for someone who doesn't write the space, signing up from where its rules say
   * - throws `PlaceError` `"refused"`:  `"not listed"`, someone its list doesn't name;  `"full"`, a shift with no place
   */
  signUpOrDie = async ({ identity, member, changes, rowsOf }: SignUpAsk): Promise<boolean> => {
    const rules = await this.rules()
    if (!rules) return false
    const sheetChanges = changes.filter(({ collection }) => collection !== rules.onlyFrom)
    if (!sheetChanges.length) return false
    const isSignUp = !member?.canWrite && (await this.signsUpHere(rules, identity))
    // someone who neither writes nor signs up here:  the usual refusal says why
    if (!member?.canWrite && !isSignUp) return false
    if (!member?.canManage && rules.onlyFrom && sheetChanges.some(({ action }) => action === "make")) {
      await this.listedOrDie(rules.onlyFrom, identity, rowsOf)
    }
    if (isSignUp) ownRowsOrDie(sheetChanges, identity)
    if (!member?.canManage && rules.joins) noStatusOrDie(rules.joins.collection, sheetChanges)
    for (const most of [rules.mostEach ?? []].flat()) await this.roomOrDie(most, sheetChanges, rowsOf)
    if (rules.allowance) await this.allowanceOrDie(rules, identity, !!member?.canManage, sheetChanges, rowsOf)
    return isSignUp
  }

  /**
   * SIDE EFFECT:  these writes went through on the sheet (P31):  each count changed sent to its person, an update in
   * their inbox;  each newly confirmed row's guest put on the attendees' space's list.  NEVER throws.
   */
  written = (written: readonly PlaceEvent[]): void => {
    void this.afterWrites(written).catch((error) => console.error("SpaceSheets:  after a write", error))
  }

  /** See `written`. */
  private async afterWrites(written: readonly PlaceEvent[]): Promise<void> {
    const rules = await this.rules()
    if (!rules) return
    for (const { collection, id, row, was } of written) {
      const count = this.counting.get(id)
      if (count && collection === rules.allowance?.collection) {
        this.counting.delete(id)
        await this.sendCount(count)
      }
      const joins = rules.joins
      if (!joins || collection !== joins.collection || !row || row[STATUS_FIELD] !== CONFIRMED) continue
      if (was?.[STATUS_FIELD] === CONFIRMED) continue
      const guest = textOf(row[GUEST_FIELD]) || textOf(row[LISTED_FIELD])
      const attendees = guest ? this.membersAt(joins.address) : undefined
      if (!attendees) {
        console.error(`SpaceSheets:  ${joins.address} has no space's folder;  ${guest || id} wasn't added`)
        continue
      }
      if (await attendees.memberOf(guest)) continue
      await attendees.add(guest, GUEST_ROLE)
    }
  }

  /**
   * Is each row `changes` makes in the allowance's collection within its maker's allowance?  Notes each one's count,
   * sent once it lands (`written`).
   * - Their allowance:  their row on the list (`onlyFrom`), its field;  none listed, none.  A manager isn't held to it.
   * - Whose:  the row's `person`, else whoever's asking:  a manager confirming Bo's ticket counts Bo's.
   * - throws `PlaceError` `"refused"`, `"used up"`
   */
  private async allowanceOrDie(
    { allowance, onlyFrom }: SheetRules,
    identity: string,
    isManager: boolean,
    changes: readonly ThingChange[],
    rowsOf: SignUpAsk["rowsOf"]
  ): Promise<void> {
    const { collection, field } = allowance!
    const ours = changes.filter((change) => change.collection === collection)
    if (!ours.length) return
    const listed = onlyFrom ? await rowsOf(onlyFrom) : []
    const rows = await rowsOf(collection)
    // each person's rows, as the changes leave them:  a manager's changes count for the row's person
    const rowsBy = new Map<string, Set<string>>()
    const rowsOfPerson = (person: string) => {
      let theirs = rowsBy.get(person)
      if (!theirs) {
        theirs = new Set(rows.filter((row) => row[LISTED_FIELD] === person).map(({ id }) => `${id}`))
        rowsBy.set(person, theirs)
      }
      return theirs
    }
    for (const [position, { id, action, fields }] of ours.entries()) {
      const held = id === undefined ? undefined : rows.find((row) => `${row.id}` === id)
      const person = textOf(fields?.[LISTED_FIELD]) || textOf(held?.[LISTED_FIELD]) || identity
      const allowed = Number(listed.find((row) => row[LISTED_FIELD] === person)?.[field] ?? 0) || 0
      const theirs = rowsOfPerson(person)
      // one with no id yet still counts
      const key = id ?? `new ${position}`
      if (action === "remove") theirs.delete(key)
      else if (action === "make") {
        if (!isManager && theirs.size >= allowed) {
          throw new PlaceError(`"${collection}":  ${person} has asked for all ${allowed} of their ${field}`, {
            cause: { kind: "refused", whyNot: "used up" }
          })
        }
        theirs.add(key)
      }
      if (id !== undefined) this.counting.set(id, { person, used: theirs.size, allowed, field })
    }
  }

  /** SIDE EFFECT:  `person`'s count, an update from Spell in their inbox, written over the one before.  NEVER throws. */
  private async sendCount({ person, used, allowed, field }: AllowanceCount): Promise<void> {
    const inbox = await this.inboxOf?.(person)
    if (!inbox) return
    inbox.sendAsSpell(
      {
        recipients: person,
        thread: ALLOWANCE_THREAD,
        text: `You have used ${used} of your ${allowed} available ${field}`,
        used: `${used}`,
        allowed: `${allowed}`
      },
      { id: `${ALLOWANCE_THREAD}-${countKeyOf(this.address)}` }
    )
  }

  /** May `identity` sign up here, though they don't write it:  they read the space sign-ups come from. */
  private async signsUpHere({ signUpsFrom }: SheetRules, identity: string): Promise<boolean> {
    if (!signUpsFrom) return false
    return (await this.membersAt(signUpsFrom)?.mayRead(identity)) ?? false
  }

  /** - throws `PlaceError` `"refused"`, `"not listed"`, for someone the list `onlyFrom` doesn't name */
  private async listedOrDie(onlyFrom: string, identity: string, rowsOf: SignUpAsk["rowsOf"]): Promise<void> {
    const listed = await rowsOf(onlyFrom)
    if (listed.some((row) => row[LISTED_FIELD] === identity)) return
    throw new PlaceError(`Only the people its ${onlyFrom} list names sign up here, and ${identity} isn't one`, {
      cause: { kind: "refused", whyNot: "not listed" }
    })
  }

  /**
   * Is there a place for each row `changes` makes, or moves to another `field`?
   * - throws `PlaceError` `"refused"`, `"full"`, naming the value:  someone got the last place first
   */
  private async roomOrDie(
    { field, most }: SheetMost,
    changes: readonly ThingChange[],
    rowsOf: SignUpAsk["rowsOf"]
  ): Promise<void> {
    for (const { collection, id, action, fields } of changes) {
      if (action === "remove" || fields?.[field] === undefined) continue
      const value = keyOf(fields[field])
      const taken = (await rowsOf(collection)).filter((row) => row.id !== id && keyOf(row[field]) === value).length
      if (taken < most) continue
      throw new PlaceError(
        `"${collection}":  ${String(fieldText(fields[field]))} has no place left;  it takes ${most}`,
        {
          cause: { kind: "refused", whyNot: "full" }
        }
      )
    }
  }
}

/** Constructor props of `SpaceSheets`. */
export type SpaceSheetsProps = {
  /** The space's address. */
  address: string
  /** The space's files. */
  storage: DiskStorage
  /** The space's members. */
  members: SpaceMembers
  /** A space's members, by its address:  `undefined` for no space's own folder. */
  membersAt: (address: string) => SpaceMembers | undefined
  /** A person's inbox, by their address:  where their allowance's count is sent (P31).  Left out:  none is sent. */
  inboxOf?: (person: string) => Promise<PersonInbox | undefined>
}

/** One person's count of their allowance, sent once the write lands. */
type AllowanceCount = {
  /** Whose, by address. */
  person: string
  /** How many they've asked for. */
  used: number
  /** How many they may. */
  allowed: number
  /** What they're asking for, the list's field:  `invitations`. */
  field: string
}

/**
 * Only a manager confirms (P31):  a change setting a row's `status` in `collection` is refused.
 * - throws `PlaceError` `"refused"`, `"field"`
 */
function noStatusOrDie(collection: string, changes: readonly ThingChange[]): void {
  const confirming = changes.find((each) => each.collection === collection && each.fields?.[STATUS_FIELD] !== undefined)
  if (!confirming) return
  throw new PlaceError(`"${collection}":  only its managers set a row's ${STATUS_FIELD}`, {
    cause: { kind: "refused", whyNot: "field" }
  })
}

/** A field's value as text:  `""` for none. */
function textOf(value: unknown): string {
  return typeof value === "string" ? value : ""
}

/** The sheet's address as part of a message's id:  `picnic@rs/__private/signups` => `picnic_rs___private_signups`. */
function countKeyOf(address: string): string {
  return address.replace(/[^a-z0-9]/gi, "_")
}

/**
 * A sign-up is its signer's own:  a row naming someone else (`person`) is refused, so the published sheet can't show
 * Bo signing Cy up.  - throws `PlaceError` `"refused"`, `"owner"`
 */
function ownRowsOrDie(changes: readonly ThingChange[], identity: string): void {
  const other = changes.find(({ fields }) => fields?.[LISTED_FIELD] !== undefined && fields[LISTED_FIELD] !== identity)
  if (!other) return
  throw new PlaceError(`"${other.collection}":  you sign up as yourself, ${identity}, not as someone else`, {
    cause: { kind: "refused", whyNot: "owner" }
  })
}

/** A field's value as one key, to count a shift's rows:  text, a number, or a reference to a thing, alike. */
function keyOf(value: PlaceRow[string]): string {
  return JSON.stringify(value)
}

/** A field's value as a person reads it, for a refusal:  a reference's id, or the value. */
function fieldText(value: PlaceRow[string]): unknown {
  return value && typeof value === "object" && "$ref" in value ? (value as { $ref: unknown }).$ref : value
}

/** Rules as sent:  an address, a collection's name, fields and counts.  - throws `TypeError` */
function rulesOrDie(input: unknown): SheetRules {
  const { signUpsFrom, onlyFrom, mostEach, allowance, joins } = (input ?? {}) as Partial<SheetRules>
  if (signUpsFrom !== undefined && (typeof signUpsFrom !== "string" || !SP.SpellLocation.isAddress(signUpsFrom))) {
    throw new TypeError(`SpaceSheets:  sign-ups come from a space, by its address, not ${JSON.stringify(signUpsFrom)}`)
  }
  if (onlyFrom !== undefined && (typeof onlyFrom !== "string" || !onlyFrom)) {
    throw new TypeError("SpaceSheets:  the list of who may sign up is a collection, by its name")
  }
  const mosts = [mostEach ?? []].flat()
  if (!mosts.every(({ field, most }) => typeof field === "string" && Number.isInteger(most) && most > 0)) {
    throw new TypeError("SpaceSheets:  a shift's places are a field and a whole number above 0")
  }
  if (allowance !== undefined && !(isName(allowance.collection) && isName(allowance.field))) {
    throw new TypeError("SpaceSheets:  an allowance is a collection and the list's field that counts it")
  }
  if (joins !== undefined && !(isName(joins.collection) && SP.SpellLocation.isAddress(joins.address))) {
    throw new TypeError("SpaceSheets:  a confirmed row joins a space, by its collection and the space's address")
  }
  const most = mosts.map(({ field, most }) => ({ field, most }))
  return {
    ...(signUpsFrom && { signUpsFrom }),
    ...(onlyFrom && { onlyFrom }),
    ...(most.length && { mostEach: most.length === 1 ? most[0]! : most }),
    ...(allowance && { allowance: { collection: allowance.collection, field: allowance.field } }),
    ...(joins && { joins: { collection: joins.collection, address: joins.address } })
  }
}

/** A collection's or field's name:  some text. */
function isName(value: unknown): value is string {
  return typeof value === "string" && !!value
}
