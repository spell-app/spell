import { parseHTML } from "linkedom"
import { afterEach, beforeEach, describe, expect, test, vi } from "vite-plus/test"

import { observe } from "spell/util"
import { App, core, List, Thing } from "spell/parser/core"
import { listenForUndoKeys } from "spell/parser/core/ui"

/**
 * Undo and redo in a running program (`undoing.ts`):  a card game, written the way compiled spell writes it,
 * its actions declared by hand (the compiler writes no `declareAction()` yet).
 */

////////////////
// ## The game
////////////////

/** `a card is a thing`:  its rank, which way up it is, and whether it's picked (no undo step). */
class Card extends Thing {
  static {
    this.declareProp("rank", { type: "text" })
    this.declareProp("faceUp", { type: "choice" })
    this.declareProp("picked", { type: "choice", undoable: false })
  }
  get rank(): string {
    return this.getProp("rank")
  }
  set rank(rank: string) {
    this.setProp("rank", rank)
  }
  get faceUp(): boolean {
    return this.getProp("faceUp")
  }
  set faceUp(faceUp: boolean) {
    this.setProp("faceUp", faceUp)
  }
  get picked(): boolean {
    return this.getProp("picked")
  }
  set picked(picked: boolean) {
    this.setProp("picked", picked)
  }

  turnOver(): void {
    this.faceUp = !this.faceUp
  }

  pickAndTurn(): void {
    this.picked = true
    this.turnOver()
  }

  static {
    this.declareAction("turnOver", { undoneAs: "Turn Card" })
    this.declareAction("pickAndTurn", { undoneAs: "Pick Card" })
  }
}

/** `a card belongs to one pile`. */
class Pile extends List<Card> {
  static exclusive = true
}

/** `a game is an app`, with a stock, a waste and a count of moves. */
class Game extends App {
  /** How many times `deal()` ran:  outside the game, so no prop. */
  static deals = 0

  static {
    this.declareProp("stock", { type: "Pile", init: () => new Pile() })
    this.declareProp("waste", { type: "Pile", init: () => new Pile() })
    this.declareProp("moves", { type: "number" })
  }
  get stock(): Pile {
    return this.getProp("stock")
  }
  get waste(): Pile {
    return this.getProp("waste")
  }
  get moves(): number {
    return this.getProp("moves")
  }
  set moves(moves: number) {
    this.setProp("moves", moves)
  }

  /** Turn `count` cards from the stock onto the waste, one at a time, waiting between them. */
  async deal(count: number): Promise<void> {
    Game.deals++
    for (let dealt = 0; dealt < count; dealt++) {
      await Promise.resolve()
      const card = this.stock.items.at(-1)!
      this.waste.add(card)
      card.turnOver()
      this.moves++
    }
  }

  /** Count a hint as a move:  it can't be undone, and leaves the history as it was. */
  hint(): void {
    this.moves += 10
  }

  /** Every card back to the stock, face down:  it can't be undone, and forgets every step. */
  newGame(): void {
    for (const card of [...this.waste.items]) {
      this.stock.add(card)
      card.faceUp = false
    }
    this.moves = 0
  }

  static {
    this.declareAction("deal", { undoneAs: "Deal" })
    this.declareAction("hint", { cantBeUndone: "keeps history" })
    this.declareAction("newGame", { cantBeUndone: "clears history" })
  }
}

/** Where Spell UI keeps its runtime on a page:  its `RUNTIME_KEY`. */
const UI_RUNTIME_KEY = Symbol.for("spell-ui:runtime")

let game: Game
let cards: Card[]

beforeEach(() => {
  core.resetRuntime()
  Game.deals = 0
  game = new Game()
  cards = ["ace", "two", "three"].map((rank) => new Card({ rank }))
  game.stock.items = [...cards]
})

afterEach(() => {
  vi.unstubAllGlobals()
  delete (globalThis as Record<symbol, unknown>)[UI_RUNTIME_KEY]
  core.useMessages(undefined)
})

