import type { LSP } from "spell/app/lsp"
import type { monaco } from "spell/app/app/ui/monaco"

/**
 * The code editor's popups:  which of Monaco's show by themselves, and when (Owen, epic `debut`:
 * "vscode popup with details about what you are typing is annoying when I'm trying to look at code").
 * - The choices, their defaults, and what each one means to Monaco:  nothing else.
 * - By default nothing shows by itself as you type (Owen, epic `editor` P4).
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
  /** Keep the lines that open the current block pinned at the top of the code? */
  pinnedLines: boolean
  /** Show the compiler's words in the hover:  what it matches, what it compiles to, the compiled code? */
  compilerWords: boolean
}

/** The choices until someone changes them:  hover only with ⌥ held, suggestions only on Ctrl+Space, the rest off. */
export const CODE_POPUP_DEFAULTS: CodePopupChoices = {
  hover: "withAlt",
  suggest: "onCtrlSpace",
  suggestDetails: false,
  parameterHints: false,
  pinnedLines: false,
  compilerWords: false
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
    parameterHints: { enabled: choices.parameterHints },
    stickyScroll: { enabled: choices.pinnedLines }
  }
}

/** How much the hover says for `choices`:  Monaco has no option for it. */
export function hoverDetailFor(choices: CodePopupChoices): LSP.HoverDetail {
  return choices.compilerWords ? "full" : "plain"
}

/**
 * How much the code editor's hover says now, one for the page.
 * - `SpellLanguageFeatures` reads it for each hover;  `CodeSettings` changes it.
 * - An object, since a hover provider is registered once and has no editor to ask.
 */
export const codeHover: { detail: LSP.HoverDetail } = { detail: hoverDetailFor(CODE_POPUP_DEFAULTS) }

/** The class on an editor's container that hides the docs pane beside its suggestions. */
export const SUGGEST_DETAILS_HIDDEN = "suggest-details-hidden"
