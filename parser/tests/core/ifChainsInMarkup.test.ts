import { parseHTML } from "linkedom"
import { enableExternalSource, flush } from "solid-js"
import { render } from "@solidjs/web"
import { describe, test, expect, vi, beforeAll, beforeEach, afterEach } from "vite-plus/test"

import { bridgeSolid } from "spell/util"
import { core } from "spell/parser/core"
import type { Drawing } from "spell/parser/core/drawing"
import { parseSpellProject, registerTestComponentPack, runSpellFiles } from "spell/parser/spell/test"

/**
 * An IF-CHAIN INSIDE MARKUP, drawn (epic `elemental-spell`, Owen 2026-10-25:  "Inside an element:  hidden"):
 * every branch stays on the page, each hidden while it isn't the one:  text `hidden="until-found"`, a Spell UI element
 * by its own `hidden`.
 * - So a flip keeps each element, the same DOM node with whatever it holds, and only `hidden` changes.
 * - The same tags in code spell and spellx:  the same program.
 * - Compiled, then run on `core`'s source, into a fake page (linkedom), as `drawing.test.ts` draws.
 */
describe("an <if> inside markup", () => {
  /** A card whose drawing picks one of three things inside its segment. */
  const SPELLX = [
    '<spell-view "card">',
    '\t<property "up">yes or no</>',
    '\t<property "rank">a number</>',
    "\t<draw>",
    "\t\t<segment>",
    "\t\t\t<if its up is yes>",
    "\t\t\t\t<text>{its rank}</text>",
    "\t\t\t<otherwise if its rank is 1>",
    "\t\t\t\tAce down",
    "\t\t\t<otherwise>",
    "\t\t\t\t<button>down</button>",
    "\t\t\t</>",
    "\t\t</segment>",
    "\t</draw>",
    "</spell-view>",
    "<spell>",
    "\tset card to a new card with rank = 5",
    "</spell>"
  ]
  /** The same card in code spell:  the same tags, inside its drawing. */
  const CODE_SPELL = [
    'a "card" is a view where:',
    '\t- its "up" is yes or no',
    '\t- its "rank" is a number',
    "\t- to draw it:",
    "\t\t<ui-segment>",
    "\t\t\t<if its up is yes>",
    "\t\t\t\t<ui-text>{its rank}</ui-text>",
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

  /** The card `lines` make, drawn into `element`. */
  function drawnCard(path: string, lines: string[]) {
    const { card } = runSpellFiles([{ path, contents: lines.join("\n") }])("card") as {
      card: { up: boolean; rank: number; draw(): Drawing }
    }
    dispose = render(() => card.draw(), element)
    core.flush()
    return card
  }

  /** What each of the segment's children is, and whether it's hidden:  `ui-text hidden` ... */
  function shown(): string[] {
    const segment = element.firstElementChild!
    return [...segment.children].map((child) => `${child.localName}${child.hasAttribute("hidden") ? " hidden" : ""}`)
  }

  test("every branch is on the page;  the one whose phrase holds shows, the rest are hidden until found", () => {
    drawnCard("/Card.spellml", SPELLX)
    expect(shown()).toEqual(["ui-text hidden", "span hidden", "ui-button"])
    const [text, span] = [...element.firstElementChild!.children]
    // a Spell UI element by its own `hidden`;  text, in a span of its own, until found
    expect(text!.getAttribute("hidden")).toBe("")
    expect(span!.textContent).toBe("Ace down")
    expect(span!.getAttribute("hidden")).toBe("until-found")
  })

  test("a flip keeps every element, the same node with what it holds:  only `hidden` changes", () => {
    const card = drawnCard("/Card.spellml", SPELLX)
    const segment = element.firstElementChild!
    const before = [...segment.children]
    ;(before[2] as HTMLElement & { held?: string }).held = "kept"

    // `<otherwise if its rank is 1>`
    card.rank = 1
    core.flush()
    expect(shown()).toEqual(["ui-text hidden", "span", "ui-button hidden"])
    // `<if its up is yes>` wins over every branch after it
    card.up = true
    core.flush()
    expect(shown()).toEqual(["ui-text", "span hidden", "ui-button hidden"])
    expect(element.firstElementChild!.children[0]!.textContent).toBe("1")
    // `<otherwise>`, again
    card.up = false
    card.rank = 7
    core.flush()
    expect(shown()).toEqual(["ui-text hidden", "span hidden", "ui-button"])

    expect(element.firstElementChild).toBe(segment)
    expect([...segment.children]).toEqual(before)
    expect((segment.children[2] as HTMLElement & { held?: string }).held).toBe("kept")
  })

  test("code spell says it with the same tags, and draws the same", () => {
    drawnCard("/Card.spell", CODE_SPELL)
    expect(shown()).toEqual(["ui-text hidden", "span hidden", "ui-button"])
  })

  test("both forms compile to the same program", () => {
    const code = (path: string, lines: string[]) => {
      const [file] = parseSpellProject([{ path, contents: lines.join("\n") }]).files
      expect(file!.errors).toEqual([])
      return file!.compiled
        .replace(/\/\*! SPELL: DECLARES[^]*?\*\//g, "")
        .split("\n")
        .filter((line) => line.trim() && !line.trim().startsWith("//"))
        .join("\n")
    }
    expect(code("/Card.spellml", SPELLX)).toBe(code("/Card.spell", CODE_SPELL))
  })
})
