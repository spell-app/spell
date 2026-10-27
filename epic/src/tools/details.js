/**
 * `epic ask <command>` (once `spell dev details`):  details pages, questions Claude explains on a page and Owen
 * answers ON it (`/details`, `.claude/skills/details/SKILL.md`).
 * - `create <slug> [--title "..."] [--epic <name>] [--description "..."] [--from <questions.json>]` --
 *   a page from the tool's own template (`templates/details.html` beside it);  prints its path
 *   - built in the epics pack's `<epic-*>` elements (`answerPages.js`)
 *   - `--from`:  the whole page from a JSON list of questions (`DetailsSpec`, below),
 *     so a skill with many questions to ask (`/worktrees`, `/bedtime`) needn't hand-write it
 *   - scratch:  `pages/details/<slug>.html`, ignored by version control, swept after 14 days
 *   - `--epic <name>`:  `epics/<name>/details/<slug>.html`, committed with the epic page
 * - `round <page> [--title "..."] [--description "..."] [--from <questions.json>]` -- the page's NEXT ROUND:  the one
 *   page rewritten in place (from `--from`, else left for Claude to edit), the round before folded at its bottom, with
 *   what was sent (`newRound()`, epic `epic-engine` P37);  `create` refuses a second page on the same question
 * - `show <page> [--wait]` -- start the page server if needed, and show the page in THIS session's VS Code window
 *   - the right side bar's "Review" view, where Owen answers things (epic `windows-and-review` P6, Owen 2026-10-06)
 *   - Chrome outside VS Code
 *   - `--wait`:  then `wait`
 * - `wait <page> [--timeout 8h]` -- block until Owen sends an answer NEWER than the wait's start
 *   - prints it as plain text, exit 0
 *   - while it waits, the page's Send says it's listening (a heartbeat in `~/.spell-epic/asks/`, `AskListeners`)
 *   - run it in the BACKGROUND:  its exit wakes the session
 *   - timeout:  exit 2, saying so
 * - `answer <page> [--round <n>]` -- print the answer already sent (exit 1 if none);  `--round`:  an earlier round's,
 *   as it was sent
 * - `draft <page>` -- print what Owen typed on the page and hasn't sent (exit 1 if nothing):  its draft,
 *   `<slug>.draft.json5`, newer than the answer (epic `epic-workflow` P18).  Run it BEFORE rewriting a page he may
 *   have open:  the page puts the draft back by id, and keeps text whose id the rewrite removes in a box of its own
 * - `list [<epic>]` -- every details page, answered or waiting;  with an epic, only that epic's
 *   (`epics/<epic>/details/`), as `epic choices list <epic>`
 * - `sweep [--days 14]` -- delete scratch pages (and their answers) older than that;  never an epic's
 *   - `create` sweeps first, by itself
 * - `fold [--dry-run]` -- once:  every epic's near-copies made before `round` (`event-names-2`, `-3` ...) folded into
 *   their first page as its rounds (`foldCopies()`)
 * - `<page>`:  a slug (`pick-layout`), `<epic>/<slug>`, or a path
 *   (absolute, or from the content folder, its `pages/`, or the checkout's root)
 * - paths print absolute:  they mean the same in whichever checkout Claude reads them
 * - The answer itself is written by the page server's route module (`tools/detailsRoutes.ts`) into
 *   `<slug>.answer.json5` beside the page.
 * - Its files are data files (`DataFile`, epic `epic-workflow` P21):  JSON5, read by their old `.json` names too.
 *   - the draft into `<slug>.draft.json5`, which Send deletes
 */
import { existsSync, mkdirSync, readFileSync, readdirSync, rmSync, statSync, writeFileSync } from "node:fs"
import { basename, dirname, join, relative, resolve } from "node:path"
import { fileURLToPath } from "node:url"

import { parseHTML } from "linkedom"

import { clamp } from "spell/util/number.ts"
import { localDate } from "spell/util/time.ts"
import {
  ASK,
  CHOICES,
  OPTION,
  TOOL_TEMPLATES,
  appendHTML,
  commentBox,
  fillHead,
  fillWords,
  make,
  questionSection
} from "./answerPages.js"
import { AskListeners } from "./AskListeners.ts"
import { DataFile } from "spell/epic/data/DataFile.ts"
import { CONTENT, ROOT, fromTemplate, inContent, openInVSCode, serialize } from "./pages.js"
import {
  archiveAnswer,
  askedOf,
  copyNumber,
  currentRound,
  dropSentDraft,
  foldRound,
  formatRound,
  nearCopyOf,
  refuseNearCopy,
  roundsOf
} from "./rounds.js"

