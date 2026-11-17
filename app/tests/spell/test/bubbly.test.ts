import { describe, test, expect } from "vite-plus/test"

import { SP } from "spell/parser/spell"
import { parseSpellProject } from "spell/parser/spell/test"
import {
  EXAMPLE_PROJECTS,
  GUIDE_PROJECTS,
  bareNameOf,
  fixtureImportScope,
  fixtureProjectId,
  loadFixtureProject,
  snapshotPath
} from "spell/app/spaces/test"

/**
 * Every example's and Spell guide's DRAWING in the bubbly look, against its snapshot (epic `language` P60):
 * what `SP.BubblyLayout.of()` makes of each file, as the editor draws it, in its project's parse.
 * - Every line's pieces, its underlines, its pill's names and its code;  each declaration's band and rule.
 * - So a change to how a rule presents (its roles, the layout's code) shows here as a diff of what's drawn:
 *   a refactor of the look changes nothing here;  a change to the look changes exactly what it means to.
 * - `<Project>.bubbly.snapshot.txt`, beside its other snapshots (`tests/spell/__examples__/<Project>/` ...).
 * - Changed on purpose:  `spell content check --bless` (or `yarn spell:test:fixtures:bless`), then read the diff.
 * - The drawing of a snippet alone, with no project around it (the docs pages'), is `BubblyLayout.test.ts`'s.
 */
describe("every example and guide draws as its snapshot", () => {
  for (const name of [...EXAMPLE_PROJECTS, ...GUIDE_PROJECTS]) {
    test(
      name,
      async () => {
        await expect(bubblyDrawings(name)).toMatchFileSnapshot(
          snapshotPath(name, `${bareNameOf(name)}${BUBBLY_SNAPSHOT_SUFFIX}`)
        )
      },
      30_000
    )
  }
})

/**
 * Laid out from its TEXT alone (as the editor draws a file before its project's parse, or with none), Solitaire's
 * files have the SAME blocks as in the project's parse:  each control block and declaration, where its head and its
 * foot are, how deep it sits (epic `codemirror` I23).
 * - Its lines naming what another file declares (`if the stock is empty`) don't parse alone:  their shape comes from
 *   their first words (`BubblyLayout.shapeOf()`).
 * - Not which rule a head is, nor its colour:  a head that parses alone may read as another rule.
 * - Not Pile.spell:  `belongs to one pile` is a property's band only to a parse that knows `pile`.
 */
test("Solitaire's files have the same blocks laid out from their text as from their project's parse", () => {
  const name = "@spell/examples/Solitaire"
  const { files } = parseSpellProject(loadFixtureProject(name), {
    parentScope: fixtureImportScope(name),
    projectPath: fixtureProjectId(name)
  })
  for (const { path, contents, scope, match } of files.filter((file) => !file.path.endsWith("Pile.spell"))) {
    const parser = scope.parser as SP.SpellParser
    const within = { match, inputLines: contents.split("\n") } as unknown as SP.SpellFile
    const fromParse = blocksOf(SP.BubblyLayout.of(contents, parser, { within }))
    expect(blocksOf(SP.BubblyLayout.of(contents, parser)), path).toEqual(fromParse)
  }
})

/** `drawing`'s shape, one entry a node:  a line's or gap's start, a block's head and level, then its body's. */
function blocksOf(drawing: SP.BubblyDrawing): string[] {
  return drawing.nodes.flatMap(function shape(node): string[] {
    if (node.kind !== "block") return [`${node.kind}@${node.start}`]
    const { head, level, isGroup } = node
    return [`block@${head.start}-${head.end} L${level}${isGroup ? " group" : ""}`, ...node.body.flatMap(shape), "foot"]
  })
}

/** What each project's drawing snapshot ends in. */
const BUBBLY_SNAPSHOT_SUFFIX = ".bubbly.snapshot.txt"

/** How each piece kind wraps its words;  `words` and `mark` plain. */
const WRAPS: Partial<Record<SP.BubblyPieceKind, [string, string]>> = {
  reference: ["**", "**"],
  value: ["_", "_"],
  input: ["«", "»"],
  choice: ["‹", "›"],
  tag: ["⟨", "⟩"],
  comment: ["⟦", "⟧"],
  heading: ["⟪", "⟫"],
  "heading-mark": ["⟪#", "⟫"]
}

/** Project `name`'s files, each drawn in its project's parse, as one text. */
function bubblyDrawings(name: string): string {
  const sources = loadFixtureProject(name)
  const { files } = parseSpellProject(sources, {
    parentScope: fixtureImportScope(name),
    projectPath: fixtureProjectId(name)
  })
  return files
    .map(({ path, contents, scope, match }) => {
      // the project's parse of it, as the editor's `SpellFile` hands it over
      const within = { match, inputLines: contents.split("\n") } as unknown as SP.SpellFile
      const drawing = SP.BubblyLayout.of(contents, scope.parser as SP.SpellParser, { within })
      return `==== ${path}\n${drawingText(drawing)}`
    })
    .join("\n\n")
}

/**
 * `drawing` as text, one line of source a line:  each block's band and rule, then its head and its body indented;
 * each line's pieces wrapped by kind (`WRAPS`), then what's drawn over it, `‾value(the pile's suit)` ...
 */
function drawingText(drawing: SP.BubblyDrawing): string {
  const { text } = drawing
  const declaring = new Set(drawing.declaringTags)
  const out: string[] = []
  const slice = ({ start, end }: { start: number; end: number }) => text.slice(start, end)
  const lineText = (line: SP.BubblyLine, indent: string) => {
    const words = line.pieces
      .map((piece) => {
        const wrap = WRAPS[piece.kind]
        return wrap ? `${wrap[0]}${slice(piece)}${wrap[1]}` : slice(piece)
      })
      .join("")
    const over = [
      ...line.underlines.map((each) => `‾${each.kind}(${slice(each)})`),
      ...(line.pillNames ?? []).map((each) => `bold(${slice(each)})`),
      ...(line.codes ?? []).map((each) => `code(${slice(each)})`),
      ...[...declaring].filter((at) => at >= line.start && at < line.end).map((at) => `declares@${at - line.start}`)
    ]
    out.push(`${indent}${words}${over.length ? `    ${over.join(" ")}` : ""}`)
  }
  const walk = (nodes: SP.BubblyNode[], indent: string) => {
    for (const node of nodes) {
      if (node.kind === "gap") out.push("")
      else if (node.kind === "line") lineText(node, `${indent}${"  ".repeat(node.depth)}`)
      else {
        out.push(`${indent}[${node.partOfSpeech}${node.isGroup ? " group" : ""} ${node.rule} L${node.level}]`)
        lineText(node.head, `${indent}| `)
        walk(node.body, `${indent}|   `)
      }
    }
  }
  walk(drawing.nodes, "")
  return out.join("\n")
}
