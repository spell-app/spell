import { E } from "spell/ui/core"
import { RootLoader } from "spell/ui/components/ui-root"
import type { ContextMenuElement, Core, MenuItem } from "spell/parser/core"

/****************
 * ### `ActionMenus`
 * A running program's ACTIONS, on the page (epic `elemental-spell` P10):  its shortcut keys, and its menus drawn
 * as Spell UI's `<ui-action>`s.
 *
 * - Keys:  `runShortcut()` hands a key to the program's core, which runs the first enabled action bound to it,
 *   from the focused thing up to the app (`core.runShortcut()`).
 * - Menus:  a template's `- its "game menu" is a menu of ...`, found by name on a
 *   thing or up its chain (`core.menuOf()`), drawn three ways:
 *   - as a toolbar or menu in a drawing, `<ui-toolbar menu="GameMenu" />`:  `fill()` puts its actions in
 *   - as a right click's menu, `context-menu="GameMenu"` on any element of a drawing:  `showContextMenu()`
 * - A right click's menu written IN a drawing, `<context-menu>` inside an element (epic `language`):  the core draws it
 *   as a hidden `<spell-context-menu>` holding its items (`core.drawContextMenu()`), which `showContextMenu()` finds.
 * - In the editor's Edit, a right click's menu shows first in the editor's own part menu (`contextMenuItemsOf()`,
 *   epic `editor` I76), drawn the same way (`itemsFor()`).
 *   - as the app's menu bar, `- its menu bar is "GameMenu"`:  `SpellElement` draws it with `itemsFor()`
 * - Each `<ui-action>` reads its item live (title, enabled, selected), and a click runs it through the core.
 * - STATIC and page-wide on purpose, as `Glides` is:  one context menu on a page at a time.
 * - Knows nothing of the program's classes:  only the core's `menuOf()` / `runShortcut()`.
 * - Nor where the program runs:  a Python program's page fills the same, its actions run there (`core.runAction()`).
 ****************/
export class ActionMenus {
  /**
   * Run the program's action for key `event`, if one is bound to it and enabled:  true if one ran.
   * - Not a key something else took already (Spell UI's undo keys, a field's own), nor one typed into a field.
   * - SIDE EFFECT:  a key that ran an action does nothing else (`preventDefault()`).
   */
  static runShortcut(core: Core, focused: object | undefined, event: KeyboardEvent, isMac: boolean): boolean {
    if (event.defaultPrevented || event.isComposing || ActionMenus.isTypedIn(event.composedPath()[0])) return false
    if (!core.runShortcut(focused, event, isMac)) return false
    event.preventDefault()
    return true
  }

  /**
   * Put the actions of menu `menu="GameMenu"` into each toolbar or menu under `root` that names one,
   * from `thing`'s menus or its chain's.
   * - Again when its name changes;  once per element otherwise:  its actions read their items live.
   * - Put in once the element has drawn, a little later.
   * - A menu `thing` hasn't:  left empty, with a warning (the core's).
   */
  static fill(root: ParentNode, thing: object | undefined, core: Core): void {
    for (const element of root.querySelectorAll<HTMLElement>(`[${MENU}]`)) {
      const name = element.getAttribute(MENU) ?? ""
      if (FILLED.get(element) === name) continue
      FILLED.set(element, name)
      for (const made of element.querySelectorAll(`:scope > [${MADE}]`)) made.remove()
      const items = ActionMenus.itemsFor(core.menuOf(thing, name) ?? [])
      // once it has drawn:  an item put in before its owner draws never finds it (`PartContext`)
      void ActionMenus.whenDrawn(element)
        .then(() => FILLED.get(element) === name && element.append(...items))
        .catch((error: unknown) => E.Warnings.warn(`<${element.localName}>`, `can't fill menu "${name}"`, error))
    }
  }

