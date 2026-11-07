import { ChunkedPlace, type ChunkList, type ChunkListEdit, type ChunkStore } from "spell/places/ChunkedPlace"
import { JsonChunks } from "spell/places/JsonChunks"
import {
  BY_FIELD,
  OWNER_FIELD,
  PlaceError,
  SPACE_SETTINGS_DEFAULT,
  idOfRow,
  thingKindOf,
  type ApplyAnswer,
  type ChangesAnswer,
  type ListAnswer,
  type ListQuery,
  type PlaceCapabilities,
  type PlaceChange,
  type PlaceContext,
  type PlaceEvent,
  type PlaceRow,
  type SelectingContext,
  type SpaceMember,
  type SpaceSettings,
  type ThingChange,
  type WatchTarget,
  type WhoWrites,
  type WriteAnswer,
  type WriteQuestion
} from "spell/places/places.types"

import { contentVersion } from "./contentVersion"
import { PlaceEvents } from "./PlaceEvents"
import { NOTHING_TAKEN_DOWN, isThingTakenDown, takenDownError, type TakenDown } from "./takenDown"

/** How long after a file is heard changing the folder is looked at:  a storage may tell each write of one save. */
const SETTLE_MS = 50

/** What a refusal calls a folder taken down whole. */
const WHOLE_FOLDER = "this space"

/** A million bytes, for saying a size in words. */
const MB = 1024 * 1024

/****************
 * ### `FolderPlace`
 * A folder as a place:  a list file, and one file per thing, fetched when needed (epic `data` P5, J6).
 *
 * ```ts
 * const place = new FolderPlace({
 *   storage: new ChunkFiles({ root: "recipe-files" }),
 *   format: new JsonChunks({ summaries: { recipes: ["title"] } })
 * })
 * ```
 *
 * - On an object shaped like the app's `SpaceStorage` (`FolderStorage`), so the app's `DiskStorage` fits as it stands.
 * - A `ChunkedPlace`:  a read of the list reads no bodies.
 * - The files are the truth:  edit one in VS Code, and the place follows.
 *   - Each read first checks the folder's names and each file's version against what the list file says (`keepInStep()`):
 *     only a file that differs is read, and the list file is rewritten.  So an edit made with nothing running is found too.
 *   - A file that isn't JSON yet (half typed):  its thing stays as it last read, logged once;  its next save is picked up.
 *   - A `watch()` is told what changed, through the storage's own watch:  so this adds no file watcher.
 * - Conflicts:  a storage with `writeIfVersion` refuses a change made from an old version, `"out of date"`, and the engine
 *   merges per field.  Without one, the last save wins.
 *   - A thing's VERSION IS MADE FROM ITS CONTENT (`contentVersion()`, epic `atmosphere` P1):  a save that changes nothing
 *     (a `touch`, a checkout, the file laid out again) moves nothing, so it never makes a change out of date.
 *   - Each file's own stamp is kept beside it in the list (`stamps`), so a changed file is still found without reading it.
 * - OWNERS, when it's told `whoWrites: "only the owner"` (a program's own project data folder, epic `atmosphere` P1):
 *   - each thing made is its maker's:  `owner`, the field an atmosphere account's rows say it in, from who's asking
 *     (`PlaceContext.identity`);  a change can't claim another
 *   - a change to someone else's is refused, `"owner"`, unless `mayChangeAnyRow()` says yes for who's asking
 * - MEMBERS, when it's told `whoWrites: "its members"` (a space's own folder, epic `atmosphere` P4):
 *   - every thing is the space's, written as its own id (`owner` is `space.id`, `@family`), as an AT Protocol Space's
 *     own account writes it:  so a recipe Ana and Bo both edit is one thing
 *   - who's asking must be a member whose role writes (`space.memberOf()`), or the whole change is refused, `"role"`
 *   - and a member to read it (epic `atmosphere` P5, T15):  anyone else's read is refused, `"role"`, as a read direct
 *     with no credential is
 *   - unless its settings say otherwise (`space.settings()`, epic `atmosphere` P7, Q13), as an AT Protocol Space's:
 *     - `publicRead`:  anyone reads it, signed in or not
 *     - `publicWrite`:  anyone signed in adds things, each still the space's own, and changes or removes only the
 *       ones whose `by` is them;  anyone else's is refused, `"owner"`.  A member whose role writes changes any.
 *   - BY KIND OF THING (epic `atmosphere` P23):  handed a write check (`space.changeOrDie()`), it asks it of each
 *     change a member makes, its kind of thing (`thingKindOf()`:  a post, a row, a file, an app) and who wrote it last;
 *     the check says what each role may do, and this knows nothing of roles
 * - LIMITS (`limits`, epic `atmosphere` P7):  a thing's file, and the whole folder (`bytesInUse()`), each at most so
 *   many bytes.  A save past either is refused, `"over the ceiling"`, saying how big;  the page keeps it.
 * - Either way, who wrote each thing last is `by` (`BY_FIELD`), from who's asking:  a change can't claim it.
 * - TAKEN DOWN (epic `atmosphere` P6), as its host says (`takenDown`, the app's `Takedowns`), asked afresh each time:
 *   - the whole folder:  every read and write refused, `"taken down"`, naming the host's abuse contact
 *   - a thing:  left out of every read, and a change to it refused the same way
 *   - a watcher, or a reader asking what changed, hears it as removed;  put back, as there again
 *   - its file stays on the disk:  undoing it is a line in the host's log
 * - A request saying nobody (the folder's own code, a test) is trusted:  it's on this machine already.
 * - Its own operations (`operations`), answered by `call()`:  the app's member list (`SPACE_MEMBER_OPERATIONS`).
 * - Node only:  a browser reaches one through `PlaceServer`.
 ****************/
