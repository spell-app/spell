import { P } from "spell/parser/parser"
import { Wording } from "spell/parser/spell/rules/expressions"

/**
 * What `alert`, `warn` and `confirm` hand the core after their message (epic `language` T143, T144).
 * - Only buttons written:  their texts, one by one, as before titles and sizes came in,
 *   so `alert "Yo!" with "yep"` still compiles to `core.alert("Yo!", "yep")`.
 * - A title or a size written:  ONE options object, the buttons in it too,
 *   e.g. `core.alert("You won!", { title: "Solitaire", size: "big", okText: "New game" })`.
 * - `size` is its word rule's MEANING (`text_size`), so `en texto grande` compiles as `in big text` does.
 */
export function dialogArguments(match: P.Match, groups: DialogGroups): P.ASTExpression[] {
  const { message, title, size, okButton, cancelButton } = groups
  const expression = (group: P.AnyMatch) => P.asAST<P.ASTExpression>(group.AST)
  const args = [expression(message)]
  const sizeWord = Wording.meaningOf(size)
  if (!title && !sizeWord) {
    if (okButton) args.push(expression(okButton))
    if (cancelButton) args.push(expression(cancelButton))
    return args
  }
  const options = new P.ASTObjectLiteral(match)
  if (title) options.addProp("title", expression(title))
  if (sizeWord) options.addProp("size", new P.ASTStringLiteral(match, { value: sizeWord, quote: '"' }))
  if (okButton) options.addProp("okText", expression(okButton))
  if (cancelButton) options.addProp("cancelText", expression(cancelButton))
  args.push(options)
  return args
}

/** The groups a dialog statement matched, each optional but its message. */
export type DialogGroups = {
  /** what it says */
  message: P.AnyMatch
  /** `titled "Solitaire"`:  its heading */
  title?: P.AnyMatch
  /** `in big text`:  its message's size (`text_size`) */
  size?: P.Match
  /** `with "New game"`:  the ok button's words */
  okButton?: P.AnyMatch
  /** `confirm`'s `... and "Not now"`:  the cancel button's words */
  cancelButton?: P.AnyMatch
}

/** The sizes a dialog's message may be, Spell UI's size words:  `text_size`'s meanings. */
export const TEXT_SIZES = ["small", "big", "huge"]
