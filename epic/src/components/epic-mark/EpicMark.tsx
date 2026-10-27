import { Show } from "solid-js"
import { isServer, type JSX } from "@solidjs/web"

import { E } from "spell/ui/core"

import { EpicAddress, PageTargets, type Landing } from "spell/epic/links"
// Import directly:  the page's signals, not its family's barrel (which would define `<epic-page>` here)
import { EpicPage } from "spell/epic/components/epic-page/EpicPage"
import { DrawnState, type ItemState } from "spell/epic/components/epic-item/EpicItem.types"
// its view of the review inbox:  the file, not `epic-review`'s barrel (`index.ts` defines that family)
import { ReviewState } from "spell/epic/components/epic-review/ReviewState"

import { epicMarkVocabulary } from "./EpicMark.en"

import markCSS from "./EpicMark.css?inline"

/****************
 * ### `<epic-mark>`
 * An item's id as a chip in the item's state colour:  `<epic-mark item="i126" link>` draws `I126`
 * (epic `epic-engine` P45;  Owen, 2026-10-25:  "`<epic-mark link>` for rendering the I126 mark").
 * - Its colour:  the item's state AS DRAWN (`DrawnState.of()`):  the ONE rule of the item's own id chip and every
 *   count of it (epic `coherence` P22):  its `state`, else its status's, greyed with age;  blue while Claude works on
 *   it, Owen's urgency and his check before they're applied (the review inbox, `ReviewState.liveOf()`)
 *   - read again as the page changes (its `layout`:  a state, status or title changing, the live patch), and as the
 *     review inbox does
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

  /** The page's review inbox, as the item's own chip reads it:  what it says of the item now (`state`). */
  readonly reviewState = new ReviewState(() => undefined)

  /** While connected, follow the review inbox:  its item's chip changes with it.  Returns the undo. */
  @E.whileConnected
  protected followReview() {
    return this.reviewState.connect()
  }

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

  /** The item's state as drawn, as its own id chip draws it (`DrawnState.of()`, with what the inbox says now). */
  get state(): ItemState | undefined {
    const item = this.target
    if (!item) return undefined
    return DrawnState.of(DrawnState.fieldsOf(item), this.reviewState.liveOf(item.id))
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
