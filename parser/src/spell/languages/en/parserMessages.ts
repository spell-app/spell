/**
 * What the parser says to the person WRITING a program, in English (epic `spanish` P17):
 * its warnings, its parse errors, why a rule refused a line, and the long forms editors show as "Reads as".
 * - Every other language's table has the same keys (`languages/<lang>/parserMessages.ts`);
 *   a key it lacks reads English, and `spell translate check` reports it.
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
  "read-whole-everything": "everything this program saves",
  "read-whole-field-named-by-a-value":
    "Spell can't tell which field this names, so {what} is read whole:  name the field in words if you can",
  "read-whole-element-reads-it": "Spell can't see what this element reads of it, so {what} is read whole",
  "read-whole-library-reads-it": "Spell can't see what this library reads, so {what} is read whole",
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
  /** A local, argument or loop variable with the name of a property of the action's thing. */
  "reads-after-wait":
    "After its first wait, this value can't follow what it reads off other things:  read them above the wait",
  "cant-wait-in-draw": "A drawing can't wait:  make it a property that waits, and draw that",
  /** A write to a thing saved in a read-only place:  won't compile.  `{place}` is its name, `{kind}` what kind it is. */
  "place-read-only":
    "The {place} is a {kind}, which is read only here:  this can't change it.  Keep what changes somewhere else, or read it from a place that takes writes",
  /** A key written into a program:  won't compile. */
  "key-written":
    'A key written here can be read by anyone with the program:  name it instead, e.g. "its key is the secret "COOKBOOK_KEY"", and keep it on a server side',
  /** A secret's name that looks like the key itself. */
  "key-not-a-name":
    '"{name}" looks like a key, not its name:  a key is never written here.  Name it in capitals, e.g. "its key is the secret "COOKBOOK_KEY""',
  /** A place named a key:  a browser program has no way to read one. */
  "key-needs-server-side":
    'A program in a browser can\'t read "{name}":  this place needs a small server side, which holds the key and answers for it',
  /** A place that can't announce what changed:  `{kind}`. */
  "place-cant-announce":
    "A {kind} can't announce what's changed, so other people's changes won't show until this page reads again:  add \"- it is checked every 30 seconds\" under it",
  /** `when a recipe changes`, on a type in no place:  won't compile.  `{what}` is the type, with its article. */
  "change-not-saved":
    '{what} isn\'t saved in a place, so this would never run.  Say where it\'s saved, e.g. "- it is saved in the family cookbook";  or "when its title changes:", for one of its properties',
  /** `when someone else changes it` at a file's top:  won't compile. */
  "someone-else-needs-a-type":
    'Say what changes:  this goes under a saved type, e.g. "- when someone else changes it:" under a recipe',
  /** `when someone else changes it`, on a kind of place only you use. */
  "someone-else-alone":
    "Nobody else can change what's kept here:  this would never run.  It takes a place other people share",
  /** `when someone else changes it`, on a place nothing tells about:  `{kind}`. */
  "someone-else-not-told":
    "A {kind} can't announce what's changed, so this would never run:  add \"- it is checked every 30 seconds\" under it",
  /** `the people here`, with no place that knows. */
  "people-here-only-you": "No place here knows who else is here, so this is only ever you:  that takes a live room",
  /** A `where` on a saved type that can't go to its place. */
  "where-looks-through":
    "This can't be sent to the place, which only finds exact values:  it reads every {type} and looks through them here, up to a limit",
  /** A sort key that waits:  won't compile. */
  "sort-key-waits":
    "A sort can't wait for its key:  it would sort in no order.  Sort by a field of its own, or work the key out first",
  /** A rider outside a drawing:  won't compile. */
  "rider-only-in-a-drawing":
    "This shows something while a read has nothing to show, so it only goes in a drawing, under the read:  an action just waits",
  /** `all or nothing:` where a place can't make it so. */
  "all-or-nothing-not-atomic":
    "A place here can't apply changes all together:  they go one by one, so others may see some of them for a moment",
  /** `save` of something that's no draft:  `{text}`. */
  "no-save-step":
    '"{text}" isn\'t a draft:  a change is kept as it\'s made, with no save step.  For an Edit screen with a Cancel button:  "a draft of ..."',
  /** A word people bring from elsewhere:  `{word}`. */
  "no-such-data-word":
    'Spell has no "{word}" for data:  say where it lives once, "x is a web service at ...", and "- it is saved in x", then "every recipe where ..." reads it',
  /** `belongs to one` a saved owner with no list of them. */
  "belongs-to-saved-needs-list":
    'A {owner} keeps them, so it needs a list to keep them in:  add its "{items}" is a list of {items}',
  /** The cloud, before it's built. */
  "place-cloud-later": 'The cloud isn\'t here yet:  name a place of your own for now, e.g. "x is a live room at ..."',
  /** Words that can never both be true. */
  "never-both": 'One thing can never be both of these at once, so this finds nothing:  did you mean "or"?',
  /** A rider's word that doesn't agree. */
  "hides-property":
    'Here "{name}" hides the property "{name}":  use another name, or say "its {name}" for the property',
  /** A property's rule (`must ...`) above the property it's about. */
  "rule-before-property": 'Declare "{name}" above its rule, e.g. "- it has a {name} as text"',
  /** An outline's getter which is only a value, `- score is 0`:  `{type}` is `example-number` ... */
  "always-the-same": '{name} is always {value}:  to give it a type, write "{name} is {type}"',
  /** A line under a property, `- its "suit" is ...`, that is neither its rule nor its alias (epic `elemental-spell` P5). */
  "not-a-property-body-line":
    "Only a property's rules and aliases go under it:  this line still works, but write it after the property, not under it",
  /** An ability's old words, `- it can be dragged`:  `{line}` is the new, `it is draggable` (epic `debut` P27). */
  "say-is-able": 'Say "{line}":  "{old}" stops working in a later release',
  /** A list's rule's old `if:`, `- it can take a card if: ...` (epic `debut` P27, Q42). */
  "say-when": 'Say "when:":  "if:" here stops working in a later release',
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
  /** A bare tag in a spellx drawing that no pack has (epic `elemental-spell` P7). */
  "spellx-unknown-component":
    "<{tag}> isn't a component any pack here has (searched:  {packs}):  check its name, or add its pack to the project's packs",
  /** A control or handler tag inside an element in a spellx drawing (epic `elemental-spell` P7, C29). */
  "spellx-tag-in-markup":
    "<{tag} ...> can't sit inside an element yet:  write it on a line of its own in the drawing, outside the element",
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
  /**
   * A property or alias on the kind of a property's values, `the "value" of a card rank is ...` (epic `spanish` P22):
   * it has no class to hold one.
   */
  "no-members-on-property-kind":
    "{AKind} is one of the values {aType} lists:  it can't have properties or aliases of its own",
  /** A line adding to a type nobody declares:  `{example}` is `example-type`. */
  "no-such-type": 'There\'s no type "{type}":  declare it, e.g. "{example}"',
  /** A type's declaration, as an example writes it. */
  "example-type": "a {type} is a thing",
  /** A list type's declaration, as an example writes it. */
  "example-list-type": "a {list} is a list of {items}",
  /** `it "is face up" is ...`:  a property, written as an alias. */
  "property-starts-its": 'A property starts "its":  write its "{name}" is ...',
  /** A quoted alias with nothing after it, `it "can move"`. */
  "phrase-without-body": "{phrase} has no body:  write {phrase} always, or {phrase} if ...",
  /** A quoted alias with no blank, `it "is red" for its suits`. */
  "phrase-without-blank":
    '"{phrase}" has no blank:  put the word that varies in parens, e.g. "is a (suit)", or say when it\'s true, "{phrase}" if ...',
  /** An alias's blank naming no property with a list of values. */
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
  /** An old word for a built-in type, `a card is a drawable thing`:  `{replacement}` is its new word. */
  "retired-type-word": '"{words}" is now "{replacement}":  say "{replacement}" instead, or run `spell lint --fix`',
  "retired-word-gone":
    '"{words}" isn\'t needed any more, as spell waits by itself:  take it out, or run `spell lint --fix`',
  /** A `<css>` block in a type that doesn't draw. */
  "css-not-a-view": 'Only a view has its own <css>:  "{type}" isn\'t a view:  say "a ... is a view"',
  /** A `<css>` block outside a type's outline. */
  "css-outside-outline": "Only a view has its own <css>:  put it in a type's outline",
  /** `red if ...` outside a getter. */
  "value-line-outside-getter": 'A line of a getter\'s body:  put it under one, e.g. "the color of a card is:"',
  /** `set the length of the name to 3`:  `{what}` is `the-property` or `the-property-of-a-type`. */
  "cant-set-worked-out": "Can't set {what}:  spell works it out",
  /** `set the pile of the card to x`, when a card belongs to one pile. */
  "cant-set-belongs-to": "Can't set {what}:  it's the {holder} holding it -- move it to a {holder} instead",
  "the-property": "the {property}",
  "the-property-of-a-type": "the {property} of a {type}",

  ////////////////
  // ## Spellx:  what spell says about a .spellml file, as it reads it (epic `elemental-spell`)
  ////////////////

  /** A tag word spellx doesn't know, with the closest it does:  `{tag}` is `<propety>`, `{suggestion}` `<property>`. */
  "spellx-unknown-word": '"{tag}" isn\'t a spellx word:  did you mean "{suggestion}"?',
  /** A tag word spellx doesn't know, nothing close:  `{words}` are the ones it could be here. */
  "spellx-unknown-word-here": '"{tag}" isn\'t a spellx word:  here, use one of {words}',
  /** An attribute its tag doesn't take, with the closest it does. */
  "spellx-unknown-attribute": '{tag} has no "{attribute}":  did you mean "{suggestion}"?',
  /** An attribute its tag doesn't take, nothing close:  `{attributes}` are the ones it has. */
  "spellx-unknown-attribute-here": '{tag} has no "{attribute}":  it takes {attributes}',
  /** A `</>` or `</word>` with nothing open to close. */
  "spellx-unexpected-closer": '"{closer}" closes nothing:  remove it',
  /** A named closer for another tag than the one open:  `{open}` is `<property>`. */
  "spellx-mismatched-closer": '"{closer}" can\'t close {open}:  write "</>"',
  /** A tag the file ends inside. */
  "spellx-unclosed-tag": '{tag} is never closed:  end it with "</>"',
  /** A handler's or ability's one-line tag, `<on drag ... />`, run on past its line (epic `debut` P27, Q47). */
  "spellx-one-line-tag": '{tag} closes on its own line, "... />":  put longer code between "{open}" and "</>"',
  /** A tag's head the file ends inside, `<property "suit"` with no `>`. */
  "spellx-unclosed-head": '{tag} never ends:  close it with ">", or "/>" when nothing goes inside',
  "spellx-unclosed-comment": '"<!--" is never closed:  end the comment with "-->"',
  /** An `<otherwise>` with no `<if>` before it. */
  /** An if-chain's branch in markup with no element around it (epic `elemental-spell`, Owen 2026-10-25). */
  "chain-outside-markup":
    '{tag} picks what an element shows, so it goes inside one:  to pick the whole drawing, write "{if} ..." on a line of its own',
  "spellx-otherwise-without-if": '{tag} needs an "{if}" before it',
  /** An `<otherwise>` after a `</>` that closed its `<if>` (Q53). */
  "spellx-otherwise-after-closed-if":
    '{tag} goes on with the "{if}" above it, but a "</>" closed that:  remove the "</>"',
  /** `<if>` or a handler with no phrase after its word:  `{word}` is `if`, `on` ... */
  "spellx-missing-phrase": '{tag} needs words after its "{word}"',
  /** A line of a body indented less than the body's first line (Q7). */
  "spellx-indented-less": "This line is indented less than the rest of {tag}:  indent it one step more than {tag}",
  /** A template inside another template. */
  "spellx-nested-template": '{tag} can\'t go inside {outer}:  close {outer} first, with "</>"',
  /** A member outside any template, e.g. `<property>` at the top of a file. */
  "spellx-outside-template": '{tag} goes inside a template, e.g. "{template}"',
  /** A tag that can't go where it is, e.g. `<if>` among a template's members, `<on ...>` in a drawing. */
  "spellx-misplaced-tag": "{tag} can't go here:  {where}",
  /** Where an `<if>` or a loop goes. */
  "spellx-where-control": "it goes inside a drawing;  an action says it as a line",
  /** Where a handler or a member goes. */
  "spellx-where-member": "it goes among its template's members, beside the drawing",
  /** A part defined (with a body) inside a drawing:  `{draw}` is `<draw "front">`. */
  "spellx-part-in-drawing": 'A part is drawn in its own {draw} beside the drawing:  here, "{place}" places it',
  /** A tag spellx knows, but can't read yet:  `{tag}` is `<menu>`. */
  "spellx-not-yet": "{tag} can't be read yet:  it comes with a later version of spellx",

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
  "long-form-and": " and "
}
