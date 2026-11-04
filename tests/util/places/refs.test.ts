import { describe, expect, test } from "vite-plus/test"

import { parseRef, refText } from "spell/util/places"

describe("refText()", () => {
  test("names a thing by type and id, with its place if it's elsewhere", () => {
    expect(refText({ type: "Recipe", id: "r-12" })).toBe("Recipe#r-12")
    expect(refText({ type: "Person", id: "matt", place: "three-degrees" })).toBe("Person#matt@three-degrees")
  })

  test("REFUSES an id holding an @:  a reader couldn't tell where the place begins", () => {
    expect(() => refText({ type: "Recipe", id: "r@12" })).toThrow(/holds an @/)
  })
})

describe("parseRef()", () => {
  test("reads what refText() writes", () => {
    expect(parseRef("Recipe#r-12")).toEqual({ type: "Recipe", id: "r-12" })
    expect(parseRef("Person#matt@three-degrees")).toEqual({ type: "Person", id: "matt", place: "three-degrees" })
  })

  test("the FIRST @ starts the place, which may hold another", () => {
    expect(parseRef("Card#26@matt@three-degrees:game")).toEqual({
      type: "Card",
      id: "26",
      place: "matt@three-degrees:game"
    })
  })

  test("throws on what isn't a reference", () => {
    expect(() => parseRef("r-12")).toThrow(TypeError)
    expect(() => parseRef("#r-12")).toThrow(TypeError)
    expect(() => parseRef("Recipe#")).toThrow(TypeError)
  })
})
