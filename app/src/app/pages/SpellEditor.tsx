import type { RouteSectionProps } from "@solidjs/router"
import { Match, Show, Switch, createEffect, createSignal, onCleanup, onSettled } from "solid-js"
import { isServer, type JSX } from "@solidjs/web"

import { SP } from "spell/parser/spell"
import {
  Actions,
  AppBarMenus,
  AppMenu,
  AppRoot,
  ConsoleRoot,
  InputRoot,
  Inspector,
  InspectorData,
  InspectorPane,
  InspectHelp,
  AddPartButton,
  InspectAppButton,
  Palette,
  PaletteStrip,
  CodeShown,
  ChangeThisBox,
  PartMenu,
  InspectorToggle,
  ModeButtons,
  OutputEditor,
  OutputRoot,
  PROJECT_ICON,
  ProgramPanelShown,
  ProjectBarMenu,
  SpellBarMenu,
  SpellPage,
  SpellReference,
  ThemeMenu,
  TreeRoot,
  on,
  tracked,
  trackProjectRoot,
  rememberedSizes,
  type Mode
} from "spell/app/app/solid"
import { editor } from "spell/app/app/editor"
import { editorPrefs } from "spell/app/app/editorPrefs"
import { EDITOR_PIECES, isDraftEditor, loadLayoutPiece, type LayoutPiece } from "spell/app/app/layout/layoutSpell"
import editorBarSpell from "spell/app/spaces/@spell/editor/editor-bar/EditorBar.spellml"
import editorLayoutSpell from "spell/app/spaces/@spell/editor/editor-layout/EditorLayout.spellml"
import { appTexts, type AppTextKey } from "spell/app/app/ui/AppTexts"
// Import directly, NOT through the runner barrel, which brings the runners themselves
import { RunnerPane, type RunnerTab } from "spell/app/app/runner/RunnerPane"
import { CodeOutputPane, CodeOutputShown, FollowAlong } from "spell/app/app/solid/CodeOutput"
import { PageLoading } from "spell/app/app/solid/PageLoading"
import { NotebookController } from "spell/app/app/solid/notebook/NotebookController"
import { NotebookHeader } from "spell/app/app/solid/notebook/NotebookHeader"
import { NotebookMenu } from "spell/app/app/solid/notebook/NotebookCellTools"
import { NotebookPage } from "spell/app/app/solid/notebook/NotebookPage"
import { editorHotkeys } from "./editorHotkeys"
import { followRoute } from "./followRoute"
import type { EditorPage } from "./pages.types"

import "./SpellEditor.css"

/** The least width of the code's column, px, that holds the code and compiled code side by side. */
const OUTPUT_ROOM = 440

/****************
 * ### `<SpellEditor>`
 * A project's page, in each of the editor's modes (`mode`, `EditorMode`):
 * - Edit:  the code (`<InputRoot>`) on the left, the running program (`<AppPane>`) to its right (Owen, 2026-11-06).
 *   - The app takes every change of size:  dragging the code's bar gives the room to the app, or takes it,
 *     and the window growing or shrinking is the app's too (`appGrows()`).
 * - Run:  the program alone, the code column gone.
 *   - ONE page for both (Owen:  "a discontinuity in the page when I switch between run / edit"):
 *     switching keeps the page, its bar and the running program where they are;  only the code column comes and goes.
 *   - A phone only runs (epic `debut` P32):  Run, whatever the address says.
 * - The Program panel (`<ProgramPanel>`), while View › Program Panel shows it (`ProgramPanelShown`), sits under
 *   the code:  its output and compiled code.  Its Close hides it.
 * - Showing or hiding the panel never redraws the code or the program:  a pane that comes or goes moves no other.
 * - The compiled code, while someone's asked for it (`CodeOutputShown`) and there's room, sits beside the code.
 * - The panes are `<ui-split-panel>`s, their sizes remembered as dragged (`rememberedSizes()`).
 *   - How they're arranged is Spell, `EditorLayout.spellml`;  what's in each is still the editor's, handed over here,
 *     each a thing that draws itself.
 * - The palette, while it's kept open (`Palette.isPinned`), is a strip across the top of the panes.
 * - The Inspector, while it's open, is a pane at the far right, after the app (`<InspectorPane>`, epic `debut` P13);
 *   never in Run, which shows the app alone, and back as it was in Edit.
 *   It's a pane of the same panel, so the same room round it as the app, and a bar to drag it wider or narrower.
 *   - Its own remembered sizes (`spellEditor-columns-inspector`):  three panes, not two.
 *   - On a phone, a sheet that slides up over the page as something's picked (epic `debut` P17, Q6).
 * - SIDE EFFECT:  the page's keyboard shortcuts while it's up, outside Monaco (`editorHotkeys()`).
 * - SIDE EFFECT:  watches the open file for changes from outside while it's up (`editor.watchOpenFile()`).
 ****************/
