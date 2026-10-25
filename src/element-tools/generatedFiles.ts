/**
 * What every script that writes a generated file shares:  write only the files whose text changed (or, under
 * `--check`, fail on them), and splice a generated block into a hand-kept page.
 * - The kit's (epic `coherence` P11, from Spell UI's `src/tools/generatedFiles.ts`), for every repo's scripts:
 *   Spell UI's `site:*` and `readme:components`, the brand's and spell-epic's site data, the app's examples README
 *   and grammar, the kit's `mermaid:pretty`.
 * - Node only;  imports with `.ts` written:  plain `node` runs `tools/mermaid-pretty.ts` as it is.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import path from "node:path"

import { keepingCommentsIn } from "spell/util/node/json5.ts"

import { Terminal } from "./Terminal.ts"

////////////////
// ## Files
////////////////

/**
 * Write each of `outputs` whose file is missing or holds other text;  returns those files, relative to the cwd.
 * - A `.json5` file (a set's site data, `docs/__data/`) keeps the comments somebody wrote into it
 *   (`keepingCommentsIn()`):  a value that didn't change leaves the file as it is.
 * - `isCheck`:  write nothing;  print each stale file to stderr, naming `yarn <command>`, and set exit code 1 if any
 *   (0 if none)
 * - SIDE EFFECT:  writes files (making their folders), or sets `process.exitCode`
 */
export function writeOrCheck(outputs: GeneratedOutput[], { command, isCheck }: WriteOrCheckOptions): string[] {
  const written = outputs.map(([file, text]): GeneratedOutput => [file, keepingCommentsIn(file, text)])
  const stale = written.filter(([file, text]) => !existsSync(file) || readFileSync(file, "utf8") !== text)
  const names = stale.map(([file]) => path.relative(process.cwd(), file))
  if (isCheck) {
    for (const name of names) Terminal.err(`stale:  ${name} (run \`yarn ${command}\`)`)
    process.exitCode = stale.length ? 1 : 0
    return names
  }
  for (const [file, text] of stale) {
    mkdirSync(path.dirname(file), { recursive: true })
    writeFileSync(file, text)
  }
  return names
}

/**
 * `page` with what's between its `start` and `end` markers replaced by `block(indent)`, `indent` being the start
 * marker's.
 * - Each marker on its own line;  the rest of the page is hand-kept, and keeps its bytes.
 * - throws if a marker is missing, or they're out of order
 */
export function spliceGenerated(page: string, { file, start, end, block }: SpliceParams): string {
  const from = page.indexOf(start)
  const to = page.indexOf(end)
  if (from < 0 || to < from) {
    throw new Error(`spliceGenerated():  ${file} has no ${start} ... ${end} markers;  put them back around its block`)
  }
  const indent = page.slice(page.lastIndexOf("\n", from) + 1, from)
  return page.slice(0, from + start.length) + "\n" + block(indent) + indent + page.slice(to)
}

////////////////
// ## Types
////////////////

/** One generated file and the text it should hold. */
export type GeneratedOutput = [file: string, text: string]

/** `writeOrCheck()`'s options. */
export type WriteOrCheckOptions = {
  /** the yarn script that writes these files, e.g. `site:index`:  what a stale file says to run */
  command: string
  /** `--check`:  write nothing, fail if stale */
  isCheck: boolean
}

/** `spliceGenerated()`'s params. */
export type SpliceParams = {
  /** the page's file, for the error */
  file: string
  /** the start marker, e.g. `<!-- components:start -->` */
  start: string
  /** the end marker, e.g. `<!-- components:end -->` */
  end: string
  /** the generated lines, each at `indent`, ending in a newline */
  block: (indent: string) => string
}