export class FolderPlace extends ChunkedPlace {
  /** The files. */
  private readonly storage: FolderStorage
  /** The JSON format, for its folders and file names. */
  private readonly json: JsonChunks
  /** Who's watching, and what's been heard. */
  private readonly events: PlaceEvents
  /** Which things the storage said changed, by collection:  for a storage with no versions to compare. */
  private readonly heard = new Map<string, Set<string>>()
  /** Each thing's body as it was last read whole, by collection and id:  what a half typed file answers with. */
  private readonly lastGood = new Map<string, PlaceRow>()
  /** Which version of which file couldn't be read, so each is logged once. */
  private readonly unreadable = new Set<string>()
  /** The timer that looks at the folder after a change is heard. */
  private settleTimer: NodeJS.Timeout | undefined
  /** What it says of itself, past what a folder can:  who writes, how often it may be asked, who it takes people to be. */
  private readonly says: Pick<PlaceCapabilities, "whoWrites" | "checkedAtMostEvery" | "identifiesBy">
  /** May this person change anyone's things, not only their own?  Left out:  nobody may. */
  private readonly mayChangeAnyRow: ((identity: string) => Promise<boolean>) | undefined
  /** The space it's a folder of, for `"its members"`. */
  private readonly space: FolderSpace | undefined
  /** Its own operations, by name. */
  private readonly operations: Readonly<Record<string, FolderOperation>>
  /** What's taken down in it now, as its host says. */
  private readonly takenDown: (identity: string | undefined) => Promise<TakenDown>
  /** Each thing taken down when it last looked, by collection:  so a takedown, or its undoing, is told once. */
  private readonly toldDown = new Map<string, Set<string>>()
  /** The most a thing's file, and the whole folder, may hold, in bytes. */
  private readonly limits: FolderLimits
  /** How many bytes the whole folder holds now. */
  private readonly bytesInUse: (() => Promise<number>) | undefined
  /** Told of each write that went through. */
  private readonly onWritten: FolderPlaceProps["onWritten"]

  constructor({
    storage,
    format = new JsonChunks(),
    whoWrites,
    mayChangeAnyRow,
    space,
    operations = {},
    takenDown = async () => NOTHING_TAKEN_DOWN,
    limits = {},
    bytesInUse,
    checkedAtMostEvery,
    identifiesBy,
    onWritten
  }: FolderPlaceProps) {
    if (whoWrites === "its members" && !space) {
      throw new TypeError(`FolderPlace:  whoWrites "its members" needs a space:  pass its id and memberOf()`)
    }
    super({ store: storage, format })
    this.storage = storage
    this.json = format
    this.events = new PlaceEvents({ onFirstWatcher: () => this.hearTheDisk() })
    this.says = {
      ...(whoWrites && { whoWrites }),
      ...(checkedAtMostEvery !== undefined && { checkedAtMostEvery }),
      ...(identifiesBy && { identifiesBy })
    }
    this.mayChangeAnyRow = mayChangeAnyRow
    this.space = space
    this.operations = operations
    this.takenDown = takenDown
    this.limits = limits
    this.bytesInUse = bytesInUse
    this.onWritten = onWritten
  }

