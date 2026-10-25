import { For, Show } from "solid-js"
import { isServer, type JSX } from "@solidjs/web"

import { E, UI, UIT } from "spell-ui/core"
import { SavedTheme } from "./SavedTheme"
import { ThemeSheet } from "./ThemeSheet"
import { themeEditorVocabulary } from "./UIThemeEditor.en"
import {
  DEFAULT_BASE,
  EDITS_SHEET,
  TEXT_SIZES,
  type ThemeEditorTextKey,
  type ThemeEditorVocabulary
} from "./UIThemeEditor.types"

import themeEditorCSS from "./UIThemeEditor.css?inline"

/****************
 * ### `DOMThemeEditorElement`
 * The DOM element of `<ui-theme-editor>`:  it adds the theme it shows (`theme`) and its stylesheet (`css`).
 * - Above the component:  its `elementSetup` reads this class while the component is defined.
 ****************/
export class DOMThemeEditorElement extends E.DOMElement<UIThemeEditor> {
  /** Every choice it shows now;  `undefined` until it's drawn. */
  @E.untracked
  get theme(): UIT.ThemeChoices | undefined {
    return this.component?.theme
  }

  /** The theme as a stylesheet, as Copy CSS copies it;  `undefined` until it's drawn. */
  @E.untracked
  get css(): string | undefined {
    return this.component?.sheet.css
  }
}

/****************
 * ### `UIThemeEditor`
 * The component behind `<ui-theme-editor>`:  makes a theme from an existing one, live.
 *
 * - Its shadow DOM, side by side (stacked when narrow):
 *   - the INSPECTOR, `<ui-panel part="inspector">` around a `<ui-property-editor>`:
 *     the theme's name and base, then a sub-panel each for Color, Type and Shape, one `<ui-property>` a choice;
 *     then Use this theme, Stop using and Start over
 *     - colours:  a row of swatches, a radio group (`role="radiogroup"`), the base's own first
 *     - fonts:  `<ui-select>`s, each font shown in itself;  text size:  a `<ui-slider>`
 *     - corners, depth, glass:  segmented `<ui-menu>`s
 *   - the PREVIEW (`part="preview"`):  a sample app of real elements, once light and once dark (`ui-light` / `ui-dark`)
 *     - card, checkboxes, field, buttons, label, toggle, message, progress
 *     - Both, Light or Dark picks which it shows
 *   - the SHEET (`part="sheet"`):  the theme as a stylesheet in `<ui-code>`, its file name, and Copy CSS
 * - The theme is `ThemeSheet`'s:  its base theme, and tokens on `:root` for every choice made.
 *   - Applied to the WHOLE PAGE while the editor is connected (`ThemeSheet.applyToPage()`):
 *     tokens set on one element don't reach the tokens the page works out at `:root`
 *     (`--ui-primary-hover` is computed where `--ui-primary` is declared),
 *     so only a page-wide sheet is exact.
 *   - SIDE EFFECT:  the page wears the edited theme;
 *     on disconnect, its theme and the edits sheet go back to what they were.
 * - It starts from (`theme`):  `value`, else the theme kept in this browser (`SavedTheme`),
 *   else `base` as it is, else the page's theme, else `fruity`.
 * - Use this theme keeps it in this browser (`SavedTheme.save()`):
 *   the Spell editor, and any page that calls `SavedTheme.restore()`, starts in it.
 *   - `:state(saved)` while the theme shown is the one kept.
 * - Events:  `ui-changed` on every choice, `ui-copied` from Copy CSS, `ui-saved` from Use this theme / Stop using.
 *   - The events of the elements it's built of stop at its shadow root:  their `ui-changed`'s detail isn't ours.
 * - Its families (panel, property editor, select, slider, menu, card ...) are imported by its barrel.
 ****************/
export class UIThemeEditor extends E.UIComponent<ThemeEditorVocabulary> {
  @E.proto static vocabulary = themeEditorVocabulary
  @E.protoMerged static elementSetup = {
    styleSheets: { "theme-editor": themeEditorCSS },
    DOMElement: DOMThemeEditorElement,
    delegatesFocus: false
  } satisfies Partial<E.ElementSetup>