/** How long `wait` waits by default:  8 hours (decision D9). */
const DEFAULT_TIMEOUT = "8h"

/** How often `wait` looks for the answer, in ms. */
const POLL = 1000

/** Scratch pages older than this many days go in a `sweep`. */
const SWEEP_DAYS = 14

/** A slug:  lower-kebab-case. */
export const SLUG = /^[a-z0-9]+(?:-[a-z0-9]+)*$/

/** The files `sweep()` deletes:  pages, answers, and a choice page's rows and draft (`choices.js`). */
const SWEPT = /\.(html|(answer|rows|draft)\.json5?)$/

/** Run `epic ask <argv>`;  the exit code:  0, 1 a failure (the message says why), 2 usage. */
async function main(argv) {
  const { positional, flags } = parseArgs(argv)
  const [command, target] = positional
  try {
    if (command === "create") {
      // scratch pages sweep themselves:  nobody has to remember to
      for (const file of sweep(CONTENT, SWEEP_DAYS)) console.error(`swept ${relative(CONTENT, file)}`)
      const spec = flags.from ? DataFile.parse(readFileSync(findFile(flags.from), "utf8")) : undefined
      console.log(shown(createPage(CONTENT, target, { ...flags, spec })))
      return 0
    }
    if (command === "round") {
      const spec = flags.from ? DataFile.parse(readFileSync(findFile(flags.from), "utf8")) : undefined
      console.log(shown(newRound(CONTENT, target, { ...flags, spec })))
      return 0
    }
    if (command === "fold") {
      const lines = await foldCopies(CONTENT, { dryRun: !!flags["dry-run"] })
      console.log(lines.length ? lines.join("\n") : "no near-copies to fold")
      return 0
    }
    if (command === "show") {
      const file = findPage(CONTENT, target)
      await openInVSCode(file, { view: "review" })
      return flags.wait ? await waitAndPrint(file, flags) : 0
    }
    if (command === "wait") return await waitAndPrint(findPage(CONTENT, target), flags)
    if (command === "answer") {
      const file = findPage(CONTENT, target)
      if (flags.round) return printRound(file, flags.round)
      const answer = readAnswer(file)
      console.log(answer ? formatAnswer(file, answer) : noAnswerYet(file))
      return answer ? 0 : 1
    }
    if (command === "draft") {
      const file = findPage(CONTENT, target)
      const draft = readDraft(file)
      console.log(draft ? formatDraft(file, draft) : `nothing typed and not sent:  ${shown(file)}`)
      return draft ? 0 : 1
    }
    if (command === "list") {
      if (target && !existsSync(join(CONTENT, "epics", target)))
        throw new Error(`no epic '${target}' (epics/${target}/)`)
      for (const file of listPages(CONTENT).filter((page) => !target || isEpicsPage(page, target)))
        console.log(`${readAnswer(file) ? "answered" : "waiting "}  ${relative(CONTENT, file)}`)
      return 0
    }
    if (command === "sweep") {
      const gone = sweep(CONTENT, Number(flags.days ?? SWEEP_DAYS))
      console.log(
        gone.length ? gone.map((file) => `deleted ${relative(CONTENT, file)}`).join("\n") : "nothing to sweep"
      )
      return 0
    }
    console.error(USAGE)
    return 2
  } catch (error) {
    console.error(`details:  ${error.message}`)
    return 1
  }
}

/** `epic ask` with no or a wrong command. */
const USAGE = `usage:  epic ask create <slug> [--title "..."] [--epic <name>] [--description "..."] [--from <questions.json>]
        epic ask round <page> [--title "..."] [--description "..."] [--from <questions.json>]
        epic ask show <page> [--wait] [--timeout 8h]
        epic ask wait <page> [--timeout 8h]
        epic ask answer <page> [--round <n>]
        epic ask draft <page>
        epic ask list [<epic>]
        epic ask sweep [--days 14]
        epic ask fold [--dry-run]`

////////////////
// ## Pages
////////////////

/**
 * Write a new details page `slug` in content folder `docs` (`pages/details/`, `epics/`:  `CONTENT`) from the tool's
 * template (`answerPages.js` `TOOL_TEMPLATES`);  its absolute path.
 * - `--epic <name>`:  in that epic's `details/` (the epic must exist);  else the scratch `details/`
 * - sets `<title>`, the h1, the breadcrumb, the description and the "Asked" date;  refuses to overwrite
 * - refuses a NEAR-COPY (epic `epic-engine` P37):  `event-names-2` beside `event-names` is its second round,
 *   `epic ask round event-names` (`rounds.js` `refuseNearCopy()`)
 * - `spec`:  the whole page (`fillFromSpec()`)
 */
