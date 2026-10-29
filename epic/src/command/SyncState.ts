import { existsSync, rmSync } from "node:fs"
import { join } from "node:path"

import { DataFile } from "spell/server/DataFile"

/****************
 * ### `SyncState`
 * How the content repo's last sync went (`SharedSync`, epic `epic-friend` P5), kept in its git folder:
 * `<content repo>/.git/spell-shared-sync.json5`, never committed, each machine's own.
 * - written at the end of every sync;  read by the `SessionStart` hook ([sync-notice.mjs](../../hooks/sync-notice.mjs)),
 *   which says a conflict to the person and to Claude, the way the behind-main notice does
 * - `notice()`:  that notice, or `undefined` when the last sync went through (or was offline:  the next one pushes)
 * - node's own modules and the kit's `DataFile` only:  plain `node` loads it by path, in the hook
 * - all `static`:  one file per content repo, read and written whole
 ****************/
export class SyncState {
  /** The state file of the content repo at `dir`. */
  static fileOf(dir: string): string {
    return join(dir, ".git", FILE_NAME)
  }

  /** The content repo at `dir`'s last sync, `undefined` when none was kept. */
  static read(dir: string): SyncRecord | undefined {
    const file = SyncState.fileOf(dir)
    return existsSync(file) ? DataFile.read<SyncRecord>(file) : undefined
  }

  /**
   * Keep `record` as the content repo at `dir`'s last sync.
   * - NEVER throws:  a sync that can't write its state still synced
   */
  static write(dir: string, record: SyncRecord): void {
    try {
      DataFile.write(SyncState.fileOf(dir), record)
    } catch (error) {
      console.error(`epic shared sync:  can't keep its state:  ${(error as Error).message}`)
    }
  }

  /** Forget the content repo at `dir`'s last sync (tests, a person clearing it). */
  static clear(dir: string): void {
    rmSync(SyncState.fileOf(dir), { force: true })
  }

  /**
   * What a new session is told about the content repo at `dir`, when its last sync stopped on a conflict:
   * `person`, the line for the person (`systemMessage`);  `claude`, Claude's (`additionalContext`).
   * - `undefined` when it went through, was offline, or never ran
   */
  static notice(dir: string): SyncNotice | undefined {
    const record = SyncState.read(dir)
    if (record?.result !== "conflict") return undefined
    const files = record.files?.length ? record.files.join(", ") : "(git didn't say which)"
    return {
      person:
        `The shared plans couldn't sync at ${record.at}:  your changes and someone else's clash in ${files}.  ` +
        "Your changes are kept here, not shared yet.",
      claude:
        `The content repo (${dir}) stopped syncing at ${record.at}:  pulling someone else's changes clashed with ` +
        `this machine's in ${files}, so the rebase was undone and nothing was pushed.  Tell the person in one line.  ` +
        `To settle it:  in ${dir}, \`git pull --rebase\`, fix each file (keep both people's words), \`git add\` it, ` +
        "`git rebase --continue`, then `epic shared sync`.  Ask before choosing one person's words over another's."
    }
  }
}

/** One sync's result, as kept. */
export type SyncRecord = {
  /** when it ran:  local time, to the minute */
  at: string
  /** what came of it */
  result: SyncResult
  /** a conflict's files, from the content repo's root */
  files?: string[]
  /** git's words, when it failed (offline, a push refused) */
  error?: string
}

/** What a sync came to:  see `SharedSync.run()`. */
export const SyncResults = ["synced", "up to date", "offline", "not pushed", "conflict"] as const
/** One of `SyncResults`. */
export type SyncResult = (typeof SyncResults)[number]

/** `SyncState.notice()`:  the person's line, and Claude's. */
export type SyncNotice = { person: string; claude: string }

/** The state file's name, in the content repo's git folder. */
const FILE_NAME = "spell-shared-sync.json5"
