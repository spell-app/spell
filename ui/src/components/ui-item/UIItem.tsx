import { Show, untrack } from "solid-js"
import { Dynamic, isServer, type JSX } from "@solidjs/web"

import { E, UI, UIT } from "spell/ui/core"
import { itemVocabulary } from "./UIItem.en"

import itemCSS from "./UIItem.css?inline"

/****************
 * ### `UIItem`
 * The component behind `<ui-item>`:  ONE generic item for every owner that has items,
 * as Fomantic's `.item` is shared by the dropdown, the list and the menu.
 * It draws itself for its OWNER (`PartContext`):  there is no `ui-list-item` or `ui-menu-item`.
 *
 * - No owner (a dropdown option, or a loose item):  it draws only a `<slot>`.
 *   - A dropdown reads its items as DATA (`SlottedItems`) and draws its own `.item[role=option]` rows;
 *     a RICH item is projected into its row, where this slot shows the content live.
 *   - The dropdown is a barrier, so its items never find an outer menu.
 *
 * - Owned (by `<ui-list>` or `<ui-menu>`, whose vocabularies `ownsParts` `item`):
 *   it asks the owner's component for an `ItemContext` (`ItemOwner.itemContext()`, tracked) and draws the item box:
 *   - `<a class="[color] [position] [keyOnly ...] item" part="item" href>` with `href`,
 *     a `<button type="button">` with `link` (or when the owner says its items are interactive), else a `<div>`;
 *   - a `type="header"` item is a `<div class="item header">`, a `divider` a `<div class="divider" role="separator">`;
 *   - inside the box:
 *     the `image` shorthand's `<img class="ui avatar image" part="image" alt="">`,
 *     the icon box (the `icon` shorthand or the `icon` slot), then the default slot,
 *     then the `badge` slot's box (`part="badge"`:  a count), while it has content.
 *   - in a `shrinkable` menu (`ItemContext.shrinkable`) the default slot sits in a TITLE box,
 *     `<span class="title" part="title">`, which the menu cuts with `…` or hides to fit its row (`TitleFit`);
 *     an item with words but no icon draws its title's first letter as one, `<span class="icon letter">`,
 *     shown only while the menu shows icons only.
 *
 * - Styles:  `UIItem.css` (the DOM element and generic resets),
 *   then the OWNER's sheets (its `elementSetup.styleSheets`),
 *   which hold the item rules keyed on `:host(:state(in-list)) > .item`, beside the static `.ui.list > .item`.
 *   The item registers them if the owner hasn't yet, and adopts them again when the owner changes.
 *
 * - Semantics:
 *   - the DOM element's role comes from the owner (`listitem`), and so does the box's (`menuitem` in a menubar);
 *   - selected => `aria-current` (the owner's value, `page`, on a link;  `true` otherwise),
 *     or `aria-pressed` on a toggle's button (`<ui-menu choose="many">`);
 *   - the DOM element's `aria-label` names the box (an icon-only item;  its `label` too, with no words of its own),
 *     and its `aria-expanded` goes to a `<button>` box (a disclosure:  a menu item that opens a group below it).
 *
 * - `active` is an ALIAS of `selected` (Fomantic's word), read from the DOM element's attribute.
 *
 * - A part (`elementSetup.isAPart`):  transparent to other parts' climbs,
 *   so a `<ui-header>` inside an item in a list is the LIST's header (`.ui.list > .item > .content > .header`).
 *   - Except in the Items view (`<ui-items>`):
 *     there the owner's `ItemContext.ownsParts` makes the item OWN its content parts
 *     (`ConditionalOwner`, `isOwnerOf()`), so they get `:state(in-item)`,
 *     as Fomantic's `.ui.items > .item > .content > .header`.
 *     Its `image` shorthand takes the owner's `imageClass`.
 ****************/
