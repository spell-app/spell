import { describe, expect, it } from "vite-plus/test"

import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"

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
  return nodes.flatMap((node) =>
    node.kind === "block" ? [node, ...blocksOf(node.body)] : node.kind === "bracket" ? blocksOf(node.body) : []
  )
}

describe("SP.BubblyLayout", () => {
  const drawing = SP.BubblyLayout.of(CARD)
  const words = (block: SP.BubblyBlock) => CARD.slice(block.head.start, block.head.end)

  it("makes each declaration a block on a band of its part of speech;  one with no body a pill", () => {
    const blocks = blocksOf(drawing.nodes)
    expect(blocks.map((block) => [words(block), block.partOfSpeech, block.level, block.body.length > 0])).toEqual([
      ['a "card" is a draggable two sided view', "thing", 0, true],
      ['group "Rank"', "plain", 1, true],
      ['its "rank" is one of ace, 2 ... 10, jack, queen, king', "property", 2, false],
      ['it "is a face card" if its rank is jack, queen or king', "property", 2, false],
      ['group "Drawing"', "plain", 1, true],
      ['its "picture" is', "property", 2, true],
      ["to draw its front", "action", 2, true]
    ])
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
      "front",
      '"blue"'
    ])
    expect(piecesOf(drawing, "choice")).toEqual(["ace", "2 ... 10", "jack", "queen", "king"])
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

  it("holds a control line's steps in a bracket", () => {
    const picture = blocksOf(drawing.nodes).find((block) => words(block) === 'its "picture" is')!
    const bracket = picture.body.find((node) => node.kind === "bracket")
    expect(bracket?.kind === "bracket" && CARD.slice(bracket.head.start, bracket.head.end)).toBe("if it is a face card")
    expect(bracket?.kind === "bracket" && bracket.body).toHaveLength(1)
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
