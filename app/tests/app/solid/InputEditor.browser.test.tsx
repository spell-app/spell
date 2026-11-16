import { afterEach, describe, expect, test, vi } from "vite-plus/test"
import { flush } from "solid-js"
import { render } from "@solidjs/web"
import { userEvent } from "vite-plus/test/browser"
import { EditorView } from "@codemirror/view"

import { reactiveObject } from "spell/util"
import type { SP } from "spell/parser/spell"
import { ElementFixture } from "spell/test-helpers/ElementFixture"
import { editor, type EditorStore } from "spell/app/app/editor"
import { editorPrefs } from "spell/app/app/editorPrefs"
import {
  CODE_POPUP_DEFAULTS,
  codeHover,
  codeMirrorOptionsFor,
  type CodePopupChoices
} from "spell/app/app/ui/codePopups"
import { CodeMirrorPopups } from "spell/app/app/ui/codemirror"
import type * as UIT from "spell/app/app/ui/ui.types"
import { uiReady } from "spell/app/app/solid"
import { CodeSettings } from "spell/app/app/solid/CodeSettings"
import { CodeShown } from "spell/app/app/solid/EditorMode"
import { FileDropdown } from "spell/app/app/solid/FileDropdown"
import { FileTabs } from "spell/app/app/solid/FileTabs"
import { InputEditor, InputRoot } from "spell/app/app/solid/InputEditor"
import { LazyCodeMirror } from "spell/app/app/solid/LazyCodeMirror"
import { OutputEditor } from "spell/app/app/solid/OutputEditor"

/**
 * The Solid source editors on real CodeMirror, in the browser:
 * `<InputEditor>` (lazy `<FileEditor>`, its error fallback), `<OutputEditor>`, `<FileDropdown>`, `<FileTabs>`.
 * - Files are FAKES, as spell cells (`reactiveObject()`):
 *   a `.js` file (no parse) with just what `FileStates` and `editor` read.
 * - Why:  a real `SpellProject` loads from the API server, which tests don't have.
 */

/** Undo for each test:  unmount, restore `editor` fields. */
const cleanups: (() => void)[] = []

afterEach(() => {
  for (const cleanup of cleanups.splice(0).reverse()) cleanup()
})

