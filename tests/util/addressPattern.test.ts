import { describe, expect, it } from "vite-plus/test"

import {
  compilePattern,
  filledPattern,
  optionalParamsOf,
  paramsOf,
  requiredParamsOf
} from "spell/util/addressPattern"

describe("compilePattern()", () => {
  it("matches `:name` to one segment, decoded, any case, with or without a last `/`", () => {
    const match = compilePattern("/films/:film")
    expect(match("/films/a%20new%20hope")).toEqual({ film: "a new hope" })
    expect(match("/Films/4/")).toEqual({ film: "4" })
    expect(match("/films/4/people")).toBeUndefined()
    expect(match("/films")).toBeUndefined()
  })

  it("matches `:name*` to the rest, `/`s included", () => {
    expect(compilePattern("/docs/:page*")("/docs/a/b/c")).toEqual({ page: "a/b/c" })
  })

  it("matches `:name?` with its segment or without it, as Express does", () => {
    const match = compilePattern("/settings/:section?")
    expect(match("/settings")).toEqual({})
    expect(match("/settings/")).toEqual({})
    expect(match("/settings/billing")).toEqual({ section: "billing" })
    expect(match("/settings/billing/more")).toBeUndefined()
  })

  it("fills several `:name?` in a row from the left", () => {
    const match = compilePattern("/library/:tab?/:view?")
    expect(match("/library")).toEqual({})
    expect(match("/library/books")).toEqual({ tab: "books" })
    expect(match("/library/books/grid")).toEqual({ tab: "books", view: "grid" })
  })

  it("matches the root, and a page under it", () => {
    expect(compilePattern("/")("/")).toEqual({})
    expect(compilePattern("/")("/films")).toBeUndefined()
  })

  it("throws `URIError` on bad encoding", () => {
    expect(() => compilePattern("/:x")("/%E0%A4%A")).toThrow(URIError)
  })
})

describe("filledPattern()", () => {
  it("fills each parameter, encoded, and leaves the rest", () => {
    expect(filledPattern("/films/:film/people/:person", { film: "a b", person: 3 })).toBe("/films/a%20b/people/3")
    expect(filledPattern("/films")).toBe("/films")
  })

  it("keeps the `/`s of a `:name*`", () => {
    expect(filledPattern("/docs/:page*", { page: "a b/c" })).toBe("/docs/a%20b/c")
  })

  it("round-trips through `compilePattern()`", () => {
    const params = { film: "https://swapi.py4e.com/api/films/1/" }
    expect(compilePattern("/films/:film")(filledPattern("/films/:film", params))).toEqual(params)
  })

  it("throws, naming it, for a parameter with no value", () => {
    expect(() => filledPattern("/films/:film", {})).toThrow(/`:film`/)
  })

  it("leaves out a `:name?` with no value, its segment and all", () => {
    expect(filledPattern("/settings/:section?")).toBe("/settings")
    expect(filledPattern("/settings/:section?", { section: "api keys" })).toBe("/settings/api%20keys")
    expect(filledPattern("/library/:tab?/:view?", { tab: "books" })).toBe("/library/books")
    expect(filledPattern("/:tab?")).toBe("/")
  })

  it("throws for a `:name?` left out before one that's filled:  it would be read back as the first", () => {
    expect(() => filledPattern("/library/:tab?/:view?", { view: "grid" })).toThrow(/`:tab` left out/)
  })
})

describe("paramsOf()", () => {
  it("lists the parameters in order", () => {
    expect(paramsOf("/films/:film/people/:person_id")).toEqual(["film", "person_id"])
    expect(paramsOf("/films")).toEqual([])
    expect(paramsOf("/library/:tab?/:view?")).toEqual(["tab", "view"])
  })
})

describe("optionalParamsOf(), requiredParamsOf()", () => {
  it("split the parameters into those that may be left out, `:name?`, and the rest", () => {
    expect(optionalParamsOf("/films/:film/:tab?/:view?")).toEqual(["tab", "view"])
    expect(requiredParamsOf("/films/:film/:tab?/:view?")).toEqual(["film"])
    expect(requiredParamsOf("/docs/:page*")).toEqual(["page"])
  })
})
