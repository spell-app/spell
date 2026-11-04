import { ChunkedPlace, type ChunkList, type ChunkListEdit, type ChunkStore } from "spell/util/places/ChunkedPlace"
import { JsonChunks } from "spell/util/places/JsonChunks"
import {
  OWNER_FIELD,
  PlaceError,
  idOfRow,
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
  type WatchTarget,
  type WriteAnswer,
  type WriteQuestion
} from "spell/util/places/places.types"

import { contentVersion } from "./contentVersion"
import { PlaceEvents } from "./PlaceEvents"

/** How long after a file is heard changing the folder is looked at:  a storage may tell each write of one save. */
const SETTLE_MS = 50

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
 * - OWNERS, when it's told `whoWrites: "only the owner"` (a project data folder, epic `atmosphere` P1):
 *   - each thing made is its maker's:  `owner`, the field an atmosphere account's rows say it in, from who's asking
 *     (`PlaceContext.identity`);  a change can't claim another
 *   - a change to someone else's is refused, `"owner"`, unless `mayChangeAnyRow()` says yes for who's asking
 *   - a request saying nobody (the folder's own code, a test) is trusted:  it's on this machine already
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

  constructor({
    storage,
    format = new JsonChunks(),
    whoWrites,
    mayChangeAnyRow,
    checkedAtMostEvery,
    identifiesBy
  }: FolderPlaceProps) {
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
    await this.keepInStep(collection)
    return { ...(await super.list(collection, query, context)), version: this.events.version }
  }

  /** The things with these ids, once the list is in step with the folder. */
  async getMany(collection: string, ids: readonly string[], context: SelectingContext = {}): Promise<PlaceRow[]> {
    await this.keepInStep(collection)
    return super.getMany(collection, ids, context)
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
    await this.keepInStep(collection)
    const known = this.events.changesSince(collection, token)
    if (known) return known
    return { rows: await this.allRows(collection, context), removed: [], token: this.events.version }
  }

  /** Tell `onEvent` of each change to `target`, by this place or on the disk.  Returns what stops it. */
  watch(target: WatchTarget, onEvent: (event: PlaceEvent) => void): () => void {
    return this.events.watch(target, onEvent)
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
   * - throws `PlaceError` `"refused"`, `"owner"`, for a change to someone else's thing:  see the class
   */
  async apply(_changes: readonly PlaceChange[], context: PlaceContext = {}): Promise<ApplyAnswer> {
    const changes = await this.ownedChanges(_changes, context)
    const answer = await super.apply(changes, context)
    for (const { kind, collection, id } of changes) {
      if (id === undefined) continue
      const row = answer.rows.findLast((one) => idOfRow(one, this.idField) === id)
      this.events.tell({ collection, id, ...(kind !== "delete" && row && { row }) })
    }
    return answer
  }

  /** Would it take this write?  Someone else's thing isn't yours to change:  a hint, as a keeper of the folder may. */
  canWrite({ row, identity }: WriteQuestion): WriteAnswer {
    const owner = row?.[OWNER_FIELD]
    if (!this.says.whoWrites || identity === undefined || owner === undefined || owner === identity) {
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
      const { [OWNER_FIELD]: _claimed, ...fields } = change.fields ?? {}
      if (change.kind === "insert") {
        owned.push({ ...change, fields: { ...fields, [OWNER_FIELD]: identity } })
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
      owned.push(change.fields ? { ...change, fields } : change)
    }
    return owned
  }

  /** Who owns this thing, as its file says:  `undefined` for one nobody owns, or that isn't there. */
  private async ownerOf(collection: string, id: string): Promise<string | undefined> {
    const owner = (await this.bodyOf(collection, id))?.[OWNER_FIELD]
    return typeof owner === "string" ? owner : undefined
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
   * - NEVER throws for a file it can't read:  that thing stays as it was.
   */
  private keepInStep(collection: string): Promise<void> {
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

/** Constructor props of a `FolderPlace`. */
export type FolderPlaceProps = {
  /** The files:  `ChunkFiles`, or the app's `DiskStorage`. */
  storage: FolderStorage
  /** What's in them, and which fields each list holds. */
  format?: JsonChunks
  /** `"only the owner"`:  each thing is its maker's, and only they change it (see the class).  Left out:  anyone. */
  whoWrites?: "only the owner"
  /** May `identity` change anyone's things, a keeper of the folder?  Asked once per `apply()`.  Left out:  nobody. */
  mayChangeAnyRow?: (identity: string) => Promise<boolean>
  /** The least time between two asks of what changed, in seconds, that it will take:  `describe()` says it. */
  checkedAtMostEvery?: number
  /** Who it takes people to be, with no sign-in:  `describe()` says it. */
  identifiesBy?: PlaceCapabilities["identifiesBy"]
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
