import { For, Show } from "solid-js"
import { isServer, type JSX } from "@solidjs/web"

import { E, UI, UIT } from "spell/ui/core"
import { ThemeMenu } from "./ThemeMenu"
import { ThemePreference } from "./ThemePreference"
import {
  DEFAULT_THEME,
  SchemeChoices,
  type SchemeChoice,
  type ShownScheme,
  type ThemeAndScheme,
  type ThemeMenuChange,
  type ThemeMenuShow,
  type ThemeMenuText,
  type ThemeMenuVocabulary
} from "./UIThemeMenu.types"
import { themeMenuVocabulary } from "./UIThemeMenu.en"

import themeMenuCSS from "./UIThemeMenu.css?inline"

/****************
 * ### `<ui-theme-menu>`
 * The component behind `<ui-theme-menu>`:  a page's theme and light / dark, picked from Spell's own themes.
 * - Every place shows the same menu (epic `debut` P17):  the editor, the epic pages and guides, Spell UI's pages.
 *   Each place keeps its own default theme and remembered pick (`ThemePreference.site()`).
 *
 * - Its shadow DOM:  `<div class="ui [size] [inverted] themes" part="controls">`, holding by `show`:
 *   - `both` (the default):  ONE round icon button, compact enough for a side column or a phone's top bar
 *     - `<button part="palette">` opens `<ui-popup part="overlay" open-on="click">`, a small panel with
 *       - Light | Dark | Auto, a segmented control (`role=radiogroup` of `radio`s, `part="schemes"`):
 *         the scheme the viewer CHOSE, Auto while it follows the OS
 *       - the theme list (`role=menu` of `menuitemradio`s, the chosen one checked):
 *         Spell's own themes (`UI.themes.own`), each with its one-line description (`ThemeMenu`)
 *       - under a divider, "Theme bench" (`<a part="bench">`):  the theme bench, in a new window, in the theme
 *         chosen (`bench`;  Owen:  "Add \"theme bench\" link to theme dropdown, opens in new window")
 *       - the `end` slot's rows, the page's own (the Spell editor's "Edit theme...")
 *     - its tooltip, `<ui-popup part="tip" inverted size="mini">` (hidden while the overlay is open)
 *     - Until epic `debut` (Owen, 2026-10-23:  "Merge day/night buttons into the theme picker") a sun / moon
 *       button stood beside it, and the overlay had a "Match system" switch.
 *   - `scheme`:  the sun / moon button alone, `<button part="scheme">`, with its tooltip:
 *     a sun on a light page, a moon on a dark one (the scheme the page SHOWS:  the OS's, while following it).
 *     - A click flips it and stores it (no longer following the OS).
 *     - The icons cross-fade:  the new one grows from a quarter, un-blurring;  the old one the reverse.
 *   - `theme`:  a theme `<ui-dropdown part="theme" floating scrolling button>`, for a page's masthead.
 *     - Its rows are `<ui-item>` children;  its text goes in its `trigger` slot.
 *     - Its last, under a divider:  Theme bench, opening it as the palette's row does (not a theme:  never chosen).
 * - The theme bench is Spell UI's docs page, on the site `bench` names (the Spell editor:  the page server's
 *   address), else this page's own (a worktree's pages:  the worktree's bench);  `bench="none"`:  no row.  It's opened with the theme chosen in
 *   its address (`ThemePreference.addressWith()`), so it opens as this page shows.
 * - The theme and scheme themselves are `ThemePreference`'s
 *   (one pair per page, remembered per viewer, the scheme shared with every Spell site's header).
 *   - Picking calls `ThemePreference.setTheme()` / `setScheme()` / `flipScheme()`,
 *     then fires ONE `ui-changed` (the dropdown's own is stopped).
 *   - Every menu on the page follows any menu's change, and the OS's while following it
 *     (`subscribe()`, while connected).
 * - Keyboard, in the overlay:  focus moves to the chosen theme as it opens.
 *   - In the theme list:  arrows / Home / End move (one tab stop, a roving `tabindex`);
 *     Enter / Space / a click pick (the overlay stays open, to compare)
 *   - Shift+Tab reaches the scheme control:  arrows move AND choose, as in any radio group (one tab stop)
 *   - Escape closes the overlay, and focus goes back to the palette button (`UI.overlays`).
 * - Its shadow DOM is built of `<ui-popup>`, `<ui-icon>`, `<ui-dropdown>` and `<ui-item>`, which its barrel imports.
 * - Reads the themes and their titles from Spell UI's theme list (`UI.themes`), never a site's data:
 *   so it works on any page.
 ****************/
