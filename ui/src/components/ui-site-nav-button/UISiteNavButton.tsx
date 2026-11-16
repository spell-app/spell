import { Show } from "solid-js"
import { isServer, type JSX } from "@solidjs/web"

import { E, UIT } from "spell/ui/core"
// the family barrel, not the leaf:
// the lib build then imports `ui-item.js` instead of splitting a shared chunk
// (SIDE EFFECT:  defines `<ui-item>`, which the button extends)
import { UIItem } from "spell/ui/components/ui-item"
import type { itemVocabulary } from "spell/ui/components/ui-item/UIItem.en"
import type { DOMPageLayoutElement, UIPageLayout } from "spell/ui/components/ui-page-layout/UIPageLayout"
import { siteNavButtonVocabulary } from "./UISiteNavButton.en"

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
 *   - Outside a menu, where an item draws nothing of its own, it's a small basic `<ui-button>` with the same icon.
 * - A click:  the nearest `<ui-page-layout>` around it, across shadow roots, `toggleDrawer()`s.
 *   - So narrow, the drawer slides in and out;  wide, it shows only its icons, or all of it again.
 * - `aria-expanded` says whether the layout's drawer shows all of it.
 * - With one inside it, the layout draws no menu button of its own.
 * - It finds its layout by its English tag (`ui-page-layout`).
 ****************/
export class UISiteNavButton extends UIItem {
  // the item's names under the button's tag, and its words:  TypeScript only knows the item's literals
  @E.proto static vocabulary = siteNavButtonVocabulary as unknown as typeof itemVocabulary
  @E.protoMerged static elementSetup = {
    // the item's own, restated:  its setup is typed as its literal
    styleSheets: { item: UIItem.elementSetup.styleSheets.item },
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

  /** SIDE EFFECT:  a click shows or hides the layout's drawer. */
  @E.on("click")
  protected onClick() {
    if (!this.isDisabled) this.layoutComponent?.toggleDrawer()
  }

  ////////////////
  // ## Its look and its name
  ////////////////

  /** Its icon:  its own `icon` attribute, else `columns`.  (A member with an attribute's name wins over it.) */
  get icon(): string | undefined {
    return this.attributes.icon ?? COLUMNS
  }

  /** Always a button:  something to press, in any owner. */
  get rootTag(): "a" | "button" | "div" {
    return this.kind === UIT.ITEM ? "button" : "div"
  }

  /** What it's called:  the page's `aria-label`, else its words. */
  protected get boxLabel(): string | undefined {
    return super.boxLabel ?? this.translationForKey(LABEL)
  }

  /** Its tooltip:  the page's `title`, else its words. */
  protected get boxTooltip(): string | undefined {
    const own = this.attributes.title
    return own === null ? this.translationForKey(LABEL) : own || undefined
  }

  /** Does the layout's drawer show all of it:  its `aria-expanded`. */
  protected get boxExpanded(): "true" | "false" | undefined {
    const layout = this.layoutComponent
    return layout ? (String(layout.isDrawerShown) as "true" | "false") : undefined
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

/** The layout's tag. */
const PAGE_LAYOUT = "ui-page-layout"

/** Its icon, today's top bar's side bar button's. */
const COLUMNS = "columns"

/** Its look outside a menu:  a small basic button, as the layout's own menu button. */
const BASIC = "basic"
const SMALL = "small"
