import { P } from "spell-lang/parser"

/**
 * Words which may never be a one-word name (a variable, type, constant or loose property), so they stay
 * spell's own words.
 * - Shared by `SpellType`, `SpellConstant`, `SpellIdentifier` and `Property` (all `P.Pattern` subclasses).
 * - SLIM on purpose (epic `spanish` P2):  only the words whose removal changes what something compiles to,
 *   each with the reason.
 *   - Found by dropping each word in turn and recompiling every rule test and fixture project:
 *     `identifierBlacklist.analysis.test.ts`, in `tests/spell/src/rules/` (run with `BLACKLIST_ANALYSIS=1`).
 *   - It held 105 English words before;  the rest changed nothing, as the rules already read their own words first.
 * - A new word goes in only with a failing test that shows why.
 * - English only:  a translation brings its own list (epic `spanish` P3).
 */
export const identifierBlacklist: P.IdentifierBlacklist = {
  // `bank account is a thing`:  a type's words stop at `is`;  `the last card of the deck` isn't `is` read as a name
  is: 1,
  // `if` as a type, variable or constant would shadow the `if` statement
  if: 1,
  // `the foo of the bar`:  `the` starts a read, never names one;  the solitaire fixtures depend on it
  the: 1,
  // `biggest in prices`:  `in` ends the name before the list
  in: 1,
  // `largest of the prices`, `name of`:  `of` ends the name before what it's of
  of: 1,
  // `fire event card click with card = 1`:  `with` starts the event's details
  with: 1,
  // `set y to ...`:  `to` starts the value;  a name of several words can't hold it
  to: 1,
  // `its "with jokers" is yes or no`:  the choice's words, never a name;  outline-solitaire depends on it
  no: 1
}