////////////////
// ## Undo and redo
////////////////

describe("undoable actions", () => {
  test("an action declared undoable is one step:  undo puts it back, redo makes it again", () => {
    const [ace] = cards
    ace.turnOver()
    expect([game.canUndo, game.undoTitle]).toEqual([true, "Undo Turn Card"])
    expect(game.undo()).toBe(true)
    expect(ace.faceUp).toBe(false)
    expect([game.canRedo, game.redoTitle, game.undoTitle]).toEqual([true, "Redo Turn Card", "Undo"])
    expect(game.redo()).toBe(true)
    expect(ace.faceUp).toBe(true)
    expect(game.redo()).toBe(false)
  })

  test("an action that waits is ONE step, what it calls included;  undo puts every card back, redo is instant", async () => {
    await game.deal(3)
    expect(core.RUNTIME.history.steps.map((step) => step.title)).toEqual(["Deal"])
    expect([game.waste.items.length, game.moves]).toEqual([3, 3])
    game.undo()
    expect(game.stock.items).toEqual(cards)
    expect(game.waste.items).toEqual([])
    expect(cards.map((card) => card.faceUp)).toEqual([false, false, false])
    expect(game.moves).toBe(0)
    expect(cards.every((card) => Pile.ownerOf(card) === game.stock)).toBe(true)
    game.redo()
    expect(game.waste.items.map((card) => card.rank)).toEqual(["three", "two", "ace"])
    expect([game.moves, Game.deals]).toEqual([3, 1])
    expect(cards.every((card) => Pile.ownerOf(card) === game.waste)).toBe(true)
  })

  test("nothing undoes or redoes while an undoable action still runs:  a deal that waits finishes first", async () => {
    cards[0].turnOver()
    const dealing = game.deal(1)
    expect(game.undo()).toBe(false)
    await dealing
    expect(core.RUNTIME.history.steps.map((step) => step.title)).toEqual(["Turn Card", "Deal"])
  })

  test("a step keeps one record for each prop and each list it changed, however often it changed them", async () => {
    await game.deal(3)
    // three cards' faceUp, the moves, the stock and the waste
    expect(core.RUNTIME.history.steps[0].records).toHaveLength(6)
  })

  test("only an action declared undoable is recorded:  a plain write is no step", () => {
    cards[0].faceUp = true
    game.stock.items = []
    expect(game.canUndo).toBe(false)
  })

  test("a prop declared `undoable: false` is left out of the step", () => {
    const [ace] = cards
    ace.pickAndTurn()
    game.undo()
    expect([ace.faceUp, ace.picked]).toEqual([false, true])
  })

  test("its titles follow the history, so a menu drawn from them redraws by itself", () => {
    const shown: string[] = []
    const stop = observe(() => shown.push(game.undoTitle))
    cards[0].turnOver()
    expect(shown.at(-1)).toBe("Undo Turn Card")
    stop()
  })

  test("titles in the program's language:  the core's messages", () => {
    core.useMessages({ "undo-step": "Deshacer {step}", redo: "Rehacer" })
    cards[0].turnOver()
    expect([game.undoTitle, game.redoTitle]).toEqual(["Deshacer Turn Card", "Rehacer"])
  })
})

////////////////
// ## Left out, and forgotten
////////////////

describe("actions that can't be undone", () => {
  test('"keeps history":  what it changes is left out, and the steps before it stay', () => {
    cards[0].turnOver()
    game.hint()
    expect(core.RUNTIME.history.steps).toHaveLength(1)
    game.undo()
    expect([cards[0].faceUp, game.moves]).toEqual([false, 10])
  })

  test('"clears history":  every step is forgotten once it\'s done, e.g. a new game', async () => {
    await game.deal(2)
    game.newGame()
    expect([game.canUndo, game.canRedo]).toEqual([false, false])
    expect(game.stock.items).toHaveLength(3)
  })
})

