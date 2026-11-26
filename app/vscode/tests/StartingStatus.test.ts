import type * as vscode from "vscode"
import { afterEach, beforeEach, describe, expect, test, vi } from "vite-plus/test"

import { LONGEST_WAIT_MSEC, READING, STARTING, StartingStatus } from "../src/StartingStatus"
import { resetFakeVscode, statusBarItems } from "./fakeVscode"

/** An extension's context, holding what it's handed to dispose. */
const fakeContext = () => ({ subscriptions: [] as { dispose(): unknown }[] }) as unknown as vscode.ExtensionContext

/**
 * What VS Code's status bar says while Spell's language server starts (epic `editor` T181):
 * starting, then reading the project, gone once the first file's problems come back.
 */
describe("StartingStatus", () => {
  beforeEach(() => {
    resetFakeVscode()
    vi.useFakeTimers()
  })
  afterEach(() => vi.useRealTimers())

  test("says it's starting, then reading the project, with a spinner;  goes once ready", () => {
    const status = StartingStatus.show(fakeContext())
    const [item] = statusBarItems
    expect(item?.isShown).toBe(true)
    expect(item?.text).toBe(`$(loading~spin) ${STARTING}`)
    status.reading()
    expect(item?.text).toBe(`$(loading~spin) ${READING}`)
    status.ready()
    expect(item?.isDisposed).toBe(true)
    expect(status.isShowing).toBe(false)
    // once ready, a late `reading()` (problems came back first) shows nothing again
    status.reading()
    expect(item?.isShown).toBe(false)
  })

  test("never stuck:  it goes by itself after the longest wait", () => {
    const status = StartingStatus.show(fakeContext())
    status.reading()
    vi.advanceTimersByTime(LONGEST_WAIT_MSEC - 1)
    expect(status.isShowing).toBe(true)
    vi.advanceTimersByTime(1)
    expect(status.isShowing).toBe(false)
    expect(statusBarItems[0]?.isDisposed).toBe(true)
  })

  test("goes with the extension", () => {
    const context = fakeContext()
    const status = StartingStatus.show(context)
    for (const it of context.subscriptions) it.dispose()
    expect(status.isShowing).toBe(false)
  })
})
