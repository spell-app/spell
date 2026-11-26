import type { ChangeSet } from "@codemirror/state"

import { SP } from "spell/parser/spell"
import { LSP } from "spell/app/lsp"
// Import directly:  spaces' project groups alone, not its barrel, which the element build keeps out of this file's chunk
import { localPerson, orgGroups } from "spell/app/spaces/models/projectGroups"

/****************
 * ### `LanguageClient`
 * How the app's code editors ask the language service about a file:  by the ONE table's requests
 * (`LSP.LANGUAGE_REQUESTS`), each answered as a promise (epic `solid-2-final` P18).
 * - Two kinds, the same questions:
 *   - `LanguageClient.inThread()`:  answered by the page's own service, from the page's own parse
 *     (`<spell-editor>`, the static build, tests)
 *   - `LanguageClient.inWorker()`:  answered by the editor's language worker (`languageWorker.ts`, a `LSP.LanguageHost`,
 *     started by the app, `startLanguageWorker()`),
 *     its parse its own, so a hover or a suggestion list never takes the page's time
 * - The worker's parse follows the page's files:  each spell file's state says it's open (`opened()`),
 *   and each edit as a list of changes (`changed()`), never the whole text.
 * - After each parse it sends what the editor draws each open file with, in the editors' look (`look()`):
 *   its problems, the blocks that fold, the bubbly drawing or the colours (`onParsed()`).
 * - A request goes after every edit before it, so its answer is about the text the editor had when it asked.
 * - Its position in the import graph:  the language service's table and types;  NEVER the worker's own file,
 *   handed in, so `<spell-editor>`'s build has none.
 ****************/
export abstract class LanguageClient {
  /** The page's own service, from the page's own parse:  where no worker can run. */
  static inThread(service: LSP.SpellLanguageService): LanguageClient {
    return new InThreadClient(service)
  }

  /**
   * The editor's language worker, made now.
   * - A worker that stops (it won't load, it throws as it starts) hands every question to `service`, the page's own,
   *   from then on:  nothing goes unanswered.
   */
  static inWorker(service: LSP.SpellLanguageService, worker: Worker): LanguageClient {
    return new WorkerClient(worker, new InThreadClient(service))
  }

  /**
   * Are questions about `project` answered from the page's own parse?
   * - `true`:  a question waits for the page's parse of the text first (`CodeMirrorLanguage.fileReady()`),
   *   and the page works out its files' problems itself
   * - `false`:  the worker parses;  the page asks straight away
   */
  abstract answersOnPage(project: SP.SpellProject): boolean

  /**
   * Hear each project the worker can't load (one only the page holds, made from a start card and not saved yet):
   * from then on the page answers for it.  Returns what stops it.
   */
  onFallback(_listener: (project: SP.SpellProject) => void): () => void {
    return () => {}
  }

  /**
   * The answer to `method` about the file `params` names.
   * - throws what the service throws (`LSP.RenameError` ...), the worker's too
   */
  abstract request<M extends LSP.LanguageMethod>(
    method: M,
    params: LSP.LanguageParams<M>
  ): Promise<LSP.LanguageAnswer<M>>

  /**
   * What a compile of `project` as the editor has it wrote, compiled off the page's thread:
   * for the page to take as its own (`SP.SpellProject.takeCompiled()`).
   * - `undefined` where the page compiles it itself:  in its own thread, or a project the worker hasn't been sent,
   *   or a compile that failed there (said on the console).
   */
  async compile(_project: SP.SpellProject): Promise<SP.CompiledEntry | undefined> {
    return undefined
  }

  /**
   * Hear each open file's problems, after each parse the worker makes that changes them:  in its own thread, never
   * (the page works them out from its own parse).  Returns what stops it.
   */
  onParsed(_listener: (parsed: LSP.LanguageParsed) => void): () => void {
    return () => {}
  }

  /** `file`'s state was made, holding `text`. */
  opened(_file: SP.SpellFile, _text: string): void {}

  /** `file`'s state was changed by `changes`. */
  changed(_file: SP.SpellFile, _changes: ChangeSet): void {}

  /** Project `project`'s states are gone. */
  closed(_project: SP.SpellProject): void {}

  /** The editors show their code in `look` now:  what each parse sends is drawn in it (`LSP.LanguageParsed`). */
  look(_look: LSP.CodeLook): void {}

  /** The address `file` goes by in a request. */
  static uriOf(file: SP.SpellFile): string {
    return LSP.AppAddresses.uriOf(file.path)
  }
}

/****************
 * ### `InThreadClient`
 * The page's own service answering, from the page's own parse:  `LanguageClient.inThread()`.
 ****************/
class InThreadClient extends LanguageClient {
  constructor(readonly service: LSP.SpellLanguageService) {
    super()
  }

  answersOnPage(_project: SP.SpellProject): boolean {
    return true
  }

