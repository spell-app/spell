import { JsonChunks } from "spell/places/JsonChunks"
import { FILE_BYTES_FOLDER, FILES_COLLECTION } from "spell/places/places.types"
import type { TakenDown } from "spell/server/places"
import environment from "spell/app/spaces/server/node/environment"
import { folderForPlace } from "spell/app/spaces/server/node/projects/project-utils"
import { DiskStorage } from "spell/app/spaces/server/node/storage/DiskStorage"
import { readJSON5, writeJSON5 } from "spell/app/spaces/server/node/storage/json5"

/**
 * The log of a folder's takedowns, beside its things:  one of spaces' own `__` names (`SPACE_NAMES`), so it's never
 * listed, read direct, copied or exported.
 */
export const TAKEDOWNS_FILE = "__takedowns.json5"

/** What a person's address looks like, an account:  `ana@spell`, no `/`. */
const ACCOUNT = /^[^@/\s]+@[^@/\s]+$/

/****************
 * ### `Takedowns`
 * Spell taking down what it hosts, and putting it back (epic `atmosphere` P6, Q7 A):
 * a thing, a space or an account, each with a reason, in a log beside it.
 *
 * ```ts
 * const takedowns = new Takedowns()
 * await takedowns.take("hide", { kind: "record", space: "@family/cookbook", collection: "recipes", id: "r-1" },
 *   { by: "owen@spell", reason: "a stranger's home address (doxxing)" })
 * await takedowns.takenDownIn("@family/cookbook", "bo@spell")     // what `FolderPlace` and `DirectReads` ask
 * ```
 *
 * - What a host must take down (AT Protocol's moderation proposals):
 *   child abuse material, nude images shared without consent, copyright notices, doxxing.
 * - Reports, reasons people see, and appeals are a todo, before Spell opens to everyone.
 * - Three kinds of target (`TakedownTarget`):
 *   - a RECORD, one thing of a space's folder:  `@family/cookbook`, `recipes`, `r-1`
 *   - a SPACE, one folder, all of it:  `@family/cookbook`
 *   - an ACCOUNT, a person:  `ana@spell`
 *     - They can't sign in, and every request of theirs to a space is refused.
 *     - Every folder of their own space (`ana@spell/...`) is down for everyone.
 * - Three actions (`TakedownAction`):
 *   - `hide`:  neither read nor written, through Spell's server or read direct;  the files stay as they are
 *   - `delete`:  hidden, and its files removed (a record's, or every thing of a space);  an account isn't deleted
 *     - a space's FILE is a record too (`__files`, epic `atmosphere` P15):  its bytes go with it, unless another file
 *       has the same;  a space's files all go with the space
 *   - `restore`:  back as it was, what wasn't deleted
 * - THE LOG IS THE TRUTH:  each takedown is one entry, who did it, when and why.
 *   - It's in `__takedowns.json5`, in the folder it's about;  an account's, in their own space's folder (`@spell/ana@/`).
 *   - Its last entry for a target says where it stands, so restoring is one more entry, and nothing's ever lost from it.
 *   - Read afresh for each request, so a takedown counts at once, on a running server too:
 *     through the folder's storage, which drops what it read when the file changes.
 * - Who may:  Spell's admins.
 *   - The command checks (`spell space takedown`);  this class trusts its caller, as a server's own code is trusted.
 * - Node only.
 * - Knows no routes:  `SpaceFolders` and `SpellAccounts` ask it, and hand the kit what it says (`TakenDown`).
 ****************/
export class Takedowns {
  /** Where people ask about a takedown:  the abuse contact. */
  readonly contact: string
  /** A folder's files, by its address:  `undefined` for an address with no folder. */
  private readonly storageFor: (address: string) => DiskStorage | undefined
  /** When it is:  a test's clock. */
  private readonly now: () => Date
  /** The files' format:  where a thing's file is. */
  private readonly json = new JsonChunks()
  /** The storages it made itself, by folder, to close. */
  private readonly made = new Map<string, DiskStorage>()

  constructor({ storageFor, contact = environment.abuseContact, now = () => new Date() }: TakedownsProps = {}) {
    this.contact = contact
    this.now = now
    this.storageFor = storageFor ?? ((address) => this.ownStorageFor(address))
  }

  ////////////////
  // ## Taking down
  ////////////////

