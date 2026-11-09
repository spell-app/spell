/****************
 * ### `StateFilter`
 * The state filter's click rule (and its ⌥-click's), shared by a section's chips (`<epic-section>`)
 * and the page's (`<epic-page>`'s toolbar, which filters every section at once).
 * - Pure:  states in, states out;  no DOM, no Solid.
 * - States of one colour go together (`STATE_GROUPS`):  a click on any of them turns them all on or off.
 * - What Claude is on (`WITH_CLAUDE`, blue) has no chip of its own:  the blue badge is its chip, and an item marked in
 *   this pass counts in that badge, so it hides and shows with the blues (`MARKED_SHOWS_AS`).
 *   Every owner filters by this one rule:  `<epic-state-filter>`, `<epic-section>`, the page's toolbar, Focus mode.
 * - The docs runtime's lists (the Epics list page) filter by the `shown` the chip element sends:  this rule too.
 ****************/
export class StateFilter {
  /**
   * What shows after a click on `clicked`'s chip, of the states `present`, `shown` showing now
   * (Owen, 2026-11-09:  "Clicking on a badge toggles it.  Option-click to see just that group"):
   * - a click:  `clicked`'s group (`STATE_GROUPS`) off when any of it shows, else on;  the others as they are
   *   - a click that would leave nothing showing (Owen, 2026-11-09:  "Turning off the last badge -- select the next
   *     one in the list"):  the next group in `present`'s order shows instead, wrapping to the first;
   *     the only group there is stays on
   * - `how`:  `only` for an ⌥-click (epic `epic-engine` I166):  only `clicked`'s group, whatever shows now
   * - `how`:  `narrow` for the Epics list's saga chips, which keep the older rule:
   *   everything showing, only `clicked`;  the only one showing, everything again;  else a toggle
   * - in `present`'s order
   */
  static nextShown(
    present: readonly string[],
    shown: readonly string[],
    clicked: string,
    how: ChipPick | "narrow" = "click"
  ): string[] {
    if (how === "narrow") return StateFilter.narrowed(present, shown, clicked)
    const group = StateFilter.groupIn(present, clicked)
    if (how === "only") return present.filter((state) => group.includes(state))
    const isOn = group.some((state) => shown.includes(state))
    const next = present.filter((state) => (group.includes(state) ? !isOn : shown.includes(state)))
    return next.length ? next : StateFilter.groupAfter(present, group)
  }

  /** The states of `present` with a chip of their own:  all but what Claude is on (`WITH_CLAUDE`, the blue badge). */
  static chipStatesOf(present: readonly string[]): string[] {
    return present.filter((state) => !StateFilter.isWithClaude(state))
  }

  /** Does the filter hide an item (or phase) in `state` while `shown` shows? */
  static hides(state: string, shown: ReadonlySet<string> | readonly string[]): boolean {
    return "has" in shown ? !shown.has(state) : !shown.includes(state)
  }

  /** Is `state` with Claude (`WITH_CLAUDE`):  no chip of its own, counted in the blue badge? */
  static isWithClaude(state: string): boolean {
    return (WITH_CLAUDE as readonly string[]).includes(state)
  }

  /** The states of `present` that go with `clicked`:  its group's, or `clicked` alone. */
  private static groupIn(present: readonly string[], clicked: string): string[] {
    const group = STATE_GROUPS.find((states) => states.includes(clicked)) ?? [clicked]
    return present.filter((state) => group.includes(state))
  }

  /** The group after `group` in `present`'s order, wrapping to the first;  `group` itself when there's no other. */
  private static groupAfter(present: readonly string[], group: readonly string[]): string[] {
    const last = present.lastIndexOf(group[group.length - 1]!)
    for (let step = 1; step < present.length; step++) {
      const state = present[(last + step) % present.length]!
      if (!group.includes(state)) return StateFilter.groupIn(present, state)
    }
    return [...group]
  }

  /** `nextShown()`'s `narrow` rule. */
  private static narrowed(present: readonly string[], shown: readonly string[], clicked: string): string[] {
    const showing = present.filter((state) => shown.includes(state))
    if (showing.length === present.length) return [clicked]
    if (!showing.includes(clicked)) return present.filter((state) => state === clicked || showing.includes(state))
    if (showing.length === 1) return [...present]
    return showing.filter((state) => state !== clicked)
  }

  /**
   * What a click on `clicked`'s chip does, in a word, for its tooltip (`nextShown()`):
   * - showing:  `hide`;  `next`, the last one showing, so the next group shows instead;  `stays`, the only group there is
   * - hidden:  `also` (it shows too), or `all` (that makes everything show)
   */
  static clickDoes(present: readonly string[], shown: readonly string[], clicked: string): ChipClick {
    const group = StateFilter.groupIn(present, clicked)
    const next = StateFilter.nextShown(present, shown, clicked)
    if (!group.some((state) => shown.includes(state))) return next.length === present.length ? "all" : "also"
    if (next.some((state) => group.includes(state))) return "stays"
    return present.some((state) => !group.includes(state) && shown.includes(state)) ? "hide" : "next"
  }
}

/**
 * The states that go together, one list per colour (Owen, 2026-11-09:  "Blues should appear together and toggle
 * together.  Oranges should toggle together."):  an item's and a phase's alike.
 */
const STATE_GROUPS: readonly (readonly string[])[] = [
  ["progress", "handed", "scheduled"],
  ["replied", "requested", "waiting", "updated"],
  ["old", "handled", "quiet"]
]

/** The state an item marked in this pass filters as:  it counts in the blue badge, so it goes with the blues. */
export const MARKED_SHOWS_AS = "progress"

/**
 * The states with Claude (blue):  what it's working on, and a Do this it hasn't started (`handed`, epic `epic-engine` P63).
 * - no chip of their own:  they count in the blue badge (`<epic-state-filter>`'s `markedCount`), the blues' chip
 */
export const WITH_CLAUDE = ["progress", "handed"] as const

/** How a chip was picked:  a plain click (`nextShown()`'s rule), or an ⌥-click (`only` its state). */
export type ChipPick = "click" | "only"

/** What a chip's click does (`StateFilter.clickDoes()`). */
export type ChipClick = "all" | "also" | "hide" | "next" | "stays"
