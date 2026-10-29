import { cpSync, existsSync, mkdirSync, rmSync } from "node:fs"
import { dirname, join, matchesGlob } from "node:path"

import { Git } from "spell/server/Git"
import { EpicHome } from "spell/epic/config/EpicHome"

import { EpicCommandError, type Generator } from "./command.types"
import { LinesOfCode } from "./LinesOfCode"
import { MainMerge } from "./MainMerge"

/**
 * Files a test run or a build leaves behind, never anyone's work:  `epic merge` moves them aside without asking.
 * - with each repo's own generated outputs (its `.epic/generators.json5`:  packs, bundles), and every file its
 *   `.gitattributes` marks `linguist-generated` (spell-app's compiled `*.lib.ts` ...)
 */
const LEFT_BY_TOOLS = [
  "**/__snapshots__/**",
  "**/__screenshots__/**",
  "coverage/**",
  "test-results/**",
  "**/*.tsbuildinfo",
  "**/*.map",
  "**/.DS_Store"
]

/**
 * How many fields come before the path in a `git status --porcelain=v2` entry, by its first:
 * `1` a changed file, `u` an unmerged one, `?` a new one
 */
const STATUS_FIELDS: Record<string, number> = { "1": 8, u: 10, "?": 1 }

/****************
 * ### `StrayFiles`
 * What's uncommitted in a checkout when a merge comes to it, and moving it aside:
 * a MAIN checkout's at `epic merge`, an epic worktree's repo at `epic worktree merge-main` (epic `epic-engine` I124).
 * - Why (Owen, 2026-10-23, epic `epic-engine` I77):  "I'm seeing stray files in main occasionally, e.g. a
 *   `settings.json5` or snapshot from a test ... if there are one or two random files on main, ask if I want to ditch
 *   them before merging rather than just bailing.  If they are clearly build output files, snapshots ... you can just
 *   ditch them."
 * - Each file is `generated` (`LEFT_BY_TOOLS`, one of the repo's generated outputs, or `linguist-generated`) or
 *   someone's:
 *   - generated ones are ditched without asking
 *   - up to `ASK_LIMIT` of someone's are ditched only once the person says so (`epic merge <epic> --ditch`);
 *     more is real work in that checkout, another session's maybe, and is never offered
 * - DITCHED is moved aside, never deleted:  copied into the epic home's `ditched/<time>/<repo>/`, then the checkout's
 *   copy put back as committed (a new file removed)
 * - Node built-ins and git only.
 ****************/
export class StrayFiles {
  /** the checkout:  STATIC for the object's life */
  readonly checkout: string

  /** what's uncommitted there, each file once, in `git status` order */
  readonly files: StrayFile[]

  /**
   * Read what's uncommitted in `checkout` now.
   * - `generators`:  the repo's generators, whose outputs count as generated;  default its `.epic/generators.json5`
   */
  constructor(checkout: string, generators: Generator[] = MainMerge.generatorsOf(checkout)) {
    this.checkout = checkout
    const generated = [...LEFT_BY_TOOLS, ...generators.flatMap(({ outputs }) => outputs)]
    // v2:  each entry starts with its kind, so `Git.run()`'s trimming can't eat a status column
    const status = Git.run(["status", "--porcelain=v2", "-z", "--no-renames", "--untracked-files=all"], checkout)
    if (!status.ok) throw new EpicCommandError(`merge:  \`git status\` failed in ${checkout}:  ${status.err}`)
    const entries = status.out
      .split("\0")
      .filter(Boolean)
      .map((entry) => {
        const fields = entry.split(" ")
        return { path: fields.slice(STATUS_FIELDS[fields[0]!] ?? 1).join(" "), tracked: fields[0] !== "?" }
      })
    const marked = entries.length
      ? LinesOfCode.generatedFiles(
          checkout,
          entries.map(({ path }) => path)
        )
      : new Set()
    this.files = entries.map(({ path, tracked }) => ({
      path,
      tracked,
      generated: marked.has(path) || generated.some((glob) => matchesGlob(path, glob))
    }))
  }

