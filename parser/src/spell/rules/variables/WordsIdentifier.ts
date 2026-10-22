import { NONE } from "spell-kit/util"
import { P } from "spell-lang/parser"
import { SP } from "spell-lang/spell"
import { longestNameIn, namesWithGrammarWords } from "spell-lang/spell/rules/rules.types"
import { SpellType } from "spell-lang/spell/rules/types"
import { SpellIdentifier } from "./SpellIdentifier"

/** Most words a name may have:  `cards still to move` would be 4. */
const MAX_WORDS = 4

/**
 * `words_identifier` rule:  a variable's name of several words, e.g. `start pile` (epic page `outline-spell`, P26).
 * - The same variable as its dashed name:  `start pile` and `start-pile` are both `start_pile`, `startPile` compiled.
 * - 2 to 4 plain words, up to a structural one (`to`, `of`, `is` ...):  `set start pile to ...` names `start pile`.
 *   - So a name with one is declared with dashes:  `set cards-to-move to ...`.
 * - The longest run of words a variable in scope goes by, else the whole run:
 *   `variable` declares the whole run (`set test card to ...`), `known_variable` reads a known one.
 * - A known one may hold a structural word, read whole, longest first (epic `spanish` P14):
 *   `print way to go`, after `set way-to-go to 3`.  See `declaredWithGrammarWords()`.
 */
export class WordsIdentifier extends SpellIdentifier {
  /** Quick test:  two words, at least. */
  test(scope: P.Scope, tokens: P.Token[], start = 0) {
    if (!super.test(scope, tokens, start)) return false
    return super.test(scope, tokens, start + 1) || WordsIdentifier.declaredWithGrammarWords(scope, tokens, start) > 0
  }

  /** The words, as one name -- see the class docstring. */
  parse(scope: P.Scope, tokens: P.Token[]) {
    let run = 0
    while (run < MAX_WORDS && super.test(scope, tokens, run)) run++
    const withGrammarWords = run ? WordsIdentifier.declaredWithGrammarWords(scope, tokens) : 0
    if (run < 2 && !withGrammarWords) return undefined
    const nameOf = (count: number) => this.mapValue<string>(WordsIdentifier.wordsOf(tokens, count))
    let length = withGrammarWords || run
    for (let count = run; !withGrammarWords && count >= 2; count--) {
      if (scope.variables?.get(nameOf(count))) {
        length = count
        break
      }
    }
    const taken = tokens.slice(0, length)
    const raw = WordsIdentifier.wordsOf(tokens, length)
    const match: P.MatchFor<this> = new P.Match({
      rule: this,
      matched: taken,
      raw,
      value: nameOf(length),
      tokens: taken,
      scope
    })
    match.data.scopeVar = scope.variables?.get(match.value) ?? NONE
    return match
  }

  /**
   * How many of `tokens`, from `start`, name a variable in scope with a blacklisted word in its name, the longest
   * -- 0 for none, e.g. 3 for `way to go to 3`, after `set way-to-go to 3`.
   * - Only a known name, whole:  `namesWithGrammarWords()`.
   *   So a name with one is declared with dashes (`way-to-go`), and read either way.
   */
  static declaredWithGrammarWords(scope: P.Scope, tokens: P.Token[], start = 0): number {
    if (!(tokens[start + 1] instanceof P.WordToken)) return 0
    const { blacklist } = SP.Language.of(scope).words
    const names = namesWithGrammarWords(scope.variables, "variable", wordsOfVariable, (word) => !!blacklist[word])
    if (!names.length) return 0
    return longestNameIn(SpellType.lowerWords(tokens.slice(start), MAX_WORDS), names)
  }

  /** The first `count` of `tokens`' words, a space between each. */
  static wordsOf(tokens: P.Token[], count: number): string {
    return tokens
      .slice(0, count)
      .map((token) => `${token.value}`)
      .join(" ")
  }
}

/** A variable's words, from its name, e.g. `way_to_go` => `["way", "to", "go"]`. */
function wordsOfVariable(variable: P.ScopeVariable): string[] {
  return `${variable.name}`.split("_")
}