  /** What it can do:  what a `ChunkedPlace` can, and it hears changes from the disk;  and what it was told to say. */
  describe(): PlaceCapabilities {
    return { ...super.describe(), live: "push", ...this.says }
  }

  ////////////////
  // ## Reading
  ////////////////

  /** The list, once it's in step with the folder:  see `ChunkedPlace.list()`. */
  async list(collection: string, query: ListQuery, context: PlaceContext = {}): Promise<ListAnswer> {
    await this.mayReadOrDie(context)
    const down = await this.inStepUnlessDown(collection, context)
    const answer = await super.list(collection, query, context)
    return { ...answer, rows: this.withoutTakenDown(down, collection, answer.rows), version: this.events.version }
  }

  /** The things with these ids, once the list is in step with the folder. */
  async getMany(collection: string, ids: readonly string[], context: SelectingContext = {}): Promise<PlaceRow[]> {
    await this.mayReadOrDie(context)
    const down = await this.inStepUnlessDown(collection, context)
    return this.withoutTakenDown(down, collection, await super.getMany(collection, ids, context))
  }

  /**
   * One thing's body:  see `ChunkedPlace.bodyOf()`.
   * - A file that isn't JSON yet answers with its body as it was last read, so a read of the rest still works.
   */
  async bodyOf(collection: string, id: string, context: PlaceContext = {}): Promise<PlaceRow | undefined> {
    const key = `${collection}\n${id}`
    try {
      const body = await super.bodyOf(collection, id, context)
      if (body) this.lastGood.set(key, body)
      else this.lastGood.delete(key)
      return body
    } catch (error) {
      if (!(error instanceof SyntaxError)) throw error
      this.logUnreadable(collection, id, error)
      return this.lastGood.get(key)
    }
  }

  /** What changed in `collection` since `token`, a list's `version`:  a token from another run answers with every thing. */
  async changesSince(collection: string, token: string, context: PlaceContext = {}): Promise<ChangesAnswer> {
    await this.mayReadOrDie(context)
    const down = await this.inStepUnlessDown(collection, context)
    const known = this.events.changesSince(collection, token)
    if (known) return { ...known, rows: this.withoutTakenDown(down, collection, known.rows) }
    const rows = this.withoutTakenDown(down, collection, await this.allRows(collection, context))
    return { rows, removed: [], token: this.events.version }
  }

  /** Tell `onEvent` of each change to `target`, by this place or on the disk.  Returns what stops it. */
  watch(target: WatchTarget, onEvent: (event: PlaceEvent) => void): () => void {
    return this.events.watch(target, onEvent)
  }

  /**
   * Written by its members, it's read by them only:  who's asking must be one (epic `atmosphere` P5, T15);
   *   or anyone, once it's `publicRead` (P7, Q13).
   * - A request saying nobody is trusted, as for a write.
   * - throws `PlaceError` `"refused"`, `"role"`
   */
  private async mayReadOrDie({ identity }: PlaceContext): Promise<void> {
    if (this.says.whoWrites !== "its members" || identity === undefined) return
    const space = this.space!
    if ((await space.memberOf(identity))?.canRead) return
    if ((await this.settingsOf(space)).publicRead) return
    throw new PlaceError(`You can't read this:  you aren't a member of ${space.id}`, {
      cause: { kind: "refused", whyNot: "role" }
    })
  }

  /** Every thing in `collection`, whole. */
  private async allRows(collection: string, context: PlaceContext): Promise<PlaceRow[]> {
    const { rows } = await this.listOf(collection, context)
    return super.getMany(
      collection,
      rows.map((row) => idOfRow(row, this.idField)!),
      context
    )
  }

  ////////////////
  // ## Writing
  ////////////////

  /**
   * Make these changes, and tell whoever's watching:  see `ChunkedPlace.apply()`.
   * - throws `PlaceError` `"refused"`, its reason one of (see the class):
   *   - `"owner"`:  a change to someone else's thing
   *   - `"role"`:  from someone whose role in the space can't write
   *   - `"taken down"`:  a change to something taken down
   * - throws `PlaceError` `"over the ceiling"`, for a thing, or the folder, past its limit (`limits`)
   */
  async apply(_changes: readonly PlaceChange[], context: PlaceContext = {}): Promise<ApplyAnswer> {
    await this.notTakenDownOrDie(_changes, context)
    const changes =
      this.says.whoWrites === "its members"
        ? await this.membersChanges(_changes, context)
        : await this.ownedChanges(_changes, context)
    await this.withinLimitsOrDie(changes)
    const answer = await super.apply(changes, context)
    const written: PlaceEvent[] = []
    for (const { kind, collection, id } of changes) {
      if (id === undefined) continue
      const row = answer.rows.findLast((one) => idOfRow(one, this.idField) === id)
      const event = { collection, id, ...(kind !== "delete" && row && { row }) }
      this.events.tell(event)
      written.push(event)
    }
    if (written.length) this.onWritten?.(written)
    return answer
  }

