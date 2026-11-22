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
 * - Its position in the import graph:  the parser and the language service;
 *   no DOM and no editor, so it runs in a worker, or in the page's own thread for a test.
 ****************/
export class LanguageHost {
  constructor({
    service = new LSP.SpellLanguageService(new LSP.AppAddresses())
  }: { service?: LSP.SpellLanguageService } = {}) {
    this.service = service
  }

  /** the language service answering every request */
  readonly service: LSP.SpellLanguageService

  /**
   * The editor shows `uri`'s file, of project `projectId`, holding `text`.
   * - Loads its project the first time;  the file then takes `text` if it isn't what was loaded.
   * - NEVER throws:  a project that won't load answers nothing (the fallbacks), and says so on the console.
   */
  open({ uri, projectId, text }: LanguageOpen): void {
    const opening = this.projectFor(projectId).then((project) => {
      const file = this.fileFor(uri)
      if (!file || file.project !== project) return
      if (file.contents !== text) project.takeText(file, text)
      this.texts.set(uri, text)
      this.parseSoon(project)
    })
    this.pending = Promise.all([this.pending, opening]).then(() => undefined)
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

  ////////////////
  // ## Projects
  ////////////////

  /** Project `projectId`, loaded and parsed:  once each. */
  private projectFor(projectId: string): Promise<SP.SpellProject> {
    let loading = this.projects.get(projectId)
    if (!loading) {
      const project = new SP.SpellProject(projectId)
      loading = project
        .load(undefined)
        .then(() => project.parse())
        .then(() => project)
      loading.catch((error: unknown) => console.error(`LanguageHost:  couldn't load ${projectId}`, error))
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

  /** Parse `project`'s waiting text now.  NEVER throws:  a parse error shows on its line, as ever. */
  private async parseNow(project: SP.SpellProject): Promise<void> {
    clearTimeout(this.parseTimers.get(project))
    this.parseTimers.delete(project)
    await project.parseWaitingText().catch((error: unknown) => console.error("LanguageHost:  couldn't parse", error))
  }

  /** Each project's wait before it parses. */
  private parseTimers = new Map<SP.SpellProject, ReturnType<typeof setTimeout>>()

  /** How long the edits pause before the host parses by itself, msec:  a request parses at once. */
  static PARSE_WAIT = 100
}

/** The editor shows a file:  `LanguageHost.open()`. */
export type LanguageOpen = {
  /** the file's address, `spell:/<path>` (`LSP.AppAddresses`) */
  uri: string
  /** its project's id, `@spell/examples/Solitaire` */
  projectId: string
  /** its text in the editor */
  text: string
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
