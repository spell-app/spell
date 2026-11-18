/**
 * English's own small words:  the tables spell's rules read while parsing English (epic `spanish` P3).
 * - Each language pack has its own, of the same shape:  `SP.LanguageWords`.
 * - Rules read the language in play, `SP.Language.active.words`, never these directly.
 */
import type { SP } from "spell/parser/spell"

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
  /** Little words an action's title writes in lower case, unless first:  `Put Card on Pile`, `Compile and Run`. */
  titleSmallWords: new Set([
    "a",
    "an",
    "the",
    "and",
    "or",
    "on",
    "in",
    "to",
    "of",
    "with",
    "for",
    "at",
    "by",
    "from",
    "into",
    "onto"
  ]),

  lastListWords: { default: "last" },

  verbsForDoing: (doing) => {
    if (!/..ing$/i.test(doing)) return []
    const base = doing.slice(0, -3)
    const verbs = [base, `${base}e`]
    // putting => put, dying => die
    if (/([^aeiou])\1$/i.test(base)) verbs.push(base.slice(0, -1))
    if (/y$/i.test(base)) verbs.push(`${base.slice(0, -1)}ie`)
    return verbs
  },

  errorNames: {
    "not found": "not found",
    "not authorized": "not authorized",
    "not permitted": "not permitted",
    "out of date": "out of date",
    "server not found": "server not found",
    limit: "limit",
    offline: "offline",
    anything: "anything"
  },

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
  typeNameStopWords: new Set(["aka"]),

  /** The word between a list and what it holds:  `list of cards`. */
  listOfWord: "of",
  savedTimeWords: { created: "created", modified: "modified" },
  // `closing`, `opening`:  an event still happening, which a handler can cancel (`send`, epic `elemental-spell` P9)
  ongoingEventName: /ing$/,
  // the app's own actions, as a menu names them (`define_menu`, epic `elemental-spell` P10)
  appActions: { undo: "undo", redo: "redo" },
  // `<action>`'s own attribute:  a button showing only its icon (`action_button`, epic `language` P53)
  iconOnlyAttribute: "icon-only",
  // an example on a page, in a drawing (`example_block`, epic `elemental-spell` P16)
  exampleTag: "example",
  // an app\'s widget defaults, sample tags (`ui_defaults`, epic `language` P29):  Spell UI\'s word, in every language
  defaultsTag: "ui-defaults",

  /**
   * Spell's own old words, each an error naming its new one:
   * - a view's parts are slots (epic `elemental-spell` P27)
   * - waiting is the default, so nothing says it (epic `language` P13)
   */
  retiredWords: {
    parts: "slots",
    animation: "to",
    "create animation": "to",
    await: "",
    "wait for": ""
  },
  /** A process was once also an animation. */
  retiredRuleWords: {
    start_process: { animation: "process" },
    stop_process: { animation: "process" },
    check_process: { animation: "process" }
  },

  /** The line saying a thing has an ability:  what `DragAndDrop`'s warning for the old words says to write. */
  abilityLines: {
    draggable: "it is draggable",
    droppable: "it is droppable",
    selectable: "it is selectable",
    clickable: "it is clickable"
  },

  /** A page's words (epic `language` P47):  its head, `"button api" is a notebook page`, and its body's tags. */
  page: {
    prefix: "spell",
    page: "page",
    // its flags:  a page that draws in place, editable (epic `notebook` P1), and one locked against edits
    flags: { notebook: "notebook", locked: "locked" },
    controls: {
      if: "if",
      "otherwise if": "otherwise if",
      "else if": "otherwise if",
      otherwise: "otherwise",
      else: "otherwise",
      "for each": "for each",
      for: "for each",
      loading: "for waiting",
      empty: "for none",
      failed: "for failed"
    },
    forAttributes: {
      title: "title",
      loading: "loading",
      empty: "empty",
      "hide-empty": "hide-empty",
      failed: "failed",
      paging: "paging",
      "page-size": "page-size",
      as: "as"
    },
    forFlagsNotAfter: ["is", "are", "not", "isn't", "aren't"],
    forListWords: ["its", "every", "all", "the", "my", "their", "these", "those"],
    plainPage:
      /^"(?<name>[^"\n]+)"[ \t]+is[ \t]+an?[ \t]+(?<flags>(?:[\p{L}-]+[ \t]+)*?)page(?=[ \t]*(?:\/\/[^\n]*)?$)/imu,
    // the line each reads as -- see `SP.PageTwinWords`
    twins: {
      page: "{words} is a page :",
      draw: "to draw it :",
      pageLocked: "its lock is locked",
      pageSection: {
        tag: "section",
        label: "label",
        defaults: { sticky: "stack", collapsible: true, dividing: true, level: "2" }
      },
      controls: {
        if: "if {phrase}",
        "otherwise if": "otherwise if {phrase}",
        otherwise: "otherwise",
        "for each": "for {phrase}",
        "for waiting": "while waiting :",
        "for none": "if there are none :",
        "for failed": "if that fails :"
      },
      forTag: {
        waiting: "while waiting :",
        none: "if there are none :",
        failed: "if that fails :",
        failedSay: "if that fails say",
        items: "show them in :",
        whole: "show it all in :",
        inPages: "show them in pages",
        allAtOnce: "show them all",
        atATime: "show them {size} at a time",
        no: "no",
        pages: "pages",
        none_: "none",
        table: "table",
        row: "row",
        nothingFound: "Nothing found"
      }
    }
  },

  /** The kind of a property's values:  `card suit`, from a card's `its "suit" is one of ...`. */
  propertyKindName: "{type} {property}",

  /** How a file's raw text declares things, found before it's parsed -- see `SP.DeclarationPatterns`. */
  declarations: {
    /**
     * A line declaring a type, its name captured.
     * - The name may be quoted, `a "card" is a thing`, and the line bulleted, `- a card is a thing`.
     * - Its groups, in order:
     *   1. a one-word name
     *   2. a name of several words, before `is a` / `is an` or `aka`,
     *      quoted too:  `a "card in play" is a thing`
     *   3. `create a type ...`'s name
     *   4. a one-of-a-kind app's name, `solitaire is an app`
     */
    typeDeclaration:
      /^[ \t]*(?:-[ \t]+)?(?:an?[ \t]+["']?([\p{L}\p{M}\d_-]+)["']?[ \t]+is\b|an?[ \t]+["']?((?:(?!(?:is|aka)\b)[\p{L}\p{M}\d_-]+[ \t]+){1,3}(?!(?:is|aka)\b)[\p{L}\p{M}\d_-]+)["']?[ \t]+(?:is[ \t]+an?|aka)\b|create[ \t]+a[ \t]+type[ \t]+(?:named|called)[ \t]+([\p{L}\p{M}\d_-]+)|(?!(?:an?|its?|the)\b)((?:(?!is\b)[\p{L}\p{M}\d_-]+[ \t]+){0,3}(?!is\b)[\p{L}\p{M}\d_-]+)[ \t]+is[ \t]+an[ \t]+app\b)/gimu,
    /**
     * A line naming its kind, its groups an article (if any), its name and its kind's words, up to 4 of each:
     * `a "card game" is an app`, `klondike is a card game:`, `high scores is a score page where:`.
     * - The kind ends at `where`, `with`, a `:` or the line's end.
     */
    kindDeclaration:
      /^[ \t]*(?:-[ \t]+)?(an?[ \t]+)?(?!(?:its?|the|an?)[ \t])["']?((?:(?!(?:is|aka)\b)[\p{L}\p{M}\d_-]+[ \t]+){0,3}(?!(?:is|aka)\b)[\p{L}\p{M}\d_-]+)["']?(?:[ \t]+aka[ \t]+["']?[\p{L}\p{M}\d_-]+["']?)?[ \t]+is[ \t]+an?[ \t]+((?:[\p{L}\p{M}\d_-]+[ \t]+){0,3}?[\p{L}\p{M}\d_-]+)(?=[ \t]*(?:where\b|with\b|:|,|$))/gimu,
    /** An ability's word beside a type's kind, e.g. `draggable`:  as `draggable_or_droppable` reads it. */
    abilityWord: /^(?:draggable|droppable|selectable|clickable)$/iu,
    /** A line declaring a value kind, its PLURAL name captured, e.g. `suits` in `- "suits" as one of ...`. */
    valueKindDeclaration: /^[ \t]*(?:-[ \t]+)?["']([\p{L}\p{M}\d_-]+)["'][ \t]+as[ \t]+(?:one[ \t]+of|either)\b/gimu,
    /**
     * A body's line declaring a property with a list of values, its words captured (group 1, or 2 after `has`):
     * `- its "suit" is one of ...`, `- "suit" is either ...`, `- it has a suit as one of ...`.
     * - Not a value kind's `- "suits" as one of ...`:  `as` only after `has`.
     */
    propertyListDeclaration:
      /^[ \t]+(?:-[ \t]+)?(?:(?:its[ \t]+)?["']?((?:[\p{L}\p{M}\d_-]+[ \t]+){0,3}?[\p{L}\p{M}\d_-]+)["']?[ \t]+(?:is|are)|(?:it[ \t]+)?has[ \t]+(?:an?[ \t]+)?["']?((?:[\p{L}\p{M}\d_-]+[ \t]+){0,3}?[\p{L}\p{M}\d_-]+)["']?[ \t]+as)[ \t]+(?:one[ \t]+of|either)\b/iu,
    /** A body's line declaring a property, its words in group `has` or `is`:  `it has a deck as a deck`, `its "suit" is a suit`. */
    propertyLine:
      /^(?:(?:it[ \t]+)?has[ \t]+(?:an?[ \t]+(?:property[ \t]+)?)?["']?(?<has>(?:[\p{L}\p{M}\d_-]+[ \t]+){0,3}?[\p{L}\p{M}\d_-]+)["']?[ \t]*(?:$|:|as\b|=)|(?:its[ \t]+)?["']?(?<is>(?:[\p{L}\p{M}\d_-]+[ \t]+){0,3}?[\p{L}\p{M}\d_-]+)["']?[ \t]+(?:is|are)\b)/iu,
    /** A line at a file's top declaring a property, in groups `type` and `property`. */
    typePropertyLines: [
      /^an?[ \t]+(?<type>(?:[\p{L}\p{M}\d_-]+[ \t]+){0,3}?[\p{L}\p{M}\d_-]+)[ \t]+has[ \t]+(?:an?[ \t]+(?:property[ \t]+)?)?["']?(?<property>(?:[\p{L}\p{M}\d_-]+[ \t]+){0,3}?[\p{L}\p{M}\d_-]+)["']?[ \t]*(?:$|:|as\b|=)/iu,
      /^(?<type>(?:[\p{L}\p{M}\d_-]+[ \t]+){0,3}?[\p{L}\p{M}\d_-]+)[ \t]+have[ \t]+(?:an?[ \t]+(?:property[ \t]+)?)?["']?(?<property>(?:[\p{L}\p{M}\d_-]+[ \t]+){0,3}?[\p{L}\p{M}\d_-]+)["']?[ \t]*(?:$|:|as\b|=)/iu,
      /^the[ \t]+["']?(?<property>(?:[\p{L}\p{M}\d_-]+[ \t]+){0,3}?[\p{L}\p{M}\d_-]+)["']?[ \t]+of[ \t]+an?[ \t]+(?<type>(?:[\p{L}\p{M}\d_-]+[ \t]+){0,3}?[\p{L}\p{M}\d_-]+)[ \t]+(?:is|are)\b/iu
    ],
    /** A line starting a method:  `to play a card`, `animation deal`. */
    methodLine: /^(?:to|(?:create[ \t]+)?animation)[ \t]/iu,
    /** A type's question, up to its body:  `it "can go up" if`, `a card "can go up" if`. */
    questionLine: /^(?:an?[ \t]+[^"\n]*?[^\s"][ \t]+|it[ \t]+)?"[^"\n]+"(?:[ \t]+(?:if|is)(?=[ \t:]|$))?(?:[ \t]*:)?/iu,
    /** A place's line, its name captured:  `family cookbook is a web server at "...":`. */
    placeDeclaration:
      /^(?!(?:an?|its?|the)[ \t])((?:[\p{L}\p{M}\d_-]+[ \t]+){0,3}[\p{L}\p{M}\d_-]+)[ \t]+is[ \t]+an?[ \t].*[ \t](?:at|from)[ \t]+["'][^"']*["'][ \t]*:?[ \t]*$/iu,
    /** A line re-opening a type, its name captured:  `a solitaire:`, `a card where:`, `a pile` (its colon left out, P48). */
    reopenedType: /^an?[ \t]+([\p{L}\p{M}\d_-]+(?:[ \t]+[\p{L}\p{M}\d_-]+){0,3})[ \t]*(?:(?:where[ \t]*)?:)?[ \t]*$/iu
  },

  /**
   * `which are face up` reads as `it is face up`, after a list (`where_or_which`):
   * each clause's plural verb made singular, the first and the first after `and` / `or`.
   * - `aren't` and its kind with their `'`, as spell's words split them (`SpellStatement.singularVerbAt()`).
   */
  whichClause: {
    subject: "it",
    joins: new Set(["and", "or"]),
    singularVerbs: {
      are: "is",
      arent: "isnt",
      "aren't": "isn't",
      have: "has",
      havent: "hasnt",
      "haven't": "hasn't",
      do: "does",
      dont: "doesnt",
      "don't": "doesn't"
    }
  },

  /** `it`, `its`, `them`:  drawn plain in the bubbly look, never bold (`SP.BubblyLayout`). */
  pronouns: new Set(["it", "its", "them", "they", "their"])
}