  ////////////////
  // ## The theme
  ////////////////

  /** The choices made in the editor;  `undefined` until the first. */
  @E.state accessor edited: UIT.ThemeChoices | undefined = undefined

  /** The theme kept in this browser as the editor was made:  where it starts, when given no `value`. */
  private readonly savedAtStart = isServer ? undefined : SavedTheme.choices

  /** Every choice it shows now:  the edits, else where it started. */
  get theme(): UIT.ThemeChoices {
    return this.edited ?? this.startingTheme
  }

  /** Where it starts:  `value`, else the kept theme, else the base as it is (see the class doc). */
  private get startingTheme(): UIT.ThemeChoices {
    const given = this.value as Partial<UIT.ThemeChoices> | undefined
    const base = this.base ?? (this.isReady ? UI.themes.current : undefined) ?? DEFAULT_BASE
    if (given && typeof given === "object") {
      return { ...given, name: given.name ?? this.text("defaultName"), base: given.base ?? base }
    }
    return this.savedAtStart ?? { name: this.text("defaultName"), base }
  }

  /** The theme as a stylesheet. */
  @E.derived
  get sheet(): ThemeSheet {
    return new ThemeSheet({ choices: this.theme, text: this.text })
  }

  /**
   * Make `changes`:  `undefined` takes a choice back to the base's own.  Sends `ui-changed`.
   * - The page follows (`onSheetChanged()`).
   */
  @E.untracked
  choose(changes: Partial<UIT.ThemeChoices>): void {
    const next: Record<string, unknown> = { ...this.theme, ...changes }
    for (const [key, value] of Object.entries(changes)) if (value === undefined) delete next[key]
    this.edited = next as UIT.ThemeChoices
    this.send("ui-changed", { value: this.edited, css: this.sheet.css })
  }

  /** Drop every change but the name and the base.  Sends `ui-changed`. */
  @E.untracked
  startOver(): void {
    const { name, base } = this.theme
    this.edited = { name, base }
    this.send("ui-changed", { value: this.edited, css: this.sheet.css })
  }

  ////////////////
  // ## On the page
  ////////////////

  /**
   * While connected:  remember the page's theme and edits sheet, and put them back on disconnect.
   * - Declared before `onSheetChanged()`, so it sees the page as it was.
   */
  @E.onChange("isConnected", "isReady")
  protected onShown(isConnected: boolean, isReady: boolean) {
    if (!isConnected || !isReady) return
    const themeBefore = UI.themes.current
    const sheet = UI.styles.sheet(EDITS_SHEET)
    const sheetBefore = sheet ? [...sheet.cssRules].map((rule) => rule.cssText).join("\n") : ""
    return () => {
      ThemeSheet.putOnPage(sheetBefore)
      if (UI.themes.current === themeBefore) return
      UI.themes.apply(themeBefore).catch((error: unknown) => {
        E.Warnings.warn("<ui-theme-editor>", `can't put the page's theme \`${themeBefore}\` back`, error)
      })
    }
  }

  /** The page wears the theme as it changes (`ThemeSheet.applyToPage()`). */
  @E.onChange("sheet", "isConnected", "isReady")
  protected onSheetChanged(sheet: ThemeSheet, isConnected: boolean, isReady: boolean) {
    if (!isConnected || !isReady) return
    sheet.applyToPage().catch((error: unknown) => {
      E.Warnings.warn("<ui-theme-editor>", `can't apply the theme on \`${sheet.choices.base}\``, error)
    })
  }

  ////////////////
  // ## Use, copy
  ////////////////

  /** The stylesheet kept in this browser (`SavedTheme`);  `undefined`:  none. */
  @E.state accessor savedCss: string | undefined = isServer ? undefined : SavedTheme.css

  /** `:state(saved)`:  the theme shown is the one kept. */
  @E.cssState("saved")
  get isSaved(): boolean {
    return this.savedCss !== undefined && this.savedCss === this.sheet.css
  }