export function createPage(docs, slug, { title, epic, description, spec } = {}) {
  if (!slug || !SLUG.test(slug)) throw new Error(`a slug is lower-kebab-case:  '${slug ?? ""}'`)
  if (epic && !existsSync(join(docs, "epics", epic))) throw new Error(`no epic '${epic}' (epics/${epic}/)`)
  const folder = epic ? join(docs, "epics", epic, "details") : join(docs, "pages", "details")
  const file = join(folder, `${slug}.html`)
  if (existsSync(file)) throw new Error(`${relative(docs, file)} already exists`)
  refuseNearCopy(folder, slug, epic)
  const document = pageDocument(docs, folder, { title, description, spec })
  mkdirSync(folder, { recursive: true })
  writeFileSync(file, serialize(document))
  return file
}

/**
 * A details page for `folder` (in content folder `docs`), parsed, from the tool's template:  its head filled
 * (`title`, `description`, today's date), and the whole page from `spec` when given.
 */
function pageDocument(docs, folder, { title, description, spec }) {
  title ??= spec?.title ?? "Details"
  const { document } = parseHTML(fromTemplate(readFileSync(join(TOOL_TEMPLATES, "details.html"), "utf8")))
  // the date up top, under "Asked by":  the notes are the page's bottom, so no footer
  fillHead(document, {
    title,
    description: description ?? `Details:  ${title}`,
    asked: "[data-details-asked]",
    date: localDate()
  })
  if (spec) fillFromSpec(document, spec)
  return document
}

/**
 * Start the next ROUND of details page `target` (epic `epic-engine` P37):  the ONE page rewritten in place, never a
 * second one;  its absolute path.
 * - the round it was on folds into the page, at the bottom, with what was sent (`rounds.js` `foldRound()`)
 * - its answer moves into the answer file's `rounds` (`answer --round <n>` prints it);  a new answer is the new
 *   round's
 * - `spec`:  the page rewritten from it, as `create --from`;  none:  the page as it is, for Claude to edit by hand
 * - a draft typed and not sent stays, and comes back over the new round;  a sent one goes
 * - a choice page:  refused, naming `epic choices round`
 * - SIDE EFFECT:  writes the page and its answer file;  may delete its draft
 */
export function newRound(docs, target, { title, description, spec } = {}) {
  const file = findPage(docs, target)
  if (DataFile.exists(DataFile.besidePage(file, "rows")))
    throw new Error(`a choice page:  epic choices round ${target} --rows <rows.json5>`)
  const { document: old } = parseHTML(readFileSync(file, "utf8"))
  title ??= spec?.title ?? old.querySelector("h1")?.textContent?.trim()
  const document = spec ? pageDocument(docs, dirname(file), { title, description, spec }) : old
  const answer = readAnswer(file)
  const sent = answer && formatAnswer(file, answer)
  const draft = !answer && readDraft(file)
  const typed = draft ? formatDraft(file, draft) : undefined
  const asked = askedOf(old)
  const round = foldRound({ from: old, into: document, sent, typed, asked: localDate() })
  writeFileSync(file, serialize(document))
  archiveAnswer(file, { round, asked, sent, answer })
  dropSentDraft(file, answer)
  return file
}

/**
 * Fill a new page's `document` from `spec` (`DetailsSpec`):  lede, "Asked by", the "Where we are" box, the context,
 * then one question section per question, in place of the template's example (`answerPages.js`
 * `questionSection()`).
 * - text fields are HTML (Claude writes them);  titles and letters go in attributes
 */
function fillFromSpec(document, spec) {
  // a page that's only a form (`/epic review`'s item picker):  no site header
  if (spec.bare) document.querySelector("spell-site-header")?.remove()
  fillWords(document, spec)
  const context = document.querySelector("ui-section#context")
  if (context) {
    if (spec.context)
      context.replaceChildren(
        make(document, "ui-icon", { slot: "icon", name: "lightbulb" }),
        ...appendHTML(document.createElement("div"), spec.context).childNodes,
        commentBox(document, "context")
      )
    else context.remove()
  }
  const example = [...document.querySelectorAll("ui-section")].find((section) => section.querySelector(ASK))
  const sections = (spec.questions ?? []).map((question, i) => questionSection(document, question, i))
  if (example) example.replaceWith(...sections)
}

