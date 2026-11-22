import { readFile } from "node:fs/promises"
import type { Plugin as EsbuildPlugin } from "esbuild"
import type { SourceMap } from "magic-string"
import type { Plugin } from "vite"

import type { SourceNode } from "spell/util/node/typescript"

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
 * - Reads the files with the kit's one TypeScript reader, `readTypeScript()` (oxc's, which Vite+ ships), and cuts with
 *   `magic-string`, a dev dependency:  both imported only when a language file is built (epic `solid-2-final` P11).
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
  const [{ readTypeScript, walk }, { default: MagicString }] = await Promise.all([
    import("spell/util/node/typescript"),
    import("magic-string")
  ])
  const source = readTypeScript(file, code, { lang: "ts" })
  if (source.errors.length) {
    throw new SyntaxError(`ruleTestsOutOfBuilds():  ${file}:  doesn't parse:  ${source.errors[0]}`)
  }
  const out = new MagicString(code)
  let cuts = 0

  /** The text of `node`, as written. */
  const textOf = (node: SourceNode) => code.slice(node.start, node.end)

  /** Throws for `node`, a `tests` this can't read. */
  const unreadable = (node: SourceNode, problem: string): never => {
    const line = code.slice(0, node.start).split("\n").length
    throw new SyntaxError(
      `ruleTestsOutOfBuilds():  ${file}:${line}:  ${problem};  ` +
        "write a rule's tests as `tests: [{ tests: [...] }, ...]`, array and object literals"
    )
  }

  /** `object`'s plain `name: value` property, if it has one. */
  const propertyOf = (object: SourceNode, name: string) =>
    (object.properties as SourceNode[]).find((property) => keyOf(property) === name)

  /** A test's input is the empty string or list, which `firstExample()` passes over. */
  const isEmptyInput = (input: SourceNode | undefined) =>
    !!input &&
    ((input.type === "Literal" && input.value === "") ||
      (input.type === "TemplateLiteral" &&
        !(input.expressions as SourceNode[]).length &&
        (input.quasis as SourceNode[]).every((quasi) => !(quasi.value as { cooked: string }).cooked)) ||
      (input.type === "ArrayExpression" && !(input.elements as unknown[]).length))

  /** The first test of `blocks` whose input isn't empty, cut to its input;  checks every block on the way. */
  const firstExampleOf = (blocks: SourceNode) => {
    let first: string | undefined
    for (const block of blocks.elements as SourceNode[]) {
      if (block?.type !== "ObjectExpression") unreadable(block, "a test block that isn't an object literal")
      const tests = propertyOf(block, "tests")
      if (!tests || !isPlainProperty(tests)) unreadable(block, "a test block with no `tests: [...]` of its own")
      const list = tests!.value as SourceNode
      if (list.type !== "ArrayExpression") unreadable(list, "a test block whose `tests` isn't an array literal")
      if (first !== undefined) continue
      for (const test of list.elements as SourceNode[]) {
        const input =
          test?.type === "ArrayExpression"
            ? (test.elements as SourceNode[])[0]
            : test?.type === "ObjectExpression"
              ? (propertyOf(test, "input")?.value as SourceNode | undefined)
              : unreadable(test, "a test that isn't an array or object literal")
        if (!input || isEmptyInput(input)) continue
        // its input alone, in the test's own shape:  `[input, js]` or `{ input, js }`
        const text = textOf(input)
        first = test.type === "ArrayExpression" ? `[${text}]` : `{ input: ${text} }`
        break
      }
    }
    return first
  }

  /** Cuts the `tests` of one rule's registration, `definition`. */
  const cutTests = (definition: SourceNode) => {
    const properties = definition.properties as SourceNode[]
    const index = properties.findIndex((property) => keyOf(property) === "tests")
    if (index < 0) return
    const property = properties[index]!
    if (!isPlainProperty(property)) unreadable(property, "a `tests` that isn't `tests: [...]`")
    const blocks = property.value as SourceNode
    if (blocks.type !== "ArrayExpression") unreadable(blocks, "a `tests` that isn't an array literal")
    const example = firstExampleOf(blocks)
    if (example !== undefined) out.overwrite(blocks.start, blocks.end, `[{ tests: [${example}] }]`)
    // no example:  the property and its comma go
    else if (index < properties.length - 1) out.remove(property.start, properties[index + 1]!.start)
    else if (index > 0) out.remove(properties[index - 1]!.end, property.end)
    else out.remove(property.start, property.end)
    cuts++
  }

  walk(source.program, (node) => {
    const callee = node.callee as SourceNode | undefined
    if (node.type !== "CallExpression" || callee?.type !== "MemberExpression") return
    if ((callee.property as SourceNode).name !== "addRule") return
    for (const argument of node.arguments as SourceNode[]) if (argument.type === "ObjectExpression") cutTests(argument)
    return false
  })

  if (!cuts) return undefined
  return { code: out.toString(), map: out.generateMap({ source: file, includeContent: true, hires: "boundary" }) }
}

/** A property's name, when it's a plain one (`tests:`, `"tests":`);  else `undefined`. */
function keyOf(property: SourceNode): string | undefined {
  if (property.type !== "Property" || property.computed) return undefined
  const key = property.key as SourceNode
  return key.type === "Identifier" ? (key.name as string) : typeof key.value === "string" ? key.value : undefined
}

/** Is `property` a plain `name: value`, not a method, a getter or a shorthand? */
function isPlainProperty(property: SourceNode): boolean {
  return property.type === "Property" && property.kind === "init" && !property.method && !property.shorthand
}

/**
 * A grammar rule's language file:  `parser/src/spell/rules/<folder>/<folder>.<lang>.ts`, any folder below `rules/`.
 * - No lookahead:  esbuild runs the filter as a Go regular expression, which has none.
 */
export const RULE_LANGUAGE_FILE = /\/parser\/src\/spell\/rules\/(.+\/)?[^/]+\.[a-z][a-z]\.ts$/
