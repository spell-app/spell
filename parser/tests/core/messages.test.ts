import { readFileSync } from "fs"
import { resolve } from "path"
import { afterEach, beforeEach, describe, expect, test, vi } from "vite-plus/test"

import { core } from "spell-parser/core"
import { CORE_MESSAGES } from "spell-parser/core/core.types"

/**
 * The core's messages in English.
 * - Python's core reads the same file (`tests/py/core/tests/test_messages.py`), so the two can't drift apart.
 */
const EXPECTED = JSON.parse(readFileSync(resolve(import.meta.dirname, "messages.expected.json5"), "utf8")) as {
  messages: Record<string, string>
}

/** A Spanish words file's `messages`, as `cartas.es.js` holds them. */
const SPANISH = {
  "expect-passed": "Como se esperaba, {what} es {expected}",
  "expect-failed": "Inesperado: {what} debería ser {expected} pero en realidad es {actual}",
  "expect-truthy": "verdadero"
}

/** What `core.console` printed, each line as one string, as node prints it. */
function printed(): string[] {
  const lines = core.console.lines.flatMap((line) => [line, ...((line as { lines?: (typeof line)[] }).lines ?? [])])
  return lines.map((line) => line.message.join(" "))
}

beforeEach(() => {
  core.console.clear()
  vi.spyOn(console, "log").mockImplementation(() => {})
  vi.spyOn(console, "info").mockImplementation(() => {})
  vi.spyOn(console, "group").mockImplementation(() => {})
  vi.spyOn(console, "groupCollapsed").mockImplementation(() => {})
})
afterEach(() => {
  core.useMessages(undefined)
  vi.restoreAllMocks()
})

describe("core.message():  what the core says to the person running a program, in its language", () => {
  test("English is built in:  the same as Python's", () => {
    expect(CORE_MESSAGES).toEqual(EXPECTED.messages)
  })

  test("fills in each named placeholder;  one with no value stays as written", () => {
    expect(core.message("cant-draw", { type: "Card" })).toBe("⚠ Card can't draw")
    expect(core.message("cant-draw")).toBe("⚠ {type} can't draw")
  })

  test("a words file's messages, by key;  English for a key they don't have", () => {
    core.useMessages(SPANISH)
    expect(core.message("expect-truthy")).toBe("verdadero")
    expect(core.message("cant-draw", { type: "Carta" })).toBe("⚠ Carta can't draw")
    core.useMessages(undefined)
    expect(core.message("expect-truthy")).toBe("truthy")
  })
})

describe("a test's lines, in the program's language", () => {
  test("English, as ever", () => {
    core.test("test math", () => {
      core.expect(4, "2 + 2", 5, "5")
      core.expect(true, "it runs")
    })
    expect(printed()).toEqual([
      "❌ test math",
      "❌ Unexpected: `2 + 2` should be `5` but is actually `4`",
      "✅ As expected `it runs` is truthy"
    ])
  })

  test("a Spanish program's failing test says so in Spanish", () => {
    core.useMessages(SPANISH)
    core.test("probar la suma", () => {
      core.expect(4, "2 + 2", 5, "5")
      core.expect(true, "funciona")
    })
    expect(printed()).toEqual([
      "❌ probar la suma",
      "❌ Inesperado: `2 + 2` debería ser `5` pero en realidad es `4`",
      "✅ Como se esperaba, `funciona` es verdadero"
    ])
  })
})
