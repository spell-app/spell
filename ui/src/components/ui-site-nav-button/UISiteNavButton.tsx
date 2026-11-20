import { Show } from "solid-js"
import { isServer, type JSX } from "@solidjs/web"

import { E, UIT } from "spell/ui/core"
// the family barrel, not the leaf:
// the lib build then imports `ui-item.js` instead of splitting a shared chunk
// (SIDE EFFECT:  defines `<ui-item>`, which the button extends)
import { UIItem } from "spell/ui/components/ui-item"
import type { itemVocabulary } from "spell/ui/components/ui-item/UIItem.en"
import type { DOMPageLayoutElement, Side, UIPageLayout } from "spell/ui/components/ui-page-layout/UIPageLayout"
import { siteNavButtonVocabulary } from "./UISiteNavButton.en"

import siteNavButtonCSS from "./UISiteNavButton.css?inline"

/****************
 * ### `<ui-site-nav-button>`
 * The component behind `<ui-site-nav-button>`:  the drawer's button (epic `mockup` T39).
 *
 *     <button class="icon item" part="item" aria-label="Show or hide the side bar" aria-expanded="true">
 *       <span class="icon" part="icon">  <svg>  </span>                 (`columns`)
 *     </button>
 *
 * - It IS a `<ui-item>` (it extends `UIItem`):  an app menu draws it as one of its items, as today's top bar's side
 *   bar button.
 *   - Its icon is `columns`, and its name and tooltip its words (`label`), unless the page writes its own.
 *   - Narrow, the drawer hidden until it slides in:  `bars`, a menu's, and its words for that (`menuLabel`).
 *   - Outside a menu, where an item draws nothing of its own, it's a small basic `<ui-button>` with the same icon.
 * - A click:  the nearest `<ui-page-layout>` around it, across shadow roots, `toggleDrawer()`s.
 *   - So narrow, the drawer slides in and out;  wide, it shows only its icons, or all of it again.
 * - `toggles="right"` (or `left`):  a click `toggleSidebar()`s that side bar instead (epic `mockup` T55),
 *   and its words say so (`rightLabel`);  narrow, the layout hides that side bar behind it.
 * - `aria-expanded` says whether the layout's drawer (or its side bar) is shown.
 * - With one for the drawer inside it, the layout draws no menu button of its own.
 * - It finds its layout by its English tag (`ui-page-layout`).
 ****************/
export class UISiteNavButton extends UIItem {
  // the item's names under the button's tag, and its words:  TypeScript only knows the item's literals
  @E.proto static vocabulary = siteNavButtonVocabulary as unknown as typeof itemVocabulary
  @E.protoMerged static elementSetup = {
    // the item's own, restated:  its setup is typed as its literal
    styleSheets: { item: UIItem.elementSetup.styleSheets.item, "site-nav-button": siteNavButtonCSS },
    isAPart: true,
    disabled: "its own"
  } satisfies Partial<E.ElementSetup>

  ////////////////
  // ## The layout around it
  ////////////////

  /** The `<ui-page-layout>` around it, while connected;  `undefined` outside one. */
  @E.state accessor layout: DOMPageLayoutElement | undefined = undefined

  /** While connected:  find the layout around it. */
  @E.whileConnected
  protected findLayout() {
    this.layout = E.closestAcrossShadow<DOMPageLayoutElement>(this.domElement, PAGE_LAYOUT) ?? undefined
    return () => (this.layout = undefined)
  }

  /** The layout's component, once its family has loaded and it has drawn. */
  private get layoutComponent(): UIPageLayout | undefined {
    return this.layout?.component
  }

  /** The side bar it shows and hides (`toggles`), or `undefined` for the drawer. */
  private get side(): Side | undefined {
    // the item's attributes are what TypeScript knows of its vocabulary:  `toggles` is the button's own
    const toggles = this.attributes.toggles
    return toggles === LEFT || toggles === RIGHT ? toggles : undefined
  }

  /** SIDE EFFECT:  a click shows or hides the layout's drawer, or its side bar (`toggles`). */
  @E.on("click")
  protected onClick() {
    if (this.isDisabled) return
    const side = this.side
    if (side) this.layoutComponent?.toggleSidebar(side)
    else this.layoutComponent?.toggleDrawer()
  }

  ////////////////
  // ## Its look and its name
  ////////////////

  /**
   * Its icon:  its own `icon` attribute, else `columns` beside a drawer it shows, `bars` while the drawer is hidden at a
   * narrow width (epic `mockup` I26).  (A member with an attribute's name wins over it.)
   */
  get icon(): string | undefined {
    return this.attributes.icon ?? (this.isForHiddenDrawer ? BARS : COLUMNS)
  }

  /** Is the layout narrow, its drawer slid out of sight until this button slides it in? */
  private get isForHiddenDrawer(): boolean {
    return !this.side && (this.layoutComponent?.isNarrow ?? false)
  }

  /**
   * Its words:  for its side bar (`toggles`);  for the menu while the drawer is hidden at a narrow width;
   * else for the drawer, the side bar a site calls it.
   */
  private get words(): string | undefined {
    const side = this.side
    if (side) return this.translationForKey(side === LEFT ? LEFT_LABEL : RIGHT_LABEL)
    return this.translationForKey(this.isForHiddenDrawer ? MENU_LABEL : LABEL)
  }

  /** Always a button:  something to press, in any owner. */
  get rootTag(): "a" | "button" | "div" {
    return this.kind === UIT.ITEM ? "button" : "div"
  }

  /** What it's called:  the page's `aria-label`, else its words. */
  protected get boxLabel(): string | undefined {
    return super.boxLabel ?? this.words
  }

  /** Its tooltip:  the page's `title`, else its words. */
  protected get boxTooltip(): string | undefined {
    const own = this.attributes.title
    return own === null ? this.words : own || undefined
  }

  /** Does the layout's drawer show all of it, or is its side bar shown (`toggles`):  its `aria-expanded`. */
  protected get boxExpanded(): "true" | "false" | undefined {
    const layout = this.layoutComponent
    if (!layout) return undefined
    const side = this.side
    return String(side ? layout.isSideShown(side) : layout.isDrawerShown) as "true" | "false"
  }

  ////////////////
  // ## Rendering
  ////////////////

  /** In a menu, its item box;  anywhere else, a small basic button. */
  render(): JSX.Element {
    const asItem = super.render()
    if (isServer) return asItem
    return (
      <Show when={this.itemContext} fallback={this.button()}>
        {asItem}
      </Show>
    )
  }

  /** The button it is outside a menu:  the same icon, name and `aria-expanded`. */
  private button(): JSX.Element {
    return (
      <ui-button
        part={this.partForName("item")}
        icon={this.icon}
        appearance={BASIC}
        size={SMALL}
        aria-label={this.boxLabel}
        title={this.boxTooltip}
        aria-expanded={this.boxExpanded}
      />
    )
  }
}

/** Its words' key in its vocabulary's `texts`:  TypeScript knows only the item's, which has none. */
const LABEL = "label" as never
const MENU_LABEL = "menuLabel" as never
const LEFT_LABEL = "leftLabel" as never
const RIGHT_LABEL = "rightLabel" as never

/** `toggles`'s side bars. */
const LEFT = "left"
const RIGHT = "right"

/** The layout's tag. */
const PAGE_LAYOUT = "ui-page-layout"

/** Its icons:  today's top bar's side bar button's;  the menu's, while the drawer is hidden. */
const COLUMNS = "columns"
const BARS = "bars"

/** Its look outside a menu:  a small basic button, as the layout's own menu button. */
const BASIC = "basic"
const SMALL = "small"
