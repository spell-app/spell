import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
import { Wording } from "spell/parser/spell/rules/expressions"
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
 * - Or `when` and a passive verb, about the thing itself (epic `debut` P27, Q47):  `when clicked` is `on click`,
 *   `when double clicked` `on double click`, `when dragged` `on drag`, `when (the) drag is cancelled`
 *   `on drag cancelled` -- the `passive_event` word rule.
 * - A one-line event needs no colon:  `on click play it` (`event_words`).
 * - Or a property's CHANGE (epic `debut` P30):  `- when its score changes:`, `- on score change:`, the event
 *   `score-change`, its handler `onScoreChange()` -- the core sends it each time the property changes
 *   (`noteSetting()`), with the new `value` and the one it `was`.  The property:  `changed_property`.
 * - A saved thing changing is `WhenChanges`'s, on this one:  `when a recipe changes:`, `- when someone else changes it:`.
 * - `eventName` is a bare `keyword`, so its `raw` form (with dashes) is used directly as the event name.
 * - SIDE EFFECT: `getNestedScopeForMatch()` builds a `MethodScope` named for `eventName`, with `event`
 *   as its first arg plus one arg per `with`-listed prop (see `with_props_arg` in methods).
 * - When `props` are given, the handler body destructures them off `event` at its top,
 *   e.g. `with a card` => `let { card } = event`.
 * - Builds a call to core's `on(name, handler?)` (a `P.ASTCoreMethodInvocation`);
 *   `handler` omitted entirely when there's no body.
 *   - Javascript calls `on()` by name, imported from `@spell/core`:  `on('card-click', (event) => {...})`.
 */
export class On extends SpellStatement<"eventName?|passive?|changed?|props?|body?"> {
  @proto static alias = "statement"
  @proto static declares: P.DeclaresSpec = { kind: "event", name: "eventName" }

  /**
   * The event a passive `when` names, `click` for `when clicked`, or a property's change, `score-change` for
   * `when its score changes`:  as its name's `eventName` would.
   */
  getDeclaration(match: P.MatchFor<this>): P.Declaration | undefined {
    const { eventName, passive, changed } = match.groups
    if (eventName) return super.getDeclaration(match)
    return { kind: "event", name: On.eventNameOf(match), nameMatch: passive ?? changed ?? (match as P.Match) }
  }

  /**
   * Nested scope for the handler body, named for `eventName`.
   * - Its args are `event` plus any `props`, each with its type if it says, e.g. `Card` for `with a card`.
   */
  getNestedScopeForMatch(match: P.MatchFor<this>) {
    const { props } = match.groups
    const args: P.ScopeVariableProps[] = [{ name: "event" }]
    // `WithPropsArg`'s own `parse()` (in methods) stashes its prop `P.ASTVariableExpression`s
    // directly on `match.data.props`:  narrow via `is()` to read them typed, not the generic `props` group
    if (props?.is(WithPropsArg)) {
      for (const { name, datatype } of props.data.props ?? []) {
        args.push({ name, datatype: typeof datatype === "string" ? datatype : undefined })
      }
    }
    args.push(...this.eventProps(match))
    // a template's handler:  `it` / `its` are the thing, as in its other methods
    const subject = P.SubjectScope.of(match.scope)?.subjectType
    const methodScopeProps: P.MethodScopeProps = {
      parentScope: match.scope,
      name: On.eventNameOf(match),
      args,
      declaredBy: match,
      ...(subject
        ? { thisVar: subject.instanceName, mapItTo: "this", itDatatype: SP.typeName(subject.name) }
        : this.itWithNoSubject(match))
    }
    return new P.MethodScope(methodScopeProps)
  }

  getAST(match: P.MatchFor<this>) {
    const { props } = match.groups
    const body = this.getBody(match)
    // event variable
    const event = new P.ASTVariableExpression(match, { name: "event", type: "argument" })
    // Use the `raw` eventName, dashes are ok!
    const args: P.ASTExpression[] = [new P.ASTQuotedExpression(match, On.eventNameOf(match))]
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
      const own = this.eventProps(match)
      if (own.length) {
        method.body.statements!.unshift(
          new P.ASTDestructuredAssignment(match, {
            thing: event,
            variables: own.map(
              ({ name, datatype }) => new P.ASTVariableExpression(match, { name, datatype: datatype as string })
            ),
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

  /** What a rule on this one names its event:  `undefined`, as its words say. */
  ownEventName(_match: P.MatchFor<On>): string | undefined {
    return undefined
  }

  /** What a rule on this one reads off its event, as if it said `with` them. */
  eventProps(_match: P.MatchFor<On>): P.ScopeVariableProps[] {
    return []
  }

  /** What `it` is at a file's top, for a rule on this one that says. */
  itWithNoSubject(_match: P.MatchFor<On>): Pick<P.MethodScopeProps, "mapItTo" | "itDatatype"> {
    return {}
  }

  /** A template's handler's method name, by spell's names:  `on_mouse_down` for `on mouse down`. */
  static handlerName(match: P.MatchFor<On>): string {
    return `on_${On.eventNameOf(match).replace(/-/g, "_")}`
  }

  /**
   * The event's name, dashed:  `card-click` for `on card click`;
   * a passive `when` says its event by meaning, `double-click` for `when double clicked` (`passive_event`);
   * a property's change, `high-score-change` for `when its high score changes` (`changed_property`).
   */
  static eventNameOf(match: P.MatchFor<On>): string {
    const own = (match.rule as On).ownEventName(match)
    if (own) return own
    const { eventName, passive, changed } = match.groups
    if (passive) return `${Wording.meaningOf(passive)}`.replace(/_/g, "-")
    if (changed) return `${`${changed.value}`.replace(/_/g, "-")}-change`
    return `${eventName!.raw}`
  }
}
