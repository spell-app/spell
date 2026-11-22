import { readFile } from "node:fs/promises"
import type { Plugin as EsbuildPlugin } from "esbuild"
import type TS from "@typescript/typescript6"
import type { SourceMap } from "magic-string"
import type { Plugin } from "vite"

/**
 * The grammar rules' tests, taken out of BUILT code:  a build-only Vite plugin, and the same as an esbuild plugin.
 * - Every rule's language file (`parser/src/spell/rules/<folder>/<folder>.en.ts`, `.es.ts` ...) registers it with
 *   its tests:  `lists.addRule(ListLiteral, { syntax, tests: [...] })`.
 *   They're about 70% of those files, and nothing in a built app runs them.
 * - The source stays as it is:  dev, Vitest, `spell speedtest` and the syntax table read it, every test with it.
 * - Each rule keeps its FIRST example, all the language server reads at run time:
 *   `SpellLanguageService.firstExample()`, the first test whose input isn't empty, shown as "For example".
 *   - its input alone, as written, in a block of its own:  `tests: [{ tests: [{ input: "red" }] }]`
 *   - a rule with no such test loses `tests` altogether
 * - Fails the build on a `tests` it can't read:  not an array literal of `{ tests: [...] }` blocks.
 *   So it never ships the tests by mistake, nor a cut it isn't sure of.
 * - Reads the files with TypeScript 6's JavaScript API (`@typescript/typescript6`), and cuts with `magic-string`:
 *   both dev dependencies, imported only when a language file is built.
 *   So a build outside the kit that never meets one (spell-brand's, through the elements' settings) needs neither.
 * - NOTE:  `SP.spellParser.speedTest()` in a BUILT editor's console times only those first examples.
 */
export function ruleTestsOutOfBuilds(): Plugin {
  return {
    name: "spell:rule-tests-out-of-builds",
    apply: "build",
    // before the decorators' and Solid's:  it reads the file as written
    enforce: "pre",
    async transform(code, id) {
      const [file] = id.split("?", 1)
      if (!file || !RULE_LANGUAGE_FILE.test(file)) return undefined
      return withoutRuleTests(code, file)
    }
  }
}

/**
 * `ruleTestsOutOfBuilds()` for a direct esbuild build, beside `sourceNames()`.
 * - Loads each language file itself, as TypeScript (`loader: "ts"`).
 */
export function ruleTestsOutOfBundles(): EsbuildPlugin {
  return {
    name: "spell:rule-tests-out-of-bundles",
    setup(builder) {
      builder.onLoad({ filter: RULE_LANGUAGE_FILE }, async ({ path }) => {
        const code = await readFile(path, "utf8")
        const cut = await withoutRuleTests(code, path)
        return { contents: cut?.code ?? code, loader: "ts" }
      })
    }
  }
}

/**
 * `code` of the language file `file` with each rule's tests cut down to its first example (see above);
 * `undefined` when it registers no tests.
 * - throws a `SyntaxError` naming the file and line of a `tests` it can't read
 */