describe("<InputEditor>", () => {
  test("loads CodeMirror lazily, shows `editor.file`'s text, and an edit reaches the file", async () => {
    const onFileEdited = spyOnEditor("onFileEdited")
    const file = fakeFile("test-project/one.js", "let one = 1\n")
    setEditor("file", file)
    const host = await mount(() => <InputEditor />)
    const { view } = await waitForInputEditor(host)
    expect(host.querySelector(".InputEditor .CodeMirrorEditor .cm-editor")).not.toBeNull()
    expect(view.state.doc.toString()).toBe("let one = 1\n")

    // an edit typed:  into the file, through its state (`FileStates`), and on to `editor` (`LazyCodeMirror`)
    view.dispatch({ changes: { from: view.state.doc.length, insert: "two" }, userEvent: "input.type" })
    expect(file.contents).toBe("let one = 1\ntwo")
    expect(file.isDirty).toBe(true)
    expect(onFileEdited).toHaveBeenLastCalledWith(expect.objectContaining({ path: "test-project/one.js" }))
  })

  test("a new file shows in the same view, its own state;  `initialSelection` is selected once it's shown", async () => {
    setEditor("file", fakeFile("test-project/one.js", "one\n"))
    const host = await mount(() => <InputEditor />)
    const first = await waitForInputEditor(host)

    const two = fakeFile("test-project/two.js", "abc def\n")
    two.initialSelection = { anchor: { line: 0, ch: 4, offset: 4 }, head: { line: 0, ch: 7, offset: 7 } }
    editor.file = two
    flush()
    await expect.poll(() => editor.getInputEditor()?.view.state.doc.toString()).toBe("abc def\n")
    const { view } = editor.getInputEditor()!
    expect(editor.getInputEditor()).toBe(first)
    expect(host.querySelectorAll(".cm-editor")).toHaveLength(1)
    await expect
      .poll(() => view.state.sliceDoc(view.state.selection.main.from, view.state.selection.main.to))
      .toBe("def")
    expect(two.initialSelection).toBeUndefined()
  })

  test("unmounting destroys the editor;  `editor` forgets it", async () => {
    setEditor("file", fakeFile("test-project/one.js", "one\n"))
    const dispose = await mountKept(() => <InputEditor />)
    const { view } = await waitForInputEditor(dispose.host)
    expect(view.dom.isConnected).toBe(true)
    dispose()
    expect(view.dom.isConnected).toBe(false)
    expect(editor.getInputEditor()).toBeUndefined()
  })

  test("an error shows the plain-text fallback editor, and tells `showError`", async () => {
    const showError = vi.fn()
    const onInputChanged = spyOnEditor("onInputChanged")
    const file = fakeFile("test-project/broken.js", "broken text")
    // the file's state reads it (`FileStates`):  the normal editor throws as it shows the file
    Object.defineProperty(file.project, "spellFiles", {
      get() {
        throw new Error("Broken on purpose")
      }
    })
    setEditor("file", file)
    const host = await mount(() => <InputEditor showError={showError} />)
    await expect.poll(() => showError.mock.calls.length, { timeout: 20_000 }).toBeGreaterThan(0)
    expect(showError).toHaveBeenCalledWith(expect.objectContaining({ message: "Broken on purpose" }))
    const fallback = await viewIn(host)
    expect(fallback.state.doc.toString()).toBe("broken text")

    fallback.dispatch({ changes: { from: 11, insert: "!" }, userEvent: "input.type" })
    expect(onInputChanged).toHaveBeenCalledWith("broken text!")
  })
})

describe("<OutputEditor>", () => {
  test("shows the compiled javascript, read-only;  its view goes with it", async () => {
    const file = fakeFile("test-project/one.js", "")
    Object.assign(file, { compiled: "export const one = 1" })
    setEditor("file", file)
    const dispose = await mountKept(() => <OutputEditor />)
    const output = await viewIn(dispose.host)
    await expect.poll(() => output.state.doc.toString()).toBe("export const one = 1")
    expect(output.state.readOnly).toBe(true)
    dispose()
    expect(output.dom.isConnected).toBe(false)
  })
})

