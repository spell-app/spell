import { existsSync, mkdirSync, readdirSync, renameSync, rmSync } from "node:fs"
import { basename, join } from "node:path"

/****************
 * ### `LeftoverFolders`
 * A removed worktree's folder that git couldn't delete, finished off (epic `epic-engine` r22).
 * - Why:  `/epic done` runs in the worktree's own window, whose language servers (oxlint, oxfmt, TypeScript) keep
 *   writing caches into its `node_modules` while git deletes it:  `git worktree remove` stopped with "Directory not
 *   empty", and the session couldn't `rm -rf` its own working folder (Claude Code refuses that), so Owen had to.
 * - `clear()`:  deletes what's left, trying a few times;  still not gone (the servers wrote again), it MOVES the
 *   folder into the epic home's `trash/`, so the worktree's place is free at once
 *   - the servers write on into the moved folder, harmless, until the window closes and they stop
 * - `sweep()`:  deletes the trash, from the `SessionStart` hook ([server-prune.mjs](../../hooks/server-prune.mjs));
 *   what's still being written stays for the next one
 * - NOT closing the window first:  the session removing it runs in that window
 * - Its position:  node's own modules only, so plain `node` (the hook) loads it.  All `static`.
 ****************/
export class LeftoverFolders {
  /**
   * Delete folder `path`, what `git worktree remove` left of it;  says what happened:
   * `deleted`, `trashed` (moved to `trash`, the epic home's), or `stuck` (neither:  the folder stays)
   * - `home`:  the epic home, its `trash/` the place a folder goes
   * - NEVER throws
   */
  static clear(path: string, { home }: { home: string }): LeftoverResult {
    try {
      rmSync(path, { recursive: true, force: true, maxRetries: RETRIES, retryDelay: RETRY_MS })
    } catch (ignored) {
      // still being written:  moved aside below
    }
    if (!existsSync(path)) return { done: "deleted" }
    try {
      const trash = join(home, TRASH)
      mkdirSync(trash, { recursive: true })
      const to = join(trash, `${basename(path)}-${Date.now()}`)
      renameSync(path, to)
      return { done: "trashed", to }
    } catch (error) {
      return { done: "stuck", why: (error as Error).message }
    }
  }

  /**
   * Delete everything in the epic home's `trash/`;  returns how many went.
   * - one still being written (its window still open) stays, for the next sweep
   * - NEVER throws
   */
  static sweep({ home }: { home: string }): number {
    const trash = join(home, TRASH)
    let swept = 0
    for (const name of existsSync(trash) ? readdirSync(trash) : []) {
      try {
        rmSync(join(trash, name), { recursive: true, force: true })
        if (!existsSync(join(trash, name))) swept++
      } catch (ignored) {
        // still being written:  the next sweep
      }
    }
    return swept
  }

  /** One line for `result`, after `removed <path>`;  `""` when it simply went. */
  static said(path: string, result: LeftoverResult): string {
    if (result.done === "deleted") return ""
    if (result.done === "trashed")
      return `  its window's language servers were still writing into it:  the rest moved to ${result.to}, deleted at a later session's start`
    return `  ${path} is still there (${result.why}):  delete it once its window is closed`
  }

  /** Whether git's refusal `error` is a folder it couldn't delete, not a real refusal (changes, a locked worktree). */
  static isLeftover(error: string): boolean {
    return CANT_DELETE.test(error)
  }
}

/** What `clear()` did. */
export type LeftoverResult = { done: "deleted" } | { done: "trashed"; to: string } | { done: "stuck"; why: string }

/** The epic home's folder for leftovers, until a sweep. */
const TRASH = "trash"

/** How many times, and how far apart, a delete is tried before the folder is moved aside. */
const RETRIES = 4
const RETRY_MS = 250

/**
 * Git's words for a folder it couldn't delete, past every check that refuses a removal (changes, a lock):
 * `failed to delete '<path>': Directory not empty` (a file written meanwhile), or `: Permission denied`
 */
const CANT_DELETE = /failed to delete '/i
