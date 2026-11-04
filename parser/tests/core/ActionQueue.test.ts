import { beforeEach, describe, expect, test, vi } from "vite-plus/test"

import { App, core } from "spell/parser/core"

/**
 * What a person starts runs one at a time (`ActionQueue`, epic `language` Q6):  a repeat is ignored,
 * another waits its turn, only the latest kept.
 * - The classes are what spell compiles to:  an action that waits is an `async` method, called through `core.runAction()`.
 */

/** Each step's name, in the order they ran. */
let steps: string[] = []

/** How long a step of a deal waits, in msec:  short, as nothing here hangs on it. */
const STEP = 5

class Game extends App {
  static {
    this.declareProp("dealt", { type: "number" })
  }
  /** `- to deal:`, two steps with a wait in each, and a nested call of `flip`. */
  async deal(): Promise<void> {
    steps.push("deal starts")
    this.setProp("dealt", ((this.getProp("dealt") as number) ?? 0) + 1)
    await core.pauseFor(STEP, "msec")
    await this.flip()
    await core.pauseFor(STEP, "msec")
    steps.push("deal ends")
  }
  /** `- to flip:` */
  async flip(): Promise<void> {
    steps.push("flip")
    await core.pauseFor(STEP, "msec")
  }
  /** `- to hint:`, which doesn't wait. */
  hint(): void {
    steps.push("hint")
  }
  /** `- to fail:` */
  async fail(): Promise<void> {
    await core.pauseFor(STEP, "msec")
    throw new Error("failed on purpose")
  }
  /** `- to search for (words):`, with `- a new one replaces the last one`. */
  async search(words: string): Promise<void> {
    steps.push(`search ${words}`)
    await core.pauseFor(STEP * 4, "msec")
    steps.push(`found ${words}`)
  }
}
core.describeAction(Game, "deal", { title: "deal", undoneAs: "Deal" })
core.describeAction(Game, "search", { title: "search", replacesLast: true })

/** Everything in the queue has ended. */
async function settled(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, STEP * 12))
}

beforeEach(() => {
  core.resetRuntime()
  steps = []
})

