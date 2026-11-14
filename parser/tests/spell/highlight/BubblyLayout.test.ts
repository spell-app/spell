import { describe, expect, it } from "vite-plus/test"

import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
import { parseSpellProject } from "spell/parser/spell/test"

/** A card, as Solitaire's starts:  a type with an ability, a group, a list, a worked-out property, a test. */
const CARD = `# A playing card
// A card says what its rank is.

a "card" is a draggable two sided view
\tgroup "Rank"
\t\t// Ace is low
\tits "rank" is one of ace, 2 ... 10, jack, queen, king
\tit "is a face card" if its rank is jack, queen or king

\tgroup "Drawing"
\tits "picture" is
\t\tset column to its value
\t\tif it is a face card
\t\t\treturn "face"
\t\treturn column
\tto draw its front
\t\t<text color="blue">{its picture}</text>
`

/** `text`'s piece of `kind`s, as written. */
function piecesOf(drawing: SP.BubblyDrawing, kind: SP.BubblyPieceKind): string[] {
  const found: string[] = []
  const walk = (nodes: SP.BubblyNode[]) => {
    for (const node of nodes) {
      if (node.kind === "gap") continue
      const line = node.kind === "line" ? node : node.head
      for (const piece of line.pieces) if (piece.kind === kind) found.push(drawing.text.slice(piece.start, piece.end))
      if (node.kind !== "line") walk(node.body)
    }
  }
  walk(drawing.nodes)
  return found
}

/** Every block in `nodes`, depth first. */
function blocksOf(nodes: SP.BubblyNode[]): SP.BubblyBlock[] {
  return nodes.flatMap((node) => (node.kind === "block" ? [node, ...blocksOf(node.body)] : []))
}

