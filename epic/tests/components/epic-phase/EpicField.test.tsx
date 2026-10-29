import { afterEach, describe, expect, test, vi } from "vite-plus/test"

import type { E } from "spell/ui/core"
import { ElementFixture } from "spell/test-helpers/ElementFixture"
import { expectAccessible } from "spell/test-helpers/A11y"

import { expandAllUnder, foldAllUnder } from "spell/epic/components/epic-item/Fold"

import "spell/ui/components/ui-section"
import "spell/epic/components/epic-section"
import "spell/epic/components/epic-phase"
import "spell/epic/components/epic-item"
import "spell/epic/components/epic-mark"

// epic `epic-engine` I167 (Owen, 2026-10-29, of a phase's Symptom, Goal ...):  "These should be collapsable"

/** The page's remembered field folds (`FieldFolds`). */
const KEY = `spell-field-folds:${location.pathname}`

afterEach(() => localStorage.removeItem(KEY))

/** Render `html`, wait for it and every inner section;  then `selector`'s element, else the root. */
async function render<T extends Element = E.DOMElement>(html: string, selector?: string): Promise<T> {
  const root = await ElementFixture.render<E.DOMElement>(html)
  await ElementFixture.settle(root.parentElement!)
  for (const host of root.parentElement!.querySelectorAll("epic-section, epic-phase"))
    await (host.shadowRoot!.querySelector("ui-section") as E.DOMElement | null)?.ready
  await ElementFixture.tick()
  return (selector ? root.parentElement!.querySelector(selector) : root) as T
}

/** `field`'s shadow part `name`. */
function part<T extends Element = HTMLElement>(field: Element, name: string): T {
  return field.shadowRoot!.querySelector<T>(`[part~="${name}"]`)!
}

/** Is `field` folded:  its body hidden until found, its chevron saying so? */
function isFolded(field: Element): boolean {
  return part(field, "body").getAttribute("hidden") === "until-found"
}

/** A phase, `p1`, open, with a Symptom, a Goal of bullets and a To review of marks. */
const PHASE =
  `<epic-section id="phases" kind="phases" open>` +
  `<epic-phase id="p1" title="One" status="todo" open>` +
  `<epic-field name="symptom"><p>The fields of a phase    don't fold,   so a long body never reads short.</p></epic-field>` +
  `<epic-field name="goal"><ul><li>Each field folds</li><li>Remembered</li><li>⌥-click</li></ul></epic-field>` +
  `<epic-field name="to-review"><epic-mark item="j9"></epic-mark>, <epic-mark item="q9"></epic-mark></epic-field>` +
  `</epic-phase></epic-section>`