export class UIThemeMenu extends E.UIComponent<ThemeMenuVocabulary> {
  @E.proto static vocabulary = themeMenuVocabulary
  @E.protoMerged static elementSetup = {
    styleSheets: { "theme-menu": themeMenuCSS },
    delegatesFocus: false
  } satisfies Partial<E.ElementSetup>

  ////////////////
  // ## The theme and scheme chosen
  ////////////////

  /**
   * The page's theme and scheme, as last chosen by any menu.
   * - A copy of `ThemePreference.chosen`, kept in step by `follow()`:  that one isn't reactive.
   */
  @E.state accessor chosen: ThemeAndScheme = isServer ? SERVER_CHOICE : ThemePreference.chosen

  /** The scheme the OS asks for:  what the page shows while following it;  a copy, as `chosen`. */
  @E.state accessor osScheme: ShownScheme = isServer ? "light" : ThemePreference.osScheme()

  /** The scheme the page shows:  the chosen one, or the OS's while following it. */
  get shownScheme(): ShownScheme {
    const { scheme } = this.chosen
    return scheme === "system" ? this.osScheme : scheme
  }

  /** The chosen theme's name. */
  get chosenTheme(): string {
    return this.chosen.theme
  }

  /** The page shows the dark scheme:  `:state(dark)`. */
  @E.cssState("dark")
  get isDark(): boolean {
    return this.shownScheme === "dark"
  }

  /** The scheme follows the OS:  `:state(following)`. */
  @E.cssState("following")
  get followsSystem(): boolean {
    return this.chosen.scheme === "system"
  }

  /**
   * Follow `ThemePreference` while connected:
   * catch up on connect (another menu, or the OS, may have changed them meanwhile),
   * unsubscribe on disconnect.
   */
  @E.whileConnected
  protected followPreference() {
    this.follow(ThemePreference.chosen)
    return ThemePreference.subscribe((chosen) => this.follow(chosen))
  }

  /** Take `chosen`, and the OS's scheme now. */
  private follow(chosen: ThemeAndScheme): void {
    this.chosen = chosen
    this.osScheme = ThemePreference.osScheme()
  }

  ////////////////
  // ## Choosing
  ////////////////

  /** Choose theme `name`, as the viewer did with `event`. */
  async chooseTheme(name: string, event?: Event): Promise<void> {
    const applied = ThemePreference.setTheme(name)
    this.emitChange(event)
    await applied
  }

  /** Flip the scheme the page shows, light <-> dark, as the viewer did with `event`. */
  flipScheme(event?: Event): void {
    ThemePreference.flipScheme()
    this.emitChange(event)
  }

  /** Choose scheme `scheme` (`system`:  follow the OS), as the viewer did with `event`;  the same one again:  nothing. */
  chooseScheme(scheme: SchemeChoice, event?: Event): void {
    if (scheme === ThemePreference.chosen.scheme) return
    ThemePreference.setScheme(scheme)
    this.emitChange(event)
  }

  ////////////////
  // ## The theme bench
  ////////////////

  /** The theme bench's address, with the theme chosen in it;  `undefined`:  no row (`bench="none"`, or a server). */
  get benchAddress(): string | undefined {
    const given = this.bench as string | undefined
    if (given === NO_BENCH || isServer) return undefined
    const site = given?.replace(/\/$/, "") ?? WORKTREE_ROOT.exec(location.pathname)?.[0] ?? ""
    const address = site + BENCH_PATH
    return ThemePreference.addressWith(address, { theme: this.chosenTheme })
  }

  /** Open the theme bench in a new window. */
  openBench(): void {
    const address = this.benchAddress
    if (address) window.open(address, BENCH_TARGET, "noopener")
  }

  /** Fire `ui-changed` with the theme and scheme now. */
  private emitChange(originalEvent?: Event): void {
    const { theme, scheme } = ThemePreference.chosen
    const detail: ThemeMenuChange = {
      theme,
      scheme,
      shown: ThemePreference.shownScheme(),
      originalEvent
    }
    this.send("ui-changed", detail)
  }

  ////////////////
  // ## The theme menu
  ////////////////

