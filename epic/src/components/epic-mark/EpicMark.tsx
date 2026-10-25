import { Show } from "solid-js"
import { isServer, type JSX } from "@solidjs/web"

import { E } from "spell-ui/core"

import { EpicAddress, PageTargets, type Landing } from "spell-epic/links"
// Import directly:  the page's signals, not its family's barrel (which would define `<epic-page>` here)
import { EpicPage } from "spell-epic/components/epic-page/EpicPage"
import { ItemAge, STATUS_STATES, type ItemState } from "spell-epic/components/epic-item/EpicItem.types"

import { epicMarkVocabulary } from "./EpicMark.en"

import markCSS from "./EpicMark.css?inline"

/****************
 * ### `<epic-mark>`
 * An item's id as a chip in the item's state colour:  `<epic-mark item="i126" link>` draws `I126`
 * (epic `epic-engine` P45;  Owen, 2026-10-25:  "`<epic-mark link>` for rendering the I126 mark").
 * - Its colour:  the item's `state`, else its status's (`STATUS_STATES`), as drawn (`ItemAge`):
 *   the same rule as the item's own id chip and the section's counts.
 *   - read again as the page changes (its `layout`:  a state, status or title changing, the live patch)
 * - Its tooltip:  the item's title (`PageTargets`).
 * - `link`:  an `#id` link, which the docs runtime lands on as any (unfolding the item).
 * - An id the page doesn't have:  `:state(missing)`, the accent colour, saying so in its tooltip.
 * - Before P45 the To review field's `<a href="#j1">` links were coloured by a script writing `data-spell-state`
 *   on them;  the migration `to-review-marks` made them marks.
 ****************/
export class EpicMark extends E.UIComponent<typeof epicMarkVocabulary> {
  @E.proto static vocabulary = epicMarkVocabulary
  @E.protoMerged static elementSetup = {
    styleSheets: { "epic-mark": markCSS }
  } satisfies Partial<E.ElementSetup>

  /** The `<epic-page>` around it, once connected. */
  get page(): Element | null {
    return this.isConnected ? this.domElement.closest(EpicPage.TAG) : null
  }

  /** The page's layout counter:  bumped when an item's state, status or title changes (`EpicPage`). */
  get layout(): number {
    const page = this.page
    return page ? EpicPage.signalsOf(page).layout.get() : 0
  }

  /** The id it draws, in capitals:  `I126`. */
  get id(): string {
    return (this.item ?? "").toUpperCase()
  }

  /** Where it lands on the page:  the item's id and title;  `undefined` while the page doesn't have it. */
  get landing(): Landing | undefined {
    void this.layout
    if (isServer || !this.isConnected || !this.item) return undefined
    try {
      return new PageTargets(document).find(new EpicAddress({ item: this.item }))
    } catch {
      // not an id an address takes
      return undefined
    }
  }

  /** The item it names, when the page holds it (not in a part still to load). */
  get target(): Element | null {
    const landing = this.landing
    return landing ? document.getElementById(landing.id) : null
  }

  /** No item with its id on the page. */
  @E.cssState("missing")
  get isMissing(): boolean {
    return this.isConnected && !this.landing
  }

  /** The item's state as drawn:  `state`, else its status's, a day-old green turned grey (`ItemAge`). */
  get state(): ItemState | undefined {
    const item = this.target
    if (!item) return undefined
    const written = item.getAttribute("state") ?? STATUS_STATES[item.getAttribute("status") ?? ""] ?? "open"
    return ItemAge.shown(written as ItemState, item.getAttribute("changed"), item.getAttribute("reviewed"))
  }

  /** Its tooltip:  the item's title, or that the page doesn't have it. */
  get tooltip(): string | undefined {
    if (this.isMissing) return this.translationForKey("missing", { id: this.id })
    return this.landing?.title
  }

  render(): JSX.Element {
    const id = () => (
      <span class={ID} part={this.partForName("id")}>
        {this.id}
      </span>
    )
    return (
      <Show
        when={this.link}
        fallback={
          <span
            class={[this.rootClass, CHIP]}
            part={this.partForName("base")}
            data-state={this.state}
            title={this.tooltip}
          >
            {id()}
          </span>
        }
      >
        <a
          class={[this.rootClass, CHIP]}
          part={this.partForName("base")}
          data-state={this.state}
          href={`#${this.landing?.id ?? (this.item ?? "").toLowerCase()}`}
          title={this.tooltip}
        >
          {id()}
        </a>
      </Show>
    )
  }
}

/** The vocabulary's attribute getters, typed (see "Attributes" in `UIComponent`). */
export interface EpicMark extends E.AttributeValues<typeof epicMarkVocabulary> {}

/** Class words of its shadow markup:  the chip, the id in it. */
const CHIP = "chip"
const ID = "id"
