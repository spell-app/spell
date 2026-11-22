import { globSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { expect, test } from "vite-plus/test"

import { RULE_LANGUAGE_FILE, withoutRuleTests } from "spell/toolchain/stripRuleTests"

/** Every rule's language file:  `src/spell/rules/<folder>/<folder>.<lang>.ts`. */
const LANGUAGE_FILES = globSync("src/spell/rules/**/*.ts", { cwd: join(import.meta.dirname, "../../..") })
  .map((file) => join(import.meta.dirname, "../../..", file))
  .filter((file) => RULE_LANGUAGE_FILE.test(file))

// a build fails on a `tests` its cut can't read (`ruleTestsOutOfBuilds()`):  this says so first, in the tests
test("a build can cut every language file's rule tests down to one example a rule", async () => {
  expect(LANGUAGE_FILES.length).toBeGreaterThan(40)
  for (const file of LANGUAGE_FILES) {
    const code = readFileSync(file, "utf8")
    const cut = await withoutRuleTests(code, file)
    if (!cut) continue
    expect(cut.code.length, file).toBeLessThan(code.length)
    expect(cut.code, file).toMatch(/tests: \[\{ tests: \[/)
  }
})
