# spell:  the language

`spell-lang/spell` is the spell language, written as rules on the generic [parser](README-parser.md).
- Twenty rule modules read English sentences, and outlines, into the spell tree.
- A project model reads a project's files, compiles them, and writes each [target](README-targets.md)'s output.
- Eleven frozen test projects pin every target's output, line for line.

Programs are written in plain, correct English, then translated into equivalent code.
The aim, since 2017:  people can read a program before they can write one.

## What it reads

A spell program is sentences, or an outline:  a heading, then bullets of what's true of it.
Both are the SAME rules:  the outline's bullets are more syntaxes registered on the same rule classes,
so the two styles compile identically, and a file may mix them.

The card type, both ways, from the frozen test projects
([cards/Card.spell](tests/spaces/@spell/test/cards/Card.spell),
[outline-solitaire/Card.spell](tests/spaces/@spell/test/outline-solitaire/Card.spell)):

<table>
<tr><th>Sentences</th><th>An outline</th></tr>
<tr>
<td>

```spell
a card is a thing

cards have a suit as one of clubs, diamonds, hearts or spades
the color of a card is red if its suit is either diamonds or hearts otherwise it is black
a card has a direction as either up or down

a card "is face up" if its direction is up
a card "is a (suit)" for its suits
```

</td>
<td>

```spell
a "card" is a thing:

	## suit and rank
	- suit is a suit of its deck
	- its "color" is the color of its suit
	- it "is a (suit)"

	## direction
	- its direction is up or down
	- it "is face up" if its direction is up
```

</td>
</tr>
</table>

_The outline version reads its suits and colors from its deck;  the sentence version says them in place._

What each sentence becomes, in JavaScript and Python
([cards.snapshot.js](tests/spaces/@spell/test/cards/cards.snapshot.js),
[cards.snapshot.py](tests/spaces/@spell/test/cards/cards.snapshot.py)):

<table>
<tr><th>JavaScript</th><th>Python</th></tr>
<tr>
<td>

```js
export class Card extends Thing {
  static Suits = ["clubs", "diamonds", "hearts", "spades"]
  static { this.declareProp("suit", { oneOf: Card.Suits }) }
  get suit() { return this.getProp("suit") }
  set suit(value) { this.setProp("suit", value) }

  get color() {
    if (core.includes(["diamonds", "hearts"], this.suit)) return "red"
    return "black"
  }

  get isFaceUp() {
    return this.direction == "up"
  }

  isASuit(suit) {
    return this.suit === suit
  }
}
```

</td>
<td>

```py
class Card(Thing):
    SUITS = ("clubs", "diamonds", "hearts", "spades")
    suit = prop(one_of=SUITS)

    @property
    def color(self) -> str:
        if self.suit in ["diamonds", "hearts"]:
            return "red"
        return "black"

    @property
    def is_face_up(self) -> bool:
        return self.direction == "up"
```

</td>
</tr>
</table>

_Excerpts:  the snapshots have every member, with each line's spell as a comment above it._

### Types, choices and derived properties

- `a card is a thing` makes a type:  a class extending `Thing` ([README-core](README-core.md)).
  - `a deck is a list of cards` makes a list type;  `solitaire is an app` makes one app and its type.
- `cards have a suit as one of clubs, diamonds, hearts or spades` stores a property,
  and its choices become a list on the type, `Card.Suits`.
- `the color of a card is ... otherwise it is black` is worked out each time it's read:  a getter.
- `the value of a card is the position of its rank in card ranks`:  positions count from 1, so an ace is 1.

### Phrases that become rules

A quoted phrase teaches spell new words, as a rule of its own, from the next line on:

| Spell | Reads, after it | JavaScript |
| --- | --- | --- |
| `a card "is face up" if its direction is up` | `the card is face up`, `the card is not face up` | `get isFaceUp() { return this.direction == "up" }` |
| `a card "is a (suit)" for its suits` | `the card is a spade`, `the card is a heart` ... | `isASuit(suit) { return this.suit === suit }` |
| `to turn a card face up:` | `turn the card face up`, `turn it face up` | `async turnFaceUp() { ... }` (it pauses, so it waits) |

- A phrase with `(suit)` in it is one phrase per suit:  the plural turns back into the singular.
- `to ...` defines an action:  its words, with the type in brackets, are its signature.

### Lists, and `where`

