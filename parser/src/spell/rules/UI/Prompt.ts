import { proto } from "spell/util"
import { P } from "spell/parser/parser"
// Import directly to avoid circular import
import { SpellStatement } from "spell/parser/spell/rules/Statement"
// Through the folder:  read only when parsing, once the folder has loaded
import { AssignmentStatement } from "spell/parser/spell/rules/assignment"

/**
 * `prompt` rule:  ask the person for some text, in a dialog, with `message` and its starting text, `defaultValue`.
 * - e.g. `prompt "Name for the new baby?"`, then `if the result is ok, set the name of the baby to it`
 * - HyperTalk's way (epic `language` P64):
 *   - `it` is the text typed:  a NEW `it`, as `get` makes, so later lines read it
 *     (`AssignmentStatement.declareIt()`:  plain `it`, then `it_2` ...);  empty text when they cancel
 *   - `the result` is the button that closed it:  `ok` or `cancel` (`core.result()`)
 * - Its message is Markdown, as `alert`'s is:  `prompt "Your **name**?"`.
 * - Compiles to `const it = await core.prompt("Name?")`.
 * - TODO: `as number`, `as date`, etc?
 */
export class Prompt extends SpellStatement<"message|defaultValue?", PromptMatchData> {
  @proto static alias = "statement"
  @proto static changesScope: P.ScopeChanges = "internal"

  /** Declare the new `it` the typed text goes in -- see `AssignmentStatement.declareIt()`. */
  mutateScope(match: P.MatchFor<this>) {
    // `match.scope` is typed as `P.Scope`, whose `.variables` getter can be `undefined` -- we know it's a block.
    match.data.itVar = AssignmentStatement.declareIt(match.scope as P.BlockScope, match, "text")
  }

  /** `const it = await core.prompt(message, defaultValue)`. */
  getAST(match: P.MatchFor<this>) {
    const { message, defaultValue } = match.groups
    const args: P.ASTExpression[] = [P.asAST<P.ASTExpression>(message.AST)]
    if (defaultValue) args.push(P.asAST<P.ASTExpression>(defaultValue.AST))
    const call = new P.ASTCoreMethodInvocation(match, { methodName: "prompt", args })
    return new P.ASTAssignmentStatement(match, {
      thing: new P.ASTVariableExpression(match, { name: match.data.itVar?.output ?? "it" }),
      value: call,
      isNewVariable: true
    })
  }
}

/** What `prompt` stashes on its match. */
type PromptMatchData = {
  /** The NEW `it` the typed text goes in -- see `AssignmentStatement.declareIt()`. */
  itVar?: P.ScopeVariable
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
