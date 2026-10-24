import { describe, expect, test } from "vite-plus/test"

import { defaultFor, isAllowed, textForValue, valueForText } from "spell/util/persist"

////////////////
// ## Text
////////////////

describe("textForValue() / valueForText()", () => {
  test('keeps a string as itself, so plain scripts read `dark`, not `"dark"`', () => {
    expect(textForValue("dark")).toBe("dark")
    expect(textForValue("30%,70%")).toBe("30%,70%")
    expect(textForValue("")).toBe("")
    expect(valueForText("dark")).toBe("dark")
  })

  test("keeps everything else as JSON", () => {
    expect(textForValue(1)).toBe("1")
    expect(textForValue(-2.5)).toBe("-2.5")
    expect(textForValue(true)).toBe("true")
    expect(textForValue(null)).toBe("null")
    expect(textForValue({ open: true })).toBe('{"open":true}')
    expect(textForValue(["a", 1])).toBe('["a",1]')
  })

  test("quotes a string that would read back as something else", () => {
    for (const text of ["1", "-2.5", "1e3", "true", "false", "null", '"quoted"', "{brace", "[bracket"]) {
      expect(textForValue(text)).toBe(JSON.stringify(text))
      expect(valueForText(textForValue(text))).toBe(text)
    }
  })

  test("reads JSON ONLY when the text looks like it:  `007` and `1.` are text", () => {
    expect(valueForText("1")).toBe(1)
    expect(valueForText("true")).toBe(true)
    expect(valueForText('"1"')).toBe("1")
    expect(valueForText('{"open":true}')).toEqual({ open: true })
    expect(valueForText("007")).toBe("007")
    expect(valueForText("1.")).toBe("1.")
    expect(valueForText("truely")).toBe("truely")
  })

  test("reads what the old pref store wrote:  every value as JSON, strings quoted", () => {
    expect(valueForText('"debug"')).toBe("debug")
    expect(valueForText('"30%,70%"')).toBe("30%,70%")
  })

  test("round-trips", () => {
    for (const value of ["dark", "1", 1, 0, true, false, null, "", { a: [1, "b"] }, ["x"], "{not json"]) {
      expect(valueForText(textForValue(value))).toEqual(value)
    }
  })

  test("throws `SyntaxError` for text that starts like JSON but isn't", () => {
    expect(() => valueForText("{oops")).toThrow(SyntaxError)
  })

  test("throws `TypeError` for a value JSON can't keep", () => {
    expect(() => textForValue(() => 1)).toThrow(/can't keep a function/)
    expect(() => textForValue(undefined)).toThrow(TypeError)
  })
})

////////////////
// ## Defaults and checks
////////////////

describe("defaultFor()", () => {
  test("is the declared default, else the first choice, else the type's", () => {
    expect(defaultFor({ oneOf: ["light", "dark", "auto"], default: "auto" })).toBe("auto")
    expect(defaultFor({ oneOf: ["light", "dark", "auto"] })).toBe("light")
    expect(defaultFor({ oneOf: () => ["up", "down"] })).toBe("up")
    expect(defaultFor({ type: "number" })).toBe(0)
    expect(defaultFor({ type: "text" })).toBe("")
    expect(defaultFor({ type: "choice" })).toBe(false)
  })

  test("is `undefined` for no declaration, or a type with no default (a class's)", () => {
    expect(defaultFor(undefined)).toBeUndefined()
    expect(defaultFor({})).toBeUndefined()
    expect(defaultFor({ type: "Card" })).toBeUndefined()
    expect(defaultFor({ type: "constructor" })).toBeUndefined()
  })
})

describe("isAllowed()", () => {
  test("allows only a declared choice", () => {
    const scheme = { oneOf: ["light", "dark", "auto"] }
    expect(isAllowed(scheme, "dark")).toBe(true)
    expect(isAllowed(scheme, "purple")).toBe(false)
  })

  test("allows only the declared type, when it's one Spell's runtime names", () => {
    expect(isAllowed({ type: "number" }, 3)).toBe(true)
    expect(isAllowed({ type: "number" }, "3")).toBe(false)
    expect(isAllowed({ type: "text" }, "3")).toBe(true)
    expect(isAllowed({ type: "choice" }, false)).toBe(true)
    expect(isAllowed({ type: "choice" }, "no")).toBe(false)
    expect(isAllowed({ type: "Card" }, { rank: 3 })).toBe(true)
  })

  test("allows anything with no declaration", () => {
    expect(isAllowed(undefined, Symbol.iterator)).toBe(true)
  })
})
