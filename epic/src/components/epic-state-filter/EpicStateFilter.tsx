import { For, Show } from "solid-js"
import type { JSX } from "@solidjs/web"

import { E } from "spell-ui/core"

// the filter's rule, states and words:  their files, not `epic-section`'s barrel (which would define it here)
import { StateFilter } from "spell-epic/components/epic-section/StateFilter"
import {
  CHIP,
  CHIP_CLICK_KEYS,
  FILTER,
  FILTER_STATES,
  type FilterState
} from "spell-epic/components/epic-section/EpicSection.types"

import { epicStateFilterVocabulary } from "./EpicStateFilter.en"
import { STATE_PICK, type StatePickDetail } from "./EpicStateFilter.types"

import tooltipCSS from "spell-epic/components/epic-item/Tooltip.css?inline"
import filterCSS from "./EpicStateFilter.css?inline"

/****************
 * ### `<epic-state-filter>`
 * The state filter's CHIPS (epic `airplane` P8, ONE element since epic `epic-engine` P3):  a pill per state the items
 * are in, in the state's colour, with how many (Owen, 2026-10-10:  no filter icon).
 * - SOLID while that state's items show, OUTLINED while hidden (`shown`)
 * - a click asks the owner to filter:  `epic-state-changed`, with the clicked state and what should show next, by the one
 *   rule (`StateFilter.nextShown()`:  everything showing, only that state;  else a hidden state shows too and a shown
 *   one hides;  the only one showing, everything again);  the owner filters, and sets `shown`
 * - each chip's tooltip and name:  how many, which state, what its click does
 * - the items MARKED in this pass (`marked`, epic `epic-engine` P43):  a solid badge in Send's blue (a dotted outline at first;  Owen chose solid), first,
 *   left of the chips (Owen, 2026-10-25:  "remove from the red/green/etc and put in a blue badge with dotted outline
 *   to the left");  drawn whatever `shown` says, and not a filter:  a click does nothing
 * - drawn by:  `<epic-section>` (an item section's title), `<epic-page>` (its toolbar:  every section at once), the
 *   docs runtime's lists (the Epics page's cards:  `wireItemFilters()`), so a guide and an epic page look alike
 * - NEVER filters anything itself:  it only says what was picked
 ****************/
export class EpicStateFilter extends E.UIComponent<typeof epicStateFilterVocabulary> {
  @E.proto static vocabulary = epicStateFilterVocabulary
  @E.protoMerged static elementSetup = {
    styleSheets: { "epic-tooltip": tooltipCSS, "epic-state-filter": filterCSS }
  } satisfies Partial<E.ElementSetup>

  ////////////////
  // ## Derived state
  ////////////////

  /** How many items are in each state, from `counts`. */
  get stateCounts(): ReadonlyMap<string, number> {
    const counts = new Map<string, number>()
    for (const pair of (this.counts ?? "").split(/\s+/)) {
      const [state, count] = pair.split(":")
      if (state && Number(count) > 0) counts.set(state, Number(count))
    }
    return counts
  }

  /** The states with items, in the filter's order:  a chip each. */
  get present(): FilterState[] {
    const counts = this.stateCounts
    return FILTER_STATES.filter((it) => counts.has(it.state))
  }

  /**
   * The states showing:  `shown`'s, of those present;  no `shown`, every one.
   * - `shown` naming none of them:  none shows (an epic page's toolbar showed only red, and this list has none)
   */
  get showing(): ReadonlySet<string> {
    const present = this.present.map((it) => it.state as string)
    if (this.shown === undefined || this.shown === null) return new Set(present)
    return new Set(this.shown.split(/\s+/).filter((state) => present.includes(state)))
  }

  /**
   * The ONE blue badge's count:  everything handed to Claude, whatever its kind -- the items marked in this pass, and
   * the items he's working on (`progress`);  0, no badge (Owen, 2026-10-25:  "just need one blue badge for all things
   * submitted, no matter the type";  a blue `progress` chip beside it before)
   */
  get markedCount(): number {
    const marked = Math.max(0, Number(this.marked ?? 0))
    return marked + (this.stateCounts.get(SUBMITTED_STATE) ?? 0)
  }

  /** The chips drawn:  every state present but `progress`, which counts in the blue badge. */
  get chips(): readonly FilterState[] {
    return this.present.filter((it) => it.state !== SUBMITTED_STATE)
  }

  ////////////////
  // ## Drawing
  ////////////////

  render(): JSX.Element {
    return (
      <Show when={this.chips.length || this.markedCount}>
        <span
          class={FILTER}
          part={this.partForName("base")}
          role="group"
          aria-label={this.translationForKey("filterLabel")}
        >
          <Show when={this.markedCount}>
            {(count) => {
              const words = () => this.translationForKey("markedWords", { count: count() })
              return (
                <span
                  class={[CHIP, MARKED]}
                  part={this.partForName("marked")}
                  role="img"
                  aria-label={words()}
                  title={words()}
                >
                  {count()}
                </span>
              )
            }}
          </Show>
          <For each={this.chips}>
            {(state) => {
              const words = () => this.chipWords(state)
              return (
                <button
                  type="button"
                  class={CHIP}
                  part={this.partForName("chip")}
                  data-state={state.state}
                  data-color={state.color}
                  aria-pressed={this.showing.has(state.state) ? "true" : "false"}
                  aria-label={words()}
                  title={words()}
                  onClick={() => this.pick(state.state)}
                >
                  {this.stateCounts.get(state.state) ?? 0}
                </button>
              )
            }}
          </For>
        </span>
      </Show>
    )
  }

  /** A chip's name and tooltip:  how many, which state, and what its click does (`StateFilter.clickDoes()`). */
  private chipWords(state: FilterState): string {
    const words = this.translationForKey(state.words)
    const count = this.stateCounts.get(state.state) ?? 0
    const present = this.present.map((it) => it.state as string)
    const does = this.translationForKey(CHIP_CLICK_KEYS[StateFilter.clickDoes(present, [...this.showing], state.state)])
    return this.translationForKey("chipWords", { count, words, does })
  }

  /** A chip, clicked:  the owner is told what was picked, and what should show next. */
  @E.untracked
  private pick(state: string) {
    const present = this.present.map((it) => it.state as string)
    const next = StateFilter.nextShown(present, [...this.showing], state)
    // what's handed to Claude has no chip of its own:  it never hides behind one
    const shown =
      present.includes(SUBMITTED_STATE) && !next.includes(SUBMITTED_STATE) ? [...next, SUBMITTED_STATE] : next
    this.send(STATE_PICK, { state, shown } satisfies StatePickDetail)
  }
}

/** The state of what Claude is working on:  it counts in the blue badge, with the marked items. */
const SUBMITTED_STATE = "progress"

/** Class of the blue badge, the items marked in this pass (P43). */
const MARKED = "marked"

/** The vocabulary's attribute getters, typed (see "Attributes" in `UIComponent`). */
export interface EpicStateFilter extends E.AttributeValues<typeof epicStateFilterVocabulary> {}
