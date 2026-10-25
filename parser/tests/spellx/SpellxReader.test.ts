import { readFileSync } from "node:fs"
import { join } from "node:path"
import { describe, expect, test } from "vite-plus/test"

import { SP } from "spell-parser/spell"
import { SX } from "spell-parser/spellx"

/**
 * The spellx reader (epic `elemental-spell` P3):  o1's examples read to their outlines, and each kind of mistake
 * gives its diagnostic.
 * - The fixtures are the epic page's examples (its o1), both languages:  `fixtures/`.
 */

////////////////
// ## The examples
////////////////

/** The example files, each read whole. */
const EXAMPLES = ["TwoSidedView.spellx", "Card.spellx", "Carta.es.spellx", "Solitaire.spellx", "Deck.spellx"]

/** Read a fixture by its name, its language from its name. */
function readExample(name: string) {
  return SX.SpellxReader.read(readFileSync(join(import.meta.dirname, "fixtures", name), "utf8"), { path: name })
}

/** Read `text` as a spellx file, English unless `path` says otherwise. */
function read(text: string, path = "Test.spellx") {
  return SX.SpellxReader.read(text, { path })
}

/** The problems a file's diagnostics name, in order. */
function problemsOf(file: SX.SpellxFile) {
  return file.diagnostics.map((diagnostic) => diagnostic.problem)
}

describe("SpellxReader.read():  the examples", () => {
  test.each(EXAMPLES)("%s reads with NO diagnostics, to its outline", (name) => {
    const file = readExample(name)
    expect(file.diagnostics).toEqual([])
    expect(file.toOutline()).toMatchSnapshot()
  })

  test("EVERY span is the text it stands for:  a line's span slices to its text", () => {
    for (const name of EXAMPLES) {
      const file = readExample(name)
      for (const { node } of file.walk()) {
        expect(node.span.start).toBeLessThanOrEqual(node.span.end)
        if (node.kind === "code")
          for (const line of node.lines) expect(file.text.slice(line.span.start, line.span.end)).toBe(line.text)
        if (node.kind === "hole") expect(file.text.slice(node.codeSpan.start, node.codeSpan.end)).toBe(node.code)
        if (node.kind === "text") expect(file.text.slice(node.span.start, node.span.end)).toBe(node.text)
        if ("nameSpan" in node && node.nameSpan && node.name !== undefined)
          expect(file.text.slice(node.nameSpan.start, node.nameSpan.end)).toBe(node.name)
      }
    }
  })

  test("the Spanish card reads to the same shape as the English one, its words in English", () => {
    const shapeOf = (file: SX.SpellxFile) =>
      [...file.walk()].map(({ node, depth }) => {
        const type = "type" in node ? node.type : ""
        const attributes = "attributes" in node ? node.attributes.map((attribute) => attribute.name) : []
        return [depth, node.kind, type, attributes.join(",")].join(" ")
      })
    expect(shapeOf(readExample("Carta.es.spellx"))).toEqual(shapeOf(readExample("Card.spellx")))
  })

  test("a card's members are what o1 says:  names, aliases, the parts, the handler's phrase", () => {
    const card = readExample("Card.spellx").templates[0]!
    expect({ type: card.type, name: card.name, attributes: card.attributes.map((a) => [a.name, a.value]) }).toEqual({
      type: "view",
      name: "playing card",
      attributes: [
        ["aka", "card"],
        ["template", "two sided view"]
      ]
    })
    const color = card.children.find((node) => node.kind === "declaration" && node.name === "color")
    expect(color).toMatchObject({
      type: "property",
      attributes: [
        { name: "one-of", value: "red, black" },
        { name: "alias", value: "is (color)" },
        { name: "alias", value: "is a (color) card" }
      ],
      children: [
        {
          kind: "code",
          lines: [{ text: "red if it is a diamond or it is a heart" }, { text: "black otherwise" }]
        }
      ]
    })
    const handler = card.children.find((node) => node.kind === "handler")
    expect(handler).toMatchObject({ type: "on", phrase: "mouse down" })
    const parts = card.children.filter((node) => node.kind === "declaration" && node.type === "draw")
    expect(parts.map((part) => (part as SX.SpellxDeclaration).name)).toEqual(["front", "back"])
  })

  test("the two sided view's drawing is ONE if-chain of two branches, each placing a part", () => {
    const view = readExample("TwoSidedView.spellx").templates[0]!
    const draw = view.children.find((node) => node.kind === "declaration" && node.type === "draw")
    expect(draw).toMatchObject({
      children: [
        { kind: "note", type: "description" },
        {
          kind: "choice",
          branches: [
            { type: "if", phrase: "it is face up", children: [{ kind: "place", name: "front" }] },
            { type: "otherwise", phrase: undefined, children: [{ kind: "place", name: "back" }] }
          ]
        }
      ]
    })
  })
})