  /**
   * Would it take this write?  Someone else's thing isn't yours to change:  a hint, as a keeper of the folder may.
   * - Written by its members:  `true`, as whose role writes is only known by asking (`apply()` says).
   */
  canWrite({ row, identity }: WriteQuestion): WriteAnswer {
    const owner = row?.[OWNER_FIELD]
    const isOwnersOnly = this.says.whoWrites === "only the owner"
    if (!isOwnersOnly || identity === undefined || owner === undefined || owner === identity) {
      return { canWrite: true }
    }
    return { canWrite: false, whyNot: "owner" }
  }

  /**
   * `changes`, as who's asking may make them:  each new thing theirs, and nothing of someone else's changed.
   * - throws `PlaceError` `"refused"`, `"owner"`
   */
  private async ownedChanges(changes: readonly PlaceChange[], { identity }: PlaceContext): Promise<PlaceChange[]> {
    if (!this.says.whoWrites || identity === undefined) return [...changes]
    const owned: PlaceChange[] = []
    let mayChangeAny: boolean | undefined
    for (const change of changes) {
      if (change.kind === "insert") {
        owned.push(writtenBy(change, identity, { [OWNER_FIELD]: identity }))
        continue
      }
      const owner = change.id === undefined ? undefined : await this.ownerOf(change.collection, change.id)
      if (owner !== undefined && owner !== identity) {
        mayChangeAny ??= (await this.mayChangeAnyRow?.(identity)) ?? false
        if (!mayChangeAny) {
          throw new PlaceError(`"${change.collection}" ${change.id} is ${owner}'s, and only they can change it`, {
            cause: { kind: "refused", whyNot: "owner" }
          })
        }
      }
      owned.push(writtenBy(change, identity))
    }
    return owned
  }

  /**
   * `changes`, as a member of the space makes them:  each thing the space's own, and `by` them.
   * - throws `PlaceError` `"refused"`, `"role"`, for someone whose role can't write, or who isn't a member
   */
  private async membersChanges(changes: readonly PlaceChange[], { identity }: PlaceContext): Promise<PlaceChange[]> {
    if (identity === undefined) return [...changes]
    const space = this.space!
    const member = await space.memberOf(identity)
    if (member && space.changeOrDie) {
      for (const change of changes) await space.changeOrDie(await this.thingChange(change, identity, member))
    } else if (!member?.canWrite) {
      if (!(await this.settingsOf(space)).publicWrite) {
        const why = member
          ? `you're a ${member.role} of ${space.id}, a role that only reads`
          : `you aren't a member of ${space.id}`
        throw new PlaceError(`Your role can't write here:  ${why}`, { cause: { kind: "refused", whyNot: "role" } })
      }
      await this.ownThingsOnlyOrDie(changes, identity)
    }
    return changes.map((change) =>
      writtenBy(change, identity, change.kind === "insert" ? { [OWNER_FIELD]: space.id } : {})
    )
  }

  /**
   * `change`, as the space's write check is asked it:  its kind of thing, made, changed or removed, and who wrote it.
   * - A new thing with the id of one already there is a change to it.
   */
  private async thingChange(change: PlaceChange, identity: string, member: SpaceMember): Promise<ThingChange> {
    const { collection, id, kind } = change
    const before = id === undefined ? undefined : await this.bodyOf(collection, id)
    const by = before?.[BY_FIELD]
    const action = kind === "delete" ? "remove" : before ? "change" : "make"
    return {
      identity,
      member,
      collection,
      kind: thingKindOf(collection),
      action,
      ...(typeof by === "string" && { by }),
      ...(change.fields && { fields: change.fields })
    }
  }

