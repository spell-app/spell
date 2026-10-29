import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync } from "fs"
import JSON5 from "json5"
import { basename, resolve } from "path"

import { hasProjectFile, projectFileFor } from "spell/parser/spell/node/projectFile"
import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
import { parseSpellProject, type SpellSourceFile } from "spell/parser/spell/test"
import environment from "spell/app/spaces/server/node/environment"

// Spell UI's pack, as every compile has it:  an example written in spellx names its components bare (`<button>`)
import "spell/app/spaces/models/spellUIPack"

/*
 * The test projects' helpers:  each one read from disk, parsed and compiled headlessly, as a compile would.
 * - Node only, for tests:  imported as `spell/app/spaces/test`, never from spaces' barrel.
 * - spell-parser's `spell/parser/spell/test` parses and compiles the projects a test writes inline (`parseSpellProject()`);
 *   these are the ones on disk, spell-app's own.
 * - Three kinds:
 *   - the FIXTURES, `@spell/test` (`FIXTURES_DIR`):  the frozen test projects, tests' own,
 *     never edited to follow anything;  each by its bare name, e.g. `fizzbuzz`
 *   - every built-in EXAMPLE, `@spell/examples` (`EXAMPLE_PROJECTS`):  tested in place, as they are;
 *     their snapshots are tests' own, in `EXAMPLE_SNAPSHOTS_DIR`
 *   - every built-in Spell guide, `@spell/guides` (`GUIDE_PROJECTS`):  the same, their snapshots in `GUIDE_SNAPSHOTS_DIR`
 * - A test project's NAME (`TestProjectName`) says its group:
 *   `fizzbuzz` is the fixture, `@spell/examples/fizzbuzz` the example of the same name.
 *   - Its folder, its snapshots' folder and its project id follow from that group, never from a lookup.
 * - The content check runs every test of them:  `spell content check`;  `--bless` rewrites their snapshots.
 */

/**
 * A test project, by its name:
 * - a fixture's, bare:  `fizzbuzz` (or its project id, `@spell/test/fizzbuzz`)
 * - an example's or a Spell guide's, with its group:  `@spell/examples/Solitaire`, `@spell/guides/a-first-spell`
 */
export type TestProjectName = string

/**
 * Frozen projects tests run against, the `@spell/test` group:  the FIXTURES.
 * - Their folder:  `spaces/@spell/test/<project>/` at spell-app's root, e.g. `fizzbuzz`:
 *   spaces' `environment.testFilesRoot`, beside the other built-in groups (epic `spanish` P18).
 *   - spell-parser's until then (epic `repo-split` C11):  every `@spell` group is spell-app's now.
 * - Why:  tests assert exact lines, docstrings and compiled output, and your own projects get edited.
 * - Their snapshots are beside them:  `fizzbuzz.snapshot.js` ...
 * - NEVER update a fixture to follow an example:  it's frozen so tests don't move.
 *   - Change a test's input in the test, or add another fixture:
 *     copy a project in, then `spell content check --bless`.  See `compiledFixture()`.
 */
export const FIXTURES_DIR = environment.testFilesRoot

/** The fixtures' group, `@spell/test` (spaces' `PROJECT_GROUPS`). */
export const FIXTURES_GROUP = "@spell/test"

/** The examples' group, `@spell/examples`:  where `EXAMPLE_PROJECTS` are read from. */
export const EXAMPLES_GROUP = "@spell/examples"

/** The Spell guides' group, `@spell/guides`:  where `GUIDE_PROJECTS` are read from. */
export const GUIDES_GROUP = "@spell/guides"

/** Every group a test project is in:  the fixtures', the examples', the Spell guides'. */
const TEST_GROUPS = [FIXTURES_GROUP, EXAMPLES_GROUP, GUIDES_GROUP]

/**
 * Every built-in example, by its name with its group:  `@spell/examples/Solitaire` (epic `spanish` P21).
 * - Each folder of `@spell/examples` with a project file:  Solitaire and Solitario, Task List and Lista de tareas,
 *   Calculator, FizzBuzz, Counter ...
 * - NOT frozen, and not listed by hand:  read from `spaces/@spell/examples/<name>/`, where people (and agents) edit
 *   them, so a new example is tested as soon as its folder is there.
 *   - A change to one changes its snapshots:  `spell content check --bless`, then read the diff.
 * - Their snapshots are tests', never beside the example:  `EXAMPLE_SNAPSHOTS_DIR`.
 */
