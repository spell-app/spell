import { copyFileSync, cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync } from "node:fs"
import { basename, dirname, extname, join, relative, resolve, sep } from "node:path"

import { CLI } from "spell/cli"
import { commandSources } from "spell/cli/commands/commandsCommand"
import { Git } from "spell/server/Git"
import { pathInside } from "spell/server/RealPath"
import { EpicConfig } from "spell/epic/config/EpicConfig.ts"
import { Sagas } from "spell/epic/tool/Sagas.ts"

import { EXIT, EpicCommandError, parseVerbArgs } from "./command.types.ts"
import { ShippedGuides } from "./ShippedGuides.ts"

/****************
 * ### `Guides`
 * `epic guides list | move | prune | index | check`:  guides moved out of the epic folder into the code, where they're versioned and
 * shipped with it (epic `epic-engine` P79).
 * - A repo names its own guides folder in its epic settings, `guidesFolder` (the kit's:  `guides`, at its root);
 *   every tool finds a guide there first, then in the epic folder's `guides/` (`EpicConfig.guideFoldersOf()`).
 * - `move`, in a worktree:  each guide COPIED into the checkout's guides folder, at the same path, for the branch to
 *   commit;  the epic folder keeps its copy, so `main` never loses the guide in between.
 *   - with it:  its twins beside it (`<name>.md`, `<name>.json5`), the files it links or shows from its own folder
 *     (pictures ...), and its folder's `experiments/` when it's that folder's own page (`<topic>/<topic>.html`)
 *   - NOT its comments (`<page>.inbox.json5`) nor the pictures people pasted into them (`pictures/`):  they stay in
 *     the epic folder, at the same path, which the page server and the inboxes still read
 *   - `SAGA:/<id>`:  every guide naming that saga (`<meta name="spell-saga">`)
 * - `prune`, in the main checkout:  the epic folder's copy of every file `main`'s guides folder tracks, deleted, so the
 *   code's is the one copy;  `epic merge` runs it after every merge that moved something onto `main`.
 * - `index`, `check`:  the shipped guides' list and their check (`ShippedGuides`)
 * - Its position:  node only;  the epic folder's files are changed by path, never through git (the turn's end commits
 *   them, `epic turn end`).
 ****************/
export class Guides {
  /** the checkout the verbs work on:  its guides folder, and its repo's epic folder */
  readonly checkout: string

  constructor({ checkout = process.cwd() }: { checkout?: string } = {}) {
    this.checkout = checkout
  }

  /** Run `epic guides <args>`;  resolves to the exit code.  Throws `EpicCommandError` for a bad command line. */
  async run(args: string[]): Promise<number> {
    const { positional, flags } = parseVerbArgs(args, ["json", "dry-run"])
    const [verb = "list", ...pages] = positional
    const dryRun = Boolean(flags.dryRun)
    if (verb === "list") {
      const listing = this.list()
      if (flags.json) CLI.out(JSON.stringify(listing, null, 2))
      else for (const { path, where } of listing) CLI.out(`${where.padEnd(6)}  ${path}`)
      return EXIT.OK
    }
    if (verb === "move") {
      if (!pages.length) throw new EpicCommandError("guides move:  which guides?  a page (guides/x.html) or SAGA:/<id>")
      for (const line of this.move(pages, { dryRun }).lines) CLI.out(line)
      return EXIT.OK
    }
    if (verb === "prune") {
      const pruned = Guides.prune(this.checkout, { dryRun })
      CLI.out(pruned.length ? `${dryRun ? "would delete" : "deleted"} from the epic folder:` : "nothing to prune")
      for (const path of pruned) CLI.out(`  ${path}`)
      return EXIT.OK
    }
    if (verb === "index") {
      const shipped = new ShippedGuides(this.checkout)
      if (!shipped.file) throw new EpicCommandError("guides index:  this repo has no guides folder (guidesFolder)")
      const changed = shipped.write()
      const { guides, startHere } = shipped.build()
      CLI.out(
        `${relative(this.checkout, shipped.file)}:  ${guides.length} guides, ${startHere.length} Start here` +
          `${changed ? "" : ", already"}`
      )
      return EXIT.OK
    }
    if (verb === "check") {
      const problems = new ShippedGuides(this.checkout).check({ commandExists: commandsIn(this.checkout) })
      for (const problem of problems) CLI.out(problem)
      CLI.err(
        problems.length ? `${problems.length} problem(s) in the shipped guides` : "the shipped guides stand alone"
      )
      return problems.length ? EXIT.ERRORS : EXIT.OK
    }
    throw new EpicCommandError(`unknown verb '${verb}':  epic guides list | move | prune | index | check`)
  }

  ////////////////
  // ## The verbs
  ////////////////

