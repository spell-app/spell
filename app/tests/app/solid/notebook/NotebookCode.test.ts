import { describe, expect, test } from "vite-plus/test"

import { NotebookCode } from "spell/app/app/solid/notebook/NotebookCode"

/** A notebook's code views (epic `elemental-spell` P16, P25):  spellx with each bare name's tag, and back. */
describe("NotebookCode", () => {
  const tags: Record<string, string> = { button: "ui-button", counter: "counter-counter", text: "ui-text" }
  const words = Object.fromEntries(Object.entries(tags).map(([word, tag]) => [tag, word]))

  test("tags:  bare names as their tags, each </> naming what it closes, holes and attributes as written", () => {
    expect(
      NotebookCode.withTags("<counter/>\n<button onClick={count up}>Go {its count}</>", (word) => tags[word])
    ).toBe("<counter-counter/>\n<ui-button onClick={count up}>Go {its count}</ui-button>")
    expect(NotebookCode.withTags("<ui-label>a < b</ui-label>", (word) => tags[word])).toBe("<ui-label>a < b</ui-label>")
  })

  test("back to spellx:  each tag a bare name gives, that name;  anything else as written", () => {
    expect(
      NotebookCode.toSpellx('<ui-button color="primary">Go</ui-button><ui-label>x</ui-label>', (tag) => words[tag])
    ).toBe('<button color="primary">Go</button><ui-label>x</ui-label>')
  })

  test("back to spellx:  an <html> block's markup as written", () => {
    expect(
      NotebookCode.toSpellx("<ui-button>Go</ui-button>\n<html><ui-button>Raw</ui-button></html>", (tag) => words[tag])
    ).toBe("<button>Go</button>\n<html><ui-button>Raw</ui-button></html>")
  })
})
