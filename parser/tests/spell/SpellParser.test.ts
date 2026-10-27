import { describe, expect, test } from "vite-plus/test"

import { SP } from "spell-parser/spell"

describe("SpellParser's tokenizer", () => {
  // an if-chain inside markup (epic `elemental-spell`, Owen 2026-10-25):  every language's own words for its tags
  test("reads an if-chain's tags in markup in every language's words:  its `spellx.controls`, but `for each`", () => {
    const words: Record<string, string> = {}
    for (const lang of ["en", "es"]) {
      for (const [word, kind] of Object.entries(SP.Language.for(lang).words.spellx?.controls ?? {})) {
        if (kind !== "for each") words[word] = kind
      }
    }
    expect(SP.CHAIN_TAGS).toEqual(words)
  })
})
