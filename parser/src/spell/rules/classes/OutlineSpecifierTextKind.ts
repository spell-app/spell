import { proto } from "spell-kit/util"
import { TypeSpecifierTextKind } from "./TypeSpecifierTextKind"

/**
 * `outline_specifier_text_kind` rule:  in an outline line, makes a property text that must be a url or an email.
 * - e.g. `- its email is an email`
 * - As `type_specifier_text_kind`, without its `as`.
 */
export class OutlineSpecifierTextKind extends TypeSpecifierTextKind {
  @proto static alias = "outline_specifier"
}
