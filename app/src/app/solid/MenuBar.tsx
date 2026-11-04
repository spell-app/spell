import { For, Show, createContext, createEffect, createMemo, createSignal, useContext } from "solid-js"
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
import appMenusSpell from "spell/app/spaces/@spell/editor/app-menus/AppMenus.spellml"
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
              icon-column=""
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
 * - `icon`:  its icon, in the menu's icon column.
 ****************/
export function SubMenuRow(props: { sub: string; icon?: string; children: JSX.Element }): JSX.Element {
  const control = useContext(BarMenuContext)
  return (
    <ui-action
      class={SUB_ROW}
      icon={props.icon}
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
        <SubMenuRow sub="theme" icon="paint brush">
          {appTexts.text("themeIs", { theme: EditorTheme.chosenTitle })}
        </SubMenuRow>
      </BarMenu>
    </>
  )
}

/****************
 * ### `<FileBarMenu>`
 * The File menu:  `menu`, the bar's File in `AppMenus.spellml`, its title and items, keys, icons, greying and ticks.
 * - What each does is here:  `itemFor()`, by the item's name.
 * - The project's name is in Duplicate's title.
 * - More Examples ›:  the group's projects, the one shown ticked;  in columns of 10 when there are more
 *   (Owen:  "More examples should be in columns if there are more than 10").
 *   `useRunner`:  the one chosen opens in Run.
 * - The static build's actions that need a server draw nothing, as everywhere (`HIDDEN_IN_STATIC_BUILD`).
 ****************/
export function FileBarMenu(props: { menu: SpellMenu; useRunner?: boolean }): JSX.Element {
  const root = trackProjectRoot(() => undefined)
  const projectName = tracked(() => (editor.project ? new SP.SpellProject(editor.project.path).title : ""))
  const path = tracked(() => editor.project?.path ?? "")
  const itemFor = (item: SpellMenuAction): JSX.Element => {
    const state = itemState(item)
    switch (item.name) {
      case "moreExamples":
        return (
          <SubMenuRow sub="projects" icon={item.icon}>
            {appTexts.text("moreProjects", root().words)}
          </SubMenuRow>
        )
      case "newFile":
        return <Actions.createFile {...titled(item)} />
      case "newExample":
        return <Actions.createApp {...state} />
      case "save":
        return <Actions.saveFile {...titled(item)} />
      case "discardChanges":
        return <Actions.discardChanges {...titled(item)} disabled={!item.isEnabled} />
      // drafts are the server's:  in the preview a visitor's edits stay in their browser, and Reset Example forgets them
      case "publish":
        if (isStaticBuild) return null
        return <Action {...titled(item)} disabled={!item.isEnabled} onClick={() => void editor.publish()} />
      case "versions":
        if (isStaticBuild) return null
        return <Action {...titled(item)} onClick={() => void editor.showVersions()} />
      case "duplicateProject":
        return <Actions.duplicateApp {...state} title={appTexts.text("duplicateProject", { project: projectName() })} />
      case "projectSettings":
        return <Actions.showProjectSettings {...titled(item)} />
      case "autoSave":
        return <Action {...titled(item)} active={item.isSelected} onClick={() => editor.toggleAutoSave()} />
      case "exportProject":
        return <Actions.exportApp {...titled(item)} />
      case "importProject":
        return <Actions.importApp {...titled(item)} />
      case "home":
        return <Actions.showProjectChooser {...titled(item)} />
      default:
        return null
    }
  }
  return (
    <BarMenu
      id="FileBarMenu"
      label={props.menu.title}
      name={props.menu.title}
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
      <SpellMenuRows items={props.menu.items} itemFor={itemFor} />
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
 * - The bar, File · Edit · View · Run, is Spell, `AppMenus.spellml`'s `bar menu` (epic `editor`, Backing In Spell):
 *   each menu's title, items, order, keys, icons, greying and ticks, and each item's title, in the page's language.
 * - What each item does is here, by the item's name;  so is a title that follows the editor's state
 *   (Undo's, New Example's, Duplicate's, More Examples'), and View's Inspector cards, one row per card.
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
    canPublish: editor.canPublish,
    running: props.mode === "run",
    codeShowing: props.mode === "edit" && !CodeShown.isClosed(editor.project?.path),
    programPanelShowing: props.mode === "edit" && ProgramPanelShown.isShowing,
    inspectorOpen: Inspector.isOpen,
    lineNumbersShowing: LineNumbers.isShowing,
    inspecting: Inspector.isInspecting
  }))
  const bar = spellMenu("bar menu")
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
        return <Actions.find {...titled(item)} />
      case "codeSettings":
        return <Action {...titled(item)} onClick={() => showCodeSettings()} />
      default:
        return null
    }
  }
  const viewItem = (item: SpellMenuAction): JSX.Element => {
    switch (item.name) {
      case "runMode":
        return <Action {...titled(item)} active={item.isSelected} onClick={() => EditorMode.show("run")} />
      case "editMode":
        return <Action {...titled(item)} active={item.isSelected} onClick={() => EditorMode.show("edit")} />
      case "showCode":
        return (
          <Action
            {...titled(item)}
            active={item.isSelected}
            onClick={() => {
              EditorMode.show("edit")
              CodeShown.set(editor.project?.path, CodeShown.isClosed(editor.project?.path))
            }}
          />
        )
      case "showProgramPanel":
        return <Action {...titled(item)} active={item.isSelected} onClick={() => toggleProgramPanel(props.mode)} />
      case "showInspector":
        return <Action {...titled(item)} active={item.isSelected} onClick={() => Inspector.toggle()} />
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
        return <Action {...titled(item)} active={item.isSelected} onClick={() => LineNumbers.toggle()} />
      default:
        return null
    }
  }
  const runItem = (item: SpellMenuAction): JSX.Element => {
    switch (item.name) {
      case "compileAndRun":
        return <Actions.compileApp {...titled(item)} />
      case "restart":
        return <Actions.restartApp {...titled(item)} />
      case "inspectApp":
        return <Action {...titled(item)} disabled={!item.isEnabled} onClick={() => startInspecting()} />
      case "stopInspecting":
        return (
          <Action
            {...titled(item)}
            disabled={!item.isEnabled}
            shortcut={EDITOR_HOTKEYS.stopInspecting.shortcut}
            onClick={() => Inspector.stopInspecting()}
          />
        )
      case "clearConsole":
        return <Actions.clearConsole {...titled(item)} />
      default:
        return null
    }
  }
  return (
    <span class="AppBarMenus">
      <For each={bar()}>
        {(menu) => {
          if (menu.kind !== "menu") return null
          if (menu.name === "fileMenu") return <FileBarMenu menu={menu} useRunner={props.mode === "run"} />
          const itemFor = { editMenu: editItem, viewMenu: viewItem, runMenu: runItem }[menu.name]
          return (
            <Show when={itemFor}>
              {(rowFor) => (
                <BarMenu
                  id={barMenuId(menu.name)}
                  label={menu.title}
                  name={menu.title}
                  ticks={TICKED_MENUS.has(menu.name)}
                >
                  <SpellMenuRows items={menu.items} itemFor={rowFor()} />
                </BarMenu>
              )}
            </Show>
          )
        }}
      </For>
      <Show when={!isStaticBuild}>
        <BarMenu id="HelpBarMenu" label={appTexts.text("menuHelp")} name={appTexts.text("menuHelp")}>
          <Actions.showHelp menu disabled />
        </BarMenu>
      </Show>
    </span>
  )
}

