import { For, Show, createContext, createSignal, useContext } from "solid-js"
import type { JSX } from "@solidjs/web"

import { SP } from "spell/parser/spell"
import { editor } from "spell/app/app/editor"
import { appTexts } from "spell/app/app/ui/AppTexts"
import { isStaticBuild } from "spell/app/app/static/staticBuild"
import {
  Action,
  Actions,
  CodeSettings,
  EditorMode,
  EditorTheme,
  INSPECTOR_PANELS,
  Inspector,
  LineNumbers,
  PANEL_TEXTS,
  PROJECT_ICON,
  ProgramPanelShown,
  followTabTitle,
  on,
  openProject,
  tracked,
  trackProjectRoot,
  type Mode
} from "spell/app/app/solid"
import { EDITOR_HOTKEYS } from "spell/app/app/pages/editorHotkeys"

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
 * The top bar's first menu, the PROJECT's:  Spell's own hat, then the project's name, bold, a caret after it.
 * - New Example, Duplicate Solitaire, ─, Reset to Saved, Rename Solitaire…, Delete Solitaire…, ─,
 *   Project Settings, Theme:  Fruity ›, ─, More Examples ›, ─, Home.
 * - The words follow the project's group:  New Guide, More Guides ...
 * - Theme ›:  Spell UI's theme menu in its menu mode (`<ui-theme-menu show="menu">`), then Edit Theme….
 * - More Examples ›:  the group's projects, the one shown ticked;  in columns of 10 when there are more
 *   (Owen:  "More examples should be in columns if there are more than 10").
 *   `useRunner`:  the one chosen opens in Run.
 * - SIDE EFFECT:  names the browser's tab for the project (`followTabTitle()`).
 ****************/
export function ProjectBarMenu(props: { useRunner?: boolean }): JSX.Element {
  followTabTitle()
  const root = trackProjectRoot(() => undefined)
  const shown = tracked(() => ({
    path: editor.project?.path ?? "",
    title: editor.project ? new SP.SpellProject(editor.project.path).title : ""
  }))
  const project = () => ({ project: shown().title })
  return (
    <BarMenu
      id="ProjectBarMenu"
      class="ProjectBarMenu"
      name={appTexts.text("projectMenu", project())}
      label={
        <span class="ProjectBarLabel">
          <span class="hat" />
          <span class="ProjectName">{shown().title}</span>
          <ui-icon name="dropdown" class="ProjectCaret" />
        </span>
      }
      subMenus={{
        theme: () => <ThemeSubMenu />,
        projects: () => (
          <ui-menu
            direction="vertical"
            size="small"
            class={["ProjectsSubMenu", { many: root().projects.length > PROJECTS_PER_COLUMN }]}
            aria-label={appTexts.text("moreProjects", root().words)}
          >
            <For each={root().projects}>
              {(each) => (
                <ui-action
                  selected={each.path === shown().path}
                  onClick={() => openProject(each.path, props.useRunner)}
                >
                  <ui-icon name={root().icon ?? PROJECT_ICON} />
                  {each.name}
                </ui-action>
              )}
            </For>
          </ui-menu>
        )
      }}
    >
      <Actions.createApp menu />
      <Actions.duplicateApp menu title={appTexts.text("duplicateProject", project())} />
      <Divider />
      <Actions.resetApp menu />
      <Actions.renameApp menu title={appTexts.text("renameProject", project())} />
      <Actions.deleteApp menu title={appTexts.text("deleteProject", project())} />
      <Divider />
      <Actions.showProjectSettings menu title={appTexts.text("menuProjectSettings")} />
      <SubMenuRow sub="theme">{appTexts.text("themeIs", { theme: EditorTheme.chosenTitle })}</SubMenuRow>
      <Divider />
      <SubMenuRow sub="projects">{appTexts.text("moreProjects", root().words)}</SubMenuRow>
      <Divider />
      <Actions.showProjectChooser menu />
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
 * - File:  Save, Revert File, ─, New File, Duplicate File, Rename File, Delete File.
 * - Edit:  the code editor's Undo, Redo, ─, Find, ─, Code Editor Settings….
 * - View:  Run, Edit, ─, Program Panel, ─, the Inspector and its cards, ─, Line Numbers;  each ticked while on.
 * - Run:  Compile and Run, Restart, ─, Inspect App, Stop Inspecting, ─, Clear Console.
 * - Help:  Help, which does nothing yet;  none in the static build.
 * - `mode`:  the page's, ticked in View.
 ****************/
export function AppBarMenus(props: { mode: Mode }): JSX.Element {
  return (
    <span class="AppBarMenus">
      <BarMenu id="FileBarMenu" label={appTexts.text("menuFile")} name={appTexts.text("menuFile")}>
        <Actions.saveFile menu />
        <Actions.revertFile menu />
        <Divider />
        <Actions.createFile menu />
        <Actions.duplicateFile menu />
        <Actions.renameFile menu />
        <Actions.deleteFile menu />
      </BarMenu>
      <BarMenu id="EditBarMenu" label={appTexts.text("menuEdit")} name={appTexts.text("menuEdit")}>
        <Actions.undo menu />
        <Actions.redo menu />
        <Divider />
        <Actions.find menu />
        <Divider />
        <Action menu title={appTexts.text("codeSettings")} onClick={() => showCodeSettings()} />
      </BarMenu>
      <BarMenu id="ViewBarMenu" label={appTexts.text("menuView")} name={appTexts.text("menuView")}>
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
          disabled={Inspector.isPicking}
          onClick={() => startInspecting()}
        />
        <Action
          menu
          title={appTexts.text("stopInspecting")}
          shortcut={EDITOR_HOTKEYS.stopInspecting.shortcut}
          disabled={!Inspector.isPicking}
          onClick={() => Inspector.stopPicking()}
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
  else Inspector.startPicking()
}

/** The tag of a menu's items. */
const ACTION_TAG = "ui-action"
/** The class of a sub-menu's row. */
const SUB_ROW = "SubMenuRow"
