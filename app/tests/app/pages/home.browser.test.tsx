import { afterEach, beforeEach, describe, expect, test, vi } from "vite-plus/test"
import { flush } from "solid-js"
import { render } from "@solidjs/web"

import { ElementFixture } from "spell/test-helpers/ElementFixture"
import { Viewport } from "spell/test-helpers/Viewport"
import { SPACES } from "spell/app/spaces"
import { editor } from "spell/app/app/editor"
import { uiReady } from "spell/app/app/solid"
import { ProjectChooser } from "spell/app/app/pages/ProjectChooser"
import { HomeArrangement } from "spell/app/app/pages/HomeArrangement"

/**
 * The home page's rows, in the browser (epic `mockup` I40):
 * - your own projects first under the hero, and no row at all while you have none
 * - what Spell's own order hides (`SPACES.HOME_HIDDEN_KEY`) isn't there:
 *   the library, the editor's pieces, FizzBuzz and the sign-in examples, the guide of a hidden one
 * - the ways to start:  Counter first, the to-do list, Converter, Blank
 * - the examples and guides written in Spanish:  a section of their own, "En español", after the English ones (I46)
 * - a "..." menu on each of your own projects' cards, and nobody else's (T47);  each item the editor's action on THAT
 *   project, never opening it
 * - "Rearrange Home Screen" (T51):  only then do cards and sections drag, and their words change where they are;
 *   with no server here, a person's own changes, on this device, with Reset to Default
 *
 * - Each group's list is made up here:  `load()` sets it, as the API server would answer.
 */

/** Each group's list, by its address:  as `GET /api/projects/list/<group>` answers. */
const LISTS: Record<string, SPACES.ProjectListEntryWithHome[]> = {
  "@spell/examples": [
    { path: "@spell/examples/Solitaire", title: "Solitaire", description: "Klondike solitaire:  its own cards" },
    { path: "@spell/examples/fizzbuzz", title: "FizzBuzz" },
    { path: "@spell/examples/Weather", title: "Weather" },
    { path: "@spell/examples/calculator", title: "Calculator" },
    { path: "@spell/examples/Calculadora", title: "Calculadora", language: "es" },
    { path: "@spell/examples/ListaDeTareas", title: "Lista de tareas", language: "es" },
    { path: "@spell/examples/Solitario", title: "Solitario", language: "es" },
    { path: "@spell/examples/TaskList", title: "Task List" },
    { path: "@spell/examples/FamilyCookbook", title: "Family Cookbook" },
    { path: "@spell/examples/Statusphere", title: "Statusphere" }
  ],
  "@spell/library": [
    { path: "@spell/library/OrgAdmin", title: "Org Admin" },
    { path: "@spell/library/people", onHome: false }
  ],
  "@spell/guides": [
    { path: "@spell/guides/how-fizzbuzz-works", title: "How FizzBuzz works" },
    { path: "@spell/guides/how-calculator-works", title: "How the Calculator works" },
    { path: "@spell/guides/como-funciona-solitario", title: "Cómo funciona Solitario", language: "es" }
  ]
}

/** Undo for each test. */
const cleanups: (() => void)[] = []

/** The person's own projects, for the test:  none, unless it says. */
let ownProjects: SPACES.ProjectListEntryWithHome[] = []

beforeEach(() => {
  ownProjects = []
  for (const root of [SPACES.SpellProjectRoot.projects, SPACES.SpellProjectRoot.examples]) root.contents = undefined
  const load = vi.spyOn(SPACES.SpellProjectRoot.prototype, "load").mockImplementation(function (
    this: SPACES.SpellProjectRoot
  ) {
    this.contents = this === SPACES.SpellProjectRoot.projects ? ownProjects : (LISTS[this.path] ?? [])
    return Promise.resolve(this.contents) as never
  })
  cleanups.push(() => load.mockRestore())
})

afterEach(() => {
  for (const cleanup of cleanups.splice(0).reverse()) cleanup()
  HomeArrangement.reset()
  HomeArrangement.rearrange(false)
  flush()
})

