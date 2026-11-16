import { For, Show, createEffect, createSignal } from "solid-js"
import { render, type JSX } from "@solidjs/web"

import { SP } from "spell/parser/spell"
import { editor, runtimeConsole } from "spell/app/app/editor"
import { appTexts } from "spell/app/app/ui/AppTexts"
import { isStaticBuild } from "spell/app/app/static/staticBuild"
import {
  Action,
  Actions,
  AppMarkLabel,
  CodeSettings,
  CodeShown,
  EditorMode,
  EditorTheme,
  Inspector,
  LineNumbers,
  PROJECT_ICON,
  PartMenuItems,
  ProgramPanelShown,
  followTabTitle,
  openProject,
  tracked,
  trackProjectRoot,
  type Mode
} from "spell/app/app/solid"
import { EDITOR_HOTKEYS, runCodeEditorCommand } from "spell/app/app/pages/editorHotkeys"
import { CodeOutputShown } from "spell/app/app/solid/CodeOutput"
import {
  loadEditorSpell,
  type BarMenuView,
  type EditorSpell,
  type SpellEditorApp
} from "spell/app/app/layout/layoutSpell"
import type { EditorMemberName } from "spell/app/app/layout/editorNames"
import { uiReady } from "spell/app/app/solid/loadUI"

import "./MenuBar.css"

//
//  ## The editor's top bar's MENUS (epic `debut` P32):  Spell's, the project's, then File · Edit · View · Run · Help.
//  - Each is a `<BarMenu>`:  its name a quiet button in the bar, a click opening its items under it.
//  - The project's menu and File · Edit · View · Run are Spell, `SpellEditor.spell`'s (epic `editor` P29):
//    Spell UI menus of the app's actions, `<ui-action>` rows, each title with its key.
//  - The static build's actions that need a server draw nothing (`HIDDEN_IN_STATIC_BUILD`, `Actions.tsx`);
//    a divider left first, last or doubled hides itself (`MenuBar.css`).
//  - Look:  `MenuBar.css`.
//

/****************
 * ### `<BarMenu>`
 * One menu of the top bar:  its name, a button;  a click opens its items under it, a Spell UI popup.
 * - Its items (`children`):  `<Action menu>`s, dividers (`<ui-action kind="divider">`) and `<ui-submenu>`s.
 * - A SUB-MENU is Spell UI's `<ui-submenu label icon>`, its items written inside it:  a row whose fly-out opens
 *   beside it, on hover, a click, Enter or →.
 *   - The fly-out is as wide as its widest item, ticks what's on when an item is on or off, and takes the popup's
 *     look (`MenuBar.css`, `ui-submenu::part(flyout)`).
 * - Choosing an action closes the menu, in a fly-out too;  so does a click elsewhere, or Esc (the popup's own).
 ****************/
export function BarMenu(props: BarMenuProps): JSX.Element {
  let popup: (HTMLElement & { visible?: boolean }) | undefined
  const close = () => {
    if (popup) popup.visible = false
  }
  return (
    <>
      <ui-item
        appearance="link"
        id={props.id}
        class={["BarMenu", props.class]}
        aria-haspopup="menu"
        aria-label={props.name}
      >
        {props.label}
      </ui-item>
      <ui-popup
        for={props.id}
        open-on="click"
        position="bottom left"
        class="BarMenuPopup"
        aria-label={props.name}
        ref={(element: HTMLElement) => (popup = element)}
      >
        <div class="BarMenuPanel" onClick={(event) => closeOnAction(event, close)}>
          {props.panel ? (
            props.panel()
          ) : (
            <ui-menu
              direction="vertical"
              size="small"
              class="BarMenuItems"
              icon-column=""
              ticks={props.ticks ? "" : undefined}
              aria-label={props.name}
            >
              {props.children}
            </ui-menu>
          )}
        </div>
      </ui-popup>
    </>
  )
}

