import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { afterEach, describe, expect, test, vi } from "vite-plus/test"

import { placeNerd } from "spell/parser/cli/placeNerd"

/** A small place's description, as the ingester writes it:  films, each with its people. */
const DESCRIPTION = {
  collections: {
    films: {
      type: "film",
      fields: {
        title: { words: "title", type: "text" },
        characters: { words: "characters", type: "list of links", linksTo: "people" }
      }
    },
    people: {
      type: "person",
      fields: {
        name: { words: "name", type: "text" },
        homeworld: { words: "homeworld", type: "link", linksTo: "planets" }
      }
    },
    planets: { type: "planet", fields: { name: { words: "name", type: "text" } } }
  }
}

/** A scratch folder holding `Galaxy.api.json5`;  removed after each test. */
let folder = ""
function placeFile(): string {
  folder = mkdtempSync(join(tmpdir(), "place-nerd-"))
  writeFileSync(join(folder, "Galaxy.api.json5"), JSON.stringify(DESCRIPTION))
  return join(folder, "Galaxy.api.spell")
}
afterEach(() => {
  if (folder) rmSync(folder, { recursive: true, force: true })
  vi.restoreAllMocks()
})

describe("spell place nerd", () => {
  test("--output .json:  the NERD skill's spec, from the .spell file's description", () => {
    const file = placeFile()
    vi.spyOn(process.stdout, "write").mockReturnValue(true)
    const output = join(folder, "galaxy.json")
    expect(placeNerd(file, { output })).toBe(0)
    const spec = JSON.parse(readFileSync(output, "utf8")) as { columns: unknown[]; edges: unknown[] }
    expect(spec.columns.length).toBeGreaterThan(0)
    expect(spec.edges.length).toBe(2)
  })

  test("--output .svg:  the drawing, sized in points", () => {
    const file = placeFile()
    vi.spyOn(process.stdout, "write").mockReturnValue(true)
    const output = join(folder, "galaxy.svg")
    placeNerd(file, { output })
    const svg = readFileSync(output, "utf8")
    expect(svg).toMatch(/^<svg xmlns="http:\/\/www\.w3\.org\/2000\/svg" width="\d+pt"/)
    expect(svg).toContain(">Film<")
  })

  test("refuses an output that's neither, and a place with no description", () => {
    const file = placeFile()
    expect(() => placeNerd(file, { output: join(folder, "galaxy.png") })).toThrow(/\.svg or \.json/)
    expect(() => placeNerd(join(folder, "Missing.api.spell"), {})).toThrow(/no description/)
  })
})
