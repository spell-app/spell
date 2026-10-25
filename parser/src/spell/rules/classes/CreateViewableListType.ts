import { proto } from "spell/util"
import type { P } from "spell-parser/parser"
import { SpellType } from "spell-parser/spell/rules/types"
// Import directly to avoid circular import
import { CreateListType } from "./CreateListType"

/**
 * `create_viewable_list_type` rule:  `a pile is a viewable list of cards` --
 * `create_list_type`, extending `ViewableList`.
 * - A list drawn as its own custom element, its items inside it (epic `drawable-thing`).
 * - Everything else as `create_list_type`:  its item type, a short name, an outline body.
 * - Its old words, `a drawable list of`, still read:  an error naming the new ones -- see `SpellType.noteRetiredLiterals()`.
 */
export class CreateViewableListType extends CreateListType {
  @proto static listType: P.Datatype = "viewable list"

  /** As `create_list_type`'s, noting the old words if the line says them. */
  parse(scope: P.Scope, tokens: P.Token[]): P.Match | undefined {
    const match = super.parse(scope, tokens)
    return match && SpellType.noteRetiredLiterals(match)
  }
}
