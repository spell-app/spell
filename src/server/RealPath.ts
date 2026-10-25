import { realpathSync } from "node:fs"
import { basename, dirname, isAbsolute, join, relative, resolve, sep } from "node:path"

/****************
 * ### `RealPath`
 * Comparing checkout, worktree and content-folder paths by where they REALLY are, links followed
 * (epic `epic-engine` I59);  and a path's real path, or as given when it isn't there (`of()`).
 *
 * ```ts
 * RealPath.of("/Users/owen/www/spell-app/spell-epic")      // => "/Users/owen/www/spell/spell-epic", through its link
 * RealPath.same(session.cwd, worktree)                       // the same folder, however each is spelled
 * RealPath.isIn(session.cwd, worktree)                       // that folder or inside it
 * RealPath.from(worktreesFolder, cwd)                        // => "seo/src":  the path inside, `/`-separated
 * ```
 *
 * - Why:  one folder has several spellings once a repo moves behind a compat link (repo-split's move to `~/www/spell/`):
 *   - git and `process.cwd()` give REAL paths
 *   - a worktree's `.git` file, a session's recorded `cwd`, a window file or VS Code's recent list keep the OLD one
 *   - so every compare of two such paths goes through here:  real on BOTH sides
 * - Its position:  imports only node's own modules, so plain `node` loads it by its own name, `spell/server/RealPath`,
 *   types stripped (an entry of its own in the kit's `exports`:  spell-epic's `EpicConfig`, its hooks, its window
 *   script);  NEVER an alias, an `enum` or a parameter property
 * - From spell-epic's `config/` (epic `coherence` P7), with the kit's own `realOrSelf()` copies
 ****************/
export class RealPath {
  /**
   * `path`, absolute, with its links followed (`/tmp` -> `/private/tmp`).
   * - a path that isn't there (a removed worktree, a page not made yet):  its nearest folder that is, real, then the
   *   rest as given;  so a missing path under a link still compares
   * - NEVER throws
   */
  static of(path: string): string {
    const given = resolve(path)
    try {
      return realpathSync(given)
    } catch {
      const parent = dirname(given)
      return parent === given ? given : join(RealPath.of(parent), basename(given))
    }
  }

  /** Whether `a` and `b` are the same place, links followed;  `false` when either is empty. */
  static same(a: string | null | undefined, b: string | null | undefined): boolean {
    if (!a || !b) return false
    return resolve(a) === resolve(b) || RealPath.of(a) === RealPath.of(b)
  }

  /** Whether `path` is `folder` or inside it, links followed on both sides;  `false` when either is empty. */
  static isIn(path: string | null | undefined, folder: string | null | undefined): boolean {
    return RealPath.from(folder, path) !== undefined
  }

  /**
   * `path` from `folder`, `/`-separated:  `""` for the folder itself, `undefined` outside it (or either empty).
   * - as given first, then links followed on both sides:  the cheap answer when both are spelled alike
   */
  static from(folder: string | null | undefined, path: string | null | undefined): string | undefined {
    if (!folder || !path) return undefined
    return insideOf(resolve(folder), resolve(path)) ?? insideOf(RealPath.of(folder), RealPath.of(path))
  }
}

/** `path` from `folder`, `/`-separated;  `""` for the folder itself, `undefined` outside it. */
function insideOf(folder: string, path: string): string | undefined {
  const inside = relative(folder, path)
  if (inside.startsWith("..") || isAbsolute(inside)) return undefined
  return inside.split(sep).join("/")
}
