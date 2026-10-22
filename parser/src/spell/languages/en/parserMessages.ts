/**
 * What the parser says to the person WRITING a program, in English (epic `spanish` P17):
 * its warnings, its parse errors, why a rule refused a line, and the long forms editors show as "Reads as".
 * - Every other language's table has the same keys (`languages/<lang>/parserMessages.ts`);
 *   a key it lacks reads English, and `spell lang packs check` reports it.
 * - Read one in the scope's language:  `SP.Language.of(scope).parserMessage("dont-understand", { text })`.
 * - Each `{name}` is a param the code fills:  a sentence that names something takes it as a param,
 *   never glued from pieces, so each language words it its own way.
 *   - English uses some params, another language others:  `{type}` is `card`, `{aType}` is `a card`.
 *   - A placeholder with no param stays as written:  `{the score of the game}` is an example, not a param.
 * - Examples in them are spell, in the language's own words:  `set {name} to a new list of {items}`.
 * - The twin of the core's `CORE_MESSAGES`, what a program says to the person RUNNING it:
 *   those are copied into a project's words file, these never leave the parser.
 */

/** English's parser messages, by key:  every key there is. */
export const PARSER_MESSAGES = {
  ////////////////
  // ## Warnings:  `SP.SpellWarnings`
  ////////////////

  /** An article that doesn't agree with its noun, `a apple`:  `{phrase}` is the right one, `an apple`. */
  "did-you-mean": 'Did you mean "{phrase}"?',
  /** A method's parameter with no type, `(digit)`:  `{type}` is a guess, e.g. `text`, `a card`. */
  "untyped-parameter": 'Say what "{name}" is, e.g. "({name} as {type})"',
  /** A property declared with no type:  `{line}` is the line as written, `a calculator has an input`. */
  "untyped-property": 'Say what "{name}" is, e.g. "{line} as {type}"',
  /** A property declared as a list of nothing said:  `{line}` is the line up to its `as`. */
  "untyped-list-property": 'Say what "{name}" holds, e.g. "{line} as a new list of {items}"',
  /** A new variable set to a list of nothing said, `set state to []`. */
  "untyped-list-variable": 'Say what "{name}" holds, e.g. "set {name} to a new list of {items}"',
  /** A property a `set` declares, from a value that doesn't say what it is. */
  "untyped-set-property": 'Say what "{name}" is:  declare it, e.g. "{aType} has a {name} as {type}"',
  /** A read of a member its type never declares, `the name of the pile`. */
  "undeclared-member": '{AType} never says it has {aName}:  declare it, e.g. "{aType} has {aName} as {type}"',
  /** A property's rule (`must ...`) above the property it's about. */
  "rule-before-property": 'Declare "{name}" above its rule, e.g. "- it has a {name} as text"',
  /** An outline's getter which is only a value, `- score is 0`:  `{type}` is `example-number` ... */
  "always-the-same": '{name} is always {value}:  to give it a type, write "{name} is {type}"',
  /** `tableau T1` when two tableaus are named `T1`. */
  "named-twice": 'More than one {type} is named "{name}":  this finds the first one made',
  /** `the position of x`, with no list, where `x` isn't one of a value kind's values. */
  "position-not-a-kind": '"{text}":  a {kind} isn\'t a kind\'s value;  say which list, "... in ..."',
  /** A built-in type, as a warning's example writes it after `as`. */
  "example-text": "text",
  "example-number": "a number",
  "example-yes-or-no": "yes or no",

  ////////////////
  // ## Parse errors
  ////////////////

  /** A line, or part of one, no rule could read. */
  "dont-understand": 'Don\'t understand "{text}"',
  /** An outline's line (`it has ...`, `its "x" is ...`) outside a type's outline. */
  "outline-line-outside":
    '"it" and "its" mean a type only in its outline, indented under e.g. "a card is a thing where:"',
  /** A statement with a body on its own line AND one indented under it. */
  "inline-and-nested-body": "Got both inline statement and nested block",
  /** A dotted tag, `<UI.Form>`. */
  "not-an-element": "<{tag}> isn't an element:  write Spell UI's own tag, e.g. <ui-form>",
  /** A `{...}` in a `<markdown>` block that isn't spell. */
  "markdown-hole":
    'Don\'t understand "{{hole}}" in <markdown>:  a hole is spell, e.g. {the score of the game};  write \\{ for a brace',

  ////////////////
  // ## Refused lines:  `SP.SpellStatement.refuse()`
  ////////////////

  /** A property declared on a built-in type, `the length of a text is ...`. */
  "cant-add-to-built-in-type": "Can't add {property} to {type}:  it's built in, and every project shares it",
  /** What `{property}` is when the line names none. */
  "a-property": "a property",
  /** A property every thing has built in, `a person has an id as text`. */
  "cant-add-built-in-member": "Can't add {property} to {type}:  every thing has one, built in",
  /** A built-in property declared again with another type, `a pile has a name as number`. */
  "cant-retype-built-in-member":
    "Can't add {property} to {type} as {datatype}:  every {on} has one, built in, as {builtInType}",
  /** A line adding to a type nobody declares:  `{example}` is `example-type`. */
  "no-such-type": 'There\'s no type "{type}":  declare it, e.g. "{example}"',
  /** A type's declaration, as an example writes it. */
  "example-type": "a {type} is a thing",
  /** A list type's declaration, as an example writes it. */
  "example-list-type": "a {list} is a list of {items}",
  /** `it "is face up" is ...`:  a property, written as a phrase. */
  "property-starts-its": 'A property starts "its":  write its "{name}" is ...',
  /** A quoted phrase with nothing after it, `it "can move"`. */
  "phrase-without-body": "{phrase} has no body:  write {phrase} always, or {phrase} if ...",
  /** A quoted phrase with no blank, `it "is red" for its suits`. */
  "phrase-without-blank":
    '"{phrase}" has no blank:  put the word that varies in parens, e.g. "is a (suit)", or say when it\'s true, "{phrase}" if ...',
  /** A phrase's blank naming no property with a list of values. */
  "blank-without-values":
    '"({word})" names no property of a {type} with a list of values, e.g. its "suit" is one of clubs, diamonds, hearts or spades',
  /** `for its x`, where `x` has no list of values. */
  "source-without-values":
    '"its {name}" isn\'t a property of a {type} with a list of values, e.g. its "suit" is one of clubs, diamonds, hearts or spades',
  /** A version step for version 1. */
  "version-step-before-2": "A version step starts at version 2:  a file with no version is version 1",
  /** An upgrade to version 1. */
  "upgrade-before-2": "An upgrade starts at version 2:  a file with no version is version 1",
  /** A type declared with another type's short name. */
  "already-a-short-name": '"{name}" is already the short name of {type}',
  /** A short name that names another type. */
  "aka-names-a-type": '"{aka}" already names a type:  {type}',
  /** A type declared twice:  `{words}` as the line says it, `an account`;  `{where}` is `on-line` ... */
  "type-declared-twice": 'There\'s {words} already, {where}:  to add to it, write "{words}:"',
  "on-line": "on line {line}",
  "on-line-of-file": "on line {line} of {file}",
  /** `a thing is saved inline`. */
  "cant-save-built-in-inline": "Can't save {type} inline:  it's built in, and every project shares it",
  /** `a thing is saved in its own file`. */
  "cant-save-built-in-in-file": "Can't save {type} in its own file:  it's built in, and every project shares it",
  /** `a card belongs to a pile` before both are declared:  `{example}` is `example-type` or `example-list-type`. */
  "belongs-to-undeclared": 'Can\'t say {sentence} yet:  declare "{example}" above it',
  /** `a card belongs to a list`. */
  "belongs-to-built-in-list": "Can't say {sentence}:  every list would hold a {type} once",
  /** `a card belongs to a card`. */
  "belongs-to-not-a-list": "Can't say {sentence}:  a {list} isn't a list",
  /** A `<markdown>` block outside a type's outline. */
  "markdown-outside-outline":
    "A <markdown> block goes in a type's outline, as its description, or in a drawing:  return <markdown>...</markdown>",
  /** A `<css>` block in a type that doesn't draw. */
  "css-not-drawable":
    'Only a drawable type has its own <css>:  "{type}" isn\'t drawable:  say "a ... is a drawable thing"',
  /** A `<css>` block outside a type's outline. */
  "css-outside-outline": "Only a drawable type has its own <css>:  put it in a type's outline",
  /** `red if ...` outside a getter. */
  "value-line-outside-getter": 'A line of a getter\'s body:  put it under one, e.g. "the color of a card is:"',
  /** `set the length of the name to 3`:  `{what}` is `the-property` or `the-property-of-a-type`. */
  "cant-set-worked-out": "Can't set {what}:  spell works it out",
  /** `set the pile of the card to x`, when a card belongs to one pile. */
  "cant-set-belongs-to": "Can't set {what}:  it's the {holder} holding it -- move it to a {holder} instead",
  "the-property": "the {property}",
  "the-property-of-a-type": "the {property} of a {type}",

  ////////////////
  // ## Long forms:  "Reads as", `SP.SpellStatement.getLongForm()`
  ////////////////

  /** An outline body's `it`, spelled out. */
  "long-form-subject": "a {type}",
  /** An outline body's `its <property>`, spelled out:  `the "color" of a card`. */
  "long-form-property": "the {property} of a {type}",
  /** `its "rank"`, a property with no type. */
  "long-form-has": "a {type} has a {property}",
  /** `its "rank" is a number`. */
  "long-form-has-as": "a {type} has a {property} as {specifier}",
  /** `its direction is up or down`. */
  "long-form-has-one-of": "a {type} has a {property} as one of {values}",
  /** `its "people" is a list of people`. */
  "long-form-has-list": "a {type} has a {property} as a new list of {items}",
  /** `it belongs to a pile`. */
  "long-form-belongs-to-one": "a {type} belongs to one {list}",
  /** `it "is a (suit)"`:  `{sources}` are `long-form-source`s, joined by `long-form-and`. */
  "long-form-phrase-for": 'a {type} "{phrase}" for {sources}',
  "long-form-source": "its {plural}",
  "long-form-and": " and ",
  /** `to "draw its front":`. */
  "long-form-side": "the {side} of a {type} is:"
}
