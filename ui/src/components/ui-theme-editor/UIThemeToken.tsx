import { For, Show } from "solid-js"
import type { JSX } from "@solidjs/web"

import { E } from "spell/ui/core"
import { TokenColor } from "./TokenColor"
import { themeTokenVocabulary } from "./UIThemeToken.en"
import type { TokenRow, TokenValue } from "./UIThemeEditor.types"

import themeTokenCSS from "./UIThemeToken.css?inline"

/****************
 * ### `<ui-theme-token>`
 * The component behind `<ui-theme-token>`:  one token of a theme, in `<ui-theme-editor>`'s token tree (epic `debut`
 * P24).
 *
 * - The row (Owen's asks):
 *   - its mark, ● set here or ○ from what the theme builds on (the row dimmed), then its name;
 *     which pages read it;  Set here, Split, Reset
 *   - its value in each scheme shown, light then dark, 20px apart (no sun or moon:  the order says which);
 *     one, when they're the same
 *   - its buttons (Set here, Split, Reset), then which pages read it, at its right
 *     - a colour:  its chip;  a mix:  `chip = base chip + mixed-in chip 20%`, the amount as text
 *     - anything else:  its text
 *   - a pointer:  ↳ the token it points at, a link
 *   - the chips aren't controls (Owen:  "the chips are not interactive")
 * - Its name opens the DRAWER under it, where the token is edited:
 *   - a mix:  its base and what's mixed in, each one of the theme's colours, and the amount on a slider, the main
 *     control
 *   - a pointer:  which token it points at, or Set here
 *   - a plain colour:  per scheme, a picker, its hex (8ch) and its opacity on a slider, the % after it;  anything else, its text (a length, a slider too)
 * - Data in (`row`, a `TokenRow`), events out:  `ui-changed` for a value, `ui-command` for a button, the name or a
 *   link.  The editor decides what each means for the theme.
 * - `:state(here)` while the theme sets it, `:state(open)` while its drawer is open.
 ****************/
export class UIThemeToken extends E.UIComponent<typeof themeTokenVocabulary> {
  @E.proto static vocabulary = themeTokenVocabulary
  @E.protoMerged static elementSetup = {
    styleSheets: { "theme-token": themeTokenCSS },
    delegatesFocus: false
  } satisfies Partial<E.ElementSetup>

  /** What it draws;  `undefined` until it's handed one. */
  get data(): TokenRow | undefined {
    const row = this.row as unknown
    return row && typeof row === "object" ? (row as TokenRow) : undefined
  }

  /** `:state(here)`:  the theme sets it (●). */
  @E.cssState("here")
  get isHere(): boolean {
    return !!this.data?.isHere
  }

  /** `:state(open)`:  its drawer is open. */
  @E.cssState("open")
  get isOpen(): boolean {
    return !!this.data?.isOpen
  }

  /**
   * The schemes its values show in:  the row's, but ONE when light and dark are the same (Owen:  "if light and dark
   * are the same, only show one value").
   */
  get shownSchemes(): readonly Scheme[] {
    const row = this.data
    if (!row) return []
    if (row.schemes.length < 2 || !sameValue(row.values.light, row.values.dark)) return row.schemes
    return row.schemes.slice(0, 1)
  }

  /** Light and dark show apart:  each value under its sun or moon in the drawer. */
  get isApart(): boolean {
    return this.shownSchemes.length > 1 || this.data?.schemes.length === 1
  }

  ////////////////
  // ## Events
  ////////////////

  /** Its drawer set `value`:  for `scheme` alone, or (none) for both. */
  @E.untracked
  private change(value: string, scheme?: Scheme): void {
    const token = this.data?.token
    if (token) this.send("ui-changed", { token, value, ...(scheme && { scheme }) })
  }

  /** A button, its name or a link:  `command`, and the place a link names. */
  @E.untracked
  private command(command: TokenCommand, place?: string): void {
    const token = this.data?.token
    if (token) this.send("ui-command", { token, command, ...(place && { place }) })
  }