describe("<FileDropdown>", () => {
  test("lists the project's files, showing `editor.file`;  choosing one shows it", async () => {
    const showEditor = spyOnEditor("showEditor")
    const file = fakeFile("test-project/one.js", "")
    setEditor("project", file.project as unknown as EditorStore["project"])
    setEditor("file", file)
    const host = await mount(() => <FileDropdown showActions />)
    const dropdown = host.querySelector<HTMLElement & { value: string }>("ui-dropdown#FileDropdown")!
    expect(dropdown.hasAttribute("loading")).toBe(false)
    expect(dropdown.value).toBe("test-project/one.js")
    const items = [...dropdown.querySelectorAll(":scope > ui-item")]
    expect(items.map((item) => item.getAttribute("value") ?? item.getAttribute("kind") ?? text(item))).toEqual([
      "test-project/one.js",
      "test-project/two.js",
      "divider",
      "New File",
      "Duplicate File",
      "Rename File",
      "Delete File"
    ])
    // no "File:" label:  the file icon and name are its trigger
    expect(host.querySelector(".dropdown-label")).toBeNull()
    expect(text(host.querySelector(".FileDropdownTrigger")!)).toBe("one.js")

    dropdown.dispatchEvent(new CustomEvent("ui-changed", { detail: { value: "test-project/two.js" } }))
    expect(showEditor).toHaveBeenCalledWith("test-project/two.js")
    // still showing `editor.file` until it changes
    expect(dropdown.value).toBe("test-project/one.js")
  })

  test("a project's folders:  each a header over its files;  the trigger and the tabs say the whole name", async () => {
    const file = fakeFile("test-project/Button/Usage.spell", "")
    const row = (path: string, location: object) => ({ path, location, file: reactiveObject({ isDirty: false }) })
    ;(file.project as unknown as { imports: unknown[] }).imports = [
      row("test-project/Button/Usage.spell", { file: "Usage.spell", folder: "/Button/" }),
      row("test-project/Card.spell", { file: "Card.spell", folder: "/" }),
      row("test-project/Divider/Usage.spell", { file: "Usage.spell", folder: "/Divider/" }),
      row("test-project/Button/styles.css", { file: "styles.css", folder: "/Button/" })
    ]
    setEditor("project", file.project as unknown as EditorStore["project"])
    setEditor("file", file)
    const host = await mount(() => <FileDropdown />)
    const dropdown = host.querySelector<HTMLElement>("ui-dropdown#FileDropdown")!
    const items = [...dropdown.querySelectorAll(":scope > ui-item")]
    expect(items.map((item) => [item.getAttribute("kind") ?? "item", text(item)])).toEqual([
      ["item", "Card.spell"],
      ["header", "Button"],
      ["item", "Usage"],
      ["item", "styles.css"],
      ["header", "Divider"],
      ["item", "Usage"]
    ])
    expect(text(host.querySelector(".FileDropdownTrigger")!)).toBe("Button/Usage")
  })

  test("loading, with no items, until the project's loaded", async () => {
    const file = fakeFile("test-project/one.js", "")
    file.project.isLoaded = false
    setEditor("project", file.project as unknown as EditorStore["project"])
    setEditor("file", file)
    const host = await mount(() => <FileDropdown />)
    const dropdown = host.querySelector("ui-dropdown")!
    expect(dropdown.hasAttribute("loading")).toBe(true)
    expect(dropdown.querySelectorAll("ui-item")).toHaveLength(0)
    expect(host.querySelector(".dropdown-label")).toBeNull()

    file.project.isLoaded = true
    flush()
    expect(dropdown.hasAttribute("loading")).toBe(false)
    expect(dropdown.querySelectorAll("ui-item")).toHaveLength(2)
  })
})

describe("<InputRoot>", () => {
  test("the project's files as tabs over the editor, unless `showToolbar={false}`", async () => {
    const file = fakeFile("test-project/one.js", "one\n")
    setEditor("project", file.project as unknown as EditorStore["project"])
    setEditor("file", file)
    const host = await mount(() => <InputRoot />)
    const root = host.querySelector(".InputRoot")!
    expect(root.querySelector(":scope > .FileTabs")).not.toBeNull()
    expect(root.querySelector(":scope > .InputEditor")).not.toBeNull()
    await waitForInputEditor(host)

    const bare = await mount(() => <InputRoot showToolbar={false} />)
    expect(bare.querySelector(".FileTabs")).toBeNull()
  })

  test("`LazyCodeMirror.Loading` is what shows while CodeMirror loads", async () => {
    const host = await mount(() => <LazyCodeMirror.Loading />)
    expect(text(host.querySelector(".CodeMirrorEditor")!)).toBe("Loading editor…")
  })
})

