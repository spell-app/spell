/**
 * What people may do to a thing on the page:  drag it, click it, select it, drop something on it
 * (epic `debut` P27, Q47).
 * - ONE answer for each, `core.isAble(thing, "draggable", holder)`:  the page asks nothing else.
 * - A thing's type says each ability ONE word at a time, compiled to a flag on its class:
 *   - `- it is draggable`, `<spell-view "card" draggable>`, `<draggable/>`:  `static draggable = true`
 *   - `- it is not draggable`:  `false`, e.g. for a sub-type, `a joker is not draggable`
 *   - with a condition, `- draggable when it is face up`:  `true`, and a getter that says when, `draggableWhen`
 * - Unsaid, an event says it (Q44):  `- on click:` makes a thing clickable, `- on drag:` draggable,
 *   `- on card dropped:` a list droppable.
 *   - A list's `- its cards are draggable when ...` makes its items draggable too (`itemsDraggable`).
 * - A drag also asks the list holding the thing (`holder`), by its own rule:  `core.canGiveUp()`.
 * - Part of `core`:  imported by `spell/parser/core`'s barrel for its side effect.
 * - Knows nothing of the page:  the page's element (app's `SpellElement`) asks it.
 */
import { core } from "./core"
import { defineCoreModule } from "./core.types"

/** What people may do to a thing on the page:  its type's flag of the same name. */
export type Ability = "draggable" | "clickable" | "selectable" | "droppable"

/** The classes whose flags are only the "no" every type starts with:  `View`, `ViewableList` (`noAbilities()`). */
const BASES = new WeakSet<Function>()

/** The handlers that make a thing able, when its type doesn't say:  an event implies its ability (Q44). */
const IMPLIED_BY: Record<Ability, RegExp | undefined> = {
  draggable: /^onDrag(Cancelled)?$/,
  clickable: /^on(Double)?Click$/,
  selectable: undefined,
  droppable: /^(when\w+(DroppedOn|DraggedOver|DraggedOutOf)|while\w+DraggedOver)$/
}

export const abilityMethods = defineCoreModule({
  /**
   * Can people do `ability` to `thing` now:  drag it, click it, select it, drop something on it?
   * - Its type's word, then its condition (`draggableWhen`), else what its events imply.
   * - A drag also needs `holder`, the list holding it, to give it up (`can give up`, `its cards are draggable when`).
   * - Live:  a drawing that asks follows the condition, e.g. a card turned face up.
   * - A condition that throws counts as no.
   */
  isAble(thing: object | undefined, ability: Ability, holder?: object): boolean {
    if (!thing) return false
    const said = saidBy(thing.constructor, ability)
    let able: boolean
    if (said === undefined) able = isImplied(thing, ability, holder)
    else able = said === true && conditionOf(thing, ability)
    if (!able || ability !== "draggable" || !holder) return able
    return core.canGiveUp(holder, thing)
  }
})
Object.assign(core, abilityMethods)

/**
 * Mark `Class` as a base whose ability flags are only the "no" every type starts with:
 * a type below it that says nothing gets what its events imply.
 * - Called by `View` and `ViewableList` as they're defined.
 */
export function noAbilities(Class: Function): void {
  BASES.add(Class)
}

/**
 * What `Class` (or a class above it, below the bases) says of `ability`:  `true`, `false`,
 * or `undefined` when none says.
 */
function saidBy(Class: Function | undefined, ability: Ability): boolean | undefined {
  for (let at = Class; at && at !== Function.prototype && !BASES.has(at); at = Object.getPrototypeOf(at)) {
    if (!Object.hasOwn(at, ability)) continue
    const said = (at as unknown as Record<string, unknown>)[ability]
    return typeof said === "boolean" ? said : undefined
  }
  return undefined
}

/** `thing`'s condition for `ability`, its getter `<ability>When`:  yes when it has none. */
function conditionOf(thing: object, ability: Ability): boolean {
  const getter = `${ability}When`
  if (!(getter in thing)) return true
  try {
    return !!(thing as Record<string, unknown>)[getter]
  } catch {
    return false
  }
}

/** Does a handler of `thing`'s imply `ability`, or `holder` make its items draggable? */
function isImplied(thing: object, ability: Ability, holder: object | undefined): boolean {
  if (ability === "draggable" && (holder?.constructor as { itemsDraggable?: unknown } | undefined)?.itemsDraggable)
    return true
  const pattern = IMPLIED_BY[ability]
  if (!pattern) return false
  for (
    let proto = Object.getPrototypeOf(thing);
    proto && proto !== Object.prototype;
    proto = Object.getPrototypeOf(proto)
  ) {
    const methods = Object.entries(Object.getOwnPropertyDescriptors(proto))
    if (methods.some(([name, member]) => pattern.test(name) && typeof member.value === "function")) return true
  }
  return false
}