  ////////////////
  // ## Rendering
  ////////////////

  /** The token's text for `key`;  `""` until the runtime is in. */
  private text(key: ThemeTokenTextKey, params?: Record<string, string | number>): string {
    return this.isReady ? this.translationForKey(key, params) : ""
  }

  render(): JSX.Element {
    return (
      <Show when={this.data}>
        <div class={["ui theme-token", { here: this.isHere, open: this.isOpen }]} part={this.partForName("row")}>
          {this.head()}
          <div class="values">
            <For each={this.shownSchemes}>{(scheme) => this.value(scheme)}</For>
          </div>
          <Show when={this.data!.pointer && !this.isOpen}>
            <div class="pointer">
              <span class="pointer-mark" aria-hidden="true">
                {POINTER_MARK}
              </span>
              {this.link(this.data!.pointer!.place)}
            </div>
          </Show>
        </div>
        <Show when={this.isOpen}>{this.drawer()}</Show>
      </Show>
    )
  }

  /** Its mark, its name (the drawer's button), who reads it, its buttons. */
  private head(): JSX.Element {
    const row = () => this.data!
    const t = (key: ThemeTokenTextKey, params?: Record<string, string | number>) => this.text(key, params)
    return (
      <div class="head">
        <span class={["mark", row().isHere ? "set" : "from"]} title={row().markTip} aria-label={row().markTip}>
          {row().isHere ? SET_MARK : FROM_MARK}
        </span>
        <button
          type="button"
          class="name"
          title={row().nameTip}
          aria-label={t("edit", { token: row().token })}
          aria-expanded={row().isOpen ? "true" : "false"}
          onClick={() => this.command("open")}
        >
          {row().label}
        </button>
        <Show when={!row().isHere}>
          <ui-button
            class="tool"
            size="mini"
            appearance="basic"
            title={t("setHereTip")}
            onClick={() => this.command("set here")}
          >
            {t("setHere")}
          </ui-button>
        </Show>
        <Show when={!row().isSplit && !row().values.light.mix}>
          <ui-button
            class="tool"
            size="mini"
            appearance="basic circular"
            icon="columns"
            aria-label={t("split")}
            title={t("split")}
            onClick={() => this.command("split")}
          ></ui-button>
        </Show>
        <Show when={row().resetLabel}>
          <ui-button
            class="tool"
            size="mini"
            appearance="basic circular"
            icon="undo"
            aria-label={row().resetLabel}
            title={row().resetLabel}
            onClick={() => this.command("reset")}
          ></ui-button>
        </Show>
        <span class="readers" role="list" aria-label={t("readBy")}>
          <For each={row().readers}>
            {(reader) => (
              <span class={["reader", { overrides: reader.overrides }]} role="listitem" title={reader.tip}>
                <ui-icon name={reader.icon} aria-hidden="true"></ui-icon>
              </span>
            )}
          </For>
        </span>
      </div>
    )
  }

  /** Its value in `scheme`:  a chip (a mix:  `= base + mixed in 20%`), or its text. */
  private value(scheme: Scheme): JSX.Element {
    const value = () => this.data!.values[scheme]
    return (
      <span class={["value", scheme]} title={this.text(scheme)}>
        <Show when={value().kind === "color"} fallback={<code class="text">{value().text}</code>}>
          <ui-color-chip color={value().text} scheme={scheme} label={this.text(scheme)}></ui-color-chip>
          <Show when={value().mix}>
            <span class="mix">
              <span aria-hidden="true">=</span>
              <ui-color-chip
                color={value().mix!.baseColor}
                scheme={scheme}
                label={this.colorName(value().mix!.base)}
              ></ui-color-chip>
              <span aria-hidden="true">+</span>
              <ui-color-chip
                color={value().mix!.mixinColor}
                scheme={scheme}
                label={this.colorName(value().mix!.mixin)}
              ></ui-color-chip>
              <span class="amount">{value().mix!.amount}%</span>
            </span>
          </Show>
        </Show>
      </span>
    )
  }

