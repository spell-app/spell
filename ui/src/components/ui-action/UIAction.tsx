import { For, Show } from "solid-js"
import type { JSX } from "@solidjs/web"

import { E, UI, UIT } from "spell-ui/core"
// the family barrel, not the leaf:
// the lib build then imports `ui-item.js` instead of splitting a shared chunk
// (SIDE EFFECT:  defines `<ui-item>`, which an action extends)
import { UIItem } from "spell-ui/components/ui-item"
import type { itemVocabulary } from "spell-ui/components/ui-item/UIItem.en"
import { actionVocabulary } from "./UIAction.en"

import actionCSS from "./UIAction.css?inline"

/****************
 * ### `<ui-action>`
 * The component behind `<ui-action>`:  a menu item or toolbar button drawn from an ACTION,
 * something a program can do (epic `elemental-spell` P10).
 *
 *     <button class="[disabled] [active] item" part="item">      (a menu's or toolbar's item box, `UIItem`'s)
 *       <span class="icon" part="icon">  <svg>  </span>                (with an icon)
 *       <span class="title" part="title">  <slot>title</slot>  </span>
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
 * - Its shortcut's key caps:  `meta` is ⌘ on a Mac, Ctrl elsewhere (`keyCapsFor()`).
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

  /** Always a button (a link with `href`):  something to press, in any owner. */
  get rootTag(): "a" | "button" | "div" {
    if (this.type !== UIT.ITEM) return "div"
    return this.href ? "a" : "button"
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
  // ## Rendering
  ////////////////

  /** Its title (the slot, else the action's), then its shortcut's key caps. */
  protected boxContent(): JSX.Element {
    const caps = () => (this.shortcut ? this.keyCapsFor(this.shortcut) : [])
    return (
      <>
        <span class={TITLE} part={this.actionPart(TITLE)}>
          <slot>{this.title}</slot>
        </span>
        <Show when={caps().length}>
          <span class={SHORTCUT} part={this.actionPart(SHORTCUT)}>
            <For each={caps()}>{(cap) => <kbd>{cap}</kbd>}</For>
          </span>
        </Show>
      </>
    )
  }

  /**
   * The key caps of `shortcut` as a template writes it:  `meta+shift+Z` is `⌘ ⇧ Z` on a Mac, `Ctrl Shift Z`
   * elsewhere.
   * - `meta` / `mod`:  command on a Mac, control elsewhere, as spell's runner presses it;  `command`, `control`,
   *   `option` / `alt` and `shift` as written.
   * - The key itself:  a letter in capitals, `space` by its name.
   */
  keyCapsFor(shortcut: string): string[] {
    const isApple = UI.browser.isApple
    const text = (key: string) => this.translationForKey(key as never)
    const caps = shortcut.split("+").map((part, index, parts) => {
      const word = part.trim().toLowerCase()
      if (index === parts.length - 1) {
        if (word === "space" || word === "spacebar") return text("keySpace")
        return word.length === 1 ? word.toUpperCase() : part.trim()
      }
      if (word === "meta" || word === "mod") return isApple ? COMMAND : text("keyControl")
      if (word === "command" || word === "cmd") return COMMAND
      if (word === "control" || word === "ctrl") return isApple ? CONTROL : text("keyControl")
      if (word === "shift") return isApple ? SHIFT : text("keyShift")
      if (word === "option" || word === "alt") return isApple ? OPTION : text("keyAlt")
      return part.trim()
    })
    return caps.filter(Boolean)
  }

  /** A part of the action's own (its vocabulary adds them to the item's, which TypeScript knows). */
  private actionPart(name: typeof TITLE | typeof SHORTCUT): string {
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
  /** its keys, as a template writes them, e.g. `meta+T` */
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

/** Class word and part of the title's box. */
const TITLE = "title"

/** Class word and part of the key caps' box. */
const SHORTCUT = "shortcut"

/** A Mac's key caps. */
const COMMAND = "⌘"
const CONTROL = "⌃"
const SHIFT = "⇧"
const OPTION = "⌥"
