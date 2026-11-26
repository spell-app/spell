import { describe, expect, test } from "vite-plus/test"

import { parseSpellProject } from "spell/parser/spell/test"
import { TSWriter } from "spell/parser/parser/writers/TSWriter"

/**
 * The spaces between two of an element's children on one line are drawn, as JSX keeps them (epic `data` I75):
 * `{its flag} {the common of its name}` draws "🇦🇽 Åland", not "🇦🇽Åland".
 */
describe("spaces between holes", () => {
  /** `drawing`, a country's drawing:  its errors, its javascript and its TypeScript. */
  function compiled(drawing: string) {
    const lines = ["a country is a thing", "\tits flag is text", "\tits name is text", "\tto draw it", `\t\t${drawing}`]
    const [file] = parseSpellProject([{ path: "/Test.spell", contents: lines.join("\n") }]).files
    return { errors: file!.errors, js: `${file!.compiled}`, ts: String(TSWriter.instance.writeMatch(file!.match!)) }
  }

  test("a space between two holes is kept, in javascript and TypeScript", () => {
    const { errors, js, ts } = compiled("<cell header>{its flag} {its name}</cell>")
    expect(errors).toEqual([])
    expect(js).toContain('h("cell", { header: true }, () => this.flag, " ", () => this.name)')
    expect(ts).toMatch(/\{this\.flag\}\s*\{" "\}\s*\{this\.name\}|\{this\.flag\} \{this\.name\}/)
  })

  test("a space between a hole and a tag is kept", () => {
    const { js } = compiled("<cell>{its flag} <b>{its name}</b></cell>")
    expect(js).toMatch(/\(\) => this\.flag,\s+" ",\s+h\("b"/)
  })

  test("text between holes keeps its spaces, as before", () => {
    const { js } = compiled("<cell>{its flag} · {its name}</cell>")
    expect(js).toContain('() => this.flag, " · ", () => this.name')
  })

  test("an indent between children on their own lines is not a space", () => {
    const { js } = compiled("<cell>\n\t\t\t{its flag}\n\t\t\t{its name}\n\t\t</cell>")
    expect(js).not.toContain('" "')
  })
})
