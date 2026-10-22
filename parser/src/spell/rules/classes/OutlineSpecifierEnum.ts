import { proto } from "spell-kit/util"
import { P } from "spell-lang/parser"
import { Wording } from "spell-lang/spell/rules/expressions"
import { TypeSpecifierEnum } from "./TypeSpecifierEnum"

/**
 * `outline_specifier_enum` rule:  the `type_specifier`s again, without their `as`,
 * for an outline body's `its "suit" is ...`:
 * - `one of clubs, diamonds` / `either up or down` -- `outline_specifier_enum`
 * - `a number`, `an automobile` -- `outline_specifier_datatype`
 * - `yes or no` -- `outline_specifier_yes_or_no`
 * - Their own alias, `outline_specifier`, so `a card has a suit one of ...` (no `as`) stays an error.
 */
export class OutlineSpecifierEnum extends TypeSpecifierEnum {
  @proto static alias = "outline_specifier"

  /**
   * Without `either` / `one of`, two or more values joined by `or`, e.g. `up or down` (epic page Q4's comparison):
   * one value alone, `its "x" is total`, stays a getter.
   * - Its `either` / `one of` said:  any words before its list.
   * - `or` is the language's own:  the `and_or` word rule's word meaning `or`.
   */
  parse(scope: P.Scope, tokens: P.Token[]) {
    const match = super.parse(scope, tokens)
    if (!match) return match
    const list = (match.groups as { enumeration: P.Match }).enumeration
    if (list.start !== match.start) return match
    if (list.items.length < 2) return undefined
    return list.tokens.some((token) => Wording.reads(scope, "and_or", `${token.value}`, "or")) ? match : undefined
  }
}
