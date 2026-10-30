import { For } from "solid-js"
import type { JSX } from "@solidjs/web"

import type { UIT } from "spell/ui/core"

import hueDropdownCSS from "./HueDropdown.css?inline"

/****************
 * ### `HueDropdown`
 * Spell UI's colours as ONE `<ui-dropdown>`:  each option a small dot in its colour, then its name;  none first
 * (epic `debut` I94;  Owen:  "Single dropdown menu with colors inside options.  (/) is 'None'").
 * - Its users:  the theme menu's Tint, and the theme editor's colour rows (Primary, Secondary, Background).
 *   It replaced `<ui-hue-swatches>`, a row of round swatches, in both.
 * - The first option is none:  a slashed circle, or the theme's own colour (`noneColors`:  its light and dark
 *   halves);  then each hue of `hues`, by its own name.
 * - The dropdown's button shows the chosen option the same way:  its dot, then its name.
 * - Picking calls `onPick` with the hue (`undefined`:  none);  the dropdown's own `ui-changed` stops here.
 * - STATIC, no element of its own:  its owner draws it in ITS shadow root (`draw()`), so the owner's style sheets
 *   hold `HueDropdown.css` (the dots);  its family imports `<ui-dropdown>` and `<ui-item>`.
 *   - Not a function component:  Spell UI's component folders draw only from classes (the lint guard).
 ****************/
export class HueDropdown {
  /** The dots' style sheet, for the owner's `elementSetup.styleSheets`. */
  static readonly css = hueDropdownCSS

  /** The dropdown, its button and its options;  `options`' functions are read where they're drawn, so they follow. */
  static draw(options: HueDropdownOptions): JSX.Element {
    const chosen = () => options.hues().find((hue) => hue === options.value())
    return (
      <ui-dropdown
        part={options.part}
        class={DROPDOWN_CLASS}
        selection=""
        fluid=""
        size={options.size}
        value={chosen() ?? NONE_VALUE}
        aria-label={options.label()}
        on-ui-changed={(event) => {
          event.stopPropagation()
          const value = String(event.detail.value)
          options.onPick(value === NONE_VALUE ? undefined : (value as UIT.ThemeHue), event)
        }}
      >
        <span slot="trigger" class={CHOSEN_CLASS}>
          {HueDropdown.dot(chosen, options.noneColors)}
          <span class={NAME_CLASS}>{chosen() ? options.nameFor(chosen()!) : options.noneLabel()}</span>
        </span>
        <ui-item value={NONE_VALUE}>
          {HueDropdown.dot(() => undefined, options.noneColors)}
          {options.noneLabel()}
        </ui-item>
        <For each={options.hues()}>
          {(hue) => (
            <ui-item value={hue}>
              {HueDropdown.dot(() => hue)}
              {options.nameFor(hue)}
            </ui-item>
          )}
        </For>
      </ui-dropdown>
    )
  }

  /** One dot:  `hue()` in its colour;  none (`undefined`) in the theme's own halves, or a slashed circle. */
  private static dot(
    hue: () => UIT.ThemeHue | undefined,
    noneColors?: () => readonly string[] | undefined
  ): JSX.Element {
    const halves = () => {
      const [light, dark = light] = noneColors?.() ?? []
      return light ? `--_hue-light: ${light}; --_hue-dark: ${dark}` : undefined
    }
    return (
      <span
        class={[DOT_CLASS, hue() ?? (halves() ? HALVES_CLASS : NONE_CLASS)]}
        style={hue() ? `--_hue: var(--ui-${hue()})` : halves()}
        aria-hidden="true"
      />
    )
  }
}

/** What `HueDropdown.draw()` draws:  functions, read where they're drawn, so the dropdown follows them. */
export type HueDropdownOptions = {
  /** The hue chosen;  `undefined` (or one not offered):  none. */
  value: () => UIT.ThemeHue | undefined
  /** The hues offered, in order. */
  hues: () => readonly UIT.ThemeHue[]
  /** A hue's name, in the page's language (`Pink`). */
  nameFor: (hue: UIT.ThemeHue) => string
  /** The first option's name:  what no colour means here (`None`, `Theme's own · #7c55e6`). */
  noneLabel: () => string
  /** The first option's colour, light and dark (`#7c55e6`, `#b39cff`):  the theme's own;  none:  a slashed circle. */
  noneColors?: () => readonly string[] | undefined
  /** The dropdown's accessible name. */
  label: () => string
  /** A hue was picked (`undefined`:  none), with the dropdown's `ui-changed`. */
  onPick: (hue: UIT.ThemeHue | undefined, event: Event) => void
  /** The dropdown's `part`. */
  part?: string
  /** The dropdown's `size` (`small`).  Default:  the dropdown's own. */
  size?: JSX.IntrinsicElements["ui-dropdown"]["size"]
}

/** The none option's value:  never a hue's name. */
const NONE_VALUE = "none"

/** The dropdown's class word. */
const DROPDOWN_CLASS = "hue-dropdown"

/** The class word of the button's content:  the chosen option's dot and name. */
const CHOSEN_CLASS = "hue-chosen"

/** The class word of the chosen option's name, in the button. */
const NAME_CLASS = "hue-name"

/** A dot's class word. */
const DOT_CLASS = "hue-dot"

/** The none dot with no colour:  a slashed circle. */
const NONE_CLASS = "none"

/** The none dot in the theme's own colour, light and dark halves. */
const HALVES_CLASS = "halves"