  /** the files nobody made by hand:  ditched without asking */
  get generated(): StrayFile[] {
    return this.files.filter((file) => file.generated)
  }

  /** the files someone may have made or changed:  ditched only once the person says so */
  get handMade(): StrayFile[] {
    return this.files.filter((file) => !file.generated)
  }

  /**
   * Throw unless this checkout can be ditched clean:  every file generated, or `ditch` and no more than `ASK_LIMIT`
   * hand-made ones.
   * - `label`:  how the error names the checkout (`the main checkout`, `spell-app's main checkout`)
   * - `epic`:  for the command it suggests
   */
  check({ label, epic, ditch }: { label: string; epic: string; ditch: boolean }): void {
    const { handMade } = this
    if (!handMade.length) return
    const list = handMade.map(({ path, tracked }) => `  ${path}${tracked ? "" : "  (new)"}`).join("\n")
    if (handMade.length > StrayFiles.ASK_LIMIT)
      throw new EpicCommandError(
        `merge:  ${label} has uncommitted work (${handMade.length} files);  another session may be working there:  ` +
          `nothing merged\n${list}`
      )
    if (!ditch)
      throw new EpicCommandError(
        `merge:  ${label} has ${handMade.length} stray file${handMade.length === 1 ? "" : "s"}:  nothing merged\n` +
          `${list}\n` +
          `Ask the person whether to ditch ${handMade.length === 1 ? "it" : "them"}, then \`epic merge ${epic} --ditch\`:  ` +
          `moved aside into ${StrayFiles.ditchedFolder()}/, not deleted`
      )
  }

  /**
   * Move aside the generated files, and the hand-made ones too when `ditch`:  each copied into `folder`
   * (its path kept), then put back as committed, a new one removed.
   * - returns the paths moved, in `files` order
   * - call `check()` first:  this moves whatever it's told
   */
  ditch({ folder, ditch }: { folder: string; ditch: boolean }): string[] {
    const { checkout } = this
    const moving = ditch ? this.files : this.generated
    for (const { path } of moving) {
      const from = join(checkout, path)
      if (!existsSync(from)) continue // a deleted file:  putting it back is all
      mkdirSync(dirname(join(folder, path)), { recursive: true })
      cpSync(from, join(folder, path))
    }
    const tracked = moving.filter((file) => file.tracked).map(({ path }) => path)
    if (tracked.length) {
      const restore = Git.run(["restore", "--source=HEAD", "--staged", "--worktree", "--", ...tracked], checkout)
      if (!restore.ok) throw new EpicCommandError(`merge:  \`git restore\` failed in ${checkout}:  ${restore.err}`)
    }
    for (const { path } of moving.filter((file) => !file.tracked)) rmSync(join(checkout, path), { force: true })
    return moving.map(({ path }) => path)
  }

  /** where ditched files go, in the epic home:  `ditched/<time>/<repo>/<path>` */
  static readonly FOLDER = "ditched"

  /** the most hand-made files `epic merge` offers to ditch:  more is somebody's work */
  static readonly ASK_LIMIT = 3

  /**
   * Where ditched files go:  `ditched/` in the epic home (`EpicHome`).
   * - read on every call, for tests
   */
  static ditchedFolder(): string {
    return EpicHome.subfolder(StrayFiles.FOLDER)
  }

  /**
   * The folder one `epic merge` run moves files aside into:  `ditched/<time>/`, made when first written.
   * - static:  the clock and the home folder only
   */
  static folderFor(at = new Date()): string {
    return join(StrayFiles.ditchedFolder(), at.toISOString().replace(/[:.]/g, "-").slice(0, 19))
  }
}

/**
 * A file `git status` lists in a checkout.
 * - `path`:  from the checkout's root
 * - `tracked`:  committed before (changed, deleted or staged);  else a new file
 * - `generated`:  left by a tool, nobody's work (`LEFT_BY_TOOLS`, the repo's generated outputs, `linguist-generated`)
 */
export type StrayFile = { path: string; tracked: boolean; generated: boolean }
