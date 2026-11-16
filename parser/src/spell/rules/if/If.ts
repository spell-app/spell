import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
import { Negatable } from "spell/parser/spell/rules/expressions"
// Import directly to avoid circular import
import { SpellStatement } from "spell/parser/spell/rules/Statement"

/**
 * `if` rule:  `if {condition} (then|:)?` statement, with an inline statement or an indented nested block as body.
 * - e.g. `if a`
 * - The module's parser is `_if_`, since `if` is a reserved word.
 * - `{statement_body}?`: doesn't parse its own body -- `SpellStatement` parses a trailing inline statement,
 *   or `commitStatement()` a following indented block, into `getBody(match)`.
 * - Compiles body in a nested `BlockScope` (named `"if"`) via `getNestedScopeForMatch()`.
 * - Prefers nested block over inline statement when (invalidly) given both -- see `getBody()`.
 * - Compiles to `if (condition) { ...statements }`.
 * - `if <thing> is a <type> and it ...`:  from its `and` on, and in its body, `it` is that thing (epic `language` P56):
 *   - e.g. `if the card's last pile is a column and it is not empty`, then `turn its last card face up`:
 *     `it` is the pile, a column, not the card
 *   - Spanish's subject left out too:  `si la última pila de la carta es una columna y no está vacía`
 *   - compiled as a variable of its own before the `if`:
 *     `const it_2 = this.lastPile`, then `if (this.lastPile instanceof Column && !it_2.isEmpty) it_2.lastItem...`
 *   - Only when what's after the `and` reads `it`:  otherwise `it` is what it was.
 */
export class If extends SpellStatement<"condition|body?"> {
  @proto static alias = "statement"

  /** As any statement's;  a condition naming its subject `it` (see the class docs) read again with that `it`. */
  parse(scope: P.Scope, tokens: P.Token[]) {
    const match = super.parse(scope, tokens) as P.MatchFor<this> | undefined
    const subject = match && If.namedSubjectOf(match)
    if (!subject || !(scope instanceof P.BlockScope)) return match
    const named = new P.BlockScope({ name: "if", parentScope: scope })
    const output = If.freeItName(scope)
    named.variables.add({ name: "it", output, datatype: subject.type, declaredBy: match as P.Match })
    const again = super.parse(named, tokens) as P.MatchFor<this> | undefined
    if (!again) return match
    // the subject itself as first read:  its own `its` is the one before
    Object.assign(again.data as IfData, { subjectIt: output, subject: subject.lhs })
    return again
  }

  /**
   * SIDE EFFECT:  a condition naming its subject `it` keeps that `it`'s name out of later lines' way:
   * a `get` below takes the next one (`AssignmentStatement.declareIt()`).
   */
  mutateScope(match: P.MatchFor<this>): void {
    const { subjectIt } = match.data as IfData
    const outer = match.scope.parentScope
    if (subjectIt && outer instanceof P.BlockScope) {
      outer.variables.add({ name: subjectIt, output: subjectIt, declaredBy: match as P.Match })
    }
  }

  /** Only when its condition's subject took an `it` name, which later lines go round -- see `mutateScope()`. */
  getScopeChanges(match?: P.MatchFor<this>): P.ScopeChanges | undefined {
    return (match?.data as IfData | undefined)?.subjectIt ? "global" : undefined
  }

  getNestedScopeForMatch(match: P.MatchFor<this>): P.Scope {
    return new P.BlockScope({ name: "if", parentScope: match.scope })
  }

  getAST(match: P.MatchFor<this>): P.ASTIfStatement | P.ASTStatementGroup {
    const { condition } = match.groups
    const ifStatement = new P.ASTIfStatement(match, {
      condition: condition.AST as P.ASTExpression,
      statements: this.getBody(match)?.AST as P.ASTStatement | P.ASTStatementBlock | undefined
    })
    const { subjectIt, subject } = match.data as IfData
    const lhs = (condition.groups as { lhs?: P.Match }).lhs
    if (!subjectIt || !subject || !lhs) return ifStatement
    const variable = () => new P.ASTVariableExpression(match, { name: subjectIt })
    // the condition reads its subject as the variable too:  as read again, its `its` would be the variable's own
    replaceNode(ifStatement, lhs.AST!, variable())
    const named = new P.ASTAssignmentStatement(match, {
      thing: variable(),
      value: subject.AST as P.ASTExpression,
      isNewVariable: true
    })
    return new P.ASTStatementGroup(match, { statements: [named, ifStatement] })
  }

