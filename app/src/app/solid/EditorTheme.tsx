import { isServer, type JSX } from "@solidjs/web"

import { createEffect, createSignal } from "solid-js"

import { SPACES } from "spell/app/spaces"
import { editor } from "spell/app/app/editor"
import { appTexts } from "spell/app/app/ui/AppTexts"
import { isStaticBuild } from "spell/app/app/static/staticBuild"
import { uiReady } from "./loadUI"
import { tracked } from "./tracked"

import "./EditorTheme.css"

/****************
 * ### `EditorTheme`
 * The editor app's theme:  one of Spell's themes and light / dark, picked from its menu bar.
 * - The same set, the same menu and the SAME choice as every other place (epic `debut` P17, P21):
 *   - the remembering and applying:  Spell UI's `ThemePreference`, kept in the person's space
 *     (`@spell/owen@/__prefs/spell-site.json5`), which the editor's dev server reaches through its `/api`;
 *     a theme picked on an epic page or Spell UI's pages shows here too, at once, and the other way round
 *   - the read-only public build, with no page server:  kept in the browser (`isStaticBuild`)
 *   - the menu:  `<ui-theme-menu>` (`<ThemeMenu>`, below)
 * - Glass until the person picks another (`ThemePreference`'s default, epic `debut` Q39).
 * - Every theme dresses the editor's chrome (`EditorTheme.css`):
 *   a floating top bar, panels with gaps and rounded corners,
 *   from the theme's own bar and panel tokens (`--ui-bar-*`, `--ui-panel-*`, epic `debut` J89).
 *   - The theme chosen is marked by its own name:  `<html data-spell-theme="glass">`.
 *   - What's the editor's alone is keyed on that name:
 *     Glass and Fruity share the glass chrome, Merlot's panels meet edge to edge, Spell's bar has no box.
 * - A theme made with Spell UI's theme editor and saved by name is one of My themes (`SavedTheme`, epic `debut`
 *   P25):  picked in the menu like any theme, its base worn, then its sheet.
 * - The code's colours are the theme's own (epic `debut` P22):  Monaco reads them off the page, light or dark,
 *   and follows each change by itself (`CodeThemes`, `spell/app/app/ui/monaco/themes`).
 * - Loads lazily, as `loadUI()` does:  Spell UI's half is its own chunk, off the app's first paint.
 * - The editor app's only:  NEVER from `<spell-viewer>` / `<spell-editor>`, which live on other people's pages.
 ****************/
export class EditorTheme {
  /** The theme chosen, its title for people (`Fruity`, one of My themes' own name), once known (reactive). */
  static get chosenTitle(): string {
    return chosenTitle()
  }

  /**
   * Apply the remembered theme:  light / dark at once, the theme once its sheet loads.
   * - Call once, from the editor's entry.
   * - SIDE EFFECTS:
   *   - keeps `<html data-spell-theme>` in step with the theme chosen
   *   - follows the OS's light / dark, and other tabs' switches, from then on
   * - NEVER throws:  a failure leaves Spell UI's own look, and says so on the console.
   */
  static async restore(): Promise<void> {
    if (isServer) return
    try {
      await uiReady
      const { ThemePreference } = await import("spell/ui/components/ui-theme-menu/ThemePreference")
      ThemePreference.keepIn(isStaticBuild ? "browser" : "space")
      EditorTheme.follow(ThemePreference.chosen.theme)
      ThemePreference.subscribe((chosen) => EditorTheme.follow(chosen.theme))
      await ThemePreference.restore()
      // framed by Spell UI's theme editor, while developing:  wear its theme, scheme and sheet, open the full view;
      // never remembered, so the editor's own choice stays (and a window on this address keeps its scheme)
      if (import.meta.env.DEV && window.parent !== window) {
        const { PageBridge } = await import("spell/ui/components/ui-theme-editor/PageBridge")
        PageBridge.listen({
          theme: (name) => EditorTheme.wearForPreview(name),
          scheme: (scheme) =>
            scheme === "system" ? ThemePreference.applyScheme(scheme) : PageBridge.pinScheme(document, scheme),
          fullMonty: () => EditorTheme.showFullView()
        })
      }
    } catch (error) {
      console.error("EditorTheme.restore():  couldn't apply the editor's theme", error)
    }
  }

  /**
   * Wear theme `name`, previewed by Spell UI's theme editor:  marked on `<html>` as a chosen one is, but never
   * remembered (`ThemePreference.wear()`).
   * - NEVER throws:  `PageBridge.listen()` catches and logs.
   */
  static async wearForPreview(name: string): Promise<void> {
    const { ThemePreference } = await import("spell/ui/components/ui-theme-menu/ThemePreference")
    document.documentElement.dataset.spellTheme = name
    await ThemePreference.wear(name)
  }

