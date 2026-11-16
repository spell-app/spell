import type { LSP } from "spell/app/lsp"
import type { monaco } from "spell/app/app/ui/monaco"

/**
 * The code editor's popups:  which of Monaco's show by themselves, and when (Owen, epic `debut`:
 * "vscode popup with details about what you are typing is annoying when I'm trying to look at code");
 * and its look:  Spell drawn bubbly, or not (epic `language` P50).
 * - The choices, their defaults, and what each one means to Monaco:  nothing else.
 * - By default the suggestions show by themselves only where they help (epic `editor` P28, Owen's choice C):
 *   a tag after `<`, an attribute inside a tag, a property after `its` / `'s` / `of` (`SUGGEST_WHERE_IT_HELPS`).
 *   Everywhere else they wait for Ctrl+Space, as Quiet Code Popups (P4) chose;  hover waits for ⌥.
 * - An error's message shows on a plain hover over its squiggle all the same, unless hover is "Always", when
 *   Monaco's own shows it (`ErrorHover`, epic `editor` I97).
 * - Every Monaco editor starts on the defaults (`SpellMonaco.OPTIONS`), `<spell-editor>`'s too.
 * - The editor app lets people change them, in the code pane's "..." menu, "Settings…" (`CodeSettings`).
 * - Types only from Monaco:  the editor app reads this before Monaco loads, and Monaco is a lazy chunk.
 */

/**
 * When hover info shows, first the default:  only while ⌥ (Alt) is held, always, or never.
 * - Not an error's message:  that shows on a plain hover in every mode (`ErrorHover`).
 */
export const HOVER_MODES = ["withAlt", "always", "never"] as const
/** When hover info shows:  one of `HOVER_MODES`. */
export type HoverMode = (typeof HOVER_MODES)[number]

/**
 * When suggestions show by themselves, first the default:
 * only where they help (`SUGGEST_WHERE_IT_HELPS`), everywhere as you type, or never (only on Ctrl+Space).
 */
export const SUGGEST_MODES = ["whereItHelps", "everywhere", "onCtrlSpace"] as const
/** When suggestions show:  one of `SUGGEST_MODES`. */
export type SuggestMode = (typeof SUGGEST_MODES)[number]

/**
 * Suggestion modes kept under their old names, each to the mode it is now:  so a choice from before stays chosen.
 * - `asYouType`:  epic `debut` I81's "as you type", "Everywhere" since epic `editor` P28 (I66)
 */
export const SUGGEST_MODES_RENAMED: Readonly<Record<string, SuggestMode>> = { asYouType: "everywhere" }

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
  /** Draw Spell in the bubbly look as it's typed (`SpellBubbly`)?  On unless someone turns it off (Owen, Q50). */
  bubbly: boolean
  /**
   * Wrap a long line onto the next, in the code pane and the Inspector's code alike?
   * - Off unless someone turns it on:  a line stays one line, and scrolls sideways (Owen, epic `editor` I110).
   */
  wrapLines: boolean
}

/**
 * The choices until someone changes them:  hover only with ⌥ held, suggestions by themselves only where they help,
 * the rest off, but the bubbly look, on;  long lines not wrapped, so they scroll sideways.
 */
