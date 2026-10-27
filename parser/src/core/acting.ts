/**
 * Running a program's ACTIONS, the one way every press, key and menu item runs them (epic `elemental-spell` P10).
 * - An action is a template's method with a description (`described.ts`):  its title, icon, shortcuts, when it's
 *   enabled or selected, what its undo is called (Q33, Q38).
 * - `core.runAction(thing, "turnOver", "key")` is the ONE choke point:
 *   - it runs nothing while the action isn't enabled
 *   - an action `undone as "Turn Card"` runs as one undo step (`undoing.ts`, C11)
 *   - then it tells whoever listens that the person did it, and how (`core.onActionRun()`):  tours, analytics, tests
 * - Shortcuts:  `core.runShortcut(focused, key)` finds the first ENABLED action bound to the key, starting at the
 *   focused thing and going up its chain to the app (Q35 B), and runs it.
 *   `meta` is command on a Mac, control elsewhere (Q31).
 * - MENUS:  a template's named lists of its actions (Q34, Q41), `- its "game menu" is a menu of "deal" and "undo"`,
 *   compiled to `core.describeMenu(Game, "gameMenu", { items: ["deal", "undo"] })`.
 *   - `core.menuOf(thing, "game menu")` finds it on the thing or up its chain, and gives its items, each an action
 *     ready to draw:  a toolbar, the app's menu bar or a context menu draws the same list.
 *   - `core.menuBarOf(app)`:  the one its app names as its menu bar, `- its menu bar is "game menu"`.
 * - `undo` and `redo` are the app's own actions:  their titles follow the history, `Undo Turn Card`.
 * - Part of `core`:  imported by `spell/parser/core`'s barrel for its side effect.
 * - Knows nothing of the page:
 *   the runner calls it from its keys and clicks, and Spell UI's `<ui-action>` draws what `menuOf()` gives.
 */
import { core } from "./core"
import { defineCoreModule } from "./core.types"
import { describedMethods, type ActionDescription } from "./described"
import { chainOf } from "./sending"

/** The ways an action is run, for whoever listens:  a key, a click on a button or menu item, or code. */
export type ActionWay = "key" | "click" | "menu" | "code"

/** What `core.onActionRun()` listeners hear:  the person did `name` (`title`) on `thing`, by `way`. */
export type ActionRun = { thing: object; name: string; title: string; way: ActionWay }

/**
 * One item of a menu, ready to draw:  an action on its thing, or a line between groups.
 * - Live:  `title`, `isEnabled` and `isSelected` read the thing each time, so a drawing that reads them follows it.
 * - `run()` runs it through `core.runAction()`, as a click on a menu item does.
 */
export type MenuItem =
  | {
      kind: "action"
      /** the action's method, e.g. `turnOver` */
      name: string
      /** the thing it runs on */
      thing: object
      readonly title: string
      icon?: string
      /** its first shortcut, as written, e.g. `meta+T` */
      shortcut?: string
      readonly isEnabled: boolean
      readonly isSelected: boolean
      run(way?: ActionWay): boolean
    }
  | { kind: "separator" }

/** A menu's description, as compiled spell writes it:  its items' method names, `-` for a line between groups. */
export type MenuDescription = { items: string[] }

/** What's listening for actions run:  `core.onActionRun()`. */
const LISTENERS = new Set<(run: ActionRun) => void>()

/** Each class's own menus, by name. */
const MENUS = new WeakMap<Function, Map<string, MenuDescription>>()

