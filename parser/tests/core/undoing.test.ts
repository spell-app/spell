import { readFileSync } from "fs"
import { parseHTML } from "linkedom"
import { resolve } from "path"
import { afterEach, beforeEach, describe, expect, test, vi } from "vite-plus/test"

import { observe } from "spell/util"
import { App, core, List, Thing } from "spell/parser/core"
import { listenForUndoKeys } from "spell/parser/core/ui"

/**
 * Undo and redo in a running program (`undoing.ts`):  a card game, written the way compiled spell writes it,
 * its actions declared by hand (the compiler writes no `declareAction()` yet).
 * - `undoing.expected.json5`, beside this file, holds a game's moves and what each leaves:
 *   Python's core plays the same game, and reads the same file (`test_undoing.py`), so the two cores agree.
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
  test("an action declared undoable takes as many arguments as it did:  what reads its length still knows", () => {
    // the editor's Code card gives a run button only to an action that takes nothing (epic `editor` I62)
    expect(Game.prototype.deal.length).toBe(1)
    expect(Card.prototype.turnOver.length).toBe(0)
  })

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
    // three cards' faceUp and last pile, the moves, the stock and the waste
    expect(core.RUNTIME.history.steps[0].records).toHaveLength(9)
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
// ## The moves both cores play
////////////////

/** One move of `undoing.expected.json5`, and what it leaves. */
type ExpectedMove = {
  do: "turn" | "deal" | "undo" | "redo" | "write"
  card?: string
  count?: number
  after: Record<string, unknown>
}

const EXPECTED = JSON.parse(readFileSync(resolve(import.meta.dirname, "undoing.expected.json5"), "utf8")) as {
  moves: ExpectedMove[]
}

