import { describe, expect, it } from "vite-plus/test"

import { instanceCase, snakeCase, typeCase } from "$/util/spell/string"

describe("snakeCase()", () => {
  it("splits words as lodash does", () => {
    expect(snakeCase("Short Names")).toBe("short_names")
    expect(snakeCase("shortNames")).toBe("short_names")
    expect(snakeCase("short-names")).toBe("short_names")
    expect(snakeCase("Short_Names")).toBe("short_names")
    expect(snakeCase("it2")).toBe("it_2")
    expect(snakeCase("card's")).toBe("cards")
  })

  it("keeps accents, so `corazón` and `corazon` stay two names (epic `spanish` Q2)", () => {
    expect(snakeCase("corazón")).toBe("corazón")
    expect(snakeCase("corazónRojo")).toBe("corazón_rojo")
    expect(snakeCase("año nuevo")).toBe("año_nuevo")
    expect(snakeCase("Niño")).toBe("niño")
    expect(snakeCase("corazón")).not.toBe(snakeCase("corazon"))
  })
})

describe("typeCase() / instanceCase()", () => {
  it("keep accents", () => {
    expect(typeCase("árbol")).toBe("Árbol")
    expect(typeCase("niño-pequeño")).toBe("NiñoPequeño")
    expect(instanceCase("Árbol")).toBe("árbol")
  })
})
