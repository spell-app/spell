import { proto } from "spell/util"
import { P } from "spell/parser/parser"
// Import directly to avoid circular import
import { SpellStatement } from "spell/parser/spell/rules/Statement"
import { Wording } from "spell/parser/spell/rules/expressions"
// Through the folder:  read only when compiling, once the folder has loaded
import { OutlineSpecifierMedia } from "spell/parser/spell/rules/classes"
import { Priority } from "spell/parser/spell/rules/rules.types"
import { noteMediaName } from "./UI.shared"

/**
 * `define_media` rule:  names a sound or a video on a page or the app, and says where its file is --
 * `sound "card slide" is at "sounds/slide.mp3"`, `video "intro" is at "https://..."`, `movie "intro" is at ...`
 * (epic `language` P65);  Spanish `sonido "deslizar" está en "..."`, `vídeo "intro" está en "..."`.
 * - The name becomes a property of the page or app (`its card slide`), made with it (`early`), so
 *   `play sound "card slide"` finds it from anywhere while it's there.
 * - The same as `its "card slide" is a sound at "..."` (`outline_specifier_media`), the other way round.
 * - Only in a type's outline body:  a page's, an app's (`subject_implied`).
 * - Compiles to its property, starting as `core.media("sound", "sounds/slide.mp3", "card slide")`.
 */
export class DefineMedia extends SpellStatement<"type|kind|property|path"> {
  @proto static alias = "statement"
  @proto static priority = Priority.declaration
  @proto static changesScope: P.ScopeChanges = "global"
  @proto static declares: P.DeclaresSpec = { kind: "property", name: "property", of: "type" }

  /** SIDE EFFECT:  declares the property on its type, and notes its name (`noteMediaName()`). */
  mutateScope(match: P.MatchFor<this>) {
    const { scope } = match
    const { type, property } = match.groups
    const typeScope = P.TypeScope.getOrStub(scope, type.value, match)
    typeScope.declareProperty(`${property.value}`, match, {
      asWritten: property.raw,
      datatype: Wording.meaningOf(match.groups.kind)
    })
    noteMediaName(scope, wordsOf(property))
  }

  getAST(match: P.MatchFor<this>) {
    const { type, kind, property, path } = match.groups
    return new P.ASTReactiveProperty(match, {
      type: P.matchAST<P.ASTTypeExpression>(type),
      property: `${property.value}`,
      initializer: OutlineSpecifierMedia.made(match, kind, P.asAST<P.ASTExpression>(path.AST), wordsOf(property)),
      early: true
    })
  }
}

/** A quoted member's words, as written:  `card slide` for `"card slide"`. */
export function wordsOf(property: P.Match): string {
  return `${property.raw ?? property.value}`
}
