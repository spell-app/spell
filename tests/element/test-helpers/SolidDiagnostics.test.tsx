import { createMemo, createRoot, createSignal, flush } from "solid-js"
import { beforeEach, describe, expect, test } from "vite-plus/test"

import { SolidDiagnostics, SolidWarningError } from "spell/test-helpers/SolidDiagnostics"

/** A planted mistake:  a memo that writes a signal, which Solid's dev build reports as `REACTIVE_WRITE_IN_OWNED_SCOPE`. */
const writeInMemo = () =>
  createRoot((dispose) => {
    const [, setCount] = createSignal(0)
    const memo = createMemo(() => {
      try {
        setCount(1)
      } catch {
        // dev may throw as well as report:  the report is what's checked
      }
      return 1
    })
    memo()
    dispose()
  })

/** A signal read by `readers` memos (named `reader`), then written `writes` times, each write flushed. */
const rereads = (readers: number, writes: number) => () => {
  const [count, setCount] = createSignal(0)
  const dispose = createRoot((dispose) => {
    for (let index = 0; index < readers; index++) createMemo(() => count() * 2, { name: "reader" })
    return dispose
  })
  flush()
  for (let write = 1; write <= writes; write++) {
    setCount(write)
    flush()
  }
  dispose()
}

describe("SolidDiagnostics", () => {
  // the tests plant this mistake;  the project's watch of every test would fail them for it
  beforeEach(() => SolidDiagnostics.allowInThisTest("REACTIVE_WRITE_IN_OWNED_SCOPE"))

  test("a planted Solid warning fails the test, naming its code, Solid's fix and its docs page", async () => {
    const failure = await SolidDiagnostics.expectNone(writeInMemo).catch((error: unknown) => error)
    expect(failure).toBeInstanceOf(SolidWarningError)
    const { message } = failure as SolidWarningError
    expect(message).toContain("REACTIVE_WRITE_IN_OWNED_SCOPE")
    expect(message).toContain("https://docs.solidjs.com/reference/solid-js/diagnostics/reactive-write-in-owned-scope")
  })

  test("a code on the allow list, or left out of `only`, passes", async () => {
    await SolidDiagnostics.expectNone(writeInMemo, { allow: ["REACTIVE_WRITE_IN_OWNED_SCOPE"] })
    await SolidDiagnostics.expectNone(writeInMemo, { only: ["STRICT_READ_UNTRACKED"] })
  })

  test("steps with no mistake pass, and hand back the record", async () => {
    const artifact = await SolidDiagnostics.expectNone(rereads(1, 1))
    expect(artifact.diagnostics).toEqual([])
  })

  test("more re-runs than the budget fails;  within it passes", async () => {
    await SolidDiagnostics.expectRerunBudget(rereads(2, 1), 2, { scope: "reader" })
    await expect(SolidDiagnostics.expectRerunBudget(rereads(2, 2), 2, { scope: "reader" })).rejects.toThrow(
      /at most 2 re-run/
    )
  })
})

describe("SolidDiagnostics.watchEveryTest():  this project's setup turns it on", () => {
  test.fails("a test in which Solid warns fails, after its own checks", () => {
    writeInMemo()
  })

  test("a test that allows the code passes", () => {
    SolidDiagnostics.allowInThisTest("REACTIVE_WRITE_IN_OWNED_SCOPE")
    writeInMemo()
  })
})
