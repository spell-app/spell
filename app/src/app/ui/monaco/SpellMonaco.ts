import { SP } from "spell/parser/spell"
import { LSP } from "spell/app/lsp"
import type * as UIT from "spell/app/app/ui/ui.types"
import { CODE_POPUP_DEFAULTS, monacoOptionsFor } from "spell/app/app/ui/codePopups"
import { CodeThemes } from "spell/app/app/ui/monaco/themes/CodeThemes"
import { monaco } from "./monaco"
import { SpellHeadings } from "./SpellHeadings"
import { SpellBubbly } from "./SpellBubbly"
import { SpellTyping } from "./SpellTyping"
import { ValuePicker } from "./ValuePicker"
import { ValueChoices } from "./ValueChoices"
import { ErrorHover } from "./ErrorHover"
import { CodeOrTextTyping } from "./CodeOrTextTyping"
import { FoldArrows } from "./FoldArrows"
import { LinkClick } from "./LinkClick"
import { SpellTokensProvider } from "./SpellTokensProvider"
import { SpellModels } from "./SpellModels"
import { SpellLanguageFeatures } from "./SpellLanguageFeatures"

/** Monaco's indent action for each of the Enter rules' `indent`s (`LSP.SpellTyping.ENTER_RULES`). */
const ENTER_INDENT = {
  indent: monaco.languages.IndentAction.Indent,
  indentOutdent: monaco.languages.IndentAction.IndentOutdent
} as const satisfies Record<LSP.EnterRule["indent"], monaco.languages.IndentAction>

/**
 * Spell in Monaco:  the `spell` and `spell-page` languages and their features, and the options every `<MonacoEditor>`
 * starts with.
 * - Two languages, one per form of a spell file, since each colours its lines with its own tokenizer
 *   (`SpellTokensProvider`):  plain Spell, and a page file, each file picked by what it says (`SP.formOfText()`).
 *   Everything else -- editing, the language features, headings -- is the same for both.
 * - `register()` once, before the first editor -- `<MonacoEditor>` and `models` both do.
 * - Language features come from `LSP.SpellLanguageService`, in-process -- see `SpellLanguageFeatures`.
 * - What to do when a file is edited, or another should be shown, is up to whoever shows editors:
 *   the app, each `<spell-editor>`.  So SEVERAL can listen:  see `onEdit()`, `onOpen()`.
 * - The code's colours are the page's theme's, light or dark as the page is:  `CodeThemes`, which `register()`
 *   starts (epic `debut` P22).
 * - Heading comments -- `#`, `##` ... -- are bold by decoration:  see `SpellHeadings`.
 * - Spell is drawn in the bubbly look as it's typed, unless the page's setting says not:  see `SpellBubbly`.
 * - Typing on a blank line takes its block's indent, `group ` opens a name's quotes,
 *   and a space after a tag's name writes the rest of it (`<action "|" />`, `<segment |></segment>`):  see `SpellTyping`.
 * - A colour or an icon attribute's value can be picked at the caret, from its words list's first row:  see `ValuePicker`.
 * - An attribute's words show quietly under its value once the caret rests in it:  see `ValueChoices`.
 * - An error shows its message on a plain hover over its squiggle, though the hover info waits for ⌥:  see `ErrorHover`.
 * - A web address in the code opens on a click on the icon after it, or on ⌘-click as in VS Code:  see `LinkClick`.
 */
export class SpellMonaco {
  /** Language id for code spell, `Card.spell`. */
  static LANGUAGE = "spell"

  /** Language id for a page file, `"button api" is a notebook page` (epic `language` P47):  `Button/API.spell`. */
  static PAGE_LANGUAGE = "spell-page"

  /** Both of spell's languages:  what its features and headings are for. */
  static LANGUAGES = [SpellMonaco.LANGUAGE, SpellMonaco.PAGE_LANGUAGE]

  /**
   * Editor options every `<MonacoEditor>` starts with.
   * - No `theme`:  Monaco has one per page, which `CodeThemes` sets;  an editor naming one would reset every editor.
   * - Always TABS in spell, shown 3 wide.
   * - Formats as you type:  a Spanish keyword typed without its accent gets it back (`SpellLanguageFeatures`).
   * - Large text (`fontSize`), and no line numbers:  the app's code editor turns them on from its `...` menu.
   * - No border or cursor mark down the scrollbar:  a hard line beside the pane's soft edge.
   * - Popups at their defaults (`monacoOptionsFor()`):  hover info only with ⌥ held,
   *   suggestions by themselves only where they help, no details beside them.  The app's code pane changes them from its `...` menu (`CodeSettings`).
   */
  static OPTIONS: monaco.editor.IStandaloneEditorConstructionOptions = {
    automaticLayout: true,
    tabSize: 2,
    insertSpaces: false,
    detectIndentation: false,
    fontFamily: 'system-ui, -apple-system, "Segoe UI", sans-serif',
    fontSize: 15,
    lineNumbers: "off",
    // no room before the code beyond the fold arrows' own 16px, which Monaco adds (Owen, epic `editor` I154:
    // "I don't want to lose the folding but I do want to lose the space");  its default is 10px more
    lineDecorationsWidth: 0,
    minimap: { enabled: false },
    // no band across the current line, in any theme (Owen:  "Lose the line highlight in monaco in all themes")
    renderLineHighlight: "none",
    // no marks on every other `it` and `its` the caret's word matches (Owen:  "distracting, turn it off")
    occurrencesHighlight: "off",
    selectionHighlight: false,
    scrollBeyondLastLine: false,
    overviewRulerBorder: false,
    hideCursorInOverviewRuler: true,
    "semanticHighlighting.enabled": true,
    formatOnType: true,
    ...monacoOptionsFor(CODE_POPUP_DEFAULTS)
  }

