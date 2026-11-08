import { describe, expect, it } from "vite-plus/test"

import { compilePattern, filledPattern, paramsOf } from "spell/util/addressPattern"

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
})

describe("paramsOf()", () => {
  it("lists the parameters in order", () => {
    expect(paramsOf("/films/:film/people/:person_id")).toEqual(["film", "person_id"])
    expect(paramsOf("/films")).toEqual([])
  })
})
