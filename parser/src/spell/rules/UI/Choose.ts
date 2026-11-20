import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
// Import directly to avoid circular import
import { SpellStatement } from "spell/parser/spell/rules/Statement"
// Through the folder:  read only when parsing, once the folder has loaded
import { AssignmentStatement } from "spell/parser/spell/rules/assignment"
import { EveryThing } from "spell/parser/spell/rules/classes"

/**
 * `choose` rule:  ask the person to pick one thing from a list, in a dialog (epic `language` P66).
 * - e.g. `choose a card from the cards with prompt "Which card?"`, then `if the result is ok, turn it over`
 * - HyperTalk's way, as `prompt`'s (epic `language` P64):
 *   - `it` is the thing picked:  a NEW `it` (`AssignmentStatement.declareIt()`);  nothing when they cancel
 *   - `the result` is the button that closed it:  `ok` or `cancel` (`core.result()`)
 * - What it picks from:
 *   - a list:  `choose a card from the cards`, `choose one of ["easy", "medium", "hard"]`
 *   - a record:  its keys are the rows, and `it` is the value under the key picked
 *   - a kind's own values, with no `from`:  `choose a card suit`
 *   - Spell UI's colors, each drawn as a chip:  `choose a color` (`core.chooseColor()`),
 *     unless the program has a `color` kind of its own
 * - Each row's words:  its title, label or name, else itself as text (`core.titleOfThing()`).
 * - `with prompt "Which card?"`:  the question;  none, "Choose a card", from the words written (`core.choose()`).
 * - `, showing 10 at a time`:  how many rows show before the list scrolls.
 * - Several at once:  `ChooseSeveral`.
 * - Compiles to `const it = await core.choose(cards, { thing: "a card", prompt: "Which card?" })`.
 */
export class Choose extends SpellStatement<
  "article?|one?|type?|arg?|color?|list?|message?|shown?|least?|most?|many?",
  ChooseMatchData
> {
  @proto static alias = "statement"
  @proto static changesScope: P.ScopeChanges = "internal"

  /**
   * `choose a card` alone, a thing type with no values of its own:  refused, saying to name the list.
   * - A kind's values (`choose a card suit`) need no `from`.
   */
  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    const match = super.parse(scope, tokens) as P.MatchFor<this> | undefined
    if (!match) return undefined
    const { type, list } = match.groups
    // only the whole line:  `choose a card` is also how `choose a card from the cards` starts
    if (type && !list && match.length === tokens.length && !EveryThing.kindOf(type)?.valueKind) {
      const thing = wordsOf(type)
      const words = { things: P.pluralize(thing), thing: `${wordsOf(match.groups.article)} ${thing}`.trim() }
      return SpellStatement.refuse(match, SP.Language.of(scope).parserMessage("choose-from-what", words))
    }
    return match
  }

  /** Declare the new `it` the thing picked goes in -- see `AssignmentStatement.declareIt()`. */
  mutateScope(match: P.MatchFor<this>) {
    // `match.scope` is typed as `P.Scope`, whose `.variables` getter can be `undefined` -- we know it's a block.
    match.data.itVar = AssignmentStatement.declareIt(match.scope as P.BlockScope, match, this.itDatatype(match))
  }

  /** `const it = await core.choose(list, options)`, or `core.chooseColor(options)` for Spell UI's colors. */
  getAST(match: P.MatchFor<this>) {
    const { color } = match.groups
    const options = this.optionsAST(match)
    const call = color
      ? new P.ASTCoreMethodInvocation(match, { methodName: "chooseColor", args: [options] })
      : new P.ASTCoreMethodInvocation(match, { methodName: "choose", args: [this.listAST(match), options] })
    return new P.ASTAssignmentStatement(match, {
      thing: new P.ASTVariableExpression(match, { name: match.data.itVar?.output ?? "it" }),
      value: call,
      isNewVariable: true
    })
  }

  /** What's picked from:  the list written, else the kind's own values (`Card.Suits`). */
  protected listAST(match: P.MatchFor<this>): P.ASTExpression {
    const { list, type } = match.groups
    if (list) return P.asAST<P.ASTExpression>(list.AST)
    return EveryThing.kindListAST(match, type!)!
  }

  /**
   * The core's options:  the words written for what's picked, the question, how many rows show;
   * and `ChooseSeveral`'s counts.
   */
  protected optionsAST(match: P.MatchFor<this>): P.ASTObjectLiteral {
    const { message, shown } = match.groups
    const options = new P.ASTObjectLiteral(match)
    for (const [key, words] of Object.entries(this.thingWords(match))) options.addProp(key, text(match, words))
    if (message) options.addProp("prompt", P.asAST<P.ASTExpression>(message.AST))
    if (shown) options.addProp("shown", P.asAST<P.ASTExpression>(shown.AST))
    return options
  }

  /** The words written for what's picked, as written:  `{ thing: "a card" }`, `{ thing: "one" }`. */
  protected thingWords(match: P.MatchFor<this>): Record<string, string> {
    const { article, one, type, arg, color } = match.groups
    if (one) return { thing: wordsOf(one) }
    return { thing: `${wordsOf(article)} ${wordsOf(type ?? arg ?? color)}`.trim() }
  }

  /** What `it` is:  one of the kind, else an item of the list;  text for a color. */
  protected itDatatype(match: P.MatchFor<this>): P.Datatype | undefined {
    const { type, list, color } = match.groups
    if (color) return "text"
    if (type) return SP.typeName(`${type.value}`)
    return list?.datatype ? P.itemTypeOf(list.datatype) : undefined
  }
}

