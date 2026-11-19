import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { Wording } from "spell/parser/spell/rules/expressions"

/**
 * `outline_specifier_media` rule:  a property that's a sound or a video, and where its file is --
 * `its "card slide" is a sound at "sounds/slide.mp3"`, `its "intro" is a video at "https://..."` (epic `language` P65);
 * Spanish `su "deslizar" es un sonido en "..."`.
 * - The same as `sound "card slide" is at "..."` (`define_media`), the other way round.
 * - Its property is made with its thing (`early`), so its name is found as soon as the page or app is there:
 *   `play sound "card slide"` from anywhere.
 * - Compiles to its starting value, `core.media("sound", "sounds/slide.mp3", "card slide")`:
 *   `DefinePropertyHas` hands it the name (`madeAs()`).
 * - Before the plain `a {type}` rules:  else `a sound` would read as a type of its own, `Sound`.
 */
export class OutlineSpecifierMedia extends P.Sequence<"kind|path"> {
  @proto static alias = "outline_specifier"

  /** A sound, or a video:  the core's `MediaKind`. */
  getDatatype(match: P.MatchFor<this>): P.Datatype | undefined {
    return Wording.meaningOf(match.groups.kind)
  }

  /** Its starting value, unnamed:  `madeAs()` names it. */
  getAST(match: P.MatchFor<this>): P.ASTExpression {
    return OutlineSpecifierMedia.made(match, match.groups.kind, P.asAST<P.ASTExpression>(match.groups.path.AST))
  }

  /** Its starting value, `core.media("sound", "sounds/slide.mp3", "card slide")`, named `name`. */
  static madeAs(match: P.MatchFor<OutlineSpecifierMedia>, name: string): P.ASTExpression {
    const path = P.asAST<P.ASTExpression>(match.groups.path.AST)
    return OutlineSpecifierMedia.made(match, match.groups.kind, path, name)
  }

  /**
   * `core.media(kind, path, name)`:  what a sound or video named on a page or app starts as.
   * - Shared by its three ways of being named:  this, `define_media`, and a drawing's `<sound "x" source="..." />`.
   * - `kind`:  a `media_kind` match, or its meaning;  `path`:  where its file is, `""` if nothing says.
   */
  static made(at: P.Match, kind: P.Match | string, path: P.ASTExpression | undefined, name?: string): P.ASTExpression {
    const text = (value: string) => new P.ASTStringLiteral(at, { value: JSON.stringify(value) })
    const args: P.ASTExpression[] = [
      text(typeof kind === "string" ? kind : `${Wording.meaningOf(kind)}`),
      path ?? text("")
    ]
    if (name !== undefined) args.push(text(name))
    return new P.ASTCoreMethodInvocation(at, { methodName: "media", args })
  }
}
