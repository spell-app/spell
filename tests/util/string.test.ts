import { describe, expect, it, test } from "vite-plus/test"

import {
  camelCase,
  dedent,
  escapeHTML,
  escapeRegExp,
  indented,
  kebabCase,
  levenshtein,
  numberToWord,
  slug,
  suggest,
  withoutAccents
} from "spell/util/string"

////////////////
// ## Names and words
////////////////

describe("kebabCase() / camelCase()", () => {
  it("converts property names to attribute names", () => {
    expect(kebabCase("activeIndex")).toBe("active-index")
    expect(kebabCase("allowAdditions")).toBe("allow-additions")
    expect(kebabCase("open")).toBe("open")
  })

  it("leaves digits alone", () => {
    expect(kebabCase("h1Size")).toBe("h1-size")
    expect(camelCase("h1-size")).toBe("h1Size")
  })

  it("converts attribute names to property names", () => {
    expect(camelCase("active-index")).toBe("activeIndex")
    expect(camelCase("allow-additions")).toBe("allowAdditions")
    expect(camelCase("open")).toBe("open")
  })

  it("round-trips", () => {
    for (const name of ["activeIndex", "value", "maxSelections", "position2"]) {
      expect(camelCase(kebabCase(name))).toBe(name)
    }
  })

  it("passes already-converted text through", () => {
    expect(kebabCase("active-index")).toBe("active-index")
    expect(camelCase("activeIndex")).toBe("activeIndex")
  })
})

describe("numberToWord()", () => {
  it("maps 1..16 to Fomantic's words", () => {
    expect(numberToWord(1)).toBe("one")
    expect(numberToWord(4)).toBe("four")
    expect(numberToWord("16")).toBe("sixteen")
    expect(numberToWord(" 8 ")).toBe("eight")
  })

  it("returns undefined out of range", () => {
    expect(numberToWord(0)).toBeUndefined()
    expect(numberToWord(17)).toBeUndefined()
    expect(numberToWord(2.5)).toBeUndefined()
    expect(numberToWord("1/4")).toBeUndefined()
    expect(numberToWord("four")).toBeUndefined()
  })
})

////////////////
// ## Near misses
////////////////

describe("levenshtein()", () => {
  it("counts edits", () => {
    expect(levenshtein("", "")).toBe(0)
    expect(levenshtein("red", "red")).toBe(0)
    expect(levenshtein("", "red")).toBe(3)
    expect(levenshtein("red", "")).toBe(3)
    expect(levenshtein("kitten", "sitting")).toBe(3)
    expect(levenshtein("grey", "gray")).toBe(1)
    expect(levenshtein("left", "felt")).toBe(2)
  })

  it("is symmetric", () => {
    expect(levenshtein("primary", "primray")).toBe(levenshtein("primray", "primary"))
  })
})

describe("suggest()", () => {
  const COLORS = ["primary", "secondary", "red", "orange", "yellow", "grey", "green"]

  it("finds the closest candidate", () => {
    expect(suggest("primray", COLORS)).toBe("primary")
    expect(suggest("gray", COLORS)).toBe("grey")
    expect(suggest("RED", COLORS)).toBe("red")
  })

  it("returns undefined when nothing is close enough", () => {
    expect(suggest("magenta", COLORS)).toBeUndefined()
    expect(suggest("xyz", [])).toBeUndefined()
  })

  it("honours maxDistance", () => {
    expect(suggest("yelow", COLORS, 0)).toBeUndefined()
    expect(suggest("yelow", COLORS, 1)).toBe("yellow")
  })

  it("prefers the earlier candidate on a tie", () => {
    expect(suggest("gren", ["grey", "green"])).toBe("grey")
  })
})

////////////////
// ## Slugs and accents
////////////////

describe("slug()", () => {
  test("an id:  lower case, words joined by `-`, nothing else", () => {
    expect(slug("Epic Migrate")).toBe("epic-migrate")
    expect(slug("  Getting started!  ")).toBe("getting-started")
    expect(slug("snake_case and/slashes")).toBe("snake-case-and-slashes")
  })

  test("an id drops accents and apostrophes, as the phase ids do", () => {
    expect(slug("Café 2.0")).toBe("cafe-2-0")
    expect(slug("Owen's <epic-link>")).toBe("owens-epic-link")
    expect(slug("Owen’s")).toBe("owens")
    expect(slug("Canción Ñandú")).toBe("cancion-nandu")
  })

  test("an empty slug is the fallback", () => {
    expect(slug("!!!")).toBe("")
    expect(slug("!!!", { fallback: "phase" })).toBe("phase")
    expect(slug("Ok", { fallback: "phase" })).toBe("ok")
  })

  test("GitHub's heading anchor keeps accented letters and runs of `-`", () => {
    expect(slug("Café", { as: "github" })).toBe("café")
    expect(slug("Getting started!", { as: "github" })).toBe("getting-started")
    expect(slug("A & B", { as: "github" })).toBe("a--b")
    expect(slug("🌱 Coming:  npm", { as: "github" })).toBe("-coming--npm")
    expect(slug("snake_case", { as: "github" })).toBe("snake_case")
  })
})

describe("withoutAccents()", () => {
  test("drops every mark", () => {
    expect(withoutAccents("Café naïve Ñandú")).toBe("Cafe naive Nandu")
    // decomposed already:  e + a combining acute
    expect(withoutAccents("Cafe\u0301")).toBe("Cafe")
  })

  test("keeps the letters `keep` names, either case", () => {
    expect(withoutAccents("año pingüino canción", { keep: "ñü" })).toBe("año pingüino cancion")
    expect(withoutAccents("AÑO", { keep: "ñ" })).toBe("AÑO")
  })

  test("leaves letters with no plain form", () => {
    expect(withoutAccents("øß")).toBe("øß")
  })
})

////////////////
// ## Escaping
////////////////

describe("escapeRegExp()", () => {
  test("matches its text literally", () => {
    const text = "a.b*c+(d)[e]{f}|g^h$i\\j?"
    expect(new RegExp(`^${escapeRegExp(text)}$`).test(text)).toBe(true)
    expect(new RegExp(escapeRegExp("a.b")).test("axb")).toBe(false)
  })
})

describe("escapeHTML()", () => {
  test("escapes the five characters HTML text and attributes need", () => {
    expect(escapeHTML(`<a href="x">Tom & Jerry's</a>`)).toBe(
      "&lt;a href=&quot;x&quot;&gt;Tom &amp; Jerry&#39;s&lt;/a&gt;"
    )
  })
})

////////////////
// ## Indents
////////////////

describe("dedent()", () => {
  test("takes off the indent the lines share, and the blank first and last lines", () => {
    const text = `
      one
        two

      three
    `
    expect(dedent(text)).toBe("one\n  two\n\nthree")
  })

  test("leaves text with no indent alone", () => {
    expect(dedent("a\n b")).toBe("a\n b")
    expect(dedent("")).toBe("")
  })
})

describe("indented()", () => {
  test("indents each line by text or by spaces, blank lines left blank", () => {
    expect(indented("a\n\nb", "\t")).toBe("\ta\n\n\tb")
    expect(indented("a\n  \nb", 2)).toBe("  a\n  \n  b")
  })
})
