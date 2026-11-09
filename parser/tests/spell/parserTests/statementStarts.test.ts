import { describe, expect, it } from "vite-plus/test"

import { parseSpellProject, runSpell } from "spell/parser/spell/test"

/**
 * A statement whose javascript starts with `(`, `[` or a backtick, below another:
 * compiled spell has no semicolons, so javascript would read the two lines as one (epic `language` T61).
 * - Lista de tareas hit it:  `core.clear(this.tareas)`, then `(await ...)?.forEach(...)`, ran as one call,
 *   "core.clear(...) is not a function".
 */
describe("a line starting with ( or [ doesn't run into the line above", () => {
  const LINES = [
    "set seen to []",
    "set kept to []",
    "to go",
    "\tclear seen",
    '\tfor word in ["a", "b"]',
    "\t\tadd word to seen",
    "clear kept",
    'for word in ["c", "d"]',
    "\tadd word to kept",
    "go"
  ]

  it("writes a ; in front of it", () => {
    const { files } = parseSpellProject([{ path: "/Test.spell", contents: LINES.join("\n") }])
    expect(files[0]!.errors).toEqual([])
    expect(files[0]!.compiled).toContain('  core.clear(seen)\n  ;["a", "b"].forEach(')
    expect(files[0]!.compiled).toContain('core.clear(kept)\n;["c", "d"].forEach(')
  })

  it("runs both lines", () => {
    const { seen, kept } = runSpell(LINES)("seen, kept")
    expect([...(seen as string[])]).toEqual(["a", "b"])
    expect([...(kept as string[])]).toEqual(["c", "d"])
  })
})
