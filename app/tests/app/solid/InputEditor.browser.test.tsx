import { afterEach, describe, expect, test, vi } from "vite-plus/test"
import { flush } from "solid-js"
import { render } from "@solidjs/web"

import { reactiveObject } from "spell/util"
import type { SP } from "spell/parser/spell"
import { ElementFixture } from "spell/test-helpers/ElementFixture"
import { editor, type EditorStore } from "spell/app/app/editor"
import { editorPrefs } from "spell/app/app/editorPrefs"
import { CODE_POPUP_DEFAULTS, type CodePopupChoices } from "spell/app/app/ui/codePopups"
import type * as UIT from "spell/app/app/ui/ui.types"
import { uiReady } from "spell/app/app/solid"
import { CodeSettings } from "spell/app/app/solid/CodeSettings"
import { FileDropdown } from "spell/app/app/solid/FileDropdown"
import { FileTabs } from "spell/app/app/solid/FileTabs"
import { InputEditor, InputRoot } from "spell/app/app/solid/InputEditor"
import { LazyMonaco } from "spell/app/app/solid/LazyMonaco"
import { OutputEditor } from "spell/app/app/solid/OutputEditor"

/**
 * The Solid source editors on real Monaco, in the browser:
 * `<InputEditor>` (lazy `<FileEditor>`, its error fallback), `<OutputEditor>`, `<FileDropdown>`, `<FileTabs>`.
 * - Files are FAKES, as spell cells (`reactiveObject()`):
 *   a `.js` file (no parse) with just what `SpellModels` and `editor` read.
 * - Why:  a real `SpellProject` loads from the API server, which tests don't have.
 */

/** Undo for each test:  unmount, restore `editor` fields. */
const cleanups: (() => void)[] = []

afterEach(() => {
  for (const cleanup of cleanups.splice(0).reverse()) cleanup()
})

describe("<InputEditor>", () => {
  test("loads Monaco lazily, shows `editor.file`'s text, and an edit reaches the file", async () => {
    const onFileEdited = spyOnEditor("onFileEdited")
    const file = fakeFile("test-project/one.js", "let one = 1\n")
    setEditor("file", file)
    const host = await mount(() => <InputEditor />)
    const inputEditor = await waitForInputEditor(host)
    expect(host.querySelector(".InputEditor .MonacoEditor .monaco-editor")).not.toBeNull()
    expect(inputEditor.getValue()).toBe("let one = 1\n")
    expect(inputEditor.getModel()!.getLanguageId()).toBe("javascript")

    // a user edit:  into the file, through `SpellModels`, and on to `editor` (connected by `LazyMonaco`)
    inputEditor.setPosition({ lineNumber: 2, column: 1 })
    inputEditor.trigger("keyboard", "type", { text: "two" })
    expect(file.contents).toBe("let one = 1\ntwo")
    expect(file.isDirty).toBe(true)
    expect(onFileEdited).toHaveBeenLastCalledWith(expect.objectContaining({ path: "test-project/one.js" }))
  })

  test("a new file remakes the editor;  `initialSelection` is selected once it's made", async () => {
    setEditor("file", fakeFile("test-project/one.js", "one\n"))
    const host = await mount(() => <InputEditor />)
    const first = await waitForInputEditor(host)

    const two = fakeFile("test-project/two.js", "abc def\n")
    two.initialSelection = { anchor: { line: 0, ch: 4, offset: 4 }, head: { line: 0, ch: 7, offset: 7 } }
    editor.file = two
    flush()
    await expect.poll(() => editor.getInputEditor() !== first && editor.getInputEditor()?.getValue()).toBe("abc def\n")
    const second = editor.getInputEditor()!
    expect(host.querySelectorAll(".monaco-editor")).toHaveLength(1)
    expect(second.getModel()!.getValueInRange(second.getSelection()!)).toBe("def")
    expect(two.initialSelection).toBeUndefined()
  })

  test("unmounting disposes of the editor;  `editor` forgets it", async () => {
    setEditor("file", fakeFile("test-project/one.js", "one\n"))
    const dispose = await mountKept(() => <InputEditor />)
    const inputEditor = await waitForInputEditor(dispose.host)
    const { monaco } = await import("spell/app/app/solid/monaco")
    expect(monaco.editor.getEditors()).toContain(inputEditor)
    dispose()
    expect(monaco.editor.getEditors()).not.toContain(inputEditor)
    expect(editor.getInputEditor()).toBeUndefined()
  })

  test("an error shows the plain-text fallback editor, and tells `showError`", async () => {
    const showError = vi.fn()
    const onInputChanged = spyOnEditor("onInputChanged")
    const file = fakeFile("test-project/broken.js", "broken text")
    // `SpellModels.modelFor()` reads it:  the normal editor throws while rendering
    Object.defineProperty(file.project, "spellFiles", {
      get() {
        throw new Error("Broken on purpose")
      }
    })
    setEditor("file", file)
    const host = await mount(() => <InputEditor showError={showError} />)
    const fallback = await waitForInputEditor(host)
    expect(showError).toHaveBeenCalledWith(expect.objectContaining({ message: "Broken on purpose" }))
    expect(fallback.getValue()).toBe("broken text")
    expect(fallback.getModel()!.getLanguageId()).toBe("plaintext")

    fallback.setPosition({ lineNumber: 1, column: 12 })
    fallback.trigger("keyboard", "type", { text: "!" })
    expect(onInputChanged).toHaveBeenCalledWith("broken text!")
  })
})

