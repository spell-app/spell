import { Show, createSignal } from "solid-js"
import type { JSX } from "@solidjs/web"

import { editor } from "spell/app/app/editor"
import { editorPrefs } from "spell/app/app/editorPrefs"
import { SiteEdits } from "spell/app/app/pages/SiteEdits"
import { appTexts, type AppTextKey } from "spell/app/app/ui/AppTexts"

import { on } from "./on"
import { tracked } from "./tracked"

/****************
 * ### `EditorMode`
 * How the editor shows a project:  Run, Edit or Site, picked from the top bar's `<ModeButtons>` (or its View menu).
 * - Run:  the program alone, the whole window (the run page, `editor.showRunner()`).
 * - Edit:  the code beside the program (the editor page).
 * - Site:  the site editor, its pages and data (`editor.showSiteEditor()`);  only for a project with a site
 *   (`EditorMode.hasSite`, epic `mockup`).
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
    else if (mode === "site") editor.showSiteEditor()
    else editor.showEditor()
  }

  /** Does the current project declare a site, so it has a Site mode (reactive)? */
  static get hasSite(): boolean {
    return !!editor.project?.files.some((file) => SiteEdits.hasSite(file.contents ?? ""))
  }
}

/** One of the editor's ways of showing a project. */
export type Mode = (typeof MODES)[number]

/** The modes, in the top bar's order. */
const MODES = ["run", "edit", "site"] as const
/** Each mode's icon (Fomantic's names) and its name's text key. */
const MODE_LOOKS: Record<Mode, { icon: string; text: AppTextKey }> = {
  run: { icon: "play", text: "runMode" },
  edit: { icon: "pencil", text: "editMode" },
  site: { icon: "sitemap", text: "siteView" }
}

/****************
 * ### `CodeShown`
 * Does Edit show the code, for a project?  Yes, unless it was started blank, or closed here (epic `editor`, Q17).
 * - Someone who has never seen code starts with the app, the palette and the Inspector.
 * - View › Code, or the bar's button, shows or hides it;  Show in Code shows it.
 * - Remembered per project, in the browser.
 ****************/
export class CodeShown {
  /** Is the code closed for project `path` (reactive)? */
  static isClosed(path: string | undefined): boolean {
    return !!path && closedProjects().includes(path)
  }

  /** Show it or close it, for project `path`;  remember which. */
  static set(path: string | undefined, shown: boolean): void {
    if (!path || CodeShown.isClosed(path) !== shown) return
    const others = closedProjects().filter((each) => each !== path)
    const closed = shown ? others : [...others, path]
    setClosedProjects(closed)
    editorPrefs.set(CLOSED_PREF, closed)
  }
}

/** The preference that remembers the projects whose code is closed. */
const CLOSED_PREF = "codeClosed"
editorPrefs.declare(CLOSED_PREF, { default: [] })
const [closedProjects, setClosedProjects] = createSignal<string[]>(
  (editorPrefs.get(CLOSED_PREF) as string[] | undefined) ?? []
)

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

/** Show the current project's code, or close it. */
export function toggleCode() {
  const path = editor.project?.path
  CodeShown.set(path, CodeShown.isClosed(path))
}

/****************
 * ### `<ModeButtons>`
 * Run | Edit | Site in the top bar, as the theme's segmented tabs:  the one showing is chosen;
 * Site only for a project that declares a site (`EditorMode.hasSite`);
 * then, in Edit, the code's icon, which shows the code or closes it, the compiled code's (`compiled`), Inspect app
 * (`inspect`), then Add (`add`) (Owen:  "it should be part of the run|edit group";  2026-11-14, I77:  "the code and
 * inspect buttons should be swapped";  T76:  "add a 'compiled code' button between `</>` and the inspector";
 * T83:  "Move `add` to the immediate right of the inspector crosshair").
 * - After the group, while you have drafts of the project:  "Draft", Discard, then Publish, one pill
 *   (`<PublishDraft>`;  Owen, 2026-11-14:  "move it to the right of code/inspect buttons").
 * - None of the icons is ever chosen, so the thumb stays on the mode:  each one's `aria-pressed` says whether it's on;
 *   Add's `aria-haspopup`, that it opens a menu.
 * - `current`:  the mode the page is in, e.g. `"run"` on the run page.
 * - `compiled`:  the compiled code's item (`<CompiledCodeButton>`), handed in as `inspect` is.
 * - `inspect`:  Inspect app's item (`<InspectAppButton item>`), handed in so this file needs nothing of the Inspector's.
 * - `add`:  Add's item and its menu (`<AddPartButton>`), handed in as `inspect` is.
 * - A header's segmented menu (`appearance="segmented link header"`), inside the bar's own:
 *   its thumb slides to the mode chosen, the same look as every header's tabs.
 * - Not on a phone, which only runs (`chrome.css`).
 ****************/
