/**
 * Command runs' pages, on the page server:  a ROUTE MODULE (`spell/server/page`'s `RouteModule`), listed in the repo
 * root's `package.json` `"pageServer": { "routes": [...] }` (epic `epic-engine` P23).
 * - A RUN PAGE:  a command's review page.  A command (the Spanish translator, say) stops to ask Owen, through the
 *   kit's `SRV.CommandRun`, which writes the run's folder in the content folder:  `pages/runs/<run id>/`.
 *   - its files and their shapes:  the kit's `spell/server/runs/runs.types`, the contract between the two sides
 *   - `run.json5`:  what the command asks;  only the command writes it
 *   - `answers.json5`:  what Owen answered;  only these routes write it
 *   - `waiting.json5`:  the command's heartbeat while it waits
 * - `GET /runs/<id>/` -- the page:  the tool's template ([run.html](templates/run.html)), titled with the run's title,
 *   holding `<epic-run run="<id>">`, which draws the rest;  through the server's page hooks (`window.SPELL_SERVER`, the
 *   live client), as a page from a file is
 *   - `/runs/<id>` redirects to it
 * - `GET /api/runs/<id>` -- `{ page, answers, waiting }`:  the run as its page draws it (`RunReply`)
 *   - `waiting`:  the run is `open`, and a command waits on it now (`SRV.CommandRun.isWaiting()`:  a heartbeat newer
 *     than `WAITING_STALE_MS`, from a process still running)
 * - `POST /api/runs/<id>/answer` `{ rowId, outcome, value, ticked }` -- one row's answer, saved as Owen gives it
 *   (half a second after he stops typing), into `answers.json5`;  answers `{ ok, answers }`
 *   - `ticked` only for a row with a tick box;  else dropped
 * - `POST /api/runs/<id>/effort` `{ effort }` -- the run's effort, picked on the page (epic `epic-engine` P25), into
 *   `answers.json5` (`effort`);  answers `{ ok, answers }`
 *   - one of the run's `effort.choices`;  a run that offers no effort, or an effort it doesn't offer:  400
 *   - the command reads it before its next pass
 * - `POST /api/runs/<id>/send` -- Send:  stamps `sent` in `answers.json5`;  answers `{ ok, answers, waiting }`
 *   - the waiting command (`CommandRun.wait()`) wakes on it
 *   - a row left alone has no entry:  the command reads it as its own proposal (`CommandRun.unanswered()`)
 * - Checked:  the run id (`[a-z0-9-]` only), the row id (one of the run's rows), the outcome, the value:  400 else;
 *   a run with no folder or no `run.json5`:  404
 * - every POST needs the page server's token (`x-server-token`) and its own origin (`SRV.Guard`)
 * - each write through the page server's one safe write (`saveData()`, `SRV.FileOperations.save()`):  read and
 *   written under the file's `FileLock` (`<file>.lock`), all at once, so the command never reads half a file
 * - The content folder:  the server's (`ContentRouteContext.content`), else the repo's epic settings'
 *   (`EpicConfig.contentOf()`), as the running epics' routes find it.
 */
import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { fileURLToPath } from "node:url"

import { parseHTML } from "linkedom"

import { escapeHTML } from "spell/util/string"
import { DataFile } from "spell-epic/data/DataFile"
import { RUNS_API } from "spell-epic/answers"
import { SRV } from "spell/server"
import type { RouteModule } from "spell/server/page"
import {
  RUN_FILES,
  RUN_PAGE_PATH,
  RUNS_FOLDER,
  type RunAnswer,
  type RunAnswers,
  type RunOutcome,
  type RunPage
} from "spell/server/runs/runs.types"

import { EpicConfig } from "spell-epic/config/EpicConfig"
import type { ContentRouteContext } from "spell-epic/list/runningRoutes"

import { saveData } from "./detailsRoutes"

/** Biggest body accepted:  one row's answer. */
const MAX_BODY = 16 * 1024

/** A run's id, as its folder is named:  lowercase letters, digits and dashes. */
const RUN_ID = /^[a-z0-9-]+$/

/** The outcomes an answer may have. */
const OUTCOMES: readonly RunOutcome[] = ["accepted", "typed", "picked"]

/** The page's template, the tool's own (tracked with the branch, as its elements are). */
const TEMPLATE = fileURLToPath(new URL("./templates/run.html", import.meta.url))

