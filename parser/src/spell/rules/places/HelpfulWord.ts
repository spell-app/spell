import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
import { Priority } from "spell/parser/spell/rules/rules.types"
import { SpellStatement } from "spell/parser/spell/rules/Statement"

/**
 * `helpful_word` rule:  a line starting with a word people bring from elsewhere, which Spell doesn't use for data:
 * it says what to write instead (epic `data` P11).
 * - e.g. `fetch the recipes`, `query the cookbook`, `connect to the database`, `join recipes and cooks`
 * - `Priority.overridable`, and it reads no further than its words:  anything else that reads the line wins, so a
 *   program's own `to fetch the scores:` keeps its word.
 * - Only says something:  it never compiles.
 */
export class HelpfulWord extends SpellStatement<never> {
  @proto static alias = "statement"
  @proto static priority = Priority.overridable - 1

  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    const match = super.parse(scope, tokens)
    if (!match) return undefined
    const line = new P.Match({ scope, rule: this, matched: tokens, tokens: [...tokens] })
    const word = `${tokens[0]?.value}`.toLowerCase()
    return SpellStatement.refuse(line, SP.Language.of(scope).parserMessage("no-such-data-word", { word }))
  }
}