  /**
   * The editor's full view, as the theme editor previews it (`<ui-theme-editor>`, epic `debut` P24):
   * Edit with its Program panel, the Inspector with every card, and a part picked:
   * a card, if the app draws one, else its first thing.
   * - What's picked already stays.
   * - Waits up to 3s for the app to draw something to pick;  nothing by then, nothing's picked.
   * - NEVER throws:  `PageBridge.listen()` catches and logs.
   */
  static async showFullView(): Promise<void> {
    const [{ EditorMode, ProgramPanelShown }, { Inspector, INSPECTOR_PANELS }] = await Promise.all([
      import("./EditorMode"),
      import("./Inspector")
    ])
    EditorMode.show("edit")
    ProgramPanelShown.set(true)
    for (const panel of INSPECTOR_PANELS) Inspector.setShown(panel, true)
    if (Inspector.picked) return
    for (let tries = 0; tries < PICK_TRIES; tries++) {
      const area = Inspector.area
      const things = (area ? Inspector.partsIn(area) : [])
        .map((row) => Inspector.partFor(row.element))
        .filter((part) => part && part.value !== part.element)
      const card = things.find((part) => CARD.test(part!.value.constructor.name)) ?? things[0]
      if (card) {
        Inspector.pick(card.element)
        Inspector.stopPicking()
        return
      }
      await new Promise((resolve) => setTimeout(resolve, PICK_WAIT_MS))
    }
  }

  /**
   * Theme `theme` is chosen:  mark `<html>` with its name, which the editor's chrome is keyed on;  one of My themes
   * (`mine:<id>`), the theme it builds on.
   * - My themes themselves are worn by `ThemePreference` (epic `debut` P25).
   */
  private static follow(theme: string | undefined): void {
    void Promise.all([
      import("spell/ui/components/ui-theme-editor/SavedTheme"),
      import("spell/ui/components/components.types")
    ])
      .then(([{ SavedTheme }, { ThemeNames }]) => {
        const mine = SavedTheme.picked(theme)
        const shown = mine?.choices.base ?? theme
        if (shown) document.documentElement.dataset.spellTheme = shown
        else delete document.documentElement.dataset.spellTheme
        setChosenTitle(mine?.name ?? (theme ? ThemeNames.titleOf(theme) : ""))
      })
      .catch((error: unknown) => console.error("EditorTheme:  couldn't mark the theme", error))
  }
}

/****************
 * ### `<ThemeMenu>`
 * The editor's theme menu, in a menu bar:  a palette button opening Light | Dark | Auto and every theme.
 * - The palette:  `<ui-theme-menu>`, defined with every other Spell UI tag (`loadUI()`);
 *   until then it waits, as any `<ui-*>` does.
 *   - Until epic `debut` P17 (T34) the editor defined it itself, and drew it only then:
 *     it was a docs-only widget, which `spell-ui`'s barrel didn't carry.
 * - Picking applies at once, and the editor remembers it (`EditorTheme`).
 * - At its foot, the menu's Theme bench (on the page server, in development:  `SPELL_PAGE_SERVER`, set by the dev
 *   server;  none when built), then "Edit theme...":  the theme editor's page (`<ThemeEditorPage>`, epic `debut` P6).
 ****************/
export function ThemeMenu(): JSX.Element {
  return (
    <ui-item class="ThemeMenu">
      <ui-theme-menu size="small" bench={import.meta.env.DEV ? String(import.meta.env.SPELL_PAGE_SERVER) : "none"}>
        <button type="button" slot="end" class="EditThemeEntry" onClick={() => editor.showThemeEditor()}>
          <ui-icon name="paint brush" />
          {appTexts.text("editTheme")}
        </button>
      </ui-theme-menu>
    </ui-item>
  )
}

/****************
 * ### `<AppMark>`
 * Spell's hat and name, first in the editor's top bar:  a link to the landing page.
 * - The hat alone, in the theme's primary colour:  the favicon's hat without its dark square
 *   (`/static/favicon/hat.svg`, drawn as a mask, `EditorTheme.css`).
 * - On a phone, the hat alone (`.AppName` read, not shown:  `chrome.css`).
 * - A notebook's:  "Spell Notebooks" (Owen, 2026-10-27).
 * - SIDE EFFECT:  names the browser's tab for the project shown:  `Button • Spell Notebook`, `Solitaire • Spell`.
 ****************/
export function AppMark(): JSX.Element {
  const shown = followTabTitle()
  return (
    <ui-item class="AppMark">
      <a link="" href="/">
        <span class="hat" />
        <span class="AppName">{appTexts.text(shown().isNotebook ? "notebooksAppName" : "appName")}</span>
      </a>
    </ui-item>
  )
}

/**
 * Name the browser's tab for the project shown, while the calling component is up:
 * `Button • Spell Notebook`, `Solitaire • Spell`;  plain "Spell" with none.
 * - Returns what it read:  the project's title, and whether it's a notebook.
 * - Call in a component body:  `<AppMark>`'s, the editor's project menu's (`<ProjectBarMenu>`).
 */
export function followTabTitle(): () => { title: string | undefined; isNotebook: boolean } {
  const shown = tracked(() => ({
    title: editor.project?.title,
    isNotebook: editor.projectRoot?.path === SPACES.SpellProjectRoot.notebooks.path
  }))
  createEffect(shown, ({ title, isNotebook }) => {
    const key = isNotebook ? "notebookTabTitle" : "tabTitle"
    document.title = title ? appTexts.text(key, { project: title }) : appTexts.text("appName")
  })
  return shown
}

/** The chosen theme's title (`EditorTheme.chosenTitle`). */
const [chosenTitle, setChosenTitle] = createSignal("")

/** How many times `showFullView()` looks for a part to pick, while the app draws. */
const PICK_TRIES = 30

/** How long it waits between looks, ms:  3s in all. */
const PICK_WAIT_MS = 100

/** A drawn thing's class that's a card:  the full view picks one first. */
const CARD = /card/i
