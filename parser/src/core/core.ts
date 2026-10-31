/**
 * `spell` base runtime library for use with classes created with spell.
 * - What lives here:
 *   - meta-programming (`checkProp`, `newThingLike`), type checks
 *   - get/set-by-path stubs, `equals`
 *   - math, random numbers and primitive iteration
 * - Collection-shaped methods (`itemCountOf`, `forEach`, etc) live in `collection-core.ts` / `collection-other.ts`.
 */
import _isArrayLike from "lodash/isArrayLike"
import isEqual from "lodash/isEqual"

import { brokenRule, flushCells, peekProp, ruleWarning, withoutCreate } from "spell/util"
// Import directly, never through the barrel:
// `spell/parser/core/model` loads this file, and must not load drawing (Solid)
import { assert } from "./assert"
import { defineCoreModule, type PropCheck, type Core } from "./core.types"
import { ParkMiller } from "./ParkMiller"

/** Special methods for `isOfType()`, keyed by type name. */
type IsOfTypeSpecials = Record<string, (thing: unknown) => boolean>

/**
 * Where every random number in the core comes from:  `core.random()` reads it, `seedRandom()` replaces it.
 * - Unseeded, it starts from a seed picked with `Math.random()`, so each run deals differently.
 */
let generator = new ParkMiller(ParkMiller.randomSeed())

/**
 * Random whole number from `min` to `max`, BOTH included.
 * - One number only:  from 1 to it, so `randomNumber(6)` rolls a die.
 * - Comes from `core.random()`, so `seedRandom()` makes it repeatable.
 */
export function randomNumber(): number | undefined
export function randomNumber(max: number): number | undefined
export function randomNumber(min: number, max: number): number | undefined
export function randomNumber(min?: number, max?: number): number | undefined {
  if (arguments.length === 1) [max, min] = [min, 1]
  if (
    !assert(core.isANumber(min) && core.isANumber(max), "core.randomNumber(): you must pass two numbers, got", min, max)
  )
    return undefined
  return Math.floor(core.random() * (max! - min! + 1)) + min!
}

/**
 * The `core` singleton -- compiled `spell` code calls `core.foo(...)` for every built-in.
 * - Built from an instance of an inline class (rather than a plain object)
 *   purely so it prints as `core {...}` -- not `Object {...}` -- when logged / inspected while debugging.
 * - Cast to `Core` since its real shape is assembled piecemeal by every module's `Object.assign()` call:
 *   below, and in `collection-core.ts`, `collection-other.ts`, etc -- see `core.types.ts`.
 */
export const core = new (class core {})() as Core

/**
 * The running program's things, `core.things` (`things.ts`), for the Thing Explorer.
 * - `undefined` under `spell/parser/core/model`, which leaves them out:
 *   a thing made there, e.g. a `Person` the server loads, belongs to no running program.
 * - So code the model loads asks here, never `core.things` itself.
 */
export function programThings(): Core["things"] | undefined {
  return (core as Partial<Pick<Core, "things">>).things
}

/**
 * SIDE EFFECT:  add `thing` to the running program's things, if there are any -- see `programThings()`.
 * - `Thing` and `List` call it as they're made.
 */
export function registerThing(thing: object): void {
  programThings()?.add(thing as Parameters<Core["things"]["add"]>[0])
}

////////////////
// ## Changes put back (`core.startWhile()`)
////////////////

/** The props set while a `while` handler runs, each one's value before:  `undefined` when none is running. */
let recording: Array<{ target: object; property: string; was: unknown }> | undefined

/**
 * SIDE EFFECT:  `target`'s prop `property` is about to be set to `value`:  `Thing` and `List` call it from `setProp()`.
 * - The ONE place every property write is noted;  each of these hears of it:
 *   - a `while` handler running:  its value now is noted, to put back -- only its first, what it had before the handler
 *   - an undoable action running:  the run's undo history records it (`UndoHistory.noteSetting()`, `undoing.ts`)
 *   - a program running elsewhere (`core.remote`, e.g. Python):
 *     it's set there too, e.g. a task's title typed into a page's form
 *   - a place, for a thing kept in one (`onPlaceWrite()`, epic `data` P3)
 *   - the thing's `when <property> changes` handler, once it's made (`onPropertyChange()`, epic `debut` P30)
 * - Nothing if it has that value already.
 * - What's being read in from where it's kept (`whileReading()`) is heard by the handler alone:  it's no one's write.
 */
