import { describe, expect, test } from "vite-plus/test"
import { readdirSync, readFileSync, statSync } from "node:fs"
import { join, relative } from "node:path"

/**
 * A guard (epic `spanish` P3):  rule CODE never reads a word a person wrote.
 * - A rule's words are its language's, in its module's `<module>.<lang>.ts`;  its class is every language's.
 * - So no `token.value === "is not"`, `.includes("not")`, `matchesLiteral("the")`, `/^(has|belongs)$/` in rule files:
 *   ask a word rule instead (`Negatable.isNegated()`, `Wording.meaningOf()`, `Wording.reads()`).
 * - What it looks for is plain text, not a parse:  a line that only LOOKS like one (a docstring, a rule name)
 *   goes in `ALLOWED`, with why.
 */
describe("rule code reads no English words", () => {
  test("no rule file compares a matched word to an English one", () => {
    const found: string[] = []
    for (const file of ruleFiles(RULES)) {
      readFileSync(file, "utf8")
        .split("\n")
        .forEach((line, index) => {
          if (/^\s*(\*|\/\/|\/\*)/.test(line)) return
          // a `typeof x === "string"` check is javascript's, not a person's word
          const code = line.replace(/typeof [\w.]+ (===|!==) "\w+"/g, "")
          if (!WORD_READS.some((pattern) => pattern.test(code))) return
          const where = `${relative(RULES, file)}:${index + 1}`
          if (!ALLOWED.some(([path, text]) => where.startsWith(path) && line.includes(text)))
            found.push(`${where}  ${line.trim()}`)
        })
    }
    expect(found).toEqual([])
  })
})

/** spell's rules folder. */
const RULES = join(import.meta.dirname, "../../../src/spell/rules")

/** Ways rule code reads a person's word. */
const WORD_READS = [
  /\.(value|raw|inputText)\)?`?\s*(===|!==)\s*"[a-z]{2,}/i,
  /`\$\{[^}]*\.(value|raw)[^}]*\}`(\.toLowerCase\(\))?\s*(===|!==)\s*"[a-z]/i,
  /\.(value|raw)\b[^;]*\.includes\("[a-z]/i,
  /matchesLiteral\(\s*\[?\s*"[a-z]/i,
  /\/\^\(?(?:[a-z]+ ?)+(?:\|(?:[a-z]+ ?)+)+\)?\$\/i?\.test\(/i
]

/** Lines that look like a word read but aren't, by file (from the rules folder) and a bit of the line:  why. */
const ALLOWED: Array<[path: string, text: string]> = [
  // property and rule NAMES, not a person's words
  ["classes/NewThing.ts", '!== "name"'],
  ["classes/DefinePropertyHas.ts", '=== "instanceType"'],
  // `front` / `back` / `down`:  a drawable's side names, shared with the runtime's draw() (P3 report:  a decision)
  ["classes/DrawSide.ts", '"front"']
]

/** Every rule CLASS file below `folder`:  not a language's registrations (`.en.ts` ...). */
function ruleFiles(folder: string): string[] {
  return readdirSync(folder).flatMap((name) => {
    const path = join(folder, name)
    if (statSync(path).isDirectory()) return ruleFiles(path)
    return name.endsWith(".ts") && !/\.[a-z]{2}\.ts$/.test(name) ? [path] : []
  })
}