export const EXAMPLE_PROJECTS = new Set(projectsIn(EXAMPLES_GROUP))

/**
 * Folder of the snapshots of `EXAMPLE_PROJECTS`:  `tests/spell/__examples__/<name>/`, at spell-app's root.
 * - So an example's folder holds only what a person wrote, and what compiling it writes beside it.
 */
export const EXAMPLE_SNAPSHOTS_DIR = resolve(environment.repoDir, "tests", "spell", "__examples__")

/**
 * Every built-in Spell guide, by its name with its group:  `@spell/guides/a-first-spell` (epic `debut` P10).
 * - A Spell guide is a spell file that reads as prose, with a working program inside it:
 *   so each one is compiled, run and type-checked as the examples are.
 * - NOT frozen, and not listed by hand:  a new one is tested as soon as it's there.
 *   - Its snapshots are written by `spell content check --bless`;  read the diff.
 * - Their snapshots are tests', never beside the guide:  `GUIDE_SNAPSHOTS_DIR`.
 */
export const GUIDE_PROJECTS = new Set(projectsIn(GUIDES_GROUP))

/** Folder of the snapshots of `GUIDE_PROJECTS`:  `tests/spell/__guides__/<name>/`, at spell-app's root. */
export const GUIDE_SNAPSHOTS_DIR = resolve(environment.repoDir, "tests", "spell", "__guides__")

/** Where each group's snapshots are, but the fixtures':  theirs are beside them. */
const SNAPSHOT_DIRS: Record<string, string> = {
  [EXAMPLES_GROUP]: EXAMPLE_SNAPSHOTS_DIR,
  [GUIDES_GROUP]: GUIDE_SNAPSHOTS_DIR
}

/** Path of `parts` under `FIXTURES_DIR`, e.g. `fixturePath("fizzbuzz", "FizzBuzz.spell")`. */
export function fixturePath(...parts: string[]): string {
  return resolve(FIXTURES_DIR, ...parts)
}

/**
 * Path of snapshot `file` of test project `projectName`:
 * - a fixture's beside it, `spaces/@spell/test/fizzbuzz/fizzbuzz.snapshot.js`
 * - an example's in `EXAMPLE_SNAPSHOTS_DIR`, `tests/spell/__examples__/Solitaire/Solitaire.snapshot.js`
 * - a Spell guide's in `GUIDE_SNAPSHOTS_DIR`, `tests/spell/__guides__/a-first-spell/a-first-spell.snapshot.js`
 */
export function snapshotPath(projectName: TestProjectName, file: string): string {
  const snapshots = SNAPSHOT_DIRS[groupOf(projectName)]
  return snapshots ? resolve(snapshots, bareNameOf(projectName), file) : fixtureFolder(projectName, file)
}

/**
 * Project id of test project `projectName`, e.g. `@spell/test/fizzbuzz`, `@spell/examples/Solitaire` --
 * to load it as a `SpellProject`.
 * - Loads from disk in node, after `installDiskFetch()`.
 */
export function fixtureProjectId(projectName: TestProjectName): string {
  return `${groupOf(projectName)}/${bareNameOf(projectName)}`
}

/**
 * Test project `projectName`'s own name, without its group:  `Solitaire` for `@spell/examples/Solitaire`.
 * - What its files are named after:  `Solitaire.snapshot.js`, `Solitaire.en.js`.
 */
export function bareNameOf(projectName: TestProjectName): string {
  return projectName.split("/").at(-1)!
}

/** The group test project `projectName` is in:  the one its name starts with, else the fixtures', `@spell/test`. */
function groupOf(projectName: TestProjectName): string {
  return TEST_GROUPS.find((group) => projectName.startsWith(`${group}/`)) ?? FIXTURES_GROUP
}

/** Each project of `group`, by its test project name:  `@spell/examples/Solitaire` -- see `projectFoldersIn()`. */
function projectsIn(group: string): TestProjectName[] {
  return projectFoldersIn(groupFolderOf(group)).map((name) => `${group}/${name}`)
}

