import { escapeRegExp } from "spell/util/string"

import { PhaseIds } from "spell/epic/phases"

import { PlanItem } from "./PlanItem"

/****************
 * ### `PhaseNumbers`
 * Keeping what names a phase by its NUMBER right when numbers change (epic `epic-engine` P34, I126):
 * a phase moved (`epic move`, a drag), inserted (`add-phase --before`, `--after`, before the Doc Review), or an old
 * decimal phase (P11.1) made whole.
 * - What names a phase by number:  items' and updates' `phase`, an older doc's `<epic-updated of>`, every bare `P5`
 *   in the page's words (`followMentions()`, I137), the `P5` in the words of links to a phase (`href="#<its id>"`),
 *   and every `P5 · <its name>` (`relabelNames()`)
 * - The record keeps the numbers it said:  the log, an Original Discussion, commits, Owen's words quoted
 * - Every number is whole (I126;  Owen, 2026-10-25:  "ditch the 17.1 and just reorder"):  a phase's number is its
 *   place;  the decimals P39 wrote go, by the migration `whole-phase-numbers` (`makeWhole()`)
 * - STATIC and instance-free:  `PlanDoc` and that migration both run it on a document
 ****************/
export class PhaseNumbers {
  /** Each phase's number now, by its id:  what `follow()` compares with, once numbers changed. */
  static snapshot(document: Document): Map<string, string> {
    return new Map(PhaseIds.phasesIn(document).map((phase) => [phase.id, PhaseIds.numberOf(phase)]))
  }

  /**
   * Every old DECIMAL phase (`<epic-phase number="17.1">`, epic `epic-engine` P39) a whole one, numbered by its place,
   * IN PLACE;  the phases after it move down one, and everything naming them follows (`follow()`, `relabelNames()`).
   * - returns what changed, as `P17.1 -> P18` lines, in page order;  `[]` when the page has no decimal
   */
  static makeWhole(document: Document): string[] {
    const phases = PhaseIds.phasesIn(document)
    const decimals = phases.filter((phase) => PhaseIds.decimalOf(phase))
    if (!decimals.length) return []
    const before = PhaseNumbers.snapshot(document)
    for (const phase of decimals) phase.removeAttribute("number")
    if (PhaseNumbers.follow(document, before)) PhaseNumbers.relabelNames(document)
    return phases
      .filter((phase) => before.get(phase.id) !== PhaseIds.numberOf(phase))
      .map((phase) => `P${before.get(phase.id)} -> ${PhaseIds.labelOf(phase)}`)
  }

  /**
   * After phase numbers changed:  everything naming one by number says its number now, from `before`
   * (`snapshot()`, taken before the change), ALL AT ONCE, so a number another phase takes is never renamed twice.
   * - items' and updates' `phase`, an older doc's `<epic-updated of>`
   * - every bare `P18` in the page's words (`followMentions()`):  `P18` => `P19`, and P19 => P20, never P21
   * - the `P5 · <name>` text in the page's words is `relabelNames()`'s:  run it after, when this returns `true`
   * - returns whether any phase's number changed
   */
  static follow(document: Document, before: ReadonlyMap<string, string>): boolean {
    const now = PhaseNumbers.snapshot(document)
    const numbers = new Map<string, string>()
    for (const [id, was] of before) {
      const to = now.get(id)
      if (to !== undefined && to !== was) numbers.set(was, to)
    }
    if (!numbers.size) return false
    const pointers = Array.from(document.querySelectorAll(PHASE_POINTERS.map((tag) => `${tag}[phase]`).join()))
    const lines = Array.from(document.querySelectorAll("epic-updated[of]"))
    for (const element of pointers) {
      const to = numbers.get(element.getAttribute("phase") ?? "")
      if (to) element.setAttribute("phase", to)
    }
    for (const line of lines) {
      const to = numbers.get(line.getAttribute("of") ?? "")
      if (to) line.setAttribute("of", to)
    }
    PhaseNumbers.followMentions(document, numbers)
    // a link to a phase is a pointer, not quoted words:  its `P5` follows in the record too
    for (const [id, was] of before) {
      const to = now.get(id)
      if (!to || to === was) continue
      for (const link of document.querySelectorAll(`a[href="#${id}"]`))
        if (link.closest(KEPT_WORDS)) link.innerHTML = link.innerHTML.replace(PhaseNumbers.labelPattern(was), `P${to}`)
    }
    return true
  }

