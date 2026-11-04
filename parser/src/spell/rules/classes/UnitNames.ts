import { P } from "spell/parser/parser"

/**
 * `unit_names` rule:  a unit's name, then each other name it goes by:  `"centimeter", aka "cm"` (epic `language` P23).
 * - Each a quoted text, so a mark reads too:  `aka "'"`, `aka "\""` (its backslash taken off).
 */
export class UnitNames extends P.Sequence<"names"> {
  /** The names, as written, inside their quotes:  `["centimeter", "cm"]`. */
  static namesOf(match: P.Match): string[] {
    const names = match.groups.names as P.Match
    return names.matched
      .filter((item): item is P.Match => item instanceof P.Match && item.tokens[0] instanceof P.TextToken)
      .map((item) => (item.tokens[0] as P.TextToken).innerText.replace(/\\(.)/g, "$1"))
  }
}