export class UIItem extends E.UIComponent<typeof itemVocabulary> implements E.ConditionalOwner {
  @E.proto static vocabulary = itemVocabulary
  @E.protoMerged static elementSetup = {
    styleSheets: { item: itemCSS },
    isAPart: true,
    // `disabled`:  its link, button or option is disabled
    disabled: "its own"
  } satisfies Partial<E.ElementSetup>

  ////////////////
  // ## Owner
  ////////////////

  /** Owner (list, menu), if any. */
  readonly context = new E.PartContext({ domElement: this.domElement, noun: this.vocabulary.noun })

  /** The owner's component, when it renders items (`ItemOwner`). */
  get owner(): Required<ItemOwnerComponent> | undefined {
    const component = this.context.ownerComponent<ItemOwnerComponent>()
    return component?.itemContext ? (component as Required<ItemOwnerComponent>) : undefined
  }

  /**
   * What the owner wants, or `undefined` when unowned (data only).
   * - `@derived`:  the owner's `itemContext()` has a SIDE EFFECT (a menu records the item and queues a refresh),
   *   so it runs once per change, not per read.
   */
  @E.derived
  get itemContext(): UIT.ItemContext | undefined {
    return this.owner?.itemContext(this.domElement)
  }

  /** The DOM element's role follows the owner (`listitem` in a list). */
  @E.aria("role")
  protected get ariaRole(): string | undefined {
    return this.itemContext?.domElementRole
  }

  /**
   * `ConditionalOwner`:  does this item own its content parts (any noun) now?
   * Only when its owner's `ItemContext` says so (the Items view).
   * - Reads the DOM (`PartContext.resolve()`), untracked:  other parts ask during their climbs, right after moves,
   *   before this item's own `owner` has landed.
   */
  isOwnerOf(): boolean {
    const owner = E.PartContext.componentFor<ItemOwnerComponent>(this.context.resolve())
    // half-tracked on purpose:
    // only the owner's item context is untracked (asking it records the item, `UIMenu.itemContext()`);
    // the rest reads as the caller tracks, so no `@E.untracked` on the method
    // oxlint-disable-next-line spell-ui/no-untrack -- half-tracked on purpose (above)
    return !!owner?.itemContext && !!untrack(() => owner.itemContext!(this.domElement)).ownsParts
  }

  /** `UIItem.css`, then the owner's sheets (registered here if the owner hasn't yet). */
  get styleSheetNames(): string[] {
    const names = Object.keys(this.elementSetup.styleSheets)
    const styles = this.owner?.elementSetup.styleSheets ?? {}
    const isLoaded = !!(globalThis as E.RuntimeGlobal)[E.RUNTIME_KEY]
    for (const [name, css] of Object.entries(styles)) {
      if (isLoaded && !UI.styles.has(name)) UI.styles.register(name, css)
      names.push(name)
    }
    return names
  }

  ////////////////
  // ## Selected and disabled
  ////////////////

  /** `selected`, or its alias, the DOM element's `active` attribute. */
  @E.cssState("selected")
  get isSelected(): boolean {
    return this.selected || E.Converters.boolean(this.attributes[UIT.ACTIVE], UIT.ACTIVE)
  }

  @E.cssState("disabled")
  get isDisabled(): boolean {
    return this.disabled
  }

  protected classValue(name: E.AttributeName<typeof itemVocabulary>): unknown {
    if (name === UIT.SELECTED) return this.isSelected
    return name === UIT.DISABLED ? this.isDisabled : super.classValue(name)
  }

  /** `aria-current` while selected:  the owner's value on a link (`page`), else `true`. */
  private get ariaCurrent(): UIT.ItemContext["current"] | undefined {
    if (!this.isSelected || this.kind !== UIT.ITEM || this.isAToggle) return undefined
    return this.rootTag === "a" ? (this.itemContext?.current ?? "page") : "true"
  }

  /** A toggle in its owner (`ItemContext.pressed`):  a button box, pressed while selected. */
  private get isAToggle(): boolean {
    return !!this.itemContext?.pressed && this.kind === UIT.ITEM && this.rootTag === "button"
  }

