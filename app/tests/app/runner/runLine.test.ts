import { describe, expect, test } from "vite-plus/test"

import { runLine } from "spell/app/app/runner"

/**
 * A line of compiled Spell run on its own, as the Spell Console runs one (epic `editor` P32).
 * - No program runs here:  the names a line reads are the ones handed in, as the runtime hands it its own.
 */
describe("runLine()", () => {
  const names = { core: { double: (it: number) => it * 2 } }

  test("an expression answers its value", async () => {
    expect(await runLine("(1 + 2)", names)).toBe(3)
    expect(await runLine("core.double(21)", names)).toBe(42)
  })

  test("a declaration answers its value, and later lines read it", async () => {
    expect(await runLine("export const x = 3", names)).toBe(3)
    expect(await runLine("(x + 4)", names)).toBe(7)
  })

  test("a statement answers nothing", async () => {
    expect(await runLine("if (true) { core.double(1) }", names)).toBeUndefined()
  })

  test("a line that waits is waited for", async () => {
    expect(await runLine("await Promise.resolve(5)", names)).toBe(5)
  })

  test("a line that throws throws", async () => {
    await expect(runLine("nothingCalledThis.count", names)).rejects.toThrow(/nothingCalledThis/)
  })
})
