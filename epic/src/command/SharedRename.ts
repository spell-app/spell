import {
  lstatSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  readlinkSync,
  renameSync,
  rmSync,
  symlinkSync,
  writeFileSync
} from "node:fs"
import { basename, dirname, isAbsolute, join, relative, resolve } from "node:path"

import { EpicConfig } from "$/epics/config/EpicConfig"
import { SessionFolders } from "$/epics/config/SessionFolders"

import { EpicCommandError, type FileRewrite, type RenameReport, type SharedConfig } from "./command.types"

/****************
 * ### `SharedRename`
 * `epic shared rename <new> [--dry-run]`:  rename the shared content repo.
 * - epic `epic-eject` P8:  `spell-app-dev` to `spell-app.epics`, a MORNING job (Q17)
 * - `run()` returns what it did, or would do (`RenameReport`)
 *
 * The steps:
 * 1. Refuses when there's no content folder, the new name is taken, or the folder is already a link (renamed before).
 * 2. Moves the folder, then leaves a LINK at the old name, so old paths keep working:
 *    running sessions, window files, pages and notes that still name it.
 * 3. Points every checkout's shared links at the new folder (`checkouts`:  main and every worktree).
 *    - each link relative, as `Shared.link()` writes it
 *    - a link that doesn't go through the old folder is left alone
 * 4. Writes the new place into the main checkout's `.epic/config.json5`:
 *    - `contentFolder`
 *    - and the window folder's name (`windows.contentName`), when it was the old folder's name
 *    - comments and other keys are kept
 *    - the file is TRACKED:  the change is the main checkout's to commit
 * 5. Rewrites the files that name the old folder (`rewrites`;  Owen, 2026-10-18, epic `epic-eject` J30):
 *    - the main checkout's `AGENTS.md`, `CLAUDE.md` and Claude settings (`.claude/settings.json`, `.local.json`):
 *      their extra folders and permissions;  the tracked ones are the main checkout's to commit
 *    - the repo's memory notes (`<home>/projects/<main's slug>/memory/*.md`)
 *    - each mention:  the old folder's full path, its path from the main checkout (`../spell-app-dev`) and its bare
 *      name (`spell-app-dev`, the window folder's too), in one pass (`SharedRename.renamed()`)
 * 6. Lists the lines Claude Code's OWN settings (`<home>/settings.json`) still name it, for a person to edit
 *    (`byHand`):  never written, as nothing outside the repo's folders is
 * - then the link at the old name can go, once nothing uses it
 * - `dryRun`:  step 1 for real, the rest only reported, every file and line it would rewrite among them
 * - a bare name (`spell-app.epics`) goes beside the old folder;  a path is from the current folder
 ****************/
export class SharedRename {
  /** the manifest as it is now:  `dir` is the folder to move.  STATIC for the object's life */
  readonly config: SharedConfig

  /** every checkout whose links to relink:  the main one, then the worktrees (`Shared.checkouts()`) */
  readonly checkouts: string[]

  /** Claude Code's own folder:  its settings (listed), the repo's memory notes (rewritten;  `SessionFolders.home()`) */
  readonly claudeHome: string

  constructor({ config, checkouts, claudeHome = SessionFolders.home() }: SharedRenameProps) {
    this.config = config
    this.checkouts = checkouts
    this.claudeHome = claudeHome
  }

  /**
   * Rename the content folder to `to`;  what it did, or would do.
   * - throws `EpicCommandError` when it can't (the class's step 1)
   */
  run(to: string, { dryRun = false }: { dryRun?: boolean } = {}): RenameReport {
    const from = this.config.dir
    const target = SharedRename.targetOf(from, to)
    this.refuseUnless(from, target)
    const report: RenameReport = {
      from,
      to: target,
      dryRun,
      relinked: this.relinks(from, target),
      config: { file: join(this.config.main, EpicConfig.FILE), keys: [] },
      rewrites: this.rewritable().flatMap((file) => this.rewriteOf(file, from, target)),
      byHand: this.rewriteOf(join(this.claudeHome, "settings.json"), from, target)
    }
    const { text, keys } = SharedRename.configText(readOrEmpty(report.config.file), this.config.main, from, target)
    report.config.keys = keys
    if (dryRun) return report
    renameSync(from, target)
    symlinkSync(relative(dirname(from), target), from)
    for (const { checkout, path, to: points } of report.relinked) {
      const at = join(checkout, path)
      rmSync(at, { force: true })
      symlinkSync(relative(dirname(at), points), at)
    }
    if (keys.length) {
      mkdirSync(dirname(report.config.file), { recursive: true })
      writeFileSync(report.config.file, text)
    }
    for (const { file } of report.rewrites)
      writeFileSync(file, SharedRename.renamed(readOrEmpty(file), this.config.main, from, target))
    return report
  }

