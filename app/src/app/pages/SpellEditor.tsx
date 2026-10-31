import type { RouteSectionProps } from "@solidjs/router"
import { Match, Show, Switch, createSignal, onCleanup } from "solid-js"
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
  InspectorPane,
  InspectHelp,
  InspectorPick,
  InspectorToggle,
  ModeButtons,
  OutputEditor,
  OutputRoot,
  PROJECT_ICON,
  ProgramPanelShown,
  ProjectBarMenu,
  SpellPage,
  SplitPanel,
  ThemeMenu,
  TreeRoot,
  tracked,
  trackProjectRoot,
  type Mode
} from "spell/app/app/solid"
import { editor } from "spell/app/app/editor"
import { editorPrefs } from "spell/app/app/editorPrefs"
import { loadLayoutPiece, type LayoutPiece } from "spell/app/app/layout/layoutSpell"
import editorBarSpell from "spell/app/app/layout/EditorBar/EditorBar.spellml"
import { appTexts, type AppTextKey } from "spell/app/app/ui/AppTexts"
// Import directly, NOT through the runner barrel, which brings the runners themselves
import { RunnerPane, type RunnerTab } from "spell/app/app/runner/RunnerPane"
import { NotebookController } from "spell/app/app/solid/notebook/NotebookController"
import { NotebookHeader } from "spell/app/app/solid/notebook/NotebookHeader"
import { NotebookMenu } from "spell/app/app/solid/notebook/NotebookCellTools"
import { NotebookPage } from "spell/app/app/solid/notebook/NotebookPage"
import { editorHotkeys } from "./editorHotkeys"
import { followRoute } from "./followRoute"
import type { EditorPage } from "./pages.types"

import "./SpellEditor.css"

/****************
 * ### `<SpellEditor>`
 * A project's page, in each of the editor's modes (`mode`, `EditorMode`):
 * - Edit:  the code (`<InputRoot>`) on the left, the running program (`<AppPane>`) on the right.
 * - Run:  the program alone, the code column gone.
 *   - ONE page for both (Owen:  "a discontinuity in the page when I switch between run / edit"):
 *     switching keeps the page, its bar and the running program where they are;  only the code column comes and goes.
 *   - A phone only runs (epic `debut` P32):  Run, whatever the address says.
 * - The Program panel (`<ProgramPanel>`), while View › Program Panel shows it (`ProgramPanelShown`), sits under
 *   the code:  its output and compiled code.  Its Close hides it.
 * - Showing or hiding the panel never redraws the code or the program:  the panel keeps each pane by its node.
 * - The Inspector, while it's open, is a pane at the far right (`<InspectorPane>`, epic `debut` P13):
 *   a pane of the same panel, so the same room round it as the app, and a bar to drag it wider or narrower.
 *   - Its own remembered sizes (`spellEditor-columns-inspector`):  three panes, not two.
 *   - On a phone, a sheet that slides up over the page as something's picked (epic `debut` P17, Q6).
 * - SIDE EFFECT:  the page's keyboard shortcuts while it's up, outside Monaco (`editorHotkeys()`).
 ****************/
export function SpellEditor(props: { mode: Mode }) {
  editorHotkeys()
  const isPhone = phoneWidth()
  const mode = (): Mode => (isPhone() ? "run" : props.mode)
  const isRunning = () => mode() === "run"
  const showsProgramPanel = () => !isRunning() && ProgramPanelShown.isShowing
  const layout = () => columnsFor(isRunning(), Inspector.isOpen)
  return (
    <SpellPage id="SpellEditor" fillWindow dark rows>
      <EditorToolbar mode={mode()} />
      <SplitPanel id={layout().id} columns={layout().columns} resizable fluid spaced="tightly">
        <Show when={!isRunning()}>
          <SplitPanel id="spellEditor-left" rows={showsProgramPanel() ? "65%" : "100%"} resizable rounded>
            <InputRoot />
            <Show when={showsProgramPanel()}>
              <ProgramPanel onClose={() => ProgramPanelShown.set(false)} />
            </Show>
          </SplitPanel>
        </Show>
        <SplitPanel rows rounded>
          <AppPane />
        </SplitPanel>
        <Show when={Inspector.isOpen}>
          <InspectorPane />
        </Show>
      </SplitPanel>
    </SpellPage>
  )
}

/****************
 * ### `<AppPane>`
 * The running program, with no header of its own:  its tools are the top bar's (epic `debut` P32).
 * - The program's mount point (`<AppRoot>`) is drawn once, and never redrawn.
 * - Its body is the area the Inspector picks parts in (`Inspector.watch()`).
 * - Shown in every mode, Run's too:  the page keeps it as the code column comes and goes.
 * - A NOTEBOOK's project (a `.spellml` file holding a `<spell-notebook>`, epic `elemental-spell` P16) shows its page
 *   instead, editable in place (`<NotebookPage>`):  the program still runs in its mount point, out of sight, its
 *   classes and its notebook what the page's cells draw with.
 *   - It keeps a header of its own:  its title, a menu of the project's notebooks, the lock after it, and what
 *     happened to the last edit (`<NotebookHeader>`);  at the header's right end, its ⋯ menu (`<NotebookMenu>`).
 ****************/