export function SpellEditor(props: { mode: Mode }) {
  const isPhone = phoneWidth()
  const mode = (): Mode => (isPhone() ? "run" : props.mode)
  const isRunning = () => mode() === "run"
  editorHotkeys(isRunning)
  // a change to the open file from outside the editor:  read again, and taken as any edit
  onSettled(() => editor.watchOpenFile())
  // the code's column:  hidden in Run, and for a project with its code closed
  const hidesCode = () => isRunning() || CodeShown.isClosed(editor.project?.path)
  const showsProgramPanel = () => !hidesCode() && ProgramPanelShown.isShowing
  // the Inspector's pane:  never in Run, which is the app alone (Owen, 2026-11-07);  still open for Edit, and a phone's sheet
  const showsInspector = () => Inspector.isOpen && props.mode !== "run"
  const columns = rememberedSizes(() => columnsFor(hidesCode(), showsInspector(), !!CodeOutputShown.target))
  const codeRows = rememberedSizes(() => ({
    id: "spellEditor-left",
    sizes: showsProgramPanel() ? "65%" : "100%"
  }))
  // the compiled code beside the code, while there's room:  a narrow column keeps the code
  const [codeWidth, setCodeWidth] = createSignal(0)
  const watchCodeWidth = (column: Element) => {
    const watcher = new ResizeObserver(([entry]) => setCodeWidth(entry!.contentRect.width))
    watcher.observe(column)
    onCleanup(() => watcher.disconnect())
  }
  const outputTarget = () => (codeWidth() >= OUTPUT_ROOM ? CodeOutputShown.target : undefined)
  const codeColumns = rememberedSizes(() => ({
    id: "spellEditor-code-output",
    sizes: outputTarget() ? "50%,50%" : "100%"
  }))
  const parts = {
    code: {
      draw: () => (
        <div class="SplitPane" ref={watchCodeWidth}>
          <Show when={!hidesCode()}>
            <ui-split-panel class="EditorCodeOutput" columns={codeColumns.sizes()} resizable>
              <div class="SplitPane">
                <InputRoot />
              </div>
              <Show when={outputTarget()} keyed>
                {(target) => (
                  <div class="SplitPane">
                    <CodeOutputPane target={target} />
                  </div>
                )}
              </Show>
            </ui-split-panel>
          </Show>
        </div>
      )
    },
    programPanel: {
      draw: () => (
        <Show when={showsProgramPanel()}>
          <div class="SplitPane">
            <ProgramPanel onClose={() => ProgramPanelShown.set(false)} />
          </div>
        </Show>
      )
    },
    app: {
      draw: () => (
        <div class="SplitPane">
          <AppPane />
        </div>
      )
    },
    inspector: {
      draw: () => (
        <Show when={showsInspector()}>
          <InspectorPane />
        </Show>
      )
    }
  }
  const settings = () => ({
    columns: columns.sizes(),
    codeRows: codeRows.sizes(),
    grows: appGrows(hidesCode()),
    mode: hidesCode() ? "run" : "edit"
  })
  const layout = drawnPiece(editorLayoutSpell, "editor-layout", "editorLayout", () => ({ ...parts, ...settings() }))
  createEffect(settings, (changed) => {
    const thing = layout.thing()
    if (thing) Object.assign(thing, changed)
  })
  /** A bar let go in the column of code, or between the columns:  the panels' own, not a control's in a pane. */
  const keepSizes = (event: CustomEvent<{ sizes: string }>) => {
    const panel = event.target as Element
    if (panel.matches(".EditorColumns")) columns.save(event.detail.sizes)
    else if (panel.matches(".EditorCode")) codeRows.save(event.detail.sizes)
    else if (panel.matches(".EditorCodeOutput")) codeColumns.save(event.detail.sizes)
  }
  return (
    <SpellPage id="SpellEditor" fillWindow dark rows>
      <EditorToolbar mode={mode()} />
      <Show when={!isRunning() && Palette.isPinned}>
        <PaletteStrip />
      </Show>
      <PartMenu />
      <ChangeThisBox />
      <FollowAlong />
      <div class="EditorLayoutPlace" ref={on("ui-changed", keepSizes)}>
        {layout.drawing()}
        {/* no Spell:  every pane still, arranged the same, so a person can go on */}
        <Show when={layout.isBroken()}>
          <ui-split-panel class="EditorColumns" columns={columns.sizes()} grows={appGrows(hidesCode())} resizable>
            <ui-split-panel class="EditorCode" rows={codeRows.sizes()} resizable hidden={hidesCode()}>
              {parts.code.draw()}
              {parts.programPanel.draw()}
            </ui-split-panel>
            {parts.app.draw()}
            {parts.inspector.draw()}
          </ui-split-panel>
        </Show>
      </div>
    </SpellPage>
  )
}