  /**
   * Show the menu named by the nearest `context-menu=` on `event`'s path, from `thing` up its chain, where the
   * person right-clicked:  true if there was one.
   * - A `<ui-popup>` at the click, holding a compact `<ui-menu>`, its icons in a column:  it stays inside the window.
   *   - The editor's page draws it as its own menus (`MenuBar.css`):  a file tab's menu is one (epic `editor` P29).
   * - SIDE EFFECT:  the browser's own menu doesn't show, there or on the menu itself;
   *   the menu goes when an action runs, at Escape, or at a press anywhere else.
   */
  static showContextMenu(event: MouseEvent, stopAt: Element, thing: object | undefined, core: Core): boolean {
    const found = ActionMenus.contextMenuOf(event.composedPath(), stopAt)
    const items = ActionMenus.itemsOfFound(found, thing, core)
    if (!items?.length) return false
    event.preventDefault()
    ActionMenus.closeContextMenu()
    const popup = document.createElement(POPUP_TAG)
    popup.setAttribute("at", JSON.stringify({ x: event.clientX, y: event.clientY }))
    popup.setAttribute("open-on", "manual")
    popup.setAttribute("visible", "")
    if (found?.name) popup.setAttribute("aria-label", found.name)
    popup.setAttribute(MADE, "")
    const menu = document.createElement(MENU_TAG)
    menu.setAttribute("direction", "vertical")
    menu.setAttribute("interactive", "")
    // a menu's look:  compact rows, each icon in a column of its own, before its title (epic `editor` P29)
    menu.setAttribute("size", "small")
    menu.setAttribute("icon-column", "")
    if (found?.name) menu.setAttribute("aria-label", found.name)
    menu.setAttribute(MADE, "")
    menu.append(...ActionMenus.itemsFor(items))
    popup.append(menu)
    for (const tag of [POPUP_TAG, MENU_TAG, ACTION_TAG, ITEM_TAG])
      RootLoader.loadTag(tag)?.catch((error: unknown) => E.Warnings.warn("context-menu", `can't load <${tag}>`, error))
    document.body.append(popup)
    const close = () => popup.remove()
    ActionMenus.closeOpenMenu = close
    // an action run closes it, after its own click;  Escape and a press elsewhere are the popup's own
    menu.addEventListener(
      "click",
      (click) => click.composedPath().some((at) => (at as Element).localName === ACTION_TAG) && close()
    )
    popup.addEventListener("ui-closing", close)
    // a right click on the menu itself:  never the browser's own menu over it
    popup.addEventListener("contextmenu", (click) => click.preventDefault())
    return true
  }

  /**
   * The items of the nearest right-click menu along `path` (innermost first), up to `stopAt`:
   * what `showContextMenu()` would show there, for another menu to draw (`itemsFor()`).
   * - The editor's part menu, in Edit, puts them first (epic `editor` I76):  `SpellElement.programMenuAt()`.
   * - None there, or an empty one:  `undefined`.
   */
  static contextMenuItemsOf(
    path: readonly EventTarget[],
    stopAt: Element,
    thing: object | undefined,
    core: Core
  ): MenuItem[] | undefined {
    const items = ActionMenus.itemsOfFound(ActionMenus.contextMenuOf(path, stopAt), thing, core)
    return items?.length ? items : undefined
  }

  /** Close the context menu showing, if one is. */
  static closeContextMenu(): void {
    ActionMenus.closeOpenMenu?.()
    ActionMenus.closeOpenMenu = undefined
  }

  /**
   * A menu's items as elements:  a `<ui-action>` drawing each action, a divider for each line between groups,
   * and an item holding a `<ui-menu>` for each menu inside it, Spell UI's sub-menu (epic `language` P19).
   * - An action's shortcut goes on as its `shortcut` attribute, in Spell UI's words (`shortcutForUI()`).
   * - A sub-menu's title and items are read as it's drawn:  a menu filled from a list shows the list as it was.
   */
  static itemsFor(items: readonly MenuItem[]): HTMLElement[] {
    return items.map((item) => {
      if (item.kind === "menu") return ActionMenus.subMenuFor(item)
      const element = document.createElement(item.kind === "action" ? ACTION_TAG : ITEM_TAG)
      element.setAttribute(MADE, "")
      if (item.kind === "separator") element.setAttribute("kind", "divider")
      else {
        Object.assign(element, { action: item })
        if (item.shortcut) element.setAttribute(SHORTCUT, ActionMenus.shortcutForUI(item.shortcut))
      }
      return element
    })
  }

  /** A menu inside a menu:  an item with its title, holding a vertical `<ui-menu>` of its items. */
  private static subMenuFor(item: MenuItem & { kind: "menu" }): HTMLElement {
    const element = document.createElement(ITEM_TAG)
    element.setAttribute(MADE, "")
    element.append(item.title)
    const menu = document.createElement(MENU_TAG)
    menu.setAttribute("direction", "vertical")
    menu.setAttribute("aria-label", item.title)
    menu.append(...ActionMenus.itemsFor(item.items))
    element.append(menu)
    return element
  }