  /**
   * Every bare `P18` naming one of this epic's phases, in the page's words and attributes (a queued item's `work`,
   * an Update block's `summary`, an item's `title`), said with its number now, by `numbers` (old => new), in ONE
   * pass:  P18 => P19 and P19 => P20 never chain (epic `epic-engine` I137).
   * - ranges too, each end:  `P17-P20`, `P17–P20`, `P17-20`;  a possessive is a word end:  `P20's`
   * - this epic's by name, `epic-engine P46`, follows;  another epic's is left:  `ui-gaps P6`, `` `seo` P7 ``,
   *   `epic seo P7`, `seo#P7`
   * - the record keeps its numbers:  the log, an Original Discussion, commits, Owen's words quoted (`<q>`,
   *   `<blockquote>`, the kickoff prompt) and code blocks
   * - returns how many texts it changed
   */
  static followMentions(document: Document, numbers: ReadonlyMap<string, string>): number {
    const page = document.querySelector("epic-page")
    if (!page || !numbers.size) return 0
    const epic = page.getAttribute("epic") ?? ""
    const say = (text: string, said = "") =>
      text.replace(
        MENTION,
        (whole: string, from: string, gap: string | undefined, to: string | undefined, at: number) => {
          if (namesAnotherEpic(said + text.slice(0, at), epic)) return whole
          const ends = [from, to].map((n) => n && (numbers.get(n) ?? n))
          return `P${ends[0]}${gap ?? ""}${ends[1] ?? ""}`
        }
      )
    let changed = 0
    // the words just before each text, a code span's in backticks:  what says whose phase a `P6` is
    let said = ""
    const walker = document.createTreeWalker(page, 4 /* NodeFilter.SHOW_TEXT */)
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      const text = node.nodeValue ?? ""
      if (!node.parentElement?.closest(KEPT_WORDS)) {
        const next = say(text, said)
        if (next !== text) {
          node.nodeValue = next
          changed++
        }
      }
      said = (said + (node.parentElement?.closest("code") ? `\`${text}\`` : text)).slice(-SAID_LENGTH)
    }
    for (const element of page.querySelectorAll(MENTION_ATTRIBUTES.map((name) => `[${name}]`).join())) {
      if (element.closest(KEPT_WORDS)) continue
      for (const name of MENTION_ATTRIBUTES) {
        const value = element.getAttribute(name)
        if (!value || (name === "title" && element.localName !== "epic-item")) continue
        const next = say(value)
        if (next === value) continue
        element.setAttribute(name, next)
        changed++
      }
    }
    return changed
  }

  /**
   * Every `P8 · <name>` naming a phase by its number AND its name, in the page's words and attributes (a queued
   * item's `work`, a Noted card's "Queued for P8 · ...", an Update block's `summary` or prose), said with the phase's
   * number NOW (epic `epic-engine` r21;  Owen, 2026-10-24:  keep renumbering, and fix the text that names numbers).
   * - by name, so it's idempotent, and mends text left stale before;  an old decimal (`P17.1 · Name`) too
   * - a bare `P8` with no name follows by NUMBER, as numbers change (`followMentions()`, from `follow()`)
   * - history keeps its numbers:  the log, an Original Discussion
   * - returns how many it changed
   */
  static relabelNames(document: Document): number {
    const page = document.querySelector("epic-page")
    if (!page) return 0
    const labels = PhaseIds.phasesIn(document).map((element) => ({
      name: PlanItem.titleOf(element),
      n: PhaseIds.numberOf(element)
    }))
    // the longest first:  `Event Model` before `Event`
    const named = labels.filter((label) => label.name).sort((a, b) => b.name.length - a.name.length)
    if (!named.length) return 0
    const pattern = new RegExp(
      `\\bP\\d+(?:\\.\\d+)?( · (?:${named.map((label) => escapeRegExp(label.name)).join("|")}))(?![\\w-])`,
      "g"
    )
    const byName = new Map(named.map((label) => [label.name, label.n]))
    const relabel = (text: string) =>
      text.replace(pattern, (whole: string, rest: string) => `P${byName.get(rest.slice(3))}${rest}`)
    let changed = 0
    const walker = document.createTreeWalker(page, 4 /* NodeFilter.SHOW_TEXT */)
    for (let node = walker.nextNode(); node; node = walker.nextNode()) {
      if (node.parentElement?.closest(HISTORY)) continue
      const text = node.nodeValue ?? ""
      const next = relabel(text)
      if (next !== text) {
        node.nodeValue = next
        changed++
      }
    }
    for (const element of page.querySelectorAll("[work], [summary]")) {
      if (element.closest(HISTORY)) continue
      for (const name of ["work", "summary"]) {
        const value = element.getAttribute(name)
        if (!value) continue
        const next = relabel(value)
        if (next === value) continue
        element.setAttribute(name, next)
        changed++
      }
    }
    return changed
  }

  /**
   * `P<number>` as a word, for finding it in text:  `P11` never matches inside `P11.1`, nor `P1` inside `P11`.
   * - `flags`:  `g` for every one
   */
  static labelPattern(number: string, flags = ""): RegExp {
    return new RegExp(`\\bP${number.replace(".", "\\.")}(?![\\w]|\\.\\d)`, flags)
  }
}

