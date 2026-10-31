import { P } from "spell/parser/parser"
import { PyBaseWriter } from "./PyBaseWriter"
import * as pyText from "./pyText"

const { isCoreCall } = P.jsShapes

/****************
 * ### `PyWriter`
 * Writes a spell tree as Python, on `asyncio`:  the `py` target's writer (epic `python-target`;  one target since P22).
 * - `PyBaseWriter` writes all but waiting:  the names, the classes, the loops ... -- see there.
 * - This adds what waits:  a function that waits is `async def`, and everything that calls it awaits it.
 *   A program that never waits is plain Python, `def` and all, as FizzBuzz is.
 *
 *   ```python
 *   async def turn_face_up(self):
 *       self.direction = "up"
 *       await core.pause_for(50, "msec")
 *
 *   async def turn_over(self):
 *       if self.direction == "up":
 *           await self.turn_face_down()
 *   ```
 *
 * - Which functions wait is worked out for the whole project first (`P.WriterProject.findWaiting()`):
 *   - any that pauses, or calls one that does
 *   - by NAME:  every method of a name waits if one does, so `await` is never put before a plain value
 * - A `create()` that waits is `async def` too, e.g. a deck's, which turns each card face down:
 *   `spell_core` runs it to its end as the thing is made, its pauses not waiting (`core.run_at_once()`),
 *   as javascript's constructor runs it.
 * - A function given as a value that waits is a lifted `async def`, never a `lambda`.
 * - At the top of the module, where Python can't `await`:  `asyncio.run(...)`
 *   - a call alone:  `asyncio.run(main())`
 *   - anything else that waits:  in an `async def` of its own, run so
 ****************/
export class PyWriter extends PyBaseWriter {
  /** The writer with no project. */
  static readonly instance = new PyWriter()

  /** Writing the module's top level, where Python can't `await` -- see `statement()`. */
  protected atTopLevel = false

  /** The steps lifted out of the top level, for a name each -- see `topLevelStep()`. */
  protected steps = 0

  /** Does `call`, of `core`, wait?  Spell's pause alone:  Python's `spell_core` has no other that does. */
  protected coreCallWaits(call: P.ASTScopedMethodInvocation): boolean {
    return call.methodName === "pauseFor"
  }

  /** Is `node` a call of a function that waits, by name, or spell's own pause? */
  isWaitingCall(node: P.ASTNode): boolean {
    if (!(node instanceof P.ASTMethodInvocation)) return false
    if (isCoreCall(node)) return node.methodName === "pauseFor"
    return this.project.waitingNames.has(node.methodName)
  }

  ////////////////
  // ## Functions that wait
  ////////////////

  /** As `PyBaseWriter`'s, `async def` when it waits. */
  methodDefinition(
    node: P.ASTMethodDefinition,
    doc: P.ASTDocComment | undefined,
    how: { name?: string; first?: "self" | "cls"; decorators?: string[] } = {}
  ): string {
    const written = super.methodDefinition(node, doc, how)
    return this.project.waitingMethods.has(node) ? written.replace(/^((?:@.*\n)*)def /, "$1async def ") : written
  }

  /** As `PyBaseWriter`'s, but one that waits is always a lifted `async def`:  a `lambda` can't `await`. */
  inlineFunction(node: P.ASTMethodDefinition): string {
    if (!this.project.waitingMethods.has(node)) return super.inlineFunction(node)
    const name = `_${this.nameOf(node.methodName ?? "each")}_${this.lifted.length + 1}`
    this.lifted.push(this.methodDefinition(node, undefined, { name }))
    return name
  }

  /**
   * A read of a value that waits, by name:
   * - in a function that waits:  `await core.answer_of(self, "total")`
   * - where nothing can wait, a drawing, `create()`:  `core.answer_now(self, "total")`, its pauses not waiting
   */
  ASTPropertyExpression(node: P.ASTPropertyExpression): string {
    if (!this.project.readsWaitingValue(node) || this.isSettingNow(node)) return super.ASTPropertyExpression(node)
    const args = `${this.tight(node.object)}, ${this.quoted(this.nameOf(node.property.value, "property"))}`
    return this.project.awaited.has(node) ? `await core.answer_of(${args})` : `core.answer_now(${args})`
  }