/** Folder of test group `group`:  `FIXTURES_DIR`, or `spaces/@spell/<group>/`. */
function groupFolderOf(group: string): string {
  return group === FIXTURES_GROUP ? FIXTURES_DIR : resolve(environment.systemFilesRoot, group.slice("@spell/".length))
}

/**
 * The fixtures the Python writer writes, so far (epic `python-target`).
 * - Their Python snapshots are checked:  `.snapshot.py`, `.snapshot.pyright.txt`, and their page's `.elements.snapshot.js`.
 * - The core contract runs them under Python.
 * - Each phase adds the ones it makes write:  things and lists, pauses, drawing.
 */
export const PYTHON_FIXTURES = new Set<TestProjectName>([
  "counter",
  "counter-app",
  "fizzbuzz",
  "lists-from-zero",
  "people",
  `${EXAMPLES_GROUP}/Solitaire`,
  `${EXAMPLES_GROUP}/TaskList`,
  "thing-references"
])

/**
 * The fixtures compiled as a LIBRARY too (the `ts/lib` target, epic `people-and-orgs` P3).
 * - Their `.lib.snapshot.ts` is checked.
 * - Only fixtures that draw nothing:  a library can't.
 */
export const LIBRARY_FIXTURES = new Set(["people"])

/**
 * Name of each test project:  each fixture (each folder of `FIXTURES_DIR` with a project file), alphabetically,
 * then `EXAMPLE_PROJECTS`, then `GUIDE_PROJECTS`.
 */
export function fixtureProjectNames(): TestProjectName[] {
  return [...projectFoldersIn(FIXTURES_DIR), ...EXAMPLE_PROJECTS, ...GUIDE_PROJECTS]
}

/** Name of each folder of `dir` with a project file, alphabetically. */
function projectFoldersIn(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && hasProjectFile(resolve(dir, entry.name)))
    .map((entry) => entry.name)
    .sort()
}

/**
 * Fixture `projectName` compiled as `SpellProject` would write its `<Project>.spell.js`.
 * - Parsed headlessly, with `parseSpellProject()`:  `import`s, then each file's code in `project.json` order.
 * - Its declarations, as its `<Project>.declarations.json5`:  `fixtureDeclarations()`.
 * - `target`:  compiled for that target, e.g. `ts/solid` (see `SP.TARGETS`);
 *   or a writer itself, e.g. a test's own.
 */
export function compiledFixture(
  projectName: TestProjectName,
  target: string | P.ProgramWriter = SP.RUNNING_TARGET
): string {
  return compileFixture(projectName, target).code
}

/**
 * Fixture `projectName` compiled with its source map, as `SpellProject.compile()` makes one (epic `elemental-spell` P14):
 * `code`, the marks taken out again, must be `compiledFixture()`'s.
 */
export function compiledFixtureWithMap(
  projectName: TestProjectName,
  target: string | P.ProgramWriter = SP.RUNNING_TARGET
): { code: string; map: P.SourceMapV3 } {
  const { code, map } = compileFixture(projectName, target, { sourceMap: true })
  return { code, map: map! }
}

/** Does fixture `projectName` draw:  hold a drawing (JSX) anywhere?  Then a Python target writes its page too. */
export function fixtureDraws(projectName: TestProjectName): boolean {
  return compileFixture(projectName).draws
}

/** Fixture `projectName`'s declarations, as its `<Project>.declarations.json5` would hold them -- see `compileFixture()`. */
export function fixtureDeclarations(projectName: TestProjectName): string {
  return JSON.stringify(compileFixture(projectName).declarations, null, 2) + "\n"
}

/**
 * The human languages fixture `projectName`'s files are written in, by their names, the one it speaks first:
 * `["es"]` for `Solitario`, whose files are `Carta.es.spell` ... -- see `SP.SpellDeclarations.languagesOf()`.
 * - It has a words file in each:  `fixtureWords()`.
 */
export function fixtureLanguages(projectName: TestProjectName): string[] {
  return SP.SpellDeclarations.languagesOf(compileFixture(projectName).declarations)
}

