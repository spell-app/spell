import { For, Show } from "solid-js"
import type { JSX } from "@solidjs/web"

import { E } from "spell/ui/core"

// the filter's rule, states and words:  their files, not `epic-section`'s barrel (which would define it here)
import { MARKED_SHOWS_AS, StateFilter, WITH_CLAUDE, type ChipPick } from "spell/epic/components/epic-section/StateFilter"
import {
  CHIP,
  CHIP_CLICK_KEYS,
  FILTER,
  FILTER_STATES,
  PHASE_FILTER_STATES,
  type ChipState
} from "spell/epic/components/epic-section/EpicSection.types"

import { epicStateFilterVocabulary } from "./EpicStateFilter.en"
import { STATE_PICK, type StatePickDetail } from "./EpicStateFilter.types"

import tooltipCSS from "spell/epic/components/epic-item/Tooltip.css?inline"
import filterCSS from "./EpicStateFilter.css?inline"

/****************
 * ### `<epic-state-filter>`
 * The state filter's CHIPS (epic `airplane` P8, ONE element since epic `epic-engine` P3):  a pill per state the items
 * are in, in the state's colour, with how many (Owen, 2026-10-10:  no filter icon).
 * - the Phases section's phases the same (`phases`), by a phase's seven states in Owen's order (epic `epic-engine` I157,
 *   I170):  red needs him, orange changed since he looked, blue under way (in the blue badge, as an item's
 *   `progress`), grey paused (held, I221), a DOTTED blue outline scheduled, green done lately, grey done before
 * - SOLID while that state's items show, OUTLINED while hidden (`shown`)
 * - a click asks the owner to filter:  `epic-state-changed`, with the clicked state and what should show next, by the one
 *   rule (`StateFilter.nextShown()`:  it toggles the chip, and every state of its colour);  the owner filters, and sets
 *   `shown` (epic `epic-engine` I242)
 * - an ⌥-click (Alt-click;  epic `epic-engine` I166):  only that colour, whatever showed;  `how: "only"` in the event
 * - each chip's tooltip and name:  how many, which state, what its click does, and its ⌥-click
 * - the items MARKED in this pass (`marked`, epic `epic-engine` P43):  a solid badge in Send's blue (a dotted outline at first;  Owen chose solid), first,
 *   left of the chips (Owen, 2026-10-25:  "remove from the red/green/etc and put in a blue badge with dotted outline
 *   to the left");  the blues' chip:  solid while they show, outlined while hidden, a click toggles them (I242)
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

  /**
   * How many items are in each state, from `counts`.
   * - `handled` and `quiet` count with `old`:  ONE grey chip for everything settled or asking nothing (Owen, 2026-10-26:  "why are there two grey
   *   pills?";  two before, the same grey);  the row's "in P4" chip still tells them apart
   */
  get stateCounts(): ReadonlyMap<string, number> {
    const counts = new Map<string, number>()
    for (const pair of (this.counts ?? "").split(/\s+/)) {
      const [raw, count] = pair.split(":")
      const state = SETTLED_TOO.includes(raw!) ? SETTLED : raw
      if (state && Number(count) > 0) counts.set(state, (counts.get(state) ?? 0) + Number(count))
    }
    return counts
  }

  /**
   * The states with items (or phases), in the filter's order:  a chip each.
   * - an item's states (`FILTER_STATES`), or a phase's with `phases` (`PHASE_FILTER_STATES`, the Phases section's:
   *   epic `epic-engine` I157, I170):  some names are in both, so ONE list
   */
  get present(): ChipState[] {
    const counts = this.stateCounts
    const order: readonly ChipState[] = this.phases ? PHASE_FILTER_STATES : FILTER_STATES
    const hasMarked = Number(this.marked ?? 0) > 0
    return order.filter((it) => counts.has(it.state) || (hasMarked && it.state === MARKED_SHOWS_AS))
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
   * the items with him (`WITH_CLAUDE`:  working on, or a Do this not started);  0, no badge (Owen, 2026-10-25:  "just need one blue badge for all things
   * submitted, no matter the type";  a blue `progress` chip beside it before)
   */
  get markedCount(): number {
    const marked = Math.max(0, Number(this.marked ?? 0))
    return WITH_CLAUDE.reduce((count, state) => count + (this.stateCounts.get(state) ?? 0), marked)
  }

  /** The chips drawn:  every state present but `progress`, which counts in the blue badge. */
  get chips(): readonly ChipState[] {
    const chips = StateFilter.chipStatesOf(this.present.map((it) => it.state))
    return this.present.filter((it) => chips.includes(it.state))
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
              const words = () => this.badgeWords(count())
              return (
                <button
                  type="button"
                  class={[CHIP, MARKED]}
                  part={this.partForName("marked")}
                  data-state={MARKED_SHOWS_AS}
                  aria-pressed={this.showing.has(MARKED_SHOWS_AS) ? "true" : "false"}
                  aria-label={words()}
                  title={words()}
                  onClick={(event: MouseEvent) => this.pick(MARKED_SHOWS_AS, event.altKey ? "only" : "click")}
                >
                  {count()}
                </button>
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
                  data-fill={"fill" in state ? state.fill : undefined}
                  aria-pressed={this.showing.has(state.state) ? "true" : "false"}
                  aria-label={words()}
                  title={words()}
                  disabled={this.static}
                  onClick={(event: MouseEvent) => this.pick(state.state, event.altKey ? "only" : "click")}
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
  private chipWords(state: ChipState): string {
    return this.wordsFor(state.state, this.stateCounts.get(state.state) ?? 0, this.translationForKey(state.words))
  }

  /** The blue badge's name and tooltip, as a chip's:  `count` with Claude. */
  private badgeWords(count: number): string {
    const words = this.translationForKey(this.phases ? "markedPhaseWords" : "markedWords")
    return this.wordsFor(MARKED_SHOWS_AS, count, words)
  }

  /** How many are in `state` (`words`), and what a click and an ⌥-click on its chip do. */
  private wordsFor(state: string, count: number, words: string): string {
    const present = this.present.map((it) => it.state as string)
    const does = this.translationForKey(CHIP_CLICK_KEYS[StateFilter.clickDoes(present, [...this.showing], state)])
    return this.translationForKey("chipWords", { count, words, does, only: this.translationForKey("chipAltOnly") })
  }

  /** A chip, clicked (`how`:  ⌥-clicked, `only`):  the owner is told what was picked, and what should show next. */
  @E.untracked
  private pick(state: string, how: ChipPick) {
    const present = this.present.map((it) => it.state as string)
    const next = StateFilter.nextShown(present, [...this.showing], state, how)
    // the grey chip is `old`, `handled` and `quiet`:  shown or hidden together
    const shown = next.includes(SETTLED) ? [...next, ...SETTLED_TOO] : next
    this.send(STATE_PICK, { state, shown, how } satisfies StatePickDetail)
  }
}

/** The grey chip's state, and the ones that count in it (`handled`, P31;  `quiet`, P63):  one chip for all (epic `epic-engine`). */
const SETTLED = "old"
const SETTLED_TOO: readonly string[] = ["handled", "quiet"]

/** Class of the blue badge:  what's with Claude, and the items marked in this pass (P43). */
const MARKED = "marked"

/** The vocabulary's attribute getters, typed (see "Attributes" in `UIComponent`). */
export interface EpicStateFilter extends E.AttributeValues<typeof epicStateFilterVocabulary> {}
