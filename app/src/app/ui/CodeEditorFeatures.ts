import type { CodeAction, Hover, Position, Range } from "vscode-languageserver"

import type { SP } from "spell/parser/spell"
import type { LSP } from "spell/app/lsp"
import { codeHover } from "spell/app/app/ui/codePopups"

/****************
 * ### `CodeEditorFeatures`
 * What the app's code editors decide alike about the language service's answers, whichever editor shows them:
 * the app's Monaco (`SpellLanguageFeatures`) and the CodeMirror test page (`CodeMirrorLanguage`;  epic `codemirror` P1).
 * - Only what's the EDITOR's to decide, not the program's (that's the language service's) nor its words (`AppTexts`):
 *   how much a hover says, which code actions a menu offers.
 * - Plain functions of the service's answers, no editor:  each editor turns them into its own shapes.
 * - More of each editor's features come here as they're lifted out of Monaco (epic `codemirror` P5).
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
}
