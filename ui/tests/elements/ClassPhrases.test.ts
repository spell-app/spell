import { describe, expect, it } from "vite-plus/test"

import { CLASS_PHRASES, MARKUP_SHEETS } from "spell/ui/elements/ClassPhrases"
import { ClassBuilder } from "spell/ui/elements"

/**
 * The class-phrase rule (epic `solid-2-final` P5):  a family sheet styles a phrase of class words by its JOINED word
 * (`.bottom-attached`), never by a substring (`[class*="bottom attached"]`), the slowest selector there is.
 * - `ClassBuilder.withPhrases()` writes the joined word of every phrase in `CLASS_PHRASES` a class string holds.
 * - Except a page's own markup, which no builder writes:  a sheet in `MARKUP_SHEETS`, and inside `::slotted()`.
 */

/** Every family sheet (the docs families' too), by path. */
const SHEETS = import.meta.glob<string>(["/src/components/**/*.css", "/src/docs-components/**/*.css"], {
  query: "?raw",
  import: "default",
  eager: true
})

/** Every family sheet's text, comments left out, in one string. */
const ALL_CSS = Object.values(SHEETS)
  .map((css) => css.replace(/\/\*[\s\S]*?\*\//g, ""))
  .join("\n")

describe("family sheets' class phrases", () => {
  it("has no substring class selector, but for a page's own markup", () => {
    const found = Object.entries(SHEETS)
      .filter(([file]) => !MARKUP_SHEETS[file.replace("/src/components/", "")])
      .flatMap(([file, css]) =>
        [...css.replace(/\/\*[\s\S]*?\*\//g, "").matchAll(/(::slotted\()?\[class\*=[^\]]*\]/g)]
          .filter((match) => !match[1])
          .map((match) => `${file}:  ${match[0]}`)
      )
    expect(found).toEqual([])
  })

  it("names only sheets there are as a page's own markup", () => {
    for (const file of Object.keys(MARKUP_SHEETS)) expect(SHEETS[`/src/components/${file}`], file).toBeDefined()
  })

  it("styles every phrase in the list:  no phrase is left over", () => {
    const unused = CLASS_PHRASES.filter((phrase) => !new RegExp(`\\.${joined(phrase)}(?![\\w-])`).test(ALL_CSS))
    expect(unused).toEqual([])
  })

  it("lists its phrases once each, in order", () => {
    expect([...new Set(CLASS_PHRASES)].sort()).toEqual(CLASS_PHRASES)
  })
})

describe("ClassBuilder.withPhrases()", () => {
  it("adds the joined word of every phrase the text holds, as a substring", () => {
    expect(ClassBuilder.withPhrases("ui top left pointing label")).toBe(
      "ui top left pointing label left-pointing top-left top-left-pointing"
    )
  })

  it("is idempotent:  a joined word already written adds none of its own", () => {
    const once = ClassBuilder.withPhrases("ui calendar popup bottom left")
    expect(once).toBe("ui calendar popup bottom left bottom-left")
    expect(ClassBuilder.withPhrases(once)).toBe(once)
    expect(ClassBuilder.withPhrases(`${once} extra`)).toBe(`${once} extra`)
  })

  it("leaves a text with no phrase as it is", () => {
    expect(ClassBuilder.withPhrases("ui primary button")).toBe("ui primary button")
  })
})

describe("ClassBuilder.withoutPhrases()", () => {
  it("takes the joined words back out, and keeps every other word", () => {
    const text = "ui top attached stack-with-page segment"
    expect(ClassBuilder.withoutPhrases(ClassBuilder.withPhrases(text))).toBe(text)
  })
})

/** `phrase`'s joined class word. */
function joined(phrase: string) {
  return phrase.replaceAll(" ", "-")
}
