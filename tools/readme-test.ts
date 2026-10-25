/**
 * `tools/readme-test.ts`:  the README examples, RUN (`yarn readme:test` / `spell readme test` at the kit's root;
 * epic `readme` P16).
 * - An EXAMPLE is a command a page prints, and what it printed:  an `sh` block, then, right after it, a fold whose
 *   summary is `Output`, holding a `text` block.  It runs from its page's repo root, and must print what the fold says.
 * - A command with no Output fold is never run:  installs, clones, servers.
 * - Node 24 runs it as is (its types stripped):  node's own modules only (and util's standalone `spell/util/string.ts`),
 *   `import type` for types.
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
 * 1
 * ...
 * ```
 *
 * </details>
 * ````
 *
 * ```sh
 * yarn readme:test                    # every page's examples
 * yarn readme:test README.md          # only those pages (paths from the kit's root)
 * yarn readme:test --list             # the examples, not run
 * ```
 *
 * - Matching (`ReadmeTest.matches()`):  line by line, trailing spaces and blank lines ignored, colours stripped.
 *   - `...` alone on a line:  any lines, or none
 *   - `...` inside a line:  any text there (a time, a hash, a port)
 * - The `spell` and `epic` it runs are THIS checkout's (`bin/spell.mjs`, `spell-epic/bin/epic`), never the ones on
 *   the `PATH`:  they're the main checkout's.
 * - Exit status 1 when an example fails, 0 when all pass.
 */
import { spawnSync } from "node:child_process"
import { mkdtempSync, readFileSync, writeFileSync, chmodSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join, relative, resolve } from "node:path"

import { escapeRegExp, indented } from "spell/util/string.ts"

import { ReadmeCheck } from "./readme-check.ts"

/****************
 * ### `ReadmeTest`
 * The README examples:  found on the pages, run, and their output compared.
 * - `examples()`:  every example of the pages;  `run()`:  one, with what it printed;  `matches()`:  the comparison.
 ****************/
export class ReadmeTest {
  /** the kit's root:  this file is in its `tools/` */
  readonly root: string

  /** how long one example may run, in seconds */
  static readonly TIMEOUT = 120

  constructor(root = resolve(import.meta.dirname, "..")) {
    this.root = root
  }

  /** The pages `ReadmeCheck` checks:  every repo's `README.md` and `README-*.md`. */
  pages(): string[] {
    return new ReadmeCheck(this.root).pages()
  }

  /** The examples on the page at `path` (absolute);  `text` its content, read from disk when not given. */
  examples(path: string, text = readFileSync(path, "utf8")): ReadmeExample[] {
    const lines = text.split("\n")
    const found: ReadmeExample[] = []
    let index = 0
    while (index < lines.length) {
      // indented too:  an example under a bullet
      const opening = /^(\s*)(`{3,})sh\s*$/.exec(lines[index])
      if (!opening) {
        // any other fenced block is skipped whole:  a page SHOWING an example (```` ````markdown ````) runs nothing
        const other = /^\s*(`{3,})\S*\s*$/.exec(lines[index])
        const end = other ? findClose(lines, index + 1, other[1]) : -1
        index = end === -1 ? index + 1 : end + 1
        continue
      }
      const close = findClose(lines, index + 1, opening[2])
      if (close === -1) break
      const output = outputAfter(lines, close + 1)
      if (output) {
        found.push({
          page: relative(this.root, path),
          line: index + 1,
          folder: dirname(path),
          commands: dedent(lines.slice(index + 1, close), opening[1]),
          expected: output.text
        })
        index = output.end
      } else index = close + 1
    }
    return found
  }

  /**
   * Run `example`'s commands, from its page's repo root, in `bash`;  what they printed, its colours stripped, and the
   * exit status.
   * - stdout and stderr in ONE stream, in the order a terminal shows them (`exec 2>&1`):  `spell` prints its
   *   `✓ Compiling ...` line to stderr, ahead of the program's own output
   * - `spell` and `epic` are this checkout's (`shims()`);  colours off
   * - NEVER throws:  a command that can't start prints why
   */
  run(example: ReadmeExample): ReadmeRun {
    const result = spawnSync("bash", ["-c", `exec 2>&1\n${example.commands}`], {
      cwd: example.folder,
      encoding: "utf8",
      timeout: ReadmeTest.TIMEOUT * 1000,
      maxBuffer: 64 * 1024 * 1024,
      env: {
        ...process.env,
        PATH: `${this.shims()}:${process.env.PATH}`,
        NO_COLOR: "1",
        FORCE_COLOR: "0"
      }
    })
    const printed = `${result.stdout ?? ""}${result.error ? String(result.error) : ""}`
    return { printed: stripColours(printed), status: result.status ?? 1 }
  }

  /**
   * Whether `printed` is what `expected` says, line by line:
   * - each side's trailing spaces, and its blank lines at the end, ignored
   * - `...` alone on a line:  any lines, or none;  `...` inside a line:  any text there
   */
  static matches(expected: string, printed: string): boolean {
    const want = tidyLines(expected)
    const got = tidyLines(printed)
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
      else result = j < got.length && (patterns[i] as RegExp).test(got[j]) && match(i + 1, j + 1)
      memo.set(key, result)
      return result
    }
    return match(0, 0)
  }

  /**
   * The command line:  `[--list] [<page>...]`;  returns the exit status.
   * - prints a line per example (`✓` / `✗`), the failures' expected and printed text, then the totals
   */
  main(args: string[]): number {
    const list = args.includes("--list")
    const named = args.filter((arg) => !arg.startsWith("--"))
    const pages = named.length ? named.map((page) => resolve(this.root, page)) : this.pages()
    const examples = pages.flatMap((page) => this.examples(page))
    if (list) {
      for (const example of examples) console.log(`${example.page}:${example.line}  ${firstLine(example.commands)}`)
      console.log(`${examples.length} examples on ${pages.length} pages`)
      return 0
    }
    let failed = 0
    for (const example of examples) {
      const { printed } = this.run(example)
      const ok = ReadmeTest.matches(example.expected, printed)
      console.log(`${ok ? "✓" : "✗"} ${example.page}:${example.line}  ${firstLine(example.commands)}`)
      if (ok) continue
      failed++
      console.log(indented(`expected:\n${indented(tidyLines(example.expected).join("\n"), 2)}`, 2))
      console.log(indented(`printed:\n${indented(tidyLines(printed).join("\n"), 2)}`, 2))
    }
    console.log(`${examples.length - failed} of ${examples.length} examples pass, on ${pages.length} pages`)
    return failed ? 1 : 0
  }

  /**
   * A folder of `spell` and `epic` that run THIS checkout's:  made once per process, in the system's temp folder.
   * - SIDE EFFECT:  writes two scripts there
   */
  shims(): string {
    if (this.shimFolder) return this.shimFolder
    const folder = mkdtempSync(join(tmpdir(), "readme-test-"))
    const shim = (name: string, command: string) => {
      const file = join(folder, name)
      writeFileSync(file, `#!/bin/sh\nexec ${command} "$@"\n`)
      chmodSync(file, 0o755)
    }
    shim("spell", `node ${JSON.stringify(join(this.root, "bin", "spell.mjs"))}`)
    shim("epic", JSON.stringify(join(this.root, "spell-epic", "bin", "epic")))
    this.shimFolder = folder
    return folder
  }

  /** the folder `shims()` made, once made */
  private shimFolder: string | undefined
}

