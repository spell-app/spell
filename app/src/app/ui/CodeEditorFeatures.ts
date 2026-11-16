import type { CodeAction, Hover, Position, Range, WorkspaceEdit } from "vscode-languageserver"

import type { SP } from "spell/parser/spell"
import { LSP } from "spell/app/lsp"
import { appTexts, renameRefusal } from "spell/app/app/ui/AppTexts"
import { codeHover, type HoverMode } from "spell/app/app/ui/codePopups"
import { RenameRefusedError } from "spell/app/app/ui/ui.types"

/****************
 * ### `CodeEditorFeatures`
 * What the app's code editors decide alike about the language service's answers, whichever editor shows them:
 * the app's Monaco (`SpellLanguageFeatures`) and the CodeMirror test page (`CodeMirrorLanguage`;  epic `codemirror` P1).
 * - Only what's the EDITOR's to decide, not the program's (that's the language service's):
 *   how much a hover says, which code actions a menu offers, what Rename Symbol says, when the hover's info shows,
 *   where a web address or a heading comment is in a line.
 *   - Its words are `AppTexts`':  this only picks which.
 * - Plain functions and values, no editor:  each editor turns them into its own shapes.
 *   - A place in a line is a CHARACTER OFFSET, 0-based:  Monaco adds 1 for its columns, CodeMirror its line's start.
 * - More of each editor's features come here as they're lifted out of Monaco (epic `codemirror` P5):
 *   Monaco's `LinkClick`, `ErrorHover` and `SpellHeadings` are each its wiring of a group below,
 *   CodeMirror's `CodeMirrorLinks`, `CodeMirrorHovers` and `CodeMirrorHeadings` its twins.
 * - Its position in the import graph:  the app's texts and code settings, the language service (its `RenameError`);
 *   NEVER Monaco or CodeMirror.
 ****************/
export class CodeEditorFeatures {
  /**
   * What a hover at `position` in `file` says:  as much as Settings… asks (`codeHover`),
   * the sentence and its description unless the compiler's words are asked for.
   */
  static hover(service: LSP.SpellLanguageService, file: SP.SpellFile, position: Position): Hover | null {
    return service.hover(file, position, codeHover.detail)
  }

  /**
   * The code actions an editor offers for `range` of `file`:  the service's that make an edit
   * ("Define `to <phrase>`", "Make it code" ...).
   * - None that only names a command:  the app's editors run no language-server commands of their own.
   */
  static codeActions(service: LSP.SpellLanguageService, file: SP.SpellFile, range: Range): CodeAction[] {
    return service.codeActions(file, range).filter((action) => !!action.edit)
  }

  ////////////////
  // ## Rename Symbol
  ////////////////

  /**
   * Can the thing at `position` of `file` be renamed?  Rename Symbol's menu row shows only where it can (I147).
   * - NEVER throws.
   */
  static canRename(service: LSP.SpellLanguageService, file: SP.SpellFile, position: Position): boolean {
    return !!service.prepareRename(file, position)
  }

  /**
   * Edits renaming the thing at `position` of `file` to `newName`, in every file:  an action as the Inspector's Code
   * card renames it, its calls and buttons too (`LSP.SpellLanguageService.renameSaying()`;  epic `editor` I147).
   * - `oldName`:  the name as it's written at `position`, for the words of a refusal that doesn't name it
   * - throws `RenameRefusedError` where it can't, its message the Inspector's words for why (`renameRefusal()`)
   */
  static rename(
    service: LSP.SpellLanguageService,
    file: SP.SpellFile,
    position: Position,
    { newName, oldName }: { newName: string; oldName: string }
  ): WorkspaceEdit {
    let edit: WorkspaceEdit | null
    try {
      edit = service.renameSaying(file, position, newName)
    } catch (error) {
      if (!(error instanceof LSP.RenameError)) throw error
      throw new RenameRefusedError(renameRefusal(error, newName), { cause: error })
    }
    if (!edit) throw new RenameRefusedError(appTexts.text("renameRefused", { oldName, newName }))
    return edit
  }

  /** What F2 says where nothing can be renamed:  what can be. */
  static renameNothingHere(): string {
    return appTexts.text("renameNothingHere")
  }

  ////////////////
  // ## The hover's ⌥ rule
  ////////////////

  /**
   * Does the hover's info show now, in hover `mode`, with ⌥ (Alt) held or not?
   * - `withAlt`:  only while ⌥ is held;  `always`;  `never`.
   */
  static showsHoverInfo(mode: HoverMode, isAltHeld: boolean): boolean {
    return mode === "always" || (mode === "withAlt" && isAltHeld)
  }