  async request<M extends LSP.LanguageMethod>(
    method: M,
    params: LSP.LanguageParams<M>
  ): Promise<LSP.LanguageAnswer<M>> {
    const file = this.service.addresses.fileFor(LSP.uriOf(params as LSP.FileParams))
    return LSP.answerRequest(this.service, file, method, params)
  }
}

/****************
 * ### `WorkerClient`
 * The editor's language worker answering:  `LanguageClient.inWorker()`.
 * - Every message in order, over one worker:  open, change, close, request.
 * - An error the worker's service threw comes back as itself where the page tells them apart (`LSP.RenameError`).
 * - A worker that stops:  its waiting questions, and every one after, go to the page's own service (`fallback`).
 * - A project the worker can't load (only the page holds it):  every question about it goes to the page's own service,
 *   and its problems are the page's (`onFallback()`), for the rest of the page's life.
 ****************/
class WorkerClient extends LanguageClient {
  constructor(
    /** the worker */
    private readonly worker: Worker,
    private readonly fallback: InThreadClient
  ) {
    super()
    this.worker.addEventListener("message", (event: MessageEvent<LanguageWorkerReply>) => this.replied(event.data))
    this.worker.addEventListener("error", (event) => this.stopped(event.message))
    // first, before any project:  the worker's own copy of spaces' models knows only spell's groups
    this.post({ kind: "groups", ...groupsOnPage() })
  }

  answersOnPage(project: SP.SpellProject): boolean {
    return this.hasStopped || this.unavailable.has(project.projectId)
  }

  /** The projects the worker said it can't load. */
  private unavailable = new Set<string>()

  onFallback(listener: (project: SP.SpellProject) => void): () => void {
    this.fallbackListeners.add(listener)
    return () => this.fallbackListeners.delete(listener)
  }

  /** Who hears each project the page answers for from now on -- see `onFallback()`. */
  private fallbackListeners = new Set<(project: SP.SpellProject) => void>()

  /** Has the worker stopped, its questions going to the page's own service? */
  private hasStopped = false

  request<M extends LSP.LanguageMethod>(method: M, params: LSP.LanguageParams<M>): Promise<LSP.LanguageAnswer<M>> {
    const project = this.fallback.service.addresses.fileFor(LSP.uriOf(params as LSP.FileParams))?.project
    if (this.hasStopped || (project && this.answersOnPage(project))) return this.fallback.request(method, params)
    const id = ++this.lastId
    return new Promise((resolve, reject) => {
      const again = () => this.fallback.request(method, params).then(resolve, reject)
      this.waiting.set(id, { resolve: resolve as (answer: unknown) => void, reject, again })
      this.post({ kind: "request", id, method, params })
    })
  }

  /** The worker stopped:  said once on the console, and every question waiting asked of the page instead. */
  private stopped(why: string): void {
    if (this.hasStopped) return
    this.hasStopped = true
    console.error("the language worker stopped:  the page answers from now on --", why)
    const waiting = [...this.waiting.values()]
    this.waiting.clear()
    for (const { again } of waiting) again()
  }

  async compile(project: SP.SpellProject): Promise<SP.CompiledEntry | undefined> {
    if (this.answersOnPage(project)) return undefined
    const id = ++this.lastId
    try {
      // no code editor has its files open (Run, or before CodeMirror loads):  the page's text of each goes with it,
      // so the worker compiles what the page holds, its edits from the side bar too (epic `solid-2-final` P20, I59)
      const texts = this.openProjects.has(project.projectId) ? undefined : await this.textsOf(project)
      return await new Promise<SP.CompiledEntry>((resolve, reject) => {
        const again = () => reject(new Error("the language worker stopped"))
        this.waiting.set(id, { resolve: resolve as (answer: unknown) => void, reject, again })
        const pagesInPlay = project.pagesInPlay && [...project.pagesInPlay]
        this.post({
          kind: "compile",
          id,
          projectId: project.projectId,
          ...(pagesInPlay && { pagesInPlay }),
          ...(texts && { texts })
        })
      })
    } catch (error) {
      console.info(`the language worker couldn't compile ${project.projectId}:  the page compiles it`, error)
      return undefined
    }
  }

  /**
   * Each of `project`'s spell files as the page holds it, by address, loading them first:  for a compile of a project
   * no code editor has open (`compile()`), whose edits came as no changes.
   * - throws what loading a file throws
   */
  private async textsOf(project: SP.SpellProject): Promise<Record<string, string>> {
    await project.load(undefined)
    await Promise.all(project.spellFiles.map((file) => file.load(undefined)))
    const texts: Record<string, string> = {}
    for (const file of project.spellFiles)
      if (file.contents !== undefined) texts[LanguageClient.uriOf(file)] = file.contents
    return texts
  }

  opened(file: SP.SpellFile, text: string): void {
    this.openProjects.add(file.project.projectId)
    const { projectId, pagesInPlay } = file.project
    this.post({
      kind: "open",
      uri: LanguageClient.uriOf(file),
      projectId,
      text,
      ...(pagesInPlay && { pagesInPlay: [...pagesInPlay] })
    })
  }