describe("the moves both cores play (`undoing.expected.json5`)", () => {
  test("each leaves the steps, the Edit menu and the cards as the file says", async () => {
    const byRank = (rank: string | undefined) => cards.find((card) => card.rank === rank)!
    for (const move of EXPECTED.moves) {
      let returned: boolean | undefined
      if (move.do === "turn") byRank(move.card).turnOver()
      else if (move.do === "deal") await game.deal(move.count!)
      else if (move.do === "undo") returned = game.undo()
      else if (move.do === "redo") returned = game.redo()
      else /* if (move.do === "write") */ byRank(move.card).faceUp = !byRank(move.card).faceUp
      const after = {
        ...(returned === undefined ? {} : { returned }),
        steps: core.RUNTIME.history.steps.map((step) => step.title),
        canUndo: game.canUndo,
        canRedo: game.canRedo,
        undoTitle: game.undoTitle,
        redoTitle: game.redoTitle,
        stock: game.stock.items.map((card) => card.rank),
        waste: game.waste.items.map((card) => card.rank),
        faceUp: cards.map((card) => card.faceUp),
        moves: game.moves
      }
      expect(after, `after ${move.do} ${move.card ?? move.count ?? ""}`).toEqual(move.after)
    }
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

  test("described so, as compiled spell's `can't be undone` writes it (epic `language` P55, Q60)", () => {
    class Peeker extends Card {
      peek(): void {
        this.faceUp = true
      }
    }
    core.describeAction(Peeker, "peek", { title: "Peek", cantBeUndone: "keeps history" })
    cards[0].turnOver()
    const peeker = new Peeker({ rank: "joker" })
    peeker.peek()
    expect(core.RUNTIME.history.steps).toHaveLength(1)
    game.undo()
    expect([cards[0].faceUp, peeker.faceUp]).toEqual([false, true])
  })

  test("a change recorded by itself (a saved thing added) is left out too", () => {
    class Adder extends Card {
      add(): void {
        core.RUNTIME.history.record({ undo() {}, redo() {} }, { title: "Add" })
      }
    }
    core.describeAction(Adder, "add", { title: "Add", cantBeUndone: "keeps history" })
    new Adder({ rank: "joker" }).add()
    expect(core.RUNTIME.history.steps).toHaveLength(0)
  })

  test("a step of its own inside one is still a step:  Recipe Box's Save, saving a draft (epic `language` I88)", () => {
    class Saver extends Card {
      save(): void {
        core.RUNTIME.history.separateStep("Edit", () => (this.rank = "king"))
        this.picked = true
        this.faceUp = true
      }
    }
    core.describeAction(Saver, "save", { title: "Save", cantBeUndone: "keeps history" })
    const saver = new Saver({ rank: "joker" })
    saver.save()
    expect(core.RUNTIME.history.steps.map((step) => step.title)).toEqual(["Edit"])
    game.undo()
    expect([saver.rank, saver.faceUp]).toEqual(["joker", true])
  })

  test("what a creation hook changes, made while no action runs (the program's opening), is no step (I88)", async () => {
    class Dealer extends Card {
      override async create(): Promise<void> {
        this.faceUp = true
        await Promise.resolve()
        core.RUNTIME.history.record({ undo() {}, redo() {} }, { title: "Add" })
      }
    }
    new Dealer({ rank: "joker" })
    await Promise.resolve()
    await Promise.resolve()
    expect(core.RUNTIME.history.steps).toHaveLength(0)
    expect(game.canUndo).toBe(false)
    // made inside an undoable action:  what it records joins that one's step
    class Turner extends Card {
      async make(): Promise<void> {
        this.turnOver()
        new Dealer({ rank: "queen" })
        await Promise.resolve()
        await Promise.resolve()
      }
    }
    core.describeAction(Turner, "make", { title: "Make", undoneAs: "Make" })
    await new Turner({ rank: "jack" }).make()
    expect(core.RUNTIME.history.steps.map((step) => [step.title, step.records.length])).toEqual([["Make", 2]])
  })

  test('"clears history":  every step is forgotten once it\'s done, e.g. a new game', async () => {
    await game.deal(2)
    game.newGame()
    expect([game.canUndo, game.canRedo]).toEqual([false, false])
    expect(game.stock.items).toHaveLength(3)
  })
})

describe("top-level actions (`core.asAction()`, epic `language` J149)", () => {
  /** `to turn every card over` outside any type, as compiled spell writes it. */
  function turnEveryCardOver(): void {
    return core.asAction({ undoneAs: "Turn Every Card Over" }, () => {
      for (const card of cards) card.turnOver()
    })
  }

  test("one is ONE step, what it calls included;  undo puts every card back", () => {
    turnEveryCardOver()
    expect(core.RUNTIME.history.steps.map((step) => step.title)).toEqual(["Turn Every Card Over"])
    game.undo()
    expect(cards.map((card) => card.faceUp)).toEqual([false, false, false])
  })

  test("one giving back a value is an action too, and called by another, joins its step", () => {
    const countTheCards = () =>
      core.asAction({ undoneAs: "Count The Cards" }, () => {
        cards[0].turnOver()
        return cards.length
      })
    expect(countTheCards()).toBe(3)
    expect(core.RUNTIME.history.steps.map((step) => step.title)).toEqual(["Count The Cards"])
    core.asAction({ undoneAs: "Turn And Count" }, () => {
      cards[1].turnOver()
      return countTheCards()
    })
    expect(core.RUNTIME.history.steps.map((step) => step.title)).toEqual(["Count The Cards", "Turn And Count"])
  })

  test("one that waits is ONE step, however long it waits", async () => {
    await core.asAction({ undoneAs: "Deal Twice" }, async () => {
      await game.deal(1)
      await game.deal(1)
    })
    expect(core.RUNTIME.history.steps.map((step) => step.title)).toEqual(["Deal Twice"])
  })

  test("`can't be undone`:  what it changes is left out, and the steps before it stay", () => {
    cards[0].turnOver()
    core.asAction({ cantBeUndone: "keeps history" }, () => (cards[1].faceUp = true))
    expect(game.undoTitle).toBe("Undo Turn Card")
  })

  test("no program running:  it just runs", () => {
    core.clearRuntime()
    expect(core.asAction({ undoneAs: "Two" }, () => 2)).toBe(2)
  })
})

describe("the program's opening (`core.runOpening()`, epic `language` J180)", () => {
  test("an action its top level calls, not waiting, is no step;  once it's open, one is", async () => {
    const opened = core.runOpening(async () => {
      turnEveryCardOverAtTheTop()
      await Promise.resolve()
      cards[1].turnOver()
      return "opened"
    })
    await expect(opened).resolves.toBe("opened")
    expect(game.canUndo).toBe(false)
    // every card turned face up, then the second turned back over, after a wait:  all of it the opening's
    expect(cards.map((card) => card.faceUp)).toEqual([true, false, true])
    cards[0].turnOver()
    expect(core.RUNTIME.history.steps.map((step) => step.title)).toEqual(["Turn Card"])
  })

  test("a creation hook that waits past the opening is still no step:  Recipe Box's recipes to start from (epic `epic-engine` I325)", async () => {
    class Box extends Card {
      override async create(): Promise<void> {
        await new Promise((resolve) => setTimeout(resolve, 0))
        this.turnOver()
      }
    }
    let box: Box | undefined
    core.runOpening(() => (box = new Box({ rank: "joker" })))
    await new Promise((resolve) => setTimeout(resolve, 5))
    expect(box!.faceUp).toBe(true)
    expect(game.canUndo).toBe(false)
  })

  test("no program running:  it just runs", () => {
    core.clearRuntime()
    expect(core.runOpening(() => 2)).toBe(2)
  })

  /** `to turn every card over` outside any type, called at the program's top level. */
  function turnEveryCardOverAtTheTop(): void {
    return core.asAction({ undoneAs: "Turn Every Card Over" }, () => {
      for (const card of cards) card.faceUp = true
    })
  }
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

describe("actions that cancel (`cancel`, epic `language` P56)", () => {
  /**
   * `to put a card on a pile`, as compiled spell writes it:  `cancel if ...`, then the move;
   * a hook counting the move, `after putting a card on a pile`, in another file.
   */
  class Move extends Thing {
    putOnPile(card: Card, pile: Pile, refused?: "before" | "after" | "in a hook") {
      if (refused === "before") core.cancel()
      pile.add(card)
      card.turnOver()
      if (refused === "after") core.cancel()
    }
    afterPutOnPile(card: Card, _pile: Pile, refused?: string) {
      game.moves++
      if (refused === "in a hook") core.cancel()
      card.picked = true
    }
    /** `to play a card`:  it gives back what the move answered */
    play(card: Card): unknown {
      game.moves += 100
      return this.putOnPile(card, game.waste)
    }
    static {
      core.describeAction(this, "putOnPile", { title: "Put", undoneAs: "Move Card", cancels: true })
      core.describeAction(this, "play", { title: "Play", undoneAs: "Play Card" })
      core.addAfterHook(this, "putOnPile", { hook: "afterPutOnPile" })
    }
  }

  test("done:  it answers yes, its hook runs after it, and it's ONE step with its hook's changes", () => {
    const move = new Move()
    expect(move.putOnPile(cards[2]!, game.waste)).toBe(true)
    expect(game.waste.items).toEqual([cards[2]])
    expect(game.moves).toBe(1)
    expect(core.RUNTIME.history.steps.map((step) => step.title)).toEqual(["Move Card"])
    game.undo()
    expect([game.waste.items.length, cards[2]!.faceUp, game.moves]).toEqual([0, false, 0])
  })

  test("called off after its changes:  every one put back, no step, no hook, and it answers no", () => {
    const move = new Move()
    expect(move.putOnPile(cards[2]!, game.waste, "after")).toBe(false)
    expect(game.stock.items).toEqual(cards)
    expect([game.waste.items.length, cards[2]!.faceUp, game.moves]).toEqual([0, false, 0])
    expect(game.canUndo).toBe(false)
  })

  test("called off in its hook:  the action's changes are put back too", () => {
    const move = new Move()
    expect(move.putOnPile(cards[2]!, game.waste, "in a hook")).toBe(false)
    expect([game.waste.items.length, cards[2]!.faceUp, game.moves, cards[2]!.picked]).toEqual([0, false, 0, false])
    expect(game.canUndo).toBe(false)
  })

  test("called off inside another action:  only its own changes go back, and the caller goes on with no", () => {
    const move = new Move()
    class Refusing extends Move {
      override putOnPile(card: Card, pile: Pile) {
        return super.putOnPile(card, pile, "after")
      }
    }
    expect(new Refusing().play(cards[2]!)).toBe(false)
    expect([game.waste.items.length, cards[2]!.faceUp, game.moves]).toEqual([0, false, 100])
    expect(core.RUNTIME.history.steps.map((step) => step.title)).toEqual(["Play Card"])
    game.undo()
    expect(game.moves).toBe(0)
    expect(move.play(cards[1]!)).toBe(true)
  })

  test("one that waits:  called off after a wait, its changes before the wait go back too", async () => {
    class Dealer extends Thing {
      async deal() {
        game.waste.add(cards[2]!)
        await Promise.resolve()
        cards[2]!.turnOver()
        core.cancel()
      }
      static {
        core.describeAction(this, "deal", { title: "Deal", undoneAs: "Deal", cancels: true })
      }
    }
    expect(await new Dealer().deal()).toBe(false)
    expect([game.waste.items.length, cards[2]!.faceUp, game.canUndo]).toEqual([0, false, false])
  })

  test("a top-level one (`core.asAction()`):  the same", () => {
    const refused = core.asAction({ undoneAs: "Turn All", cancels: true }, () => {
      for (const card of cards) card.turnOver()
      core.cancel()
    })
    expect([refused, cards.map((card) => card.faceUp), game.canUndo]).toEqual([false, [false, false, false], false])
  })

  test("no program running:  called off, its changes go back all the same", () => {
    core.clearRuntime()
    const card = new Card({ rank: "ace" })
    class Turner extends Thing {
      turn() {
        card.turnOver()
        core.cancel()
      }
      static {
        core.describeAction(this, "turn", { title: "Turn", undoneAs: "Turn", cancels: true })
      }
    }
    expect(new Turner().turn()).toBe(false)
    expect(card.faceUp).toBe(false)
  })
})

describe("a thing's last list (`List.lastOwnerOf()`, epic `language` P56)", () => {
  test("nothing before its first move;  then the list it left, kept until its next", () => {
    const fresh = new Card({ rank: "king" })
    const pile = new Pile()
    pile.add(fresh)
    expect(Pile.lastOwnerOf(fresh)).toBeUndefined()
    game.waste.add(fresh)
    expect(Pile.lastOwnerOf(fresh)).toBe(pile)
    expect(Pile.lastOwnerOf(cards[0])).toBeUndefined()
  })

  test("part of the move's undo step:  undo and redo put it back", () => {
    class Mover extends Thing {
      move(card: Card) {
        game.waste.add(card)
      }
      static {
        core.describeAction(this, "move", { title: "Move", undoneAs: "Move" })
      }
    }
    const fresh = new Card({ rank: "king" })
    const pile = new Pile()
    pile.add(fresh)
    new Mover().move(fresh)
    expect(Pile.lastOwnerOf(fresh)).toBe(pile)
    game.undo()
    expect([Pile.ownerOf(fresh), Pile.lastOwnerOf(fresh)]).toEqual([pile, undefined])
    game.redo()
    expect([Pile.ownerOf(fresh), Pile.lastOwnerOf(fresh)]).toEqual([game.waste, pile])
  })

  test("a move called off puts it back too", () => {
    class Mover extends Thing {
      move(card: Card) {
        game.waste.add(card)
        core.cancel()
      }
      static {
        core.describeAction(this, "move", { title: "Move", undoneAs: "Move", cancels: true })
      }
    }
    new Mover().move(cards[0])
    expect([Pile.ownerOf(cards[0]), Pile.lastOwnerOf(cards[0]), game.canUndo]).toEqual([game.stock, undefined, false])
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

    // while an action runs, undo is refused, as from a menu:  the key is taken, and nothing happens (epic `language`, J2)
    let finish = () => {}
    core.runPressed(cards[0], "click", () => new Promise<void>((resolve) => (finish = resolve)))
    expect(undoKey.handler(pressedIn(app))).toBe(true)
    expect(cards[0].faceUp).toBe(true)
    finish()
    await new Promise((resolve) => setTimeout(resolve))
    expect(undoKey.handler(pressedIn(app))).toBe(true)
    expect(cards[0].faceUp).toBe(false)

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
