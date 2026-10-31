/**
 * Throwaway rules for the words epic `data` proposes:  the smallest rule that shows each word can be read.
 * - On a CLONE of a language's parser, for `wordsPrototype.test.ts` alone:  no project is ever parsed with them.
 * - They say where a word fits among the rules there are, not what it does:
 *   each compiles to `core.proposed("the words")`, which nothing defines, so nothing here ever runs.
 * - What held up, The Words (P11) builds for real, with its class in `src/`, and its tests.
 */
import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
import { BelongsToOne, CreateType } from "spell/parser/spell/rules/classes"
import { SpellExpression } from "spell/parser/spell/rules/expressions"
import { Priority } from "spell/parser/spell/rules/rules.types"
import { SpellStatement } from "spell/parser/spell/rules/Statement"
import { getKnownType } from "spell/parser/spell/rules/types"

/** Above any rule that reads the same words today:  a place's rules must win, or the word never reaches them. */
const ABOVE_ALL = Priority.declaration + 1

/** The datatype of `a draft of the recipe`:  what `save` asks for. */
const DRAFT = "PlaceDraft"

/** The datatype of a place's name. */
const PLACE = "Place"

/** A language's words for every proposal, by the same keys. */
type ProposedWords = Record<keyof typeof ENGLISH, string>

/** `core.proposed("the line's words", body?)`:  a proposed word's whole meaning here. */
function proposedAST(match: P.Match, body: P.Match | undefined): P.ASTCoreMethodInvocation {
  const text = new P.ASTStringLiteral(match, { value: JSON.stringify(match.inputText.split("\n")[0]!.trim()) })
  const args: P.ASTExpression[] = [text]
  if (body) args.push(new P.ASTMethodDefinition(body, { inline: true, body: P.matchAST(body) }))
  return new P.ASTCoreMethodInvocation(match, { methodName: "proposed", args })
}

/** The scope a proposed line's body reads in. */
function bodyScope(match: P.Match): P.MethodScope {
  return new P.MethodScope({ parentScope: match.scope, declaredBy: match })
}

/** A line:  a proposed statement, read ahead of anything else that reads the same words. */
export class ProposedStatement extends SpellStatement<P.AnyGroups> {
  @proto static alias = "statement"
  @proto static priority = ABOVE_ALL
  getNestedScopeForMatch(match: P.MatchFor<this>): P.MethodScope {
    return bodyScope(match as P.Match)
  }
  getAST(match: P.MatchFor<this>): P.ASTNode {
    return proposedAST(match as P.Match, this.getBody(match))
  }
}

/**
 * A line that hangs off the read above it, as `otherwise` hangs off an `if`:  it may draw, in a drawing.
 * - `loops` is what lets a line of markup draw inside a statement:  see `DrawIt.drawingIn()`.
 */
export class ProposedRider extends ProposedStatement {
  @proto static loops = true
}

/** A line that yields to a project's own action of the same words:  `to refresh the recipes:`, say. */
export class ProposedVerb extends ProposedStatement {
  @proto static priority = Priority.overridable
}

/** A value:  a proposed expression. */
export class ProposedExpression extends SpellExpression<P.AnyGroups> {
  @proto static priority = ABOVE_ALL
  getNestedScopeForMatch(match: P.MatchFor<this>): P.MethodScope {
    const { type } = match.groups as { type?: P.Match }
    const name = type ? SP.singularIn(match.scope, type.value) : "item"
    const datatype = type ? SP.typeName(`${type.value}`) : undefined
    return new P.MethodScope({
      parentScope: match.scope,
      args: [new P.ScopeVariable({ name, datatype, declaredBy: match as P.Match })],
      mapItTo: name,
      itDatatype: datatype,
      declaredBy: match as P.Match
    })
  }
  getAST(match: P.MatchFor<this>): P.ASTNode {
    return proposedAST(match as P.Match, this.getBody(match))
  }
}

/** `the total of its prices`:  only of a list, so a type's own `total` stays what it was. */
export class ProposedTotal extends ProposedExpression {
  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    const match = super.parse(scope, tokens)
    if (!match) return undefined
    const { list } = match.groups as { list: P.Match }
    return scope.getItemType(list.datatype) ? match : undefined
  }
}

/** `a draft of the recipe`:  it knows it's a draft, for `save`. */
export class ProposedDraftOf extends ProposedExpression {
  @proto static datatype: P.Datatype | undefined = DRAFT
}

/** `save the draft`:  a draft only.  `save` of anything else says how Spell keeps things:  no save step. */
export class ProposedSave extends ProposedStatement {
  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    const match = super.parse(scope, tokens)
    if (!match) return undefined
    const { draft } = match.groups as { draft: P.Match }
    if (draft.datatype === DRAFT) return match
    return SpellStatement.refuse(
      match,
      `"${draft.inputText.trim()}" isn't a draft:  a change is kept as it's made, with no save step`
    )
  }
}

