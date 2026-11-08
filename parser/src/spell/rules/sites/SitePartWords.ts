import { P } from "spell/parser/parser"
import { Wording } from "spell/parser/spell/rules/expressions"
// Import directly to avoid circular import
import { MemberWords } from "spell/parser/spell/rules/properties/MemberWords"

/**
 * `site_part_words` rule:  the words naming one of a site's parts, `of` (Spanish's `de`) included (epic `mockup` P3, T5).
 * - e.g. Spanish's `página de película` in `- tiene una página de película en "/peliculas/:película"`,
 *   `diálogo de ajustes` in `- tiene un diálogo de ajustes`, `ir a la página de película para esta película`
 * - A member's words (`member_words`) end at `de`, so a Spanish part named with one needed quotes before;
 *   here `of` / `de` joins two words, and the words end where the line goes on:  `at` / `en`, `for` / `para`,
 *   `with` / `con`, a text, or the line's end.
 * - Only between two words:  `de la` ends it, as the article is no word of a name.
 * - Its match is a member's:  `raw` the words as written, `value` joined by `_`.
 */
export class SitePartWords extends MemberWords {
  /** Member words, joined by the language's `of` -- see the class. */
  parse(scope: P.Scope, tokens: P.Token[]) {
    const first = super.parse(scope, tokens)
    if (!first) return undefined
    let count = first.matched.length
    for (;;) {
      const joiner = tokens[count]
      if (!(joiner instanceof P.WordToken) || !Wording.reads(scope, "receiver_of", `${joiner.value}`)) break
      const more = super.parse(scope, tokens.slice(count + 1))
      if (!more) break
      count += 1 + more.matched.length
    }
    if (count === first.matched.length) return first
    const words = tokens.slice(0, count)
    return new P.Match({
      rule: this,
      matched: words,
      raw: words.map((token) => token.value).join(" "),
      value: words.map((token) => `${token.value}`.replace(/-/g, "_")).join("_"),
      tokens: words,
      scope
    })
  }
}