export async function withoutRuleTests(
  code: string,
  file: string
): Promise<{ code: string; map: SourceMap } | undefined> {
  if (!code.includes("tests")) return undefined
  const [{ default: ts }, { default: MagicString }] = await Promise.all([
    import("@typescript/typescript6"),
    import("magic-string")
  ])
  const source = ts.createSourceFile(file, code, ts.ScriptTarget.Latest, true, ts.ScriptKind.TS)
  const out = new MagicString(code)
  let cuts = 0

  /** Throws for `node`, a `tests` this can't read. */
  const unreadable = (node: TS.Node, problem: string): never => {
    const { line } = source.getLineAndCharacterOfPosition(node.getStart())
    throw new SyntaxError(
      `ruleTestsOutOfBuilds():  ${file}:${line + 1}:  ${problem};  ` +
        "write a rule's tests as `tests: [{ tests: [...] }, ...]`, array and object literals"
    )
  }

  /** A test's input is the empty string or list, which `firstExample()` passes over. */
  const isEmptyInput = (input: TS.Expression | undefined) =>
    !!input &&
    (((ts.isStringLiteral(input) || ts.isNoSubstitutionTemplateLiteral(input)) && input.text === "") ||
      (ts.isArrayLiteralExpression(input) && input.elements.length === 0))

  /** The first test of `blocks` whose input isn't empty, cut to its input;  checks every block on the way. */
  const firstExampleOf = (blocks: TS.ArrayLiteralExpression) => {
    let first: string | undefined
    for (const block of blocks.elements) {
      if (!ts.isObjectLiteralExpression(block)) unreadable(block, "a test block that isn't an object literal")
      const tests = (block as TS.ObjectLiteralExpression).properties.find(
        (property) => property.name && ts.isIdentifier(property.name) && property.name.text === "tests"
      )
      if (!tests || !ts.isPropertyAssignment(tests)) unreadable(block, "a test block with no `tests: [...]` of its own")
      const list = (tests as TS.PropertyAssignment).initializer
      if (!ts.isArrayLiteralExpression(list)) unreadable(list, "a test block whose `tests` isn't an array literal")
      if (first !== undefined) continue
      for (const test of (list as TS.ArrayLiteralExpression).elements) {
        const input = ts.isArrayLiteralExpression(test)
          ? test.elements[0]
          : ts.isObjectLiteralExpression(test)
            ? test.properties.find(
                (property): property is TS.PropertyAssignment =>
                  ts.isPropertyAssignment(property) && ts.isIdentifier(property.name) && property.name.text === "input"
              )?.initializer
            : unreadable(test, "a test that isn't an array or object literal")
        if (!input || isEmptyInput(input)) continue
        // its input alone, in the test's own shape:  `[input, js]` or `{ input, js }`
        const text = input.getText(source)
        first = ts.isArrayLiteralExpression(test) ? `[${text}]` : `{ input: ${text} }`
        break
      }
    }
    return first
  }

  /** Cuts the `tests` of one rule's registration, `definition`. */
  const cutTests = (definition: TS.ObjectLiteralExpression) => {
    const { properties } = definition
    const index = properties.findIndex(
      (property) => property.name && ts.isIdentifier(property.name) && property.name.text === "tests"
    )
    if (index < 0) return
    const property = properties[index]!
    if (!ts.isPropertyAssignment(property)) unreadable(property, "a `tests` that isn't `tests: [...]`")
    const blocks = (property as TS.PropertyAssignment).initializer
    if (!ts.isArrayLiteralExpression(blocks)) unreadable(blocks, "a `tests` that isn't an array literal")
    const example = firstExampleOf(blocks as TS.ArrayLiteralExpression)
    if (example !== undefined) out.overwrite(blocks.getStart(source), blocks.getEnd(), `[{ tests: [${example}] }]`)
    // no example:  the property and its comma go
    else if (index < properties.length - 1)
      out.remove(property.getStart(source), properties[index + 1]!.getStart(source))
    else if (index > 0) out.remove(properties[index - 1]!.getEnd(), property.getEnd())
    else out.remove(property.getStart(source), property.getEnd())
    cuts++
  }

  const visit = (node: TS.Node): void => {
    if (
      ts.isCallExpression(node) &&
      ts.isPropertyAccessExpression(node.expression) &&
      node.expression.name.text === "addRule"
    ) {
      for (const argument of node.arguments) if (ts.isObjectLiteralExpression(argument)) cutTests(argument)
      return
    }
    ts.forEachChild(node, visit)
  }
  visit(source)

  if (!cuts) return undefined
  return { code: out.toString(), map: out.generateMap({ source: file, includeContent: true, hires: "boundary" }) }
}

/**
 * A grammar rule's language file:  `parser/src/spell/rules/<folder>/<folder>.<lang>.ts`, any folder below `rules/`.
 * - No lookahead:  esbuild runs the filter as a Go regular expression, which has none.
 */
export const RULE_LANGUAGE_FILE = /\/parser\/src\/spell\/rules\/(.+\/)?[^/]+\.[a-z][a-z]\.ts$/
