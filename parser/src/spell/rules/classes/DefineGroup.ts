import { proto } from "spell/util"
import { P } from "spell-parser/parser"
import { Priority } from "spell-parser/spell/rules/rules.types"
// Import directly to avoid circular import
import { SpellStatement } from "spell-parser/spell/rules/Statement"

/**
 * `define_group` rule:  a GROUP of a template's members, a heading in its outline (epic `elemental-spell` P16).
 * - e.g. `- group "direction"   // Face up or face down`;  Spanish's `- grupo "dirección"`
 * - spellx's twin:  `<group "direction" description="Face up or face down"/>`.
 * - The members after it, up to the next group, are its members, as text sits under a heading:
 *   a member before any group is in none.
 *   - A spellx member written away from its group says so, `group="direction"`:  its twin opens that group again
 *     just above it, and the one it's among again below it (`SP.SpellxTwin`).
 * - What reads groups:  the notebook draws a group's members together, under its name and description;
 *   the property editor can, from the file's chunk tree (`SX.SpellxFile.groupsOf()`).
 * - Compiles to nothing:  a group says how a template is laid out for people, not what it does.
 * - Only in a template's outline:  `{type:subject_implied}` is the template its line is in.
 */
export class DefineGroup extends SpellStatement<"type|group"> {
  @proto static priority = Priority.declaration
  @proto static alias = "statement"

  /** The group's name, as written:  `direction`. */
  static nameOf(match: P.MatchFor<DefineGroup>): string {
    return `${match.groups.group.raw}`.trim().replace(/^["']|["']$/g, "")
  }

  getAST(match: P.MatchFor<this>): P.ASTStatementGroup {
    return new P.ASTStatementGroup(match, { statements: [] })
  }
}
