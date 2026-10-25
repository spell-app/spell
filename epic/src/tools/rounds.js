/**
 * ROUNDS of one details page or choice page (epic `epic-engine` P37):  asking the same question again rewrites the
 * ONE page, never a second one (`event-names-2` beside `event-names`).
 * - Owen (2026-10-24):  "you updated the Event Names document several times, leaving multiple copies viable.
 *   Better to replace the one file."
 * - A new round (`epic ask round`, `epic choices round`):
 *   - the round before goes into the page, folded at the bottom ("Round 1 · 10/24 · what you sent"), with what was
 *     sent (`roundSection()`)
 *   - its answer moves into the answer file's `rounds` (`archiveAnswer()`):  the answer file keeps every round's,
 *     and its top is the newest round's alone
 *   - a draft typed and not sent stays, and comes back over the new round;  one that was sent goes (`dropSentDraft()`)
 * - `create` refuses a near-copy's slug (`nearCopyOf()`);  `epic ask fold` folds the copies made before this into
 *   their first page (`details.js` `foldCopies()`).
 * - Plain node JS, built on a parsed page (linkedom), in elements:  never HTML put together in strings.
 * - Imports neither `details.js` nor `choices.js`, which both use it:  what's kind-specific (how an answer prints)
 *   is passed in.
 */
import { existsSync } from "node:fs"
import { join } from "node:path"

import { DataFile } from "spell-epic/data/DataFile.ts"
import { SECTION_FLAGS, make, withCode } from "./answerPages.js"

/** The attribute that marks a folded round's `<ui-section>`, its number. */
export const ROUND = "data-round"

/** The "Asked" line of either page kind. */
const ASKED = "[data-details-asked], [data-choices-asked]"

/**
 * A near-copy's slug:  `<slug>-2`, `-round2`, `-round-2`, `-r2`, `-v2` ...;  [, the first page's slug, the number].
 * - only 2 to 99:  a dated slug (`bedtime-2026-10-25`) never reads as a round of `bedtime-2026-10`
 */
const NEAR_COPY = /^(.+?)-(?:round-?|r|v)?([2-9]|[1-9]\d)$/

////////////////
// ## Near-copies
////////////////

/**
 * The slug a page `slug` would be a second round of, in `folder`:  a page `<base>.html` there and `slug` its
 * near-copy (`NEAR_COPY`);  else `undefined`.
 */
export function nearCopyOf(folder, slug) {
  const [, base] = NEAR_COPY.exec(slug ?? "") ?? []
  return base && existsSync(join(folder, `${base}.html`)) ? base : undefined
}

/** The round number a near-copy's slug says (`event-names-3`:  3);  `undefined` for none. */
export function copyNumber(slug) {
  const [, , number] = NEAR_COPY.exec(slug) ?? []
  return number ? Number(number) : undefined
}

/**
 * The command that starts a new round of page `base` (a slug in `folder`), for a message:
 * `epic choices round <page> --rows <rows.json5>` for a choice page (its rows beside it), else `epic ask round <page>`.
 * - `epic`:  the page named `<epic>/<slug>`
 */
export function roundCommand(folder, base, epic) {
  const page = epic ? `${epic}/${base}` : base
  return DataFile.exists(DataFile.besidePage(join(folder, `${base}.html`), "rows"))
    ? `epic choices round ${page} --rows <rows.json5>`
    : `epic ask round ${page}`
}

/** `create`'s refusal of `slug` in `folder`, when it's a near-copy:  throws naming the `round` command. */
export function refuseNearCopy(folder, slug, epic) {
  const base = nearCopyOf(folder, slug)
  if (base)
    throw new Error(
      `${slug} is a second round of ${base}:  ${roundCommand(folder, base, epic)} rewrites that page, keeping round 1 in it`
    )
}

////////////////
// ## A page's rounds
////////////////

/** The folded rounds' sections of page `document`, newest first, as they stand. */
export function roundSections(document) {
  return [...document.querySelectorAll(`ui-section[${ROUND}]`)]
}

/** The round page `document` is on:  one more than its newest folded round;  1 for none. */
export function currentRound(document) {
  return Math.max(0, ...roundSections(document).map((section) => Number(section.getAttribute(ROUND)) || 0)) + 1
}

/** The date page `document` was asked, `YYYY-MM-DD`, from its "Asked" line;  `""` for none. */
export function askedOf(document) {
  return /\d{4}-\d\d-\d\d/.exec(document.querySelector(ASKED)?.textContent ?? "")?.[0] ?? ""
}

/**
 * Fold the round page `from` is on into page `into` (`from` itself, or the page rewritten for the next round):
 * its section (`roundSection()`) on top of the rounds folded before it, at the bottom of `into`.
 * - `sent`:  what was sent, as its answer prints (`formatAnswer()` of the page's kind);  none:  "nothing sent"
 * - `typed`:  what was typed and not sent, printed the same way:  only when nothing was sent
 * - `asked`:  `into`'s date, `YYYY-MM-DD`;  its "Asked" line becomes `<asked> · round <n>`
 * - the folded rounds of `from` move with it, newest first;  the round number folded
 */
export function foldRound({ from, into, sent, typed, asked }) {
  const round = currentRound(from)
  const older = roundSections(from).map((section) => (into === from ? section : into.importNode(section, true)))
  for (const section of roundSections(into)) section.remove()
  for (const section of older) section.remove()
  const folded = roundSection(into, { round, asked: askedOf(from), lede: ledeOf(from), sent, typed })
  placeRounds(into, [folded, ...older])
  const line = into.querySelector(ASKED)
  if (line) line.textContent = `${asked} · round ${round + 1}`
  return round
}

