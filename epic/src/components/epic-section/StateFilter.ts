/****************
 * ### `StateFilter`
 * The state filter's click rule (and its ⌥-click's), shared by a section's chips (`<epic-section>`)
 * and the page's (`<epic-page>`'s toolbar, which filters every section at once).
 * - Pure:  states in, states out;  no DOM, no Solid.
 * - What Claude is on (`WITH_CLAUDE`, blue) has NO chip:  it counts in the blue badge, and no click hides it
 *   (epic `epic-engine` I188:  the badge counted 5 blue items while an ⌥-click had hidden them all).
 *   Every owner filters by this one rule:  `<epic-state-filter>`, `<epic-section>`, the page's toolbar, Focus mode.
 * - The docs runtime's lists (the Epics list page) filter by the `shown` the chip element sends:  this rule too.
 ****************/
export class StateFilter {
  /**
   * What shows after a click on `clicked`'s chip, of the states `present`, `shown` showing now
   * (Owen, 2026-10-10:  "if all states are showing and I click one state, I want you to show just that state"):
   * - everything showing:  only `clicked`
   * - `clicked` hidden:  it shows too, the others as they are
   * - `clicked` showing, and others too:  it hides
   * - `clicked` the only one showing:  everything again
   * - in `present`'s order
   * - what Claude is on (`WITH_CLAUDE`) has no chip:  in the result whenever present
   * - `how`:  `only` for an ⌥-click (epic `epic-engine` I166;  Owen, 2026-10-29:  "if I option-click on one of those
   *   badges, turn just that one on"):  only `clicked`, whatever shows now
   */
  static nextShown(
    present: readonly string[],
    shown: readonly string[],
    clicked: string,
    how: ChipPick = "click"
  ): string[] {
    const next = StateFilter.nextChipsShown(StateFilter.chipStatesOf(present), shown, clicked, how)
    return present.filter((state) => state === WITH_CLAUDE || next.includes(state))
  }

  /** The states of `present` with a chip of their own:  all but what Claude is on (`WITH_CLAUDE`, the blue badge). */
  static chipStatesOf(present: readonly string[]): string[] {
    return present.filter((state) => state !== WITH_CLAUDE)
  }

  /**
   * Does the filter hide an item (or phase) in `state` while `shown` shows?
   * - NEVER one Claude is on (`WITH_CLAUDE`):  it has no chip to show it again
   */
  static hides(state: string, shown: ReadonlySet<string> | readonly string[]): boolean {
    if (state === WITH_CLAUDE) return false
    return "has" in shown ? !shown.has(state) : !shown.includes(state)
  }

  /** `nextShown()`'s rule over the chips alone. */
  private static nextChipsShown(chips: string[], shown: readonly string[], clicked: string, how: ChipPick): string[] {
    if (how === "only") return [clicked]
    const showing = chips.filter((state) => shown.includes(state))
    if (showing.length === chips.length) return [clicked]
    if (!showing.includes(clicked)) return chips.filter((state) => state === clicked || showing.includes(state))
    if (showing.length === 1) return [...chips]
    return showing.filter((state) => state !== clicked)
  }

  /**
   * What a click on `clicked`'s chip does, in a word, for its tooltip (`nextShown()`):
   * `all` (everything shows again), `only`, `also` (it shows too) or `hide`.
   */
  static clickDoes(present: readonly string[], shown: readonly string[], clicked: string): ChipClick {
    const chips = StateFilter.chipStatesOf(present)
    const next = StateFilter.chipStatesOf(StateFilter.nextShown(present, shown, clicked))
    if (next.length === chips.length) return "all"
    if (next.length === 1 && next[0] === clicked) return "only"
    return next.includes(clicked) ? "also" : "hide"
  }
}

/**
 * The state of what Claude is working on (blue):  no chip of its own, it counts in the blue badge
 * (`<epic-state-filter>`'s `markedCount`), and NEVER hides (`StateFilter.hides()`).
 */
export const WITH_CLAUDE = "progress"

/** How a chip was picked:  a plain click (`nextShown()`'s rule), or an ⌥-click (`only` its state). */
export type ChipPick = "click" | "only"

/** What a chip's click does (`StateFilter.clickDoes()`). */
export type ChipClick = "all" | "only" | "also" | "hide"