/** Which types `is saved in` something, by their scope:  what `belongs to one` and `every recipe` would ask. */
export const SAVED_TYPES = new WeakSet<P.TypeScope>()

/**
 * `- it is saved in the family cookbook`:  marks its type, as a real rule would, for what comes after it.
 * - Only a place's name:  any expression there would take `is saved in its own file` as a property called `own`.
 */
export class ProposedSavedIn extends ProposedStatement {
  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    const match = super.parse(scope, tokens)
    if (!match) return undefined
    const { place } = match.groups as { place: P.Match }
    return place.datatype === PLACE ? match : undefined
  }

  mutateScope(match: P.MatchFor<this>): void {
    const { type } = match.groups as { type: P.Match }
    SAVED_TYPES.add(getKnownType(type))
  }
}

/**
 * `saved yet recipe`:  says what a read of a type could know, where it stands:  is that type saved?
 * - For a test alone:  `every recipe` means the place for a saved type, and has to know while it's parsed.
 */
export class ProposedSavedYet extends ProposedExpression {
  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    const match = super.parse(scope, tokens)
    if (!match) return undefined
    const { type } = match.groups as { type: P.Match }
    const known = scope.getType(`${type.value}`)
    match.data.isSaved = !!known && SAVED_TYPES.has(known)
    return match
  }
  getAST(match: P.MatchFor<this>): P.ASTNode {
    return new P.ASTBooleanLiteral(match as P.Match, !!(match.data as { isSaved?: boolean }).isSaved)
  }
}

/**
 * `an ingredient belongs to one recipe`:  a saved owner needn't be a list (epic `data` Q10).
 * - An owner in memory is still refused, by `belongs_to_one` itself, as today.
 */
export class ProposedBelongsTo extends BelongsToOne {
  @proto static priority = ABOVE_ALL
  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    const match = P.Sequence.prototype.parse.call(this, scope, tokens) as P.MatchFor<this> | undefined
    if (!match) return undefined
    const { list } = match.groups
    const owner = scope.getType(`${list.value}`)
    return owner && SAVED_TYPES.has(owner) && !owner.isA("list") ? match : undefined
  }
  mutateScope(): void {}
  getAST(match: P.MatchFor<this>): P.ASTStatementGroup {
    return new P.ASTStatementGroup(match, { statements: [proposedAST(match, undefined)] })
  }
}

/**
 * `family cookbook is a web service at "..."`:  a one-of-a-kind thing of a kind that's a type (epic `data` Q2).
 * - Its body is a type's outline body:  its own details, and its named operations.
 */
export class ProposedPlace extends CreateType {
  @proto static priority = ABOVE_ALL
  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    const match = super.parse(scope, tokens) as P.MatchFor<this> | undefined
    const superType = match?.groups.superType as P.Match<P.MatchGroups, { scopeType?: unknown }> | undefined
    const { scopeType } = superType?.data ?? {}
    return scopeType instanceof P.TypeScope && (scopeType.isA("Place") || scopeType.isA("Lugar")) ? match : undefined
  }
  mutateScope(match: P.MatchFor<this>): void {
    super.mutateScope(match)
    declarePlaceVariable(match)
  }
}

/** `family cookbook is this device`, `... is the cloud`:  a place of one kind, with nothing to say where. */
export class ProposedOnlyPlace extends ProposedStatement {
  mutateScope(match: P.MatchFor<this>): void {
    declarePlaceVariable(match as P.Match)
  }
}

/** The place's name, as a variable, so a type can say `is saved in the family cookbook`. */
function declarePlaceVariable(match: P.Match): void {
  const { type } = match.groups as { type: P.Match }
  const name = `${type.raw}`
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_")
  match.scope.variables?.add({ name, kind: "only", datatype: PLACE, declaredBy: match })
}

