import { parseHTML } from "linkedom"
import { enableExternalSource, flush } from "solid-js"
import { render } from "@solidjs/web"
import { afterEach, beforeAll, describe, expect, test } from "vite-plus/test"

import { bridgeSolid } from "spell/util"
import { core, Thing, prop, h } from "spell/parser/core"
import type { Drawing } from "spell/parser/core/drawing"

/**
 * A value that takes a while (epic `language` P12):  `core.waitedValue()`, `core.whileWaiting()`, `core.answerOf()`,
 * and a whole thing held in its boundary.
 * - As compiled JavaScript writes them, on Solid's client build, into a fake page (linkedom).
 * - Answers land when the test says, through `Answers`:  no timers.
 */

/** Promises for a getter's work, the test answering each in turn. */
class Answers {
  /** Each run still waiting for its answer. */
  private waiting: Array<{ answer: (value: unknown) => void; fail: (error: Error) => void }> = []
  /** How many times the work has run. */
  runs = 0

  /** The work:  one run, waiting to be answered. */
  next = (): Promise<unknown> => {
    this.runs++
    return new Promise((answer, fail) => this.waiting.push({ answer, fail }))
  }

  /** SIDE EFFECT:  answers the newest run, then lets the page take it in. */
  async answer(value: unknown): Promise<void> {
    this.waiting.pop()?.answer(value)
    await settled()
  }

  /** SIDE EFFECT:  fails the newest run, then lets the page take it in. */
  async fail(error: Error): Promise<void> {
    this.waiting.pop()?.fail(error)
    await settled()
  }
}

/** A thing with a getter that waits, as javascript writes it. */
class Game extends Thing {
  @prop({ type: "number", default: 1 }) accessor rank!: number
  @prop({ type: "number", default: 0 }) accessor moves!: number
  work = new Answers()

  get total(): number {
    return core.waitedValue(
      this,
      "total",
      async () => {
        const rank = this.rank
        return ((await this.work.next()) as number) + rank
      },
      () => [this.rank]
    )
  }

  /** A plain getter over one:  "not yet" passes through. */
  get doubled(): number {
    return this.total * 2
  }

  override draw(): Drawing {
    return h(
      "div",
      "moves ",
      () => this.moves,
      " total ",
      () => core.whileWaiting(() => this.total as unknown as Drawing)
    ) as unknown as Drawing
  }
}

/** Reads it where there's no spot for a "…":  the class says its whole drawing is held. */
class HeldGame extends Game {
  static drawsWaiting = true

  override draw(): Drawing {
    return (this.total > 5 ? h("b", "big") : h("i", "small")) as unknown as Drawing
  }
}

/** Waits for promises, and the page's staged writes. */
async function settled(): Promise<void> {
  for (let turns = 0; turns < 5; turns++) {
    await Promise.resolve()
    core.flush()
    flush()
  }
}

/** The page's text. */
const shown = () => container.textContent?.replace(/\s+/g, " ").trim()

let container: HTMLElement
let dispose: (() => void) | undefined

beforeAll(() => {
  const { document, window } = parseHTML("<!doctype html><html><body></body></html>")
  Object.assign(globalThis, { document, window, Node: window.Node, Element: window.Element })
  bridgeSolid({ enableExternalSource, flush })
})

afterEach(() => {
  dispose?.()
  dispose = undefined
})

/** Draws `thing` on a new page. */
function draw(thing: object): void {
  container = document.createElement("div")
  document.body.appendChild(container)
  dispose = render(() => core.drawThing(thing) as never, container)
  flush()
}

describe("a value that waits, in a drawing", () => {
  test('first load:  a "…" where it goes, the rest drawn, then the value', async () => {
    const game = new Game()
    draw(game)
    expect(shown()).toBe("moves 0 total …")
    await game.work.answer(10)
    expect(shown()).toBe("moves 0 total 11")
  })

  test("a later change keeps the old answer until the new one lands, and the rest moves on", async () => {
    const game = new Game()
    draw(game)
    await game.work.answer(10)
    game.rank = 2
    await settled()
    game.moves = 1
    await settled()
    expect(shown()).toBe("moves 1 total 11")
    await game.work.answer(10)
    expect(shown()).toBe("moves 1 total 12")
  })

  test("ONE value per thing and name, its work run once however often it's read", async () => {
    const game = new Game()
    draw(game)
    expect(game.work.runs).toBe(1)
    await game.work.answer(10)
    expect([game.total, game.total]).toEqual([11, 11])
    expect(game.work.runs).toBe(1)
  })
})

describe("a whole thing held", () => {
  test('an `if` reading it:  a "…" for the thing, then its drawing, then drawn again as it changes', async () => {
    const game = new HeldGame()
    draw(game)
    expect(shown()).toBe("…")
    await game.work.answer(1)
    expect(shown()).toBe("small")
    game.rank = 9
    await settled()
    await game.work.answer(1)
    expect(shown()).toBe("big")
  })

  test("a failure shows the thing's stand-in, and heals when a later answer works", async () => {
    const game = new HeldGame()
    const logged = core.console.error
    core.console.error = () => {}
    try {
      draw(game)
      await game.work.fail(new Error("no answer"))
      expect(shown()).toContain("can't draw")
      game.rank = 2
      await settled()
      await game.work.answer(1)
      expect(shown()).toBe("small")
    } finally {
      core.console.error = logged
    }
  })
})

describe("core.answerOf():  an action's read", () => {
  test("it waits for the first answer, drawn or not", async () => {
    const game = new Game()
    const answer = core.answerOf(game, "total")
    await settled()
    await game.work.answer(10)
    await expect(answer).resolves.toBe(11)
  })

  test("after a write it's the NEW answer, never the old one", async () => {
    const game = new Game()
    draw(game)
    await game.work.answer(10)
    game.rank = 40
    const answer = core.answerOf(game, "total")
    await settled()
    await game.work.answer(10)
    await expect(answer).resolves.toBe(50)
  })

  test("a getter over one is worked out with the answer", async () => {
    const game = new Game()
    const answer = core.answerOf(game, "doubled")
    await settled()
    await game.work.answer(10)
    await expect(answer).resolves.toBe(22)
  })

  test("a failure reaches the action", async () => {
    const game = new Game()
    const answer = core.answerOf(game, "total")
    await settled()
    await game.work.fail(new Error("no answer"))
    await expect(answer).rejects.toThrow("no answer")
  })

  test("by name, so it may be a plain value:  that's the answer", async () => {
    const game = new Game()
    await expect(core.answerOf(game, "moves")).resolves.toBe(0)
    await expect(core.answerOf(undefined, "moves")).resolves.toBeUndefined()
  })
})
