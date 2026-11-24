import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { build } from "esbuild"
import { afterAll, describe, expect, test } from "vite-plus/test"

import {
  RULE_LANGUAGE_FILE,
  ruleTestsOutOfBuilds,
  ruleTestsOutOfBundles,
  withoutRuleTests
} from "spell/toolchain/stripRuleTests"

/**
 * `withoutRuleTests()` and its two plugins (the toolchain's), on made-up language files:
 * each rule keeps its first example, the rest of its tests go.
 */
describe("withoutRuleTests()", () => {
  test("keeps each rule's first test, cut to its input;  the rest of the registration stays", async () => {
    const cut = await withoutRuleTests(
      [
        `lists.addRule(ListLiteral, {`,
        `  roles: { match: "list" },`,
        `  tests: [`,
        `    { compileAs: "expression", beforeEach(scope) { scope.add("x") }, tests: [`,
        `      { title: "one", input: "1, 2", js: "[1, 2]" },`,
        `      { title: "two", input: "3", js: "[3]" }`,
        `    ] },`,
        `    { tests: [["4, 5", "[4, 5]"]] }`,
        `  ]`,
        `})`,
        `lists.addRule(Other, { tests: [{ tests: [["a and b", "a && b"], ["c", "c"]] }], syntax: "{x}" })`
      ].join("\n"),
      FILE
    )
    expect(cut!.code).toBe(
      [
        `lists.addRule(ListLiteral, {`,
        `  roles: { match: "list" },`,
        `  tests: [{ tests: [{ input: "1, 2" }] }]`,
        `})`,
        `lists.addRule(Other, { tests: [{ tests: [["a and b"]] }], syntax: "{x}" })`
      ].join("\n")
    )
    expect(cut!.map.mappings).not.toBe("")
  })

  // as `SpellLanguageService.firstExample()` does
  test("passes over tests with an empty input, into the next block", async () => {
    const cut = await withoutRuleTests(
      `m.addRule(R, { tests: [{ tests: [{ input: "", js: "" }, ["", ""]] }, { tests: [{ input: ["a", "b"] }] }] })`,
      FILE
    )
    expect(cut!.code).toBe(`m.addRule(R, { tests: [{ tests: [{ input: ["a", "b"] }] }] })`)
  })

  test("a rule with no example loses `tests`, and its comma", async () => {
    const empty = `{ tests: [{ input: "" }] }`
    const cut = await withoutRuleTests(
      [
        `m.addRule(A, { syntax: "a", tests: [${empty}] })`,
        `m.addRule(B, { tests: [${empty}], syntax: "b" })`,
        `m.addRule(C, { tests: [] })`
      ].join("\n"),
      FILE
    )
    expect(cut!.code).toBe(
      [`m.addRule(A, { syntax: "a" })`, `m.addRule(B, { syntax: "b" })`, `m.addRule(C, {  })`].join("\n")
    )
  })

  test("nothing to cut:  undefined", async () => {
    expect(await withoutRuleTests(`m.addRule(A, { syntax: "a" })`, FILE)).toBeUndefined()
    expect(await withoutRuleTests(`export const tests = 1`, FILE)).toBeUndefined()
  })

  test.each([
    ["a `tests` that isn't an array", `m.addRule(A, { tests: TESTS })`, "isn't an array literal"],
    ["a block that isn't an object", `m.addRule(A, { tests: [block] })`, "a test block that isn't an object literal"],
    ["a block's own `tests` missing", `m.addRule(A, { tests: [{ ...shared }] })`, "no `tests: [...]` of its own"],
    ["a test made by a call", `m.addRule(A, { tests: [{ tests: [make("a")] }] })`, "isn't an array or object literal"],
    ["shorthand `tests`", `m.addRule(A, { tests })`, "isn't `tests: [...]`"]
  ])("fails on %s, naming the file and line", async (_, code, problem) => {
    const failure = withoutRuleTests(`\n${code}`, FILE)
    await expect(failure).rejects.toThrow(SyntaxError)
    await expect(failure).rejects.toThrow(`${FILE}:2:  `)
    await expect(failure).rejects.toThrow(problem)
  })
})

describe("RULE_LANGUAGE_FILE", () => {
  test("is a language file anywhere below the grammar's rules", () => {
    expect(RULE_LANGUAGE_FILE.test("/k/parser/src/spell/rules/lists/lists.en.ts")).toBe(true)
    expect(RULE_LANGUAGE_FILE.test("/k/parser/src/spell/rules/lists/lists.es.ts")).toBe(true)
    expect(RULE_LANGUAGE_FILE.test("/k/parser/src/spell/rules/lists/lists.parser.ts")).toBe(false)
    expect(RULE_LANGUAGE_FILE.test("/k/parser/src/spell/rules/rules.types.ts")).toBe(false)
    expect(RULE_LANGUAGE_FILE.test("/k/ui/src/components/ui-button/UIButton.en.ts")).toBe(false)
  })
})

describe("ruleTestsOutOfBuilds()", () => {
  test("a build-only Vite plugin, before the others, cutting only language files", async () => {
    const plugin = ruleTestsOutOfBuilds()
    expect(plugin.apply).toBe("build")
    expect(plugin.enforce).toBe("pre")
    const transform = plugin.transform as (code: string, id: string) => Promise<{ code: string } | undefined>
    const code = `m.addRule(A, { tests: [{ tests: [["a"], ["b"]] }] })`
    expect((await transform(code, `${FILE}?import`))!.code).toBe(`m.addRule(A, { tests: [{ tests: [["a"]] }] })`)
    expect(await transform(code, "/k/parser/src/spell/rules/m/m.parser.ts")).toBeUndefined()
  })
})

describe("ruleTestsOutOfBundles()", () => {
  test("an esbuild plugin:  the bundle holds the first example only", async () => {
    const rules = join(TEMP, "parser", "src", "spell", "rules", "m")
    mkdirSync(rules, { recursive: true })
    const file = join(rules, "m.en.ts")
    writeFileSync(
      file,
      `const m = { added: [] as unknown[], addRule(...args: unknown[]) { this.added.push(args) } }\n` +
        `m.addRule("A", { tests: [{ tests: [["first one"], ["second one"]] }] })\n` +
        `export default m\n`
    )
    const result = await build({ entryPoints: [file], bundle: true, write: false, plugins: [ruleTestsOutOfBundles()] })
    const bundle = result.outputFiles[0]!.text
    expect(bundle).toContain("first one")
    expect(bundle).not.toContain("second one")
  })
})

////////////////
// ## Helpers
////////////////

/** A language file's path, for the messages. */
const FILE = "/k/parser/src/spell/rules/m/m.en.ts"

const TEMP = mkdtempSync(join(tmpdir(), "strip-rule-tests-"))
afterAll(() => rmSync(TEMP, { recursive: true, force: true }))
