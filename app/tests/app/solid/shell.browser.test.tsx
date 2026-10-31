import { afterEach, describe, expect, test, vi } from "vite-plus/test"
import { flush } from "solid-js"
import { render } from "@solidjs/web"

import { reactiveObject } from "spell/util"
import { ElementFixture } from "spell/test-helpers/ElementFixture"
import type { SPACES } from "spell/app/spaces"
import { editor, type EditorStore } from "spell/app/app/editor"
import { ProjectDropdown, ProjectMenu, SpellPage, rememberedSizes, uiReady } from "spell/app/app/solid"
import { editorPrefs } from "spell/app/app/editorPrefs"

/**
 * The pages' shell in the browser (P8):  `<SpellPage>`,
 * `<ProjectMenu>` / `<ProjectDropdown>` on a fake project root.
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

describe("<ProjectMenu> / <ProjectDropdown>", () => {
  test("`<ProjectMenu>`:  loads its root, then lists its projects;  choosing one shows it", async () => {
    const showEditor = spyOnEditor("showEditor")
    const showRunner = spyOnEditor("showRunner")
    const root = fakeRoot(false)
    const host = await mount(() => (
      <>
        <ProjectMenu class="editing" direction="vertical" projectRoot={root} />
        <ProjectMenu class="running" projectRoot={root} useRunner />
      </>
    ))
    const editing = host.querySelector("ui-menu.ProjectMenu.editing")!
    expect(editing.getAttribute("direction")).toBe("vertical")
    expect(root.load).toHaveBeenCalled()
    expect(text(editing)).toBe("Loading...")

    Object.assign(root, { isLoaded: true })
    flush()
    await ElementFixture.settle(host)
    const items = [...editing.querySelectorAll<HTMLElement>(":scope > ui-item")]
    expect(items.map(text)).toEqual(["TaskList", "Solitaire"])
    expect(items[0].querySelector("ui-icon")!.getAttribute("name")).toBe("app store ios")
    items[1].click()
    expect(showEditor).toHaveBeenCalledWith("@spell/examples/Solitaire")
    host.querySelector<HTMLElement>("ui-menu.running > ui-item")!.click()
    expect(showRunner).toHaveBeenCalledWith("@spell/examples/TaskList")
  })

  test("`<ProjectMenu>`:  a root that fails to load says so", async () => {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    cleanups.push(() => warn.mockRestore())
    const root = fakeRoot(false)
    root.load = vi.fn(() => Promise.reject(new Error("no such folder")))
    const host = await mount(() => <ProjectMenu projectRoot={root} />)
    await expect.poll(() => (flush(), text(host.querySelector("ui-menu")!))).toBe("Couldn't load Examples")
    expect(warn).toHaveBeenCalled()
  })

  test("`<ProjectDropdown>`:  `editor.projectRoot`'s projects, showing `editor.project`;  choosing one shows it", async () => {
    const showRunner = spyOnEditor("showRunner")
    const root = fakeRoot(true)
    setEditor("projectRoot", root)
    setEditor("project", undefined)
    const host = await mount(() => <ProjectDropdown useRunner />)
    const dropdown = host.querySelector<HTMLElement & { value: string }>("ui-dropdown.ProjectDropdown")!
    // no label before it:  its trigger shows the group's icon
    expect(host.querySelector(".dropdown-label")).toBeNull()
    expect(host.querySelector(".ProjectDropdownTrigger > ui-icon")!.getAttribute("name")).toBe("app store ios")
    // no project yet:  loading
    expect(dropdown.hasAttribute("loading")).toBe(true)
    expect(dropdown.querySelectorAll("ui-item")).toHaveLength(0)

    editor.project = { path: "@spell/examples/TaskList" } as EditorStore["project"]
    flush()
    await ElementFixture.settle(host)
    expect(dropdown.hasAttribute("loading")).toBe(false)
    expect(dropdown.value).toBe("@spell/examples/TaskList")
    expect(text(host.querySelector(".ProjectDropdownTrigger")!)).toBe("TaskList")
    const items = [...dropdown.querySelectorAll(":scope > ui-item")]
    expect(items.map((item) => [item.getAttribute("value"), text(item), item.getAttribute("icon")])).toEqual([
      ["@spell/examples/TaskList", "TaskList", "app store ios"],
      ["@spell/examples/Solitaire", "Solitaire", "app store ios"]
    ])

    dropdown.dispatchEvent(new CustomEvent("ui-changed", { detail: { value: "@spell/examples/Solitaire" } }))
    expect(showRunner).toHaveBeenCalledWith("@spell/examples/Solitaire")
    // still showing `editor.project` until it changes
    expect(dropdown.value).toBe("@spell/examples/TaskList")
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

/** Text of `element`, trimmed. */
function text(element: Element): string {
  return element.textContent?.trim() ?? ""
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
