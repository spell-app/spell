/**
 * English's own small words:  the tables spell's rules read while parsing English (epic `spanish` P3).
 * - Each language pack has its own, of the same shape:  `SP.LanguageWords`.
 * - Rules read the language in play, `SP.Language.active.words`, never these directly.
 */
import type { SP } from "spell-lang/spell"

/** English's words:  see `SP.LanguageWords` for what each list is for. */
export const englishWords: SP.LanguageWords = {
  /**
   * Words which may never be a one-word name (a variable, type, constant or loose property), so they stay spell's.
   * - SLIM on purpose (epic `spanish` P2):  only the words whose removal changes what something compiles to,
   *   each with its reason.
   *   - Found by dropping each word in turn and recompiling every rule test and fixture project:
   *     `identifierBlacklist.analysis.test.ts`, in `tests/spell/rules/` (run with `BLACKLIST_ANALYSIS=1`).
   *   - It held 105 English words before;  the rest changed nothing, as the rules already read their own words first.
   * - A new word goes in only with a failing test that shows why.
   */
  blacklist: {
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
  },

  /**
   * Words which end a run of `member_words`:  spell's structural words, never part of a member's name.
   * - e.g. `of` ends `the short rank of`, `as` ends `a card has short rank as text`,
   *   `is` a test, `and` a list, `where` / `whose` / `with` / `for` / `from` / `in` / `to` a clause.
   * - Anything not a word ends a run too, e.g. `+`, `:`, `,` or a number.
   */
  memberStopWords: new Set([
    "of",
    "the",
    "a",
    "an",
    "is",
    "isnt",
    "are",
    "was",
    "has",
    "have",
    "in",
    "to",
    "and",
    "or",
    "if",
    "where",
    "as",
    "with",
    "whose",
    "for",
    "from",
    "then",
    "else",
    "otherwise",
    "not",
    "into",
    "on",
    "by",
    "at"
  ]),

  /**
   * Stop words which may still START a member's name,
   * e.g. `with jokers` in `a deck has with jokers as yes or no`, `in play`, `on top`.
   */
  memberLeadingWords: new Set(["with", "for", "from", "in", "on", "by", "at", "into"]),

  /**
   * Little words a method's name may not END a phrase with, where its receiver's type was:
   * the name keeps the type's name after one (epic `output-targets`, Q44).
   * - `to update the total of (a calculator)` => `update_the_total_of_calculator`
   * - Prepositions only:  a verb's own little words (`up`, `over`, `out`) read fine without the type:
   *   `to pick up (a card)` => `pick_up`.
   */
  danglingWords: new Set([
    "of",
    "to",
    "from",
    "in",
    "into",
    "on",
    "onto",
    "at",
    "by",
    "for",
    "with",
    "without",
    "before",
    "after",
    "about",
    "under",
    "through",
    "between",
    "within",
    "upon",
    "against",
    "toward",
    "towards"
  ]),

  /** Words which end a type's name of several words:  `aka`, as in `a bank account aka account is a thing`. */
  typeNameStopWords: new Set(["aka"])
}
