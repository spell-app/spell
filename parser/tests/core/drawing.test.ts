import { parseHTML } from "linkedom"
import { Errored, enableExternalSource, flush } from "solid-js"
import { render } from "@solidjs/web"
import { describe, test, expect, vi, beforeAll, beforeEach, afterEach } from "vite-plus/test"

import { bridgeSolid } from "spell/util"
import { core, App, Thing, List, ViewableList, prop, drawn, h } from "spell-parser/core"
import { isElementThunk, type Drawing } from "spell-parser/core/drawing"

// counts each error boundary drawn:  `drawing.ts` makes one with `createComponent(Errored, ...)`
vi.mock("solid-js", async (importOriginal) => {
  const solid = await importOriginal<typeof import("solid-js")>()
  return { ...solid, Errored: vi.fn(solid.Errored) }
})

/**
 * Each drawn thing in its own error boundary, ONE boundary for both targets:
 * - compiled JavaScript:  `core.drawThing(card)` puts a plain `draw()` in it
 * - compiled TypeScript and hand-written classes:  `@drawn draw()` puts itself in it, so a parent draws a child with
 *   a plain `card.draw()`, and `drawThing()` adds no second boundary
 * - Solid's CLIENT build (`vitest.config.ts`), drawing into a fake page (linkedom).
 */

////////////////
// ## Classes under test
////////////////

/** Card ranks, as compiled TypeScript writes a list:  `as const`, read-only. */
const RANKS = ["ace", 2, 3, "king"] as const

/** A card rank. */
type Rank = (typeof RANKS)[number]

/** How many times each thing's `draw()` ran:  OUTSIDE the thing, so it's no prop. */
const drawCalls = new Map<object, number>()

/** A hand-written card, as `ts/solid` writes one:  `@prop`s, and a `@drawn draw()`. */
class Card extends Thing {
  static Ranks = RANKS
  @prop({ oneOf: RANKS }) accessor rank!: Rank
  @prop({ type: "text", default: "hearts" }) accessor suit!: string
  @prop({ type: "choice", default: false }) accessor isBroken!: boolean

  /** Its index in `Card.Ranks`:  `positionOf()` takes a read-only list. */
  get value() {
    return core.positionOf(Card.Ranks, this.rank)
  }

  @drawn
  draw(): Drawing {
    drawCalls.set(this, (drawCalls.get(this) ?? 0) + 1)
    if (this.isBroken) throw new Error("this card is broken")
    return h("span", { class: "card" }, () => `${this.rank} ${this.suit}`) as unknown as Drawing
  }
}

/** Each node a `PlainCard` drew, as it was made. */
const madeNodes: Element[] = []

/**
 * A card as compiled JavaScript writes it:  a plain `draw()` returning `h()`'s thunk, which `drawThing()` puts in a
 * boundary, and the boundary makes.
 */
class PlainCard extends Card {
  override draw(): Drawing {
    drawCalls.set(this, (drawCalls.get(this) ?? 0) + 1)
    return h("i", { ref: (node: Element) => madeNodes.push(node) }, () => this.suit) as unknown as Drawing
  }
}

/** A pile as compiled JavaScript writes it:  `h()`'s thunk around its cards, `drawItems()`. */
class PlainPile extends List<Card> {
  override draw(): Drawing {
    drawCalls.set(this, (drawCalls.get(this) ?? 0) + 1)
    return h("div", { class: "pile", ref: (node: Element) => madeNodes.push(node) }, () =>
      core.drawItems(this)
    ) as unknown as Drawing
  }
}

/** A pile drawn as a FRAGMENT, as compiled JavaScript writes `<>...</>`:  a list of `h()`'s thunks. */
class PairPile extends List<Card> {
  override draw(): Drawing {
    drawCalls.set(this, (drawCalls.get(this) ?? 0) + 1)
    return [
      h("h3", { ref: (node: Element) => madeNodes.push(node) }, "Pile"),
      h("div", { ref: (node: Element) => madeNodes.push(node) }, () => core.drawItems(this))
    ] as unknown as Drawing
  }
}

