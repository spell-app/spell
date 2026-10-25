/**
 * Epic pages' review marks, on the page server:  a ROUTE MODULE (`spell/server/page`'s `RouteModule`), listed in the repo
 * root's `package.json` `"pageServer": { "routes": [...] }`.
 * - Owen marks an epic page's items ON the page (the elements' review controls, `spell-epic/review`):
 *   approve, todo, details, revisit, pick an option card, an id chip's urgency.
 *   The marks wait in the doc's INBOX FILE, `<name>.inbox.json5` beside `<name>.plan.html` (`ReviewInbox`),
 *   until a Claude session takes them (P6 of `review-review`, `epic inbox`)
 * - `page`:  the epic page's URL path, as it was served:
 *   `/epics/x/x.plan.html`, or a worktree's `/worktrees/<w>/...` on the main checkout's server.
 *   ONLY an epic page, or a SAGA page (`/sagas/x/x.saga.html`, epic `epic-workflow` P15):  anything else is a 403
 *   - a saga page's marks and comments wait in its own inbox, `<id>.inbox.json5` beside it, the same shape;
 *     the session that takes them is the one running `/epic review SAGA:/<id>` (`SAGA_PREFIX`)
 * - every answer is the whole inbox, as `ReviewInbox` keeps it (an empty one when there's no file),
 *   except a `listening` whose heartbeat stopped:
 *   `null` (`ReviewInbox.forPage()`), so the page warns nobody is reviewing;
 *   plus `unsentComments`, the comments Send would hand over (their thread's rules are `CommentList`'s)
 * - `GET /api/epics/review/inbox?page=<path>` -- the inbox;  the page polls it
 * - `POST /api/epics/review/mark` `{ page, id, mark }` -- set item `id`'s mark, or remove it (`mark: null`)
 *   - the mark:  `{ action, when?, note?, pick?, choices? }`, `at` stamped here;
 *     a revisit may carry a `pick` letter too;  `choices`, the pick's card set by position (I8)
 *   - `id` must be an item, phase, Overview sub-section or the summary (`summary`) of that doc
 *     (400 otherwise:  `ReviewInbox.itemIds()`)
 *   - a TEST's answer from the page's test run (epic `epic-engine` P4), on a test item only:
 *     `{ action: "test", result: "passed" | "failed" | "skip" | "notnow", note?, shot? }`
 * - `POST /api/epics/review/shot` `{ page, id, png }` -- Owen's screenshot of test `id` failing, pasted or dropped in
 *   the test run (epic `epic-engine` P4):  `png` a PNG data URL, at most 8 MB (`MAX_SHOT`, else 413)
 *   - written beside the page, `tests/m3-20261019-1432.png` (`TestShots.saveShot()`), never over a file
 *   - answers `{ shot }`, that path:  the failure's mark carries it
 *   - only a test's id (400);  its own body limit, since a screenshot is far bigger than a note
 * - `POST /api/epics/review/new` `{ page, id?, entry }` -- a NEW todo or question asked for from the page
 *   (epic `airplane` P2):  `entry` `{ kind, title, note?, near? }` under key `id` (`new1` ...),
 *   or, without one, the next free key
 *   - `entry: null` removes it (`ReviewInbox.setNew()`)
 *   - `near`, when given, must be an id of that doc
 * - `POST /api/epics/review/now` `{ page, id, action, note? }` -- an immediate request, queued on `now`,
 *   and the item's mark set:  `details`, or `revisit`, which keeps the item's pick
 *   - nobody listening:  wakes the epic (below)
 * - `POST /api/epics/review/cancel` `{ page, id }` -- "nevermind":
 *   call off item `id`'s immediate request, queued or being worked on (`ReviewInbox.cancelNow()`)
 * - `POST /api/epics/review/draft` `{ page, id, action, note }` -- a note box's text as Owen types it
 *   (`revisit` or `todo`;  empty or `null` drops it):  kept until the mark that uses it (`ReviewInbox.setDraft()`)
 * - `POST /api/epics/review/urgency` `{ page, id, calm }` -- Owen clicked an open judgement call's or issue's id chip:
 *   `calm` true, not urgent;  false, urgent;  `null` drops it (`ReviewInbox.setUrgency()`)
 * - `POST /api/epics/review/send` `{ page, now? }` -- "send to Claude":  `sent` is now, for marks and comments alike;
 *   `now: true` is "Review Now" (epic `windows-and-review` P4):
 *   every revisit waiting becomes an immediate request too (`ReviewInbox.reviewNow()`)
 *   - nobody listening:  wakes the epic (below)
 * - WAKING (epic `epic-workflow` P16):  `send` and `now` with no session listening wake the epic, inside the request
 *   (`ReviewStart.changeAndWake()`)
 *   - `/epic review <epic>` typed into its session, or a new session in its window
 *   - their answer is the inbox plus `wake`, what that did (`WakeResult`), for the page's notice;
 *     `null` while a session listens
 *   - once per epic per 10 minutes, or until a session listens (the inbox's `woken`)
 * - `POST /api/epics/review/start` `{ page }` -- "start a review" (epic `airplane` P12):
 *   types `/epic review <epic>` into the ONE running Claude session titled for the epic;
 *   none or several:  sends nothing, says which it found (`ReviewStart`);  answers its `StartResult`, not the inbox
 * - writes:  under the inbox's lock, atomic (`ReviewInbox.updateAsync()`);
 *   each needs the page server's token (`x-server-token`) and its own origin (`SRV.Guard`)
 * - Loaded by the page server under `tsx` (`PageServer.loadRoutes()`), with `packages/server/tsconfig.json`'s aliases.
 *   Imports `ReviewInbox` (and `TestShots`, as light), never `PlanDoc`:  a request reads the doc's TEXT
 *   (`ReviewInbox.itemIds()`).
 * - From the docs tools' `reviewRoutes.ts` (epic `epic-components`, P7).
 */
