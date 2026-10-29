import { PlanDates } from "spell/epic/dates"
import { ItemLetters } from "spell/epic/definitions"

/****************
 * ### `UpdateMarks`
 * Does a phase's CHANGE MARKS already say what an `<epic-update>` block would (epic `epic-engine` I159)?
 * - Owen, 2026-10-29, on P51's orange Update under its Q53 marks:  "Do we still need the orange update section like
 *   this?";  he picked "only when no mark says it"
 * - a plan change an ANSWER caused shows as its change marks alone (`<epic-change item="q53">`);  an Update block is
 *   for a change no item caused (a plan adjusted while building, a file moved)
 * - the rule, ONE place for both users:
 *   - `epic updated ... --for q53` (`PlanDoc.marksSay()`):  writes nothing when every item it's for has a mark in the
 *     phase
 *   - the migration `updates-said-by-marks`:  drops a block written in the same pass as the phase's marks
 * - STATIC, pure:  reads elements and text, changes nothing
 ****************/
export class UpdateMarks {
  /** How far apart a block and a mark may be stamped and still be ONE pass (a rewrite:  `change`, then `updated`). */
  static readonly SAME_PASS_MINUTES = 15

  /** The item ids `text` names, lower case, once each:  `Q53`, `j135`;  never a phase (`P5`) or a comment (`C3`). */
  static idsIn(text: string): string[] {
    return [...new Set(Array.from(text.matchAll(MENTIONED_ID), (match) => match[0].toLowerCase()))]
  }

  /**
   * Each item `phase`'s change marks name => when each was stamped (`undefined`:  not stamped yet, so this pass).
   * - marks in its Original Discussion don't count:  that's the record, not the plan
   */
  static marksIn(phase: Element): Map<string, (Date | undefined)[]> {
    const marks = new Map<string, (Date | undefined)[]>()
    for (const change of Array.from(phase.querySelectorAll("epic-change[item]"))) {
      if (change.closest("epic-original")) continue
      const item = change.getAttribute("item")!.toLowerCase()
      const at = change.getAttribute("at")
      const times = marks.get(item) ?? []
      times.push(at ? PlanDates.read(at)?.date : undefined)
      marks.set(item, times)
    }
    return marks
  }

  /**
   * The items of `ids` that `phase` has a change mark for;  with `near`, only marks of the same pass:
   * stamped within `SAME_PASS_MINUTES` of it, or not stamped yet.
   */
  static marked(phase: Element, ids: readonly string[], near?: Date): string[] {
    const marks = UpdateMarks.marksIn(phase)
    return ids.filter((id) =>
      (marks.get(id.toLowerCase()) ?? []).some((at) => !near || !at || UpdateMarks.samePass(at, near))
    )
  }

  /** Were `a` and `b` stamped in one pass:  within `SAME_PASS_MINUTES`? */
  static samePass(a: Date, b: Date): boolean {
    return Math.abs(a.getTime() - b.getTime()) <= UpdateMarks.SAME_PASS_MINUTES * 60 * 1000
  }

  /** Does `text` name a file (`src/x.ts`, `EpicChange.css`, `epic/skills/`):  something a change mark can't say? */
  static namesFile(text: string): boolean {
    return FILE.test(text)
  }
}

/** An item id in text:  each kind's letter (`ItemLetters`), then digits, as a word:  `Q53`, `j135`. */
const MENTIONED_ID = new RegExp(`\\b[${Object.values(ItemLetters).join("")}]\\d+\\b`, "gi")

/** A file or folder named in text:  a path with a slash, or a name with a code file's extension. */
const FILE = /\b[a-z][\w.-]*\/[a-z][\w-]*|\b[\w-]+\.(?:tsx?|m?js|css|html?|json5?|md|png)\b/i