describe("the home page's rows", () => {
  test("no projects of your own:  no row for them, header, empty card or button;  the Start row first", async () => {
    const host = await mountHome()
    expect(host.querySelector("#projects")).toBeNull()
    expect(rowIds(host)).toEqual(["start", "examples", "guides", "spanish"])
    // where a first app is made:  Blank last (epic `mockup` T44)
    expect(cardsIn(host, "start")).toEqual(["Counter", "To-do list", "Converter", "Blank"])
  })

  test("projects of your own:  their row first under the hero", async () => {
    ownProjects = [{ path: `${SPACES.localPerson.address}/my-app`, title: "My App" }]
    const host = await mountHome()
    expect(rowIds(host)).toEqual(["projects", "start", "examples", "guides", "spanish"])
    expect(cardsIn(host, "projects")).toEqual(["My App"])
  })

  test("what Spell's order hides isn't there:  the library, the editor's pieces, hidden examples and guides", async () => {
    const host = await mountHome()
    // Task List is hidden too:  the Start row's to-do list copies it (epic `mockup` T42)
    expect(cardsIn(host, "examples")).toEqual(["Calculator", "Weather", "Solitaire"])
    expect(cardsIn(host, "guides")).toEqual(["How the Calculator works"])
    for (const id of ["library", "editor", "sign-in"]) expect(host.querySelector(`#${id}`), id).toBeNull()
    expect(host.textContent).not.toMatch(/FizzBuzz|Family Cookbook|Statusphere|Org Admin/)
  })

  test("an app made for an org:  your projects above the hero, as before;  no library there either", async () => {
    const was = { id: SPACES.localPerson.id, org: SPACES.localPerson.org }
    SPACES.setLocalPerson({ id: was.id, org: "acme" })
    cleanups.push(() => SPACES.setLocalPerson(was))
    ownProjects = [{ path: `${SPACES.localPerson.address}/my-app`, title: "My App" }]
    const host = await mountHome()
    const above = [...host.querySelectorAll(".Home > section.ProjectCards:not(.Hero ~ *)")].map((each) => each.id)
    expect(above).toEqual(["projects"])
    expect(rowIds(host)).toEqual(["start", "examples", "guides", "spanish"])
  })

  test("the examples:  ONE set in Spell's order, no line over a kind of them (I48);  each card its description's first phrase", async () => {
    const host = await mountHome()
    expect(cardsIn(host, "examples")).toEqual(["Calculator", "Weather", "Solitaire"])
    expect(host.querySelector("#examples .subhead")).toBeNull()
    expect([...host.querySelectorAll("#examples .TileCard .description")].map((line) => line.textContent)).toEqual([
      "Klondike solitaire"
    ])
  })

  test('the Spanish examples and guides:  their own section, "En español", out of the English ones (I46)', async () => {
    const host = await mountHome()
    expect(cardsIn(host, "examples")).toEqual(["Calculator", "Weather", "Solitaire"])
    expect(cardsIn(host, "guides")).toEqual(["How the Calculator works"])
    expect(host.querySelector("#spanish h2")?.textContent).toMatch(/^En español\./)
    // the examples, then the guides, each under its line;  Lista de tareas hidden, as Task List is
    expect(cardsIn(host, "spanish")).toEqual(["Calculadora", "Solitario", "Cómo funciona Solitario"])
    const lines = [...host.querySelectorAll("#spanish .subhead")].map((line) => line.textContent)
    expect(lines).toEqual(["Ejemplos", "Guías"])
  })
})

