import { describe, expect, test } from "vite-plus/test"

import { observe } from "spell/util/reactive"
import { UndoStack, type UndoRecord } from "spell/util/persist"

////////////////
// ## Undo and redo
////////////////

describe("UndoStack", () => {
  test("undo puts a step back, redo makes it again;  each is one step", () => {
    const box = { margin: 4 }
    const history = new UndoStack()
    change(history, box, 8, "Change Margin")
    expect(box.margin).toBe(8)
    expect(history.undo()).toBe(true)
    expect(box.margin).toBe(4)
    expect(history.redo()).toBe(true)
    expect(box.margin).toBe(8)
    expect(history.redo()).toBe(false)
  })

  test("a new step empties the redo stack:  what was undone can't be redone after", () => {
    const box = { margin: 4 }
    const history = new UndoStack()
    change(history, box, 8, "Change Margin")
    history.undo()
    change(history, box, 6, "Change Margin")
    expect(history.canRedo).toBe(false)
  })

  test("the stacks move BEFORE the records run:  what they set off sees the new history", () => {
    const history = new UndoStack()
    const seen: boolean[] = []
    history.record({ undo: () => seen.push(history.canRedo), redo: () => seen.push(history.canUndo) }, { title: "X" })
    history.undo()
    history.redo()
    expect(seen).toEqual([true, true])
  })

  test("records nothing while it undoes or redoes:  what it puts back is no new step", () => {
    const box = { margin: 4 }
    const history = new UndoStack()
    const record: UndoRecord = {
      undo: () => recorded(history, box, 4),
      redo: () => recorded(history, box, 8)
    }
    box.margin = 8
    history.record(record, { title: "Change Margin" })
    history.undo()
    expect(history.steps).toHaveLength(0)
    expect(history.canRedo).toBe(true)
  })

  test("keeps at most `limit` steps:  the oldest go", () => {
    const box = { margin: 0 }
    const history = new UndoStack({ limit: 2 })
    for (const margin of [1, 2, 3]) change(history, box, margin, `Margin ${margin}`)
    expect(history.steps.map((step) => step.title)).toEqual(["Margin 2", "Margin 3"])
    expect(() => new UndoStack({ limit: 0 })).toThrow(TypeError)
  })

  test("`clear()` forgets both stacks, e.g. when another document opens", () => {
    const box = { margin: 0 }
    const history = new UndoStack()
    change(history, box, 1, "A")
    change(history, box, 2, "B")
    history.undo()
    history.clear()
    expect([history.canUndo, history.canRedo]).toEqual([false, false])
  })
})

////////////////
// ## Folding
////////////////

describe("UndoStack, folding", () => {
  test("typing into one field is ONE step:  undo goes back before the first letter, redo to the last", () => {
    const field = { text: "" }
    const history = new UndoStack()
    for (const text of ["h", "he", "hel", "hell", "hello"]) change(history, field, text, "Type", "text", field)
    expect(history.steps).toHaveLength(1)
    history.undo()
    expect(field.text).toBe("")
    history.redo()
    expect(field.text).toBe("hello")
  })

  test("folds only the same title AND the same target;  no target never folds", () => {
    const one = { text: "" }
    const two = { text: "" }
    const history = new UndoStack()
    change(history, one, "a", "Type", "text", one)
    change(history, two, "b", "Type", "text", two)
    change(history, two, "c", "Clear", "text", two)
    change(history, one, "d", "Type", "text")
    change(history, one, "e", "Type", "text")
    expect(history.steps).toHaveLength(5)
  })
})

////////////////
// ## Transactions
////////////////