/** Props for `<BarMenu>`. */
export type BarMenuProps = {
  /** Id of its button, unique on the page:  the popup's target. */
  id: string
  /** Its name in the bar:  text, or text and an icon. */
  label: JSX.Element
  /** Its name for screen readers, and the popup's. */
  name: string
  /** Class of its button. */
  class?: string
  /** Its rows are on or off:  a tick for what is on (`<ui-menu ticks>`). */
  ticks?: boolean
  /** Its items. */
  children?: JSX.Element
  /**
   * What it opens, drawn whole in place of its items' menu (`children`):  menus of its own, as the Spell menu's.
   */
  panel?: () => JSX.Element
}

/**
 * A click in a menu's panel:  an action chosen closes it.
 * - A `<ui-submenu>`'s row is no action:  it opens its fly-out, and the menu stays.
 * - A click on an action in a fly-out comes here too:  its items are written inside the sub-menu, in the panel.
 */
function closeOnAction(event: MouseEvent, close: () => void) {
  const action = event
    .composedPath()
    .find((target): target is Element => (target as Element).localName === ACTION_TAG) as Element | undefined
  if (!action || action.getAttribute("kind") === "divider" || action.hasAttribute("disabled")) return
  close()
}

/** A line between groups of items. */
function Divider(): JSX.Element {
  return <ui-action kind="divider" />
}

/****************
 * ### `<SpellBarMenu>`
 * The top bar's first menu, Spell's:  the hat and Spell's name, our major branding, as `<AppMark>` draws them
 * (Owen, 2026-11-06:  "Change the Spell menu in the editor to show the Examples menu").
 * - Opens the project's group's projects (`<ProjectsMenu>`):
 *   the Examples, or the Guides, the one shown ticked, in columns of 10 when there are more.
 * - At its top, one row, `SpellEditor.spell`'s `home row`:  Home, where the hat linked to before,
 *   and About Spell, which shows its `about box` (epic `editor` I94, I114).
 * - New Example (`Actions.createApp`:  New Guide among the guides) is the last of the projects it adds to
 *   (Owen, 2026-11-14:  "Put <pen> New Example at the end of the list of examples").
 * - `useRunner`:  the one chosen opens in Run.
 * - The Spell UI site's:  "Spell Notebooks".
 * - SIDE EFFECT:  names the browser's tab for the project shown (`<AppMarkLabel>`).
 ****************/
export function SpellBarMenu(props: { useRunner?: boolean }): JSX.Element {
  const root = trackProjectRoot(() => undefined)
  const shown = followTabTitle()
  const spell = editorSpell()
  return (
    <BarMenu
      id="SpellBarMenu"
      class="SpellBarMenu"
      name={appTexts.text("spellMenu", {
        app: appTexts.text(shown().isNotebook ? "notebooksAppName" : "appName")
      })}
      label={<AppMarkLabel />}
      panel={() => (
        <div class={["SpellMenuPanel", { wide: rowCount(root().projects.length) > PROJECTS_PER_COLUMN }]}>
          {/* `SpellEditor.spell`'s `home row`, its ticks room for one, as the projects have, so the icons line up */}
          <SpellMenu spell={spell()} view={(app) => app.homeRow} />
          <ProjectsMenu useRunner={props.useRunner} label={root().words.title} />
        </div>
      )}
    />
  )
}

/****************
 * ### `<ProjectsMenu>`
 * The projects of the shown project's group, a menu:  the Spell menu's.
 * - Each with its group's icon;  the one shown ticked.
 * - In columns of 10 when there are more (Owen:  "More examples should be in columns if there are more than 10");
 *   past 6 columns, longer ones, so the notebooks' 94 still fit across the window.
 * - Last, New Example (`Actions.createApp`), in the columns as one more row (Owen, 2026-11-14, I114).
 * - `useRunner`:  the one chosen opens in Run.
 * - `label`:  its name for screen readers.
 ****************/