  /**
   * How spell edits:  comments, brackets, back out for `else` (`SpellKeywords`);
   *   in a level after a trailing `:` or an opening tag, and between `<x>` and `</x>` (epic `editor` I65).
   * - Its Enter rules are the language service's table (`LSP.SpellTyping.ENTER_RULES`).
   * - NOTE: keep in step with the VS Code extension's `vscode/language-configuration.json`:
   *   a test checks they match.
   */
  static CONFIGURATION: monaco.languages.LanguageConfiguration = {
    comments: { lineComment: "//" },
    brackets: [
      ["(", ")"],
      ["[", "]"],
      ["{", "}"]
    ],
    autoClosingPairs: [
      { open: "(", close: ")" },
      { open: "[", close: "]" },
      { open: "{", close: "}" },
      { open: '"', close: '"', notIn: ["string", "comment"] },
      { open: "'", close: "'", notIn: ["string", "comment"] }
    ],
    surroundingPairs: [
      { open: "(", close: ")" },
      { open: "[", close: "]" },
      { open: "{", close: "}" },
      { open: '"', close: '"' },
      { open: "'", close: "'" }
    ],
    wordPattern: /[\p{L}_][\p{L}\p{M}\d_-]*|-?\d+(\.\d+)?/u,
    indentationRules: {
      increaseIndentPattern: /:\s*$/,
      decreaseIndentPattern: LSP.SpellKeywords.DECREASE_INDENT
    },
    // Spell's Enter rules, one table for every editor (`LSP.SpellTyping.ENTER_RULES`)
    onEnterRules: LSP.SpellTyping.ENTER_RULES.map(({ beforeText, afterText, indent }) => ({
      beforeText,
      ...(afterText ? { afterText } : {}),
      action: { indentAction: ENTER_INDENT[indent] }
    }))
  }

  /** Who hears each edit -- see `onEdit()`. */
  static #editListeners = new Set<(file: SP.AnySpellFile) => void>()
  /** Who may show another file, latest first -- see `onOpen()`. */
  static #openers: SpellMonacoOpener[] = []

  /**
   * Call `listener` after each edit of a model has gone into its file, e.g. to compile soon.
   * - EVERY listener hears EVERY edit:  one showing a single project checks `file.project`.
   * - Returns what stops it.
   */
  static onEdit(listener: (file: SP.AnySpellFile) => void): () => void {
    SpellMonaco.#editListeners.add(listener)
    return () => SpellMonaco.#editListeners.delete(listener)
  }

  /**
   * Let `opener` show another file, e.g. for "go to definition" in another file.
   * - Asked latest first, until one says it did, by returning `true`.
   *   e.g. a `<spell-editor>` only for its own editor, `source`, while the app takes anything.
   * - Returns what stops it.
   */
  static onOpen(opener: SpellMonacoOpener): () => void {
    SpellMonaco.#openers.unshift(opener)
    return () => {
      SpellMonaco.#openers = SpellMonaco.#openers.filter((it) => it !== opener)
    }
  }

  /** Everything `register()` made, once it has. */
  static #registered: SpellMonacoParts | undefined

  /**
   * Models of the files the editor works with -- see `SpellModels`.
   * - SIDE EFFECT:  `register()`s.
   */
  static get models(): SpellModels {
    return SpellMonaco.register().models
  }

