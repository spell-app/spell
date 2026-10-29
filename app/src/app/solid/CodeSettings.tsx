import { createSignal, For } from "solid-js"

import { editorPrefs } from "spell/app/app/editorPrefs"
import { appTexts, type AppTextKey } from "spell/app/app/ui/AppTexts"
import {
  CODE_POPUP_DEFAULTS,
  HOVER_MODES,
  SUGGEST_DETAILS_HIDDEN,
  SUGGEST_MODES,
  monacoOptionsFor,
  type CodePopupChoices
} from "spell/app/app/ui/codePopups"
import type { monaco } from "spell/app/app/solid/monaco"
import { on } from "./on"

import "./CodeSettings.css"

/****************
 * ### `CodeSettings`
 * The code editor's settings, for its popups:  hover info, suggestions, their details, parameter hints.
 * - Changed in the code pane's "..." menu, "Settings…", which shows `<CodeSettingsPanel>` over the code.
 * - Each change applies at once to every Monaco editor on the page, and the browser remembers it
 *   (`spellEditor:codeHover` ...).
 * - Defaults, and what each choice means to Monaco:  `codePopups.ts`.
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
    for (const each of monacoApi?.editor.getEditors() ?? []) CodeSettings.applyTo(each)
  }

  /**
   * Apply the choices to every Monaco editor on the page, now and as each is made.
   * - Called once, as Monaco loads (`LazyMonaco`).  Takes Monaco then:  it's a lazy chunk.
   */
  static follow(api: typeof monaco): void {
    if (monacoApi) return
    monacoApi = api
    for (const each of api.editor.getEditors()) CodeSettings.setUp(each)
    api.editor.onDidCreateEditor((each) => CodeSettings.setUp(each))
  }

  /** A new editor:  apply the choices, and show its hover when ⌥ is pressed over a word. */
  private static setUp(codeEditor: monaco.editor.ICodeEditor): void {
    CodeSettings.applyTo(codeEditor)
    showHoverOnAlt(codeEditor)
  }

  /** Apply what's chosen to `codeEditor`. */
  static applyTo(codeEditor: monaco.editor.ICodeEditor): void {
    codeEditor.updateOptions(monacoOptionsFor(chosen))
    codeEditor.getContainerDomNode().classList.toggle(SUGGEST_DETAILS_HIDDEN, !chosen.suggestDetails)
  }
}

/** The preference that remembers each choice. */
const PREFS = {
  hover: "codeHover",
  suggest: "codeSuggest",
  suggestDetails: "codeSuggestDetails",
  parameterHints: "codeParameterHints"
} as const satisfies Record<keyof CodePopupChoices, string>

editorPrefs
  .declare(PREFS.hover, { oneOf: [...HOVER_MODES], default: CODE_POPUP_DEFAULTS.hover })
  .declare(PREFS.suggest, { oneOf: [...SUGGEST_MODES], default: CODE_POPUP_DEFAULTS.suggest })
  .declare(PREFS.suggestDetails, { type: "choice", default: CODE_POPUP_DEFAULTS.suggestDetails })
  .declare(PREFS.parameterHints, { type: "choice", default: CODE_POPUP_DEFAULTS.parameterHints })

/** What's chosen, as remembered:  read now, outside Solid's schedule (`choices()` is the reactive copy). */
let chosen: CodePopupChoices = {
  hover: editorPrefs.get(PREFS.hover) as CodePopupChoices["hover"],
  suggest: editorPrefs.get(PREFS.suggest) as CodePopupChoices["suggest"],
  suggestDetails: editorPrefs.get(PREFS.suggestDetails) as boolean,
  parameterHints: editorPrefs.get(PREFS.parameterHints) as boolean
}
const [choices, setChoices] = createSignal(chosen)
const [isShowing, setShowing] = createSignal(false)

/** Monaco, once it's loaded:  see `CodeSettings.follow()`. */
let monacoApi: typeof monaco | undefined

/**
 * HACK:  ⌥ pressed while the mouse rests on a word shows its hover, the first time too.
 * - Monaco shows it on ⌥ only once the editor has shown a hover (it makes its hover widget on first use).
 *   Till then it waits for the mouse to move.
 * - So ⌥ pressed in the editor replays the last mouse move, ⌥ held.  Only while hover is "Only with ⌥ held".
 */
function showHoverOnAlt(codeEditor: monaco.editor.ICodeEditor): void {
  let lastMove: MouseEvent | undefined
  codeEditor.onMouseMove((event) => (lastMove = event.event.browserEvent))
  codeEditor.onMouseLeave(() => (lastMove = undefined))
  codeEditor.onKeyDown((event) => {
    if (event.browserEvent.key !== "Alt" || event.browserEvent.repeat) return
    if (!lastMove || chosen.hover !== "withAlt") return
    const { clientX, clientY } = lastMove
    const root = codeEditor.getContainerDomNode().getRootNode() as Document | ShadowRoot
    const move = new MouseEvent("mousemove", { bubbles: true, composed: true, clientX, clientY, altKey: true })
    root.elementFromPoint(clientX, clientY)?.dispatchEvent(move)
  })
}

/****************
 * ### `<CodeSettingsPanel>`
 * The code pane's settings, a small card over the code's top right corner:  `CodeSettings`' choices.
 * - Hover info and suggestions:  a select each;  details and parameter hints:  a toggle each.
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
          <ui-checkbox
            appearance="toggle"
            name="suggestDetails"
            selected={CodeSettings.choices.suggestDetails}
            ref={on<{ selected: boolean }>("ui-changed", (event) =>
              CodeSettings.choose("suggestDetails", event.detail.selected)
            )}
          >
            {appTexts.text("codeSuggestDetails")}
          </ui-checkbox>
        </ui-field>
        <ui-field>
          <ui-checkbox
            appearance="toggle"
            name="parameterHints"
            selected={CodeSettings.choices.parameterHints}
            ref={on<{ selected: boolean }>("ui-changed", (event) =>
              CodeSettings.choose("parameterHints", event.detail.selected)
            )}
          >
            {appTexts.text("codeParameterHints")}
          </ui-checkbox>
        </ui-field>
      </ui-form>
    </div>
  )
}

/** Each hover mode's label. */
const HOVER_TEXTS = {
  withAlt: "codeHoverWithAlt",
  always: "codeHoverAlways",
  never: "codeHoverNever"
} as const satisfies Record<CodePopupChoices["hover"], AppTextKey>

/** Each suggestion mode's label. */
const SUGGEST_TEXTS = {
  onCtrlSpace: "codeSuggestOnCtrlSpace",
  asYouType: "codeSuggestAsYouType"
} as const satisfies Record<CodePopupChoices["suggest"], AppTextKey>