/** A card whose drawing throws while `h()` MAKES it, not in `draw()`:  a part of it that can't be drawn. */
class HalfCard extends Card {
  override draw(): Drawing {
    const broken = () => {
      throw new Error("no face")
    }
    return h("div", { class: "half" }, h(broken)) as unknown as Drawing
  }
}

/** A card whose `draw()` returns a live value, not an element:  any function but `h()`'s stays live. */
class LiveCard extends Card {
  override draw(): Drawing {
    drawCalls.set(this, (drawCalls.get(this) ?? 0) + 1)
    return (() => this.suit) as unknown as Drawing
  }
}

/** A pile drawing its cards with a plain call, `card.draw()`, as hand-written code may:  `@drawn`'s own boundary holds. */
class Pile extends List<Card> {
  @drawn
  override draw(): Drawing {
    return h("div", ...this.items.map((card) => () => card.draw())) as unknown as Drawing
  }
}

////////////////
// ## Tests
////////////////

describe("@drawn", () => {
  let page: ReturnType<typeof parseHTML>
  let element: HTMLElement
  let dispose: (() => void) | undefined

  beforeAll(() => {
    page = parseHTML("<!doctype html><html><head></head><body></body></html>")
    for (const name of ["window", "document", "Node", "Element", "HTMLElement", "Event", "CustomEvent"]) {
      vi.stubGlobal(name, page[name as keyof typeof page])
    }
    bridgeSolid({ enableExternalSource, flush })
  })

  beforeEach(() => {
    element = page.document.createElement("div")
    page.document.body.appendChild(element)
    core.appRoot = element
    drawCalls.clear()
    vi.mocked(Errored).mockClear()
    vi.spyOn(core.console, "error").mockImplementation(() => undefined)
  })

  afterEach(() => {
    dispose?.()
    dispose = undefined
    element.remove()
    core.appRoot = undefined
    vi.restoreAllMocks()
  })

  /** Draw `drawing()` into `element`, as `mountApp()` does. */
  function draw(drawing: () => Drawing) {
    dispose = render(drawing, element)
    core.flush()
  }

  test("draws ONCE:  a live value updates in place, and the parent's plain call never re-runs it", () => {
    const card = new Card({ rank: "ace" })
    draw(() => card.draw())
    expect(element.innerHTML).toBe(`<span class="card">ace hearts</span>`)

    card.suit = "spades"
    core.flush()
    expect(element.innerHTML).toBe(`<span class="card">ace spades</span>`)
    expect(drawCalls.get(card)).toBe(1)
  })

  test("a draw() that throws shows its stand-in, says so once and sends `ui-error`;  its pile keeps drawing", () => {
    const sentErrors: unknown[] = []
    element.addEventListener("ui-error", (event) => sentErrors.push((event as CustomEvent).detail.thing))
    const [good, bad] = [new Card({ rank: 2 }), new Card({ rank: 3, isBroken: true })]
    const pile = new Pile()
    pile.add(good, bad)
    draw(() => pile.draw())

    expect(element.innerHTML).toBe(
      `<div><span class="card">2 hearts</span>` +
        `<span class="spell-draw-error" role="alert" title="this card is broken">⚠ Card can't draw</span></div>`
    )
    expect(core.console.error).toHaveBeenCalledTimes(1)
    expect(sentErrors).toEqual([bad])

    good.suit = "clubs"
    core.flush()
    expect(element.querySelector(".card")!.textContent).toBe("2 clubs")
  })

  test("a card added to a pile leaves a broken card's stand-in as it was:  not made again, not said again", () => {
    const pile = new PlainPile()
    pile.add(new PlainCard({ rank: "ace" }), new Card({ rank: 3, isBroken: true }))
    draw(() => core.drawThing(pile))
    const standIn = element.querySelector(".spell-draw-error")
    expect(standIn).not.toBeNull()

    pile.add(new PlainCard({ rank: 4, suit: "spades" }))
    core.flush()
    expect(element.querySelectorAll("i")).toHaveLength(2)
    expect(element.querySelector(".spell-draw-error")).toBe(standIn)
    expect(core.console.error).toHaveBeenCalledTimes(1)
  })

  test("drawThing() calls a @drawn draw() straight:  ONE boundary per thing, not two", () => {
    const card = new Card({ rank: "king" })
    draw(() => core.drawThing(card))
    expect(element.innerHTML).toBe(`<span class="card">king hearts</span>`)
    expect(Errored).toHaveBeenCalledTimes(1)
  })

  test("drawThing() puts a plain draw() in the same boundary, as compiled JavaScript draws", () => {
    const card = new PlainCard({ rank: "ace" })
    draw(() => core.drawThing(card))
    expect(element.innerHTML).toBe(`<i>hearts</i>`)
    expect(Errored).toHaveBeenCalledTimes(1)
  })

  test("mountApp() draws a @drawn app in its one boundary", () => {
    const card = new Card({ rank: "ace", suit: "clubs" })
    dispose = core.mountApp(card, element).unmount
    core.flush()
    expect(element.innerHTML).toBe(`<span class="card">ace clubs</span>`)
    expect(Errored).toHaveBeenCalledTimes(1)
  })

  test("an app mounts as its own element, `<test-app>`, its drawing that element's CHILDREN (epic `elemental-spell` Q62)", async () => {
    /** An app as compiled JavaScript writes it:  its element named for its project and `App`. */
    class Game extends App {
      static elementTag = core.defineElement(this, "test", "App")
      override draw(): Drawing {
        return h("div", { class: "Board" }, "board") as unknown as Drawing
      }
    }
    expect(Game.elementTag).toBe("test-app")
    // a page that defines elements:  the app is drawn as its element
    core.elementDefiner = () => undefined
    try {
      // the definer hears of the class a microtask after it's declared
      await Promise.resolve()
      dispose = core.mountApp(new Game({}), element).unmount
      core.flush()
      // its drawing is the element's child, in the same tree as the project's styles:  not in a shadow root
      expect(element.innerHTML).toBe(`<test-app><div class="Board">board</div></test-app>`)
    } finally {
      core.elementDefiner = undefined
    }
  })

  test("the boundary makes h()'s thunk ONCE:  a card added to a pile makes only that card, never the pile again", () => {
    madeNodes.length = 0
    const pile = new PlainPile()
    const [first, second] = [new PlainCard({ rank: "ace" }), new PlainCard({ rank: 2, suit: "clubs" })]
    pile.add(first, second)
    draw(() => core.drawThing(pile))
    expect(element.innerHTML).toBe(`<div class="pile"><i>hearts</i><i>clubs</i></div>`)
    const [pileNode, firstNode] = madeNodes

    pile.add(new PlainCard({ rank: 3, suit: "spades" }))
    first.suit = "diamonds"
    core.flush()
    expect(element.innerHTML).toBe(`<div class="pile"><i>diamonds</i><i>clubs</i><i>spades</i></div>`)
    expect(madeNodes).toHaveLength(4)
    expect(element.firstChild).toBe(pileNode)
    expect(pileNode!.firstChild).toBe(firstNode)
    expect([drawCalls.get(pile), drawCalls.get(first)]).toEqual([1, 1])
  })

  test("a fragment's thunks are made ONCE too:  a card added to its pile makes neither of its elements again", () => {
    madeNodes.length = 0
    const pile = new PairPile()
    const first = new PlainCard({ rank: "ace" })
    pile.add(first)
    draw(() => core.drawThing(pile))
    expect(element.innerHTML).toBe(`<h3>Pile</h3><div><i>hearts</i></div>`)
    const [heading, frame] = madeNodes

    pile.add(new PlainCard({ rank: 3, suit: "spades" }))
    first.suit = "diamonds"
    core.flush()
    expect(element.innerHTML).toBe(`<h3>Pile</h3><div><i>diamonds</i><i>spades</i></div>`)
    expect(madeNodes).toHaveLength(4)
    expect([element.childNodes[0], element.childNodes[1]]).toEqual([heading, frame])
    expect([drawCalls.get(pile), drawCalls.get(first)]).toEqual([1, 1])
  })

  test("a throw while h()'s thunk is made lands in the boundary:  the stand-in, said once", () => {
    const card = new HalfCard({ rank: "king" })
    draw(() => core.drawThing(card))
    expect(element.innerHTML).toBe(
      `<span class="spell-draw-error" role="alert" title="no face">⚠ HalfCard can't draw</span>`
    )
    expect(core.console.error).toHaveBeenCalledTimes(1)
    expect(Errored).toHaveBeenCalledTimes(1)
  })

  test("mountApp() makes a plain draw()'s h() thunk in its one boundary", () => {
    const card = new PlainCard({ rank: "ace", suit: "clubs" })
    dispose = core.mountApp(card, element).unmount
    core.flush()
    expect(element.innerHTML).toBe(`<i>clubs</i>`)
    expect(Errored).toHaveBeenCalledTimes(1)
  })

  test("only h()'s thunks are made:  any other function a draw() returns stays a live value", () => {
    expect(isElementThunk(h("i"))).toBe(true)
    expect(isElementThunk(() => "text")).toBe(false)
    expect(isElementThunk("text")).toBe(false)

    const card = new LiveCard({ rank: "ace" })
    draw(() => core.drawThing(card))
    expect(element.innerHTML).toBe(`hearts`)
    card.suit = "spades"
    core.flush()
    expect(element.innerHTML).toBe(`spades`)
    expect(drawCalls.get(card)).toBe(1)
  })

  describe("a viewable list:  `to draw it` wraps its items, `to draw each item` wraps each (epic `spanish` P20)", () => {
    /** A viewable list with neither of its own:  the defaults. */
    class Heap extends ViewableList<unknown> {}

    /** A viewable list that wraps each card in a spot. */
    class SpotPile extends ViewableList<Card> {
      override drawEachItem(item: Card): Drawing {
        if (item.isBroken) throw new Error("no spot for a broken card")
        return h("div", { class: "spot" }, () => core.drawThing(item)) as unknown as Drawing
      }
    }

    test("by default, its wrapper is just a slot, and each item is its own drawing -- or its text", () => {
      const heap = new Heap()
      heap.add(new PlainCard({ rank: "ace" }), 7)
      draw(() => [core.drawOwn(heap), core.drawItems(heap)] as unknown as Drawing)
      expect(element.innerHTML).toBe(`<slot></slot><i>hearts</i>7`)
      // the card's own boundary, and none around it:  the heap's own drawing has one
      expect(Errored).toHaveBeenCalledTimes(2)
    })

    test("by default, its wrapper shows its placeholder while it's empty, before the slot", () => {
      class SpotHeap extends Heap {
        override drawItsPlaceholder(): Drawing {
          return h("b", "spot") as unknown as Drawing
        }
      }
      const heap = new SpotHeap()
      draw(() => core.drawOwn(heap))
      expect(element.innerHTML).toBe(`<b>spot</b><slot></slot>`)
      heap.add(7)
      core.flush()
      expect(element.innerHTML).toBe(`<slot></slot>`)
      heap.clear()
      core.flush()
      expect(element.innerHTML).toBe(`<b>spot</b><slot></slot>`)
    })

    test("`to draw each item` wraps each item;  one that throws shows its stand-in, and the rest keeps drawing", () => {
      const pile = new SpotPile()
      pile.add(new PlainCard({ rank: "ace" }), new Card({ rank: 3, isBroken: true }))
      draw(() => core.drawItems(pile))
      expect(element.innerHTML).toBe(
        `<div class="spot"><i>hearts</i></div>` +
          `<span class="spell-draw-error" role="alert" title="no spot for a broken card">⚠ SpotPile can't draw</span>`
      )

      pile.add(new PlainCard({ rank: 4, suit: "spades" }))
      core.flush()
      expect(element.querySelectorAll(".spot")).toHaveLength(2)
    })
  })

  test("@prop takes a read-only `as const` list", () => {
    expect(new Card({ rank: "king" }).value).toBe(3)
  })
})
