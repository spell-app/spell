import { existsSync, readFileSync, statSync } from "node:fs"
import { basename, dirname, join, resolve } from "node:path"

/**
 * The git checkout `path` is in:  its root, the MAIN checkout's root, and the worktree's name in a worktree;
 * `undefined` outside git.
 *
 * ```ts
 * SRV.checkoutOf("/repo/packages/ui")                    // => { root: "/repo", main: "/repo" }
 * SRV.checkoutOf("/repo/.claude/worktrees/seo/epics")    // => { root: ".../seo", main: "/repo", worktree: "seo" }
 * ```
 *
 * - Read from the disk, as git finds them, with no `git` run:
 *   - the nearest `.git` at or above `path`:  a FOLDER in the main checkout,
 *     a FILE in a worktree (`gitdir: <main>/.git/worktrees/<id>`)
 *   - a worktree's main checkout:  the folder holding git's common dir (that gitdir's `commondir`),
 *     the same answer as `git rev-parse --git-common-dir`
 *   - a `.git` file with no `commondir` (a submodule's):  a checkout of its own
 *   - a BROKEN worktree, one git no longer knows (its `.git` file names `<main>/.git/worktrees/<id>`, which is gone):
 *     still the worktree of that main checkout, when its `.git` folder is there;  `missingGitDir` says so
 *     - e.g. a main `.git/worktrees/` pruned, or the main checkout moved:  `git worktree repair <root>`, run from the
 *       main checkout, links it back
 *     - before (epic `epic-engine` P26, request r20):  it counted as a checkout of its own, so the epic settings read
 *       from inside it put the content, windows and worktrees folders inside it too
 * - `path` itself needn't exist:  the folders above it are looked at
 * - `worktree`:  the worktree folder's name, which is how the main page server serves it (`/worktrees/<name>/`)
 * - paths as found, links not resolved:  a `cwd` inside a shared-content link (`epics/`) is still this checkout's
 * - NEVER throws:  a `.git` file it can't read counts as a checkout of its own
 * - Its position:  imports only node's own modules,
 *   so plain `node` loads it by path, types stripped (epics' `EpicConfig`, which the hooks and window script load)
 *   - NEVER an alias, an `enum` or a parameter property
 */
export function checkoutOf(path: string): Checkout | undefined {
  for (let dir = resolve(path); ; dir = dirname(dir)) {
    const git = join(dir, ".git")
    const stat = statSync(git, { throwIfNoEntry: false })
    if (stat?.isDirectory()) return { root: dir, main: dir }
    if (stat?.isFile()) return worktreeAt(dir, git) ?? { root: dir, main: dir }
    if (dirname(dir) === dir) return undefined
  }
}

/** Checkout `root`, whose `.git` is the file `git`, as a worktree of a main checkout;  `undefined` when it isn't one. */
function worktreeAt(root: string, git: string): Checkout | undefined {
  try {
    const gitdir = /^gitdir:\s*(.+)$/m.exec(readFileSync(git, "utf8"))?.[1]?.trim()
    if (!gitdir) return undefined
    const own = resolve(root, gitdir)
    if (!existsSync(own)) return brokenWorktreeAt(root, own)
    const commondir = join(own, "commondir")
    if (!existsSync(commondir)) return undefined
    const common = resolve(own, readFileSync(commondir, "utf8").trim())
    return { root, main: dirname(common), worktree: basename(root) }
  } catch {
    return undefined
  }
}

/**
 * Checkout `root`, whose `.git` file names `own`, a git folder that's gone:  the worktree of the main checkout that
 * folder was in (`<main>/.git/worktrees/<id>`), when `<main>/.git` is still a folder;  else `undefined`.
 */
function brokenWorktreeAt(root: string, own: string): Checkout | undefined {
  const worktrees = dirname(own)
  const gitFolder = dirname(worktrees)
  if (basename(worktrees) !== "worktrees" || basename(gitFolder) !== ".git") return undefined
  if (!statSync(gitFolder, { throwIfNoEntry: false })?.isDirectory()) return undefined
  return { root, main: dirname(gitFolder), worktree: basename(root), missingGitDir: own }
}

/**
 * A git checkout, as `SRV.checkoutOf()` finds it.
 * - `root`:  the checkout's own folder
 * - `main`:  the MAIN checkout's folder:  `root` itself, unless `root` is a worktree
 * - `worktree`:  the worktree's folder name, in a worktree only
 * - `missingGitDir`:  in a BROKEN worktree only, one git no longer knows:  the git folder its `.git` file names,
 *   which is gone
 * - here, not in `server.types.ts`:  this file imports nothing of the package's, so a tsconfig without the alias table
 *   (app's `tsconfig.node.json`, through spaces' `environment.ts`) still compiles it
 */
export type Checkout = { root: string; main: string; worktree?: string; missingGitDir?: string }