export const CODE_POPUP_DEFAULTS: CodePopupChoices = {
  hover: "withAlt",
  suggest: "whereItHelps",
  suggestDetails: false,
  parameterHints: false,
  pinnedLines: false,
  compilerWords: false,
  bubbly: true,
  wrapLines: false
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
 *   - A web address still opens on ⌘-click, or a plain click on its icon, in every mode:  `LinkClick` takes that click before Monaco does
 *     (Monaco's own would want ⌥-click here;  epic `editor` I101).
 * - Ctrl+Space shows the suggestions in every mode:  only showing them as you type is turned off.
 *   - "Where it helps" turns Monaco's own off too:  the editor asks for them itself, at the places
 *     `suggestsByItself()` names (`CodeSettings`).
 * - `wordWrap`:  for the editors that don't choose for themselves (`CodeSettings`);  a notebook's cells always wrap.
 * - The docs pane beside the list has no option of its own:  `CodeSettings` hides it with a class
 *   (`SUGGEST_DETAILS_HIDDEN`) when the details are off.  Monaco starts it folded anyway.
 */
export function monacoOptionsFor(choices: CodePopupChoices): monaco.editor.IEditorOptions {
  const asYouType = choices.suggest === "everywhere"
  return {
    hover: { enabled: HOVER_ENABLED[choices.hover] },
    multiCursorModifier: choices.hover === "withAlt" ? "ctrlCmd" : "alt",
    quickSuggestions: asYouType ? { other: "on", comments: "off", strings: "off" } : false,
    suggestOnTriggerCharacters: asYouType,
    suggest: { showInlineDetails: choices.suggestDetails },
    parameterHints: { enabled: choices.parameterHints },
    stickyScroll: { enabled: choices.pinnedLines },
    wordWrap: choices.wrapLines ? "on" : "off"
  }
}

/**
 * Where the suggestions show by themselves while "Where it helps" is chosen:  ONE list, easy to change.
 * - Each is the text before the caret, right as the list is due:  the moment its first letter can be typed.
 *   Monaco keeps the list open, filtering, as the word is typed after it.
 * - `its`, `of` and the rest only after a word:  a line starting `its ` declares a property, its name quoted
 *   (`SpellTyping`).
 */
export const SUGGEST_WHERE_IT_HELPS: readonly { place: string; before: RegExp }[] = [
  { place: "a tag, after <", before: /(?:^\s*|[>({])<$/u },
  {
    place: "an attribute, inside a tag",
    before: /<\p{L}[\p{L}\p{M}\d-]*(?:\s(?:[^<>"{}]|"[^"]*"|\{[^{}]*\})*)?\s$/u
  },
  { place: "the words an attribute takes, in its quotes", before: /<\p{L}[\p{L}\p{M}\d-]*\s[^<>]*[\p{L}\d-]="$/u },
  { place: "a property, after its / 's / of", before: /\S\s+(?:its|of|su|sus|de)\s$|\p{L}'s\s$/iu }
]

/** Should the suggestions show by themselves after `before`, the text before the caret on its line? */
export function suggestsByItself(before: string): boolean {
  return SUGGEST_WHERE_IT_HELPS.some(({ before: place }) => place.test(before))
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

/** The page's class while the code is drawn bubbly (`markBubbly()`). */
const BUBBLY_CLASS = "spell-bubbly"

/**
 * Is the code drawn in the bubbly look now, one for the page;  and who hears it change.
 * - `SpellBubbly` reads it for each editor, and follows it;  `CodeSettings` changes it (`showBubbly()`).
 * - An object, as `codeHover` is:  Monaco is a lazy chunk, and this file is read before it loads.
 */
export const codeLook: { isBubbly: boolean; followers: Set<() => void> } = {
  isBubbly: CODE_POPUP_DEFAULTS.bubbly,
  followers: new Set()
}
markBubbly()

/** Draw the code bubbly, or not, in every editor on the page:  tells `codeLook`'s followers when it changes. */
export function showBubbly(isBubbly: boolean): void {
  if (codeLook.isBubbly === isBubbly) return
  codeLook.isBubbly = isBubbly
  markBubbly()
  for (const follower of codeLook.followers) follower()
}

/**
 * Mark the page `spell-bubbly` while the code is drawn bubbly:  the Inspector's cards and the site editor's
 * board and form then take the code's paper (`--spell-code-paper`;  epic `editor` I153, epic `mockup` I17).
 * - SIDE EFFECT:  the page's root class;  nothing where there's no page (node's tests).
 */
function markBubbly(): void {
  globalThis.document?.documentElement.classList.toggle(BUBBLY_CLASS, codeLook.isBubbly)
}

/** The class on an editor's container that hides the docs pane beside its suggestions. */
export const SUGGEST_DETAILS_HIDDEN = "suggest-details-hidden"

/**
 * The attribute on a box whose code editor wraps as it says itself, whatever Wrap long lines is (`CodeSettings`):
 * a notebook's cell, as tall as its text (`data-own-wrap`).
 */
export const OWN_WRAP = "data-own-wrap"