describe("<OutputEditor>", () => {
  test("shows the compiled javascript, read-only;  its own model goes with it", async () => {
    const { monaco } = await import("spell/app/app/solid/monaco")
    const modelsBefore = monaco.editor.getModels().length
    const file = fakeFile("test-project/one.js", "")
    Object.assign(file, { compiled: "export const one = 1" })
    setEditor("file", file)
    const dispose = await mountKept(() => <OutputEditor />)
    await expect.poll(() => monaco.editor.getEditors().length).toBe(1)
    const output = monaco.editor.getEditors()[0]
    expect(output.getValue()).toBe("export const one = 1")
    expect(output.getOption(monaco.editor.EditorOption.readOnly)).toBe(true)
    expect(monaco.editor.getModels().length).toBe(modelsBefore + 1)
    dispose()
    expect(monaco.editor.getEditors()).toHaveLength(0)
    expect(monaco.editor.getModels().length).toBe(modelsBefore)
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
    expect(root.querySelector(":scope > .FileTabs > ui-toolbar.FileTabsRow")).not.toBeNull()
    expect(root.querySelector(":scope > .InputEditor")).not.toBeNull()
    await waitForInputEditor(host)

    const bare = await mount(() => <InputRoot showToolbar={false} />)
    expect(bare.querySelector(".FileTabs")).toBeNull()
  })

  test("`LazyMonaco.Loading` is what shows while Monaco loads", async () => {
    const host = await mount(() => <LazyMonaco.Loading />)
    expect(text(host.querySelector(".MonacoEditor")!)).toBe("Loading editor…")
  })
})

describe("<FileTabs>", () => {
  test("every file a tab, `editor.file` chosen;  a dot on one not saved;  a click shows its file", async () => {
    const showEditor = spyOnEditor("showEditor")
    const file = fakeFile("test-project/one.js", "")
    setEditor("project", file.project as unknown as EditorStore["project"])
    setEditor("file", file)
    const host = await mount(() => <FileTabs />)
    const tabs = [...host.querySelectorAll<HTMLElement>("ui-toolbar.FileTabsRow > ui-item")]
    expect(tabs.map(text)).toEqual(["one.js", "two.js"])
    expect(tabs.map((tab) => tab.hasAttribute("selected"))).toEqual([true, false])
    expect(host.querySelector(".NotSaved")).toBeNull()

    file.isDirty = true
    flush()
    expect(tabs[0]!.querySelector(".NotSaved")).not.toBeNull()

    tabs[1]!.click()
    expect(showEditor).toHaveBeenCalledWith("test-project/two.js")
  })
})

describe("CodeSettings", () => {
  test("a new editor starts on the defaults:  hover only with ⌥, suggestions only on Ctrl+Space, no details", async () => {
    setEditor("file", fakeFile("test-project/one.js", "one\n"))
    const host = await mount(() => <InputEditor />)
    const inputEditor = await waitForInputEditor(host)
    const { monaco } = await import("spell/app/app/solid/monaco")
    const option = monaco.editor.EditorOption
    expect(CodeSettings.choices).toEqual(CODE_POPUP_DEFAULTS)
    expect(inputEditor.getOption(option.hover).enabled).toBe("onKeyboardModifier")
    // ⌘ / Ctrl adds cursors, so ⌥ is the hover's key
    expect(inputEditor.getOption(option.multiCursorModifier)).not.toBe("altKey")
    expect(inputEditor.getOption(option.quickSuggestions)).toEqual({ other: "off", comments: "off", strings: "off" })
    expect(inputEditor.getOption(option.suggestOnTriggerCharacters)).toBe(false)
    expect(inputEditor.getOption(option.suggest).showInlineDetails).toBe(false)
    expect(inputEditor.getOption(option.parameterHints).enabled).toBe(true)
    expect(inputEditor.getContainerDomNode().classList.contains("suggest-details-hidden")).toBe(true)
  })

  test("a choice applies at once to every editor, and is remembered", async () => {
    setEditor("file", fakeFile("test-project/one.js", "one\n"))
    const host = await mount(() => <InputEditor />)
    const inputEditor = await waitForInputEditor(host)
    const { monaco } = await import("spell/app/app/solid/monaco")
    const option = monaco.editor.EditorOption
    choose("hover", "always")
    choose("suggest", "asYouType")
    choose("suggestDetails", true)
    choose("parameterHints", false)
    expect(inputEditor.getOption(option.hover).enabled).toBe("on")
    expect(inputEditor.getOption(option.multiCursorModifier)).toBe("altKey")
    expect(inputEditor.getOption(option.quickSuggestions)).toEqual({ other: "on", comments: "off", strings: "off" })
    expect(inputEditor.getOption(option.suggestOnTriggerCharacters)).toBe(true)
    expect(inputEditor.getOption(option.suggest).showInlineDetails).toBe(true)
    expect(inputEditor.getOption(option.parameterHints).enabled).toBe(false)
    expect(inputEditor.getContainerDomNode().classList.contains("suggest-details-hidden")).toBe(false)
    expect(editorPrefs.get("codeHover")).toBe("always")
    expect(editorPrefs.get("codeSuggestDetails")).toBe(true)

    // a new editor takes them too
    const other = monaco.editor.create(document.createElement("div"))
    expect(other.getOption(option.hover).enabled).toBe("on")
    other.dispose()
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
 */
function fakeFile(path: string, contents: string): FakeFile {
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
      { path: "test-project/two.js", location: { file: "two.js" }, file: others.two }
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

/** The input editor in `host`, once Monaco has loaded and made it. */
async function waitForInputEditor(host: HTMLElement) {
  await expect
    .poll(() => host.querySelector(".monaco-editor") && editor.getInputEditor(), { timeout: 20_000 })
    .toBeTruthy()
  return editor.getInputEditor()!
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
