import { mkdirSync, writeFileSync } from "fs"
import { basename, dirname, relative } from "path"
import { createInterface } from "readline"

import { SP } from "spell/parser/spell"
import { LSP } from "spell/app/lsp"
import { buildStepLine, type BuildStepName } from "spell/app/spaces/models/buildSteps"
import { compilerVersion } from "spell/app/spaces/server/node/projects/compilerCode"
import {
  hashOfFile,
  SITE_PAGES_PREFIX,
  SitePages,
  sourceHashOf,
  type FramePrint,
  type PagePrint,
  type SitePagesRequest,
  type SitePagesResult
} from "spell/app/spaces/server/node/projects/SitePages"
import { CLI } from "spell/app/cli"

/****************
 * ### `SitePagesCompiler`
 * `spell compile --pages`:  compiles sites page by page, as the page server asks, in one process it keeps running
 * (spaces' `SitePagesBuild`;  epic `editor` P46).
 * - Each request is a line of JSON on standard input, `{ "projectId": "@spell/guides/SpellUI", "page": "ButtonUsage" }`;
 *   each answer a line on standard output, `spell-pages: {"projectId": ..., "page": ..., "result": "built"}`.
 *   - no `page`:  the site's FRAME alone, its pages alone in their files left out (`SitePages`, spaces')
 *   - a `page`:  the frame if it's out of date, then that page's chunk, `<Class>.page.js`
 * - Its answers (`SitePagesResult`, spaces'):
 *   - `built`, or `mistakes`:  written, with errors listed on standard error
 *   - `whole`:  the project has no page alone in its file:  it compiles whole, as `spell compile` does
 *   - `no page`:  the site has no page of that class alone in its file
 *   - `restart`:  a file the site was read from changed since;  it says so, then ends, so the page server starts it
 *     again with nothing left over (projects are kept once each, `SP.SpellProject.registry`)
 * - Why one process kept running:  starting `spell` takes about 3 seconds;  kept, the Spell UI site's frame compiles
 *   in about 1.4, and each page on it in under a tenth of a second.
 * - Each site is kept parsed:  a page is added to what it compiles (`SP.SpellProject.pagesInPlay`), so only its
 *   own file parses.
 * - Compiled as `spell compile` does, for a built site (`compiledFor: "built"`):  its imports first when they've never
 *   been compiled;  its scope pack written only when it's clean, and only once the answer's sent.
 * - Ends by itself after `IDLE_MS` with no request.
 ****************/
export class SitePagesCompiler {
  /** this run's session:  loads projects, says their problems */
  readonly session: CLI.CliSession

  /** each site asked for, kept parsed, by project id */
  private sites = new Map<string, KeptSite>()

  /** ends the process after `IDLE_MS` with nothing asked */
  private idle?: ReturnType<typeof setTimeout>

  /** what's left to write once the answer is sent:  a frame's scope pack */
  private afterAnswer: Array<() => Promise<void>> = []

  /** writes `afterAnswer` once nothing's asked for `WRITE_LATER_MS` */
  private later?: ReturnType<typeof setTimeout>

  /** everything this does, in turn:  see `serve()` */
  private turn: Promise<void> = Promise.resolve()

  constructor(session: CLI.CliSession) {
    this.session = session
  }

  /**
   * Answer each request on standard input, one at a time, until it closes or nothing is asked for `IDLE_MS`.
   * - Everything it does takes its turn (`turn`):  a request, and what's written later (`afterAnswer`), never at once.
   */
  serve(): Promise<number> {
    this.waitIdle()
    const lines = createInterface({ input: process.stdin })
    return new Promise((done) => {
      lines.on("line", (line) => {
        clearTimeout(this.idle)
        // its turn's failures are said by `inTurn()` itself
        void this.inTurn(() => this.take(line))
      })
      lines.on("close", () => void this.inTurn(() => this.writeLater()).then(() => done(CLI.EXIT.OK)))
    })
  }

