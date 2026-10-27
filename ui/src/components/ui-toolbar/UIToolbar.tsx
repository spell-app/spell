import { Show } from "solid-js"
import type { JSX } from "@solidjs/web"

import { E } from "spell/ui/core"
// the family barrel, not the leaf:
// the lib build then imports `ui-menu.js` instead of splitting a shared chunk
// (SIDE EFFECT:  defines `<ui-menu>` and `<ui-item>`, which a toolbar extends and holds)
import { UIMenu } from "spell/ui/components/ui-menu"
import type { menuVocabulary } from "spell/ui/components/ui-menu/UIMenu.en"
import { toolbarVocabulary } from "./UIToolbar.en"

import toolbarCSS from "./UIToolbar.css?inline"

/****************
 * ### `<ui-toolbar>`
 * The component behind `<ui-toolbar>`:  a horizontal menu whose items scroll sideways when they don't fit.
 *
 *     <div class="ui toolbar" part="toolbar">
 *       <div class="icon" part="icon">  <slot name="icon">  </div>        (each slot's box only while it has content)
 *       <div class="title" part="title">  <slot name="title">  </div>
 *       <div class="center" part="center">  <slot name="center">  </div>    (takes the room left)
 *       <button class="scroll start" part="scroll-start" aria-label title>‹</button>
 *       <nav class="ui … menu" part="menu">  <slot>  </nav>       (the menu's own box, which scrolls)
 *       <button class="scroll end" part="scroll-end" aria-label title>›</button>
 *       <div class="right" part="right">  <slot name="right">  </div>      (pushed to the end)
 *     </div>
 *
 * - It IS a `<ui-menu>` (it extends `UIMenu`):  the same attributes, items, events, `segmented` thumb and menubar.
 *   - Its vocabulary is built on the menu's (`UIToolbar.en.ts`).
 * - Its items never wrap:
 *   when they don't fit, the menu's box scrolls sideways (`:state(overflowing)`), its scrollbar hidden.
 * - A `‹` / `›` button shows at each end while there's more to scroll that way.
 *   - Each sits OVER its end of the row, taking no room in it;  the row fades out under it.
 *   - A click scrolls by most of the box's width, smoothly (at once with reduced motion),
 *     and stops on a whole item.
 *   - Neither shows when everything fits;  the one at an end the row has reached is hidden.
 *   - Out of the Tab order:  the items themselves are what a keyboard reaches, and focusing one scrolls it in.
 * - It follows the box's size and its items' (`ResizeObserver`), and the scroll.
 * - `shrinkable` (the menu's):  it never scrolls with `‹` / `›`;  its titles fit the row instead, down to the menu's
 *   overflow button (epic `epic-engine` Q38).  Only a row too narrow for even that button scrolls, with no keys.
 * - A BAR's slots around the items, for a site's top bar:
 *   `icon`, `title`, `center` (the room left), `right` (at the end).
 *   - A slot with nothing in it draws no box;  with no items, the menu's box takes no room.
 * - NOTE: left-to-right only, for now:  in a right-to-left page `scrollLeft` counts the other way.
 ****************/
export class UIToolbar extends UIMenu {
  // the menu's names under the toolbar's tag:  same shape, but TypeScript only knows the menu's literals
  @E.proto static vocabulary = toolbarVocabulary as unknown as typeof menuVocabulary
  @E.protoMerged static elementSetup = {
    styleSheets: { ...UIMenu.prototype.elementSetup.styleSheets, toolbar: toolbarCSS }
  } satisfies Partial<E.ElementSetup>

  ////////////////
  // ## Scrolling
  ////////////////

  /** There's more to scroll back to (the `‹` button shows). */
  @E.state accessor canScrollStart = false

  /** There's more to scroll on to (the `›` button shows). */
  @E.state accessor canScrollEnd = false

  /** The items don't all fit:  the box scrolls. */
  @E.cssState("overflowing")
  get isOverflowing(): boolean {
    return this.canScrollStart || this.canScrollEnd
  }

  /** SIDE EFFECT:  follows the box's scroll and the sizes of it and its items, once drawn;  the cleanup stops. */
  @E.onChange("isReady", "shrinkable")
  protected onReadyToScroll(isReady: boolean) {
    const box = this.box
    if (!isReady || !box) return
    const stop = new AbortController()
    box.addEventListener("scroll", () => this.measure(), { passive: true, signal: stop.signal })
    const resizes = new ResizeObserver(() => this.measure())
    resizes.observe(box)
    const slot = box.querySelector("slot")
    const watchItems = () => {
      for (const item of slot?.assignedElements() ?? []) resizes.observe(item)
    }
    watchItems()
    slot?.addEventListener("slotchange", watchItems, { signal: stop.signal })
    this.measure()
    return () => {
      stop.abort()
      resizes.disconnect()
    }
  }

