import { existsSync } from "fs"
import { cp, mkdir, readdir, rename, rm } from "fs/promises"
import { basename, join, relative } from "path"

import environment from "spell/app/spaces/server/node/environment"
import { folderForPlace } from "spell/app/spaces/server/node/projects/project-utils"

/** How many backups are kept:  a week of nights.  Something deleted is gone from them all after this many. */
export const BACKUPS_KEPT = 7

/** A day, ms. */
const DAY_MS = 24 * 60 * 60 * 1000

/** How late a night's backup may be before it counts as missed, ms:  a machine asleep for an hour misses nothing. */
const LATE_MS = 2 * 60 * 60 * 1000

/** A backup's folder name:  when it was made, `2026-11-04-0312`, in UTC;  a second one that minute, `-2`. */
const BACKUP_NAME = /^(\d{4})-(\d{2})-(\d{2})-(\d{2})(\d{2})(?:-\d+)?$/

/****************
 * ### `SpaceBackups`
 * A copy of every space, each night, a week of them kept, and a space brought back from one (epic `atmosphere` P7).
 *
 * ```ts
 * const backups = new SpaceBackups()
 * await backups.backUp()                                   // "2026-11-04-0312"
 * await backups.restore("@family/cookbook")                // from the newest
 * await backups.backUpIfDue()                             // each look of the server's daily round
 * ```
 *
 * - ON THE MACHINE YOU RUN (Q8 B):  each backup is a plain copy of spell.spaces, a folder named by when it was made.
 *   - In the backups folder (`environment.backupsDir`, `SPELL_BACKUPS_DIR`):  name a second disk.
 *   - Made in a folder of its own first, then named:  a backup half made is never one to restore from.
 *   - Dot files and folders are left out (a test's caught mail).
 * - A week of them is kept (`BACKUPS_KEPT`):  the oldest goes as each new one is made.
 *   - So a space or an account deleted is gone from the backups a week later, as the terms say.
 * - NIGHTLY (`backUpIfDue()`):  a job of the server's daily round (the app's `DailyRound`, epic `atmosphere` P24),
 *   which looks every hour while it runs:  one is made if the last is a day old.
 *   - A MISSED NIGHT is reported, in the page server's log and by `spell space backup status`:
 *     the machine was off, or asleep, past a night.
 * - Bringing one back (`restore()`):  ONE space's folder, or a person's whole space,
 *   as the backup had it, over what's there now.
 *   - A running server follows, as it does any edit on the disk.
 * - Node only;  plain files, no place:  `spell space backup` and the app's route module use it.
 ****************/
export class SpaceBackups {
  /** Every space:  spell.spaces. */
  readonly spacesDir: string
  /** Where the backups go. */
  readonly backupsDir: string
  /** How many are kept. */
  private readonly keep: number
  /** Where an address's folder is on disk. */
  private readonly folderFor: (address: string) => string
  /** When it is:  a test's clock. */
  private readonly now: () => Date

  constructor({
    spacesDir = environment.spellSpacesDir,
    backupsDir = environment.backupsDir,
    keep = BACKUPS_KEPT,
    folderFor = folderForPlace,
    now = () => new Date()
  }: SpaceBackupsProps = {}) {
    this.spacesDir = spacesDir
    this.backupsDir = backupsDir
    this.keep = keep
    this.folderFor = folderFor
    this.now = now
  }

  ////////////////
  // ## Backing up
  ////////////////

  /**
   * SIDE EFFECT:  make a backup of every space now, and let the oldest past `keep` go:  its name.
   * - throws what the disk throws:  a backups folder that can't be written
   */
  async backUp(): Promise<string> {
    await mkdir(this.backupsDir, { recursive: true })
    const name = this.freshName()
    const making = join(this.backupsDir, `.${name}.making`)
    await cp(this.spacesDir, making, {
      recursive: true,
      // never a dot file, nor the backups themselves, if someone named a folder inside spell.spaces
      filter: (source) => source === this.spacesDir || (!basename(source).startsWith(".") && source !== this.backupsDir)
    })
    await rename(making, join(this.backupsDir, name))
    for (const old of (await this.list()).slice(this.keep)) {
      await rm(join(this.backupsDir, old), { recursive: true, force: true })
    }
    return name
  }

  /** Every backup's name, newest first. */
  async list(): Promise<string[]> {
    const names = await readdir(this.backupsDir).catch(() => [])
    return names.filter((name) => BACKUP_NAME.test(name)).sort((one, other) => other.localeCompare(one))
  }

