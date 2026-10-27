# Spellx:  Spell in tags

```html
<spell-view "playing card" aka="card" template="two sided view">
	A playing card has a suit and a rank.

	<property "color" one-of="red, black" alias="is (color)" alias="is a (color) card">
		red if it is a diamond or it is a heart
		black otherwise
	</property>
	<alias "is a face card">if its rank is jack, queen or king</>

	<on mouse down>
		if it is face down
			turn it over
		otherwise
			pass event
	</>

	<draw "front">
		<text part="face" color={its color}>{its rank} {its symbol}</text>
	</draw>
</spell-view>
```

That's a `.spellx` file:  a Spell template, one tag per thing it declares, and prose between them.
It compiles to exactly the program its plain Spell twin does, because Spell's own parser reads it:
each tag line is read as the line of plain Spell it stands for.

```text
<property "color" one-of="red, black" alias="is (color)">   reads as   its "color" is one of red, black:
	red if it is a diamond or it is a heart                         	red if it is a diamond or it is a heart
	black otherwise                                                 	black otherwise
</property>                                                     	- it "is (color)"
<on mouse down>                                             reads as   on mouse down:
```

For a person, an editor or an agent, it's also a tree of those things, each with exactly where it is:

```text
template view <spell-view> "playing card" 1:1-20:14 aka="card" template="two sided view"
  prose 2:2-2:39 "A playing card has a suit and a rank."
  declaration property <property> "color" 4:2-7:13 one-of="red, black" alias="is (color)" alias="is a (color) card"
    code 2 lines 5:3-6:18 "red if it is a diamond or it is a heart"
  declaration alias <alias> "is a face card" 8:2-8:63
    code 1 line 8:26-8:60 "if its rank is jack, queen or king"
  handler on <on> "mouse down" 10:2-15:5
    code 4 lines 11:3-14:14 "if it is face down"
  declaration draw <draw> "front" 17:2-19:9
    element <text> 18:3-18:69 part="face" color={its color}
      hole {its rank} 18:39-18:49
      text 18:49-18:50 " "
      hole {its symbol} 18:50-18:62
```

It looks like HTML, and it isn't.
Two `alias=` on one tag are two aliases;  `<on mouse down>` has spaces in its name;  `</>` closes whatever is open.
No HTML or JSX parser reads it:  Spell's parser does, and knows only Spell's own words.

Spellx is the same program as plain Spell, cut into the pieces a person, an editor or an agent works with one at a
time.
Every body inside a tag (`red if it is a diamond ...`) is plain Spell, word for word.

## A closed vocabulary, not HTML's open one

In HTML, any tag and any attribute parses;  a browser ignores what it doesn't know.
Here, a word that isn't Spell's is an error that names the closest one, or the words that go there:

```text
"<propety>" isn't a spellx word:  did you mean "<property>"?
```

The words come from the file's language, so a Spanish file says the same things in Spanish
(`Carta.es.spellx`):

```html
<encanto-vista "carta de la baraja" alias="carta" plantilla="vista reversible">
	<propiedad "palo" uno-de="tréboles, diamantes, corazones, espadas" frase="es un (palo)" />
	<al clic>
		si está boca abajo
			voltear eso
	</>
</encanto-vista>
```

It compiles to the same program as its Spanish plain Spell twin, `una carta de la baraja alias carta es una vista
reversible:`, and reads to the same tree as the English card.

<details>
<summary>Every word, in English and Spanish</summary>

