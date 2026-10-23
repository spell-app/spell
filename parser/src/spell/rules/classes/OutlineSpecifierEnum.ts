import { proto } from "spell/util"
import { TypeSpecifierEnum } from "./TypeSpecifierEnum"

/**
 * `outline_specifier_enum` rule:  the `type_specifier`s again, without their `as`,
 * for an outline body's `its "suit" is ...`:
 * - `one of clubs, diamonds` / `either up or down` -- `outline_specifier_enum`
 * - `a number`, `an automobile` -- `outline_specifier_datatype`
 * - `yes or no` -- `outline_specifier_yes_or_no`
 * - Their own alias, `outline_specifier`, so `a card has a suit one of ...` (no `as`) stays an error.
 */
export class OutlineSpecifierEnum extends TypeSpecifierEnum {
  @proto static alias = "outline_specifier"

  /**
   * Without `either` / `one of` (no word before its list), two or more values joined by `or`,
   * e.g. `up or down` (epic page Q4's comparison):  one value alone, `its "x" is total`, stays a getter.
   * - See `TypeSpecifierEnum.parse()`.
   */
  @proto static wordsBeforeBareList = 0
}
