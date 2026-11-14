import { editor, runtimeUrl } from "spell/app/app/editor"
import { loadRuntime, type SpellRuntime } from "spell/app/app/runner/loadRuntime"
import { appTexts } from "spell/app/app/ui/AppTexts"
import { SP } from "spell/parser/spell"
import spellEditorSpell from "spell/app/spaces/@spell/editor/spell-editor/SpellEditor.spell"

/**
 * The editor's own Spell (`.spell`, epic `editor` P6, its first stage of turtles):
 * - ONE project, `@spell/editor/spell-editor`, its one file `SpellEditor.spell` (epic `editor` P29):
 *   the app `spell editor`, whose views are the bar, the panes, the file tabs and the menus.
 *   - a project of the group `@spell/editor` (`app/spaces/@spell/editor/`, epic `editor` P22)
 *   - a `.spell` file there is imported as its compiled javascript, as text:  `compiledSpell()`, in `vite.shared.ts`
 * - It runs on the LAYOUT'S OWN copy of the runtime, never the one programs run on (`editor.loadRuntime()`):
 *   a program's run resets its runtime, lists every thing made on it in the Things tab, and writes on its console.
 *   - a build:  `loadRuntime()`, as each `<spell-viewer>` has its own
 *   - dev:  the same file with a query, which `runtimeCopyInDev()` (`vite.config.ts`) gives modules of its own:
 *     a `blob:` copy would still share them
 *   - every copy shares the page's one Solid and Spell UI
 * - NEVER imports `spell/parser/core` itself, the runtime's alone (`spellRuntime.ts`):  it'd be bundled here, a second copy.
 */

/** The query `runtimeCopyInDev()` follows, through the modules that hold a runtime's state. */
const DEV_COPY_QUERY = "?layout-copy"

/** The layout's copy of the runtime, and the URL compiled spell imports it by:  loaded once, as it's first asked for. */
function layoutRuntime(): Promise<{ runtime: SpellRuntime; coreUrl: string }> {
  loading ??= import.meta.env.DEV
    ? (import(/* @vite-ignore */ `${runtimeUrl()}${DEV_COPY_QUERY}`) as Promise<SpellRuntime>).then((runtime) => ({
        runtime,
        coreUrl: `${runtimeUrl()}${DEV_COPY_QUERY}`
      }))
    : loadRuntime(runtimeUrl())
  return loading
}
let loading: ReturnType<typeof layoutRuntime> | undefined

/** The group the editor's own Spell is a project of (epic `editor` P22). */
export const EDITOR_PIECES = "@spell/editor"

/** The editor's own Spell's project in `EDITOR_PIECES`, its one file `SpellEditor.spell` (epic `editor` P29). */
const EDITOR_PROJECT = "spell-editor"

/**
 * Is this page the editor built from your DRAFTS of its Spell?  `?pieces=draft` in its address (epic `editor` P22):
 * what the editor's own project shows in its app pane, a second editor in a frame, so the editor you're using never
 * runs a draft.
 */
export const isDraftEditor = new URLSearchParams(globalThis.location?.search ?? "").get("pieces") === "draft"

/**
 * The editor's own Spell, `SpellEditor.spell`, loaded ONCE for the page (epic `editor` P29):
 * the app `spell editor`, whose views the bar, the panes, the file tabs and the menus each draw.
 * - In the draft editor (`isDraftEditor`), its project is compiled here, from your drafts;
 *   one that doesn't compile keeps the last good compile, and says why.
 * - Its app is the layout copy's running app (`importCompiled()` resets the copy's runtime first):
 *   so an `<action "save"/>` in any of its views finds the app's action up its chain.
 * - throws if the runtime or the Spell can't load
 */
export function loadEditorSpell(): Promise<EditorSpell> {
  loadingEditor ??= loadEditor()
  return loadingEditor
}
let loadingEditor: Promise<EditorSpell> | undefined

/** `loadEditorSpell()`'s work, once. */
async function loadEditor(): Promise<EditorSpell> {
  const compiled = (isDraftEditor && (await draftOf(EDITOR_PROJECT))) || spellEditorSpell
  const { runtime, coreUrl } = await layoutRuntime()
  // The editor draws each view where it belongs:  an app in it must not start itself, as a program's does
  runtime.core.appLayout = true
  // its app the copy's running app:  `importCompiled()` resets the copy's runtime first
  const exports = await runtime.importCompiled(compiled, coreUrl)
  return {
    editor: exports.spellEditor as SpellEditorApp,
    exports,
    draw: (thing) => runtime.core.drawThing(thing),
    drawInPlace: (thing) => runtime.core.drawOwn(thing),
    parts: (parts) => editorParts(exports.EditorPart as new () => object, parts),
    useTitles: (titles) => runtime.core.useTitles(titles)
  }
}

