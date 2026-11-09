import { P } from "spell/parser/parser"
import { declaredPrefix } from "spell/parser/spell/rules/rules.types"
import { MemberWords } from "./MemberWords"

/**
 * `declared_member_words` rule:  the longest run of words naming a property
 * some type in reach declares (epic `data` P32), e.g. `short name` in `short name "foo"`, `suit` in `suit hearts`.
 * - As `member_words`, but it stops where the declared name does:
 *   so a value can follow it with no `=` or `is`, `a new card with suit hearts`, `every favourite with name "blah"`.
 * - Any type's:  what it names is known only after, when the rule holding it checks the type it's about.
 * - Nothing declared by those words:  no match.
 */
export class DeclaredMemberWords extends MemberWords {
  parse(scope: P.Scope, tokens: P.Token[]) {
    const words = super.parse(scope, tokens)
    if (!words) return undefined
    const count = declaredPrefix(words, (said) => DeclaredMemberWords.isDeclared(scope, said))
    if (!count) return undefined
    return count < words.length ? super.parse(scope, tokens.slice(0, count)) : words
  }

  /** Does a type in `scope` have a property called `words`, e.g. `short name`? */
  static isDeclared(scope: P.Scope, words: string): boolean {
    for (let types = scope.types; types; types = types.parent) {
      for (const type of types.get()) {
        if (type instanceof P.TypeScope && type.hasProperty(words)) return true
      }
    }
    return false
  }
}