  /**
   * `<thing> is a <type> and it ...`'s type, when `match`'s condition reads so -- see the class docs.
   * - The `is a` first, not negated;  then an `and` whose words read `it` (a pronoun, or the language's subject left out).
   * - Not when `<thing>` is `it` itself.
   */
  private static namedSubjectOf(match: P.Match): { type: P.Datatype; lhs: P.Match } | undefined {
    const condition = (match.groups as { condition?: P.Match }).condition
    const lhs = (condition?.groups as { lhs?: P.Match } | undefined)?.lhs
    if (!condition || !lhs) return undefined
    const { pronouns } = SP.Language.of(match.scope).words
    if (pronouns.has(lhs.inputText.trim().toLowerCase())) return undefined
    const suffixes = suffixesOf(condition)
    const [isA, ...rest] = suffixes
    if (isA?.rule.name !== "is_a" || Negatable.isNegated((isA.groups as { operator?: P.Match }).operator))
      return undefined
    const and = rest.find((suffix) => suffix.rule.name === "and")
    if (!and || !readsIt(and, pronouns)) return undefined
    const typeMatch = (isA.groups as { expression?: P.Match }).expression
    const type = typeMatch?.datatype
    return typeof type === "string" ? { type, lhs } : undefined
  }

  /** The first of `it`, `it_2` ... no line here has:  the name of a condition's subject (`subjectOf()`). */
  private static freeItName(scope: P.BlockScope): string {
    let number = 2
    while (scope.variables.get(`it_${number}`)) number++
    return `it_${number}`
  }
}

/** What `if` stashes on its match. */
type IfData = {
  /** The name its condition's subject has as `it`, from its `and` on:  `it_2` -- see the class docs. */
  subjectIt?: string
  /** That subject, as read before its `it` was:  `the card's last pile`. */
  subject?: P.Match
}

/** SIDE EFFECT:  every field in `node`'s tree holding `target` holds `replacement` instead. */
function replaceNode(node: unknown, target: P.ASTNode, replacement: P.ASTNode): void {
  if (!node || typeof node !== "object") return
  if (Array.isArray(node)) {
    node.forEach((item, at) => (item === target ? (node[at] = replacement) : replaceNode(item, target, replacement)))
    return
  }
  if (!(node instanceof P.ASTNode)) return
  const fields = node as unknown as Record<string, unknown>
  for (const key in fields) {
    if (key === "match" || !Object.hasOwn(fields, key)) continue
    if (fields[key] === target) fields[key] = replacement
    else replaceNode(fields[key], target, replacement)
  }
}

/** The suffixes of `condition`, an expression:  `is a column`, `and it`, `is empty` -- in order. */
function suffixesOf(condition: P.Match): P.Match[] {
  const suffixes: P.Match[] = []
  for (const child of condition.matched) {
    if (!(child instanceof P.Match)) continue
    if (child.matchGroup === "expression_suffix") suffixes.push(child)
    else if (!child.rule.name) suffixes.push(...suffixesOf(child))
  }
  return suffixes
}

/** Does `match` read `it`:  its first word a pronoun (`it is empty`), or the subject left out (`implied_it`)? */
function readsIt(match: P.Match, pronouns: Set<string>): boolean {
  const operand = (match.groups as { expression?: P.Match }).expression ?? match
  const firstWord = operand.inputText.trim().split(/\s+/)[0]?.toLowerCase() ?? ""
  return pronouns.has(firstWord) || hasRule(operand, "implied_it")
}

/** Does `match`, or anything in it, match rule `ruleName`? */
function hasRule(match: P.Match, ruleName: string): boolean {
  if (match.rule.name === ruleName) return true
  return match.matched.some((child) => child instanceof P.Match && hasRule(child, ruleName))
}