/**
 * One folded round's `<ui-section>`:  "Round 1 · 10/24 · what you sent", folded, holding what it asked (its lede)
 * and what was sent, as a list.
 * - nothing sent:  "nothing sent", and what was typed if anything was
 */
export function roundSection(document, { round, asked, lede, sent, typed }) {
  const day = asked ? `${Number(asked.slice(5, 7))}/${Number(asked.slice(8, 10))}` : ""
  const what = sent ? "what you sent" : typed ? "typed, not sent" : "nothing sent"
  const label = [`Round ${round}`, day, what].filter(Boolean).join(" · ")
  const lines = sent ?? typed
  return make(
    document,
    "ui-section",
    { id: `round-${round}`, [ROUND]: round, label, ...SECTION_FLAGS, collapsed: true },
    [
      make(document, "ui-icon", { slot: "icon", name: "history" }),
      ...(lede ? [make(document, "p", {}, [make(document, "b", {}, ["Asked:  "]), lede])] : []),
      lines ? linesList(document, answerLines(lines)) : make(document, "p", {}, ["Nothing was sent this round."])
    ]
  )
}

/**
 * Put round `sections` at the bottom of page `document`:  before its notes box (a details page) or its bar (a choice
 * page), so the page's own form stays last;  else at the end of its main column.
 */
function placeRounds(document, sections) {
  const anchor = document.querySelector('epic-text-box[type="notes"]') ?? document.querySelector("epic-choices-bar")
  if (anchor) anchor.before(...sections)
  else (document.querySelector("main") ?? document.body).append(...sections)
}

/** Page `document`'s lede as text, for its folded round;  `""` for none. */
function ledeOf(document) {
  return document.querySelector("p.lede")?.textContent?.trim().replace(/\s+/g, " ") ?? ""
}

/**
 * An answer as printed (`formatAnswer()`), as the lines a folded round shows:  its first line (the page's path and
 * when) and its rows file's line left out:  the round's label says when, and that file is the next round's.
 */
function answerLines(text) {
  return text
    .split("\n")
    .slice(1)
    .filter((line) => line.trim() && !/^\s*Rows:\s/.test(line))
}

/**
 * `lines`, indented as an answer prints them, as a nested `<ul>`:  a line indented deeper than the one before it
 * goes in a list under that one;  `` `code` `` as code.
 */
function linesList(document, lines) {
  const root = make(document, "ul")
  const stack = [{ depth: undefined, list: root, item: undefined }]
  for (const line of lines) {
    const depth = line.length - line.trimStart().length
    while (stack.length > 1 && depth < stack.at(-1).depth) stack.pop()
    let level = stack.at(-1)
    if (level.depth === undefined) level.depth = depth
    else if (depth > level.depth && level.item) {
      const list = make(document, "ul")
      level.item.append(list)
      level = { depth, list, item: undefined }
      stack.push(level)
    }
    level.item = make(document, "li", {}, withCode(document, line.trim()))
    level.list.append(level.item)
  }
  return root
}

////////////////
// ## Answers and drafts
////////////////

/**
 * Move the answer sent to `page`'s round `round` into its answer file's `rounds`, so the file's top is free for the
 * next round's;  the file keeps every round's answer.
 * - `rounds[]`:  `{ round, asked, sent?, answer? }`, oldest first;  `sent`, the answer as it printed (`answer
 *   --round <n>` prints it), `answer` as it was;  neither when nothing was sent
 * - `rounds`:  rounds to put first (a fold's, from the near-copies' files)
 * - SIDE EFFECT:  writes the answer file
 */
export function archiveAnswer(page, { round, asked, sent, answer, rounds = [] }) {
  const file = DataFile.besidePage(page, "answer")
  const before = DataFile.read(file) ?? {}
  const kept = [...(before.rounds ?? []), ...rounds]
  const sentAnswer = { ...answer }
  delete sentAnswer.rounds
  kept.push({ round, asked, ...(sent && { sent, answer: sentAnswer }) })
  DataFile.write(file, { rounds: kept })
  return kept
}

/** The rounds folded into `page`'s answer file (`archiveAnswer()`), oldest first;  `[]` for none. */
export function roundsOf(page) {
  return DataFile.read(DataFile.besidePage(page, "answer"))?.rounds ?? []
}

/**
 * Round `round` of `page` as `answer --round <n>` prints it:  what was sent, or that nothing was;
 * `undefined` for a round the page hasn't had.
 */
export function formatRound(page, round) {
  const found = roundsOf(page).find((each) => each.round === round)
  if (!found) return undefined
  return found.sent ?? `Round ${round} of ${page} (asked ${found.asked || "?"}):  nothing sent`
}

/**
 * Remove `page`'s draft when what it holds was sent (saved no later than `answer`):  it would come back over the new
 * round as typed;  a draft typed after the send, or with nothing sent, stays.
 * - SIDE EFFECT:  may delete the draft file
 */
export function dropSentDraft(page, answer) {
  const file = DataFile.besidePage(page, "draft")
  const draft = DataFile.read(file)
  if (draft && answer?.answered && !(Date.parse(draft.saved) > Date.parse(answer.answered))) DataFile.remove(file)
}
