import { describe, test, expect } from "vite-plus/test"

import { parseSpellProject } from "$/spell/test"

/**
 * Names in any script (epic `spanish` P1):  a type `Árbol`, a property `corazón` and a method `es un trébol`
 * keep their accents from the source through to the compiled code.
 * - The grammar is still English here;  only the NAMES are Spanish.
 * - Why:  JavaScript, TypeScript and Python all take `corazón` as a name, and a Spanish author reads it (Q2).
 */
describe("names with accents", () => {
  test("a type, its properties and a method keep their accents in the compiled code", () => {
    const compiled = compile([
      "an árbol is a thing",
      "an árbol has a corazón as text",
      "an árbol has a número as a number",
      'an árbol "es un trébol" if its corazón is "trébol"',
      "the año-nuevo of an árbol is its número + 1"
    ])
    expect(compiled).toMatch(/export class Árbol extends Thing/)
    expect(compiled).toMatch(/\bcorazón\b/)
    expect(compiled).toMatch(/\besUnTrébol\b/)
    expect(compiled).toMatch(/\bañoNuevo\b/)
    // Bare names, never quoted keys:  `obj["corazón"]` would mean the writer still thought it illegal.
    expect(compiled).not.toMatch(/\["corazón"\]|\["esUnTrébol"\]/)
  })

  test("a decomposed accent in the source names the same member as the composed one", () => {
    const composed = compile(["an árbol is a thing", "an árbol has a corazón as text"])
    const decomposed = compile(["an árbol is a thing", "an árbol has a corazón as text"])
    // The source's own text and offsets stay as typed:  one character longer per decomposed accent.
    expect(namesOnly(decomposed)).toBe(namesOnly(composed))
  })
})

/** `compiled` without its source comments and source positions:  what the names compile to. */
function namesOnly(compiled: string): string {
  return compiled
    .split("\n")
    .filter((line) => !/^\s*\/\/|\bdefined: /.test(line))
    .join("\n")
}

/** Compile `lines` as one file, failing on any parse error. */
function compile(lines: string[]): string {
  const { files } = parseSpellProject([{ path: "/test.spell", contents: lines.join("\n") }])
  const [file] = files
  if (file!.errors.length) throw new Error(`parse errors:\n${JSON.stringify(file!.errors, null, 2)}`)
  return file!.compiled
}