const runRoutes: RouteModule = {
  name: "command runs",
  setup(context: ContentRouteContext) {
    const { root, router, guard, web } = context
    const runs = new RunFolders(context.content ?? EpicConfig.contentOf(root))
    router.get(`${RUN_PAGE_PATH}:runId`, (request, reply) => {
      const id = request.params.runId!
      const page = runs.pageOf(id)
      // the router matches with or without the trailing `/`:  the page's own links are from its folder
      if (!request.path.endsWith("/")) return void reply.redirect(`${RUN_PAGE_PATH}${id}/`, 301)
      const served = { path: decodeURIComponent(request.path), file: TEMPLATE, request }
      let html = runPageHtml(readFileSync(TEMPLATE, "utf8"), page)
      for (const hook of web.files.html) html = hook(html, served)
      reply.set("Cache-Control", "no-store").type("html").send(html)
    })
    const api = new SRV.Router()
    api.get("/:runId", (request, reply) => {
      reply.set("Cache-Control", "no-store").json(runs.replyFor(request.params.runId))
    })
    api.use(guard.writeCheck, SRV.parseBodies({ limit: MAX_BODY }))
    api.post("/:runId/answer", async (request, reply) => {
      const id = request.params.runId!
      const page = runs.pageOf(id)
      const answers = await runs.saveAnswer(id, toAnswer(page, request.body))
      reply.json({ ok: true, answers })
    })
    api.post("/:runId/effort", async (request, reply) => {
      const id = request.params.runId!
      const answers = await runs.saveEffort(id, toEffort(runs.pageOf(id), request.body))
      reply.json({ ok: true, answers })
    })
    api.post("/:runId/send", async (request, reply) => {
      const id = request.params.runId!
      runs.pageOf(id)
      const answers = await runs.send(id)
      reply.json({ ok: true, answers, waiting: runs.isWaiting(id) })
    })
    router.use(RUNS_API, api)
  }
}

export default runRoutes

/****************
 * ### `RunFolders`
 * The run folders of one content folder, as the routes read and write them:  `<content>/pages/runs/<id>/`.
 * - Every method takes a run id as the request gave it, and checks it first (`folderOf()`).
 ****************/
export class RunFolders {
  constructor(readonly content: string) {}

  /**
   * The folder of run `id`.
   * - 400:  not a run id (`RUN_ID`);  404:  no such run (no folder, or no `run.json5` in it)
   */
  folderOf(id: unknown): string {
    if (typeof id !== "string" || !RUN_ID.test(id)) throw new SRV.HttpError(400, `not a run id:  ${String(id)}`)
    const folder = join(this.content, RUNS_FOLDER, id)
    if (!existsSync(join(folder, RUN_FILES.page))) throw new SRV.HttpError(404, `no run ${id}`)
    return folder
  }

  /** What run `id` asks, `run.json5`.  400 / 404 as `folderOf()`. */
  pageOf(id: unknown): RunPage {
    const page = DataFile.read<RunPage>(join(this.folderOf(id), RUN_FILES.page))
    if (!page) throw new SRV.HttpError(404, `no run ${String(id)}`)
    return page
  }

  /** What Owen answered on run `id` so far, `answers.json5`;  `{ rows: {} }` before his first answer. */
  answersOf(id: unknown): RunAnswers {
    const answers = DataFile.read<RunAnswers>(join(this.folderOf(id), RUN_FILES.answers))
    return { ...answers, rows: answers?.rows ?? {} }
  }

  /**
   * Is a command waiting on run `id` now?  The run is still `open`, and its heartbeat is fresh, from a process that
   * still runs (`SRV.CommandRun.isWaiting()`).
   * - NEVER throws past the id check
   */
  isWaiting(id: unknown): boolean {
    const folder = this.folderOf(id)
    return this.pageOf(id).status === "open" && SRV.CommandRun.isWaiting(folder)
  }

  /** Run `id` as its page draws it:  what's asked, what's answered, whether a command waits. */
  replyFor(id: unknown): RunReply {
    return { page: this.pageOf(id), answers: this.answersOf(id), waiting: this.isWaiting(id) }
  }