  /** Answer request `line`;  a `restart` ends the process, once its answer is out. */
  private async take(line: string): Promise<void> {
    if (!line.trim()) return
    let request: SitePagesRequest
    try {
      request = JSON.parse(line) as SitePagesRequest
    } catch {
      process.stderr.write(`spell compile --pages:  not a request:  ${line}\n`)
      return
    }
    // the frame asked again, e.g. for its scope pack:  what's left of it written first
    if (!request.page) await this.writeLater()
    const result = await this.answer(request).catch((error: unknown) => {
      this.failed(request, error)
      return "failed" as const
    })
    const answer = `${SITE_PAGES_PREFIX}${JSON.stringify({ ...request, result })}\n`
    if (result === "restart") {
      process.stdout.write(answer, () => process.exit(CLI.EXIT.OK))
      return
    }
    process.stdout.write(answer)
    // once nothing's asked for a moment:  a page asked right after waits for none of it
    if (this.afterAnswer.length) {
      clearTimeout(this.later)
      this.later = setTimeout(() => void this.inTurn(() => this.writeLater()), WRITE_LATER_MS)
    }
    this.waitIdle()
  }

  /** Run `work` once everything before it is done. */
  private inTurn(work: () => Promise<void>): Promise<void> {
    this.turn = this.turn.then(work).catch((error: unknown) => this.failed({ projectId: "?" }, error))
    return this.turn
  }

  /** SIDE EFFECT:  writes what's left to write since an answer (`afterAnswer`). */
  private async writeLater(): Promise<void> {
    clearTimeout(this.later)
    for (const write of this.afterAnswer.splice(0)) await write()
  }

  /**
   * Build what `request` asks for:  the frame, and its page if it names one.  See the class.
   * - throws what the compile throws
   */
  async answer({ projectId, page }: SitePagesRequest): Promise<SitePagesResult> {
    const known = this.sites.get(projectId)
    if (known && changedSince(known)) return "restart"
    const site = known ?? (await this.keep(projectId))
    if (!site) return "whole"
    const pages = new SitePages(projectId)
    let mistakes = false
    if (pages.frameStaleBecause()) mistakes = await this.writeFrame(site, pages)
    if (!page) return mistakes ? "mistakes" : "built"
    const file = site.project.fileForPage(page)
    if (!file) return "no page"
    if (!pages.pageStaleBecause(page)) return "built"
    return (await this.writePage(site, pages, page, file)) || mistakes ? "mistakes" : "built"
  }

  /**
   * Site `projectId`, loaded and kept, with what it was read from;
   * `undefined` when it has no page alone in its file, so isn't kept.
   */
  private async keep(projectId: string): Promise<KeptSite | undefined> {
    const project = new SP.SpellProject(projectId)
    await this.session.compileImports(project)
    await project.load(undefined)
    await Promise.all(project.spellFiles.map((file) => file.load(undefined)))
    if (!project.hasAlonePages) return undefined
    const alone = new Map<string, string>()
    for (const file of project.spellFiles) {
      const head = project.headFor(file)
      if (head instanceof SP.AlonePage) alone.set(file.location.serverPath, head.className)
    }
    const folder = project.location.serverPath
    const print: FramePrint = { compiler: compilerVersion(), imports: {}, sources: {}, pages: {} }
    const readFrom: Record<string, string> = {}
    for (const source of await CLI.sourcesOf(project)) {
      const path = relative(folder, source)
      const className = alone.get(source)
      print.sources[path] = sourceHashOf(source, className ? "alone" : "whole")
      if (className) print.pages[className] = path
      readFrom[source] = hashOfFile(source)
    }
    for (const imported of LSP.ScopeExplorer.importedProjects(project)) {
      const declarations = imported.declarationsFile.location.serverPath
      print.imports[declarations] = readFrom[declarations] = hashOfFile(declarations)
    }
    const site: KeptSite = { project, print, readFrom }
    this.sites.set(projectId, site)
    return site
  }

  /**
   * SIDE EFFECT:  writes `site`'s frame into `pages`' folder:  its program, marked with every page alone in its file,
   * its map, declarations, words, and its scope pack when it's clean;  then its fingerprint, which makes every page
   * compiled before it out of date.
   * - Returns whether it has mistakes.
   */
  private async writeFrame(site: KeptSite, pages: SitePages): Promise<boolean> {
    const { project } = site
    sayStep("compiling", project)
    project.pagesInPlay = new Set()
    await project.compile(undefined, { save: false, compiledFor: "built" })
    sayStep("checking", project)
    const target = project.targets[0]!
    const write = (file: SP.SpellJSFile, text: string) =>
      writeInto(pages.fileFor(basename(file.location.serverPath)), text)
    write(
      project.outputFile,
      SP.PageChunks.withLazyPages(String(project.outputFile.contents ?? ""), Object.keys(site.print.pages))
    )
    const map = project.sourceMapFileFor(target).contents
    if (map) write(project.sourceMapFileFor(target), String(map))
    write(project.declarationsFile, String(project.declarationsFile.contents ?? ""))
    for (const words of project.wordsFiles) if (words.contents) write(words, String(words.contents))
    const problems = this.session.problems(project)
    // the Type Explorer's alone reads it:  written once the page has its answer, about 0.6 s on the Spell UI site
    if (!problems.length) {
      this.afterAnswer.push(async () => {
        await this.session.workspace.track(project)
        write(project.scopesFile, LSP.scopePackScript(this.session.explorer.exportPack(project)))
      })
    }
    writeInto(pages.framePrintFile, `${JSON.stringify(site.print, undefined, 2)}\n`)
    writeInto(pages.pagePrintsFile, "{}\n")
    this.report(project, problems, "frame")
    return problems.length > 0
  }

