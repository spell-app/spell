import { For, Show, createContext, createEffect, createSignal, useContext } from "solid-js"
import type { JSX } from "@solidjs/web"

import { SP } from "spell/parser/spell"
import { editor } from "spell/app/app/editor"
import { appTexts } from "spell/app/app/ui/AppTexts"
import { isStaticBuild } from "spell/app/app/static/staticBuild"
import {
  Action,
  Actions,
  AppMark,
  CodeSettings,
  CodeShown,
  EditorMode,
  EditorTheme,
  INSPECTOR_PANELS,
  Inspector,
  LineNumbers,
  PANEL_TEXTS,
  PROJECT_ICON,
  PartMenuItems,
  ProgramPanelShown,
  followTabTitle,
  on,
  openProject,
  tracked,
  trackProjectRoot,
  type Mode
} from "spell/app/app/solid"
import { EDITOR_HOTKEYS } from "spell/app/app/pages/editorHotkeys"
import { loadLayoutPiece } from "spell/app/app/layout/layoutSpell"
import appMenusSpell from "spell/app/app/layout/AppMenus/AppMenus.spellml"
import { ActionMenus } from "spell/app/app/runner/ActionMenus"
import type { MenuItem } from "spell/parser/core"

import "./MenuBar.css"

//
//  ## The editor's top bar's MENUS (epic `debut` P32):  the project's, then File · Edit · View · Run · Help.
//  - Each is a `<BarMenu>`:  its name a quiet button in the bar, a click opening its items under it.
//  - The items are `<Action menu>`s (`<ui-action>`):  each title with its key, from `EDITOR_HOTKEYS`.
//  - The static build's actions that need a server draw nothing (`HIDDEN_IN_STATIC_BUILD`, `Actions.tsx`);
//    a divider left first, last or doubled hides itself (`MenuBar.css`).
//  - Look:  `MenuBar.css`.
//

/****************
 * ### `<BarMenu>`
 * One menu of the top bar:  its name, a button;  a click opens its items under it, a Spell UI popup.
 * - Its items (`children`):  `<Action menu>`s, dividers (`<ui-action kind="divider">`) and `<SubMenuRow>`s.
 * - A SUB-MENU is a panel beside the items, shown while its row is hovered or clicked (`subMenus`, by id),
 *   as the epic page's gear does.
 * - Choosing an action closes the menu;  so does a click elsewhere, or Esc (the popup's own).
 ****************/