export const actingMethods = defineCoreModule({
  /**
   * Run action `name` on `thing`, the ONE way every key, click and menu item runs one:  see the module's docs.
   * - Returns false, running nothing, while it isn't enabled, or `thing` has no such method.
   * - `way`:  how the person ran it, for the listeners.
   * - A thrown error is thrown on, after the listeners hear nothing of it.
   */
  runAction(thing: object, name: string, way: ActionWay = "code"): boolean {
    const method = (thing as Record<string, unknown>)[name]
    if (typeof method !== "function" || !actingMethods.isActionEnabled(thing, name)) return false
    const result: unknown = method.call(thing)
    // an action that waits (a deal) is running:  catch its failure, so a key's press doesn't leave it unhandled
    if (result instanceof Promise) result.catch((error) => console.error(`${name} failed`, error))
    const run: ActionRun = { thing, name, title: actingMethods.actionTitle(thing, name), way }
    for (const listener of [...LISTENERS]) {
      try {
        listener(run)
      } catch (error) {
        console.warn(`core.onActionRun():  a listener failed on ${name}`, error)
      }
    }
    return true
  },

  /**
   * Is action `name` enabled on `thing` now:  its `enabled when` says yes, or it has none.
   * - A failing `enabled when` counts as no.  Live:  a drawing that asks follows it.
   */
  isActionEnabled(thing: object, name: string): boolean {
    return testOf(thing, describedAction(thing, name)?.enabledWhen) ?? true
  },

  /** Is action `name` selected on `thing` now (its menu item ticked):  its `selected when` says so.  Live. */
  isActionSelected(thing: object, name: string): boolean {
    return testOf(thing, describedAction(thing, name)?.selectedWhen) ?? false
  },

  /**
   * Action `name`'s title on `thing`, as people read it:  its description's, its live title's (`Undo Turn Card`),
   * else its method's name in words.
   */
  actionTitle(thing: object, name: string): string {
    const description = describedAction(thing, name)
    if (description?.titleFrom) {
      const title = (thing as Record<string, unknown>)[description.titleFrom]
      if (typeof title === "string") return title
    }
    return description?.title ?? wordsOf(name)
  },

  /** Listen for every action run through `runAction()`.  Returns how to stop. */
  onActionRun(listener: (run: ActionRun) => void): () => void {
    LISTENERS.add(listener)
    return () => void LISTENERS.delete(listener)
  },

  /**
   * Run the action key `key` is a shortcut for:  the first ENABLED one, starting at `focused` and going up its chain
   * to the app (Q35 B).  True if one ran:  the page then keeps the key from anything else.
   * - `key`:  the key's name and the modifiers down with it, as a keyboard event has them.
   * - `isMac`:  `meta` in a shortcut is command on a Mac, control elsewhere (Q31).
   * - An action bound to the key but not enabled lets it go on to the next one (Q35).
   */
  runShortcut(focused: object | undefined, key: ShortcutKey, isMac = false): boolean {
    for (const thing of chainOf(focused)) {
      for (const [name, description] of describedMethods.actionsOf(thing.constructor)) {
        if (!description.shortcuts?.some((shortcut) => shortcutMatches(shortcut, key, isMac))) continue
        if (actingMethods.runAction(thing, name, "key")) return true
      }
    }
    return false
  },

  /**
   * Describe class `Class`'s menu `name`, e.g. `gameMenu`:  what compiled spell writes after the class, for
   * `- its "game menu" is a menu of "deal" and "undo"`.  Its items are method names;  `-` is a line between groups.
   */
  describeMenu(Class: Function, name: string, description: MenuDescription): void {
    let own = MENUS.get(Class)
    if (!own) MENUS.set(Class, (own = new Map()))
    own.set(menuKey(name), description)
  },

  /** Every menu class `Class` describes, its own and its super-classes', by name as matched (`gamemenu`). */
  menusOf(Class: Function): Map<string, MenuDescription> {
    return menusOf(Class)
  },

  /**
   * Menu `name` (`game menu`, `gameMenu` or `GameMenu`) for `thing`:  the first of `thing`, then up its chain to the
   * app (Q41:  a card's context menu may be its game's), that has it.  Its items ready to draw (`MenuItem`), each on
   * the thing that has the menu;  `undefined` if none has it.
   * - An item naming no method of that thing is left out, with a warning.
   */
  menuOf(thing: object | undefined, name: string): MenuItem[] | undefined {
    const key = menuKey(name)
    for (const holder of chainOf(thing)) {
      const description = menusOf(holder.constructor).get(key)
      if (description) return description.items.flatMap((item) => menuItem(holder, item))
    }
    return undefined
  },

  /**
   * The app's MENU BAR, ready to draw:  the menu its class names, `static menuBar = "game menu"`
   * (`- its menu bar is "game menu"`, spellx's `menu-bar=`).  `undefined` when it names none.
   */
  menuBarOf(app: object | undefined): MenuItem[] | undefined {
    const name = (app?.constructor as { menuBar?: unknown } | undefined)?.menuBar
    return typeof name === "string" ? actingMethods.menuOf(app, name) : undefined
  }
})
Object.assign(core, actingMethods)

