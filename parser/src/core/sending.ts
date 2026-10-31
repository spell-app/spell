/**
 * Sending events to things (epic `elemental-spell` P9):  `send flipped with side = its direction`.
 *
 * ```ts
 * class Card extends TwoSidedView {
 *   onFlipped(event) { core.console.log(event.side) }     // `- on flipped with a side:`
 * }
 * await send(card, "flipped", { side: "up" })           // the card's handler runs;  its pile's doesn't
 * ```
 *
 * - An event goes to its TARGET first, then up its chain, until a handler takes it:
 *   - the thing itself, its `onFlipped()` (or `whenFlipped()`) -- `- on flipped:` in its template's outline
 *   - the list holding it (a pile holds a card:  `holderOf()`), and the list holding that, ...
 *   - the running app (`core.RUNTIME.app`, set as it starts)
 *   - last, the program's own listeners, `on flipped:` at a file's top (`core.RUNTIME`)
 * - A handler that runs TAKES the event (Owen's model, epic `elemental-spell` T1):  nothing above it hears it,
 *   unless it says `pass event` (`event.pass()`), which hands it on up.
 * - An event nobody takes is dropped, silently (Q29).
 * - An event still happening (`closing`) can be CANCELED (`cancel closing`, `event.cancel()`, Q27):
 *   the sender's step after it doesn't run -- compiled spell checks `canceled` for such an event:
 *   `if ((await send(this, "closing")).canceled) return`.
 * - Waits for each handler in turn (a handler may `pause`), so `send` is a promise:  `wait for send x` waits (Q28).
 * - In a handler:  `target` is the thing whose handler runs, `the original target` the thing it was sent to,
 *   `sender` the thing that sent it (Q26) -- the event's `target`, `originalTarget`, `sender`.
 * - Pure javascript:  the mouse and keys come from `core.input` (`input.ts`), never from a browser event.
 * - The browser's events reach a view's thing through its element (spell-app's `SpellElement`), which calls `send()`.
 */
import { CanceledError } from "spell/util"

import { core, onPropertyChange } from "./core"
import { defineCoreModule } from "./core.types"
import { InputState } from "./input"
import { SpellEvent } from "./SpellEvent"
// Import directly to avoid circular import
import { holderOf } from "./classes/List"

/**
 * The event `send()` hands each handler, and returns.
 * - Its params are on it by name:  `send flipped with side = up` gives `event.side`.
 */
export class SentEvent extends SpellEvent {
  /** The thing it was sent to:  `the original target`. */
  declare originalTarget: object | undefined
  /** The thing whose handler is running now:  `target`. */
  declare target: object | undefined
  /** The thing that sent it, if a thing did:  `sender`. */
  declare sender: object | undefined
  /** Has a handler canceled it?  Only an event still happening is checked (`closing`). */
  declare canceled: boolean
  /** Has the running handler handed it on up (`pass event`)? */
  declare passed: boolean
  /** Has any handler taken it? */
  declare handled: boolean

  /** `pass event`:  hand it on to the next handler up the chain, after this one. */
  pass(): this {
    this.passed = true
    return this
  }

  /**
   * `cancel event`, `cancel closing`:  the sender's next step won't run.
   * - Only an event still happening is ever checked (`closing`;  compiled spell knows which, by the language):
   *   canceling `closed` does nothing, since it happened already.
   */
  cancel(): this {
    this.canceled = true
    return this
  }
}

/**
 * Send event `type` to `target`, with `params`:  see the module's docs.
 * - `target` `undefined`:  straight to the program's own listeners.
 * - `sender`:  the thing sending it, when a thing does (compiled spell passes `this`).
 * - Returns the event:  `canceled` says if a handler canceled it.
 * - NEVER throws for a handler:  one that fails is said on the console, and the event goes on as if it took it.
 *   - But for a handler stopped by canceling its action (`CanceledError`):  what sent it stops too.
 */
export async function send(
  target: object | undefined,
  type: string,
  params?: object,
  sender?: object
): Promise<SentEvent> {
  const event = new SentEvent({ type: eventName(type), ...params })
  Object.assign(event, { originalTarget: target, target: undefined, sender, canceled: false, passed: false })
  event.handled = false
  for (const thing of chainOf(target)) {
    const handler = handlerOf(thing, event.type)
    if (!handler) continue
    event.target = thing
    event.passed = false
    event.handled = true
    try {
      await waitOf(handler, handler.call(thing, event))
    } catch (error) {
      if (error instanceof CanceledError) throw error
      console.warn(`send ${event.type}:  ${(thing as object).constructor?.name}'s handler failed`, error)
    }
    if (!event.passed) return event
  }
  // nobody took it, or the last handler passed it on:  the program's own `on <event>:` listeners
  event.target = undefined
  const results = core.RUNTIME?.trigger(event) ?? []
  await Promise.all(results)
  if (results.length) event.handled = true
  return event
}

