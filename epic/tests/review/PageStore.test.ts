import { afterEach, describe, expect, test, vi } from "vite-plus/test"

import { PageStore } from "spell/epic/review/PageStore"

////////////////
// ## Stores under test
////////////////

/** A store with a value:  setting it is a change. */
class Counter extends PageStore {
  count = 0

  /** The page's counter, made by `make` the first time. */
  static forPage(make = () => new Counter()): Counter {
    return Counter.onePerPage(make)
  }

  /** One more:  a change. */
  add() {
    this.count++
    this.changed()
  }
}

/** A store for one run of several:  another run's page makes another (as `RunForm`'s). */
class RunStore extends PageStore {
  constructor(readonly runId: string) {
    super()
  }

  static forPage(runId: string): RunStore {
    return RunStore.onePerPage(
      () => new RunStore(runId),
      (current) => current.runId === runId
    )
  }
}

afterEach(() => {
  Counter.adopt(undefined)
  RunStore.adopt(undefined)
})

////////////////
// ## Tests
////////////////

describe("PageStore", () => {
  test("a change bumps `version` and tells every listener;  the undo stops one", () => {
    const counter = new Counter()
    const heard = vi.fn()
    const undo = counter.subscribe(heard)
    counter.add()
    expect({ version: counter.version, heard: heard.mock.calls.length }).toEqual({ version: 1, heard: 1 })
    undo()
    counter.add()
    expect({ version: counter.version, heard: heard.mock.calls.length }).toEqual({ version: 2, heard: 1 })
  })

  test("ONE per page and class:  made once, the same after;  another class has its own", () => {
    const make = vi.fn(() => new Counter())
    const first = Counter.forPage(make)
    expect(Counter.forPage(make)).toBe(first)
    expect(make).toHaveBeenCalledTimes(1)
    expect(RunStore.forPage("a")).not.toBe(first)
  })

  test("made again when the one made doesn't fit:  another run's page", () => {
    const a = RunStore.forPage("a")
    expect(RunStore.forPage("a")).toBe(a)
    const b = RunStore.forPage("b")
    expect(b).not.toBe(a)
    expect(b.runId).toBe("b")
  })

  test("`adopt()` hands the page a test's own;  `undefined` lets the next `forPage()` make one", () => {
    const own = new Counter()
    Counter.adopt(own)
    expect(Counter.forPage()).toBe(own)
    Counter.adopt(undefined)
    expect(Counter.forPage()).not.toBe(own)
  })
})