import { readFileSync } from "node:fs"

import { SRV } from "spell/server"
import type { RouteModule } from "spell/server/page"

import { SAGA_PREFIX } from "spell-epic/review/review.types"

import { InboxError, ReviewInbox, type PageInbox } from "./ReviewInbox"
import { ReviewStart } from "./ReviewStart"
import { TestShots } from "./TestShots"

/** Where the routes live. */
const API = "/api/epics/review"

/** Biggest body accepted:  a revisit note is a few lines. */
const MAX_BODY = 64 * 1024

/** Biggest screenshot a test run sends (`POST shot`):  8 MB of PNG. */
const MAX_SHOT = 8 * 1024 * 1024

/** Biggest `POST shot` body:  the screenshot as base64 (4 bytes for 3), and room for the rest. */
const MAX_SHOT_BODY = Math.ceil((MAX_SHOT * 4) / 3) + MAX_BODY

/** An epic page's file:  `epics/<name>/<name>.plan.html` (before 2026-10-05 under `packages/docs/content/`). */
const PLAN_DOC = /\/(?:packages\/docs\/content\/)?epics\/([^/]+)\/\1\.plan\.html$/

/** A saga page's file:  `sagas/<id>/<id>.saga.html` (epic `epic-workflow` P15). */
const SAGA_PAGE = /\/sagas\/([^/]+)\/\1\.saga\.html$/

const reviewRoutes: RouteModule = {
  name: "review",
  setup({ root, router, guard, web }) {
    const api = new SRV.Router()
    api.get("/inbox", (request, reply) => {
      const inbox = ReviewInbox.read(ReviewInbox.pathFor(planDoc(web.files, request.query.page)))
      reply.set("Cache-Control", "no-store").json(inbox.forPage())
    })
    // before the other writes' body limit:  a screenshot is megabytes
    api.post("/shot", guard.writeCheck, SRV.parseBodies({ limit: MAX_SHOT_BODY }), async (request, reply) => {
      const body = request.body as { page?: unknown; id?: unknown; png?: unknown }
      const file = planDoc(web.files, body.page)
      const id = itemOf(file, body.id)
      const png = asHttp(() => TestShots.pngOf(body.png))
      if (png.length > MAX_SHOT) throw new SRV.HttpError(413, `a screenshot is ${MAX_SHOT / 1024 / 1024} MB at most`)
      reply.json({ shot: await asHttpAsync(() => TestShots.saveShot(file, id, png)) })
    })
    api.use(guard.writeCheck, SRV.parseBodies({ limit: MAX_BODY }))
    api.post("/mark", async (request, reply) => {
      const body = request.body as { page?: unknown; id?: unknown; mark?: unknown }
      const file = planDoc(web.files, body.page)
      const id = itemOf(file, body.id)
      if (body.mark === undefined) throw new SRV.HttpError(400, "no mark (null removes one)")
      reply.json(await update(file, (inbox) => inbox.setMark(id, body.mark)))
    })
    api.post("/now", async (request, reply) => {
      const body = request.body as { page?: unknown; id?: unknown; action?: unknown; note?: unknown }
      const file = planDoc(web.files, body.page)
      const id = itemOf(file, body.id)
      // a request queued is always something new to hand over
      const ask = (inbox: ReviewInbox) => !!inbox.requestNow(id, body.action, (body.note ?? "") as string)
      reply.json(await new ReviewStart(root).changeAndWake(file, epicOf(file), (inbox) => asHttp(() => ask(inbox))))
    })
    api.post("/cancel", async (request, reply) => {
      const body = request.body as { page?: unknown; id?: unknown }
      const file = planDoc(web.files, body.page)
      const id = itemOf(file, body.id)
      reply.json(await update(file, (inbox) => inbox.cancelNow(id)))
    })
    api.post("/draft", async (request, reply) => {
      const body = request.body as { page?: unknown; id?: unknown; action?: unknown; note?: unknown }
      const file = planDoc(web.files, body.page)
      const id = itemOf(file, body.id)
      reply.json(await update(file, (inbox) => inbox.setDraft(id, body.action, body.note ?? null)))
    })
    api.post("/urgency", async (request, reply) => {
      const body = request.body as { page?: unknown; id?: unknown; calm?: unknown }
      const file = planDoc(web.files, body.page)
      const id = itemOf(file, body.id)
      reply.json(await update(file, (inbox) => inbox.setUrgency(id, body.calm ?? null)))
    })
    api.post("/new", async (request, reply) => {
      const body = request.body as { page?: unknown; id?: unknown; entry?: unknown }
      const file = planDoc(web.files, body.page)
      if (body.entry === undefined) throw new SRV.HttpError(400, "no entry (null removes one)")
      const near = (body.entry as { near?: unknown } | null)?.near
      if (near !== undefined && near !== null && near !== "") itemOf(file, near)
      reply.json(await update(file, (inbox) => inbox.setNew(body.id, body.entry)))
    })
    api.post("/send", async (request, reply) => {
      const body = request.body as { page?: unknown; now?: unknown }
      const file = planDoc(web.files, body.page)
      const send = body.now === true ? sendNow : sendMarks
      reply.json(await new ReviewStart(root).changeAndWake(file, epicOf(file), send))
    })
    api.post("/start", async (request, reply) => {
      const body = request.body as { page?: unknown }
      const file = planDoc(web.files, body.page)
      reply.json(await new ReviewStart(root).start(epicOf(file)))
    })
    router.use(API, api)
  }
}

