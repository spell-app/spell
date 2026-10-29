/**
 * A colour the repo's epic settings give a person or an agent (`colors`, epic `epic-friend` P10, P14):  the ONE check
 * of what may be one, and how it's drawn.
 * - `EpicConfig` checks the settings with it as it reads them;  `ThreadFacts` again as the page reads them, then draws
 *   them (`ThreadFacts.voiceOf()`).
 * - NEVER imports anything:  plain `node` loads it (the hooks load `EpicConfig`), and the pages' bundle does too.
 */
export class VoiceColor {
  /**
   * Spell UI's colour names, each a theme token with a light and a dark value (`--ui-green`, Spell UI's `colors.css`):
   * a name in the settings is drawn from the theme.
   */
  static readonly NAMES: readonly string[] = [
    "red",
    "orange",
    "yellow",
    "olive",
    "green",
    "teal",
    "blue",
    "violet",
    "purple",
    "pink",
    "brown",
    "grey",
    "black"
  ]

  /**
   * Is `value` a colour the settings may give:  CSS colour words only, nothing that ends a declaration?
   * - it goes into a page's style:  `#2f9e6e`, `green`, `oklch(60% 0.1 180)`;  no `;`, braces or quotes
   */
  static isColor(value: unknown): value is string {
    return typeof value === "string" && COLOR.test(value.trim())
  }

  /**
   * `color` as CSS:  a Spell UI colour name (`NAMES`, any case) as the theme's own colour, `var(--ui-green)`,
   * so it suits light and dark and every theme;  anything else as it is.
   */
  static cssOf(color: string): string {
    const name = color.trim().toLowerCase()
    return VoiceColor.NAMES.includes(name) ? `var(--ui-${name})` : color
  }
}

/** A colour, as the settings may give one (`VoiceColor.isColor()`). */
const COLOR = /^[#\w][\w\s#%.,()/+-]{0,60}$/
