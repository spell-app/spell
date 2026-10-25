import type { Logger } from "./Logger"

/**
 * Running code we don't own, and naming what failed:  callers' callbacks run safely, a class's errors carry the
 * method they came from, and objects shown at the console for a person debugging (WWOD §5, §19).
 * - Plain JS:  safe in a page or on a server.
 */

/**
 * Run a caller's PREDICATE, `fn`:  what it returns, or `undefined` when it throws.
 * - A predicate that throws is an AUTHORING bug, so it stays visible:  `logger.warn()`, else `console.warn()`.
 * - No label:  the error's own stack names the file and line, which beats anything typed at the call.
 * - NEVER throws.
 */
export function safelyCall<T>(fn: () => T, logger?: Logger): T | undefined {
  try {
    return fn()
  } catch (error) {
    ;(logger?.warn ?? console.warn)("safelyCall():  a callback threw", error)
    return undefined
  }
}

/**
 * Run each of a caller's CLEANUP callbacks (disposers, unsubscribes), every one, whichever throw.
 * - A cleanup that throws is noise:  `logger.error()` when there's a logger, else silent.
 * - NEVER throws.
 */
export function safelyCallAll(fns: Iterable<() => unknown>, logger?: Logger): void {
  for (const fn of fns) {
    try {
      fn()
    } catch (error) {
      logger?.error("safelyCallAll():  a cleanup threw", error)
    }
  }
}

/**
 * A class decorator:  an error thrown (or rejected) by any of the class's methods carries where it came from, in its
 * `cause`:  `{ className, method, args }`, then goes on as it was.
 * - `className`:  given, never read from the class:  a minifier renames classes (WWOD §3 › "Names aren't
 *   identifiers").
 * - An error that already has a `cause` keeps it:  the deepest context is the most useful.
 * - Wraps the methods on the class's own prototype:  not getters, setters, statics or the constructor.
 *
 * ```ts
 * @makeErrorWrapper("ProjectRoot")
 * class ProjectRoot { async createApp(projectId: string) { ... } }
 * // a failure:  error.cause ~== { className: "ProjectRoot", method: "createApp", args: ["@me:snake"] }
 * ```
 */
export function makeErrorWrapper(className: string) {
  return function <C extends abstract new (...args: any[]) => object>(
    target: C,
    _context: ClassDecoratorContext<C>
  ): void {
    const prototype = target.prototype as Record<string, unknown>
    for (const method of Object.getOwnPropertyNames(prototype)) {
      const descriptor = Object.getOwnPropertyDescriptor(prototype, method)
      if (method === "constructor" || typeof descriptor?.value !== "function") continue
      const original = descriptor.value as (...args: unknown[]) => unknown
      const tag = (error: unknown, args: unknown[]) => {
        if (error instanceof Error && error.cause === undefined) error.cause = { className, method, args }
        return error
      }
      prototype[method] = function (this: unknown, ...args: unknown[]) {
        try {
          const result = original.apply(this, args)
          return result instanceof Promise ? result.catch((error: unknown) => Promise.reject(tag(error, args))) : result
        } catch (error) {
          throw tag(error, args)
        }
      }
    }
  }
}

/**
 * Show objects at the devtools console, for a person debugging:  `setDebugGlobal({ project })`, then `project` at
 * the console.
 * - NEVER read one in code:  it's for a human at the console, nothing else (WWOD §19).
 * - Instead of `console.log()`, which prints a copy that goes stale.
 */
export function setDebugGlobal(objects: Record<string, unknown>): void {
  Object.assign(globalThis, objects)
}