  /** The projects whose files were opened and not closed:  the worker has every edit of theirs. */
  private openProjects = new Set<string>()

  changed(file: SP.SpellFile, changes: ChangeSet): void {
    const list: LSP.LanguageTextChange[] = []
    changes.iterChanges((fromA, toA, _fromB, _toB, inserted) => list.push([fromA, toA, inserted.toString()]))
    if (list.length) this.post({ kind: "change", uri: LanguageClient.uriOf(file), changes: list })
  }

  closed(project: SP.SpellProject): void {
    this.openProjects.delete(project.projectId)
    this.post({ kind: "close", projectId: project.projectId })
  }

  look(look: LSP.CodeLook): void {
    this.post({ kind: "look", look })
  }

  onParsed(listener: (parsed: LSP.LanguageParsed) => void): () => void {
    this.parsedListeners.add(listener)
    return () => this.parsedListeners.delete(listener)
  }

  /** Who hears each file's problems -- see `onParsed()`. */
  private parsedListeners = new Set<(parsed: LSP.LanguageParsed) => void>()

  /** A reply came:  its request answered, or refused with the worker's error;  or a file's problems, unasked. */
  private replied(reply: LanguageWorkerReply): void {
    if ("kind" in reply) {
      if (reply.kind === "parsed") for (const listener of this.parsedListeners) listener(reply)
      else this.cantLoad(reply.projectId)
      return
    }
    const waiting = this.waiting.get(reply.id)
    if (!waiting) return
    this.waiting.delete(reply.id)
    if ("error" in reply) waiting.reject(errorFrom(reply.error))
    else waiting.resolve(reply.answer)
  }

  /** The worker can't load project `projectId`:  the page answers for it from now on.  Said once on the console. */
  private cantLoad(projectId: string): void {
    if (this.unavailable.has(projectId)) return
    this.unavailable.add(projectId)
    console.info(`the language worker can't load ${projectId}:  the page answers for it`)
    const project = SP.SpellProject.registry.get(projectId)
    if (project) for (const listener of this.fallbackListeners) listener(project)
  }

  /** Send `message` to the worker. */
  private post(message: LanguageWorkerMessage): void {
    if (!this.hasStopped) this.worker.postMessage(message)
  }

  /** The last request's id. */
  private lastId = 0

  /** Each request waiting for its answer, by id. */
  private waiting = new Map<
    number,
    { resolve: (answer: unknown) => void; reject: (error: unknown) => void; again: () => void }
  >()
}

/** A message to the language worker. */
export type LanguageWorkerMessage =
  | ({ kind: "groups" } & GroupsOnPage)
  | ({ kind: "open" } & LSP.LanguageOpen)
  | ({ kind: "change" } & LSP.LanguageChange)
  | { kind: "close"; projectId: string }
  | { kind: "look"; look: LSP.CodeLook }
  | { kind: "request"; id: number; method: LSP.LanguageMethod; params: unknown }
  | ({ kind: "compile"; id: number } & LSP.LanguageCompile)

/**
 * What the page learned of this machine's person as it loaded (`NamePage`, `GET /api/people/local`), for the worker:
 * their address, and their org's own groups (`@acme/tools`).
 * - Without it, the worker takes `@acme/tools/dashboard` for the org's program `tools`, and can't load it.
 */
export type GroupsOnPage = { person: { id: string; org: string }; orgGroups: string[] }

/** This page's person and org groups, as spaces' models hold them now. */
function groupsOnPage(): GroupsOnPage {
  const { id, org } = localPerson
  return { person: { id, org }, orgGroups: [...orgGroups] }
}

/** The language worker's reply to a request:  its answer, or the error it threw. */
export type LanguageWorkerReply =
  | { id: number; answer: unknown }
  | { id: number; error: LanguageWorkerError }
  | ({ kind: "parsed" } & LSP.LanguageParsed)
  | { kind: "unavailable"; projectId: string }

/** An error the worker threw, as plain data:  its class's name, message and `cause`. */
export type LanguageWorkerError = { name: string; message: string; cause?: unknown }

/** `error` as plain data, to send back from the worker. */
export function plainError(error: unknown): LanguageWorkerError {
  if (!(error instanceof Error)) return { name: "Error", message: String(error) }
  return { name: error.name, message: error.message, cause: structuredCloneable(error.cause) }
}

/** The error `plain` was:  an `LSP.RenameError` again, the rest plain `Error`s. */
function errorFrom(plain: LanguageWorkerError): Error {
  const error = plain.name === "RenameError" ? new LSP.RenameError(plain.message) : new Error(plain.message)
  if (plain.cause !== undefined) error.cause = plain.cause
  return error
}

/** `value` if a message can carry it, else nothing. */
function structuredCloneable(value: unknown): unknown {
  try {
    return structuredClone(value)
  } catch {
    return undefined
  }
}