| Spell | JavaScript |
| --- | --- |
| `add thing to the start of my-list` | `core.prepend(myList, thing)` |
| `the first item of my-list` | `core.getItemAt(myList, 0)` |
| `the number of items in my-list where its id > 1` | `core.itemCountOf(core.filter(myList, (item) => item.id > 1))` |
| `return tasks in its tasks where it is active` | `return core.filter(this.tasks, (task) => task.isActive)` |
| `move card to tableau` | `core.move(card, tableau)` |

- Positions count from 1;
  the compiler turns them into the target's own ([README-core](README-core.md#positions-count-from-1)).
- `a card belongs to one pile` makes the piles exclusive:  adding a card to one takes it out of the last.

### Drawing

`a card is a drawable thing` makes the type a web component of its own, styled by its `<css>` block
([drawable-solitaire/Card.spell](tests/spaces/@spell/test/drawable-solitaire/Card.spell)):

```spell
a card is a drawable thing:
	<css>
		.card.red {
			color: crimson;
		}
	</css>
```

```js
export class Card extends Drawable {
  static elementTag = core.defineElement(this, "test-project")
  static css = css`...`
```

- `to draw a card` returns JSX:  `<div onClick={fire event card-click with card = it}>...</div>`.
- Each card is its own element on the page, with its own styles:  `<solitaire-card>` in the Solitaire example.

### Events

| Spell | JavaScript | Python |
| --- | --- | --- |
| `fire event card click with card = 1` | `trigger("card-click", { card: 1 })` | `core.trigger("card-click", card=1)` |
| `on card-click with a card` / `play the card` | `on("card-click", (event) => { const { card } = event; card.play() })` | |

### Tests

`to test ...` is a test, and `expect ... to be ...` a check.
`spell test` runs them:

```spell
to test card setup
	the card is a new card whose rank is queen, suit is spades and direction is up
	expect the rank of the card to be queen
	expect the color of the card to be black
	expect the card is face up to be yes
```

```js
export function testCardSetup() {
  return core.test("test card setup", function testCardSetup() {
    const card = new Card({ rank: "queen", suit: "spades", direction: "up" })
    core.expect(card.rank, `the rank of the card`, "queen", `queen`)
    core.expect(card.color, `the color of the card`, "black", `black`)
    core.expect(card.isFaceUp, `the card is face up`, true, `yes`)
```

On a copy of the `cards` test project (its compile line and two warnings left out):

```text
$ spell test try/cards
✓ test card setup  (22 checks)
✓ test deck creation  (6 checks)

2 passed
```

### Things with ids, and addresses

- Every thing has an `id`, built in:  nobody declares it.
  - `bob is a new person whose name is "bob"` is `new Person({ name: "bob" })`.
  - `with id = "bob"` names its id.
- A thing saves as readable JSON, its type first:  `{ "$type": "Card", "rank": "ace" }`.
  `a person is saved in its own file` gives each person a file of their own ([README-core](README-core.md)).
- One thing of a program is named by its type and name, or its place:
  - in text:  `Tableau#T1`, `Tableau#1`
  - in spell:  `tableau T1`, `the first tableau`
- A project and its files have ADDRESSES, a group then a project then a file:
  `@spell/examples/drawable-solitaire/Card.spell`.
  - The groups (`@spell/examples`, `@spell/library`, `@spell/test`) belong to spell-app's spaces,
    which tells spell where each one's folder is ([README-spaces](../spell-app/README-spaces.md)).
  - A project outside any group is `@local/<folders>`.

## The twenty modules

Each module is a folder of [spell/src/rules/](spell/src/rules/), one rule class per file.
Every row's example and output come from that rule's own tests, as the syntax table records them.

| Module | What it reads | Example | JavaScript |
| --- | --- | --- | --- |
| blocks | a file, its blocks, lines and statements;  a line nobody understands | (the base rules) | |
| core | numbers, text, yes and no, nothing, comments | `nothing` | `undefined` |
| variables | names, of one word or several | `the start pile` | `startPile` |
| constants | words that are values | `red` | `"red"` |
| expressions | comparisons, `and` / `or`, `is a`, `is in` | `thing is green or blue` | `core.includes(["green", "blue"], thing)` |
| math | arithmetic, biggest and smallest, rounding | `largest of the prices` | `core.largestOf(prices)` |
| properties | `the ... of ...`, `its ...`, object literals | `the short rank of the card` | `card.shortRank` |
| lists | positions, ranges, adding, removing, `for each`, `where` | `remove last card of deck` | `core.removeItemAt(deck, -1)` |
| UI | `print`, notices, prompts, `<css>` | `print "Yo!"` | `core.console.log("Yo!")` |
| classes | types, properties, phrases, saving, versions | `a card is a thing` | `export class Card extends Thing {}` |
| async | waiting, pauses, processes | `pause for 2 seconds` | `await core.pauseFor(2, "seconds")` |
| draw | drawing a list's items | `draw each card in the deck` | `core.drawItems(deck)` |
| JSX | elements, fragments, `<markdown>` blocks | `<a/>` | `h("a")` |
| types | type names, singular and plural | `things` | `Thing` |
| assignment | `set ... to ...`, `... is ...`, `get`, `return` | `set unknown-var to yes` | `export const unknownVar = true` |
| statements | statements with nothing else to say | `do nothing` | `core.doNothing()` |
| events | firing and handling events | `on card click` | `on("card-click")` |
| if | `if`, `otherwise`, a value `if ... otherwise` | `print 1 if bar else 2` | `core.console.log(bar ? 1 : 2)` |
| methods | `to ...` actions, animations, quoted phrases | `to start the game` | `export function startTheGame() {}` |
| tests | `expect`, `should be`, `echo` | `its rank should be queen` | `core.expect(it.rank, ...)` |

