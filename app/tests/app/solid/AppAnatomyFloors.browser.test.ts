import { afterEach, describe, expect, test } from "vite-plus/test"

import { AnatomyFloors } from "spell/app/app/solid/AppAnatomyFloors"

/**
 * `AnatomyFloors.in()`:  which elements of a running app are Anatomy's floors (epic `editor` P34).
 * - A view stands in as an element whose `component.currentThing` is an object, as `SpellElement.thingOf()` reads it.
 * - A Spell UI part, as a `ui-*` element that draws its box in its shadow root (`uiPart()`).
 */

/** A stand-in view:  `tag`, drawing a thing. */
function view(tag: string, style = ""): HTMLElement {
  const element = document.createElement(tag)
  Object.assign(element, { component: { currentThing: {} } })
  element.setAttribute("style", `display: block; ${style}`)
  return element
}

/**
 * A stand-in Spell UI part:  `tag`, drawing no box of its own (`display: contents`), its box a `<div>` in its shadow
 * root holding a slot, with `style` on that box.
 */
function uiPart(tag: string, style = ""): HTMLElement {
  const element = document.createElement(tag)
  element.style.display = "contents"
  const box = document.createElement("div")
  box.setAttribute("style", `display: block; ${style}`)
  box.append(document.createElement("slot"))
  element.attachShadow({ mode: "open" }).append(box)
  return element
}

/** A part as the Views tree takes one:  a view, or a Spell UI element (`Inspector.isPart`, cut down). */
const isPart = (element: Element) => "component" in element || element.localName.startsWith("ui-")

let stage: HTMLElement
afterEach(() => stage?.remove())

/** A stage on the page holding `app`. */
function staged(app: HTMLElement): HTMLElement {
  stage = document.createElement("div")
  stage.append(app)
  document.body.append(stage)
  return stage
}

describe("AnatomyFloors.in()", () => {
  test("nests each view over the view holding it, through shadow roots", () => {
    const app = view("x-app")
    const pile = view("x-pile")
    const card = view("x-card")
    app.append(document.createElement("div"))
    app.firstElementChild!.append(pile)
    pile.attachShadow({ mode: "open" }).append(card)
    const floors = AnatomyFloors.in(staged(app))
    expect(floors.map((floor) => [floor.element.localName, floor.depth, floor.parent?.element.localName])).toEqual([
      ["x-app", 0, undefined],
      ["x-pile", 1, "x-app"],
      ["x-card", 2, "x-pile"]
    ])
  })

  test("by default only views are floors:  a Spell UI part inside one is not", () => {
    const app = view("x-app")
    const toolbar = document.createElement("ui-toolbar")
    toolbar.style.display = "block"
    app.append(toolbar)
    staged(app)
    expect(AnatomyFloors.in(stage).map((floor) => floor.element.localName)).toEqual(["x-app"])
  })

  test("with Spell UI parts, a part that draws no box is a floor by the first box in its shadow root (I261)", () => {
    const app = view("x-app")
    const segment = uiPart("ui-segment", "backdrop-filter: blur(20px)")
    const text = uiPart("ui-text")
    segment.append(text)
    app.append(segment)
    const floors = AnatomyFloors.in(staged(app), { isPart })
    expect(
      floors.map((floor) => [floor.element.localName, floor.box.localName, floor.parent?.element.localName])
    ).toEqual([
      ["x-app", "x-app", undefined],
      ["ui-segment", "div", "x-app"],
      ["ui-text", "div", "ui-segment"]
    ])
    // the glass blur round the text doesn't keep it flat:  Anatomy turns that off while it shows
    expect(floors.some((floor) => floor.isFlat || floor.clips)).toBe(false)
  })

  test("a Spell UI part's own drawing holds no floors;  a part that doesn't show isn't one", () => {
    const app = view("x-app")
    const button = uiPart("ui-button")
    button.shadowRoot!.firstElementChild!.append(document.createElement("ui-icon"))
    const closed = uiPart("ui-modal")
    closed.shadowRoot!.firstElementChild!.setAttribute("style", "display: block; opacity: 0")
    closed.append(uiPart("ui-content"))
    app.append(button, closed)
    const floors = AnatomyFloors.in(staged(app), { isPart })
    expect(floors.map((floor) => floor.element.localName)).toEqual(["x-app", "ui-button"])
  })

  test("siblings that overlap step up one by one, in the order they're drawn;  ones side by side don't", () => {
    const app = view("x-app", "position: relative; width: 400px; height: 300px")
    const column = view("x-column", "position: absolute; left: 0; top: 0; width: 80px; height: 300px")
    const cards = [0, 20, 40].map((top) =>
      view("x-card", `position: absolute; left: 0; top: ${top}px; width: 80px; height: 100px`)
    )
    const other = view("x-column", "position: absolute; left: 100px; top: 0; width: 80px; height: 300px")
    column.append(...cards)
    app.append(column, other)
    const floors = AnatomyFloors.in(staged(app))
    expect(floors.map((floor) => [floor.element.localName, floor.step, floor.steps])).toEqual([
      ["x-app", 0, 0],
      ["x-column", 0, 0],
      ["x-card", 0, 2],
      ["x-card", 1, 2],
      ["x-card", 2, 2],
      ["x-column", 0, 0]
    ])
  })

  test("a view that fades what's inside it keeps its floors flat on it", () => {
    const app = view("x-app")
    const list = view("x-list", "opacity: 0.5")
    const item = view("x-item")
    const loose = view("x-loose")
    list.append(item)
    app.append(list, loose)
    const floors = AnatomyFloors.in(staged(app))
    const of = (tag: string) => floors.find((floor) => floor.element.localName === tag)!
    expect(of("x-list").clips).toBe(true)
    expect(of("x-item").isFlat).toBe(true)
    expect(of("x-loose").isFlat).toBe(false)
    expect(of("x-app").clips).toBeFalsy()
  })

  test("a view inside one that clips, blurs, isolates or masks is a floor of its own, lifted out of it (I261)", () => {
    const app = view("x-app")
    const parents = [
      "overflow: hidden",
      "backdrop-filter: blur(20px)",
      "isolation: isolate",
      "mask-image: linear-gradient(black, black)"
    ].map((style) => {
      const box = document.createElement("div")
      box.setAttribute("style", style)
      box.append(view("x-item"))
      return box
    })
    app.append(...parents)
    const floors = AnatomyFloors.in(staged(app))
    expect(floors.map((floor) => [floor.element.localName, floor.depth, !!floor.isFlat])).toEqual([
      ["x-app", 0, false],
      ["x-item", 1, false],
      ["x-item", 1, false],
      ["x-item", 1, false],
      ["x-item", 1, false]
    ])
    // what Anatomy sets on each while it shows, and puts back as it closes
    expect(parents.map((box) => AnatomyFloors.liftingStylesFor(getComputedStyle(box)))).toEqual([
      { overflow: "visible" },
      { "backdrop-filter": "none" },
      { isolation: "auto" },
      { "mask-image": "none" }
    ])
  })

  test("the boxes between a floor and the stage leave out what draws no box", () => {
    const app = view("x-app")
    const contents = document.createElement("div")
    contents.style.display = "contents"
    const box = document.createElement("div")
    const card = view("x-card")
    box.append(card)
    contents.append(box)
    app.append(contents)
    staged(app)
    expect(AnatomyFloors.boxesBetween(card, stage)).toEqual([box, app])
  })
})
