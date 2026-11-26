import { beforeAll, describe, expect, test, vi } from "vite-plus/test"

import { UI } from "spell/ui/core"
import { ElementFixture } from "spell/test-helpers/ElementFixture"
import type { DOMCodeElement } from "spell/ui/components/ui-code"
import { SpellLanguage } from "spell/app/app/components/spell-code"

/**
 * `<spell-code>`, and the `spell` language its family registers with the page's `UI.code`:
 * spell coloured by spell's own parser, in `<spell-code>` AND in any `<ui-code language="spell">`.
 * - Drawn in the bubbly look by default (`SP.BubblyLayout`, `BubblyHtml`);  coloured lines with `wrap` or
 *   `line-numbers`, which the colour tests ask for.
 * - The colours load lazily, from source (`SpellLanguage`):  the first test pays for spell's parser.
 */

beforeAll(async () => {
  await UI.load()
  // the barrel registers once the runtime is in;  do it now, so no test races it
  SpellLanguage.register()
})

/** A spell snippet with a heading, a type and a property. */
const PILES = `<script type="text/plain">
## Piles
a pile is a list of cards
the value of a pile is:
\treturn 0
</script>`

/** Render `html`, and wait until its first code element is coloured (or failed to be). */
async function code(html: string): Promise<DOMCodeElement> {
  const finished = highlighted(document)
  const host = await ElementFixture.render<DOMCodeElement>(html)
  await finished
  await ElementFixture.tick()
  return host
}

/** Resolves on the next `ui-coloured` or `ui-error` reaching `target`. */
function highlighted(target: EventTarget): Promise<Event> {
  return new Promise((resolve) => {
    target.addEventListener("ui-coloured", done)
    target.addEventListener("ui-error", done)

    /** Stop listening, and resolve. */
    function done(event: Event) {
      target.removeEventListener("ui-coloured", done)
      target.removeEventListener("ui-error", done)
      resolve(event)
    }
  })
}

/** The bubbly drawing, in place of the `<pre>`;  `null` for none. */
function drawingOf(host: DOMCodeElement): HTMLElement | null {
  return host.shadowRoot!.querySelector<HTMLElement>(".drawing")
}

/** A card, as Solitaire's starts. */
const CARD = `<script type="text/plain">
a "card" is a draggable two sided view
\tits "rank" is one of ace, jack, queen, king
\tits "state" is
\t\tif it is a queen
\t\t\treturn "Q"
</script>`

/** The `<code>`. */
function codeOf(host: DOMCodeElement): HTMLElement {
  return host.shadowRoot!.querySelector<HTMLElement>("[part~=code]")!
}

/** How far `band`'s first letter is from its left edge, in pixels. */
function wordsInset(band: HTMLElement): number {
  const walker = document.createTreeWalker(band, NodeFilter.SHOW_TEXT)
  for (let node = walker.nextNode() as Text | null; node; node = walker.nextNode() as Text | null) {
    const at = node.data.search(/\S/)
    if (at < 0) continue
    const letter = document.createRange()
    letter.setStart(node, at)
    letter.setEnd(node, at + 1)
    return letter.getBoundingClientRect().left - band.getBoundingClientRect().left
  }
  throw new TypeError("wordsInset():  this band has no words")
}