function ProjectsMenu(props: { useRunner?: boolean; label: string }): JSX.Element {
  const root = trackProjectRoot(() => undefined)
  const path = tracked(() => editor.project?.path ?? "")
  return (
    <ui-menu
      direction="vertical"
      size="small"
      ticks=""
      class={["ProjectsSubMenu", { many: rowCount(root().projects.length) > PROJECTS_PER_COLUMN }]}
      style={{ "--ProjectsSubMenu-rows": rowsFor(rowCount(root().projects.length)) }}
      aria-label={props.label}
    >
      <For each={root().projects}>
        {(each) => (
          <ui-action selected={each.path === path()} onClick={() => openProject(each.path, props.useRunner)}>
            <ui-icon name={root().icon ?? PROJECT_ICON} />
            {each.name}
          </ui-action>
        )}
      </For>
      <Actions.createApp menu />
    </ui-menu>
  )
}

/** More projects than this:  `<ProjectsMenu>` lists them in columns of this many. */
const PROJECTS_PER_COLUMN = 10

/** The most columns `<ProjectsMenu>` makes:  more projects than they hold make each column longer. */
const MOST_PROJECT_COLUMNS = 6

/** How many rows `<ProjectsMenu>` holds for `projects` projects:  one more, New Example's. */
function rowCount(projects: number): number {
  return projects + 1
}

/** How many rows `<ProjectsMenu>` lists `count` projects in:  10, or more, so they take at most 6 columns. */
function rowsFor(count: number): number {
  return Math.max(PROJECTS_PER_COLUMN, Math.ceil(count / MOST_PROJECT_COLUMNS))
}

/****************
 * ### `<ProjectBarMenu>`
 * The top bar's second menu, the PROJECT's, after Spell's (`<SpellBarMenu>`):
 * the project's name, bold, a caret after it.
 * - Its menu is Spell, `SpellEditor.spell`'s `project menu` (epic `editor` P29):  everything about the whole project,
 *   not the file open (Owen, epic `mockup`):
 *   Rename Solitaire…, Delete Solitaire…, Duplicate Solitaire, Reset to Saved, ─, Publish, Versions, Delete Draft, ─,
 *   Project Settings, ─, Export…, Import…, ─, Theme:  Fruity ›, ─, Home.
 * - Delete Draft:  every file back to what's published, after asking;  greyed with no draft (`editor.deleteDraft()`).
 * - What each does is the editor's (`handOverActions()`);  the titles naming the project follow it.
 * - Theme ›:  Spell UI's theme menu in its menu mode (`<ui-theme-menu show="menu">`), then Edit Theme and
 *   Theme Bench, each in a new window:  rows the editor draws in the Spell's place for it.
 * - SIDE EFFECT:  names the browser's tab for the project (`followTabTitle()`).
 * - SIDE EFFECT:  keeps the editor's Spell in step with the project, for its titles and what greys its rows.
 ****************/
export function ProjectBarMenu(): JSX.Element {
  followTabTitle()
  const shown = tracked(() => ({
    path: editor.project?.path ?? "",
    title: editor.project ? new SP.SpellProject(editor.project.path).title : ""
  }))
  const project = () => ({ project: shown().title })
  const spell = editorSpell((app, loaded) =>
    Object.assign(
      app.projectMenu,
      loaded.parts({
        theme: {
          draw: () => (
            <ui-submenu
              label={appTexts.text("themeIs", { theme: EditorTheme.chosenTitle })}
              icon={THEME_ICON}
              class="ThemeSubmenu"
            >
              <ThemeItems />
            </ui-submenu>
          )
        }
      })
    )
  )
  followEditor(spell, (): EditorValues => ({
    renameWords: appTexts.text("renameProject", project()),
    deleteWords: appTexts.text("deleteProject", project()),
    duplicateWords: appTexts.text("duplicateProject", project()),
    onAServer: !isStaticBuild,
    mayChangeProject: !isStaticBuild || editor.canChangeProject,
    mayReset: !isStaticBuild || !editor.canChangeProject,
    canPublish: editor.canPublish,
    drafted: editor.canDeleteDraft
  }))
  return (
    <BarMenu
      id="ProjectBarMenu"
      class="ProjectBarMenu"
      name={appTexts.text("projectMenu", project())}
      label={
        <span class="ProjectBarLabel">
          <span class="ProjectName">{shown().title}</span>
        </span>
      }
      panel={() => <SpellMenu spell={spell()} view={(app) => app.projectMenu} />}
    />
  )
}