/**
 * Fixture `projectName`'s words in `lang`, as its `<Project>.<lang>.js` would hold them (`Solitaire.en.js`, `Solitario.es.js`):
 * from its declarations, by javascript's names -- see `SP.SpellWords`.
 * - `lang`:  the one it speaks, by default (`fixtureLanguages()`).
 */
export function fixtureWords(projectName: TestProjectName, lang = fixtureLanguages(projectName)[0]!): string {
  const words = SP.SpellWords.of(compileFixture(projectName).declarations, P.JSWriter.instance, lang)
  return SP.SpellWords.script(words, bareNameOf(projectName))
}

/**
 * Fixture `projectName` compiled as `SpellProject` would:  its `code` and its `declarations`.
 * - Files combine through the SAME `SP.SpellProject.combineCompiled()`, so a class gets members from every file.
 *   They split through the same `SP.SpellDeclarations.split()`.
 * - Its `.css` files compile as `SpellCSSFile` does:  the whole text through the root scope's `css` rule.
 * - Parse errors lead its code, as comments, so a snapshot of it shows them too.
 * - Against the projects it imports, e.g. `counter-app` the counter library, `@spell/test/counter`:
 *   - their declarations, as a compiled import's (see `fixtureImportScope()`)
 *   - NOT their code:  that's theirs
 * - `version` / `exports` / `listsStartAt` from its `project.json`, as a compile would.
 * - `target`'s writer writes it, `js/solid`'s by default -- or `target` itself, a writer.
 * - `draws`:  does it hold a drawing -- see `SP.SpellProject.draws()`.
 */
function compileFixture(
  projectName: TestProjectName,
  target: string | P.ProgramWriter = SP.RUNNING_TARGET,
  { sourceMap = false }: { sourceMap?: boolean } = {}
): { code: string; declarations: SP.SpellDeclarationsData; draws: boolean; map?: P.SourceMapV3 } {
  const projectDir = fixtureFolder(projectName)
  const { version, exports, imports, listsStartAt } = readProjectFile(projectDir)
  const parentScope = fixtureImportScope(projectName)
  const sources = loadFixtureProject(projectName)
  // each file's language, by its name:  `Carta.es.spell` is Spanish (epic `spanish` P19)
  const languages = [...new Set(sources.map(({ path }) => SP.Language.forFile(path).lang))]
  const { scope, files } = parseSpellProject(sources, { parentScope })
  const errors = files.flatMap(({ path, errors }) => errors.map((error) => `// PARSE ERROR ${path}:${error}\n`))
  const parts = imports
    .filter(({ path, active }) => active !== false && /\.(spell|spellml|spellx|css)$/.test(path))
    .map(({ path }) => {
      if (path.endsWith(".css")) return compiledCSS(readFileSync(resolve(projectDir, `.${path}`), "utf8"))
      const file = files.find((it) => it.path === path)!
      return file.match?.AST instanceof P.ASTStatementGroup ? file.match.AST : file.compiled
    })
  const writer = typeof target === "string" ? SP.targetFor(target).writer : target
  const importLines = SP.SpellProject.importHeaderFor(scope, writer)
  // a source map as it's written, as `SpellProject.compile()` makes one -- see `P.SourceMarks`
  const sourceMarks = sourceMap ? new P.SourceMarks(SP.SpellProject.sourcePlaceOf) : undefined
  const combine = () =>
    scope.parser!.inPlay(() => SP.SpellProject.combineCompiled(parts, writer, importLines, scope, { listsStartAt }))
  const marked = errors.join("") + (sourceMarks ? P.SourceMarks.during(sourceMarks, combine) : combine()) + "\n"
  const split = SP.SpellDeclarations.split(marked, scope, { version, exports, languages })
  const mapped = sourceMarks?.extract(split.code)
  return { ...split, ...(mapped ?? {}), draws: SP.SpellProject.draws(parts) }
}

/**
 * The projects test project `projectName` imports, by the module its compiled code imports each from.
 * - e.g. `{ "@spell/project/@spell/test/counter": "counter" }`
 * - Each by its test project name, as the fixture helpers take it:  see `projectImportsIn()`.
 * - none:  `{}`
 * - throws if it imports a project that isn't a test project:  see `projectImportsIn()`
 */