  /** `translationForKey()` as a plain function, for `ThemeMenu`. */
  readonly texts: ThemeMenuText = (key, params) => this.translationForKey(key, params)

  /**
   * What the list / dropdown shows:  Spell's own themes (`UI.themes.own`).
   * - Read only once the runtime has loaded (`render()` waits for it):  `UI.themes` exists only then.
   */
  @E.derived
  get themeMenu(): ThemeMenu {
    return new ThemeMenu({ themes: UI.themes.own, text: this.texts })
  }

  /**
   * Which controls show:  `show`, else `both`.
   * - Not `this.show` alone:  an empty or unknown `show` converts to `undefined`, which shows `both`.
   */
  private get shownControls(): ThemeMenuShow {
    return (this.show as ThemeMenuShow | undefined) ?? "both"
  }

  ////////////////
  // ## Rendering
  ////////////////

  render(): JSX.Element {
    return (
      <div class={this.rootClass} part={this.partForName("controls")}>
        <Show when={this.shownControls === "theme"}>{this.dropdown()}</Show>
        <Show when={this.shownControls === "both"}>{this.palette()}</Show>
        <Show when={this.shownControls === "scheme"}>{this.schemeButton()}</Show>
      </div>
    )
  }

  /** The sun / moon button and its tooltip. */
  private schemeButton(): JSX.Element {
    const next = () =>
      this.shownScheme === "dark" ? this.translationForKey("toLight") : this.translationForKey("toDark")
    return (
      <>
        <button
          type="button"
          class={[
            SCHEME_CLASS,
            BUTTON_CLASS,
            { light: this.shownScheme === "light", dark: this.shownScheme === "dark" }
          ]}
          part={this.partForName("scheme")}
          aria-label={next()}
          onClick={(event) => this.flipScheme(event)}
        >
          <For each={ShownSchemes}>
            {(scheme) => (
              <span class={[scheme, GLYPH_CLASS]} aria-hidden="true">
                <ui-icon name={SCHEME_ICONS[scheme]} padding="none" />
              </span>
            )}
          </For>
        </button>
        <ui-popup part={this.partForName("tip")} inverted="" size={MINI} position={TIP_POSITION}>
          {next()}
        </ui-popup>
      </>
    )
  }

  /** The palette button, its tooltip and the overlay. */
  private palette(): JSX.Element {
    const label = () =>
      this.translationForKey("palette", {
        title: this.themeMenu.titleFor(this.chosenTheme),
        scheme: this.translationForKey(SCHEME_TEXTS[this.chosen.scheme])
      })
    return (
      <>
        <button
          type="button"
          id={IDS.palette}
          class={[PALETTE_CLASS, BUTTON_CLASS]}
          part={this.partForName("palette")}
          aria-label={label()}
        >
          <span class={GLYPH_CLASS} aria-hidden="true">
            <ui-icon name={PALETTE_ICON} padding="none" />
          </span>
        </button>
        <ui-popup
          part={this.partForName("overlay")}
          class={OVERLAY_CLASS}
          open-on="click"
          appearance="basic"
          position="bottom right"
          aria-label={this.translationForKey("overlayName")}
          ref={(popup: HTMLElement) => this.wireOverlay(popup)}
        >
          <div class={PANEL_CLASS}>
            {this.schemes()}
            <div class={DIVIDER_CLASS} role="separator" />
            <div class={HEADING_CLASS} id={IDS.heading}>
              {this.translationForKey("themeName")}
            </div>
            <div
              class={MENU_CLASS}
              part={this.partForName("menu")}
              role={MENU_ROLES.menu}
              aria-labelledby={IDS.heading}
              onKeyDown={(event) => this.onMenuKey(event)}
            >
              <For each={this.themeMenu.entries}>{(entry) => this.entry(entry)}</For>
            </div>
            <Show when={this.benchAddress}>
              <div class={DIVIDER_CLASS} role="separator" />
              <a
                class={BENCH_CLASS}
                part={this.partForName("bench")}
                href={this.benchAddress}
                target={BENCH_TARGET}
                rel="noopener"
                title={this.translationForKey("benchTip")}
              >
                <ui-icon name={BENCH_ICON} aria-hidden="true" padding="none" />
                <span class={NAME_CLASS}>{this.translationForKey("bench")}</span>
              </a>
            </Show>
            <slot name={this.slotForName("end")} />
          </div>
        </ui-popup>
        <ui-popup
          part={this.partForName("tip")}
          for={IDS.palette}
          inverted=""
          size={MINI}
          position={TIP_POSITION}
          class={this.isOpen ? MUTED_CLASS : undefined}
        >
          {label()}
        </ui-popup>
      </>
    )
  }