  /** Keep the theme in this browser (`SavedTheme.save()`).  Sends `ui-saved`. */
  @E.untracked
  use(): void {
    const { css } = this.sheet
    SavedTheme.save(this.theme, css)
    this.savedCss = css
    this.send("ui-saved", { value: this.theme, css })
  }

  /** Forget the kept theme (`SavedTheme.forget()`).  Sends `ui-saved` with no `value`. */
  @E.untracked
  forget(): void {
    SavedTheme.forget()
    this.savedCss = undefined
    this.send("ui-saved", { css: "" })
  }

  /** Copy CSS's copy:  the button says so for a moment after. */
  readonly clipboard = new E.ClipboardCopy({ seconds: COPIED_SECONDS })

  /**
   * Put the stylesheet on the clipboard, and say so.  Sends `ui-copied`.
   * - NEVER throws:  a clipboard that refuses, even its fallback, warns.
   */
  @E.untracked
  async copy(): Promise<void> {
    const { css } = this.sheet
    if (!(await this.clipboard.copy(css))) {
      E.Warnings.warn("<ui-theme-editor>", "the clipboard refused the stylesheet")
      return
    }
    this.send("ui-copied", { css })
  }

  ////////////////
  // ## The preview
  ////////////////

  /** Which schemes the preview shows. */
  @E.state accessor previewScheme: PreviewScheme = "both"

  ////////////////
  // ## Rendering
  ////////////////

  /**
   * The editor's text for `key` (`translationForKey()`), as a function `ThemeSheet` can hold.
   * - `""` until the runtime is in (`isReady`):  the words aren't, and the first page's effects read `sheet` before.
   */
  private readonly text = (key: ThemeEditorTextKey, params?: Record<string, string | number>): string =>
    this.isReady ? this.translationForKey(key, params) : ""

  render(): JSX.Element {
    return (
      <div class={["ui theme-editor", { saved: this.isSaved }]} part={this.partForName("editor")} ref={stopInner}>
        {this.inspector()}
        <div class="side">
          {this.preview()}
          {this.stylesheet()}
        </div>
      </div>
    )
  }

  /** The inspector:  a panel around the property editor, then the theme's actions. */
  private inspector(): JSX.Element {
    const t = this.text
    return (
      <ui-panel class="inspector" part={this.partForName("inspector")} label={t("theme")} description={t("themeTip")}>
        <ui-property-editor class="properties">
          <ui-property name="name" label={t("name")} description={t("nameTip")}>
            <ui-input
              value={this.theme.name}
              placeholder={t("defaultName")}
              aria-label={t("name")}
              fluid=""
              on-ui-typed={(event: CustomEvent<{ value: string }>) => this.choose({ name: event.detail.value })}
            ></ui-input>
          </ui-property>
          <ui-property name="base" label={t("base")} description={t("baseTip")}>
            <ui-select
              value={this.theme.base}
              aria-label={t("base")}
              fluid=""
              on-ui-changed={(event: CustomEvent<{ value: string | string[] }>) =>
                this.choose({ base: String(event.detail.value) })
              }
            >
              <For each={this.bases}>{(base) => <ui-item value={base}>{UIThemeEditor.titleOf(base)}</ui-item>}</For>
            </ui-select>
          </ui-property>
          <ui-panel label={t("color")} description={t("colorTip")} collapsible="">
            {this.hueProperty("primary")}
            {this.hueProperty("secondary")}
            {this.hueProperty("background")}
          </ui-panel>
          <ui-panel label={t("type")} description={t("typeTip")} collapsible="">
            {this.fontProperty("headingFont")}
            {this.fontProperty("bodyFont")}
            {this.sizeProperty()}
          </ui-panel>
          <ui-panel label={t("shape")} description={t("shapeTip")} collapsible="">
            {this.segmentedProperty("corners", UIT.ThemeCorners)}
            {this.segmentedProperty("depth", UIT.ThemeDepths)}
            <Show when={this.hasGlass}>{this.segmentedProperty("glass", UIT.ThemeGlasses)}</Show>
          </ui-panel>
        </ui-property-editor>
        <div class="actions">
          <ui-button
            size="small"
            icon={this.isSaved ? CHECK_ICON : undefined}
            title={t("useTip")}
            disabled={this.isSaved ? "" : undefined}
            onClick={() => this.use()}
            color="primary"
          >
            {this.isSaved ? t("inUse") : t("use")}
          </ui-button>
          <Show when={this.savedCss !== undefined}>
            <ui-button size="small" onClick={() => this.forget()} appearance="basic">
              {t("forget")}
            </ui-button>
          </Show>
          <ui-button size="small" icon={UNDO_ICON} onClick={() => this.startOver()} appearance="basic">
            {t("startOver")}
          </ui-button>
        </div>
      </ui-panel>
    )
  }

