import { describe, test, expect, vi } from "vite-plus/test"

import { core, DrawableList, frameSummary, logError, logFrame, startPage, type PageMessage } from "spell-lang/core"

/**
 * A page's frames, as its console shows them (`page.ts`, `logFrame()`):  one folded line each,
 * so you can watch a page and the program running elsewhere talk.
 */
describe("frameSummary()", () => {
  test("the page's:  a call, a call on a thing, an event with the things it names", () => {
    expect(frameSummary({ call: "play_from_the_stock_pile", args: [] })).toBe("call play_from_the_stock_pile()")
    expect(frameSummary({ call: "turn_over", on: { $id: "3" }, args: [] })).toBe("call turn_over() on #3")
    expect(frameSummary({ trigger: "card-click", details: { card: { $id: "26" } } })).toBe("event card-click (#26)")
    expect(frameSummary({ trigger: "reset", details: {} })).toBe("event reset")
    // by reference (P27):  its target, and a thing under another name in its details
    expect(frameSummary({ trigger: "card-click", target: "Card#ace-of-hearts", details: {} })).toBe(
      "event card-click (Card#ace-of-hearts)"
    )
    expect(frameSummary({ trigger: "card-move", target: "Card#3", details: { from: "Tableau#T1", count: 1 } })).toBe(
      "event card-move (Card#3, Tableau#T1)"
    )
    expect(frameSummary({ call: "turn_over", on: "Card#queen-of-spades", args: [] })).toBe(
      "call turn_over() on Card#queen-of-spades"
    )
  })

  test("the program's:  its state, by name;  a patch, each thing by type and id", () => {
    expect(frameSummary({ game: { $type: "Game", $id: "1" }, stock: { $id: "3" } })).toBe("state:  game, stock")
    expect(
      frameSummary([
        { $type: "Card", $id: "26", direction: "up" },
        { $type: "DiscardPile", $id: "27", $items: [] }
      ])
    ).toBe("patch:  Card #26, DiscardPile #27")
  })
})

describe("logFrame()", () => {
  test("a frame sent:  the blue SENDING  > badge", () => {
    const group = vi.spyOn(console, "groupCollapsed").mockImplementation(() => {})
    const log = vi.spyOn(console, "log").mockImplementation(() => {})
    const end = vi.spyOn(console, "groupEnd").mockImplementation(() => {})
    try {
      logFrame("sent", { trigger: "card-click", details: { card: { $id: "26" } } }, 58)
      expect(group.mock.calls[0]![0]).toBe("%cSENDING  >%c  event card-click (#26)  %c58 characters")
      expect(group.mock.calls[0]![1]).toContain("background: #2185d0")
    } finally {
      group.mockRestore()
      log.mockRestore()
      end.mockRestore()
    }
  })

  test("a frame received:  the green RECEIVED < badge, folded, the frame inside", () => {
    const group = vi.spyOn(console, "groupCollapsed").mockImplementation(() => {})
    const log = vi.spyOn(console, "log").mockImplementation(() => {})
    const end = vi.spyOn(console, "groupEnd").mockImplementation(() => {})
    try {
      const frame = [{ $type: "Card", $id: "26" }]
      logFrame("received", frame, 33)
      expect(group.mock.calls[0]![0]).toBe("%cRECEIVED <%c  patch:  Card #26  %c33 characters")
      expect(group.mock.calls[0]![1]).toContain("background: #21ba45")
      expect(log).toHaveBeenCalledWith(frame)
      expect(end).toHaveBeenCalled()
    } finally {
      group.mockRestore()
      log.mockRestore()
      end.mockRestore()
    }
  })
})

describe("logError()", () => {
  test("the red < ERROR  > badge, what went wrong, and the detail", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {})
    try {
      const frame = { error: "ValueError: no such card" }
      logError("the program couldn't run a message:  ValueError: no such card", frame)
      const [line, badge, , detail] = error.mock.calls[0]!
      expect(line).toBe("%c< ERROR  >%c  the program couldn't run a message:  ValueError: no such card")
      expect(badge).toContain("background: #db2828")
      expect(detail).toBe(frame)
    } finally {
      error.mockRestore()
    }
  })
})

/** A page's drag handlers run in its program, by their Python names (`core.remote`, epic `outline-spell` P28). */
describe("startPage():  a list's drag handlers", () => {
  test("`core.runHandler()`, `startWhile()`, `endWhile()` and a drop event go to the program, as calls on the list", () => {
    /** A tray, as a Python program's drawing half declares it. */
    class Tray extends DrawableList {}
    const sent: PageMessage[] = []
    startPage({
      modules: [{ Tray }],
      state: { tray: { $type: "Tray", $id: "1", $items: [] } },
      send: (message) => sent.push(message)
    })
    try {
      const tray = core.things.all().find((thing) => thing instanceof Tray)!
      core.startWhile(tray, "whileCardDraggedOver", "Card#3")
      core.endWhile(tray, "whileCardDraggedOver")
      core.runHandler(tray, "whenCardDroppedOn", "Card#3")
      // a reorder:  Python's list moves them (outline-spell P30)
      core.moveBefore(tray, ["Card#3"], undefined)
      core.remote!.trigger("card-drop", { count: 1 })
      // the page changes one of the program's things, e.g. a form a person typed in:  set there too
      tray.name = "T9"
      // the same again:  nothing to send
      tray.name = "T9"
      const on = sent[0] && "on" in sent[0] ? sent[0].on : undefined
      expect(on).toBeDefined()
      expect(sent).toEqual([
        { call: "start_while", on, args: ["while_card_dragged_over", "Card#3"] },
        { call: "end_while", on, args: ["while_card_dragged_over"] },
        { call: "when_card_dropped_on", on, args: ["Card#3"] },
        { call: "move_before", on, args: [["Card#3"], undefined] },
        { trigger: "card-drop", details: { count: 1 } },
        { call: "set_prop", on, args: ["name", "T9"] }
      ])
      // what the program sends the page is its own:  never sent back
      sent.length = 0
      startPage({
        modules: [{ Tray }],
        state: { tray: { $type: "Tray", $id: "1", name: "T1", $items: [] } },
        send: (message) => sent.push(message)
      })
      expect(sent).toEqual([])
    } finally {
      core.remote = undefined
    }
  })
})
