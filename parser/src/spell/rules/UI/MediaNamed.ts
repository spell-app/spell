import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
import { Wording } from "spell/parser/spell/rules/expressions"
// Import directly to avoid circular import
import { SpellExpression } from "spell/parser/spell/rules/expressions/SpellExpression"
import { hasMediaNamed } from "./UI.shared"

/**
 * `media_named` rule:  a sound or a video the program named, by its name (epic `language` P65).
 * - e.g. `sound "card slide"`, `the "card slide" sound`, `video "intro"`, `the intro video`, `movie "intro"`;
 *   Spanish `el sonido "deslizar"`, `el vídeo "intro"`, `la película "intro"`
 * - Named on a page or the app:  `sound "card slide" is at "..."`, `<video "intro" source="..." />`.
 * - Without quotes only when the words are one of the names (`media_name_words`):  a name starting with a type's
 *   word, `card`, needs them.
 * - Compiles to `core.mediaNamed("card slide", "sound")`, which finds it while its page or app is there.
 * - A quoted name the program never gives is refused once it has parsed (`unknown-media`).
 * - The longest reading wins:  `the card slide sound` is the sound, not the page's `card slide` property, then `sound`.
 */
export class MediaNamed extends SpellExpression<"kind|name"> {
  /** SIDE EFFECT:  a quoted name nobody gives is refused, once the whole program has parsed. */
  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    const match = super.parse(scope, tokens) as P.MatchFor<this> | undefined
    if (!match) return undefined
    const { name } = match.groups
    const said = MediaNamed.wordsOf(name)
    if (said === undefined) return match
    const message = () => SP.Language.of(scope).parserMessage("unknown-media", { name: said })
    SP.SpellWarnings.refuseIf(match, message, () => !hasMediaNamed(scope, said))
    return match
  }

  getAST(match: P.MatchFor<this>) {
    const { name, kind } = match.groups
    const kindText = new P.ASTStringLiteral(match, { value: `${Wording.meaningOf(kind)}`, quote: '"' })
    return new P.ASTCoreMethodInvocation(match, {
      methodName: "mediaNamed",
      args: [MediaNamed.nameAST(name), kindText]
    })
  }

  /** The name, as code says it:  the text as written (its fill-ins too), or the bare words, quoted. */
  static nameAST(name: P.Match): P.ASTExpression {
    if (name.rule.name === "media_name_words") {
      return new P.ASTStringLiteral(name, { value: JSON.stringify(`${name.value}`) })
    }
    return P.asAST<P.ASTExpression>(name.AST)
  }

  /**
   * The name's words, when they're written out:  `card slide` for `"card slide"` or bare `card slide`.
   * - `undefined` for a text with fill-ins (`"[its name] sound"`):  known only when it runs.
   */
  static wordsOf(name: P.Match): string | undefined {
    if (name.rule.name === "media_name_words") return `${name.value}`
    const raw = `${name.raw ?? ""}`.trim()
    if (raw.includes("[")) return undefined
    return raw.replace(/^["'`]|["'`]$/g, "")
  }

  /** What it names, as the core's `MediaKind`:  `sound` or `video`. */
  static kindOf(match: P.MatchFor<MediaNamed>): string {
    return `${Wording.meaningOf(match.groups.kind)}`
  }
}