////////////////
// ## Heads, bodies and markup
////////////////

describe("SpellxReader.read():  what a tag says", () => {
  test("a name, quoted or `name=`, and attributes that repeat (Q6, Q39)", () => {
    const file = read(`<spell-view "card">
	<property name="color" one-of="red, black" alias="is (color)" alias="is a (color) card" />
</spell-view>
`)
    const property = file.templates[0]!.children[0] as SX.SpellxDeclaration
    expect(file.diagnostics).toEqual([])
    expect({ name: property.name, selfClosing: property.selfClosing, aliases: property.attributes.length }).toEqual({
      name: "color",
      selfClosing: true,
      aliases: 3
    })
  })

  test("a phrase's `>` inside a string or parens is the phrase's (Q45);  an apostrophe is no string", () => {
    const file = read(`<spell-view "counter">
	<draw>
		<if its count is (more than 2 > 1) and its label is "a > b" and the card's rank is 1>
			<text>{its count}</text>
		</>
	</draw>
</spell-view>
`)
    const draw = file.templates[0]!.children[0] as SX.SpellxDeclaration
    const choice = draw.children[0] as SX.SpellxChoice
    expect(file.diagnostics).toEqual([])
    expect(choice.branches[0]!.phrase).toBe(
      `its count is (more than 2 > 1) and its label is "a > b" and the card's rank is 1`
    )
  })

  test("a body's lines lose its indent, and keep their own past it", () => {
    const file = read(`<spell-view "card">
	<action "turn it over">
		if it is face up
			turn it face down
	</>
</spell-view>
`)
    const action = file.templates[0]!.children[0] as SX.SpellxDeclaration
    expect((action.children[0] as SX.SpellxCode).lines.map((line) => line.text)).toEqual([
      "if it is face up",
      "\tturn it face down"
    ])
  })

  test("a body on the head's own line, closed at its end", () => {
    const file = read(`<spell-view "card">
	<alias "is a face card">if its rank is jack, queen or king</>
</spell-view>
`)
    const alias = file.templates[0]!.children[0] as SX.SpellxDeclaration
    expect(file.diagnostics).toEqual([])
    expect((alias.children[0] as SX.SpellxCode).lines).toMatchObject([{ text: "if its rank is jack, queen or king" }])
  })

  test("a `</word>` spellx doesn't know is spell, not a closer:  `return <ui-text>...</ui-text>`", () => {
    const file = read(`<spell-view "card">
	<action "show it">
		return <ui-text>{its name}</ui-text>
	</action>
</spell-view>
`)
    const action = file.templates[0]!.children[0] as SX.SpellxDeclaration
    expect(file.diagnostics).toEqual([])
    expect((action.children[0] as SX.SpellxCode).lines.map((line) => line.text)).toEqual([
      "return <ui-text>{its name}</ui-text>"
    ])
  })

  test("markup:  elements, text and holes, whitespace with a line break left out (as JSX)", () => {
    const file = read(`<spell-view "card">
	<draw "front">
		<text part="face" color={its color}>{its rank} {its symbol}</text>
	</draw>
</spell-view>
`)
    const draw = file.templates[0]!.children[0] as SX.SpellxDeclaration
    expect(file.diagnostics).toEqual([])
    expect(draw.children).toMatchObject([
      {
        kind: "element",
        name: "text",
        attributes: [
          { name: "part", value: "face", quote: '"' },
          { name: "color", value: "its color", quote: "{" }
        ],
        children: [
          { kind: "hole", code: "its rank" },
          { kind: "text", text: " " },
          { kind: "hole", code: "its symbol" }
        ]
      }
    ])
  })

  test("prose between members is a cell of its own, headings and all (Q12)", () => {
    const file = read(`<spell-view "card">
	A card.

	## Suit
	<property "suit" one-of="clubs, spades" />
</spell-view>
`)
    expect(file.templates[0]!.children).toMatchObject([
      { kind: "prose", text: "A card.\n\n## Suit" },
      { kind: "declaration", name: "suit" }
    ])
  })

  test("Spanish:  `<si no es ...>` is an `<if>`, `<si no>` alone an `<otherwise>`", () => {
    const file = read(
      `<encanto-vista "carta">
	<dibujar>
		<si no es una figura>
			<texto>{su rango}</texto>
		<si no>
			<texto>figura</texto>
		</>
	</dibujar>
</encanto-vista>
`,
      "Carta.es.spellx"
    )
    const draw = file.templates[0]!.children[0] as SX.SpellxDeclaration
    expect(file.diagnostics).toEqual([])
    expect((draw.children[0] as SX.SpellxChoice).branches.map((branch) => [branch.type, branch.phrase])).toEqual([
      ["if", "no es una figura"],
      ["otherwise", undefined]
    ])
  })
})

