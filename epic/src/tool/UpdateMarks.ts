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
 * - and is a block OWEN'S OWN ANSWER, carried out (`owensAnswer()`, epic `epic-engine` I179):  no news for him, so
 *   it's written seen
 *   - every write (`PlanDoc.updateUpdates()`, `updated --for`), and the migration `owens-answers-seen`
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

  /**
   * The items Owen answered that Update block `block` carries out, upper case;  `[]`:  a change Claude made on its
   * own, news for Owen (epic `epic-engine` I179).
   * - Owen, 2026-10-29, on debut's P21 and P22 drawn orange for blocks recording his own picks on Q39 and Q41:
   *   "If its 'accepting the update' I shouldn't have to do that if you are doing what I said."
   * - `forIds` (`updated --for q39`):  the items the change is for;  Owen's when EVERY one is
   * - none given:  the ids `block` names, in its words, summary or links (`#q39`);  Owen's when it names one,
   *   EVERY one is his, and it names no file (a move) and no estimate (a scope change):  more than his answer said
   * - Owen's:  `isOwens()`
   */
  static owensAnswer(block: Element, forIds?: readonly string[]): string[] {
    const text = `${block.getAttribute("summary") ?? ""} ${block.textContent ?? ""}`.replace(/\s+/g, " ")
    let ids = forIds?.map((id) => id.toLowerCase())
    if (!ids) {
      if (UpdateMarks.namesFile(text) || UpdateMarks.namesEstimate(text)) return []
      const linked = Array.from(block.querySelectorAll("a[href]"), (link) => link.getAttribute("href")!.split("#")[1])
      ids = [
        ...new Set([
          ...UpdateMarks.idsIn(text),
          ...Array.from(text.matchAll(MENTIONED_COMMENT), (match) => match[0].toLowerCase()),
          ...linked.filter((id) => !!id && LINKED_ID.test(id)).map((id) => id.toLowerCase())
        ])
      ]
    }
    const document = block.ownerDocument
    return ids.length && ids.every((id) => UpdateMarks.isOwens(document, id)) ? ids.map((id) => id.toUpperCase()) : []
  }

  /**
   * Is `id` Owen's answer:  an item he answered (`answered`), decided, picked in (`<epic-choices chosen>`), or that a
   * phase took up or handled (`taken-in`, `handled`);  or a comment (`c3`), his words?
   */
  static isOwens(document: Document, id: string): boolean {
    if (COMMENT_ID.test(id)) return true
    const item = document.getElementById(id.toLowerCase())
    if (item?.localName !== "epic-item") return false
    if (OWENS_MARKS.some((name) => item.hasAttribute(name))) return true
    return item.getAttribute("status") === "decided" || !!item.querySelector("epic-choices[chosen]")
  }

  /** Does `text` name an estimate (`the estimate goes from 8-12h to 11-16h`):  a scope change, more than an answer? */
  static namesEstimate(text: string): boolean {
    return ESTIMATE.test(text)
  }

  /** Does `text` name a file (`src/x.ts`, `EpicChange.css`, `epic/skills/`):  something a change mark can't say? */
  static namesFile(text: string): boolean {
    return FILE.test(text)
  }
}

/** An item id in text:  each kind's letter (`ItemLetters`), then digits, as a word:  `Q53`, `j135`. */
const MENTIONED_ID = new RegExp(`\\b[${Object.values(ItemLetters).join("")}]\\d+\\b`, "gi")

/** A comment id in text, as a word:  `C3`. */
const MENTIONED_COMMENT = /\bc\d{1,4}\b/gi

/** A comment id, whole:  `c3`. */
const COMMENT_ID = /^c\d{1,4}$/i

/** A link's `#id` naming an item or a comment:  `q39`, `c3`. */
const LINKED_ID = new RegExp(`^[${Object.values(ItemLetters).join("")}c]\\d+$`, "i")

/** An item's attributes saying Owen's answer is in:  answered, or taken up or handled in a phase. */
const OWENS_MARKS = ["answered", "taken-in", "handled"] as const

/** An estimate in text:  the word, or a duration in hours (`4-5h`, `1.5h`):  a scope change. */
const ESTIMATE = /\bestimate\b|\b\d+(?:\.\d+)?(?:-\d+(?:\.\d+)?)?h\b/i

/** A file or folder named in text:  a path with a slash, or a name with a code file's extension. */
const FILE = /\b[a-z][\w.-]*\/[a-z][\w-]*|\b[\w-]+\.(?:tsx?|m?js|css|html?|json5?|md|png)\b/i
