import { P } from "spell/parser/parser"

import { forEachNode } from "./WriterProject"
import type { DebugOptions } from "./writers.types"

/****************
 * ### `DebugSteps`
 * Where a DEBUGGING build lets the running program stop (epic `editor` P33, Q41):  before each line of every function
 * that waits, so the editor around it stays live while it's held.
 *
 * ```js
 * async moveToPile(pile) {
 *   const frame$ = core._stepper.frame("/@spell/examples/Solitaire/Pile.spell", 21, this, () => ({ pile }))
 *   if (frame$.at(25, () => ({}))) await frame$.held()
 *   if (!core.canGiveUp(this.pile, this) || !core.canTake(pile, this)) core.cancel()
 *   if (frame$.at(27, () => ({}))) await frame$.held()
 *   ...
 * ```
 *
 * - A debugging build is `P.WriterOptions.debugging`:  every action and handler waits there
 *   (`P.WriterProject.findWaiting()`'s `actionsWait`), so a step can hold it.
 * - Each function that waits opens a FRAME as it starts:  its file, the line it's declared on, its thing and its inputs.
 *   - A loop's function inside one shares its frame:  its lines are that function's lines.
 * - Each line first tells its frame where it is, with the values its function has set so far (`at()`);
 *   it waits (`held()`) only when the debugger says stop, so a line that isn't stopped on costs no turn.
 * - Lines in a function that can't wait (a getter, a drawing, `create()`, a test) have no step:  they run through.
 * - What runs the steps is the core's (`core._stepper.frame()`, `spell/parser/core`'s stepping).
 * - Knows nothing of spell's projects:  where each line is comes from the caller (`DebugOptions.placeOf`).
 ****************/
export class DebugSteps {
  /** The variable each function's frame is in. */
  static readonly FRAME = "frame$"

  /** The function each block and group of lines belongs to:  not counting one nested in it, which has its own. */
  private readonly owners = new WeakMap<P.ASTNode, P.ASTMethodDefinition>()
  /** The function each one is written inside, if any. */
  private readonly outer = new WeakMap<P.ASTMethodDefinition, P.ASTMethodDefinition>()

  constructor(
    files: P.ASTNode[][],
    private readonly options: DebugOptions
  ) {
    forEachNode(files, (node) => {
      if (node instanceof P.ASTMethodDefinition) this.noteOwner(node.body, node)
    })
  }

  /** The function `block`, a block or group of lines, belongs to, if any. */
  ownerOf(block: P.ASTNode): P.ASTMethodDefinition | undefined {
    return this.owners.get(block)
  }

  /** Does `method` open a frame of its own?  A function that waits, unless it's a loop's inside one that does. */
  opensFrame(method: P.ASTMethodDefinition): boolean {
    if (!method.isAsync) return false
    const outer = this.outer.get(method)
    return !(method.inline && outer && this.frameOf(outer))
  }

  /** The function whose frame `method`'s lines tell, its own or the one it's written in:  none, no steps. */
  frameOf(method: P.ASTMethodDefinition): P.ASTMethodDefinition | undefined {
    if (!method.isAsync) return undefined
    if (this.opensFrame(method)) return method
    const outer = this.outer.get(method)
    return outer && this.frameOf(outer)
  }

  /** Where `node` is written:  see `DebugOptions.placeOf`. */
  placeOf(node: P.ASTNode): ReturnType<DebugOptions["placeOf"]> {
    return this.options.placeOf(node)
  }

  /** Is `statement` a line to step on?  Code, with a place:  not a comment, a blank, or an `otherwise` that goes with its `if`. */
  stepsOn(statement: P.ASTNode): boolean {
    if (
      statement instanceof P.ASTBlankLine ||
      statement instanceof P.ASTComment ||
      statement instanceof P.ASTElseIfStatement ||
      statement instanceof P.ASTElseStatement ||
      statement.constructor === P.ASTStatementGroup
    ) {
      return false
    }
    return !!this.placeOf(statement)
  }

  /**
   * SIDE EFFECT:  notes `method` as the owner of `node`, its body, and of every block and group in it;
   * a function nested in it as written inside it.
   */
  private noteOwner(node: unknown, method: P.ASTMethodDefinition): void {
    if (Array.isArray(node)) {
      for (const item of node) this.noteOwner(item, method)
      return
    }
    if (!(node instanceof P.ASTNode)) return
    // a function nested in it:  its own lines are its own
    if (node instanceof P.ASTMethodDefinition) {
      this.outer.set(node, method)
      return
    }
    if (node instanceof P.ASTStatementBlock || node instanceof P.ASTStatementGroup) this.owners.set(node, method)
    const fields = node as unknown as Record<string, unknown>
    for (const key in fields) {
      if (key === "match" || !Object.hasOwn(fields, key)) continue
      const value = fields[key]
      if (value && typeof value === "object") this.noteOwner(value, method)
    }
  }
}
