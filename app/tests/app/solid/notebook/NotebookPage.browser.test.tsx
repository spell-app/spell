import { afterEach, beforeAll, describe, expect, test, vi } from "vite-plus/test"
import { render } from "@solidjs/web"

import type { SP } from "spell/parser/spell"
// Import directly:  the test barrel holds node-only helpers
import { compiledSpellProject } from "spell/parser/spell/test/parseSpellProject"
import { uiReady } from "spell/app/app/solid/loadUI"
import type { NotebookController } from "spell/app/app/solid/notebook/NotebookController"
import { NotebookPage } from "spell/app/app/solid/notebook/NotebookPage"
// By file:  the folder's barrel loads the language service
import { SourceEdits } from "spell/app/lsp/SourceEdits"

// Spell UI's pack:  a spellx drawing names its components bare (`<button>`)
import "spell/app/spaces"
// Solid follows the program's things, as in the editor:  an edit draws again what changed
import "spell/app/app/solid/cellsBridge"

/**
 * `<NotebookPage>` in the browser (epic `notebook` P3):  the docs frame round a notebook page the PROGRAM draws.
 * - The runtime:  `spellRuntime.ts` as vite serves it, imported by its URL, as the runner's tests do;  the program
 *   (the notebook, compiled with its source marks) runs on it into the app's mount point, as the editor runs it.
 * - The editor is a stand-in:  typing into the file, and running the program again as it takes an edit
 *   (`runApp()` keeping its things, so `LiveEdit` draws again only what changed), as the editor's `typeInto()` and
 *   `compileApp()` do;  its history counts its steps.
 * - The file:  a plain object that counts its saves.
 */
vi.mock("spell/app/app/editor", () => ({ editor: testEditor }))

/** The editor, standing in:  see the file's docstring.  Made before the imports, as `vi.mock()` runs then. */
const testEditor = vi.hoisted(() => ({
  edits: 0,
  steps: 0,
  file: undefined as TestFile | undefined,
  loadRuntime: () => testRuntime(),
  showError: (error: unknown) => console.error(error),
  onFileEdited: () => {},
  setScopeExplorer: () => {},
  showFileAt: async () => {},
  showOpenPage: () => {},
  refreshDrafts: async () => {},
  /** Type `edits` into the file, then run the program again:  `editor.typeInto()`. */
  typeInto(file: TestFile, edits: Parameters<typeof SourceEdits.applied>[1]) {
    file.contents = SourceEdits.applied(file.contents, edits)
    testEditor.edits++
    void runProgram(file.contents)
  },
  /** One step of the history:  the change made at once. */
  history: {
    change(change: { file: TestFile; at: number; before: string; after: string }) {
      const { file, at, before, after } = change
      file.contents = file.contents.slice(0, at) + after + file.contents.slice(at + before.length)
      testEditor.edits++
      testEditor.steps++
    }
  },
  compileApp: async () => runProgram(testEditor.file!.contents)
}))

/** The Counter notebook:  a title, a view of its own, two sections each holding an example. */
const COUNTER = [
  '<spell-notebook "counter notebook">',
  "\t# A counter",
  "\tA button that counts its clicks.",
  "",
  '\t<spell-view "counter">',
  '\t\t<property "count">a number</>',
  '\t\t<action "create it">set its count to 0</>',
  '\t\t<action "count up">set its count to its count + 1</>',
  "\t\t<draw><button onClick={count up}>Clicked {its count} times</button></draw>",
  "\t</spell-view>",
  "",
  "\t## Try it",
  '\t<example "one counter">',
  "\t\t<counter/>",
  "\t</example>",
  "",
  "\t## Two of them",
  '\t<example "two counters">',
  "\t\t<counter/>",
  "\t\t<counter/>",
  "\t</example>",
  "</spell-notebook>",
  ""
].join("\n")

/** Undo for each test:  unmount. */
const cleanups: (() => void)[] = []

beforeAll(async () => {
  await uiReady
})

afterEach(() => {
  for (const cleanup of cleanups.splice(0).reverse()) cleanup()
})

