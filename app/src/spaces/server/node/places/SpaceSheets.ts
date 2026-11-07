import {
  PlaceError,
  SPACE_SHEET_OPERATIONS,
  type PlaceContext,
  type PlaceRow,
  type SheetRules,
  type ThingChange
} from "spell/places/places.types"
import type { FolderOperation, SignUpAsk } from "spell/server/places"
import { SP } from "spell/parser/spell"
import type { DiskStorage } from "spell/app/spaces/server/node/storage/DiskStorage"
import { readJSON5, writeJSON5 } from "spell/app/spaces/server/node/storage/json5"

import type { SpaceMembers } from "./SpaceMembers"

/** Where a space keeps its sign-up sheet's rules:  in its `__settings/`, so never listed, read direct or exported. */
const SHEET_FILE = "__settings/sheet.json5"

/** The field a list of who may sign up names each one by:  an attendee's `person`. */
const LISTED_FIELD = "person"

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
 *   - `- at most 2 rows for each shift`:  a shift's last place goes to one person, the other is told it's gone
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
  /** Its rules, read once. */
  private kept: Promise<SheetRules | undefined> | undefined

  constructor({ address, storage, members, membersAt }: SpaceSheetsProps) {
    this.address = address
    this.storage = storage
    this.members = members
    this.membersAt = membersAt
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
    if (rules.mostEach) await this.roomOrDie(rules.mostEach, sheetChanges, rowsOf)
    return isSignUp
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
    { field, most }: NonNullable<SheetRules["mostEach"]>,
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

/** Rules as sent:  an address, a collection's name, a field and a count.  - throws `TypeError` */
function rulesOrDie(input: unknown): SheetRules {
  const { signUpsFrom, onlyFrom, mostEach } = (input ?? {}) as Partial<SheetRules>
  if (signUpsFrom !== undefined && (typeof signUpsFrom !== "string" || !SP.SpellLocation.isAddress(signUpsFrom))) {
    throw new TypeError(`SpaceSheets:  sign-ups come from a space, by its address, not ${JSON.stringify(signUpsFrom)}`)
  }
  if (onlyFrom !== undefined && (typeof onlyFrom !== "string" || !onlyFrom)) {
    throw new TypeError("SpaceSheets:  the list of who may sign up is a collection, by its name")
  }
  const isMost =
    mostEach === undefined ||
    (typeof mostEach.field === "string" && Number.isInteger(mostEach.most) && mostEach.most > 0)
  if (!isMost) throw new TypeError("SpaceSheets:  a shift's places are a field and a whole number above 0")
  return {
    ...(signUpsFrom && { signUpsFrom }),
    ...(onlyFrom && { onlyFrom }),
    ...(mostEach && { mostEach: { field: mostEach.field, most: mostEach.most } })
  }
}
