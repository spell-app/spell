import { P } from "spell-parser/parser"
import { SP } from "spell-parser/spell"

/**
 * Parse + compile a spell project headlessly, the same way `SpellProject` does in the app:
 * - ONE `ProjectScope` with a clone of the root spell parser
 * - every type and method the files declare stubbed first, as `P.IncrementalProject` does:
 *   `parser.stubDeclaredTypes()`, `stubDeclaredMethods()`
 * - one `FileScope` per file under it, all sharing that parser, parsed in order
 * - ALL files parsed first, THEN all compiled, so lazy compile-time lookups see the whole project
 * - NOTE: skips `SpellFile` / `SpellProject` themselves, as they load contents from the server.
 * - Used as the "same as a full parse" reference for incremental parsing:  compare `summarize()` results.
 * - `parentScope` defaults to the root scope of the files' languages (`SP.Language.rootScopeFor()`)
 *   -- pass a `P.ImportScope` to parse against imports, or another language's root.
 * - Each file in the language its path names, as `SpellProject` reads it (epic `spanish` P19):
 *   `/Carta.es.spell` by Spanish's rules, with the project parser's twin (`SP.SpellParser.twinFor()`).
 *   - A path naming none, `/test.spell`, reads as `parentScope`'s language:  English, unless you pass another's root.
 * - Projects written in the test, inline.
 *   The frozen test projects (`@spell/test`) are spell-app's, read with its `spell-app/spaces/test`:
 *   spell-parser's tests never read a higher repo's files.
 */
export function parseSpellProject(
  files: SpellSourceFile[],
  { parentScope = SP.Language.rootScopeFor(languagesOf(files)) }: { parentScope?: P.Scope } = {}
): ParsedSpellProject {
  const projectScope = new P.ProjectScope({
    name: "test-project",
    path: "/test-project",
    parser: parentScope.parser!.clone({ module: "/test-project" }),
    parentScope
  })
  const parsers = files.map(({ path }) => parserFor(projectScope, path))

  // every type and method the files declare, so a line can name or call one declared further down
  files.forEach(({ contents }, index) => parsers[index]!.stubDeclaredTypes(projectScope, [contents]))
  files.forEach(({ contents }, index) => parsers[index]!.stubDeclaredMethods(projectScope, [contents]))
  const parsed = files.map(({ path, contents }, index) => {
    const parser = parsers[index]!
    const own = parser === projectScope.parser ? {} : { parser }
    const scope = new P.FileScope({ name: path, path, parentScope: projectScope, ...own })
    const start = performance.now()
    const match = scope.parse(contents, "block")
    const parseMsec = performance.now() - start
    return { path, contents, scope, match, parseMsec }
  })

  const parsedFiles = parsed.map(({ path, contents, scope, match, parseMsec }) => {
    const start = performance.now()
    // the file's language in play, as a compile has it:  its words go singular and plural by its rules
    const compiled = scope.parser!.inPlay(() => (P.JSWriter.instance.writeMatch(match) as string | undefined) ?? "")
    const compileMsec = performance.now() - start
    const errors = describeParseErrors(match)
    return { path, contents, scope, match, compiled, errors, warnings: describeWarnings(match), parseMsec, compileMsec }
  })

  return { scope: projectScope, files: parsedFiles }
}

/**
 * `files` compiled as a project would be:
 * - `marked`:  each file's code, with its statements' `/*! SPELL: DECLARES` markers inline,
 *   as `SpellProject` combines them, before `split()`
 *   - a class member's in its class's body
 * - `code`:  that, markers out, as its `<Project>.spell.js`
 * - `declarations`:  as its `<Project>.declarations.json5`, read back as another project would
 */
export function compiledSpellProject(
  files: SpellSourceFile[],
  options: { version?: string; exports?: string[]; parentScope?: P.Scope; languages?: string[] } = {}
) {
  const { scope, files: parsed } = parseSpellProject(files, { parentScope: options.parentScope })
  const parts = parsed.map(({ match, compiled }) => (match?.AST instanceof P.ASTStatementGroup ? match.AST : compiled))
  const marked = SP.SpellProject.combineCompiled(parts)
  const languages = [...new Set(languagesOf(files).map((language) => language.lang))]
  const { code, declarations } = SP.SpellDeclarations.split(marked, scope, { languages, ...options })
  return { marked, code, declarations: SP.SpellDeclarations.read(JSON.stringify(declarations))! }
}