/** The project menu's Theme ›'s icon. */
const THEME_ICON = "paint brush"

/** Icon of a row opening a new window:  Edit Theme and Theme Bench, as the theme menu's own Theme bench row. */
const NEW_WINDOW_ICON = "external alternate"

/**
 * The project menu's Theme ›'s fly-out:  Spell UI's theme menu drawn in place (Light | Dark | Auto, every theme,
 * the tint), then, under a divider and none between them, each in a new window (Owen, epic `mockup`):
 * - Edit Theme:  the theme editor's page (`editor.openThemeEditor()`)
 * - Theme Bench:  Spell UI's theme bench, in the theme chosen (`EditorTheme.openBench()`);  while developing only
 * - The theme menu's own Theme bench row is left out (`bench="none"`):  it came with a divider above it.
 */
function ThemeItems(): JSX.Element {
  return (
    <>
      <ui-theme-menu show="menu" bench="none" />
      <Divider />
      <Action
        menu
        icon={NEW_WINDOW_ICON}
        title={appTexts.text("openThemeEditor")}
        onClick={() => editor.openThemeEditor()}
      />
      <Show when={EditorTheme.benchSite}>
        <Action
          menu
          icon={NEW_WINDOW_ICON}
          title={appTexts.text("openThemeBench")}
          onClick={() => EditorTheme.openBench()}
        />
      </Show>
    </>
  )
}

/****************
 * ### `<AppBarMenus>`
 * The top bar's app menus, after the project's:  File · Edit · View · Run · Help, quieter than its name.
 * - File, Edit, View and Run are Spell, `SpellEditor.spell`'s `bar menu`s (epic `editor` P29):  each a Spell UI menu of
 *   the app's actions, its rows drawn, greyed and ticked by the Spell, each title in the page's language;
 *   each menu's title, the bar's word for it, the Spell's too.
 * - What each row does is the editor's, handed over by its name (`handOverActions()`).
 * - Rows that are lists or follow the editor are the editor's own, drawn in the Spell's place for them:
 *   Undo and Redo (their titles the step), the selection's part actions, View's Inspector cards.
 * - File:  New Spell File, New CSS File, ─, Save, Discard Changes, AutoSave, ─, Duplicate File.
 * - Edit:  the code editor's Undo, Redo, ─, the selection's part actions, ─, Find, ─, Code Editor Settings….
 * - View:  Run, Edit, Site (a site's editor, epic `mockup` P4), ─, Code, Program Panel, ─, the Inspector and its cards, ─, Line Numbers;  each ticked while on.
 * - Run:  Compile and Run, Restart, ─, Inspect App, Stop Inspecting, ─, Clear Console.
 * - Help:  Help, which does nothing yet;  none in the static build.  A menu of one item:  still the editor's own.
 * - `mode`:  the page's, ticked in View.
 * - SIDE EFFECT:  keeps the editor's Spell in step with the editor, for what greys and ticks its rows.
 ****************/
