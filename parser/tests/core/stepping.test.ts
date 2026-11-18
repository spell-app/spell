import { afterEach, describe, expect, test } from "vite-plus/test"

import { core, type DebugFrame, type Stepper } from "spell/parser/core"
import { runSpellFiles } from "spell/parser/spell/test"

const stepper = (core as unknown as { _stepper: Stepper })._stepper

/** A pile game, its lines numbered from 0 as the stepper counts them. */
const GAME = [
  `a "card" is a thing`, // 0
  `	its "rank" is a number`, // 1
  `	it "is high" if its rank > 10`, // 2
  ``, // 3
  `a "pile" is a list of cards`, // 4
  `	its "score" is a number`, // 5
  `	to "move a card to a pile"`, // 6
  `		set points to the points for the card`, // 7
  `		add the card to the pile`, // 8
  `		set the pile's score to the pile's score + points`, // 9
  `	to "the points for (a card)"`, // 10
  `		set bonus to 2`, // 11
  `		return 10 + bonus if the card is high`, // 12
  `		return 5 + bonus`, // 13
  ``,
  `the stock is a new pile`,
  `the queen is a new card with rank 12`
].join("\n")

/** The game, run from its debugging build:  its pile and its queen. */
function game() {
  const run = runSpellFiles([{ path: "/Game.spell", contents: GAME }], { registered: true, debugging: true })
  return run("stock, queen") as { stock: { score: number; length: number }; queen: object }
}

/** Wait until the stepper holds a line:  its frame. */
function nextStop(): Promise<DebugFrame> {
  return new Promise((resolve) => {
    const stop = stepper.onChange((it) => {
      if (!it.stopped) return
      stop()
      resolve(it.stopped)
    })
  })
}

/** The queen moved to the pile:  what the move answers, once it's done. */
function moveTheQueen({ stock, queen }: ReturnType<typeof game>): Promise<unknown> {
  return (queen as { moveToPile(pile: unknown): Promise<unknown> }).moveToPile(stock)
}

afterEach(() => stepper.reset())

describe("core._stepper:  a debugging build's program, stopped and stepped", () => {
  test("no breakpoint:  it runs straight through", async () => {
    const it = game()
    await moveTheQueen(it)
    expect(it.stock.score).toBe(12)
    expect(stepper.stopped).toBeUndefined()
  })

  test("a breakpoint stops it there, with its thing, its inputs and its callers;  going on finishes the move", async () => {
    const it = game()
    stepper.setBreakpoints("/Game.spell", [8])
    const stopped = nextStop()
    const moved = moveTheQueen(it)
    const frame = await stopped
    expect(frame.line).toBe(8)
    expect(frame.declaredAt).toBe(6)
    expect(frame.thing).toBe(it.queen)
    expect(frame.inputs).toEqual({ pile: it.stock })
    expect(frame.values).toEqual({ points: 12 })
    // held:  the card isn't in the pile yet
    expect(it.stock.length).toBe(0)
    stepper.goOn()
    await moved
    expect(it.stock.length).toBe(1)
    expect(it.stock.score).toBe(12)
  })

  test("step over, into and out", async () => {
    const it = game()
    stepper.setBreakpoints("/Game.spell", [7])
    let stopped = nextStop()
    const moved = moveTheQueen(it)
    expect((await stopped).line).toBe(7)

    // into the points, from the line that asks for them
    stopped = nextStop()
    stepper.stepInto()
    const inner = await stopped
    expect(inner.line).toBe(11)
    expect(inner.stack.map((frame) => frame.declaredAt)).toEqual([10, 6])

    // over:  its next line, with what's set so far
    stopped = nextStop()
    stepper.stepOver()
    expect((await stopped).line).toBe(12)
    expect(inner.values).toEqual({ bonus: 2 })

    // out:  back in the move, on its next line
    stopped = nextStop()
    stepper.stepOut()
    const outer = await stopped
    expect(outer.line).toBe(8)
    expect(outer.declaredAt).toBe(6)

    stepper.goOn()
    await moved
    expect(it.stock.score).toBe(12)
  })

  test("step over a line that calls another action:  it runs, and stops on the next line", async () => {
    const it = game()
    stepper.setBreakpoints("/Game.spell", [7])
    let stopped = nextStop()
    const moved = moveTheQueen(it)
    await stopped
    stopped = nextStop()
    stepper.stepOver()
    const frame = await stopped
    expect(frame.line).toBe(8)
    expect(frame.values).toEqual({ points: 12 })
    stepper.goOn()
    await moved
  })

  test("reset lets whatever's held go on, and forgets the breakpoints", async () => {
    const it = game()
    stepper.setBreakpoints("/Game.spell", [9])
    const stopped = nextStop()
    const moved = moveTheQueen(it)
    await stopped
    stepper.reset()
    await moved
    expect(it.stock.score).toBe(12)
    expect(stepper.allBreakpoints.size).toBe(0)
  })
})
