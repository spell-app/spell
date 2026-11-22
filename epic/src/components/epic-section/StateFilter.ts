/****************
 * ### `StateFilter`
 * The state filter's click rule (and its ⌥-click's), shared by a section's chips (`<epic-section>`)
 * and the page's (`<epic-page>`'s toolbar, which filters every section at once).
 * - Pure:  states in, states out;  no DOM, no Solid.
 * - States of one colour go together (`STATE_GROUPS`):  a click on any of them turns them all on or off.
 * - The blues (`BLUE_BADGE`:  what Claude is on, a phase scheduled) have no chip of their own:  the blue badge is its chip, and an item marked in
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

  /**
   * The key of `state`'s colour:  its group's first state (`STATE_GROUPS`), else `state` itself.
   * - a phase's own grey, `paused`, goes with the greys (`PHASE_COLORS`):  the page's toolbar sets it with them
   */
  static colorOf(state: string): string {
    return STATE_GROUPS.find((states) => states.includes(state))?.[0] ?? PHASE_COLORS[state] ?? state
  }

  /**
   * What one section shows once the page's toolbar SETS colours (epic `epic-engine` I259;  Owen, 2026-11-11:  turning
   * the toolbar's grey on left the Phases section's grey off):  each state of `present` whose colour `colors` names,
   * shown or hidden as it says, whatever the section had;  the others as `shown` has them.
   * - in `present`'s order
   */
  static withColors(
    present: readonly string[],
    shown: readonly string[],
    colors: ReadonlyMap<string, boolean>
  ): string[] {
    return present.filter((state) => colors.get(StateFilter.colorOf(state)) ?? shown.includes(state))
  }

  /**
   * Where each colour stands across several sections' chips (`sections`, each its states and whether they show):
   * `on` while every one of them shows it, `off` while none does, else `mixed`.
   */
  static colorStanding(sections: readonly (readonly { state: string; on: boolean }[])[]): Map<string, ColorStanding> {
    const standing = new Map<string, ColorStanding>()
    for (const chips of sections) {
      for (const { state, on } of chips) {
        const color = StateFilter.colorOf(state)
        const was = standing.get(color)
        const now = on ? "on" : "off"
        standing.set(color, was === undefined || was === now ? now : "mixed")
      }
    }
    return standing
  }

  /** The states of `present` with a chip of their own:  all but the blues (`BLUE_BADGE`), which the blue badge counts. */
  static chipStatesOf(present: readonly string[]): string[] {
    return present.filter((state) => !StateFilter.inBlueBadge(state))
  }

  /** Does the filter hide an item (or phase) in `state` while `shown` shows? */
  static hides(state: string, shown: ReadonlySet<string> | readonly string[]): boolean {
    return "has" in shown ? !shown.has(state) : !shown.includes(state)
  }

  /** Is `state` a blue (`BLUE_BADGE`):  no chip of its own, counted in the blue badge? */
  static inBlueBadge(state: string): boolean {
    return (BLUE_BADGE as readonly string[]).includes(state)
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
  // a recheck has its own chip, light orange (epic `epic-engine` J335):  not in the orange one
  ["replied", "requested", "waiting", "updated"],
  ["open", "someday"],
  ["old", "handled", "quiet"]
]

/**
 * A phase's states that take another's colour on the page's toolbar (`StateFilter.colorOf()`), though the Phases
 * section gives them a chip of their own:  `paused` is grey (epic `epic-engine` I221), with `old`.
 */
const PHASE_COLORS: Readonly<Record<string, string>> = { paused: "old" }

/** The state an item marked in this pass filters as:  it counts in the blue badge, so it goes with the blues. */
export const MARKED_SHOWS_AS = "progress"

/**
 * The blues, ONE badge for all (`<epic-state-filter>`'s `markedCount`), no chip of their own:
 * - with Claude:  what it's working on, and a Do this it hasn't started (`handed`, epic `epic-engine` P63)
 * - a phase scheduled, still to do (epic `epic-engine` I260;  Owen, 2026-11-11, on a solid blue 2 beside a dotted
 *   blue 2:  "These should just be one set, confusing to have 2 blues";  a dotted chip of its own before)
 */
export const BLUE_BADGE = ["progress", "handed", "scheduled"] as const

/** How a chip was picked:  a plain click (`nextShown()`'s rule), or an ⌥-click (`only` its state). */
export type ChipPick = "click" | "only"

/** Where a colour stands across sections (`StateFilter.colorStanding()`):  every one shows it, none, or some. */
export type ColorStanding = "on" | "off" | "mixed"

/** What a chip's click does (`StateFilter.clickDoes()`). */
export type ChipClick = "all" | "also" | "hide" | "next" | "stays"
