import { describe, expect, test } from "vite-plus/test"

import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
import {
  compiledSpellProject,
  incrementalSpellProject,
  parseSpellProject,
  summarize,
  summarizeIncremental
} from "spell/parser/spell/test"

/** A language's program, as Solitaire's deck starts, and what's typed into it. */
type Program = {
  /** Its file's path, which names its language. */
  path: string
  /** Its lines, each indented as it should be. */
  lines: string[]
  /** A property's head, its body two tabs in. */
  head: string
  /** A line in the middle of that body. */
  middle: string
  /** A method further down, which the body above it calls. */
  method: string
  /** A type's bodies of one value each:  a question's, its condition over lines, and a `return`'s. */
  values: string[]
  /** A condition's two lines, the second going on from the first. */
  condition: [first: string, second: string]
}

const PROGRAMS: Record<string, Program> = {
  English: {
    path: "/Deck.spell",
    lines: [
      "a card is a thing",
      'a "deck" is a list of cards',
      '\tits "label" is',
      '\t\tset summary to "deck"',
      "\t\tfor card in the deck",
      '\t\t\tset summary to summary + "!"',
      "\t\treturn summary",
      "\tto tidy up",
      "\t\tprint 1",
      "\tto check it",
      "\t\ttidy up",
      "\t\tif 1 is 1 and",
      "\t\t\t2 is 2",
      "\t\t\t\tprint 2",
      "print 3"
    ],
    head: '\tits "label" is',
    middle: "\t\t\tset summary",
    method: "\tto tidy up",
    values: [
      'a "pile" is a droppable list of cards',
      "\tit is droppable when",
      "\t\tit is empty",
      "\t\tor",
      "\t\t1 is 2",
      '\tits "top" is',
      "\t\t1 + 2",
      "\tto show it",
      "\t\treturn",
      "\t\t\t3"
    ],
    condition: ["\t\tif 1 is 1 and", "\t\t\t2 is 2"]
  },
  Spanish: {
    path: "/Mazo.es.spell",
    lines: [
      "una carta es una cosa",
      'un "mazo" es una lista de cartas',
      '\tsu "etiqueta" es',
      '\t\tponer resumen a "mazo"',
      "\t\tpara carta en el mazo",
      '\t\t\tponer resumen a resumen + "!"',
      "\t\tdevolver resumen",
      "\tpara ordenar todo",
      "\t\timprimir 1",
      "\tpara revisar todo",
      "\t\tordenar todo",
      "\t\tsi 1 es 1 y",
      "\t\t\t2 es 2",
      "\t\t\t\timprimir 2",
      "imprimir 3"
    ],
    head: '\tsu "etiqueta" es',
    middle: "\t\t\tponer resumen",
    method: "\tpara ordenar todo",
    values: [
      'una "pila" es una lista soltable de cartas',
      "\tes soltable cuando",
      "\t\testá vacía",
      "\t\to",
      "\t\t1 es 2",
      '\tsu "tope" es',
      "\t\t1 + 2",
      "\tpara mostrar todo",
      "\t\tdevolver",
      "\t\t\t3"
    ],
    condition: ["\t\tsi 1 es 1 y", "\t\t\t2 es 2"]
  }
}

/** Each way to write a comment on a line of its own. */
const COMMENTS = ["-- a note", "// a note"]