describe("<spell-code>", () => {
  test("colours spell by default, with spell's own parser:  a heading, a type, a property", async () => {
    const host = await code(`<spell-code wrap>${PILES}</spell-code>`)
    expect(host.localName).toBe("spell-code")
    expect(codeOf(host).querySelector(".hljs-section")!.textContent).toBe("## Piles")
    expect(codeOf(host).querySelector(".hljs-type")!.textContent).toBe("pile")
    expect(codeOf(host).querySelector(".hljs-property")!.textContent).toBe("value")
    expect(codeOf(host).classList.contains("language-spell")).toBe(true)
  })

  test("draws spell in the bubbly look:  a band per declaration, pills for what was typed, a block for a control line", async () => {
    const host = await code(`<spell-code copy>${CARD}</spell-code>`)
    const drawing = drawingOf(host)!
    expect(drawing.querySelector(".bubbly-block.bubbly-thing > .bubbly-head-pill")!.textContent).toBe(
      'a "card" is a draggable two sided view'
    )
    expect([...drawing.querySelectorAll(".bubbly-choice")].map((it) => it.textContent)).toEqual([
      "ace",
      "jack",
      "queen",
      "king"
    ])
    // its line's own tabs before it, drawn at no size, for copying (T106)
    expect(drawing.querySelector(".bubbly-block.bubbly-control > .bubbly-body")!.textContent).toBe('\t\t\treturn "Q"')
    expect(host.shadowRoot!.querySelector("style")!.textContent).toContain(".bubbly")
    expect(host.shadowRoot!.querySelector<HTMLElement>("[part~=pre]")!.hidden).toBe(true)
    // the copy button still copies the code as written
    expect(host.content.trim()).toBe(CARD.replace(/<\/?script[^>]*>/g, "").trim())
  })

  test("copies a stretch of the drawing as the file has it, each line's indent kept (T106)", async () => {
    const host = await code(`<spell-code>${CARD}</spell-code>`)
    const drawing = drawingOf(host)!
    const [rank, , queen] = [...drawing.querySelectorAll<HTMLElement>(".bubbly-pill, .bubbly-head-pill")].slice(1)
    const selected = document.createRange()
    selected.setStartBefore(rank!)
    selected.setEndAfter(drawing.querySelector(".bubbly-block.bubbly-control > .bubbly-body")!)
    const selection = getSelection()!
    selection.removeAllRanges()
    selection.addRange(selected)
    const lines = selection
      .toString()
      .split("\n")
      .filter((line) => line.trim())
    expect(queen!.textContent).toBe("\t\tif it is a queen")
    expect(lines.map((line) => /^\t*/.exec(line)![0].length)).toEqual([1, 1, 2, 3])
    // each indent out of its line's flow, so it moves nothing
    for (const indent of drawing.querySelectorAll<HTMLElement>(".bubbly-indent-text"))
      expect(getComputedStyle(indent).position).toBe("absolute")
  })

  test("starts every band's words as far into it as the editor does:  a head with a body as one without (I150)", async () => {
    const host = await code(`<spell-code>${CARD}</spell-code>`)
    const drawing = drawingOf(host)!
    const insets = [...drawing.querySelectorAll<HTMLElement>(".bubbly-head-pill, .bubbly-pill")].map(wordsInset)
    // `a "card"` (a head with a body), `its "rank"` (none), `its "state"` and `if it is a queen` (bodies again)
    expect(insets).toHaveLength(4)
    // the editor's room before a head's words:  more than the band's bare padding (3px)
    expect(insets[0]).toBeGreaterThan(8)
    for (const inset of insets) expect(inset).toBeCloseTo(insets[1]!, 1)
  })

  test('draws a plain `<ui-code language="spell">` too, and Spanish with Spanish\'s parser', async () => {
    const plain = await code(`<ui-code language="spell">${CARD}</ui-code>`)
    expect(drawingOf(plain)!.querySelector(".bubbly-thing")).not.toBeNull()
    const spanish = await code(`<spell-code language="spell/es">una "carta" es una vista reversible arrastrable
\tsu "rango" es uno de as, jota</spell-code>`)
    expect([...drawingOf(spanish)!.querySelectorAll(".bubbly-choice")].map((it) => it.textContent)).toEqual([
      "as",
      "jota"
    ])
  })

  test("is a `<ui-code>` in every way:  another `language`, `copy`, its accessible name", async () => {
    const host = await code(`<spell-code language="json" copy>{"a": 1}</spell-code>`)
    expect(codeOf(host).classList.contains("language-json")).toBe(true)
    expect(host.shadowRoot!.querySelector("[part~=copy]")).not.toBeNull()
    expect(host.shadowRoot!.querySelector("[part~=pre]")!.getAttribute("aria-label")).toBe("json code")
  })

  test('its family\'s `spell` colours a plain `<ui-code language="spell">` too', async () => {
    const host = await code(`<ui-code language="spell" wrap>${PILES}</ui-code>`)
    expect(codeOf(host).querySelector(".hljs-type")!.textContent).toBe("pile")
  })

  test("`spell/es` colours Spanish, with Spanish's parser:  its keywords, its types", async () => {
    const PILAS = `<script type="text/plain">
una pila es una lista de cartas
el valor de una pila es:
\tdevolver 0
</script>`
    const host = await code(`<spell-code language="spell/es" wrap>${PILAS}</spell-code>`)
    const keywords = [...codeOf(host).querySelectorAll(".hljs-keyword")].map((it) => it.textContent)
    expect(keywords).toContain("devolver")
    expect(codeOf(host).querySelector(".hljs-type")!.textContent).toBe("pila")
  })

  test("`spell/<lang>` with no such translation stays plain, naming it in the ui-error", async () => {
    const onError = vi.fn()
    document.addEventListener("ui-error", onError)
    const host = await code(`<spell-code language="spell/xx">a pile is a list</spell-code>`)
    document.removeEventListener("ui-error", onError)
    expect(codeOf(host).textContent).toBe("a pile is a list")
    const { detail } = onError.mock.calls.at(-1)![0]
    expect(detail.kind).toBe("render")
    expect(String(detail.error)).toMatch(/"xx" translation/)
  })
})
