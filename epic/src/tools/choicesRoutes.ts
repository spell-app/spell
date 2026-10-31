/**
 * Choice pages' drafts and answers, on the page server:  a ROUTE MODULE (`spell/server/page`'s `RouteModule`),
 * listed in the repo root's `package.json` `"pageServer": { "routes": [...] }`.
 * - A SYNTAX-CHOICES PAGE:  a table of names Claude recommends, one row per use site, each pre-filled in a box Owen
 *   types over (`epic choices`, `choices.js`)
 *   - the page's `<epic-choices-bar>` posts here (`spell/epic/answers` `ChoicesForm`),
 *     and so does the spell syntax guide's bar (`_assets/spell-syntax.js`)
 * - `GET /api/docs/choices/draft?page=<path>` -- what was typed so far, `{ draft: ChoicesDraft | null }`:
 *   the page restores it on load
 * - `POST /api/docs/choices/draft` `{ page, values, comments, feedback, order }` -- save it to `<slug>.draft.json5`
 *   beside the page
 *   - as Owen types (half a second after each change), and as the page goes away;  a failed save tries again every
 *     3s (`ChoicesForm`, epic `epic-engine` P15)
 *   - wakes NOBODY:  `epic choices wait` watches the answer only
 * - `GET /api/docs/choices/answer?page=<path>` -- the answer sent, `{ answer: ChoicesAnswer | null }`
 * - `POST /api/docs/choices/answer` `{ page, values, comments, feedback, order }` -- "Do it":
 *   - writes `<slug>.answer.json5`, and the draft, so a reload shows what was sent
 *   - sent again, `changes` counts up
 *   - `epic choices wait` exits with it
 * - `page`:  the page's URL path, as served (a worktree's `/worktrees/<w>/...` too);
 *   ONLY a details-folder page with its `<slug>.rows.json5` beside it (or its old `.json`),
 *   or a docs page naming its rows (`<body data-choices-rows>`, e.g. the spell syntax guide):
 *   anything else is a 403 (`choicesPage()`)
 * - `values`:  row id -> what's in its box, ONLY the rows that differ from the recommendation;
 *   ids not in the rows file are a 400 (a page older than its rows:  reload it)
 *   - a page naming its rows keys its boxes as it likes (`IsGtLt.py`):  unchecked
 * - `comments` (optional, epic `epic-engine` P58):  row id -> what's in its comment box, ONLY the rows with one;
 *   kept in the draft and the answer as sent;  checked as `values` are (strings, by the page's row ids, else a 400)
 * - `order` (optional, epic `epic-workflow` P15):  section id -> its row ids in the order Owen left them, for each
 *   section he puts in order (`reorder: true`);  kept in the draft and the answer as sent;
 *   an id not in the rows file is a 400, as in `values`
 * - every POST needs the page server's token (`x-server-token`) and its own origin (`SRV.Guard`)
 * - its files are data files (`DataFile`, epic `epic-workflow` P21):  JSON5, a comment added by hand kept, the old
 *   `.json` names read while there's no `.json5`
 */
import { readFileSync } from "node:fs"

import { DataFile } from "spell/epic/data/DataFile"
import { SRV } from "spell/server"
import type { RouteModule } from "spell/server/page"

import { answerFile, draftFile, isDetailsPage, saveData, sentAnswer, servedPage, withRounds } from "./detailsRoutes"

export { answerFile, draftFile }

/** Where the routes live. */
const API = "/api/docs/choices"

/** Biggest body accepted:  a value per row (a few hundred) and the feedback. */
const MAX_BODY = 256 * 1024

const choicesRoutes: RouteModule = {
  name: "choices",
  setup({ router, guard, web }) {
    const api = new SRV.Router()
    api.get("/draft", (request, reply) => {
      const draft = readJson<ChoicesDraft>(draftFile(choicesPage(web.files, request.query.page)))
      reply.set("Cache-Control", "no-store").json({ draft })
    })
    api.get("/answer", (request, reply) => {
      const answer = sentAnswer(
        readJson<ChoicesAnswer>(answerFile(choicesPage(web.files, request.query.page))) ?? undefined
      )
      reply.set("Cache-Control", "no-store").json({ answer })
    })
    api.use(guard.writeCheck, SRV.parseBodies({ limit: MAX_BODY }))
    api.post("/draft", async (request, reply) => {
      const { file, page, sent } = toChoices(web.files, request.body)
      reply.json({ ok: true, draft: await saveDraft(file, page, sent) })
    })
    api.post("/answer", async (request, reply) => {
      const { file, page, sent } = toChoices(web.files, request.body)
      reply.json({ ok: true, answer: await saveAnswer(file, page, sent) })
    })
    router.use(API, api)
  }
}