describe("<FileTabs>", () => {
  /** The tabs, once the bar's Spell has loaded and drawn:  in the view's shadow root, the toolbar's own children. */
  async function tabsIn(host: HTMLElement): Promise<HTMLElement[]> {
    await vi.waitFor(
      () => {
        const row = host.querySelector(".FileTabs > :not(ui-menu)")?.shadowRoot?.querySelector("ui-toolbar")
        expect(row?.querySelectorAll(":scope > ui-item").length).toBeGreaterThan(0)
      },
      { timeout: 15000 }
    )
    const row = host.querySelector(".FileTabs > :not(ui-menu)")!.shadowRoot!.querySelector("ui-toolbar")!
    return [...row.querySelectorAll<HTMLElement>(":scope > ui-item")]
  }

  test("every file a tab, `editor.file` chosen;  a dot on one not saved;  a click shows its file", async () => {
    const showEditor = spyOnEditor("showEditor")
    const file = fakeFile("test-project/one.js", "")
    setEditor("project", file.project as unknown as EditorStore["project"])
    setEditor("file", file)
    const host = await mount(() => <FileTabs />)
    const tabs = await tabsIn(host)
    // its words are its `label`:  a drafted file's pen's tip holds words too (I92)
    expect(tabs.map((tab) => tab.getAttribute("label"))).toEqual(["one.js", "two.js"])
    expect(tabs.map((tab) => tab.hasAttribute("selected"))).toEqual([true, false])
    expect(tabs[0]!.querySelector(".NotSaved")!.hasAttribute("hidden")).toBe(true)

    file.isDirty = true
    flush()
    await vi.waitFor(() => expect(tabs[0]!.querySelector(".NotSaved")!.hasAttribute("hidden")).toBe(false))

    tabs[1]!.click()
    expect(showEditor).toHaveBeenCalledWith("test-project/two.js")
  })

  test("a right click on a tab shows that tab's file, not the next one's", async () => {
    const showEditor = spyOnEditor("showEditor")
    const file = fakeFile("test-project/one.js", "")
    setEditor("project", file.project as unknown as EditorStore["project"])
    setEditor("file", file)
    const host = await mount(() => <FileTabs />)
    const tabs = await tabsIn(host)
    expect(tabs[0]!.parentElement!.querySelector(":scope > .CodeMoreMenu")).toBeNull()
    tabs[0]!.dispatchEvent(new MouseEvent("contextmenu", { bubbles: true, composed: true, clientX: 10, clientY: 10 }))
    expect(showEditor).toHaveBeenLastCalledWith("test-project/one.js")
  })

  test("every file fits:  no list of every file, and no tab's ✕, even hovered (T77, T83)", async () => {
    const file = fakeFile("test-project/one.js", "")
    setEditor("project", file.project as unknown as EditorStore["project"])
    setEditor("file", file)
    const host = await mount(() => <FileTabs />)
    const tabs = await tabsIn(host)
    const row = tabs[0]!.parentElement!
    await ElementFixture.settle()
    expect(row.matches(":state(overflowing)")).toBe(false)
    expect(row.shadowRoot!.querySelector("[part~=all-items]")).toBeNull()
    // force:  an earlier test's right-click menu may still lie over the bar
    await userEvent.hover(tabs[1]!, { force: true })
    expect(tabs.map((tab) => getComputedStyle(tab.querySelector(".CloseTab")!).visibility)).toEqual([
      "hidden",
      "hidden"
    ])
  })

  test("the ✕ at the bar's far right hides the code, as the top bar's code icon does (T83)", async () => {
    const file = fakeFile("test-project/one.js", "")
    setEditor("project", file.project as unknown as EditorStore["project"])
    setEditor("file", file)
    const host = await mount(() => <FileTabs />)
    await tabsIn(host)
    const hide = host.querySelector(".FileTabs > :not(ui-menu)")!.shadowRoot!.querySelector<HTMLElement>(".HideCode")!
    expect(hide.getAttribute("title")).toBe("Hide the code")
    expect(CodeShown.isClosed(file.project.path)).toBe(false)
    hide.click()
    flush()
    expect(CodeShown.isClosed(file.project.path)).toBe(true)
    CodeShown.set(file.project.path, true)
    flush()
  })

  describe("more files than the bar's 8:  a tab's ✕ closes it, the file still in the list (T77)", () => {
    /**
     * 12 files, `two.js`, `file3.js` and `one.js` opened from the list, so they're the bar's tabs, `one.js` showing.
     * - `showEditor()` shows the file it's handed, as the editor does.
     */
    async function manyTabs() {
      const file = fakeFile("test-project/one.js", "", 10)
      setEditor("project", file.project as unknown as EditorStore["project"])
      setEditor("file", file)
      const showEditor = spyOnEditor("showEditor", ((path: string) => {
        const shows = path === file.path ? file : Object.assign(fakeFile(path, ""), { project: file.project })
        setEditor("file", shows as unknown as EditorStore["file"])
      }) as never)
      localStorage.removeItem("ui-toolbar-open-items")
      const host = await mount(() => <FileTabs />)
      const tabs = await tabsIn(host)
      const row = tabs[0]!.parentElement!
      await expect.poll(() => row.matches(":state(limited)")).toBe(true)
      /** The tabs in the bar, by name. */
      const shown = () => tabs.filter((tab) => !tab.hidden).map((tab) => tab.getAttribute("label"))
      const tab = (name: string) => tabs.find((each) => each.getAttribute("label") === name)!
      /** Pick `name` from the list of every file. */
      const pick = async (name: string) => {
        row.shadowRoot!.querySelector<HTMLButtonElement>("[part~=all-items]")!.click()
        await ElementFixture.settle()
        const rows = [...row.shadowRoot!.querySelectorAll<HTMLElement>("[part~=overflow-menu] .row")]
        expect(rows).toHaveLength(12)
        rows.find((each) => each.textContent?.trim() === name)!.click()
        await vi.waitFor(() => expect(shown()).toContain(name))
      }
      for (const name of ["two.js", "file3.js", "one.js"]) await pick(name)
      expect(shown()).toEqual(["one.js", "two.js", "file3.js"])
      showEditor.mockClear()
      return { file, host, tabs, row, shown, tab, pick, showEditor }
    }

    test("a tab's ✕ shows in its file icon's place only while hovered, and the tab keeps its width (T82)", async () => {
      const { tab } = await manyTabs()
      const close = (name: string) => tab(name).querySelector<HTMLElement>(".CloseTab")!
      const fileIcon = (name: string) => tab(name).querySelector<HTMLElement>(".TabIcon > ui-icon:not(.CloseTab)")!
      const width = (name: string) => tab(name).getBoundingClientRect().width
      expect(getComputedStyle(close("one.js")).visibility).toBe("hidden")
      expect(close("one.js").getAttribute("title")).toBe("Close")
      const before = width("two.js")
      await userEvent.hover(tab("two.js"))
      await vi.waitFor(() => expect(getComputedStyle(close("two.js")).visibility).toBe("visible"))
      expect(getComputedStyle(fileIcon("two.js")).visibility).toBe("hidden")
      expect(width("two.js")).toBe(before)
      // in the same spot:  their centres one
      const centre = (element: Element) => ((box) => box.left + box.width / 2)(element.getBoundingClientRect())
      expect(Math.abs(centre(close("two.js")) - centre(fileIcon("two.js")))).toBeLessThan(1)
    })

    test("a ✕ closes a tab:  out of the bar, its file not shown;  picked again from the list, it's back", async () => {
      const { shown, tab, pick, showEditor } = await manyTabs()
      tab("two.js").querySelector<HTMLElement>(".CloseTab")!.click()
      await vi.waitFor(() => expect(shown()).toEqual(["one.js", "file3.js"]))
      expect(showEditor).not.toHaveBeenCalled()
      expect(tab("one.js").hasAttribute("selected")).toBe(true)
      await pick("two.js")
      expect(showEditor).toHaveBeenLastCalledWith("test-project/two.js")
      expect(shown()).toEqual(["one.js", "two.js", "file3.js"])
    })

    test("closing the chosen tab shows its neighbour's file;  a middle click closes too", async () => {
      const { shown, tab, showEditor } = await manyTabs()
      tab("one.js").querySelector<HTMLElement>(".CloseTab")!.click()
      expect(showEditor).toHaveBeenLastCalledWith("test-project/two.js")
      await vi.waitFor(() => expect(shown()).not.toContain("one.js"))
      await vi.waitFor(() => expect(tab("two.js").hasAttribute("selected")).toBe(true))

      expect(shown()).toEqual(["two.js", "file3.js"])
      tab("file3.js").dispatchEvent(new MouseEvent("auxclick", { bubbles: true, composed: true, button: 1 }))
      await vi.waitFor(() => expect(shown()).toEqual(["two.js"]))
    })
  })
})

