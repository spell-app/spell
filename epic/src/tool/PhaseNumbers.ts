import { escapeRegExp } from "spell/util/string"

import { PhaseIds } from "spell-epic/phases"

import { PlanItem } from "./PlanItem"

/****************
 * ### `PhaseNumbers`
 * Keeping what names a phase by its NUMBER right when numbers change (epic `epic-engine` P34, I126):
 * a phase moved (`epic move`, a drag), inserted (`add-phase --before`, `--after`, before the Doc Review), or an old
 * decimal phase (P11.1) made whole.
 * - What names a phase by number:  items' and updates' `phase`, an older doc's `<epic-updated of>`, the `P5` in the
 *   words of links to a phase (`href="#<its id>"`), and every `P5 · <its name>` in the page's words (`relabelNames()`)
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
    for (const [id, was] of before) {
      const to = now.get(id)
      if (!to || to === was) continue
      for (const link of document.querySelectorAll(`a[href="#${id}"]`))
        link.innerHTML = link.innerHTML.replace(PhaseNumbers.labelPattern(was), `P${to}`)
    }
    return true
  }

  /**
   * Every `P8 · <name>` naming a phase by its number AND its name, in the page's words and attributes (a queued
   * item's `work`, a Noted card's "Queued for P8 · ...", an Update block's `summary` or prose), said with the phase's
   * number NOW (epic `epic-engine` r21;  Owen, 2026-10-24:  keep renumbering, and fix the text that names numbers).
   * - by name, so it's idempotent, and mends text left stale before;  an old decimal (`P17.1 · Name`) too
   * - a bare `P8` with no name is left:  it may mean anything
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