/**
 * What must NOT change between a full parse and an incremental one:  compiled output, errors and warnings per file.
 * - Leaves out timings and `Match` objects.
 */
export function summarize(project: ParsedSpellProject): SpellProjectSummary {
  return project.files.map(({ path, compiled, errors, warnings }) => ({ path, compiled, errors, warnings }))
}

/** `"<line>:<ch> <message>"` for each parse error in `match`, 1-based line to match editor. */
export function describeParseErrors(match: P.Match | undefined): string[] {
  if (!match) return ["no match"]
  return (SP.Block.getParseErrors(match) ?? []).map((error) => {
    // `.value` is `ASTParseError`-specific -- same lookup as `SpellFile.parse()`.
    const message = (error.AST as unknown as { value?: string } | undefined)?.value ?? error.inputText
    return `${(error.line ?? 0) + 1}:${error.char ?? 0} ${message}`
  })
}

/** `"<line>:<ch> <message>"` for each warning in `match` -- see `SP.SpellWarnings` -- 1-based line to match editor. */
export function describeWarnings(match: P.Match | undefined): string[] {
  if (!match) return []
  return SP.SpellWarnings.in(match).map(({ at, message }) => `${(at.line ?? 0) + 1}:${at.char ?? 0} ${message}`)
}

/**
 * Fresh `P.IncrementalProject` of `files`, set up as `parseSpellProject()` sets up a project.
 * - `keepLastGood`:  a broken line keeps its last working declarations (see `P.IncrementalProject`).
 * - Compare it with a full parse:  `summarizeIncremental(project)` against `summarize(parseSpellProject(files))`.
 */
export function incrementalSpellProject(files: SpellSourceFile[], keepLastGood = false): P.IncrementalProject {
  const rootScope = SP.Language.rootScopeFor(languagesOf(files))
  const scope = new P.ProjectScope({
    name: "test-project",
    path: "/test-project",
    parser: rootScope.parser!.clone({ module: "/test-project" }),
    parentScope: rootScope
  })
  return new P.IncrementalProject({
    scope,
    keepLastGood,
    files: files.map(({ path, contents }) => ({ path, text: contents, parser: parserFor(scope, path) }))
  })
}

/** The languages `files` are written in, by their paths, in order:  `/Carta.es.spell` is Spanish (epic `spanish` P19). */
function languagesOf(files: SpellSourceFile[]): SP.Language[] {
  return [...new Set(files.map(({ path }) => SP.Language.forFile(path)))]
}

/**
 * The parser file `path` parses with in `projectScope`:  its parser's twin in the language and form the path names
 * (`SP.SpellParser.twinFor()`), e.g. `/Carta.es.spell`, `/Card.spellx` -- else that parser itself.
 */
function parserFor(projectScope: P.Scope, path: string): SP.SpellParser {
  const parser = projectScope.parser as SP.SpellParser
  const lang = SP.Language.langOfFile(path)
  const form: SP.SpellForm = path.endsWith(".spellx") ? "spellx" : "spell"
  return parser.twinFor(lang ? SP.Language.for(lang) : (parser.language ?? SP.Language.default), form)
}

/** Same as `summarize()`, for a `P.IncrementalProject`. */
export function summarizeIncremental(project: P.IncrementalProject): SpellProjectSummary {
  return project.files.map(({ path, parse }) => ({
    path,
    compiled: (P.JSWriter.instance.writeMatch(parse.match) as string | undefined) ?? "",
    errors: describeParseErrors(parse.match),
    warnings: describeWarnings(parse.match)
  }))
}

/** One spell file to parse. */
export type SpellSourceFile = {
  /** Project-relative path, e.g. `/Card.spell`. */
  path: string
  /** File text. */
  contents: string
}

/** Result of `parseSpellProject()`. */
export type ParsedSpellProject = {
  /** Shared project scope, e.g. to inspect declared types / rules. */
  scope: P.ProjectScope
  /** Per-file results, in parse order. */
  files: Array<{
    path: string
    contents: string
    scope: P.FileScope
    match: P.Match | undefined
    compiled: string
    errors: string[]
    warnings: string[]
    parseMsec: number
    compileMsec: number
  }>
}

/** Result of `summarize()`. */
export type SpellProjectSummary = Array<{ path: string; compiled: string; errors: string[]; warnings: string[] }>
