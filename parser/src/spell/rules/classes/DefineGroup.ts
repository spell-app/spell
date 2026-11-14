import { proto } from "spell/util"
import { P } from "spell/parser/parser"
import { Priority } from "spell/parser/spell/rules/rules.types"
// Import directly to avoid circular import
import { SpellStatement } from "spell/parser/spell/rules/Statement"

/**
 * `define_group` rule:  a GROUP of a template's members, a heading in its outline (epic `elemental-spell` P16).
 * - e.g. `- group "direction"   // Face up or face down`;  Spanish's `- grupo "dirección"`
 * - The members after it, up to the next group, are its members, as text sits under a heading:
 *   a member before any group is in none.
 * - What reads groups:  the notebook draws a group's members together, under its name and description.
 *   - The declarations note each member's group, and the words file lists a type's members by group:
 *     the Inspector's bands (epic `debut` P26;  `SP.SpellWords`).
 * - Compiles to nothing:  a group says how a template is laid out for people, not what it does.
 * - In a template's outline:  `{type:subject_implied}` is the template its line is in.
 * - Or at a file's top level, with no template (epic `language` P55, Q54):  `group "The piles"` is the same as
 *   the heading `## The piles` -- see `isFileHeading()`, which `Block` asks.
 */
export class DefineGroup extends SpellStatement<"type?|group|color?"> {
  @proto static priority = Priority.declaration
  @proto static alias = "statement"

  /** With no template, only outside every outline and action:  a heading's place. */
  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    const match = super.parse(scope, tokens) as P.MatchFor<this> | undefined
    if (!match || match.groups.type) return match
    for (let current: P.Scope | undefined = scope; current; current = current.parentScope) {
      if (current instanceof P.SubjectScope || current instanceof P.MethodScope) return undefined
    }
    return match
  }

  /** Is `match` a file's heading, `group "The piles"` at its top level, as `## The piles` is?  `Block` asks. */
  isFileHeading(match: P.Match): boolean {
    return !(match as P.MatchFor<DefineGroup>).groups.type
  }

  /** The group's name, as written:  `direction`. */
  static nameOf(match: P.MatchFor<DefineGroup>): string {
    return `${match.groups.group.raw}`.trim().replace(/^["']|["']$/g, "")
  }

  /**
   * The group its line opens, `rank`:  `Block` hands it to the members below it, for the declarations
   * (`SP.GroupRule`, epic `debut` P26).
   */
  groupName(match: P.Match): string {
    return DefineGroup.nameOf(match as P.MatchFor<DefineGroup>)
  }

  getAST(match: P.MatchFor<this>): P.ASTStatementGroup {
    return new P.ASTStatementGroup(match, { statements: [] })
  }
}
