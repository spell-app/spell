import { For } from "solid-js"
import { isServer, type JSX } from "@solidjs/web"

import { E } from "spell-ui/core"

import { epicSortVocabulary } from "./EpicSort.en"
import { SORT_KEY, save, savedSort, type EpicSortName, type SortDetail } from "./EpicList.types"

import tooltipCSS from "spell-epic/components/epic-item/Tooltip.css?inline"
import sortCSS from "./EpicSort.css?inline"

/****************
 * ### `<epic-sort>`
 * The Epics page's sort buttons (Owen, 2026-10-13:  "Add buttons to epics header to sort by date or alphabetical,
 * within the sessions"):  one grouped pill of Spell UI buttons, A–Z and Date, the one in use pressed (`active`).
 * - a click:  remembered in this browser (`SORT_KEY`), and every `<epic-list>` on the page sorts by it (`epic-sort`)
 * - the groups stay where they are:  only the cards inside each move
 * - works from `file://` too:  nothing goes to the page server
 * - SIDE EFFECT:  writes `localStorage` on a click
 ****************/
export class EpicSort extends E.UIComponent<typeof epicSortVocabulary> {
  @E.proto static vocabulary = epicSortVocabulary
  @E.protoMerged static elementSetup = {
    styleSheets: { "epic-tooltip": tooltipCSS, "epic-sort": sortCSS }
  } satisfies Partial<E.ElementSetup>

  /** The sort in use, as remembered. */
  @E.state accessor sort: EpicSortName = isServer ? "title" : savedSort()

  render(): JSX.Element {
    return (
      <ui-buttons
        class={this.rootClass}
        part={this.partForName("base")}
        circular=""
        basic=""
        size="tiny"
        aria-label={this.translationForKey("label")}
      >
        <For each={SORT_BUTTONS}>
          {(button) => {
            const words = () => this.translationForKey(button.words)
            const inUse = () => this.sort === button.sort
            return (
              <ui-button
                icon={button.icon}
                active={inUse() ? "" : undefined}
                title={this.translationForKey(button.tip)}
                aria-label={inUse() ? this.translationForKey("inUse", { words: words() }) : words()}
                onClick={() => this.pick(button.sort)}
              >
                {words()}
              </ui-button>
            )
          }}
        </For>
      </ui-buttons>
    )
  }

  /** A sort, clicked:  in use, remembered, and every list told. */
  @E.untracked
  private pick(sort: EpicSortName) {
    this.sort = sort
    save(SORT_KEY, sort)
    this.send("epic-sort", { sort } satisfies SortDetail)
  }
}

/** The vocabulary's attribute getters, typed (see "Attributes" in `UIComponent`). */
export interface EpicSort extends E.AttributeValues<typeof epicSortVocabulary> {}

/** The buttons, in order:  each one's sort, icon, and its words' and tooltip's text keys. */
const SORT_BUTTONS = [
  { sort: "title", icon: "arrow down a z", words: "title", tip: "titleTip" },
  { sort: "date", icon: "clock", words: "date", tip: "dateTip" }
] as const
