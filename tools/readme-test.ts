/**
 * `tools/readme-test.ts`:  the README examples, RUN (`yarn readme:test` / `spell readme test` at the kit's root;
 * epic `readme` P16).
 * - An EXAMPLE is a command a page prints, and what it printed:  an `sh` block, then, right after it, a fold whose
 *   summary is `Output`, holding a `text` block.  It runs from its page's repo root, and must print what the fold says.
 * - A command with no Output fold is never run:  installs, clones, servers.
 * - Node 24 runs it as is (its types stripped):  node's own modules only (and the standalone
 *   `spell/util/string.ts` and `spell/cli/commandBlocks.ts`), `import type` for types.
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
 * - Reading the blocks and matching what was printed (`...` for what varies) are the kit's command base's,
 *   `spell/cli/commandBlocks.ts`, which the runbooks read with too (`spell runbook`).
 * - The `spell` and `epic` it runs are THIS checkout's (`bin/spell.mjs`, `epic/bin/epic`), never the ones on
 *   the `PATH`:  they're the main checkout's.
 * - Exit status 1 when an example fails, 0 when all pass.
 */
import { spawnSync } from "node:child_process"
import { mkdtempSync, readFileSync, writeFileSync, chmodSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, relative, resolve } from "node:path"

import { indented } from "spell/util/string.ts"
import { fencedBlocks, outputMatches, stripColours, tidyLines } from "spell/cli/commandBlocks.ts"

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

  /** The pages `ReadmeCheck` checks:  every folder's `README.md` and `README-*.md`, and the kit's `README/*.md`. */
  pages(): string[] {
    return new ReadmeCheck(this.root).pages()
  }

  /** The root of the folder the page at `path` is in:  `parser/`, else the kit's (`README/cli.md` runs there too). */
  repoRootOf(path: string): string {
    return join(this.root, new ReadmeCheck(this.root).repoOf(path))
  }

  /** The examples on the page at `path` (absolute):  each `sh` block with an Output fold;  `text` its content. */
  examples(path: string, text = readFileSync(path, "utf8")): ReadmeExample[] {
    return fencedBlocks(text)
      .filter((block) => block.language === "sh" && block.output !== undefined)
      .map((block) => ({
        page: relative(this.root, path),
        line: block.line,
        folder: this.repoRootOf(path),
        commands: block.text,
        expected: block.output!
      }))
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

  /** Whether `printed` is what `expected` says:  `outputMatches()`, the kit's command base's. */
  static matches(expected: string, printed: string): boolean {
    return outputMatches(expected, printed)
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
    shim("epic", JSON.stringify(join(this.root, "epic", "bin", "epic")))
    this.shimFolder = folder
    return folder
  }

  /** the folder `shims()` made, once made */
  private shimFolder: string | undefined
}

/** One example on a page:  its commands and the output its fold says they print. */
export type ReadmeExample = {
  /** the page, from the kit's root (`parser/README.md`) */
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

/** `text`'s first line. */
function firstLine(text: string): string {
  return text.split("\n")[0]
}

if (import.meta.main) process.exitCode = new ReadmeTest().main(process.argv.slice(2))
