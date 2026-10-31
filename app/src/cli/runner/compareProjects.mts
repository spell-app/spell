/**
 * Child process of `spell content compare`:  compiles every built-in project of ONE checkout, into a folder.
 * - Started by `contentCompareCommand.ts` as `node --import tsx/esm compareProjects.mts <folder>`.
 *   Its copy in `--against`'s temp checkout finds that checkout's spell through its own imports.
 * - Writes, per project:  `<project>/compiled.js`, and `<project>/<file>.messages.txt` for a file with errors or warnings.
 *   - The test projects:  `compiledFixture()`, as their snapshots are made
 *   - The notebooks:  each file's own compile, as the snapshots have none
 * - Never `spell/app/cli`.
 * - `.mts`, so it loads as an ES module wherever it's copied -- see `PAPERCUTS.md`.
 */
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "fs"
import { resolve } from "path"

import { parseSpellProject } from "spell/parser/spell/test"
import environment from "spell/app/spaces/server/node/environment"
import {
  compiledFixture,
  fixtureImportScope,
  fixtureProjectNames,
  importScopeIn,
  loadFixtureProject
} from "spell/app/spaces/test"

type ParsedFile = ReturnType<typeof parseSpellProject>["files"][number]

const [outFolder] = process.argv.slice(2)

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
    write(name, "compiled.js", compiledFixture(name))
    const sources = loadFixtureProject(name)
    writeMessages(name, parseSpellProject(sources, { parentScope: fixtureImportScope(name) }).files)
  } catch (error) {
    write(name, "threw.txt", `${String(error)}\n`)
  }
}

const NOTEBOOKS_DIR = resolve(environment.systemFilesRoot, "notebooks")
for (const { name } of readdirSync(NOTEBOOKS_DIR, { withFileTypes: true }).filter((it) => it.isDirectory())) {
  const project = `@spell/notebooks/${name}`
  try {
    const folder = resolve(NOTEBOOKS_DIR, name)
    const paths = readdirSync(folder).filter((file) => file.endsWith(".spellml"))
    const files = paths.map((file) => ({ path: `/${file}`, contents: readFileSync(resolve(folder, file), "utf8") }))
    const parentScope = importScopeIn(
      folder,
      files.map(({ path }) => path)
    )
    const parsed = parseSpellProject(files, { parentScope }).files
    for (const { path, compiled } of parsed) write(project, `${path.slice(1)}.js`, compiled)
    writeMessages(project, parsed)
  } catch (error) {
    write(project, "threw.txt", `${String(error)}\n`)
  }
}
