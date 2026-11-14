import { describe, expect, test } from "vite-plus/test"

import { suggestsByItself } from "spell/app/app/ui/codePopups"

describe("suggestsByItself():  where the suggestions show by themselves (epic `editor` P28)", () => {
  test("a tag, after `<`", () => {
    expect(suggestsByItself("\t\t\t<")).toBe(true)
    expect(suggestsByItself("\t\t<content><")).toBe(true)
    expect(suggestsByItself("\t\t{draw it}<")).toBe(false)
    expect(suggestsByItself("\tif x <")).toBe(false)
  })

  test("an attribute, after a space inside a tag;  its words, in its quotes", () => {
    expect(suggestsByItself("\t<button ")).toBe(true)
    expect(suggestsByItself('\t<button fluid color="primary" ')).toBe(true)
    expect(suggestsByItself('\t<button color="')).toBe(true)
    expect(suggestsByItself('\t<button label="a ')).toBe(false)
    expect(suggestsByItself("\t<button>New ")).toBe(false)
  })

  test("a property, after `its`, `'s` or `of`, mid-line", () => {
    expect(suggestsByItself("\t\tset its ")).toBe(true)
    expect(suggestsByItself("\t\tclear the square's ")).toBe(true)
    expect(suggestsByItself("\t\tset mark to the mark of ")).toBe(true)
    expect(suggestsByItself("\t\tasigna su ")).toBe(true)
  })

  test("nowhere else:  a plain statement, or `its ` starting a line (a property's quoted name)", () => {
    expect(suggestsByItself("\t\tset ")).toBe(false)
    expect(suggestsByItself("\tits ")).toBe(false)
    expect(suggestsByItself("\t\tif mark is ")).toBe(false)
  })
})