  /**
   * Every guide, by page path, and where it is:  `code` (the checkout's guides folder), `epic` (the epic folder's),
   * or `both` (moved, its branch not merged yet).
   */
  list(): GuideListing[] {
    const where = new Map<string, GuideListing["where"]>()
    for (const { folder, code, base } of EpicConfig.guideFoldersOf(this.checkout))
      for (const file of pagesUnder(folder)) {
        const path = relative(base, file).split(sep).join("/")
        const before = where.get(path)
        where.set(path, before && before !== (code ? "code" : "epic") ? "both" : code ? "code" : "epic")
      }
    return [...where].map(([path, at]) => ({ path, where: at })).sort((a, b) => a.path.localeCompare(b.path))
  }

  /**
   * Copy guides `pages` (page paths, `guides/x.html`, `x.html`, or `SAGA:/<id>`) from the epic folder into the
   * checkout's guides folder, each with what goes with it (`Guides`' header);  returns what was copied.
   * - `dryRun`:  copies nothing, says what it would
   * - throws for a repo with no guides folder, a page that isn't an epic folder guide, or a saga with none
   */
  move(pages: readonly string[], { dryRun = false }: { dryRun?: boolean } = {}): MoveReport {
    const folder = this.codeFolder()
    const content = EpicConfig.contentOf(this.checkout)
    const shared = join(content, GUIDES)
    const copied: string[] = []
    for (const page of this.pagesFor(pages, shared)) {
      for (const file of filesWith(page, shared)) {
        const to = join(folder, relative(shared, file))
        copied.push(relative(this.checkout, to).split(sep).join("/"))
        if (dryRun) continue
        mkdirSync(dirname(to), { recursive: true })
        if (statSync(file).isDirectory()) cpSync(file, to, { recursive: true, filter: (each) => !isComments(each) })
        else copyFileSync(file, to)
      }
    }
    const kept = relative(this.checkout, folder).split(sep).join("/") === GUIDES
    const lines = [
      `${dryRun ? "would copy" : "copied"} ${copied.length} file(s) into ${relative(this.checkout, folder) || "."}:`,
      ...copied.map((path) => `  ${path}`),
      "the epic folder keeps its copies until this branch merges into main (epic merge prunes them)",
      ...(kept ? [] : [`NOTE:  guidesFolder isn't "${GUIDES}":  these guides' addresses change to their new paths`])
    ]
    return { copied, lines }
  }

  /**
   * In checkout `root`'s MAIN checkout:  delete the epic folder's copy of every file the base branch's guides folder
   * tracks (`git ls-files`), and any folder that leaves empty;  returns their paths, from the epic folder.
   * - so a guide moved into the code has ONE copy once its branch is on `main`
   * - the comments stay (`<page>.inbox.json5`, `pictures/`):  the code holds none
   * - none in a repo with no guides folder;  `dryRun`:  deletes nothing
   * - NEVER throws:  a git or file failure prunes what it could
   */
  static prune(root: string, { dryRun = false }: { dryRun?: boolean } = {}): string[] {
    const pruned: string[] = []
    try {
      const main = EpicConfig.mainOf(root)
      const written = EpicConfig.of(main).guidesFolder
      if (!written) return []
      const content = EpicConfig.contentOf(main)
      const tracked = (Git.out(["ls-files", "-z", "--", written], main) ?? "").split("\0").filter(Boolean)
      const folder = resolve(main, written)
      const emptied = new Set<string>()
      for (const path of tracked) {
        const inside = pathInside(folder, resolve(main, path))
        if (!inside) continue
        const twin = join(content, GUIDES, inside)
        if (!existsSync(twin) || !statSync(twin).isFile()) continue
        pruned.push(relative(content, twin).split(sep).join("/"))
        if (dryRun) continue
        rmSync(twin)
        emptied.add(dirname(twin))
      }
      for (const dir of [...emptied].sort((a, b) => b.length - a.length)) removeIfEmpty(dir, join(content, GUIDES))
    } catch (error) {
      console.error(`guides prune:  ${(error as Error).message}`)
    }
    return pruned
  }

  ////////////////
  // ## Helpers
  ////////////////

  /** The checkout's guides folder, absolute;  throws when its repo names none. */
  private codeFolder(): string {
    const written = EpicConfig.of(this.checkout).guidesFolder
    if (!written)
      throw new EpicCommandError(
        'guides move:  this repo has no guides folder of its own:  name one in .epic/config.json5, "guidesFolder": "guides"'
      )
    return resolve(this.checkout, written)
  }

