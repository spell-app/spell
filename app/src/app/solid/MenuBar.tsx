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
import fileMenuSpell from "spell/app/app/layout/FileMenu/FileMenu.spellml"
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
 * The File menu:  its items, their order, keys, and when each is greyed or ticked are Spell, `FileMenu.spellml`.
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
  const [items, setItems] = createSignal<MenuItem[]>([])
  const [menu, setMenu] = createSignal<FileMenuThing>()
  void loadLayoutPiece(fileMenuSpell).then(
    ({ exports, menu: menuOf }) => {
      const thing = exports.fileMenu as FileMenuThing
      setMenu(() => thing)
      setItems(menuOf(thing, "file menu"))
    },
    (problem: unknown) => console.error("<FileBarMenu>:  can't load its Spell", problem)
  )
  createEffect(
    () => [menu(), editor.canDiscardChanges, editor.isAutoSaving] as const,
    ([thing, canDiscard, isAutoSaving]) => {
      if (!thing) return
      thing.canDiscard = canDiscard
      thing.autoSaving = isAutoSaving
    }
  )
  const itemFor = (item: MenuItem & { kind: "action" }): JSX.Element => {
    const state = {
      menu: true,
      shortcut: item.shortcut && ActionMenus.shortcutForUI(item.shortcut),
      // live:  read as each item draws, and again as the menu's thing changes
      get disabled() {
        return !item.isEnabled
      },
      get active() {
        return item.isSelected
      }
    }
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
        return <Actions.discardChanges {...state} />
      case "duplicateProject":
        return <Actions.duplicateApp {...state} title={appTexts.text("duplicateProject", { project: projectName() })} />
      case "projectSettings":
        return <Actions.showProjectSettings {...state} title={appTexts.text("menuProjectSettings")} />
      case "autoSave":
        return <Action {...state} title={appTexts.text("autoSave")} onClick={() => editor.toggleAutoSave()} />
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
      <For each={items()}>{(item) => (item.kind === "action" ? itemFor(item) : <Divider />)}</For>
    </BarMenu>
  )
}

/** The File menu's thing, as `FileMenu.spellml` compiles;  the page fills its actions in by what `<FileBarMenu>` draws. */
type FileMenuThing = { canDiscard: boolean; autoSaving: boolean }

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
 * - File:  written in Spell (`<FileBarMenu>`).
 * - Edit:  the code editor's Undo, Redo, ─, Find, ─, Code Editor Settings….
 * - View:  Run, Edit, ─, Program Panel, ─, the Inspector and its cards, ─, Line Numbers;  each ticked while on.
 * - Run:  Compile and Run, Restart, ─, Inspect App, Stop Inspecting, ─, Clear Console.
 * - Help:  Help, which does nothing yet;  none in the static build.
 * - `mode`:  the page's, ticked in View.
 ****************/
export function AppBarMenus(props: { mode: Mode }): JSX.Element {
  return (
    <span class="AppBarMenus">
      <FileBarMenu useRunner={props.mode === "run"} />
      <BarMenu id="EditBarMenu" label={appTexts.text("menuEdit")} name={appTexts.text("menuEdit")}>
        <Actions.undo menu />
        <Actions.redo menu />
        <Divider />
        <PartMenuItems />
        <Divider />
        <Actions.find menu />
        <Divider />
        <Action menu title={appTexts.text("codeSettings")} onClick={() => showCodeSettings()} />
      </BarMenu>
      <BarMenu id="ViewBarMenu" label={appTexts.text("menuView")} name={appTexts.text("menuView")} ticks>
        <Action
          menu
          title={appTexts.text("runMode")}
          active={props.mode === "run"}
          onClick={() => EditorMode.show("run")}
        />
        <Action
          menu
          title={appTexts.text("editMode")}
          active={props.mode === "edit"}
          onClick={() => EditorMode.show("edit")}
        />
        <Divider />
        <Action
          menu
          title={appTexts.text("menuCode")}
          active={props.mode === "edit" && !CodeShown.isClosed(editor.project?.path)}
          onClick={() => {
            EditorMode.show("edit")
            CodeShown.set(editor.project?.path, CodeShown.isClosed(editor.project?.path))
          }}
        />
        <Action
          menu
          title={appTexts.text("programPanel")}
          active={props.mode === "edit" && ProgramPanelShown.isShowing}
          onClick={() => toggleProgramPanel(props.mode)}
        />
        <Divider />
        <Action menu title={appTexts.text("inspector")} active={Inspector.isOpen} onClick={() => Inspector.toggle()} />
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
        <Divider />
        <Action
          menu
          title={appTexts.text("lineNumbers")}
          active={LineNumbers.isShowing}
          onClick={() => LineNumbers.toggle()}
        />
      </BarMenu>
      <BarMenu id="RunBarMenu" label={appTexts.text("menuRun")} name={appTexts.text("menuRun")}>
        <Actions.compileApp menu />
        <Actions.restartApp menu />
        <Divider />
        <Action
          menu
          title={appTexts.text("inspectApp")}
          disabled={Inspector.isInspecting}
          onClick={() => startInspecting()}
        />
        <Action
          menu
          title={appTexts.text("stopInspecting")}
          shortcut={EDITOR_HOTKEYS.stopInspecting.shortcut}
          disabled={!Inspector.isInspecting}
          onClick={() => Inspector.stopInspecting()}
        />
        <Divider />
        <Actions.clearConsole menu />
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

/** The tag of a menu's items. */
const ACTION_TAG = "ui-action"
/** The class of a sub-menu's row. */
const SUB_ROW = "SubMenuRow"
