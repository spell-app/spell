/**
 * A value that takes a while:  what a compiled getter that waits stands on, and how a drawing and an action read it.
 * - `its "total" is:` with a pause or a slow call in it compiles to `core.waitedValue()`:
 *   - A drawing reads it as any getter:  "not yet" passes up through plain getters to the nearest `<Loading>`,
 *     and Solid runs the read again when the answer lands.
 *   - It's Solid's `createDeferred()`, never an async `createMemo()`:
 *     a memo holds the drawing back until its answer lands, which freezes a deal that changes what it read
 *     (epic `language` P8:  the counter froze at 28, then jumped to 56).
 *     `lazy`, so a value nobody reads runs no slow work again.
 * - `core.whileWaiting()`:  the "…" around one read in a drawing.  A whole thing held has one too (`drawInBoundary()`).
 * - `core.answerOf()`:  what an action reads it with, waiting for the answer.
 *   - Solid's own `resolve()` gives the OLD answer just after a write, so it's not used:
 *     it brings the writes in, reads, then waits for the latest promise (P8).
 * - Loads Solid:  NEVER imported by `core/model`.  A library's getter is a plain async getter (`P.LibraryWriter`).
 * - Part of `core`:  imported by `spell/parser/core`'s barrel for its side effect.
 */

import { createComponent } from "@solidjs/web"
import { Loading, createDeferred, createRoot, getObserver, getOwner, runWithOwner } from "solid-js"

import { core } from "./core"
import { defineCoreModule } from "./core.types"
import type { Drawing } from "./drawing"

/** One getter's value on one thing. */
type WaitedValue = {
  /** Its value now:  throws Solid's "not yet" before its first answer. */
  read: () => unknown
  /** The promise its last run started:  what an action waits for. */
  latest?: Promise<unknown>
}

/** One `answerOf()` reading:  the answers it has, and the values it found it still needs. */
type Answering = {
  answers: Map<WaitedValue, unknown>
  needed: WaitedValue[]
}

/** Each thing's waited values, by name. */
const WAITED_VALUES = new WeakMap<object, Map<string, WaitedValue>>()

/**
 * What owns every waited value:  never disposed, as each lives with its thing, not with what first read it.
 * - Made here, as a read may come from anywhere, even an effect's apply, where a new root with no owner is refused.
 */
const WAITING_OWNER = createRoot(() => getOwner())

/** Stops a read inside `answerOf()` at a value it has no answer for yet. */
const NOT_ANSWERED = Symbol("not answered")

/** The `answerOf()` reading right now. */
let answering: Answering | undefined

/** `core`'s methods for a value that takes a while. */
export const waitingMethods = defineCoreModule({
  /**
   * The value of `thing`'s getter `name`, worked out by `compute`, which waits:  what a getter that waits compiles to.
   * - Before its first answer it throws Solid's "not yet", which a `<Loading>` above catches.
   * - After that, its old answer until a new one lands:  the rest of the page moves on meanwhile.
   * - `follows`:  reads what `compute` reads after its first wait, which Solid wouldn't see, so they're followed too.
   * - ONE value per thing and name, made on first read.
   */
  waitedValue<Value>(thing: object, name: string, compute: () => Promise<Value>, follows?: () => unknown): Value {
    let values = WAITED_VALUES.get(thing)
    if (!values) WAITED_VALUES.set(thing, (values = new Map()))
    let value = values.get(name)
    if (!value) {
      value = newWaitedValue(compute, follows)
      values.set(name, value)
    }
    if (!answering) return value.read() as Value
    if (answering.answers.has(value)) return answering.answers.get(value) as Value
    answering.needed.push(value)
    throw NOT_ANSWERED
  },

  /** `read`'s drawing, or a "…" until its first answer:  a value in a drawing that waits, `{the total}`. */
  whileWaiting(read: () => Drawing): Drawing {
    return standInFor(read)
  },

  /**
   * The answer of `thing`'s member `name`, once it has one:  what an action writes for reading what waits.
   * - The newest answer:  writes before the read count, and a change while it waits starts the wait again.
   * - A getter over one that waits works too:  it's read again with the answers.
   * - throws what the getter throws.
   */
  async answerOf(thing: unknown, name: string): Promise<any> {
    // in another waited value's work Solid is following the reads:  a flush there would be refused
    if (!getObserver()) core.flush()
    const answers = new Map<WaitedValue, unknown>()
    for (;;) {
      const { value, needed } = readWith(answers, thing, name)
      if (!needed.length) return value
      for (const each of needed) answers.set(each, await latestAnswer(each))
    }
  }
})
Object.assign(core, waitingMethods)

/** `read`'s drawing, or the "…" until its first answer. */
export function standInFor(read: () => Drawing): Drawing {
  return createComponent(Loading, {
    fallback: core.message("waiting"),
    get children() {
      return read()
    }
  })
}

/** A new value, owned for good:  see `WAITING_OWNER`. */
function newWaitedValue<Value>(compute: () => Promise<Value>, follows?: () => unknown): WaitedValue {
  const value: WaitedValue = { read: () => undefined }
  value.read = runWithOwner(WAITING_OWNER, () =>
    createRoot(() =>
      createDeferred(
        () => {
          try {
            follows?.()
          } catch (ignored) {
            // only to be followed:  `compute` says what's wrong when it reads it
          }
          return (value.latest = compute())
        },
        { lazy: true }
      )
    )
  ) as () => unknown
  return value
}

/** `thing`'s member `name`, read with `answers`:  its value, or the values it still needs to be read. */
function readWith(answers: Map<WaitedValue, unknown>, thing: unknown, name: string) {
  const outer = answering
  const needed: WaitedValue[] = []
  answering = { answers, needed }
  try {
    return { value: (thing as Record<string, unknown> | undefined)?.[name], needed }
  } catch (error) {
    if (error !== NOT_ANSWERED) throw error
    return { value: undefined, needed }
  } finally {
    answering = outer
  }
}

/** `value`'s newest answer:  started by a read, if nothing has run it yet, and again if a change starts another. */
async function latestAnswer(value: WaitedValue): Promise<unknown> {
  try {
    value.read()
  } catch (ignored) {
    // Solid's "not yet":  it's started
  }
  for (;;) {
    const latest = value.latest
    const answer = await latest
    if (value.latest === latest) return answer
  }
}