describe("one at a time", () => {
  test("an action that doesn't wait runs right there", () => {
    const game = new Game()
    expect(core.runAction(game, "hint")).toBe(true)
    expect(steps).toEqual(["hint"])
    expect(core.RUNTIME.actions.isBusy).toBe(false)
  })

  test("double click:  a repeat of the running action, on the same thing, is ignored", async () => {
    const game = new Game()
    expect(core.runAction(game, "deal", "click")).toBe(true)
    expect(core.runAction(game, "deal", "click")).toBe(true)
    await settled()
    expect(steps.filter((step) => step === "deal starts")).toHaveLength(1)
  })

  test("the same action on another thing is no repeat:  it waits its turn", async () => {
    const [one, two] = [new Game(), new Game()]
    core.runAction(one, "deal")
    core.runAction(two, "deal")
    await settled()
    expect(steps.filter((step) => step === "deal starts")).toHaveLength(2)
    expect(steps[2]).toBe("deal ends")
  })

  test("a click during a deal waits for it, and a nested call never waits for itself", async () => {
    const game = new Game()
    core.runAction(game, "deal")
    core.runAction(game, "hint")
    expect(steps).toEqual(["deal starts"])
    await settled()
    expect(steps).toEqual(["deal starts", "flip", "deal ends", "hint"])
  })

  test("three clicks keep the latest", async () => {
    const game = new Game()
    const heard = vi.fn()
    const stop = core.onActionRun(heard)
    core.runAction(game, "deal")
    core.runAction(game, "flip")
    core.runAction(game, "fail")
    core.runAction(game, "hint")
    await settled()
    expect(steps).toEqual(["deal starts", "flip", "deal ends", "hint"])
    expect(heard.mock.calls.map(([run]) => run.name)).toEqual(["deal", "hint"])
    stop()
  })

  test("a nested send, and anything the program calls itself, stays direct", async () => {
    const game = new Game()
    core.runAction(game, "deal")
    game.hint()
    expect(steps).toEqual(["deal starts", "hint"])
    await settled()
  })

  test("a queued action no longer enabled when its turn comes doesn't run", async () => {
    const game = new Game()
    const canRun = vi.fn(() => false)
    const run = vi.fn()
    core.runAction(game, "deal")
    core.runPressed(game, "click", run, canRun)
    await settled()
    expect(canRun).toHaveBeenCalled()
    expect(run).not.toHaveBeenCalled()
  })

  test("a failing action is said on the console, and the next one runs", async () => {
    const game = new Game()
    const error = vi.spyOn(core.console, "error").mockImplementation(() => {})
    core.runAction(game, "fail")
    core.runAction(game, "hint")
    await settled()
    expect(error).toHaveBeenCalledWith("fail failed", expect.any(Error))
    expect(steps).toEqual(["hint"])
    error.mockRestore()
  })

  test("one that throws right there is said too, and never reaches the key's press", () => {
    const game = new Game()
    const error = vi.spyOn(core.console, "error").mockImplementation(() => {})
    ;(game as unknown as Record<string, unknown>).boom = () => {
      throw new Error("failed on purpose")
    }
    expect(core.runAction(game, "boom")).toBe(true)
    expect(error).toHaveBeenCalledWith("boom failed", expect.any(Error))
    expect(core.RUNTIME.actions.isBusy).toBe(false)
    error.mockRestore()
  })

  test("a slow read never enters the queue, so a click during it runs at once", () => {
    const game = new Game()
    core.runAction(game, "hint")
    expect(steps).toEqual(["hint"])
  })

  test("what `core.runPressed()` runs is one action with the rest:  a click's repeat is ignored", async () => {
    const game = new Game()
    const run = vi.fn(() => game.flip())
    core.runPressed(game, "click", run)
    core.runPressed(game, "click", run)
    await settled()
    expect(run).toHaveBeenCalledTimes(1)
  })

  test("`core.pressed()` is a repeat of itself across drawings", async () => {
    const game = new Game()
    const draw = () => core.pressed(game, async () => await game.flip())
    draw()(new Event("click"))
    draw()(new Event("click"))
    await settled()
    expect(steps).toEqual(["flip"])
  })

  test("only a handler written `async` holds the queue:  a toast's promise doesn't", async () => {
    const game = new Game()
    core.pressed(game, () => new Promise(() => {}))(new Event("click"))
    expect(core.RUNTIME.actions.isBusy).toBe(false)
    core.pressed(game, async () => await core.pauseFor(STEP, "msec"))(new Event("click"))
    expect(core.RUNTIME.actions.isBusy).toBe(true)
    await settled()
  })

  test("`core.actionFinishing()` says when it's done, or dropped", async () => {
    const game = new Game()
    core.runAction(game, "deal")
    core.runAction(game, "flip")
    const finishing = core.actionFinishing(game, "deal")
    const dropped = core.actionFinishing(game, "flip")
    core.runAction(game, "fail")
    await dropped
    expect(steps).toEqual(["deal starts"])
    await finishing
    expect(steps).toContain("deal ends")
    expect(core.actionFinishing(game, "deal")).toBeUndefined()
    vi.spyOn(core.console, "error").mockImplementationOnce(() => {})
    await settled()
  })
})

describe("undo", () => {
  test("refused from a menu while an action runs, as from a key", async () => {
    const game = new Game()
    core.runAction(game, "deal")
    await settled()
    core.runAction(game, "deal")
    const undo = vi.spyOn(core.RUNTIME.history, "undo")
    expect(core.runAction(game, "undo", "menu")).toBe(true) // the press is taken, and nothing happens
    expect(undo).not.toHaveBeenCalled()
    await settled()
    // the deal is one step:  undo runs at once now
    expect(core.runAction(game, "undo", "menu")).toBe(true)
    expect(undo).toHaveBeenCalled()
  })

  test("a second action is its own step:  a click waiting for a deal doesn't join it", async () => {
    const game = new Game()
    core.runAction(game, "deal")
    core.runAction(game, "search", "code", ["x"])
    await settled()
    expect(game.undoTitle).toContain("Deal")
    expect(core.RUNTIME.history.isInTransaction).toBe(false)
  })
})