  /**
   * SIDE EFFECT:  bring the space at `address` back as backup `from` had it (the newest, left out):  its name.
   * - `address`:  one space's folder (`@family/cookbook`), or a person's whole space (`ana@spell`).
   * - What's there now is replaced, all of it.
   * - throws `TypeError` for no backup, or one with no copy of that space
   */
  async restore(address: string, { from }: { from?: string } = {}): Promise<string> {
    const name = from ?? (await this.list())[0]
    if (!name || !BACKUP_NAME.test(name) || !existsSync(join(this.backupsDir, name))) {
      throw new TypeError(
        name ? `SpaceBackups.restore():  there's no backup ${name}` : "SpaceBackups.restore():  there's no backup yet"
      )
    }
    const live = this.folderFor(address)
    const path = relative(this.spacesDir, live)
    if (!path || path.startsWith("..")) {
      throw new TypeError(`SpaceBackups.restore():  ${address} isn't a space in ${this.spacesDir}`)
    }
    const copy = join(this.backupsDir, name, path)
    if (!existsSync(copy)) throw new TypeError(`SpaceBackups.restore():  backup ${name} has no copy of ${address}`)
    await rm(live, { recursive: true, force: true })
    await cp(copy, live, { recursive: true })
    return name
  }

  ////////////////
  // ## Each night
  ////////////////

  /**
   * Where the backups stand:  the newest, and how many nights were missed since it.
   * - `missedNights`:  0 when the newest is under a day old (and a little), else the nights since
   * - none ever made:  `undefined`
   */
  async status(): Promise<BackupStatus> {
    const newest = (await this.list())[0]
    const at = newest ? timeOf(newest) : undefined
    const since = at ? this.now().getTime() - at.getTime() : undefined
    return {
      backupsDir: this.backupsDir,
      count: (await this.list()).length,
      ...(newest && { newest }),
      ...(since !== undefined && {
        missedNights: since > DAY_MS + LATE_MS ? Math.floor((since - LATE_MS) / DAY_MS) : 0
      })
    }
  }

  /**
   * Back up if the last backup is a day old, or there's none;  a missed night said first, to `report`.
   * The new one's name.
   * - The server's daily round asks it every hour (`DailyRound`):  a failure is reported there, and tried again.
   */
  async backUpIfDue(report: (text: string) => void = (text) => console.warn(text)): Promise<string | undefined> {
    const { newest, missedNights } = await this.status()
    if (missedNights) {
      report(
        `Spell missed ${missedNights === 1 ? "a night's backup" : `${missedNights} nights' backups`}:  the last was ${newest}.`
      )
    }
    const at = newest ? timeOf(newest) : undefined
    if (at && this.now().getTime() - at.getTime() < DAY_MS) return undefined
    return this.backUp()
  }

  ////////////////
  // ## Helpers
  ////////////////

  /** A name for a backup made now, not yet taken:  `2026-11-04-0312`, or `-2` after it. */
  private freshName(): string {
    const stamp = this.now()
      .toISOString()
      .replace(/^(\d{4}-\d{2}-\d{2})T(\d{2}):(\d{2}).*$/, "$1-$2$3")
    let name = stamp
    for (let count = 2; existsSync(join(this.backupsDir, name)); count++) name = `${stamp}-${count}`
    return name
  }
}

/** Constructor props of `SpaceBackups`:  each one's default is the app's own, so a test hands in its own. */
export type SpaceBackupsProps = {
  /** Every space:  default spell.spaces (`environment.spellSpacesDir`). */
  spacesDir?: string
  /** Where the backups go:  default `environment.backupsDir`. */
  backupsDir?: string
  /** How many are kept:  default `BACKUPS_KEPT`. */
  keep?: number
  /** Where an address's folder is on disk:  default `folderForPlace()`. */
  folderFor?: (address: string) => string
  /** When it is:  default now. */
  now?: () => Date
}

/** Where the backups stand, as `SpaceBackups.status()` says. */
export type BackupStatus = {
  /** Where they are. */
  backupsDir: string
  /** How many there are. */
  count: number
  /** The newest one's name:  none, when none was ever made. */
  newest?: string
  /** How many nights were missed since the newest:  none, when none was ever made. */
  missedNights?: number
}

/** When the backup named `name` was made. */
function timeOf(name: string): Date | undefined {
  const [, year, month, day, hour, minute] = BACKUP_NAME.exec(name) ?? []
  return year ? new Date(`${year}-${month}-${day}T${hour}:${minute}:00Z`) : undefined
}