  /** Light | Dark | Auto:  the overlay's segmented control, a radio group (arrows move and choose). */
  private schemes(): JSX.Element {
    return (
      <div
        class={SCHEMES_CLASS}
        part={this.partForName("schemes")}
        role={SCHEME_ROLES.group}
        aria-label={this.translationForKey("schemeName")}
        onKeyDown={(event) => this.onSchemeKey(event)}
      >
        <For each={SchemeChoices}>
          {(scheme) => {
            const isChosen = () => this.chosen.scheme === scheme
            return (
              <button
                type="button"
                class={[SCHEME_OPTION_CLASS, { checked: isChosen() }]}
                part={this.partForName("scheme-option")}
                role={SCHEME_ROLES.item}
                value={scheme}
                aria-checked={isChosen() ? "true" : "false"}
                tabindex={isChosen() ? 0 : -1}
                onClick={(event) => this.chooseScheme(scheme, event)}
              >
                <ui-icon name={SCHEME_CHOICE_ICONS[scheme]} aria-hidden="true" padding="none" />
                <span class={NAME_CLASS}>{this.translationForKey(SCHEME_TEXTS[scheme])}</span>
              </button>
            )
          }}
        </For>
      </div>
    )
  }

  /**
   * Arrow keys in the scheme control:  move AND choose, wrapping, as in any radio group;  Home / End to the ends.
   * - The chosen scheme is the tab stop, drawn by `schemes()` (`tabindex: "left alone"`).
   */
  private onSchemeKey(event: KeyboardEvent): void {
    UI.focus.arrowKey(event, {
      container: event.currentTarget as HTMLElement,
      items: SCHEME_SELECTOR,
      orientation: "both",
      tabindex: "left alone",
      onChange: (_option, index) => this.chooseScheme(SchemeChoices[index]!, event)
    })
  }

  /** One row of the overlay's list:  a theme (or a divider or a header, which `ThemeMenu` lists none of today). */
  private entry(entry: E.MenuEntry): JSX.Element {
    if ("type" in entry) {
      return entry.type === "divider" ? (
        <div class={DIVIDER_CLASS} role="separator" />
      ) : (
        <div class={UIT.HEADER}>{entry.text}</div>
      )
    }
    const isChecked = () => this.chosenTheme === entry.value
    return (
      <button
        type="button"
        class={[OPTION_CLASS, { checked: isChecked() }]}
        part={this.partForName("option")}
        role={MENU_ROLES.item}
        value={entry.value}
        aria-checked={isChecked() ? "true" : "false"}
        tabindex={(this.tabStopTheme ?? this.chosenTheme) === entry.value ? 0 : -1}
        onClick={(event) => this.onOptionClick(entry.value, event)}
      >
        <span class={CHECK_CLASS} aria-hidden="true">
          <ui-icon name={CHECK_ICON} padding="none" />
        </span>
        <span class={NAME_CLASS}>{entry.text}</span>
        <Show when={entry.description}>
          <span class={UIT.DESCRIPTION}>{entry.description}</span>
        </Show>
      </button>
    )
  }

  /**
   * The theme `<ui-dropdown>` (`show="theme"`).
   * - `compact`:  an icon-only palette button, its text (`Spell theme`) its tooltip and name
   *   (Owen, 2026-10-23:  "'1 theme' button should be palette icon")
   */
  private dropdown(): JSX.Element {
    const label = () => this.themeMenu.labelFor(this.chosenTheme)
    return (
      <ui-dropdown
        part={this.partForName("theme")}
        class={{ [COMPACT]: !!this.compact }}
        floating=""
        scrolling=""
        button=""
        padding={this.compact ? "compact" : undefined}
        inverted={this.inverted ? "" : undefined}
        size={this.size}
        label={this.translationForKey("themeName")}
        title={this.compact ? label() : undefined}
        aria-label={this.compact ? label() : undefined}
        value={this.chosenTheme}
        ref={(dropdown: HTMLElement) =>
          dropdown.addEventListener("ui-changed", (event) => this.onDropdownChange(event))
        }
      >
        <span slot="trigger">
          <Show when={this.compact} fallback={label()}>
            <ui-icon name={PALETTE_ICON} aria-hidden="true"></ui-icon>
          </Show>
        </span>
        <For each={this.themeMenu.entries}>
          {(entry) =>
            "type" in entry ? (
              <ui-item kind={entry.type}>{entry.text}</ui-item>
            ) : (
              <ui-item value={entry.value} description={entry.description}>
                {entry.text}
              </ui-item>
            )
          }
        </For>
        <Show when={this.benchAddress}>
          <ui-item kind="divider"></ui-item>
          <ui-item value={BENCH_VALUE} icon={BENCH_ICON} title={this.translationForKey("benchTip")}>
            {this.translationForKey("bench")}
          </ui-item>
        </Show>
      </ui-dropdown>
    )
  }