export function AppBarMenus(props: { mode: Mode }): JSX.Element {
  const spell = editorSpell((app, loaded) => {
    Object.assign(
      app.editMenu,
      loaded.parts({
        undo: { draw: () => <Actions.undo menu icon="undo" /> },
        redo: { draw: () => <Actions.redo menu icon="redo" /> },
        partActions: { draw: () => <PartMenuItems /> }
      })
    )
  })
  followEditor(spell, (): EditorValues => ({
    canRevert: editor.canRevertChanges,
    revertWords: appTexts.text("revertChanges"),
    autoSaving: editor.isAutoSaving,
    unsaved: editor.hasUnsavedEdits,
    mayCreate: editor.mayCreate && (!isStaticBuild || editor.canChangeProject),
    mayDesign: editor.mayDesign,
    mayChangeProject: !isStaticBuild || editor.canChangeProject,
    running: props.mode === "run",
    codeIsShowing: props.mode === "edit" && !CodeShown.isClosed(editor.project?.path),
    compiledCodeIsShowing: props.mode === "edit" && !!CodeOutputShown.target,
    programPanelShowing: props.mode === "edit" && ProgramPanelShown.isShowing,
    inspectorOpen: Inspector.isOpen,
    lineNumbersShowing: LineNumbers.isShowing,
    inspecting: Inspector.isInspecting,
    siteReady: EditorMode.hasSite,
    consoleEmpty: !runtimeConsole()?.lines.length
  }))
  const help = () => <Actions.showHelp menu disabled />
  return (
    <Show when={spell()}>
      {(loaded) => (
        <>
          <span class="AppBarMenus">
            <For each={BAR_MENUS}>
              {(name) => {
                const title = () => titleOf(loaded(), name)
                return (
                  <BarMenu
                    id={barMenuId(name)}
                    label={title()}
                    name={title()}
                    panel={() => <SpellMenu spell={loaded()} view={(app) => app[name]} />}
                  />
                )
              }}
            </For>
            <Show when={!isStaticBuild}>
              <BarMenu id="HelpBarMenu" label={appTexts.text("menuHelp")} name={appTexts.text("menuHelp")}>
                {help()}
              </BarMenu>
            </Show>
          </span>
          <FoldedBarMenus spell={loaded()} help={help} />
        </>
      )}
    </Show>
  )
}

/** The bar's menus in `SpellEditor.spell`, in the bar's order:  each the app's member of that name. */
const BAR_MENUS = ["fileMenu", "editMenu", "viewMenu", "runMenu"] as const satisfies readonly EditorMemberName<
  "SpellEditor",
  "view"
>[]

/** One of `BAR_MENUS`. */
type BarMenuName = (typeof BAR_MENUS)[number]

/** Bar menu `name`'s title, the Spell's word for it, in the page's language (`appTexts.titles`). */
function titleOf(spell: EditorSpell, name: BarMenuName): string {
  // a menu the Spell no longer has (renamed):  its name, and the load's notice says why
  const title = (spell.editor[name] as BarMenuView | undefined)?.title ?? name
  return appTexts.titles[title] ?? title
}

/****************
 * ### `<FoldedBarMenus>`
 * File · Edit · View · Run · Help folded into one ☰ menu, each a sub-menu, on a tablet's width (Owen, 2026-11-04,
 * epic `editor` I46):  so Run | Edit keeps its words in the bar's middle, and nothing runs over anything.
 * - The same menus as the bar's own, from the same Spell, drawn again inside the sub-menus.
 * - Each a `<ui-submenu>` row, the Spell's menu written inside it:
 *   File's and View's tick what's on, as the bar's own do (the Spell's menu has `ticks`).
 * - Shown only between the phone's width and the desktop's (`MenuBar.css`);  a phone runs only, as before.
 ****************/
function FoldedBarMenus(props: { spell: EditorSpell; help: () => JSX.Element }): JSX.Element {
  return (
    <span class="AppBarMenusFolded">
      <BarMenu id="FoldedBarMenu" class="FoldedBarMenu" label={<ui-icon name="bars" />} name={appTexts.text("menuAll")}>
        <For each={BAR_MENUS}>
          {(name) => (
            <ui-submenu label={titleOf(props.spell, name)} icon={FOLDED_ICONS[name]}>
              <SpellMenu spell={props.spell} view={(app) => app[name]} />
            </ui-submenu>
          )}
        </For>
        <Show when={!isStaticBuild}>
          <ui-submenu label={appTexts.text("menuHelp")} icon={FOLDED_ICONS.helpMenu}>
            {props.help()}
          </ui-submenu>
        </Show>
      </BarMenu>
    </span>
  )
}