export function noteSetting(target: object, property: string, value: unknown): void {
  const was = peekProp(target, property)
  if (was === value) return
  if (!isReadingIn) {
    const isNoted = recording?.some((change) => change.target === target && change.property === property)
    if (recording && !isNoted) recording.push({ target, property, was })
    // a thing's starting values are nothing to undo:  taking it away is, and put back blank it would stay on the page
    if (madeThings.has(target)) core.RUNTIME?.history.noteSetting(target, property, was, value)
    ;(core as Partial<Pick<Core, "remote">>).remote?.set(target, property, value)
    placeWrites?.setting(target, property, was, value)
  }
  if (madeThings.has(target) && !core.isCarryingOver) changeListener?.(target, property, was, value)
}

/**
 * Hear every write to a property or a list:  what sends a saved thing's changes to its place (`places.ts`).
 * - ONE listener:  a program with no places has none, and pays for one check.
 * - Never what's being read in (`whileReading()`):  rows and heals would come back as writes.
 */
export function onPlaceWrite(listener: PlaceWriteListener): void {
  placeWrites = listener
}

/** What hears a write -- see `onPlaceWrite()`. */
export type PlaceWriteListener = {
  /** `target`'s `property` is about to be `value`, from `was`. */
  setting(target: object, property: string, was: unknown, value: unknown): void
  /** `list`'s items are about to be `after`, from `before`. */
  items(list: object, before: readonly unknown[], after: readonly unknown[]): void
}

/** Who hears a write -- see `onPlaceWrite()`. */
let placeWrites: PlaceWriteListener | undefined

/** Is `whileReading()` running? */
let isReadingIn = false

/** Is what's being done now read in from where it's kept?  See `whileReading()`. */
export function isWhileReading(): boolean {
  return isReadingIn
}

/**
 * Run `read`, marking what it changes as READ from where it's kept (epic `data` J11), so it never comes back as a write:
 * it isn't put back after a `while` handler, joins no undo step, and goes to no program running elsewhere.
 * - A thing's `when <property> changes` handler still hears:  the value did change.
 * - What a refresh or a heal runs in;  the undo history stays as it was.
 */
export function whileReading<T>(read: () => T): T {
  const outer = isReadingIn
  isReadingIn = true
  try {
    return read()
  } finally {
    isReadingIn = outer
  }
}

/**
 * SIDE EFFECT:  `thing` has its starting values:  from now on, a change to one of its properties is a CHANGE its
 * `when <property> changes` handler hears (epic `debut` P30) -- see `onPropertyChange()`.
 * - `Thing` and `List` call it at the end of their constructors, after `create()`.
 */
export function noteMade(thing: object): void {
  madeThings.add(thing)
}

/**
 * Hear every CHANGE of a made thing's property (`noteMade()`), as `noteSetting()` notes it:  its new `value`, and
 * the one it `was`.
 * - ONE listener:  sending's (`sending.ts`), which sends the change to the thing's handler, if it has one.
 *   It lives there, not here:  this module can't import sending's, which reads `core` as it loads.
 * - Not while a recompiled program carries the last run's things over (`core.isCarryingOver`).
 */
export function onPropertyChange(listener: PropertyChangeListener): void {
  changeListener = listener
}

/** What hears a thing's property change -- see `onPropertyChange()`. */
export type PropertyChangeListener = (target: object, property: string, was: unknown, value: unknown) => void

/** The things whose starting values are set -- see `noteMade()`. */
const madeThings = new WeakSet<object>()

/** Who hears a property's change -- see `onPropertyChange()`. */
let changeListener: PropertyChangeListener | undefined

/**
 * SIDE EFFECT:  `list`'s items are about to change from `before` to `after`.
 * - `List.writeItems()` calls it, for every change to a list.
 * - An undoable action running:  the run's undo history records it (`UndoHistory.noteItems()`, `undoing.ts`).
 * - A place, for a list kept in one (`onPlaceWrite()`).
 * - A `while` handler's put-back leaves lists as they are:  see `recordingSettings()`.
 * - Not what's being read in:  see `whileReading()`.
 */
export function noteItems(list: object, before: readonly unknown[], after: readonly unknown[]): void {
  if (isReadingIn) return
  core.RUNTIME?.history.noteItems(list, before, after)
  placeWrites?.items(list, before, after)
}

/**
 * Run `run`, noting every prop it sets:  returns what puts them all back, as they were.
 * - Only what it sets before it first waits:  a handler's steps after a pause aren't put back.
 * - What it adds to or takes from a list stays.
 */