  /** A colour of a mix, for people:  its place's last name (`primary.color` => `color`), `transparent` as clear. */
  private colorName(place: string): string {
    if (place === TRANSPARENT) return this.text("clear")
    return place
  }

  /** A link to the token at place `place`:  `ui-command` `show`. */
  private link(place: string): JSX.Element {
    return (
      <button type="button" class="link" onClick={() => this.command("show", place)}>
        {place}
      </button>
    )
  }

  ////////////////
  // ## The drawer
  ////////////////

  /** The drawer:  a mix's colours and amount, a pointer's target, else each scheme's value. */
  private drawer(): JSX.Element {
    const row = () => this.data!
    const mix = () => row().values[row().schemes[0] ?? "light"].mix
    return (
      <div class="drawer" part={this.partForName("drawer")}>
        <Show
          when={mix()}
          fallback={
            <Show
              when={row().pointer}
              fallback={<For each={this.shownSchemes}>{(scheme) => this.valueEditor(scheme)}</For>}
            >
              {this.pointerEditor()}
            </Show>
          }
        >
          {this.mixEditor()}
        </Show>
      </div>
    )
  }

  /** A mix:  the amount, the main control;  then its base and what's mixed in, each one of the theme's colours. */
  private mixEditor(): JSX.Element {
    const t = (key: ThemeTokenTextKey) => this.text(key)
    const mix = () => this.data!.values[this.data!.schemes[0] ?? "light"].mix!
    const write = (next: Partial<NonNullable<TokenValue["mix"]>>) => {
      const { base, mixin, amount } = { ...mix(), ...next }
      this.change(`color-mix(in oklab, ${asWritten(mixin)} ${amount}%, ${asWritten(base)})`)
    }
    return (
      <div class="mix-editor">
        <label class="field amount-field">
          <span class="field-label">{t("amount")}</span>
          <ui-slider
            min={0}
            max={FULL}
            step={1}
            value={mix().amount}
            aria-label={t("amount")}
            on-ui-moved={(event: CustomEvent<{ value: number }>) => write({ amount: event.detail.value })}
          ></ui-slider>
          <span class="amount">{mix().amount}%</span>
        </label>
        {this.colorSelect(t("mixIn"), mix().mixin, (mixin) => write({ mixin }))}
        {this.colorSelect(t("base"), mix().base, (base) => write({ base }))}
      </div>
    )
  }

  /** A pointer:  which token it points at, or Set here. */
  private pointerEditor(): JSX.Element {
    const t = (key: ThemeTokenTextKey) => this.text(key)
    return (
      <div class="pointer-editor" title={t("pointsAtTip")}>
        {this.colorSelect(t("pointsAt"), this.data!.pointer!.place, (place) => this.change(asWritten(place)))}
        <ui-button size="mini" appearance="basic" onClick={() => this.command("set here")}>
          {t("setHere")}
        </ui-button>
      </div>
    )
  }

  /** A choice of the theme's colours (`row.options`), named `label`, `chosen` picked;  `choose(place)` on a pick. */
  private colorSelect(label: string, chosen: string, choose: (place: string) => void): JSX.Element {
    return (
      <label class="field">
        <span class="field-label">{label}</span>
        <ui-select
          value={chosen}
          size="small"
          fluid=""
          aria-label={label}
          on-ui-changed={(event: CustomEvent<{ value: string | string[] }>) => choose(String(event.detail.value))}
        >
          <ui-item value={TRANSPARENT}>{this.text("clear")}</ui-item>
          <For each={this.data!.options ?? []}>
            {(option) => <ui-item value={option.place}>{option.label}</ui-item>}
          </For>
        </ui-select>
      </label>
    )
  }