describe("canceling", () => {
  test("stops at its next wait, silently;  what it wrote stays;  who started it is told", async () => {
    const game = new Game()
    const error = vi.spyOn(core.console, "error")
    const stops: AbortSignal[] = []
    const stop = core.onActionRun((run) => stops.push(run.signal))
    core.runAction(game, "search", "code", ["x"])
    expect(core.runningAction()?.name).toBe("search")
    expect(core.cancelActions()).toBe(true)
    expect(stops[0]!.aborted).toBe(true)
    await settled()
    expect(steps).toEqual(["search x"])
    expect(error).not.toHaveBeenCalled()
    expect(core.RUNTIME.actions.isBusy).toBe(false)
    stop()
    error.mockRestore()
  })

  test("drops what's waiting too, and says if it found anything", async () => {
    const game = new Game()
    core.runAction(game, "deal")
    core.runAction(game, "hint")
    expect(core.cancelActions(game, "hint")).toBe(true)
    expect(core.cancelActions(game, "nothing")).toBe(false)
    await settled()
    expect(steps).toContain("deal ends")
    expect(steps).not.toContain("hint")
    expect(core.cancelActions()).toBe(false)
  })

  test("`- a new one replaces the last one`:  the newest wins", async () => {
    const game = new Game()
    core.runAction(game, "search", "code", ["a"])
    core.runAction(game, "search", "code", ["ab"])
    core.runAction(game, "search", "code", ["abc"])
    await settled()
    expect(steps).toEqual(["search a", "search abc", "found abc"])
  })

  test("stops a loop one by one, and what a handler was sent in", async () => {
    const game = new Game()
    const seen: number[] = []
    core.runPressed(game, "click", () =>
      core.forEachSequential([1, 2, 3], async (value) => {
        seen.push(value as number)
        await core.pauseFor(STEP, "msec")
      })
    )
    core.cancelActions()
    await settled()
    expect(seen).toEqual([1])
  })
})

describe("the program's own steps", () => {
  test("`core.holdWhile()` doesn't hold what comes next, and people's actions wait for it", async () => {
    const game = new Game()
    core.holdWhile(() => game.deal())
    steps.push("first draw")
    core.runAction(game, "hint")
    expect(steps).toEqual(["deal starts", "first draw"])
    await settled()
    expect(steps.at(-1)).toBe("hint")
    expect(steps).toContain("deal ends")
  })

  test("two held steps run side by side, as they start", async () => {
    const game = new Game()
    core.holdWhile(() => game.flip())
    core.holdWhile(() => game.flip())
    expect(steps).toEqual(["flip", "flip"])
    await settled()
  })

  test("a recompile's load holds nothing:  its pauses never end", async () => {
    const game = new Game()
    core.isCarryingOver = true
    try {
      core.holdWhile(() => game.deal())
    } finally {
      core.isCarryingOver = false
    }
    expect(core.RUNTIME.actions.isBusy).toBe(false)
    core.runAction(game, "hint")
    expect(steps).toEqual(["deal starts", "hint"])
  })

  test("`core.meanwhile()` says a failure on the console, and people's actions don't wait", async () => {
    const error = vi.spyOn(core.console, "error").mockImplementation(() => {})
    const game = new Game()
    await core.meanwhile(() => game.fail())
    expect(error).toHaveBeenCalledWith(expect.any(Error))
    await core.meanwhile(() => {
      throw new Error("failed on purpose")
    })
    expect(error).toHaveBeenCalledTimes(2)
    void core.meanwhile(() => game.deal())
    core.runAction(game, "hint")
    expect(steps).toEqual(["deal starts", "hint"])
    await settled()
    error.mockRestore()
  })
})
