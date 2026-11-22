import type { ChangeSet } from "@codemirror/state"

import type { SP } from "spell/parser/spell"
import { LSP } from "spell/app/lsp"

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
   * Does the page parse what this client answers about?
   * - `true`:  a question waits for the page's parse of the text first (`CodeMirrorLanguage.fileReady()`)
   * - `false`:  the worker parses;  the page asks straight away
   */
  abstract readonly parsesOnPage: boolean

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

  /** `file`'s state was made, holding `text`. */
  opened(_file: SP.SpellFile, _text: string): void {}

  /** `file`'s state was changed by `changes`. */
  changed(_file: SP.SpellFile, _changes: ChangeSet): void {}

  /** Project `project`'s states are gone. */
  closed(_project: SP.SpellProject): void {}

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

  readonly parsesOnPage = true

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
  }

  get parsesOnPage(): boolean {
    return this.hasStopped
  }

  /** Has the worker stopped, its questions going to the page's own service? */
  private hasStopped = false

  request<M extends LSP.LanguageMethod>(method: M, params: LSP.LanguageParams<M>): Promise<LSP.LanguageAnswer<M>> {
    if (this.hasStopped) return this.fallback.request(method, params)
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
    if (this.hasStopped || !this.openProjects.has(project.projectId)) return undefined
    const id = ++this.lastId
    try {
      return await new Promise<SP.CompiledEntry>((resolve, reject) => {
        const again = () => reject(new Error("the language worker stopped"))
        this.waiting.set(id, { resolve: resolve as (answer: unknown) => void, reject, again })
        const pagesInPlay = project.pagesInPlay && [...project.pagesInPlay]
        this.post({ kind: "compile", id, projectId: project.projectId, ...(pagesInPlay && { pagesInPlay }) })
      })
    } catch (error) {
      console.error(`the language worker couldn't compile ${project.projectId}:  the page compiles it`, error)
      return undefined
    }
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

  /** A reply came:  its request answered, or refused with the worker's error. */
  private replied(reply: LanguageWorkerReply): void {
    const waiting = this.waiting.get(reply.id)
    if (!waiting) return
    this.waiting.delete(reply.id)
    if ("error" in reply) waiting.reject(errorFrom(reply.error))
    else waiting.resolve(reply.answer)
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
  | ({ kind: "open" } & LSP.LanguageOpen)
  | ({ kind: "change" } & LSP.LanguageChange)
  | { kind: "close"; projectId: string }
  | { kind: "request"; id: number; method: LSP.LanguageMethod; params: unknown }
  | ({ kind: "compile"; id: number } & LSP.LanguageCompile)

/** The language worker's reply to a request:  its answer, or the error it threw. */
export type LanguageWorkerReply = { id: number; answer: unknown } | { id: number; error: LanguageWorkerError }

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