export function fixtureImports(projectName: TestProjectName): Record<string, TestProjectName> {
  return projectImportsIn(fixtureFolder(projectName))
}

/**
 * The projects the project in `folder` imports, by the module its compiled code imports each from:
 * `fixtureImports()`, for any project's folder, e.g. the Counter notebook's (`@spell/notebooks/Counter`).
 * - Each by its test project name, as the fixture helpers take it:
 *   a fixture's bare (`@spell/test/counter` => `counter`), an example's or a Spell guide's with its group
 *   (the notebook's `@spell/examples/Counter`).
 * - throws if it imports any other project:  tests read ONLY the test groups (`TEST_GROUPS`).
 */
function projectImportsIn(folder: string): Record<string, TestProjectName> {
  const imported: Record<string, TestProjectName> = {}
  for (const { path, active } of readProjectFile(folder).imports) {
    if (active === false || /\.(spell|spellml|spellx|css)$/.test(path)) continue
    const projectId = SP.SpellProject.projectIdForImport(path)
    const group = projectId.split("/").slice(0, -1).join("/")
    const projectName = group === FIXTURES_GROUP ? bareNameOf(projectId) : projectId
    if (!TEST_GROUPS.includes(group) || !hasProjectFile(fixtureFolder(projectName)))
      throw new TypeError(`projectImportsIn():  ${folder} imports ${path}, which isn't a test project`)
    imported[moduleFor(projectId)] = projectName
  }
  return imported
}

/**
 * Path of `parts` in test project `projectName`'s folder:  a fixture's (`FIXTURES_DIR`), an example's or a Spell
 * guide's (`spaces/@spell/<group>/`), e.g. `fixtureFolder("@spell/examples/Solitaire", "Card.spellml")`.
 * - NEVER write there:  copy it first (`copyFixtureProject()`).
 * - throws if a bare name is no fixture:  an example or a Spell guide is named with its group
 */
export function fixtureFolder(projectName: TestProjectName, ...parts: string[]): string {
  const group = groupOf(projectName)
  const folder = resolve(groupFolderOf(group), bareNameOf(projectName))
  if (!projectName.startsWith(`${group}/`) && !existsSync(folder))
    throw new TypeError(
      `fixtureFolder():  no fixture \`${projectName}\` in ${FIXTURES_GROUP};  ` +
        `name an example or a Spell guide with its group, e.g. \`${EXAMPLES_GROUP}/${projectName}\``
    )
  return resolve(folder, ...parts)
}

/**
 * The import layer fixture `projectName` parses under:  the declarations of each project it imports,
 * as `SpellProject.loadImportScope()` loads a compiled import's.
 * - Imports none:  the root scope.
 * - A test parsing a fixture's files itself parses them under it:
 *   `parseSpellProject(loadFixtureProject("counter-app"), { parentScope: fixtureImportScope("counter-app") })`.
 */
export function fixtureImportScope(projectName: TestProjectName): P.Scope {
  const paths = loadFixtureProject(projectName).map(({ path }) => path)
  return importScopeIn(fixtureFolder(projectName), paths)
}

/**
 * The import layer the project in `folder` parses under:  `fixtureImportScope()`, for any project's folder,
 * e.g. the Counter notebook's, under the Counter example's declarations.
 * - `paths`:  its files', e.g. `/Counter.spellml`:  their languages, by their names, pick its root scope.
 */
export function importScopeIn(folder: string, paths: string[]): P.Scope {
  const { imports } = readProjectFile(folder)
  const loaded: SP.DeclarationsImport[] = Object.entries(projectImportsIn(folder)).map(([module, fixture]) => {
    const { path, import: picks } = imports.find(
      (it) => moduleFor(SP.SpellProject.projectIdForImport(it.path)) === module
    )!
    const projectId = SP.SpellProject.projectIdForImport(path)
    return { from: path, projectId, declarations: compileFixture(fixture).declarations, import: picks, module }
  })
  // the root of its files' languages, by their names:  Spanish's for `Carta.es.spell` (epic `spanish` P19)
  const languages = paths.map((path) => SP.Language.forFile(path))
  const root = SP.Language.rootScopeFor([...new Set(languages)])
  return loaded.length ? SP.SpellDeclarations.importScope(root, loaded) : root
}