  /** Register the `spell` and `spell-page` languages and their features with Monaco, if we haven't yet. */
  static register(): SpellMonacoParts {
    if (SpellMonaco.#registered) return SpellMonaco.#registered
    const { LANGUAGE, PAGE_LANGUAGE, LANGUAGES } = SpellMonaco
    // start loading Spell UI's help table now (a chunk of its own, loaded as it's first asked for):  asked first by the
    // first suggestion, it wasn't in yet, and `<segment col` offered the program's names, not `color` (Owen, I82)
    SP.ComponentPacks.help("en")
    CodeThemes.register()
    SpellHeadings.watch(LANGUAGES)
    SpellBubbly.watch(LANGUAGES)
    monaco.editor.onDidCreateEditor((editor) => {
      new SpellTyping(editor, { indents: LANGUAGES, quotes: [LANGUAGE] })
      // `{` in a tag's quoted value makes it code, `"` right after a code value's `{` text (epic `editor` T74)
      new CodeOrTextTyping(editor, LANGUAGES)
      // the right-click menu's Rename Symbol only where something can be renamed (epic `editor` I147)
      SpellMonaco.#registered?.features.followRenameRow(editor)
      // an attribute's words under its value, once the caret rests in it (epic `editor` T70)
      const features = SpellMonaco.#registered?.features
      if (features) new ValueChoices(editor, features.attributeValuesAt)
      new ErrorHover(editor)
      new LinkClick(editor)
      // a fold arrow drawn over the code still folds (epic `editor` I154)
      new FoldArrows(editor)
    })
    // ⌘F finds with its replace row showing, as VS Code's ⌥⌘F:  ⌘R reloads the page here (epic `editor` I105);
    // the same command as `EDITOR_HOTKEYS.find`'s, which this file can't import (Monaco loads lazily)
    monaco.editor.addKeybindingRule({
      keybinding: monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyF,
      command: "editor.action.startFindReplaceAction"
    })
    monaco.languages.register({
      id: LANGUAGE,
      extensions: [SP.SPELL_SUFFIX],
      mimetypes: ["text/spell", "text/x-spell"]
    })
    monaco.languages.register({ id: PAGE_LANGUAGE, mimetypes: ["text/x-spell-page"] })
    const colourEach = () => {
      monaco.languages.setTokensProvider(LANGUAGE, new SpellTokensProvider())
      monaco.languages.setTokensProvider(PAGE_LANGUAGE, SpellTokensProvider.forPages())
    }
    for (const language of LANGUAGES) monaco.languages.setLanguageConfiguration(language, SpellMonaco.CONFIGURATION)
    colourEach()
    // `<css>` and `<markdown>` blocks colour with Monaco's own colouring, which loads lazily:
    // colour spell again once it has;
    // and markup with its html colouring
    const lazyColouring = ["css", "markdown", "html"].map((language) => monaco.editor.colorize("", language, {}))
    void Promise.all(lazyColouring)
      .then(colourEach)
      .catch((error) => console.warn("SpellMonaco.register():  CSS, markdown or html colouring didn't load", error))

    const addresses = new LSP.AppAddresses()
    const service = new LSP.SpellLanguageService(addresses)
    // its value's words list a Pick row first, which opens the picker at the caret (epic `editor` T61)
    service.picksValues = true
    monaco.editor.registerCommand(
      LSP.PICK_VALUE_COMMAND,
      (_accessor, picker: SP.ComponentValuePicker, values: string[]) => {
        const editor = monaco.editor.getEditors().find((it) => it.hasTextFocus()) ?? monaco.editor.getEditors()[0]
        if (editor) ValuePicker.open(editor, picker, values)
      }
    )
    const models = new SpellModels(service, (file) => SpellMonaco.#editListeners.forEach((listener) => listener(file)))
    const features = new SpellLanguageFeatures({
      service,
      addresses,
      models,
      open: (path, selection, source) => SpellMonaco.#openers.some((opener) => opener(path, selection, source))
    })
    features.register(LANGUAGES)
    SpellMonaco.#registered = { addresses, service, models, features }
    return SpellMonaco.#registered
  }

  /**
   * Monaco language id for a file named `path` holding `text`, by its extension and, for a spell file, its shape.
   * - Each shape colours with its own tokenizer (`SP.formOfText()`), so a file can change language as it's edited.
   */
  static languageForPath(path: string | undefined, text?: string): string {
    const extension = path?.match(/\.[^./]+$/)?.[0]
    if (SP.isSpellSourceName(extension)) {
      return SP.formOfText(text) === "page" ? SpellMonaco.PAGE_LANGUAGE : SpellMonaco.LANGUAGE
    }
    if (extension === ".js" || extension === ".jsx") return "javascript"
    if (extension === ".css") return "css"
    if (extension === ".md") return "markdown"
    return "plaintext"
  }
}

/**
 * Show the file at `path`, selecting `selection` -- `true` if it did.  See `SpellMonaco.onOpen()`.
 * - `source`:  the editor asking, e.g. where "go to definition" was, if we know.
 */
export type SpellMonacoOpener = (
  path: string,
  selection: UIT.EditorSelection | undefined,
  source: monaco.editor.ICodeEditor | undefined
) => boolean

/** Everything `SpellMonaco.register()` makes. */
export type SpellMonacoParts = {
  addresses: LSP.AppAddresses
  service: LSP.SpellLanguageService
  models: SpellModels
  features: SpellLanguageFeatures
}
