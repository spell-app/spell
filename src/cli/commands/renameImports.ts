import { execFileSync } from "node:child_process"
import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs"
import { join, relative, resolve } from "node:path"

/**
 * `spell rename imports [--dry-run] [--json] [repos...]`:  the import rename of epic `repo-split` P20 (One Repo, Q62),
 * kept so a branch open when it landed can rerun it over its own lines before merging `main`.
 * - spell-parser, spell-ui, spell-epic and spell-app are folders of the ONE package `spell` now:
 *   `parser/`, `ui/`, `epic/` and `app/` beside the kit's own `src/`.
 * - So every name of theirs becomes the package, then the folder:
 *   - an import name:  `spell-ui/components/ui-button` => `spell/ui/components/ui-button`, `"spell-ui"` => `"spell/ui"`
 *   - a source condition:  `spell-ui-source` => `spell-source`
 *   - a path naming the old folder:  `../spell-ui/site/_assets` => `../ui/site/_assets`,
 *     `[...](spell-ui/README.md)` => `[...](ui/README.md)`, `/spell-ui/src/x.ts` => `/ui/src/x.ts`
 *   - a GitHub link into a file:  `github.com/spell-app/spell-ui/blob/main/x` => `github.com/spell-app/spell/blob/main/ui/x`
 * - Plain node runs it as is (types stripped):  node's own modules only, so the merge script
 *   (`tools/one-repo/one-repo.ts`) imports it before anything is installed.
 *
 * What it leaves:
 * - a bare repo name (`spell-ui`, `"spell-ui": "workspace:*"`):  a name, not an import;  only an import of a barrel
 *   (`from "spell-ui"`) changes
 * - a longer name (`spell-ui-site:`, `src-spell-ui-src-x`, `@spell-ui/...`), a lint rule (`spell-ui/no-...`),
 *   the GitHub org (`spell-app/spell-ui`), an old checkout's path (`~/www/spell-app/...`), a saga in a short address
 *   (`SAGA:/spell-ui/seo`)
 * - a link to a commit (`blob/<sha>/...`), an issue or a pull request:  the old repo's own
 * - a line that tells of the rename itself (`spell-ui/x` => `spell/ui/x`)
 * - files that name the old names on purpose (`SKIPPED`), and the content repo (`spell.epics`):  its pages keep
 *   their history
 *
 * How it tells an import from a path, for `spell-ui/<rest>`:
 * 1. a path's context (`../`, `/`, `](` before it) => a path;  a module's (`from "`, `import("` ...) => an import
 * 2. a file the package lists by name (`spell-ui/vite.config.ts`, `spell-app/vscode/src/spellAppRoot.ts`) => an import
 * 3. else by what's on disk:  `<folder>/src/<rest>` resolves => an import;  `<folder>/<first>` is there => a path
 * 4. both:  in quotes or backticks an import, else a path;  neither:  left as it is
 */
export class ImportRenamer {
  /** the kit's checkout:  where the folders are (`<kit>/ui`), or the old child repos (`<kit>/spell-ui`) */
  readonly kit: string
  /** each folder's file tables, built once */
  private readonly tables = new Map<string, FolderTable>()

  constructor(kit: string) {
    this.kit = kit
    for (const folder of FOLDERS) this.tables.set(folder.repo, this.tableFor(folder))
  }

  /**
   * Rename the old names in every tracked text file of `repo` (a git checkout), writing each file it changes
   * unless `dryRun`.
   * - `prefix`:  what to print before each file's path (default its path from the kit)
   * - `only`:  just these files (paths from the repo's root);  default every tracked file
   * - NEVER throws for a file it can't read:  it's skipped.
   */
  renameRepo(repo: string, dryRun: boolean, only?: ReadonlySet<string>): RenameReport {
    const report: RenameReport = { repo, files: [], names: 0 }
    const listed = execFileSync("git", ["ls-files", "-z"], { cwd: repo, encoding: "utf8", maxBuffer: 1 << 28 })
    for (const file of listed.split("\0").filter(Boolean)) {
      if (SKIPPED.test(file) || (only && !only.has(file))) continue
      const path = join(repo, file)
      const before = readText(path)
      if (before === undefined) continue
      const { text, count } = this.renameText(before)
      if (!count) continue
      report.files.push({ file: relative(this.kit, path) || file, count })
      report.names += count
      if (!dryRun) writeFileSync(path, text)
    }
    return report
  }

