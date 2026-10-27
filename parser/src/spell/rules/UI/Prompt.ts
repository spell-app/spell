import { proto } from "spell/util"
import { P } from "spell/parser/parser"
// Import directly to avoid circular import
import { SpellStatement } from "spell/parser/spell/rules/Statement"

/**
 * `prompt` rule:  prompt user to specify a value in response to `message` with `defaultValue`.
 * - e.g. `prompt "Name for the new baby?"`
 * - Returns a promise which `resolve()`s if they "OK", `reject()`s if they "cancel".
 * - TODO: `as number`, `as date`, etc?
 * - NOTE: we'll `await` the promise!
 * - TODO: `the result = await ...` ?
 */
export class Prompt extends SpellStatement<"message|defaultValue?"> {
  @proto static alias = "statement"

  getAST(match: P.MatchFor<this>) {
    const { message, defaultValue } = match.groups
    const args: P.ASTExpression[] = [P.asAST<P.ASTExpression>(message.AST)]
    if (defaultValue) args.push(P.asAST<P.ASTExpression>(defaultValue.AST))
    return new P.ASTAwaitExpression(match, {
      expression: new P.ASTCoreMethodInvocation(match, {
        methodName: "prompt",
        args
      })
    })
  }
}

// Chose one or more items from `collection` (of strings???)
// Returns a promise which `resolve()`s if they "OK" with a value, `reject()`s if they "cancel".
// TODO
//     {
//       name: "choose_one",
//       alias: "statement",
//       syntax: "choose ((a|an)? {singular_identifier} (from|of)|one of) {collection:expression} with (prompt|message)? {message:expression}",
//          => `await core.chooseOne(message, list, defaultValue)`
//     },

// Chose one or more items from `collection` (of strings???)
// Returns a promise which `resolve()`s if they "OK" with a value, `reject()`s if they "cancel".
// TODO
//     {
//       name: "choose_multiple",
//       alias: "statement",
//       syntax: "choose multiple {plural_identifier} (of|from) {collection:expression} with (prompt|message)? {message:expression}",
//          => `await core.chooseMultiple(message, list, defaultValues)`
//     }
