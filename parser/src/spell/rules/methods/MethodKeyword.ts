import { proto } from "spell-kit/util"
import { P } from "spell-lang/parser"
import type { MethodArgData } from "./methods.shared"

/**
 * `method_keyword` rule:  one bare word in a method's keyword phrase, e.g. `foo`, `the`, `bar` in `to foo the bar`.
 * - `method`:  the word, its dashes made underscores, for the signature's `methodBits`
 * - `syntax`:  its raw, unmodified text, for the rule's rulex `syntax`
 */
export class MethodKeyword extends P.Pattern<never, MethodArgData> {
  @proto static pattern = P.ALPHANUMERIC_WORD_WITH_DASHES
  @proto static highlightAs: P.HighlightKind = "function"

  /** Convert dashes to underscores so e.g. `at-rest` becomes `at_rest` in the generated method name. */
  mapValue<T = string>(value: string): T {
    return `${value}`.replace(/-/g, "_") as T
  }

  /** Stash this keyword's contribution to the signature (`method`/`syntax` bits) on `match.data`. */
  parse(scope: P.Scope, tokens: P.Token[]) {
    const match = super.parse(scope, tokens) as P.MatchFor<this> | undefined
    if (!match) return undefined
    match.data.keyword = match
    match.data.method = match.value
    match.data.syntax = match.raw
    return match
  }
}
