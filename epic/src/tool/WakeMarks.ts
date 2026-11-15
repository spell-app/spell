import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { join } from "node:path"

// By their files, with their `.ts`:  plain `node` loads this file (the `woken` hook)
import { EpicConfig } from "spell/epic/config/EpicConfig.ts"
import { EpicHome } from "spell/epic/config/EpicHome.ts"
import { TITLE_ICONS } from "spell/epic/command/command.types.ts"

/****************
 * ### `WakeMarks`
 * A note that a Send on an epic's page is starting a NEW session for it, so that session is titled `🚧 <epic>` the
 * moment it starts (epic `epic-engine` I286).
 * - Why:  a session the page server opened in an epic's window showed only "Claude Code" in its tab, and Owen
 *   couldn't tell what it was doing.  Claude Code titles a session only through a hook's `sessionTitle`
 *   (`UserPromptSubmit` or `SessionStart`), and a session the page opens gets no prompt:  so its start does it.
 * - `mark(epic)`:  written by the page server as it opens the session (`ReviewStart.wake()`),
 *   `<epic home>/wakes/<epic>.json`, `{ at }`
 * - `claim(cwd)`:  the plugin's `SessionStart` hook (`hooks/woken.mjs`) asks it for the session starting in `cwd`:
 *   the mark of the epic whose worktree that is, fresh (`FRESH_MS`), is taken (deleted) and its title answered
 *   - only the FIRST session to start there is titled:  a tab Owen opens there himself later is left alone
 * - Its position:  node's own modules and the epic config, by their files, so plain `node` loads it.
 * - NEVER throws:  a mark that can't be written or read only leaves a session untitled.
 ****************/
export class WakeMarks {
  /** The marks' folder:  `<epic home>/wakes`. */
  static get folder(): string {
    return EpicHome.subfolder("wakes")
  }

  /** Mark that a session is starting for epic `epic`, now. */
  static mark(epic: string, now = Date.now()): void {
    try {
      mkdirSync(WakeMarks.folder, { recursive: true })
      writeFileSync(WakeMarks.fileOf(epic), JSON.stringify({ at: new Date(now).toISOString() }))
    } catch (error) {
      console.error(`WakeMarks:  can't mark ${epic}'s wake:`, error)
    }
  }

  /**
   * The title for the session starting in `cwd`, taking its epic's fresh mark;  `undefined` for none.
   * - SIDE EFFECT:  deletes the mark it takes, and a stale one it finds
   */
  static claim(cwd: string, now = Date.now()): string | undefined {
    try {
      const epic = EpicConfig.of(cwd).worktreeNameOf(cwd)
      if (!epic) return undefined
      const file = WakeMarks.fileOf(epic)
      if (!existsSync(file)) return undefined
      const { at } = JSON.parse(readFileSync(file, "utf8")) as { at?: string }
      rmSync(file, { force: true })
      const age = now - Date.parse(at ?? "")
      return age >= 0 && age <= FRESH_MS ? `${TITLE_ICONS.active} ${epic}` : undefined
    } catch {
      return undefined
    }
  }

  /** The mark of epic `epic`. */
  static fileOf(epic: string): string {
    return join(WakeMarks.folder, `${epic}.json`)
  }
}

/** How long a mark waits for its session, ms:  a window launched from scratch can take most of a minute. */
const FRESH_MS = 3 * 60_000