/**
 * `choose_several` rule:  ask the person to pick several things from a list, in a dialog (epic `language` P66, Q74).
 * - e.g. `choose cards from the cards`, `choose many cards from the cards`:  any number, at least one
 * - e.g. `choose up to 2 cards from the cards`:  one or two
 * - e.g. `choose between 2 and 4 cards from the cards`:  two, three or four
 *   (always a count:  no `choose between "Easy" and "Hard"`, which is a record's job)
 * - `it` is a NEW list of what was picked;  the ok button stays off until the count fits.
 * - As `choose` otherwise.
 * - Compiles to `const it = await core.choose(cards, { things: "cards", most: 2 })`.
 */
export class ChooseSeveral extends Choose {
  /** The counts too:  `{ things: "cards", least: 2, most: 4 }`. */
  protected optionsAST(match: P.MatchFor<this>): P.ASTObjectLiteral {
    const { least, most } = match.groups
    const options = super.optionsAST(match)
    if (least) options.addProp("least", P.asAST<P.ASTExpression>(least.AST))
    if (most) options.addProp("most", P.asAST<P.ASTExpression>(most.AST))
    return options
  }

  /** The plural, as written:  `{ things: "cards" }`. */
  protected thingWords(match: P.MatchFor<this>): Record<string, string> {
    const { type, arg } = match.groups
    return { things: wordsOf(type ?? arg) }
  }

  /** A list of what the list holds. */
  protected itDatatype(match: P.MatchFor<this>): P.Datatype | undefined {
    const item = super.itDatatype(match)
    return item ? P.listOf(item) : undefined
  }
}

/** What `choose` stashes on its match. */
type ChooseMatchData = {
  /** The NEW `it` the thing picked goes in -- see `AssignmentStatement.declareIt()`. */
  itVar?: P.ScopeVariable
}

/** The words `match` matched, as written:  `card suit`;  none for no match. */
function wordsOf(match: P.Match | undefined): string {
  return match?.inputText.trim() ?? ""
}

/** `words` as a string literal, for `match`. */
function text(match: P.Match, words: string): P.ASTStringLiteral {
  return new P.ASTStringLiteral(match, { value: words, quote: '"' })
}
