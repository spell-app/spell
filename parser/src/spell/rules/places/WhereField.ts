import { proto, upperFirst } from "spell/util"
import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
import { Wording } from "spell/parser/spell/rules/expressions"
import { isItemScope } from "spell/parser/spell/rules/lists/lists.shared"
// Import directly to avoid circular import
import { ItsProperty } from "spell/parser/spell/rules/properties/ItsProperty"

/**
 * `where_field` rule:  a field of the thing a `where` is looking at, by its name alone (epic `data` T66).
 * - e.g. the end of `recipes where they are the cook`:  `its cook`, in the words that sentence wants
 * - Only after `they are`, the one place it's read:  see `TheyAre`.
 * - Always the thing's own:  a program's own `cook` stays `the cook` everywhere else, as in `where the cook is them`.
 * - A field the thing doesn't have is an error, saying so:  it would otherwise be nobody's.
 *   - A list of something we can't name can't be checked, as `its cook` can't.
 * - `the cook of it` isn't ours:  that's the long form, read as it always was.
 * - Compiles as `its cook` does, to `recipe.cook`.
 */
export class WhereField extends ItsProperty {
  /** Never an expression of its own:  `where the cook is them` is the program's `cook`. */
  @proto static alias: string | string[] = []

  /** Quick test:  only in a `where`. */
  test(scope: P.Scope, tokens: P.Token[], start = 0) {
    return isItemScope(scope) && super.test(scope, tokens, start)
  }

  /** The thing's field, not one of something else;  and an error about one it hasn't got. */
  parse(scope: P.Scope, tokens: P.Token[]) {
    const match = super.parse(scope, tokens)
    if (!match || Wording.lengthAt(scope, "receiver_of", tokens, match.length)) return undefined
    const { property } = match.groups
    const item = scope.getType((scope as P.MethodScope).itDatatype)
    const message = () =>
      SP.Language.of(scope).parserMessage("where-field-unknown", {
        AType: upperFirst(SP.SpellWarnings.exampleNoun(scope, item!)),
        field: `${property.raw}`.trim()
      })
    SP.SpellWarnings.refuseIf(match, message, () => !!item && !item.getMember(`${property.value}`))
    return match
  }
}