describe("CodeSettings", () => {
  test("a new editor starts on the defaults:  hover only with ⌥, suggestions only where they help, no details", async () => {
    setEditor("file", fakeFile("test-project/one.js", "one\n"))
    const host = await mount(() => <InputEditor />)
    const { view } = await waitForInputEditor(host)
    expect(CodeSettings.choices).toEqual(CODE_POPUP_DEFAULTS)
    expect(CodeMirrorPopups.of(view.state)).toEqual(codeMirrorOptionsFor(CODE_POPUP_DEFAULTS))
    expect(CodeMirrorPopups.of(view.state)).toMatchObject({ hoverInfo: "withAlt", suggest: "whereItHelps" })
    expect(codeHover.detail).toBe("plain")
    expect(view.dom.classList.contains("suggest-details-hidden")).toBe(true)
  })

  test("a choice applies at once to every editor, and is remembered", async () => {
    setEditor("file", fakeFile("test-project/one.js", "one\n"))
    const host = await mount(() => <InputEditor />)
    const { view } = await waitForInputEditor(host)
    choose("hover", "always")
    choose("suggest", "everywhere")
    choose("suggestDetails", true)
    choose("parameterHints", true)
    choose("pinnedLines", true)
    choose("compilerWords", true)
    expect(CodeMirrorPopups.of(view.state)).toMatchObject({
      hoverInfo: "always",
      suggest: "everywhere",
      suggestDetails: true,
      signatureHelp: true
    })
    expect(codeHover.detail).toBe("full")
    expect(view.dom.classList.contains("suggest-details-hidden")).toBe(false)
    expect(editorPrefs.get("codeHover")).toBe("always")
    expect(editorPrefs.get("codeSuggestDetails")).toBe(true)

    // a new editor takes them too
    const other = new EditorView({ parent: host, extensions: CodeMirrorPopups.extension() })
    expect(CodeMirrorPopups.of(other.state).hoverInfo).toBe("always")
    other.destroy()
  })

  test("Edit › Code Editor Settings… shows the settings panel over the code;  its controls choose", async () => {
    setEditor("file", fakeFile("test-project/one.js", "one\n"))
    const host = await mount(() => <InputRoot />)
    await waitForInputEditor(host)
    expect(host.querySelector(".CodeSettingsPanel")).toBeNull()
    CodeSettings.toggleShowing(true)
    cleanups.push(() => CodeSettings.toggleShowing(false))
    flush()
    await ElementFixture.settle(host)
    const panel = host.querySelector(".InputEditor .CodeSettingsPanel")!
    expect(panel).not.toBeNull()
    const hover = panel.querySelector<HTMLElement & { value: string }>("ui-select#CodeSettings-hover")!
    expect(hover.value).toBe("withAlt")
    expect([...hover.querySelectorAll("ui-item")].map(text)).toEqual(["Only with ⌥ (Alt) held", "Always", "Never"])

    cleanups.push(forgetChoices)
    hover.dispatchEvent(new CustomEvent("ui-changed", { detail: { value: "never" } }))
    const details = panel.querySelector("ui-checkbox[name=suggestDetails]")!
    details.dispatchEvent(new CustomEvent("ui-changed", { detail: { selected: true, value: "on" } }))
    flush()
    expect(CodeSettings.choices).toMatchObject({ hover: "never", suggestDetails: true })

    panel.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape", bubbles: true }))
    flush()
    expect(host.querySelector(".CodeSettingsPanel")).toBeNull()
  })
})