/** `path` as given:  absolute, else from the checkout's root. */
function findFile(path) {
  const found = resolve(ROOT, path)
  if (!existsSync(found)) throw new Error(`no file ${path}`)
  return found
}

/**
 * What `create --from` reads:  a whole page as data.
 * - `title`, `lede`, `askedBy` (`session <code>x</code>, while ...`);  HTML allowed except in `title`
 * - `where`:  `{ epic, justNow, decides }`, the "Where we are" box (`.claude/skills/details/SKILL.md`, "Writing for Owen")
 * - `context`:  HTML for "1. Context" (the picture);  none:  the section goes
 * - `bare`:  no site header (a page that's only a form)
 * - `questions[]`:  `{ id?, title, text?, multiple?, selectAll?, filter?, options[] }`
 *   - `selectAll`:  "Select all" / "Select none" in its title (with `multiple`)
 *   - `filter`:  "Open | All" in its title;  Open (the default) hides options marked `done`
 *   - `moreDetails`:  a (?) "Provide more details" on each option;  the ones pressed come back as `<id>-more`
 * - an option:
 *   `{ letter?, title, summary?, body?, details?, detailsTitle?, recommended?, checked?, done?, badge?, badgeColor? }`
 *   - letters default to A, B ...
 *   - `summary`:  one line
 *   - `body`:  block HTML after it (the whole text:  the card folds by its chevron)
 *   - `details`:  folded, under `detailsTitle` (default "Details");  only when there IS more than the body
 *   - `checked`:  ticked to start with
 *   - `done`:  hidden under "Open"
 *   - `badge` / `badgeColor`:  a label beside the title
 *   - `state`:  `{ icon, color, label }`, an icon at the end of its header (in `ICONS`), `label` its tooltip
 * - plain JS:  no type, this comment is the spec
 */

/**
 * The details page `target` names under `docs`:  a path, a slug in the scratch `details/`, `<epic>/<slug>`, or a
 * slug in any epic's `details/` (the first found).
 */
export function findPage(docs, target) {
  if (!target) throw new Error("which page?  a slug, a path or <epic>/<slug>")
  // a path is from the content folder, its `pages/`, or the checkout's root
  const path = [docs, join(docs, "pages"), ROOT].map((base) => resolve(base, target)).find((each) => existsSync(each))
  if (target.endsWith(".html") && path) return inContent(path)
  const slug = target.replace(/\.html$/, "")
  const candidates = [join(docs, "pages", "details", `${slug}.html`)]
  if (slug.includes("/")) {
    const [epic, name] = slug.split("/")
    candidates.push(join(docs, "epics", epic, "details", `${name}.html`))
  }
  candidates.push(...listPages(docs).filter((file) => basename(file) === `${basename(slug)}.html`))
  const found = candidates.find((file) => existsSync(file))
  if (!found) throw new Error(`no details page '${target}'`)
  return found
}

/** Is `file` one of epic `epic`'s own pages (under `epics/<epic>/` in content folder `docs`)? */
export function isEpicsPage(file, epic, docs = CONTENT) {
  return relative(join(docs, "epics", epic), file).split("/")[0] !== ".."
}

/** Every details page under `docs`:  the scratch ones, then each epic's. */
export function listPages(docs) {
  const folders = [join(docs, "pages", "details")]
  const epics = join(docs, "epics")
  if (existsSync(epics)) for (const epic of readdirSync(epics).sort()) folders.push(join(epics, epic, "details"))
  return folders.flatMap((folder) =>
    existsSync(folder)
      ? readdirSync(folder)
          .filter((name) => name.endsWith(".html"))
          .sort()
          .map((name) => join(folder, name))
      : []
  )
}

/**
 * Delete the scratch pages under `docs` last changed more than `days` ago, with their answers;  what went.
 * - only `pages/details/`:  an epic's pages are its record
 * - a choice page's files too (`choices.js`):  its rows and draft
 * - SIDE EFFECT:  deletes files
 */
export function sweep(docs, days, now = Date.now()) {
  const folder = join(docs, "pages", "details")
  if (!existsSync(folder)) return []
  const gone = []
  for (const name of readdirSync(folder)) {
    const file = join(folder, name)
    if (!SWEPT.test(name) || now - statSync(file).mtimeMs < days * 86_400_000) continue
    rmSync(file)
    gone.push(file)
  }
  return gone
}

////////////////
// ## Folding near-copies
////////////////