describe("<epic-field> folds (I167)", () => {
  test("open to start with;  a click on its label folds it to its label row and a taste, the icon opens it again", async () => {
    const field = await render(PHASE, 'epic-field[name="symptom"]')
    const toggle = part<HTMLButtonElement>(field, "toggle")
    // the chevron first, before the icon and label
    expect(part(field, "base").firstElementChild!.contains(toggle)).toBe(true)
    expect([isFolded(field), toggle.getAttribute("aria-expanded"), field.matches(":state(open)")]).toEqual([
      false,
      "true",
      true
    ])
    expect(part(field, "taste")).toBeNull()
    // a first paragraph still runs on after the label:  today's look
    const label = part(field, "label").getBoundingClientRect()
    const prose = field.querySelector("p")!.getClientRects()[0]!
    expect(Math.abs(prose.top - label.top)).toBeLessThan(2)

    part(field, "label").click()
    await ElementFixture.tick()
    expect([isFolded(field), toggle.getAttribute("aria-expanded"), field.matches(":state(open)")]).toEqual([
      true,
      "false",
      false
    ])
    const taste = part(field, "taste")
    expect(taste.textContent).toBe("The fields of a phase don't fold, so a long body never reads short.")
    expect(getComputedStyle(taste).textOverflow).toBe("ellipsis")
    // one line:  as tall as the label
    expect(
      Math.abs(taste.getBoundingClientRect().height - part(field, "label").getBoundingClientRect().height)
    ).toBeLessThan(2)
    expect(JSON.parse(localStorage.getItem(KEY)!)).toEqual({ "p1#symptom": true })
    await expectAccessible(field)

    part(field, "icon").click()
    await ElementFixture.tick()
    expect([isFolded(field), part(field, "taste")]).toEqual([false, null])
    expect(localStorage.getItem(KEY)).toBeNull()

    // its chevron, by Enter as a click
    toggle.click()
    await ElementFixture.tick()
    expect(isFolded(field)).toBe(true)
  })

  test("the taste:  a list's count, a Requests field's requests, a mark as its item's id", async () => {
    const section = await render(PHASE)
    const goal = section.querySelector('epic-field[name="goal"]')!
    const review = section.querySelector('epic-field[name="to-review"]')!
    foldAllUnder(section.querySelector("epic-phase")!)
    await ElementFixture.tick()
    expect(part(goal, "taste").textContent).toBe("3 items")
    expect(part(review, "taste").textContent).toBe("J9, Q9")

    const requests = await render(
      `<epic-field name="requests"><epic-field label="r1 · a"><p>One</p></epic-field>` +
        `<epic-field label="r2 · b"><p>Two</p></epic-field></epic-field>`
    )
    part(requests, "toggle").click()
    await ElementFixture.tick()
    expect(part(requests, "taste").textContent).toBe("2 requests")
    // a live change to its text follows
    goal.querySelector("ul")!.append(document.createElement("li"))
    await ElementFixture.tick()
    expect(part(goal, "taste").textContent).toBe("4 items")
  })

  test("remembered per page:  a field the reader folded comes back folded, by its phase's id and its name", async () => {
    localStorage.setItem(KEY, JSON.stringify({ "p1#goal": true, "p1#symptom-2": true }))
    const section = await render(
      PHASE.replace(
        `<epic-field name="goal">`,
        `<epic-field name="symptom"><p>A second symptom</p></epic-field><epic-field name="goal">`
      )
    )
    const folded = Array.from(section.querySelectorAll("epic-field"), (field) => isFolded(field))
    expect(folded).toEqual([false, true, true, false])
    expect(
      Array.from(
        section.querySelectorAll("epic-field"),
        (field) => (field as E.DOMElement & { component: { foldKey: string } }).component.foldKey
      )
    ).toEqual(["p1#symptom", "p1#symptom-2", "p1#goal", "p1#to-review"])
  })

  test("the page's collapse-all and expand-all reach them;  a request stays folded under expand-all", async () => {
    const section = await render(
      PHASE.replace(
        `</epic-phase>`,
        `<epic-field name="requests"><epic-field label="r1 · a"><p>One</p></epic-field></epic-field></epic-phase>`
      )
    )
    const named = Array.from(section.querySelectorAll("epic-field[name]"))
    const request = section.querySelector("epic-field[label]")!
    foldAllUnder(section)
    await ElementFixture.tick()
    expect(named.map(isFolded)).toEqual([true, true, true, true])
    expandAllUnder(section)
    await ElementFixture.tick()
    expect([...named.map(isFolded), isFolded(request)]).toEqual([false, false, false, false, true])
  })

  test("⌥-click on the phase's chevron opens it and every field in it;  again, folds them all", async () => {
    localStorage.setItem(KEY, JSON.stringify({ "p1#goal": true }))
    const section = await render(PHASE.replace(`status="todo" open>`, `status="todo">`))
    const phase = section.querySelector("epic-phase")!
    const fields = Array.from(section.querySelectorAll("epic-field"))
    expect(fields.map(isFolded)).toEqual([false, true, false])
    const toggle = phase
      .shadowRoot!.querySelector("ui-section")!
      .shadowRoot!.querySelector<HTMLElement>('[part~="toggle"]')!
    const altClick = () =>
      toggle.dispatchEvent(new MouseEvent("click", { bubbles: true, composed: true, cancelable: true, altKey: true }))
    altClick()
    await vi.waitFor(() => expect(phase.matches(":state(open)")).toBe(true))
    await ElementFixture.tick()
    expect(fields.map(isFolded)).toEqual([false, false, false])
    altClick()
    await ElementFixture.tick()
    expect([phase.matches(":state(open)"), ...fields.map(isFolded)]).toEqual([false, true, true, true])
  })

  test("⌥-click on a field's own chevron:  it and the requests inside it", async () => {
    const field = await render(
      `<epic-field name="requests"><epic-field label="r1 · a"><p>One</p></epic-field></epic-field>`
    )
    const request = field.querySelector("epic-field")!
    expect([isFolded(field), isFolded(request)]).toEqual([false, true])
    const altClick = () =>
      part(field, "toggle").dispatchEvent(
        new MouseEvent("click", { bubbles: true, composed: true, cancelable: true, altKey: true })
      )
    altClick()
    await ElementFixture.tick()
    expect([isFolded(field), isFolded(request)]).toEqual([true, true])
    altClick()
    await ElementFixture.tick()
    expect([isFolded(field), isFolded(request)]).toEqual([false, false])
  })

  test("a link or comment landing inside opens it (`reveal()`), NOT remembered", async () => {
    localStorage.setItem(KEY, JSON.stringify({ "p1#symptom": true }))
    const field = await render<E.DOMElement & { component: { reveal(): boolean } }>(PHASE, 'epic-field[name="symptom"]')
    expect(isFolded(field)).toBe(true)
    expect(field.component.reveal()).toBe(true)
    await ElementFixture.tick()
    expect(isFolded(field)).toBe(false)
    expect(field.component.reveal()).toBe(false)
    expect(JSON.parse(localStorage.getItem(KEY)!)).toEqual({ "p1#symptom": true })
  })

  test("a labelled block (`Where:`, a test's Step) doesn't fold:  no chevron", async () => {
    const field = await render(`<epic-field label="Step"><p>Open the page.</p></epic-field>`)
    expect([part(field, "toggle"), part(field, "label").textContent]).toEqual([null, "Step:"])
  })
})
