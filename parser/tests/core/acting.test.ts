import { beforeEach, describe, expect, test, vi } from "vite-plus/test"

import { App, core, List, View } from "spell/parser/core"
import { shortcutMatches } from "spell/parser/core/acting"

/**
 * Running actions (`acting.ts`, epic `elemental-spell` P10):  the one way every key, click and menu item runs one,
 * shortcuts up the focus chain, menus of actions, and the app's own undo and redo.
 * - The classes are what spell compiles a small card game to:  each action described after its class
 *   (`- to turn it over:` with `- shortcut meta+T`, `- enabled when ...`, `- undone as "Turn Card"`),
 *   the game's menu as `- its "game menu" is a menu of "deal", "-", "undo" and "redo"`, its menu bar as
 *   `- its menu bar is "game menu"`.
 */

/** `a card is a view`:  which way up it is. */
class Card extends View {
  static {
    this.declareProp("faceUp", { type: "choice" })
  }
  get faceUp(): boolean {
    return this.getProp("faceUp")
  }
  set faceUp(faceUp: boolean) {
    this.setProp("faceUp", faceUp)
  }
  /** `- to turn it over:` */
  turnOver(): void {
    this.faceUp = !this.faceUp
  }
  /** `- enabled when it is face down` */
  get turnOverIsEnabled(): boolean {
    return !this.faceUp
  }
  /** `- selected when it is face up` */
  get turnOverIsSelected(): boolean {
    return this.faceUp
  }
}
core.describeAction(Card, "turnOver", {
  title: "turn it over",
  shortcuts: ["meta+T"],
  enabledWhen: "turnOverIsEnabled",
  selectedWhen: "turnOverIsSelected",
  undoneAs: "Turn Card"
})

/** `a pile is a viewable list of cards`. */
class Pile extends List<Card> {}

/** `a game is an app`, with a deal that turns every card face down, and its menu. */
class Game extends App {
  static menuBar = "game menu"
  pile = new Pile()
  deal(): void {
    for (const card of this.pile.items) card.faceUp = false
  }
}
core.describeAction(Game, "deal", { title: "deal", shortcuts: ["meta+D"], undoneAs: "Deal" })
core.describeMenu(Game, "gameMenu", { items: ["deal", "-", "undo", "redo"] })

beforeEach(() => {
  core.resetRuntime()
})

/** A game of two cards, face up, in its pile:  a card's chain goes card, pile, app. */
function newGame(): { game: Game; cards: Card[] } {
  const game = new Game()
  const cards = [new Card({ faceUp: true }), new Card({ faceUp: true })]
  game.pile.add(...cards)
  return { game, cards }
}

describe("core.runAction()", () => {
  test("runs an enabled action as one undo step, and tells whoever listens", () => {
    const { game, cards } = newGame()
    cards[0]!.faceUp = false
    const heard = vi.fn()
    const stop = core.onActionRun(heard)
    expect(core.runAction(cards[0]!, "turnOver", "click")).toBe(true)
    expect(cards[0]!.faceUp).toBe(true)
    expect(heard).toHaveBeenCalledWith({
      thing: cards[0],
      name: "turnOver",
      title: "turn it over",
      way: "click",
      signal: expect.any(AbortSignal)
    })
    // `undone as "Turn Card"`:  one step, named so (C11)
    expect(game.undoTitle).toBe("Undo Turn Card")
    expect(core.runAction(game, "undo", "menu")).toBe(true)
    expect(cards[0]!.faceUp).toBe(false)
    stop()
  })

  test("runs nothing while it isn't enabled, nor for a method its thing hasn't", () => {
    const { cards } = newGame()
    const heard = vi.fn()
    const stop = core.onActionRun(heard)
    expect(core.runAction(cards[0]!, "turnOver")).toBe(false)
    expect(cards[0]!.faceUp).toBe(true)
    expect(core.runAction(cards[0]!, "wink")).toBe(false)
    expect(heard).not.toHaveBeenCalled()
    stop()
  })
})