  /**
   * Does an error's message show by itself on a hover over its squiggle (Monaco's `ErrorHover`), in hover `mode`?
   * - Not when the full hover shows (`showsHoverInfo()`):  that shows the errors too, with the info.
   * - So in every mode some popup shows the errors on a plain hover.
   */
  static showsErrorsAlone(mode: HoverMode, isAltHeld: boolean): boolean {
    return !CodeEditorFeatures.showsHoverInfo(mode, isAltHeld)
  }

  ////////////////
  // ## Web addresses
  ////////////////

  /**
   * A web address, to its first space, quote or angle bracket:  its end trimmed by `trimmedAddress()`.
   * - Any `http://` or `https://` address, in a comment or anywhere.
   */
  static ADDRESS = /https?:\/\/[^\s"'<>`]+/g

  /** Is this a Mac?  ⌘ opens an address there;  Ctrl elsewhere. */
  static IS_MAC = typeof navigator !== "undefined" && /mac/i.test(navigator.platform || navigator.userAgent)

  /** Is the key that opens an address held, as of `event`:  ⌘ on a Mac, else Ctrl? */
  static isOpenKey(event: MouseEvent | KeyboardEvent): boolean {
    return CodeEditorFeatures.IS_MAC ? event.metaKey : event.ctrlKey
  }

  /** The tip on a plain hover over an address:  "⌘-click to open", "Ctrl-click to open" off a Mac. */
  static linkTip(): string {
    return appTexts.text(CodeEditorFeatures.IS_MAC ? "codeLinkTipMac" : "codeLinkTip")
  }

  /** Every address in `line`, the text of one line, where each is in it. */
  static addressesIn(line: string): AddressAt[] {
    return [...line.matchAll(CodeEditorFeatures.ADDRESS)].map((match) => {
      const url = CodeEditorFeatures.trimmedAddress(match[0])
      return { url, start: match.index, end: match.index + url.length }
    })
  }

  /** The address in `line` at `offset`, if there's one there:  its end counts, as a caret just after it. */
  static addressAt(line: string, offset: number): AddressAt | undefined {
    return CodeEditorFeatures.addressesIn(line).find(({ start, end }) => offset >= start && offset <= end)
  }

  /**
   * `address` without what ends the sentence or the brackets around it:  a final `.`, `,` ... and each `)` it never
   * opened, `[wikipedia](https://x.org/a_(b))` => `https://x.org/a_(b)`.
   * - A `(` ... `)` inside it is its own (`Klondike_(solitaire)`).
   */
  static trimmedAddress(address: string): string {
    let url = address.replace(TRAILING_PUNCTUATION, "")
    const count = (text: string, char: string) => text.split(char).length - 1
    while (url.endsWith(")") && count(url, ")") > count(url, "("))
      url = url.slice(0, -1).replace(TRAILING_PUNCTUATION, "")
    return url
  }

  ////////////////
  // ## Heading comments
  ////////////////

  /**
   * A heading line:  its indent, then its `#`s.
   * - The same rule as the tokenizer's `matchComment()`, straight from the text:  no waiting for a parse.
   */
  static HEADING = /^([ \t]*)(#+)/

  /**
   * Deepest level with its own class:  deeper headings share it.
   * - The language service's own (`LSP.SpellLanguageService.MAX_HEADING`), as VS Code's headings are.
   */
  static MAX_HEADING_LEVEL = LSP.SpellLanguageService.MAX_HEADING

  /**
   * The heading comment in `line`, the text of one line, if it is one:  from its first `#` to the line's end.
   * - `level`:  how many `#`s, at most `MAX_HEADING_LEVEL`;  each editor gives it classes
   *   `spell-heading spell-heading-<level>`.
   */
  static headingIn(line: string): HeadingAt | undefined {
    const heading = CodeEditorFeatures.HEADING.exec(line)
    if (!heading) return undefined
    const level = Math.min(heading[2]!.length, CodeEditorFeatures.MAX_HEADING_LEVEL)
    return { level, start: heading[1]!.length, end: line.length }
  }
}

/** What ends a sentence after an address, not part of it. */
const TRAILING_PUNCTUATION = /[.,;:!?]+$/

/** A web address in a line of code, and where it is in the line:  character offsets, 0-based. */
export type AddressAt = {
  /** the address:  `https://en.wikipedia.org/wiki/Klondike_(solitaire)` */
  url: string
  /** where it starts */
  start: number
  /** just after its last character */
  end: number
}

/** A heading comment in a line of code:  `CodeEditorFeatures.headingIn()`. */
export type HeadingAt = {
  /** 1 for `#`, 2 for `##` ... at most `MAX_HEADING_LEVEL` */
  level: number
  /** where its first `#` is */
  start: number
  /** the line's end */
  end: number
}