/**
 * What calling `handler` gave, to wait for:  `result` if it's written `async`, else nothing.
 * - So `- on click:` `notify "Saved!"`, which hands back its toast's promise, doesn't hold what sent it.
 */
export function waitOf(handler: Function, result: unknown): unknown {
  return handler.constructor.name === "AsyncFunction" ? result : undefined
}

/** Would anything take event `type` sent to `target`:  a handler up its chain, or one of the program's own listeners? */
export function takesEvent(target: object | undefined, type: string): boolean {
  for (const thing of chainOf(target)) if (handlerOf(thing, type)) return true
  return !!core.RUNTIME && !!SpellEvent.getEventList(core.RUNTIME, eventName(type))?.length
}

/** Spell's name for an event, as `on()` keys it:  `card flipped` / `Card-Flipped` => `card-flipped`. */
export function eventName(type: string): string {
  return type
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, "-")
}

/**
 * The method of `thing` that handles event `type`, if it has one:  `onCardFlipped`, else `whenCardFlipped`.
 * - `- on card flipped:` and `- when card flipped:` in its template's outline are those.
 */
export function handlerOf(thing: object, type: string): ((event: SentEvent) => unknown) | undefined {
  const name = eventName(type).replace(/(^|-)(\p{L}|\d)/gu, (_dash, _start, letter: string) => letter.toUpperCase())
  const methods = thing as Record<string, unknown>
  for (const handler of [methods[`on${name}`], methods[`when${name}`]]) {
    if (typeof handler === "function") return handler as (event: SentEvent) => unknown
  }
  return undefined
}

/**
 * Where an event sent to `target` goes, in order:  `target`, what holds it, up to the running app.
 * - Each thing's holder:  its `eventParent` if it sets one, else the list holding it (`core.holderOf()`).
 * - Stops at a thing seen already, so a loop of holders can't run forever.
 */
export function* chainOf(target: object | undefined): Generator<object> {
  const seen = new Set<object>()
  for (let at = target; at && !seen.has(at); at = parentOf(at)) {
    seen.add(at)
    yield at
  }
  const app = core.RUNTIME?.app as object | undefined
  if (app && !seen.has(app)) yield app
}

/** What holds `thing` for its events:  its own `eventParent`, else the list holding it. */
function parentOf(thing: object): object | undefined {
  const { eventParent } = thing as { eventParent?: object }
  if (eventParent) return eventParent
  return holderOf(thing)
}

/**
 * A property's CHANGE, as an event to its thing (epic `debut` P30):  `- when its score changes:` is the handler of
 * `score-change`, `onScoreChange()`.
 * - Sent only to a thing that has the handler, so it never goes up the chain to its pile or the app.
 * - Just after the change lands (a microtask):  the handler reads the new value, as every other step will.
 * - Once per change:  set twice, it's sent twice, each with its own `value` and `was`.
 * - Its `sender` is the thing itself.
 */
function sendChange(target: object, property: string, was: unknown, value: unknown): void {
  const type = `${dashed(property)}-change`
  if (!handlerOf(target, type)) return
  // `send()` never throws:  a failing handler is said on the console
  queueMicrotask(() => void send(target, type, { value, was }, target))
}
onPropertyChange(sendChange)

/** A property's compiled name as an event's words, dashed:  `highScore` => `high-score`, `puntuación` as it is. */
function dashed(property: string): string {
  return property.replace(/(\p{Ll}|\d)(\p{Lu})/gu, "$1-$2").toLowerCase()
}

/** Sending events, and the mouse and keys they come from:  `core.send()`, `core.input`. */
export const sendingMethods = defineCoreModule({
  /** `core.send(...)`:  send an event to a thing, up its chain until a handler takes it -- see `send()`. */
  send,
  /** Would anything take this event -- see `takesEvent()`. */
  takesEvent,
  /** The mouse and keys, readable anywhere:  `the shift key is down` is `core.input.shiftKey` -- see `input.ts`. */
  input: new InputState()
})
Object.assign(core, sendingMethods)