/** The menus of the bar whose rows are on or off:  a tick for what's on (`<BarMenu ticks>`). */
const TICKED_MENUS = new Set(["fileMenu", "viewMenu"])

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
// ## The menus' Spell
////////////////

/** The app menus' thing, `AppMenus.spellml`, loaded once for the page:  every bar menu reads its own menu of it. */
function appMenus(): Promise<{
  thing: AppMenusThing
  menuOf: (thing: object, name: string) => MenuItem[]
  useTitles: (titles: Record<string, string>) => void
}> {
  loadingAppMenus ??= loadLayoutPiece(appMenusSpell, "app-menus").then(({ exports, menu, useTitles }) => ({
    thing: exports.appMenus as AppMenusThing,
    menuOf: menu,
    useTitles
  }))
  return loadingAppMenus
}
let loadingAppMenus: ReturnType<typeof appMenus> | undefined

/**
 * Menu `name` of `AppMenus.spellml`:  its items, once its Spell has loaded, none before.
 * - Its titles in the page's language:  read again as that language's texts arrive (`appTexts.titles`).
 * - NEVER throws:  Spell that won't load leaves the menu empty, and says so on the console.
 */
function spellMenu(name: string): () => MenuItem[] {
  const [menus, setMenus] = createSignal<Awaited<ReturnType<typeof appMenus>>>()
  appMenus().then(
    (loaded) => setMenus(() => loaded),
    (problem: unknown) => console.error(`<AppBarMenus>:  can't load the Spell of the ${name}`, problem)
  )
  return createMemo(() => {
    const loaded = menus()
    if (!loaded) return []
    loaded.useTitles(appTexts.titles)
    return loaded.menuOf(loaded.thing, name)
  })
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
 * What every `<Action>` takes from its Spell item:  it's in a menu, with the key and icon the Spell names, if any.
 * - No key named:  the action's own, from `EDITOR_HOTKEYS`;  no icon named:  the action's own, if it has one.
 * - Greyed and ticked only where the Spell says when (`enabled-when`, `selected-when`):  those rows pass
 *   `disabled={!item.isEnabled}` or `active={item.isSelected}` themselves, so an action's own (Clear Console
 *   greyed while the console's empty, Save ticked while the file has changes) isn't overruled.
 */
export function itemState(item: SpellMenuAction): { menu: true; shortcut?: string; icon?: string } {
  return {
    menu: true,
    // only what the Spell names:  an undefined key would overrule the action's own
    ...(item.shortcut && { shortcut: ActionMenus.shortcutForUI(item.shortcut) }),
    ...(item.icon && { icon: item.icon })
  }
}

/** `itemState()`, and the title the Spell gives the item:  for every row whose title doesn't follow the editor's state. */
export function titled(item: SpellMenuAction): { menu: true; shortcut?: string; icon?: string; title: string } {
  return { ...itemState(item), title: item.title }
}

/** An action of a menu in `AppMenus.spellml`, as `core.menuOf()` gives it. */
export type SpellMenuAction = MenuItem & { kind: "action" }

/** A menu of `AppMenus.spellml`'s bar, as `core.menuOf()` gives it:  its title and its items. */
export type SpellMenu = MenuItem & { kind: "menu" }

/** The app menus' thing, as `AppMenus.spellml` compiles:  the editor's state its items grey and tick by. */
type AppMenusThing = {
  canDiscard: boolean
  autoSaving: boolean
  canPublish: boolean
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
