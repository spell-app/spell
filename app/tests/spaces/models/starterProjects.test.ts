import { beforeAll, describe, expect, test } from "vite-plus/test"

import { parseSpellProject, registerTestComponentPack } from "spell/parser/spell/test"
import { STARTER_PROGRAMS, freeProjectId, type Starter } from "spell/app/spaces/models/starterProjects"

/**
 * What a new project starts as:  each compiles as it is, in plain Spell, and has a drawing to add things to.
 */
describe("the starter programs", () => {
  beforeAll(registerTestComponentPack)

  for (const [key, starter] of Object.entries(STARTER_PROGRAMS) as [string, Starter][]) {
    test(`${key} compiles`, () => {
      const files = filesOf(starter)
      for (const file of parseSpellProject(files).files) expect(file.errors, file.path).toEqual([])
      // something to add things to:  an app's container, or a page, drawn as it is
      expect(files.map(({ contents }) => contents).join("\n")).toMatch(/<container>|^"\w+" is a page$/m)
      // plain Spell:  no tag at a line's start but its drawing's
      for (const { contents } of files) expect(contents).not.toMatch(/^<\w/m)
    })
  }

  test("a site (T40):  its site file first, then its main page layout, which it's drawn in, and its home page", () => {
    const files = filesOf(STARTER_PROGRAMS.site)
    expect(files.map(({ path }) => path)).toEqual(["/MySite.site.spell", "/main.page-layout.spell", "/home.spell"])
    const compiled = parseSpellProject(files)
      .files.map((file) => file.compiled)
      .join("\n")
    // the site's main layout, found by its name alone (T39, J149), and the page at its address
    expect(compiled).toContain(`static mainLayout = "MainLayout"`)
    expect(compiled).toMatch(/address: "\/"/)
  })
})

/** Every file starter `starter` makes, in its order:  its first, titled "A Title", then the ones beside it. */
function filesOf(starter: Starter): { path: string; contents: string }[] {
  return [
    { path: `/${starter.fileName}`, contents: starter.contents("A Title") },
    ...(starter.alongside ?? []).map(({ fileName, contents }) => ({ path: `/${fileName}`, contents }))
  ]
}

describe("freeProjectId()", () => {
  test("the name as it is, then a number", () => {
    expect(freeProjectId("you@spell", "my-app", [])).toBe("you@spell/my-app")
    expect(freeProjectId("you@spell", "my-app", ["you@spell/my-app"])).toBe("you@spell/my-app-2")
    expect(freeProjectId("you@spell", "my-app", ["you@spell/my-app", "you@spell/my-app-2"])).toBe("you@spell/my-app-3")
  })
})
