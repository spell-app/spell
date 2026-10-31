import { describe, expect, test } from "vite-plus/test"

import { P } from "spell/parser/parser"
import { compiledFixture, compiledFixtureWithMap, fixtureProjectNames } from "spell/app/spaces/test"

/**
 * Source maps over every fixture project (epic `elemental-spell` P14):  compiled with its map, each project's code is
 * EXACTLY its code without one, for both javascript-family targets, so the map changes nothing that runs.
 * - The marks themselves:  spell-parser's `SourceMaps.test.ts`.
 */
describe("source maps change no compiled code", () => {
  for (const name of fixtureProjectNames()) {
    for (const target of ["js/solid", "ts/solid"]) {
      // a big project's compile takes its time, under a full run's load
      test(`${name} (${target})`, { timeout: 30_000 }, () => {
        const { code, map } = compiledFixtureWithMap(name, target)
        expect(code).toBe(compiledFixture(name, target))
        expect(map.mappings.replaceAll(";", "").length, "it maps some lines").toBeGreaterThan(0)
      })
    }
  }
})

/**
 * What's drawn and made says where it's written (epic `editor` P7):  the same map, stamped only into what the editor runs.
 */
describe.each(["@spell/examples/Solitaire", "@spell/examples/Solitario"] as const)("%s's parts", (name) => {
  const { code, map } = compiledFixtureWithMap(name)
  const parts = map.x_spellPlaces ?? []
  const lineAt = (source: number, line: number, column: number) =>
    map.sourcesContent![source]!.split("\n")[line]!.slice(column)

  test("each drawn tag points at its tag, each made thing at the words making it", () => {
    const drawn = parts.filter(([, , kind]) => kind === "h")
    const made = parts.filter(([, , kind]) => kind === "new")
    expect(drawn.length).toBeGreaterThan(5)
    expect(made.length).toBeGreaterThan(5)
    for (const [, , , source, line, column] of drawn) expect(lineAt(source, line, column)).toMatch(/^<[\p{L}]/u)
    // spell made a few by itself:  a test's own subject, at its `<test>`;  the app, at its name or its header
    const words = made.map(([, , , source, line, column]) => lineAt(source, line, column))
    const written = words.filter((text) => /^(an? new|una? nuev|un nuev)/i.test(text))
    expect(written.length / words.length).toBeGreaterThan(0.8)
  })

  test("the code the editor runs says so;  the code that ships never does", () => {
    expect(code).not.toContain("data-spell-at")
    expect(code).not.toContain("spell.madeAt")
    const stamped = P.SourceMarks.stamped(code, JSON.stringify(map))
    expect(stamped).toContain('"data-spell-at": "')
    expect(stamped).toContain('Symbol.for("spell.madeAt")')
    // a line for a line:  the map still holds
    expect(stamped.split("\n").length).toBe(code.split("\n").length)
    // it still reads as javascript
    const AsyncFunction = (async () => {}).constructor as FunctionConstructor
    const body = stamped
      .replace(/^import .*$/gm, "")
      .replace(/^export \{.*$/gm, "")
      .replace(/^export /gm, "")
    expect(() => new AsyncFunction(body)).not.toThrow()
  })
})