  /**
   * The dropdown's `ui-changed`:  stop it (the DOM element fires its own), and choose its value;
   * Theme bench:  open it, and show the theme chosen again.
   */
  private onDropdownChange(event: Event): void {
    event.stopPropagation()
    const { value } = (event as CustomEvent<{ value: string }>).detail
    if (value !== BENCH_VALUE) return void this.chooseTheme(value, event)
    this.openBench()
    ;(event.currentTarget as HTMLElement & { value: string }).value = this.chosenTheme
  }

  ////////////////
  // ## The overlay
  ////////////////

  /** The overlay is open:  `:state(open)`;  hides the palette's tooltip. */
  @E.cssState("open")
  @E.state
  accessor isOpen = false

  /**
   * The theme row holding the list's one tab stop (roving `tabindex`):  a menu value;  `undefined`:  the chosen one.
   */
  @E.state accessor tabStopTheme: string | undefined = undefined

  /**
   * A theme row's click (or Enter / Space):  choose it, keep the tab stop on it;  the overlay stays open.
   * - Compared with `ThemePreference.chosen`, never `chosenTheme`:
   *   a click right after another reads that one's value before the write lands.
   */
  private onOptionClick(value: string, event: Event): void {
    this.tabStopTheme = value
    if (value !== ThemePreference.chosen.theme) void this.chooseTheme(value, event)
  }

  /**
   * Arrow keys, Home and End in the theme list:  move focus between rows, wrapping, and the tab stop with it.
   * - The tab stop is drawn by `entry()` (`tabindex: "left alone"`).
   */
  private onMenuKey(event: KeyboardEvent): void {
    UI.focus.arrowKey(event, {
      container: event.currentTarget as HTMLElement,
      items: ITEM_SELECTOR,
      orientation: "vertical",
      tabindex: "left alone",
      onChange: (row) => (this.tabStopTheme = (row as HTMLButtonElement).value)
    })
  }

  /** The list's theme rows, in order. */
  private rows(): HTMLButtonElement[] {
    return [...(this.domElement.shadowRoot?.querySelectorAll<HTMLButtonElement>(ITEM_SELECTOR) ?? [])]
  }

  /**
   * Follow the overlay:  `isOpen` from its `ui-opening` / `ui-closing`,
   * and focus the chosen theme once it shows (`toggle`), its tab stop reset to it.
   */
  private wireOverlay(popup: HTMLElement): void {
    popup.addEventListener("ui-opening", (event) => {
      if (!event.defaultPrevented) this.isOpen = true
    })
    popup.addEventListener("ui-closing", (event) => {
      if (!event.defaultPrevented) this.isOpen = false
    })
    popup.addEventListener("toggle", (event) => {
      if ((event as ToggleEvent).newState !== "open") return
      this.tabStopTheme = undefined
      const row = this.rows().find((each) => each.value === this.chosenTheme) ?? this.rows()[0]
      row?.focus()
    })
  }
}

/** The vocabulary getters, typed (`UIComponent`'s doc). */
export interface UIThemeMenu extends E.AttributeValues<ThemeMenuVocabulary> {}

/** The schemes a page shows, in the button's glyph order:  each glyph is a class word and a `SCHEME_ICONS` key. */
const ShownSchemes = ["light", "dark"] as const satisfies readonly ShownScheme[]

/**
 * Icon the scheme button shows for the scheme the page SHOWS (`fomantic` pack).
 * - the OUTLINE sun:  the solid one reads as a cog at 14px
 */
