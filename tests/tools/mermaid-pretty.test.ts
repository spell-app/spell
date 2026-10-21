import { describe, expect, test } from "vite-plus/test"

import { MermaidPretty, kindFor } from "../../tools/mermaid-pretty.ts"

/** a page with one plain flowchart and one plain sequence diagram */
const PAGE = [
  "# A page",
  "",
  "```mermaid",
  "flowchart LR",
  '  kit["spell-kit<br/>util · server"] --> data[".epic/config.json5"]',
  '  es["Spanish, coming"] -.-> step["1 · tokens"]',
  "```",
  "",
  "_A caption._",
  "",
  "```mermaid",
  "sequenceDiagram",
  "  page->>root: connects",
  "```",
  ""
].join("\n")

describe("MermaidPretty", () => {
  test("styles every block:  the directive on top, a flowchart's classes below", () => {
    const styled = new MermaidPretty().page(PAGE)
    const blocks = styled.split("```mermaid\n").slice(1)
    expect(blocks[0]).toMatch(/^%%\{init: \{"theme":"base"/)
    expect(blocks[0]).toContain('"flowchart":{"curve":"basis"')
    expect(blocks[0]).toContain("  class kit repo\n")
    expect(blocks[0]).toContain("  class step step\n")
    expect(blocks[0]).toContain("  class data data\n")
    expect(blocks[0]).toContain("  class es coming\n")
    expect(blocks[1]).toMatch(/^%%\{init: .*"sequence":\{"mirrorActors":false/)
    expect(blocks[1]).not.toContain("classDef")
    expect(styled).toContain("_A caption._")
  })

  test("is idempotent:  a styled page comes back the same", () => {
    const pretty = new MermaidPretty()
    const once = pretty.page(PAGE)
    expect(pretty.page(once)).toBe(once)
  })

  test("restyles in the other theme without doubling", () => {
    const light = new MermaidPretty().page(PAGE)
    const dark = new MermaidPretty("dark").page(light)
    expect(dark.match(/%%\{init:/g)).toHaveLength(2)
    expect(dark).toContain('"darkMode":"true"')
  })
})

describe("kindFor()", () => {
  test("sorts a node by what it names", () => {
    expect(kindFor("lang", "spell-lang: the language")).toBe("repo")
    expect(kindFor("x", "the kit")).toBe("repo")
    expect(kindFor("x", "the kit's folders")).toBeUndefined()
    expect(kindFor("x", "spell-lang/core")).toBeUndefined()
    expect(kindFor("x", "🌱 sharing")).toBe("coming")
    expect(kindFor("x", "2 · tokens")).toBe("step")
    expect(kindFor("x", "docs/:  the pages")).toBe("folder")
    expect(kindFor("x", "AGENTS.md: the kit's")).toBe("data")
    expect(kindFor("x", "the page server")).toBeUndefined()
  })
})