/**
 * `epic ask fold`, once (epic `epic-engine` P37):  every epic's NEAR-COPIES (`event-names-2`, `-3` ... beside
 * `event-names`, made before `round` was) folded into their first page as its rounds;  what it did, as lines.
 * - the newest copy's page becomes the page, its round on top;  each older one folds below, with what was sent
 * - their answers into the answer file's `rounds`, the newest copy's answer (and draft) the page's own;  a choice
 *   page's rows the newest copy's
 * - the copies' files go;  the epic's own pages' links to them (its epic page, parts, details pages) point at the page
 * - details pages and choice pages alike;  a group mixing the two is skipped, saying so
 * - `dryRun`:  only says what it would do
 * - SIDE EFFECT:  writes and deletes pages and data files in the epics' folders
 */
export async function foldCopies(docs, { dryRun = false } = {}) {
  // here, not at the top:  `choices.js` imports this file
  const choices = await import("./choices.js")
  const epics = join(docs, "epics")
  if (!existsSync(epics)) return []
  const lines = []
  for (const epic of readdirSync(epics).sort()) {
    const folder = join(epics, epic, "details")
    if (!existsSync(folder)) continue
    for (const { base, copies } of nearCopies(folder)) {
      const where = relative(docs, folder)
      const kinds = new Set([base, ...copies].map((slug) => choices.isChoicesPage(join(folder, `${slug}.html`))))
      if (kinds.size > 1) {
        lines.push(`skipped ${where}/${base}.html:  its copies aren't all the same kind of page`)
        continue
      }
      const kind = kinds.has(true) ? choices : undefined
      const top = currentRound(parseHTML(readFileSync(join(folder, `${base}.html`), "utf8")).document) + copies.length
      lines.push(
        `${dryRun ? "would fold" : "folded"} ${where}/${base}.html <- ${copies.map((copy) => `${copy}.html`).join(", ")}:` +
          `  round ${top} (${copies.at(-1)}) on top, rounds ${top - 1}-1 folded below`
      )
      for (const file of relinkCopies(join(epics, epic), base, copies, { dryRun }))
        lines.push(`  ${dryRun ? "would relink" : "relinked"} ${relative(docs, file)}`)
      const gone = dryRun ? copyFiles(folder, copies) : foldGroup(folder, base, copies, kind)
      for (const file of gone) lines.push(`  ${dryRun ? "would remove" : "removed"} ${relative(docs, file)}`)
    }
  }
  return lines
}

/** The near-copies in details folder `folder`:  `{ base, copies }` per first page, its copies by round. */
function nearCopies(folder) {
  const groups = new Map()
  for (const name of readdirSync(folder).filter((each) => each.endsWith(".html"))) {
    const slug = name.slice(0, -".html".length)
    const base = nearCopyOf(folder, slug)
    if (!base || nearCopyOf(folder, base)) continue
    groups.set(base, [...(groups.get(base) ?? []), slug])
  }
  return [...groups]
    .sort(([one], [other]) => one.localeCompare(other))
    .map(([base, copies]) => ({ base, copies: copies.sort((one, other) => copyNumber(one) - copyNumber(other)) }))
}

/**
 * Fold `copies` into page `base` in details folder `folder` (`foldCopies()`);  the files removed.
 * - `kind`:  `choices.js`, for choice pages;  `undefined` for details pages
 */
function foldGroup(folder, base, copies, kind) {
  const page = join(folder, `${base}.html`)
  const format = kind ? kind.formatAnswer : formatAnswer
  const rounds = roundsOf(page)
  let file = page
  let { document } = parseHTML(readFileSync(page, "utf8"))
  for (const copy of copies) {
    const next = join(folder, `${copy}.html`)
    const { document: into } = parseHTML(readFileSync(next, "utf8"))
    const answer = readAnswer(file)
    const sent = answer && format(file, answer)
    const typed = answer ? undefined : typedOn(file, kind)
    const asked = askedOf(document)
    const round = foldRound({ from: document, into, sent, typed, asked: askedOf(into) })
    rounds.push({ round, asked, ...(sent && { sent, answer: withoutRounds(answer) }) })
    file = next
    document = into
  }
  const rowsName = document.querySelector("[data-choices-rows] code")
  if (rowsName) rowsName.textContent = basename(DataFile.besidePage(page, "rows"))
  writeFileSync(page, serialize(document))
  // the newest copy's answer, rows and draft are the page's own now
  const answer = readAnswer(file)
  const path = (data) => ({ ...data, page: data.page?.replace(/[^/]+\.html$/, `${base}.html`) })
  DataFile.write(answerFile(page), { ...(answer && path(withoutRounds(answer))), rounds })
  if (kind) DataFile.write(DataFile.besidePage(page, "rows"), DataFile.read(DataFile.besidePage(file, "rows")))
  const draft = DataFile.read(draftFile(file))
  const unsent = draft && !(answer && !(Date.parse(draft.saved) > Date.parse(answer.answered)))
  if (unsent) DataFile.write(draftFile(page), path(draft))
  else DataFile.remove(draftFile(page))
  const gone = copyFiles(folder, copies)
  for (const each of gone) rmSync(each)
  return gone
}