/**
 * Project `project` of `EDITOR_PIECES` compiled from your drafts, in the page;  `undefined` if it doesn't compile
 * (said, as `layoutPieceBroken()` says it).
 * - NEVER throws.
 */
async function draftOf(project: string): Promise<string | undefined> {
  try {
    const drafted = new SP.SpellProject(`${EDITOR_PIECES}/${project}`)
    await drafted.compile()
    if (drafted.compiled) return drafted.compiled
    layoutPieceBroken(project, drafted.parseError ?? "")
  } catch (problem) {
    layoutPieceBroken(project, problem instanceof Error ? problem.message : String(problem))
  }
  return undefined
}

/**
 * Say that the editor's own Spell (its project, `spell-editor`) doesn't compile, so its last good compile is running:
 * the module the dev server writes for it calls this (`compiledSpell()`, `vite.shared.ts`;  epic `editor` P22).
 * - So a broken edit to the editor's own Spell never locks you out:  the editor still draws, and says why.
 * - NEVER throws.
 */
export function layoutPieceBroken(piece: string, problem: string): void {
  console.error(`The editor's piece ${piece} doesn't compile:`, problem)
  // once the page's first draw is under way, so the error shows where the editor shows errors
  queueMicrotask(() => editor.showError(appTexts.text("editorPieceBroken", { piece, problem })))
}

/**
 * `parts` made the Spell's editor parts (`an "editor part" is a thing`, `EditorPart`), each drawn by its `draw()`.
 * - So a view's place for one holds what its type says:  a plain `{ draw }` was no thing, and each warned.
 */
function editorParts<Name extends string>(
  EditorPart: new () => object,
  parts: Record<Name, DrawnByTheEditor>
): Record<Name, object> {
  const made = Object.entries<DrawnByTheEditor>(parts).map(([name, { draw }]) => [
    name,
    Object.assign(new EditorPart(), { draw })
  ])
  return Object.fromEntries(made) as Record<Name, object>
}

/** What the editor draws in a place a view of its Spell leaves for it:  a pane, a menu, a row. */
export type DrawnByTheEditor = {
  /** Its drawing, the editor's own. */
  draw: () => unknown
}

/** The editor's own Spell, as `loadEditorSpell()` answers it. */
export type EditorSpell = {
  /** Its app, `spell editor`:  its views, the state its menus follow, its actions. */
  editor: SpellEditorApp
  /** What its compiled javascript exports:  its classes, by their compiled names. */
  exports: Record<string, any>
  /** `thing` drawn as its own element (a view's `<spell-editor-file-tab-bar>`), for Solid to insert. */
  draw: (thing: unknown) => unknown
  /**
   * `thing`'s own drawing, with no element around it, for Solid to insert (`core.drawOwn()`):
   * so the page's sheets reach it, and what the editor draws in its holes.
   */
  drawInPlace: (thing: unknown) => unknown
  /**
   * `parts` as its editor parts (`an "editor part" is a thing`):  what the editor draws in its views' places for it,
   * ready to hand to a view, `Object.assign(app.editorBar, spell.parts({ you: { draw: ... } }))`.
   */
  parts: <Name extends string>(parts: Record<Name, DrawnByTheEditor>) => Record<Name, object>
  /** Show its titles in the page's language:  each English title's text in it (`appTexts.titles`). */
  useTitles: (titles: Record<string, string>) => void
}

/**
 * The app `spell editor`, as `SpellEditor.spell` compiles:  its views, and what the editor keeps in step.
 * - Each action of it is a method of its name (`save`, `showInspector` ...), which the editor's own replaces
 *   (`MenuBar.tsx`):  a row's click runs it through the core.
 */
export type SpellEditorApp = Record<string, unknown> & {
  editorBar: Record<string, unknown>
  editorLayout: Record<string, unknown>
  fileTabBar: Record<string, unknown>
  projectMenu: Record<string, unknown>
  fileMenu: BarMenuView
  editMenu: BarMenuView
  viewMenu: BarMenuView
  runMenu: BarMenuView
}

/** One of the bar's menus in `SpellEditor.spell`, a `bar menu`:  its title, the bar's word for it, in English. */
export type BarMenuView = Record<string, unknown> & { title: string }