  /**
   * Under `publicWrite`, someone whose role doesn't write changes only what they wrote:  each thing whose `by` is them.
   * - A new thing is always theirs;  one made with the id of a thing already there is a change to it.
   * - throws `PlaceError` `"refused"`, `"owner"`, for a change to anyone else's
   */
  private async ownThingsOnlyOrDie(changes: readonly PlaceChange[], identity: string): Promise<void> {
    for (const { collection, id } of changes) {
      if (id === undefined) continue
      const by = (await this.bodyOf(collection, id))?.[BY_FIELD]
      if (by === undefined || by === identity) continue
      const whose = typeof by === "string" ? `${by}'s` : "someone else's"
      throw new PlaceError(
        `"${collection}" ${id} is ${whose}:  you can change only what you added, and the space's members anything`,
        { cause: { kind: "refused", whyNot: "owner" } }
      )
    }
  }

  /** The space's settings:  members only, for a space that has none. */
  private async settingsOf(space: FolderSpace): Promise<SpaceSettings> {
    return (await space.settings?.()) ?? SPACE_SETTINGS_DEFAULT
  }

  ////////////////
  // ## Limits
  ////////////////

  /**
   * Is each thing `changes` makes within `limits.thing`, and the folder, after them, within `limits.space`?
   * - A thing's size is its file's:  its body after the change, as JSON.
   * - throws `PlaceError` `"over the ceiling"`, saying how big, and that the page keeps it
   */
  private async withinLimitsOrDie(changes: readonly PlaceChange[]): Promise<void> {
    const { thing: mostForThing, space: mostForSpace } = this.limits
    if (mostForThing === undefined && mostForSpace === undefined) return
    let growth = 0
    for (const change of changes) {
      const before = change.id === undefined ? undefined : await this.bodyOf(change.collection, change.id)
      const was = before ? byteSize(before) : 0
      if (change.kind === "delete") {
        growth -= was
        continue
      }
      const size = byteSize({ ...before, ...change.fields })
      growth += size - was
      if (mostForThing !== undefined && size > mostForThing) {
        throw overTheCeiling(
          `This ${change.collection} thing is ${inWords(size)}, over the ${inWords(mostForThing)} one may hold`
        )
      }
    }
    await this.roomForOrDie(growth)
  }

  /**
   * Is there room in the folder for `growth` more bytes, within `limits.space`?
   * - Public for what keeps more than things in the folder:  a space's files' bytes count against the same limit
   *   (`FolderFiles`, epic `atmosphere` P15), not a second count.
   * - throws `PlaceError` `"over the ceiling"`, saying how full it is
   */
  async roomForOrDie(growth: number): Promise<void> {
    const mostForSpace = this.limits.space
    if (mostForSpace === undefined || growth <= 0 || !this.bytesInUse) return
    const inUse = await this.bytesInUse()
    if (inUse + growth > mostForSpace) {
      throw overTheCeiling(
        `This space holds ${inWords(inUse)} of the ${inWords(mostForSpace)} it may, too full for this`
      )
    }
  }

  /**
   * Every thing in `collection`, whole, taken down or not, once the list is in step with the folder.
   * - For the folder's own keeping, NEVER a reader's answer:  what a space's files point to (`FolderFiles`), so bytes
   *   a taken-down file still points to are kept for its putting back.
   */
  async everyThingKept(collection: string): Promise<PlaceRow[]> {
    await this.keepInStep(collection)
    return this.allRows(collection, {})
  }

  ////////////////
  // ## Its operations
  ////////////////

  /**
   * Run its operation `name`, as who's asking (`context.identity`):  see `operations`.
   * - throws `PlaceError` `"not found"` for one it hasn't;  `"refused"`, `"taken down"`, for a folder taken down;
   *   what the operation throws
   */
  async call(name: string, input: unknown, context: SelectingContext = {}): Promise<unknown> {
    const operation = Object.hasOwn(this.operations, name) ? this.operations[name] : undefined
    if (!operation) throw new PlaceError(`FolderPlace:  no operation "${name}"`, { cause: { kind: "not found" } })
    const down = await this.takenDown(context.identity)
    if (down.isWhole) throw takenDownError(WHOLE_FOLDER, down)
    return operation(input, context)
  }

  /** Who owns this thing, as its file says:  `undefined` for one nobody owns, or that isn't there. */
  private async ownerOf(collection: string, id: string): Promise<string | undefined> {
    const owner = (await this.bodyOf(collection, id))?.[OWNER_FIELD]
    return typeof owner === "string" ? owner : undefined
  }

  ////////////////
  // ## Taken down
  ////////////////