  /**
   * Take `target` down, or put it back (`action`), and log why:  the entry written.
   * - `delete` removes the files too:  a record's own file, or every thing of a space.
   *   - A space's file's bytes go with its record;  a whole space's files go with it.
   *   - The log, its members and its other `__` names stay.
   * - throws `TypeError` for a target with no folder, a reason left out, or an account deleted (hide it instead)
   */
  async take(action: TakedownAction, target: TakedownTarget, { by, reason }: TakedownWhy): Promise<TakedownEntry> {
    if (!reason.trim()) throw new TypeError("Takedowns.take():  say why, for the log (a reason)")
    if (action === "delete" && target.kind === "account") {
      throw new TypeError("Takedowns.take():  an account isn't deleted, only hidden:  hide it, and delete its spaces")
    }
    const storage = this.storageOrDie(logAddressOf(target))
    const entry: TakedownEntry = { at: this.now().toISOString(), by, action, ...target, reason: reason.trim() }
    const log = await this.logIn(storage)
    await writeJSON5(storage, TAKEDOWNS_FILE, { takedowns: [...log, entry] })
    if (action === "delete") await this.deleteFiles(storage, target)
    return entry
  }

  /** Every entry in the log of the folder at `address` (a space's, or an account's own), oldest first. */
  async log(address: string): Promise<TakedownEntry[]> {
    const storage = this.storageFor(address)
    return storage ? this.logIn(storage) : []
  }

  ////////////////
  // ## What's down
  ////////////////

  /**
   * What's taken down in the space's folder at `space`, for `person` (who's asking, if anyone):
   * what the kit's `FolderPlace` and `DirectReads` are handed.
   * - The whole folder:  the space itself, the account whose space it's in, or `person`'s own account.
   * - Its things:  each record whose last entry hides or deletes it.
   */
  async takenDownIn(space: string, person?: string): Promise<TakenDown> {
    const storage = this.storageFor(space)
    const standing = storage ? standingOf(await this.logIn(storage)) : new Map<string, TakedownEntry>()
    const owner = accountOf(space)
    const isWhole =
      isDown(standing.get(SPACE_KEY)) ||
      (owner !== undefined && (await this.isAccountDown(owner))) ||
      (person !== undefined && person !== owner && (await this.isAccountDown(person)))
    const things = new Map<string, Set<string>>()
    for (const entry of standing.values()) {
      if (entry.kind !== "record" || !isDown(entry)) continue
      let ids = things.get(entry.collection)
      if (!ids) things.set(entry.collection, (ids = new Set()))
      ids.add(entry.id)
    }
    return { isWhole, things, contact: this.contact }
  }

  /** Is the account `person` (`ana@spell`) taken down? */
  async isAccountDown(person: string): Promise<boolean> {
    const storage = ACCOUNT.test(person) ? this.storageFor(person) : undefined
    if (!storage) return false
    return isDown(standingOf(await this.logIn(storage)).get(ACCOUNT_KEY))
  }

  /** Stop watching the folders it opened itself:  a command's end, or a test's. */
  close(): void {
    for (const storage of this.made.values()) storage.close()
    this.made.clear()
  }

  ////////////////
  // ## Helpers
  ////////////////

  /** The log in `storage`'s folder;  `[]` for none.  - throws `SyntaxError` for one that isn't JSON5 */
  private async logIn(storage: DiskStorage): Promise<TakedownEntry[]> {
    const file = await readJSON5<{ takedowns?: TakedownEntry[] }>(storage, TAKEDOWNS_FILE)
    return file?.takedowns ?? []
  }

  /** Remove what a delete deletes:  a record's file, or every thing of a space, its list files and folders. */
  private async deleteFiles(storage: DiskStorage, target: TakedownTarget): Promise<void> {
    if (target.kind === "record") {
      const hash = target.collection === FILES_COLLECTION ? await this.hashIn(storage, target.id) : undefined
      await storage.remove(this.json.bodyAddress(target.collection, target.id))
      if (hash && !(await this.isHashKept(storage, hash, target.id))) {
        await storage.remove(`${FILE_BYTES_FOLDER}/${hash}`)
      }
      return
    }
    for (const name of await storage.list("")) {
      const path = name.replace(/\/$/, "")
      const isFiles = [FILES_COLLECTION, `${FILES_COLLECTION}.list.json`, FILE_BYTES_FOLDER].includes(path)
      if (!name.startsWith("__") || isFiles) await storage.remove(path)
    }
  }

  /** The hash a space's file `id` keeps its bytes under:  `undefined` for none.  - NEVER throws */
  private async hashIn(storage: DiskStorage, id: string): Promise<string | undefined> {
    try {
      const text = await storage.read(this.json.bodyAddress(FILES_COLLECTION, id))
      const hash = text === undefined ? undefined : (JSON.parse(text) as { hash?: unknown }).hash
      return typeof hash === "string" ? hash : undefined
    } catch {
      return undefined
    }
  }

