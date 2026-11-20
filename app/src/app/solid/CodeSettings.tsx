import { createSignal, For } from "solid-js"

import { editorPrefs } from "spell/app/app/editorPrefs"
import { appTexts, type AppTextKey } from "spell/app/app/ui/AppTexts"
import {
  CODE_POPUP_DEFAULTS,
  HOVER_MODES,
  POPUP_DELAYS,
  SUGGEST_MODES,
  SUGGEST_MODES_RENAMED,
  showCodeChoices,
  type CodePopupChoices
} from "spell/app/app/ui/codePopups"
import { on } from "./on"

import "./CodeSettings.css"

/****************
 * ### `CodeSettings`
 * The code editor's settings, for its popups:  hover info, when suggestions show by themselves, their details, parameter hints,
 * pinned lines and the compiler's words in the hover;  and its look, bubbly or not (epic `language` P50),
 * and whether long lines wrap (epic `editor` I110:  the code pane and the Inspector's code alike);
 * and how long every popup on the page waits before it shows by itself (epic `codemirror` T19).
 * - Changed in the code pane's "..." menu, "Settings…", which shows `<CodeSettingsPanel>` over the code.
 * - Each change applies at once to every code editor on the page, and the browser remembers it
 *   (`spellEditor:codeHover` ...):  the editors follow `codeChoices`, which it sets (`showCodeChoices()`),
 *   from the page's start.
 * - Defaults, and what each choice means to the code editor:  `codePopups.ts`.
 * - Static, like `LineNumbers`:  ONE set of choices per page.
 ****************/
export class CodeSettings {
  /** What's chosen now (reactive). */
  static get choices(): CodePopupChoices {
    return choices()
  }

  /** Is the settings panel showing (reactive)? */
  static get isShowing(): boolean {
    return isShowing()
  }

  /** Show the settings panel, or hide it. */
  static toggleShowing(show = !isShowing()): void {
    setShowing(show)
  }

  /** Choose `value` for `key`:  remember it, and apply it to every editor now. */
  static choose<K extends keyof CodePopupChoices>(key: K, value: CodePopupChoices[K]): void {
    // built on `chosen`, not the signal:  a signal reads its old value until Solid flushes the write
    chosen = { ...chosen, [key]: value }
    setChoices(chosen)
    editorPrefs.set(PREFS[key], value)
    showCodeChoices(chosen)
  }
}

/** The preference that remembers each choice. */
const PREFS = {
  hover: "codeHover",
  suggest: "codeSuggest",
  suggestDetails: "codeSuggestDetails",
  parameterHints: "codeParameterHints",
  pinnedLines: "codePinnedLines",
  compilerWords: "codeCompilerWords",
  bubbly: "codeBubbly",
  wrapLines: "codeWrapLines",
  popupDelay: "codePopupDelay"
} as const satisfies Record<keyof CodePopupChoices, string>

editorPrefs
  .declare(PREFS.hover, { oneOf: [...HOVER_MODES], default: CODE_POPUP_DEFAULTS.hover })
  .declare(PREFS.suggest, {
    oneOf: [...SUGGEST_MODES],
    default: CODE_POPUP_DEFAULTS.suggest,
    renamed: SUGGEST_MODES_RENAMED
  })
  .declare(PREFS.suggestDetails, { type: "choice", default: CODE_POPUP_DEFAULTS.suggestDetails })
  .declare(PREFS.parameterHints, { type: "choice", default: CODE_POPUP_DEFAULTS.parameterHints })
  .declare(PREFS.pinnedLines, { type: "choice", default: CODE_POPUP_DEFAULTS.pinnedLines })
  .declare(PREFS.compilerWords, { type: "choice", default: CODE_POPUP_DEFAULTS.compilerWords })
  .declare(PREFS.bubbly, { type: "choice", default: CODE_POPUP_DEFAULTS.bubbly })
  .declare(PREFS.wrapLines, { type: "choice", default: CODE_POPUP_DEFAULTS.wrapLines })
  .declare(PREFS.popupDelay, { oneOf: [...POPUP_DELAYS], default: CODE_POPUP_DEFAULTS.popupDelay })

/** What's chosen, as remembered:  read now, outside Solid's schedule (`choices()` is the reactive copy). */
let chosen: CodePopupChoices = {
  hover: editorPrefs.get(PREFS.hover) as CodePopupChoices["hover"],
  suggest: editorPrefs.get(PREFS.suggest) as CodePopupChoices["suggest"],
  suggestDetails: editorPrefs.get(PREFS.suggestDetails) as boolean,
  parameterHints: editorPrefs.get(PREFS.parameterHints) as boolean,
  pinnedLines: editorPrefs.get(PREFS.pinnedLines) as boolean,
  compilerWords: editorPrefs.get(PREFS.compilerWords) as boolean,
  bubbly: editorPrefs.get(PREFS.bubbly) as boolean,
  wrapLines: editorPrefs.get(PREFS.wrapLines) as boolean,
  popupDelay: editorPrefs.get(PREFS.popupDelay) as CodePopupChoices["popupDelay"]
}
const [choices, setChoices] = createSignal(chosen)
const [isShowing, setShowing] = createSignal(false)

