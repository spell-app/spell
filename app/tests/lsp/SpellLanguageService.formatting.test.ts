import { describe, expect, test } from "vite-plus/test"
import { cpSync, mkdtempSync, readdirSync, readFileSync } from "fs"
import { tmpdir } from "os"
import { resolve } from "path"
import { pathToFileURL } from "url"
import type { FormattingOptions, TextEdit } from "vscode-languageserver"

import { P } from "spell/parser/parser"
import { LSP } from "spell/app/lsp"
import { SpellDiskWorkspace } from "spell/app/lsp/SpellDiskWorkspace"
import { EXAMPLE_PROJECTS, EXAMPLES_GROUP, fixtureFolder } from "spell/app/spaces/test"

/**
 * The examples whose code isn't formatted yet, outside their drawings (epic `editor` T71:  reported, left as they are):
 * - a trailing space after `solitaire is an app`, a tab on blank lines
 * - a continued line's two spaces, `\t\t  its value + 1 ...`, become a tab:  a level, measured by width
 */
const UNFORMATTED = new Set(["Solitaire/Solitaire.spell", "Solitario/Solitario.es.spell"])

/** A view type of a file of its own, its drawing's head last:  the tests' drawings go under it. */
const NOTE = 'a "note" is a view\n\tits "done" is a flag\n\tto draw it\n\t'

/** Format Document's settings, as the editor sends them. */
const OPTIONS: FormattingOptions = { tabSize: 2, insertSpaces: false }

/**
 * Format Document re-indents by structure (epic `editor` T71):  a drawing's markup laid out as a tree, a body under
 * its head, never changing what the program says;  in temp copies of the examples.
 * - Lines are found by what they say, never by number:  the examples are Owen's, and change.
 */