- Every rule, with every syntax and its output in all three languages:
  the generated [spell syntax table](spell/spellSyntax.json), drawn by the Spell Syntax guide (below).
- Its counts:  241 rule classes, 274 registered syntaxes, as of 2026-10-21 ([README](README.md#working-on-it)).

## The compiler

A project is a folder with a project file, `__project.json5`, listing its own files and the projects it imports:

```json5
{
  "imports": [
    { "path": "/FizzBuzz.spell", "active": true }
  ]
}
```

- `SpellProject` reads a project's files (`SpellFile`s) and compiles them
  ([SpellProject.ts](spell/src/SpellProject.ts)).
- Its compile writes:
  - its code, for each target:  `<Project>.spell.js` always, `.spell.tsx`, `.spell.py` when asked
  - its scope pack, `<Project>.scopes.js`:  what the editor's Type Explorer reads
  - beside the source:
    - its declarations, `<Project>.declarations.json5`:  what other projects import
    - its words, `<Project>.en.js`:  spell's English for each member
- Compiled code goes in the checkout's build folder, which mirrors the project's path and is never committed.
- A project names the targets it wants in its project file's `"targets"`;
  `spell compile --target <name>` adds one for a single run.
- The four targets, and what each writes:  [README-targets](README-targets.md).

From code:

```ts
import { SP } from "spell-lang/spell"

SP.spellParser.compile("print 1 + 2", "statement") // => "core.console.log(1 + 2)"
```

- `SP.spellParser` is the shared parser, every module's rules in it.
- `spellParser.parse(text, "statement")` returns the match tree instead:  [README-parser](README-parser.md#3-matches).

## The frozen test projects

Eleven projects in [tests/spaces/@spell/test/](tests/spaces/@spell/test/),
each with a snapshot of every target's output beside it.
They're NEVER edited to follow the live examples, which people change:  they pin what spell does.

| Project | What it shows |
| --- | --- |
| [fizzbuzz](tests/spaces/@spell/test/fizzbuzz/) | a loop, `if` / `otherwise`, `print` |
| [cards](tests/spaces/@spell/test/cards/) | a card, a deck and a pile, in sentences, with tests |
| [cards-from-zero](tests/spaces/@spell/test/cards-from-zero/) | the same, its lists counting from 0 |
| [card-table](tests/spaces/@spell/test/card-table/) | a drawable list whose frame has a named place, filled by a child |
| [solitaire](tests/spaces/@spell/test/solitaire/) | a whole game of Solitaire |
| [drawable-solitaire](tests/spaces/@spell/test/drawable-solitaire/) | Solitaire, each card its own web component |
| [outline-solitaire](tests/spaces/@spell/test/outline-solitaire/) | Solitaire, its types in the outline style |
| [klondike](tests/spaces/@spell/test/klondike/) | Klondike, its moves guarded:  `a tableau can give up a card if: the card is face up` |
| [thing-references](tests/spaces/@spell/test/thing-references/) | naming one thing:  `tableau T1`, `the first tableau` |
| [people](tests/spaces/@spell/test/people/) | people and what they keep, as a TypeScript library |
| [todos-form-based](tests/spaces/@spell/test/todos-form-based/) | a to-do app drawn with Spell UI's form elements |

The snapshots, for a project `<Project>`:

| Snapshot | What it pins |
| --- | --- |
| `<Project>.snapshot.js` | the JavaScript |
| `<Project>.snapshot.tsx` | the TypeScript |
| `<Project>.snapshot.tsc.txt` | what `tsc` says of the TypeScript:  empty |
| `<Project>.snapshot.py` | the Python |
| `<Project>.snapshot.pyright.txt` | what pyright says of the Python:  empty |
| `<Project>.snapshot.declarations.json5` | its declarations |
| `<Project>.en.snapshot.js` | its words |
| `<Project>.elements.snapshot.js` | a drawing program's page half, for Python |
| `<Project>.lib.snapshot.ts` | the library target, for `people` |

- Every project has a Python snapshot but `todos-form-based`:
  the Python writer can't write its method's named arguments yet.
- After a deliberate change:  `yarn spell:test:fixtures:bless`, then read the diff.
- Add a test project by copying a project in.
- In tests, read them with `loadFixtureProject()` and `fixturePath()`.
  Both are in `spell-lang/spell/test`.

## Adding a rule

The general recipe is [README-parser](README-parser.md#adding-a-rule);  spell's layout:

```text
spell/src/rules/<module>/
  <module>.parser.ts    the module's parser, and nothing else
  <RuleClass>.ts        one rule class each:  the class, then its addRule() calls
  <module>.shared.ts    what several of its rule files share, if anything
  index.ts              exports every file, in tie-break order

tests/spell/src/rules/<module>/
  <module>.test.ts      calls unitTestModuleRules(), or its tests never run
  __snapshots__/        its group specs
```

1. Add `<RuleClass>.ts` to the module's folder.
   Its docstring's first line starts with the rule's name:  `` `trigger` rule:  fires a global event ``.
2. Write the class:  its `@proto static` settings first, then `getAST()`.
   Then call `<module>.addRule(...)` once per syntax.
3. Export it from the module's `index.ts`:  its place there is its registration order, which breaks ties.
4. `yarn spell:test:rules`, then `yarn spell:test:rules:bless` once the output is right, and read the diff.
5. `yarn spell:gen:syntax`:  the syntax table's test fails until you do.
6. A built-in type's member (`the length of the name`) is data, not a rule:
   add it to the table in [builtinTypes.ts](spell/src/builtinTypes.ts).
7. A new operator, or a change to how parsing works:  [PARSING.md](spell/PARSING.md) in the same change.

The rules for writing rules, in full:  [spell's AGENTS.md](spell/AGENTS.md), "Parser rules".

## What's not here

- **Project groups:**  spell's registry of groups starts empty;
  spell-app's spaces registers `@spell/examples` and the rest ([README-spaces](../spell-app/README-spaces.md)).
  Spell never imports spaces.
- **Projects on disk:**  spaces' too.  Spell reads and compiles projects, but holds none but the frozen ones.
- **The highlighter IS here:**  `SP.SpellHighlighter` colours a snippet with no project,
  for `<ui-code language="spell">`.
- **Node-only helpers** are here, but never in the entry (`spell-lang/spell/node/...`):
  the TypeScript check, its build, pyright, the syntax table.
- **The editor, the language server and the VS Code extension** are spell-app's (below).

### Editing and running spell

The editor in spell-app gets the same language features as VS Code, from the same language service:
errors as you type, hover, completion, go to definition, find references, rename, outline, folding, formatting.
- VS Code gets them from spell's language server and its extension,
  which also shows a file's compiled JavaScript and runs its project beside it.
- On any web page, `<spell-app>` runs a compiled project and `<spell-editor>` edits one.
- All of that, and how to install the extension:
  [spell-app's README](../spell-app/README.md), [README-app](../spell-app/README-app.md)
  and [README-lsp](../spell-app/README-lsp.md).

## 🌱 Coming:  mixins, and Spell UI written in spell

"A card is a drawable, sortable thing":  a type that takes its behaviour from several named sources,
as Spell UI's elements would compose too.
Then Spell UI's simpler elements, written in spell and compiled ahead to the TypeScript Spell UI ships:
divider, label, card, then form controls, with every attribute given a spell phrase.

Where it stands:  planned, not started.

<details>
<summary>The built-in types</summary>

A built-in type's members are data in [builtinTypes.ts](spell/src/builtinTypes.ts), not rules:
each says its words and what it reads as in `core` or JavaScript.

| Type | Some of its members |
| --- | --- |
| thing | `id`;  `(a thing) belongs to one (list)`;  `draw (a thing)` |
| list | `length`, `size`;  `item (n) of (a list)`;  `items in (a list) where`;  `add (a thing) to (a list)`;  `shuffle (a list)` |
| app | `start (an app)` |
| drawable, drawable list | what a thing or list that draws itself adds |
| text | `length`;  `characters`;  `character (n) of (a text)`;  `(a text) as upper case` |
| date | `year`, and its other parts |

- After adding one:  `yarn lsp:scopes --builtins`, in spell-app, rewrites the built-in types' docs
  ([core.scopes.js](core/src/core.scopes.js)), what pages with no parser read.

</details>

<details>
<summary>The files</summary>

| File | What it is |
| --- | --- |
| [SpellParser.ts](spell/src/SpellParser.ts) | spell's parser:  its tokenizer settings, the shared root scope |
| [rules/](spell/src/rules/) | the twenty modules;  `SP.spellParser` from their index |
| [SpellProject.ts](spell/src/SpellProject.ts), [SpellFile.ts](spell/src/SpellFile.ts) | a project and its files:  reading, compiling, saving |
| [SpellLocation.ts](spell/src/SpellLocation.ts), [SpellUrls.ts](spell/src/SpellUrls.ts), [SpellSetup.ts](spell/src/SpellSetup.ts) | addresses, their URLs and folders, the registry of groups |
| [targets.ts](spell/src/targets.ts) | the four targets:  `SP.TARGETS` |
| [builtinTypes.ts](spell/src/builtinTypes.ts) | the built-in types' members |
| [SpellDeclarations.ts](spell/src/SpellDeclarations.ts), [SpellWords.ts](spell/src/SpellWords.ts) | what a project declares, and its words |
| [highlight/](spell/src/highlight/) | `SpellHighlighter`:  colours a snippet with no project |
| [node/](spell/src/node/) | node only:  the TypeScript check and build, pyright, the syntax table |
| [test/](spell/src/test/) | test helpers:  `loadFixtureProject()`, `fixturePath()` |
| [spellSyntax.json](spell/spellSyntax.json) | GENERATED:  every rule, syntax and output |
| [PARSING.md](spell/PARSING.md) | the detailed map of the parse pipeline |
| [thoughts/](spell/thoughts/) | the 2017-era notes:  history, not plans |

</details>

<details>
<summary>PARSING.md, the deep map</summary>

[PARSING.md](spell/PARSING.md) is the detailed map of how spell's text becomes the spell tree,
for anyone working on the parser or the language:
- tokens, then block, line, statement
- when scope changes, and how projects share a parser
- expressions and precedence, members, datatypes
- projects on disk and their build folders
- incremental parsing, and the language server's use of it

It's kept up to date in the same change as the parsing mechanism.
Its file references are dated:  trust the code where they drift.

</details>

<details>
<summary>Where spell came from:  its purpose, and its first README</summary>

The first README called spell
"an algorithmic parser, for experiments in turning natural language code into machine-readable code":
- The language is spell, a subset of English.
- Programs are written in syntactically correct English, then translated into equivalent code.
- At its root is a rule syntax that resembles regular expressions on steroids (now Rulex):
  it lets a language developer express any language's rules, not just spell's.
- The parser itself is simple ([Parser.ts](parser/src/Parser.ts));  the power is in how the rules are written:
  the generic ones, [the parser's rules](parser/src/rules/), and spell's own, [its rules](spell/src/rules/).
- Unlike other rule-based parsers, adding rules is easy:  import them dynamically, even at run time.
- The parser could be rewritten in other languages, and other compile targets are easy to add:
  both have since happened in part, with the Python target.

Also from that README:
- Docker support was removed on 2026-09-30, out of date;  its files are in the history, at commit `02476e71`.
- Its rule-syntax table is older than Rulex:  [README-rulex](README-rulex.md) replaces it.

</details>

<details>
<summary>More in the docs site</summary>

These guides need a checkout with the content folder beside it, and the page server running.

| Guide | Served at |
| --- | --- |
| Spell Syntax:  every rule, drawn from the syntax table | `/guides/spell-syntax/spell-syntax.html` |
| Outline Spell | `/guides/outline-spell.html` |
| Precedence And Types | `/guides/precedence/precedence.html` |
| People and Orgs:  ids, addresses, saving | `/guides/people-and-orgs.html` |
| Drawable Things | `/guides/drawable-thing.html` |

</details>

## See also

- The pages beside this one:
  [README-parser](README-parser.md), [README-rulex](README-rulex.md),
  [README-core](README-core.md), [README-targets](README-targets.md), [README-markdown](README-markdown.md)
- The rules for working in this folder:  [spell's AGENTS.md](spell/AGENTS.md)
- spell-lang's front page:  [README](README.md)
- The kit, and every repo:  [the kit's README](../README.md)
