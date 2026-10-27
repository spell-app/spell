import { proto } from "spell/util"
import { P } from "spell-parser/parser"
import { SpellJSX } from "./SpellJSX"

/**
 * `jsxFragment` rule:  several elements drawn side by side, with no element around them, `<>...</>`.
 * - e.g. `<><a/><b/></>`
 * - So a `to draw` can return two elements:
 *
 *   ```spell
 *   to draw a game:
 *     return <>
 *       <ui-container>...</ui-container>
 *       <ui-grid>...</ui-grid>
 *     </>
 *   ```
 *
 * - Or IMPLICIT:  elements written one after another are one fragment, as if wrapped in `<>...</>`.
 *   - `return <ui-container>...</ui-container>`, then `<ui-grid>...</ui-grid>` on the line below
 *   - On the same line, or the next lines, indented at least as far as the line the first one starts on:
 *     see `P.Tokenizer.matchJSXElements()`.
 * - `P.JSXFragmentToken` does the tokenizing;  its children are parsed as an element's are (`SpellJSX.parse()`).
 * - Compiles to a list of its children in javascript, `[h("a"), h("b")]`, as Solid's `h()` takes a fragment;
 *   `<>...</>` in TypeScript:  see `P.JSWriter`, `P.TSWriter`.
 */
export class SpellJSXFragment extends SpellJSX {
  static ruleName = "jsxFragment"
  @proto static tokenType = P.JSXFragmentToken

  /** `P.ASTJSXFragment`, of its children. */
  getAST(match: P.MatchFor<this>) {
    return new P.ASTJSXFragment(match, { children: this.childASTs(match) })
  }
}