export default choicesRoutes

/**
 * The choice page file URL path `page` names, through the server's mounts.  Either:
 * - a details-folder page with its rows beside it, `<slug>.rows.json5` (`epic choices create`)
 * - or a docs page naming its own rows, on its `<body data-choices-rows="...">` (`declaredRows()`):
 *   e.g. the spell syntax guide, whose rows are generated from the code, and whose boxes are keyed `<row>.<field>`
 * - 400:  not a path;  404:  no such page;  403:  outside a mount, or neither of the above
 */
export function choicesPage(files: SRV.StaticHandler, page: unknown): string {
  const file = servedPage(files, page)
  if (isDetailsPage(file) && DataFile.exists(rowsFile(file))) return file
  if (declaredRows(file)) return file
  throw new SRV.HttpError(403, `not a choice page:  ${String(page)}`)
}

/**
 * The rows a page names on its `<body data-choices-rows="...">`, from the page's folder;  none:  `undefined`.
 * - e.g. `../../packages/spell/spellSyntax.json`:  the generated data the page draws its rows from
 * - Its boxes are checked only as text:  the rows are the page's own business, kept by whatever generates them
 */
export function declaredRows(file: string): string | undefined {
  if (!file.endsWith(".html")) return undefined
  return DECLARED_ROWS.exec(readFileSync(file, "utf8"))?.[1] || undefined
}

/** A `<body>` naming its rows:  `data-choices-rows="<path>"`. */
const DECLARED_ROWS = /<body\b[^>]*\bdata-choices-rows="([^"]*)"/

/**
 * Save what was typed on page `file` to `<slug>.draft.json5`;  return what was written.
 * - `comments`, `order`:  kept only when given
 * - through the page server's one safe write (`SRV.FileOperations.save()`:  under the file's lock, all at once)
 * - SIDE EFFECT:  writes the file
 */
export async function saveDraft(file: string, page: string, sent: ChoicesSent): Promise<ChoicesDraft> {
  const draft: ChoicesDraft = { page, saved: new Date().toISOString(), ...sentFields(sent) }
  await saveData(draftFile(file), () => draft)
  return draft
}

/**
 * "Do it" on page `file`:  write `<slug>.answer.json5`, and the draft to match;  return the answer.
 * - sent again:  replaces it, `changes` counts up
 * - through the page server's one safe write (`SRV.FileOperations.save()`):  the answer before is read and the new
 *   one written under the file's lock, all at once, so `epic choices wait` never reads half a file
 * - SIDE EFFECT:  writes both files
 */
export async function saveAnswer(file: string, page: string, sent: ChoicesSent): Promise<ChoicesAnswer> {
  await saveDraft(file, page, sent)
  let answer!: ChoicesAnswer
  await saveData<ChoicesAnswer>(answerFile(file), (file) => {
    // a new round's file holds only the rounds before (`rounds`):  this is the round's first answer
    const before = sentAnswer(file)
    answer = {
      page,
      answered: new Date().toISOString(),
      changes: before ? before.changes + 1 : 0,
      ...sentFields(sent)
    }
    return withRounds(answer, file)
  })
  return answer
}

/** What a POST sends, in the order the files keep it:  `comments` and `order` only when given. */
function sentFields({ values, comments, feedback, order }: ChoicesSent): ChoicesSent {
  return { values, ...(comments && { comments }), feedback, ...(order && { order }) }
}

/**
 * A POST's body, checked:  the page's file and path, and what it sent (`sent`):  its values, its comments if any, the
 * feedback (trimmed), the order if any.
 * - 400 unless `values` and `comments` (if any) are objects of strings keyed by the page's row ids,
 *   and `order` (if any) an object of lists of them
 */
