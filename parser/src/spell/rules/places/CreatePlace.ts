import { proto, snakeCase } from "spell/util"
import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
import { Wording } from "spell/parser/spell/rules/expressions"
import { Priority } from "spell/parser/spell/rules/rules.types"
import { SpellStatement } from "spell/parser/spell/rules/Statement"
// Import directly to avoid circular import
import { TypeDeclaration } from "spell/parser/spell/rules/classes/TypeDeclaration"
import { OperationAt } from "./OperationAt"
import { PlaceDetail, textIn, type PlaceDetailValue } from "./PlaceDetail"
import { PLACE_KIND_ABILITIES, placeKindWords } from "./places.shared"

/** A key in an address, which anyone reading a browser program can read:  `?key=...`, `user:secret@`. */
const KEY_IN_ADDRESS = /[?&](?:api[_-]?key|key|token|secret|access[_-]?token)=|\/\/[^/@\s]+:[^/@\s]+@/i

/**
 * What each word has been found to read as, by language:  reading a word rule's word tokenizes it, and this test runs on
 * every line of a program.
 */
const WORDS_READ = new Map<string, boolean>()

/** After the seven back-ends (Q3):  the words are ready for it, and nothing's behind them. */
const THE_CLOUD = "the cloud"

/**
 * `create_place` rule:  a program's data lives here (epic `data` P11, Q2).
 * - e.g. `family cookbook is a web service at "https://api.example.com/v1"`:  the ONE line a different back-end changes.
 * - e.g. `family cookbook is this device`, `family cookbook is in memory`, with no kind or no address:  a kind that needs none.
 * - e.g. `family cookbook is a supabase project at "..."`:  a kind a library adds, a type made from `place`.
 * - The lines under it say the rest (`PlaceDetail`), and name its operations.
 * - Declares a type and its one instance, the variable `family_cookbook`, as `solitaire is an app` does.
 * - What it can't do is said here, at this line:  a key in its address won't compile, and a place that can't announce
 *   what changed warns unless it says how often to ask.
 * - Compiles to its class, then `core.place()`, handed everything the lines say.
 */
export class CreatePlace extends TypeDeclaration<
  "type|aka?|kind?|superType?|address?|with_nested_statements?|body?",
  { placeKind?: string }
