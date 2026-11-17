import { describe, test, expect, vi } from "vite-plus/test"

import { observe } from "spell/util"
import {
  App,
  core,
  ViewableList,
  frameSummary,
  logError,
  logFrame,
  startPage,
  type PageMessage
} from "spell/parser/core"

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
    class Tray extends ViewableList {}
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

/** A page's actions run in its program, by their Python names (`core.runAction()`, epic `language` T51). */
describe("startPage():  actions and menus", () => {
  test("a menu's action, run on the page, is a call of the program's method;  a disabled one sends nothing", async () => {
    /** A game, as a Python program's drawing half declares it:  its method's body is the program's to run. */
    class Game extends ViewableList {
      autoPlay() {
        throw new Error("runs in the program, never here")
      }
      cheat() {
        throw new Error("runs in the program, never here")
      }
      get cheatIsEnabled() {
        return false
      }
    }
    core.describeAction(Game, "autoPlay", { title: "Auto play", shortcuts: ["A"] })
    core.describeAction(Game, "cheat", { title: "Cheat", enabledWhen: "cheatIsEnabled" })
    core.describeMenu(Game, "gameMenu", { items: ["autoPlay", "cheat"] })
    const sent: PageMessage[] = []
    startPage({
      modules: [{ Game }],
      state: { game: { $type: "Game", $id: "1", $items: [] } },
      send: (message) => sent.push(message)
    })
    try {
      const game = core.things.all().find((thing) => thing instanceof Game)!
      const items = core.menuOf(game, "game menu")!
      expect(items.map((item) => item.kind === "action" && item.title)).toEqual(["Auto play", "Cheat"])
      for (const item of items) if (item.kind === "action") item.run("click")
      // its key, as the page's keys run it
      core.runShortcut(game, { key: "a" })
      await new Promise((resolve) => setTimeout(resolve, 0))
      const on = sent[0] && "on" in sent[0] ? sent[0].on : undefined
      expect(on).toBeDefined()
      expect(sent).toEqual([
        { call: "auto_play", on, args: [] },
        { call: "auto_play", on, args: [] }
      ])
    } finally {
      core.remote = undefined
    }
  })
})

/** A Python program's undo history, on its page (epic `language` P54):  its app's Undo and Redo follow it. */
describe("startPage():  the app's Undo and Redo", () => {
  test("they show the program's history as its frames say, live;  run, they're calls of the program's", async () => {
    /** A game, as a Python program's drawing half declares it. */
    class Game extends App {}
    const sent: PageMessage[] = []
    const shown = (canUndo: boolean, undoTitle: string, canRedo = false, redoTitle = "Redo") => ({
      $history: { can_undo: canUndo, can_redo: canRedo, undo_title: undoTitle, redo_title: redoTitle }
    })
    core.resetRuntime()
    const page = startPage({
      modules: [{ Game }],
      state: { game: { $type: "Game", $id: "1", ...shown(false, "Deshacer") } },
      send: (message) => sent.push(message)
    })
    try {
      const game = core.things.all().find((thing) => thing instanceof Game)!
      // the program's history:  nothing to undo, in its language
      expect([game.canUndo, game.undoTitle, game.redoTitle]).toEqual([false, "Deshacer", "Redo"])
      // it's no prop of the app
      expect(Object.keys(game.toJSON())).not.toContain("$history")
      const titles: string[] = []
      const stop = observe(() => titles.push(game.undoTitle))
      // a move made there:  its patch says so
      page.receive([{ $type: "Game", $id: "1", ...shown(true, "Undo Turn Card") }])
      expect([game.canUndo, titles.at(-1)]).toEqual([true, "Undo Turn Card"])
      stop()
      // its Undo, run here as a click or ⌘Z runs it:  a call of the program's own
      expect(core.runAction(game, "undo", "click")).toBe(true)
      await new Promise((resolve) => setTimeout(resolve, 0))
      expect(sent).toEqual([{ call: "undo", on: "Game#1", args: [] }])
      page.receive([{ $type: "Game", $id: "1", ...shown(false, "Undo", true, "Redo Turn Card") }])
      expect([game.canUndo, game.canRedo, game.redoTitle]).toEqual([false, true, "Redo Turn Card"])
      // nothing to undo:  nothing sent
      expect(core.runAction(game, "undo", "click")).toBe(false)
    } finally {
      core.remote = undefined
    }
  })
})

describe("startPage():  the program's dialogs and toasts", () => {
  test("a question is shown as the core shows it here, then answered by its number", async () => {
    const sent: PageMessage[] = []
    core.resetRuntime()
    const page = startPage({ modules: [], state: {}, send: (message) => sent.push(message) })
    const info = vi.spyOn(core.console, "info").mockImplementation(() => {})
    const prompt = vi.spyOn(core, "prompt").mockResolvedValue("Bob")
    try {
      // with no Spell UI, as under node:  confirm says yes, as a program running here would
      page.receive({ ui: "confirm", args: ["Deal again?", "Deal", "Not now"], asks: 1 })
      page.receive({ ui: "prompt", args: ["Your name?", "Ann"], asks: 2 })
      page.receive({ ui: "alert", args: ["You won!", "New game"], asks: 3 })
      await new Promise((resolve) => setTimeout(resolve, 0))
      expect(prompt).toHaveBeenCalledWith("Your name?", "Ann")
      expect(sent).toEqual([
        { answer: 1, value: true },
        { answer: 2, value: "Bob" },
        { answer: 3, value: null }
      ])
      expect(info.mock.calls.map(([line]) => line)).toEqual(["Deal again? (yes)", "You won!"])
    } finally {
      info.mockRestore()
      prompt.mockRestore()
      core.remote = undefined
    }
  })

  test("show / hide by name:  the page shows what it drew, then answers (epic `language` P61)", async () => {
    const sent: PageMessage[] = []
    core.resetRuntime()
    const page = startPage({ modules: [], state: {}, send: (message) => sent.push(message) })
    const show = vi.spyOn(core, "showDrawn").mockImplementation(() => {})
    const hide = vi.spyOn(core, "hideDrawn").mockImplementation(() => {})
    try {
      page.receive({ ui: "showDrawn", args: ["you won"], asks: 1 })
      page.receive({ ui: "hideDrawn", args: ["you won"], asks: 2 })
      await new Promise((resolve) => setTimeout(resolve, 0))
      expect(show).toHaveBeenCalledWith("you won")
      expect(hide).toHaveBeenCalledWith("you won")
      expect(sent).toEqual([
        { answer: 1, value: null },
        { answer: 2, value: null }
      ])
    } finally {
      show.mockRestore()
      hide.mockRestore()
      core.remote = undefined
    }
  })

  test("their frames, in the console:  the question, by its words and number;  the answer", () => {
    expect(frameSummary({ ui: "confirm", args: ["Deal again?"], asks: 3 })).toBe('confirm "Deal again?" (#3)')
    expect(frameSummary({ answer: 3, value: true })).toBe("answer #3:  true")
  })
})
