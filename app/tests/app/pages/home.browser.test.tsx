import { afterEach, beforeEach, describe, expect, test, vi } from "vite-plus/test"
import { flush } from "solid-js"
import { render } from "@solidjs/web"

import { ElementFixture } from "spell/test-helpers/ElementFixture"
import { Viewport } from "spell/test-helpers/Viewport"
import { SPACES } from "spell/app/spaces"
import { uiReady } from "spell/app/app/solid"
import { ProjectChooser } from "spell/app/app/pages/ProjectChooser"

/**
 * The home page's rows, in the browser (epic `mockup` I40):
 * - your own projects first under the hero, and no row at all while you have none
 * - what Spell's own order hides (`SPACES.HOME_HIDDEN_KEY`) isn't there:
 *   the library, the editor's pieces, FizzBuzz and the sign-in examples, the guide of a hidden one
 * - the ways to start:  Blank, Counter and Task List
 *
 * - Each group's list is made up here:  `load()` sets it, as the API server would answer.
 */

/** Each group's list, by its address:  as `GET /api/projects/list/<group>` answers. */
const LISTS: Record<string, SPACES.ProjectListEntryWithHome[]> = {
  "@spell/examples": [
    { path: "@spell/examples/fizzbuzz", title: "FizzBuzz", category: "first-steps" },
    { path: "@spell/examples/calculator", title: "Calculator", category: "first-steps" },
    { path: "@spell/examples/TaskList", title: "Task List", category: "everyday" },
    { path: "@spell/examples/FamilyCookbook", title: "Family Cookbook", category: "everyday" },
    { path: "@spell/examples/Statusphere", title: "Statusphere", category: "web-data" }
  ],
  "@spell/library": [
    { path: "@spell/library/OrgAdmin", title: "Org Admin" },
    { path: "@spell/library/people", onHome: false }
  ],
  "@spell/guides": [
    { path: "@spell/guides/how-fizzbuzz-works", title: "How FizzBuzz works" },
    { path: "@spell/guides/how-calculator-works", title: "How the Calculator works" }
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
})

describe("the home page's rows", () => {
  test("no projects of your own:  no row for them, header, empty card or button;  the Start row first", async () => {
    const host = await mountHome()
    expect(host.querySelector("#projects")).toBeNull()
    expect(rowIds(host)).toEqual(["start", "examples", "guides"])
    // where a first app is made
    expect(cardsIn(host, "start")).toEqual(["Blank", "Counter", "To-do list"])
  })

  test("projects of your own:  their row first under the hero", async () => {
    ownProjects = [{ path: `${SPACES.localPerson.address}/my-app`, title: "My App" }]
    const host = await mountHome()
    expect(rowIds(host)).toEqual(["projects", "start", "examples", "guides"])
    expect(cardsIn(host, "projects")).toEqual(["My App"])
  })

  test("what Spell's order hides isn't there:  the library, the editor's pieces, hidden examples and guides", async () => {
    const host = await mountHome()
    expect(cardsIn(host, "examples")).toEqual(["Calculator", "Task List"])
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
    expect(rowIds(host)).toEqual(["start", "examples", "guides"])
  })
})

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