  ////////////////
  // ## The box
  ////////////////

  /** Root element:  link, button, or plain box. */
  get rootTag(): RootTag {
    const context = this.itemContext
    if (this.kind !== UIT.ITEM) return "div"
    if (this.link) return "a"
    return this.looksLikeALink || context?.interactive ? "button" : "div"
  }

  /** `appearance` holds `link`:  interactive without a `link` to go to, a `<button>` with the link hover. */
  get looksLikeALink(): boolean {
    return String(this.appearance ?? "")
      .split(" ")
      .includes(LINK_LOOK)
  }

  /** The rendered item box, while owned. */
  private boxElement: HTMLElement | undefined

  /**
   * The item box (`<a>` / `<button>` / `<div>` in the shadow root), or `undefined` while unowned:
   * what an owner moves focus between.
   * - A menubar's roving tabindex:  the DOM element stays untabbable,
   *   so assistive tech and axe see the owner's role pattern through it.
   */
  get focusTarget(): HTMLElement | undefined {
    return this.boxElement?.isConnected ? this.boxElement : undefined
  }

  /**
   * `header` for a header item;  `ui-<color>` for a coloured one.
   * - Why:  the generic colour remap (`colors.css`) keys on `.ui.red` / `.ui-red`, and an item has no `ui`.
   */
  protected get extraClass(): string | undefined {
    const color = this.color
    const extra = [this.kind === UIT.HEADER ? UIT.HEADER : "", color ? `${UIT.COLOR_CLASS_PREFIX}${color}` : ""]
    return extra.filter(Boolean).join(" ") || undefined
  }

  ////////////////
  // ## Icon and image
  ////////////////

  /** Light-DOM slot occupancy. */
  readonly slots = new E.SlotContent(this.domElement)

  /** Glyph of the `icon` shorthand;  only loaded once rendered by an owner. */
  readonly iconGlyph = new E.IconGlyph({ owner: this, name: () => (this.itemContext ? this.icon : undefined) })

  /** Has an icon (shorthand or `icon` slot)? */
  get hasIcon(): boolean {
    return !!this.icon || this.slots.hasContent(this.slotForName("icon"))
  }

  /** `image` as a URL. */
  get imageUrl(): string | undefined {
    return this.image?.trim() || undefined
  }

  ////////////////
  // ## The title (a `shrinkable` menu's)
  ////////////////

  /**
   * It draws its title in a box of its own (`part="title"`):  its menu is `shrinkable`, and it has words.
   * - An item with only an icon (a menu's bullhorn) has none:  its menu leaves it as it is.
   */
  get hasTitleBox(): boolean {
    return !!this.itemContext?.shrinkable && this.kind === UIT.ITEM && this.slots.hasContent("")
  }

  /** It has a title box, in a `shrinkable` menu:  one the menu fits. */
  get isInShrinkableMenu(): boolean {
    return !!this.itemContext?.shrinkable && this.hasTitleBox
  }

  /** What the title box shows while its slot is empty:  nothing;  `<ui-action>`'s, its action's title. */
  protected get titleFallback(): string | undefined {
    return undefined
  }

  /** The title box, while drawn:  what a `shrinkable` menu measures and cuts. */
  get titleBox(): HTMLElement | undefined {
    return this.hasTitleBox && this.titleElement?.isConnected ? this.titleElement : undefined
  }
  private titleElement: HTMLElement | undefined

  /**
   * The words of its default slot, read from its light DOM:  its text and its children's, but not a named slot's
   * (an icon mark, a badge).
   * - Read again whenever its children or their text change.
   */
  @E.watches({ childList: true, characterData: true, subtree: true, attributeFilter: ["slot"] })
  get slottedText(): string {
    let text = ""
    for (const node of this.domElement.childNodes) {
      if (node.nodeType === E.NodeType.text) text += node.textContent ?? ""
      else if (node.nodeType === E.NodeType.element && !(node as Element).hasAttribute("slot")) {
        text += node.textContent ?? ""
      }
    }
    return text.replace(/\s+/g, " ").trim()
  }