| What it is | English | Spanish |
| --- | --- | --- |
| A template's tag, with the prefix | `<spell-view>` `<spell-thing>` `<spell-page>` `<spell-app>` `<spell-page-template>` `<spell-app-template>` `<spell-notebook>` | `<encanto-vista>` `<encanto-cosa>` `<encanto-página>` `<encanto-aplicación>` `<encanto-plantilla-de-página>` `<encanto-plantilla-de-aplicación>` `<encanto-cuaderno>` |
| A member that declares something | `<property>` `<alias>` `<action>` `<draw>` `<event>` `<test>` `<menu>` `<group>` | `<propiedad>` `<frase>` `<acción>` `<dibujar>` `<evento>` `<probar>` `<menú>` `<grupo>` |
| A notebook's example, in a drawing | `<example "...">` | `<ejemplo "...">` |
| A block of markup drawn as written | `<html>` | `<html>` |
| A block of prose | `<description>` `<comment>` | `<descripción>` `<comentario>` |
| A handler, its head a phrase | `<on ...>` `<when ...>` `<while ...>` | `<al ...>` `<cuando ...>` `<mientras ...>` |
| A control in a drawing | `<if ...>` `<otherwise if ...>` `<otherwise>` `<for each ...>`;  `else` for `otherwise` | `<si ...>` `<si no si ...>` `<si no>` `<para cada ...>`;  `sino`, `de lo contrario` too |
| An attribute | `name` `aka` `template` `one-of` `alias` `description` `shortcut` `enabled-when` `selected-when` `undone-as` `icon` `menu-bar` `group` `locked` `original` | `nombre` `alias` (a template's short name) `plantilla` `uno-de` `frase` `descripción` `atajo` `activa-cuando` `seleccionada-cuando` `se-deshace-como` `icono` `barra-de-menú` `grupo` `bloqueado` `original` |

- Spanish words read with their accents and without:  `<encanto-pagina>` is `<encanto-página>`.
- An event's attributes are its parameters (`<event "flipped" side="direction" />`), so they're never checked.
- In a drawing, a tag that isn't a Spell word is a component's:  `<text>`, `<image>`, `<solitaire-card>`.

</details>

## How it reads

- **Spell's tokenizer, with spellx's tags as tokens of their own.**
  At a line's start, a tag's head (`<property "suit" one-of="...">`, over as many lines as it takes), a closer
  (`</>`, `</property>`) and a line of prose are each a token;  everything else is Spell's own tokens.
  So a tag line and its indented body nest like a plain Spell outline item and its body.
- **Each tag line becomes its plain Spell twin's tokens**, which Spell's rules parse as that line:
  the same match, the same tree, the same JavaScript.
  The twin's own words are the language's (`its {name} is one of {one-of}`, Spanish `su {name} es uno de {one-of}`);
  the name, the attribute values and a handler's phrase are the file's own tokens, right where they sit.
- **Prose is markdown, headings included**, read as comments:  the lines just above a member are its docstring.
  A `description=`, or a `<description>` first in a tag, is that tag's docstring too.
- **A drawing's body is markup**, as plain Spell's is:  `<if>` chains and `<draw "front" />` placing a part are
  tags of their own between its elements.
- **Closers:**  `</>` closes the innermost open tag;  `</property>` does too, and checks it's a property;
  `/>` ends a tag with nothing inside.
  `<otherwise>` goes on with the open `<if>`, and ONE `</>` closes the whole chain.
- **Mistakes are errors on their own lines**, from the tokenizer (a word spellx doesn't know, a closer for another
  tag, a tag never closed) or from the rules (a body's Spell they can't read).

The catch, and it catches everybody once:  a body line ending in `</>` ends its body, even if it meant a JSX fragment.

## Using it

A `.spellx` file in a project compiles with the rest:  list it in the project's `__project.json5` as any `.spell` file,
and the two kinds use what each other declares.

**One file per template.**
A template lives in ONE file, `Card.spell` or `Card.spellx`, never both:  two copies drift apart.
The other form is a read-only view, written when you ask for it:
- on a `.spell` file, Show as Spellx (VS Code's title bar;  the editor app's Spellx tab)
- on a `.spellx` file, Show as Code Spell (VS Code's title bar;  the editor app's Code Spell tab)
- Edits happen only in the real file, so the view always matches it.

The showcases are written this way:  [Solitaire](https://github.com/spell-app/spell-app/blob/main/spaces/@spell/examples/Solitaire/Card.spellx)
and [Task List](https://github.com/spell-app/spell-app/blob/main/spaces/@spell/examples/TaskList/TaskList.spellx),
in the editor's examples.
- Their card is a two sided view, drawing only its `<draw "front">` and `<draw "back">`;
  their filter, a toolbar of actions with `selected-when=`;  their game's moves, keys and a right-click menu.
- Each file's code-spell twin is kept beside the tests, and a test checks the two compile the same.

Its tree, for a tool or an agent walking it:

```ts
import { SX } from "spell-parser/spellx"

const file = SX.SpellxView.read(text, { path: "Card.spellx" })

file.templates[0].name                // "playing card"
file.diagnostics                      // [] -- or each spellx mistake, its span and its message
file.toOutline()                      // the tree above, one line per node
for (const { node, depth } of file.walk()) ...
```

- It's built from the tokens Spell's parser reads the file as, so it's cheap:  no rules run, nothing compiles.
  What the rules say of a body's Spell is the compiled file's errors.
- The file's name says its language:  `Carta.es.spellx` reads Spanish;  `options.language` overrides it.
- Every node has a `span`, start and end offsets into the text;  `file.positionOf(offset)` turns one into a line and
  column.
- A code line's span is its text exactly:  `text.slice(line.span.start, line.span.end) === line.text`.
  That's what lets an editor put an error from the Spell inside a tag back on the right line.

<details>
<summary>The tree's nodes</summary>

| Node | What it is | Inside it |
| --- | --- | --- |
| `template` | `<spell-view>` and the other prefixed tags | its members and prose |
| `prose` | markdown between tags | -- |
| `declaration` | `<property>`, `<alias>`, `<action>`, `<draw>`, `<event>`, `<test>`, `<menu>` | a body;  a drawing's markup;  a menu's `<action>`s |
| `handler` | `<on ...>`, `<when ...>`, `<while ...>`, its `phrase` | a body |
| `note` | `<description>`, `<comment>`, its markdown `text` | -- |
| `code` | a run of a body's Spell `lines` | -- |
| `element` | a component in a drawing, `<text>`, `<button>` | markup |
| `text`, `hole` | markup text;  a `{spell expression}` | -- |
| `choice`, `branch` | an `<if>` chain and its branches | each branch's markup |
| `loop` | `<for each ...>` | markup |
| `place` | `<draw "front" />`, where a part goes | -- |

</details>

### From a `.spell` file

`spell spellx convert` writes a `.spell` file, or each in a project, as spellx:  the same program, laid out in tags.

```sh
spell spellx convert @spell/examples/calculator --dry-run
```

- `Card.spell` becomes `Card.spellx`, beside it;  `Carta.es.spell` becomes `Carta.es.spellx`, in Spanish spellx.
  The `.spell` file stays:  keep ONE of the two, and list it in the project's `__project.json5`.
  Both, and the project declares everything twice.
- To just look at a file as spellx, Show as Spellx writes it without a second file.
- `--dry-run` prints each file instead of writing it.  Nothing is written inside the test projects.
- Each declaration becomes its tag:  a template, and inside it
  `<property>`, `<alias>`, `<action>`, `<draw>`, `<event>`, `<test>`, `<on ...>`.
  - A property's own aliases become its `alias=`, an action's details its attributes.
  - A lone comment line just above a member becomes its `description=`.
- What has no tag stays as written, inside a `<spell>` chunk:  a file's functions, its tests, its starting lines.
  A chunk's lines read exactly where the chunk is, as if the tags weren't there.

```text
<spell>
	to play a card
		if the pile of the card is the stock of the solitaire
			play from the stock
</spell>
```

- From code:  `SX.SpellxWriter.write({ text, match, scope })`, given the parsed file;
  `SX.SpellxWriter.textOf(file)` for a parsed `SP.SpellFile`, Show as Spellx's view.

## The edges

**Real today:**  a `.spellx` file compiles and runs, English and Spanish, to exactly what its plain Spell twin does;
its tree reads as above.

**Components by their bare names:**  a drawing writes `<text>`, `<button>`, `<botón>` in a Spanish file, and gets
Spell UI's `<ui-text>`, `<ui-button>`, `<es-boton>`.
- A name is one of the project's own views first (`<card>`, its `<solitaire-card>`), then the first of the project's
  packs that has it:  its project file's `"packs"`, Spell UI's alone unless it says more.
- There's no plain HTML in a tag's drawing:  `<div>` is an error naming the packs it looked in.
- The web's own elements are written in a `<spell>` chunk, which is plain Spell, as written:
  there `<div>` is the web's, and so is `<button>`, never Spell UI's.
  - So `spell spellx convert` writes a member whose drawing has one (`<div>`, `<button>`, `<label>`) as a
    `<spell>` chunk, just that member, and the program stays the same;  every other member is a tag.
- `</>` closes any element, `<text>{its rank}</>`;  a name with `-` or a capital is left as written.
- Plain Spell is untouched:  its drawings name tags as before.

**Comments are attributes:**  a member's comment is its `description=`, its docstring as the comment above its twin is.
- Every member takes one:  a template, a property, an alias, an action, a drawing, a test, a menu, a group.
- So does a handler, at the end of its phrase:  `<on click description="A click turns it over">`.
  `description=` and `group=` are its attributes there, never its phrase's words.
- A comment inside a body is plain Spell's, `// ...`, as every body is.

**Actions:**  `<action "deal" shortcut="meta+D" enabled-when="..." selected-when="..." icon="...">`, its details
its attributes, each a line at the top of its twin's body (`- shortcut meta+D`).
- Its body may still sit on its line, `<action "deal" shortcut="meta+D">deal the cards</>`:
  the twin puts it under the details.

**Menus:**  `<menu "GameMenu">` holds `<action "deal" />`s, `<action "-" />` a line between groups;
it reads as `its "GameMenu" is a menu of "deal", "-" and "undo"`, and an app's `menu-bar="GameMenu"` as
`- its menu bar is "GameMenu"`.
- A drawing draws it as a toolbar, `<toolbar menu="GameMenu">`, or as a right click's menu, `context-menu="GameMenu"`.
- Menus and shortcuts run in a JavaScript program only, so far:  on a page whose program runs in Python they're inert.

**Groups:**  `<group "direction" description="Face up or face down"/>` is a heading over the members after it, up to
the next, as text sits under a `##` heading;  a member before any group is in none.
- A member written away from its group says so, `group="direction"`.
- It reads as the heading alone, `- group "direction"`, its description the comment above it;  a member written away
  from its group has its group opened again above it, and the one it's among below it.
- Groups compile to nothing:  they're how a template's laid out for people.  The notebook draws each one's members
  together, and `SX.SpellxFile.groupsOf(template)` lists them.
- A property's aliases with no body are its `alias=`, as many as it has:
  `<property "suit" one-of="clubs, diamonds, hearts or spades" alias="is a (suit)"/>`.

**`<if>` inside an element:**  every branch stays on the page, hidden while it isn't the one.

```html
<text slot="right">
	<if its active count is 0>All done<otherwise>{its active count} to do</>
</text>
```

- A flip keeps the element, the same node with its state and focus;  only its `hidden` changes.
  At a drawing's top level an `<if>` still picks what the drawing returns, rebuilt as it changes.
- Text and the web's own elements are `hidden="until-found"`, so find-in-page still reaches them;
  each run of text and holes gets a `<span>` of its own to hide.
- A Spell UI element takes its plain `hidden`:  its host has no box of its own, where the browser's until-found
  would draw it all the same.
- Plain Spell writes the same tags, in its markup:  the same program.  Spanish says `<si ...>`, `<si no>`.
- A branch in no element is an error that says to write `if ...` on a line of its own.

**`<html>` blocks:**  markup drawn exactly as written, `<ui-button color="primary">`, `<div>` the web's own, in a drawing
or a notebook.  It reads as that markup alone, with nothing around it, as a `<spell>` chunk's drawing does.

**Notebooks:**  `<spell-notebook "counter notebook">` is a page made from Spell's built-in `notebook` template:
its body a drawing of markdown, markup and examples, with templates of its own.

```html
<spell-notebook "counter notebook">
	# A counter
	A button that counts its clicks.

	<spell-view "counter">
		<property "count">a number</>
		<action "create it">set its count to 0</>
		<action "count up">set its count to its count + 1</>
		<draw><button onClick={count up}>Clicked {its count} times</button></draw>
	</spell-view>

	## Try it
	<example "one counter">
		<counter/>
	</example>
</spell-notebook>
```

- Loose text in it is markdown, `#` headings too;  a drawing's tags (`<section>`, `<text>`) draw where they sit.
- `<example "one counter">` is a titled frame round what's inside it, drawn live:  `<spell-example>`, in the editor.
  It reads the same in plain Spell.
- It reads as `counter notebook is a notebook:`, its body `- to draw its content:`, each run of prose a `<markdown>`
  block, a new one at each `##`;  its own templates read just before it, and `start counter notebook` after it.
- `locked` (Spanish `bloqueado`):  only whoever can write its file saves an edit;  anyone else's is a try-out.
- `original="/components/ui/ui-avatar.html"`:  the page it was converted from, while pages become notebooks.
  The editor shows that page's example under each of its own;  it compiles to nothing.
- A notebook is only ever a `.spellx` file.  The editor shows its page, editable in place, at
  `/run/@spell/notebooks/Counter`:  each edit saves just its own cell, and draws just that cell again.
- `SP.SpellProject.compileChunk({ into, path, text, span, kind })` compiles one cell on its own:  a drawing's
  element, or a template's class.

**Not yet:**
- A member of a template from another file:  a template's tag is in ONE file, and spellx has no tag that adds to it.
  Plain Spell's `a card:` does, in a `<spell>` chunk:  Solitaire's moves are its game's, written so.
- A top-level action, a function:  `<action>` goes inside a template;  a `<spell>` chunk holds one.
- `it can be dragged`, `it can take a card if:`, `to draw each item:`:  no tags of their own yet, so `<spell>` chunks.
- A quoted value in an attribute:  `selected-when="its showing is \"done\""` can't be written.
  A one-of value read bare there can be taken for an alias of the same word (`is done`):
  the Task List reads it through its own alias, `selected-when="its checklist is showing done"`.
- A `<spellx>` block back inside a `<spell>` chunk.
- A Spanish handler whose event has an article, `<al presionar el ratón>`:  `<al clic>` reads.
- Completion in a tag's head offers types, not spellx's own words.

## Where things are

| File | What it holds |
| --- | --- |
| [SpellxTokenizer.ts](src/spell/SpellxTokenizer.ts) | Spell's tokenizer for a `.spellx` file:  tag heads, closers and prose as tokens;  its mistakes |
| [SpellxTokens.ts](src/spell/SpellxTokens.ts) | those tokens |
| [SpellxTwin.ts](src/spell/SpellxTwin.ts) | each tag line as its plain Spell twin |
| [spellx.types.ts](src/spellx/spellx.types.ts) | the tree's nodes, spans and diagnostics |
| [SpellxView.ts](src/spellx/SpellxView.ts) | a file's tree, built from its tokens |
| [SpellxFile.ts](src/spellx/SpellxFile.ts) | a file's tree:  `walk()`, `toOutline()`, `positionOf()` |
| [SpellxWriter.ts](src/spellx/SpellxWriter.ts) | a `.spell` file written as spellx:  `spell spellx convert`, and the editors' Show as Spellx |
| [CodeSpellWriter.ts](src/spellx/CodeSpellWriter.ts) | a `.spellx` file written as plain Spell:  the editor's Show as Code Spell |
| [Language.ts](src/spell/languages/Language.ts) | `SpellxWords`, the shape of a language's spellx words |
| [en/words.ts](src/spell/languages/en/words.ts), [es/words.ts](src/spell/languages/es/words.ts) | each language's words, its `spellx` table:  the tags, and each tag's twin (`twins`) |
| [en/parserMessages.ts](src/spell/languages/en/parserMessages.ts) | the messages, the `spellx-*` keys |
| [tests/spell/spellx/](tests/spell/spellx/) | each `X.spellx` beside the `X.spell` it compiles the same as, English and Spanish |
| [tests/spellx/](tests/spellx/) | the tree's tests;  `fixtures/` holds the epic's example files |

## See also

- [README-spell](README-spell.md):  plain Spell, what every body inside a tag is written in
- [README-spanish](README-spanish.md):  how a file's name says its language, and the Spanish words
- [README-parser](README-parser.md):  the parser that reads every spellx file, through its own tokenizer
- [spell-parser's front page](README.md):  the language, its pipeline, and every page of the repo
