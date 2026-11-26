import { afterEach, describe, expect, test, vi } from "vite-plus/test"

import { Logger } from "spell/util"

describe("Logger's prefix colour", () => {
  afterEach(() => {
    vi.unstubAllEnvs()
    vi.restoreAllMocks()
  })

  /** What `logger.warn("hi")` hands `console.warn`. */
  function warned(): unknown[] {
    const warn = vi.spyOn(console, "warn").mockImplementation(() => {})
    new Logger({ prefix: "Foo", color: "#ff8000" }).warn("hi")
    return warn.mock.calls[0]!
  }

  test("in a terminal that takes 24-bit colour:  the colour's own codes", () => {
    vi.stubEnv("NO_COLOR", "")
    vi.stubEnv("FORCE_COLOR", "1")
    vi.stubEnv("COLORTERM", "truecolor")
    expect(warned()).toEqual(["\x1b[38;2;255;128;0mFoo\x1b[39m", "hi"])
  })

  test("in any other terminal:  the nearest of its 256 colours", () => {
    vi.stubEnv("NO_COLOR", "")
    vi.stubEnv("FORCE_COLOR", "1")
    vi.stubEnv("COLORTERM", "")
    expect(warned()).toEqual(["\x1b[38;5;214mFoo\x1b[39m", "hi"])
  })

  test("with `NO_COLOR`, or no terminal:  plain", () => {
    vi.stubEnv("NO_COLOR", "1")
    expect(warned()).toEqual(["Foo", "hi"])
    vi.restoreAllMocks()
    vi.stubEnv("NO_COLOR", "")
    vi.stubEnv("FORCE_COLOR", "0")
    const { isTTY } = process.stdout
    process.stdout.isTTY = false
    try {
      expect(warned()).toEqual(["Foo", "hi"])
    } finally {
      process.stdout.isTTY = isTTY
    }
  })
})