  /**
   * Save one row's answer into run `id`'s `answers.json5`;  return the answers as written.
   * - SIDE EFFECT:  writes the file, under its lock
   */
  async saveAnswer(id: unknown, { rowId, ...answer }: RunAnswer & { rowId: string }): Promise<RunAnswers> {
    return this.change(id, (answers) => ({ ...answers, rows: { ...answers.rows, [rowId]: answer } }))
  }

  /**
   * Save the run's effort, `effort`, into run `id`'s `answers.json5`;  return the answers as written.
   * - SIDE EFFECT:  writes the file, under its lock;  the command reads it before its next pass
   */
  async saveEffort(id: unknown, effort: string): Promise<RunAnswers> {
    return this.change(id, (answers) => ({ ...answers, effort }))
  }

  /**
   * Send:  stamp `sent` (now) in run `id`'s `answers.json5`;  return the answers as written.
   * - SIDE EFFECT:  writes the file, under its lock;  the waiting command wakes on it
   */
  async send(id: unknown): Promise<RunAnswers> {
    return this.change(id, (answers) => ({ ...answers, sent: new Date().toISOString() }))
  }

  /** Change run `id`'s answers with `change`, under the file's lock;  return what was written. */
  private async change(id: unknown, change: (answers: RunAnswers) => RunAnswers): Promise<RunAnswers> {
    let written!: RunAnswers
    await saveData<RunAnswers>(join(this.folderOf(id), RUN_FILES.answers), (before) => {
      written = change({ ...before, rows: before?.rows ?? {} })
      return written
    })
    return written
  }
}

/**
 * The page's HTML for run `page`, from the template's:  its title in `<title>` and the header's `<h1>`, and its
 * `<epic-run run>`.
 * - through linkedom, so the title is text, never markup:  `<h1>`'s by linkedom, `<title>`'s by hand
 */
export function runPageHtml(template: string, page: RunPage): string {
  const { document } = parseHTML(template)
  const title = page.title || page.command
  // `<title>` is raw text, which linkedom writes as it is:  escaped here, and the browser reads the escapes back
  document.title = escapeHTML(title)
  const heading = document.querySelector("h1")
  if (heading) heading.textContent = title
  document.querySelector("epic-run")?.setAttribute("run", page.id)
  return `<!doctype html>\n${document.documentElement.outerHTML}\n`
}

/**
 * One row's answer from a request's body, checked against run `page`:  `{ rowId, outcome, value, ticked }`.
 * - 400:  not one of its rows, an outcome that isn't one, a value that isn't text
 * - `ticked` kept only for a row with a tick box
 */
function toAnswer(page: RunPage, body: unknown): RunAnswer & { rowId: string } {
  const { rowId, outcome, value, ticked } = (body ?? {}) as Record<string, unknown>
  const row = page.rows.find((each) => each.id === rowId)
  if (typeof rowId !== "string" || !row) throw new SRV.HttpError(400, `no row ${String(rowId)} in run ${page.id}`)
  if (!OUTCOMES.includes(outcome as RunOutcome)) throw new SRV.HttpError(400, `bad outcome for ${rowId}`)
  if (typeof value !== "string") throw new SRV.HttpError(400, `bad value for ${rowId}`)
  if (ticked !== undefined && typeof ticked !== "boolean") throw new SRV.HttpError(400, `bad tick for ${rowId}`)
  const answer: RunAnswer & { rowId: string } = {
    rowId,
    outcome: outcome as RunOutcome,
    value,
    at: new Date().toISOString()
  }
  if (row.tick) answer.ticked = ticked ?? !!row.tick.checked
  return answer
}

/**
 * The effort from a request's body, `{ effort }`, checked against run `page`.
 * - 400:  the run offers no effort, or not this one
 */
function toEffort(page: RunPage, body: unknown): string {
  const { effort } = (body ?? {}) as Record<string, unknown>
  if (!page.effort) throw new SRV.HttpError(400, `run ${page.id} offers no effort to pick`)
  if (typeof effort !== "string" || !page.effort.choices.includes(effort))
    throw new SRV.HttpError(400, `not an effort of run ${page.id}:  ${String(effort)}`)
  return effort
}

/** What `GET /api/runs/<id>` answers:  the run as its page draws it. */
export type RunReply = {
  /** what the command asks, `run.json5` */
  page: RunPage
  /** what Owen answered so far, `answers.json5` */
  answers: RunAnswers
  /** a command waits on it now */
  waiting: boolean
}
