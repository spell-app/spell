import { proto, snakeCase, upperFirst } from "spell/util"
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
 * - And its PARTS (epic `elemental-spell` P5, Q55, Q56):  a named drawing it places, `to draw its front:`
 *   => `drawFront()`, which `draw its front` places -- see `draw_part`.
 *   - Spanish:  `para dibujar su frente:`.  Quoted too, its body markup:  `to "draw its front": <div>...</div>`.
 *   - SIDE EFFECT:  the part is one of its type's (`P.TypeScope.declarePart()`).
 *   - Its markup carries the part's name as a CSS part (J6):  `part="front"`, so `::part(front)` styles it --
 *     see `withPart()`.
 * - In a drawing's body, a line of markup IS what it draws, no `return` -- see `drawn_markup`.
 */
export class DrawIt extends SpellStatement<"alias?|body?|phrase?|part?", DrawItMatchData> {
  @proto static priority = Priority.declaration
  @proto static alias = "statement"

  /** Only a `draw_method`'s words, in a type's outline body;  `draw each item` only in a list's. */
  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    const match = super.parse(scope, tokens) as P.MatchFor<this> | undefined
    const type = P.SubjectScope.of(scope)?.subjectType
    if (!match || !type) return undefined
    // `to draw its placeholder` is a list's own drawing, `draw_method`'s, never a part called `placeholder`
    if (match.groups.part && DrawIt.readsAsDrawMethod(scope, tokens, match.groups.part)) return undefined
    const drawing = DrawIt.drawingOf(match)
    if (!drawing) return undefined
    // only a list draws each item, or a placeholder while it's empty;  any type draws its parts
    if (drawing !== "draw" && drawing !== "draw_its_part" && !type.isA("list")) return undefined
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
    const { alias, phrase, part } = match.groups
    if (part) {
      match.data.part = DrawIt.partName(`${part.value}`)
      return (match.data.drawing = "draw_its_part")
    }
    const words = alias && `${alias.value}`.replace(/^["']|["']$/g, "")
    const meaning = words
      ? DRAWINGS.find((each) => Wording.reads(match.scope, "draw_method", words, each))
      : DRAWINGS.find((each) => each === Wording.meaningOf(phrase))
    if (meaning || !words) return (match.data.drawing = meaning)
    // quoted, a part:  `"draw its front"`
    const quotedPart = DrawIt.quotedPartOf(match.scope, words)
    if (!quotedPart) return undefined
    match.data.part = quotedPart
    return (match.data.drawing = "draw_its_part")
  }

  /** Do `tokens` up to `part`, after their first word (`to`), read as one of `draw_method`'s drawings? */
  private static readsAsDrawMethod(scope: P.Scope, tokens: P.Token[], part: P.Match): boolean {
    const end = part.end ?? Infinity
    const phrase = tokens.slice(1).filter((token) => token.start < end)
    const words = phrase.join("").trim()
    return DRAWINGS.some((each) => Wording.reads(scope, "draw_method", words, each))
  }

  /**
   * The part `words` draws, quoted, e.g. `front` for `draw its front` -- `undefined` if they don't draw one.
   * - Its first words are the language's own, the `draw_its_part` word rule (`draw its`, Spanish's `dibujar su`);
   *   the rest are the part's name.
   */
  private static quotedPartOf(scope: P.Scope, words: string): string | undefined {
    const tokens = scope.parser?.tokenize(words)
    const lead = tokens && scope.parser?.rules.draw_its_part?.parse(scope, tokens)
    if (!lead) return undefined
    const name = tokens.slice(lead.length).join("").trim()
    return PART_NAME.test(name) ? DrawIt.partName(name) : undefined
  }

  /** A part's name as its type keeps it, from the words it was written with:  `front`, `back cover` => `back_cover`. */
  static partName(words: string): string {
    return snakeCase(words.trim())
  }

  /** The method that draws part `name`, e.g. `drawFront` for `front`, `drawBackCover` for `back_cover`. */
  static partMethodName(name: string): string {
    return `draw${name
      .split(/[_\s-]+/)
      .map(upperFirst)
      .join("")}`
  }

  /**
   * SIDE EFFECT:  a part's drawing makes the part its type's -- see `P.TypeScope.declarePart()`.
   */
  mutateScope(match: P.MatchFor<this>) {
    const { part } = match.data
    if (part) P.SubjectScope.of(match.scope)!.subjectType!.declarePart(part, match)
  }

  /**
   * What drawing `scope` is in:  `{ drawing, part }` for a `draw_it`'s body (`part` for a part's),
   * `{ drawing: "draw" }` for a method named `draw` (English's `to draw it:`) -- `undefined` anywhere else.
   * - Its nearest method's, so a line inside an `if` in a drawing is in the drawing.
   */
  static drawingIn(scope: P.Scope): { drawing: Drawing; part?: string } | undefined {
    let current: P.Scope | undefined = scope
    while (current && !(current instanceof P.MethodScope)) current = current.parentScope
    const declaredBy = (current as P.MethodScope | undefined)?.declaredBy
    if (!declaredBy) return undefined
    if (declaredBy.is(DrawIt)) {
      const { drawing = "draw", part } = declaredBy.data as DrawItMatchData
      return { drawing, part }
    }
    const method = (
      declaredBy.rule as { getSignature?: (match: P.Match) => { methodName?: string } | undefined }
    ).getSignature?.(declaredBy)?.methodName
    return method === "draw" ? { drawing: "draw" } : undefined
  }

  /**
   * `element`, carrying part `name` as a CSS part (J6):  `part="front"`, or added to the part names it says already,
   * `part="face front"`.
   * - A fragment has no element to carry it:  as it is.  So is an element whose `part` is worked out (`part={...}`).
   */
  static withPart(element: P.ASTExpression, name: string): P.ASTExpression {
    if (!(element instanceof P.ASTJSXElement) || element instanceof P.ASTJSXFragment) return element
    const attrs = [...(element.attrs ?? [])]
    const index = attrs.findIndex((attr) => attr.name === "part")
    const said = index < 0 ? undefined : attrs[index]!.value
    if (index >= 0 && !(said instanceof P.ASTStringLiteral)) return element
    const names = said instanceof P.ASTStringLiteral ? `${said.value} ${name}` : name
    const value = new P.ASTStringLiteral(element.match, { value: names, quote: '"' })
    const attr = new P.ASTJSXAttribute(element.match, { name: "part", value })
    if (index < 0) attrs.push(attr)
    else attrs[index] = attr
    return new P.ASTJSXElement(element.match, { tagName: element.tagName, attrs, children: element.children })
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

  /**
   * `draw() { ... }`, `drawEachItem(item) { ... }`, `drawItsPlaceholder() { ... }` or a part's, `drawFront() { ... }`,
   * on its type.
   * - A quoted part's markup carries the part's name (`withPart()`);  a statement body's markup lines do it
   *   themselves (`drawn_markup`).
   */
  getAST(match: P.MatchFor<this>): P.ASTPropertyDefinition {
    const drawing = match.data.drawing ?? "draw"
    const isEachItem = drawing === "draw_each_item"
    const { part } = match.data
    let body = P.matchAST<MethodBody>(this.getBody(match))
    if (part && body instanceof P.ASTExpression) body = DrawIt.withPart(body, part) as MethodBody
    return new P.ASTPropertyDefinition(match, {
      type: P.SubjectScope.of(match.scope)!.subject,
      property: part ? DrawIt.partMethodName(part) : drawing,
      method: new P.ASTMethodDefinition(match, {
        args: isEachItem ? [new P.ASTVariableExpression(match, { name: ITEM, datatype: match.data.itemType })] : [],
        body
      })
    })
  }
}

/** What `draw_it` stashes in `match.data`. */
type DrawItMatchData = {
  /** Which drawing it is, by what its words mean -- see `DRAWINGS`;  `draw_its_part` for a part's. */
  drawing?: Drawing
  /** A part's name, for a part's drawing, e.g. `front` -- see `DrawIt.partName()`. */
  part?: string
  /** What `to draw each item`'s item is:  its list's item type, e.g. `Card`. */
  itemType?: string
}

/** The drawings a type may write:  the `draw_method` word rule's meanings, and a part's, `draw_its_part`. */
type Drawing = (typeof DRAWINGS)[number] | "draw_its_part"

/** See `Drawing`. */
const DRAWINGS = ["draw", "draw_each_item", "draw_its_placeholder"] as const

/** The name `to draw each item` calls its item, in every language:  `drawEachItem(item)`. */
const ITEM = "item"

/** A part's name, after `draw its`:  one or more words, e.g. `front`, `back cover`. */
const PART_NAME = /^\p{L}[\p{L}\p{M}\d_-]*(?: \p{L}[\p{L}\p{M}\d_-]*)*$/iu
