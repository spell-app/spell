import { afterEach, beforeEach, describe, expect, test, vi } from "vite-plus/test"
import { flush } from "solid-js"
import { render } from "@solidjs/web"

import { ElementFixture } from "spell/test-helpers/ElementFixture"
import { Viewport } from "spell/test-helpers/Viewport"
import { SP } from "spell/parser/spell"
import { SPACES } from "spell/app/spaces"
import { editor } from "spell/app/app/editor"
import { uiReady } from "spell/app/app/solid"
import { ProjectChooser } from "spell/app/app/pages/ProjectChooser"

/**
 * A project made from a start card is not one of your apps until you change it (epic `mockup` I42):
 * - untouched, the home page shows no card for it;  changed, it's in your apps
 * - leaving it (`editor.leaveProject()`):
 *   - untouched:  deleted, nothing asked
 *   - changed, no version saved:  asked;  Don't Save Draft deletes it, Save Draft keeps it for good
 *   - kept, with a version:  nothing asked, nothing deleted
 *   - an edit AutoSave was still waiting to keep is kept first:  it counts as a change, never lost
 * - The server's half (the mark, the first change, versions keeping it):  spaces' `api.test.ts`.
 * - Each group's list is made up here, as `GET /api/projects/list/<group>` would answer.
 */

/** The person's own projects, for the test. */
let ownProjects: SPACES.ProjectListEntryWithHome[] = []

/** Undo for each test. */
const cleanups: (() => void)[] = []

/** What the test's server did:  projects deleted, marks dropped. */
let deleted: string[] = []
let kept: string[] = []

beforeEach(() => {
  ownProjects = []
  deleted = []
  kept = []
  const projects = SPACES.SpellProjectRoot.projects
  for (const root of [projects, SPACES.SpellProjectRoot.examples]) root.contents = undefined
  const load = vi.spyOn(SPACES.SpellProjectRoot.prototype, "load").mockImplementation(function (
    this: SPACES.SpellProjectRoot
  ) {
    this.contents = this === projects ? ownProjects : []
    return Promise.resolve(this.contents) as never
  })
  // the server's answers, from `ownProjects`
  const unsavedNow = vi
    .spyOn(projects, "unsavedNow")
    .mockImplementation(async (path) => ownProjects.find((entry) => entry.path === path)?.unsaved)
  const deleteApp = vi.spyOn(projects, "deleteApp").mockImplementation(async (path) => {
    deleted.push(path)
    ownProjects = ownProjects.filter((entry) => entry.path !== path)
    return true
  })
  const markUnsaved = vi.spyOn(projects, "markUnsaved").mockImplementation(async (path, unsaved) => {
    if (unsaved === null) kept.push(path)
  })
  cleanups.push(() => {
    for (const spy of [load, unsavedNow, deleteApp, markUnsaved]) spy.mockRestore()
  })
})

afterEach(() => {
  for (const cleanup of cleanups.splice(0).reverse()) cleanup()
})

describe("your apps on the home page", () => {
  test("an untouched one made from a start card has no card;  a changed one does, and a kept one", async () => {
    ownProjects = [
      { path: own("counter"), title: "Counter", unsaved: "untouched" },
      { path: own("task-list"), title: "Task List", unsaved: "changed" },
      { path: own("my-app"), title: "My App" }
    ]
    const host = await mountHome()
    expect(cardsIn(host, "projects").sort()).toEqual(["My App", "Task List"])
  })

  test("only an untouched one:  no row of your apps at all", async () => {
    ownProjects = [{ path: own("counter"), title: "Counter", unsaved: "untouched" }]
    const host = await mountHome()
    expect(host.querySelector("#projects")).toBeNull()
  })
})

describe("leaving a project made from a start card (`editor.leaveProject()`)", () => {
  test("untouched:  deleted, nothing asked", async () => {
    ownProjects = [{ path: own("counter"), unsaved: "untouched" }]
    const asked = answer(true)
    await editor.leaveProject(project("counter"))
    expect(asked).not.toHaveBeenCalled()
    expect(deleted).toEqual([own("counter")])
  })

  test("changed, no version:  asked;  Don't Save Draft deletes it", async () => {
    ownProjects = [{ path: own("counter"), unsaved: "changed" }]
    const asked = answer(true)
    await editor.leaveProject(project("counter"))
    expect(asked).toHaveBeenCalledOnce()
    expect(asked.mock.calls[0]![0]).toMatchObject({ ok: "Don't Save Draft", cancel: "Save Draft" })
    expect(deleted).toEqual([own("counter")])
  })

  test("changed, no version:  Save Draft (or Escape) keeps it for good", async () => {
    ownProjects = [{ path: own("counter"), unsaved: "changed" }]
    answer(false)
    await editor.leaveProject(project("counter"))
    expect(deleted).toEqual([])
    expect(kept).toEqual([own("counter")])
  })

  test("kept, with a version:  nothing asked, nothing deleted", async () => {
    ownProjects = [{ path: own("counter") }]
    const asked = answer(true)
    await editor.leaveProject(project("counter"))
    expect(asked).not.toHaveBeenCalled()
    expect(deleted).toEqual([])
  })

  test("untouched, but an edit is waiting for AutoSave:  it's kept first, so it counts as a change", async () => {
    ownProjects = [{ path: own("counter"), unsaved: "untouched" }]
    const file = { isDirty: true, save: vi.fn(async () => (ownProjects[0]!.unsaved = "changed")) }
    const asked = answer(true)
    await editor.leaveProject(project("counter", [file]))
    expect(file.save).toHaveBeenCalledOnce()
    expect(asked).toHaveBeenCalledOnce()
  })

  test("another group's project, an example:  never deleted", async () => {
    const asked = answer(true)
    await editor.leaveProject({ path: "@spell/examples/Counter", title: "Counter", files: [] } as never)
    expect(asked).not.toHaveBeenCalled()
    expect(deleted).toEqual([])
  })
})

/** Project `name`'s path in your space. */
function own(name: string): string {
  return `${SPACES.SpellProjectRoot.projects.path}/${name}`
}

/** A stand-in for your project `name`, with `files`. */
function project(name: string, files: object[] = []): SP.SpellProject {
  return { path: own(name), title: name, files } as unknown as SP.SpellProject
}

/** `editor.confirm()` answers `ok`;  returns its spy. */
function answer(ok: boolean) {
  const spy = vi.spyOn(editor, "confirm").mockResolvedValue(ok)
  cleanups.push(() => spy.mockRestore())
  return spy
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
  await vi.waitFor(() => expect(host.querySelector("#start .TileCard")).not.toBeNull())
  flush()
  await ElementFixture.settle(host)
  return host
}

/** The titles of row `id`'s cards, in order. */
function cardsIn(host: HTMLElement, id: string): string[] {
  return [...host.querySelectorAll(`#${id} .TileCard .title`)].map((title) => title.textContent ?? "")
}
