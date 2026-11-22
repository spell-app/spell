import type { Diagnostic } from "vscode-languageserver"

import type { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
import { LSP } from "spell/app/lsp"

/****************
 * ### `LanguageHost`
 * The language service with projects of its own, kept in step with an editor by messages:
 * what the app's language worker runs (epic `solid-2-final` P18).
 * - The editor opens each spell file it shows (`open()`), with its text;  the host loads the file's project itself,
 *   as the page does (`SpellProject.load()`), and takes the editor's text where it differs.
 * - Then each edit comes as a list of changes to the text before it (`change()`), never the whole text:
 *   the host makes the new text, and where it changed (`P.EditedSpan`) for its incremental parse.
 * - It parses once the edits pause (`PARSE_WAIT`), or at once when a request comes:
 *   so an answer is always about the text the editor had when it asked.
 * - Requests are the ONE table's (`LSP.LANGUAGE_REQUESTS`), the same VS Code's language server answers.
 * - After each parse, each open file it changed gets its problems sent (`onParsed`), as a language server publishes
 *   diagnostics, numbered by the edits they're of (`version`) so the editor drops a late one.
 * - It compiles a project when asked (`compile()`), handing back what the compile wrote, for the editor to run.
 * - Its position in the import graph:  the parser and the language service;
 *   no DOM and no editor, so it runs in a worker, or in the page's own thread for a test.
 ****************/
export class LanguageHost {
  constructor({
    service = new LSP.SpellLanguageService(new LSP.AppAddresses()),
    onParsed = () => {},
    onUnavailable = () => {}
  }: LanguageHostProps = {}) {
    this.service = service
    this.onParsed = onParsed
    this.onUnavailable = onUnavailable
  }

  /** Called with each project that won't load, e.g. one only the editor holds, not saved yet. */
  readonly onUnavailable: (projectId: string) => void

  /** the language service answering every request */
  readonly service: LSP.SpellLanguageService

  /** Called with an open file's problems each time a parse changes them:  see `LanguageParsed`. */
  readonly onParsed: (parsed: LanguageParsed) => void

  /**
   * The editor shows `uri`'s file, of project `projectId`, holding `text`.
   * - Loads its project the first time;  the file then takes `text` if it isn't what was loaded.
   * - NEVER throws:  a project that won't load answers nothing (the fallbacks), and says so (`onUnavailable`).
   */
  open({ uri, projectId, text, pagesInPlay }: LanguageOpen): void {
    const opening = this.projectFor(projectId).then((project) => {
      project.pagesInPlay = pagesInPlay ? new Set(pagesInPlay) : undefined
      const file = this.fileFor(uri)
      if (!file || file.project !== project) return
      if (file.contents !== text) project.takeText(file, text)
      this.texts.set(uri, text)
      this.versions.set(uri, 0)
      this.sentParse.delete(uri)
      this.parseSoon(project)
    })
    // a project that won't load holds nothing else up
    this.pending = Promise.all([this.pending, opening.catch(() => undefined)]).then(() => undefined)
  }

  /**
   * `uri`'s text changed by `changes`, each `[from, to, inserted]` in the text before them, in order of `from`.
   * - Ignored for a file not opened.
   */
  change({ uri, changes }: LanguageChange): void {
    const changed = this.pending.then(() => {
      const file = this.fileFor(uri)
      const before = this.texts.get(uri)
      if (!file || before === undefined) return
      const { text, span } = applied(before, changes)
      this.texts.set(uri, text)
      this.versions.set(uri, (this.versions.get(uri) ?? 0) + 1)
      file.project.takeText(file, text, span)
      this.parseSoon(file.project)
    })
    this.pending = changed
  }

  /** The editor let go of project `projectId`'s files:  forget them.  The project stays loaded, as on the page. */
  close({ projectId }: { projectId: string }): void {
    this.pending = this.pending.then(() => {
      for (const [uri] of this.texts) if (this.fileFor(uri)?.project.projectId === projectId) this.texts.delete(uri)
    })
  }

  /**
   * Answer request `method` about the file `params` names, once every message before it is in and parsed.
   * - throws what the service throws (`LSP.RenameError` ...)
   */
  async request<M extends LSP.LanguageMethod>(
    method: M,
    params: LSP.LanguageParams<M>
  ): Promise<LSP.LanguageAnswer<M>> {
    await this.pending
    const file = this.fileFor(LSP.uriOf(params as LSP.FileParams))
    if (file) await this.parseNow(file.project)
    return LSP.answerRequest(this.service, file, method, params)
  }

  /**
   * Compile project `projectId` as it is now, every message before this in, and answer what the compile wrote:
   * for the editor to take as its own (`SP.SpellProject.takeCompiled()`), the program run on the page as ever.
   * - Nothing saved:  the editor saves what it takes, as it would its own compile's.
   * - `pagesInPlay`:  the alone pages the editor's compile is limited to, by path (`SP.SpellProject.pagesInPlay`)
   * - throws what the compile throws
   */
  async compile({ projectId, pagesInPlay }: LanguageCompile): Promise<SP.CompiledEntry> {
    await this.pending
    const project = await this.projectFor(projectId)
    project.pagesInPlay = pagesInPlay ? new Set(pagesInPlay) : undefined
    await project.compile(undefined, { save: false, cached: false })
    return project.cachedEntry()
  }

  ////////////////
  // ## Projects
  ////////////////

  /**
   * Project `projectId`, loaded:  once each.
   * - Parsed later (`parseNow()`), once a message has said which of its pages are in play, as the editor's are
   *   (`SP.SpellProject.pagesInPlay`):  a guide's 50,000 lines parsed whole took 18 seconds.
   */
  private projectFor(projectId: string): Promise<SP.SpellProject> {
    let loading = this.projects.get(projectId)
    if (!loading) {
      const project = new SP.SpellProject(projectId)
      loading = project.load(undefined).then(() => project)
      loading.catch(() => this.onUnavailable(projectId))
      this.projects.set(projectId, loading)
    }
    return loading
  }

  /** Each project opened, loading or loaded. */
  private projects = new Map<string, Promise<SP.SpellProject>>()

  /** The spell file at `uri`, if it's loaded. */
  private fileFor(uri: string): SP.SpellFile | undefined {
    return this.service.addresses.fileFor(uri)
  }

  /** Each open file's text, as the editor has it. */
  private texts = new Map<string, string>()

  /** Every message so far, in order:  a request waits for them. */
  private pending: Promise<void> = Promise.resolve()

  ////////////////
  // ## Parsing
  ////////////////

  /** Parse `project`'s waiting text once the edits pause for `PARSE_WAIT` msec. */
  private parseSoon(project: SP.SpellProject): void {
    clearTimeout(this.parseTimers.get(project))
    this.parseTimers.set(
      project,
      setTimeout(() => void this.parseNow(project), LanguageHost.PARSE_WAIT)
    )
  }

  /**
   * Parse `project`'s waiting text now:  the whole project, the first time.
   * - NEVER throws:  a parse error shows on its line, as ever.
   */
  private async parseNow(project: SP.SpellProject): Promise<void> {
    clearTimeout(this.parseTimers.get(project))
    this.parseTimers.delete(project)
    const parsing = project.needsFullParse ? project.parse() : project.parseWaitingText()
    await parsing.catch((error: unknown) => console.error("LanguageHost:  couldn't parse", error))
    this.sendProblems(project)
  }

  ////////////////
  // ## Problems
  ////////////////

  /**
   * Send the problems of each open file of `project` whose parse changed since they were last sent (`onParsed`).
   * - A `<css>` block before the CSS service is in:  sent again once it lands, with its mistakes
   *   (`LSP.SpellCSS.load()`).
   * - NEVER throws:  a file whose problems can't be worked out is said on the console, and skipped.
   */
  private sendProblems(project: SP.SpellProject): void {
    for (const [uri] of this.texts) {
      const file = this.fileFor(uri)
      if (!file?.match || file.project !== project || this.sentParse.get(uri) === file.match) continue
      try {
        this.sentParse.set(uri, file.match)
        const diagnostics = this.service.diagnostics(file)
        const fixItStarts = SP.OldForms.uses(file).map((use) => use.start)
        this.onParsed({ uri, version: this.versions.get(uri) ?? 0, diagnostics, fixItStarts })
        if (!LSP.SpellCSS.isLoaded && this.service.css.regionsIn(file.contents ?? "").length) {
          LSP.SpellCSS.load().then(
            () => {
              this.sentParse.delete(uri)
              this.sendProblems(project)
            },
            () => undefined // logged by `SpellCSS`
          )
        }
      } catch (error) {
        console.error(`LanguageHost:  couldn't work out the problems of ${uri}`, error)
      }
    }
  }

  /** Each open file's edits so far, since it was opened:  what its problems are numbered by. */
  private versions = new Map<string, number>()

  /** The parse each open file's problems were last sent for. */
  private sentParse = new Map<string, object>()

  /** Each project's wait before it parses. */
  private parseTimers = new Map<SP.SpellProject, ReturnType<typeof setTimeout>>()

  /** How long the edits pause before the host parses by itself, msec:  a request parses at once. */
  static PARSE_WAIT = 100
}

/** How a `LanguageHost` is made. */
export type LanguageHostProps = {
  /** the language service:  default, one addressing the app's files (`LSP.AppAddresses`) */
  service?: LSP.SpellLanguageService
  /** called with an open file's problems each time a parse changes them.  Default:  nothing */
  onParsed?: (parsed: LanguageParsed) => void
  /** called with each project that won't load.  Default:  nothing */
  onUnavailable?: (projectId: string) => void
}

/** An open file's problems, after a parse changed them:  `LanguageHost.onParsed`. */
export type LanguageParsed = {
  /** the file's address */
  uri: string
  /** how many edits it has taken since it was opened:  the problems are of the text they made */
  version: number
  /** its problems, as `textDocument/publishDiagnostics` sends them */
  diagnostics: Diagnostic[]
  /** where each of its problems with a one-click fix starts, as offsets:  Spell's old forms (`SP.OldForms.uses()`) */
  fixItStarts: number[]
}

/** The editor shows a file:  `LanguageHost.open()`. */
export type LanguageOpen = {
  /** the file's address, `spell:/<path>` (`LSP.AppAddresses`) */
  uri: string
  /** its project's id, `@spell/examples/Solitaire` */
  projectId: string
  /** its text in the editor */
  text: string
  /** the alone pages its project is limited to in the editor, by path (`SP.SpellProject.pagesInPlay`);  none:  every file */
  pagesInPlay?: string[]
}

/** A project to compile:  `LanguageHost.compile()`. */
export type LanguageCompile = {
  /** its id, `@spell/examples/Solitaire` */
  projectId: string
  /** the alone pages the compile is limited to, by path;  none:  every file */
  pagesInPlay?: string[]
}

/** A file's text changed:  `LanguageHost.change()`. */
export type LanguageChange = {
  /** the file's address */
  uri: string
  /** each change `[from, to, inserted]`, in the text before them, in order of `from` */
  changes: LanguageTextChange[]
}

/** A change to a text:  from `from` to `to` of the text before it, `inserted` put there. */
export type LanguageTextChange = [from: number, to: number, inserted: string]

/** `text` changed by `changes`, and the one span they cover (`P.EditedSpan`). */
function applied(text: string, changes: LanguageTextChange[]): { text: string; span?: P.EditedSpan } {
  if (!changes.length) return { text }
  let result = ""
  let at = 0
  let grown = 0
  for (const [from, to, inserted] of changes) {
    result += text.slice(at, from) + inserted
    at = to
    grown += inserted.length - (to - from)
  }
  result += text.slice(at)
  const from = changes[0]![0]
  const to = changes.at(-1)![1]
  const span: P.EditedSpan = { from, to, toNew: to + grown }
  return { text: result, span }
}