  /**
   * In step with the folder, unless it's all taken down:  what's taken down now, each change to it told.
   * - throws `PlaceError` `"refused"`, `"taken down"`, for a folder taken down whole
   */
  private async inStepUnlessDown(collection: string, { identity }: PlaceContext): Promise<TakenDown> {
    const down = await this.takenDown(identity)
    if (down.isWhole) throw takenDownError(WHOLE_FOLDER, down)
    await this.keepInStep(collection)
    await this.tellTakedowns(down, collection)
    return down
  }

  /** `rows` of `collection`, without what's taken down. */
  private withoutTakenDown(down: TakenDown, collection: string, rows: PlaceRow[]): PlaceRow[] {
    if (!down.things.get(collection)?.size) return rows
    return rows.filter((row) => !isThingTakenDown(down, collection, idOfRow(row, this.idField) ?? ""))
  }

  /**
   * Tell whoever's watching, and the changes since a token, of each thing of `collection` taken down or put back since
   * it last looked:  taken down, as removed;  put back, as there again, with its row.
   */
  private async tellTakedowns(down: TakenDown, collection: string): Promise<void> {
    const now = new Set(down.things.get(collection) ?? [])
    const before = this.toldDown.get(collection) ?? new Set<string>()
    this.toldDown.set(collection, now)
    for (const id of now) if (!before.has(id)) this.events.tell({ collection, id })
    for (const id of before) {
      if (now.has(id)) continue
      const row = await this.bodyOf(collection, id)
      this.events.tell({ collection, id, ...(row && { row }) })
    }
  }

  /** - throws `PlaceError` `"refused"`, `"taken down"`, when the folder, or a thing `changes` touch, is taken down */
  private async notTakenDownOrDie(changes: readonly PlaceChange[], { identity }: PlaceContext): Promise<void> {
    const down = await this.takenDown(identity)
    if (down.isWhole) throw takenDownError(WHOLE_FOLDER, down)
    const hit = changes.find(({ collection, id }) => id !== undefined && isThingTakenDown(down, collection, id))
    if (hit) throw takenDownError(`"${hit.collection}" ${hit.id}`, down)
  }

  ////////////////
  // ## Versions
  ////////////////

  /** A thing's version is made from what its file holds (`contentVersion()`):  a file that isn't JSON yet, its stamp. */
  protected thingVersion(
    text: string,
    { collection, id, stamp }: { collection: string; id: string; stamp: string | undefined }
  ): string | undefined {
    try {
      return contentVersion(this.json.bodyIn(text, collection, id))
    } catch (error) {
      if (!(error instanceof SyntaxError)) throw error
      return stamp
    }
  }

  ////////////////
  // ## In step with the disk
  ////////////////

  /**
   * Bring the list of `collection` into step with its folder:  in the place's turn, so never in the middle of a write.
   * - Tells whoever's watching of each thing that had changed.
   * - Public for a host serving the files straight (`DirectReads`):  so its first read sees a file edited by hand.
   * - NEVER throws for a file it can't read:  that thing stays as it was.
   */
  keepInStep(collection: string): Promise<void> {
    return this.inTurn(async () => {
      const events = await this.differences(collection)
      if (!events.length) return
      await this.editList(
        collection,
        events.map((event) => this.listEditFor(event))
      )
      for (const { id, row, isSame } of events) {
        if (!isSame) this.events.tell({ collection, id, ...(row && { row }) })
      }
    })
  }

  /**
   * What's different in the folder from what the list says, as events.
   * - A file whose stamp moved but whose content didn't (`isSame`):  only its stamp is noted, and nobody's told.
   */
  private async differences(collection: string): Promise<DiskEvent[]> {
    const folder = this.json.folderOf(collection)
    const names = await this.storage.list(folder)
    const ids = new Set(names.flatMap((name) => this.json.idOfFile(name) ?? []))
    const list = await this.listOf(collection)
    const listed = new Set(list.rows.map((row) => idOfRow(row, this.idField)!))
    const heard = this.heard.get(collection)
    this.heard.delete(collection)

    const events: DiskEvent[] = []
    for (const id of listed) if (!ids.has(id)) events.push({ collection, id })
    for (const id of ids) {
      const file = this.json.bodyAddress(collection, id)
      const stamp = this.storage.versionOf?.(file)
      // a list from before content versions has stamps as its versions:  each file is read once, and the list made again
      const known = list.stamps?.[id]
      const isSame = stamp === undefined ? !heard?.has(id) : stamp === known
      if (listed.has(id) && isSame) continue
      const row = await this.rowInFile(collection, id, file)
      if (!row) continue
      const version = contentVersion(row)
      events.push({
        collection,
        id,
        row,
        version,
        ...(stamp !== undefined && { stamp }),
        ...(listed.has(id) && version === list.versions?.[id] && { isSame: true })
      })
    }
    return events
  }

