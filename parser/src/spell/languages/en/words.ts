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
  // `closing`, `opening`:  an event still happening, which a handler can cancel (`send`, epic `elemental-spell` P9)
  ongoingEventName: /ing$/,
  // the app's own actions, as a menu names them (`define_menu`, epic `elemental-spell` P10)
  appActions: { undo: "undo", redo: "redo" },
  // a notebook's example, in a drawing (`example_block`, epic `elemental-spell` P16)
  exampleTag: "example",

  /** The old words for views, each an error naming its new word (epic `elemental-spell`, Q61). */
  retiredTypeWords: {
    drawable: "view",
    "drawable thing": "view",
    "drawable-thing": "view",
    "drawable list": "viewable list",
    "drawable-list": "viewable list"
  },
  /** Spell's own old words, each an error naming its new one (epic `elemental-spell` P27):  a view's parts are slots. */
  retiredWords: { parts: "slots" },

  /**
   * Spellx's words, the tag-shaped form of a spell file (epic `elemental-spell`):  see `SP.SpellxWords`.
   * - Template tags carry the prefix, `<spell-view>`;  everything inside them is a short word, `<property>` (Q37).
   */
  spellx: {
    prefix: "spell",
    templates: {
      view: "view",
      thing: "thing",
      page: "page",
      app: "app",
      "page-template": "page template",
      "app-template": "app template",
      // a page of prose, examples and its own templates (epic `elemental-spell` P16)
      notebook: "notebook"
    },
    declarations: {
      property: "property",
      alias: "alias",
      action: "action",
      draw: "draw",
      event: "event",
      test: "test",
      menu: "menu",
      // a heading over the members after it (epic `elemental-spell` P16)
      group: "group"
    },
    // a template's own property editor, as markup:  what the Inspector shows for its things (epic `debut` I86)
    notes: { description: "description", comment: "comment", "property-editor": "property editor" },
    handlers: {
      on: "on",
      when: "when",
      while: "while",
      // an ability's own tag (epic `debut` P27, Q47):  `<clickable when it is face down/>`
      draggable: "draggable",
      clickable: "clickable",
      selectable: "selectable",
      droppable: "droppable"
    },
    controls: {
      if: "if",
      "otherwise if": "otherwise if",
      "else if": "otherwise if",
      otherwise: "otherwise",
      else: "otherwise",
      "for each": "for each"
    },
    attributes: {
      name: "name",
      aka: "aka",
      template: "template",
      "one-of": "one-of",
      alias: "alias",
      description: "description",
      shortcut: "shortcut",
      "enabled-when": "enabled-when",
      "selected-when": "selected-when",
      "undone-as": "undone-as",
      icon: "icon",
      "menu-bar": "menu-bar",
      locked: "locked",
      // an action that may wait:  an animation (epic `debut` I97)
      animated: "animated",
      draggable: "draggable",
      droppable: "droppable",
      selectable: "selectable",
      clickable: "clickable",
      group: "group"
    },
    // code spell's twin of each tag:  the line it reads as (P6) -- see `SP.SpellxTwinWords`
    twins: {
      template: "{a name} {name} is {a super} {super} :",
      templateAka: "{a words} {words} aka {aka} is {a super} {super} :",
      singleton: "{words} is {a super} {super} :",
      supers: {
        view: "view",
        thing: "thing",
        page: "page",
        app: "app",
        "page template": "page",
        "app template": "app",
        notebook: "notebook"
      },
      property: {
        list: "its {name} is one of {one-of}",
        listBody: "its {name} is one of {one-of} :",
        body: "its {name} is :",
        value: "its {name} is",
        bare: "it has {a words} {words}"
      },
      propertyAlias: "it {quoted alias}",
      alias: "it {name}",
      aliasBlock: "it {name} :",
      action: "to {words} :",
      // an action that may wait, `<action "deal the cards" animated>` (epic `debut` I97)
      animation: "animation {words} :",
      actionDetails: {
        shortcut: "shortcut {shortcut}",
        "enabled-when": "enabled when {enabled-when}",
        "selected-when": "selected when {selected-when}",
        "undone-as": "undone as {quoted undone-as}",
        icon: "icon {quoted icon}"
      },
      test: "to test {words} :",
      event: "it sends {name}",
      eventWith: "with",
      eventParam: "{param} as {a value} {value}",
      eventAnd: "and",
      draw: "to draw it :",
      drawSlot: "to draw its {words} :",
      placeSlot: "draw its {words}",
      menu: "its {name} is a menu of",
      menuAnd: "and",
      menuBar: "its menu bar is {quoted menu-bar}",
      group: "group {name}",
      notebookContent: "to draw its content :",
      notebookLocked: "its lock is locked",
      viewFlags: {
        draggable: "it is draggable",
        droppable: "it is droppable",
        selectable: "it is selectable",
        clickable: "it is clickable"
      },
      start: "start {words}",
      handlers: {
        on: "on {phrase} :",
        when: "when {phrase} :",
        while: "while {phrase} :",
        draggable: "it is draggable {phrase} :",
        clickable: "it is clickable {phrase} :",
        selectable: "it is selectable {phrase} :",
        droppable: "it is droppable {phrase} :",
        "items draggable": "its {items} are draggable {phrase} :"
      },
      controls: {
        if: "if {phrase}",
        "otherwise if": "otherwise if {phrase}",
        otherwise: "otherwise",
        "for each": "for each {phrase}"
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
      /^[ \t]*(?:-[ \t]+)?(an?[ \t]+)?(?!(?:its?|the|an?)[ \t])["']?((?:(?!(?:is|aka)\b)[\p{L}\p{M}\d_-]+[ \t]+){0,3}(?!(?:is|aka)\b)[\p{L}\p{M}\d_-]+)["']?(?:[ \t]+aka[ \t]+["']?[\p{L}\p{M}\d_-]+["']?)?[ \t]+is[ \t]+an?[ \t]+((?:[\p{L}\p{M}\d_-]+[ \t]+){0,3}?[\p{L}\p{M}\d_-]+)(?=[ \t]*(?:where\b|with\b|:|$))/gimu,
    /** A line declaring a value kind, its PLURAL name captured, e.g. `suits` in `- "suits" as one of ...`. */
    valueKindDeclaration: /^[ \t]*(?:-[ \t]+)?["']([\p{L}\p{M}\d_-]+)["'][ \t]+as[ \t]+(?:one[ \t]+of|either)\b/gimu,
    /**
     * A body's line declaring a property with a list of values, its words captured (group 1, or 2 after `has`):
     * `- its "suit" is one of ...`, `- "suit" is either ...`, `- it has a suit as one of ...`.
     * - Not a value kind's `- "suits" as one of ...`:  `as` only after `has`.
     */
    propertyListDeclaration:
      /^[ \t]+-[ \t]+(?:(?:its[ \t]+)?["']?((?:[\p{L}\p{M}\d_-]+[ \t]+){0,3}?[\p{L}\p{M}\d_-]+)["']?[ \t]+(?:is|are)|(?:it[ \t]+)?has[ \t]+(?:an?[ \t]+)?["']?((?:[\p{L}\p{M}\d_-]+[ \t]+){0,3}?[\p{L}\p{M}\d_-]+)["']?[ \t]+as)[ \t]+(?:one[ \t]+of|either)\b/iu,
    /** A line starting a method:  `to play a card`, `animation deal`. */
    methodLine: /^(?:to|(?:create[ \t]+)?animation)[ \t]/iu,
    /** A line re-opening a type, its name captured:  `a solitaire:`, `a card where:`. */
    reopenedType: /^an?[ \t]+([\p{L}\p{M}\d_-]+(?:[ \t]+[\p{L}\p{M}\d_-]+){0,3})[ \t]*(?:where[ \t]*)?:[ \t]*$/iu
  }
}
