import { proto, snakeCase } from "spell-kit/util"
import { P } from "spell-lang/parser"
import { SP } from "spell-lang/spell"
import { Priority } from "spell-lang/spell/rules/rules.types"
import { Wording } from "spell-lang/spell/rules/expressions"
// Import directly to avoid circular import
import { SpellStatement } from "spell-lang/spell/rules/Statement"
import { type MethodBody } from "./classes.shared"

/**
 * `draw_side` rule:  one SIDE of a thing, as markup, in a type's outline body:
 * `to "draw its front":` then markup (epic page `outline-spell`, P3;  Q14).
 *
 * ```spell
 * - to "draw its front":
 * 	<ui-image source="images/[rank]-of-[suit].png" />
 * - to "draw its back":
 * 	<ui-image source="images/card-back.png" />
 * ```
 * - Compiles to a getter, the side's name:  `get front() { return <markup> }` -- `its front` reads it.
 * - Once a type has BOTH `front` and `back`, the second also gives it `draw()`, picking one by its direction:
 *   `return this.direction === "down" ? this.back : this.front` -- what `draw the card` calls.
 *   So `its direction` should be `up or down`;  no direction draws the front.
 * - Which side is the front and which the back is what its name MEANS, the `side_name` word rule:
 *   Spanish's `dibujar su frente` and `dibujar su dorso` make `frente` and `dorso`, and the `draw()` that picks one.
 *   - NOTE:  `draw()` still reads `direction` and `"down"`, English's words:  a Spanish card's `dirección` isn't read.
 * - The body is one line of markup, inline or indented:  it IS the side, no `return` needed.
 */
export class DrawSide extends SpellStatement<"alias|body?", DrawSideMatchData> {
  @proto static priority = Priority.declaration
  @proto static alias = "statement"
  @proto static declares: P.DeclaresSpec = { kind: "property", name: "alias" }

  /** `to "draw its front":` => `the front of a card is:` -- see `SpellStatement.getLongForm()`. */
  getLongForm(match: P.MatchFor<this>): string | undefined {
    const type = P.SubjectScope.of(match.scope)?.subjectType
    const side = match.data.side
    return type && side ? `the ${side.replace(/_/g, " ")} of a ${type.instanceName} is:` : undefined
  }

  /** Only `"draw its <side>"`, in a type's outline body. */
  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    const match = super.parse(scope, tokens) as P.MatchFor<this> | undefined
    if (!match || !P.SubjectScope.of(scope)?.subjectType) return undefined
    const side = DrawSide.sideOf(scope, `${match.groups.alias.value}`.replace(/^["']|["']$/g, ""))
    if (!side) return undefined
    match.data.side = snakeCase(side)
    match.data.facing = DrawSide.facingOf(scope, side)
    return match
  }

  /**
   * The side `phrase` draws, e.g. `front` for `draw its front`;  `undefined` if it isn't one.
   * - Its first words are the language's own, the `draw_its` word rule;  the rest are the side's name.
   */
  private static sideOf(scope: P.Scope, phrase: string): string | undefined {
    const tokens = scope.parser?.tokenize(phrase)
    const lead = tokens && scope.parser?.rules.draw_its?.parse(scope, tokens)
    if (!lead) return undefined
    const side = tokens.slice(lead.length).join("").trim()
    return SIDE_NAME.test(side) ? side : undefined
  }

  /**
   * Which way side `name` faces, `front` or `back`:  what the `side_name` word rule says it means, e.g. `front` for
   * Spanish's `frente`;  `undefined` for any other side, e.g. `back cover`.
   */
  private static facingOf(scope: P.Scope, name: string): Facing | undefined {
    return FACINGS.find((facing) => Wording.reads(scope, "side_name", name, facing))
  }

  /**
   * SIDE EFFECT:  declares the side on the type;  notes whether it now has both -- see class docs.
   * - The other side is found by what it MEANS (`facing`), so its name is whatever its language says, e.g. `dorso`.
   */
  mutateScope(match: P.MatchFor<this>) {
    const type = P.SubjectScope.of(match.scope)!.subjectType!
    const { side, facing } = match.data
    if (facing) {
      const otherFacing = facing === "front" ? "back" : "front"
      const other = type.variables
        .get()
        .find((variable) => DrawSide.facingDeclaredBy(variable.declaredBy) === otherFacing)
      if (other) {
        match.data.drawsBoth = true
        match.data.otherSide = other.name
      }
    }
    type.declareProperty(side!, match)
  }

  /** The way a side declared by `match` faces, if `match` is a `draw_side`'s. */
  private static facingDeclaredBy(match: P.Match | undefined): Facing | undefined {
    return match?.is(DrawSide) ? (match.data as DrawSideMatchData).facing : undefined
  }

  /** The body's scope:  `it` / `its` are the thing, as in a getter. */
  getNestedScopeForMatch(match: P.MatchFor<this>): P.MethodScope {
    const type = P.SubjectScope.of(match.scope)!.subjectType!
    return new P.MethodScope({
      parentScope: match.scope,
      thisVar: type.instanceName,
      mapItTo: "this",
      itDatatype: SP.typeName(type.name),
      declaredBy: match
    })
  }

  getAST(match: P.MatchFor<this>): P.ASTStatementGroup {
    const typeName = P.SubjectScope.of(match.scope)!.subject
    const { side, facing, otherSide } = match.data as Required<DrawSideMatchData>
    const statements: P.ASTClassMember[] = [
      new P.ASTPropertyDefinition(match, {
        type: typeName,
        property: side,
        get: new P.ASTMethodDefinition(match, { body: P.matchAST<MethodBody>(this.getBody(match)) })
      })
    ]
    if (match.data.drawsBoth) {
      const facingProperty = (name: string) =>
        new P.ASTPropertyExpression(match, { object: new P.ASTSelfLiteral(match), property: name })
      const isDown = new P.ASTInfixExpression(match, {
        lhs: facingProperty("direction"),
        operator: "exactly equals",
        rhs: new P.ASTConstantExpression(match, { name: "down", value: "down" })
      })
      statements.push(
        new P.ASTPropertyDefinition(match, {
          type: typeName,
          property: "draw",
          method: new P.ASTMethodDefinition(match, {
            body: new P.ASTTernaryExpression(match, {
              condition: isDown,
              trueValue: facingProperty(facing === "back" ? side : otherSide),
              falseValue: facingProperty(facing === "front" ? side : otherSide)
            })
          })
        })
      )
    }
    return new P.ASTStatementGroup(match, { statements })
  }
}

/** What `draw_side` stashes in `match.data`. */
type DrawSideMatchData = {
  /** The side's property, from its name, e.g. `front`, `back_cover`. */
  side?: string
  /** Which way it faces, if it's a front or a back -- see `facingOf()`. */
  facing?: Facing
  /** Set once the type has both sides:  this one is the second, and also gives the type `draw()`. */
  drawsBoth?: boolean
  /** The other side's property, when `drawsBoth`, e.g. `back` for `front`. */
  otherSide?: string
}

/** The ways a side faces:  the `side_name` word rule's meanings. */
type Facing = (typeof FACINGS)[number]

/** See `Facing`. */
const FACINGS = ["front", "back"] as const

/** A side's name, after `draw its`:  one or more words, e.g. `front`, `back cover`. */
const SIDE_NAME = /^\p{L}[\p{L}\p{M}\d_-]*(?: \p{L}[\p{L}\p{M}\d_-]*)*$/iu