  /**
   * A spell shortcut (`meta+D`) in Spell UI's words (`mod+D`).
   * - Spell's `meta` is Command on a Mac and Control elsewhere (epic `elemental-spell` Q31);
   *   Spell UI's is the Meta key itself, and its `mod` is spell's `meta` (epic `coherence`, sweep 2).
   */
  static shortcutForUI(shortcut: string): string {
    return shortcut
      .split("+")
      .map((key) => (SPELL_META.test(key.trim()) ? "mod" : key))
      .join("+")
  }

  ////////////////
  // ## Internals
  ////////////////

  /** How to close the context menu showing. */
  private static closeOpenMenu: (() => void) | undefined

  /** Once `element` is defined and has drawn (its `ready`). */
  private static async whenDrawn(element: HTMLElement): Promise<void> {
    await customElements.whenDefined(element.localName)
    await (element as { ready?: Promise<void> }).ready
  }

  /** The items of a right-click menu `contextMenuOf()` found:  written ones ready, a named one from `thing` up. */
  private static itemsOfFound(
    found: { name?: string; items?: MenuItem[] } | undefined,
    thing: object | undefined,
    core: Core
  ): MenuItem[] | undefined {
    return found?.items ?? (found?.name ? core.menuOf(thing, found.name) : undefined)
  }

  /**
   * The nearest right-click menu along `path` (an event's, innermost first), up to `stopAt`:
   * - a menu written in the drawing, `<context-menu>` inside an element:  its items, ready (`core.drawContextMenu()`)
   * - else a `context-menu="game menu"`, naming a template's menu:  its name
   */
  private static contextMenuOf(
    path: readonly EventTarget[],
    stopAt: Element
  ): { name?: string; items?: MenuItem[] } | undefined {
    for (const target of path) {
      const element = target as Element
      const written = element.querySelector?.<Element & ContextMenuElement>(`:scope > ${CONTEXT_MENU_TAG}`)
      if (written?.menuItems) return { items: written.menuItems() }
      const name = element.getAttribute?.(CONTEXT_MENU)
      if (name) return { name }
      if (target === stopAt) return undefined
    }
    return undefined
  }

  /**
   * Is `target` somewhere people type:  a text field, a text area, a select, editable text?  Its keys are its own.
   * - An element with an `EditContext` too:  the editor's code pane (Monaco) types through one,
   *   on a plain `<div>` that is neither an input nor contenteditable.
   *   Missed, Solitaire's `A` (auto play) took every `a` typed into the code (epic `debut` I79).
   */
  static isTypedIn(target: EventTarget | undefined): boolean {
    if (!(target instanceof HTMLElement)) return false
    if (target.isContentEditable || target instanceof HTMLTextAreaElement || target instanceof HTMLSelectElement) {
      return true
    }
    if ((target as { editContext?: unknown }).editContext) return true
    return target instanceof HTMLInputElement && !NOT_TYPED_IN.has(target.type)
  }
}

/** The attribute naming the menu a toolbar or menu in a drawing shows:  `<ui-toolbar menu="GameMenu" />`. */
const MENU = "menu"

/** The attribute naming the menu a right click on an element shows:  `context-menu="GameMenu"`. */
const CONTEXT_MENU = "context-menu"

/** The element a menu written in a drawing draws, inside the element whose right click shows it:  `<context-menu>`. */
const CONTEXT_MENU_TAG = "spell-context-menu"

/** Marks the elements made here, so a menu filled again takes them away first. */
const MADE = "data-spell-action-menu"

/** `<ui-action>`'s own shortcut, which wins over its action's. */
const SHORTCUT = "shortcut"

/** Spell's Command-or-Control key, in a shortcut:  `meta`. */
const SPELL_META = /^meta$/i

/** The tags a menu is drawn with. */
const POPUP_TAG = "ui-popup"
const MENU_TAG = "ui-menu"
const ACTION_TAG = "ui-action"
const ITEM_TAG = "ui-item"

/** Each toolbar or menu filled, with the name it was filled from. */
const FILLED = new WeakMap<Element, string>()

/** The inputs that take no typing:  a key pressed in one may run an action. */
const NOT_TYPED_IN = new Set(["button", "checkbox", "radio", "range", "color", "file", "submit", "reset", "image"])
