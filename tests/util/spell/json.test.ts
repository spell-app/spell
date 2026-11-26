import { afterEach, describe, expect, test, vi } from "vite-plus/test"

import { parseJSON, readJSON5 } from "spell/util/spell/json"
import { parseJSON5 } from "spell/util/spell/parseJSON5"

describe("JSON and JSON5", () => {
  afterEach(() => vi.restoreAllMocks())

  test("`parseJSON()` reads JSON, and throws on JSON5", () => {
    vi.spyOn(console, "error").mockImplementation(() => {})
    vi.spyOn(console, "log").mockImplementation(() => {})
    expect(parseJSON('{"a": [1, 2]}')).toEqual({ a: [1, 2] })
    expect(() => parseJSON("{a: 1}")).toThrow(SyntaxError)
  })

  test("`parseJSON5()` and `readJSON5()` read JSON5 the same", async () => {
    const text = "{\n  // a comment\n  a: [1, 2,],\n  'b': 'two',\n}"
    expect(parseJSON5(text)).toEqual({ a: [1, 2], b: "two" })
    expect(await readJSON5(text)).toEqual({ a: [1, 2], b: "two" })
  })

  test("`readJSON5()` throws on a mistake, or answers `undefined` with `swallowError`", async () => {
    vi.spyOn(console, "error").mockImplementation(() => {})
    vi.spyOn(console, "log").mockImplementation(() => {})
    await expect(readJSON5("{a: }", "theme.json5")).rejects.toThrow(SyntaxError)
    expect(await readJSON5("{a: }", "theme.json5", true)).toBeUndefined()
  })
})
