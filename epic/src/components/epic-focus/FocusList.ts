import { PageStages } from "spell/epic/phases"
import { inTestOrder } from "spell/epic/review"

import {
  FOCUS_KINDS,
  OPEN_STATES,
  WITH_CLAUDE,
  type FocusEntry,
  type FocusKind,
  type FocusKindLook
} from "./EpicFocus.types"

/****************
 * ### `FocusList`
 * What Focus mode walks on a page:  its open items and phases, a tab per kind, each tab filtered by its chips.
 * - ONE rule for which:  the page's own colour per item, handed in (`FocusReads.stateOf()`:  `DrawnState` for an item,
 *   `PhaseState` for a phase, as their chips draw them), kept when it's red, orange, blue or yellow (`OPEN_STATES`)
 * - kinds by the id's letter (`q7` a question);  a phase by its tag;  a todo that's a limit (`limit`) isn't walked
 * - in page order;  the Tests tab in Owen's order (`inTestOrder()`:  the prepared ones by their place, then the rest,
 *   deferred last)
 * - Plain DOM reads, static:  `<epic-focus>` calls them from its memos;  tests call them on any markup.
 * - NEVER reads the review inbox itself:  the caller says each element's state and whether it's marked.
 ****************/
export class FocusList {
  /**
   * The entries of `page` (an `<epic-page>`), tab by tab in `FOCUS_KINDS`' order.
   * - `pinned`:  the item showing now, kept whatever its state (Claude closed it while Owen was on it:  it stays until
   *   he moves on)
   * - a section the page's stage hides (`PageStages.hides()`) is left out
   */
  static of(page: ParentNode, reads: FocusReads, pinned?: string): FocusEntry[] {
    const byKind = new Map<FocusKind, FocusEntry[]>()
    for (const element of page.querySelectorAll(WALKED)) {
      const kind = FocusList.kindOf(element)
      if (!kind || PageStages.hides(element)) continue
      const state = reads.stateOf(element)
      if (!OPEN_STATES.has(state) && element.id !== pinned) continue
      const entry: FocusEntry = { id: element.id, kind, state, marked: reads.isMarked(element.id), element }
      byKind.set(kind, [...(byKind.get(kind) ?? []), entry])
    }
    return FOCUS_KINDS.flatMap(({ kind }) => FocusList.ordered(kind, byKind.get(kind) ?? []))
  }

  /** `element`'s tab:  a phase's, else its id's letter's;  `undefined` for anything Focus mode doesn't walk. */
  static kindOf(element: Element): FocusKind | undefined {
    if (element.localName === "epic-phase") return element.id ? "phases" : undefined
    const letter = ITEM_ID.exec(element.id)?.[1]?.toLowerCase()
    if (!letter || element.hasAttribute("limit")) return undefined
    return FOCUS_KINDS.find((look) => look.letter === letter && look.kind !== "phases")?.kind
  }

  /**
   * The entries that show, of `entries`, with each tab's chips `shown` (the states showing;  a tab without, every one).
   * - never hidden:  the pinned item, one marked in this pass, one Claude is on (`progress`:  the blue badge, no chip)
   */
  static visible(
    entries: readonly FocusEntry[],
    shown: Partial<Record<FocusKind, readonly string[]>>,
    pinned?: string
  ): FocusEntry[] {
    return entries.filter((entry) => {
      const states = shown[entry.kind]
      if (!states || entry.id === pinned || entry.marked || entry.state === WITH_CLAUDE) return true
      return states.includes(entry.state)
    })
  }

  /** The tabs with entries, in order:  each kind's look. */
  static tabsOf(entries: readonly FocusEntry[]): FocusKindLook[] {
    return FOCUS_KINDS.filter(({ kind }) => entries.some((entry) => entry.kind === kind))
  }

  /** `kind`'s entries in its order:  the Tests tab Owen's (`inTestOrder()`), the rest as the page has them. */
  private static ordered(kind: FocusKind, entries: FocusEntry[]): FocusEntry[] {
    if (kind !== "tests") return entries
    const tests = entries.map((entry) => ({
      entry,
      prepared: entry.element.getAttribute("prepared"),
      deferred: entry.element.getAttribute("deferred")
    }))
    return inTestOrder(tests).map((test) => test.entry)
  }
}

/** What `FocusList.of()` asks of its caller, per element. */
export type FocusReads = {
  /** its state as the page draws it:  `attention` ... */
  stateOf(element: Element): string
  /** marked in this pass, not applied yet */
  isMarked(id: string): boolean
}

/** What Focus mode walks:  a section's phases and items (an Overview's parts are prose, not walked). */
const WALKED = ":scope > epic-section > epic-phase, :scope > epic-section > epic-item"

/** An item's id, its kind's letter first:  `q7`, `M3`. */
const ITEM_ID = /^([qtjim])\d+$/i