/** A pressed key, as a keyboard event has it:  its name and the modifiers down with it. */
export type ShortcutKey = {
  key: string
  metaKey?: boolean
  ctrlKey?: boolean
  shiftKey?: boolean
  altKey?: boolean
}

/** Every menu class `Class` describes, its own and its super-classes', by name (a sub-class's wins). */
function menusOf(Class: Function): Map<string, MenuDescription> {
  const chain: Function[] = []
  for (let at: Function | null = Class; at && at !== Function.prototype;) {
    chain.unshift(at)
    at = Object.getPrototypeOf(at) as Function | null
  }
  const menus = new Map<string, MenuDescription>()
  for (const each of chain) for (const [name, menu] of MENUS.get(each) ?? []) menus.set(name, menu)
  return menus
}

/** `game menu`, `gameMenu`, `GameMenu`, `game-menu` => `gamemenu`:  how menus are matched by name. */
function menuKey(name: string): string {
  return name.replace(/[\s_-]+/g, "").toLowerCase()
}

/** A menu's item `name` on `holder`:  a separator for `-`, else its action;  none for a name it has no method for. */
function menuItem(holder: object, name: string): MenuItem[] {
  if (name === "-") return [{ kind: "separator" }]
  if (typeof (holder as Record<string, unknown>)[name] !== "function") {
    console.warn(`menu:  ${holder.constructor.name} has no action \`${name}\``)
    return []
  }
  const description = describedAction(holder, name)
  return [
    {
      kind: "action",
      name,
      thing: holder,
      get title() {
        return actingMethods.actionTitle(holder, name)
      },
      icon: description?.icon,
      shortcut: description?.shortcuts?.[0],
      get isEnabled() {
        return actingMethods.isActionEnabled(holder, name)
      },
      get isSelected() {
        return actingMethods.isActionSelected(holder, name)
      },
      run: (way: ActionWay = "menu") => actingMethods.runAction(holder, name, way)
    }
  ]
}

/** `thing`'s description of action `name`, if it has one. */
function describedAction(thing: object, name: string): ActionDescription | undefined {
  return describedMethods.actionsOf(thing.constructor).get(name)
}

/** What `thing`'s getter `getter` says, as true or false;  `undefined` with no getter named;  false if it throws. */
function testOf(thing: object, getter: string | undefined): boolean | undefined {
  if (!getter) return undefined
  try {
    return !!(thing as Record<string, unknown>)[getter]
  } catch (error) {
    console.warn(`${getter} failed`, error)
    return false
  }
}

/** A method's name in words, for an action described with no title:  `startNewGame` => `start new game`. */
function wordsOf(name: string): string {
  return name.replace(/([a-z0-9])([A-Z])/g, "$1 $2").toLowerCase()
}

/**
 * Does `shortcut`, as a template writes it (`meta+T`, `meta+shift+Z`, `F2`), name `key`?
 * - `meta`:  command on a Mac, control elsewhere;  `control`, `shift`, `option` / `alt`, `command` as written.
 * - The key itself matches by name, any case:  `T`, `t`, `Escape`, `space`.
 * - Every modifier the shortcut names must be down, and no other.
 */
export function shortcutMatches(shortcut: string, key: ShortcutKey, isMac = false): boolean {
  const parts = shortcut
    .toLowerCase()
    .split("+")
    .map((part) => part.trim())
  const keyName = parts.pop()
  if (!keyName) return false
  const wants = { meta: false, control: false, shift: false, option: false }
  for (const part of parts) {
    if (part === "meta" || part === "mod") wants[isMac ? "meta" : "control"] = true
    else if (part === "command" || part === "cmd") wants.meta = true
    else if (part === "control" || part === "ctrl") wants.control = true
    else if (part === "shift") wants.shift = true
    else if (part === "option" || part === "alt") wants.option = true
    else return false
  }
  const pressed = key.key === " " ? "space" : key.key.toLowerCase()
  const named = keyName === "spacebar" ? "space" : keyName
  return (
    pressed === named &&
    !!key.metaKey === wants.meta &&
    !!key.ctrlKey === wants.control &&
    !!key.shiftKey === wants.shift &&
    !!key.altKey === wants.option
  )
}
