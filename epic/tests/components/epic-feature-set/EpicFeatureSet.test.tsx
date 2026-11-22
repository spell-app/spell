import { afterEach, describe, expect, test } from "vite-plus/test"
import { userEvent } from "vite-plus/test/browser"

import { ElementFixture } from "spell/test-helpers/ElementFixture"
import { expectAccessible } from "spell/test-helpers/A11y"

import { AnswerForm, type SentAnswer } from "spell/epic/answers"

import "spell/epic/components/epic-feature-set"
import "spell/epic/components/epic-ask"
import "spell/epic/components/epic-choices"
import "spell/ui/components/ui-button"
import "spell/ui/components/ui-input"
import "spell/ui/components/ui-modal"
import "spell/ui/components/ui-select"

import docCSS from "spell/epic/tools/_assets/spell-doc.css?inline"

////////////////
// ## Fixtures
////////////////

/** An item's row, as the tool writes one. */
function row(id: string, title: string, priority = "") {
  return (
    `<tr id="${id}" data-feature-item><td><p class="spell-feature-title"><a class="spell-feature-name" href="#${id}">` +
    `${id.slice(2).toUpperCase()}</a> <b>${title}</b></p></td><td class="spell-feature-pick">` +
    `<epic-ask compact no-chip name="${id}" label="${id.toUpperCase()} · ${title}"><epic-choices>` +
    `<epic-option letter="Y" title="Yes"></epic-option><epic-option letter="N" title="No"></epic-option></epic-choices>` +
    `${priority}</epic-ask></td></tr>`
  )
}

/** An item's Priority, in its pick's `then` slot. */
function priority(id: string) {
  return (
    `<epic-ask slot="then" compact name="${id}-priority" label="Priority" off-for="N"><epic-choices>` +
    `<epic-option letter="2" title="Priority 2"></epic-option></epic-choices></epic-ask>`
  )
}

/** A section of rows, with its Reorder button. */
function section(id: string, title: string, rows: string) {
  return (
    `<ui-section id="${id}" label="${id.toUpperCase()} · ${title}" data-feature-section>` +
    `<ui-button data-feature-reorder="${id}">Reorder</ui-button><table class="spell-feature-table"><tbody>${rows}</tbody></table></ui-section>`
  )
}

/** The page:  two sections, three items and one. */
const PAGE =
  `<main><p><a id="out" href="https://example.com/a" target="somewhere">out</a>` +
  `<a id="in" href="/epics/x/details/y.html" target="y">in</a>` +
  `<a id="file" href="/src/util/string.ts" target="src-src-util-string-ts">file</a></p><epic-feature-set></epic-feature-set>` +
  section("s1", "Now", row("s1f1", "One") + row("s1f2", "Two") + row("s1f3", "Three")) +
  section("s2", "Later", row("s2f1", "Four")) +
  `</main>`

/** The page, drawn. */
async function page() {
  const main = await ElementFixture.render(PAGE)
  await ElementFixture.settle()
  return { main, host: main.querySelector("epic-feature-set")! }
}

/** `host`'s shadow parts named `name`. */
function parts(host: Element, name: string): HTMLElement[] {
  return Array.from(host.shadowRoot!.querySelectorAll<HTMLElement>(`[part~="${name}"]`))
}

/** The dialog's rows, by name. */
function listed(host: Element): string[] {
  return parts(host, "entry").map((entry) => entry.querySelector(".name")!.textContent!)
}

/** The ids of section 1's rows, in page order. */
function items(main: Element): string[] {
  return Array.from(main.querySelectorAll("#s1 tr"), (each) => each.id)
}

/** Click `element`, and let it draw. */
async function click(element: HTMLElement) {
  element.click()
  await ElementFixture.settle()
}

/** An arrow key on row `index` of the dialog. */
async function press(host: Element, index: number, key: string) {
  parts(host, "entry")[index]!.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }))
  await ElementFixture.settle()
}

/** Open the dialog on section 1's items, and wait till it's shown. */
async function openItems(main: Element, host: Element) {
  await click(main.querySelector<HTMLElement>('[data-feature-reorder="s1"]')!)
  const dialog = parts(host, "dialog")[0]!.shadowRoot!
  await expect.poll(() => dialog.querySelector("dialog")?.open).toBe(true)
  await ElementFixture.settle()
  return dialog
}

