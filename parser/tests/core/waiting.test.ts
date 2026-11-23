import { parseHTML } from "linkedom"
import { enableExternalSource, flush } from "solid-js"
import { render } from "@solidjs/web"
import { afterEach, beforeAll, describe, expect, test } from "vite-plus/test"

import { bridgeSolid } from "spell/util"
import { core, Thing, prop, h } from "spell/parser/core"
import type { Drawing } from "spell/parser/core/drawing"
import { SkeletonText } from "spell/element/SkeletonText"
import { lookOfWords, lookSaid } from "spell/parser/core/looks"

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

/** Its body's attribute reads it:  a spot of its own, as compiled javascript writes one (`core.drawWaiting()`). */
class PaneGame extends Game {
  override draw(): Drawing {
    return h("div", h("h1", "Heading"), () =>
      core.drawWaiting(() => h("p", { title: () => String(this.total) }, "body") as unknown as Drawing)
    ) as unknown as Drawing
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

describe("an element whose attributes wait, in a spot of its own", () => {
  test("a spinner in its spot, the rest drawn at once;  then the element", async () => {
    const game = new PaneGame()
    draw(game)
    expect(shown()).toBe("Heading")
    expect(container.querySelector("ui-loader")).not.toBeNull()
    await game.work.answer(10)
    expect(container.querySelector("p")?.getAttribute("title")).toBe("11")
    expect(container.querySelector("ui-loader")).toBeNull()
  })

  test("a failure shows a message and Try again in its spot:  the rest stays", async () => {
    const game = new PaneGame()
    draw(game)
    await game.work.fail(new Error("no answer"))
    expect(shown()).toContain("Heading")
    expect(shown()).toContain("no answer")
    expect(container.querySelector("ui-message ui-button")).not.toBeNull()
  })
})

/** Its pane's `loading="..."`:  how what waits in it looks, as compiled javascript writes it (`core.drawLooking()`). */
class LookingGame extends Game {
  constructor(
    private said: string,
    private tag = "section",
    private ownsState = false
  ) {
    super()
  }

  override draw(): Drawing {
    return h("div", h("h1", "Heading"), () =>
      core.drawLooking(
        this.said,
        () =>
          h(this.tag, () =>
            core.drawWaiting(() => h("p", { title: () => String(this.total) }, "body") as unknown as Drawing, "p")
          ) as unknown as Drawing,
        this.ownsState
      )
    ) as unknown as Drawing
  }
}

describe("how what waits looks:  an element's `loading`", () => {
  test('"skeleton":  Spell UI\'s placeholder lines where it waits, announced busy;  then the element', async () => {
    const game = new LookingGame("skeleton")
    draw(game)
    expect(container.querySelector("ui-loader")).toBeNull()
    const skeleton = container.querySelector(".spell-waiting-skeleton")
    expect(skeleton?.getAttribute("aria-busy")).toBe("true")
    expect(skeleton?.querySelectorAll("ui-placeholder-paragraph ui-placeholder-line").length).toBe(3)
    await game.work.answer(10)
    expect(container.querySelector("p")?.getAttribute("title")).toBe("11")
    expect(container.querySelector("ui-placeholder")).toBeNull()
  })

  test('"skeleton: header, 2 line paragraph, image", as it compiles:  those shapes, in order', () => {
    draw(new LookingGame(lookOfWords("skeleton: header, 2 line paragraph, image", (text) => SkeletonText.parse(text))))
    const shapes = [...container.querySelectorAll("ui-placeholder > *")].map((shape) => shape.localName)
    expect(shapes).toEqual(["ui-placeholder-header", "ui-placeholder-paragraph", "ui-placeholder-image"])
    expect(container.querySelectorAll("ui-placeholder-paragraph ui-placeholder-line").length).toBe(2)
  })

  test('"none":  nothing where it waits', () => {
    draw(new LookingGame("none"))
    expect(container.querySelector("ui-loader, ui-placeholder")).toBeNull()
    expect(shown()).toBe("Heading")
  })

  test("words:  the spinner says them", () => {
    draw(new LookingGame("Loading Jobs..."))
    expect(container.querySelector("ui-loader")?.textContent).toBe("Loading Jobs...")
  })

  test("a pane with a loading state of its own:  that state on while it waits, no second spinner;  off after", async () => {
    const game = new LookingGame("spinner", "ui-segment", true)
    draw(game)
    const segment = container.querySelector("ui-segment")!
    expect(segment.hasAttribute("loading")).toBe(true)
    expect(container.querySelector("ui-loader")).toBeNull()
    await game.work.answer(10)
    expect(segment.hasAttribute("loading")).toBe(false)
    expect(container.querySelector("p")?.getAttribute("title")).toBe("11")
  })

  test("the same pane told skeleton:  placeholder lines inside it, its own state left off", () => {
    draw(new LookingGame("skeleton", "ui-segment", true))
    expect(container.querySelector("ui-segment")?.hasAttribute("loading")).toBe(false)
    expect(container.querySelector("ui-segment ui-placeholder")).not.toBeNull()
  })
})

describe("the look's words", () => {
  test("look words, in both languages;  anything else a spinner's words", () => {
    expect(lookSaid("skeleton")).toEqual({ look: "skeleton" })
    expect(lookSaid("esqueleto")).toEqual({ look: "skeleton" })
    expect(lookSaid("none")).toEqual({ look: "none" })
    expect(lookSaid("cargador")).toEqual({ look: "spinner" })
    expect(lookSaid("Loading Jobs...")).toEqual({ look: "spinner", text: "Loading Jobs..." })
    expect(lookSaid("")).toEqual({ look: "spinner" })
  })

  test("a skeleton's shape after its `:`, in `SkeletonText`'s words, compiled:  a page never parses it", () => {
    const parse = (text: string) => SkeletonText.parse(text)
    const compiled = lookOfWords("skeleton: header, 3 line paragraph", parse)
    expect(lookSaid(compiled)).toEqual({
      look: "skeleton",
      skeleton: { parts: [{ shape: "header" }, { shape: "paragraph", lines: 3 }] }
    })
    expect(lookSaid(lookOfWords("esqueleto: 5 line paragraph", parse))).toEqual({
      look: "skeleton",
      skeleton: { parts: [{ shape: "paragraph", lines: 5 }] }
    })
    // a bare skeleton:  the element's own, its vocabulary's
    expect(lookSaid(lookOfWords("skeleton", parse, { height: "16em" }))).toEqual({
      look: "skeleton",
      skeleton: { height: "16em" }
    })
    expect(lookOfWords("Loading Jobs...", parse)).toBe("Loading Jobs...")
    expect(() => lookOfWords("skeleton: wibble", parse)).toThrow(/wibble/)
    // said at run time, uncompiled:  a skeleton of what's coming
    expect(lookSaid("skeleton: wibble")).toEqual({ look: "skeleton" })
  })
})

describe("a value that fails", () => {
  test("a small ⚠ where it goes, why in its tooltip:  the rest stays", async () => {
    const game = new Game()
    const logged = core.console.error
    core.console.error = () => {}
    try {
      draw(game)
      await game.work.fail(new Error("no answer"))
      expect(shown()).toBe("moves 0 total ⚠")
      expect(container.querySelector(".spell-draw-error")?.getAttribute("title")).toBe("no answer")
    } finally {
      core.console.error = logged
    }
  })
})

describe("a whole thing held", () => {
  test("an `if` reading it:  a spinner for the thing, then its drawing, then drawn again as it changes", async () => {
    const game = new HeldGame()
    draw(game)
    // a "…" once, which read as a blank page:  Spell UI's spinner now
    expect(container.querySelector("ui-loader")).not.toBeNull()
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

  test("waitedValueKeyFor():  one object for a thing and its parts, the same each time", () => {
    const game = new Game()
    const film = {}
    const key = core.waitedValueKeyFor(game, film)
    expect(core.waitedValueKeyFor(game, film)).toBe(key)
    expect(core.waitedValueKeyFor(game, {})).not.toBe(key)
    expect(core.waitedValueKeyFor(new Game(), film)).not.toBe(key)
    expect(core.waitedValueKeyFor(game, 2)).toBe(core.waitedValueKeyFor(game, 2))
    expect(core.waitedValueKeyFor(game, film, "a")).not.toBe(core.waitedValueKeyFor(game, film, "b"))
  })

  test("by name, so it may be a plain value:  that's the answer", async () => {
    const game = new Game()
    await expect(core.answerOf(game, "moves")).resolves.toBe(0)
    await expect(core.answerOf(undefined, "moves")).resolves.toBeUndefined()
  })
})
