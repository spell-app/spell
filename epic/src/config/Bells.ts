import { BellSteps, type BellsValues, type BellState, type BellsView } from "spell/epic/bells/BellSteps.ts"
import { epicBellsVocabulary } from "spell/epic/components/epic-bells/EpicBells.en.ts"
import { EpicConfig } from "./EpicConfig.ts"
import { LayeredSettings } from "./LayeredSettings.ts"

/****************
 * ### `Bells`
 * BELLS & WHISTLES for node (epic `epic-engine` P86):  whether a step epic work runs by itself runs now, read from the
 * epic settings (`LayeredSettings`' `bells` group) by the rule in `BellSteps`, and the ONE way a switch or the slider
 * is set.
 * - `isOn(key)`:  the one question every reader asks, in its step's own skip check (`TitleReader`, `PromptAck`,
 *   `FreshHint`, `InboxHub` ...);  a step that's off says so in one line, `offLine(key)`
 * - `set(key, value)`:  what the dialog's route and `epic settings bells.<key> <value>` call
 * - `view()`:  every step with whether it's on now and why, for both
 * - Read fresh each time:  a switch flipped on the page counts at the next step.
 * - NEVER throws on a read:  settings that won't read stand as the kit's (every step on).
 * - Node only, imported by path (`spell/epic/config/Bells`);  plain `node` loads it (`Bells.ts`):  the hooks.
 ****************/
export class Bells {
  /** The settings' `bells` group, as merged now. */
  static values(where: BellsWhere = {}): BellsValues {
    try {
      return LayeredSettings.read(Bells.contentOf(where), { home: where.home ?? LayeredSettings.home() }).values.bells
    } catch (error) {
      console.error(`Bells:  the epic settings didn't read, so every step stays on:  ${(error as Error).message}`)
      return BellSteps.defaults()
    }
  }

  /** Does step `key` run now?  A key the table hasn't got:  yes. */
  static isOn(key: string, where: BellsWhere = {}): boolean {
    return Bells.stateOf(key, where).on
  }

  /** Whether step `key` runs now, and why not. */
  static stateOf(key: string, where: BellsWhere = {}): BellState {
    return BellSteps.stateOf(Bells.values(where), key)
  }

  /** The one line a step that's off leaves where it would have run:  `Design review:  off in Bells & Whistles`. */
  static offLine(key: string): string {
    return `${Bells.titleOf(key)}:  off in Bells & Whistles`
  }

  /** Step `key`'s title, as the dialog shows it;  the key itself for one it hasn't got. */
  static titleOf(key: string): string {
    return epicBellsVocabulary.texts.find((text) => text.key === key)?.text ?? key
  }

  /**
   * Set a switch or the slider, as `epic settings bells.<key> <value>` does;  returns the view after it.
   * - `burn`:  the slider to `value` (`low`, `medium`, `high`), the flips made while it was down cleared
   * - a step's key:  `value` `true` / `false` (or `on` / `off`):  your own switch while the slider is at High;  below
   *   it, a flip kept apart (`burnFlips`), which the slider shows as Custom (`BellSteps.withSwitch()`)
   * - throws `TypeError` for a key the table hasn't got, Auto Send's (the page's own), or a value that won't do
   * - SIDE EFFECT:  writes the developer's settings file (`LayeredSettings.setMany()`)
   */
  static set(key: string, value: unknown, where: BellsWhere = {}): BellsView {
    const values = Bells.values(where)
    if (key === "burn") {
      if (!BellSteps.isBurnLevel(value))
        throw new TypeError(`Bells.set():  the slider takes ${BellSteps.BURN_LEVELS.join(", ")}, not ${String(value)}`)
      return Bells.save(BellSteps.withBurn(values, value), where)
    }
    const step = BellSteps.stepOf(key)
    if (!step) throw new TypeError(`Bells.set():  no step ${key};  \`epic settings bells\` lists them`)
    if (step.inBrowser) throw new TypeError(`Bells.set():  ${key} is the page's own:  set it from its gear`)
    return Bells.save(BellSteps.withSwitch(values, key, Bells.onOf(value)), where)
  }

  /**
   * Save the whole `bells` group as `values` says (the dialog's Save):  only what differs from what's in force is
   * written, into the developer's file;  returns the view after it.
   * - throws `TypeError` for a value that won't do (`LayeredSettings.setMany()`):  nothing written
   */
  static save(values: BellsValues, where: BellsWhere = {}): BellsView {
    const now = Bells.values(where)
    const changes: Record<string, unknown> = {}
    if (values.burn !== now.burn) changes["bells.burn"] = values.burn
    if (JSON.stringify(values.burnFlips ?? {}) !== JSON.stringify(now.burnFlips))
      changes["bells.burnFlips"] = values.burnFlips
    for (const step of BellSteps.SETTINGS_STEPS)
      if (step.key in values && values[step.key] !== now[step.key]) changes[`bells.${step.key}`] = values[step.key]
    if (Object.keys(changes).length > 0)
      LayeredSettings.setMany(changes, { content: Bells.contentOf(where), home: where.home ?? LayeredSettings.home() })
    return Bells.view(where)
  }

  /** Every step with whether it runs now, and the slider as it reads. */
  static view(where: BellsWhere = {}): BellsView {
    const values = Bells.values(where)
    return {
      burn: values.burn,
      shown: BellSteps.burnShown(values),
      steps: BellSteps.SETTINGS_STEPS.map((step) => ({
        key: step.key,
        own: values[step.key] !== false,
        ...BellSteps.stateOf(values, step.key)
      }))
    }
  }

  /** `true` / `false`, or the words for them a command takes. */
  private static onOf(value: unknown): boolean {
    if (typeof value === "boolean") return value
    if (value === "on" || value === "true") return true
    if (value === "off" || value === "false") return false
    throw new TypeError(`Bells.set():  a switch takes on or off, not ${String(value)}`)
  }

  /** The epic repo's folder:  the one given, else the one `cwd`'s repo names;  none when it can't say. */
  private static contentOf({ content, cwd }: BellsWhere): string | undefined {
    if (content !== undefined) return content
    try {
      return EpicConfig.contentOf(cwd ?? process.cwd())
    } catch {
      return undefined
    }
  }
}

/** Where to read the settings from:  each optional. */
export type BellsWhere = {
  /** the epic repo's folder (its org layer);  else the one `cwd`'s repo names */
  content?: string
  /** a folder in the repo;  default:  the process's */
  cwd?: string
  /** the folder holding `.spell/`:  a test's own */
  home?: string
}