describe("the history's life", () => {
  test("a new run starts with none", () => {
    cards[0].turnOver()
    core.resetRuntime()
    expect(core.RUNTIME.history.canUndo).toBe(false)
  })

  test("loading saved state forgets it:  the person's document changed", () => {
    cards[0].turnOver()
    core.fromJSON({ $type: "Card", rank: "king" })
    expect(game.canUndo).toBe(false)
  })

  test("no program running:  an action just runs", () => {
    core.clearRuntime()
    const card = new Card({ rank: "ace" })
    card.turnOver()
    expect(card.faceUp).toBe(true)
  })
})

describe("declareAction()", () => {
  test("throws for a method its class doesn't have, or options that say neither kind, both, or a mode it hasn't", () => {
    class Joker extends Card {}
    expect(() => Joker.declareAction("wink", { undoneAs: "Wink" })).toThrow(/`wink` isn't one of its methods/)
    expect(() => Joker.declareAction("turnOver", {})).toThrow(/not neither/)
    expect(() => Joker.declareAction("turnOver", { undoneAs: "Turn", cantBeUndone: "keeps history" })).toThrow(
      /not both/
    )
    expect(() => Joker.declareAction("turnOver", { cantBeUndone: "forgets" as never })).toThrow(/one of keeps/)
  })
})

////////////////
// ## Keys
////////////////

describe("⌘Z and ⇧⌘Z", () => {
  test("undo and redo while the app has the focus, or nothing does;  a text field and the page around it keep theirs", async () => {
    const page = parseHTML("<!doctype html><html><head></head><body><div id=app><input></div><nav></nav></body></html>")
    for (const name of ["HTMLElement", "HTMLInputElement", "HTMLTextAreaElement", "HTMLSelectElement"]) {
      vi.stubGlobal(name, page[name as keyof typeof page])
    }
    const keys = fakeKeyboard()
    const app = page.document.getElementById("app") as HTMLElement
    const stop = listenForUndoKeys(app)
    await Promise.resolve()
    const [undoKey, redoKey] = keys.registered
    expect([undoKey.chord, redoKey.chord]).toEqual(["Mod+Z", "Mod+Shift+Z"])

    cards[0].turnOver()
    expect(undoKey.handler(pressedIn(app.querySelector("input")!))).toBe(false)
    expect(undoKey.handler(pressedIn(page.document.querySelector("nav")!))).toBe(false)
    expect(undoKey.handler(pressedIn(app))).toBe(true)
    expect(cards[0].faceUp).toBe(false)
    expect(redoKey.handler(pressedIn(page.document.body))).toBe(true)
    expect(cards[0].faceUp).toBe(true)
    // nothing left to redo:  the key passes on
    expect(redoKey.handler(pressedIn(app))).toBe(false)

    stop()
    expect(keys.stopped).toBe(2)
  })
})

////////////////
// ## Helpers
////////////////

/** A key pressed with the focus on `target`:  what the handler reads of it, its path up to the page. */
function pressedIn(target: Element): KeyboardEvent {
  const path: EventTarget[] = []
  for (let node: Element | null = target; node; node = node.parentElement) path.push(node)
  return { composedPath: () => path } as unknown as KeyboardEvent
}

/** A page's Spell UI, as far as the undo keys use it:  its keyboard registry, keeping what was registered. */
function fakeKeyboard() {
  const keys = {
    registered: [] as Array<{ chord: string; handler: (event: KeyboardEvent) => boolean }>,
    stopped: 0
  }
  const runtime = {
    load: async () => runtime,
    keyboard: {
      register(registration: (typeof keys.registered)[number]) {
        keys.registered.push(registration)
        return () => keys.stopped++
      }
    }
  }
  ;(globalThis as Record<symbol, unknown>)[UI_RUNTIME_KEY] = runtime
  return keys
}
