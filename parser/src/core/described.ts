/**
 * What a program's templates SAY about themselves, beyond their code (epic `elemental-spell` P5):
 * - each ACTION's description:  its title, its shortcuts, when it's enabled or selected, what its undo is called
 *   - `- to turn it over:` then `- shortcut meta+T`, `- enabled when it is face down`, `- undoable as "Turn Card"`
 * - each EVENT a template sends, with its parameters:  `- it sends "flipped" with a side as a direction`
 * - Compiled spell writes them after the class:  `core.describeAction(Card, "turnOver", { ... })`.
 * - What reads them:  the event phase (P9), and the actions' one way to run (`acting.ts`, P10),
 *   through `actionsOf()` and `eventsOf()`.
 * - An action `undoable` is ONE undo step:
 *   `describeAction()` declares it so (`declareAction()`, `undoing.ts`, C11).
 * - Kept per class, and inherited:  a joker has a card's actions, and may describe one again.
 * - Part of `core`:  imported by `spell/parser/core`'s barrel for its side effect.
 */
import { core } from "./core"
import { defineCoreModule } from "./core.types"
import { declareAction, type CantBeUndone } from "./undoing"

export const describedMethods = defineCoreModule({
  /**
   * Describe class `Class`'s action `name`, its method's name, e.g. `turnOver` for `to turn it over`.
   * - What compiled spell writes after the class, for an action with any of its description's lines.
   * - Again for the same name, e.g. a sub-class's:  the new description, whole.
   */
  describeAction(Class: Function, name: string, description: ActionDescription): void {
    ownDescriptions(ACTIONS, Class).set(name, description)
    // `undoable as "Turn Card"`:  ONE undo step, through the run's history (C11);  `can't be undone`:  none
    const method = (Class.prototype as Record<string, unknown>)[name]
    const { undoneAs, cantBeUndone, cancels } = description
    const declares = undoneAs !== undefined || cantBeUndone !== undefined
    if (declares && typeof method === "function" && !UNDOABLE.has(method)) {
      const info = undoneAs !== undefined ? { undoneAs } : { cantBeUndone }
      declareAction(Class, name, cancels ? { ...info, cancels } : info, afterHooksOf(Class, name))
      UNDOABLE.add((Class.prototype as Record<string, unknown>)[name] as Function)
    }
  },

  /**
   * Run `Class`'s member `hook` at the end of its action `name`, inside its undo step:  an after hook (epic `language` P56).
   * - What compiled spell writes for `after putting a card on a pile`, in any file:
   *   `core.addAfterHook(Card, "putOnPile", { hook: "afterPutOnPile" })`, the hook a method of `Class` taking the
   *   action's blanks.
   * - Each runs in the order added, the program's file order;  skipped when the action is called off (`cancel`).
   * - Before or after the action is described:  the same list either way.
   * - See `runActing()` (`undoing.ts`).
   */
  addAfterHook(Class: Function, name: string, { hook }: { hook: string }): void {
    afterHooksOf(Class, name).push(hook)
  },

  /**
   * Describe an event class `Class`'s things send, e.g. `flipped` with its `side`.
   * - What compiled spell writes after the class, for `- it sends "flipped" with a side as a direction`.
   */
  describeEvent(Class: Function, name: string, description: EventDescription): void {
    ownDescriptions(EVENTS, Class).set(name, description)
  },

  /**
   * Every action class `Class` describes, its own and its super-classes', by method name.
   * - A sub-class's description of an action wins over its super-class's.
   * - Empty for a class that describes none.
   */
  actionsOf(Class: Function): Map<string, ActionDescription> {
    return describedBy(ACTIONS, Class)
  },

  /** Every event class `Class`'s things send, its own and its super-classes', by name -- as `actionsOf()`. */
  eventsOf(Class: Function): Map<string, EventDescription> {
    return describedBy(EVENTS, Class)
  }
})

Object.assign(core, describedMethods)

/**
 * An action's description, in its class's names:  what `- to turn it over:`'s description lines say.
 * - `title`:  its name as people read it, e.g. `turn it over`
 * - `shortcuts`:  its keys, e.g. `["meta+T"]`:  `meta` is command on a Mac, control elsewhere (Q31)
 * - `icon`:  its icon's name, if it says one
 * - `enabledWhen`, `selectedWhen`:  the name of the class's getter that says so, e.g. `turnOverIsEnabled`
 * - `undoneAs`:  its undo's name, e.g. `Turn Card`, as the Edit menu says `Undo Turn Card`
 * - `cantBeUndone`:  `"keeps history"` for `can't be undone`:  nothing it changes is a step (epic `language` P55, Q60)
 * - `titleFrom`:  the name of the class's getter whose text is its title NOW, e.g. the app's `undoTitle`
 * - `replacesLast`:  the newest wins (`- a new one replaces the last one`), where a repeat is otherwise ignored
 * - `refusedWhileBusy`:  never waits its turn:  does nothing while an action runs, e.g. the app's `undo` (J2)
 * - `cancels`:  it may `cancel`, and so answers yes or no (epic `language` P56) -- see `ActionInfo.cancels`
 */
export type ActionDescription = {
  title: string
  shortcuts?: string[]
  icon?: string
  enabledWhen?: string
  selectedWhen?: string
  undoneAs?: string
  cantBeUndone?: CantBeUndone
  titleFrom?: string
  replacesLast?: boolean
  refusedWhileBusy?: boolean
  cancels?: boolean
}

/**
 * An event's description:  `params`, each parameter's name and its type as the template said it,
 * e.g. `{ side: "direction" }` for `with a side as a direction`.
 */
export type EventDescription = {
  params?: Record<string, string>
}

/** The methods `describeAction()` made undoable already:  a sub-class describing one again doesn't wrap it twice. */
const UNDOABLE = new WeakSet<Function>()

/** Each class's after hooks, by its action's method name:  `addAfterHook()`. */
const AFTER_HOOKS = new WeakMap<Function, Map<string, string[]>>()

/** `Class`'s after hooks of its action `name`:  the live list, made empty the first time. */
function afterHooksOf(Class: Function, name: string): string[] {
  const own = ownDescriptions(AFTER_HOOKS, Class)
  let hooks = own.get(name)
  if (!hooks) own.set(name, (hooks = []))
  return hooks
}

/** Each class's own action descriptions, by method name. */
const ACTIONS = new WeakMap<Function, Map<string, ActionDescription>>()

/** Each class's own event descriptions, by name. */
const EVENTS = new WeakMap<Function, Map<string, EventDescription>>()

/** `Class`'s own descriptions in `store`, made empty the first time. */
function ownDescriptions<D>(store: WeakMap<Function, Map<string, D>>, Class: Function): Map<string, D> {
  let own = store.get(Class)
  if (!own) store.set(Class, (own = new Map()))
  return own
}

/** `Class`'s descriptions in `store`, its super-classes' first, so its own win. */
function describedBy<D>(store: WeakMap<Function, Map<string, D>>, Class: Function): Map<string, D> {
  const chain: Function[] = []
  for (let current: Function | null = Class; current && current !== Function.prototype;) {
    chain.unshift(current)
    current = Object.getPrototypeOf(current) as Function | null
  }
  const described = new Map<string, D>()
  for (const each of chain) for (const [name, description] of store.get(each) ?? []) described.set(name, description)
  return described
}
