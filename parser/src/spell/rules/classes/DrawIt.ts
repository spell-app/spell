import { proto } from "spell/util"
import { P } from "spell-parser/parser"
import { SP } from "spell-parser/spell"
import { Priority } from "spell-parser/spell/rules/rules.types"
import { Wording } from "spell-parser/spell/rules/expressions"
import { SubjectRule } from "spell-parser/spell/rules/types"
// Import directly to avoid circular import
import { SpellStatement } from "spell-parser/spell/rules/Statement"
import { type MethodBody } from "./classes.shared"

/**
 * `draw_it` rule:  how a type draws, in its outline body (epic `spanish` P20).
 *
 * ```spell
 * a card is a view where:
 * 	- to "draw it":
 * 		<ui-text class="Card">{its picture}</ui-text>
 *
 * a pile is a viewable list of cards where:
 * 	- to draw it:                   // the wrapper around its cards
 * 		return <div class="Pile"><children/></div>
 * 	- to draw each item:            // the wrapper each card is drawn in
 * 		return <div class="Spot">{draw the card}</div>
 * ```
 * - Three drawings, by what their words MEAN, the `draw_method` word rule:
 *   - `draw`:  `to draw it` => `draw()`, what `draw the card` draws
 *   - `draw_each_item`:  a list's `to draw each item` => `drawEachItem(item)`,
 *     the wrapper each of its items is drawn in -- see `ViewableList.drawEachItem()`
 *     - `the item`, and the item's type's name, `the card`, are the item;  `it` is the list
 *   - `draw_its_placeholder`:  a list's `to draw its placeholder` => `drawItsPlaceholder()`,
 *     what it shows while it's empty -- see `List.drawItsPlaceholder()` (epic `outline-spell` P27)
 * - Its words quoted or not, as for any method in an outline body:
 *   - quoted, `to "draw it":`:  its body is markup, inline or one indented line, which IS the drawing --
 *     no `return` needed
 *   - unquoted, `to draw it:`:  its body is a method's, lines of statements which `return` the drawing
 *   - Spanish's words are `dibujarlo` (or `dibujarla`, `dibujar eso`), `dibujar cada elemento` and
 *     `dibujar su marcador`.
 * - English's unquoted `to draw it:` is left to `to_do_something`,
 *   which makes the same `draw()` as any `to <verb> it:`.
 *   Spanish fuses its `it` into the verb (`dibujarlo`), so a method of those words would be `dibujarlo()`:
 *   this rule makes it `draw()`.
 * - ONE drawing per thing:  a program that wants a face-down look checks its own state inside `to draw it`.
 */
export class DrawIt extends SpellStatement<"alias?|body?|phrase?", DrawItMatchData> {
  @proto static priority = Priority.declaration
  @proto static alias = "statement"