  /** `text` with every old name renamed, and how many. */
  renameText(text: string): { text: string; count: number } {
    let count = 0
    const lines = text.split("\n").map((line) => {
      if (!OLD_NAME.test(line) || RENAME_MENTION.test(line)) return line
      const renamed = this.renameLine(line)
      count += renamed.count
      return renamed.line
    })
    return { text: lines.join("\n"), count }
  }

  /** One line, renamed. */
  renameLine(line: string): { line: string; count: number } {
    let count = 0
    const counted = (to: string) => {
      count++
      return to
    }
    line = line.replace(CONDITION, () => counted("spell-source"))
    line = line.replace(GITHUB_FILE, (whole, repo: string, kind: string, ref: string, rest: string) =>
      /^[0-9a-f]{7,40}$/.test(ref)
        ? whole
        : counted(`github.com/spell-app/spell/${kind}/${ref}/${this.folderOf(repo)}${rest}`)
    )
    line = line.replace(BARREL_IMPORT, (_whole, before: string, repo: string, quote: string) =>
      counted(`${before}spell/${this.folderOf(repo)}${quote}`)
    )
    line = line.replace(PREFIXED, (whole, repo: string, rest: string, offset: number) => {
      // a template's slot right after the name (`spell-ui/${name}`):  what it builds isn't known here
      if (line[offset + whole.length] === "$") return whole
      const to = this.renamePrefixed(line.slice(Math.max(0, offset - 24), offset), repo, rest)
      return to === undefined ? whole : counted(to)
    })
    return { line, count }
  }

