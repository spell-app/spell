import { Markup } from "spell-epic/markup"
import { PhaseIds } from "spell-epic/phases"

/****************
 * ### `PhaseTakes`
 * Which PHASE took an item up:  `<epic-item taken-in="p-fix-open-issues">`, drawn as a grey `in P1` at its line's
 * end, linking the phase (epic `epic-engine` I128;  Owen, 2026-10-25:  "issues should say "in P14" like questions do").
 * - a question's answer rewritten into a phase's text says so already, `handled` (P31);  this is the same chip for
 *   everything else a phase did:  issues above all, todos, judgement calls, decisions
 * - NOT `handled`:  that's also a STATE (grey, "its answer is in that phase's text now"), and Reopen on its change
 *   mark takes it off;  a fixed issue stays green, done, and only gains the link
 * - written two ways, ONE fact in the markup that the page and `epic` both read:
 *   - as it happens:  an issue or todo closed while a phase is active is taken in that phase (`PlanDoc.setItem()`)
 *   - from the page (`stamp()`):  a closed item that a phase's text links, `<a href="#i1">` or
 *     `<epic-link item="i1">`, is taken in that phase;  every edit runs it (`PlanDoc.updateStates()`), and so does
 *     the migration `taken-in-phase` for the pages nobody edits
 * - which phase, when several link it:  the one that CLOSED it, the LATEST done one in page order, else the active one
 *   - a phase still to do only plans to:  it takes nothing yet
 *   - earlier phases link an issue while it's open (filing it, planning around it);  the last done one is where the
 *     fix landed
 * - left alone:  an item already `taken-in` (the first answer stands), one `handled`, a test (its run says where), one
 *   open or canceled (moot:  nothing was done);  reopening an item takes it off (`PlanDoc.setItem()`)
 * - links that don't count:  a phase's "To review" field (it lists open items ADDED during the phase, not taken up),
 *   and links inside an item nested in the phase
 * - STATIC and instance-free on purpose:  the tool and the migration call the one rule on a document
 ****************/
export class PhaseTakes {
  /**
   * Stamp `taken-in` on every closed item of `document` (assembled:  phase bodies in) that a done or active phase's
   * text links, by the rule above;  returns the ids stamped, in page order (none:  `[]`).
   */
  static stamp(document: Document): string[] {
    const takers = PhaseTakes.takers(document)
    const stamped: string[] = []
    for (const item of Array.from(document.querySelectorAll("epic-page > epic-section > epic-item"))) {
      if (!PhaseTakes.canTake(item) || item.hasAttribute("taken-in")) continue
      const phase = takers.get(item.id)
      if (!phase) continue
      Markup.set<"epic-item">(item, { takenIn: phase.id })
      stamped.push(item.id)
    }
    return stamped
  }

  /** Can a phase take `item` up?  Closed (done or decided), not a test, not `handled` in a phase already. */
  static canTake(item: Element): boolean {
    return (
      CLOSED_BY_WORK.has(item.getAttribute("status") ?? "") && !TEST_ID.test(item.id) && !item.hasAttribute("handled")
    )
  }

  /** Is `item` work a phase does as it closes it:  an issue, or a todo (a `c` that isn't a caveat's `limit`)? */
  static isWork(item: Element): boolean {
    return ISSUE_ID.test(item.id) || (TODO_ID.test(item.id) && !item.hasAttribute("limit"))
  }

  /**
   * Each item id => the phase that took it, by link:  the LATEST done phase linking it, else the latest active one.
   * - phases walked in page order, so a later one replaces an earlier one of the same rank
   */
  private static takers(document: Document): Map<string, Element> {
    const done = new Map<string, Element>()
    const active = new Map<string, Element>()
    for (const phase of PhaseIds.phasesIn(document)) {
      const status = phase.getAttribute("status")
      const into = status === "done" ? done : status === "active" ? active : undefined
      if (!into) continue
      for (const id of PhaseTakes.linkedIds(phase)) into.set(id, phase)
    }
    for (const [id, phase] of active) if (!done.has(id)) done.set(id, phase)
    return done
  }

  /**
   * The item ids phase `phase`'s text links or marks (lower case:  `<a href="#i1">`, `<epic-link item>`,
   * `<epic-mark item>`), its "To review" field and nested items left out.
   */
  private static linkedIds(phase: Element): Set<string> {
    const ids = new Set<string>()
    for (const link of Array.from(phase.querySelectorAll('a[href^="#"], epic-link[item], epic-mark[item]'))) {
      if (link.closest(TO_REVIEW) || link.closest("epic-item")) continue
      if (link.localName === "epic-link" && link.getAttribute("epic")) continue
      const id = (
        link.localName === "a" ? link.getAttribute("href")!.slice(1) : link.getAttribute("item")!
      ).toLowerCase()
      if (ITEM_ID.test(id)) ids.add(id)
    }
    return ids
  }
}

/** The statuses that mean a phase's work closed it:  never `canceled` (made moot) or `open`. */
const CLOSED_BY_WORK = new Set(["done", "decided"])

/** An item id, as a link names it:  `i1`, `q13`, `d7`. */
const ITEM_ID = /^[a-z]{1,2}\d+$/

/** A test's id:  its run says where it passed. */
const TEST_ID = /^t\d+$/

/** An issue's id. */
const ISSUE_ID = /^i\d+$/

/** A todo's (or caveat's) id:  the `limit` attribute tells them apart. */
const TODO_ID = /^c\d+$/

/** A phase's "To review" field. */
const TO_REVIEW = 'epic-field[name="to-review"]'