  /** Only a `draw_method`'s words, in a type's outline body;  `draw each item` only in a list's. */
  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    const match = super.parse(scope, tokens) as P.MatchFor<this> | undefined
    const type = P.SubjectScope.of(scope)?.subjectType
    if (!match || !type) return undefined
    const drawing = DrawIt.drawingOf(match)
    if (!drawing) return undefined
    // only a list draws each item, or a placeholder while it's empty
    if (drawing !== "draw" && !type.isA("list")) return undefined
    // English's `to draw it:` is `to_do_something`'s:  `draw()`, as for any `to <verb> it:`
    const { phrase } = match.groups
    if (phrase && drawing === "draw" && DrawIt.endsWithIt(scope, phrase.inputText)) return undefined
    return match
  }

  /**
   * Which drawing `match` writes, by what its words mean, e.g. `draw` for `"draw it"` -- `undefined` if none.
   * - Cached in `match.data.drawing`:  its inline body is parsed, in its nested scope, before `parse()` returns.
   */
  private static drawingOf(match: P.MatchFor<DrawIt>): Drawing | undefined {
    if (match.data.drawing) return match.data.drawing
    const { alias, phrase } = match.groups
    const words = alias && `${alias.value}`.replace(/^["']|["']$/g, "")
    const meaning = words
      ? DRAWINGS.find((each) => Wording.reads(match.scope, "draw_method", words, each))
      : DRAWINGS.find((each) => each === Wording.meaningOf(phrase))
    return (match.data.drawing = meaning)
  }

  /** Do `words` end with the language's word for the subject, `it`, which `to_do_something` reads? */
  private static endsWithIt(scope: P.Scope, words: string): boolean {
    const last = scope.parser?.tokenize(words)?.at(-1)
    return !!last && SubjectRule.reads(scope, "subject_it", last)
  }

  /**
   * The body's scope:  `it` / `its` are the thing, as in any method of its type.
   * - `to draw each item`'s also has the item:  `item`, its type's name, e.g. `card`,
   *   and the language's word it was written with, e.g. Spanish's `elemento`.
   */
  getNestedScopeForMatch(match: P.MatchFor<this>): P.MethodScope {
    const type = P.SubjectScope.of(match.scope)!.subjectType!
    const isEachItem = DrawIt.drawingOf(match) === "draw_each_item"
    const itemType = isEachItem ? type.chain().find((each) => each.itemType)?.itemType : undefined
    // looked up now, for `getAST()`, which mustn't
    if (typeof itemType === "string") match.data.itemType = itemType
    const scope = new P.MethodScope({
      parentScope: match.scope,
      args: isEachItem ? [new P.ScopeVariable({ name: ITEM, datatype: itemType })] : [],
      thisVar: type.instanceName,
      mapItTo: "this",
      itDatatype: SP.typeName(type.name),
      declaredBy: match
    })
    // the item by its type's name, `the card`, and by the language's word for it, `el elemento`
    const names = [typeof itemType === "string" ? P.instanceCase(itemType) : undefined, DrawIt.itemWordOf(match)]
    for (const name of new Set(names)) {
      if (!name || name === ITEM) continue
      scope.variables.add({ name, output: ITEM, isAlias: true, datatype: itemType, declaredBy: match })
    }
    return scope
  }

  /** The last of `to draw each item`'s words, the language's word for the item, e.g. `elemento` -- if a word. */
  private static itemWordOf(match: P.MatchFor<DrawIt>): string | undefined {
    const { alias, phrase } = match.groups
    const words = alias ? `${alias.value}`.replace(/^["']|["']$/g, "") : `${phrase?.inputText ?? ""}`
    const last = `${match.scope.parser?.tokenize(words)?.at(-1) ?? ""}`.toLowerCase()
    return /^\p{L}+$/u.test(last) ? last : undefined
  }

  /** `draw() { ... }`, `drawEachItem(item) { ... }` or `drawItsPlaceholder() { ... }`, on its type. */
  getAST(match: P.MatchFor<this>): P.ASTPropertyDefinition {
    const drawing = match.data.drawing ?? "draw"
    const isEachItem = drawing === "draw_each_item"
    return new P.ASTPropertyDefinition(match, {
      type: P.SubjectScope.of(match.scope)!.subject,
      property: drawing,
      method: new P.ASTMethodDefinition(match, {
        args: isEachItem ? [new P.ASTVariableExpression(match, { name: ITEM, datatype: match.data.itemType })] : [],
        body: P.matchAST<MethodBody>(this.getBody(match))
      })
    })
  }
}

/** What `draw_it` stashes in `match.data`. */
type DrawItMatchData = {
  /** Which drawing it is, by what its words mean -- see `DRAWINGS`. */
  drawing?: Drawing
  /** What `to draw each item`'s item is:  its list's item type, e.g. `Card`. */
  itemType?: string
}

/** The drawings a type may write:  the `draw_method` word rule's meanings. */
type Drawing = (typeof DRAWINGS)[number]

/** See `Drawing`. */
const DRAWINGS = ["draw", "draw_each_item", "draw_its_placeholder"] as const

/** The name `to draw each item` calls its item, in every language:  `drawEachItem(item)`. */
const ITEM = "item"
