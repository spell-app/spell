import { For, Show } from "solid-js"
import type { JSX } from "@solidjs/web"

import { E, UI, UIT } from "spell/ui/core"
// the family barrel, not the leaf:
// the lib build then imports `ui-item.js` instead of splitting a shared chunk
// (SIDE EFFECT:  defines `<ui-item>`, which an action extends)
import { UIItem } from "spell/ui/components/ui-item"
import type { itemVocabulary } from "spell/ui/components/ui-item/UIItem.en"
import { UIKeys } from "spell/ui/components/ui-keys/UIKeys"
import { actionVocabulary } from "./UIAction.en"

import actionCSS from "./UIAction.css?inline"

/****************
 * ### `<ui-action>`
 * The component behind `<ui-action>`:  a menu item or toolbar button drawn from an ACTION,
 * something a program can do (epic `elemental-spell` P10).
 *
 *     <button class="[disabled] [active] item" part="item">      (a menu's or toolbar's item box, `UIItem`'s)
 *       <span class="icon" part="icon">  <svg>  </span>                (with an icon)
 *       <span class="title" part="title">  <slot>title</slot>  </span>     (`UIItem`'s title box, always drawn)
 *       <span class="shortcut" part="shortcut">  <kbd>⌘</kbd><kbd>T</kbd>  </span>   (with a shortcut)
 *     </button>
 *
 * - It IS a `<ui-item>` (it extends `UIItem`):  a menu, toolbar or list draws it as one of its items.
 * - Its `action` property says what it draws, read live:
 *   - its title (the default slot's fallback), icon and shortcut
 *   - greyed while not `isEnabled` (`:state(disabled)`), ticked while `isSelected` (`:state(selected)`)
 *   - a click runs it (`run("click")`), unless it's disabled
 * - Knows nothing of spell:  any object of that shape will do.
 *   Spell's runner hands it each item of `core.menuOf()`;  the `disabled`, `selected` and `icon` attributes still
 *   work without one.
 * - Its shortcut's key caps, read and drawn as `<ui-keys>`' are (`keyCapsFor()`):
 *   `mod` is ⌘ on a Mac and Ctrl elsewhere;  `meta` is the Meta key itself.
 *   Plain caps, as a menu shows them, where `<ui-keys>` draws boxes.
 * - Where its caps don't show (a toolbar's own row, unless `show-keys`;  icons only), its tooltip names its keys:
 *   `Undo (⌘Z)`.
 * - `icon-only`:  its icon alone, at every width (`:state(icon-only)`), its title its tooltip and its name:
 *   - its title box is still drawn, but hidden, so a `shrinkable` menu still folds it into its `…` button
 *     with the rest, where its row shows its title
 *   - in a vertical menu, side by side with the icon-only actions next to it, in one row (`UIMenu.css`):
 *     a context menu's Undo and Redo
 *   - an action with no icon shows its title as before:  there's nothing else to show
 ****************/
export class UIAction extends UIItem {
  // the item's names under the action's tag, and its own:  TypeScript only knows the item's literals
  @E.proto static vocabulary = actionVocabulary as unknown as typeof itemVocabulary
  @E.protoMerged static elementSetup = {
    styleSheets: { item: UIItem.elementSetup.styleSheets.item, action: actionCSS },
    // the item's own, restated:  its setup is typed as its literal
    isAPart: true,
    disabled: "its own"
  } satisfies Partial<E.ElementSetup>

  ////////////////
  // ## The action
  ////////////////

  /** The action it draws, its `action` property, if it has one. */
  get actionToDraw(): ActionToDraw | undefined {
    const action = (this as unknown as { action?: unknown }).action
    return action && typeof action === "object" ? (action as ActionToDraw) : undefined
  }

  /** Its title:  the action's. */
  get title(): string {
    return this.actionToDraw?.title ?? ""
  }

