import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
import { Priority } from "spell/parser/spell/rules/rules.types"
import { Wording } from "spell/parser/spell/rules/expressions"
// Import directly to avoid circular import
import { SpellStatement } from "spell/parser/spell/rules/Statement"
import { On } from "./On"

/**
 * `when_uploading` rule:  in a view's outline, before its `<ui-uploader>` posts what was picked or dropped
 * (epic `language` P67, r32;  the words OK'd in epic `from-console` Q14).
 *
 * ```spell
 * a "photo box" is a view where:
 * 	when uploading:
 * 		cancel uploading if it is full
 * ```
 * - It hears the uploader's `ui-uploading`, carried to the program by the page (app's `SpellElement`) as `uploading`:
 *   `onUploading(event)`, the same method in every language.
 * - `cancel uploading` inside it cancels the page's event too, so nothing is posted (core's `SentEvent.cancel()`).
 * - English's `when uploading:` is `on uploading:` too, as any event of that name;  Spanish says `al subir:`.
 */
export class WhenUploading extends On {
  @proto static priority = Priority.specific

  /** Always `uploading`, whatever the language's words. */
  ownEventName(_match: P.MatchFor<On>): string {
    return "uploading"
  }
}

/**
 * `file_upload_handler` rule:  in a view's outline, after its `<ui-uploader>` posts each file, or fails to
 * (epic `language` P67, r32;  OK'd in epic `from-console` Q14).
 *
 * ```spell
 * a "photo box" is a view where:
 * 	when a file is uploaded:
 * 		print the file's name
 * 	when a file fails to upload:
 * 		print "try again"
 * ```
 * - Once per file, with `the file`, the browser's own (`File`).
 * - Compiles to `whenFileUploaded(file)`, `whenFileFailsToUpload(file)`:  the page hands the file in by place,
 *   as it does a drag line's thing, so Spanish's `el archivo` is the same file
 *   (`cuando un archivo se sube:`, `cuando un archivo no se puede subir:`).
 * - Only in a view's outline:  `it` / `its` are the view.
 */
export class FileUploadHandler extends SpellStatement<"moment|body?"> {
  @proto static priority = Priority.specific
  @proto static alias = "statement"
  /** What happens to an upload:  the editor lists it with its type's events. */
  @proto static isEvent = true
  declare isEvent: boolean

  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    if (!P.SubjectScope.of(scope)?.subjectType) return undefined
    return super.parse(scope, tokens)
  }

  /** The body's scope:  `the file`, in the language's own word, and `it` / `its` the view. */
  getNestedScopeForMatch(match: P.MatchFor<this>): P.MethodScope {
    const view = P.SubjectScope.of(match.scope)!.subjectType!
    return new P.MethodScope({
      parentScope: match.scope,
      thisVar: view.instanceName,
      mapItTo: "this",
      itDatatype: SP.typeName(view.name),
      args: [new P.ScopeVariable({ name: FileUploadHandler.fileWordOf(match), datatype: "File" })],
      declaredBy: match
    })
  }

  getAST(match: P.MatchFor<this>): P.ASTPropertyDefinition {
    const arg = new P.ASTVariableExpression(match, { name: FileUploadHandler.fileWordOf(match), datatype: "File" })
    return new P.ASTPropertyDefinition(match, {
      type: P.SubjectScope.of(match.scope)!.subject,
      property: FileUploadHandler.methodName(match),
      method: new P.ASTMethodDefinition(match, {
        args: [arg],
        body: P.matchAST<P.ASTStatementBlock | P.ASTStatement | P.ASTExpression>(this.getBody(match))
      })
    })
  }

  /** `whenFileUploaded` or `whenFileFailsToUpload`, the method the page calls. */
  static methodName(match: P.MatchFor<FileUploadHandler>): string {
    return Wording.meaningOf(match.groups.moment) === "uploaded" ? "whenFileUploaded" : "whenFileFailsToUpload"
  }

  /** The language's word for a file, `file` or `archivo` (`LanguageWords.desktopFileWords`). */
  private static fileWordOf(match: P.Match): string {
    const words = SP.Language.of(match.scope).words.desktopFileWords
    return Object.keys(words).find((word) => words[word] === "File") ?? "file"
  }
}

/** What happens to an uploaded file:  `upload_moment`'s meanings. */
export const UPLOAD_MOMENTS = ["uploaded", "fails_to_upload"]
