import { proto } from "spell/util"
import { P } from "spell/parser/parser"
// Import directly to avoid circular import
import { SpellStatement } from "spell/parser/spell/rules/Statement"
import { Wording } from "spell/parser/spell/rules/expressions"

/**
 * `notify` rule:  tells the person something for a moment, in a toast, e.g. `notify "Saved!"`.
 * - e.g. `notify success "Saved!" titled "Done" at the top right for 5 seconds with a progress bar`
 * - Every clause after the message is optional, in this order:
 *   - a kind first, before the message:  `success`, `error`, `warning`, `info` (word rule `notify_kind`)
 *   - `titled "Better?"`:  a bold first line
 *   - `in red`, `in inverted blue`:  its colour (word rule `toast_color`)
 *   - `at the top left`, `in the center` ...:  where on the screen (word rule `toast_position`)
 *   - `for 5 seconds` (any `pause_units`), or `until clicked`
 *   - `with a progress bar`, `... at the top`, `... filling up`:  a bar counting down (word rule `toast_progress`)
 *   - `side by side`:  toasts there line up in a row
 *   - `without pausing`:  the countdown keeps running under the pointer
 *   - `with "Got it"`:  a button that closes it;  it stays until closed
 *   - `and wait`:  waits until it's gone
 * - Compiles to `core.notify(message, options)`, the options only the clauses written,
 *   `await`ed only with `and wait`:  a toast is never waited for otherwise.
 */
export class Notify extends SpellStatement<"kind?|message|title?|inverted?|color?|position?|time?|units?|untilClicked?|progress?|sideBySide?|keepRunning?|okButton?|waits?"> {
  @proto static alias = ["statement", "async"]

  getAST(match: P.MatchFor<this>) {
    const { message, title, time, units, untilClicked, progress, sideBySide, keepRunning, okButton, waits } =
      match.groups
    const options = new P.ASTObjectLiteral(match)
    const expression = (group: P.AnyMatch) => P.asAST<P.ASTExpression>(group.AST)
    const text = (value: string) => new P.ASTStringLiteral(match, { value, quote: '"' })

    if (title) options.addProp("title", expression(title))
    const classWords = this.classWords(match)
    if (classWords) options.addProp("class", text(classWords))
    const position = Wording.meaningOf(match.groups.position)
    if (position) options.addProp("position", text(position.replaceAll("_", " ")))
    if (time) {
      options.addProp("time", expression(time))
      options.addProp("units", text(Wording.meaningOf(units) ?? "seconds"))
    } else if (untilClicked) options.addProp("time", new P.ASTNumericLiteral(untilClicked, 0))
    const [bar, filling] = (Wording.meaningOf(progress) ?? "").split("_")
    if (bar) options.addProp("showProgress", text(bar))
    if (filling) options.addProp("progressUp", new P.ASTBooleanLiteral(progress!, true))
    if (sideBySide) options.addProp("horizontal", new P.ASTBooleanLiteral(sideBySide, true))
    if (keepRunning) options.addProp("pauseOnHover", new P.ASTBooleanLiteral(keepRunning, false))
    if (okButton) options.addProp("button", expression(okButton))

    const args = [expression(message)]
    if (options.properties.length) args.push(options)
    const notify = new P.ASTCoreMethodInvocation(match, { methodName: "notify", args })
    return waits ? new P.ASTAwaitExpression(match, { expression: notify }) : notify
  }

  /**
   * The toast's class words:  its kind, `inverted`, its colour -- `"success"`, `"inverted red"` -- or `undefined`.
   * - Each word is its word rule's MEANING, so `notificar éxito "..." en rojo` compiles as English does.
   */
  private classWords(match: P.MatchFor<this>): string | undefined {
    const { kind, inverted, color } = match.groups
    const words = [Wording.meaningOf(kind), inverted && INVERTED, Wording.meaningOf(color)].filter(Boolean)
    return words.length ? words.join(" ") : undefined
  }
}

/** Spell UI's class word for a dark toast, whatever word the language said it with. */
const INVERTED = "inverted"

/** The kinds a toast may be, Spell UI's consequence words:  `notify_kind`'s meanings. */
export const NOTIFY_KINDS = ["info", "success", "warning", "error"]

/** The colours a toast may be, Spell UI's hue names:  `toast_color`'s meanings. */
export const TOAST_COLORS = [
  "red",
  "orange",
  "yellow",
  "olive",
  "green",
  "teal",
  "blue",
  "violet",
  "purple",
  "pink",
  "brown",
  "grey",
  "black"
]

/** Where a toast may go, Spell UI's `position` with `_` for its space:  `toast_position`'s meanings. */
export const TOAST_POSITIONS = [
  "top_left",
  "top_center",
  "top_right",
  "centered",
  "bottom_left",
  "bottom_center",
  "bottom_right"
]

/** Where a toast's progress bar goes, and `_up` when it fills up instead of emptying:  `toast_progress`'s meanings. */
export const TOAST_PROGRESS = ["bottom", "top", "bottom_up", "top_up"]