describe.each(Object.entries(PROGRAMS))(
  "a comment never cuts a block, whatever its indent, %s (epic `language` I181)",
  (_language, program) => {
    const { path, lines, head, middle, method, condition, values } = program
    /** The program with `added` just after its line `at`. */
    const withLines = (at: number, ...added: string[]) => [...lines.slice(0, at + 1), ...added, ...lines.slice(at + 1)]
    const parsed = (text: string[]) => parseSpellProject([{ path, contents: text.join("\n") }]).files[0]!
    const codeOf = (text: string[]) => compiledSpellProject([{ path, contents: text.join("\n") }]).code
    const atHead = lines.indexOf(head)
    const atMiddle = lines.findIndex((line) => line.startsWith(middle))

    test("as written, it's clean", () => {
      expect(parsed(lines).errors).toEqual([])
    })

    test.each(COMMENTS)("at a body's start, `%s` is its description, however it's indented", (comment) => {
      const indented = codeOf(withLines(atHead, `\t\t${comment}`))
      expect(indented).toContain("/** a note */")
      for (const indent of ["", "\t", " ", "  \t", "\t\t\t", "\t\t\t\t\t"]) {
        const text = withLines(atHead, indent + comment)
        expect(parsed(text).errors, JSON.stringify(indent)).toEqual([])
        expect(codeOf(text), JSON.stringify(indent)).toBe(indented)
      }
    })

    test.each(COMMENTS)("in a body's middle, `%s` outdented is read in the body", (comment) => {
      const indented = codeOf(withLines(atMiddle - 1, `\t\t\t${comment}`))
      for (const indent of ["", "\t", "\t\t"]) {
        const text = withLines(atMiddle - 1, indent + comment)
        expect(parsed(text).errors, JSON.stringify(indent)).toEqual([])
        expect(codeOf(text), JSON.stringify(indent)).toBe(indented)
      }
      expect(parsed(withLines(atMiddle, `\t\t\t\t\t${comment}`)).errors, "over-indented").toEqual([])
    })

    test("several in a row, blank lines among them, read as they would indented", () => {
      const text = withLines(atHead, "-- one", "", "\t// two", "\t\t\t\t-- three")
      const indented = withLines(atHead, "\t\t-- one", "", "\t\t// two", "\t\t-- three")
      expect(parsed(text).errors).toEqual([])
      expect(codeOf(text)).toBe(codeOf(indented))
    })

    test("a comment deeper under one written at the body's indent stays under it", () => {
      const text = withLines(atHead, "\t\t-- one", "\t\t\t-- more of it")
      const [root] = parsed(text).match!.tokens as P.BlockToken[]
      const indents: number[] = []
      P.Tokenizer.forEachToken([root!], (token) => {
        if (token instanceof P.LineToken && token.tokens[0] instanceof P.CommentToken) indents.push(token.indent)
      })
      expect(indents).toEqual([2, 3])
    })

    test("at a block's end, it belongs where it's written:  after the body, or last in it", () => {
      const last = lines.length - 2
      const outside = parsed(withLines(last, "-- a note"))
      const inside = parsed(withLines(last, "\t\t-- a note"))
      expect(outside.errors).toEqual([])
      expect(inside.errors).toEqual([])
      const lineAfter = (text: typeof outside) =>
        (text.match!.tokens[0] as P.BlockToken).tokens.filter(
          (item) => item instanceof P.LineToken && item.tokens[0] instanceof P.CommentToken
        ).length
      expect(lineAfter(outside)).toBe(1)
      expect(lineAfter(inside)).toBe(0)
    })

    test("at the left edge in a type's body, the members under it are still known ahead", () => {
      const before = lines.indexOf(method) - 1
      const text = withLines(before, "-- a note")
      expect(parsed(text).errors).toEqual([])
      const parser = SP.Language.forFile(path).parser as SP.SpellParser
      expect(parser.declaredMethods(text.join("\n"))).toEqual(parser.declaredMethods(lines.join("\n")))
      expect(parser.declaredProperties(text.join("\n"))).toEqual(parser.declaredProperties(lines.join("\n")))
    })

    test("among the lines of one condition, it doesn't end it", () => {
      const [first, second] = condition
      for (const indent of ["", "\t", "\t\t", "\t\t\t", "\t\t\t\t"]) {
        const between = withLines(lines.indexOf(first), `${indent}-- a note`)
        expect(parsed(between).errors, `between, ${JSON.stringify(indent)}`).toEqual([])
        const after = withLines(lines.indexOf(second), `${indent}-- a note`)
        expect(parsed(after).errors, `after, ${JSON.stringify(indent)}`).toEqual([])
      }
    })

    // every place by every indent, each a parse and a compile:  slow under load, so its own timeouts
    test.each(COMMENTS)(
      "beside a body's one value, or a lone `or`, `%s` changes nothing it does",
      (comment) => {
        const written = [lines[0]!, ...values]
        expect(parsed(written).errors).toEqual([])
        /** Compiled, its comments and spacing aside. */
        const runs = (text: string[]) =>
          codeOf(text)
            .replace(/\/\*[^]*?\*\/|\/\/[^\n]*/g, "")
            .replace(/\s+/g, " ")
            .trim()
        const plain = runs(written)
        for (let at = 1; at < written.length; at++)
          for (const indent of ["", "\t", "\t\t", "\t\t\t", "\t\t\t\t"]) {
            const text = [...written.slice(0, at + 1), indent + comment, ...written.slice(at + 1)]
            expect(parsed(text).errors, JSON.stringify([at, indent])).toEqual([])
            expect(runs(text), JSON.stringify([at, indent])).toBe(plain)
          }
      },
      30_000
    )

    test("being typed beside a body's one value, a lone `-` is its line's error alone", () => {
      // up to the last value but `return`'s, which takes one line under it, and that line only
      const written = [lines[0]!, ...values.slice(0, -3)]
      for (let at = 1; at < written.length; at++)
        for (const indent of ["", "\t", "\t\t", "\t\t\t"]) {
          const { errors } = parsed([...written.slice(0, at + 1), `${indent}-`, ...written.slice(at + 1)])
          expect(errors, JSON.stringify([at, indent])).toHaveLength(1)
          expect(String(errors[0]), JSON.stringify([at, indent])).toMatch(new RegExp(`^${at + 2}:`))
        }
    }, 30_000)

    test("being typed, a lone `-` or `/` is its line's error alone;  only whitespace is none", () => {
      for (const at of [atHead, atMiddle - 1, atMiddle])
        for (const indent of ["", "\t", "\t\t", "\t\t\t\t"]) {
          for (const typed of ["-", "/", "- "]) {
            const { errors } = parsed(withLines(at, indent + typed))
            expect(errors, JSON.stringify([at, indent, typed])).toHaveLength(1)
            expect(String(errors[0]), JSON.stringify([at, indent, typed])).toMatch(new RegExp(`^${at + 2}:`))
          }
          if (indent) expect(parsed(withLines(at, indent)).errors, JSON.stringify([at, indent])).toEqual([])
        }
    }, 30_000)

    test("typed and deleted a character at a time, an incremental parse is a full one", () => {
      for (const at of [atHead, atMiddle - 1, lines.indexOf(method) - 1]) {
        const project = incrementalSpellProject([{ path, contents: lines.join("\n") }])
        for (const typed of ["\t-- n", "// n", "\t\t\t\t--"]) {
          const keys = Array.from({ length: typed.length }, (_, index) => typed.slice(0, index + 1))
          for (const line of ["", ...keys, ...keys.toReversed(), ""]) {
            const contents = withLines(at, line).join("\n")
            project.update(path, contents)
            expect(summarizeIncremental(project), JSON.stringify([at, line])).toEqual(
              summarize(parseSpellProject([{ path, contents }]))
            )
          }
        }
      }
    }, 30_000)

    test("the bubbly look keeps its band around it", () => {
      const parser = SP.Language.forFile(path).parser as SP.SpellParser
      /** Each line's kind and depth, as nested. */
      const shapeOf = (nodes: SP.BubblyNode[]): unknown[] =>
        nodes.map((node) =>
          node.kind === "block" ? [node.rule, shapeOf(node.body)] : node.kind === "line" ? node.depth : node.kind
        )
      const drawn = (text: string[]) => shapeOf(SP.BubblyLayout.of(text.join("\n"), parser).nodes)
      const indented = drawn(withLines(atHead, "\t\t-- a note"))
      expect(drawn(withLines(atHead, "-- a note"))).toEqual(indented)
      expect(drawn(withLines(atHead, "\t-- a note"))).toEqual(indented)
    })

    test("a `#` heading still ends a block:  it starts a section", () => {
      expect(parsed(withLines(atMiddle - 1, "## A section")).errors).not.toEqual([])
    })
  }
)