/**
 * The thing `name` of the layout piece `compiled`, once it's loaded, and its drawing.
 * - `pieceProject`:  its project in the group `@spell/editor` (`editor-layout` ...), compiled from your drafts in the draft editor.
 * - `values()`:  what it's given before it first draws:  the things it draws, and its settings.
 * - The page's hero stays up while it loads (`PageLoading`).
 * - Call in a component body.
 * - NEVER throws:  a piece that won't load says so on the console, and `isBroken()`, for a plain stand-in.
 */
function drawnPiece(compiled: string, pieceProject: string, name: string, values: () => object) {
  const [piece, setPiece] = createSignal<LayoutPiece>()
  const [isBroken, setBroken] = createSignal(false)
  let isGone = false
  const release = PageLoading.hold()
  onCleanup(() => {
    isGone = true
    release()
  })
  void loadLayoutPiece(compiled, pieceProject)
    .then(
      (loaded) => {
        if (isGone) return
        Object.assign(loaded.exports[name], values())
        setPiece(() => loaded)
      },
      (problem: unknown) => {
        console.error(`can't load the Spell of ${name}`, problem)
        setBroken(true)
      }
    )
    .finally(release)
  return {
    /** The thing, once loaded. */
    thing: (): object | undefined => piece()?.exports[name],
    /** What it draws, once loaded. */
    drawing: () => piece()?.draw(piece()!.exports[name]) as JSX.Element,
    isBroken
  }
}

/****************
 * ### `<AppPane>`
 * The running program, with no header of its own:  its tools are the top bar's (epic `debut` P32).
 * - The program's mount point (`<AppRoot>`) is drawn once, and never redrawn.
 * - Its body is the area the Inspector picks parts in (`Inspector.watch()`).
 * - While a sample stands in for a data place, a bar across its top says so (`<SampleBar>`, epic `editor` P26).
 * - Shown in every mode, Run's too:  the page keeps it as the code column comes and goes.
 * - A NOTEBOOK page (a `.spellml` page with the `notebook` flag, epic `notebook` P3) is the running program's own
 *   drawing too, in the same place, inside the docs frame the editor adds round it (`<NotebookPage>`):
 *   its look, "On this page", and each example's code editor, in place.
 *   - It keeps a header of its own, a pane's one bar:  its title, a menu of the project's notebooks, the lock after it,
 *     and what a locked page's edits are (`<NotebookHeader>`);  at the header's right end, its ⋯ menu (`<NotebookMenu>`).
 * - One of the editor's own pieces (the group `@spell/editor`, epic `editor` P22) shows the editor ITSELF, built from your
 *   drafts of its pieces, in a frame of its own (`<DraftEditorFrame>`):  the editor you're using never runs a draft.
 ****************/
