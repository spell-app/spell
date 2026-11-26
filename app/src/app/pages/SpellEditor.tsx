import { useBeforeLeave, type BeforeLeaveEventArgs, type RouteSectionProps } from "@solidjs/router"
import { Match, Show, Switch, createEffect, createSignal, onCleanup, onSettled, untrack } from "solid-js"
import { isServer, type JSX } from "@solidjs/web"

import { beforeNextPaint } from "spell/util/timing"
import { SP } from "spell/parser/spell"
import { SPACES } from "spell/app/spaces"
import {
  Actions,
  AppBarMenus,
  AppMenu,
  AppRoot,
  ConsoleRoot,
  EditorMode,
  EditorZones,
  InputRoot,
  Inspector,
  InspectorData,
  InspectorPane,
  InspectHelp,
  AnatomyButton,
  AppAnatomy,
  AppAnatomyView,
  DesignStage,
  InspectAppButton,
  PaletteRail,
  Preview,
  CodeShown,
  ChangeThisBox,
  PartMenu,
  ModeButtons,
  PublishDraft,
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
import {
  loadEditorSpell,
  type DrawnByTheEditor,
  type EditorSpell,
  type SpellEditorApp
} from "spell/app/app/layout/layoutSpell"
import type { EditorMemberName, EditorPartName } from "spell/app/app/layout/editorNames"
import { appTexts, type AppTextKey } from "spell/app/app/ui/AppTexts"
// Import directly, NOT through the runner barrel, which brings the runners themselves
import { RunnerPane, type RunnerTab } from "spell/app/app/runner/RunnerPane"
import { CodeOutputPane, CodeOutputShown, CompiledCodeButton, FollowAlong } from "spell/app/app/solid/CodeOutput"
import { PageLoading } from "spell/app/app/solid/PageLoading"
import { NotebookController } from "spell/app/app/solid/notebook/NotebookController"
import { NotebookPageCells } from "spell/app/app/solid/notebook/NotebookPageCells"
import { NotebookHeader } from "spell/app/app/solid/notebook/NotebookHeader"
import { NotebookPage } from "spell/app/app/solid/notebook/NotebookPage"
import { editorHotkeys } from "./editorHotkeys"
import { followRoute } from "./followRoute"
import { PageViews } from "./pageViews"
import type { EditorPage } from "./pages.types"

import "./SpellEditor.css"

/** The least width of the code's column, px, that holds the code and compiled code side by side. */
const OUTPUT_ROOM = 440

/****************
 * ### `<SpellEditor>`
 * A project's page, in each of the editor's modes (`mode`, `EditorMode`):
 * - Edit:  the running program (`<AppPane>`), then the code (`<InputRoot>`) at the far right (epic `editor` T151;
 *   the code on the left from Owen's 2026-11-06 until then).
 *   - The app takes every change of size:  dragging the code's bar gives the room to the app, or takes it,
 *     and the window growing or shrinking is the app's too (`APP_GROWS`).
 * - Run:  the program alone, the code column gone.
 *   - ONE page for both (Owen:  "a discontinuity in the page when I switch between run / edit"):
 *     switching keeps the page, its bar and the running program where they are;  only the code column comes and goes.
 *   - A phone only runs (epic `debut` P32):  Run, whatever the address says.
 * - The Program panel (`<ProgramPanel>`), while View › Program Panel shows it (`ProgramPanelShown`), sits under
 *   the code:  its output and compiled code.  Its Close hides it.
 * - Showing or hiding the panel never redraws the code or the program:  a pane that comes or goes moves no other.
 * - The compiled code, while someone's asked for it (`CodeOutputShown`) and there's room, sits beside the code.
 *   - With the code closed, it has the code's column alone (epic `editor` I366):  the column shows while either does.
 * - The panes are `<ui-split-panel>`s, their sizes remembered as dragged (`rememberedSizes()`).
 *   - How they're arranged is Spell, the `editor layout` of `SpellEditor.spell`;  what's in each is still the editor's, handed over here,
 *     each a thing that draws itself.
 * - Across, in Edit (epic `editor` T151, Owen's B):  the add bar (`<PaletteRail>`), a thin column down the left edge,
 *   then the app, the Inspector while it's open, and the code at the far right.
 *   - Run shows the app alone:  the add bar, the Inspector and the code go, and come back as they were in Edit.
 * - The Inspector, while it's open, is a pane after the app (`<InspectorPane>`, epic `debut` P13).
 *   It's a pane of the same panel, so the same room round it as the app, and a bar to drag it wider or narrower.
 *   - Its own remembered sizes (`spellEditor-columns-inspector`):  three panes, not two.
 *   - On a phone, a sheet that slides up over the page as something's picked (epic `debut` P17, Q6).
 * - Preview (⌥⌘Enter, epic `editor` T172):  Run with the top bar hidden too, the app alone, full screen (`Preview`).
 * - SIDE EFFECT:  the page's keyboard shortcuts while it's up, outside the code (`editorHotkeys()`).
 * - SIDE EFFECT:  watches the open file for changes from outside while it's up (`editor.watchOpenFile()`).
 ****************/
export function SpellEditor(props: { mode: Mode }) {
  const isPhone = phoneWidth()
  const mode = (): Mode => (isPhone() ? "run" : props.mode)
  const isRunning = () => mode() === "run"
  editorHotkeys(isRunning)
  // Preview remembers the mode it came from, to come back to it
  Preview.follow(mode)
  // a change to the open file from outside the editor:  read again, and taken as any edit
  onSettled(() => editor.watchOpenFile())
  // the code:  hidden in Run, and for a project with its code closed
  const hidesCode = () => isRunning() || CodeShown.isClosed(editor.project?.path)
  // the code's column:  hidden in Run, and while neither the code nor the compiled code shows (I366)
  const hidesColumn = () => isRunning() || (hidesCode() && !CodeOutputShown.target)
  const showsProgramPanel = () => !hidesCode() && ProgramPanelShown.isShowing
  // the Inspector's pane:  never in Run, which is the app alone (Owen, 2026-11-07);  still open for Edit, and a phone's sheet
  const showsInspector = () => Inspector.isOpen && props.mode !== "run"
  // ... and nothing stays selected in Run:  `<ProjectPageRoute>` lets go as the address leaves for it (`letGoForRun()`)
  const columns = rememberedSizes(() =>
    columnsFor(hidesColumn(), showsInspector(), !hidesCode() && !!CodeOutputShown.target)
  )
  const codeRows = rememberedSizes(() => ({
    id: "spellEditor-left",
    sizes: showsProgramPanel() ? "65%" : "100%"
  }))
  // the compiled code beside the code, while there's room:  a narrow column keeps the code;  alone, it has the column
  const [codeWidth, setCodeWidth] = createSignal(0)
  const outputTarget = () => (hidesCode() || codeWidth() >= OUTPUT_ROOM ? CodeOutputShown.target : undefined)
  const showsBoth = () => !hidesCode() && !!outputTarget()
  const codeColumns = rememberedSizes(() =>
    showsBoth() ? { id: "spellEditor-code-output", sizes: "50%,50%" } : { id: "spellEditor-code-alone", sizes: "100%" }
  )
  const parts = {
    code: {
      draw: () => (
        <WidthWatchedPane onWidth={setCodeWidth}>
          <Show when={!hidesColumn()}>
            <ui-split-panel class="EditorCodeOutput" columns={codeColumns.sizes()} resizable>
              <Show when={!hidesCode()}>
                <div class="SplitPane">
                  <InputRoot />
                </div>
              </Show>
              <Show when={outputTarget()} keyed>
                {(target) => (
                  <div class="SplitPane">
                    <CodeOutputPane target={target} />
                  </div>
                )}
              </Show>
            </ui-split-panel>
          </Show>
        </WidthWatchedPane>
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
  } satisfies EditorParts
  const settings = (): Partial<Record<EditorMemberName<"EditorLayout", "value">, unknown>> => ({
    columns: columns.sizes(),
    codeRows: codeRows.sizes(),
    grows: APP_GROWS,
    mode: hidesColumn() ? "run" : "edit"
  })
  const layout = drawnView((app) => app.editorLayout, parts, settings)
  createEffect(
    () => [layout.thing(), settings()] as const,
    ([thing, changed]) => {
      if (thing) Object.assign(thing, changed)
    }
  )
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
      {/* never before the top bar:  on a cold start it waits for the bar's menus to be drawn (I255);  hidden while Anatomy shows (I263) */}
      <PartMenu />
      <ChangeThisBox />
      <FollowAlong />
      <div class="EditorLayoutPlace" ref={on("ui-changed", keepSizes)}>
        <Show when={isBarDrawn() && !isRunning() && !AppAnatomy.isShowing}>
          <PaletteRail />
        </Show>
        {layout.drawing()}
        {/* no Spell:  every pane still, arranged the same, so a person can go on */}
        <Show when={layout.isBroken()}>
          <ui-split-panel class="EditorColumns" columns={columns.sizes()} grows={APP_GROWS} resizable>
            {parts.app.draw()}
            {parts.inspector.draw()}
            <ui-split-panel class="EditorCode" rows={codeRows.sizes()} resizable hidden={hidesColumn()}>
              {parts.code.draw()}
              {parts.programPanel.draw()}
            </ui-split-panel>
          </ui-split-panel>
        </Show>
      </div>
    </SpellPage>
  )
}

/**
 * A pane, `<div class="SplitPane">`, that tells `onWidth` its width, as it draws and each time it changes.
 * - Watched from when it's drawn till it goes:  `onSettled()`, as a ref callback has no owner to clean up with.
 */
function WidthWatchedPane(props: { onWidth: (width: number) => void; children: JSX.Element }) {
  let pane: HTMLDivElement | undefined
  onSettled(() => {
    const watcher = new ResizeObserver(([entry]) => props.onWidth(entry!.contentRect.width))
    watcher.observe(pane!)
    return () => watcher.disconnect()
  })
  return (
    <div class="SplitPane" ref={(element: HTMLDivElement) => (pane = element)}>
      {props.children}
    </div>
  )
}

/** What the editor draws in its Spell's places for it, each by its name in `EDITOR_NAMES`. */
type EditorParts = Partial<Record<EditorPartName, DrawnByTheEditor>>

/**
 * The view `viewOf()` picks of the editor's own Spell (`SpellEditor.spell`), once it's loaded, and its drawing.
 * - What it's given before it first draws:
 *   - `parts`:  what the editor draws in its places, each made one of its editor parts (`EditorSpell.parts()`)
 *   - `settings()`:  its settings, read then
 * - Drawn in place, with no element of its own (`EditorSpell.drawInPlace()`):  the editor's sheets reach it.
 * - The page's hero stays up while it loads (`PageLoading`).
 * - Call in a component body.
 * - NEVER throws:  Spell that won't load says so on the console, and `isBroken()`, for a plain stand-in;
 *   so does a Spell without the view (renamed:  the load's notice names it, epic `editor` I123).
 * - `parts` and `settings()` by their names in `EDITOR_NAMES`:  one not there doesn't compile.
 */
function drawnView(
  viewOf: (app: SpellEditorApp) => Record<string, unknown>,
  parts: EditorParts,
  settings?: () => object
) {
  const [spell, setSpell] = createSignal<EditorSpell>()
  const [isBroken, setBroken] = createSignal(false)
  let isGone = false
  const release = PageLoading.hold()
  onCleanup(() => {
    isGone = true
    release()
  })
  void loadEditorSpell()
    .then(
      (loaded) => {
        if (isGone) return
        const view = viewOf(loaded.editor) as Record<string, unknown> | undefined
        if (!view) {
          console.error("the editor's Spell has no such view:  drawn without it")
          setBroken(true)
          return
        }
        Object.assign(view, loaded.parts(parts as Record<EditorPartName, DrawnByTheEditor>), settings?.())
        setSpell(() => loaded)
      },
      (problem: unknown) => {
        console.error("can't load the editor's Spell", problem)
        setBroken(true)
      }
    )
    .finally(release)
  return {
    /** The view, once loaded. */
    thing: (): object | undefined => {
      const loaded = spell()
      return loaded && viewOf(loaded.editor)
    },
    /** What it draws, once loaded. */
    drawing: () => {
      const loaded = spell()
      return loaded?.drawInPlace(viewOf(loaded.editor)) as JSX.Element
    },
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
 * - A NOTEBOOK page (a `.spell` page with the `notebook` flag, epic `notebook` P3) is the running program's own
 *   drawing too, in the same place, inside the docs frame the editor adds round it (`<NotebookPage>`):
 *   its look, "On this page", and each example's code editor, in place.
 *   - It keeps a header of its own, a pane's one bar:  its title, a menu of the project's notebooks, the lock after it,
 *     and what a locked page's edits are (`<NotebookHeader>`).
 *   - Its cells move, are added and deleted as any app's parts are (epic `notebook` P5):  a click picks one for
 *     the Inspector (`Inspector.pagePartAt`, the page's `cellAt()`), then the editor's drag and drop, palette and Edit
 *     menu.
 * - The editor's own project (the group `@spell/editor`, epic `editor` P22, P29) shows each view of its Spell in a zone
 *   of its own, drawn as it's typed (`<EditorZones>`, T63):  the editor you're using runs the published Spell.
 * - Anatomy, while it shows, pulls the program apart into floors in place, its bar over the pane's top
 *   (`<AppAnatomyView>`, epic `editor` P34).
 * - In Design, the bit of a view picked to design, drawn large, the app hidden behind it, or a site's page,
 *   the app itself (`<DesignStage>`, epic `editor` P37).
 ****************/
export function AppPane() {
  const root = trackProjectRoot(() => undefined)
  const title = tracked(() => (editor.project ? new SP.SpellProject(editor.project.path).title : ""))
  const isRun = tracked(() => editor.projectPage === "runner")
  const notebook = tracked(() => notebookOf(editor.project, editor.file, isRun()))
  // a site of notebook pages wears the docs site's look in Run (epic `notebook` P10)
  const isNotebookSite = tracked(() => !!editor.project && editor.isNotebookSite(editor.project))
  const [notebookPage, setNotebookPage] = createSignal<NotebookController>()
  // the editor's own project:  a zone per view of its Spell, not its app (T63)
  const isEditorPiece = tracked(() => editor.isEditorPiece(editor.project))
  // the app area, once drawn:  the notebook's frame watches the program's drawing in it
  let program: HTMLDivElement | undefined
  // the body, watched while it's drawn:  `onSettled()`, as a ref callback has no owner to clean up with
  let body: HTMLDivElement | undefined
  // the pane itself:  Anatomy's Full Window lifts it over the editor
  let pane: HTMLDivElement | undefined
  onSettled(() => Inspector.watch(body!))
  return (
    <div class="AppPane" data-tour="app" ref={(element: HTMLDivElement) => (pane = element)}>
      <Show when={notebookPage()} keyed>
        {(page) => <NotebookHeader controller={page} icon={root().icon ?? PROJECT_ICON} title={title()} />}
      </Show>
      <SampleBar />
      <div class="AppPaneBody ui-content-size" ref={(area: HTMLDivElement) => (body = area)}>
        <Show when={isEditorPiece()}>
          <EditorZones />
        </Show>
        <DesignStage program={() => program} />
        <div
          class={[
            "AppPaneProgram",
            {
              hidden: isEditorPiece(),
              NotebookPage: !!notebook(),
              "ui-docs-sections": !!notebook() || isNotebookSite()
            }
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
                onController={(page) => {
                  setNotebookPage(page)
                  // a click on the page picks its cell, for the Inspector and the editor's drag and drop
                  Inspector.pagePartAt = page && ((event) => page.cellAt(event.composedPath(), Inspector.isPart))
                }}
              />
            )}
          </Show>
        </div>
      </div>
      <AppAnatomyView pane={() => pane} body={() => body} program={() => program} />
    </div>
  )
}

/** The id of the element scrolling the running program's drawing:  "On this page" follows it. */
const APP_SCROLLER = "spell-app-scroller"

/****************
 * ### `<SampleBar>`
 * The app pane's header while a sample stands in for a data place (epic `editor` P26):
 * says plainly that what shows is sample data, so nobody mistakes it for the real thing.
 * - Its first button starts the samples over, copied again from the real places;  its second, with made-up records
 *   even where a real place can be read (`InspectorData.startSamplesOver()`).
 * - Its last button puts the real places back (`InspectorData.showFrom()`).
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
        <ui-button size="mini" onClick={() => void InspectorData.startSamplesOver("the real place")}>
          {appTexts.text("sampleStartOver")}
        </ui-button>
        <ui-button size="mini" onClick={() => void InspectorData.startSamplesOver("made up")}>
          {appTexts.text("sampleMadeUp")}
        </ui-button>
        <ui-button
          size="mini"
          class="SampleBarRealData"
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
 * ### `<ProgramPanel>`
 * Debug's panel under the code:  one pane of tabs (`<RunnerPane>`), as VS Code's runner panel has.
 * - Debug Output:  what the program logged, and how compiling and running it went (`<ConsoleViewer>`).
 * - Sentence:  the spell tree of the cursor's line (`<TreeRoot>`).
 * - Spell Reference:  what you can use, your app's templates and Spell's (`<SpellReference>`), its search at the top of
 *   its right column (epic `editor` T109, T110).
 * - At the right, whatever tab shows:  Clear Console, on Debug Output only, and Close (`onClose`).
 * - Remembers which tab shows, as the editor's preference `spellEditor:programTab`:
 *   a tab remembered from before (Things, Templates, JavaScript, TypeScript, Python) shows Debug Output.
 * - The compiled code isn't here:  it's its own pane, beside the code (View › Compiled Code, `<CodeOutputPane>`).
 * - What the app made is the Inspector's Views card, its things not drawn among them (epic `editor` P19).
 ****************/
export function ProgramPanel(props: { onClose: () => void }) {
  const remembered = editorPrefs.get(TAB_PREF) as ProgramTabId
  const [filter, setFilter] = createSignal("")
  const [tab, setTab] = createSignal<ProgramTabId>(PROGRAM_TABS.includes(remembered) ? remembered : "output")
  return (
    <RunnerPane
      class="ProgramPanel"
      tabs={PROGRAM_TABS.map(tabFor)}
      pane={tab()}
      onPane={showTab}
      tools={
        <>
          <Show when={tab() === "output"}>
            <Actions.clearConsole iconOnly />
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
        <Match when={tab() === "tree"}>
          <TreeRoot showToolbar={false} />
        </Match>
        <Match when={tab() === "reference"}>
          <SpellReference
            filter={filter()}
            search={
              <ui-input
                class="ReferenceSearch"
                type="search"
                size="small"
                icon="search"
                aria-label={appTexts.text("referenceSearch")}
                placeholder={appTexts.text("referenceSearch")}
                ref={on<{ value: string }>("ui-typed", (event) => setFilter(event.detail.value))}
              />
            }
          />
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
 *   `/edit/@spell/guides/SpellUI/Avatar/Usage.spell` (epic `notebook` P10).
 * - A project with a site:  Run always shows the site (`isRun`), and Edit only the open file, so opening the site
 *   file shows the site file.
 * - Else its first.
 */
function notebookOf(
  project: SP.SpellProject | undefined,
  open: { path?: string } | undefined,
  isRun: boolean
): SP.SpellFile | undefined {
  if (project?.isLoaded && editor.projectHasSite(project)) {
    if (isRun || !(open instanceof SP.SpellFile) || !NotebookPageCells.holdsNotebook(open)) return undefined
    return open
  }
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
  const id = `${COLUMNS_ID}${isRunning ? "-run" : ""}${isWide ? "-output" : ""}${isInspecting ? "-inspector" : ""}`
  if (!isInspecting && !isWide) return { id, sizes: "" }
  // with compiled code beside it, the code's column takes room from the app's, so both can be read
  const code = isWide ? "65%" : "*"
  const panes = ["*", ...(isInspecting ? ["380px"] : []), ...(isRunning ? [] : [code])]
  return { id, sizes: panes.join(",") }
}

/** The start of the columns' remembered sizes' names:  the app first, the code last (epic `editor` T151). */
const COLUMNS_ID = "spellEditor-panes"

/**
 * The sizes dragged before the code moved to the far right (`spellEditor-columns...`, code first), moved over once:
 * the code's size, first, goes last;  in Run, with no code, they stay as they were (epic `editor` T151).
 */
function moveOldColumnSizes(): void {
  for (const run of ["", "-run"]) {
    for (const output of ["", "-output"]) {
      for (const inspector of ["", "-inspector"]) {
        const ending = `${run}${output}${inspector}`
        const old = editorPrefs.get<string>(`spellEditor-columns${ending}`)
        if (!old || editorPrefs.get<string>(`${COLUMNS_ID}${ending}`)) continue
        const sizes = old.split(",")
        const moved = run ? sizes : [...sizes.slice(1), sizes[0]!]
        editorPrefs.set(`${COLUMNS_ID}${ending}`, moved.join(","))
      }
    }
  }
}
moveOldColumnSizes()

/**
 * Which of the columns takes every change of size (`<ui-split-panel grows>`):  the app's, first across since the
 * code moved to the far right (epic `editor` T151).
 */
const APP_GROWS = "first"

/** Tabs of `<ProgramPanel>`, in order. */
const PROGRAM_TABS = ["output", "tree", "reference"] as const
/** One of `<ProgramPanel>`'s tabs. */
type ProgramTabId = (typeof PROGRAM_TABS)[number]
/** Icon of each tab (Fomantic's names), and its title's key. */
const TAB_LOOKS: Record<ProgramTabId, { icon: string; text: AppTextKey }> = {
  output: { icon: "list", text: "outputTab" },
  tree: { icon: "tree", text: "treeTab" },
  reference: { icon: "book", text: "referenceTab" }
}
/** The preference that remembers which tab `<ProgramPanel>` shows. */
const TAB_PREF = "programTab"
// TODO:  drop the rename once every browser has opened the editor since epic `prefs-and-undo` P1
editorPrefs.declare(TAB_PREF, { oneOf: PROGRAM_TABS }).rename("spellEditor.programTab", TAB_PREF)

/** Tab `id`, titled in the page's language. */
function tabFor(id: ProgramTabId): RunnerTab<ProgramTabId> {
  return { id, icon: TAB_LOOKS[id].icon, title: appTexts.text(TAB_LOOKS[id].text) }
}

/****************
 * ### `<EditorToolbar>`
 * The editor's top bar (epic `debut` P32, as Owen drew it):
 * - left:  Spell's menu (its hat and name:  the group's projects, Home), the project's menu (its name),
 *   then File · Edit · View · Run · Help (`MenuBar.tsx`), then the draft's pill while you have drafts (T107)
 * - middle:  Run | Edit | Design | Site, then in Edit and Design, Inspect app, the code's icon,
 *   the compiled code's (its language's icon) and Anatomy, in the same group (epic `editor` T83, T168);
 *   no Add a View since T167:  ⌥⌘V or View › Add a View… opens the add panel, beside the add bar (T175)
 * - right, ONE group of icons:  Restart, the theme, you
 *   - no Inspector button (T83):  View › Inspector shows or hides it, and the Inspector card's ✕ hides it
 * - `mode`:  the page's, pressed in `<ModeButtons>`.
 * - How they're arranged is Spell, the `editor bar` of `SpellEditor.spell`.
 * - What's in each is still the editor's, handed over here, each a thing that draws itself.
 * - A phone runs only:  no app menus, no Run | Edit (`chrome.css`).
 * - Its spacing is the top bar's one rule (`chrome.css`):  60px between groups, 12px between icons.
 ****************/
export function EditorToolbar(props: { mode: Mode }) {
  const parts = {
    spellMenu: { draw: () => <SpellBarMenu useRunner={props.mode === "run"} /> },
    projectMenu: { draw: () => <ProjectBarMenu /> },
    appMenus: { draw: () => <AppBarMenus mode={props.mode} /> },
    draft: { draw: () => <PublishDraft /> },
    modeButtons: {
      draw: () => (
        <ModeButtons
          current={props.mode}
          compiled={<CompiledCodeButton />}
          inspect={<InspectAppButton id={INSPECT_APP_ID} />}
          anatomy={<AnatomyButton />}
        />
      )
    },
    tools: {
      draw: () => (
        <>
          <Show when={EditorMode.isEditing(props.mode)}>
            <InspectHelp for={INSPECT_APP_ID} />
          </Show>
          {/* its tooltip and label say what a click does (I230) */}
          <Actions.restartApp iconOnly inBar title={appTexts.text("restartTip")} />
          <ThemeMenu />
        </>
      )
    },
    you: { draw: () => <Actions.you /> }
  } satisfies EditorParts
  const bar = drawnView((app) => app.editorBar, parts)
  let place: HTMLDivElement | undefined
  // drawn, or its plain stand-in:  the bar's menus, once ready, and the hero gone, tell the page (`isBarDrawn`)
  createEffect(
    () => !!bar.thing() || bar.isBroken(),
    (isDrawn) => {
      if (isDrawn) beforeNextPaint(() => whenBarReady(place))
    }
  )
  return (
    <div class="EditorBarPlace" ref={(element: HTMLDivElement) => (place = element)}>
      {bar.drawing()}
      {/* no Spell:  every menu still, in a plain row, so a person can go on */}
      <Show when={bar.isBroken()}>
        <AppMenu class="EditorBar">
          <ui-menu slot="start">
            {parts.spellMenu.draw()}
            {parts.projectMenu.draw()}
            {parts.appMenus.draw()}
            {parts.draft.draw()}
          </ui-menu>
          {parts.modeButtons.draw()}
          <ui-menu slot="end">
            {parts.tools.draw()}
            {parts.you.draw()}
          </ui-menu>
        </AppMenu>
      </Show>
    </div>
  )
}

/**
 * Has the top bar been drawn, its menus ready, since the page loaded?
 * - What waits for the bar to show itself reads it:  the palette kept open (`<PaletteStrip>`), which drew before the
 *   bar on a cold start, the bar still waiting for the editor's Spell (epic `editor` I255).
 * - For the page's life:  a later visit to the editor draws the bar from the Spell already loaded, in the same paint,
 *   so nothing waits again.
 */
const [isBarDrawn, setBarDrawn] = createSignal(false)

/**
 * Note the bar drawn once its menus (`<ui-app-menu>`) are ready, and the page's hero has gone:
 * so what waits for it shows on a bar people can see.
 * - NEVER throws.
 */
function whenBarReady(place: HTMLElement | undefined) {
  const menu = place?.querySelector<HTMLElement & { ready?: Promise<void> }>("ui-app-menu")
  void (menu?.ready ?? Promise.resolve())
    .then(() => PageLoading.whenGone(() => setBarDrawn(true)))
    .catch((error: unknown) => console.error("the top bar didn't get ready", error))
}

/** Inspect app's button's id:  its help popup's target. */
const INSPECT_APP_ID = "InspectApp"

/****************
 * ### `<ProjectPageRoute>`
 * The `/edit/...`, `/design/...` and `/run/...` routes:  `<SpellEditor>`, showing the project / file the URL names
 * (`followRoute()`), in Run for `/run/`, Design for `/design/` (epic `editor` P37), else in Edit.
 * - ONE route for both:  it stays mounted while only the URL's params change, the page (`edit`, `run`) too,
 *   so switching between Run and Edit, or between files, doesn't redraw the page.
 * - Nothing stays selected in Run:  its ants would sit over the app alone (Owen, 2026-11-07).
 *   - So the switch to Run lets go of what's selected, as the address leaves for `/run/` (`letGoForRun()`).
 * - An org's or an org group's address alone (`/edit/@acme`, `/run/@acme/org-spell`):  its page, `<GroupPage>`
 *   (epic `editor` P47, Q99):  the editor never jumps from a group to its first project's file.
 ****************/
export function ProjectPageRoute(props: RouteSectionProps) {
  // an org's or an org group's address alone, `/edit/@acme`, `/run/@acme/org-spell`:  its page, never a file (P47)
  const orgPage = () => SPACES.orgPageFor(props.params.address ?? "")
  return (
    <Show when={orgPage()} keyed fallback={<EditorRoute route={props} />}>
      {(page) => <GroupPage page={page} mode={props.params.page === RUN_PAGE ? "run" : "edit"} />}
    </Show>
  )
}

/** `<ProjectPageRoute>`'s editor:  the project or file its address names, in Edit, Design or Run. */
function EditorRoute(props: { route: RouteSectionProps }) {
  const params = () => props.route.params
  const page = (): EditorPage => (params().page === RUN_PAGE ? "runner" : "editor")
  const isDesigning = () => params().page === DESIGN_PAGE
  followRoute(params, page, isDesigning)
  useBeforeLeave(letGoForRun)
  useBeforeLeave(askBeforeLeavingExample)
  return <SpellEditor mode={page() === "runner" ? "run" : isDesigning() ? "design" : "edit"} />
}

/** `<GroupPage>`, loaded the first time an org's or a group's page shows (`PageViews`). */
const GroupPage = PageViews.group.view("GroupPage")

/**
 * Let go of what's selected when the address is leaving for Run (`/run/...`), from any other page.
 * - In the navigation itself, before the address changes:  the letting go and the new page land together.
 *   NOT an effect on the mode, which wrote the selection a flush after the address changed,
 *   so whatever read both ran twice (Solid's `EFFECT_RELAY_TEAR`, epic `editor` I193).
 * - Back and forward hand over a step count, not an address:  the window's address is already the new one then.
 */
function letGoForRun(leave: BeforeLeaveEventArgs): void {
  const to = typeof leave.to === "string" ? leave.to : location.pathname
  const leavesForRun = pageIn(to) === RUN_PAGE && pageIn(leave.from.pathname) !== RUN_PAGE
  if (leavesForRun && untrack(() => Inspector.allSelected.length)) Inspector.letGo()
}

/**
 * Leaving an example or a guide with your draft of it:  hold the address where it is, and ask what to keep
 * (`editor.askAboutExample()`, epic `mockup` T52);  go on once it's answered, or stay, the address as it was.
 * - Any way the address leaves:  Home, another project, Back, a typed address within the app.
 * - Back and forward hand over a step count:  the router puts the address back while it's held.
 */
function askBeforeLeavingExample(leave: BeforeLeaveEventArgs): void {
  if (leave.defaultPrevented) return
  const to = typeof leave.to === "string" ? leave.to : location.pathname
  const project = untrack(() => editor.project)
  if (!project || !untrack(() => editor.asksBeforeLeaving(to))) return
  leave.preventDefault()
  void editor.askAboutExample(project, "leaving").then((goOn) => goOn && leave.retry(true))
}

/** The page word an address starts with:  `run` for `/run/<project>/...`. */
function pageIn(address: string): string | undefined {
  return new URL(address, location.href).pathname.split("/")[1]
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

/** Design's word in its URL, `/design/...` (epic `editor` P37). */
const DESIGN_PAGE = "design"