  /** One scheme's value:  a colour's picker, hex and opacity;  anything else its text (a length, a slider too). */
  private valueEditor(scheme: Scheme): JSX.Element {
    const value = () => this.data!.values[scheme]
    const forScheme = () => (this.data!.isSplit ? scheme : undefined)
    const name = () => `${this.data!.token}, ${this.text(scheme)}`
    return (
      <div class={["value-editor", value().kind, { apart: this.isApart }]} title={this.text(scheme)}>
        <Show when={this.isApart}>
          <ui-icon class="scheme" name={scheme === "dark" ? "moon" : "sun"} aria-label={this.text(scheme)}></ui-icon>
        </Show>
        <Show
          when={value().kind === "color"}
          fallback={
            <>
              <ui-input
                size="small"
                fluid=""
                value={value().text}
                aria-label={`${name()}:  ${this.text("value")}`}
                on-ui-changed={(event: CustomEvent<{ value: string }>) =>
                  this.change(event.detail.value.trim(), forScheme())
                }
              ></ui-input>
              <Show when={value().kind === "length"}>
                <ui-slider
                  min={0}
                  max={Math.max(MAX_PX, Math.ceil((parseFloat(value().text) || 0) * 2))}
                  step={1}
                  value={parseFloat(value().text) || 0}
                  aria-label={name()}
                  on-ui-moved={(event: CustomEvent<{ value: number }>) =>
                    this.change(`${event.detail.value}px`, forScheme())
                  }
                ></ui-slider>
              </Show>
            </>
          }
        >
          <ui-input
            class="picker"
            type="color"
            size="small"
            value={value().hex ?? FALLBACK_HEX}
            aria-label={name()}
            on-ui-typed={(event: CustomEvent<{ value: string }>) =>
              this.change(TokenColor.join(event.detail.value, value().opacity ?? FULL), forScheme())
            }
          ></ui-input>
          <ui-input
            class="hex"
            size="small"
            value={value().hex ?? ""}
            aria-label={`${name()}:  ${this.text("value")}`}
            on-ui-changed={(event: CustomEvent<{ value: string }>) =>
              this.change(TokenColor.join(event.detail.value.trim(), value().opacity ?? FULL), forScheme())
            }
          ></ui-input>
          <ui-slider
            class="opacity"
            min={0}
            max={FULL}
            step={1}
            value={value().opacity ?? FULL}
            aria-label={`${name()}:  ${this.text("alpha")}`}
            on-ui-moved={(event: CustomEvent<{ value: number }>) =>
              this.change(TokenColor.join(value().hex ?? FALLBACK_HEX, event.detail.value), forScheme())
            }
          ></ui-slider>
          <span class="percent">{value().opacity ?? FULL}%</span>
        </Show>
      </div>
    )
  }
}

/** Whether two values of a token show the same:  text, colour and mix. */
function sameValue(a: TokenValue, b: TokenValue): boolean {
  return (
    a.text === b.text && a.hex === b.hex && a.opacity === b.opacity && JSON.stringify(a.mix) === JSON.stringify(b.mix)
  )
}

/** The vocabulary getters, typed (`UIComponent`'s doc). */
export interface UIThemeToken extends E.AttributeValues<typeof themeTokenVocabulary> {}

/** A text key of `<ui-theme-token>`. */
type ThemeTokenTextKey = (typeof themeTokenVocabulary)["texts"][number]["key"]

/** A scheme a value is shown in. */
type Scheme = "light" | "dark"

/** What `ui-command` says. */
type TokenCommand = "open" | "reset" | "set here" | "split" | "show"

/** A colour of a mix as a theme file writes it:  a place as its pointer, `transparent` as it is. */
function asWritten(place: string): string {
  return place === TRANSPARENT || !/^[\w-]+(?:\.[\w-]+)+$/.test(place) ? place : `{${place}}`
}

/** Owen's marks:  set here, from what the theme builds on, a pointer. */
const SET_MARK = "●"
const FROM_MARK = "○"
const POINTER_MARK = "↳"

/** A mix's see-through colour. */
const TRANSPARENT = "transparent"

/** Fully opaque, in the opacity's units;  a length slider's least top, px. */
const FULL = 100
const MAX_PX = 48

/** The picker's colour while a value can't be painted. */
const FALLBACK_HEX = "#000000"