/** Each folded menu's row's icon, by its name in the Spell. */
const FOLDED_ICONS: Record<string, string> = {
  fileMenu: "file outline",
  editMenu: "edit outline",
  viewMenu: "eye",
  runMenu: "play",
  helpMenu: "question circle outline"
}

/** A bar menu's element id, from its name in the Spell:  `editMenu` => `EditBarMenu`. */
function barMenuId(name: string): string {
  return `${name[0]!.toUpperCase()}${name.slice(1).replace(/Menu$/, "")}BarMenu`
}

/** Show the code editor's settings, in Edit:  from Run, the editor page first. */
function showCodeSettings() {
  EditorMode.show("edit")
  if (!CodeSettings.isShowing) CodeSettings.toggleShowing()
}

/** View › Program Panel:  shown under the code in Edit, or hidden;  from Run, Edit with it showing. */
function toggleProgramPanel(mode: Mode) {
  if (mode === "run") {
    ProgramPanelShown.set(true)
    EditorMode.show("edit")
  } else ProgramPanelShown.toggle()
}

/** Run › Inspect App:  start inspecting, opening the Inspector if it's closed (which starts it). */
export function startInspecting() {
  if (!Inspector.isOpen) Inspector.toggle()
  else Inspector.startInspecting()
}

////////////////
// ## The editor's Spell
////////////////

/**
 * The editor's own Spell (`loadEditorSpell()`), loaded once for the page, its actions the editor's (`handOverActions()`):
 * the menus', and the file tabs' right-click menu's.
 */
export function editorSpellWithActions(): Promise<EditorSpell> {
  loadingWithActions ??= loadEditorSpell().then((spell) => {
    handOverActions(spell)
    return spell
  })
  return loadingWithActions
}
let loadingWithActions: Promise<EditorSpell> | undefined

/**
 * The editor's Spell, as an accessor:  `undefined` until it's loaded (`editorSpellWithActions()`).
 * - `holes`:  run once it's loaded, to hand its views what the editor draws in their holes (`loaded.parts()`).
 * - Call in a component body.
 * - NEVER throws:  Spell that won't load leaves the menus empty, and says so on the console;
 *   so does a view of it `holes` can't fill.
 */
function editorSpell(holes?: (app: SpellEditorApp, loaded: EditorSpell) => void): () => EditorSpell | undefined {
  const [spell, setSpell] = createSignal<EditorSpell>()
  editorSpellWithActions().then(
    (loaded) => {
      // a view the Spell no longer has (renamed):  the load's notice says so, and its menu stays empty
      try {
        holes?.(loaded.editor, loaded)
      } catch (problem) {
        console.error("the menus can't fill the editor's Spell", problem)
      }
      setSpell(() => loaded)
    },
    (problem: unknown) => console.error("the menus can't load the editor's Spell", problem)
  )
  return spell
}

/**
 * Keep the editor's Spell in step with `values`, the editor's state its rows grey, tick and title by.
 * - Each by its name in `EDITOR_NAMES`:  one not there doesn't compile.
 */
function followEditor(spell: () => EditorSpell | undefined, values: () => EditorValues) {
  createEffect(
    () => [spell(), values()] as const,
    ([loaded, now]) => {
      if (loaded) Object.assign(loaded.editor, now)
    }
  )
}

/** The editor's state its Spell's rows grey, tick and title by:  each by its name in `EDITOR_NAMES`. */
type EditorValues = Partial<Record<EditorMemberName<"SpellEditor", "value">, unknown>>

/**
 * What each action of the editor's Spell DOES, the editor's own:  each a method of its name on `app`,
 * which a row's click runs through the core (`core.runAction()`).
 * - Each starts its work and returns (`started()`):  a dialog it opens (Rename's) never holds the next row's click.
 * - SIDE EFFECT:  once, as the Spell loads.
 */