export default reviewRoutes

/**
 * The epic page (or saga page) file URL path `page` names, through the server's mounts.
 * - 400:  not a path;  404:  no such page;  403:  outside a mount, or neither an epic page nor a saga page
 */
export function planDoc(files: SRV.StaticHandler, page: unknown): string {
  if (typeof page !== "string" || !page.startsWith("/")) throw new SRV.HttpError(400, "no page")
  const resolved = files.resolve(page)
  if (!resolved) throw new SRV.HttpError(403, `not served here:  ${page}`)
  if ("redirect" in resolved) throw new SRV.HttpError(400, `a folder, not a page:  ${page}`)
  if ("status" in resolved) throw new SRV.HttpError(resolved.status, resolved.message)
  if (!PLAN_DOC.test(resolved.file) && !SAGA_PAGE.test(resolved.file))
    throw new SRV.HttpError(403, `not an epic page:  ${page}`)
  return resolved.file
}

/**
 * Who reviews page `file`, as `/epic review` takes it:  an epic page's epic, its folder's name;  a saga page's
 * `SAGA:/<id>` (`SAGA_PREFIX`), what a wake types (`/epic review SAGA:/drawable-spell`).
 */
function epicOf(file: string): string {
  const saga = SAGA_PAGE.exec(file)?.[1]
  return saga ? `${SAGA_PREFIX}${saga}` : PLAN_DOC.exec(file)![1]!
}

/** Send:  every mark so far is sent;  whether anything was new to hand over (a Send with nothing new wakes nobody). */
function sendMarks(inbox: ReviewInbox): boolean {
  const fresh = inbox.hasUnsent
  inbox.markSent()
  return fresh
}

/** Review Now:  sent, every revisit asked now;  whether anything was new (unsent, or a revisit asked now). */
function sendNow(inbox: ReviewInbox): boolean {
  const fresh = inbox.hasUnsent
  return inbox.reviewNow().length > 0 || fresh
}

/**
 * `id` from a request, as the inbox keys it (lower-case);  400 unless epic page `file` has it.
 * - an item, an Overview sub-section (`o3`, Q14), a phase (`p3`), or the summary (`summary`:  epic `airplane` P2)
 * - those ids:  `ReviewInbox.itemIds()`
 * - reads the doc each time:  an item added a moment ago (Claude, `plan-doc add`) is markable at once
 */
function itemOf(file: string, id: unknown): string {
  const key = asHttp(() => ReviewInbox.toItemId(id))
  if (!ReviewInbox.itemIds(readFileSync(file, "utf8")).has(key))
    throw new SRV.HttpError(400, `no item ${String(id)} in that doc`)
  return key
}

/**
 * Change epic page `file`'s inbox with `change`, under its lock;
 * the inbox after, as the page reads it (`ReviewInbox.forPage()`).
 * - an `InboxError` (a bad mark, a bad action) is a 400
 */
async function update(file: string, change: (inbox: ReviewInbox) => unknown): Promise<PageInbox> {
  const inbox = await ReviewInbox.updateAsync(ReviewInbox.pathFor(file), (each) => asHttp(() => change(each)))
  return inbox.forPage()
}

/** `asHttp()` for async work:  an `InboxError` it rejects with becomes a 400. */
async function asHttpAsync<T>(fn: () => Promise<T>): Promise<T> {
  try {
    return await fn()
  } catch (error) {
    if (error instanceof InboxError) throw new SRV.HttpError(400, error.message)
    throw error
  }
}

/** Run `fn`;  an `InboxError` it throws becomes a 400. */
function asHttp<T>(fn: () => T): T {
  try {
    return fn()
  } catch (error) {
    if (error instanceof InboxError) throw new SRV.HttpError(400, error.message)
    throw error
  }
}