export function recordingSettings(run: () => unknown): () => void {
  const outer = recording
  const changes: NonNullable<typeof recording> = []
  recording = changes
  try {
    run()
  } finally {
    recording = outer
  }
  return () => {
    for (const { target, property, was } of changes.reverse()) (target as Record<string, unknown>)[property] = was
  }
}

/** Meta-programming, exports, type-checking, path access, equality, math and iteration primitives. */
export const coreMethods = defineCoreModule({
  /** Do nothing -- use this as a placeholder, e.g. in an `if` branch. */
  doNothing(): void {},

  /**
   * Settle everything that follows spell state NOW:  pending derived checks, then the host's Solid.
   * - See `flushCells()` in `spell/util`.
   * - Spell state itself never needs it:  a read right after a write sees the write.
   *   It's for what DRAWS it:  a test asserting on the DOM, imperative code measuring it.
   * - NEVER Solid's `flush()` directly:  a reader of only a derived value hears of a change on a microtask.
   */
  flush(): void {
    flushCells()
  },

  ////////////////
  // ## Meta-programming
  ////////////////

  /**
   * Warn if `value` fails `check` for `property`.
   * - Checks its type, then its legal values, then its rules (`PropRule`, epic `property-editor` P9):
   *   warns of the first it fails.
   * - Returns whether it passed:  callers store `value` either way.
   * - Called by `Thing.setProp()` / `List.setProp()`, i.e. compiled property setters like
   *   `set title(value) { this.setProp('title', value, { type: 'text' }) }`.
   */
  checkProp(property: string, value: unknown, check?: PropCheck): boolean {
    if (check?.type && !core.isOfType(value, check.type)) {
      core.console.warn(`Expected ${property} to be type '${check.type}', got:`, value)
      return false
    }
    const oneOf = typeof check?.oneOf === "function" ? check.oneOf() : check?.oneOf
    if (oneOf && !oneOf.includes(value)) {
      core.console.warn(`Expected ${property} to be one of '${oneOf}', got:`, value)
      return false
    }
    const broken = brokenRule(value, check?.rules)
    if (broken) {
      core.console.warn(`${ruleWarning(property, broken)}, got:`, value)
      return false
    }
    return true
  },

  /**
   * Create an new, "empty" instance of `thing.constructor`.
   * - What collection helpers build their results in, e.g. `map()`, `filter()`, `duplicateList()`.
   * - NOT registered for the Thing Explorer (see `ThingRegistry.quietly()`),
   *   so a copy the program keeps doesn't show either.  See `agents/CODE-DEBT.md`.
   * - A SCRATCH list:  an exclusive one, e.g. a `Pile`, owns nothing -- see `core.newScratch()`.
   * - TODO: number? string?  non-constructable thing???
   */
  newThingLike(thing: unknown): unknown {
    if (!assert.isDefined(thing, "core.newThingLike()")) return undefined
    // if (core.isArrayLike(thing)) return []
    try {
      const target = thing as { constructor: new () => unknown }
      return core.newScratch(target.constructor)
    } catch (e) {
      return {}
    }
  },

  /**
   * New SCRATCH `constructor`, e.g. `map()`'s result, or `a copy of the pile as a pile`:
   * - NOT one of the program's things -- see `ThingRegistry.quietly()`
   * - a list owns nothing, even an exclusive one (epic page D8):
   *   filtering a pile mustn't take its cards -- see `List.asScratch()`
   * - its `create()` doesn't run:  it's a copy, not a new one -- see `withoutCreate()`
   */
  newScratch(constructor: new () => unknown): unknown {
    const things = programThings()
    const make = () => withoutCreate(() => new constructor())
    const made = things ? things.quietly(make) : make()
    ;(made as { asScratch?: () => unknown }).asScratch?.()
    return made
  },

  ////////////////
  // ## types
  ////////////////

  /** Maps a JS `typeof`/constructor-name result to the `spell`-facing type name shown to users. */
  TYPE_NAME_CONVERSIONS: {
    array: "list",
    boolean: "choice",
    string: "text"
  } as Record<string, string>,

  /**
   * Return string "type" of `thing`, as shown to `spell` users:
   * - e.g. `"text"` for a string, `"list"` for an array
   * - the lowercased constructor name for a custom class
   * TODO:  Return type aliases, e.g. ["number", "integer"]
   * TODO:  Return inherited class types ?
   * TODO:  NaN => `unknown` ???
   */
  typeOf(thing: unknown): string {
    if (thing === null || thing === undefined) return "unknown"
    if (typeof thing === "number" && isNaN(thing)) return "unknown"
    const objectType = typeof thing
    const constructor = (thing as object).constructor.name.toLowerCase()
    const type = objectType !== "object" || constructor === "object" ? objectType : constructor
    return core.TYPE_NAME_CONVERSIONS[type] || type
  },

  /**
   * Special methods for `isOfType()`, for type names `typeOf()` never actually returns
   * (`integer`, `character`, `char`) -- checked instead of a plain `=== typeOf(thing)` comparison.
   */
  IS_OF_TYPE_SPECIALS: {
    integer: (thing: unknown): boolean => core.isAnInteger(thing),
    character: (thing: unknown): boolean => core.typeOf(thing) === "text" && (thing as string).length === 1,
    char: (thing: unknown): boolean => core.isOfType(thing, "character")
  } as IsOfTypeSpecials,

  /**
   * Types `thing` is, most specific first:  its `typeOf()`, then each super-class's.
   * - e.g. a joker is `["joker", "card", "thing", ...]`, for `a joker is a card`.
   * - Up its prototype chain, stopping before plain `Object`, which every object would be.
   * - By class NAME, lowercased and converted as `typeOf()` does -- skipping any unnamed class, e.g. a mixin's.
   */
  typesOf(thing: unknown): string[] {
    const types = [core.typeOf(thing)]
    if (thing === null || typeof thing !== "object") return types
    // `typeOf()` already has its own class:  start with its super-class
    for (
      let proto = Object.getPrototypeOf(Object.getPrototypeOf(thing)) as object | null;
      proto && proto !== Object.prototype;
      proto = Object.getPrototypeOf(proto) as object | null
    ) {
      const name = (proto.constructor as { name?: string } | undefined)?.name?.toLowerCase()
      const type = name && (core.TYPE_NAME_CONVERSIONS[name] || name)
      if (type && !types.includes(type)) types.push(type)
    }
    return types
  },

  /**
   * Is `thing` an instance of string `type`, or of a sub-type of it -- as per `core.typesOf()`?
   * - Compiles from `thing is a Bee` => `core.isOfType(thing, 'Bee')` -- see `rules/expressions/IsA.ts`.
   * - e.g. a joker is a card, if `a joker is a card`.
   */
  isOfType(thing: unknown, type: string): boolean {
    if (typeof type === "string") type = type.toLowerCase()
    if (core.IS_OF_TYPE_SPECIALS[type]) return core.IS_OF_TYPE_SPECIALS[type](thing)
    return core.typesOf(thing).includes(type)
  },

  /**
   * Is `thing` of `otherThing`'s type -- the same type, or a sub-type of it?
   * - Compiles from `thing is the same type as other` -- see `rules/expressions/IsSameTypeAs.ts`.
   * - NOT symmetrical:  a joker is the same type as a card, but a card isn't the same type as a joker.
   */
  matchesType(thing: unknown, otherThing: unknown): boolean {
    return core.isOfType(thing, core.typeOf(otherThing))
  },

  /** Is `thing` a valid number (doesn't include NaN). */
  isANumber(thing: unknown): thing is number {
    return typeof thing === "number" && !isNaN(thing)
  },

  /**
   * Is `thing` a valid integer (doesn't include NaN).
   * NOTE: treats `0` as an integer as well. ???
   */
  isAnInteger(thing: unknown): boolean {
    return typeof thing === "number" && !isNaN(thing) && parseInt(String(thing), 10) === thing
  },

  // TODO: isText, etc

  /** Is `thing` an array-like thing (`Array`, `arguments`, or anything with a numeric `length`)? */
  isArrayLike(thing: unknown): boolean {
    return _isArrayLike(thing)
  },

  /**
   * Assert that `value` is not `false`, `null` or `undefined`.
   * NOTE: explicitly does NOT include `0` -- unlike plain JS truthiness, `0` counts as truthy here.
   */
  isTruthy(value: unknown): boolean {
    return value !== false && value !== null && value !== undefined
  },

  /**
   * Return `true` if `value` is defined (e.g. not `undefined`).
   * - Compiles from `thing is defined` / `thing exists` / `there is a thing` -- see `rules/expressions/`.
   * TESTME
   */
  isDefined(value: unknown): boolean {
    return typeof value !== "undefined"
  },

  ////////////////
  // ## get/set access for paths
  ////////////////

  /**
   * Get `path` off `thing`.
   * TODO: unimplemented stub -- always returns `undefined`, no caller wires this up yet.
   */
  get(thing: unknown, path: string): unknown {
    return undefined
  },

  /**
   * Set `path` on `thing` to `value`.
   * TODO: unimplemented stub -- currently a no-op, no caller wires this up yet.
   */
  set(thing: unknown, path: string, value: unknown): void {},

  ////////////////
  // ## operators
  ////////////////

  /** Does `thing` conceptually equal `otherThing`?  Uses lodash `isEqual` semantics (deep, structural). */
  equals(thing: unknown, otherThing: unknown): boolean {
    return isEqual(thing, otherThing)
  },

  ////////////////
  // ## math
  ////////////////

  /**
   * `number` without its sign:  `-3` => `3`.
   * - Compiles from `the absolute value of the difference` -- see `rules/math/AbsoluteValue.ts`.
   * - Not a number:  a failed assertion, and `undefined`.
   */
  absoluteValue(number: number): number | undefined {
    if (!assert(core.isANumber(number), "core.absoluteValue(): you must pass a number, got", number)) {
      return undefined
    }
    return Math.abs(number)
  },

  ////////////////
  // ## random numbers
  ////////////////

  /**
   * Start the random numbers again from `seed`:  everything random after it repeats, run after run.
   * - `seed`:  a whole number from 1 to 2,147,483,646.  NOT checked:  0 gives only 0s.
   * - Called by `spell run --seed <n>`, and by the core contract (seed 1), before the program loads.
   * - The same seed gives the same numbers in Python's core, `core.seed_random()` (epic page python-target, Q13).
   */
  seedRandom(seed: number): void {
    generator = new ParkMiller(seed)
  },

  /**
   * The next random number:  at least 0 and less than 1 -- the core's own `Math.random()`.
   * - Every random thing in the core draws from it:  `randomNumber()`, `randomItemOf()`, `shuffled()` ...
   * - NEVER `Math.random()` in the core:  `seedRandom()` couldn't repeat it.
   */
  random(): number {
    return generator.random()
  },

  randomNumber,

  /**
   * A new array of `items`, in a random order:  `items` itself doesn't change.
   * - lodash's `shuffle()`, step for step, on our own numbers (epic page python-target, J8):
   *   walk from the front, swapping each item with a random one at or after it.
   * - Takes one random number for EVERY item, even the last, as lodash does.
   * - The deal Python's `core.shuffled()` makes from the same seed.
   */
  shuffled<T>(items: readonly T[]): T[] {
    const shuffled = [...items]
    const count = shuffled.length
    for (let index = 0; index < count; index++) {
      const swap = index + Math.floor(core.random() * (count - index))
      ;[shuffled[index], shuffled[swap]] = [shuffled[swap]!, shuffled[index]!]
    }
    return shuffled
  },

  ////////////////
  // ## ranges
  ////////////////

  /**
   * `[1, 2, ... count]`:  one number per time round a `repeat {count} times` loop -- `[]` if `count` is under 1.
   * - NOT `getRange(1, count)`, which counts DOWN for a `count` under 1, e.g. `[1, 0]`.
   */
  countTo(count: number): number[] {
    const range: number[] = []
    for (let next = 1; next <= count; next++) range.push(next)
    return range
  },

  /** Return a range of numbers from `start` to `end`, inclusive -- counts down if `start > end`. */
  getRange(start: number, end: number): number[] {
    const range: number[] = []
    if (
      !assert(
        core.isANumber(start) && core.isANumber(end),
        "core.getRange(): you must pass two numbers, got",
        start,
        end
      )
    )
      return range

    if (start < end) {
      for (let next = start; next <= end; next++) range.push(next)
    } else {
      for (let next = start; next >= end; next--) range.push(next)
    }
    return range
  },

  ////////////////
  // ## primitive iteration
  ////////////////

  /**
   * Call `callback()` `count` times, ignoring its return value.
   * TODO: `repeat {number} times` currently compiles to `core.map(core.getRange(...), ...)`
   * instead (see `rules/lists/RepeatNTimes.ts`) --
   * no rule currently calls this method; confirm whether it's still needed.
   */
  repeat(count: number, callback: () => void): void {
    for (let i = 0; i < count; i++) callback()
  }
})
Object.assign(core, coreMethods)
