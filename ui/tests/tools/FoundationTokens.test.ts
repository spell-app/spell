import { describe, expect, test } from "vite-plus/test"

import { FoundationTokens } from "spell/ui/tools/FoundationTokens"

describe("FoundationTokens.groups()", () => {
  test("groups every :root token of the generated sheets, none left over, colours typed", () => {
    const groups = new FoundationTokens(new URL("../../src/styles/", import.meta.url).pathname).groups()
    const ids = groups.map((group) => group.id)
    expect(ids).toEqual(expect.arrayContaining(["typography", "spacing", "radii", "palette", "brand", "semantic"]))
    expect(ids).not.toContain("other")
    const all = groups.flatMap((group) => group.tokens)
    expect(all.find((token) => token.name === "--ui-font-size")).toMatchObject({ default: "16px", type: "length" })
    expect(all.find((token) => token.name === "--ui-red-hover")).toMatchObject({ type: "color" })
    expect(all.some((token) => token.name.startsWith("--ui-sheet-"))).toBe(false)
    expect(all.every((token) => token.description)).toBe(true)
  })
})

describe("FoundationTokens.rootDeclarations()", () => {
  test("reads only top-level :root declarations, inside @layer;  every prefix asked for, in sheet order", () => {
    const css =
      "@layer a { :root { --ui-x: 1px; --spell-y: light-dark(#fff, #000); --ui-z: 2 } } " +
      "@media (x) { :root { --ui-w: 2 } } .a { --ui-v: 3 }"
    const read = (prefixes?: string[]) =>
      FoundationTokens.rootDeclarations(css, prefixes).map(({ name, value }) => ({ name, value }))
    expect(read(["ui", "spell"])).toEqual([
      { name: "--ui-x", value: "1px" },
      { name: "--spell-y", value: "light-dark(#fff, #000)" },
      { name: "--ui-z", value: "2" }
    ])
    expect(read()).toEqual([
      { name: "--ui-x", value: "1px" },
      { name: "--ui-z", value: "2" }
    ])
  })
})
