/****************
 * ### `StateFilter`
 * The state filter's click rule (and its ⌥-click's), shared by a section's chips (`<epic-section>`)
 * and the page's (`<epic-page>`'s toolbar, which filters every section at once).
 * - Pure:  states in, states out;  no DOM, no Solid.
 * - The docs runtime's filter (`spell-doc-runtime.js` `nextShown()`, the Epics list page) is the same rule, restated:
 *   it can't import the pack.
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
   * - `how`:  `only` for an ⌥-click (epic `epic-engine` I166;  Owen, 2026-10-29:  "if I option-click on one of those
   *   badges, turn just that one on"):  only `clicked`, whatever shows now
   */
  static nextShown(
    present: readonly string[],
    shown: readonly string[],
    clicked: string,
    how: ChipPick = "click"
  ): string[] {
    if (how === "only") return [clicked]
    const showing = present.filter((state) => shown.includes(state))
    if (showing.length === present.length) return [clicked]
    if (!showing.includes(clicked)) return present.filter((state) => state === clicked || showing.includes(state))
    if (showing.length === 1) return [...present]
    return showing.filter((state) => state !== clicked)
  }

  /**
   * What a click on `clicked`'s chip does, in a word, for its tooltip (`nextShown()`):
   * `all` (everything shows again), `only`, `also` (it shows too) or `hide`.
   */
  static clickDoes(present: readonly string[], shown: readonly string[], clicked: string): ChipClick {
    const next = StateFilter.nextShown(present, shown, clicked)
    if (next.length === present.length) return "all"
    if (next.length === 1 && next[0] === clicked) return "only"
    return next.includes(clicked) ? "also" : "hide"
  }
}

/** How a chip was picked:  a plain click (`nextShown()`'s rule), or an ⌥-click (`only` its state). */
export type ChipPick = "click" | "only"

/** What a chip's click does (`StateFilter.clickDoes()`). */
export type ChipClick = "all" | "only" | "also" | "hide"