export function AppPane() {
  const root = trackProjectRoot(() => undefined)
  const title = tracked(() => (editor.project ? new SP.SpellProject(editor.project.path).title : ""))
  const notebook = tracked(() => notebookOf(editor.project, editor.file))
  const [notebookPage, setNotebookPage] = createSignal<NotebookController>()
  // one of the editor's own pieces, outside the draft editor:  its app is the editor itself, from your drafts
  const isEditorPiece = tracked(() => !isDraftEditor && !!editor.project?.path.startsWith(`${EDITOR_PIECES}/`))
  // the app area, once drawn:  the notebook's frame watches the program's drawing in it
  let program: HTMLDivElement | undefined
  return (
    <div class="AppPane">
      <Show when={notebookPage()} keyed>
        {(page) => (
          <NotebookHeader controller={page} icon={root().icon ?? PROJECT_ICON} title={title()}>
            {/* the notebook's ⋯, last:  Add below, Move, Delete, on the cell last clicked */}
            <NotebookMenu controller={page} />
          </NotebookHeader>
        )}
      </Show>
      <SampleBar />
      <div class="AppPaneBody ui-content-size" ref={(area) => onCleanup(Inspector.watch(area))}>
        <Show when={isEditorPiece()}>
          <DraftEditorFrame />
        </Show>
        <div
          class={[
            "AppPaneProgram",
            { hidden: isEditorPiece(), NotebookPage: !!notebook(), "ui-docs-sections": !!notebook() }
          ]}
          ref={(element: HTMLDivElement) => (program = element)}
        >
          <AppRoot showToolbar={false} containerId={APP_SCROLLER} />
          <div class="EmptyAppPrompt">{appTexts.text("emptyAppPrompt")}</div>
          <Show when={notebook()} keyed>
            {(file) => (
              <NotebookPage
                file={file}
                project={editor.project!}
                program={program!}
                scroller={APP_SCROLLER}
                onController={setNotebookPage}
              />
            )}
          </Show>
        </div>
      </div>
    </div>
  )
}

/** The id of the element scrolling the running program's drawing:  "On this page" follows it. */
const APP_SCROLLER = "spell-app-scroller"

/****************
 * ### `<SampleBar>`
 * The app pane's header while a sample stands in for a data place (epic `editor` P26):
 * says plainly that what shows is sample data, so nobody mistakes it for the real thing.
 * - Its button puts the real places back (`InspectorData.showFrom()`).
 * - No row of its own while every place is the real one.
 ****************/
function SampleBar(): JSX.Element {
  const samples = tracked(() => InspectorData.samplesInUse)
  return (
    <Show when={samples().length}>
      <div class="SampleBar" role="status">
        <ui-icon name="flask" />
        <span class="SampleBarWords">
          {appTexts.text("sampleInUse", {
            places: InspectorData.listWords(samples().map(InspectorData.placeWords))
          })}
        </span>
        <ui-button
          size="mini"
          onClick={() => {
            for (const placeName of samples()) void InspectorData.showFrom(placeName, "real place")
          }}
        >
          {appTexts.text("useRealData")}
        </ui-button>
      </div>
    </Show>
  )
}

/****************
 * ### `<DraftEditorFrame>`
 * The editor built from your drafts of its own pieces, in a frame:  a second editor, beside the one you're using (epic `editor` P22).
 * - A frame of its own, as the theme editor's pages are, so the two editors share nothing:  not `editor`, not Solid, not the page.
 * - It opens on Counter, the smallest app there is, and loads again after each compile of the piece you're editing,
 *   so a saved draft shows here first;  Publish makes it the editor you're using.
 * - Its pieces compile in its own page, from your drafts (`isDraftEditor`, `loadLayoutPiece()`).
 ****************/