  /** The epic folder guides `pages` name, absolute, once each;  throws for one that isn't there. */
  private pagesFor(pages: readonly string[], shared: string): string[] {
    const found = new Set<string>()
    for (const page of pages) {
      const saga = SAGA_ADDRESS.exec(page)?.[1]
      if (saga) {
        const named = new Sagas(this.checkout).guides().filter((guide) => guide.saga === saga)
        const there = named.map((guide) => join(shared, guide.path.replace(/^guides\//, ""))).filter(existsSync)
        if (!there.length) throw new EpicCommandError(`guides move:  no guide in the epic folder names saga ${saga}`)
        for (const file of there) found.add(file)
        continue
      }
      const inside = page.replace(/^\/+/, "").replace(/^guides\//, "")
      const file = join(shared, inside)
      if (!file.endsWith(".html") || !existsSync(file))
        throw new EpicCommandError(
          `guides move:  no guide ${page} in the epic folder (${relative(this.checkout, file)})`
        )
      found.add(file)
    }
    return [...found]
  }
}

/**
 * Whether a command line's first words are a command, in checkout `root`:  every folder's `spell` commands and the
 * `epic` verbs, as the commands page reads them (`commandSources()`).
 * - `spell server start`:  `spell server` is, and so is its `start`;  `spell server bogus` isn't, since the group
 *   lists its verbs;  `epic guides move`:  only `epic guides`, whose verbs aren't listed there
 */
export function commandsIn(root: string): (words: string[]) => boolean {
  let names: Set<string> | undefined
  return (words) => {
    names ??= new Set(commandSources(root).map((command) => command.name))
    const [receiver, first, second] = words
    const group = `${receiver} ${first}`
    if (!names.has(group)) return false
    if (!second) return true
    const verbs = [...names].filter((name) => name.startsWith(`${group} `))
    return !verbs.length || names.has(`${group} ${second}`)
  }
}

/** A guide, by page path, and where its copies are (`Guides.list()`). */
export type GuideListing = { path: string; where: "code" | "epic" | "both" }

/** What `Guides.move()` copied, from the checkout's root, and what to say. */
export type MoveReport = { copied: string[]; lines: string[] }

/** The guides' folder, in the epic folder;  the name a repo's own guides folder takes to keep their addresses. */
const GUIDES = "guides"

/** A saga's short address:  `SAGA:/drawable-spell`. */
const SAGA_ADDRESS = /^SAGA:\/([a-z0-9-]+)\/?$/i

/** Folders that hold no guides (`Sagas`' own list):  never walked by `list()`. */
const NO_PAGES = new Set(["node_modules", "experiments", "examples", "details", "parts", "requests", "pictures"])

/** A relative `src` or `href`, or one under `/guides/`, in a page:  `$1` the path. */
const LINKED = /\s(?:src|href)="(?!#|[a-z][\w+.-]*:|\/\/)([^"#?]+)/gi

/** Every guide page under `folder`, absolute, but the list page. */
function pagesUnder(folder: string): string[] {
  const found: string[] = []
  const walk = (dir: string) => {
    if (!existsSync(dir)) return
    for (const entry of readdirSync(dir, { withFileTypes: true })) {
      if (entry.name.startsWith(".")) continue
      const path = join(dir, entry.name)
      if (entry.isDirectory()) {
        if (!NO_PAGES.has(entry.name)) walk(path)
      } else if (entry.name.endsWith(".html") && path !== join(folder, "index.html")) found.push(path)
    }
  }
  walk(folder)
  return found
}

/**
 * Guide `page` and what goes with it, absolute, all inside `shared` (the epic folder's guides):
 * - the page;  its twins (`<name>.md`, `<name>.json5`, `<name>.json`)
 * - each file it links or shows from the guides folder (a picture, a data file), but other pages
 * - its folder's `experiments/`, when it's that folder's own page (`<topic>/<topic>.html`)
 * - never its comments (`isComments()`)
 */
function filesWith(page: string, shared: string): string[] {
  const dir = dirname(page)
  const name = basename(page, ".html")
  const files = new Set<string>([page])
  for (const ext of [".md", ".json5", ".json"]) {
    const twin = join(dir, `${name}${ext}`)
    if (existsSync(twin)) files.add(twin)
  }
  for (const [, href] of readFileSync(page, "utf8").matchAll(LINKED)) {
    let path: string
    try {
      path = decodeURI(href!)
    } catch {
      continue
    }
    const file = path.startsWith("/") ? join(shared, "..", path) : resolve(dir, path)
    if (pathInside(shared, file) === undefined || extname(file) === ".html") continue
    if (!existsSync(file) || !statSync(file).isFile() || isComments(file)) continue
    files.add(file)
  }
  const experiments = join(dir, "experiments")
  if (basename(dir) === name && existsSync(experiments)) files.add(experiments)
  return [...files]
}

/** Whether `file` is a page's comments, which stay in the epic folder:  `<page>.inbox.json5`, `pictures/`. */
function isComments(file: string): boolean {
  return file.endsWith(".inbox.json5") || file.split(sep).includes("pictures")
}

/** Remove `dir` and each parent left empty, up to (not including) `stop`. */
function removeIfEmpty(dir: string, stop: string): void {
  let at = dir
  while (at !== stop && pathInside(stop, at) && existsSync(at) && !readdirSync(at).length) {
    rmSync(at, { recursive: true })
    at = dirname(at)
  }
}
