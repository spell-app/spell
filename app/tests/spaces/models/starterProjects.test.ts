import { beforeAll, describe, expect, test } from "vite-plus/test"

import { parseSpellProject, registerTestComponentPack } from "spell/parser/spell/test"
import {
  STARTER_PROGRAMS,
  freeProjectId,
  isProjectArchive,
  PROJECT_ARCHIVE_FORMAT
} from "spell/app/spaces/models/starterProjects"

/**
 * What a new project starts as:  each compiles as it is, and has a drawing to add things to.
 */
describe("the starter programs", () => {
  beforeAll(registerTestComponentPack)

  for (const [key, { fileName, contents }] of Object.entries(STARTER_PROGRAMS)) {
    test(`${key} compiles`, () => {
      const text = contents("A Title")
      const [file] = parseSpellProject([{ path: `/${fileName}`, contents: text }]).files
      expect(file!.errors).toEqual([])
      expect(text).toContain("<ui-container>")
    })
  }
})

describe("freeProjectId()", () => {
  test("the name as it is, then a number", () => {
    expect(freeProjectId("you@spell", "my-app", [])).toBe("you@spell/my-app")
    expect(freeProjectId("you@spell", "my-app", ["you@spell/my-app"])).toBe("you@spell/my-app-2")
    expect(freeProjectId("you@spell", "my-app", ["you@spell/my-app", "you@spell/my-app-2"])).toBe("you@spell/my-app-3")
  })
})

describe("isProjectArchive()", () => {
  test("only what export writes", () => {
    const good = { format: PROJECT_ARCHIVE_FORMAT, name: "a", files: [{ path: "/A.spell", contents: "" }] }
    expect(isProjectArchive(good)).toBe(true)
    expect(isProjectArchive({ ...good, files: [] })).toBe(false)
    expect(isProjectArchive({ ...good, format: "x" })).toBe(false)
    expect(isProjectArchive(null)).toBe(false)
  })
})