export function AppPane() {
  const root = trackProjectRoot(() => undefined)
  const title = tracked(() => (editor.project ? new SP.SpellProject(editor.project.path).title : ""))
  const notebook = tracked(() => notebookOf(editor.project, editor.file))
  const [notebookPage, setNotebookPage] = createSignal<NotebookController>()
  return (
    <div class="AppPane">
      <Show when={notebookPage()} keyed>
        {(page) => (
          <header class="AppPaneHeader">
            <NotebookHeader controller={page} icon={root().icon ?? PROJECT_ICON} title={title()} />
            {/* the notebook's ⋯, last:  Add below, Move, Delete, on the cell last clicked */}
            <NotebookMenu controller={page} />
          </header>
        )}
      </Show>
      <div class="AppPaneBody ui-content-size" ref={(area) => onCleanup(Inspector.watch(area))}>
        <div class={["AppPaneProgram", { hidden: !!notebook() }]}>
          <AppRoot showToolbar={false} />
        </div>
        <Show when={notebook()} keyed>
          {(file) => <NotebookPage file={file} project={editor.project!} onController={setNotebookPage} />}
        </Show>
      </div>
    </div>
  )
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
 * - At the right, whatever tab shows:  Clear Console, on Output only, and Close (`onClose`).
 * - Remembers which tab shows, as the editor's preference `spellEditor:programTab`.
 * - Things and Types (Templates) are the Inspector's now, in its Views card (`<InspectorViews>`):
 *   a tab remembered from before shows Program Output.
 ****************/
export function ProgramPanel(props: { onClose: () => void }) {
  const remembered = editorPrefs.get(TAB_PREF) as ProgramTabId
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
          <ui-icon
            name="close"
            link=""
            class="IconAction close"
            label={appTexts.text("closeProgram")}
            data-tooltip={appTexts.text("closeProgram")}
            data-position="bottom right"
            data-inverted=""
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
function columnsFor(isRunning: boolean, isInspecting: boolean): { id: string; columns: string | true } {
  const id = `spellEditor-columns${isRunning ? "-run" : ""}${isInspecting ? "-inspector" : ""}`
  if (!isInspecting) return { id, columns: true }
  return { id, columns: isRunning ? "*,380px" : "*,*,380px" }
}

/** Tabs of `<ProgramPanel>`, in order;  `spell` is the file's other form, code spell or spellx (`tabFor()`). */
const PROGRAM_TABS = ["output", "javascript", "typescript", "python", "spell", "tree"] as const
/** One of `<ProgramPanel>`'s tabs. */
type ProgramTabId = (typeof PROGRAM_TABS)[number]
/** Icon of each tab (Fomantic's names, else Font Awesome's), and its title's key. */
const TAB_LOOKS: Record<ProgramTabId, { icon: string; text: AppTextKey }> = {
  output: { icon: "list", text: "outputTab" },
  javascript: { icon: "js", text: "javascriptTab" },
  typescript: { icon: "code", text: "typescriptTab" },
  python: { icon: "python", text: "pythonTab" },
  spell: { icon: "file alternate outline", text: "codeSpellTab" },
  tree: { icon: "tree", text: "treeTab" }
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
 * - left:  the project's menu (Spell's hat, its name), then File · Edit · View · Run · Help (`MenuBar.tsx`)
 * - middle:  Run | Edit
 * - right, ONE group of icons:  Run:  Restart, the theme, you;  Edit:  Inspect app and the Inspector's menu, a thin
 *   line, then Restart, the theme, you
 * - `mode`:  the page's, pressed in `<ModeButtons>`.
 * - How they're arranged is Spell, `EditorBar.spellml`;  what's in each is still the editor's, handed over here, each a thing that
 *   draws itself.
 * - A phone runs only:  no app menus, no Run | Edit (`chrome.css`).
 * - Its spacing is the top bar's one rule (`chrome.css`):  60px between groups, 12px between icons.
 ****************/
export function EditorToolbar(props: { mode: Mode }) {
  const parts = {
    projectMenu: { draw: () => <ProjectBarMenu useRunner={props.mode === "run"} /> },
    appMenus: { draw: () => <AppBarMenus mode={props.mode} /> },
    modeButtons: { draw: () => <ModeButtons current={props.mode} /> },
    tools: {
      draw: () => (
        <>
          <Show when={props.mode === "edit"}>
            <InspectorPick id={INSPECT_APP_ID} />
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
  const [piece, setPiece] = createSignal<LayoutPiece>()
  const [isBroken, setBroken] = createSignal(false)
  let isGone = false
  onCleanup(() => (isGone = true))
  void loadLayoutPiece(editorBarSpell).then(
    (loaded) => {
      if (isGone) return
      Object.assign(loaded.exports.editorBar, parts)
      setPiece(() => loaded)
    },
    (problem: unknown) => {
      console.error("<EditorToolbar>:  can't load its Spell", problem)
      setBroken(true)
    }
  )
  return (
    <div class="EditorBarPlace">
      {piece()?.draw(piece()!.exports.editorBar) as JSX.Element}
      {/* no Spell:  every menu still, in a plain row, so a person can go on */}
      <Show when={isBroken()}>
        <AppMenu class="EditorBar">
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