describe("UndoStack.transaction()", () => {
  test("everything recorded inside is ONE step, under its title;  nested transactions join it", () => {
    const pile = { cards: 0, top: "none" }
    const history = new UndoStack()
    history.transaction("Deal", () => {
      change(history, pile, 1, "Move Card", "cards")
      history.transaction("Turn Card", () => change(history, pile, "ace", "Turn Card", "top"))
      change(history, pile, 2, "Move Card", "cards")
    })
    expect(history.steps.map((step) => step.title)).toEqual(["Deal"])
    history.undo()
    expect(pile).toEqual({ cards: 0, top: "none" })
    history.redo()
    expect(pile).toEqual({ cards: 2, top: "ace" })
  })

  test("an async one stays open until its promise settles:  what it does after a wait joins it", async () => {
    const pile = { cards: 0 }
    const history = new UndoStack()
    const dealt = history.transaction("Deal", async () => {
      for (const cards of [1, 2, 3]) {
        await Promise.resolve()
        change(history, pile, cards, "Move Card")
      }
      return "dealt"
    })
    expect(history.isInTransaction).toBe(true)
    // begun while it waits:  joins it
    history.transaction("Flip", () => change(history, pile, 9, "Flip"))
    expect(await dealt).toBe("dealt")
    expect(history.steps.map((step) => step.title)).toEqual(["Deal"])
    history.undo()
    expect(pile.cards).toBe(0)
  })

  test("redo of an async step is instant:  nothing is run again, nothing waited on", async () => {
    const pile = { cards: 0 }
    const history = new UndoStack()
    let runs = 0
    await history.transaction("Deal", async () => {
      runs++
      await Promise.resolve()
      change(history, pile, 3, "Move Card")
    })
    history.undo()
    expect(history.redo()).toBe(true)
    expect([pile.cards, runs]).toEqual([3, 1])
  })

  test("a throw still records what changed, and is passed on;  nothing recorded:  no step", async () => {
    const box = { margin: 0 }
    const history = new UndoStack()
    expect(() =>
      history.transaction("Break", () => {
        change(history, box, 5, "Margin")
        throw new Error("half done")
      })
    ).toThrow("half done")
    await expect(history.transaction("Fail", () => Promise.reject(new Error("refused")))).rejects.toThrow("refused")
    history.transaction("Nothing", () => undefined)
    expect(history.steps.map((step) => step.title)).toEqual(["Break"])
    expect(history.isInTransaction).toBe(false)
  })
})

////////////////
// ## Live titles
////////////////

describe("UndoStack, live", () => {
  test("its titles follow the history, so a menu reading them redraws by itself", () => {
    const box = { margin: 4 }
    const history = new UndoStack()
    const shown: string[] = []
    // it re-runs once per stack written:  an undo moves both, so check where each action ends
    const stop = observe(() => shown.push(`${history.undoTitle} | ${history.redoTitle} | ${history.canUndo}`))
    expect(shown.at(-1)).toBe("Undo | Redo | false")
    change(history, box, 8, "Change Margin")
    expect(shown.at(-1)).toBe("Undo Change Margin | Redo | true")
    history.undo()
    expect(shown.at(-1)).toBe("Undo | Redo Change Margin | false")
    stop()
  })

  test("titles in another language, worded whole", () => {
    const history = new UndoStack({
      titleFor: (action, title) => (action === "undo" ? "Deshacer" : "Rehacer") + (title ? ` «${title}»` : "")
    })
    change(history, { margin: 0 }, 1, "Margen")
    expect([history.undoTitle, history.redoTitle]).toEqual(["Deshacer «Margen»", "Rehacer"])
  })
})

////////////////
// ## Helpers
////////////////

/** Set `thing[property]` to `value`, recording it as `title` (folding by `target`). */
function change<T extends Record<string, unknown>>(
  history: UndoStack,
  thing: T,
  value: unknown,
  title: string,
  property: keyof T = Object.keys(thing)[0] as keyof T,
  target?: unknown
): void {
  const before = thing[property]
  thing[property] = value as T[keyof T]
  history.record(
    {
      undo: () => (thing[property] = before),
      redo: () => (thing[property] = value as T[keyof T])
    },
    { title, target }
  )
}

/** Set `box.margin`, recording it as a recorder would:  ignored while `history` applies. */
function recorded(history: UndoStack, box: { margin: number }, margin: number): void {
  box.margin = margin
  history.record({ undo: () => undefined, redo: () => undefined }, { title: "Change Margin" })
}