  /** The folder `to` names:  beside `from` when it's a bare name, else a path from the current folder. */
  static targetOf(from: string, to: string): string {
    if (!to.trim()) throw new EpicCommandError("rename:  to what?  a folder name, like spell-app.epics")
    return /[\\/]/.test(to) ? resolve(to) : join(dirname(from), to)
  }

  /** Throws `EpicCommandError` when folder `from` can't become `to`. */
  private refuseUnless(from: string, to: string): void {
    const stat = lstatSync(from, { throwIfNoEntry: false })
    if (!stat) throw new EpicCommandError(`no content folder at ${from}:  nothing to rename`)
    if (stat.isSymbolicLink())
      throw new EpicCommandError(`${from} is already a link (to ${readlinkSync(from)}):  renamed before?`)
    if (!stat.isDirectory()) throw new EpicCommandError(`${from} isn't a folder`)
    if (to === from) throw new EpicCommandError(`${from} already has that name`)
    if (lstatSync(to, { throwIfNoEntry: false }))
      throw new EpicCommandError(`${to} is taken:  pick another name, or move it away first`)
  }

  /**
   * Every checkout's shared link that goes through folder `from`:  `{ checkout, path }` each (the class's step 3).
   * - read from each link's own text, not its real path:
   *   after the move, the left-behind link would make an old link look right
   */
  private relinks(from: string, to: string): RenameReport["relinked"] {
    const found: RenameReport["relinked"] = []
    for (const checkout of this.checkouts) {
      for (const path of linksOf(checkout, this.config.links)) {
        const at = join(checkout, path)
        if (!lstatSync(at, { throwIfNoEntry: false })?.isSymbolicLink()) continue
        const points = resolve(dirname(at), readlinkSync(at))
        const inside = relative(from, points)
        if (inside.startsWith("..") || isAbsolute(inside)) continue
        found.push({ checkout, path, to: join(to, inside) })
      }
    }
    return found
  }

  /** The files the rename rewrites (step 5):  the main checkout's rules and Claude settings, the memory notes. */
  private rewritable(): string[] {
    const main = this.config.main
    const memory = join(SessionFolders.folderOf(main, this.claudeHome), "memory")
    return [...REPO_FILES.map((file) => join(main, file)), ...listMarkdown(memory)]
  }

  /** File `file` with the content folder renamed from `from` to `to`:  its changed lines;  `[]`:  nothing to change. */
  private rewriteOf(file: string, from: string, to: string): FileRewrite[] {
    const before = readOrEmpty(file)
    const after = SharedRename.renamed(before, this.config.main, from, to)
    if (after === before) return []
    const olds = before.split("\n")
    const news = after.split("\n")
    const lines = olds.flatMap((old, at) => (old === news[at] ? [] : [{ line: at + 1, before: old, after: news[at]! }]))
    return [{ file, lines }]
  }