function toChoices(files: SRV.StaticHandler, body: unknown): { file: string; page: string; sent: ChoicesSent } {
  const { page, values, comments, feedback, order } = (body ?? {}) as {
    page?: unknown
    values?: unknown
    comments?: unknown
    feedback?: unknown
    order?: unknown
  }
  const file = choicesPage(files, page)
  // a page naming its own rows (`declaredRows()`) has none beside it:  its ids aren't checked
  const rows = readJson<{ rows: { id: string }[] }>(rowsFile(file))
  const ids = rows && new Set(rows.rows.map((row) => row.id))
  if (feedback !== undefined && typeof feedback !== "string") throw new SRV.HttpError(400, "bad feedback")
  return {
    file,
    page: page as string,
    sent: {
      values: toTexts(values, ids, "value") ?? fail("no values"),
      comments: toTexts(comments, ids, "comment"),
      feedback: (feedback ?? "").trim(),
      order: toOrder(order, ids)
    }
  }
}

/**
 * A POST's `values` or `comments` (`what`), checked:  strings, by the page's row ids (`ids`;  none for a page naming
 * its own rows);  `undefined` when not sent.
 */
function toTexts(texts: unknown, ids: Set<string> | null, what: string): ChoicesValues | undefined {
  if (texts === undefined) return undefined
  if (!texts || typeof texts !== "object" || Array.isArray(texts)) throw new SRV.HttpError(400, `bad ${what}s`)
  for (const [id, text] of Object.entries(texts)) {
    if (typeof text !== "string") throw new SRV.HttpError(400, `bad ${what} for ${id}`)
    if (ids && !ids.has(id)) throw new SRV.HttpError(400, `no row '${id}' on this page:  reload it`)
  }
  return texts as ChoicesValues
}

/** A 400 saying `message`. */
function fail(message: string): never {
  throw new SRV.HttpError(400, message)
}

/** A POST's `order`, checked against the page's row ids (`ids`;  none for a page naming its own rows). */
function toOrder(order: unknown, ids: Set<string> | null): ChoicesOrder | undefined {
  if (order === undefined) return undefined
  if (!order || typeof order !== "object" || Array.isArray(order)) throw new SRV.HttpError(400, "bad order")
  for (const [section, list] of Object.entries(order)) {
    if (!Array.isArray(list) || !list.every((id) => typeof id === "string"))
      throw new SRV.HttpError(400, `bad order for ${section}`)
    const unknown = list.find((id) => ids && !ids.has(id))
    if (unknown !== undefined) throw new SRV.HttpError(400, `no row '${unknown}' on this page:  reload it`)
  }
  return order as ChoicesOrder
}

////////////////
// ## Files
////////////////

/** `<slug>.rows.json5` beside page `<slug>.html`:  the rows (`choices.js` `new` writes it). */
export function rowsFile(page: string): string {
  return DataFile.besidePage(page, "rows")
}

/** Data file `file`, or its old `.json`;  `null` when neither is there. */
function readJson<T>(file: string): T | null {
  return DataFile.read<T>(file) ?? null
}

////////////////
// ## Types
////////////////

/** What's in the boxes that differ from the recommendation:  row id -> typed text (maybe blank). */
export type ChoicesValues = Record<string, string>

/** Each section Owen puts in order (`reorder: true`):  section id -> its row ids, in his order. */
export type ChoicesOrder = Record<string, string[]>

/**
 * What a POST sends, checked (`toChoices()`):  what the draft and the answer keep.
 * - `values`:  the changed boxes;  `comments`:  the rows' comment boxes that hold anything, when any
 * - `feedback`:  the toolbar's text, trimmed;  `order`:  the reorderable sections' rows in Owen's order, when any
 */
export type ChoicesSent = {
  values: ChoicesValues
  comments?: ChoicesValues
  feedback: string
  order?: ChoicesOrder
}

/**
 * A page's `<slug>.draft.json5`:  what was typed, not sent.
 * - `page`:  the page's URL path, as sent;  `saved`:  when, ISO
 * - the rest:  as sent (`ChoicesSent`)
 */
export type ChoicesDraft = ChoicesSent & {
  page: string
  saved: string
}

/**
 * A page's `<slug>.answer.json5`:  what "Do it" sent.
 * - `answered`:  when, ISO;  `changes`:  how often it was sent again (0:  the first time)
 * - `values`, `comments`, `feedback`, `order`:  as the draft's
 * - `rounds`:  the earlier rounds' answers (`epic choices round`, epic `epic-engine` P37), kept through every send;
 *   never served to the page
 */
export type ChoicesAnswer = ChoicesSent & {
  page: string
  answered: string
  changes: number
  rounds?: unknown[]
}