  /** The themes it can start from:  Spell UI's own (`UI.themes.own`), and the page's, if another. */
  private get bases(): string[] {
    if (!this.isReady) return [this.theme.base]
    const own = [...UI.themes.own]
    return own.includes(this.theme.base) ? own : [...own, this.theme.base]
  }

  /** The base has glass of its own (fruity's), which the Glass choice changes. */
  private get hasGlass(): boolean {
    return GLASS_BASES.includes(this.theme.base)
  }

  /** A colour choice:  a row of swatches, the base's own first. */
  private hueProperty(key: HueKey): JSX.Element {
    const t = this.text
    const chosen = () => this.theme[key]
    return (
      <ui-property name={key} label={t(key)} description={t(`${key}Tip`)} output={t(chosen() ?? "own")}>
        <div class="swatches" role="radiogroup" aria-label={t(key)} onKeyDown={(event) => this.onSwatchKey(event, key)}>
          {this.swatch(key, undefined)}
          <For each={UIT.ThemeHues}>{(hue) => this.swatch(key, hue)}</For>
        </div>
      </ui-property>
    )
  }

  /** One swatch:  `hue`, or the base's own (`undefined`). */
  private swatch(key: HueKey, hue: UIT.ThemeHue | undefined): JSX.Element {
    const name = this.text(hue ?? "own")
    const isChosen = () => this.theme[key] === hue
    return (
      <button
        type="button"
        role="radio"
        class={["swatch", hue ?? OWN]}
        value={hue ?? OWN}
        style={hue ? `--_swatch: var(--ui-${hue})` : undefined}
        aria-checked={isChosen() ? "true" : "false"}
        aria-label={name}
        title={name}
        tabindex={isChosen() ? 0 : -1}
        onClick={() => this.choose({ [key]: hue })}
      />
    )
  }

  /**
   * Arrow keys in a swatch row:  move AND choose, wrapping, as in any radio group;  Home / End to the ends.
   * - The chosen swatch is the tab stop, drawn by `swatch()` (`tabindex: "left alone"`).
   */
  private onSwatchKey(event: KeyboardEvent, key: HueKey): void {
    const hues = [undefined, ...UIT.ThemeHues]
    UI.focus.arrowKey(event, {
      container: event.currentTarget as HTMLElement,
      items: "button",
      orientation: "both",
      tabindex: "left alone",
      onChange: (_swatch, index) => this.choose({ [key]: hues[index] })
    })
  }

  /** A font choice:  a select, each font shown in itself, the base's own first. */
  private fontProperty(key: FontKey): JSX.Element {
    const t = this.text
    const chosen = () => this.theme[key]
    return (
      <ui-property name={key} label={t(key)} description={t(`${key}Tip`)}>
        <ui-select
          value={chosen() ?? OWN}
          aria-label={t(key)}
          fluid=""
          on-ui-changed={(event: CustomEvent<{ value: string | string[] }>) => {
            const value = String(event.detail.value)
            this.choose({ [key]: value === OWN ? undefined : (value as UIT.ThemeFont) })
          }}
        >
          <ui-item value={OWN}>{t("own")}</ui-item>
          <For each={UIT.ThemeFonts}>
            {(font) => (
              <ui-item value={font} style={`font-family: ${ThemeSheet.fontStack(font)}`}>
                {t(font)}
              </ui-item>
            )}
          </For>
        </ui-select>
      </ui-property>
    )
  }