  /**
   * Text `text` with every mention of the content folder moved from `from` to `to` (`main`:  the main checkout).
   * - the forms, in one pass, so nothing is renamed twice:
   *   - its full path:  `/Users/owen/www/spell-app/spell-app-dev`
   *   - its path from the main checkout, when that has a folder in it:  `../spell-app-dev`
   *   - its bare name:  `spell-app-dev`, also the window folder's name
   * - a whole name only:  never inside a longer one (`spell-app-devtools`, `spell-app-dev2`, `x.spell-app-dev`)
   * - lines stay lines:  no form holds a line break
   * - static:  pure
   */
  static renamed(text: string, main: string, from: string, to: string): string {
    const forms = new Map<string, string>([[from, to]])
    const near = relative(main, from)
    if (near.includes("/")) forms.set(near, relative(main, to))
    forms.set(basename(from), basename(to))
    const alternatives = [...forms.keys()].sort((a, b) => b.length - a.length).map(escapeRegExp)
    const mention = new RegExp(`(?<![\\w.-])(?:${alternatives.join("|")})(?![\\w-]|\\.\\w)`, "g")
    return text.replace(mention, (found) => forms.get(found)!)
  }

  /**
   * Config text `text` (the main checkout's `.epic/config.json5`) with the content folder moved from `from` to `to`:
   * `contentFolder`, and `windows.contentName` when it was the old folder's name.
   * - `keys` says which changed
   * - by text, so Owen's comments stay:  a key's value replaced where it's written,
   *   else the key added after `{` (into `"windows"` when that's written)
   * - no file yet (`""`):  a file of those keys
   * - static:  pure
   */
  static configText(text: string, main: string, from: string, to: string): { text: string; keys: string[] } {
    const settings = EpicConfig.settingsFrom(text)
    const keys: string[] = []
    const folder = relative(main, to)
    if (resolve(main, settings.contentFolder) !== to) {
      text = withValue(text, "contentFolder", folder)
      keys.push("contentFolder")
    }
    if (settings.windows.contentName === basename(from) && basename(to) !== basename(from)) {
      text = withWindowName(text, basename(to))
      keys.push("windows.contentName")
    }
    return { text, keys }
  }
}

/** The main checkout's files that name the content folder, which the rename rewrites (step 5). */
const REPO_FILES = ["AGENTS.md", "CLAUDE.md", ".claude/settings.json", ".claude/settings.local.json"]

/** `text` as a regular expression that matches it literally. */
function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

/** What `new SharedRename()` takes:  see its constructor. */
export type SharedRenameProps = { config: SharedConfig; checkouts: string[]; claudeHome?: string }

/** The `"shared": { "links" }` of checkout `checkout`'s own `package.json`, else `links`. */
function linksOf(checkout: string, links: string[]): string[] {
  try {
    return JSON.parse(readFileSync(join(checkout, "package.json"), "utf8")).shared?.links ?? links
  } catch {
    return links
  }
}

/**
 * Config text `text` with top-level `key` set to `value`:
 * replaced where it's written, else added after the object's `{`;  no object at all:  a new one.
 */
function withValue(text: string, key: string, value: string): string {
  const written = new RegExp(`("${key}"\\s*:\\s*)"(?:[^"\\\\]|\\\\.)*"`)
  if (written.test(text)) return text.replace(written, (_all, head: string) => `${head}${JSON.stringify(value)}`)
  if (!text.includes("{")) return `{\n  "${key}": ${JSON.stringify(value)}\n}\n`
  return text.replace("{", `{\n  "${key}": ${JSON.stringify(value)},`)
}

/** Config text `text` with `windows.contentName` set to `name`:  in `"windows"` when written, else a new block. */
function withWindowName(text: string, name: string): string {
  if (/"contentName"\s*:/.test(text)) return withValue(text, "contentName", name)
  const windows = /("windows"\s*:\s*\{)/
  if (windows.test(text)) return text.replace(windows, `$1\n    "contentName": ${JSON.stringify(name)},`)
  if (!text.includes("{")) return `{\n  "windows": { "contentName": ${JSON.stringify(name)} }\n}\n`
  return text.replace("{", `{\n  "windows": { "contentName": ${JSON.stringify(name)} },`)
}

/** Every `.md` file right in folder `dir`;  `[]` when it isn't there. */
function listMarkdown(dir: string): string[] {
  try {
    return readdirSync(dir)
      .filter((file) => file.endsWith(".md"))
      .map((file) => join(dir, file))
  } catch {
    return []
  }
}

/** The text of `file`;  `""` when it isn't there. */
function readOrEmpty(file: string): string {
  try {
    return readFileSync(file, "utf8")
  } catch {
    return ""
  }
}