  /** Its icon:  its own `icon` attribute, else the action's.  (A member with an attribute's name wins over it.) */
  get icon(): string | undefined {
    return this.attributes.icon ?? this.actionToDraw?.icon
  }

  /**
   * What it shows for attribute `name` while it isn't set:  its action's title for `label`, its icon for `icon`.
   * - A property editor shows it as that field's placeholder (`UIProperty`;  epic `editor` I208).
   */
  unsetValueOf(name: string): string | undefined {
    if (name === LABEL) return this.actionToDraw?.title || undefined
    if (name === ICON) return this.actionToDraw?.icon || undefined
    return undefined
  }

  /** Its shortcut:  its own `shortcut` attribute, else the action's. */
  get shortcut(): string | undefined {
    return this.attributes.shortcut || this.actionToDraw?.shortcut
  }

  /**
   * Disabled by its attribute, or while its action isn't enabled.
   * - SIDE EFFECT:  the DOM element swallows clicks meanwhile, as for any item.
   */
  @E.cssState("disabled")
  get isDisabled(): boolean {
    const action = this.actionToDraw
    return super.isDisabled || (!!action && !action.isEnabled)
  }

  /** Selected by its attribute, or while its action is on (ticked). */
  @E.cssState("selected")
  get isSelected(): boolean {
    return super.isSelected || !!this.actionToDraw?.isSelected
  }

  /** Always a button (a link with `link`):  something to press, in any owner. */
  get rootTag(): "a" | "button" | "div" {
    if (this.kind !== UIT.ITEM) return "div"
    return this.link ? "a" : "button"
  }

  /** SIDE EFFECT:  a click on it runs its action, unless it's disabled. */
  @E.on("click")
  protected onClick(event: MouseEvent) {
    if (this.isDisabled) {
      event.preventDefault()
      return
    }
    void Promise.resolve(this.actionToDraw?.run("click")).catch((error) => console.error(error))
  }

  ////////////////
  // ## Icon only
  ////////////////

  /**
   * It shows its icon alone (`icon-only`), and has one:  `:state(icon-only)`, which hides its title box
   * (`UIAction.css`).
   */
  @E.cssState("icon-only")
  get showsIconOnly(): boolean {
    return this.kind === UIT.ITEM && this.hasIcon && E.Converters.boolean(this.attributes[ICON_ONLY], ICON_ONLY)
  }

  /**
   * Fomantic's `icon item` (its icon centred, no gap after it) while it shows its icon alone too,
   * but not in a menu with ticks or an icon column, where every row keeps its icon in the column.
   */
  get isIconOnly(): boolean {
    if (!this.showsIconOnly) return super.isIconOnly
    return !this.isInTicks && !this.isInIconColumn && !this.hasBadge && !this.imageUrl
  }

  /** The box's name:  the page's (`aria-label`), else its title while it shows its icon alone. */
  protected get boxLabel(): string | undefined {
    return super.boxLabel ?? (this.showsIconOnly ? this.titleText || undefined : undefined)
  }

  ////////////////
  // ## Rendering
  ////////////////

  /** Always its title box, in any owner:  its slot, else its action's title. */
  get hasTitleBox(): boolean {
    return this.kind === UIT.ITEM
  }

  /** Its title box's fallback:  its action's title. */
  protected get titleFallback(): string {
    return this.title
  }

  /**
   * Its key caps show beside its title:  not in a toolbar's own row (unless `show-keys`), nor while its menu shows
   * icons only, nor while it shows its icon alone (`icon-only`).
   */
  get drawsShortcut(): boolean {
    const context = this.itemContext
    return !context?.hidesShortcuts && !context?.iconsOnly && !this.showsIconOnly
  }