export function BarMenu(props: BarMenuProps): JSX.Element {
  const [openSub, setOpenSub] = createSignal<string>()
  let popup: (HTMLElement & { visible?: boolean }) | undefined
  const control: BarMenuControl = {
    openSub: () => openSub(),
    showSub: (sub) => setOpenSub(sub),
    close: () => {
      if (popup) popup.visible = false
    }
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
        ref={(element: HTMLElement) => {
          popup = element
          on("ui-closed", () => setOpenSub(undefined))(element)
        }}
      >
        <BarMenuContext value={control}>
          <div class="BarMenuPanel" onClick={(event) => closeOnAction(event, control)}>
            <ui-menu
              direction="vertical"
              size="small"
              class="BarMenuItems"
              ticks={props.ticks ? "" : undefined}
              aria-label={props.name}
              onPointerOver={(event) => followPointer(event, control)}
            >
              {props.children}
            </ui-menu>
            <For each={Object.entries(props.subMenus ?? {})}>
              {([sub, panel]) => (
                <div class="BarSubMenu" data-sub={sub} hidden={openSub() !== sub}>
                  {panel()}
                </div>
              )}
            </For>
          </div>
        </BarMenuContext>
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
  /** Its sub-menus' panels, by the id their `<SubMenuRow sub>` names. */
  subMenus?: Record<string, () => JSX.Element>
  /** Its rows are on or off:  a tick for what is on (`<ui-menu ticks>`). */
  ticks?: boolean
  /** Its items. */
  children?: JSX.Element
}

/** What a `<BarMenu>`'s items reach it by:  its sub-menu shown, and closing it. */
type BarMenuControl = {
  /** The sub-menu shown, by its id, if any. */
  openSub: () => string | undefined
  /** Show sub-menu `sub` beside the items;  `undefined`:  none. */
  showSub: (sub: string | undefined) => void
  /** Close the menu. */
  close: () => void
}

/** The `<BarMenu>` an item is in. */
const BarMenuContext = createContext<BarMenuControl | null>(null)

/** A click in a menu's panel:  an action chosen (not a sub-menu's row) closes it. */
function closeOnAction(event: MouseEvent, control: BarMenuControl) {
  const action = event
    .composedPath()
    .find((target): target is Element => (target as Element).localName === ACTION_TAG) as Element | undefined
  if (!action || action.classList.contains(SUB_ROW) || action.getAttribute("kind") === "divider") return
  if (action.hasAttribute("disabled")) return
  control.close()
}

/** The pointer over a menu's items:  over a sub-menu's row, its panel shows;  over any other item, none does. */
function followPointer(event: PointerEvent, control: BarMenuControl) {
  const row = event.composedPath().find((target): target is Element => (target as Element).localName === ACTION_TAG) as
    | Element
    | undefined
  if (!row) return
  control.showSub(row.classList.contains(SUB_ROW) ? (row.getAttribute("data-sub") ?? undefined) : undefined)
}

/****************
 * ### `<SubMenuRow>`
 * A `<BarMenu>`'s row opening a sub-menu beside it:  its title, then a chevron;  the pointer over it, or a click.
 * - `sub`:  the sub-menu's id, a key of its menu's `subMenus`.
 ****************/
export function SubMenuRow(props: { sub: string; children: JSX.Element }): JSX.Element {
  const control = useContext(BarMenuContext)
  return (
    <ui-action
      class={SUB_ROW}
      data-sub={props.sub}
      aria-haspopup="menu"
      selected={control?.openSub() === props.sub}
      onClick={() => control?.showSub(props.sub)}
    >
      {props.children}
      <ui-icon name="chevron right" class="SubMenuChevron" />
    </ui-action>
  )
}

/** A line between groups of items. */
function Divider(): JSX.Element {
  return <ui-action kind="divider" />
}

/****************
 * ### `<ProjectBarMenu>`
 * The top bar's first menu, the PROJECT's, after Spell's hat and name (`<AppMark>`, our major branding):
 * the project's name, bold, a caret after it.
 * - Rename Solitaire…, Delete Solitaire…, Reset to Saved, ─, Theme:  Fruity ›.
 * - Everything else about a project is in the File menu.
 * - Theme ›:  Spell UI's theme menu in its menu mode (`<ui-theme-menu show="menu">`), then Edit Theme….
 * - SIDE EFFECT:  names the browser's tab for the project (`followTabTitle()`).
 ****************/
export function ProjectBarMenu(): JSX.Element {
  followTabTitle()
  const shown = tracked(() => ({
    path: editor.project?.path ?? "",
    title: editor.project ? new SP.SpellProject(editor.project.path).title : ""
  }))
  const project = () => ({ project: shown().title })
  return (
    <>
      <AppMark />
      <BarMenu
        id="ProjectBarMenu"
        class="ProjectBarMenu"
        name={appTexts.text("projectMenu", project())}
        label={
          <span class="ProjectBarLabel">
            <span class="ProjectName">{shown().title}</span>
            <ui-icon name="dropdown" class="ProjectCaret" />
          </span>
        }
        subMenus={{ theme: () => <ThemeSubMenu /> }}
      >
        <Actions.renameApp menu title={appTexts.text("renameProject", project())} />
        <Actions.deleteApp menu title={appTexts.text("deleteProject", project())} />
        <Actions.resetApp menu />
        <Divider />
        <SubMenuRow sub="theme">{appTexts.text("themeIs", { theme: EditorTheme.chosenTitle })}</SubMenuRow>
      </BarMenu>
    </>
  )
}

/****************
 * ### `<FileBarMenu>`
 * The File menu:  its items, their order, keys, and when each is greyed or ticked are Spell, `AppMenus.spellml`.
 * - What each does, and what it's called, is here:  `itemFor()`, by the item's name.
 * - The project's name is in Duplicate's title.
 * - More Examples ›:  the group's projects, the one shown ticked;  in columns of 10 when there are more
 *   (Owen:  "More examples should be in columns if there are more than 10").
 *   `useRunner`:  the one chosen opens in Run.
 * - The static build's actions that need a server draw nothing, as everywhere (`HIDDEN_IN_STATIC_BUILD`).
 ****************/
export function FileBarMenu(props: { useRunner?: boolean }): JSX.Element {
  const root = trackProjectRoot(() => undefined)
  const projectName = tracked(() => (editor.project ? new SP.SpellProject(editor.project.path).title : ""))
  const path = tracked(() => editor.project?.path ?? "")
  const items = spellMenu("file menu")
  const itemFor = (item: SpellMenuAction): JSX.Element => {
    const state = itemState(item)
    switch (item.name) {
      case "moreExamples":
        return <SubMenuRow sub="projects">{appTexts.text("moreProjects", root().words)}</SubMenuRow>
      case "newFile":
        return <Actions.createFile {...state} />
      case "newExample":
        return <Actions.createApp {...state} />
      case "save":
        return <Actions.saveFile {...state} />
      case "discardChanges":
        return <Actions.discardChanges {...state} disabled={!item.isEnabled} />
      case "duplicateProject":
        return <Actions.duplicateApp {...state} title={appTexts.text("duplicateProject", { project: projectName() })} />
      case "projectSettings":
        return <Actions.showProjectSettings {...state} title={appTexts.text("menuProjectSettings")} />
      case "autoSave":
        return (
          <Action
            {...state}
            title={appTexts.text("autoSave")}
            active={item.isSelected}
            onClick={() => editor.toggleAutoSave()}
          />
        )
      case "exportProject":
        return <Actions.exportApp {...state} />
      case "importProject":
        return <Actions.importApp {...state} />
      case "home":
        return <Actions.showProjectChooser {...state} />
      default:
        return null
    }
  }
  return (
    <BarMenu
      id="FileBarMenu"
      label={appTexts.text("menuFile")}
      name={appTexts.text("menuFile")}
      ticks
      subMenus={{
        projects: () => (
          <ui-menu
            direction="vertical"
            size="small"
            ticks=""
            class={["ProjectsSubMenu", { many: root().projects.length > PROJECTS_PER_COLUMN }]}
            aria-label={appTexts.text("moreProjects", root().words)}
          >
            <For each={root().projects}>
              {(each) => (
                <ui-action selected={each.path === path()} onClick={() => openProject(each.path, props.useRunner)}>
                  <ui-icon name={root().icon ?? PROJECT_ICON} />
                  {each.name}
                </ui-action>
              )}
            </For>
          </ui-menu>
        )
      }}
    >
      <SpellMenuRows items={items()} itemFor={itemFor} />
    </BarMenu>
  )
}

/** More projects than this:  the project menu's More sub-menu lists them in columns of this many. */
const PROJECTS_PER_COLUMN = 10

/**
 * The project menu's Theme sub-menu:  Spell UI's theme menu drawn in place (Light | Dark | Auto, the tint, every
 * theme), then Edit Theme…, the theme editor's page.
 */
function ThemeSubMenu(): JSX.Element {
  return (
    <div class="ThemeSubMenu">
      <ui-theme-menu show="menu" bench={import.meta.env.DEV ? String(import.meta.env.SPELL_PAGE_SERVER) : "none"} />
      <ui-menu direction="vertical" size="small" aria-label={appTexts.text("editTheme")}>
        <Divider />
        <Action menu title={appTexts.text("editTheme")} onClick={() => editor.showThemeEditor()} />
      </ui-menu>
    </div>
  )
}

/****************
 * ### `<AppBarMenus>`
 * The top bar's app menus, after the project's:  File · Edit · View · Run · Help, quieter than its name.
 * - File, Edit, View and Run:  their items, order, keys, greying and ticks are Spell, `AppMenus.spellml`
 *   (epic `editor`, Backing In Spell);  what each item does, and its title, is here, by the item's name.
 * - Edit:  the code editor's Undo, Redo, ─, the selection's part actions, ─, Find, ─, Code Editor Settings….
 * - View:  Run, Edit, ─, Code, Program Panel, ─, the Inspector and its cards, ─, Line Numbers;  each ticked while on.
 * - Run:  Compile and Run, Restart, ─, Inspect App, Stop Inspecting, ─, Clear Console.
 * - Help:  Help, which does nothing yet;  none in the static build.  A menu of one item:  still the editor's own.
 * - `mode`:  the page's, ticked in View.
 * - SIDE EFFECT:  keeps the menus' Spell thing in step with the editor, for what greys and ticks their items.
 ****************/
export function AppBarMenus(props: { mode: Mode }): JSX.Element {
  followAppMenus(() => ({
    canDiscard: editor.canDiscardChanges,
    autoSaving: editor.isAutoSaving,
    running: props.mode === "run",
    codeShowing: props.mode === "edit" && !CodeShown.isClosed(editor.project?.path),
    programPanelShowing: props.mode === "edit" && ProgramPanelShown.isShowing,
    inspectorOpen: Inspector.isOpen,
    lineNumbersShowing: LineNumbers.isShowing,
    inspecting: Inspector.isInspecting
  }))
  const edit = spellMenu("edit menu")
  const view = spellMenu("view menu")
  const run = spellMenu("run menu")
  const editItem = (item: SpellMenuAction): JSX.Element => {
    const state = itemState(item)
    switch (item.name) {
      case "undo":
        return <Actions.undo {...state} />
      case "redo":
        return <Actions.redo {...state} />
      case "partActions":
        return <PartMenuItems />
      case "find":
        return <Actions.find {...state} />
      case "codeSettings":
        return <Action {...state} title={appTexts.text("codeSettings")} onClick={() => showCodeSettings()} />
      default:
        return null
    }
  }
  const viewItem = (item: SpellMenuAction): JSX.Element => {
    const state = itemState(item)
    switch (item.name) {
      case "runMode":
        return (
          <Action
            {...state}
            title={appTexts.text("runMode")}
            active={item.isSelected}
            onClick={() => EditorMode.show("run")}
          />
        )
      case "editMode":
        return (
          <Action
            {...state}
            title={appTexts.text("editMode")}
            active={item.isSelected}
            onClick={() => EditorMode.show("edit")}
          />
        )
      case "showCode":
        return (
          <Action
            {...state}
            title={appTexts.text("menuCode")}
            active={item.isSelected}
            onClick={() => {
              EditorMode.show("edit")
              CodeShown.set(editor.project?.path, CodeShown.isClosed(editor.project?.path))
            }}
          />
        )
      case "showProgramPanel":
        return (
          <Action
            {...state}
            title={appTexts.text("programPanel")}
            active={item.isSelected}
            onClick={() => toggleProgramPanel(props.mode)}
          />
        )
      case "showInspector":
        return (
          <Action
            {...state}
            title={appTexts.text("inspector")}
            active={item.isSelected}
            onClick={() => Inspector.toggle()}
          />
        )
      case "inspectorCards":
        return (
          <For each={INSPECTOR_PANELS}>
            {(panel) => (
              <Action
                menu
                title={appTexts.text("inspectorCard", { card: appTexts.text(PANEL_TEXTS[panel]) })}
                active={Inspector.isOpen && Inspector.isShown(panel)}
                onClick={() => Inspector.setShown(panel, !(Inspector.isOpen && Inspector.isShown(panel)))}
              />
            )}
          </For>
        )
      case "showLineNumbers":
        return (
          <Action
            {...state}
            title={appTexts.text("lineNumbers")}
            active={item.isSelected}
            onClick={() => LineNumbers.toggle()}
          />
        )
      default:
        return null
    }
  }
  const runItem = (item: SpellMenuAction): JSX.Element => {
    const state = itemState(item)
    switch (item.name) {
      case "compileAndRun":
        return <Actions.compileApp {...state} />
      case "restart":
        return <Actions.restartApp {...state} />
      case "inspectApp":
        return (
          <Action
            {...state}
            title={appTexts.text("inspectApp")}
            disabled={!item.isEnabled}
            onClick={() => startInspecting()}
          />
        )
      case "stopInspecting":
        return (
          <Action
            {...state}
            title={appTexts.text("stopInspecting")}
            disabled={!item.isEnabled}
            shortcut={EDITOR_HOTKEYS.stopInspecting.shortcut}
            onClick={() => Inspector.stopInspecting()}
          />
        )
      case "clearConsole":
        return <Actions.clearConsole {...state} />
      default:
        return null
    }
  }
  return (
    <span class="AppBarMenus">
      <FileBarMenu useRunner={props.mode === "run"} />
      <BarMenu id="EditBarMenu" label={appTexts.text("menuEdit")} name={appTexts.text("menuEdit")}>
        <SpellMenuRows items={edit()} itemFor={editItem} />
      </BarMenu>
      <BarMenu id="ViewBarMenu" label={appTexts.text("menuView")} name={appTexts.text("menuView")} ticks>
        <SpellMenuRows items={view()} itemFor={viewItem} />
      </BarMenu>
      <BarMenu id="RunBarMenu" label={appTexts.text("menuRun")} name={appTexts.text("menuRun")}>
        <SpellMenuRows items={run()} itemFor={runItem} />
      </BarMenu>
      <Show when={!isStaticBuild}>
        <BarMenu id="HelpBarMenu" label={appTexts.text("menuHelp")} name={appTexts.text("menuHelp")}>
          <Actions.showHelp menu disabled />
        </BarMenu>
      </Show>
    </span>
  )
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
// ## The menus' Spell
////////////////

/** The app menus' thing, `AppMenus.spellml`, loaded once for the page:  every bar menu reads its own menu of it. */
function appMenus(): Promise<{ thing: AppMenusThing; menuOf: (thing: object, name: string) => MenuItem[] }> {
  loadingAppMenus ??= loadLayoutPiece(appMenusSpell).then(({ exports, menu }) => ({
    thing: exports.appMenus as AppMenusThing,
    menuOf: menu
  }))
  return loadingAppMenus
}
let loadingAppMenus: ReturnType<typeof appMenus> | undefined

/**
 * Menu `name` of `AppMenus.spellml`:  its items, once its Spell has loaded, none before.
 * - NEVER throws:  Spell that won't load leaves the menu empty, and says so on the console.
 */
function spellMenu(name: string): () => MenuItem[] {
  const [items, setItems] = createSignal<MenuItem[]>([])
  appMenus().then(
    ({ thing, menuOf }) => setItems(menuOf(thing, name)),
    (problem: unknown) => console.error(`<AppBarMenus>:  can't load the Spell of the ${name}`, problem)
  )
  return items
}

/** Keep the menus' thing in step with `values`, the editor's state its items grey and tick by. */
function followAppMenus(values: () => Partial<AppMenusThing>) {
  const [thing, setThing] = createSignal<AppMenusThing>()
  appMenus().then(
    ({ thing }) => setThing(() => thing),
    () => undefined // `spellMenu()` says so
  )
  createEffect(
    () => [thing(), values()] as const,
    ([it, now]) => {
      if (it) Object.assign(it, now)
    }
  )
}

/** A menu's items, as Spell orders them:  each action drawn by `itemFor`, a line at each break. */
export function SpellMenuRows(props: {
  items: MenuItem[]
  itemFor: (item: SpellMenuAction) => JSX.Element
}): JSX.Element {
  // a sub-menu (epic `language` P19) isn't drawn here yet:  the editor's own menus have none
  return (
    <For each={props.items}>
      {(item) => (item.kind === "action" ? props.itemFor(item) : item.kind === "separator" ? <Divider /> : null)}
    </For>
  )
}

/**
 * What every `<Action>` takes from its Spell item:  it's in a menu, with the key the Spell names, if any.
 * - No key named:  the action's own, from `EDITOR_HOTKEYS`.
 * - Greyed and ticked only where the Spell says when (`enabled-when`, `selected-when`):  those rows pass
 *   `disabled={!item.isEnabled}` or `active={item.isSelected}` themselves, so an action's own (Clear Console
 *   greyed while the console's empty, Save ticked while the file has changes) isn't overruled.
 */
function itemState(item: SpellMenuAction): { menu: true; shortcut?: string } {
  return item.shortcut ? { menu: true, shortcut: ActionMenus.shortcutForUI(item.shortcut) } : { menu: true }
}

/** An action of a menu in `AppMenus.spellml`, as `core.menuOf()` gives it. */
export type SpellMenuAction = MenuItem & { kind: "action" }

/** The app menus' thing, as `AppMenus.spellml` compiles:  the editor's state its items grey and tick by. */
type AppMenusThing = {
  canDiscard: boolean
  autoSaving: boolean
  running: boolean
  codeShowing: boolean
  programPanelShowing: boolean
  inspectorOpen: boolean
  lineNumbersShowing: boolean
  inspecting: boolean
}

/** The tag of a menu's items. */
const ACTION_TAG = "ui-action"
/** The class of a sub-menu's row. */
const SUB_ROW = "SubMenuRow"