function DraftEditorFrame(): JSX.Element {
  const source = tracked(() => `/edit/@spell/examples/Counter?pieces=draft&compile=${editor.edits}`)
  return <iframe class="DraftEditorFrame" title={appTexts.text("draftEditorTitle")} src={source()} />
}

/****************
 * ### `<ProgramPanel>`
 * Debug's panel under the code:  one pane of tabs (`<RunnerPane>`), as VS Code's runner panel has.
 * - Output:  what the program logged, and how compiling and running it went (`<ConsoleViewer>`).
 * - JavaScript:  the compiled code (`<OutputRoot>`);  TypeScript and Python:  the project as those targets write it.
 * - The file's other form, a read-only view (epic `elemental-spell` J95:  a template lives in ONE file):
 *   - Code Spell, on a `.spellml` file:  the code spell it means (`SX.CodeSpellWriter`;  P8)
 *   - Spellx, on a `.spell` file:  it written as spellx (`SX.SpellxWriter`)
 * - Sentence:  the spell tree of the cursor's line (`<TreeRoot>`).
 * - Reference:  what you can use, your app's templates and Spell's (`<SpellReference>`), its search in this header.
 * - At the right, whatever tab shows:  Clear Console, on Output only, the Reference's search, and Close (`onClose`).
 * - Remembers which tab shows, as the editor's preference `spellEditor:programTab`:
 *   a tab remembered from before, Things or Templates, shows Program Output.
 * - What the app made is the Inspector's Views card, its things not drawn among them (epic `editor` P19).
 ****************/
export function ProgramPanel(props: { onClose: () => void }) {
  const remembered = editorPrefs.get(TAB_PREF) as ProgramTabId
  const [filter, setFilter] = createSignal("")
  const [tab, setTab] = createSignal<ProgramTabId>(PROGRAM_TABS.includes(remembered) ? remembered : "output")
  // which form the file is in:  its other form is the `spell` tab's view
  const form = tracked(() => (editor.file instanceof SP.SpellFile ? editor.file.form : undefined))
  return (
    <RunnerPane
      class="ProgramPanel"
      tabs={PROGRAM_TABS.map((id) => tabFor(id, form()))}
      pane={tab()}
      onPane={showTab}
      tools={
        <>
          <Show when={tab() === "output"}>
            <Actions.clearConsole iconOnly />
          </Show>
          <Show when={tab() === "reference"}>
            <ui-input
              class="ReferenceSearch"
              size="mini"
              icon="search"
              aria-label={appTexts.text("paletteSearch")}
              placeholder={appTexts.text("paletteSearch")}
              ref={on<{ value: string }>("ui-typed", (event) => setFilter(event.detail.value))}
            />
          </Show>
          <ui-icon
            name="close"
            link=""
            class="IconAction close"
            label={appTexts.text("closeProgram")}
            title={appTexts.text("closeProgram")}
            onClick={() => props.onClose()}
          />
        </>
      }
    >
      <Switch>
        <Match when={tab() === "output"}>
          <ConsoleRoot showToolbar={false} />
        </Match>
        <Match when={tab() === "javascript"}>
          <OutputRoot showToolbar={false} />
        </Match>
        <Match when={tab() === "typescript"}>
          <OutputEditor showError={editor.showError} target="ts/solid" />
        </Match>
        <Match when={tab() === "python"}>
          <OutputEditor showError={editor.showError} target="py" />
        </Match>
        <Match when={tab() === "spell" && form() === "spellx"}>
          <OutputEditor showError={editor.showError} target="spell" />
        </Match>
        <Match when={tab() === "spell"}>
          <OutputEditor showError={editor.showError} target="spellx" />
        </Match>
        <Match when={tab() === "tree"}>
          <TreeRoot showToolbar={false} />
        </Match>
        <Match when={tab() === "reference"}>
          <SpellReference filter={filter()} />
        </Match>
      </Switch>
    </RunnerPane>
  )

  /** Show tab `id`, and remember it. */
  function showTab(id: ProgramTabId) {
    setTab(id)
    editorPrefs.set(TAB_PREF, id)
  }
}

