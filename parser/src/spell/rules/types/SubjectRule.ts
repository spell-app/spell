import { proto } from "spell-kit/util"
import { P } from "spell-lang/parser"
import { SpellType } from "./SpellType"

/**
 * `it` in an outline-style type's body:  the type the body is about,
 * e.g. `Card` in `- it has a deck` under `a card is a thing where:`.
 * - SEE:  `P.SubjectScope`.
 * - A `SpellType` match, so a rule takes it where it takes `a card`, e.g. `{type:subject_it} has ...`:
 *   - `value` is the type's name, e.g. `Card`;  `data.scopeType` its `TypeScope`
 *   - `raw` is the type's instance name, e.g. `card`, NOT `it`:  rules read `raw` as the type's words,
 *     e.g. `quoted_type_expression` for its signature's `instanceType`
 * - Fails anywhere else, including inside a method or getter in the body, where `it` is the instance.
 * - Its WORD is its registered `syntax`, so each language says its own (epic `spanish` P3):
 *   - English:  `subject_it` is `it/i`, `subject_its` (for a property, `its "suit" is ...`) is `its/i`
 *   - Spanish:  `subject_its` is `(su|sus)/i`;  it leaves the subject out, `subject_implied`
 * - Code that meets a person's word outside a parse asks `SubjectRule.reads()`, never `word === "it"`.
 */
export class SubjectRule extends SpellType {
  /** Editors colour it as they colour `it` anywhere:  a variable. */
  @proto static highlightAs?: P.HighlightKind = "variable"

  /**
   * The word we match, compiled from our registered `syntax`, e.g. a `Keyword` for `it/i`.
   * - `undefined` for a rule registered without one:  it matches no word, e.g. `subject_implied`.
   */
  declare wordRule: P.Rule | undefined

  /**
   * Our `syntax` is our WORD, not our structure:  we stay a `SpellType`, and keep the word to match it with.
   * - A clone keeps its original's `wordRule`.
   */
  protected initFromSyntax(syntax: string) {
    this.wordRule ??= P.Rule.compileSyntax(syntax, this)
  }

  /** Is the token at `start` our word, e.g. `it`? */
  test(scope: P.Scope, tokens: P.Token[], start = 0) {
    const token = tokens[start]
    return token instanceof P.WordToken && !!this.wordRule?.parse(scope, [token])
  }

  parse(scope: P.Scope, tokens: P.Token[]) {
    const [token] = tokens
    if (!token || !this.test(scope, tokens)) return undefined
    const scopeType = P.SubjectScope.of(scope)?.subjectType
    if (!scopeType) return undefined
    const match: P.MatchFor<this> = new P.Match({
      rule: this,
      matched: [token],
      raw: scopeType.instanceName,
      value: scopeType.name,
      tokens: [token],
      scope
    })
    match.data.scopeType = scopeType
    return match
  }

  /** A declaration names the type, e.g. `card`, not `it`. */
  declaredText(match: P.Match): string {
    return `${match.raw}`
  }

  /**
   * Is `token` the word subject rule `ruleName` reads, e.g. `it` for `subject_it` -- anywhere, in a type's body or not?
   * - For code that looks ahead at a person's own words, e.g. `- it has a deck` written outside a type's body.
   * - `false` if the scope's parser has no such rule.
   */
  static reads(scope: P.Scope, ruleName: SubjectRuleName, token: P.Token | undefined): boolean {
    const rule = scope.parser?.rules[ruleName]
    return !!token && !!rule?.test(scope, [token])
  }
}

/** The subject rules with a word of their own -- see `SubjectRule.reads()`. */
export type SubjectRuleName = "subject_it" | "subject_its"
