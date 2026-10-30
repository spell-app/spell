import type { JSX } from "@solidjs/web"

import { For } from "solid-js"

import { E, UI, UIT } from "spell/ui/core"
import { hueSwatchesVocabulary } from "./UIHueSwatches.en"

import hueSwatchesCSS from "./UIHueSwatches.css?inline"

/****************
 * ### `<ui-hue-swatches>`
 * The component behind `<ui-hue-swatches>`:  Spell UI's colours as a row of small round swatches, one picked
 * (epic `debut` P23).
 * - ONE row for both its users (Owen's J91):  the theme menu's tint row, and the theme editor's colour rows
 *   (Primary, Secondary, Background), lifted out of the editor.
 * - The first swatch is "none":  no tint, or the theme's own colour (`none-label`, `none-colors`:  its light and
 *   dark halves);  then each hue of `hues`, by its own name, the theme editor's swatch names.
 * - A radio group:  the picked one is the one tab stop;  arrows move AND pick, wrapping;  Home / End to the ends.
 * - Picking sends `ui-changed` with the hue's name (`undefined` for none) and moves `value`:  the page needn't.
 * - Each swatch's name is its tooltip (the browser's own) and its accessible name.
 ****************/
export class UIHueSwatches extends E.UIComponent<typeof hueSwatchesVocabulary> {
  @E.proto static vocabulary = hueSwatchesVocabulary
  @E.protoMerged static elementSetup = {
    styleSheets: { "hue-swatches": hueSwatchesCSS },
    delegatesFocus: false
  } satisfies Partial<E.ElementSetup>

  /** The hues offered:  `hues`, the ones Spell UI has, else all of them (`UIT.ThemeHues`), in its order. */
  get offered(): readonly UIT.ThemeHue[] {
    const given = this.hues?.split(/\s+/).filter(Boolean)
    if (!given?.length) return UIT.ThemeHues
    return UIT.ThemeHues.filter((hue) => given.includes(hue))
  }

  /** The hue picked:  `value`, if it's one offered;  `undefined`:  none. */
  get picked(): UIT.ThemeHue | undefined {
    return this.offered.find((hue) => hue === this.value)
  }

  /** Pick `hue` (`undefined`:  none), as the person did with `event`:  `value` moves, and `ui-changed` goes. */
  pick(hue: UIT.ThemeHue | undefined, originalEvent?: Event): void {
    if (hue === this.picked) return
    this.value = hue ?? ""
    this.send("ui-changed", { value: hue, originalEvent })
  }

  render(): JSX.Element {
    return (
      <div
        class={[this.rootClass, { wrapping: !!this.wrap }]}
        part={this.partForName("swatches")}
        role="radiogroup"
        aria-label={this.translationForKey("label")}
        onKeyDown={(event) => this.onKey(event)}
      >
        {this.swatch(undefined)}
        <For each={this.offered}>{(hue) => this.swatch(hue)}</For>
      </div>
    )
  }

  /** One swatch:  `hue` in its colour, or none (`undefined`) in the theme's own halves, or a hollow ring. */
  private swatch(hue: UIT.ThemeHue | undefined): JSX.Element {
    const name = () => (hue ? this.translationForKey(hue) : this.noneLabel || this.translationForKey("none"))
    const isPicked = () => this.picked === hue
    const style = () => {
      if (hue) return `--_swatch: var(--ui-${hue})`
      const [light, dark = light] = (this.noneColors ?? "").split(/\s+/).filter(Boolean)
      return light ? `--_none-light: ${light}; --_none-dark: ${dark}` : undefined
    }
    return (
      <button
        type="button"
        role="radio"
        class={[SWATCH_CLASS, hue ?? NONE_CLASS, { hollow: !hue && !this.noneColors }]}
        part={this.partForName("swatch")}
        value={hue ?? ""}
        style={style()}
        aria-checked={isPicked() ? "true" : "false"}
        aria-label={name()}
        title={name()}
        tabindex={isPicked() ? 0 : -1}
        onClick={(event) => this.pick(hue, event)}
      />
    )
  }

  /** Arrow keys:  move AND pick, wrapping;  Home / End to the ends.  The tab stop is drawn by `swatch()`. */
  private onKey(event: KeyboardEvent): void {
    const hues = [undefined, ...this.offered]
    UI.focus.arrowKey(event, {
      container: event.currentTarget as HTMLElement,
      items: "button",
      orientation: "both",
      tabindex: "left alone",
      onChange: (_swatch, index) => this.pick(hues[index], event)
    })
  }
}
export interface UIHueSwatches extends E.AttributeValues<typeof hueSwatchesVocabulary> {}

/** A swatch's class word. */
const SWATCH_CLASS = "swatch"

/** The first swatch's class word:  none. */
const NONE_CLASS = "none"