describe('a card\'s "..." menu (T47)', () => {
  test("on your own projects' cards alone:  named, its items in order, dividers between", async () => {
    ownProjects = [{ path: `${SPACES.localPerson.address}/my-app`, title: "My App" }]
    const host = await mountHome()
    const menus = host.querySelectorAll("ui-dropdown.CardMenu")
    expect(menus.length).toBe(1)
    expect(menus[0]!.closest("section")?.id).toBe("projects")
    expect(menus[0]!.getAttribute("aria-label")).toBe("Project actions")
    const items = [...menus[0]!.querySelectorAll("ui-item")].map((item) =>
      item.getAttribute("kind") === "divider" ? "-" : item.textContent?.trim()
    )
    expect(items).toEqual([
      "Run App in a New Tab",
      "-",
      "Rename Project…",
      "Duplicate Project…",
      "Versions…",
      "Export as .zip",
      "Update App Snapshot…",
      "-",
      "Delete Project…"
    ])
  })

  test("each item runs the editor's action on that card's project, and never opens it", async () => {
    const path = `${SPACES.localPerson.address}/my-app`
    ownProjects = [{ path, title: "My App" }]
    const host = await mountHome()
    const actions = [
      "runInNewTab",
      "renameApp",
      "duplicateApp",
      "showVersions",
      "exportApp",
      "updateSnapshot",
      "deleteApp"
    ]
    const spies = actions.map((action) =>
      vi
        .spyOn(editor as unknown as Record<string, (...args: unknown[]) => unknown>, action)
        .mockImplementation(() => undefined)
    )
    const shown = vi.spyOn(editor, "showEditor").mockImplementation(() => undefined)
    cleanups.push(() => [...spies, shown].forEach((spy) => spy.mockRestore()))
    const items = [...host.querySelectorAll<HTMLElement>("ui-dropdown.CardMenu ui-item:not([kind])")]
    for (const item of items) item.click()
    for (const spy of spies) {
      expect(spy).toHaveBeenCalledTimes(1)
      expect((spy.mock.calls[0] as unknown as [{ project: { path: string } }])[0].project.path).toBe(path)
    }
    expect(shown).not.toHaveBeenCalled()
  })
})

describe("Rearrange Home Screen (T51)", () => {
  test("off:  nothing drags, nothing's typed in;  on:  cards and section headers drag, words are fields;  Done turns it off", async () => {
    const host = await mountHome()
    expect(host.querySelector("[draggable='true']")).toBeNull()
    expect(host.querySelector(".EditableText")).toBeNull()
    expect(host.querySelector(".RearrangeBar")).toBeNull()
    await rearrange(host)
    expect(host.querySelector(".RearrangeBar .how")?.textContent).toMatch(/Only you see what you change here/)
    expect(host.querySelectorAll("#start .TileCard[draggable='true']").length).toBe(4)
    expect(host.querySelectorAll("#examples .TileCard[draggable='true']").length).toBe(3)
    expect(host.querySelector("#examples > header[draggable='true']")).not.toBeNull()
    expect(host.querySelectorAll("#examples .TileCard .EditableText").length).toBe(6)
    expect(host.querySelector("#examples header .EditableText")?.textContent).toBe("Examples")
    // a card's not a link while it's rearranged:  a click lands in its text
    expect(host.querySelector("#examples a.TileCard")).toBeNull()
    clickButton(host, "Done")
    expect(host.querySelector(".RearrangeBar")).toBeNull()
    expect(host.querySelector("[draggable='true']")).toBeNull()
  })

  test("a card's title typed in where it is:  Enter keeps it;  Escape puts it back;  Reset to Default forgets it", async () => {
    const host = await mountHome()
    await rearrange(host)
    type(titleOf(host, "examples", 1), "Sun and Rain", "Enter")
    expect(cardsIn(host, "examples")).toEqual(["Calculator", "Sun and Rain", "Solitaire"])
    type(titleOf(host, "examples", 0), "Sums", "Escape")
    expect(cardsIn(host, "examples")).toEqual(["Calculator", "Sun and Rain", "Solitaire"])
    // kept on this device, as there's no server here
    expect(localStorage.getItem("spell-home:layout")).toContain("Sun and Rain")
    clickButton(host, "Reset to Default")
    expect(cardsIn(host, "examples")).toEqual(["Calculator", "Weather", "Solitaire"])
    expect(localStorage.getItem("spell-home:layout")).toBeNull()
  })

  test("a tagline past a card's two lines is marked, and kept;  a section's header and line change too", async () => {
    const host = await mountHome()
    await rearrange(host)
    const line = host.querySelectorAll<HTMLElement>("#examples .TileCard .description")[0]!
    type(line, "x".repeat(SPACES.CARD_LINE_LENGTH + 1), "Enter")
    expect(line.classList.contains("too-long")).toBe(true)
    expect(line.title).toMatch(/Longer than a card shows whole/)
    type(host.querySelector<HTMLElement>("#guides header .EditableText")!, "Read these", "Enter")
    clickButton(host, "Done")
    expect(host.querySelector("#guides h2")?.textContent).toMatch(/^Read these\./)
  })

  test("a card dragged onto another moves there;  a section by its header;  nothing moves while it's off", async () => {
    const host = await mountHome()
    drag(cardIn(host, "start", 0), cardIn(host, "start", 2))
    expect(cardsIn(host, "start")).toEqual(["Counter", "To-do list", "Converter", "Blank"])
    await rearrange(host)
    drag(cardIn(host, "start", 0), cardIn(host, "start", 2))
    expect(cardsIn(host, "start")).toEqual(["To-do list", "Converter", "Counter", "Blank"])
    drag(host.querySelector<HTMLElement>("#guides > header")!, host.querySelector<HTMLElement>("#start")!)
    expect(rowIds(host)).toEqual(["guides", "start", "examples", "spanish"])
  })
})

