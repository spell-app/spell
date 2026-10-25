/**
 * What a running program remembers from one run to the next (epic `prefs-and-undo` P8):
 * its props declared `remembered`.
 *
 * ```ts
 * class Solitaire extends App {
 *   static { this.declareProp("theme", { oneOf: ["light", "dark"], remembered: true }) }
 * }
 * core.resetRuntime()
 * await core.remember("@owen/solitaire")   // what its last run kept, read now
 * solitaire.theme              // "dark", if the last run set it so;  else "light", its first choice
 * solitaire.theme = "light"    // kept at `@owen/solitaire:theme`, for the next run
 * ```
 *
 * - Kept in the person's preferences:  a `PrefStore` named for the project's id.
 *   Whoever runs the program says which, and where (`core.remember()`):
 *   the browser's storage, unless it says otherwise.
 * - An app's are kept by name, `theme`;  any other thing's under its id, `main.theme`:
 *   only with an id the program chose -- see `Thing.rememberedKeyFor()`.
 * - Only text, numbers and choices are kept:  a thing or a list isn't, said once on the program's console.
 * - Nothing remembers while nothing called `core.remember()` (a test, the CLI):  a remembered prop is a plain one.
 * - Imports only `spell/util` and the core's own `core.ts`:  `Thing.ts` imports it, under the model too.
 */
import { isAllowed, PrefStore, schemaOf, type PrefPlace, type PrefPlaceName, type PropInfo } from "spell/util"

import { core } from "./core"

/** The kinds of value a remembered prop keeps, by `typeof`:  text, a number, a choice. */
const KEPT_TYPES = new Set(["string", "number", "boolean"])

/****************
 * ### `RememberedValues`
 * One run's remembered props:  read whole as the run starts, kept again as each one is set.
 * - `core.RUNTIME.remembered`, made by `core.remember()`;  a new run makes a new one.
 * - Read whole first, so a program reads them without waiting, wherever they're kept (the page server ...).
 ****************/
export class RememberedValues {
  /** Where they're kept:  the project's store. */
  readonly store: PrefStore

  private constructor(store: PrefStore, values: Map<string, unknown>) {
    this.store = store
    this.values = values
  }

  /**
   * The values kept under `name`, in `place`, all read now.
   * - NEVER throws when they can't be read (`PrefStore`):  logged, and nothing's remembered.
   * - throws `TypeError` if `name` can't name a store:  one with a colon
   */
  static async open(name: string, place: PrefPlaceName | PrefPlace = "local"): Promise<RememberedValues> {
    const store = new PrefStore(name, { place })
    const values = new Map<string, unknown>()
    for (const key of await store.loadKeysUnder()) values.set(key, await store.load(key))
    return new RememberedValues(store, values)
  }

  /** What's kept under `key`, `undefined` if nothing is. */
  get(key: string): unknown {
    return this.values.get(key)
  }

  /**
   * Keep `value` under `key` for the next run;  `undefined` forgets it.
   * - Only text, a number or a choice:  anything else isn't kept, said once on the program's console.
   * - A place that must be waited on keeps it a moment later (`PrefStore.set()`).
   */
  set(key: string, value: unknown): void {
    if (value !== undefined && !KEPT_TYPES.has(typeof value)) {
      this.warnOnce(key, `\`${key}\` can't be remembered:  only text, a number or a choice is, not`, value)
      return
    }
    if (value === undefined) this.values.delete(key)
    else this.values.set(key, value)
    this.store.set(key, value)
  }

  /** Say `message` on the program's console, once each run for each `subject`. */
  warnOnce(subject: string, ...message: unknown[]): void {
    if (this.warned.has(subject)) return
    this.warned.add(subject)
    core.console.warn(...message)
  }

  /** What's kept, by key. */
  private values: Map<string, unknown>
  /** What `warnOnce()` has said this run. */
  private warned = new Set<string>()
}

////////////////
// ## For `Thing`
////////////////

/**
 * What `thing`'s prop `property` starts as, when it's declared `remembered`:  an initializer for `getProp()`.
 * - What was remembered for it, else its declared starting value (`init`), else nothing:  then its default.
 * - A remembered value it no longer allows (a choice the program dropped) is passed over, said once.
 * - `undefined` when it isn't remembered, or nothing remembers this run.
 * - `keyFor()`:  its key, asked only when it IS remembered -- see `Thing.rememberedKeyFor()`.
 */
export function rememberedStartFor(
  thing: object,
  property: string,
  keyFor: () => string | undefined
): (() => unknown) | undefined {
  const values = runningValues()
  const info = values && rememberedInfo(thing, property)
  if (!values || !info) return undefined
  const key = keyFor()
  if (key === undefined) {
    warnNoKey(values, thing, property)
    return undefined
  }
  return () => {
    const value = values.get(key)
    if (value === undefined || isAllowed(info, value)) return value ?? info.init?.call(thing)
    values.warnOnce(key, `\`${key}\` remembered a value it doesn't allow any more, so it starts afresh:`, value)
    return info.init?.call(thing)
  }
}

/**
 * SIDE EFFECT:  `thing`'s prop `property` was set to `value`:  kept for the next run, when it's declared `remembered`.
 * - `keyFor()`:  as for `rememberedStartFor()`.
 */
export function rememberSetting(
  thing: object,
  property: string,
  value: unknown,
  keyFor: () => string | undefined
): void {
  const values = runningValues()
  if (!values || !rememberedInfo(thing, property)) return
  const key = keyFor()
  if (key === undefined) warnNoKey(values, thing, property)
  else values.set(key, value)
}

/** This run's remembered values:  `undefined` until `core.remember()`. */
function runningValues(): RememberedValues | undefined {
  return core.RUNTIME?.remembered
}

/** `property`'s declaration in `thing`'s class, when it's declared `remembered`. */
function rememberedInfo(thing: object, property: string): PropInfo | undefined {
  const info = schemaOf(thing.constructor).info(property)
  return info?.remembered ? info : undefined
}

/** Say once that `thing`'s `property` can't be remembered:  it has no id the program chose. */
function warnNoKey(values: RememberedValues, thing: object, property: string): void {
  const type = thing.constructor.name
  values.warnOnce(
    `${type}.${property}`,
    `${type}.${property} can't be remembered:  this ${type} has no id the program chose.  ` +
      `Give it one, e.g. \`new ${type}({ id: "main" })\`.`
  )
}
