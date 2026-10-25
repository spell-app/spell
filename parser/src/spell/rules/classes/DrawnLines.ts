import { P } from "spell-parser/parser"
// Import directly to avoid circular import
import { DrawnMarkup } from "./DrawnMarkup"

/**
 * A drawing's body, its DRAWN LINES gathered into what it returns (epic `elemental-spell` C28).
 * - Each drawn line compiles to `return <markup>` (`drawn_markup`):  alone, the first one reached is the drawing.
 * - A drawing of several, in order, returns them all, as a list Solid draws in order:
 *
 *   ```spell
 *   - to draw it:
 *   	<ui-text>Klondike</ui-text>
 *   	draw its card
 *   	for each column in its columns
 *   		<ui-segment>{draw the column}</ui-segment>
 *   ```
 *
 *   ```js
 *   draw() {
 *     return [
 *       h("ui-text", "Klondike"),
 *       this.drawCard(),
 *       core.map(this.columns, (column) => h("ui-segment", () => core.drawThing(column)))
 *     ]
 *   }
 *   ```
 *
 * - What draws:
 *   - a drawn line (`drawn_markup`):  its markup
 *     - lines of markup one after another are ONE line already:  the tokenizer reads them as one fragment
 *   - a loop with drawn lines in it (`for each`, `repeat`):  one drawing per time round, `core.map(...)` --
 *     its body gathered the same way
 *   - an `if` chain with drawn lines in it:  alone, as it is, each branch returning its own;
 *     among other drawn lines, the drawing its condition picks, `cond ? a : b` (`null` when no branch is picked)
 * - Lines that draw nothing stay where they are, before the drawing.
 *   - One AFTER a drawn line, among others:  moved before the drawing (J) -- the drawing is made once, and returned
 *     at the end, so nothing could run after it.
 * - An `if` among other drawn lines whose branch does more than draw (`set ...` before its markup) can't be one
 *   value:  that branch draws nothing, and says why in a parse error comment (C).
 * - Pure:  reads and builds AST only, called from `getAST()` (`draw_it`'s, `to_do_something`'s).
 */
export class DrawnLines {
  /**
   * `lines`, a drawing's body, with its drawn lines gathered into ONE `return` -- see the class.
   * - As they were when nothing (or one thing, last) draws.
   */
  static gather(lines: Line[]): Line[] {
    const units = DrawnLines.unitsOf(lines)
    const drawing = units.filter((unit) => unit.draws)
    if (!drawing.length) return lines
    if (drawing.length === 1) return DrawnLines.gatherOne(units, drawing[0]!)
    const before: Line[] = []
    const values: P.ASTExpression[] = []
    for (const unit of units) {
      if (unit.draws) values.push(...DrawnLines.valuesOf(unit))
      else before.push(...unit.lines)
    }
    const match = drawing[0]!.lines[0]!.match
    const list = new P.ASTArrayLiteral(match, { items: values, wrap: true })
    return [...before, new P.ASTReturnStatement(match, { value: list })]
  }

  /** Does `lines` have a drawn line anywhere in it -- a loop's, a branch's? */
  static draws(lines: Line[] | undefined): boolean {
    return !!lines?.some((line) => DrawnLines.lineDraws(line))
  }

  ////////////////
  // ## One thing drawn
  ////////////////

  /**
   * `units` where `only` is the one that draws:  as it is, its `return` already the drawing --
   * except a loop, whose `core.map(...)` IS the drawing, returned;  and an `if` chain's branches, gathered each.
   */
  private static gatherOne(units: Unit[], only: Unit): Line[] {
    const out: Line[] = []
    for (const unit of units) {
      if (unit !== only) out.push(...unit.lines)
      else if (unit.kind === "loop") {
        DrawnLines.gatherLoop(unit.lines[0] as P.ASTCoreMethodInvocation)
        out.push(new P.ASTReturnStatement(unit.lines[0]!.match, { value: unit.lines[0] as P.ASTExpression }))
      } else if (unit.kind === "if") {
        for (const branch of unit.lines) DrawnLines.gatherBranch(branch)
        out.push(...unit.lines)
      } else out.push(...unit.lines)
    }
    return out
  }

  ////////////////
  // ## Values
  ////////////////

  /** What `unit` draws, as values in the drawing's list:  a fragment's elements spread into it. */
  private static valuesOf(unit: Unit): P.ASTExpression[] {
    if (unit.kind === "loop") {
      const loop = unit.lines[0] as P.ASTCoreMethodInvocation
      DrawnLines.gatherLoop(loop)
      return [loop]
    }
    if (unit.kind === "if") return [DrawnLines.choiceOf(unit.lines as Branch[])]
    const value = (DrawnLines.statementOf(unit.lines[0]!) as P.ASTReturnStatement).value
    if (!value) return []
    // `<a/>` and `<b/>` on lines of their own are one fragment:  its elements, in the drawing's list
    if (value instanceof P.ASTJSXFragment) {
      const items = value.childValues
      if (items.every((item) => item instanceof P.ASTJSXElement)) return items as P.ASTExpression[]
    }
    return [value]
  }

  /** A loop's body, gathered:  the loop's `core.map(...)` then makes one drawing per time round. */
  private static gatherLoop(loop: P.ASTCoreMethodInvocation) {
    const body = DrawnLines.callbackOf(loop)?.body
    if (body?.statements) body.statements = DrawnLines.gather(body.statements)
  }

  /** A branch of an `if` chain, gathered:  its body returns its drawing. */
  private static gatherBranch(branch: Line) {
    const block = (branch as Branch).statements
    if (block?.statements) block.statements = DrawnLines.gather(block.statements)
  }