  /**
   * The box's tooltip:  where its key caps don't show, its title and its keys, `Auto Play (A)`, `Undo (⌘Z)` on a Mac,
   * `Undo (Ctrl+Z)` elsewhere.
   * - Its title alone while it shows its icon alone (`icon-only`) and has no keys.
   * - The page's own `title` still wins (`UIItem`'s).
   */
  protected get boxTooltip(): string | undefined {
    const tooltip = super.boxTooltip
    if (this.attributes.title !== null || this.drawsShortcut) return tooltip
    const caps = this.shortcut ? this.keyCapsFor(this.shortcut) : []
    if (caps.length) return `${this.titleText} (${caps.join(UI.browser.isApple ? "" : KEY_JOIN)})`
    return this.showsIconOnly ? this.titleText || tooltip : tooltip
  }

  /** The item's title box and badge (`UIItem.boxContent()`), then its shortcut's key caps, while they show. */
  protected boxContent(): JSX.Element {
    const caps = () => (this.shortcut && this.drawsShortcut ? this.keyCapsFor(this.shortcut) : [])
    return (
      <>
        {super.boxContent()}
        <Show when={caps().length}>
          <span class={SHORTCUT} part={this.actionPart(SHORTCUT)}>
            <For each={caps()}>{(cap) => <kbd>{cap}</kbd>}</For>
          </span>
        </Show>
      </>
    )
  }

  /**
   * The key caps of `shortcut` as a template writes it:  `mod+shift+Z` is `⌘ ⇧ Z` on a Mac, `Ctrl Shift Z`
   * elsewhere.
   * - Read as every shortcut is (`UI.keyboard.chord()`), drawn from `<ui-keys>`' caps (`UIKeys.capsOf()`):
   *   `mod` is command on a Mac and control elsewhere;  `meta` the Meta key (⌘ on a Mac);
   *   `ctrl`, `alt` (Option) and `shift` those keys.
   * - Off a Mac, the words are the page's language (Ctrl, Shift, Alt), and so is `space`'s.
   * - A shortcut it can't read draws no caps, and warns.
   */
  keyCapsFor(shortcut: string): string[] {
    const isApple = UI.browser.isApple
    try {
      const chord = UI.keyboard.chord(shortcut, { isApple })
      // its vocabulary adds these texts to the item's, which TypeScript knows
      return UIKeys.capsOf(chord, isApple, (word) => this.translationForKey(word as never))
    } catch (error) {
      E.Warnings.warn("<ui-action>", `can't read the shortcut ${JSON.stringify(shortcut)}`, error)
      return []
    }
  }

  /** A part of the action's own (its vocabulary adds them to the item's, which TypeScript knows). */
  private actionPart(name: typeof SHORTCUT): string {
    return this.partForName(name as never)
  }
}
/** The vocabulary's attribute getters, typed (see "Attributes" in `UIComponent`). */
export interface UIAction extends E.AttributeValues<typeof itemVocabulary> {}

/**
 * What `<ui-action>` draws and runs:  an action of a program, read live.
 * - Spell's `core.menuOf()` gives a menu's items in this shape.
 */
export type ActionToDraw = {
  /** what people read, e.g. `Undo Turn Card` */
  readonly title: string
  /** an icon's name, e.g. `rotate` */
  readonly icon?: string
  /** its keys, as a template writes them, e.g. `mod+T` */
  readonly shortcut?: string
  /** can it run now?  Greyed while not. */
  readonly isEnabled: boolean
  /** is it on now?  Ticked while so. */
  readonly isSelected: boolean
  /** run it;  `way`:  how the person ran it */
  run(way?: "click" | "key" | "menu"): unknown
}

////////////////
// ## Constants
////////////////

/** Its attribute that shows its icon alone. */
const ICON_ONLY = "icon-only"

/** Its attributes whose unset value is its action's (`unsetValueOf()`). */
const LABEL = "label"
const ICON = "icon"

/** Class word and part of the key caps' box. */
const SHORTCUT = "shortcut"

/** Between two key caps in a tooltip, off a Mac:  `Ctrl+Z`. */
const KEY_JOIN = "+"
