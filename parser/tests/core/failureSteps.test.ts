import { describe, expect, test, vi } from "vite-plus/test"

import { core } from "spell/parser/core"
import { holdNotice, PASSED, runActing } from "spell/parser/core/undoing"

/**
 * A failed action's failure steps and Spell's notice (epic `data` P50, I116):  what P50's plan check found unpinned.
 * - Each error name a failure step tells its error by (`core.errorIs()`).
 * - A step that does nothing catches the error, so Spell's notice stays away;  the notice shows only for what nobody
 *   caught, and the error goes on to the caller.
 * - The page's own steps, at a server action:  serverActions.test.ts, in the spell folder's parser tests.
 */
describe("the error names (core.errorIs())", () => {
  /** A place's error, of `kind`, as places throw it. */
  const placeError = (kind: string, whyNot?: string) => ({ name: "PlaceError", cause: { kind, whyNot } })

  test.each([
    ["out of date", placeError("out of date")],
    ["server not found", placeError("no such place")],
    ["limit", placeError("over the ceiling")],
    ["limit", { name: "TooSoonError" }],
    ["limit", { name: "RequestError", status: 429 }],
    ["offline", { name: "OfflineError" }],
    ["offline", { name: "TypeError", message: "Failed to fetch" }],
    ["offline", { name: "TypeError", message: "fetch failed" }],
    ["anything", new Error("any at all")]
  ] as const)("%s:  %o", (name, error) => {
    expect(core.errorIs(error, name)).toBe(true)
  })

  test("each tells its own error only", () => {
    expect(core.errorIs(placeError("not found"), "out of date")).toBe(false)
    expect(core.errorIs(placeError("not found"), "server not found")).toBe(false)
    expect(core.errorIs(placeError("not found"), "limit")).toBe(false)
    expect(core.errorIs({ name: "TypeError", message: "x is undefined" }, "offline")).toBe(false)
    expect(core.errorIs(placeError("refused", "signed out"), "not authorized")).toBe(true)
    expect(core.errorIs(placeError("refused", "signed out"), "not permitted")).toBe(false)
  })

  test("a name that isn't one throws, naming them", () => {
    expect(() => core.errorIs(new Error("x"), "gone" as "anything")).toThrow(/isn't an error's name;  it's one of/)
  })
})

describe("Spell's notice, only for what nobody caught", () => {
  /** A server action that fails, its notice held, run through `failed`:  what showed, and what it answered. */
  function failing(failed: ((error: unknown) => unknown)[]) {
    const error = new Error("refused")
    const show = vi.fn()
    holdNotice(error, show)
    let answer: unknown
    let thrown: unknown
    try {
      answer = runActing(
        () => {
          throw error
        },
        { after: [], failed, callsServer: true }
      )
    } catch (caught) {
      thrown = caught
    }
    return { error, show, answer, thrown }
  }

  test("a step that does nothing (`do nothing`) catches it:  no notice, nothing thrown", () => {
    const { show, thrown, answer } = failing([() => core.doNothing()])
    expect(show).not.toHaveBeenCalled()
    expect(thrown).toBeUndefined()
    expect(answer).toBeUndefined()
  })

  test("`otherwise do nothing` after a branch that passes it on:  the next step's doing nothing catches it", () => {
    const { show, thrown } = failing([() => PASSED, () => core.doNothing()])
    expect(show).not.toHaveBeenCalled()
    expect(thrown).toBeUndefined()
  })

  test("every step passing it on:  the notice shows, and the error goes on to the caller", () => {
    const { show, thrown, error } = failing([() => core.passTheError(), () => core.passTheError()])
    expect(show).toHaveBeenCalledOnce()
    expect(thrown).toBe(error)
  })

  test("no failure steps at all:  the notice shows", () => {
    const { show, thrown, error } = failing([])
    expect(show).toHaveBeenCalledOnce()
    expect(thrown).toBe(error)
  })
})
