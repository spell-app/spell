import type * as vscode from "vscode"
import { afterEach, beforeEach, describe, expect, test, vi } from "vite-plus/test"

import {
  LONGEST_WAIT_MSEC,
  OPEN_DELAY_MSEC,
  PRIORITY,
  READING,
  SHORTEST_SHOW_MSEC,
  STARTING,
  StartingStatus
} from "../src/StartingStatus"
import { resetFakeVscode, statusBarItems } from "./fakeVscode"

/** An extension's context, holding what it's handed to dispose. */
const fakeContext = () => ({ subscriptions: [] as { dispose(): unknown }[] }) as unknown as vscode.ExtensionContext

/** Two Spell files' addresses. */
const SOLITAIRE = "file:///solitaire/Solitaire.spell"
const RECIPES = "file:///recipes/Recipes.spell"

/**
 * What VS Code's status bar says while Spell's language server starts (epic `editor` T181):
 * starting, then reading the project, gone once each waiting file's problems come back;
 * again for a file opened later whose project isn't read yet.
 */
describe("StartingStatus", () => {
  beforeEach(() => {
    resetFakeVscode()
    vi.useFakeTimers()
  })
  afterEach(() => vi.useRealTimers())

  test("says it's starting, then reading the project, with a spinner, near the left end;  goes once read", () => {
    const status = StartingStatus.show(fakeContext())
    status.opened(SOLITAIRE)
    const [item] = statusBarItems
    expect(item?.priority).toBe(PRIORITY)
    expect(item?.isShown).toBe(true)
    expect(item?.text).toBe(`$(loading~spin) ${STARTING}`)
    status.started()
    expect(item?.text).toBe(`$(loading~spin) ${READING}`)
    vi.advanceTimersByTime(SHORTEST_SHOW_MSEC)
    status.published(SOLITAIRE)
    expect(status.isShowing).toBe(false)
    expect(item?.isShown).toBe(false)
  })

  test("once shown, stays long enough to read", () => {
    const status = StartingStatus.show(fakeContext())
    status.opened(SOLITAIRE)
    status.started()
    vi.advanceTimersByTime(200)
    status.published(SOLITAIRE)
    expect(status.isShowing).toBe(true)
    vi.advanceTimersByTime(SHORTEST_SHOW_MSEC - 201)
    expect(status.isShowing).toBe(true)
    vi.advanceTimersByTime(1)
    expect(status.isShowing).toBe(false)
  })

  test("a file opened later, its project not read yet:  reading, after a short wait", () => {
    const status = StartingStatus.show(fakeContext())
    status.opened(SOLITAIRE)
    status.started()
    status.published(SOLITAIRE)
    vi.advanceTimersByTime(SHORTEST_SHOW_MSEC)
    expect(status.isShowing).toBe(false)

    status.opened(RECIPES)
    vi.advanceTimersByTime(OPEN_DELAY_MSEC - 1)
    expect(status.isShowing).toBe(false)
    vi.advanceTimersByTime(1)
    expect(status.isShowing).toBe(true)
    expect(statusBarItems[0]?.text).toBe(`$(loading~spin) ${READING}`)
    status.published(RECIPES)
    vi.advanceTimersByTime(SHORTEST_SHOW_MSEC)
    expect(status.isShowing).toBe(false)
  })

  test("a file whose project is read, or that answers at once, shows nothing", () => {
    const status = StartingStatus.show(fakeContext())
    status.opened(SOLITAIRE)
    status.started()
    status.published(SOLITAIRE)
    vi.advanceTimersByTime(SHORTEST_SHOW_MSEC)
    status.opened(SOLITAIRE)
    vi.advanceTimersByTime(OPEN_DELAY_MSEC)
    expect(status.isShowing).toBe(false)
    status.opened(RECIPES)
    status.published(RECIPES)
    vi.advanceTimersByTime(OPEN_DELAY_MSEC)
    expect(status.isShowing).toBe(false)
  })

  test("a file closed before its problems came waits no more;  no file open, it goes once started", () => {
    const status = StartingStatus.show(fakeContext())
    status.opened(SOLITAIRE)
    status.closed(SOLITAIRE)
    status.started()
    vi.advanceTimersByTime(SHORTEST_SHOW_MSEC)
    expect(status.isShowing).toBe(false)
  })

  test("never stuck:  it goes by itself after the longest wait, and at once if the server fails", () => {
    const status = StartingStatus.show(fakeContext())
    status.opened(SOLITAIRE)
    status.started()
    vi.advanceTimersByTime(LONGEST_WAIT_MSEC - 1)
    expect(status.isShowing).toBe(true)
    vi.advanceTimersByTime(1)
    expect(status.isShowing).toBe(false)

    const failed = StartingStatus.show(fakeContext())
    failed.opened(SOLITAIRE)
    failed.stop()
    expect(failed.isShowing).toBe(false)
  })

  test("goes with the extension", () => {
    const context = fakeContext()
    const status = StartingStatus.show(context)
    for (const it of context.subscriptions) it.dispose()
    expect(status.isShowing).toBe(false)
    expect(statusBarItems[0]?.isDisposed).toBe(true)
  })
})