const SCHEME_ICONS: Readonly<Record<ShownScheme, string>> = { light: "sun outline", dark: "moon" }

/** Icon of each choice in the overlay's scheme control (`fomantic` pack):  Auto a half-filled circle. */
const SCHEME_CHOICE_ICONS: Readonly<Record<SchemeChoice, string>> = {
  light: "sun outline",
  dark: "moon",
  system: "adjust"
}

/** Text key naming each scheme:  the control's choices, and the palette's name. */
const SCHEME_TEXTS = { light: "light", dark: "dark", system: "auto" } as const satisfies Record<SchemeChoice, string>

/** Icon of the button opening the overlay (`fomantic` pack). */
const PALETTE_ICON = "palette"

/** The theme bench's page, from a site's root:  Spell UI's docs page (`ui/docs/theme-bench.html`). */
const BENCH_PATH = "/components/ui/theme-bench.html"

/** A worktree's site on the page server:  `/worktrees/<name>`, where its pages start. */
const WORKTREE_ROOT = /^\/worktrees\/[^/]+/

/** `bench`'s value for no Theme bench row. */
const NO_BENCH = "none"

/** Where the theme bench opens:  a new window. */
const BENCH_TARGET = "_blank"

/** The dropdown's Theme bench row's value:  never a theme's name. */
const BENCH_VALUE = "theme bench"

/** Icon of the Theme bench row (`fomantic` pack). */
const BENCH_ICON = "external alternate"

/** Class word of the overlay's Theme bench row. */
const BENCH_CLASS = "bench"

/** Icon marking the chosen theme in the overlay's list (`fomantic` pack). */
const CHECK_ICON = "check"

/** What a server render shows:  no storage there. */
const SERVER_CHOICE: ThemeAndScheme = { theme: DEFAULT_THEME, scheme: "system" }

/** Shadow-root ids:  the palette button (its tooltip's `for`) and the overlay's header (its list's name). */
const IDS = { palette: "palette", heading: "themes-heading" } as const

/** ARIA of the overlay's theme list:  a menu of radio items (arrows move, Enter / Space / click picks). */
const MENU_ROLES = { menu: "menu", item: "menuitemradio" } as const

/** ARIA of the overlay's scheme control:  a radio group (arrows move and choose). */
const SCHEME_ROLES = { group: "radiogroup", item: "radio" } as const

/** A theme row of the overlay's list. */
const ITEM_SELECTOR = `[role="${MENU_ROLES.item}"]`

/** A choice of the overlay's scheme control, in `SchemeChoices` order. */
const SCHEME_SELECTOR = `[role="${SCHEME_ROLES.item}"]`

/** Where the buttons' tooltips show. */
const TIP_POSITION = "bottom center"

/** `size` of the tooltips. */
const MINI = "mini"

/** Class word of the round buttons. */
const BUTTON_CLASS = "button"

/** Class word of the light / dark button. */
const SCHEME_CLASS = "scheme"

/** Class word of the palette button. */
const PALETTE_CLASS = "palette"

/** Class word of a `compact` theme dropdown:  an icon-only palette button. */
const COMPACT = "compact"

/** Class word of a button's icon box. */
const GLYPH_CLASS = "glyph"

/** Class word of the overlay's `<ui-popup>`. */
const OVERLAY_CLASS = "overlay"

/**
 * Class word of the palette's tooltip while its overlay is open:  it never shows then.
 * - Not `hidden`:  on a `<ui-popup>` that's whether it shows (the shared `visible` / `hidden`),
 *   which its trigger sets again on the next hover.
 */
const MUTED_CLASS = "muted"

/** Class word of the overlay's content. */
const PANEL_CLASS = "panel"

/** Class word of the overlay's header. */
const HEADING_CLASS = "heading"

/** Class word of the overlay's theme list. */
const MENU_CLASS = "menu"

/** Class word of a divider in the overlay. */
const DIVIDER_CLASS = "divider"

/** Class word of the overlay's scheme control. */
const SCHEMES_CLASS = "schemes"

/** Class word of one choice in the scheme control. */
const SCHEME_OPTION_CLASS = "choice"

/** Class word of a row's or a choice's name. */
const NAME_CLASS = "name"

/** Class word of a theme row. */
const OPTION_CLASS = "option"

/** Class word of a theme row's check mark. */
const CHECK_CLASS = "check"