describe("<NotebookPage>", () => {
  test("the program draws the page:  its sections, sticky and foldable, each example with its code editor in place", async () => {
    const { mount } = await mounted()
    await until(
      () => resultsOf(mount).length === 2 && editorsIn(mount).length === 2,
      () => resultsOf(mount).join(" | ")
    )
    expect(resultsOf(mount)).toEqual(["Clicked 0 times", "Clicked 0 times Clicked 0 times"])
    // each `##` a section of the page, as the docs site draws one
    const sections = [...mount.querySelectorAll("ui-section[label]")]
    expect(sections.map((section) => section.getAttribute("label"))).toEqual(["Try it", "Two of them"])
    for (const section of sections) expect(section.getAttribute("sticky")).toBe("stack")
  })

  test("typing in an example goes into the file, and the example drawn again keeps the same code editor, open", async () => {
    const { mount, file, controller } = await mounted()
    await until(() => editorsIn(mount).length === 2)
    const [example] = mount.querySelectorAll<HTMLElement>("spell-example")
    const [editor] = editorsIn(mount)
    example!.setAttribute("code", "")
    controller.editExample(placeOf(example!), "<counter/>\n<counter/>")
    expect(file.contents).toContain('\t<example "one counter">\n\t\t<counter/>\n\t\t<counter/>\n\t</example>')
    await until(
      () => resultsOf(mount)[0] === "Clicked 0 times Clicked 0 times",
      () => resultsOf(mount).join(" | ")
    )
    const [drawn] = mount.querySelectorAll<HTMLElement>("spell-example")
    await until(() => editorsIn(mount)[0] === editor)
    expect(drawn).not.toBe(example)
    expect(drawn!.hasAttribute("code")).toBe(true)
    expect(file.saves).toBe(0)
  })

  test("a lock is ONE step of the editor's history, and saves itself", async () => {
    const { file, controller } = await mounted()
    const steps = testEditor.steps
    controller.setLocked(true)
    expect(file.contents.split("\n")[0]).toBe('<spell-notebook "counter notebook" locked>')
    expect(testEditor.steps).toBe(steps + 1)
    await until(() => file.saves === 1)
    expect(controller.isLocked()).toBe(true)
  })

  test('"On this page":  the docs site\'s contents in a column, hidden by its Hide;  else a flyout from its icon', async () => {
    const { program, controller } = await mounted({ width: 1100 })
    const column = () => program.querySelector<HTMLElement>(".NotebookAside:not(.hidden)")
    const button = () => program.querySelector<HTMLElement>(".NotebookTocButton")
    const flyout = () => program.querySelector<HTMLElement>(".NotebookTocFlyout")
    const sectionLinks = (toc: Element | null | undefined) =>
      [...(toc?.shadowRoot?.querySelectorAll("[part~=section]") ?? [])].map((item) => item.textContent!.trim())
    await until(() => sectionLinks(column()?.querySelector("ui-toc")).length === 2)
    // room for the column:  Spell UI's `<ui-toc>`, headed by the page's title;  no icon
    expect(sectionLinks(column()!.querySelector("ui-toc"))).toEqual(["Try it", "Two of them"])
    expect(column()!.querySelector("ui-toc")!.getAttribute("heading")).toBe("A counter")
    expect(button()).toBeNull()
    // its Hide:  the icon gets it back, as a flyout
    column()!.querySelector<HTMLElement>(".NotebookTocHide")!.click()
    await until(() => !column() && !!button())
    expect(controller.contentsShown()).toBe(false)
    button()!.click()
    await until(() => sectionLinks(flyout()?.querySelector("ui-toc")).length === 2)
    // its "Show contents" pins it back as the column
    await until(() => !!flyout()?.querySelector(".NotebookTocShow"))
    flyout()!.querySelector<HTMLElement>(".NotebookTocShow")!.click()
    await until(() => !!column() && !flyout() && !button())
    // a narrow pane:  no column, the icon
    program.style.width = "500px"
    await until(() => !column() && !!button())
  })
})

/** A notebook file, standing in for the editor's `SP.SpellFile`:  its text, and how many times it's saved. */
type TestFile = { path: string; form: "spellx"; contents: string; match: unknown; saves: number; save(): Promise<void> }

/**
 * The Counter's page:  the app area (`program`) with its scroller and mount point, the program drawn there, and the
 * frame round it;  its controller, at the page's debug global.
 */