  /**
   * Its title, as a person reads it:  its `label`, else the words of its default slot, else the title box's fallback.
   * - A `shrinkable` menu's tooltip while it shows icons only, and its row in the overflow menu.
   */
  get titleText(): string {
    return this.label?.trim() || this.slottedText || this.titleFallback || ""
  }

  /**
   * Its title's first letter, drawn as its icon when it has none (epic `ui-gaps` P13;  epic `epic-engine` Q32):
   * `Questions` shows `Q`.
   * - Only in a `shrinkable` menu, and only for an item with words and no icon or image of its own.
   * - Never on a server:  the static render draws the titles whole.
   */
  get letterIcon(): string | undefined {
    if (isServer || !this.isInShrinkableMenu || this.hasIcon || this.imageUrl) return undefined
    return this.firstLetter
  }

  /** Its title's first letter or digit, upper case:  what stands for it with no icon (its first-letter icon, a row). */
  get firstLetter(): string | undefined {
    return LETTER_OR_DIGIT.exec(this.titleText)?.[0].toLocaleUpperCase()
  }

  /**
   * The box's tooltip in a `shrinkable` menu:  the element's own `title` where the page wrote one (or `tooltip`;
   * `title=""` for none), else its title while the menu shows icons only.
   */
  private get boxTooltip(): string | undefined {
    if (!this.isInShrinkableMenu) return undefined
    // the page's own wins, an empty one too:  it wants no tooltip there
    const own = this.attributes.title
    if (own !== null) return own || undefined
    return this.itemContext?.iconsOnly ? this.titleText || undefined : undefined
  }

  /**
   * The box's accessible name:  the element's `aria-label`;  else, for an item with no words of its own (an icon
   * button), its `label`.
   */
  private get boxLabel(): string | undefined {
    return this.attributes["aria-label"] ?? (this.slots.hasContent("") ? undefined : this.label?.trim() || undefined)
  }

  /** Light-DOM children in slot `name` (`icon`, `badge`):  what a `shrinkable` menu copies into its overflow menu. */
  slotted(name: "icon" | "badge"): Element[] {
    const slot = this.slotForName(name)
    return [...this.domElement.children].filter((child) => child.getAttribute("slot") === slot)
  }

  /** Has something in its `badge` slot:  a count. */
  get hasBadge(): boolean {
    return this.slots.hasContent(this.slotForName("badge"))
  }

  ////////////////
  // ## Rendering
  ////////////////

  /** The slot alone (unowned), a divider, or the item box. */
  render(): JSX.Element {
    return (
      <Show when={this.itemContext} fallback={this.unowned()}>
        <Show
          when={this.kind !== DIVIDER}
          fallback={<div class={DIVIDER} part={this.partForName("item")} role="separator" />}
        >
          {this.box()}
        </Show>
      </Show>
    )
  }

  /**
   * An unowned item's render:  just its content, the bare `<slot>`.
   * - Server render (`spell/ui/static`):  wrapped in a `<span>`, the DOM element's stand-in
   *   (`:host`'s `display: contents` reaches it as the root).
   * - Why:  the flattener hands a DOM element's `slot` to its render's FIRST element only,
   *   so a rich dropdown item (`<b>Bold</b> one`, assigned to its row's named slot)
   *   would lose the text beside its element (seo plan, I20).
   */
  private unowned(): JSX.Element {
    return isServer ? (
      <span>
        <slot />
      </span>
    ) : (
      <slot />
    )
  }