/** The module compiled code imports project `projectId` from, e.g. `@spell/project/@spell/test/counter`. */
function moduleFor(projectId: string): string {
  return `${SP.SPELL_PROJECT_MODULE}${encodeURI(projectId)}`
}

/** `{ path, contents }` of each spell file (`.spell` or `.spellml`) in test project `projectName`, in its project file's order. */
export function loadFixtureProject(projectName: TestProjectName): SpellSourceFile[] {
  const projectDir = fixtureFolder(projectName)
  return readProjectFile(projectDir)
    .imports.filter(({ path, active }) => active !== false && SP.isSpellSourceName(path))
    .map(({ path }) => ({ path, contents: readFileSync(resolve(projectDir, `.${path}`), "utf8") }))
}

/**
 * The code-spell twins of the showcase examples' spellx files, kept beside the tests:  `tests/spell/__spell__/<Example>/`.
 * - Each is the same program as the example's `.spellml` file:  `spellxExamples.test.ts` checks it.
 */
export const CODE_SPELL_TWINS_DIR = resolve(environment.repoDir, "tests", "spell", "__spell__")

/**
 * `loadFixtureProject()`, each `.spellml` file as its code-spell twin (`CODE_SPELL_TWINS_DIR`):  `/Card.spellml` =>
 * `/Card.spell`, the same program written as code spell.
 * - For a test of code spell itself (its parse, its journal, its edits) on a whole example written in spellx,
 *   e.g. `loadCodeSpellTwin("@spell/examples/Solitaire")`.
 */
export function loadCodeSpellTwin(projectName: TestProjectName): SpellSourceFile[] {
  return loadFixtureProject(projectName).map((file) => {
    if (!SP.isSpellmlName(file.path)) return file
    const path = file.path.replace(/(ml|x)$/, "")
    return { path, contents: readFileSync(resolve(CODE_SPELL_TWINS_DIR, bareNameOf(projectName), `.${path}`), "utf8") }
  })
}

/**
 * Write test project `projectName` into folder `dir`:  its project file, and each file it lists.
 * - Not its snapshots:  a copy a test may edit, or an editor open, as a person's project.
 * - SIDE EFFECT:  makes `dir`.
 */
export function copyFixtureProject(projectName: TestProjectName, dir: string): void {
  mkdirSync(dir, { recursive: true })
  const folder = fixtureFolder(projectName)
  for (const { path } of readProjectFile(folder).imports) {
    if (path.startsWith("/")) copyFileSync(resolve(folder, `.${path}`), resolve(dir, `.${path}`))
  }
  copyFileSync(projectFileFor(folder), resolve(dir, basename(projectFileFor(folder))))
}

/**
 * 1-based line of `text` that starts with `start`, its indent left off:  the `nth` (0-based) such line.
 * - So a test names a line of an example by what it says, not by its number:
 *   an edit to the example above it doesn't move the test's line.
 * - throws if there's no such line
 */
export function lineOf(text: string, start: string, nth = 0): number {
  const lines = text.split("\n").flatMap((line, index) => (line.trimStart().startsWith(start) ? [index + 1] : []))
  const line = lines[nth]
  if (line === undefined) throw new Error(`lineOf():  no line #${nth + 1} starts \`${start}\`;  has the text changed?`)
  return line
}

/** CSS `contents` compiled as `SpellCSSFile.compile()` does:  one `P.TextToken`, through the root scope's `css` rule. */
function compiledCSS(contents: string): string {
  const scope = SP.SpellParser.rootScope
  const token = new P.TextToken({ value: contents, raw: contents, start: 0 })
  return String(scope.parser!.parse([token], "css", scope)?.compile())
}

/** The project file of the project in `projectDir`, read:  `__project.json5`, or an old `project.json`. */
function readProjectFile(projectDir: string): {
  version?: string
  exports?: string[]
  imports: Array<{ path: string; active?: boolean; import?: string[] }>
  listsStartAt?: 0 | 1
} {
  return JSON5.parse(readFileSync(projectFileFor(projectDir), "utf8"))
}