  /** The thing in this file;  `undefined`, logged once per version, if it can't be read. */
  private async rowInFile(collection: string, id: string, file: string): Promise<PlaceRow | undefined> {
    const text = await this.storage.read(file)
    if (text === undefined) return undefined
    try {
      const body = this.json.bodyIn(text, collection, id)
      this.lastGood.set(`${collection}\n${id}`, body)
      return body
    } catch (error) {
      this.logUnreadable(collection, id, error)
      return undefined
    }
  }

  /** Say a thing's file can't be read:  once, for each time it's saved. */
  private logUnreadable(collection: string, id: string, error: unknown): void {
    const file = this.json.bodyAddress(collection, id)
    const seen = `${file}\n${this.storage.versionOf?.(file)}`
    if (this.unreadable.has(seen)) return
    this.unreadable.add(seen)
    console.error(`FolderPlace:  can't read ${file} yet;  "${id}" stays as it was until it's fixed:`, error)
  }

  /** What `event` means to the list. */
  private listEditFor({ collection, id, row, version, stamp }: DiskEvent): ChunkListEdit {
    if (!row) return (list: ChunkList) => this.leaveOut(list, id)
    return (list: ChunkList) => this.putIn(list, id, this.summaryOf(row, collection), version, stamp)
  }

  /** Hear the storage:  each thing's file changing means a look at its folder, soon.  Returns what stops it. */
  private hearTheDisk(): () => void {
    const stop = this.storage.watch("", (path) => this.fileHeard(path))
    return () => {
      stop()
      clearTimeout(this.settleTimer)
    }
  }

  /** The storage says `path` changed:  note it, if it's a thing's file. */
  private fileHeard(path: string): void {
    const [folder, name, ...rest] = path.split("/")
    const id = name === undefined || rest.length ? undefined : this.json.idOfFile(name)
    if (id === undefined) return
    const collection = this.json.collectionOfFolder(folder!)
    let ids = this.heard.get(collection)
    if (!ids) this.heard.set(collection, (ids = new Set()))
    ids.add(id)
    clearTimeout(this.settleTimer)
    this.settleTimer = setTimeout(() => this.settleHeard(), SETTLE_MS)
  }

  /** Look at each folder heard from.  - NEVER throws:  a failure is logged, and the next read looks again */
  private settleHeard(): void {
    for (const collection of this.heard.keys()) {
      this.keepInStep(collection).catch((error: unknown) =>
        console.error(`FolderPlace:  can't look at "${collection}" after a change on the disk:`, error)
      )
    }
  }
}

/**
 * What a folder place stands on:  the same shape as the app's `SpaceStorage`, so its `DiskStorage` fits.
 * - Paths are `/`-separated, from the storage's own root.
 */
export type FolderStorage = ChunkStore & {
  /** Write file `path` whole, making its folders:  all at once. */
  write(path: string, text: string): Promise<void>
  /** The names in folder `folder` (`""` for the root), sorted:  a folder's ends in `/`;  `[]` for a folder that isn't there. */
  list(folder: string): Promise<string[]>
  /** Remove file or folder `path`;  nothing if it isn't there. */
  remove(path: string): Promise<void>
  /** Call `onChange(path)` with each file or folder that changes under `folder`, by anyone.  Returns what stops it. */
  watch(folder: string, onChange: (path: string) => void): () => void
}

/** The space a folder written by its members is in:  what `whoWrites: "its members"` needs (epic `atmosphere` P4). */
export type FolderSpace = {
  /** Its own id, which every thing is written as:  `@family`, `owen@spell`. */
  id: string
  /** Who's asking, as a member, with what their role lets them do:  `undefined` for someone who isn't one. */
  memberOf(identity: string): Promise<SpaceMember | undefined>
  /** Who besides its members reads and writes it (epic `atmosphere` P7, Q13), asked afresh.  Left out:  nobody. */
  settings?(): Promise<SpaceSettings>
  /**
   * May this change be made, by its kind of thing and who's asking (epic `atmosphere` P23)?  Asked of each change a
   * member makes, so a role writes some kinds and not others:  the app's `SpaceMembers.changeOrDie()`.
   * - Left out:  any member whose role writes (`canWrite`) changes anything, as before.
   * - throws `PlaceError` `"refused"`, `"role"` (with what it `needs`) or `"owner"`, to refuse
   */
  changeOrDie?(change: ThingChange): Promise<void>
}