  /** Read where the box is scrolled to, and how far it can go. */
  private measure() {
    const box = this.box
    if (!box) return
    // a shrinkable one fits its titles instead:  no keys, no fades
    const canScroll = !this.shrinkable
    const { start, end } = E.scrollEnds(box)
    this.canScrollStart = canScroll && start
    this.canScrollEnd = canScroll && end
  }

  /**
   * Scroll by most of the box's width:  `-1` back, `1` on;  smoothly, unless the person asked for less motion.
   * - The kit's `scrollByRow()`, as the site header's keys scroll its tabs.
   */
  @E.untracked
  scrollByPage(direction: -1 | 1) {
    if (this.box) E.scrollByRow(this.box, direction)
  }

  ////////////////
  // ## Rendering
  ////////////////

  /** Which slots have light-DOM children:  a bar's slot box draws only when it has some. */
  readonly slots = new E.SlotContent(this.domElement)

  render(): JSX.Element {
    return (
      <div class={[TOOLBAR_CLASS, { [EMPTY]: !this.slots.hasContent("") }]} part={this.toolbarPart("toolbar")}>
        {this.barSlot(ICON)}
        {this.barSlot(TITLE)}
        {this.barSlot(CENTER)}
        {this.scrollButton(START)}
        {super.render()}
        {this.scrollButton(END)}
        {this.barSlot(RIGHT)}
      </div>
    )
  }

  /** Bar slot `name`'s box, only while something is in it. */
  private barSlot(name: BarSlot): JSX.Element {
    const slotName = this.slotForName(name as never)
    return (
      <Show when={this.slots.hasContent(slotName)}>
        <div class={name} part={this.toolbarPart(name)}>
          <slot name={slotName} />
        </div>
      </Show>
    )
  }

  /** A part of the toolbar's own (its vocabulary adds them to the menu's, which TypeScript knows). */
  private toolbarPart(name: "toolbar" | "scroll-start" | "scroll-end" | BarSlot): string {
    return this.partForName(name as never)
  }

  /** The `‹` (`start`) or `›` (`end`) button:  in the layout only while the items overflow, shown while it can go. */
  private scrollButton(end: typeof START | typeof END): JSX.Element {
    const isStart = end === START
    const label = () => this.translationForKey((isStart ? "scrollStart" : "scrollEnd") as never)
    const glyph = new E.IconGlyph({ owner: this, name: () => (isStart ? CHEVRON_START : CHEVRON_END) })
    return (
      <button
        type="button"
        class={`${SCROLL} ${end}`}
        part={this.toolbarPart(isStart ? "scroll-start" : "scroll-end")}
        tabindex="-1"
        aria-label={label()}
        title={label()}
        hidden={!this.isOverflowing}
        data-can={(isStart ? this.canScrollStart : this.canScrollEnd) ? "" : undefined}
        onClick={() => this.scrollByPage(isStart ? -1 : 1)}
      >
        <Show when={glyph.svg}>{(svg) => svg()}</Show>
      </button>
    )
  }
}
/** The vocabulary's attribute getters, typed (see "Attributes" in `UIComponent`). */
export interface UIToolbar extends E.AttributeValues<typeof menuVocabulary> {}

////////////////
// ## Constants
////////////////

/** Classes of the box around the menu and its buttons. */
const TOOLBAR_CLASS = "ui toolbar"

/** Class word of the two scroll buttons. */
const SCROLL = "scroll"

/** The `‹` button's end. */
const START = "start"

/** The `›` button's end. */
const END = "end"

/** The `‹` button's icon. */
const CHEVRON_START = "chevron left"

/** The `›` button's icon. */
const CHEVRON_END = "chevron right"

/** Class word of a toolbar with no items:  its menu box takes no room. */
const EMPTY = "empty"

/** The bar's `icon` slot (and its box's class word and part). */
const ICON = "icon"

/** The bar's `title` slot. */
const TITLE = "title"

/** The bar's `center` slot:  the room left after the icon and title. */
const CENTER = "center"

/** The bar's `right` slot:  at the end. */
const RIGHT = "right"

/** A slot of the bar's layout around the items. */
type BarSlot = typeof ICON | typeof TITLE | typeof CENTER | typeof RIGHT