export function ModeButtons(props: {
  current: Mode
  compiled?: JSX.Element
  inspect?: JSX.Element
  add?: JSX.Element
}): JSX.Element {
  return (
    <ui-item class="ModeButtons">
      <ui-menu
        appearance="segmented link header"
        tabs=""
        class="ModeTabs"
        aria-label={appTexts.text("modes")}
        ref={on<{ item: Element }>("ui-choosing", (event) => {
          // a toggle (Inspect app, the code's icon) is pressed, a menu's opener (Add) opens it, never chosen:
          // the thumb stays on the mode
          const item = event.detail.item
          if (item.hasAttribute("aria-pressed") || item.hasAttribute("aria-haspopup")) event.preventDefault()
        })}
      >
        <ModeTab mode="run" current={props.current} />
        <ModeTab mode="edit" current={props.current} />
        <Show when={EditorMode.hasSite}>
          <ModeTab mode="site" current={props.current} />
        </Show>
        <Show when={props.current === "edit"}>
          <ui-item
            icon="code"
            appearance="circular"
            class="CodeToggle"
            label={appTexts.text("menuCode")}
            title={appTexts.text("menuCode")}
            aria-pressed={CodeShown.isClosed(editor.project?.path) ? "false" : "true"}
            onClick={() => toggleCode()}
          />
          {props.compiled}
          {props.inspect}
          {props.add}
        </Show>
      </ui-menu>
      <PublishDraft />
    </ui-item>
  )
}

/** One mode's tab in `<ModeButtons>`:  chosen while the page is in `mode`. */
function ModeTab(props: { mode: Mode; current: Mode }): JSX.Element {
  const look = () => MODE_LOOKS[props.mode]
  return (
    <ui-item
      icon={look().icon}
      selected={props.current === props.mode}
      title={appTexts.text(look().text)}
      onClick={() => EditorMode.show(props.mode)}
    >
      <span class="ModeText">{appTexts.text(look().text)}</span>
    </ui-item>
  )
}

/****************
 * ### `<PublishDraft>`
 * While you have drafts of the project (epic `editor` I44), right of the code and Inspect app buttons:
 * ONE pill, the size and shape of the bar's tools group, tinted a soft yellow (Owen, 2026-11-14, I77, I90, I93:
 * "one unified thing with a slight inset border").
 * - Left:  the draft's mark, a pen on a square (as a draft file's tab has it), and "Draft", as plain words
 *   (Owen, 2026-11-16, I192:  "Change text from 'Editing a Draft' to just 'Draft'").
 *   - Its tooltip says what a draft is:  only you see it;  Publish makes it everyone's, Discard throws it away.
 * - Then "Discard", a link with a trash can, in the theme's primary colour, so it doesn't read as part of the label:
 *   the project menu's Delete Draft, which asks first, its red "Throw It Away" (`editor.deleteDraft()`;
 *   Owen, 2026-11-14, T67;  2026-11-16, T85:  "make `Discard` look like a link";
 *   I192:  "Text + icon should be purple to distinguish it from the label").
 * - Right:  "Publish Draft", the primary button, a round thumb inside the pill:  File › Publish's (`editor.publish()`).
 * - Gone once you have no drafts (after Publish, Delete Draft), and never in the public preview (`editor.canPublish`).
 ****************/
function PublishDraft(): JSX.Element {
  const hasDrafts = tracked(() => editor.canPublish)
  return (
    <Show when={hasDrafts()}>
      <span class="PublishDraft">
        <span class="DraftState" title={appTexts.text("draftTip")}>
          <ui-icon name={DRAFT_ICON} />
          {appTexts.text("draft")}
        </span>
        <ui-button
          class="DiscardDraft"
          appearance="tertiary"
          icon={DISCARD_ICON}
          onClick={() => void editor.deleteDraft()}
        >
          {appTexts.text("discardDraft")}
        </ui-button>
        <ui-button class="Publish" color="primary" icon={PUBLISH_ICON} onClick={() => void editor.publish()}>
          {appTexts.text("publishDraft")}
        </ui-button>
      </span>
    </Show>
  )
}

/** A draft's mark:  on "Draft", and on a draft file's tab (`SpellEditor.spell`'s `Drafted`). */
const DRAFT_ICON = "fa7-free:pen-to-square"

/** Publish's icon, as File's Publish has it:  a paper plane (Owen, 2026-11-14). */
const PUBLISH_ICON = "paper plane outline"

/** Discard Draft's icon:  an outline trash can, beside Publish's outline paper plane (T67). */
const DISCARD_ICON = "trash alternate outline"