/** What was typed on `file` and not sent, as its kind prints it;  `undefined` for nothing. */
function typedOn(file, kind) {
  if (!kind) {
    const draft = readDraft(file)
    return draft ? formatDraft(file, draft) : undefined
  }
  const draft = DataFile.read(kind.draftFile(file))
  return draft ? kind.formatAnswer(file, { ...draft, answered: draft.saved, changes: 0 }) : undefined
}

/** `answer` without its `rounds`:  one round's answer, as it was sent. */
function withoutRounds(answer) {
  const copy = { ...answer }
  delete copy.rounds
  return copy
}

/** Every file of the pages `copies` in `folder`:  each page and its answer, draft and rows, as they're there. */
function copyFiles(folder, copies) {
  return copies.flatMap((copy) => {
    const page = join(folder, `${copy}.html`)
    const data = ["answer", "draft", "rows"].map((kind) => DataFile.found(DataFile.besidePage(page, kind)))
    return [page, ...data].filter((file) => file && existsSync(file))
  })
}

/**
 * Point epic folder `epicFolder`'s own pages' links at `copies` (`details/event-names-2.html`, and a link's
 * `target`, `...-details-event-names-2-html`) at page `base`;  the files changed (or, `dryRun`, that would be).
 * - its epic page, its parts, its other details pages
 * - SIDE EFFECT:  rewrites those files, unless `dryRun`
 */
function relinkCopies(epicFolder, base, copies, { dryRun }) {
  const folders = [epicFolder, join(epicFolder, "parts"), join(epicFolder, "details")].filter((each) =>
    existsSync(each)
  )
  const files = folders.flatMap((folder) =>
    readdirSync(folder)
      .filter((name) => name.endsWith(".html") && !copies.includes(name.slice(0, -".html".length)))
      .map((name) => join(folder, name))
  )
  const changed = []
  for (const file of files) {
    const before = readFileSync(file, "utf8")
    let after = before
    for (const copy of copies)
      after = after
        .split(`details/${copy}.html`)
        .join(`details/${base}.html`)
        .split(`details-${copy}-html`)
        .join(`details-${base}-html`)
    if (after === before) continue
    changed.push(file)
    if (!dryRun) writeFileSync(file, after)
  }
  return changed
}

////////////////
// ## Answers
////////////////

/** `<slug>.answer.json5` beside page `<slug>.html`. */
export function answerFile(page) {
  return DataFile.besidePage(page, "answer")
}

/**
 * The answer sent for `page`'s round now (its old `.json` too), or `undefined`.
 * - a file holding only the earlier rounds' (`rounds`, `rounds.js`) is no answer yet
 */
export function readAnswer(page) {
  const answer = DataFile.read(answerFile(page))
  return isAnswer(answer) ? answer : undefined
}

/** Is answer file data `data` an answer:  anything but the earlier rounds alone (`rounds`, `epic ask round`)? */
function isAnswer(data) {
  return !!data && Object.keys(data).some((key) => key !== "rounds")
}

/**
 * "No answer yet" for `page`, naming the round before's when it has one (`epic ask answer <page> --round <n>`);
 * `tool`:  `ask`, or `choices` for a choice page.
 */
export function noAnswerYet(page, tool = "ask") {
  const before = roundsOf(page).at(-1)
  if (!before) return `no answer yet:  ${shown(page)}`
  const command = `epic ${tool} answer ${basename(page, ".html")} --round ${before.round}`
  return `no answer yet to round ${before.round + 1}:  ${shown(page)}  (round ${before.round}'s:  ${command})`
}

/** `answer --round <n>`:  print round `n` of `file` as it was sent;  exit code 0, or 1 for a round it hasn't had. */
function printRound(file, round) {
  const text = formatRound(file, Number(round))
  console.log(text ?? `no round ${round} of ${shown(file)}`)
  return text ? 0 : 1
}

/** `<slug>.draft.json5` beside page `<slug>.html`:  what's typed and not sent (`detailsRoutes.ts`). */
export function draftFile(page) {
  return DataFile.besidePage(page, "draft")
}