function handOverActions(spell: EditorSpell) {
  const app = spell.editor
  // every action `EDITOR_NAMES` lists, and no other
  const actions: Record<EditorMemberName<"SpellEditor", "action">, () => unknown> = {
    home: () => editor.showProjectChooser(),
    aboutSpell: () => showAboutSpell(spell),
    renameProject: () => editor.renameApp(),
    deleteProject: () => editor.deleteApp(),
    duplicateProject: () => editor.duplicateApp(),
    resetToSaved: () => editor.resetApp(),
    publish: () => editor.publish(),
    versions: () => editor.showVersions(),
    deleteDraft: () => editor.deleteDraft(),
    projectSettings: () => editor.showProjectSettings(),
    exportProject: () => editor.exportApp(),
    importProject: () => editor.importApp(),
    newSpellFile: () => editor.createFile(),
    newCssFile: () => editor.createCssFile(),
    save: () => editor.saveAll(),
    autoSave: () => editor.toggleAutoSave(),
    duplicateFile: () => editor.duplicateFile(),
    renameFile: () => editor.renameFile(),
    deleteFile: () => editor.deleteFile(),
    revertChanges: () => editor.revertChanges(),
    find: () => runCodeEditorCommand(EDITOR_HOTKEYS.find.codeEditorCommand),
    codeSettings: () => showCodeSettings(),
    runMode: () => EditorMode.show("run"),
    editMode: () => EditorMode.show("edit"),
    siteView: () => editor.showSiteEditor(),
    showCode: () => {
      EditorMode.show("edit")
      CodeShown.set(editor.project?.path, CodeShown.isClosed(editor.project?.path))
    },
    showCompiledCode: () => {
      EditorMode.show("edit")
      CodeOutputShown.toggle()
    },
    showProgramPanel: () => toggleProgramPanel(app.running ? "run" : "edit"),
    showInspector: () => Inspector.showOrHide(),
    showLineNumbers: () => LineNumbers.toggle(),
    compileAndRun: () => editor.compileApp(),
    restart: () => editor.restartApp(),
    inspectApp: () => startInspecting(),
    stopInspecting: () => Inspector.stopInspecting(),
    clearConsole: () => runtimeConsole()?.clear()
  }
  for (const [name, work] of Object.entries(actions)) app[name] = () => started(work())
}

/**
 * Spell › About Spell…:  `SpellEditor.spell`'s `about box`, a `<ui-modal>` drawn in `<body>`, removed once it closes.
 * - What it says is the Spell's, to change there;  its version is the editor's (`__PACKAGE_VERSION__`).
 */
async function showAboutSpell(spell: EditorSpell): Promise<void> {
  await uiReady
  const box = spell.editor.aboutBox
  box.version = __PACKAGE_VERSION__
  const host = document.createElement("div")
  host.className = "AboutSpell"
  document.body.append(host)
  const dispose = render(() => spell.drawInPlace(box) as JSX.Element, host)
  host.addEventListener(
    "ui-closed",
    () => {
      dispose()
      host.remove()
    },
    { once: true }
  )
}

/** Let `work` go on by itself:  a failure shows as the editor shows errors. */
function started(work: unknown) {
  void Promise.resolve(work).catch((problem: unknown) => editor.showError(problem))
}

/**
 * A menu of the editor's Spell, drawn in place:  `view(app)`'s drawing, a Spell UI `<ui-menu>` of its rows
 * (`SpellEditor.spell`).
 * - Its titles in the page's language:  drawn again as that language's texts arrive (`appTexts.titles`).
 * - Nothing while `spell` is still loading, nor for a view it doesn't have.
 */
function SpellMenu(props: {
  spell: EditorSpell | undefined
  view: (app: SpellEditorApp) => Record<string, unknown> | undefined
}): JSX.Element {
  return (
    <>
      {(() => {
        const { spell } = props
        if (!spell) return null
        const view = props.view(spell.editor)
        // a view the Spell no longer has (renamed):  an empty menu, and the load's notice says why
        if (!view) return null
        spell.useTitles(appTexts.titles)
        return spell.drawInPlace(view) as JSX.Element
      })()}
    </>
  )
}

/** The tag of a menu's items. */
const ACTION_TAG = "ui-action"
