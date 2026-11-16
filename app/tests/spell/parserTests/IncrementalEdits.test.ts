import { describe, test, expect } from "vite-plus/test"

import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
import {
  describeParseErrors,
  describeWarnings,
  incrementalSpellProject,
  parseSpellProject,
  type summarize,
  type SpellSourceFile
} from "spell/parser/spell/test"
import {
  EXAMPLE_PROJECTS,
  LIBRARY_GROUP,
  fixtureImportScope,
  fixtureProjectId,
  fixtureProjectNames,
  loadFixtureProject,
  type TestProjectName
} from "spell/app/spaces/test"

/**
 * An incremental parse after an edit MUST give what a full parse of the edited files gives (epic `language` P58):
 * - every built-in example and every library project, against what it imports
 * - in each file, a series of edits, each then undone:  a step changed and one added deep in a body, a member renamed,
 *   added and removed, a new kind, a new phrase
 * - compared:  each file's code, errors and warnings, and the whole project's code for every target
 * - One incremental project per project, across all its edits, so its state has to stay right.
 * - Edits its FIRST file, whose edits reach every file after it;  `INCREMENTAL_FULL=1` edits every file
 *   (about 7 minutes:  the big examples' full parses, PublicServers' alone about 3).
 * - Solitaire's every line, edited four ways:  `IncrementalProject.test.ts`.
 */
const PROJECTS: TestProjectName[] = [
  ...new Set([...EXAMPLE_PROJECTS, ...fixtureProjectNames().filter((name) => name.startsWith(`${LIBRARY_GROUP}/`))])
]

/** Edit every file, not just the first?  See the docs above. */
const EVERY_FILE = !!process.env.INCREMENTAL_FULL

/** The targets each project's whole code is compared in. */
const TARGETS = ["js/solid", "ts/solid", "py"]

/** Each edit:  `text` changed, or `undefined` when the file has nowhere to make it. */
const EDITS: Record<string, (text: string) => string | undefined> = {
  "a step's text changed, deep in a body": (text) =>
    editLine(text, /^\t\t+.*"[^"\n]/, (line) => line.replace('"', '"z')),
  "a step added, deep in a body": (text) => editLine(text, /^\t\t+\S/, (line) => `${line}\n${line}`),
  "a member renamed": (text) => editLine(text, /^\t(its?) "[^"]+"/, (line) => line.replace(/"([^"]+)"/, '"$1z"')),
  "a member added": (text) => afterTypeLine(text, '\tits "zz extra" is 1'),
  "a member removed": (text) => editLine(text, /^\tits "[^"]+" is [^\n]*$/, () => undefined),
  "a new kind": (text) => `${text}\na "zz widget" is a thing\n`,
  "a new phrase": (text) => afterTypeLine(text, '\tit "is zz ready" if it exists')
}

describe("incremental parsing after each kind of edit ~== full parse", () => {
  for (const projectName of PROJECTS) {
    test(`${projectName}`, () => {
      const files = loadFixtureProject(projectName)
      const options = { parentScope: fixtureImportScope(projectName), projectPath: fixtureProjectId(projectName) }
      const project = incrementalSpellProject(files, false, options)
      const original = fullParse(files, options)
      expect(incrementalOutput(project), "before any edit").toEqual(original)
      for (const file of EVERY_FILE ? files : files.slice(0, 1)) {
        for (const [name, edit] of Object.entries(EDITS)) {
          const edited = edit(file.contents)
          if (edited === undefined || edited === file.contents) continue
          const where = `${file.path}, ${name}`
          const editedFiles = files.map((it) => (it.path === file.path ? { ...it, contents: edited } : it))
          project.update(file.path, edited)
          expect(incrementalOutput(project), where).toEqual(fullParse(editedFiles, options))
          project.update(file.path, file.contents)
          expect(incrementalOutput(project), `${where}, undone`).toEqual(original)
        }
      }
    }, 600_000)
  }
})

////////////////
// ## Comparing
////////////////

/**
 * What a project's parse gives:  each file's code, errors and warnings, and the whole project's code per target.
 * - In the order a full parse's test helper works them out:  each file's code, then the project's;
 *   then its errors and warnings, as the editor shows them once it has compiled:
 *   a compile notes what it reads whole (`SP.SpellWarnings.readNoterFor()`).
 */
type ProjectOutput = { files: ReturnType<typeof summarize>; targets: Record<string, string> }

/** `files` parsed from scratch. */
function fullParse(files: SpellSourceFile[], options: Parameters<typeof parseSpellProject>[1]): ProjectOutput {
  const { scope, files: parsed } = parseSpellProject(files, options)
  return outputOf(scope, parsed)
}

/** `project`'s parse as it stands. */
function incrementalOutput(project: P.IncrementalProject): ProjectOutput {
  const parsed = project.files.map(({ path, parse }) => ({
    path,
    match: parse!.match,
    compiled: (P.JSWriter.instance.writeMatch(parse!.match) as string | undefined) ?? ""
  }))
  return outputOf(project.scope, parsed)
}

/** The output of `files`, each compiled on its own already, in `scope`. */
function outputOf(
  scope: P.Scope,
  files: Array<{ path: string; match: P.Match | undefined; compiled: string }>
): ProjectOutput {
  const targets = targetsOf(
    scope,
    files.map(({ match }) => match)
  )
  return {
    files: files.map(({ path, match, compiled }) => ({
      path,
      compiled,
      errors: describeParseErrors(match),
      warnings: describeWarnings(match)
    })),
    targets
  }
}

/**
 * The whole project's code for each target, from its files' `matches`, combined as `SpellProject` combines them.
 * - What a writer throws is what it gives:  a crash must be the same crash.
 */
function targetsOf(scope: P.Scope, matches: Array<P.Match | undefined>): Record<string, string> {
  const parts = matches.map((match) => (match?.AST instanceof P.ASTStatementGroup ? match.AST : ""))
  return Object.fromEntries(
    TARGETS.map((target) => {
      const { writer } = SP.targetFor(target)
      try {
        const header = SP.SpellProject.importHeaderFor(scope, writer)
        return [target, scope.parser!.inPlay(() => SP.SpellProject.combineCompiled(parts, writer, header, scope, {}))]
      } catch (error) {
        return [target, `THREW ${(error as Error).message}`]
      }
    })
  )
}

////////////////
// ## Edits
////////////////

/** `text` with its first line matching `pattern` replaced by what `change` makes of it (`undefined`:  deleted). */
function editLine(text: string, pattern: RegExp, change: (line: string) => string | undefined): string | undefined {
  const lines = text.split("\n")
  const index = lines.findIndex((line) => pattern.test(line))
  if (index === -1) return undefined
  const changed = change(lines[index]!)
  if (changed === undefined) lines.splice(index, 1)
  else lines[index] = changed
  return lines.join("\n")
}

/** `text` with `line` added under its first type's line:  a top-level line with members indented under it. */
function afterTypeLine(text: string, line: string): string | undefined {
  const lines = text.split("\n")
  const index = lines.findIndex((it, at) => /^a[n]? "[^"]+" is /.test(it) && /^\t\S/.test(lines[at + 1] ?? ""))
  if (index === -1) return undefined
  lines.splice(index + 1, 0, line)
  return lines.join("\n")
}
