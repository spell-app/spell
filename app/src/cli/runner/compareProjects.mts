/**
 * Child process of `spell content compare`:  compiles every built-in project of ONE checkout, into a folder.
 * - Started by `contentCompareCommand.ts` as `node --import tsx/esm compareProjects.mts <folder>`.
 *   Its copy in `--against`'s temp checkout finds that checkout's spell through its own imports.
 * - Writes, per project:  `<project>/compiled.js`, and `<project>/<file>.messages.txt` for a file with errors or warnings.
 *   - The test projects:  `compiledFixture()`, as their snapshots are made
 *   - The Spell UI site's pages:  each file's own compile, as the snapshots have none, and only in javascript:  it's all they run in
 * - A second argument names the target, e.g. `py`:  the test projects are compiled for it.
 * - Never `spell/app/cli`.
 * - `.mts`, so it loads as an ES module wherever it's copied -- see `PAPERCUTS.md`.
 */
import { mkdirSync, writeFileSync } from "fs"
import { resolve } from "path"

import { parseSpellProject } from "spell/parser/spell/test"
import { SPACES } from "spell/app/spaces"
import { compiledFixture, fixtureImportScope, fixtureProjectNames, loadFixtureProject } from "spell/app/spaces/test"

type ParsedFile = ReturnType<typeof parseSpellProject>["files"][number]

const [outFolder, target] = process.argv.slice(2)

/** Write `text` as `file` of `project`'s folder under `outFolder`. */
function write(project: string, file: string, text: string): void {
  const path = resolve(outFolder!, project, file)
  mkdirSync(resolve(path, ".."), { recursive: true })
  writeFileSync(path, text)
}

/** Write each of `files`' errors and warnings, if it has any. */
function writeMessages(project: string, files: ParsedFile[]): void {
  for (const { path, errors, warnings } of files) {
    const lines = [...errors.map((error) => `error ${error}`), ...warnings.map((warning) => `warning ${warning}`)]
    if (lines.length) write(project, `${path.slice(1)}.messages.txt`, lines.join("\n") + "\n")
  }
}

for (const name of fixtureProjectNames()) {
  try {
    write(name, target ? `compiled.${target.replace(/\W/g, "-")}` : "compiled.js", compiledFixture(name, target))
    const sources = loadFixtureProject(name)
    writeMessages(name, parseSpellProject(sources, { parentScope: fixtureImportScope(name), projectPath: name }).files)
  } catch (error) {
    write(name, "threw.txt", `${String(error)}\n`)
  }
}

// The Spell UI site, its pages' own compiles together:  it has no snapshots of its own, and runs only in javascript
const SPELL_UI = SPACES.SPELL_UI_SITE_PROJECT
try {
  const files = loadFixtureProject(SPELL_UI)
  const parsed = parseSpellProject(files, { parentScope: fixtureImportScope(SPELL_UI), projectPath: SPELL_UI }).files
  for (const { path, compiled } of parsed) write(SPELL_UI, `${path.slice(1)}.js`, compiled)
  writeMessages(SPELL_UI, parsed)
} catch (error) {
  write(SPELL_UI, "threw.txt", `${String(error)}\n`)
}
