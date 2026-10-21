import { afterEach, describe, expect, test } from "vite-plus/test"

import { shownReadingTime } from "$/epics/tools/ReadingTime.js"

/** A scratch box on the page, removed after each test. */
let box: HTMLElement | undefined
afterEach(() => box?.remove())

/** `html` drawn on the page, in a box of its own. */
function drawn(html: string): HTMLElement {
  box = document.createElement("div")
  box.innerHTML = html
  document.body.append(box)
  return box
}

describe("shownReadingTime():  the epic page's chip counts only what's shown (J91)", () => {
  test("hidden text doesn't count;  shown code counts twice;  an epic element's title counts;  the runtime's doesn't", () => {
    const root = drawn(
      `<p>one two three four</p>` +
        `<div hidden><p>folded words that are not shown at all</p></div>` +
        `<pre>let a = 1</pre>` +
        `<epic-x title="five six"></epic-x>` +
        `<span data-spell-added>Docs Epics</span>`
    )
    expect(shownReadingTime(root)).toEqual({ words: 10, code: 4, minutes: 1 })
  })

  test("opening the folded part adds its words", () => {
    const root = drawn(`<p>shown</p><div hidden>${"word ".repeat(460)}</div>`)
    expect(shownReadingTime(root).words).toBe(1)
    root.querySelector("div")!.hidden = false
    expect(shownReadingTime(root)).toMatchObject({ words: 461, minutes: 2 })
  })
})
