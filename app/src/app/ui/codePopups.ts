import type { LSP } from "spell/app/lsp"

/**
 * The code editor's popups:  which show by themselves, and when (Owen, epic `debut`:
 * "vscode popup with details about what you are typing is annoying when I'm trying to look at code");
 * and its look:  Spell drawn bubbly, or not (epic `language` P50).
 * - The choices, their defaults, and what each one means to the code editor:  nothing else.
 * - By default the suggestions show by themselves only where they help (epic `editor` P28, Owen's choice C):
 *   a tag after `<`, an attribute inside a tag, a property after `its` / `'s` / `of` (`SUGGEST_WHERE_IT_HELPS`).
 *   Everywhere else they wait for Ctrl+Space, as Quiet Code Popups (P4) chose;  hover waits for ⌥.
 * - An error's message shows on a plain hover over its squiggle all the same, unless hover is "Always", when
 *   the hover's own shows it (`CodeMirrorHovers`, epic `editor` I97).
 * - The editor app lets people change them, in the code pane's "..." menu, "Settings…" (`CodeSettings`);
 *   every code editor follows them (`codeChoices`), `<spell-editor>`'s too.
 * - No editor in it:  the editor app reads this before the code editor loads, which is a lazy chunk.
 */

/**
 * When hover info shows, first the default:  only while ⌥ (Alt) is held, always, or never.
 * - Not an error's message:  that shows on a plain hover in every mode (`CodeMirrorHovers`).
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
  /** Draw Spell in the bubbly look as it's typed (`CodeMirrorBubbly`)?  On unless someone turns it off (Owen, Q50). */
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

/**
 * What `choices` mean to a CodeMirror editor (epic `codemirror` P5):
 * what `CodeMirrorPopups` turns into each editor's compartment, changed live as Settings… changes.
 * - Plain values, no CodeMirror in them:  this file is read before any editor loads.
 * - Hover with ⌥ is CodeMirror's as it is:  no multi-cursor key to swap, so ⌘-click stays a web address's and a
 *   definition's (`CodeMirrorLinks`' rule), in every mode.
 * - Pinned lines are the app's own (`CodeMirrorPinned`):  CodeMirror has no sticky scroll of its own.
 */
export function codeMirrorOptionsFor(choices: CodePopupChoices): CodeMirrorPopupOptions {
  return {
    hoverInfo: choices.hover,
    suggest: choices.suggest,
    suggestDetails: choices.suggestDetails,
    signatureHelp: choices.parameterHints,
    lineWrapping: choices.wrapLines,
    pinnedLines: choices.pinnedLines
  }
}

/** What the code editor's popups are to do in CodeMirror:  `codeMirrorOptionsFor()`. */
export type CodeMirrorPopupOptions = {
  /** When the hover's info shows:  with ⌥ held, always, never.  An error's message shows on a plain hover in each. */
  hoverInfo: HoverMode
  /** When the suggestions show by themselves:  where they help, everywhere, or only on Ctrl+Space. */
  suggest: SuggestMode
  /** Each suggestion's details beside it, in the list. */
  suggestDetails: boolean
  /** A call's words shown as its arguments are typed (signature help);  ⇧⌘Space shows them in every mode. */
  signatureHelp: boolean
  /** Long lines wrapped onto the next, rather than scrolled sideways. */
  lineWrapping: boolean
  /** The lines opening the blocks the top of the code is inside, pinned over it as it scrolls. */
  pinnedLines: boolean
}

/**
 * Where the suggestions show by themselves while "Where it helps" is chosen:  ONE list, easy to change.
 * - Each is the text before the caret, right as the list is due:  the moment its first letter can be typed.
 *   The list stays open, filtering, as the word is typed after it.
 * - `its`, `of` and the rest only after a word:  a line starting `its ` declares a property, its name quoted
 *   (`LSP.SpellTyping.opensQuotes()`).
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

/**
 * How long the mouse rests on a word before its hover shows, in seconds:  the page's own wait, `--ui-hover-delay`.
 * - Every code editor's hover waits this long (epic `codemirror` P1).
 */
export const HOVER_DELAY = 0.8

/** How much the hover says for `choices`. */
export function hoverDetailFor(choices: CodePopupChoices): LSP.HoverDetail {
  return choices.compilerWords ? "full" : "plain"
}

/**
 * How much the code editor's hover says now, one for the page.
 * - Every editor's hover reads it, through `CodeEditorFeatures.hover()`;  `CodeSettings` changes it.
 * - An object, since a hover provider is registered once and has no editor to ask.
 */
export const codeHover: { detail: LSP.HoverDetail } = { detail: hoverDetailFor(CODE_POPUP_DEFAULTS) }

/**
 * Is the code drawn in the bubbly look now, one for the page;  and who hears it change.
 * - `CodeMirrorLook` reads it for each editor, and follows it;  `CodeSettings` changes it (`showBubbly()`).
 * - An object, as `codeHover` is:  the code editor is a lazy chunk, and this file is read before it loads.
 */
export const codeLook: { isBubbly: boolean; followers: Set<() => void> } = {
  isBubbly: CODE_POPUP_DEFAULTS.bubbly,
  followers: new Set()
}

/**
 * What's chosen for the code editor now, one for the page;  and who hears it change.
 * - Every code editor follows it (`CodeMirrorPopups`).
 * - An object, as `codeLook` is:  read before any editor loads.
 */
export const codeChoices: { now: CodePopupChoices; followers: Set<() => void> } = {
  now: CODE_POPUP_DEFAULTS,
  followers: new Set()
}

/**
 * Make `choices` the page's:  how much the hover says (`codeHover`), the look (`showBubbly()`),
 * and `codeChoices`' followers told.
 * - `CodeSettings` calls it as each choice changes, and as the page starts.
 */
export function showCodeChoices(choices: CodePopupChoices): void {
  codeHover.detail = hoverDetailFor(choices)
  showBubbly(choices.bubbly)
  if (codeChoices.now === choices) return
  codeChoices.now = choices
  for (const follower of codeChoices.followers) follower()
}

/** Draw the code bubbly, or not, in every editor on the page:  tells `codeLook`'s followers when it changes. */
export function showBubbly(isBubbly: boolean): void {
  if (codeLook.isBubbly === isBubbly) return
  codeLook.isBubbly = isBubbly
  for (const follower of codeLook.followers) follower()
}

/** The class on an editor's container that hides the docs pane beside its suggestions. */
export const SUGGEST_DETAILS_HIDDEN = "suggest-details-hidden"

/**
 * The attribute on a box whose code editor wraps as it says itself, whatever Wrap long lines is (`CodeSettings`):
 * a notebook's cell, as tall as its text (`data-own-wrap`).
 */
export const OWN_WRAP = "data-own-wrap"
