# Rulex:  regular expressions for words

Rulex is the syntax a parser rule is written in.
It reads like a regular expression, but over words, symbols and other rules instead of characters:

```text
give {thing:expression} (to {recipient})?
```

- A syntax string is compiled ONCE, when its rule is registered, into a tree of ordinary rule objects
  (`Sequence`, `Choice`, `Repeat`, `Keyword` ...).
  Parsing never sees the string again.
- Every rule prints back as its syntax, so what you wrote is what the tools show.
- It's opt-in, by one import:

  ```ts
  import "spell-lang/parser/rulex"
  ```

  Without it, registering a rule that has a `syntax` throws "Rulex parser is not installed".
  The parser's own entry never pulls it in.

Spell's grammar and markdown's line rules are written in it.
How a rule class and its syntax fit together:  [README-parser](README-parser.md#2-defining-rules).

## The cheat sheet

Every example below was run through the real Rulex, with three helper rules:
- `{pet}`:  `dog` or `cat`
- `{word}`:  any word
- `{number}`:  any number

"Compiles to" is the rule tree it makes.

### Words and symbols

| Construct | Syntax | Matches | Doesn't | Compiles to |
| --- | --- | --- | --- | --- |
| keyword | `give` | `give` | `Give`, `gift` | `Keyword("give")` |
| keywords | `give it back` | `give it back`, `give  it   back` | `give back` | one `Keywords`, merged |
| symbol | `:` | `:` | | `Symbol(":")` |
| symbols | `>=` | `>=` | `> =`, `>` | one `Symbols`, merged |
| escaped symbol | `\?` | `?` | | `Symbol("?")` |

- Matching is exact and case-sensitive:  `give` never matches `Give`.
  For any case, see `/i`, below.
- A space in the syntax ALLOWS spacing in the input;  parts written touching must touch (below, "Spacing").
- Every Rulex special character escapes with `\`:  `\? \* \+ \( \) \[ \] \{ \} \| \: \\`.
  As literals, `| ) ( [ {` MUST be escaped, or they open or close a group.

### Other rules

| Construct | Syntax | Matches | Doesn't | Compiles to |
| --- | --- | --- | --- | --- |
| subrule | `{pet}` | `dog`, `cat` | `bird` | `Subrule(pet)` |
| named subrule | `{first:pet} and {second:pet}` | `dog and cat`, kept as `first` and `second` | `dog cat` | `Sequence[Subrule(first:pet) Keyword("and") Subrule(second:pet)]` |

- A subrule is looked up by NAME at parse time, so a rule may refer to itself, or to one registered later.
- The name before the colon is where its match lands:  `match.groups.first`.

### Choices

| Construct | Syntax | Matches | Doesn't | Compiles to |
| --- | --- | --- | --- | --- |
| choice of literals | `(a\|an) {pet}` | `a dog`, `an cat` | `the dog` | `Sequence[Keyword(["a","an"]) Subrule(pet)]` |
| named choice | `(op:+\|-) {number}` | `+ 2`, `- 2`, kept as `op` | `* 2` | `Sequence[Symbol(op:["+","-"]) Subrule(number)]` |
| choice of rules | `({next_weekday}\|{offset}\|{day_name})` | whichever matches best | | `Choice[...]` |

- An all-word or all-symbol choice merges into ONE literal rule, not a `Choice`.
- Choices nest:  `(is|(negated:is not|isn't))`.
- Which alternative wins when several match:  [README-parser](README-parser.md#how-a-choice-is-settled).

### Lists

| Construct | Syntax | Matches | Doesn't | Compiles to |
| --- | --- | --- | --- | --- |
| list | `[{pet},]` | `dog`, `dog, cat, dog`, `dog, cat,` | `dog cat` (takes only `dog`) | `Repeat[Subrule(pet) / Symbol(",")]` |
| list, any delimiter | `[{pet} (,\|and)]` | `dog, cat and dog`, `dog and cat` | | `Repeat[Subrule(pet) / Choice[Symbol(",") Keyword("and")]]` |
| named list | `[list:{expression},]?` | | | an optional `Repeat`, kept as `list` |

- Item first, then the delimiter;  either may be any rule, and a trailing delimiter is allowed.
- The name goes INSIDE the bracket;  only `?` may follow `]`.

### How many

| Construct | Syntax | Matches | Doesn't | Compiles to |
| --- | --- | --- | --- | --- |
| optional | `the? {pet}` | `the dog`, `dog` | | `Sequence[Keyword("the")? Subrule(pet)]` |
| one or more | `{pet}+` | `dog`, `dog cat dog` | | `Repeat[Subrule(pet)]` |
| zero or more | `very* good` | `good`, `very very good` | | `Sequence[Repeat?[Keyword("very")] Keyword("good")]` |
| n to m | `#{1,6}` | `#`, `######` | `#######` | `Repeat[Symbol("#")]`, 1 to 6 |
| n or more | `-{3,}` | `---`, `-----` | `--`, `- - -` | `Repeat[Symbol("-")]`, 3 or more |
| spaced copies | `- {3,}` | `- - -`, `---` | | the same, its copies free to space |

- Counts count TOKENS, one symbol each:  `!{1,3}` takes `!` to `!!!`, and of `!!!!` only the first three.
- The `#` and `-` rows were run with markdown's tokenizer, matching whole lines.
  To spell's tokenizer, `#` and `--` start a comment.
- `x+` is `x{1,}`;  `x*` is `x{0,}`.
- `{` then a digit is a count;  `{` then a letter is a subrule.

### Case and spacing

| Construct | Syntax | Matches | Doesn't | Compiles to |
| --- | --- | --- | --- | --- |
| any case | `(note\|tip)/i` | `NOTE`, `Tip` | `warning` | `Keyword(["note","tip"])`, any case |
| touching | `\*\*{word}\*\*` | `**bold**` | `** bold **` | parts marked to touch |
| spaced | `{word} 's` | `dog's`, `dog 's` | | parts free to space |
| exactly one space | `\[{space}\]` | `[ ]` | `[]`, `[  ]` | the next part wants one space |
| some spaces | `-{spaces}{word}` | `- item`, `-   item` | `-item` | the next part wants a space or more |

- `/i` follows a keyword or a choice of literals;  `{x}/i` is an error.
- Touching in the syntax means touching in the input;  a space in the syntax allows, but doesn't require, one.
- `{space}` and `{spaces}` aren't rules:  they own the boundary between the two parts around them.

## Three real spell rules

**`plus`**, with its tests ([Plus.ts](spell/src/rules/math/Plus.ts)):

```ts
math.addRule(Plus, {
  syntax: "(operator:plus|+) {expression:operand}",
  tests: [
    {
      compileAs: "expression",
      beforeEach(scope: P.Scope) {
        scope.variables?.add("price")
        scope.variables?.add("tax")
      },
      tests: [
        ["price + tax", "(price + tax)"],
        ["price+tax", "(price + tax)"],
        ["price plus tax", "(price + tax)"]
      ]
    }
  ]
})
```

- The `+` or the word `plus`, kept as `operator`, then an operand.
- How tightly it binds against `*` isn't in the syntax:  that's the class's `precedence`.

**`for each`** ([ListIteration.ts](spell/src/rules/lists/ListIteration.ts)):

```text
for each? {item:singular_identifier} ((and|,) {position:singular_identifier})? (in|of) {list:expression} :? {statement_body}?
```

| Accepts | Compiles to |
| --- | --- |
| `for each card in deck:` | `core.map(deck, () => {})` |
| `for each card and position in the cards: print position, card` | `core.map(cards, withSpellPositions((card, position_) => core.console.log(position_, card)))` |

- `each` is optional;  so is a second name for the item's position, counted from 1.
- `{statement_body}` is what follows on the line, or the block indented under it.

**`print`** ([Print.ts](spell/src/rules/UI/Print.ts)):

```text
print (operator:info|warning|error|collapsed? group)? [expressions:{expression} ,]
```

| Accepts | Compiles to |
| --- | --- |
| `print "Yo!"` | `core.console.log("Yo!")` |
| `print warning "low on cards", 3` | `core.console.warn("low on cards", 3)` |
| `print 1 + 2 * 3` | `core.console.log(1 + 2 * 3)` |

`spell explain <word>` prints any rule's syntax with an example:  `spell explain print`.

## What it can't say

Rulex describes a sequence of tokens.
What needs memory or counting across a line is written in code instead, on the same rule classes:
- "a closing fence as long as the opening one" (markdown's code fences)
- "any token but a backtick" (markdown's code spans)
- nesting by indent:  spell's blocks come from the tokenizer, not from Rulex
- emphasis pairing:  which `*` closes which, by the spec's delimiter rules
- reading what scope knows:  "a word that is a declared type" is a rule class's `parse()`, written once,
  then used in syntax as `{known_type}`

## When it runs

- Eagerly, at registration:  for spell's modules that's when they're imported.
  A bad syntax fails at load, not later at parse time:

  ```text
  rulex couldn't read `(thing|other` in `give (thing|other`
  ```

- No cache:  each registration compiles afresh.
- A `Sequence` rule whose syntax compiles to one other rule wraps it;
  any other mismatch throws, naming the syntax and both classes.
- Rules made WHILE parsing (a spell method's phrase, an enum's choices) compile syntax the same way,
  from strings they put together:  `(expression:red|green|blue)`.
- `rule.toRulexSyntax()` prints a rule back as its syntax.
  Spell's `print` prints back as written:
  `print (operator:info|warning|error|collapsed? group)? [expressions:{expression} ,]`.

<details>
<summary>Rulex's own grammar, in words</summary>

Rulex can't define itself, so its grammar is built in code from plain parser rules
([rulex.ts](parser/src/rulex/rulex.ts)).
A syntax is a sequence of:
- a keyword (a word) or a symbol, or `\` and any symbol
- `{name}` or `{group:name}`:  another rule
- `(a|b|...)` or `(group:a|b|...)`:  a choice, each alternative itself a sequence
- `[item delimiter]` or `[group:item delimiter]`:  a list
- `{space}` or `{spaces}` between two parts
- each part optionally followed by `?`, `+`, `*`, a count `{n}`, `{n,m}` or `{n,}`, and `/i` after a literal

Runs of plain keywords merge into one `Keywords`, and of plain symbols into one `Symbols`;
a named part is never merged, since a merged rule can't carry one item's name.

</details>

<details>
<summary>The tokenizer it reads syntax with</summary>

Two tokenizers are involved, and only one is the language's:
- the rules MATCH the language's tokens:  spell's, or markdown's
- Rulex READS each syntax string with its own, [RulexTokenizer.ts](parser/src/rulex/RulexTokenizer.ts):
  words, numbers, symbols and whitespace only

So `--`, `//`, `#`, commas, quotes and `<tag>` are ordinary symbols in a syntax,
whatever they mean in the language being parsed.

</details>

<details>
<summary>Its tests</summary>

- [rulex.test.ts](tests/parser/src/rulex/rulex.test.ts), with its snapshots:  what each construct compiles to.
- Rulex is itself a parser, so its own rules carry inline tests in the same `[input, output]` form as spell's.
- Every spell rule's tests run through it too:  `yarn spell:test:rules`.

</details>

<details>
<summary>More in the docs site</summary>

These guides need a checkout with the content folder beside it, and the page server running.

| Guide | Served at |
| --- | --- |
| Rulex:  every construct, how it matches, its traps, and markdown in it | `/guides/rulex/rulex.html` |
| Spell Syntax:  every spell rule's syntax, with examples | `/guides/spell-syntax/spell-syntax.html` |

</details>

## See also

- The pages beside this one:
  [README-parser](README-parser.md), [README-markdown](README-markdown.md), [README-spell](README-spell.md)
- spell-lang's front page:  [README](README.md)
- The kit, and every repo:  [the kit's README](../README.md)
- Also beside it:  [README-core.md](README-core.md) · [README-targets.md](README-targets.md)