  /**
   * An `if` chain among other drawn lines, as ONE value:  `a ? x : b ? y : z`, `null` when no branch is picked.
   * - A branch that does more than draw:  `null`, with a parse error comment saying why (C).
   */
  private static choiceOf(branches: Branch[]): P.ASTExpression {
    const [first, ...rest] = branches
    const match = first!.match
    const value = DrawnLines.branchValue(first!)
    if (first instanceof P.ASTElseStatement) return value
    const otherwise = rest.length ? DrawnLines.choiceOf(rest) : new P.ASTNothingLiteral(match)
    return new P.ASTTernaryExpression(match, {
      condition: (first as P.ASTIfStatement | P.ASTElseIfStatement).condition,
      trueValue: value,
      falseValue: otherwise
    })
  }

  /** What `branch` draws, as one value -- see `choiceOf()`. */
  private static branchValue(branch: Branch): P.ASTExpression {
    const lines = DrawnLines.gather(branch.statements?.statements ?? [])
    const steps = lines.filter((line) => !(line instanceof P.ASTComment) && !(line instanceof P.ASTBlankLine))
    const only = steps.length === 1 ? DrawnLines.statementOf(steps[0]!) : undefined
    if (only instanceof P.ASTReturnStatement && only.value) return only.value
    return new P.ASTExpressionWithComment(branch.match, {
      expression: new P.ASTNothingLiteral(branch.match),
      comment: new P.ASTParseError(branch.match, { value: IF_DOES_MORE })
    })
  }

  ////////////////
  // ## Lines
  ////////////////

  /** `lines` as units:  an `if` with its `otherwise`s one unit, every other line its own. */
  private static unitsOf(lines: Line[]): Unit[] {
    const units: Unit[] = []
    for (const line of lines) {
      const statement = DrawnLines.statementOf(line)
      const last = units.at(-1)
      if (
        (statement instanceof P.ASTElseIfStatement || statement instanceof P.ASTElseStatement) &&
        last?.kind === "if"
      ) {
        last.lines.push(statement)
        last.draws ||= DrawnLines.lineDraws(statement)
        continue
      }
      const kind: Unit["kind"] =
        statement instanceof P.ASTIfStatement
          ? "if"
          : DrawnLines.isLoop(statement)
            ? "loop"
            : DrawnLines.isDrawnLine(statement)
              ? "drawn"
              : "other"
      // an `if` or loop unit holds the statement itself;  a drawn or other line keeps its comment
      units.push({
        kind,
        lines: [kind === "if" || kind === "loop" ? statement! : line],
        draws: DrawnLines.lineDraws(line)
      })
    }
    return units
  }

  /** Does `line` draw:  a drawn line, or a loop or branch with one in it? */
  private static lineDraws(line: Line): boolean {
    const statement = DrawnLines.statementOf(line)
    if (DrawnLines.isDrawnLine(statement)) return true
    if (DrawnLines.isLoop(statement)) {
      const body = DrawnLines.callbackOf(statement as P.ASTCoreMethodInvocation)!.body
      return DrawnLines.draws(body?.statements)
    }
    const branch = statement as Branch | undefined
    if (
      branch instanceof P.ASTIfStatement ||
      branch instanceof P.ASTElseIfStatement ||
      branch instanceof P.ASTElseStatement
    ) {
      return DrawnLines.draws(branch.statements?.statements)
    }
    return false
  }

  /** `line`'s statement:  a group's (a line with its comment), else the line. */
  private static statementOf(line: Line): Line | undefined {
    if (line instanceof P.ASTStatementGroup) {
      return line.statements?.find((each) => !(each instanceof P.ASTComment) && !(each instanceof P.ASTBlankLine))
    }
    return line
  }

  /** Is `statement` a drawn line, `drawn_markup`'s `return <markup>`? */
  private static isDrawnLine(statement: Line | undefined): boolean {
    return statement instanceof P.ASTReturnStatement && !!statement.match?.is?.(DrawnMarkup)
  }

  /** A loop's body, as a method:  `core.map(list, (item) => ...)`'s second argument. */
  private static callbackOf(loop: P.ASTCoreMethodInvocation): P.ASTMethodDefinition | undefined {
    const callback = loop.args?.args?.[1]
    return callback instanceof P.ASTMethodDefinition ? callback : undefined
  }

  /** Is `statement` a loop, `core.map(list, (item) => ...)` -- see `SpellStatement.loops`? */
  private static isLoop(statement: Line | undefined): statement is P.ASTCoreMethodInvocation {
    if (!(statement instanceof P.ASTCoreMethodInvocation) || statement.methodName !== "map") return false
    const rule = statement.match?.rule as { loops?: boolean } | undefined
    return rule?.loops === true && !!DrawnLines.callbackOf(statement)
  }
}

/** A line of a body, as a block holds them. */
type Line = P.ASTStatement | P.ASTExpression | P.ASTComment | P.ASTBlankLine

/** A branch of an `if` chain. */
type Branch = P.ASTIfStatement | P.ASTElseIfStatement | P.ASTElseStatement

/** A body's lines, as `gather()` sees them:  an `if` with its `otherwise`s is ONE unit. */
type Unit = {
  /** what it is */
  kind: "drawn" | "loop" | "if" | "other"
  /** its lines:  one, or an `if` chain's branches */
  lines: Line[]
  /** does it draw anything */
  draws: boolean
}

/** Why an `if` among other drawn lines can't draw a branch that does more than draw. */
const IF_DOES_MORE =
  "an `if` among other drawn lines can only draw:  move this branch's other lines above the drawing, " +
  "or make the `if` the drawing's only part"
