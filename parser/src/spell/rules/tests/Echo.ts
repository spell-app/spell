import { proto } from "spell-kit/util"
import { P } from "spell-lang/parser"
// Import directly to avoid circular import
import { SpellStatement } from "spell-lang/spell/rules/Statement"
import { tests } from "./tests.parser"

/** `echo` rule:  `echo {expression}` -- print `expression`'s value, e.g. for debugging. */
export class Echo extends SpellStatement<"expression"> {
  @proto static alias = ["statement"]

  getAST(match: P.MatchFor<this>) {
    const { expression } = match.groups
    return new P.ASTEchoInvocation(match, {
      expression: P.asAST<P.ASTExpression>(expression.AST)
    })
  }
}
tests.addRule(Echo, {
  syntax: "echo {expression}",
  tests: [
    {
      tests: [
        [`echo 1`, `core.echo(1)`],
        [`echo "foo"`, `core.echo("foo")`],
        ["echo the rank of a new thing", "core.echo((new Thing()).rank)"]
      ]
    }
  ]
})