  /** The text size:  a slider from the base's size, its own Reset. */
  private sizeProperty(): JSX.Element {
    const t = this.text
    const size = () => this.theme.textSize ?? this.baseTextSize
    return (
      <ui-property name="textSize" label={t("textSize")} description={t("textSizeTip")} output={`${size()}px`}>
        <Show when={this.theme.textSize !== undefined}>
          <ui-button
            slot="actions"
            size="mini"
            icon={UNDO_ICON}
            aria-label={t("reset")}
            title={t("reset")}
            onClick={() => this.choose({ textSize: undefined })}
            appearance="circular basic"
          ></ui-button>
        </Show>
        <ui-slider
          min={TEXT_SIZES.min}
          max={TEXT_SIZES.max}
          step={TEXT_SIZES.step}
          value={size()}
          aria-label={t("textSize")}
          on-ui-moved={(event: CustomEvent<{ value: number }>) => this.choose({ textSize: event.detail.value })}
        ></ui-slider>
      </ui-property>
    )
  }

  /** The base theme's text size, in px, read from the page as the editor shows;  16 on a server. */
  private get baseTextSize(): number {
    void this.theme.base
    if (isServer || !this.isReady) return DEFAULT_TEXT_SIZE
    const size = parseFloat(getComputedStyle(document.documentElement).getPropertyValue("--ui-font-size"))
    return Number.isFinite(size) ? Math.round(size) : DEFAULT_TEXT_SIZE
  }

  /** A choice of a few words:  a segmented menu, none chosen while the base's own stays. */
  private segmentedProperty<K extends SegmentedKey>(key: K, values: readonly NonNullable<UIT.ThemeChoices[K]>[]) {
    const t = this.text
    const chosen = () => this.theme[key]
    return (
      <ui-property name={key} label={t(key)} description={t(`${key}Tip`)}>
        <Show when={chosen() !== undefined}>
          <ui-button
            slot="actions"
            size="mini"
            icon={UNDO_ICON}
            aria-label={t("reset")}
            title={t("reset")}
            onClick={() => this.choose({ [key]: undefined })}
            appearance="circular basic"
          ></ui-button>
        </Show>
        <ui-menu
          appearance="segmented link"
          align="fluid"
          equal=""
          size="small"
          aria-label={t(key)}
          on-ui-choosing={(event: CustomEvent<{ value: string }>) => this.choose({ [key]: event.detail.value })}
        >
          <For each={values}>
            {(value) => (
              <ui-item value={value} selected={chosen() === value ? "" : undefined}>
                {t(value)}
              </ui-item>
            )}
          </For>
        </ui-menu>
      </ui-property>
    )
  }

  /** The preview:  the sample app, light and dark, and Both / Light / Dark. */
  private preview(): JSX.Element {
    const t = this.text
    return (
      <ui-section
        class="tool"
        part={this.partForName("preview")}
        label={t("preview")}
        collapsible=""
        appearance="basic"
      >
        <ui-menu
          slot="actions"
          appearance="segmented link"
          size="mini"
          aria-label={t("previewMode")}
          on-ui-choosing={(event: CustomEvent<{ value: string }>) =>
            (this.previewScheme = event.detail.value as PreviewScheme)
          }
        >
          <For each={PreviewSchemes}>
            {(scheme) => (
              <ui-item value={scheme} selected={this.previewScheme === scheme ? "" : undefined}>
                {t(scheme)}
              </ui-item>
            )}
          </For>
        </ui-menu>
        <div class="previews">
          {this.sampleApp("light")}
          {this.sampleApp("dark")}
        </div>
      </ui-section>
    )
  }

