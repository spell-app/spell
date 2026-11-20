/**
 * Command blocks in Markdown:  a page's fenced blocks, each `sh` one with the Output fold after it, and how what a
 * command printed is matched against that fold.
 * - Two readers share it:
 *   - the README examples' tester (`tools/readme-test.ts`, `spell readme test`;  epic `readme` P16)
 *   - the runbooks' reader (`spell/cli/runbook`, `spell runbook`;  epic `epic-engine` P78)
 * - Its position:  node's own modules and util's standalone `spell/util/string.ts` only, so plain node runs it, as the
 *   README tester does (`spell/cli/commandBlocks.ts`);  NOT in the `spell/cli` barrel.
 *
 * ````markdown
 * ```sh
 * spell run @spell/examples/fizzbuzz --no-browser
 * ```
 *
 * <details>
 * <summary>Output</summary>
 *
 * ```text
 * ✓ Compiling @spell/examples/fizzbuzz
 * ...
 * ```
 *
 * </details>
 * ````
 *
 * - The fold's two tags may share a line too:  `<details><summary>Output</summary>`.
 * - Matching (`outputMatches()`):  line by line, trailing spaces and blank lines at the end ignored, colours stripped.
 *   - `...` alone on a line:  any lines, or none
 *   - `...` inside a line:  any text there (a time, a hash, a port)
 */
import { escapeRegExp } from "spell/util/string.ts"

/**
 * Every fenced block of `text`, in order:  a block inside another (```` ````markdown ````) is part of that one.
 * - An `sh` block with an Output fold right after it (blank lines between allowed) holds the fold's text as `output`;
 *   the fold's own `text` block is then not a block of its own.
 * - A block under a bullet, indented, is read without its indent.
 * - An opening fence with no closing one ends the list.
 */
export function fencedBlocks(text: string): FencedBlock[] {
  const lines = text.split("\n")
  const found: FencedBlock[] = []
  let index = 0
  while (index < lines.length) {
    const opening = OPENING_FENCE.exec(lines[index] ?? "")
    if (!opening) {
      index++
      continue
    }
    const [, indent = "", marker = "", language = "", info = ""] = opening
    const close = findClose(lines, index + 1, marker)
    if (close === -1) break
    const block: FencedBlock = {
      language,
      info: info.trim(),
      line: index + 1,
      lastLine: close + 1,
      text: dedent(lines.slice(index + 1, close), indent)
    }
    index = close + 1
    if (language === "sh") {
      const output = outputAfter(lines, index)
      if (output) {
        block.output = output.text
        block.lastLine = output.end
        index = output.end
      }
    }
    found.push(block)
  }
  return found
}

/**
 * Whether `printed` is what `expected` says, line by line:
 * - each side's trailing spaces, and its blank lines at the end, ignored;  colours in `printed` stripped
 * - `...` alone on a line:  any lines, or none;  `...` inside a line:  any text there
 */
export function outputMatches(expected: string, printed: string): boolean {
  const want = tidyLines(expected)
  const got = tidyLines(stripColours(printed))
  const patterns = want.map((line) => (line.trim() === "..." ? ANY_LINES : linePattern(line)))
  // memo[i][j]:  whether want[i..] matches got[j..]
  const memo = new Map<string, boolean>()
  const match = (i: number, j: number): boolean => {
    const key = `${i}:${j}`
    const known = memo.get(key)
    if (known !== undefined) return known
    let result: boolean
    if (i === patterns.length) result = j === got.length
    else if (patterns[i] === ANY_LINES) result = match(i + 1, j) || (j < got.length && match(i, j + 1))
    else result = j < got.length && (patterns[i] as RegExp).test(got[j]!) && match(i + 1, j + 1)
    memo.set(key, result)
    return result
  }
  return match(0, 0)
}

/** `text`'s lines, each without trailing spaces, and without blank lines at the end. */
export function tidyLines(text: string): string[] {
  const lines = text
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trimEnd())
  while (lines.length && !lines[lines.length - 1]) lines.pop()
  return lines
}

/** `text` without terminal colour codes. */
export function stripColours(text: string): string {
  // oxlint-disable-next-line no-control-regex -- the escape character starts every colour code
  return text.replace(/\u001b\[[0-9;]*[A-Za-z]/g, "")
}

/** One fenced block of a page. */
export type FencedBlock = {
  /** the fence's first word:  `sh`, `text`, `ask`;  `""` for none */
  language: string
  /** the rest of the fence's line, trimmed:  `NETBOX_TOKEN secret` of ```` ```ask NETBOX_TOKEN secret ```` */
  info: string
  /** the opening fence's line, from 1 */
  line: number
  /** its last line, from 1:  its closing fence, or its Output fold's text block's */
  lastLine: number
  /** what's inside, without the block's indent */
  text: string
  /** an `sh` block's Output fold:  what it should print */
  output?: string
}

/** An opening fence:  its indent, its backticks, its language, the rest of its line. */
const OPENING_FENCE = /^(\s*)(`{3,})([^`\s]*)(?:\s+([^`]*))?$/

/** A `...` line's place in `outputMatches()`:  any lines. */
const ANY_LINES = Symbol("any lines")

/** The closing fence of a block opened by `marker`, from line `start`;  -1 when there's none. */
function findClose(lines: string[], start: number, marker: string): number {
  for (let index = start; index < lines.length; index++) {
    const line = (lines[index] ?? "").trim()
    if (line.startsWith(marker) && line.replace(/`/g, "") === "") return index
  }
  return -1
}

/**
 * The Output fold right after line `start` (blank lines between allowed):  its `text` block's text, and the line
 * after that block;  `undefined` when the next thing isn't one.
 */
function outputAfter(lines: string[], start: number): { text: string; end: number } | undefined {
  let index = start
  while (index < lines.length && !lines[index]!.trim()) index++
  const first = lines[index]?.trim() ?? ""
  if (/^<details>\s*<summary>Output<\/summary>$/i.test(first)) index += 1
  else if (/^<details>$/i.test(first) && /^<summary>Output<\/summary>$/i.test(lines[index + 1]?.trim() ?? "")) {
    index += 2
  } else return undefined
  while (index < lines.length && !lines[index]!.trim()) index++
  const opening = /^(\s*)(`{3,})text\s*$/.exec(lines[index] ?? "")
  if (!opening) return undefined
  const close = findClose(lines, index + 1, opening[2]!)
  if (close === -1) return undefined
  return { text: dedent(lines.slice(index + 1, close), opening[1]!), end: close + 1 }
}

/** `lines` joined, each without its block's indent (`indent`, the fence's own):  a block under a bullet. */
function dedent(lines: string[], indent: string): string {
  return lines.map((line) => (line.startsWith(indent) ? line.slice(indent.length) : line.trimStart())).join("\n")
}

/** A line of expected output as a pattern:  `...` inside it is any text, the rest literal. */
function linePattern(line: string): RegExp {
  return new RegExp(`^${line.split("...").map(escapeRegExp).join(".*")}$`)
}