////////////////
// ## Mistakes
////////////////

describe("SpellxReader.read():  mistakes are diagnostics, and reading goes on", () => {
  test("an unknown word names the closest, with a fix", () => {
    const file = read(`<spell-view "card">
	<propety "suit" />
	<alias "is red">if its color is red</>
</spell-view>
`)
    expect(file.diagnostics).toMatchObject([
      {
        severity: "error",
        problem: "unknown-word",
        message: `"<propety>" isn't a spellx word:  did you mean "<property>"?`,
        fix: { text: "property" }
      }
    ])
    expect(file.templates[0]!.children.map((node) => node.kind)).toEqual(["declaration", "declaration"])
  })

  test("an unknown attribute names the closest;  an event's attributes are its parameters", () => {
    const file = read(`<spell-view "card">
	<property "suit" one-off="clubs, spades" />
	<event "flipped" side="direction" />
</spell-view>
`)
    expect(file.diagnostics).toMatchObject([
      { problem: "unknown-attribute", message: `<property> has no "one-off":  did you mean "one-of"?` }
    ])
  })

  test("a named closer for another tag:  reported, with `</>` as its fix", () => {
    const file = read(`<spell-view "card">
	<action "turn it over">
		turn it face down
	</property>
</spell-view>
`)
    expect(file.diagnostics).toMatchObject([{ problem: "mismatched-closer", fix: { text: "</>" } }])
    expect(file.templates[0]!.children).toHaveLength(1)
  })

  test("an `<otherwise>` after a `</>` that closed its `<if>`:  the fix drops that `</>` (Q53)", () => {
    const text = `<spell-view "card">
	<draw>
		<if it is face up>
			<draw "front" />
		</>
		<otherwise>
			<draw "back" />
		</>
	</draw>
</spell-view>
`
    const file = read(text)
    expect(problemsOf(file)).toEqual(["otherwise-after-closed-if"])
    const { fix } = file.diagnostics[0]!
    expect(text.slice(fix!.span.start, fix!.span.end)).toBe("</>")
    // read as ONE chain anyway
    const draw = file.templates[0]!.children[0] as SX.SpellxDeclaration
    expect(draw.children.map((node) => node.kind)).toEqual(["choice"])
    expect((draw.children[0] as SX.SpellxChoice).branches).toHaveLength(2)
  })

  test("an unclosed tag:  reported at its head, the file read to its end", () => {
    const file = read(`<spell-view "card">
	<action "turn it over">
		turn it face down
`)
    expect(problemsOf(file)).toEqual(["unclosed-tag", "unclosed-tag"])
    expect(file.diagnostics.map((diagnostic) => file.text.slice(diagnostic.span.start, diagnostic.span.end))).toEqual([
      '<action "turn it over">',
      '<spell-view "card">'
    ])
  })

  test("a body line indented less than its body is a warning (Q7), and still read", () => {
    const file = read(`<spell-view "card">
	<action "turn it over">
			set its direction to down
		pause for 50 msec
	</>
</spell-view>
`)
    expect(file.diagnostics).toMatchObject([{ severity: "warning", problem: "indented-less" }])
    const action = file.templates[0]!.children[0] as SX.SpellxDeclaration
    expect((action.children[0] as SX.SpellxCode).lines.map((line) => line.text)).toEqual([
      "set its direction to down",
      "pause for 50 msec"
    ])
  })

  test("a member outside any template, and a template inside another", () => {
    const file = read(`<property "loose" />
<spell-view "outer">
	<spell-view "inner">
	</>
`)
    expect(problemsOf(file)).toEqual(["outside-template", "nested-template"])
    expect(file.templates.map((template) => template.name)).toEqual(["outer", "inner"])
  })

  test("a part defined in a drawing, an `<if>` among members, a handler in a drawing", () => {
    const file = read(`<spell-view "card">
	<if it is face up>
		<text>up</text>
	</>
	<draw>
		<draw "front">
			<text>front</text>
		</>
		<on click>
			turn it over
		</>
	</draw>
</spell-view>
`)
    expect(problemsOf(file)).toEqual(["misplaced-tag", "part-in-drawing", "misplaced-tag"])
  })

  test("a message speaks the file's language", () => {
    const file = read(
      `<encanto-vista "carta">
	<propiedda "palo" />
</encanto-vista>
`,
      "Carta.es.spellx"
    )
    expect(file.diagnostics[0]!.message).toBe(
      `"<propiedda>" no es una palabra de spellx:  ¿querías decir "<propiedad>"?`
    )
    expect(file.language).toBe(SP.Language.for("es"))
  })
})