async function mounted(options: { width?: number } = {}) {
  const file: TestFile = {
    path: "/Counter.spellml",
    form: "spellx",
    contents: COUNTER,
    match: undefined,
    saves: 0,
    async save() {
      this.saves++
    }
  }
  testEditor.file = file
  const program = document.createElement("div")
  program.className = "AppPaneProgram NotebookPage ui-docs-sections"
  program.style.cssText = `height: 800px; position: relative; display: grid; grid-template-columns: minmax(0, 1fr) auto;`
  if (options.width) program.style.width = `${options.width}px`
  program.innerHTML = `<div id="${SCROLLER}" style="overflow: auto"><div id="spell-app-root"></div></div>`
  document.body.append(program)
  const mount = program.querySelector<HTMLElement>("#spell-app-root")!
  appRoot = mount
  await runProgram(COUNTER, { afresh: true })
  const project = { isLoaded: true, spellFiles: [file] }
  const dispose = render(
    () => (
      <NotebookPage
        file={file as unknown as SP.SpellFile}
        project={project as unknown as SP.SpellProject}
        program={program}
        scroller={SCROLLER}
      />
    ),
    program
  )
  cleanups.push(() => {
    dispose()
    program.remove()
  })
  const controller = (globalThis as unknown as { notebook: NotebookController }).notebook
  return { program, mount, file, controller }
}

/** Where the program draws, for this test. */
let appRoot: HTMLElement | undefined

/** Compile `contents` with its source marks and run it in `appRoot`, as the editor does:  an edit taken as it runs. */
async function runProgram(contents: string, { afresh = false } = {}) {
  const runtime = await testRuntime()
  const { code, map } = compiledSpellProject([{ path: "/Counter.spellml", contents }], { sourceMap: true })
  // the core's names it reads, as a project's compile imports them:  on its own first line, so its marks still fit
  const linked = code.replace(
    /^import \{ h \} from "@spell\/core"/,
    'import { core, h, View, Page } from "@spell/core"'
  )
  const placesFrom = map && JSON.stringify(map)
  const error = await runtime.runApp(linked, {
    appRoot,
    coreUrl: RUNTIME_URL,
    keepThings: !afresh,
    placesFrom,
    onRestartNeeded: () => {}
  })
  expect(error).toBeUndefined()
}

/** The id of the element scrolling the program's drawing. */
const SCROLLER = "notebook-test-scroller"

/** Each example's result's text, its views' shadow roots and all, in order:  not its code panel. */
function resultsOf(mount: HTMLElement): string[] {
  const deep = (node: Node): string =>
    node.nodeType === Node.TEXT_NODE
      ? (node.textContent ?? "")
      : [...((node as Element).shadowRoot?.childNodes ?? []), ...node.childNodes].map(deep).join("")
  return [...mount.querySelectorAll("spell-example")].map((example) =>
    [...example.childNodes]
      .filter((node) => !(node as Element).slot)
      .map(deep)
      .join(" ")
      .replace(/\s+/g, " ")
      .trim()
  )
}

/** Each example's code editor's panel, in order. */
function editorsIn(mount: HTMLElement): Element[] {
  return [...mount.querySelectorAll("spell-example > [slot=source]")]
}

/** Where `example` is written, from its mark:  its line and column, from 0. */
function placeOf(example: Element): { line: number; column: number } {
  const [, line, column] = /:(\d+):(\d+)$/.exec(example.getAttribute("data-spell-at") ?? "")!
  return { line: Number(line), column: Number(column) }
}

/** Wait until `ready()`, up to 10 seconds;  `what()` says what it found, if it never was. */
async function until(ready: () => boolean, what: () => string = () => "") {
  for (let waited = 0; waited < 10_000; waited += 50) {
    if (ready()) return
    await new Promise((resolve) => setTimeout(resolve, 50))
  }
  expect(ready(), `waited 10 seconds:  ${what()}`).toBe(true)
}

/** The runtime's URL:  also the program's `@spell/core`. */
const RUNTIME_URL = new URL("/src/app/runner/spellRuntime.ts", location.href).href

/** The runtime, as vite serves it. */
async function testRuntime() {
  return (await import(/* @vite-ignore */ RUNTIME_URL)) as typeof import("spell/app/app/runner/spellRuntime")
}
