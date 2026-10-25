import { Markup } from "spell-epic/markup"
import { PhaseIds } from "spell-epic/phases"

/****************
 * ### `PhaseNumbers`
 * Keeping what names a phase by its NUMBER right when numbers change (epic `epic-engine` P34, P39):
 * a phase moved (`epic move`, a drag), inserted with `add-phase --before`, or a decimal phase (P11.1) out of place.
 * - What names a phase by number:  items' and updates' `phase`, an older doc's `<epic-updated of>`, and the `P5` in
 *   the words of links to a phase (`href="#<its id>"`)
 * - The `P5 · <name>` text in the page's prose is `PlanDoc.relabelPhaseNames()`'s, which knows the page's history
 * - STATIC and instance-free:  `PlanDoc` and the migration `decimal-phases-agree` both run it on a document
 ****************/
export class PhaseNumbers {
  /** Each phase's number now, by its id:  what `follow()` compares with, once numbers changed. */
  static snapshot(document: Document): Map<string, string> {
    return new Map(PhaseIds.phasesIn(document).map((phase) => [phase.id, PhaseIds.numberOf(phase)]))
  }

  /**
   * Give each decimal phase out of place (`PhaseIds.misplacedDecimals()`) the number that fits it, IN PLACE;
   * returns what changed, as `P11.1 -> P10.1` lines.
   * - one with no whole-numbered phase before it becomes whole:  its `number` goes
   */
  static fixDecimals(document: Document): string[] {
    return PhaseIds.misplacedDecimals(PhaseIds.phasesIn(document)).map(({ phase, number }) => {
      const was = PhaseIds.labelOf(phase)
      Markup.set<"epic-phase">(phase, { number: number ?? undefined })
      return `${was} -> ${PhaseIds.labelOf(phase)}`
    })
  }

  /**
   * After phase numbers changed:  everything naming one by number says its number now, from `before`
   * (`snapshot()`, taken before the change), ALL AT ONCE, so a number another phase takes is never renamed twice.
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
   * `P<number>` as a word, for finding it in text:  `P11` never matches inside `P11.1`, nor `P1` inside `P11`.
   * - `flags`:  `g` for every one
   */
  static labelPattern(number: string, flags = ""): RegExp {
    return new RegExp(`\\bP${number.replace(".", "\\.")}(?![\\w]|\\.\\d)`, flags)
  }
}

/** The elements whose `phase` names a phase by number:  the one active when they were written. */
const PHASE_POINTERS = ["epic-item", "epic-update", "epic-updated"]