describe("SP.BubblyLayout", () => {
  const drawing = SP.BubblyLayout.of(CARD)
  const words = (block: SP.BubblyBlock) => CARD.slice(block.head.start, block.head.end)

  it("makes each declaration a block on a band of its part of speech, and each control line with steps;  one with no body a pill", () => {
    const blocks = blocksOf(drawing.nodes)
    expect(blocks.map((block) => [words(block), block.partOfSpeech, block.level, block.body.length > 0])).toEqual([
      ['a "card" is a draggable two sided view', "thing", 0, true],
      ['group "Rank"', "plain", 1, true],
      ['its "rank" is one of ace, 2 ... 10, jack, queen, king', "property", 2, false],
      ['it "is a face card" if its rank is jack, queen or king', "property", 2, false],
      ['group "Drawing"', "plain", 1, true],
      ['its "picture" is', "property", 2, true],
      ["if it is a face card", "control", 3, true],
      ["to draw its front", "action", 2, true]
    ])
  })

  it("keeps an empty line indented into a body in that body, so its foot goes under it (the caret on a new line)", () => {
    const text = CARD.replace("\t\treturn column\n", "\t\treturn column\n\t\t\n")
    const picture = blocksOf(SP.BubblyLayout.of(text).nodes).find((block) => block.rule === "property_value_getter")!
    const last = picture.body.at(-1)!
    expect(last.kind).toBe("line")
    expect(last.kind === "line" && text.slice(0, last.start).split("\n").length).toBe(
      text.slice(0, text.indexOf("\t\treturn column\n")).split("\n").length + 1
    )
  })

  it("puts a group's members in its body, up to the next group;  its description first", () => {
    const [, rank] = blocksOf(drawing.nodes)
    expect(rank!.isGroup).toBe(true)
    const [description, ...members] = rank!.body
    expect(description!.kind === "line" && CARD.slice(description.start, description.end)).toBe("// Ace is low")
    expect(members.filter((node) => node.kind === "block")).toHaveLength(2)
  })

  it("draws what a person typed as inputs, and a list's values each a pill of its own", () => {
    expect(piecesOf(drawing, "input")).toEqual([
      '"card"',
      '"Rank"',
      '"rank"',
      '"is a face card"',
      '"Drawing"',
      '"picture"',
      "draw its front",
      '"blue"'
    ])
    expect(piecesOf(drawing, "choice")).toEqual(["ace", "2 ... 10", "jack", "queen", "king"])
  })

  it("draws everything after an action's `to` as what a person typed, its parameters aside", () => {
    const heads = (text: string, parser?: SP.SpellParser) => {
      const laidOut = SP.BubblyLayout.of(text, parser)
      return blocksOf(laidOut.nodes)
        .slice(1)
        .map((block) => block.head.pieces.map((piece) => `${piece.kind}:${text.slice(piece.start, piece.end)}`))
    }
    const deck = [
      'a "deck" is a list of cards',
      "\tto test a new deck",
      "\t\tprint 1",
      "\tto draw it",
      "\t\t<text>deck</text>",
      "\tto move (a card) to (a pile)",
      "\t\tprint 1"
    ].join("\n")
    expect(heads(deck)).toEqual([
      ["words:to ", "input:test a new deck"],
      ["words:to ", "input:draw it"],
      [
        "words:to ",
        "input:move",
        "words: (a ",
        "first-mention:card",
        "words:) ",
        "input:to",
        "words: (a ",
        "first-mention:pile",
        "words:)"
      ]
    ])
    // what its head line says about it, after its words:  Spell's words plain, a quoted name a pill of its own
    const pile = [
      'a "pile" is a list of cards',
      '\tto put a card on a pile, undoable as "Move Card"',
      "\t\tprint 1",
      '\tto "deal the cards" with title "Deal", undoable',
      "\t\tprint 1"
    ].join("\n")
    expect(heads(pile)).toEqual([
      [
        "words:to ",
        "input:put a card on",
        "words: a ",
        "first-mention:pile",
        "mark:,",
        "words: undoable as ",
        'input:"Move Card"'
      ],
      ["words:to ", 'input:"deal the cards"', "words: with title ", 'input:"Deal"', "mark:,", "words: undoable"]
    ])
  })

  it("draws a type's creation hook as an action:  `when creating` Spell's words, its type bold", () => {
    const deck = ['a "card" is a thing', 'a "deck" is a list of cards', "\twhen creating a deck", "\t\tprint 1"].join(
      "\n"
    )
    const hook = blocksOf(SP.BubblyLayout.of(deck).nodes).find((block) => block.rule === "create_hook")!
    expect(hook.partOfSpeech).toBe("action")
    expect(hook.head.pieces.map((piece) => `${piece.kind}:${deck.slice(piece.start, piece.end)}`)).toEqual([
      "words:when creating a ",
      "first-mention:deck"
    ])
  })

  it("draws references bold, a name's first mention apart from its later uses, and pronouns plain", () => {
    expect(piecesOf(drawing, "reference")).toEqual(
      expect.arrayContaining(["two sided view", "rank", "value", "column"])
    )
    expect(piecesOf(drawing, "first-mention")).toEqual(["column"])
    expect(piecesOf(drawing, "reference")).not.toContain("its")
    expect(piecesOf(drawing, "constant")).toEqual(["jack", "queen", "king"])
  })

  it("draws a phrase called whole, and a drawing's markup", () => {
    expect(piecesOf(drawing, "phrase")).toEqual(["is a face card"])
    expect(piecesOf(drawing, "tag")).toEqual(["text", "text"])
    expect(piecesOf(drawing, "mark")).toEqual(expect.arrayContaining(["<", "=", ">{", "}</", ">"]))
  })

  it("makes a control line with steps a block of its own, its line plain on its band", () => {
    const picture = blocksOf(drawing.nodes).find((block) => words(block) === 'its "picture" is')!
    const control = picture.body.find((node) => node.kind === "block")
    expect(control?.kind === "block" && control.partOfSpeech).toBe("control")
    expect(control?.kind === "block" && words(control)).toBe("if it is a face card")
    expect(control?.kind === "block" && control.body).toHaveLength(1)
    expect(control?.kind === "block" && control.head.pieces.some((piece) => piece.kind === "input")).toBe(false)
  })

  it("covers every word of each line, in order, never overlapping", () => {
    const lines = (nodes: SP.BubblyNode[]): SP.BubblyLine[] =>
      nodes.flatMap((node) =>
        node.kind === "gap" ? [] : node.kind === "line" ? [node] : [node.head, ...lines(node.body)]
      )
    for (const line of lines(drawing.nodes)) {
      expect(line.pieces.map((piece) => CARD.slice(piece.start, piece.end)).join("")).toBe(
        CARD.slice(line.start, line.end)
      )
    }
  })

  it("lays out another language with its own parser:  Spanish's card", () => {
    const CARTA = `una "carta" es una vista reversible arrastrable
\tgrupo "Rango"
\tsu "rango" es uno de as, 2 ... 10, jota, dama, rey
`
    const spanish = SP.BubblyLayout.of(CARTA, SP.Language.for("es").parser)
    expect(blocksOf(spanish.nodes).map((block) => block.partOfSpeech)).toEqual(["thing", "plain", "property"])
    expect(piecesOf(spanish, "choice")).toEqual(["as", "2 ... 10", "jota", "dama", "rey"])
    expect(piecesOf(spanish, "reference")).not.toContain("su")
  })

  it("draws a declaration with a comment after it as it draws it without, the comment faint at the band's end", () => {
    const withComments = (text: string, parser?: SP.SpellParser) => {
      const heads = new Set(blocksOf(SP.BubblyLayout.of(text, parser).nodes).map((block) => block.head.end))
      let at = 0
      return text
        .split("\n")
        .map((line) => {
          const end = at + line.length
          at = end + 1
          return heads.has(end) ? `${line}    // a note` : line
        })
        .join("\n")
    }
    const CARTA = `una "carta" es una vista reversible arrastrable
\tgrupo "Rango"
\tsu "rango" es uno de as, 2 ... 10, jota, dama, rey
\tpara mover (una carta)
\t\tdevolver 1
`
    for (const [text, parser] of [
      [CARD, undefined],
      [CARTA, SP.Language.for("es").parser]
    ] as const) {
      const commented = withComments(text, parser)
      expect(commented).toContain("// a note")
      const blocks = blocksOf(SP.BubblyLayout.of(commented, parser).nodes)
      const shapeOf = (block: SP.BubblyBlock) => [block.rule, block.partOfSpeech, block.level, block.body.length]
      expect(blocks.map(shapeOf)).toEqual(blocksOf(SP.BubblyLayout.of(text, parser).nodes).map(shapeOf))
      for (const block of blocks) {
        const last = block.head.pieces.at(-1)!
        expect([last.kind, commented.slice(last.start, last.end)]).toEqual(["comment", "// a note"])
      }
    }
  })

  it("reads a project's file from its project's own parse:  names from its other files, as the compiler sees them", () => {
    const CARD_FILE = `a "card" is a view\n\tits "rank" is one of ace, king\n`
    const DECK_FILE = `a "deck" is a list of cards\n\twhen creating a deck\n\t\tfor rank in card ranks\n\t\t\tadd rank to the deck\n`
    const project = parseSpellProject([
      { path: "/Card.spell", contents: CARD_FILE },
      { path: "/Deck.spell", contents: DECK_FILE }
    ])
    const deck = project.files[1]!
    const within = { match: deck.match, inputLines: DECK_FILE.split("\n") } as unknown as SP.SpellFile
    const inProject = SP.BubblyLayout.of(DECK_FILE, SP.spellParser, { within })
    expect(piecesOf(SP.BubblyLayout.of(DECK_FILE), "phrase")).toEqual([])
    expect(piecesOf(inProject, "phrase")).toEqual(["card ranks"])
    expect(blocksOf(inProject.nodes).map((block) => DECK_FILE.slice(block.head.start, block.head.end))).toEqual([
      'a "deck" is a list of cards',
      "when creating a deck",
      "for rank in card ranks"
    ])
    // a parse of other text (an edit it hasn't caught up with):  read alone
    const edited = `${DECK_FILE}\n`
    expect(SP.BubblyLayout.isParseOf(within, edited)).toBe(false)
    expect(piecesOf(SP.BubblyLayout.of(edited, SP.spellParser, { within }), "phrase")).toEqual([])
  })

  it("colours a handler's steps from its project's parse:  a member declared further down is a reference", () => {
    const GAME = `a "pile" is a list of cards
a "card" is a view

solitaire is an app
\tits "score" is a number
\twhen its score changes
\t\tset home to the number of cards in the clubs
\t"clubs" is a new pile
`
    const file = parseSpellProject([{ path: "/Game.spell", contents: GAME }]).files[0]!
    const within = { match: file.match, inputLines: GAME.split("\n") } as unknown as SP.SpellFile
    const reads = (drawing: SP.BubblyDrawing) => piecesOf(drawing, "reference").filter((words) => words === "the clubs")
    expect(reads(SP.BubblyLayout.of(GAME))).toEqual([])
    expect(reads(SP.BubblyLayout.of(GAME, SP.spellParser, { within }))).toEqual(["the clubs"])
    expect(piecesOf(SP.BubblyLayout.of(GAME, SP.spellParser, { within }), "first-mention")).toContain("home")
  })

  it("notes each drawing tag that declares a member, as the parse decides:  not one said on a line of its own, nor any other tag (epic `editor` I84)", () => {
    const GAME = `a "pile" is a view
\tto draw it
\t\t<text>pile</text>

solitaire is an app
\tits "moves" is a number
\tto "redo"
\t\tset its moves to 0
\tto draw it
\t\t<text>Score: <number "score"/></>
\t\t<number "moves"/>
\t\t<pile "C1"/>
\t\t<action "redo"/>
`
    const file = parseSpellProject([{ path: "/Game.spell", contents: GAME }]).files[0]!
    const within = { match: file.match, inputLines: GAME.split("\n") } as unknown as SP.SpellFile
    const declaring = (drawing: SP.BubblyDrawing) =>
      drawing.declaringTags.map((at) => GAME.slice(at, GAME.indexOf(">", at) + 1))
    expect(declaring(SP.BubblyLayout.of(GAME, SP.spellParser, { within }))).toEqual([
      '<number "score"/>',
      '<pile "C1"/>'
    ])
    // read alone, the same:  the file declares its own view
    expect(declaring(SP.BubblyLayout.of(GAME))).toEqual(['<number "score"/>', '<pile "C1"/>'])
  })

  it("never throws, whatever it's given", () => {
    for (const text of ["", "))) ((( '", "to to to\n\t\t\tis is", "<div>{</div>", "\n\n\t\n"]) {
      expect(() => SP.BubblyLayout.of(text)).not.toThrow()
    }
  })
})

describe("SP.BubblyPresentation", () => {
  it("names each rule by a name the parser knows:  its rule name, or a built rule's `importableAs`", () => {
    const rules = SP.spellParser.rules
    for (const name of Object.keys(SP.BubblyPresentation.rules)) {
      expect(name in rules || !!P.Rule.importableRule(name), name).toBe(true)
    }
  })
})
