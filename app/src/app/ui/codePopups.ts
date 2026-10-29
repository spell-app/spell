import type { monaco } from "spell/app/app/ui/monaco"

/**
 * The code editor's popups:  which of Monaco's show by themselves, and when (Owen, epic `debut`:
 * "vscode popup with details about what you are typing is annoying when I'm trying to look at code").
 * - The choices, their defaults, and the Monaco options each one means:  nothing else.
 * - Every Monaco editor starts on the defaults (`SpellMonaco.OPTIONS`), `<spell-editor>`'s too.
 * - The editor app lets people change them, in the code pane's "..." menu, "Settings…" (`CodeSettings`).
 * - Types only from Monaco:  the editor app reads this before Monaco loads, and Monaco is a lazy chunk.
 */

/** When hover info shows, first the default:  only while ⌥ (Alt) is held, always, or never. */
export const HOVER_MODES = ["withAlt", "always", "never"] as const
/** When hover info shows:  one of `HOVER_MODES`. */
export type HoverMode = (typeof HOVER_MODES)[number]

/** When suggestions show, first the default:  only on Ctrl+Space, or as you type. */
export const SUGGEST_MODES = ["onCtrlSpace", "asYouType"] as const
/** When suggestions show:  one of `SUGGEST_MODES`. */
export type SuggestMode = (typeof SUGGEST_MODES)[number]

/** What someone chose for the code editor's popups. */
export type CodePopupChoices = {
  /** When hover info shows. */
  hover: HoverMode
  /** When the suggestion list shows. */
  suggest: SuggestMode
  /** Show each suggestion's details beside it, and its docs pane? */
  suggestDetails: boolean
  /** Show a call's parameters as you type its arguments? */
  parameterHints: boolean
}

/** The choices until someone changes them:  hover only with ⌥ held, suggestions only on Ctrl+Space, no details. */
export const CODE_POPUP_DEFAULTS: CodePopupChoices = {
  hover: "withAlt",
  suggest: "onCtrlSpace",
  suggestDetails: false,
  parameterHints: true
}

/** Monaco's `hover.enabled` for each hover mode. */
const HOVER_ENABLED = {
  withAlt: "onKeyboardModifier",
  always: "on",
  never: "off"
} as const satisfies Record<HoverMode, "on" | "off" | "onKeyboardModifier">

/**
 * The Monaco options `choices` mean, for `editor.updateOptions()` or a new editor's.
 * - Hover with ⌥:  Monaco's `onKeyboardModifier` shows it while the key that ISN'T the multi-cursor key is held.
 *   So the multi-cursor key becomes ⌘ (Ctrl elsewhere), leaving ⌥ for the hover.
 *   - SIDE EFFECT:  ⌘-click then adds a cursor, and ⌥-click goes to a definition, the other way round from Monaco's
 *     own.  The other hover modes keep Monaco's.
 * - Ctrl+Space shows the suggestions in every mode:  only showing them as you type is turned off.
 * - The docs pane beside the list has no option of its own:  `CodeSettings` hides it with a class
 *   (`SUGGEST_DETAILS_HIDDEN`) when the details are off.  Monaco starts it folded anyway.
 */
export function monacoOptionsFor(choices: CodePopupChoices): monaco.editor.IEditorOptions {
  const asYouType = choices.suggest === "asYouType"
  return {
    hover: { enabled: HOVER_ENABLED[choices.hover] },
    multiCursorModifier: choices.hover === "withAlt" ? "ctrlCmd" : "alt",
    quickSuggestions: asYouType ? { other: "on", comments: "off", strings: "off" } : false,
    suggestOnTriggerCharacters: asYouType,
    suggest: { showInlineDetails: choices.suggestDetails },
    parameterHints: { enabled: choices.parameterHints }
  }
}

/** The class on an editor's container that hides the docs pane beside its suggestions. */
export const SUGGEST_DETAILS_HIDDEN = "suggest-details-hidden"