  /** The sample app in one scheme:  real elements, nothing but the theme's tokens styling them. */
  private sampleApp(scheme: "light" | "dark"): JSX.Element {
    const t = this.text
    return (
      <div class={["sample", `ui-${scheme}`]} hidden={this.previewScheme !== "both" && this.previewScheme !== scheme}>
        <div class="sample-head">
          <div>
            <div class="sample-scheme">{t(scheme)}</div>
            <div class="sample-title">{t("appTitle")}</div>
          </div>
          <span class="sample-badge">
            <ui-icon name="seedling" aria-hidden="true"></ui-icon>
          </span>
        </div>
        <ui-card fluid="">
          <ui-content>
            <ui-header>{t("today")}</ui-header>
            <div class="habits">
              <ui-checkbox selected="">{t("habitWater")}</ui-checkbox>
              <ui-checkbox>{t("habitRead")}</ui-checkbox>
              <ui-checkbox>{t("habitMove")}</ui-checkbox>
            </div>
            <div class="add">
              <ui-input placeholder={t("newHabit")} aria-label={t("newHabit")}></ui-input>
              <ui-button icon="plus" color="primary">
                {t("add")}
              </ui-button>
            </div>
          </ui-content>
        </ui-card>
        <div class="sample-row">
          <ui-button size="small" color="secondary">
            {t("secondary")}
          </ui-button>
          <ui-button size="small" appearance="basic">
            {t("basicButton")}
          </ui-button>
          <ui-label size="small" color="primary">
            {t("live")}
          </ui-label>
          <ui-checkbox appearance="toggle" selected="">
            {t("remind")}
          </ui-checkbox>
        </div>
        <ui-message color="primary">
          <ui-icon slot="icon" name="bolt"></ui-icon>
          <b>{t("streak")}</b> {t("streakMore")}
        </ui-message>
        <ui-progress value="66" aria-label={t("progress")}></ui-progress>
      </div>
    )
  }

  /** The stylesheet:  its file name, Copy CSS, and the code. */
  private stylesheet(): JSX.Element {
    const t = this.text
    return (
      <ui-section class="tool" part={this.partForName("sheet")} label={t("css")} collapsible="" appearance="basic">
        <span slot="actions" class="file">
          {this.sheet.fileName}
        </span>
        <ui-button
          slot="actions"
          size="mini"
          icon={this.clipboard.isCopied ? CHECK_ICON : COPY_ICON}
          onClick={() => void this.copy()}
          appearance="basic"
        >
          {this.clipboard.isCopied ? t("copied") : t("copy")}
        </ui-button>
        <ui-code language="css" wrap="">
          {this.sheet.css}
        </ui-code>
      </ui-section>
    )
  }

  ////////////////
  // ## Statics
  ////////////////

  /** A theme's name for people:  `spell-brand` => `Spell Brand`. */
  static titleOf(name: string): string {
    return name
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ")
  }
}

/** The vocabulary getters, typed (`UIComponent`'s doc). */
export interface UIThemeEditor extends E.AttributeValues<ThemeEditorVocabulary> {}

/** The preview's choices, in the control's order. */
const PreviewSchemes = ["both", "light", "dark"] as const

/** One of `PreviewSchemes`. */
type PreviewScheme = (typeof PreviewSchemes)[number]

/** The choices drawn as swatches. */
type HueKey = "primary" | "secondary" | "background"

/** The choices drawn as font selects. */
type FontKey = "headingFont" | "bodyFont"

/** The choices drawn as segmented menus. */
type SegmentedKey = "corners" | "depth" | "glass"

/** The value of the base's-own choice, in a swatch row or a font select;  never stored. */
const OWN = "own"

/** The bases with glass of their own:  `ThemeSheet`'s `--fruity-*`. */
const GLASS_BASES: readonly string[] = ["fruity"]

/** The text size where the page doesn't say. */
const DEFAULT_TEXT_SIZE = 16

/** How long Copy CSS says Copied, in seconds. */
const COPIED_SECONDS = 1.5

/** Icons (`fomantic` pack). */
const CHECK_ICON = "check"
const COPY_ICON = "copy outline"
const UNDO_ICON = "undo"

/**
 * The events of the elements it's built of, stopped at its shadow root:  `ui-changed` from its select isn't its own.
 * - Its own handlers sit on those elements, so they run first.
 */
const INNER_EVENTS = [
  "ui-changed",
  "ui-typed",
  "ui-moved",
  "ui-choosing",
  "ui-copied",
  "ui-saved",
  "ui-opening",
  "ui-closing"
]

/** A ref stopping `INNER_EVENTS` on the editor's box. */
function stopInner(box: HTMLElement): void {
  for (const type of INNER_EVENTS) box.addEventListener(type, (event) => event.stopPropagation())
}
