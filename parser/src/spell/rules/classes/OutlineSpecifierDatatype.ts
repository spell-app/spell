import { proto } from "spell-kit/util"
import { TypeSpecifierDatatype } from "./TypeSpecifierDatatype"

/** `outline_specifier_datatype` rule:  `a number` -- see `outline_specifier_enum`. */
export class OutlineSpecifierDatatype extends TypeSpecifierDatatype {
  @proto static alias = "outline_specifier"
}