////////////////
// ## Helpers
////////////////

/** `CodeSettings.choose()`, put back to the defaults and forgotten after the test. */
function choose<K extends keyof CodePopupChoices>(key: K, value: CodePopupChoices[K]) {
  CodeSettings.choose(key, value)
  cleanups.push(forgetChoices)
}

/** Put every code setting back to its default, and forget the prefs. */
function forgetChoices() {
  for (const [key, value] of Object.entries(CODE_POPUP_DEFAULTS)) {
    CodeSettings.choose(key as keyof CodePopupChoices, value as never)
  }
  for (const pref of ["codeHover", "codeSuggest", "codeSuggestDetails", "codeParameterHints"]) editorPrefs.forget(pref)
}

/**
 * A fake file of a fake loaded project, as spell cells (`reactiveObject()`), with the other file `two.js`.
 * - Each import's `file` is a cell too:  `one.js` is this one when `path` names it, else a fake of its own.
 * - `more`:  that many more files after them, `file3.js` ...
 */
function fakeFile(path: string, contents: string, more = 0): FakeFile {
  const others = {
    one: reactiveObject({ isDirty: false }),
    two: reactiveObject({ isDirty: false })
  }
  const project = reactiveObject({
    path: "test-project",
    isLoaded: true,
    spellFiles: [] as SP.SpellFile[],
    imports: [
      { path: "test-project/one.js", location: { file: "one.js" }, file: others.one },
      { path: "test-project/two.js", location: { file: "two.js" }, file: others.two },
      ...Array.from({ length: more }, (_, index) => ({
        path: `test-project/file${index + 3}.js`,
        location: { file: `file${index + 3}.js` },
        file: reactiveObject({ isDirty: false })
      }))
    ],
    updatedContentsFor: vi.fn()
  })
  const file = reactiveObject({
    path,
    file: path.split("/").pop()!,
    contents,
    isLoaded: true,
    isDirty: false,
    project,
    initialSelection: undefined as UIT.EditorSelection | undefined
  }) as unknown as FakeFile
  const own = project.imports.find((each) => each.path === path)
  if (own) own.file = file as unknown as typeof own.file
  return file
}