/**
 * The draft of `page` NEWER than its answer (an older one was sent already), or `undefined`.
 * - the draft's shape:  `detailsRoutes.ts` `DetailsDraft`
 */
export function readDraft(page) {
  const draft = DataFile.read(draftFile(page))
  if (!draft) return undefined
  const answer = readAnswer(page)
  return !answer || Date.parse(draft.saved) > Date.parse(answer.answered) ? draft : undefined
}

/**
 * `draft` of `page` as plain text, for Claude:  as an answer reads (`formatAnswer()`), under its own first line,
 * "Not sent:  typed on ... (draft saved ...)".
 */
export function formatDraft(page, draft) {
  const [, ...rest] = formatAnswer(page, { ...draft, answered: draft.saved, changes: 0 }).split("\n")
  return [`Not sent:  typed on "${titleOf(page)}" (${shown(page)}), draft saved ${draft.saved}:`, ...rest].join("\n")
}

/**
 * Wait for an answer to `page` sent after `since` (ms;  default:  now), checking every `poll` ms.
 * - returns the answer, or `undefined` once `timeout` ms pass
 * - newer than `since`:  a page asked again (Owen changed his answer) waits for the NEW one
 */
export async function waitForAnswer(page, { since = Date.now(), timeout, poll = POLL } = {}) {
  const file = answerFile(page)
  const end = Date.now() + timeout
  for (;;) {
    const found = DataFile.found(file)
    if (found && statSync(found).mtimeMs > since) {
      try {
        const answer = DataFile.parse(readFileSync(found, "utf8"))
        // a new round's file holds only the rounds before:  no answer yet
        if (isAnswer(answer)) return answer
      } catch {
        // mid-write (the route renames a whole file in, so this is unlikely):  look again next time
      }
    }
    if (Date.now() >= end) return undefined
    await new Promise((done) => setTimeout(done, clamp(end - Date.now(), 0, poll)))
  }
}

/**
 * `answer` to `page` as plain text, for Claude:  how many questions are decided, each question's title, the options
 * picked (with their titles), Other, the sections' comments, then the notes.
 * - a question with nothing picked:  "(not decided yet)":  Owen sends partial answers, and decides the rest later
 * - sent again:  what's new since the send before is marked "(new)" (`answer.changed`, the route's)
 */
export function formatAnswer(page, answer) {
  const { document } = parseHTML(readFileSync(page, "utf8"))
  const title = titleOf(page, document)
  const lines = [`Answer to "${title}" (${shown(page)}), sent ${answer.answered}:`]
  if (answer.changes) lines[0] += `  (sent ${answer.changes + 1}×)`
  const changed = new Set(answer.changes ? (answer.changed ?? []) : [])
  const isNew = (key) => (changed.has(key) ? "  (new)" : "")
  const questions = [...document.querySelectorAll(ASK)]
  const decided = questions.filter((question) => {
    const got = answer.answers?.[askKey(question)]
    return got?.picked?.length || got?.other
  })
  // a page of comment boxes alone (epic `epic-engine` r6) has no question to count
  if (questions.length) lines.push(`  ${decided.length} of ${questions.length} decided`)
  for (const question of questions) {
    const key = askKey(question)
    const got = answer.answers?.[key] ?? { picked: [] }
    const picked = got.picked.map((letter) => {
      const option = optionOf(question, letter)
      const recommended = option?.hasAttribute("recommended") ? " (recommended)" : ""
      return `${letter} · ${option?.getAttribute("title") ?? "?"}${recommended}`
    })
    if (got.other) picked.push(`Other:  ${got.other}`)
    lines.push(`  ${askHeader(question)}:  ${picked.join(";  ") || "(not decided yet)"}${isNew(key)}`)
  }
  // "Provide more details" (`moreDetails`):  `<question key>-more`, the options' letters
  for (const question of questions.filter((each) => each.hasAttribute("more-details"))) {
    const key = askKey(question)
    const more = answer.answers?.[`${key}-more`]?.picked ?? []
    if (more.length) lines.push(`  More details wanted on ${key}:  ${more.join(", ")}${isNew(`${key}-more`)}`)
  }
  // the comment box under each section that isn't a question, and under each option (`q1-B`)
  const comments = Object.entries(answer.comments ?? {})
  if (comments.length) lines.push("  Comments:")
  for (const [id, text] of comments) lines.push(`    ${commentPlace(document, id)}:  ${text}${isNew(`comment:${id}`)}`)
  if (answer.notes) lines.push(`  Notes:  ${answer.notes}${isNew("notes")}`)
  // text typed for questions, options or sections a rewrite took off the page (epic `epic-workflow` P18)
  if (answer.kept?.length) lines.push(`  Kept from before the page changed:${isNew("kept")}`)
  for (const { id, label, text } of answer.kept ?? []) lines.push(`    ${label} (${id}):  ${text}`)
  return lines.join("\n")
}