  /**
   * SIDE EFFECT:  writes page `className`'s chunk, compiled against `site`'s frame, and its fingerprint.
   * - Returns whether it has mistakes.
   */
  private async writePage(site: KeptSite, pages: SitePages, className: string, file: SP.SpellFile): Promise<boolean> {
    const { project } = site
    sayStep("compiling", project)
    // this page alone in play:  what's written is the frame and it, the rest left parsed for another time
    project.pagesInPlay = new Set([file.path])
    await project.compile(undefined, { save: false, compiledFor: "built" })
    const chunk = SP.PageChunks.chunkOfPage(String(project.outputFile.contents ?? ""), className)
    if (chunk === undefined) throw new Error(`${project.projectId}:  ${className} didn't compile to a page`)
    writeInto(pages.chunkFor(className), chunk)
    const prints: Record<string, PagePrint> = pages.readPagePrints()
    prints[className] = { frame: hashOfFile(pages.framePrintFile), source: site.readFrom[file.location.serverPath]! }
    writeInto(pages.pagePrintsFile, `${JSON.stringify(prints, undefined, 2)}\n`)
    const problems = this.session.problems(project, file)
    this.report(project, problems, className)
    return problems.length > 0
  }

  /** Say what was written on standard error, with `problems` under it:  the page server logs it. */
  private report(project: SP.SpellProject, problems: CLI.Problem[], what: string): void {
    const mark = problems.length ? "✗" : "✓"
    const count = problems.length ? ` · ${problems.length} error${problems.length === 1 ? "" : "s"}` : ""
    process.stderr.write(`${mark} ${project.projectId}  ${what}${count}\n`)
    for (const { path, line, message } of problems) {
      process.stderr.write(
        `  ${path ?? project.projectId}${line === undefined ? "" : `:${line}`}  error:  ${message}\n`
      )
    }
  }

  /** Say `request` failed, with why, on standard error:  the page server logs it. */
  private failed(request: SitePagesRequest, error: unknown): void {
    process.stderr.write(`${request.projectId}:  ${error instanceof Error ? error.stack : String(error)}\n`)
  }

  /** End the process after `IDLE_MS` with nothing asked. */
  private waitIdle(): void {
    clearTimeout(this.idle)
    this.idle = setTimeout(() => process.exit(CLI.EXIT.OK), IDLE_MS)
    this.idle.unref?.()
  }
}

/** ms with nothing asked before a frame's scope pack is written. */
const WRITE_LATER_MS = 1000

/** ms with no request before `spell compile --pages` ends by itself:  10 minutes. */
export const IDLE_MS = 10 * 60_000

////////////////
// ## Helpers
////////////////

/** A site kept parsed by `SitePagesCompiler`. */
type KeptSite = {
  /** the site, parsed as its last compile left it */
  project: SP.SpellProject
  /** what its frame is compiled from, as its fingerprint keeps it */
  print: FramePrint
  /** each file it was read from, its imports' declarations too, by path on disk:  its whole text's hash */
  readFrom: Record<string, string>
}

/** Has anything `site` was read from changed since, the compiler too? */
function changedSince(site: KeptSite): boolean {
  if (site.print.compiler !== compilerVersion()) return true
  return Object.entries(site.readFrom).some(([path, hash]) => hashOfFile(path) !== hash)
}

/** SIDE EFFECT:  writes `text` into file `path`, making its folder. */
function writeInto(path: string, text: string): void {
  mkdirSync(dirname(path), { recursive: true })
  writeFileSync(path, text)
}

/** SIDE EFFECT:  prints `step` of `project` on standard error, for the page server's waiting box. */
function sayStep(step: BuildStepName, project: SP.SpellProject): void {
  process.stderr.write(`${buildStepLine({ projectId: project.projectId, step })}\n`)
}