/** The English of every proposed word:  each key is one rule. */
const ENGLISH = {
  place: "{type:type_words} is (a|an) {superType:type} at {address:text} {with_nested_statements}?",
  eachOwn: "{type:type_words} is each person's own {superType:type} {with_nested_statements}?",
  thisDevice: "{type:type_words} is this device",
  theCloud: "{type:type_words} is the cloud",
  collectionAt: "{collection:plural_type} are at {path:text}",
  calledAs: "(a|an) {owner:known_type}'s {property:member_words} is called {name:text}",
  keyIsSecret: "{type:subject_its} key is the secret {name:text}",
  checkedEvery: "{type:subject_it} is checked every {number} seconds",
  savedIn: "{type:subject_it} is saved in {place:expression}",
  belongsTo: "(a|an) {type} belongs to one {list:type}",
  firstFew: "the {ordinal} {number} {type:plural_type} where {inline_expression}?",
  numberWhere: "the number of {type:plural_type} where {inline_expression}?",
  total: "the total of {list:operand}",
  whileWaiting: "while waiting :? {statement_body}?",
  ifNone: "if there are none :? {statement_body}?",
  ifFails: "if that fails :? {statement_body}?",
  allOrNothing: "all or nothing :? {statement_body}?",
  draftOf: "a draft of {thing:operand}",
  save: "save {draft:expression}",
  whenThingChanges: "when (a|an) {type:known_type} changes :? {statement_body}?",
  someoneElse: "when someone else changes it :? {statement_body}?",
  refresh: "refresh {list:expression}",
  tryAgain: "try again",
  currentPerson: "me",
  peopleHere: "the people here",
  cancelAction: "cancel {action:identifier}",
  savedYet: "saved yet {type:known_type}"
}

/** The same rules' Spanish:  the words in the Overview, each to go through the glossary in P11. */
const SPANISH: ProposedWords = {
  place: "{type:type_words} es (un|una) {superType:type} en {address:text} {with_nested_statements}?",
  eachOwn: "{type:type_words} es (el|la) (propio|propia) {superType:type} de cada persona {with_nested_statements}?",
  thisDevice: "{type:type_words} es este dispositivo",
  theCloud: "{type:type_words} es la nube",
  collectionAt: "(los|las) {collection:plural_type} están en {path:text}",
  calledAs: "(el|la) {property:member_words} de (un|una) {owner:known_type} se llama {name:text}",
  keyIsSecret: "{type:subject_its} clave es el secreto {name:text}",
  checkedEvery: "{type:subject_implied} se revisa cada {number} segundos",
  savedIn: "{type:subject_implied} se guarda en {place:expression}",
  belongsTo: "(un|una) {type} pertenece a (un|una) {list:type}",
  firstFew: "(los|las) {ordinal} {number} {type:plural_type} donde {inline_expression}?",
  numberWhere: "el número de {type:plural_type} donde {inline_expression}?",
  total: "el total de {list:operand}",
  whileWaiting: "mientras espera :? {statement_body}?",
  ifNone: "si no hay (ninguno|ninguna) :? {statement_body}?",
  ifFails: "si falla :? {statement_body}?",
  allOrNothing: "todo o nada :? {statement_body}?",
  draftOf: "(un|una) borrador de {thing:operand}",
  save: "guardar {draft:expression}",
  whenThingChanges: "cuando cambia (un|una) {type:known_type} :? {statement_body}?",
  someoneElse: "cuando otra persona (lo|la) cambia :? {statement_body}?",
  refresh: "recargar {list:expression}",
  tryAgain: "reintentar",
  currentPerson: "yo",
  peopleHere: "las personas presentes",
  cancelAction: "cancelar {action:identifier}",
  savedYet: "guardada ya {type:known_type}"
}

/** Which class reads each word. */
const RULE_OF: Record<keyof ProposedWords, P.RuleConstructor> = {
  place: ProposedPlace,
  eachOwn: ProposedPlace,
  thisDevice: ProposedOnlyPlace,
  theCloud: ProposedOnlyPlace,
  collectionAt: ProposedStatement,
  calledAs: ProposedStatement,
  keyIsSecret: ProposedStatement,
  checkedEvery: ProposedStatement,
  savedIn: ProposedSavedIn,
  belongsTo: ProposedBelongsTo,
  firstFew: ProposedExpression,
  numberWhere: ProposedExpression,
  total: ProposedTotal,
  whileWaiting: ProposedRider,
  ifNone: ProposedRider,
  ifFails: ProposedRider,
  allOrNothing: ProposedStatement,
  draftOf: ProposedDraftOf,
  save: ProposedSave,
  whenThingChanges: ProposedStatement,
  someoneElse: ProposedStatement,
  refresh: ProposedVerb,
  tryAgain: ProposedStatement,
  currentPerson: ProposedExpression,
  peopleHere: ProposedExpression,
  cancelAction: ProposedVerb,
  savedYet: ProposedSavedYet
}

/** The scope a test parses a project against, for `parseSpellProject()`'s `parentScope`:  `lang`'s, plus the rules. */
export function prototypeScope(lang: "en" | "es"): P.Scope {
  const root = SP.Language.for(lang).rootScope
  const parser = root.parser!.clone({ module: `wordsPrototype_${lang}` })
  const scope = new P.Scope({ name: `wordsPrototype_${lang}`, parentScope: root, parser })
  const words = lang === "en" ? ENGLISH : SPANISH
  for (const [word, syntax] of Object.entries(words)) {
    parser.addRule(RULE_OF[word as keyof ProposedWords] as never, { syntax } as never)
  }
  return scope
}
