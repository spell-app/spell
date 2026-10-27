import { describe, expect, test } from "vite-plus/test"

import { accessLetters } from "spell/epic/tools/_assets/spell-doc-toolbar.js"

describe("accessLetters()", () => {
  test("each title's first letter, else the next free letter in it", () => {
    expect(accessLetters(["Types", "Groups", "Content", "States", "Variations", "Group Variations"])).toEqual([
      "t",
      "g",
      "c",
      "s",
      "v",
      "r"
    ])
  })

  test("letters only, accents folded;  a title with no free letter gets none", () => {
    expect(accessLetters(["2. Árbol", "ab", "ba", "bar"])).toEqual(["a", "b", undefined, "r"])
  })
})
