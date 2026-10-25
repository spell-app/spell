import { describe, test, expect, afterEach } from "vite-plus/test"

import { core, Thing, View, ViewableList, css, elementTagFor } from "spell-parser/core"

/** A view class's element:  its tag, named here, defined by the page's `elementDefiner`. */
describe("views' elements", () => {
  afterEach(() => {
    core.elementDefiner = undefined
  })

  test("a tag is the project's name as written, then the class's, kebab-cased", () => {
    expect(elementTagFor("Solitaire", "Card")).toBe("solitaire-card")
    expect(elementTagFor("games", "BankAccount")).toBe("games-bank-account")
    expect(elementTagFor("Todos - Form Based", "Task")).toBe("todos-form-based-task")
    expect(elementTagFor("", "Card")).toBe("spell-card")
  })

  test("the word drawable is left out of the project's name (P18)", () => {
    expect(elementTagFor("Drawable Solitaire", "Tableau")).toBe("solitaire-tableau")
    expect(elementTagFor("DrawableSolitaire", "StockPile")).toBe("solitaire-stock-pile")
    expect(elementTagFor("My Drawables", "Card")).toBe("my-card")
    expect(elementTagFor("Drawable", "Card")).toBe("spell-card")
    // only the project's:  a class's own name keeps it
    expect(elementTagFor("Games", "DrawableCard")).toBe("games-drawable-card")
  })

  test("defineElement() names a view class's tag as it's declared;  the page hears of it once the class is whole", async () => {
    const defined: string[] = []
    core.elementDefiner = (tag, Class) => defined.push(`${tag} ${Class.name}`)
    class Card extends View {
      static elementTag = core.defineElement(this, "Solitaire")
    }
    class Pile extends ViewableList<Card> {
      static elementTag = core.defineElement(this, "Solitaire")
    }
    class Note extends Thing {
      static elementTag = core.defineElement(this, "Solitaire")
    }
    expect(defined).toEqual([])
    expect(core.elementFor(new Pile())).toBe("solitaire-pile")
    await Promise.resolve()
    expect(defined).toEqual(["solitaire-pile Pile", "solitaire-card Card"])
    expect(Card.elementTag).toBe("solitaire-card")
    expect(core.elementTagOf(new Pile())).toBe("solitaire-pile")
    expect(Note.elementTag).toBeUndefined()
    expect(core.elementTagOf(new Note())).toBeUndefined()
  })

  test("with no definer, the tag is still named", () => {
    class Card extends View {}
    core.defineElement(Card, "games")
    expect(core.elementTagOf(new Card())).toBe("games-card")
  })

  test("useElement() keeps the element class compiled TypeScript hands over, for the definer to build on (P10)", () => {
    class Card extends View {}
    class Joker extends Card {}
    class Note extends Thing {}
    class CardElement {}
    core.useElement(Card, CardElement)
    core.useElement(Note, CardElement)
    expect(core.elementClassOf(Card)).toBe(CardElement)
    // its own only:  a sub-class with none doesn't take its super-class's
    expect(core.elementClassOf(Joker)).toBeUndefined()
    // not a view:  nothing kept
    expect(core.elementClassOf(Note)).toBeUndefined()
  })
})

describe("elementApiOf():  what a view class shows on its element", () => {
  test("its declared properties and its methods, its super-types' too;  not draw(), nor a method with values in it, nor the built-in `id`", () => {
    class Card extends View {
      draw() {
        return null
      }
      turn_over() {}
      is_a_$suit(_suit: string) {
        return false
      }
    }
    Card.declareProp("rank", { type: "number" })
    Card.declareProp("suit", { type: "text" })
    class Joker extends Card {
      wink() {}
    }
    Joker.declareProp("grin", { type: "choice" })
    expect(core.elementApiOf(Joker)).toEqual({
      properties: [
        { name: "grin", type: "choice" },
        { name: "rank", type: "number" },
        { name: "suit", type: "text" }
      ],
      methods: ["wink", "turn_over"]
    })
  })

  test("a list it makes for itself is a list;  a list it belongs to is a property, the list holding it (P18)", () => {
    class Chip extends View {}
    Chip.declareProp("marks", { init: () => [] })
    class Heap extends ViewableList<Chip> {
      static instanceType = Chip
    }
    Heap.exclusive = true
    Object.defineProperty(Chip.prototype, "heap", {
      get(this: Chip) {
        return Heap.ownerOf(this)
      },
      configurable: true
    })
    // the program's classes are known once one of their things is made
    new Heap()
    expect(core.elementApiOf(Chip).properties).toEqual([
      { name: "marks", type: "list" },
      { name: "heap", type: "Heap", owner: true }
    ])
  })
})