/** `page`'s title, its h1 (`document`:  the page, parsed);  else its file's name. */
function titleOf(page, document = parseHTML(readFileSync(page, "utf8")).document) {
  return document.querySelector("h1")?.textContent?.trim() ?? basename(page)
}

/**
 * Where comment `id` was written, for people:  a section's label (`1.2 What exists today`), or an option's question
 * and title (`Q1 · Revisit's colour, A · Blue`) for `<question id>-<letter>`;  else the id itself.
 */
function commentPlace(document, id) {
  const section = document.getElementById(id)
  if (section) return section.getAttribute("label") ?? id
  // a letter is `B`, or the item picker's item id (`J7`)
  const [, key, letter] = /^(.+)-([A-Z][A-Za-z0-9]*)$/.exec(id) ?? []
  const question = key && [...document.querySelectorAll(ASK)].find((each) => askKey(each) === key)
  const option = question && optionOf(question, letter)
  if (!option) return id
  return `${askHeader(question)}, ${letter} · ${option.getAttribute("title") ?? "?"}`
}

/** A question's (`<epic-ask>`) key:  its `name`, else its section's id, as the element works it out. */
export function askKey(question) {
  return question.getAttribute("name") ?? question.closest("ui-section[id]")?.id ?? ""
}

/** A question's title, for people:  its section's `label` (`Q1 · Which layout?`), else its key. */
function askHeader(question) {
  return question.closest("ui-section[id]")?.getAttribute("label") ?? askKey(question)
}

/** Option `letter` of question `question`:  its own options only, not one quoted in an option's text. */
function optionOf(question, letter) {
  return [...question.children]
    .filter((child) => child.localName === CHOICES)
    .flatMap((choices) => [...choices.children])
    .find((child) => child.localName === OPTION && child.getAttribute("letter") === letter)
}

/**
 * `wait`:  wait for `file`'s answer, print it;  exit code 0, or 2 on timeout.
 * - LISTENING meanwhile (epic `epic-engine` r6):  its heartbeat (`AskListeners.hold()`) makes the page's Send say
 *   "<epic> is listening";  gone as the wait ends
 */
async function waitAndPrint(file, flags) {
  const timeout = duration(flags.timeout ?? DEFAULT_TIMEOUT)
  console.log(`waiting for an answer on ${shown(file)} (up to ${flags.timeout ?? DEFAULT_TIMEOUT})`)
  const release = AskListeners.hold(file)
  const answer = await waitForAnswer(file, { timeout }).finally(release)
  if (!answer) {
    console.log(`no answer yet after ${flags.timeout ?? DEFAULT_TIMEOUT}:  ${shown(file)}`)
    return 2
  }
  console.log(formatAnswer(file, answer))
  return 0
}

////////////////
// ## Helpers
////////////////

/** `"8h"`, `"30m"`, `"90s"`, `"1h30m"` in ms. */
export function duration(text) {
  const parts = [...String(text).matchAll(/(\d+(?:\.\d+)?)\s*(h|m|s)/g)]
  if (!parts.length) throw new Error(`a duration is like 8h, 30m or 1h30m:  '${text}'`)
  const unit = { h: 3_600_000, m: 60_000, s: 1000 }
  return parts.reduce((total, [, amount, which]) => total + Number(amount) * unit[which], 0)
}

/** `file` as printed:  absolute, so it means the same wherever Claude reads it. */
export function shown(file) {
  return resolve(file)
}

/** `--key value` flags (`--wait` alone is `true`), plus everything else in order;  flags go AFTER the page. */
export function parseArgs(argv) {
  const positional = []
  const flags = {}
  for (let i = 0; i < argv.length; i++) {
    if (!argv[i].startsWith("--")) positional.push(argv[i])
    else if (i + 1 < argv.length && !argv[i + 1].startsWith("--")) flags[argv[i].slice(2)] = argv[++i]
    else flags[argv[i].slice(2)] = true
  }
  return { positional, flags }
}

// run as a script (`epic ask`), not when a test imports it;  last, so every `const` above is set
// - NOT a top-level `await`:  `fold` imports `choices.js`, which imports this file, and would wait for it forever
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  void main(process.argv.slice(2)).then((code) => (process.exitCode = code))
}
