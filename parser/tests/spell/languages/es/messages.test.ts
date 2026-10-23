import { describe, expect, test } from "vite-plus/test"

import { CORE_MESSAGES, type CoreMessageKey } from "spell-parser/core/core.types"
import { SP } from "spell-parser/spell"

/** Each `{placeholder}` in `message`, sorted. */
function placeholdersOf(message: string): string[] {
  return [...message.matchAll(/\{(\w+)\}/g)].map((match) => match[1]!).sort()
}

/** A project's declarations, with nothing declared, in `language`. */
function declarations(language?: string): SP.SpellDeclarationsData {
  return { spellVersion: "0.0.0", language, provides: [], statements: [] }
}

describe("Spanish's messages:  what the core says to the person running a Spanish program", () => {
  test("every one of the core's, with the same placeholders", () => {
    const spanish = SP.spanish.messages
    for (const [key, english] of Object.entries(CORE_MESSAGES)) {
      const message = spanish[key as CoreMessageKey]
      expect(message, key).toBeTruthy()
      expect(placeholdersOf(message), key).toEqual(placeholdersOf(english))
    }
  })

  test("a Spanish project's words carry them;  an English one's carry none, as the core speaks English", () => {
    expect(SP.SpellWords.of(declarations("es")).messages).toEqual(SP.spanish.messages)
    expect(SP.SpellWords.of(declarations()).messages).toBeUndefined()
    expect(SP.SpellWords.of(declarations("en")).messages).toBeUndefined()
  })

  test("a words file's messages read back", () => {
    const words = SP.SpellWords.of(declarations("es"))
    expect(SP.SpellWords.read(SP.SpellWords.script(words, "cartas"))).toEqual(words)
  })
})
