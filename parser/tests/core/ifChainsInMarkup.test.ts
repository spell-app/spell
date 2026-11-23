import { parseHTML } from "linkedom"
import { enableExternalSource, flush } from "solid-js"
import { render } from "@solidjs/web"
import { describe, test, expect, vi, beforeAll, beforeEach, afterEach } from "vite-plus/test"

import { bridgeSolid } from "spell/util"
import { core } from "spell/parser/core"
import type { Drawing } from "spell/parser/core/drawing"
import { parseSpellProject, registerTestComponentPack, runSpellFiles } from "spell/parser/spell/test"

/**
 * An IF-CHAIN INSIDE MARKUP, drawn (epic `elemental-spell`, Owen 2026-10-25):  ONLY the branch whose phrase holds is
 * on the page, `core.drawIf()`.
 * - A branch that isn't the one draws nothing, so reads nothing:  a place's read under it waits until it shows.
 * - A flip draws the new branch;  a change that keeps the branch keeps its elements.
 * - The same with a drawing's bare names (`<segment>`) and Spell UI's own (`<ui-segment>`):  the same program.
 * - Compiled, then run on `core`'s source, into a fake page (linkedom), as `drawing.test.ts` draws.
 */
describe("an <if> inside markup", () => {
  /** A card whose drawing picks one of three things inside its segment. */
  const BARE = [
    'a "card" is a view:',
    '\tits "up" is yes or no',
    '\tits "rank" is a number',
    '\tits "face" is text',
    "\tto draw it:",
    "\t\t<segment>",
    "\t\t\t<if its up is yes>",
    "\t\t\t\t<text>{its face}</text>",
    "\t\t\t<otherwise if its rank is 1>",
    "\t\t\t\tAce down",
    "\t\t\t<otherwise>",
    "\t\t\t\t<button>down</button>",
    "\t\t\t</>",
    "\t\t</segment>",
    "set card to a new card with rank = 5"
  ]
  /** The same card with Spell UI's own tags. */
  const CODE_SPELL = [
    'a "card" is a view where:',
    '\t- its "up" is yes or no',
    '\t- its "rank" is a number',
    '\t- its "face" is text',
    "\t- to draw it:",
    "\t\t<ui-segment>",
    "\t\t\t<if its up is yes>",
    "\t\t\t\t<ui-text>{its face}</ui-text>",
    "\t\t\t<otherwise if its rank is 1>",
    "\t\t\t\tAce down",
    "\t\t\t<otherwise>",
    "\t\t\t\t<ui-button>down</ui-button>",
    "\t\t\t</>",
    "\t\t</ui-segment>",
    "set card to a new card with rank = 5"
  ]

  let page: ReturnType<typeof parseHTML>
  let element: HTMLElement
  let dispose: (() => void) | undefined

  beforeAll(() => {
    registerTestComponentPack()
    page = parseHTML("<!doctype html><html><head></head><body></body></html>")
    for (const name of ["window", "document", "Node", "Element", "HTMLElement", "Event", "CustomEvent"]) {
      vi.stubGlobal(name, page[name as keyof typeof page])
    }
    bridgeSolid({ enableExternalSource, flush })
  })

  beforeEach(() => {
    element = page.document.createElement("div")
    page.document.body.appendChild(element)
  })

  afterEach(() => {
    dispose?.()
    dispose = undefined
    element.remove()
  })

  /** The card `lines` make, drawn into `element`;  `reads` counts each read of its face. */
  function drawnCard(path: string, lines: string[]) {
    const { card } = runSpellFiles([{ path, contents: lines.join("\n") }])("card") as {
      card: { up: boolean; rank: number; face: string; draw(): Drawing }
    }
    const face = Object.getOwnPropertyDescriptor(Object.getPrototypeOf(card), "face")!
    const reads = { face: 0 }
    Object.defineProperty(card, "face", {
      get() {
        reads.face++
        return face.get!.call(card)
      },
      set(value: string) {
        face.set!.call(card, value)
      }
    })
    card.face = "Five"
    dispose = render(() => card.draw(), element)
    core.flush()
    return { card, reads }
  }

  /** What the segment holds:  each element by its tag, each text as it reads. */
  function drawn(): string[] {
    const segment = element.firstElementChild!
    return [...segment.childNodes]
      .map((node) => (node.nodeType === 1 ? (node as Element).localName : node.textContent!.trim()))
      .filter(Boolean)
  }

  test("only the branch whose phrase holds is on the page:  no branch drawn hidden", () => {
    drawnCard("/Card.spell", BARE)
    expect(drawn()).toEqual(["ui-button"])
    expect(element.querySelector("[hidden]")).toBe(null)
  })

  test("a branch that isn't the one reads nothing:  its face is read once it shows", () => {
    const { card, reads } = drawnCard("/Card.spell", BARE)
    expect(reads.face).toBe(0)
    card.up = true
    core.flush()
    expect(drawn()).toEqual(["ui-text"])
    expect(element.textContent).toBe("Five")
    expect(reads.face).toBeGreaterThan(0)
  })

  test("a flip draws the new branch and lets the old one go;  a change that keeps the branch keeps its elements", () => {
    const { card } = drawnCard("/Card.spell", BARE)
    // `<otherwise if its rank is 1>`
    card.rank = 1
    core.flush()
    expect(drawn()).toEqual(["Ace down"])
    // `<if its up is yes>` wins over every branch after it
    card.up = true
    core.flush()
    expect(drawn()).toEqual(["ui-text"])
    const text = element.firstElementChild!.firstElementChild
    // the same branch:  the same element, only its text changes
    card.rank = 7
    card.face = "Seven"
    core.flush()
    expect(element.firstElementChild!.firstElementChild).toBe(text)
    expect(element.textContent).toBe("Seven")
    // `<otherwise>`, again
    card.up = false
    core.flush()
    expect(drawn()).toEqual(["ui-button"])
  })

  test("Spell UI's own tags draw the same", () => {
    drawnCard("/Card.spell", CODE_SPELL)
    expect(drawn()).toEqual(["ui-button"])
  })

  test("both compile to the same program", () => {
    const code = (path: string, lines: string[]) => {
      const [file] = parseSpellProject([{ path, contents: lines.join("\n") }]).files
      expect(file!.errors).toEqual([])
      return file!.compiled
        .replace(/\/\*! SPELL: DECLARES[^]*?\*\//g, "")
        .split("\n")
        .filter((line) => line.trim() && !line.trim().startsWith("//"))
        .join("\n")
    }
    expect(code("/Card.spell", BARE)).toBe(code("/Card.spell", CODE_SPELL))
  })
})