  /**
   * The owned item box, around its content (`boxContent()`).
   * - The DOM element's `aria-label` names it (an icon-only item);  its `aria-expanded` goes to a `<button>` box.
   */
  private box(): JSX.Element {
    const isDisabledButton = () => this.rootTag === "button" && this.isDisabled
    return (
      <Dynamic
        ref={(element: HTMLElement) => (this.boxElement = element)}
        component={this.rootTag}
        class={this.rootClass}
        part={this.partForName("item")}
        href={this.rootTag === "a" ? this.linkTo : undefined}
        target={this.rootTag === "a" ? this.linkTarget : undefined}
        type={this.rootTag === "button" ? "button" : undefined}
        role={this.kind === UIT.ITEM ? this.itemContext?.role : undefined}
        disabled={isDisabledButton() && !this.itemContext?.role ? true : undefined}
        aria-disabled={this.isDisabled && !(isDisabledButton() && !this.itemContext?.role) ? "true" : undefined}
        aria-current={this.ariaCurrent}
        aria-pressed={this.isAToggle ? (this.isSelected ? "true" : "false") : undefined}
        aria-label={this.boxLabel}
        title={this.boxTooltip}
        aria-expanded={
          this.rootTag === "button"
            ? ((this.attributes["aria-expanded"] ?? undefined) as "true" | "false" | undefined)
            : undefined
        }
        data-value={this.value}
      >
        <Show when={this.imageUrl}>
          <img
            class={this.itemContext?.imageClass ?? IMAGE_CLASS}
            part={this.partForName("image")}
            src={this.imageUrl}
            alt=""
          />
        </Show>
        <Show when={this.hasIcon}>
          <span class={UIT.ICON} part={this.partForName("icon")}>
            <slot name={this.slotForName("icon")}>{this.iconGlyph.svg}</slot>
          </span>
        </Show>
        <Show when={this.letterIcon}>
          {(letter) => (
            <span class={`${UIT.ICON} ${LETTER}`} part={this.partForName("icon")} aria-hidden="true">
              {letter()}
            </span>
          )}
        </Show>
        {this.boxContent()}
      </Dynamic>
    )
  }

  /**
   * What the box holds after its image and icon:  the default slot (in its title box, in a `shrinkable` menu),
   * then the `badge` slot's box;  `<ui-action>` adds its keys.
   */
  protected boxContent(): JSX.Element {
    const badge = () => this.slotForName("badge")
    return (
      <>
        <Show when={this.hasTitleBox} fallback={<slot />}>
          <span
            ref={(element: HTMLElement) => (this.titleElement = element)}
            class={TITLE}
            part={this.partForName("title")}
          >
            <slot>{this.titleFallback}</slot>
          </span>
        </Show>
        <Show when={this.hasBadge}>
          <span class={BADGE} part={this.partForName("badge")}>
            <slot name={badge()} />
          </span>
        </Show>
      </>
    )
  }
}

/** The vocabulary's attribute getters, typed (see "Attributes" in `UIComponent`). */
export interface UIItem extends E.AttributeValues<typeof itemVocabulary> {}

/** An owner's component as the item first sees it:  `itemContext` only when it renders items (`ItemOwner`). */
type ItemOwnerComponent = E.UIComponent & Partial<UIT.ItemOwner>

/** Root element names. */
type RootTag = "a" | "button" | "div"

/** The `divider` type, and the class of its root. */
const DIVIDER = "divider"

/** The `appearance` word for an interactive item with the link hover. */
const LINK_LOOK = "link"

/** Classes of the `image` shorthand, unless the owner says otherwise:  an avatar, as in Fomantic's list examples. */
const IMAGE_CLASS = "ui avatar image"

/** Class word and part of the title box, in a `shrinkable` menu. */
const TITLE = "title"

/** Class word of the `badge` slot's box. */
const BADGE = "badge"

/** Class word of the icon box that draws the title's first letter. */
const LETTER = "letter"

/** A letter or a digit:  what a first-letter icon shows. */
const LETTER_OR_DIGIT = /[\p{L}\p{N}]/u
