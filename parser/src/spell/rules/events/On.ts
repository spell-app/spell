import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
import { WithPropsArg } from "spell/parser/spell/rules/methods"
// Import directly to avoid circular import
import { SpellStatement } from "spell/parser/spell/rules/Statement"

/**
 * `on` rule:  watches a global event, with an inline statement or nested block as the handler body.
 * - e.g. `on event card-click: ...`, `on event card-click with a card: ...`
 * - In a template's outline it's the HANDLER of each of its things (epic `elemental-spell` P5):
 *   `- on mouse down:` is a method of the template, `onMouseDown(event)`, where `it` is the thing.
 *   - So its name says which event:  `on` and the event's words, camelCase, as a drag handler's does.
 *   - The page runs a view's for its element's own mouse events (`SpellElement`, in spell-app);
 *     the rest wait for the event phase (P9), which sends events to things.
 * - `eventName` is a bare `keyword`, so its `raw` form (with dashes) is used directly as the event name.
 * - SIDE EFFECT: `getNestedScopeForMatch()` builds a `MethodScope` named for `eventName`, with `event`
 *   as its first arg plus one arg per `with`-listed prop (see `with_props_arg` in methods).
 * - When `props` are given, the handler body destructures them off `event` at its top,
 *   e.g. `with a card` => `let { card } = event`.
 * - Builds a call to core's `on(name, handler?)` (a `P.ASTCoreMethodInvocation`);
 *   `handler` omitted entirely when there's no body.
 *   - Javascript calls `on()` by name, imported from `@spell/core`:  `on('card-click', (event) => {...})`.
 */
export class On extends SpellStatement<"eventName|props?|body?"> {
  @proto static alias = "statement"
  @proto static declares: P.DeclaresSpec = { kind: "event", name: "eventName" }

  /**
   * Nested scope for the handler body, named for `eventName`.
   * - Its args are `event` plus any `props`, each with its type if it says, e.g. `Card` for `with a card`.
   */
  getNestedScopeForMatch(match: P.MatchFor<this>) {
    const { eventName, props } = match.groups
    const args: P.ScopeVariableProps[] = [{ name: "event" }]
    // `WithPropsArg`'s own `parse()` (in methods) stashes its prop `P.ASTVariableExpression`s
    // directly on `match.data.props`:  narrow via `is()` to read them typed, not the generic `props` group
    if (props?.is(WithPropsArg)) {
      for (const { name, datatype } of props.data.props ?? []) {
        args.push({ name, datatype: typeof datatype === "string" ? datatype : undefined })
      }
    }
    // a template's handler:  `it` / `its` are the thing, as in its other methods
    const subject = P.SubjectScope.of(match.scope)?.subjectType
    const methodScopeProps: P.MethodScopeProps = {
      parentScope: match.scope,
      name: eventName.value,
      args,
      declaredBy: match,
      ...(subject && { thisVar: subject.instanceName, mapItTo: "this", itDatatype: SP.typeName(subject.name) })
    }
    return new P.MethodScope(methodScopeProps)
  }

  getAST(match: P.MatchFor<this>) {
    const { eventName, props } = match.groups
    const body = this.getBody(match)
    // event variable
    const event = new P.ASTVariableExpression(match, { name: "event", type: "argument" })
    // Use the `raw` eventName, dashes are ok!
    const args: P.ASTExpression[] = [new P.ASTQuotedExpression(match, eventName.raw!)]
    if (body) {
      const method = new P.ASTMethodDefinition(match, {
        inline: true,
        body: P.asAST<P.ASTStatementBlock | P.ASTStatement | P.ASTExpression>(body.AST),
        args: [event]
      })
      // If they specified event props to pay attention to,
      // look them up at the start of the message
      if (props?.is(WithPropsArg) && props.data.props) {
        method.body.statements!.unshift(
          new P.ASTDestructuredAssignment(props, {
            thing: event,
            variables: props.data.props,
            isNewVariable: true
          })
        )
      }
      args.push(method)
    }
    // a template's handler:  a method of each of its things, `onMouseDown(event)`
    const subject = P.SubjectScope.of(match.scope)?.subject
    if (subject) {
      const method = args[1] instanceof P.ASTMethodDefinition ? args[1] : new P.ASTMethodDefinition(match, {})
      method.inline = false
      method.args = [event]
      return new P.ASTPropertyDefinition(match, { type: subject, property: On.handlerName(match), method })
    }
    return new P.ASTCoreMethodInvocation(match, {
      methodName: "on",
      args
    })
  }

  /** A template's handler's method name, by spell's names:  `on_mouse_down` for `on mouse down`. */
  static handlerName(match: P.MatchFor<On>): string {
    return `on_${`${match.groups.eventName.raw}`.replace(/-/g, "_")}`
  }
}
