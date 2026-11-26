import { Show, createSignal, onSettled } from "solid-js"
import type { JSX } from "@solidjs/web"

import { cssSecondsFor } from "spell/util/dom"

import { editor } from "spell/app/app/editor"
import { editorPrefs } from "spell/app/app/editorPrefs"
import { SiteEdits } from "spell/app/app/pages/SiteEdits"
import { appTexts, type AppTextKey } from "spell/app/app/ui/AppTexts"

import { barTooltip } from "./chrome"
import { Design } from "./Design"
import { on } from "./on"
import { tracked } from "./tracked"

/****************
 * ### `EditorMode`
 * How the editor shows a project:  Run, Edit, Design or Site, picked from the top bar's `<ModeButtons>` (or its View
 * menu).
 * - Run:  the program alone, the whole window (the run page, `editor.showRunner()`).
 * - Edit:  the code beside the program (the editor page).
 * - Design:  the code beside the bit of a view picked to design, drawn large, not the whole app (`Design`, epic
 *   `editor` P37);  only for a project with a view or a site to design (`Design.canShow`).
 * - Site:  the site editor, its pages and data (`editor.showSiteEditor()`);  only for a project with a site
 *   (`EditorMode.hasSite`, epic `mockup`).
 * - Debug went in epic `debut` P32:  its Program panel shows under the code in Edit, as `ProgramPanelShown` says.
 ****************/
export class EditorMode {
  /**
   * Show the project in `mode`.
   * - Run:  the run page.
   * - Edit, Design:  the editor page, in that mode.
   */
  static show(mode: Mode): void {
    if (mode === "run") void editor.showRunner()
    else if (mode === "site") editor.showSiteEditor()
    else editor.showEditor(undefined, undefined, mode)
  }

  /** Is `mode` one that shows the code beside the app:  Edit or Design? */
  static isEditing(mode: Mode): boolean {
    return mode === "edit" || mode === "design"
  }

  /** Does the current project declare a site, so it has a Site mode (reactive)? */
  static get hasSite(): boolean {
    return !!editor.project?.files.some((file) => SiteEdits.hasSite(file.contents ?? ""))
  }
}

/** One of the editor's ways of showing a project. */
export type Mode = (typeof MODES)[number]