  /**
   * `spell-<repo>/<rest>`, renamed as an import or a path by what's `before` it and what's on disk;
   * `undefined` to leave it.
   */
  renamePrefixed(before: string, repo: string, rest: string): string | undefined {
    const folder = this.folderOf(repo)
    const table = this.tables.get(repo)!
    const first = rest.split("/")[0]!
    // part of a longer name, the GitHub org, an old checkout's path
    if (/[\w@-]$/.test(before) || /(github\.com|githubusercontent\.com|www|worktrees)\/$/.test(before)) return
    // a short address's saga (`SAGA:/spell-ui/seo#J3`):  a scheme, then a name
    if (/[A-Za-z]:\/$/.test(before)) return
    if (repo === "app" && first.startsWith("spell")) return
    // a pair of names, not a path into a folder:  a plugin and its marketplace (`cache/spell-epic/spell-epic/0.1.0`)
    if (/^spell-(parser|ui|epic|app)\b/.test(first) || /(cache|plugins)\/$/.test(before)) return
    // a lint rule's family (`spell-ui/*`), not a module
    if (first.startsWith("*") && !MODULE_CONTEXT.test(before)) return
    // an installed package's files:  `spell-ui` stays a package on npm (its bundle, Q63)
    if (/node_modules\/$/.test(before)) return
    // a package on a CDN (`cdn.jsdelivr.net/npm/spell-ui/dist/`):  npm's name
    if (/(npm|unpkg\.com|esm\.sh)\/$/.test(before)) return
    const asImport = `spell/${folder}/${rest}`
    const asPath = `${folder}/${rest}`
    // a relative path, a Markdown link, the kit's own folder (`~/www/spell/spell-ui/`):  a path
    if (/(\.\/|\]\(|(^|\/)spell\/)$/.test(before)) return asPath
    // another path (`/spell-ui/src/x.ts`, `/r/spell-app/`):  a path only into a folder the old repo had at its root
    if (before.endsWith("/")) return table.rootEntries.has(first) ? asPath : undefined
    if (MODULE_CONTEXT.test(before)) return asImport
    if (table.named.some((name) => rest === name || rest.startsWith(`${name}.`) || rest.startsWith(`${name}/`)))
      return asImport
    if (table.shortNames.some((pattern) => pattern.test(rest))) return asImport
    // the folder alone:  in prose (`` `spell-ui/` ``) the folder;  in quotes a prefix of names (an import map's)
    if (!first) return /["']$/.test(before) ? undefined : asPath
    const isImport = table.resolves(rest)
    const isPath = table.rootEntries.has(first)
    if (isImport && !isPath) return asImport
    if (isPath && !isImport) return asPath
    if (isImport && isPath) return /["'`]$/.test(before) ? asImport : asPath
    return undefined
  }

  /** `ui` for `ui`, from the regexes' short names. */
  private folderOf(repo: string): string {
    return FOLDERS.find((folder) => folder.repo === repo)!.folder
  }

  /** The folder's file tables, from wherever it is in this checkout:  the merged folder, else the old child repo. */
  private tableFor(folder: Folder): FolderTable {
    const dir = [join(this.kit, folder.folder), join(this.kit, `spell-${folder.repo}`)].find((d) =>
      existsSync(join(d, "package.json"))
    )
    const rootEntries = new Set(dir ? trackedEntries(dir) : [])
    const named = dir ? namedFiles(this.kit, folder, dir) : []
    const shortNames = dir ? shortNamesOf(dir) : []
    const src = dir && join(dir, "src")
    return {
      rootEntries,
      named,
      shortNames,
      resolves: (rest) => {
        if (!src) return false
        const path = rest
          .replace(/[*?{].*$/, "")
          .replace(/\.{3}$/, "")
          .replace(/\/$/, "")
        return SOURCE_SHAPES.some((shape) => existsSync(join(src, path + shape)))
      }
    }
  }
}

////////////////
// ## The command
////////////////

/**
 * Run the rename over the nearest kit's checkout, the old child repos still inside it, and the repos beside it its
 * `repos.json5` lists by `path` (spell-brand);  prints each file it changed, and the sums.
 * - Returns the reports, one per repo.
 */
export function renameImportsCommand(kit: string, options: RenameImportsOptions = {}): RenameReport[] {
  const renamer = new ImportRenamer(kit)
  const repos = options.repos?.length ? options.repos.map((repo) => resolve(repo)) : reposOf(kit)
  const reports = repos.map((repo) => renamer.renameRepo(repo, options.dryRun ?? false))
  if (options.json) {
    console.log(JSON.stringify(reports, null, 2))
    return reports
  }
  for (const report of reports) {
    for (const { file, count } of report.files) console.log(`${String(count).padStart(5)}  ${file}`)
  }
  const files = reports.reduce((sum, report) => sum + report.files.length, 0)
  const names = reports.reduce((sum, report) => sum + report.names, 0)
  console.log(`${options.dryRun ? "would change" : "changed"} ${names} names in ${files} files, ${repos.length} repos`)
  return reports
}

/**
 * The repos to rename in:  the kit, each peer its `repos.json5` names by `path` (spell-brand), and, in the old layout
 * only, each child repo inside it (a folder of its own with a `.git`).
 * - The merged layout (a `<kit>/ui/package.json`) can still hold the old child repos' folders, git-ignored:
 *   they're left alone.
 */
export function reposOf(kit: string): string[] {
  const merged = FOLDERS.some((folder) => existsSync(join(kit, folder.folder, "package.json")))
  const inside = merged
    ? []
    : readdirSync(kit)
        .filter((name) => /^spell-/.test(name) && existsSync(join(kit, name, ".git")))
        .map((name) => join(kit, name))
  const peers: string[] = []
  const reposFile = join(kit, "repos.json5")
  if (existsSync(reposFile)) {
    for (const match of readFileSync(reposFile, "utf8").matchAll(/"path":\s*"([^"]+)"/g)) {
      const dir = resolve(kit, match[1]!)
      if (existsSync(join(dir, ".git"))) peers.push(dir)
    }
  }
  return [kit, ...inside.filter((dir) => !peers.includes(dir)), ...peers]
}

////////////////
// ## The rules
////////////////

/** One folder of the merged repo, and the repo it was. */
type Folder = {
  /** the old repo's name less `spell-`:  `ui` */
  repo: string
  /** its folder in the merged repo:  `ui` */
  folder: string
}

/** The four repos merged into the kit (epic `repo-split` P20, Q56). */
const FOLDERS: Folder[] = [
  { repo: "parser", folder: "parser" },
  { repo: "ui", folder: "ui" },
  { repo: "epic", folder: "epic" },
  { repo: "app", folder: "app" }
]

/** What a folder's names are checked against. */
type FolderTable = {
  /** its root's entries:  `src`, `site`, `docs`, `AGENTS.md` ... */
  rootEntries: Set<string>
  /** files outside `src/` its package lists by name, without `./`:  `vite.config.ts`, `site/_src/SitePatch` */
  named: string[]
  /** its published short names (`"spellPublish": { "exports" }`, `./ui-*`):  `ui-button` is an import too */
  shortNames: RegExp[]
  /** does `spell/<folder>/<rest>` name a source file:  `<folder>/src/<rest>` with an extension or an `index` */
  resolves: (rest: string) => boolean
}

/** A cheap first look:  a line with no old name is left at once. */
const OLD_NAME = /spell-(parser|ui|epic|app)\b/

/** A source condition:  `spell-ui-source` */
const CONDITION = /(?<![\w-])spell-(?:parser|ui|epic|app)-source(?![\w-])/g

/** A GitHub link into a file or folder of an old repo:  repo, `blob` / `tree`, ref, the rest */
const GITHUB_FILE =
  /github\.com\/spell-app\/spell-(parser|ui|epic|app)\/(blob|tree)\/([^/\s)"'`#]+)((?:\/[^\s)"'`]*)?)/g

/** An import of a repo's barrel:  `from "spell-ui"`, `import("spell-epic")`, `vi.mock("spell-ui")` */
const BARREL_IMPORT = /(\b(?:from|import|require|mock|resolve)\s*\(?\s*["'`])spell-(parser|ui|epic|app)(["'`])/g

/** A name with a path after it:  `spell-ui/components/ui-button`, `spell-ui/` */
const PREFIXED = /spell-(parser|ui|epic|app)\/([\w@.*/-]*)/g

/** What comes right before a module's name:  `from "`, `import("`, `vi.mock('` */
const MODULE_CONTEXT = /\b(?:from|import|require|mock|resolve)\s*\(?\s*["'`]$/

/** What a source name resolves to, from `<folder>/src/<rest>` */
const SOURCE_SHAPES = ["", ".ts", ".tsx", ".d.ts", ".js", ".mjs", ".css", "/index.ts", "/index.tsx"]

/**
 * A line that tells of the rename:  an old name, an arrow (or "is now", "became") and a new one;  left as it is
 * (`` `spell-ui/x` => `spell/ui/x` ``)
 */
const RENAME_MENTION =
  /spell-(?:parser|ui|epic|app)\b[\w/.-]*`?\s*(?:=>|->|→|is now|became|becomes)\s*`?(?:spell\/|parser\/|ui\/|epic\/|app\/|spell-source)/

/**
 * Files never rewritten:  what a tool regenerates or records, and the files that name the old names on purpose
 * - `yarn.lock`;  a changelog and the README drafts (`docs/drafts/`:  history);  the commit maps (`tools/one-repo/`)
 * - this one and the scripts that ran the earlier renames and moves (`tools/rename-packages.ts`,
 *   `tools/content-links.ts`:  its old paths are history)
 * - the links that mend an old `/spell-ui/` path to `/ui/` (the kit's `Linker`, spell-epic's `RootLinks`)
 */
const SKIPPED =
  /(^|\/)yarn\.lock$|(^|\/)CHANGELOG\.md$|^docs\/drafts\/|^tools\/one-repo\/|^tools\/(rename-packages|content-links)\.ts$|^tests\/tools\/content-links\.test\.ts$|(^|\/)renameImports(\.test)?\.ts$|^src\/server\/Linker\.ts$|^tests\/server\/Linker\.test\.ts$|(^|\/)src\/tool\/migrations\/RootLinks\.ts$/

/**
 * The files outside `src/` a folder's package lists by name (`./vite.config.ts`), from its `exports`:  the folder's
 * own `package.json` (before the merge), else the kit's `./<folder>/...` entries (after).
 */
function namedFiles(kit: string, folder: Folder, dir: string): string[] {
  const keys = new Set<string>()
  for (const [manifest, prefix] of [
    [join(dir, "package.json"), "./"],
    [join(kit, "package.json"), `./${folder.folder}/`]
  ] as const) {
    const exports = (readJson(manifest)?.exports ?? {}) as Record<string, unknown>
    for (const [key, target] of Object.entries(exports)) {
      if (!key.startsWith(prefix) || key.includes("*") || key.endsWith("package.json")) continue
      const where = JSON.stringify(target)
      if (where.includes("/src/")) continue
      keys.add(key.slice(prefix.length).replace(/\.(ts|tsx|mjs|js)$/, ""))
    }
  }
  return [...keys]
}

/**
 * The short names a folder's package publishes beside the long ones (`"spellPublish": { "exports" }`:  `./ui-*`), as
 * patterns over the rest of a name (`ui-button`, `ui-button/x`).
 */
function shortNamesOf(dir: string): RegExp[] {
  const exports = ((readJson(join(dir, "package.json")) as { spellPublish?: { exports?: object } } | undefined)
    ?.spellPublish?.exports ?? {}) as Record<string, unknown>
  return Object.keys(exports)
    .filter((key) => key.includes("*"))
    .map((key) => {
      const [before, after] = key.replace(/^\.\//, "").split("*") as [string, string]
      return new RegExp(`^${escaped(before)}[\\w-]+${escaped(after)}(?:$|/)`)
    })
}

/** `text` as a literal in a regular expression. */
function escaped(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

/**
 * The entries at the root of folder `dir` that git tracks (`src`, `site`, `AGENTS.md` ...):  never what it ignores
 * (`dist/`, `node_modules/`), which a name can't mean.
 */
function trackedEntries(dir: string): string[] {
  try {
    const listed = execFileSync("git", ["ls-files", "-z"], { cwd: dir, encoding: "utf8", maxBuffer: 1 << 28 })
    return [
      ...new Set(
        listed
          .split("\0")
          .filter(Boolean)
          .map((file) => file.split("/")[0]!)
      )
    ]
  } catch {
    return readdirSync(dir)
  }
}

/** `file`'s JSON, or `undefined`. */
function readJson(file: string): { exports?: unknown } | undefined {
  try {
    return JSON.parse(readFileSync(file, "utf8")) as { exports?: unknown }
  } catch {
    return undefined
  }
}

/** A regular file's text, or `undefined`:  gone, a link, a folder, binary (a NUL byte). */
function readText(path: string): string | undefined {
  try {
    if (!statSync(path).isFile()) return undefined
    const text = readFileSync(path, "utf8")
    return text.includes("\0") ? undefined : text
  } catch {
    return undefined
  }
}

////////////////
// ## Types
////////////////

/** `spell rename imports`' flags. */
export type RenameImportsOptions = {
  /** report, change nothing */
  dryRun?: boolean
  /** print the reports as JSON */
  json?: boolean
  /** the repos to rename in;  default the kit's checkout, its old child repos and its peers (`reposOf()`) */
  repos?: string[]
}

/** What the rename did in one repo. */
export type RenameReport = {
  /** the repo's folder */
  repo: string
  /** each file changed:  its path from the kit, and how many names */
  files: { file: string; count: number }[]
  /** names changed, in all */
  names: number
}