/** The most a folder holds, in bytes:  each left out, no limit. */
export type FolderLimits = {
  /** One thing's file. */
  thing?: number
  /** Every file of the folder, as `bytesInUse()` counts them. */
  space?: number
}

/** One of a folder's own operations:  `input` as sent, and who's asking in `context.identity`.  - throws to refuse */
export type FolderOperation = (input: unknown, context: PlaceContext) => Promise<unknown>

/** Constructor props of a `FolderPlace`. */
export type FolderPlaceProps = {
  /** The files:  `ChunkFiles`, or the app's `DiskStorage`. */
  storage: FolderStorage
  /** What's in them, and which fields each list holds. */
  format?: JsonChunks
  /**
   * Who writes it (see the class):  left out, anyone.
   * - `"only the owner"`:  each thing is its maker's, and only they change it
   * - `"its members"`:  the space's members whose role writes, every thing the space's own;  needs `space`
   */
  whoWrites?: WhoWrites
  /**
   * May `identity` change anyone's things, as a keeper of the folder?
   * - Asked once per `apply()`.
   * - Left out:  nobody may.
   */
  mayChangeAnyRow?: (identity: string) => Promise<boolean>
  /** The space it's a folder of:  for `whoWrites: "its members"`, who's a member, asked once per `apply()`. */
  space?: FolderSpace
  /** Its own operations, by name, answered by `call()`:  through `PlaceServer`'s `call`.  Left out:  none. */
  operations?: Readonly<Record<string, FolderOperation>>
  /**
   * What's taken down in it now, for who's asking, as its host says (epic `atmosphere` P6):  asked for each read and
   * write, so their own account taken down is the whole folder, for them.  Left out:  nothing ever is.
   */
  takenDown?: (identity: string | undefined) => Promise<TakenDown>
  /** The most a thing's file, and the whole folder, may hold, in bytes (epic `atmosphere` P7).  Left out:  no limit. */
  limits?: FolderLimits
  /** How many bytes the whole folder holds now, for `limits.space`:  asked once per `apply()` that grows it. */
  bytesInUse?: () => Promise<number>
  /** The least time between two asks of what changed, in seconds, that it will take:  `describe()` says it. */
  checkedAtMostEvery?: number
  /** Who it takes people to be, with no sign-in:  `describe()` says it. */
  identifiesBy?: PlaceCapabilities["identifiesBy"]
  /**
   * Told of each `apply()` that went through, once it's on the disk:  each thing written, whole (`row`), or deleted (none).
   * - The app's `SpaceFolders` copies a space's writes into a real AT Protocol Space this way (epic `atmosphere` P14).
   * - MUST NOT throw:  the write has happened.
   */
  onWritten?: (written: readonly PlaceEvent[]) => void
}

/** One thing found different on the disk:  its content's version, and its file's stamp. */
type DiskEvent = PlaceEvent & {
  /** Its version, from its content. */
  version?: string
  /** Its file's own version in the storage. */
  stamp?: string
  /** Only its stamp moved:  what it holds is the same, so nobody's told. */
  isSame?: boolean
}

/**
 * `change`, written by `identity`:  `by` them, with `stamped` (its owner), and nothing it claimed of either.
 * - A delete writes nothing, so it's left as it is.
 */
function writtenBy(change: PlaceChange, identity: string, stamped: PlaceRow = {}): PlaceChange {
  if (change.kind === "delete") return change
  const { [OWNER_FIELD]: _owner, [BY_FIELD]: _by, ...fields } = change.fields ?? {}
  return { ...change, fields: { ...fields, ...stamped, [BY_FIELD]: identity } }
}

/** `row`'s size as a thing's file holds it, in bytes:  its JSON. */
function byteSize(row: PlaceRow): number {
  return Buffer.byteLength(JSON.stringify(row), "utf8")
}

/** `bytes`, in plain words:  `1.2 MB`, `640 KB`. */
function inWords(bytes: number): string {
  if (bytes >= MB) return `${Math.round((bytes / MB) * 10) / 10} MB`
  return `${Math.max(1, Math.round(bytes / 1024))} KB`
}

/** A save refused for its size:  `why`, and that it isn't lost. */
function overTheCeiling(why: string): PlaceError {
  return new PlaceError(`${why}:  it isn't saved, and stays on this page`, { cause: { kind: "over the ceiling" } })
}
