import { existsSync, mkdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs"
import { dirname, join } from "node:path"

import { KIT_FILE } from "spell/cli/kitCheckout"
import { Git } from "spell/server/Git"

/****************
 * ### `ProjectWorktrees`
 * A project's git worktrees, each given the main checkout's `.spell/kit.json5` by `spell local on` (epic `repo-split`
 * T72).
 * - Why:  the file is git-ignored, so a worktree never has it, and a `spell` from npm older than this change ran npm
 *   there (the epic server, started in a worktree, ran the npm copy)
 *   - this change's bins look in the main checkout too (`kitFileAt()`):  a copy is only for the older ones
 * - Each copy says it's one (`COPY_NOTE`):  `spell local off` removes only those, never a worktree's own
 * - Kept out of git in every worktree at once:  `/.spell/` in the repo's private ignore list (`Git.exclude()`)
 ****************/
export class ProjectWorktrees {
  /** the project's main checkout */
  readonly project: string

  constructor(project: string) {
    this.project = project
  }

  /** The project's worktrees' folders, not the main checkout's;  none outside git. */
  get folders(): string[] {
    const main = existsSync(this.project) ? realpathSync(this.project) : this.project
    return Git.lines(["worktree", "list", "--porcelain"], this.project)
      .filter((line) => line.startsWith("worktree "))
      .map((line) => line.slice("worktree ".length))
      .filter((folder) => folder !== main && existsSync(folder))
  }

  /**
   * Copy the main checkout's file, `text`, into every worktree that has none of its own;  the worktrees written.
   * - SIDE EFFECT:  writes the copies, and adds `/.spell/` to the repo's private ignore list
   */
  follow(text: string): string[] {
    const written: string[] = []
    for (const folder of this.folders) {
      const file = join(folder, KIT_FILE)
      if (existsSync(file) && !isCopy(file)) continue
      const copy = `${COPY_NOTE}\n${text}`
      if (existsSync(file) && readFileSync(file, "utf8") === copy) continue
      mkdirSync(dirname(file), { recursive: true })
      writeFileSync(file, copy)
      written.push(folder)
    }
    if (written.length) Git.exclude([IGNORED], IGNORE_NOTE, this.project)
    return written
  }

  /** Remove the copies `follow()` wrote;  the worktrees they were in.  A worktree's own file stays. */
  unfollow(): string[] {
    const removed: string[] = []
    for (const folder of this.folders) {
      const file = join(folder, KIT_FILE)
      if (!existsSync(file) || !isCopy(file)) continue
      rmSync(file)
      removed.push(folder)
    }
    return removed
  }

  /** The worktrees with no file of their own:  there, a `spell` from npm older than this change runs npm. */
  get notFollowing(): string[] {
    return this.folders.filter((folder) => !existsSync(join(folder, KIT_FILE)))
  }
}

/** The first line of a copy `follow()` writes. */
const COPY_NOTE = "// A copy of the main checkout's, for this worktree:  spell local off there removes it."

/** What keeps the copies out of git, and its comment. */
const IGNORED = "/.spell/"
const IGNORE_NOTE = "# each person's own Spell settings (spell local):  never committed"

/** Whether `file` is a copy `follow()` wrote. */
function isCopy(file: string): boolean {
  return readFileSync(file, "utf8").startsWith(COPY_NOTE)
}