/** Press row `from`'s dots and move to row `to`, a little past its middle;  returns the letting go. */
async function drag(host: Element, from: number, to: number) {
  const grip = parts(host, "entry")[from]!.querySelector<HTMLElement>(".grip")!
  const start = grip.getBoundingClientRect()
  const end = parts(host, "entry")[to]!.getBoundingClientRect()
  const pointer = { pointerId: 1, pointerType: "mouse", button: 0, bubbles: true, composed: true, cancelable: true }
  const at = { clientX: start.left + 2, clientY: start.top + 2 }
  const there = { clientX: at.clientX, clientY: end.top + end.height * 0.75 }
  grip.dispatchEvent(new PointerEvent("pointerdown", { ...pointer, ...at }))
  window.dispatchEvent(new PointerEvent("pointermove", { ...pointer, ...there }))
  await ElementFixture.settle()
  return async () => {
    window.dispatchEvent(new PointerEvent("pointerup", { ...pointer, ...there }))
    // the click a browser sends after every press:  a drag swallows it
    grip.dispatchEvent(new MouseEvent("click", { ...pointer, ...there }))
    await ElementFixture.settle()
  }
}

afterEach(() => AnswerForm.adopt(undefined))

////////////////
// ## Tests
////////////////

describe("<epic-feature-set>", () => {
  test("Reorder on a section:  arrow keys move a row, Save moves the page's;  names, picks and the answer follow", async () => {
    const { main, host } = await page()
    main
      .querySelector("#s1f2 epic-ask")!
      .shadowRoot!.querySelector('[part~="select"]')!
      .dispatchEvent(new CustomEvent("ui-changed", { detail: { value: "Y" } }))
    await click(main.querySelector<HTMLElement>('[data-feature-reorder="s1"]')!)
    expect(listed(host)).toEqual(["F1", "F2", "F3"])
    await expectAccessible(host)
    await press(host, 1, "ArrowUp")
    expect(listed(host)).toEqual(["F2", "F1", "F3"])
    expect(items(main)).toEqual(["s1f1", "s1f2", "s1f3"])
    await click(parts(host, "save")[0]!)
    expect(items(main)).toEqual(["s1f2", "s1f1", "s1f3"])
    // S1F2 is the same item:  its name, and its pick
    expect(main.querySelector("#s1f2 .spell-feature-name")!.textContent).toBe("F2")
    const { answers } = AnswerForm.forPage().gather()
    expect(answers.s1f2).toEqual({ picked: ["Y"] })
    expect(answers["order-s1"]).toEqual({ picked: ["s1f2", "s1f1", "s1f3"] })
  })

  test("Cancel changes nothing, on the page or in the answer", async () => {
    const { main, host } = await page()
    await click(main.querySelector<HTMLElement>('[data-feature-reorder="s1"]')!)
    await press(host, 0, "ArrowDown")
    await click(parts(host, "cancel")[0]!)
    expect(items(main)).toEqual(["s1f1", "s1f2", "s1f3"])
    expect(AnswerForm.forPage().gather().answers["order-s1"]).toBeUndefined()
  })

  test("the dialog says what it's reordering, how, that names stay, and when Claude sees it", async () => {
    const { main, host } = await page()
    await openItems(main, host)
    const dialog = parts(host, "dialog")[0]!
    expect(dialog.getAttribute("heading")).toBe("Reorder your list: S1 · Now")
    expect(Array.from(dialog.querySelectorAll(".how-to > p"), (line) => line.textContent)).toEqual([
      "To move a row, drag the dots on its left, or click its up and down arrows.",
      "Each row keeps its own number when you move it, so the numbers may end up out of order.",
      "Press Save order to keep your new order. Claude only sees it after you press Send to Claude at the top of the page."
    ])
  })

  test("a row and its section go green with both picks in, or with No, which turns the Priority off", async () => {
    const main = await ElementFixture.render(
      `<main class="spell-doc-main"><epic-feature-set></epic-feature-set>` +
        `${section("s1", "Now", row("s1f1", "One", priority("s1f1")))}</main>`
    )
    const sheet = document.createElement("style")
    sheet.textContent = docCSS
    document.head.append(sheet)
    await ElementFixture.settle()
    const chip = () => getComputedStyle(main.querySelector(".spell-feature-name")!).backgroundColor
    const pick = async (selector: string, value: string) => {
      main
        .querySelector(selector)!
        .shadowRoot!.querySelector('[part~="select"]')!
        .dispatchEvent(new CustomEvent("ui-changed", { detail: { value } }))
      await ElementFixture.settle()
    }
    const state = () => main.querySelector("#s1")!.getAttribute("data-state")
    const red = chip()
    await pick("#s1f1 epic-ask", "Y")
    expect([chip(), state()]).toEqual([red, "attention"])
    await pick("#s1f1 epic-ask[slot]", "2")
    expect(state()).toBe("done")
    const green = chip()
    expect(green).not.toBe(red)
    await pick("#s1f1 epic-ask[slot]", "")
    expect([chip(), state()]).toEqual([red, "attention"])
    await pick("#s1f1 epic-ask", "N")
    expect([chip(), state()]).toEqual([green, "done"])
    sheet.remove()
  })

  test("a drag moves a row in the dialog, and the page's only with Save", async () => {
    const { main, host } = await page()
    await openItems(main, host)
    const letGo = await drag(host, 0, 2)
    expect(listed(host)).toEqual(["F2", "F3", "F1"])
    await letGo()
    expect(items(main)).toEqual(["s1f1", "s1f2", "s1f3"])
    await click(parts(host, "save")[0]!)
    expect(items(main)).toEqual(["s1f2", "s1f3", "s1f1"])
    expect(AnswerForm.forPage().gather().answers["order-s1"]).toEqual({ picked: ["s1f2", "s1f3", "s1f1"] })
  })

  test("Escape in a drag puts the row back", async () => {
    const { main, host } = await page()
    await openItems(main, host)
    const letGo = await drag(host, 0, 2)
    await userEvent.keyboard("{Escape}")
    await letGo()
    expect(listed(host)).toEqual(["F1", "F2", "F3"])
  })

  for (const way of ["the ✕", "Escape"])
    test(`${way} changes nothing, on the page or in the answer`, async () => {
      const { main, host } = await page()
      const dialog = await openItems(main, host)
      await press(host, 0, "ArrowDown")
      expect(listed(host)).toEqual(["F2", "F1", "F3"])
      if (way === "Escape") await userEvent.keyboard("{Escape}")
      else await click(dialog.querySelector<HTMLElement>('[part~="close"]')!)
      await expect.poll(() => dialog.querySelector("dialog")?.open).toBe(false)
      expect(items(main)).toEqual(["s1f1", "s1f2", "s1f3"])
      expect(AnswerForm.forPage().gather().answers["order-s1"]).toBeUndefined()
      // opened again, it's the page's order, not the one thrown away
      await openItems(main, host)
      expect(listed(host)).toEqual(["F1", "F2", "F3"])
    })

  test("Reorder sections:  S2 first is still S2;  put back as written, the order leaves the answer", async () => {
    const { main, host } = await page()
    const sections = () => Array.from(main.querySelectorAll("ui-section"), (each) => each.id)
    await click(parts(host, "reorder")[0]!)
    expect(listed(host)).toEqual(["S1", "S2"])
    await press(host, 1, "ArrowUp")
    await click(parts(host, "save")[0]!)
    expect(sections()).toEqual(["s2", "s1"])
    expect(main.querySelector("#s2")!.getAttribute("label")).toBe("S2 · Later")
    expect(AnswerForm.forPage().gather().answers.order).toEqual({ picked: ["s2", "s1"] })
    await click(parts(host, "reorder")[0]!)
    await press(host, 1, "ArrowUp")
    await click(parts(host, "save")[0]!)
    expect(sections()).toEqual(["s1", "s2"])
    expect(AnswerForm.forPage().gather().answers.order).toBeUndefined()
  })

  test("an order sent comes back on load, at once in the answer", async () => {
    const { main } = await page()
    const sent = { answers: { "order-s1": { picked: ["s1f3", "s1f1"] } }, comments: {}, notes: "" }
    const form = AnswerForm.forPage() as unknown as { parts: Set<{ showAnswer(answer: SentAnswer): void }> }
    for (const part of form.parts) part.showAnswer(sent as unknown as SentAnswer)
    // an item it doesn't name goes after those it does
    expect(AnswerForm.forPage().gather().answers["order-s1"]).toEqual({ picked: ["s1f3", "s1f1", "s1f2"] })
    await ElementFixture.settle()
    expect(items(main)).toEqual(["s1f3", "s1f1", "s1f2"])
  })

  test("another site's link opens a new tab, the page's own this window;  a section is red till all its picks are in", async () => {
    const { main } = await page()
    expect(main.querySelector("#out")!.getAttribute("target")).toBe("_blank")
    expect(main.querySelector("#in")!.getAttribute("target")).toBe("_self")
    // a source file's keeps its tab:  the side bar opens it in the editor
    expect(main.querySelector("#file")!.getAttribute("target")).toBe("src-src-util-string-ts")
    expect(main.querySelector("#s2")!.getAttribute("data-state")).toBe("attention")
    main
      .querySelector("#s2f1 epic-ask")!
      .shadowRoot!.querySelector('[part~="select"]')!
      .dispatchEvent(new CustomEvent("ui-changed", { detail: { value: "Y" } }))
    await ElementFixture.settle()
    expect(main.querySelector("#s2")!.getAttribute("data-state")).toBe("done")
    expect(main.querySelector("#s1")!.getAttribute("data-state")).toBe("attention")
  })
})
