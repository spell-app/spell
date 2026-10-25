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
Read, it's a tree of those things, each with exactly where it is:

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
No HTML or JSX parser reads it:  `spell-parser/spellx` does, and knows only Spell's own words.

Spellx is the same program as plain Spell, cut into the pieces a person, an editor or an agent works with one at a
time.
Every body inside a tag (`red if it is a diamond ...`) is plain Spell, word for word.

## A closed vocabulary, not HTML's open one

In HTML, any tag and any attribute parses;  a browser ignores what it doesn't know.
Here, a word that isn't Spell's is an error that names the closest one:

```text
"<propety>" isn't a spellx word:  did you mean "<property>"?
```

with an edit that fixes it.
The words come from the file's language, so a Spanish file says the same things in Spanish
(`Carta.es.spellx`):

```html
<encanto-vista "carta de la baraja" alias="carta" plantilla="vista reversible">
	<propiedad "palo" uno-de="tréboles, diamantes, corazones, espadas" frase="es un (palo)" />
	<al presionar el ratón>
		si está boca abajo
			voltearla
	</>
</encanto-vista>
```

It reads to the same tree as the English card, each word's English meaning beside it (`uno-de(one-of)="..."`).

<details>
<summary>Every word, in English and Spanish</summary>

| What it is | English | Spanish |
| --- | --- | --- |
| A template's tag, with the prefix | `<spell-view>` `<spell-thing>` `<spell-page>` `<spell-app>` `<spell-page-template>` `<spell-app-template>` | `<encanto-vista>` `<encanto-cosa>` `<encanto-página>` `<encanto-aplicación>` `<encanto-plantilla-de-página>` `<encanto-plantilla-de-aplicación>` |
| A member that declares something | `<property>` `<alias>` `<action>` `<draw>` `<event>` `<test>` `<menu>` | `<propiedad>` `<frase>` `<acción>` `<dibujar>` `<evento>` `<probar>` `<menú>` |
| A block of prose | `<description>` `<comment>` | `<descripción>` `<comentario>` |
| A handler, its head a phrase | `<on ...>` `<when ...>` `<while ...>` | `<al ...>` `<cuando ...>` `<mientras ...>` |
| A control in a drawing | `<if ...>` `<otherwise if ...>` `<otherwise>` `<for each ...>`;  `else` for `otherwise` | `<si ...>` `<si no si ...>` `<si no>` `<para cada ...>`;  `sino`, `de lo contrario` too |
| An attribute | `name` `aka` `template` `one-of` `alias` `description` `shortcut` `enabled-when` `selected-when` `menu-bar` | `nombre` `alias` (a template's short name) `plantilla` `uno-de` `frase` `descripción` `atajo` `activa-cuando` `elegida-cuando` `barra-de-menú` |

- Spanish words read with their accents and without:  `<encanto-pagina>` is `<encanto-página>`.
- An event's attributes are its parameters (`<event "flipped" side="direction" />`), so they're never checked.
- In a drawing, a tag that isn't a Spell word is a component's:  `<text>`, `<image>`, `<solitaire-card>`.

</details>

## How it reads

- **A template, then its members, line by line.**
  A line that starts with a tag starts a member;  any other line is prose.
  Prose is markdown, headings included:  one cell per run of lines with no tag between them.
- **A member's head:**  its word, an optional quoted name, then attributes:  `<property "suit" one-of="...">`.
  `name="suit"` names it too.
  A handler's or a control's head is a Spell phrase up to its `>`:  `<if its rank is (more than 10)>`.
  A `>` inside a string or parentheses is the phrase's;  an apostrophe is a possessive, `{the score's time}`, never a
  string.
- **A member's body:**  Spell lines, each without the body's indent, so `if` lines keep their own nesting past it.
  The body ends at a closer on a line of its own, or at the end of its last line:
  `<alias "is a face card">if its rank is jack, queen or king</>`.
- **A drawing's body:**  markup, read character by character, as JSX reads it:
  elements, text, `{holes}`, `<if>` chains, `<for each>` loops, and `<draw "front" />` placing a part.
  Whitespace with a line break in it, between tags, is no text;  the space in `{its rank} {its symbol}` is.
- **Closers:**  `</>` closes the innermost open tag;  `</property>` does too, and checks it's a property;
  `/>` ends a tag with nothing inside.
  `<otherwise>` goes on with the open `<if>`, and ONE `</>` closes the whole chain.
- **Mistakes are diagnostics, never exceptions.**
  The reader goes on, so one slip doesn't hide the rest of the file;  the tree keeps what it could read.

The catch, and it catches everybody once:  a spellx word ending a line of Spell is read as a closer.
`</ui-text>` isn't a Spell word, so `return <ui-text>{its name}</ui-text>` is a line of Spell;
but a body line ending in `</>` ends its body, even if it meant a JSX fragment.

## Using it

```ts
import { SX } from "spell-parser/spellx"

const file = SX.SpellxReader.read(text, { path: "Card.spellx" })

file.templates[0].name                // "playing card"
file.diagnostics                      // [] -- or each problem, its span, its message, and a fix
file.toOutline()                      // the tree above, one line per node
for (const { node, depth } of file.walk()) ...
```

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

## The edges

**Real today:**  reading a file, both languages, into the tree above, with diagnostics and fixes.

**Not yet:**  nothing compiles a `.spellx` file.
Writing it into plain Spell, running it, the editor's colours, its hover and its errors, and the notebook view are
still to come;  so is the way back, from a `.spell` file to `.spellx`.

- The words a component takes in a drawing (`part=`, `color=`) aren't checked:  which components exist is the packs'
  business, and a later step's.
- A body indented less than its first line is a warning, not an error:  the editor is meant to keep indents right.

## Where things are

| File | What it holds |
| --- | --- |
| [spellx.types.ts](src/spellx/spellx.types.ts) | the tree's nodes, spans and diagnostics |
| [SpellxReader.ts](src/spellx/SpellxReader.ts) | the reader |
| [SpellxFile.ts](src/spellx/SpellxFile.ts) | a file, read:  `walk()`, `toOutline()`, `positionOf()` |
| [Language.ts](src/spell/languages/Language.ts) | `SpellxWords`, the shape of a language's spellx words |
| [en/words.ts](src/spell/languages/en/words.ts), [es/words.ts](src/spell/languages/es/words.ts) | each language's words, its `spellx` table |
| [en/parserMessages.ts](src/spell/languages/en/parserMessages.ts) | the messages, the `spellx-*` keys |
| [tests/spellx/](tests/spellx/) | the reader's tests;  `fixtures/` holds whole example files, English and Spanish |

## See also

- [README-spell](README-spell.md):  plain Spell, what every body inside a tag is written in
- [README-spanish](README-spanish.md):  how a file's name says its language, and the Spanish words
- [README-parser](README-parser.md):  the parser that reads the Spell inside the tags, which this reader never touches
- [spell-parser's front page](README.md):  the language, its pipeline, and every page of the repo
