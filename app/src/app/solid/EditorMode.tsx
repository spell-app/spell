import { For, createSignal } from "solid-js"
import type { JSX } from "@solidjs/web"

import { editor } from "spell/app/app/editor"
import { editorPrefs } from "spell/app/app/editorPrefs"
import { appTexts, type AppTextKey } from "spell/app/app/ui/AppTexts"

/****************
 * ### `EditorMode`
 * How the editor shows a project:  Run or Edit, picked from the top bar's `<ModeButtons>` (or its View menu).
 * - Run:  the program alone, the whole window (the run page, `editor.showRunner()`).
 * - Edit:  the code beside the program (the editor page).
 * - Debug went in epic `debut` P32:  its Program panel shows under the code in Edit, as `ProgramPanelShown` says.
 ****************/
export class EditorMode {
  /**
   * Show the project in `mode`.
   * - Run:  the run page.
   * - Edit:  the editor page.
   */
  static show(mode: Mode): void {
    if (mode === "run") void editor.showRunner()
    else editor.showEditor()
  }
}

/** One of the editor's ways of showing a project. */
export type Mode = (typeof MODES)[number]

/** The modes, in the top bar's order. */
const MODES = ["run", "edit"] as const
/** Each mode's icon (Fomantic's names) and its name's text key. */
const MODE_LOOKS: Record<Mode, { icon: string; text: AppTextKey }> = {
  run: { icon: "play", text: "runMode" },
  edit: { icon: "pencil", text: "editMode" }
}

/****************
 * ### `ProgramPanelShown`
 * Does Edit show the Program panel under the code (the program's output, its compiled code)?
 * - View › Program Panel shows or hides it;  its own Close hides it.
 * - Remembered in the browser (`spellEditor:programPanel`).
 *   A browser last left in Debug (`spellEditor:mode`, before epic `debut` P32) opens with it showing.
 ****************/
export class ProgramPanelShown {
  /** Is it showing (reactive)? */
  static get isShowing(): boolean {
    return isShowing()
  }

  /** Show it, or hide it;  remember which. */
  static set(shown: boolean): void {
    setShowing(shown)
    editorPrefs.set(PANEL_PREF, shown)
  }

  /** Show it if hidden, else hide it. */
  static toggle(): void {
    ProgramPanelShown.set(!isShowing())
  }
}

/** The preference that remembers whether the Program panel shows. */
const PANEL_PREF = "programPanel"
/** The preference Debug was remembered by, before epic `debut` P32:  `"debug"` showed the panel. */
const OLD_MODE_PREF = "mode"
editorPrefs.declare(PANEL_PREF, { type: "choice" })
editorPrefs.declare(OLD_MODE_PREF, { oneOf: ["edit", "debug"] })
// TODO:  drop once every browser has opened the editor since epic `debut` P32
if (editorPrefs.get(OLD_MODE_PREF) === "debug") editorPrefs.set(PANEL_PREF, true)
editorPrefs.forget(OLD_MODE_PREF)
const [isShowing, setShowing] = createSignal(!!editorPrefs.get(PANEL_PREF))

/****************
 * ### `<ModeButtons>`
 * Run | Edit in the top bar, as the theme's segmented tabs:  the one showing is chosen.
 * - `current`:  the mode the page is in, e.g. `"run"` on the run page.
 * - A header's segmented menu (`appearance="segmented link header"`), inside the bar's own:
 *   its thumb slides to the mode chosen, the same look as every header's tabs.
 * - Not on a phone, which only runs (`chrome.css`).
 ****************/
export function ModeButtons(props: { current: Mode }): JSX.Element {
  return (
    <ui-item class="ModeButtons">
      <ui-menu appearance="segmented link header" tabs="" class="ModeTabs" aria-label={appTexts.text("modes")}>
        <For each={MODES}>
          {(mode) => (
            <ui-item selected={props.current === mode} onClick={() => EditorMode.show(mode)}>
              <ui-icon name={MODE_LOOKS[mode].icon} />
              <span class="ModeText">{appTexts.text(MODE_LOOKS[mode].text)}</span>
            </ui-item>
          )}
        </For>
      </ui-menu>
    </ui-item>
  )
}
