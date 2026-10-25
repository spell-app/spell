import { proto } from "spell/util"
import { P } from "spell-parser/parser"
import { SP } from "spell-parser/spell"
import { Priority } from "spell-parser/spell/rules/rules.types"
import { WithPropsArg } from "spell-parser/spell/rules/methods"
// Import directly to avoid circular import
import { SpellStatement } from "spell-parser/spell/rules/Statement"

/**
 * `declare_event` rule:  says an event a template's things SEND, and what comes with it (epic `elemental-spell` P5).
 * - e.g. `- it sends "flipped" with a side as a direction`, in a two sided view's outline
 * - e.g. `a card sends "card flipped" with a side`, the sentence style
 * - Spellx's `<event "flipped" side="direction" />` says the same (J3).
 * - Its name in quotes, as a name being taught is:  several words are one event, dashed, `card-flipped`,
 *   the event `send card flipped` sends.
 * - Sending it stays as it was:  `send flipped with side = its direction` (`trigger`).
 * - Nothing runs from it yet:  it's what the event phase (P9) builds on, and documents the template.
 * - Compiles to its description, after the class:  `core.describeEvent(Card, "flipped", { params: { side: "direction" } })`.
 */
export class DeclareEvent extends SpellStatement<"type|event|props?"> {
  @proto static priority = Priority.declaration
  @proto static alias = "statement"
  @proto static declares: P.DeclaresSpec = { kind: "event", name: "event", of: "type" }

  getAST(match: P.MatchFor<this>): P.ASTTypeDescription {
    const { type, event, props } = match.groups
    const params: Record<string, string> = {}
    if (props?.is(WithPropsArg)) {
      for (const { name, datatype } of props.data.props ?? []) {
        params[name] = typeof datatype === "string" ? datatype : ""
      }
    }
    return new P.ASTTypeDescription(match, {
      type: SP.typeName(`${type.value}`),
      describes: "event",
      name: DeclareEvent.eventNameOf(event),
      description: Object.keys(params).length ? { params } : {}
    })
  }

  /** The event's name, its words in quotes dashed and lowercase:  `"card flipped"` => `card-flipped`. */
  static eventNameOf(event: P.Match): string {
    const [token] = event.tokens
    const words = token instanceof P.TextToken ? token.innerText : `${event.value}`
    return words.trim().toLowerCase().split(/\s+/).join("-")
  }
}
