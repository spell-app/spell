import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
import { Synonyms } from "spell/parser/spell/rules/expressions"
import { SpellIdentifier } from "spell/parser/spell/rules/variables"

/** Most words an event's name may have, linking words included. */
const MAX_WORDS = 4

/**
 * `event_words` rule:  an event's name of several words, e.g. `card click` (epic page `outline-spell`, P26).
 * - The same event as its dashed name:  `on card click` hears `fire event card-click`, and the other way round.
 * - 2 to 4 plain words, up to a structural one, e.g. `with` in `on card click with a card`.
 * - A LINKING word may sit between two plain ones (word rule `event_name_link`, epic `spanish` I11):
 *   Spanish's `al clic en carta con una carta` is event `clic-en-carta`, its name ending at `con`.
 *   - English's names take `on` as a plain word already (`card click on table`):  its list is just that.
 * - One word stays a `keyword`, as `on start` always was.
 * - A one-line event with no colon (epic `debut` P27, Q47):  `on drag cancelled show "Not there"`.
 *   The name is then the FEWEST words whose rest reads as a whole statement, `drag cancelled`;
 *   none does:  the most words, as with a colon.
 */
export class EventWords extends SpellIdentifier {
  /** Quick test:  two words, at least -- or a word, a linking word and a word. */
  test(scope: P.Scope, tokens: P.Token[], start = 0) {
    return super.test(scope, tokens, start) && this.wordLengthAt(scope, tokens, start + 1) > 0
  }

  /** The words, dashed:  `card click` is `card-click`, as a one-word event name is written. */
  parse(scope: P.Scope, tokens: P.Token[]) {
    if (!super.test(scope, tokens, 0)) return undefined
    // where the name could end, after each word
    const ends: number[] = [1]
    let length = 1
    while (length < MAX_WORDS) {
      const next = this.wordLengthAt(scope, tokens, length)
      if (!next || length + next > MAX_WORDS) break
      length += next
      ends.push(length)
    }
    if (ends.length < 2) return undefined
    length = this.oneLineEnd(scope, tokens, ends.slice(1)) ?? length
    const taken = tokens.slice(0, length)
    const name = taken.map((token) => `${token.value}`).join("-")
    return new P.Match({ rule: this, matched: taken, raw: name, value: name, tokens: taken, scope })
  }

  /**
   * Where a one-line event's name ends, `on double click play it`:  the first of `ends` whose rest is a whole
   * statement -- `undefined` for a line with a colon, or none.
   */
  protected oneLineEnd(scope: P.Scope, tokens: P.Token[], ends: number[]): number | undefined {
    if (tokens.some((token) => token.value === ":")) return undefined
    const statement = scope.getRuleOrDie("statement")
    // read as a handler's body is:  in a template's outline, `it` / `its` are the thing
    const subject = P.SubjectScope.of(scope)?.subjectType
    const bodyScope = new P.MethodScope({
      parentScope: scope,
      args: [{ name: "event" }],
      ...(subject && { thisVar: subject.instanceName, mapItTo: "this", itDatatype: SP.typeName(subject.name) })
    })
    for (const end of ends) {
      const rest = tokens.slice(end)
      if (!rest.length) return undefined
      const match = statement.parse(bodyScope, rest)
      if (match && match.length === rest.length && !SP.Block.getParseErrors(match)?.length) return end
    }
    return undefined
  }

  /**
   * How many tokens the name's next word takes at `start`:
   * 1 for a plain word, 2 for a linking word and the plain word after it (`en carta`), 0 where the name ends.
   */
  protected wordLengthAt(scope: P.Scope, tokens: P.Token[], start: number): number {
    if (start >= tokens.length) return 0
    if (super.test(scope, tokens, start)) return 1
    const link = Synonyms.matchAt(scope, "event_name_link", tokens, start)
    return link?.length === 1 && start + 1 < tokens.length && super.test(scope, tokens, start + 1) ? 2 : 0
  }
}