/** One example on a page:  its commands and the output its fold says they print. */
export type ReadmeExample = {
  /** the page, from the kit's root (`spell-parser/README.md`) */
  page: string
  /** the `sh` block's first line on the page */
  line: number
  /** where it runs:  the page's folder, its repo's root */
  folder: string
  /** the `sh` block's text, run by `bash` */
  commands: string
  /** the Output fold's text */
  expected: string
}

/** What running an example printed, and its exit status. */
export type ReadmeRun = { printed: string; status: number }

/** A `...` line's place in `matches()`:  any lines. */
const ANY_LINES = Symbol("any lines")

/** The closing fence of a block opened by `marker`, from line `start`;  -1 when there's none. */
function findClose(lines: string[], start: number, marker: string): number {
  for (let index = start; index < lines.length; index++)
    if (lines[index].trim().startsWith(marker) && lines[index].trim().replace(/`/g, "") === "") return index
  return -1
}

/**
 * The Output fold right after line `start` (blank lines between allowed):  its `text` block's text, and the line
 * after the fold;  `undefined` when the next thing isn't one.
 */
function outputAfter(lines: string[], start: number): { text: string; end: number } | undefined {
  let index = start
  while (index < lines.length && !lines[index].trim()) index++
  if (!/^<details>\s*$/i.test(lines[index]?.trim() ?? "")) return undefined
  if (!/^<summary>Output<\/summary>$/i.test(lines[index + 1]?.trim() ?? "")) return undefined
  index += 2
  while (index < lines.length && !lines[index].trim()) index++
  const opening = /^(\s*)(`{3,})text\s*$/.exec(lines[index] ?? "")
  if (!opening) return undefined
  const close = findClose(lines, index + 1, opening[2])
  if (close === -1) return undefined
  return { text: dedent(lines.slice(index + 1, close), opening[1]), end: close + 1 }
}

/** `lines` joined, each without its block's indent (`indent`, the fence's own):  a block under a bullet. */
function dedent(lines: string[], indent: string): string {
  return lines.map((line) => (line.startsWith(indent) ? line.slice(indent.length) : line.trimStart())).join("\n")
}

/** `text`'s lines, each without trailing spaces, and without blank lines at the end. */
function tidyLines(text: string): string[] {
  const lines = text
    .replace(/\r\n/g, "\n")
    .split("\n")
    .map((line) => line.trimEnd())
  while (lines.length && !lines[lines.length - 1]) lines.pop()
  return lines
}

/** A line of expected output as a pattern:  `...` inside it is any text, the rest literal. */
function linePattern(line: string): RegExp {
  return new RegExp(`^${line.split("...").map(escapeRegExp).join(".*")}$`)
}

/** `text` without terminal colour codes. */
function stripColours(text: string): string {
  // oxlint-disable-next-line no-control-regex -- the escape character starts every colour code
  return text.replace(/\u001b\[[0-9;]*[A-Za-z]/g, "")
}

/** `text`'s first line. */
function firstLine(text: string): string {
  return text.split("\n")[0]
}

if (import.meta.main) process.exitCode = new ReadmeTest().main(process.argv.slice(2))
