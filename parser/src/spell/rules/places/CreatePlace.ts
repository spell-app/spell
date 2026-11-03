import { proto, snakeCase } from "spell/util"
import { airtableBaseIn, isPlaceServerAddress } from "spell/util/places/places.types"
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

/** An account's name, as the protocol has it:  a DID. */
const ACCOUNT_DID = /^did:(?:plc|web):[A-Za-z0-9._:%-]+$/

/** The start of a collection's name:  a domain, backwards, of two parts or more. */
const CORNER_NAME = /^[a-z][a-z0-9-]*(?:\.[a-z0-9][a-z0-9-]*)+$/i

/** A collection's whole name, which has three parts at the least, and only letters and digits in its last. */
const COLLECTION_NAME = /^[a-z][a-z0-9-]*(?:\.[a-z0-9][a-z0-9-]*)+\.[a-z][a-z0-9]*$/i

/**
 * `create_place` rule:  a program's data lives here (epic `data` P11, Q2).
 * - e.g. `family cookbook is a web server at "https://api.example.com/v1"`:  the ONE line a different back-end changes.
 * - e.g. `family cookbook is a database on this device`, `family cookbook is an in memory database`:  a kind with no address.
 * - e.g. `family cookbook is a personal atmosphere account`:  each person brings their own, so an address is optional:
 *   given, it's the corner of each account the program's records go in (`at "com.example.cookbook"`).
 * - `at` and `from` mean the same:  never read only.
 * - e.g. `family cookbook is a supabase project at "..."`:  a kind a library adds, a type made from `place`.
 * - The lines under it say the rest (`PlaceDetail`), and name its operations.
 * - Declares a type and its one instance, the variable `family_cookbook`, as `solitaire is an app` does.
 * - e.g. `family cookbook is an atmosphere account at "did:plc:abc123"`:  one account's records, anyone's to read (epic `data` P16).
 * - e.g. `family cookbook is an airtable at "appXXXXXXXXXXXXXX"`:  a base, through a server side that holds its key (epic `data` P19).
 * - What it can't do is said here, at this line:  a key in its address won't compile, and a place that can't announce
 *   what changed warns unless it says how often to ask.
 *   - An atmosphere account warns of what no referee can promise, and that everything in it is public (`warnOfNoReferee()`).
 *   - An Airtable warns of the last save winning, of fields it works out, of its limits, of a missing id column or key (`warnOfAirtable()`).
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
    const refused = this.refuseTakenNames(match)
    if (refused !== match) return refused
    const notAnAddress = this.refuseAtmosphereAddress(match) ?? this.refuseAirtableAddress(match)
    if (notAnAddress) return notAnAddress
    this.warnIfItCantSay(match)
    this.warnOfNoReferee(match)
    this.warnOfAirtable(match)
    return match
  }

  /** An atmosphere account's address has to be what the protocol can read:  a DID, or the start of a collection's name. */
  private refuseAtmosphereAddress(match: P.MatchFor<this>): P.Match | undefined {
    const { placeKind } = match.data
    const address = textIn(match.groups.address)
    const language = SP.Language.of(match.scope)
    if (placeKind === "atmosphere account" && !ACCOUNT_DID.test(address)) {
      return SpellStatement.refuse(match, language.parserMessage("atmosphere-not-an-account", { address }))
    }
    if (placeKind === "personal atmosphere account" && match.groups.address && !CORNER_NAME.test(address)) {
      return SpellStatement.refuse(match, language.parserMessage("atmosphere-not-a-corner", { address }))
    }
    return undefined
  }

  /** An Airtable's address has to name a base:  `appXXXXXXXXXXXXXX`, Airtable's address for one, or a place server that holds one. */
  private refuseAirtableAddress(match: P.MatchFor<this>): P.Match | undefined {
    if (match.data.placeKind !== "airtable") return undefined
    const address = textIn(match.groups.address)
    if (isPlaceServerAddress(address) || airtableBaseIn(address)) return undefined
    return SpellStatement.refuse(match, SP.Language.of(match.scope).parserMessage("airtable-not-a-base", { address }))
  }

  /**
   * SIDE EFFECT:  says, at this line, what an Airtable can't promise (epic `data` P19, T11, I5):
   * - two people on one field:  the last save wins, with no notice, and an edit in Airtable's own window is the same
   * - it works some fields out, and can't be asked which from here:  a write to one is refused when it runs
   * - each page of a read is a request, and plans cap them
   * - with no id column, Airtable makes the id, so a new row sent again can double;  with no key named, it can't be reached
   */
  private warnOfAirtable(match: P.MatchFor<this>): void {
    if (match.data.placeKind !== "airtable") return
    const language = SP.Language.of(match.scope)
    SP.SpellWarnings.note(match, language.parserMessage("airtable-last-save-wins"))
    SP.SpellWarnings.note(match, language.parserMessage("airtable-worked-out-fields"))
    SP.SpellWarnings.note(match, language.parserMessage("airtable-calls-count"))
    const details = () => CreatePlace.detailsOf(match)
    SP.SpellWarnings.noteIf(
      match,
      language.parserMessage("airtable-no-id-column"),
      () => details().idColumn === undefined
    )
    const isItsOwnServer = isPlaceServerAddress(textIn(match.groups.address))
    const needsKey = language.parserMessage("airtable-needs-key")
    SP.SpellWarnings.noteIf(match, needsKey, () => !isItsOwnServer && details().keyNamed === undefined)
  }

  /**
   * SIDE EFFECT:  says, at this line, what a place with no referee can't promise (Q13, T9, T10):
   * - everything in it is public, for good
   * - each person can change only their own, and `everyone here` isn't who's looking
   * - it hands out pages and nothing else, so `where` and `sorted by` happen in the browser, and it holds no decimal numbers
   * - an account named under it, or a collection's name, has to be one the protocol can read:  won't compile
   */
  private warnOfNoReferee(match: P.MatchFor<this>): void {
    const { placeKind } = match.data
    if (!placeKind || !PLACE_KIND_ABILITIES[placeKind]?.hasNoReferee) return
    const language = SP.Language.of(match.scope)
    const words = { kind: language.placeKindWord(placeKind) }
    SP.SpellWarnings.note(match, language.parserMessage("atmosphere-public", words))
    SP.SpellWarnings.note(match, language.parserMessage("atmosphere-your-own", words))
    SP.SpellWarnings.note(match, language.parserMessage("atmosphere-reads-here", words))
    SP.SpellWarnings.refuseIf(
      match,
      () => atmosphereLineProblem(match) ?? "",
      () => atmosphereLineProblem(match) !== undefined
    )
  }

  /** SIDE EFFECT:  a plain web server can't announce what changed:  say so, unless a line under it says how often to ask. */
  private warnIfItCantSay(match: P.MatchFor<this>): void {
    const { placeKind } = match.data
    if (!placeKind || PLACE_KIND_ABILITIES[placeKind]?.saysWhatChanged) return
    if (PLACE_KIND_ABILITIES[placeKind]?.isReadOnly) return
    const language = SP.Language.of(match.scope)
    const message = language.parserMessage("place-cant-announce", { kind: language.placeKindWord(placeKind) })
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
      ...CreatePlace.detailsOf(match),
      // a number its text can't settle, "1,200", reads the way the program's language writes one (epic `data` P23)
      ...(SP.Language.of(match.scope).decimalMark === "," && { unclearNumbers: "," })
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

/** What's wrong with the lines under an atmosphere account:  an account, or a collection's name, the protocol can't read. */
function atmosphereLineProblem(match: P.MatchFor<CreatePlace>): string | undefined {
  const { accounts = [], collections = {} } = CreatePlace.detailsOf(match)
  const language = SP.Language.of(match.scope)
  const account = accounts.find((did) => !ACCOUNT_DID.test(did))
  if (account) return language.parserMessage("atmosphere-not-an-account", { address: account })
  const named = Object.values(collections).find(({ at }) => at?.includes(".") && !COLLECTION_NAME.test(at))?.at
  return named ? language.parserMessage("atmosphere-not-a-collection", { address: named }) : undefined
}

/** `from` merged into `into`:  a collection's mapping field by field. */
function mergeDetail(into: PlaceDetailValue, { collections, accounts, ...rest }: PlaceDetailValue): void {
  Object.assign(into, rest)
  if (accounts) (into.accounts ??= []).push(...accounts)
  for (const [name, { at, fields }] of Object.entries(collections ?? {})) {
    const held = ((into.collections ??= {})[name] ??= {})
    if (at !== undefined) held.at = at
    if (fields) held.fields = { ...held.fields, ...fields }
  }
}

/** `value`, plain data, as an expression. */
export function plainValueAST(match: P.Match, value: unknown): P.ASTExpression {
  if (typeof value === "number") return new P.ASTNumericLiteral(match, { value })
  if (typeof value === "boolean") return new P.ASTBooleanLiteral(match, value)
  if (typeof value === "string") return new P.ASTStringLiteral(match, { value: JSON.stringify(value) })
  if (Array.isArray(value)) {
    return new P.ASTListExpression(match, { items: value.map((each) => plainValueAST(match, each)) })
  }
  const properties = Object.entries(value as object).map(
    ([property, each]) =>
      new P.ASTObjectLiteralProperty(match, {
        property: property as never,
        value: plainValueAST(match, each)
      })
  )
  return new P.ASTObjectLiteral(match, { properties })
}
