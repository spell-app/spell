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

/** `drawing`'s underlined stretches, as written, each `kind:words`. */
function underlinesOf(drawing: SP.BubblyDrawing): string[] {
  const found: string[] = []
  const walk = (nodes: SP.BubblyNode[]) => {
    for (const node of nodes) {
      if (node.kind === "gap") continue
      const line = node.kind === "line" ? node : node.head
      for (const { start, end, kind } of line.underlines) found.push(`${kind}:${drawing.text.slice(start, end)}`)
      if (node.kind !== "line") walk(node.body)
    }
  }
  walk(drawing.nodes)
  return found
}

/** `drawing`'s code, each `{…}` in its markup, as written. */
function codesOf(drawing: SP.BubblyDrawing): string[] {
  const found: string[] = []
  const walk = (nodes: SP.BubblyNode[]) => {
    for (const node of nodes) {
      if (node.kind === "gap") continue
      const line = node.kind === "line" ? node : node.head
      for (const { start, end } of line.codes ?? []) found.push(drawing.text.slice(start, end))
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
      '"blue"'
    ])
    expect(piecesOf(drawing, "choice")).toEqual(["ace", "2 ... 10", "jack", "queen", "king"])
  })

  it("draws everything after an action's `to` as ONE pill, each blank in it underlined, its kind word bold (epic `language` I109)", () => {
    const heads = (text: string, parser?: SP.SpellParser) => {
      const laidOut = SP.BubblyLayout.of(text, parser)
      return blocksOf(laidOut.nodes)
        .filter((block) => block.partOfSpeech === "action")
        .map((block) => [
          ...block.head.pieces.map((piece) => `${piece.kind}:${text.slice(piece.start, piece.end)}`),
          ...block.head.underlines.map(({ start, end, kind }) => `underline ${kind}:${text.slice(start, end)}`),
          ...(block.head.pillNames ?? []).map(({ start, end }) => `name:${text.slice(start, end)}`)
        ])
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
      ["words:to ", "reference:draw", "words: it"],
      [
        "words:to ",
        "input:move (a card) to (a pile)",
        "underline value:a card",
        "underline value:a pile",
        "name:card",
        "name:pile"
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
        "input:put a card on a pile",
        "mark:,",
        "words: undoable as ",
        'input:"Move Card"',
        "underline value:a pile",
        "name:pile"
      ],
      ["words:to ", 'input:"deal the cards"', "words: with title ", 'input:"Deal"', "mark:,", "words: undoable"]
    ])
    // quoted or not, the same pill:  its `"` marks at its ends;  its blanks, bracketed or not, underlined in it
    const quoted = [
      'a "card" is a thing',
      'a "pile" is a list of cards',
      "\tto put a card on a pile",
      "\t\tprint 1",
      "solitaire is an app",
      "\tto play a card",
      "\t\treturn 1",
      '\tto "count the points for a card on a pile"',
      "\t\treturn 1",
      "\tto count the points for a card on a pile",
      "\t\treturn 1",
      '\tto "move (a card) to (a pile)"',
      "\t\treturn 1",
      "\tafter putting a card on a pile",
      "\t\treturn 1"
    ].join("\n")
    const [, play, fromQuoted, unquoted, bracketed, after] = heads(quoted)
    expect(play).toEqual(["words:to ", "input:play a card", "underline value:a card", "name:card"])
    const blanks = ["underline value:a card", "underline value:a pile", "name:card", "name:pile"]
    expect(unquoted).toEqual(["words:to ", "input:count the points for a card on a pile", ...blanks])
    expect(fromQuoted).toEqual(["words:to ", 'input:"count the points for a card on a pile"', ...blanks])
    expect(bracketed).toEqual(["words:to ", 'input:"move (a card) to (a pile)"', ...blanks])
    // steps at an action's end draw as its head does (epic `language` P56)
    expect(after).toEqual(["words:after ", "input:putting a card on a pile", ...blanks])
    // the editors:  ONE pill between its curly marks, its words plain but its blanks' kind words, not bold as a quoted name is
    const laidOut = SP.BubblyLayout.of(quoted)
    const head = blocksOf(laidOut.nodes).filter((block) => block.partOfSpeech === "action")[2]!
    const stretches = SP.BubblyStretches.ofLine(quoted, head.head, { band: head.partOfSpeech })
    expect(
      stretches.map((each) => `${each.kind}${each.isName ? " (name)" : ""}:${quoted.slice(each.start, each.end)}`)
    ).toEqual([
      "words:to ",
      'quote-open:"',
      "input:count the points for a card on a pile",
      'quote-close:"',
      "reference:card",
      "reference:pile",
      "underline:a card",
      "underline:a pile"
    ])
    // Spanish the same
    const spanish = [
      'una "carta" es una cosa',
      'una "pila" es una lista de cartas',
      "solitario es una app",
      '\tpara "los puntos por (una carta) en (una pila)"',
      "\t\tdevolver 1",
      "\tpara jugar una carta",
      "\t\tdevolver 1",
      '\tpara "poner (una carta) en (una pila)"',
      "\t\tdevolver 1",
      "\tdespués de poner una carta en una pila",
      "\t\tdevolver 1"
    ].join("\n")
    expect(heads(spanish, SP.Language.for("es").parser)).toEqual([
      [
        "words:para ",
        'input:"los puntos por (una carta) en (una pila)"',
        "underline value:una carta",
        "underline value:una pila",
        "name:carta",
        "name:pila"
      ],
      ["words:para ", "input:jugar una carta", "underline value:una carta", "name:carta"],
      expect.anything(),
      // `después de` both outside its pill (Owen, 2026-11-15)
      [
        "words:después de ",
        "input:poner una carta en una pila",
        "underline value:una carta",
        "underline value:una pila",
        "name:carta",
        "name:pila"
      ]
    ])
  })

  it("draws a new thing's `a new` bold with its kind, and what a step sets underlined whole (epic `language` I98)", () => {
    const pieces = (text: string, parser?: SP.SpellParser) => {
      const laidOut = SP.BubblyLayout.of(text, parser)
      const step = blocksOf(laidOut.nodes).find((block) => block.partOfSpeech === "action")!.body[0]!
      const line = step.kind === "line" ? step : undefined
      return {
        references: line!.pieces
          .filter((piece) => piece.kind === "reference")
          .map((piece) => text.slice(piece.start, piece.end)),
        underlines: line!.underlines.map(({ start, end, kind }) => `${kind}:${text.slice(start, end)}`)
      }
    }
    const english = [
      'a "foundation" is a thing',
      '\tits "suit" is one of hearts, spades',
      "solitaire is an app",
      "\tto start",
      "\t\tset the foundation to a new foundation with suit = hearts"
    ].join("\n")
    expect(pieces(english)).toEqual({
      references: ["foundation", "a new foundation", "suit"],
      underlines: ["value:the foundation", "value:a new foundation with suit = hearts"]
    })
    const spanish = [
      'una "fundación" es una cosa',
      '\tsu "palo" es uno de corazones, picas',
      "solitario es una aplicación",
      "\tpara empezar",
      "\t\tla fundación es una nueva fundación con palo = corazones"
    ].join("\n")
    expect(pieces(spanish, SP.Language.for("es").parser)).toEqual({
      references: ["fundación", "una nueva fundación", "palo"],
      underlines: ["value:la fundación", "value:una nueva fundación con palo = corazones"]
    })
  })

  it("draws a drawing's head with its verb and the part it draws bold, its pronoun plain, no pill (epic `language` I99)", () => {
    const heads = (text: string, parser?: SP.SpellParser) =>
      blocksOf(SP.BubblyLayout.of(text, parser).nodes)
        .filter((block) => block.partOfSpeech === "action")
        .map((block) =>
          block.head.pieces.map((piece) => `${piece.kind}:${text.slice(piece.start, piece.end)}`).join(" | ")
        )
    const english = [
      'a "card" is a two sided view',
      "\tto draw it",
      "\t\t<text>x</text>",
      "\tto draw its front",
      "\t\t<text>x</text>",
      '\tto "draw its back"',
      "\t\t<text>x</text>",
      'a "pile" is a viewable list of cards',
      "\tto draw its placeholder",
      "\t\t<text>x</text>",
      "\tto draw each item",
      "\t\t<text>x</text>"
    ].join("\n")
    expect(heads(english)).toEqual([
      "words:to  | reference:draw | words: it",
      "words:to  | reference:draw | words: its  | reference:front",
      'words:to  | input:"draw its back"',
      "words:to  | reference:draw | words: its  | reference:placeholder",
      "words:to  | reference:draw | words: each  | reference:item"
    ])
    const spanish = [
      'una "carta" es una vista de dos caras',
      "\tpara dibujarla",
      "\t\t<texto>x</texto>",
      "\tpara dibujar su frente",
      "\t\t<texto>x</texto>",
      'una "pila" es una lista visible de cartas',
      "\tpara dibujar su marcador",
      "\t\t<texto>x</texto>",
      "\tpara dibujar cada elemento",
      "\t\t<texto>x</texto>"
    ].join("\n")
    expect(heads(spanish, SP.Language.for("es").parser)).toEqual([
      "words:para  | reference:dibujarla",
      "words:para  | reference:dibujar | words: su  | reference:frente",
      "words:para  | reference:dibujar | words: su  | reference:marcador",
      "words:para  | reference:dibujar | words: cada  | reference:elemento"
    ])
  })

  it("draws a drag handler's and a create hook's head as an action's:  ONE pill after its first word, its thing underlined, its kind word bold (epic `language` I109)", () => {
    const heads = (text: string, parser?: SP.SpellParser) =>
      blocksOf(SP.BubblyLayout.of(text, parser).nodes)
        .filter((block) => block.partOfSpeech === "action")
        .map((block) =>
          [
            ...block.head.pieces.map((piece) => `${piece.kind}:${text.slice(piece.start, piece.end)}`),
            ...block.head.underlines.map(({ start, end }) => `underline:${text.slice(start, end)}`),
            ...(block.head.pillNames ?? []).map(({ start, end }) => `name:${text.slice(start, end)}`)
          ].join(" | ")
        )
    const english = [
      'a "card" is a view',
      'a "pile" is a viewable list of cards',
      "\tit is droppable",
      "\twhen creating a pile",
      "\t\tprint 1",
      "\twhen a card is dropped\t\t-- put the card on the pile",
      "\t\tprint 1",
      "\twhen a card is dragged over",
      "\t\tprint 1",
      "\twhen a card is dragged out of it",
      "\t\tprint 1",
      "\twhile a card is dragged over it",
      "\t\tprint 1",
      "solitaire is an app",
      "\twhen creating solitaire",
      "\t\tprint 1"
    ].join("\n")
    expect(heads(english)).toEqual([
      "words:when  | input:creating a pile | underline:a pile | name:pile",
      "words:when  | input:a card is dropped | words:\t\t | comment:-- put the card on the pile | underline:a card | name:card",
      "words:when  | input:a card is dragged over | underline:a card | name:card",
      "words:when  | input:a card is dragged out of it | underline:a card | name:card",
      "words:while  | input:a card is dragged over it | underline:a card | name:card",
      "words:when  | input:creating solitaire | underline:solitaire | name:solitaire"
    ])
    const spanish = [
      'una "carta" es una vista',
      'una "pila" es una lista visible de cartas',
      "\tal crear una pila",
      "\t\timprimir 1",
      "\tcuando una carta se suelta",
      "\t\timprimir 1",
      "\tmientras una carta se arrastra sobre ella",
      "\t\timprimir 1",
      "solitario es una app",
      "\tal crear el solitario",
      "\t\timprimir 1"
    ].join("\n")
    expect(heads(spanish, SP.Language.for("es").parser)).toEqual([
      "words:al  | input:crear una pila | underline:una pila | name:pila",
      "words:cuando  | input:una carta se suelta | underline:una carta | name:carta",
      "words:mientras  | input:una carta se arrastra sobre ella | underline:una carta | name:carta",
      "words:al  | input:crear el solitario | underline:el solitario | name:solitario"
    ])
  })

  it("draws the kind a type's head says it is bold, its abilities too, its commas plain (epic `language` I111, J214)", () => {
    const heads = (text: string, parser?: SP.SpellParser) =>
      blocksOf(SP.BubblyLayout.of(text, parser).nodes).map((block) =>
        block.head.pieces.map((piece) => `${piece.kind}:${text.slice(piece.start, piece.end)}`).join(" | ")
      )
    const english = [
      'a "card" is a draggable two sided view',
      "\tprint 1",
      'a "pile" is a droppable viewable list of cards',
      "\tprint 1",
      'a "stack" is a viewable, droppable list of cards',
      "\tprint 1",
      'a "tile" is a draggable, clickable two sided view',
      "\tprint 1",
      'a "deck" is a list of cards',
      "\tprint 1",
      'a "foundation" is a pile',
      "\tprint 1",
      "solitaire is an app",
      "\tprint 1"
    ].join("\n")
    expect(heads(english)).toEqual([
      'words:a  | input:"card" | words: is a  | reference:draggable two sided view',
      'words:a  | input:"pile" | words: is a  | reference:droppable viewable list of cards',
      'words:a  | input:"stack" | words: is a  | reference:viewable | mark:, | words:  | reference:droppable list of cards',
      'words:a  | input:"tile" | words: is a  | reference:draggable | mark:, | words:  | reference:clickable two sided view',
      'words:a  | input:"deck" | words: is a  | reference:list of cards',
      'words:a  | input:"foundation" | words: is a  | reference:pile',
      "input:solitaire | words: is an  | reference:app"
    ])
    const spanish = [
      'una "carta" es una vista reversible arrastrable',
      "\timprimir 1",
      'una "pila" es una lista visible soltable de cartas',
      "\timprimir 1",
      'un "montón" es una lista visible, soltable de cartas',
      "\timprimir 1",
      'un "mazo" es una lista de cartas',
      "\timprimir 1",
      'una "fundación" es una pila',
      "\timprimir 1"
    ].join("\n")
    expect(heads(spanish, SP.Language.for("es").parser)).toEqual([
      'words:una  | input:"carta" | words: es una  | reference:vista reversible arrastrable',
      'words:una  | input:"pila" | words: es una  | reference:lista visible soltable de cartas',
      'words:un  | input:"montón" | words: es una  | reference:lista visible | mark:, | words:  | reference:soltable de cartas',
      'words:un  | input:"mazo" | words: es una  | reference:lista de cartas',
      'words:una  | input:"fundación" | words: es una  | reference:pila'
    ])
  })

  it("draws every name bold, one weight, the word a head declares too;  pronouns plain;  a list's values italic", () => {
    expect(piecesOf(drawing, "reference")).toEqual(
      expect.arrayContaining(["draggable two sided view", "rank", "value", "column"])
    )
    expect(piecesOf(drawing, "reference")).not.toContain("its")
    expect(piecesOf(drawing, "value")).toEqual(expect.arrayContaining(["jack", "queen", "king", '"face"']))
  })

  it("underlines each value and each question with the thing it asks of, outermost only;  its own words plain", () => {
    expect(underlinesOf(drawing)).toEqual([
      "value:its rank",
      "value:column",
      "value:its value",
      "question:it is a face card",
      "value:column"
    ])
    expect(piecesOf(drawing, "words")).toEqual(expect.arrayContaining(["it is a face card"]))
  })

  it("draws a drawing's markup, each `{…}` in it code, its braces pieces of their own", () => {
    expect(piecesOf(drawing, "tag")).toEqual(["text", "text"])
    expect(piecesOf(drawing, "mark")).toEqual(expect.arrayContaining(["<", "=", ">", "{", "}", "</", ">"]))
    expect(codesOf(drawing)).toEqual(["{its picture}"])
  })

  it("reads a tag's `{` as code up to its own `}`, a text in it Spell's, never the tag's value (epic `editor` I144)", () => {
    const text = 'to draw it\n\t<button "OK" onClick={say "a}b"} padding={its size}/>'
    const markup = SP.BubblyLayout.of(text)
    expect(codesOf(markup)).toEqual(['{say "a}b"}', "{its size}"])
    // past the head's `draw it`
    expect(piecesOf(markup, "input").slice(1)).toEqual(['"OK"'])
  })

  it('draws a `{` with no `}` as a mark alone, and a `"` right after a word plain:  the pills after it stay on their words (I144)', () => {
    const text = 'to draw it\n\t<container columns="7" padding={small" spacing="xs">'
    const markup = SP.BubblyLayout.of(text)
    // past the head's `draw it`
    expect(piecesOf(markup, "input").slice(1)).toEqual(['"7"', '"xs"'])
    expect(codesOf(markup)).toEqual([])
    expect(piecesOf(markup, "words")).toEqual(expect.arrayContaining(['small" spacing']))
  })

  it("draws a start tag laid out over lines exactly as on one line:  its values pills, its marks faint (epic `language` I151)", () => {
    const oneLine = SP.BubblyLayout.of(
      'to draw it\n\t<toolbar class="GameBar" inverted size={its size}>\n\t\t<spacer/>\n\tsay "hi"'
    )
    const overLines = SP.BubblyLayout.of(
      'to draw it\n\t<toolbar\n\t\tclass="GameBar"\n\t\tinverted\n\t\tsize={its size}\n\t>\n\t\t<spacer/>\n\tsay "hi"'
    )
    for (const kind of ["input", "mark", "tag", "value"] as const)
      expect(piecesOf(overLines, kind), kind).toEqual(piecesOf(oneLine, kind))
    expect(codesOf(overLines)).toEqual(["{its size}"])
    // the tag's `>` ends it:  the step after it is Spell again
    expect(underlinesOf(overLines)).toEqual(underlinesOf(oneLine))
  })

  it("draws a control line going on onto the lines under it (`and ...`) as ONE head, its body after them", () => {
    const text = CARD.replace("\t\tif it is a face card\n", "\t\tif it is a face card\n\t\t\tand its rank is king\n\t")
    const control = blocksOf(SP.BubblyLayout.of(text).nodes).find((block) => block.partOfSpeech === "control")!
    expect(text.slice(control.head.start, control.head.end)).toBe("if it is a face card\n\t\t\tand its rank is king")
    expect(control.body.map((node) => node.kind === "line" && text.slice(node.start, node.end))).toEqual([
      'return "face"'
    ])
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
    expect(underlinesOf(SP.BubblyLayout.of(DECK_FILE))).not.toContain("value:card ranks")
    expect(underlinesOf(inProject)).toContain("value:card ranks")
    expect(blocksOf(inProject.nodes).map((block) => DECK_FILE.slice(block.head.start, block.head.end))).toEqual([
      'a "deck" is a list of cards',
      "when creating a deck",
      "for rank in card ranks"
    ])
    // a parse of other text (an edit it hasn't caught up with):  read alone
    const edited = `${DECK_FILE}\n`
    expect(SP.BubblyLayout.isParseOf(within, edited)).toBe(false)
    expect(underlinesOf(SP.BubblyLayout.of(edited, SP.spellParser, { within }))).not.toContain("value:card ranks")
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
    const reads = (drawing: SP.BubblyDrawing) => piecesOf(drawing, "reference").filter((words) => words === "clubs")
    expect(reads(SP.BubblyLayout.of(GAME))).toEqual([])
    expect(reads(SP.BubblyLayout.of(GAME, SP.spellParser, { within }))).toEqual(["clubs"])
    expect(piecesOf(SP.BubblyLayout.of(GAME, SP.spellParser, { within }), "reference")).toContain("home")
  })

  it("draws a rule's lines as they compile (Solitaire's foundation):  values and questions underlined, `is`, `and`, `- 1` plain between", () => {
    const PILES = `a "card" is a view
	its "suit" is one of clubs or hearts
	its "value" is a number
	it "is face up" if its value > 0
a "pile" is a droppable list of cards
	its "suit" is a card suit
	its "value" is a number
a card belongs to one pile
a card
	it "is on top" if it is the last card of its pile
a "foundation" is a pile
	it is droppable when
		the pile's suit is the card's suit
			and the pile's value is the card's value - 1
			and the card is on top
	to test it
		set test card to its last card
		if test card is a club and test card is its first card return
		if test card is face up or its value is test card's value return
		if test card's pile is a foundation return
		pause for 300 msec
`
    const file = parseSpellProject([{ path: "/Piles.spell", contents: PILES }]).files[0]!
    const within = { match: file.match, inputLines: PILES.split("\n") } as unknown as SP.SpellFile
    const laidOut = SP.BubblyLayout.of(PILES, SP.spellParser, { within })
    const walk = (nodes: SP.BubblyNode[]): SP.BubblyLine[] =>
      nodes.flatMap((node) =>
        node.kind === "gap" ? [] : node.kind === "line" ? [node] : [node.head, ...walk(node.body)]
      )
    // the underlines on the source line starting `from`
    const lines = (from: string) => {
      const start = PILES.indexOf(from)
      const end = PILES.indexOf("\n", start)
      return walk(laidOut.nodes)
        .flatMap((line) => line.underlines)
        .filter((each) => each.start >= start && each.end <= end)
        .map(({ start: at, end: to, kind }) => `${kind}:${PILES.slice(at, to)}`)
    }
    expect(lines("\t\tthe pile's suit")).toEqual(["value:the pile's suit", "value:the card's suit"])
    expect(lines("\t\t\tand the pile's value")).toEqual(["value:the pile's value", "value:the card's value"])
    expect(lines("\t\t\tand the card is on top")).toEqual(["question:the card is on top"])
    expect(lines("\t\tif test card is a club")).toEqual([
      "question:test card is a club",
      "value:test card",
      "value:its first card"
    ])
    expect(lines("\t\tif test card is face up")).toEqual([
      "question:test card is face up",
      "value:its value",
      "value:test card's value"
    ])
    expect(lines("\t\tif test card's pile")).toEqual(["question:test card's pile is a foundation"])
    expect(lines("\t\tpause for")).toEqual(["quantity:300 msec"])
    // what a step sets:  bold, and underlined whole, a value of its own (epic `language` I98)
    expect(lines("\t\tset test card")).toEqual(["value:test card", "value:its last card"])
    // `droppable` a name, bold;  `pile's` whole with its `'s`;  `club` and `1` values, italic
    expect(piecesOf(laidOut, "reference")).toEqual(expect.arrayContaining(["droppable", "pile's suit", "card's value"]))
    expect(piecesOf(laidOut, "value")).toEqual(expect.arrayContaining(["club", "1", "300"]))
    // each underline starts and ends with a piece
    for (const line of walk(laidOut.nodes))
      for (const underline of line.underlines) {
        expect(line.pieces.some((piece) => piece.start === underline.start)).toBe(true)
        expect(line.pieces.some((piece) => piece.end === underline.end)).toBe(true)
      }
  })

  it("underlines Spanish the same, by its rules, not its words:  `está vacía` with no subject a question still", () => {
    const PILAS = `una "carta" es una vista
	su "palo" es uno de tréboles o corazones
una "pila" es una lista soltable de cartas
	sus cartas son arrastrables cuando la carta es su última carta
	es soltable cuando
		está vacía y la carta es un trébol
`
    const file = parseSpellProject([{ path: "/Pilas.es.spell", contents: PILAS }]).files[0]!
    const within = { match: file.match, inputLines: PILAS.split("\n") } as unknown as SP.SpellFile
    const laidOut = SP.BubblyLayout.of(PILAS, SP.Language.for("es").parser, { within })
    expect(underlinesOf(laidOut)).toEqual([
      "value:la carta",
      "value:su última carta",
      "question:está vacía",
      "question:la carta es un trébol"
    ])
    expect(piecesOf(laidOut, "reference")).toEqual(expect.arrayContaining(["soltable", "arrastrables"]))
  })

  it("underlines a call of an action the project declares whole, its blanks' values bold in it;  Spell's own steps as before (epic `language` I108)", () => {
    const GAME = `a "pile" is a list of cards
a "card" is a two sided view
a card
	to play it
		turn it face up
solitaire is an app
	its "stock" is a pile
	its "score" is a number
	to "turn over the next card"
		add 1 to the stock
	to "the points for (a card) on (a pile)"
		return 10
	to "deal"
		turn over the next card
		set the card to the first card of the stock
		play the card
		add (the points for the card on the stock) to the score
		turn the card face up
`
    const file = parseSpellProject([{ path: "/Game.spell", contents: GAME }]).files[0]!
    const within = { match: file.match, inputLines: GAME.split("\n") } as unknown as SP.SpellFile
    const laidOut = SP.BubblyLayout.of(GAME, SP.spellParser, { within })
    const deal = GAME.indexOf('\tto "deal"')
    const lines = (nodes: SP.BubblyNode[]): SP.BubblyLine[] =>
      nodes.flatMap((node) =>
        node.kind === "gap" ? [] : node.kind === "line" ? [node] : [node.head, ...lines(node.body)]
      )
    const underlines = lines(laidOut.nodes)
      .flatMap((line) => line.underlines)
      .filter((each) => each.start > deal)
      .map(({ start, end, kind }) => `${kind}:${GAME.slice(start, end)}`)
    expect(underlines).toEqual([
      // no blanks
      "call:turn over the next card",
      "value:the card",
      "value:the first card of the stock",
      // with blanks:  one line under the whole call, none under its values
      "call:play the card",
      "call:the points for the card on the stock",
      "value:the score",
      // a built-in template's (a two sided view's):  Spell's own step
      "value:the card"
    ])
    expect(piecesOf(laidOut, "reference")).toEqual(expect.arrayContaining(["card", "stock"]))
  })

  it("underlines `each card in the deck` as ONE value, in English and Spanish;  a Spanish call of the project's own whole (epic `language` I108)", () => {
    const GAME = `a "pile" is a list of cards
a "card" is a two sided view
solitaire is an app
	its "stock" is a pile
	its "deck" is a pile
	to "deal"
		add each card in the deck to the stock
		add every card in the deck to the stock
		turn each card in the stock face down
`
    const file = parseSpellProject([{ path: "/Game.spell", contents: GAME }]).files[0]!
    const within = { match: file.match, inputLines: GAME.split("\n") } as unknown as SP.SpellFile
    const laidOut = SP.BubblyLayout.of(GAME, SP.spellParser, { within })
    expect(underlinesOf(laidOut)).toEqual([
      "value:each card in the deck",
      "value:the stock",
      "value:every card in the deck",
      "value:the stock",
      "value:each card in the stock"
    ])
    expect(piecesOf(laidOut, "reference")).toEqual(expect.arrayContaining(["card", "deck", "stock"]))

    const JUEGO = `una "pila" es una lista de cartas
una "carta" es una vista reversible
solitario es una aplicación
	su "reserva" es una pila
	su "mazo" es una pila
	para "reiniciar la reserva"
		voltear cada carta de la reserva boca abajo
	para "repartir"
		agregar cada carta del mazo a la reserva
		reiniciar la reserva
`
    const archivo = parseSpellProject([{ path: "/Juego.es.spell", contents: JUEGO }]).files[0]!
    const dentro = { match: archivo.match, inputLines: JUEGO.split("\n") } as unknown as SP.SpellFile
    expect(underlinesOf(SP.BubblyLayout.of(JUEGO, SP.Language.for("es").parser, { within: dentro }))).toEqual([
      "value:cada carta de la reserva",
      "value:cada carta del mazo",
      "value:la reserva",
      // a call of the project's own action, in Spanish too
      "call:reiniciar la reserva"
    ])
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

  it("draws a bare attribute value (`suit=hearts`) where it is, not over the file's first word (epic `language` I84)", () => {
    const GAME = `solitaire is an app
\t-- See the rules
\tits "suit" is one of hearts, spades
\tto draw it
\t\t<text suit=hearts/>
`
    const file = parseSpellProject([{ path: "/Game.spell", contents: GAME }]).files[0]!
    const within = { match: file.match, inputLines: GAME.split("\n") } as unknown as SP.SpellFile
    const drawing = SP.BubblyLayout.of(GAME, SP.spellParser, { within })
    const head = blocksOf(drawing.nodes)[0]!.head
    // its words were parsed alone, at 0:  `solita` drew as `hearts`, a pill over part of the app's name
    expect(head.pieces.map((piece) => [piece.kind, GAME.slice(piece.start, piece.end)])).toEqual([
      ["input", "solitaire"],
      ["words", " is an "],
      ["reference", "app"]
    ])
    const hearts = SP.SpellHighlighter.spans(GAME, SP.spellParser, file.match)
      .filter((span) => span.kind === "literal")
      .at(-1)
    expect(hearts && GAME.slice(hearts.start, hearts.end)).toBe("hearts")
    expect(hearts!.start).toBe(GAME.indexOf("suit=hearts") + "suit=".length)
  })

  it("draws the name a thing's head defines as a pill, bare as well as quoted, in English and Spanish (epic `language` T131)", () => {
    const heads = (contents: string, path = "/Game.spell") => {
      const file = parseSpellProject([{ path, contents }]).files[0]!
      const within = { match: file.match, inputLines: contents.split("\n") } as unknown as SP.SpellFile
      const drawing = SP.BubblyLayout.of(contents, SP.spellParser, { within })
      return blocksOf(drawing.nodes)
        .filter((block) => block.level === 0)
        .map((block) =>
          SP.BubblyStretches.ofLine(contents, block.head, { band: block.partOfSpeech })
            .filter((stretch) => stretch.kind === "input")
            .map((stretch) => `${contents.slice(stretch.start, stretch.end)}${stretch.isName ? " (name)" : ""}`)
        )
    }
    const GAME = `a card is a draggable two sided view
\tits "rank" is a number
a "pile" is a list of cards
a deck is a list of cards
solitaire is an app 
\t-- See the rules
\t"stock" is a new pile
`
    expect(heads(GAME)).toEqual([["card (name)"], ["pile (name)"], ["deck (name)"], ["solitaire (name)"]])
    expect(heads("solitario es una aplicación\n\tal crear solitario\n\t\timprimir 1\n", "/Juego.es.spell")).toEqual([
      ["solitario (name)"]
    ])
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