describe("SpellLanguageService.formatting() re-indents by structure (epic `editor` T71)", () => {
  const dir = mkdtempSync(resolve(tmpdir(), "spell-lsp-formatting-"))
  const workspace = new SpellDiskWorkspace()
  const service = new LSP.SpellLanguageService(workspace)
  const copied = new Set<string>()

  /** Copy example `project` in, and open its file `name` with `text`, else as it is. */
  async function opened(project: string, name: string, text?: string) {
    if (!copied.has(project)) {
      cpSync(fixtureFolder(`@spell/examples/${project}`), resolve(dir, project), { recursive: true })
      copied.add(project)
    }
    const uri = pathToFileURL(resolve(dir, project, name)).href
    const written = text ?? readFileSync(resolve(dir, project, name), "utf8")
    await workspace.update(uri, written)
    return { text: written, file: workspace.fileFor(uri)! }
  }

  /** `text` with `edits` made. */
  function edited(text: string, edits: TextEdit[]): string {
    const starts = P.getLineStarts(text)
    const offsetOf = ({ line, character }: { line: number; character: number }) => starts[line]! + character
    return [...edits]
      .sort((a, b) => offsetOf(b.range.start) - offsetOf(a.range.start))
      .reduce(
        (result, { range, newText }) =>
          result.slice(0, offsetOf(range.start)) + newText + result.slice(offsetOf(range.end)),
        text
      )
  }

  /** Solitaire.spell, formatted:  its drawings as Format Document lays them out (see `UNFORMATTED`). */
  async function formattedSolitaire(): Promise<string> {
    const { text, file } = await opened("Solitaire", "Solitaire.spell")
    return edited(text, service.formatting(file, OPTIONS))
  }

  test("a drawing's markup, its indents lost:  laid out as a tree again, its closing tags back at their tags' level", async () => {
    const laidOut = await formattedSolitaire()
    // every line of the drawing at its first line's indent
    const lines = laidOut.split("\n")
    const from = lines.findIndex((line) => line.includes('<deck "deck"'))
    const to = lines.findIndex((line) => line.includes("</context-menu>"))
    const flat = lines.map((line, index) => (index > from && index <= to ? `\t\t${line.trim()}` : line)).join("\n")
    expect(flat).not.toBe(laidOut)
    const { file } = await opened("Solitaire", "Solitaire.spell", flat)
    const edits = service.formatting(file, OPTIONS)
    expect(edited(flat, edits)).toBe(laidOut)
    // one edit per line, each its indent alone:  the caret keeps its place
    expect(edits.every(({ range, newText }) => range.start.line === range.end.line && !newText.trim())).toBe(true)
    expect(edits.length).toBe(lines.slice(from + 1, to + 1).filter((line) => !line.startsWith("\t\t<")).length)
  })

  test("...an if-chain's next branch back at its `<if>`'s level, one closer for the chain", async () => {
    const text = `${NOTE}\t<text>\n\t\t<if it is done>\n\t\tDone\n\t\t<otherwise>\n\t\tNot yet\n\t\t</>\n\t\t</text>\n`
    const { file } = await opened("Solitaire", "Notes.spell", text)
    expect(edited(text, service.formatting(file, OPTIONS))).toBe(
      `${NOTE}\t<text>\n\t\t\t<if it is done>\n\t\t\t\tDone\n\t\t\t<otherwise>\n\t\t\t\tNot yet\n\t\t\t</>\n\t\t</text>\n`
    )
  })

  test("a body under its head, however far in it was written:  one level", async () => {
    const text = 'to "deal again"\n\t\t\tclear the score\n\t\t\tif the score is 0\n\t\t\t\t\tclear the score\n'
    const { file } = await opened("Solitaire", "Notes.spell", text)
    expect(edited(text, service.formatting(file, OPTIONS))).toBe(
      'to "deal again"\n\tclear the score\n\tif the score is 0\n\t\tclear the score\n'
    )
  })

  test("a tag's attributes on lines of their own keep their place under it, lined up as written", async () => {
    const laidOut = await formattedSolitaire()
    const split = laidOut.replace(
      '\t\t<container columns="7" padding="small" spacing="xs">',
      '\t\t<container columns="7"\n\t\t           padding="small" spacing="xs">'
    )
    const { file } = await opened("Solitaire", "Solitaire.spell", split)
    expect(edited(split, service.formatting(file, OPTIONS))).toBe(split)
  })

  test("a raw-text tag's lines are its own:  `<markdown>`'s move with it, as they were written under it", async () => {
    const text = `${NOTE}\t<segment>\n\t\t<markdown>\n\t\t# Title\n\n\t\t    code\n\t\t</markdown>\n\t\t</segment>\n`
    const { file } = await opened("Solitaire", "Notes.spell", text)
    expect(edited(text, service.formatting(file, OPTIONS))).toBe(
      `${NOTE}\t<segment>\n\t\t\t<markdown>\n\t\t\t# Title\n\n\t\t\t    code\n\t\t\t</markdown>\n\t\t</segment>\n`
    )
  })

  describe("every example's files format to themselves", () => {
    const examples = [...EXAMPLE_PROJECTS].filter((it) => it.startsWith(`${EXAMPLES_GROUP}/`))
    for (const project of examples.map((it) => it.slice(EXAMPLES_GROUP.length + 1))) {
      const names = readdirSync(fixtureFolder(`@spell/examples/${project}`)).filter((name) => name.endsWith(".spell"))
      for (const name of names) {
        test(`${project}/${name}`, async () => {
          const { text, file } = await opened(project, name)
          // a property editors file, `Card.editor.spell`, is no program's:  nothing formats it
          if (!file) return
          const edits = service.formatting(file, OPTIONS)
          const lines = text.split("\n")
          // never a drawing's line:  their markup is laid out as Format Document lays it out
          const markup = edits.filter(({ range }) => /^\s*</.test(lines[range.start.line]!))
          expect(markup).toEqual([])
          if (!UNFORMATTED.has(`${project}/${name}`)) expect(edited(text, edits)).toBe(text)
        })
      }
    }
  })
})