  /** `await name(args)` for a function that waits. */
  ASTMethodInvocation(node: P.ASTMethodInvocation): string {
    const written = super.ASTMethodInvocation(node)
    return this.project.waitingNames.has(node.methodName) ? `await ${written}` : written
  }

  /**
   * `await thing.method(args)` for a method that waits.
   * - spell's pause:  `await core.pause_for(50, "msec")`, `spell_core`'s, so a test run can skip it (`--no-pauses`).
   */
  ASTScopedMethodInvocation(node: P.ASTScopedMethodInvocation): string {
    if (isCoreCall(node) && node.methodName === "pauseFor") {
      return `await ${pyText.call("core.pause_for", this.items(node.args.args))}`
    }
    if (isCoreCall(node) && node.methodName === "filter" && this.project.waitsInTurn(node)) {
      return `await ${pyText.call("core.filter_in_turn", this.items(node.args.args))}`
    }
    const written = super.ASTScopedMethodInvocation(node)
    if (this.project.togetherWaits(node, (run) => this.project.waitingMethods.has(run))) return `await ${written}`
    const waits = !isCoreCall(node) && this.project.waitingNames.has(node.methodName)
    return waits ? `await ${written}` : written
  }

  /** What it waits for, which says its own `await` -- see the calls above. */
  ASTAwaitExpression(node: P.ASTAwaitExpression): string {
    return this.loop(node.expression) ?? String(this.write(node.expression))
  }

  /** `node`, in parentheses unless it binds tightly:  `(await x.play()).name`. */
  tight(node: P.ASTExpression): string {
    const written = super.tight(node)
    return /^await /.test(written) ? `(${written})` : written
  }

  ////////////////
  // ## The top level
  ////////////////

  /** As `PyBaseWriter`'s, noting when it's the module's own top level -- see `statement()`. */
  statementLines(statements: P.ASTNode[], topLevel = false): string {
    const previous = this.atTopLevel
    this.atTopLevel = topLevel
    try {
      return super.statementLines(statements, topLevel)
    } finally {
      this.atTopLevel = previous
    }
  }

  /**
   * As `PyBaseWriter`'s;  at the top level, a statement that waits runs through `asyncio.run()`,
   * as Python can't `await` there:
   * - a call alone:  `asyncio.run(reset_the_game())`
   * - set from one:  `card = asyncio.run(deal())`
   * - anything else:  an `async def` of its own, then run -- see `topLevelStep()`
   */
  statement(statement: P.ASTNode): string {
    const atTop = this.atTopLevel
    this.atTopLevel = false
    let written: string
    try {
      written = super.statement(statement)
    } finally {
      this.atTopLevel = atTop
    }
    if (!atTop || !/\bawait /.test(written)) return written
    const call = /^await ([^\n]*)$/.exec(written)
    if (call && !/\bawait /.test(call[1]!)) return `asyncio.run(${call[1]})`
    const set = /^([\w.]+) = await ([^\n]*)$/.exec(written)
    if (set && !/\bawait /.test(set[2]!)) return `${set[1]} = asyncio.run(${set[2]})`
    return this.topLevelStep(written)
  }

  /**
   * `written`, a top-level statement that waits, as an `async def` of its own and its run:
   *
   * ```python
   * async def _step_1():
   *     for card in deck:
   *         await card.move_to_pile(stock)
   *
   *
   * asyncio.run(_step_1())
   * ```
   */
  topLevelStep(written: string): string {
    const name = `_step_${++this.steps}`
    return `${pyText.block(`async def ${name}()`, written)}\n\n\nasyncio.run(${name}())`
  }

  /** As `PyBaseWriter`'s, importing `asyncio` first when the code runs any (the standard library's first, PEP 8). */
  module(code: string): string {
    const written = super.module(code)
    if (!/\basyncio\.run\(/.test(written)) return written
    // after `from __future__ import ...`, which must come first
    const future = written.startsWith(PyBaseWriter.FUTURE) ? `${PyBaseWriter.FUTURE}\n` : ""
    const rest = written.slice(future ? PyBaseWriter.FUTURE.length : 0).replace(/^\n+/, "")
    // beside the standard library's other imports, if any (`import math`, `from typing import Any`)
    return `${future}import asyncio\n${/^(?:import \w+|from typing import)/.test(rest) ? "" : "\n"}${rest}`
  }
}