> {
  @proto static priority = Priority.declaration + 1
  @proto static declares: P.DeclaresSpec = { kind: "type", name: "type" }

  /**
   * Quick test:  no article first, and `is` with something after it that could say where.
   * - So an editor doesn't offer `is a ...` after just any words, e.g. `set y`.
   */
  test(scope: P.Scope, tokens: P.Token[], start = 0) {
    const { lang } = SP.Language.of(scope)
    const reads = (ruleName: string, token: P.Token | undefined) => {
      if (!(token instanceof P.WordToken)) return false
      const key = `${lang}\n${ruleName}\n${token.value}`
      let answer = WORDS_READ.get(key)
      if (answer === undefined) WORDS_READ.set(key, (answer = Wording.reads(scope, ruleName, `${token.value}`)))
      return answer
    }
    if (reads("indefinite_article", tokens[start])) return false
    const is = tokens.findIndex((token, index) => index > start && reads("is_or_is_not", token))
    if (is < 0 || !tokens[is + 1]) return false
    return super.test(scope, tokens, start)
  }

  /** A kind spell knows, or a type made from `place`;  anything else isn't ours. */
  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    const match = super.parse(scope, tokens) as P.MatchFor<this> | undefined
    if (!match) return undefined
    const { kind, superType, address } = match.groups
    if (superType) {
      const { scopeType } = superType.data as { scopeType?: unknown }
      if (!(scopeType instanceof P.TypeScope) || !scopeType.isA("Place")) return undefined
    }
    const language = SP.Language.of(scope)
    if (address && KEY_IN_ADDRESS.test(textIn(address))) {
      return SpellStatement.refuse(match, language.parserMessage("key-written"))
    }
    match.data.placeKind = kind ? placeKindWords(Wording.meaningOf(kind) ?? "") : undefined
    if (match.data.placeKind === THE_CLOUD)
      return SpellStatement.refuse(match, language.parserMessage("place-cloud-later"))
    const refused = this.refuseTakenNames(match)
    if (refused !== match) return refused
    this.warnIfItCantSay(match)
    return match
  }

  /** SIDE EFFECT:  a plain web service can't announce what changed:  say so, unless a line under it says how often to ask. */
  private warnIfItCantSay(match: P.MatchFor<this>): void {
    const { placeKind } = match.data
    if (!placeKind || PLACE_KIND_ABILITIES[placeKind]?.saysWhatChanged) return
    if (PLACE_KIND_ABILITIES[placeKind]?.isReadOnly) return
    const language = SP.Language.of(match.scope)
    const message = language.parserMessage("place-cant-announce", { kind: placeKind })
    SP.SpellWarnings.noteIf(match, message, () => CreatePlace.detailsOf(match).checkedEvery === undefined)
  }

  /** SIDE EFFECT:  declares our type, its one instance, and what kind of place it is. */
  mutateScope(match: P.MatchFor<this>) {
    const { superType } = match.groups
    this.declareType(match, superType ? `${superType.value}` : "place")
    const words = `${match.groups.type.value}`
    const type = match.scope.getType(words)
    const { placeKind } = match.data
    const placeName = CreatePlace.placeNameOf(match)
    type?.declarePlace({ placeName, ...(placeKind && { placeKind }) }, match)
    match.scope.variables?.add({
      name: placeName,
      datatype: type?.name ?? words,
      kind: "only",
      declaredBy: match
    })
  }

  /** The place's name, as `core.place()` knows it, and its variable's:  `family_cookbook`. */
  static placeNameOf(match: P.Match): string {
    return snakeCase(`${(match.groups.type as P.Match).raw}`.trim())
  }

  /** Everything the lines under `match` say, merged. */
  static detailsOf(match: P.Match): PlaceDetailValue & { operations?: Record<string, string> } {
    const details: PlaceDetailValue & { operations?: Record<string, string> } = {}
    const seen = new Set<P.Match>()
    const visit = (each: P.Match) => {
      if (seen.has(each)) return
      seen.add(each)
      if (each.rule instanceof PlaceDetail) mergeDetail(details, each.rule.detailOf(each as never))
      if (each.rule instanceof OperationAt) {
        const operation = OperationAt.operationOf(each)
        if (operation) (details.operations ??= {})[operation.name] = operation.at
      }
      for (const item of each.matched) if (item instanceof P.Match) visit(item)
      for (const value of Object.values(each.data)) {
        for (const item of [value].flat()) if (item instanceof P.Match) visit(item)
      }
    }
    const body = (match.rule as CreatePlace).getBody(match as never)
    if (body) visit(body)
    return details
  }

  /** Its class, then `core.place()`, as one instance:  `export const familyCookbook = core.place(new FamilyCookbook(), {...})`. */
  getAST(match: P.MatchFor<this>): P.ASTStatementGroup {
    const { type, superType, address } = match.groups
    const typeAST = P.matchAST<P.ASTTypeExpression>(type)
    const { placeKind } = match.data
    const description = {
      name: CreatePlace.placeNameOf(match),
      ...(placeKind && { kind: placeKind }),
      ...(address && { at: textIn(address) }),
      ...CreatePlace.detailsOf(match)
    }
    const thing = new P.ASTNewInstanceExpression(match, { type: typeAST })
    const made = new P.ASTAssignmentStatement(match, {
      thing: new P.ASTVariableExpression(match, { name: CreatePlace.placeNameOf(match) }),
      value: new P.ASTCoreMethodInvocation(match, {
        methodName: "place",
        args: [thing, plainValueAST(match, description)]
      }),
      isNewVariable: true
    })
    const superTypeAST = superType
      ? P.matchAST<P.ASTTypeExpression>(superType)
      : new P.ASTTypeExpression(match, { name: "Place" })
    return new P.ASTStatementGroup(match, {
      statements: [new P.ASTClassDeclaration(match, { type: typeAST, superType: superTypeAST }), made]
    })
  }
}

/** `from` merged into `into`:  a collection's mapping field by field. */
function mergeDetail(into: PlaceDetailValue, { collections, ...rest }: PlaceDetailValue): void {
  Object.assign(into, rest)
  for (const [name, { at, fields }] of Object.entries(collections ?? {})) {
    const held = ((into.collections ??= {})[name] ??= {})
    if (at !== undefined) held.at = at
    if (fields) held.fields = { ...held.fields, ...fields }
  }
}

/** `value`, plain data, as an expression. */
export function plainValueAST(match: P.Match, value: unknown): P.ASTExpression {
  if (typeof value === "number") return new P.ASTNumericLiteral(match, { value })
  if (typeof value === "string") return new P.ASTStringLiteral(match, { value: JSON.stringify(value) })
  const properties = Object.entries(value as object).map(
    ([property, each]) =>
      new P.ASTObjectLiteralProperty(match, {
        property: property as never,
        value: plainValueAST(match, each)
      })
  )
  return new P.ASTObjectLiteral(match, { properties })
}
