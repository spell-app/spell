import { readdirSync, readFileSync, statSync, writeFileSync } from "node:fs"
import { extname, join } from "node:path"

import { CLI } from "spell/cli"
import { OldNames } from "spell/ui/tools/OldNames"

import type { RenameOptions } from "./cli.types"

/**
 * `spell ui rename [--write] <paths...>`:  Spell UI's old attribute names, rewritten into their new ones
 * (`<ui-button primary>` => `<ui-button color="primary">`), in every page and code file under `paths`
 * (epic `ui-gaps` P6;  the rewrite itself:  `OldNames`).
 * - Since epic `ui-gaps` P13 the old names do nothing on a page:  this is how markup still in them catches up.
 * - Without `--write`:  lists each file and what it would change;  nothing is written.
 * - With it:  rewrites them in place.
 * - `--markup-only`:  only tags a browser draws, never escaped markup in a code sample:  for pages that quote the old
 *   names on purpose (an epic's record of what was decided).
 * - Reads HTML, Markdown, code (`.ts`, `.tsx`, `.js`, `.mjs`), style sheets (`.css`) and spell (`.spell`);  leaves out what's built (bundles, packs,
 *   generated data, `node_modules`), minified files, and the vocabularies (`UIButton.en.ts`), which name their old
 *   names on purpose.
 * - Leaves alone a request sent to an epic (`requests/r3/request.md`):  someone's words, verbatim.
 * - Leaves alone a file that says `spell ui rename: leave this file`:  one whose old names are the point
 *   (this command, its rewriter, a test of the old names).
 * - Prints what it left for a person (a value it can't see, a button `label` that could be either).
 * - Returns the exit code:  `EXIT.ERRORS` when a dry run found something to change, so a check can fail on it.
 */
export async function renameCommand(paths: string[], options: RenameOptions = {}): Promise<number> {
  const names = await OldNames.load()
  let files = 0
  let renames = 0
  for (const file of paths.flatMap((path) => filesUnder(path))) {
    const text = readFileSync(file, "utf8")
    if (text.includes(LEAVE_MARKER)) continue
    const result = names.rewrite(text, { markupOnly: options.markupOnly })
    for (const line of result.manual) CLI.err(`${CLI.relativePath(file)}:  ${line}`)
    if (result.text === text) continue
    files++
    renames += result.renames.length
    if (options.write) writeFileSync(file, result.text)
    if (!options.quiet) CLI.out(`${CLI.relativePath(file)}:  ${summary(result.renames)}`)
  }
  const done = options.write ? "rewrote" : "would rewrite"
  CLI.out(`${done} ${renames} old names in ${files} files`)
  return !options.write && files ? CLI.EXIT.ERRORS : CLI.EXIT.OK
}

/** The renames of one file, each kind once with its count:  `basic => appearance="basic" (x3)`. */
function summary(renames: readonly string[]): string {
  const counts = new Map<string, number>()
  for (const rename of renames) counts.set(rename, (counts.get(rename) ?? 0) + 1)
  return [...counts].map(([rename, count]) => (count > 1 ? `${rename} (x${count})` : rename)).join(";  ")
}

/** Every file `rename` reads under `path` (a file, or a folder walked), built and vendored folders left out. */
function filesUnder(path: string): string[] {
  const stat = statSync(path)
  if (stat.isFile()) return isReadable(path, stat.size) ? [path] : []
  const files: string[] = []
  for (const entry of readdirSync(path, { withFileTypes: true })) {
    if (entry.name.startsWith(".") || SKIPPED_FOLDERS.has(entry.name) || BUILD_FOLDER.test(entry.name)) continue
    const child = join(path, entry.name)
    if (entry.isDirectory()) files.push(...filesUnder(child))
    else if (entry.isFile() && isReadable(child, statSync(child).size)) files.push(child)
  }
  return files
}

/** A file `rename` reads:  a page or code, not built, not minified. */
function isReadable(file: string, size: number): boolean {
  if (!READ_EXTENSIONS.has(extname(file)) || size > MAX_FILE_SIZE) return false
  if (BUILT_FILE.test(file) || SENT_REQUEST.test(file)) return false
  return !readFileSync(file, "utf8")
    .split("\n")
    .some((line) => line.length > MINIFIED_LINE)
}

/** A file saying this is left as it is:  its old names are the point.  (This file says it too.) */
const LEAVE_MARKER = "spell ui rename: leave this file"

/**
 * The kinds of file it reads.
 * - `.css` since epic `ui-gaps` P14:  a renamed tag is a selector there (`ui-docs-example::part(demo)`), and its
 *   tokens (`--ui-docs-example-gap`);  a sheet has no markup, so nothing else changes in it.
 */
const READ_EXTENSIONS = new Set([".html", ".md", ".ts", ".tsx", ".js", ".mjs", ".spell", ".css"])

/** Folders it never walks into:  built, vendored, or results. */
const SKIPPED_FOLDERS = new Set([
  "node_modules",
  "dist",
  "dist-types",
  "build",
  "results",
  "_assets",
  "__data",
  "__pack",
  "baselines",
  "reference"
])

/** A build's folder by its name:  `dist-static`, `dist-element` (spell-app's builds), beside a plain `dist`. */
const BUILD_FOLDER = /^dist-[\w-]+$/

/**
 * Files it leaves:  built ones (generated types, catalogs, packs), and the vocabularies, which list their own old
 * names on purpose (`UIButton.en.ts`, `UIButton.es.ts`).
 */
const BUILT_FILE = /(?:^|\/)(?:jsx\.ts|[^/]*\.catalog\.ts|[^/]*\.pack\.js|[^/]*\.min\.js|[^/]*\.[a-z]{2}\.ts)$/

/**
 * A request another session sent an epic (`/send`, `epic send`):  someone's words VERBATIM, a record that's never
 * rewritten, whatever names it uses (epic `ui-gaps` P14).
 */
const SENT_REQUEST = /(?:^|\/)requests\/r\d+\/request\.md$/

/** A file bigger than this is built, not written:  left alone. */
const MAX_FILE_SIZE = 2_000_000

/**
 * A line this long means a minified file.
 * - Was 5,000:  a page's inline SVG path (the Spell hat in every set's `__parts/layout.html`) runs to 10,000,
 *   which left those layouts out of the theme menu's rename (epic `debut` P17).
 */
const MINIFIED_LINE = 20_000
