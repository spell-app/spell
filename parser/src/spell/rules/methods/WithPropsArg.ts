import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import type { MethodArgData } from "./methods.shared"

/**
 * `with_props_arg` rule:  a `with`-prefixed prop list.
 * - e.g. `(with bar and baz = "baz" and bong as text)` in `to foo (with bar and baz = "baz" and bong as text)`
 * - Only aliases `method_arg`, not `simple_method_arg`:  a `with_props_arg` can't nest inside another one.
 * - Each comma/`and`-separated item is itself a `simple_method_arg`:
 *   `var_method_arg`, `valued_var_method_arg` or `typed_method_arg`.
 *   Their individual `arg`s become the destructured `props` variables.
 * - `method` is `undefined`:  prop names don't appear in the generated method name.
 * - `syntax` always contributes an OPTIONAL trailing `(with {props:object_literal_properties})?`:
 *   - its first word the one the definition says, e.g. `(con {props:...})?` in Spanish
 *   - so calling without `with ...` is valid, and the generated `props` param defaults to `{}`
 * - `arg` is a single synthetic `props` argument (defaulting to `{}`):
 *   `MethodDefinition.getPropsAssignment()` destructures `props` back out into the individual prop variables,
 *   at the top of the method body.
 * - `match.data.props` (an array of `P.ASTVariableExpression`) is also what the `on` rule (`On`)
 *   reads directly off a matched `{props:with_props_arg}` group -- see `On.getNestedScopeForMatch()` / `getAST()`.
 */
export class WithPropsArg extends P.Sequence<never, MethodArgData> {
  @proto static alias = ["method_arg"]

  /** Map each comma/`and`-joined item's `arg` into `props`, and build the synthetic `props` catch-all arg. */
  parse(scope: P.Scope, tokens: P.Token[]) {
    const match = super.parse(scope, tokens) as P.MatchFor<this> | undefined
    if (!match) return undefined
    const { items } = match.matched[1] as P.Match
    const props = items.map((item) => (item.data as MethodArgData).arg) as P.ASTVariableExpression[]
    match.data.items = items
    match.data.method = undefined // not part of method signature
    // the call says the word the definition was written with:  `with` in English, `con` in Spanish
    match.data.syntax = `(${`${match.tokens[0]!.value}`.toLowerCase()} {props:object_literal_properties})?`
    match.data.props = props
    match.data.arg = new P.ASTVariableExpression(match, {
      name: "props",
      default: new P.ASTObjectLiteral(match),
      type: "argument"
    })
    return match
  }
}
