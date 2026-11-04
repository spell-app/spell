/**
 * Tests of the migration `item-bodies` (epic `epic-engine` I209):  an item with only a title gets its title's words as
 * its body, so it opens and takes a comment.
 */
import { parseHTML } from "linkedom"
import { describe, expect, test } from "vite-plus/test"

import { Migrations } from "spell/epic/tool/migrations/Migrations"

/** The step under test. */
const STEP = Migrations.named("item-bodies")!

/** The context every run gets. */
const NOW = { now: new Date(2026, 10, 3, 9, 0) }

/** A page holding `items`' markup, in a todo section. */
function page(items: string): Document {
  return parseHTML(
    `<html><body><main><epic-page epic="x" title="X"><epic-section id="todos" kind="todos">${items}` +
      `</epic-section></epic-page></main></body></html>`
  ).document as unknown as Document
}

describe("item-bodies", () => {
  test("a title-only todo gets its title's words as a paragraph;  a question's go in its <epic-question>", () => {
    const document = page(
      `<epic-item id="t98" title="swapi answers &lt;b&gt; with a redirect" status="open"></epic-item>` +
        `<epic-item id="q3" title="Which way?" status="open"> </epic-item>`
    )
    const notes: string[] = []
    expect(STEP.run(document, { ...NOW, notes })).toBe(true)
    expect(document.getElementById("t98")!.innerHTML).toBe(
      '<p data-title-body="">swapi answers &lt;b&gt; with a redirect</p>'
    )
    expect(document.getElementById("q3")!.querySelector(":scope > epic-question > p")!.textContent).toBe("Which way?")
    expect(notes).toEqual(["item-bodies:  T98, Q3"])
  })

  test("leaves an item with a body, status cards or a part file as it is, and runs once", () => {
    const document = page(
      `<epic-item id="t1" title="a" status="open"><p>details</p></epic-item>` +
        `<epic-item id="t2" title="b" status="open"><epic-status slot="status" state="done"><p>x</p></epic-status></epic-item>` +
        `<epic-item id="t3" title="c" status="open" source="parts/t3.html"></epic-item>` +
        `<epic-item id="t4" status="open"><span slot="title">a <b>bold</b> title</span></epic-item>`
    )
    expect(STEP.run(document, NOW)).toBe(true)
    expect(document.getElementById("t4")!.querySelector(":scope > p")!.textContent).toBe("a bold title")
    const before = document.body.innerHTML
    expect(STEP.run(document, NOW)).toBe(false)
    expect(document.body.innerHTML).toBe(before)
    expect(document.getElementById("t1")!.querySelectorAll("p").length).toBe(1)
    expect(document.getElementById("t3")!.childNodes.length).toBe(0)
  })

  test("a given body follows a renamed title;  one anyone wrote is never touched", () => {
    const document = page(`<epic-item id="t5" title="old" status="open"></epic-item>`)
    STEP.run(document, NOW)
    document.getElementById("t5")!.setAttribute("title", "new")
    expect(STEP.run(document, NOW)).toBe(true)
    expect(document.getElementById("t5")!.textContent).toBe("new")
    document.getElementById("t5")!.innerHTML = "<p>written</p>"
    expect(STEP.run(document, NOW)).toBe(false)
    expect(document.getElementById("t5")!.textContent).toBe("written")
  })
})