/**
 * `project`'s notebook, if it's one (`NotebookController.notebooksIn()`).
 * - The one open in the editor (`open`), when it's a notebook:  a project of several shows each at its own address,
 *   `/edit/@spell/notebooks/Avatar/Usage.spellml` (epic `elemental-spell` P18).
 * - Else its first.
 */
function notebookOf(
  project: SP.SpellProject | undefined,
  open: { path?: string } | undefined
): SP.SpellFile | undefined {
  const notebooks = NotebookController.notebooksIn(project)
  return notebooks.find((file) => file.path === open?.path) ?? notebooks[0]
}

/**
 * The page's columns and the preference that remembers their sizes, for each set of panes:
 * code or not (Run), the Inspector or not.
 * - The Inspector starts 380px wide, as the Theme Creator's;  never narrower than 300px (`SpellEditor.css`).
 */
function columnsFor(isRunning: boolean, isInspecting: boolean, hasOutput: boolean): { id: string; sizes: string } {
  const isWide = hasOutput && !isRunning
  // Edit's are the names they had before the code's 2 days at the far right (`-edit`, 2026-11-04 to 11-06):
  // what they remember is for panes in this order, code first
  const id = `spellEditor-columns${isRunning ? "-run" : ""}${isWide ? "-output" : ""}${isInspecting ? "-inspector" : ""}`
  if (!isInspecting && !isWide) return { id, sizes: "" }
  // with compiled code beside it, the code's column takes room from the app's, so both can be read
  const code = isWide ? "65%" : "*"
  const panes = [...(isRunning ? [] : [code]), "*", ...(isInspecting ? ["380px"] : [])]
  return { id, sizes: panes.join(",") }
}

/**
 * Which of the columns takes every change of size (`<ui-split-panel grows>`):  the app's, by its place across.
 * - A hidden pane isn't counted:  with the code showing the app is 2nd, without it (Run, code closed) first.
 */
function appGrows(hidesCode: boolean): string {
  return hidesCode ? "first" : "2"
}

/** Tabs of `<ProgramPanel>`, in order;  `spell` is the file's other form, code spell or spellx (`tabFor()`). */
const PROGRAM_TABS = ["output", "javascript", "typescript", "python", "spell", "tree", "reference"] as const
/** One of `<ProgramPanel>`'s tabs. */
type ProgramTabId = (typeof PROGRAM_TABS)[number]
/** Icon of each tab (Fomantic's names, else Font Awesome's), and its title's key. */
const TAB_LOOKS: Record<ProgramTabId, { icon: string; text: AppTextKey }> = {
  output: { icon: "list", text: "outputTab" },
  javascript: { icon: "js", text: "javascriptTab" },
  typescript: { icon: "code", text: "typescriptTab" },
  python: { icon: "python", text: "pythonTab" },
  spell: { icon: "file alternate outline", text: "codeSpellTab" },
  tree: { icon: "tree", text: "treeTab" },
  reference: { icon: "book", text: "referenceTab" }
}
/** The preference that remembers which tab `<ProgramPanel>` shows. */
const TAB_PREF = "programTab"
// TODO:  drop the rename once every browser has opened the editor since epic `prefs-and-undo` P1
editorPrefs.declare(TAB_PREF, { oneOf: PROGRAM_TABS }).rename("spellEditor.programTab", TAB_PREF)

/**
 * Tab `id`, titled in the page's language.
 * - `spell`, the file's other form:  "Code Spell" on a `.spellml` file, "Spellx" on a `.spell` file (`form`).
 */
function tabFor(id: ProgramTabId, form: SP.SpellForm | undefined): RunnerTab<ProgramTabId> {
  const text = id === "spell" && form !== "spellx" ? "spellxTab" : TAB_LOOKS[id].text
  return { id, icon: TAB_LOOKS[id].icon, title: appTexts.text(text) }
}

