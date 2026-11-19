import { afterEach, describe, expect, test } from "vite-plus/test"

import { AnatomyFloors } from "spell/app/app/solid/AppAnatomyFloors"

/**
 * `AnatomyFloors.in()`:  which elements of a running app are Anatomy's floors (epic `editor` P34).
 * - A view stands in as an element whose `component.currentThing` is an object, as `SpellElement.thingOf()` reads it.
 */

/** A stand-in view:  `tag`, drawing a thing. */
function view(tag: string, style = ""): HTMLElement {
  const element = document.createElement(tag)
  Object.assign(element, { component: { currentThing: {} } })
  element.setAttribute("style", `display: block; ${style}`)
  return element
}

/** Is `element` a Spell UI part:  its tag starts `ui-`. */
const isPart = (element: Element) => element.localName.startsWith("ui-")

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
    const floors = AnatomyFloors.in(staged(app), { parts: false, isPart })
    expect(floors.map((floor) => [floor.element.localName, floor.depth, floor.parent?.element.localName])).toEqual([
      ["x-app", 0, undefined],
      ["x-pile", 1, "x-app"],
      ["x-card", 2, "x-pile"]
    ])
  })

  test("Spell UI's parts are floors only with Parts on, and only with a box of their own", () => {
    const app = view("x-app")
    const toolbar = document.createElement("ui-toolbar")
    toolbar.style.display = "block"
    const text = document.createElement("ui-text")
    text.style.display = "contents"
    toolbar.append(text)
    app.append(toolbar)
    staged(app)
    expect(AnatomyFloors.in(stage, { parts: false, isPart }).map((floor) => floor.element.localName)).toEqual(["x-app"])
    expect(AnatomyFloors.in(stage, { parts: true, isPart }).map((floor) => floor.element.localName)).toEqual([
      "x-app",
      "ui-toolbar"
    ])
  })

  test("a view that clips what's inside it keeps its floors flat on it", () => {
    const app = view("x-app")
    const list = view("x-list", "overflow: hidden")
    const item = view("x-item")
    const loose = view("x-loose")
    list.append(item)
    app.append(list, loose)
    const floors = AnatomyFloors.in(staged(app), { parts: false, isPart })
    const of = (tag: string) => floors.find((floor) => floor.element.localName === tag)!
    expect(of("x-list").clips).toBe(true)
    expect(of("x-item").isFlat).toBe(true)
    expect(of("x-loose").isFlat).toBe(false)
    expect(of("x-app").clips).toBeFalsy()
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
