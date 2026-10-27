import { describe, expect, onTestFinished, test } from "vite-plus/test"

import { OwnControls } from "spell/element"

/** `html` in a fresh box on the page, removed after the test. */
function page(html: string): HTMLElement {
  const box = document.createElement("div")
  box.innerHTML = html
  document.body.append(box)
  onTestFinished(() => box.remove())
  return box
}

/** What `OwnControls.isClicked()` says, with `walk`, for a click on `target`, heard on `listener`. */
function answerFor(target: HTMLElement, listener: Element, walk: Parameters<typeof OwnControls.isClicked>[1]): boolean {
  let answer: boolean | undefined
  listener.addEventListener("click", (event) => (answer = OwnControls.isClicked(event, walk)), { once: true })
  target.click()
  return answer!
}

describe("OwnControls.isClicked()", () => {
  test("a click on a control inside is the control's;  on the element itself, the element's", () => {
    const box = page(
      `<div id="host"><span id="text">text</span><button id="button">B</button>` +
        `<div id="role" role="button"><b id="bold">R</b></div><div id="focusable" tabindex="0">F</div></div>`
    )
    const host = box.querySelector<HTMLElement>("#host")!
    const clicks = ["text", "button", "bold", "focusable"].map((id) => [
      id,
      answerFor(box.querySelector<HTMLElement>(`#${id}`)!, host, { upTo: host })
    ])
    expect(Object.fromEntries(clicks)).toEqual({ text: false, button: true, bold: true, focusable: true })
    expect(answerFor(host, host, { upTo: host })).toBe(false)
  })

  test("only inside `upTo`:  a control around the element isn't its own", () => {
    const box = page(`<button><div id="host"><span id="text">text</span></div></button>`)
    const host = box.querySelector<HTMLElement>("#host")!
    expect(answerFor(box.querySelector<HTMLElement>("#text")!, host, { upTo: host })).toBe(false)
  })

  test("`before`:  the walk stops at the element's own toggle, saying no", () => {
    const box = page(
      `<details><summary><a id="link" href="#x">link</a><span id="title">title</span></summary></details>`
    )
    const summary = box.querySelector("summary")!
    const link = box.querySelector<HTMLElement>("#link")!
    link.addEventListener("click", (event) => event.preventDefault())
    expect(answerFor(link, summary, { before: "summary" })).toBe(true)
    expect(answerFor(box.querySelector<HTMLElement>("#title")!, summary, { before: "summary" })).toBe(false)
  })
})
