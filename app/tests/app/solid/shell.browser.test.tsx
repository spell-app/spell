import { afterEach, describe, expect, test, vi } from "vite-plus/test"
import { flush } from "solid-js"
import { render } from "@solidjs/web"

import { reactiveObject } from "spell/util"
import { ElementFixture } from "spell/test-helpers/ElementFixture"
import type { SPACES } from "spell/app/spaces"
import { editor, type EditorStore } from "spell/app/app/editor"
import { SpellPage, openProject, rememberedSizes, trackProjectRoot, uiReady } from "spell/app/app/solid"
import { editorPrefs } from "spell/app/app/editorPrefs"

/**
 * The pages' shell in the browser (P8):  `<SpellPage>`,
 * `trackProjectRoot()` on a fake project root.
 */

/** Undo for each test:  unmount, restore `editor` fields, forget prefs. */
const cleanups: (() => void)[] = []

afterEach(() => {
  for (const cleanup of cleanups.splice(0).reverse()) cleanup()
})

describe("rememberedSizes()", () => {
  test("starts as it's told, keeps what its panel says, and forgets on asking;  a control's `ui-changed` is no size", async () => {
    const id = "rememberedSizes.browser.test"
    editorPrefs.forget(id)
    cleanups.push(() => editorPrefs.forget(id))
    let sizes!: ReturnType<typeof rememberedSizes>
    const host = await mount(() => {
      sizes = rememberedSizes(() => ({ id, sizes: "20%,*" }))
      return (
        <ui-split-panel columns={sizes.sizes()} on-ui-changed={sizes.keep}>
          <div>
            <button class="control" />
          </div>
          <div>b</div>
        </ui-split-panel>
      )
    })
    const panel = host.querySelector("ui-split-panel")!
    expect(sizes.sizes()).toBe("20%,*")
    host
      .querySelector(".control")!
      .dispatchEvent(new CustomEvent("ui-changed", { bubbles: true, detail: { sizes: "1%,99%" } }))
    flush()
    expect(sizes.sizes()).toBe("20%,*")
    panel.dispatchEvent(new CustomEvent("ui-changed", { detail: { sizes: "70%,30%" } }))
    flush()
    expect(sizes.sizes()).toBe("70%,30%")
    expect(panel.getAttribute("columns")).toBe("70%,30%")
    expect(editorPrefs.get(id)).toBe("70%,30%")
    sizes.forget()
    flush()
    expect(sizes.sizes()).toBe("20%,*")
  })
})

describe("<SpellPage>", () => {
  test("a class per variant;  other props go to the `<div>`", async () => {
    const host = await mount(() => (
      <SpellPage id="Page" fillWindow dark rows title="hello">
        content
      </SpellPage>
    ))
    const page = host.querySelector("#Page")!
    expect([...page.classList].sort()).toEqual(["SpellPage", "dark", "fill-window", "rows"])
    expect(page.getAttribute("title")).toBe("hello")
    expect(page.hasAttribute("fillWindow")).toBe(false)
    expect(page.textContent).toBe("content")
  })
})

describe("`trackProjectRoot()` / `openProject()`", () => {
  test("loads its root, then lists its projects", async () => {
    const root = fakeRoot(false)
    let state!: ReturnType<typeof trackProjectRoot>
    await mount(() => {
      state = trackProjectRoot(() => root)
      return null
    })
    expect(root.load).toHaveBeenCalled()
    expect(state().loaded).toBe(false)
    expect(state().projects).toEqual([])

    Object.assign(root, { isLoaded: true })
    flush()
    expect(state().loaded).toBe(true)
    expect(state().icon).toBe("app store ios")
    expect(state().words.title).toBe("Examples")
    expect(state().projects.map((project) => [project.path, project.name])).toEqual([
      ["@spell/examples/TaskList", "TaskList"],
      ["@spell/examples/Solitaire", "Solitaire"]
    ])
  })

  test("a root that fails to load says so", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    cleanups.push(() => warn.mockRestore())
    const root = fakeRoot(false)
    root.load = vi.fn(() => Promise.reject(new Error("no such folder")))
    let state!: ReturnType<typeof trackProjectRoot>
    await mount(() => {
      state = trackProjectRoot(() => root)
      return null
    })
    await expect.poll(() => (flush(), state().failed)).toBe(true)
    expect(warn).toHaveBeenCalled()
  })

  test("no root given:  `editor.projectRoot`'s", async () => {
    setEditor("projectRoot", fakeRoot(true))
    let state!: ReturnType<typeof trackProjectRoot>
    await mount(() => {
      state = trackProjectRoot(() => undefined)
      return null
    })
    expect(state().projects).toHaveLength(2)
  })

  test("`openProject()`:  shows it in the editor, or in Run", () => {
    const showEditor = spyOnEditor("showEditor")
    const showRunner = spyOnEditor("showRunner")
    openProject("@spell/examples/Solitaire")
    expect(showEditor).toHaveBeenCalledWith("@spell/examples/Solitaire")
    openProject("@spell/examples/TaskList", true)
    expect(showRunner).toHaveBeenCalledWith("@spell/examples/TaskList")
  })
})

////////////////
// ## Helpers
////////////////

/** A project root of two examples, as spell cells (as real ones are), `isLoaded` or not. */
function fakeRoot(isLoaded: boolean): SPACES.SpellProjectRoot & { load: ReturnType<typeof vi.fn> } {
  return reactiveObject({
    path: "@spell/examples",
    isLoaded,
    projectPaths: ["@spell/examples/TaskList", "@spell/examples/Solitaire"],
    icon: "app store ios",
    title: "Examples",
    // the key of its words in the editor's texts (`appTexts.groupWords()`)
    type: "example",
    Type: "Example",
    load: vi.fn(() => Promise.resolve())
  }) as unknown as SPACES.SpellProjectRoot & { load: ReturnType<typeof vi.fn> }
}

/** Draw `component` in a fresh `<div>`, once `<ui-*>` are defined.  Unmounted after the test. */
async function mount(component: () => unknown): Promise<HTMLElement> {
  await uiReady
  const host = document.createElement("div")
  document.body.append(host)
  const dispose = render(component as () => never, host)
  cleanups.push(() => {
    dispose()
    host.remove()
  })
  flush()
  await ElementFixture.settle(host)
  return host
}

/** Set `editor[key]`, restored after the test. */
function setEditor<K extends keyof EditorStore>(key: K, value: EditorStore[K]) {
  const before = editor[key]
  editor[key] = value
  cleanups.push(() => (editor[key] = before))
}

/** Replace `editor[key]` with a spy (calling `implementation`), restored after the test. */
function spyOnEditor<K extends keyof EditorStore>(key: K, implementation?: (...args: never[]) => unknown) {
  const spy = vi.fn(implementation)
  setEditor(key, spy as unknown as EditorStore[K])
  return spy
}