/** The tag a view type's `<css>` block compiles to:  `static css = css`...``. */
describe("css`...`", () => {
  test("hands back the sheet as text, the indent its lines share taken off", () => {
    class Card extends View {
      static css = css`
        :host {
          display: inline-block;
        }
        .red {
          color: crimson;
        }
      `
    }
    expect(Card.css).toBe(":host {\n  display: inline-block;\n}\n.red {\n  color: crimson;\n}")
  })

  test("keeps CSS's own escapes, and a blank line inside, as written", () => {
    expect(css`
      q::before {
        content: "\201C";
      }

      q::after {
        content: "\201D";
      }
    `).toBe('q::before {\n  content: "\\201C";\n}\n\nq::after {\n  content: "\\201D";\n}')
  })

  test("one line, or nothing:  as is", () => {
    expect(tagged(".red { color: crimson }")).toBe(".red { color: crimson }")
    expect(tagged("  .red { color: crimson }  ")).toBe(".red { color: crimson }  ")
    expect(tagged("")).toBe("")
  })

  /** `css` given `text` as its template, as written:  the formatter lays out a real `css` template's CSS. */
  function tagged(text: string): string {
    return css(Object.assign([text], { raw: [text] }))
  }
})

/** A list's drag handlers, as the page runs them (epic `outline-spell` P28):  `core.runHandler()`, `startWhile()`. */
describe("drag handlers", () => {
  /** A sign, its hint and its count as compiled spell declares them. */
  class Sign extends Thing {
    get hint(): string {
      return this.getProp("hint") ?? ""
    }
    set hint(value: string) {
      this.setProp("hint", value)
    }
    get count(): number {
      return this.getProp("count") ?? 0
    }
    set count(value: number) {
      this.setProp("count", value)
    }
  }
  /** A tray with a sign:  `- while a token is dragged over it:` sets its sign's hint, and counts. */
  class Tray extends ViewableList {
    sign = new Sign()
    whileTokenDraggedOver(label: string) {
      this.sign.hint = `drop ${label} here`
      this.sign.hint = "twice"
      this.sign.count = this.sign.count + 1
    }
  }

  test("startWhile() runs a `while` handler;  endWhile() puts back what it set, as it was", () => {
    const tray = new Tray()
    tray.sign.hint = "empty"
    core.startWhile(tray, "whileTokenDraggedOver", "a")
    expect([tray.sign.hint, tray.sign.count]).toEqual(["twice", 1])
    core.endWhile(tray, "whileTokenDraggedOver")
    // put back as it was before:  the count it never had is unset again, so reads its default
    expect([tray.sign.hint, tray.sign.count]).toEqual(["empty", 0])
    // ended:  nothing to put back again
    tray.sign.hint = "later"
    core.endWhile(tray, "whileTokenDraggedOver")
    expect(tray.sign.hint).toBe("later")
  })

  test("starting it again ends the last first;  runHandler() just runs it", () => {
    const tray = new Tray()
    core.startWhile(tray, "whileTokenDraggedOver", "a")
    core.startWhile(tray, "whileTokenDraggedOver", "b")
    expect(tray.sign.count).toBe(1)
    core.endWhile(tray, "whileTokenDraggedOver")
    expect(tray.sign.count).toBe(0)
    core.runHandler(tray, "whileTokenDraggedOver", "c")
    expect(tray.sign.count).toBe(1)
  })

  test("a page whose program runs elsewhere sends them there (`core.remote`)", () => {
    const sent: unknown[][] = []
    const tray = new Tray()
    core.remote = {
      run: (...args) => sent.push(["run", ...args.slice(1)]),
      startWhile: (...args) => sent.push(["startWhile", ...args.slice(1)]),
      endWhile: (...args) => sent.push(["endWhile", ...args.slice(1)]),
      set: () => {},
      trigger: (...args) => sent.push(["trigger", ...args])
    }
    try {
      core.startWhile(tray, "whileTokenDraggedOver", "a")
      core.endWhile(tray, "whileTokenDraggedOver")
      core.runHandler(tray, "whenTokenDroppedOn", "a")
    } finally {
      core.remote = undefined
    }
    expect(tray.sign.count).toBe(0)
    expect(sent).toEqual([
      ["startWhile", "whileTokenDraggedOver", ["a"]],
      ["endWhile", "whileTokenDraggedOver"],
      ["run", "whenTokenDroppedOn", ["a"]]
    ])
  })
})