/****************
 * ### `<EditorToolbar>`
 * The editor's top bar (epic `debut` P32, as Owen drew it):
 * - left:  Spell's menu (its hat and name:  the group's projects, Home), the project's menu (its name),
 *   then File · Edit · View · Run · Help (`MenuBar.tsx`)
 * - middle:  Run | Edit, then in Edit, Inspect app and the code's icon, in the same group
 * - right, ONE group of icons:  Run:  Restart, the theme, you;  Edit:  Add and the Inspector's menu, a thin
 *   line, then Restart, the theme, you
 * - `mode`:  the page's, pressed in `<ModeButtons>`.
 * - How they're arranged is Spell, `EditorBar.spellml`;  what's in each is still the editor's, handed over here, each a thing that
 *   draws itself.
 * - A phone runs only:  no app menus, no Run | Edit (`chrome.css`).
 * - Its spacing is the top bar's one rule (`chrome.css`):  60px between groups, 12px between icons.
 ****************/
export function EditorToolbar(props: { mode: Mode }) {
  const parts = {
    spellMenu: { draw: () => <SpellBarMenu useRunner={props.mode === "run"} /> },
    projectMenu: { draw: () => <ProjectBarMenu /> },
    appMenus: { draw: () => <AppBarMenus mode={props.mode} /> },
    modeButtons: {
      draw: () => <ModeButtons current={props.mode} inspect={<InspectAppButton id={INSPECT_APP_ID} item />} />
    },
    tools: {
      draw: () => (
        <>
          <Show when={props.mode === "edit"}>
            <AddPartButton />
            <InspectHelp for={INSPECT_APP_ID} />
            <InspectorToggle />
            <span class="BarToolsLine" role="separator" />
          </Show>
          <Actions.restartApp iconOnly />
          <ThemeMenu />
        </>
      )
    },
    you: { draw: () => <Actions.you /> }
  }
  const bar = drawnPiece(editorBarSpell, "editor-bar", "editorBar", () => parts)
  return (
    <div class="EditorBarPlace">
      {bar.drawing()}
      {/* no Spell:  every menu still, in a plain row, so a person can go on */}
      <Show when={bar.isBroken()}>
        <AppMenu class="EditorBar">
          {parts.spellMenu.draw()}
          {parts.projectMenu.draw()}
          {parts.appMenus.draw()}
          {parts.modeButtons.draw()}
          {parts.tools.draw()}
          {parts.you.draw()}
        </AppMenu>
      </Show>
    </div>
  )
}

/** Inspect app's button's id:  its help popup's target. */
const INSPECT_APP_ID = "InspectApp"

/****************
 * ### `<ProjectPageRoute>`
 * The `/edit/...` and `/run/...` routes:  `<SpellEditor>`, showing the project / file the URL names (`followRoute()`),
 * in Run for `/run/`, else in Edit.
 * - ONE route for both:  it stays mounted while only the URL's params change, the page (`edit`, `run`) too,
 *   so switching between Run and Edit, or between files, doesn't redraw the page.
 ****************/
export function ProjectPageRoute(props: RouteSectionProps) {
  const page = (): EditorPage => (props.params.page === RUN_PAGE ? "runner" : "editor")
  followRoute(() => props.params, page)
  return <SpellEditor mode={page() === "runner" ? "run" : "edit"} />
}

/**
 * Is the window a phone's (Spell UI's `--ui-mobile`, 767px and narrower), as an accessor that follows it.
 * - Call in a component body:  its listener goes with the component.
 */
function phoneWidth(): () => boolean {
  if (isServer) return () => false
  const query = window.matchMedia(PHONE_QUERY)
  const [isPhone, setPhone] = createSignal(query.matches)
  const follow = () => setPhone(query.matches)
  query.addEventListener("change", follow)
  onCleanup(() => query.removeEventListener("change", follow))
  return isPhone
}

/** Spell UI's phone width (`--ui-mobile`, `spell/ui/styles/media.css`). */
const PHONE_QUERY = "(width <= 767px)"

/** The run page's word in its URL, `/run/...`. */
const RUN_PAGE = "run"