/** What tests touch of a fake file;  `editor` takes it as a file. */
type FakeFile = SP.AnySpellFile & {
  contents: string
  isDirty: boolean
  project: { isLoaded: boolean; spellFiles: SP.SpellFile[] }
  initialSelection?: UIT.EditorSelection
}

/** Render `component` into a fresh `<div>` in the page, wait for its `<ui-*>` elements;  unmounted after the test. */
async function mount(component: () => unknown): Promise<HTMLElement> {
  const unmount = await mountKept(component)
  cleanups.push(unmount)
  return unmount.host
}

/**
 * `mount()`, but the test unmounts it:  returns `unmount()`, with `host` on it.
 * - The host leaves the page after the test either way.
 */
async function mountKept(component: () => unknown): Promise<(() => void) & { host: HTMLElement }> {
  await uiReady
  const host = document.createElement("div")
  host.style.height = "300px"
  document.body.append(host)
  const dispose = render(component as () => never, host)
  cleanups.push(() => host.remove())
  flush()
  await ElementFixture.settle(host)
  return Object.assign(dispose, { host })
}

/** The input editor in `host`, once CodeMirror has loaded and made it. */
async function waitForInputEditor(host: HTMLElement) {
  await expect.poll(() => host.querySelector(".cm-editor") && editor.getInputEditor(), { timeout: 20_000 }).toBeTruthy()
  return editor.getInputEditor()!
}

/** The CodeMirror view in `host`, once CodeMirror has loaded and made it. */
async function viewIn(host: HTMLElement): Promise<EditorView> {
  await expect.poll(() => host.querySelector(".cm-editor"), { timeout: 20_000 }).toBeTruthy()
  return EditorView.findFromDOM(host.querySelector<HTMLElement>(".cm-editor")!)!
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