  /** Does a space's file other than `id` keep its bytes under `hash`?  Its files' list says.  - NEVER throws */
  private async isHashKept(storage: DiskStorage, hash: string, id: string): Promise<boolean> {
    try {
      const text = await storage.read(this.json.listAddress(FILES_COLLECTION))
      const rows = text === undefined ? [] : this.json.listIn(text).rows
      return rows.some((row) => row[this.json.idOf] !== id && row.hash === hash)
    } catch {
      return true
    }
  }

  /** - throws `TypeError` for an address with no folder */
  private storageOrDie(address: string): DiskStorage {
    const storage = this.storageFor(address)
    if (!storage) throw new TypeError(`Takedowns:  "${address}" has no folder here to take down`)
    return storage
  }

  /** A storage of its own for `address`'s folder, made once:  `undefined` for an address with no folder. */
  private ownStorageFor(address: string): DiskStorage | undefined {
    if (address.split("/").some((part) => !part || part === "." || part === "..")) return undefined
    let folder: string
    try {
      folder = folderForPlace(address)
    } catch {
      return undefined
    }
    let storage = this.made.get(folder)
    if (!storage) this.made.set(folder, (storage = new DiskStorage(folder)))
    return storage
  }
}

/** Constructor props of `Takedowns`. */
export type TakedownsProps = {
  /** A folder's files, by its address:  default a `DiskStorage` of its own on `folderForPlace()`'s folder. */
  storageFor?: (address: string) => DiskStorage | undefined
  /** Where people ask about a takedown:  default the server's abuse contact (`environment.abuseContact`). */
  contact?: string
  /** When it is:  default now. */
  now?: () => Date
}

/** What's taken down:  a thing of a space, a whole space, or a person's account. */
export type TakedownTarget =
  | {
      /** One thing of a space's folder. */
      kind: "record"
      /** The space's folder's address:  `@family/cookbook`. */
      space: string
      /** Its collection:  `recipes`. */
      collection: string
      /** Its id:  `r-1`. */
      id: string
    }
  | {
      /** A whole folder. */
      kind: "space"
      /** Its address:  `@family/cookbook`. */
      space: string
    }
  | {
      /** A person's account. */
      kind: "account"
      /** Their address:  `ana@spell`. */
      person: string
    }

/** What's done:  hidden, hidden and its files removed, or put back. */
export type TakedownAction = "hide" | "delete" | "restore"

/** Who took it down, and why:  for the log. */
export type TakedownWhy = {
  /** A Spell admin's address:  `owen@spell`. */
  by: string
  /** Why, in a few plain words:  `doxxing:  a stranger's home address`. */
  reason: string
}

/** One line of a folder's log:  what was done to what, by whom, when and why. */
export type TakedownEntry = TakedownTarget &
  TakedownWhy & {
    /** When, as an ISO time. */
    at: string
    /** What was done. */
    action: TakedownAction
  }

/** The log's key for the folder itself. */
const SPACE_KEY = "space"
/** The log's key for the account whose own folder it is. */
const ACCOUNT_KEY = "account"

/** Where `target`'s log is:  its space's folder, or the account's own. */
function logAddressOf(target: TakedownTarget): string {
  if (target.kind !== "account") return target.space
  if (!ACCOUNT.test(target.person))
    throw new TypeError(`Takedowns:  "${target.person}" isn't an account, like ana@spell`)
  return target.person
}

/** Each target's last entry in `log`, by its key:  where it stands. */
function standingOf(log: readonly TakedownEntry[]): Map<string, TakedownEntry> {
  const standing = new Map<string, TakedownEntry>()
  for (const entry of log) standing.set(keyOf(entry), entry)
  return standing
}

/** A target's key in its log:  a record's collection and id;  the folder;  the account. */
function keyOf(target: TakedownTarget): string {
  if (target.kind === "record") return `record\n${target.collection}\n${target.id}`
  return target.kind === "space" ? SPACE_KEY : ACCOUNT_KEY
}

/** Does this last entry leave its target down? */
function isDown(entry: TakedownEntry | undefined): boolean {
  return entry !== undefined && entry.action !== "restore"
}

/** The account a space's folder is in, a person's:  `ana@spell/recipes` => `ana@spell`;  an org's, `undefined`. */
function accountOf(space: string): string | undefined {
  const [first = ""] = space.split("/")
  return ACCOUNT.test(first) ? first : undefined
}
