import { readdirSync } from "node:fs"
import { resolve } from "node:path"

import { describe, expect, test } from "vite-plus/test"

import { SPACES } from "spell/app/spaces"

/** The home page's order of cards (epic `mockup` P19):  `SPACES.inHomeOrder()`, and the list it reads. */
describe("the home page's order", () => {
  const projects = [
    "@spell/examples/calculator",
    "@spell/examples/zebra",
    "@spell/examples/fizzbuzz",
    "@spell/examples/apple"
  ].map((path) => ({ path }))
  const order = { "@spell/examples": ["fizzbuzz", "calculator"] }

  test("the listed ones in the list's order, then the rest by name:  a new project goes to the end", () => {
    expect(SPACES.inHomeOrder("@spell/examples", projects, order).map((each) => each.path)).toEqual([
      "@spell/examples/fizzbuzz",
      "@spell/examples/calculator",
      "@spell/examples/apple",
      "@spell/examples/zebra"
    ])
  })

  test("a group the list doesn't name:  by name;  the projects given are left as they were", () => {
    expect(SPACES.inHomeOrder("@spell/guides", projects, order).map(({ path }) => SPACES.folderNameOf(path))).toEqual([
      "apple",
      "calculator",
      "fizzbuzz",
      "zebra"
    ])
    expect(projects[0]!.path).toBe("@spell/examples/calculator")
  })

  test("the saved list names only projects that are there, each once", () => {
    for (const [group, names] of Object.entries(SPACES.HOME_ORDER)) {
      const folders = readdirSync(resolve(import.meta.dirname, "../../../spaces", group))
      for (const name of names) expect(folders, `${group}'s ${name}`).toContain(name)
      expect(new Set(names).size).toBe(names.length)
    }
  })
})