describe("core.runShortcut()", () => {
  test("the first enabled action the key is bound to, from the focused thing up its chain to the app", () => {
    const { game, cards } = newGame()
    // the card has no ⌘D:  its app's deal takes it
    expect(core.runShortcut(cards[0], { key: "d", metaKey: true }, true)).toBe(true)
    expect(cards.map((card) => card.faceUp)).toEqual([false, false])
    // the card's own ⌘T, now it's face down
    expect(core.runShortcut(cards[0], { key: "T", metaKey: true }, true)).toBe(true)
    expect(cards[0]!.faceUp).toBe(true)
    // face up, its ⌘T isn't enabled:  the key goes on, and nothing else takes it
    expect(core.runShortcut(cards[0], { key: "t", metaKey: true }, true)).toBe(false)
    // the app's own undo, ⌘Z:  the card's turn, then the deal
    expect(core.runShortcut(undefined, { key: "z", metaKey: true }, true)).toBe(true)
    expect(cards[0]!.faceUp).toBe(false)
    expect(game.redoTitle).toBe("Redo Turn Card")
  })

  test("meta is command on a Mac, control elsewhere;  every modifier named must be down, and no other", () => {
    expect(shortcutMatches("meta+T", { key: "t", metaKey: true }, true)).toBe(true)
    expect(shortcutMatches("meta+T", { key: "t", ctrlKey: true }, false)).toBe(true)
    expect(shortcutMatches("meta+T", { key: "t", ctrlKey: true }, true)).toBe(false)
    expect(shortcutMatches("meta+shift+Z", { key: "Z", metaKey: true, shiftKey: true }, true)).toBe(true)
    expect(shortcutMatches("meta+Z", { key: "z", metaKey: true, shiftKey: true }, true)).toBe(false)
    expect(shortcutMatches("space", { key: " " })).toBe(true)
    expect(shortcutMatches("option+F2", { key: "F2", altKey: true })).toBe(true)
  })
})

describe("core.menuOf()", () => {
  test("a menu found by any spelling of its name, on the thing or up its chain, its items live", () => {
    const { game, cards } = newGame()
    // a card's context menu may be its game's (Q41)
    const items = core.menuOf(cards[0], "game menu")!
    expect(items.map((item) => (item.kind === "action" ? item.title : "-"))).toEqual(["deal", "-", "Undo", "Redo"])
    const [deal, , undo] = items
    if (deal?.kind !== "action" || undo?.kind !== "action") throw new Error("expected actions")
    expect(deal.thing).toBe(game)
    expect(deal.shortcut).toBe("meta+D")
    expect(undo.isEnabled).toBe(false)
    expect(deal.run()).toBe(true)
    // live:  the same item now says what it would undo
    expect(undo.isEnabled).toBe(true)
    expect(undo.title).toBe("Undo Deal")
    expect(core.menuOf(game, "GameMenu")).toHaveLength(4)
    expect(core.menuOf(cards[0], "card menu")).toBeUndefined()
  })

  test("the app's menu bar:  the menu its class names", () => {
    const { game } = newGame()
    expect(core.menuBarOf(game)?.map((item) => item.kind)).toEqual(["action", "separator", "action", "action"])
    expect(core.menuBarOf(new App())).toBeUndefined()
  })

  test("an item naming no action of its thing is left out, with a warning", () => {
    class Table extends App {}
    core.describeMenu(Table, "tableMenu", { items: ["wipe", "undo"] })
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    expect(core.menuOf(new Table(), "table menu")).toHaveLength(1)
    expect(warn).toHaveBeenCalledWith("menu:  Table has no action `wipe`")
    warn.mockRestore()
  })
})

describe("an action's selected state", () => {
  test("its `selected when`, live;  none:  never selected", () => {
    const { game, cards } = newGame()
    expect(core.isActionSelected(cards[0]!, "turnOver")).toBe(true)
    cards[0]!.faceUp = false
    expect(core.isActionSelected(cards[0]!, "turnOver")).toBe(false)
    expect(core.isActionSelected(game, "deal")).toBe(false)
  })
})

describe("at the same time", () => {
  /** A step that takes `milliseconds`, noting when it starts and ends. */
  const step = (notes: string[], name: string, milliseconds: number) => async () => {
    notes.push(`${name} starts`)
    await new Promise((resolve) => setTimeout(resolve, milliseconds))
    notes.push(`${name} ends`)
  }

  test("`together()` overlaps its lines, and ends when they all have", async () => {
    const notes: string[] = []
    await core.together(step(notes, "a", 20), step(notes, "b", 5))
    expect(notes).toEqual(["a starts", "b starts", "b ends", "a ends"])
  })

  test("`eachTogether()` overlaps its items", async () => {
    const notes: string[] = []
    await core.eachTogether([20, 5], (milliseconds: number) => step(notes, String(milliseconds), milliseconds)())
    expect(notes).toEqual(["20 starts", "5 starts", "5 ends", "20 ends"])
  })

  test("a failure doesn't stop the others, and comes out once they've all ended", async () => {
    const notes: string[] = []
    const fails = async () => {
      throw new Error("no")
    }
    await expect(core.together(fails, step(notes, "b", 5))).rejects.toThrow("no")
    expect(notes).toEqual(["b starts", "b ends"])
  })

  test("`meanwhile()` carries on, and says a failure on the console", async () => {
    const notes: string[] = []
    const error = vi.spyOn(core.console, "error").mockImplementation(() => {})
    void core.meanwhile(step(notes, "a", 5))
    expect(notes).toEqual(["a starts"])
    await core.meanwhile(async () => {
      throw new Error("no")
    })
    expect(error).toHaveBeenCalledOnce()
    error.mockRestore()
  })
})