/** The elements whose `phase` names a phase by number:  the one active when they were written. */
const PHASE_POINTERS = ["epic-item", "epic-update", "epic-updated"]

/** What keeps the numbers it said:  the log, an Original Discussion (`relabelNames()`). */
const HISTORY = 'epic-section[kind="log"], epic-original'

/**
 * What keeps its bare `P18`s when numbers change (`followMentions()`):  the record, as it was said.
 * - the log and an Original Discussion (`HISTORY`), log lines and commits wherever they are
 * - Owen's words quoted:  `<q>`, `<blockquote>`, the kickoff prompt (an older doc's `[slot="prompt"]`)
 * - code blocks
 */
const KEPT_WORDS = `${HISTORY}, epic-event, epic-commit, q, blockquote, epic-prompt, [slot="prompt"], pre, epic-code`

/**
 * A bare `P18`, or a range of two (`P17-P20`, `P17 – P20`, `P17-20`), as a word:  never inside `P18.1` or `IP18`,
 * nor an address (`seo#P7`, `SAGA:/x/y:P7`).
 * - groups:  the first number;  the range's dash (with its `P`);  its second number
 */
const MENTION = /(?<![#:.\w-])P(\d+(?:\.\d+)?)(?:(\s*[-–]\s*P|[-–]P?)(\d+(?:\.\d+)?))?(?!\w|\.\d)/g

/** The attributes whose words name phases (`followMentions()`);  `title` only an item's. */
const MENTION_ATTRIBUTES = ["work", "summary", "title"]

/** How much of the words before a text `followMentions()` keeps:  enough for an epic's id and `epic`. */
const SAID_LENGTH = 80

/**
 * Do the words just before a `P6` (`before`) name an epic other than `epic`, making it that epic's phase?
 * - an id with a dash (`ui-gaps P6`), one in a code span (`` `seo` P7 ``), or after `epic` (`epic seo P7`);  a
 *   possessive (`ui-gaps's P6`) too
 * - NOT a plain word:  "goes to P18" is this epic's
 */
function namesAnotherEpic(before: string, epic: string): boolean {
  const named = NAMED_EPIC.exec(before)
  const id = named && (named[1] ?? named[2] ?? named[3])
  return Boolean(id) && id !== epic
}

/** The end of the words before a `P6` naming an epic:  `` `seo` ``, `ui-gaps`, `epic seo`;  `'s` after any. */
const NAMED_EPIC =
  /(?:`([a-z0-9][\w-]*)`|(?<![\w-])([a-z0-9]+(?:-[a-z0-9]+)+)|\bepics?\s+([a-z0-9][\w-]*))(?:['’]s)?\s*$/