/** The modes, in the top bar's order. */
const MODES = ["run", "edit", "design", "site"] as const
/** Each mode's icon (Fomantic's names) and its name's text key. */
const MODE_LOOKS: Record<Mode, { icon: string; text: AppTextKey }> = {
  run: { icon: "play", text: "runMode" },
  edit: { icon: "pencil", text: "editMode" },
  design: { icon: "paint brush", text: "designMode" },
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
 * Run | Edit | Design | Site in the top bar, as the theme's segmented tabs:  the one showing is chosen;
 * Design only for a project with something to design (`Design.canShow`, epic `editor` P37);
 * Site only for a project that declares a site (`EditorMode.hasSite`);
 * then, in Edit and Design, Inspect app (`inspect`), the code's icon, which shows the code or closes it,
 * the compiled code's (`compiled`), then Anatomy (`anatomy`)
 * (Owen:  "it should be part of the run|edit group";  T76:  "add a 'compiled code' button between `</>` and the
 * inspector";  2026-11-24, T168:  "button order should be:  inspect, spell code, JS, anatomy").
 * - No Add a View here since epic `editor` T167:  ⌥⌘V or View › Add a View… opens the add panel, beside the add bar in
 *   Edit (`<PlusPanel>`, T175).
 * - The draft's pill is the bar's own part now, after Help (`<PublishDraft>`, T107).
 * - None of the icons is ever chosen, so the thumb stays on the mode:  each one's `aria-pressed` says whether it's on;
 *   a menu's opener says so with `aria-haspopup`.
 * - `current`:  the mode the page is in, e.g. `"run"` on the run page.
 * - `compiled`:  the compiled code's item (`<CompiledCodeButton>`), handed in as `inspect` is.
 * - `inspect`:  Inspect app's item (`<InspectAppButton item>`), handed in so this file needs nothing of the Inspector's.
 * - `anatomy`:  Anatomy's item (`<AnatomyButton>`), handed in as `inspect` is.
 * - A header's segmented menu (`appearance="segmented link header"`), inside the bar's own:
 *   its thumb slides to the mode chosen, the same look as every header's tabs.
 * - Not on a phone, which only runs (`chrome.css`).
 * - Glides to its new place across the bar as its icons come and go (Run <-> Edit),
 *   or as the draft's pill comes and goes on the left (`BarGlide`, epic `editor` T184).
 ****************/
export function ModeButtons(props: {
  current: Mode
  compiled?: JSX.Element
  inspect?: JSX.Element
  anatomy?: JSX.Element
}): JSX.Element {
  let group: HTMLElement | undefined
  onSettled(() => {
    const glide = group && new BarGlide(group)
    return () => glide?.stop()
  })
  return (
    <ui-item class="ModeButtons" ref={(element: HTMLElement) => (group = element)}>
      <ui-menu
        appearance="segmented link header"
        tabs=""
        class="ModeTabs"
        aria-label={appTexts.text("modes")}
        ref={on<{ item: Element }>("ui-choosing", (event) => {
          // a toggle (Inspect app, the code's icon) is pressed, a menu's opener opens it, never chosen:
          // the thumb stays on the mode
          const item = event.detail.item
          if (item.hasAttribute("aria-pressed") || item.hasAttribute("aria-haspopup")) event.preventDefault()
        })}
      >
        <ModeTab mode="run" current={props.current} />
        <ModeTab mode="edit" current={props.current} />
        <Show when={Design.canShow || props.current === "design"}>
          <ModeTab mode="design" current={props.current} />
        </Show>
        <Show when={EditorMode.hasSite}>
          <ModeTab mode="site" current={props.current} />
        </Show>
        <Show when={EditorMode.isEditing(props.current)}>
          {props.inspect}
          <ui-item
            icon="code"
            appearance="circular"
            class="CodeToggle"
            label={appTexts.text("menuCode")}
            {...barTooltip(appTexts.text(CodeShown.isClosed(editor.project?.path) ? "showCodeTip" : "hideCodeTip"))}
            aria-pressed={CodeShown.isClosed(editor.project?.path) ? "false" : "true"}
            onClick={() => toggleCode()}
          />
          {props.compiled}
          {props.anatomy}
        </Show>
      </ui-menu>
    </ui-item>
  )
}

/**
 * One mode's tab in `<ModeButtons>`:  chosen while the page is in `mode`.
 * - Design's loads what draws Design ahead, while the pointer rests on it (`Design.views.ahead`).
 */
function ModeTab(props: { mode: Mode; current: Mode }): JSX.Element {
  const look = () => MODE_LOOKS[props.mode]
  return (
    <ui-item
      icon={look().icon}
      selected={props.current === props.mode}
      data-tour={props.mode}
      {...barTooltip(appTexts.text(modeTipFor(props.mode, props.current)))}
      onClick={() => EditorMode.show(props.mode)}
      ref={(tab: Element) => {
        if (props.mode === "design") Design.views.ahead(tab)
      }}
    >
      <span class="ModeText">{appTexts.text(look().text)}</span>
    </ui-item>
  )
}

/**
 * A mode tab's tooltip:  what a click on it does, from the mode the page is in (epic `editor` I230).
 * - The tab chosen says what's happening:  "You're editing the app".
 * - Run, from Edit or Design, is "Stop Editing";  from Site, "Run the App".
 */
function modeTipFor(mode: Mode, current: Mode): AppTextKey {
  if (mode === current) return MODE_TIPS[mode].chosen
  if (mode === "run" && EditorMode.isEditing(current)) return "stopEditingTip"
  return MODE_TIPS[mode].other
}

/** Each mode tab's tooltips:  `chosen`, while the page is in it;  `other`, what a click on it does. */
const MODE_TIPS: Record<Mode, { chosen: AppTextKey; other: AppTextKey }> = {
  run: { chosen: "runningTip", other: "runTip" },
  edit: { chosen: "editingTip", other: "editTip" },
  design: { chosen: "designingTip", other: "designTip" },
  site: { chosen: "siteShownTip", other: "siteTip" }
}

/****************
 * ### `BarGlide`
 * Run | Edit | Design GLIDE across the top bar to their new place, rather than jump
 * (Owen, 2026-11-26, epic `editor` T184:  "the run/edit buttons should animate into their new horizontal position").
 * - They move when the icons after them come or go (Run <-> Edit), since the group is centred,
 *   or when the draft's pill comes or goes on the bar's left.
 * - A FLIP on the group's drawn box (its `item` part:  the `<ui-item>` itself draws none):
 *   a `ResizeObserver` on the bar's three sections and the group says the bar was laid out again,
 *   before it's painted;  the group is put back where it was with a `translate`, then let go to `0`.
 * - What came into the bar fades in meanwhile, so the two read as one move:  the group's icons, as Edit shows them;
 *   the draft's pill, as you make a draft.
 *   - By animation, not a CSS transition:  a transition set on an icon's `::part(item)` from outside would replace
 *     its own (its hover's colour).
 * - Not the View Transitions API:  it would have to wrap every change that moves the group (a mode switch,
 *   a draft made in the code, Publish), and freezes the page as a picture while it runs.
 * - Not when the window changed width, which the bar spans:  then the group just goes there.
 * - None for anyone who asks for less motion, or inside `--ui-motion: none`.
 * - The same group across Run and Edit:  the editor's switch stays on its page, so it's never drawn again.
 * - Starts once the bar's sections are drawn (each one's `ready`):  before that they have no box to watch.
 ****************/
class BarGlide {
  /** What watches the bar's sections. */
  private readonly observer = new ResizeObserver(() => this.laidOut())
  /** The group's left edge as last laid out, px, glide aside;  `undefined` until first seen. */
  private left: number | undefined
  /** The window's width as last laid out, px:  the bar's host draws no box to measure. */
  private windowWidth = 0
  /** The glide running, if any. */
  private running: Animation | undefined
  /** What's been in the bar already, so doesn't fade in. */
  private readonly seen = new WeakSet<Element>()
  /** Stopped:  the sections drawn too late watch nothing. */
  private isStopped = false

  constructor(private readonly group: HTMLElement) {
    const sections = [group, ...(this.bar?.querySelectorAll(":scope > ui-menu") ?? [])]
    void Promise.all(
      sections.map((section) => (section as Element & { ready?: Promise<void> }).ready ?? Promise.resolve())
    )
      .then(() => {
        if (this.isStopped) return
        for (const section of sections) this.observer.observe(boxOf(section) ?? section)
      })
      .catch((error) => console.error(error))
  }

  /** Stop watching, and end any glide. */
  stop(): void {
    this.isStopped = true
    this.observer.disconnect()
    this.running?.cancel()
  }

  /** The bar the group is in. */
  private get bar(): Element | null {
    return this.group.closest("ui-app-menu")
  }

  /** The bar was laid out again:  glide from the group's last place to its new one;  fade in what came. */
  private laidOut() {
    const box = boxOf(this.group)
    const bar = this.bar
    if (!box || !bar) return
    // where it's drawn, less the glide's own offset:  its place as laid out
    const offset = translateOf(box)
    const left = box.getBoundingClientRect().left - offset
    const windowWidth = innerWidth
    const isFirst = this.left === undefined
    const from = isFirst ? 0 : this.left! - left + offset
    const windowResized = windowWidth !== this.windowWidth
    this.left = left
    this.windowWidth = windowWidth
    const came = this.cameIn(bar)
    if (isFirst || windowResized || !this.canGlide) return
    const timing = this.timing
    for (const element of came) element.animate([{ opacity: 0 }, { opacity: 1 }], timing)
    if (Math.abs(from) < 1) return
    this.running?.cancel()
    this.running = box.animate([{ translate: `${from}px 0` }, { translate: "0 0" }], timing)
  }

  /** What's in the bar now that wasn't before:  the group's icons' boxes, the draft's pill;  noted as seen. */
  private cameIn(bar: Element): Element[] {
    const icons = [...this.group.querySelectorAll("ui-item[appearance~='circular']")].map(boxOf)
    const comers = [...icons, bar.querySelector(".PublishDraft")].filter((each) => !!each && !this.seen.has(each))
    for (const each of comers) this.seen.add(each!)
    return comers as Element[]
  }

  /** The glide's time and ease:  the theme's `--ui-duration-normal` and `--ui-ease-out`. */
  private get timing(): KeyframeAnimationOptions {
    const seconds = cssSecondsFor(this.group, "--ui-duration-normal") ?? GLIDE_SECONDS
    const easing = getComputedStyle(this.group).getPropertyValue("--ui-ease-out").trim() || "ease-out"
    return { duration: seconds * 1000, easing }
  }

  /** Motion's welcome:  not reduced, and not `--ui-motion: none` around the bar. */
  private get canGlide(): boolean {
    return (
      !matchMedia("(prefers-reduced-motion: reduce)").matches &&
      getComputedStyle(this.group).getPropertyValue("--ui-motion").trim() !== "none"
    )
  }
}

/** How long the group takes to glide, when the theme sets no `--ui-duration-normal`. */
const GLIDE_SECONDS = 0.2

/** A section's drawn box:  its shadow root's `item` or `menu` part, the host itself drawing none. */
function boxOf(section: Element): HTMLElement | undefined {
  // its root's own children:  `:scope` matches nothing in a query on a shadow root
  const children = [...(section.shadowRoot?.children ?? [])] as HTMLElement[]
  return children.find((child) => child.matches("[part~='item'], [part~='menu']"))
}

/** How far `box` is moved across by its `translate` right now, px:  a glide part-way. */
function translateOf(box: HTMLElement): number {
  const translate = getComputedStyle(box).translate
  return translate === "none" ? 0 : Number.parseFloat(translate) || 0
}

/****************
 * ### `<PublishDraft>`
 * While you have drafts of the project (epic `editor` I44), right after the top bar's Help menu, 32px on (T107;
 * just left of Run | Edit from T102, right of its icons before that):
 * ONE pill, the size and shape of the bar's tools group, tinted a soft yellow (Owen, 2026-11-14, I77, I90, I93:
 * "one unified thing with a slight inset border").
 * - Left:  the draft's mark, a pen on a square (as a draft file's tab has it), and "Draft", as plain words
 *   (Owen, 2026-11-16, I192:  "Change text from 'Editing a Draft' to just 'Draft'").
 *   - Its tooltip says what a draft is:  only you see it.
 *   - Publish's and Discard's each say what they do (Owen, I217):  send your changes out, or throw them away.
 * - Then "Publish", the primary button, a round thumb inside the pill:  File › Publish's (`editor.publish()`).
 * - Right:  "Discard", a link with a trash can, in the theme's primary colour, so it doesn't read as part of the label:
 *   the project menu's Delete Draft, which asks first, its red "Throw It Away" (`editor.deleteDraft()`;
 *   Owen, 2026-11-14, T67;  2026-11-16, T85:  "make `Discard` look like a link";
 *   I192:  "Text + icon should be purple to distinguish it from the label").
 *   - After Publish, not between it and "Draft" (I203, Owen:  "looks like discard trash can is annotating 'Draft'";
 *     "Swap Publish and Discard buttons").
 * - While Publish runs (`editor.publishing`), it says each step, a spinner beside it, greyed so a second press can't
 *   happen (epic `editor` T179):  "Saving your changes…", then "Publishing…"
 * - Gone once you have no drafts (after Publish, Delete Draft), and never in the public preview (`editor.canPublish`).
 ****************/
export function PublishDraft(): JSX.Element {
  const hasDrafts = tracked(() => editor.canPublish || !!editor.publishing)
  const publishing = tracked(() => editor.publishing)
  return (
    <Show when={hasDrafts()}>
      <span class="PublishDraft">
        <span class="DraftState" {...barTooltip(appTexts.text("draftTip"))}>
          <ui-icon name={DRAFT_ICON} />
          {appTexts.text("draft")}
        </span>
        <ui-button
          class="Publish"
          color="primary"
          icon={publishing() ? undefined : PUBLISH_ICON}
          disabled={!!publishing()}
          {...barTooltip(appTexts.text("publishDraftTip"))}
          onClick={() => void editor.publish()}
        >
          <Show when={publishing()}>
            <ui-icon slot="icon" name="spinner" loading="" />
          </Show>
          {publishing() ? appTexts.text(PUBLISH_STEPS[publishing()!]) : appTexts.text("publishDraft")}
        </ui-button>
        <ui-button
          class="DiscardDraft"
          appearance="tertiary"
          icon={DISCARD_ICON}
          {...barTooltip(appTexts.text("discardDraftTip"))}
          onClick={() => void editor.deleteDraft()}
        >
          {appTexts.text("discardDraft")}
        </ui-button>
      </span>
    </Show>
  )
}

/** A draft's mark:  on "Draft", and on a draft file's tab (`SpellEditor.spell`'s `Drafted`). */
const DRAFT_ICON = "fa7-free:pen-to-square"

/** What Publish's button says at each of its steps (`editor.publishing`). */
const PUBLISH_STEPS = { saving: "waitPublishSaving", publishing: "waitPublishing" } as const satisfies Record<
  NonNullable<typeof editor.publishing>,
  AppTextKey
>

/** Publish's icon, as File's Publish has it:  a paper plane (Owen, 2026-11-14). */
const PUBLISH_ICON = "paper plane outline"

/** Discard Draft's icon:  an outline trash can, beside Publish's outline paper plane (T67). */
const DISCARD_ICON = "trash alternate outline"