/** Turn "Rearrange Home Screen" on, from its button at the page's foot. */
async function rearrange(host: HTMLElement) {
  clickButton(host, "Rearrange Home Screen")
  await ElementFixture.settle(host)
}

/** Click the `<ui-button>` that says `text`. */
function clickButton(host: HTMLElement, text: string) {
  const button = [...host.querySelectorAll<HTMLElement>("ui-button")].find((each) => each.textContent?.trim() === text)
  expect(button, text).toBeDefined()
  button!.click()
  flush()
}

/** Row `id`'s card number `index`, from 0. */
function cardIn(host: HTMLElement, id: string, index: number): HTMLElement {
  return host.querySelectorAll<HTMLElement>(`#${id} .TileCard`)[index]!
}

/** Row `id`'s card number `index`'s title. */
function titleOf(host: HTMLElement, id: string, index: number): HTMLElement {
  return cardIn(host, id, index).querySelector<HTMLElement>(".title")!
}

/** Click into `field`, type `text` over what it says, and press `key`. */
function type(field: HTMLElement, text: string, key: "Enter" | "Escape") {
  field.click()
  flush()
  expect(document.activeElement, "typing in it").toBe(field)
  field.textContent = text
  field.dispatchEvent(new InputEvent("input", { bubbles: true }))
  field.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }))
  flush()
}

/** Drag `from` and drop it on `onto`, as a mouse would. */
function drag(from: HTMLElement, onto: HTMLElement) {
  const dataTransfer = new DataTransfer()
  const send = (target: HTMLElement, type: string) =>
    target.dispatchEvent(new DragEvent(type, { bubbles: true, cancelable: true, dataTransfer }))
  send(from, "dragstart")
  flush()
  send(onto, "dragover")
  flush()
  send(onto, "drop")
  send(from, "dragend")
  flush()
}

/** Draw the home page alone;  resolves once its groups have loaded and its `<ui-*>` are ready. */
async function mountHome(): Promise<HTMLElement> {
  await uiReady
  await Viewport.resize(1280, 800)
  const host = document.createElement("div")
  document.body.append(host)
  const dispose = render(() => <ProjectChooser />, host)
  cleanups.push(() => {
    dispose()
    host.remove()
  })
  await vi.waitFor(() => expect(host.querySelector("#examples .TileCard:not(.empty)")).not.toBeNull())
  flush()
  await ElementFixture.settle(host)
  return host
}

/** The page's rows under the hero, by id. */
function rowIds(host: HTMLElement): string[] {
  return [...host.querySelectorAll(".Hero ~ section.ProjectCards")].map((section) => section.id)
}

/** The titles of row `id`'s cards, in order. */
function cardsIn(host: HTMLElement, id: string): string[] {
  return [...host.querySelectorAll(`#${id} .TileCard .title`)].map((title) => title.textContent ?? "")
}