// the page's code editors start on what's chosen
showCodeChoices(chosen)

/****************
 * ### `<CodeSettingsPanel>`
 * The code pane's settings, a small card over the code's top right corner:  `CodeSettings`' choices.
 * - Hover info, suggestions and the popup delay:  a select each;  the rest (`TOGGLES`):  a toggle each.
 * - Each change applies as it's made:  no Save.
 * - Its close button, or Escape, hides it.
 ****************/
export function CodeSettingsPanel() {
  return (
    <div
      class="CodeSettingsPanel"
      role="dialog"
      aria-label={appTexts.text("codeSettingsHeader")}
      onKeyDown={(event: KeyboardEvent) => {
        if (event.key === "Escape") CodeSettings.toggleShowing(false)
      }}
    >
      <div class="CodeSettingsHeader">
        <h4>{appTexts.text("codeSettingsHeader")}</h4>
        <ui-button
          icon="close"
          appearance="basic"
          size="mini"
          padding="compact"
          aria-label={appTexts.text("codeSettingsClose")}
          onClick={() => CodeSettings.toggleShowing(false)}
        />
      </div>
      <ui-form size="small">
        <ui-field>
          <label for="CodeSettings-hover">{appTexts.text("codeHover")}</label>
          <ui-select
            id="CodeSettings-hover"
            name="hover"
            fluid=""
            value={CodeSettings.choices.hover}
            ref={on<{ value: string }>("ui-changed", (event) =>
              CodeSettings.choose("hover", event.detail.value as CodePopupChoices["hover"])
            )}
          >
            <For each={HOVER_MODES}>{(mode) => <ui-item value={mode}>{appTexts.text(HOVER_TEXTS[mode])}</ui-item>}</For>
          </ui-select>
        </ui-field>
        <ui-field>
          <label for="CodeSettings-suggest">{appTexts.text("codeSuggest")}</label>
          <ui-select
            id="CodeSettings-suggest"
            name="suggest"
            fluid=""
            value={CodeSettings.choices.suggest}
            ref={on<{ value: string }>("ui-changed", (event) =>
              CodeSettings.choose("suggest", event.detail.value as CodePopupChoices["suggest"])
            )}
          >
            <For each={SUGGEST_MODES}>
              {(mode) => <ui-item value={mode}>{appTexts.text(SUGGEST_TEXTS[mode])}</ui-item>}
            </For>
          </ui-select>
        </ui-field>
        <ui-field>
          <label for="CodeSettings-popupDelay">{appTexts.text("codePopupDelay")}</label>
          <ui-select
            id="CodeSettings-popupDelay"
            name="popupDelay"
            fluid=""
            value={CodeSettings.choices.popupDelay}
            ref={on<{ value: string }>("ui-changed", (event) =>
              CodeSettings.choose("popupDelay", event.detail.value as CodePopupChoices["popupDelay"])
            )}
          >
            <For each={POPUP_DELAYS}>
              {(delay) => <ui-item value={delay}>{appTexts.text(POPUP_DELAY_TEXTS[delay])}</ui-item>}
            </For>
          </ui-select>
        </ui-field>
        <For each={TOGGLES}>
          {(toggle) => (
            <ui-field>
              <ui-checkbox
                appearance="toggle"
                name={toggle.name}
                selected={CodeSettings.choices[toggle.name]}
                ref={on<{ selected: boolean }>("ui-changed", (event) =>
                  CodeSettings.choose(toggle.name, event.detail.selected)
                )}
              >
                {appTexts.text(toggle.label)}
              </ui-checkbox>
            </ui-field>
          )}
        </For>
      </ui-form>
    </div>
  )
}

/** The choices shown as a toggle, in the panel's order. */
const TOGGLES = [
  { name: "suggestDetails", label: "codeSuggestDetails" },
  { name: "parameterHints", label: "codeParameterHints" },
  { name: "pinnedLines", label: "codePinnedLines" },
  { name: "compilerWords", label: "codeCompilerWords" },
  { name: "bubbly", label: "codeBubbly" },
  { name: "wrapLines", label: "codeWrapLines" }
] as const satisfies { name: keyof CodePopupChoices; label: AppTextKey }[]

/** Each hover mode's label. */
const HOVER_TEXTS = {
  withAlt: "codeHoverWithAlt",
  always: "codeHoverAlways",
  never: "codeHoverNever"
} as const satisfies Record<CodePopupChoices["hover"], AppTextKey>

/** Each suggestion mode's label. */
const SUGGEST_TEXTS = {
  whereItHelps: "codeSuggestWhereItHelps",
  everywhere: "codeSuggestEverywhere",
  onCtrlSpace: "codeSuggestOnCtrlSpace"
} as const satisfies Record<CodePopupChoices["suggest"], AppTextKey>

/** Each popup delay's label. */
const POPUP_DELAY_TEXTS = {
  short: "codePopupDelayShort",
  standard: "codePopupDelayStandard",
  long: "codePopupDelayLong"
} as const satisfies Record<CodePopupChoices["popupDelay"], AppTextKey>
