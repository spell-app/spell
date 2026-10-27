import { JSON5File, TaskList, Task, getDier } from "spell/util"
import { P } from "spell/parser/parser"
import { PY } from "spell/parser/py"
// Import directly, NOT through the `spell/parser/core` barrel:  a project MUST NOT load `core` itself --
// each runner runs its own copy.  See `spellRuntime.ts`.
import { SPELL_CORE_MODULE, SPELL_CORE_NAMES } from "spell/parser/core/core.types"
import { SP } from "spell/parser/spell"

/**
 * One spell project, e.g. `owen@spell/myProject`:  its files, and reading, compiling and saving them.
 * - Its `contents` are the project's index from the server:  its files (`manifest`), and what its project file says.
 * - NOTE: these are singleton instances -- you'll always get same object back for a given `path`.
 * - Spell never creates, copies, renames or deletes a file (epic `people-and-orgs` P15, decision Q20).
 *   - Creating, copying, renaming and deleting a FILE is spaces':  `SPACES.ProjectFiles`.
 *   - So is its group's list of projects:  `SPACES.SpellProjectRoot`.
 */
export class SpellProject extends JSON5File<SP.ProjectManifestJSON5> {
  /** Registry of known instances. */
  static registry = new Map<string, SpellProject>()

  /**
   * Return existing `SpellProject` for `path` if already in registry, else construct new one.
   * - Throws if `path` is not a valid project path (see `SpellLocation.isProjectPath`).
   */
  constructor(path: string) {
    // Return immediately from registry if already present.
    const existing = SpellProject.registry.get(path)
    if (existing) return existing

    super({})
    Object.assign(this, { path })
    if (!this.location.isProjectPath) {
      throw new TypeError(`new SpellProject('${path}'): Must be initialized with project path.`)
    }
    SpellProject.registry.set(path, this)
  }

  /** We've been removed from the server -- clean up memory, etc.. */
  onRemove(): void {
    super.onRemove()

    this.files.forEach((file) => file.onRemove())
    SpellProject.registry.delete(this.path)
  }

  /** Full path to project, e.g. `owen@spell/myProject`. */
  /*@writeOnce path*/
  declare path: string

  /**
   * Immutable `location` object which we use to get various bits of the path.
   * - NOTE: we `forward` lots of methods on location object to this object, so you can say
   *   `project.projectName` rather than `project.location.projectName`.
   */
  /*@forward("projectId", "space", "projectName")*/
  /*@memoize*/
  get location(): SP.SpellLocation {
    return this.derived("location", () => new SP.SpellLocation(this.path))
  }
  /** Project ID, its address, forwarded from `location.projectId`. */
  get projectId(): string {
    return this.location.projectId
  }
  /** The space it's in (`@spell` or `owen@spell`), forwarded from `location.space`. */
  get space(): string {
    return this.location.space
  }
  /** Name of project, e.g. `drawable-solitaire`, forwarded from `location.projectName`. */
  get projectName(): string | undefined {
    return this.location.projectName
  }
  /**
   * Its name for people:  its project file's `"title"` (decision Q45).
   * - Else made from its `projectName`:  `drawable-solitaire` => `Drawable Solitaire` (decision Q39).
   * - The title is read from its index once it's loaded, else from its group's list (`SpellProject.listedTitles`).
   */
  get title(): string {
    return (
      this.contents?.title ??
      SpellProject.listedTitles.get(this.path) ??
      SP.SpellLocation.titleFor(this.projectName ?? "")
    )
  }

  /**
   * Each project's title as its group's list gave it, by address:  for a project not loaded yet, e.g. in a menu.
   * - Filled by `SPACES.SpellProjectRoot` as it reads a list.
   * - Only projects with a title of their own.
   */
  static listedTitles = new Map<string, string>()

  /** Our group's spec (`owen@spell`, `@spell/examples`, etc.):  see `SP.SpellSetup.projectRoots`. */
  get projectRootSpec(): SP.ProjectRootSpec {
    return SP.SpellSetup.projectSpectForRootPath(this.location.projectRoot)
  }
  /** Project type for string concatenation, e.g. `project`, `example` or `guide`:  our group's. */
  get type(): string {
    return this.projectRootSpec.type
  }
  /** Capitalized project type, e.g. `Project`, `Example` or `Guide`:  our group's. */
  get Type(): string {
    return this.projectRootSpec.Type
  }

  ////////////////
  // ## Compilation
  ////////////////

  /** `ProjectScope` used for our last `parse()` / `compile()`. */
  /*@state*/ get scope(): P.ProjectScope | undefined {
    return this.getState("scope", () => undefined)
  }
  set scope(scope: P.ProjectScope | undefined) {
    this.setState("scope", scope)
  }

  /** Last compiled result as a javascript string. */
  /*@state*/ get compiled(): string | undefined {
    return this.getState("compiled", () => undefined)
  }
  set compiled(compiled: string | undefined) {
    this.setState("compiled", compiled)
  }

  /**
   * Why our last parse of our imports crashed, e.g. a rule threw -- `undefined` once one succeeds.
   * - Parse ERRORS in the spell, e.g. a line it can't make sense of, are NOT this:  they're in each file's `match`.
   */
  /*@state*/ get parseError(): string | undefined {
    return this.getState("parseError", () => undefined)
  }

  /**
   * `SpellJSFile` for this project's compiled output, e.g. `Solitaire.spell.js`.
   * - The server keeps it in the project's build folder, `build/` at the repo root, not beside its source.
   *   - Every file spell builds goes there, e.g. `Solitaire.scopes.js`, `Solitaire.spell.py`,
   *     its declarations and words (since epic `elemental-spell` P4).
   * - Asked for by name, as any file is.
   *   Where it is on disk is the server's `serverPath` (`project-utils.ts`, `buildFolderFor()`).
   */
  /*@memoize*/
  get outputFile(): SP.SpellJSFile {
    return this.derived("outputFile", () => {
      const location = this.getFileLocation(`${this.projectName}${SP.COMPILED_JS_SUFFIX}`)!
      return new SP.SpellJSFile(location.path)
    })
  }

  /**
   * File for this project's declarations, e.g. `Solitaire.declarations.json5`:  in its build folder, as `outputFile`.
   * - What it offers projects importing it:  see `SP.SpellDeclarations`.
   * - Written by every compile, never committed (epic `elemental-spell` P4:  it was beside the source before).
   * - A `SpellJSFile`:  any text file, loaded and saved the same way.
   */
  /*@memoize*/
  get declarationsFile(): SP.SpellJSFile {
    return this.derived("declarationsFile", () => {
      const location = this.getFileLocation(`${this.projectName}${SP.DECLARATIONS_JSON_SUFFIX}`)!
      return new SP.SpellJSFile(location.path)
    })
  }

  /**
   * File for this project's words in language `lang`, e.g. `Solitaire.en.js`:  in its build folder, as `outputFile`.
   * - The words:  spell's wording of each member of its types, by the name its compiled code uses.
   *   See `SP.SpellWords`.
   * - For a runner's Thing Explorer;  and what the core says to the person running it, in that language.
   * - One per language our files are written in (epic `spanish` P19):  `wordsFiles`.
   * - A target with words of its own writes another file, e.g. `Solitaire.py.en.json5`:  see `targetWordsFileFor()`.
   * - A target whose page draws in javascript writes its drawing half too, `Solitaire.elements.spell.js`:
   *   see `elementsFileFor()`.
   */
  wordsFileFor(lang: string): SP.SpellJSFile {
    return this.derived(`wordsFile_${lang}`, () => {
      const location = this.getFileLocation(`${this.projectName}${SP.wordsSuffixFor(lang)}`)!
      return new SP.SpellJSFile(location.path)
    })
  }

  /** Our words files, one per language in `wordsLanguages`, the one our program speaks first -- see `wordsFileFor()`. */
  get wordsFiles(): SP.SpellJSFile[] {
    return this.wordsLanguages.map((lang) => this.wordsFileFor(lang))
  }

  /** Our words file in the language our program speaks to the person running it:  the first of `wordsFiles`. */
  get wordsFile(): SP.SpellJSFile {
    return this.wordsFiles[0]!
  }

  /**
   * The human languages our spell files are written in, in file order, by their names (epic `spanish` P19):
   * `Carta.es.spell` is Spanish, `Card.spell` English -- see `SP.SpellFile.language`.
   * - Several:  one project may mix them, its root scope theirs (`SP.Language.rootScopeFor()`).
   * - English when we have no spell files.
   * - throws a `TypeError` naming the languages spell reads, for a file named for one it doesn't
   */
  get languages(): SP.Language[] {
    const languages = [...new Set(this.spellFiles.map((file) => file.language))]
    return languages.length ? languages : [SP.Language.default]
  }

  /**
   * Codes of the languages we have words files in, the one our program speaks first, e.g. `["es", "en"]`.
   * - From our last compile's declarations (`SP.SpellDeclarations.languagesOf()`), else our declarations file's,
   *   if it's loaded;  else our `languages`, in file order.
   */
  get wordsLanguages(): string[] {
    if (this.compiledLanguages) return this.compiledLanguages
    const declarations = SP.SpellDeclarations.read(this.declarationsFile.contents ?? "")
    return declarations
      ? SP.SpellDeclarations.languagesOf(declarations)
      : this.languages.map((language) => language.lang)
  }

  /**
   * Our last compile's `wordsLanguages`.
   * - NOTE: plain field, not state, as `saveCompiled`.
   */
  compiledLanguages: string[] | undefined

  /**
   * File for this project's scope pack, beside `outputFile` in its build folder, e.g. `Solitaire.scopes.js`.
   * - The pack:  what its Type Explorer shows, for pages which run it without the parser.
   *   See `LSP.ScopePack`.
   * - The language server writes it, after a clean compile (`SpellDiskWorkspace.writeScopes()`).
   */
  /*@memoize*/
  get scopesFile(): SP.SpellJSFile {
    return this.derived("scopesFile", () => {
      const location = this.getFileLocation(`${this.projectName}${SP.SCOPES_JS_SUFFIX}`)!
      return new SP.SpellJSFile(location.path)
    })
  }

  /** Reset our compiled state. */
  resetCompiled(): void {
    this.resetState("scope", "compiled")
  }

  /**
   * Parses our spell files so an edit re-parses as little as possible -- see `updatedContentsFor()`.
   * - Built by our `parser` task list, whenever we haven't got one we can trust.
   * - NOTE: plain field, not state:  files hold the results.
   */
  incremental: P.IncrementalProject | undefined

  /** Do we need to parse our spell files from scratch, rather than trust `incremental`? */
  get needsFullParse(): boolean {
    if (!this.incremental || this.incremental.isBroken) return true
    const { spellFiles } = this
    if (spellFiles.length !== this.incremental.files.length) return true
    return spellFiles.some((file, index) => !file.match || this.incremental!.files[index]!.path !== file.path)
  }

  /**
   * Parse our active spell files from scratch into `scope`, in order, and hand each file its result.
   * - Each by its own language's rules:  a file in another language than our scope's parser reads
   *   parses with its twin (`SP.SpellParser.twinFor()`);  so does a spellx file, `Card.spellx`.
   * - Other files, e.g. `.css`, parse themselves.
   */
  parseImports(): void {
    const { spellFiles } = this
    const parser = this.scope!.parser as SP.SpellParser
    this.incremental = new P.IncrementalProject({
      scope: this.scope!,
      // one half-typed line shouldn't break every line after it
      keepLastGood: true,
      files: spellFiles.map((file) => ({
        path: file.path,
        name: file.file,
        text: file.parseText,
        parser: parser.twinFor(file.language, file.form)
      }))
    })
    spellFiles.forEach((file) => {
      file.setParsed(this.incremental!.getFile(file.path)!)
      file.logParseErrors()
    })
  }

  /**
   * Parse project: cancel any in-flight parse, then run `this.parser` `TaskList`.
   * - NOTE: `parser` arg is actually `parentScope` to parse from:
   *   passed straight through to `this.parser.start()`, which calls `getScope(parentScope)` for the first task.
   */
  parse(parser?: P.Scope): Promise<unknown> {
    this.parser.cancel()
    return this.parser.start(parser)
  }
  /**
   * Compile project: cancel any in-flight parse/compile, then run `this.compiler` `TaskList`.
   * - `parser` is passed through as `parentScope`, same as `parse()`.
   * - `save: false` leaves our output in `outputFile.contents` WITHOUT writing it, e.g. `spell compile --stdout`.
   * - `targets`:  compile to these, this run only, instead of our project file's -- see `targets`.
   */
  compile(parser?: P.Scope, { save = true, targets }: { save?: boolean; targets?: string[] } = {}): Promise<unknown> {
    this.parser.cancel()
    this.compiler.cancel()
    this.saveCompiled = save
    this.targetsThisRun = targets
    return this.compiler.start(parser)
  }

  /**
   * Does the running `compile()` write `outputFile`?  Set by each `compile()`, read by `compiler`'s last task.
   * - NOTE: plain field, not state:  it only steers one run.
   */
  saveCompiled = true

  /** Targets the running `compile()` was asked for, instead of the project file's.  Plain field, as `saveCompiled`. */
  targetsThisRun: string[] | undefined

  /**
   * Targets we compile to, in order:
   * - `js/solid` first, always (`SP.RUNNING_TARGET`), as it's what everything runs
   * - then the rest of the project file's `targets`, or the running `compile()`'s
   * - throws if one names no target -- see `SP.targetFor()`
   */
  get targets(): SP.Target[] {
    const names = this.targetsThisRun ?? this.contents?.targets ?? []
    return [...new Set([SP.RUNNING_TARGET, ...names])].map(SP.targetFor)
  }

  /** File for our compiled output for `target`:  `outputFile` for `js/solid`, else e.g. `Solitaire.spell.tsx`. */
  outputFileFor(target: SP.Target): SP.SpellJSFile {
    if (target.name === SP.RUNNING_TARGET) return this.outputFile
    return new SP.SpellJSFile(this.getFileLocation(`${this.projectName}${target.suffix}`)!.path)
  }

  /**
   * Where statement `node` came from, for its source map:  its file, and its first token's line and column --
   * see `P.SourceMarks`.
   * - Statements only (`P.ASTStatement`, not a group of them):  an expression's written text is sometimes compared,
   *   which a mark in it would change.
   */
  static sourcePlaceOf(node: P.ASTNode): P.SourcePlace | undefined {
    if (!(node instanceof P.ASTStatement) || node instanceof P.ASTStatementGroup) return undefined
    const { match } = node
    const path = match?.getScopeOfType(P.FileScope)?.path
    const line = match?.line
    const column = match?.char
    if (!path || line === undefined || column === undefined) return undefined
    return { path, line, column }
  }

  /**
   * File for `target`'s source map, beside its output in our build folder, e.g. `Solitaire.spell.js.map` (epic
   * `elemental-spell` P14):  each line of its code back to the `.spell` / `.spellx` line it came from.
   * - Written for a javascript-family target that runs (`P.JSWriter` and its subclasses):  see `P.SourceMarks`.
   *   - Never for a library (`ts/lib`):  its `.lib.ts` sits beside its source, committed, so a map there would
   *     write a `sourceMappingURL` into hand-checked code.
   */
  sourceMapFileFor(target: SP.Target): SP.SpellJSFile {
    return new SP.SpellJSFile(this.getFileLocation(`${this.outputFileFor(target).location.file}.map`)!.path)
  }

  /** Each of our spell files' text, by its path:  what a source map carries (`sourcesContent`). */
  private get sourceTexts(): Map<string, string | undefined> {
    return new Map(this.spellFiles.map((file) => [file.path, file.contents ?? undefined] as const))
  }

  /**
   * File for `target`'s own words in language `lang`, e.g. `Solitaire.py.en.json5`:  in our build folder, beside its output.
   * - One per language, as `wordsFileFor()`.
   * - `undefined` for a target with none (`SP.Target.wordsSuffix`).
   */
  targetWordsFileFor(target: SP.Target, lang: string): SP.SpellJSFile | undefined {
    if (!target.wordsSuffix) return undefined
    // the suffix names English;  another language's file names its own, e.g. `Solitario.py.es.json5`
    const suffix = target.wordsSuffix.replace(/\.en\.(?=[^.]+$)/, `.${lang}.`)
    return new SP.SpellJSFile(this.getFileLocation(`${this.projectName}${suffix}`)!.path)
  }

  /**
   * File for `target`'s page, beside its output in our build folder, e.g. `Solitaire.elements.spell.js`.
   * - The page:  its drawing half, in javascript.
   * - `undefined` for a target with none (`SP.Target.elementsSuffix`).
   */
  elementsFileFor(target: SP.Target): SP.SpellJSFile | undefined {
    if (!target.elementsSuffix) return undefined
    return new SP.SpellJSFile(this.getFileLocation(`${this.projectName}${target.elementsSuffix}`)!.path)
  }

  /**
   * Each project our drawing half imports, by module, with its own drawing half's file, for `target`'s web app:
   * e.g. `{ "@spell/project/owen@spell/cards": "cards.elements.spell.js" }` -- see `PY.QuartAppSpec.projects`.
   * - Each must sit beside our program:  `spell compile` writes them there (spell-app's `writeImports()`).
   * - Only the projects we import ourselves:  one they import in turn isn't listed.
   */
  protected importedElementsFor(target: SP.Target): Record<string, string> {
    const imports = SpellProject.importsOf(this.scope).filter(
      ({ module, names }) => module.startsWith(SP.SPELL_PROJECT_MODULE) && names.length
    )
    return Object.fromEntries(
      imports.map(({ module }) => [module, `${PY.PyWriter.projectModule(module)}${target.elementsSuffix}`])
    )
  }

  /**
   * SIDE EFFECT:  save `target`'s web app, if it has one written, and the one there is unedited (or there's none).
   * - An app someone has edited is theirs:  see `PY.isUneditedApp()`.
   */
  protected async saveAppFor(target: SP.Target): Promise<void> {
    const appFile = this.appFileFor(target)
    const text = this.appTexts.get(target.name)
    if (!appFile || text === undefined) return
    let there: string | undefined
    try {
      // what's on disk NOW, not what we hold:  a query of its own each time gets past the file's cache
      there = (await appFile.load({ query: { fresh: Date.now() } })) as string | undefined
    } catch {
      there = undefined
    }
    if (!PY.isUneditedApp(there)) return
    appFile.contents = text
    await appFile.save(undefined)
  }

  /**
   * Each target's web app as compiling last wrote it, by target name.
   * - Saved only over an unedited one (`saveAppFor()`).
   * - Not in the app file itself, which holds what's on disk.
   */
  protected appTexts = new Map<string, string>()

  /**
   * File for `target`'s web app, committed beside our source, e.g. `Solitaire.app.py`.
   * - It finds its program in our build folder (`PY.QuartAppSpec.outputs`).
   * - `undefined` for a target with none (`SP.Target.appSuffix`).
   */
  appFileFor(target: SP.Target): SP.SpellJSFile | undefined {
    if (!target.appSuffix) return undefined
    return new SP.SpellJSFile(this.getFileLocation(`${this.projectName}${target.appSuffix}`)!.path)
  }

  /**
   * Return base `ProjectScope` for this project, given `parentScope`.
   * - Clones `parentScope`'s parser scoped to `this.path`, so rules added within project
   *   (e.g. custom types/macros) don't leak out to `parentScope` or sibling projects.
   */
  getScope(parentScope: P.Scope = SP.Language.rootScopeFor(this.languages)): P.ProjectScope {
    // Make a parser that depends on the parentScope's parser
    // This way rules added to the project won't leak out.
    const parser = parentScope.parser!.clone({
      module: this.path,
      ...(this.contents?.packs ? { packs: this.contents.packs } : {})
    } as P.ParserProps)
    return new P.ProjectScope({
      name: this.projectName,
      path: this.path,
      parser,
      parentScope
    })
  }

  /**
   * Return `TaskList` used to parse our imports.
   * Call as `project.parser.start(parentScope?)`.
   */
  /*@memoize*/
  get parser(): TaskList {
    return this.derived("parser", () => {
      return new TaskList({
        name: `Parsing ${this.type}: ${this.projectName}`,
        tasks: [
          new Task({
            name: `Loading ${this.type}`,
            run: async (parentScope) => {
              await this.load(undefined)
              // Keep our scope while `incremental` is good:  files' matches belong to it.
              if (this.needsFullParse) {
                this.resetCompiled()
                this.incremental = undefined
                try {
                  const importScope = await this.loadImportScope(
                    (parentScope as P.Scope | undefined) ?? SP.Language.rootScopeFor(this.languages)
                  )
                  this.setState("scope", this.getScope(importScope))
                } catch (error) {
                  this.setState("parseError", error instanceof Error ? error.message : String(error))
                  throw error
                }
              }
            }
          }),
          TaskList.forEach({
            name: `Loading imports`,
            list: () => [...this.sourceImportFiles, ...this.activeImports],
            getTask: (file: SP.CompilableSpellFile) =>
              new Task({
                name: `Loading import: ${file.file}`,
                run: () => file.load(undefined)
              })
          }),
          new Task({
            name: `Parsing imports`,
            run: async () => {
              try {
                if (!this.incremental) this.parseImports()
                for (const file of this.activeImports) {
                  if (!(file instanceof SP.SpellFile)) await file.parse(this.scope)
                }
                SP.SpellDeclarations.checkImportClashes(this.scope!)
                this.setState("parseError", undefined)
              } catch (error) {
                this.setState("parseError", error instanceof Error ? error.message : String(error))
                throw error
              }
            }
          })
        ]
      })
    })
  }

  /**
   * Return `TaskList` used to `compile()` our imports.
   * Call as `project.compiler.start(parentScope?)`.
   */
  /*@memoize*/
  get compiler(): TaskList {
    return this.derived("compiler", () => {
      return new TaskList({
        debug: false,
        name: `Compiling ${this.type}: ${this.projectName}`,
        tasks: [
          this.parser,
          TaskList.forEach({
            name: `Compiling imports`,
            list: () => [...this.sourceImportFiles, ...this.activeImports],
            getTask: (file: SP.CompilableSpellFile) =>
              new Task({
                name: `Compiling import: ${file.file}`,
                run: () => file.compile()
              })
          }),
          new Task({
            name: "Combining output",
            // our language in play:  the writers make words singular and plural by its rules
            run: async (allCompiled) =>
              this.scope!.parser!.inPlay(() => {
                // each `.spell` file as its AST, so a class gets its members from every file
                const files = [...this.sourceImportFiles, ...this.activeImports]
                const parts = files.map((file, index) =>
                  file.AST instanceof P.ASTStatementGroup ? file.AST : (allCompiled as string[])[index]
                )
                const { version, exports } = this.contents ?? {}
                // each file's language, in file order:  `split()` puts the one the program speaks first
                const languages = [...new Set(this.spellFiles.map((file) => file.language.lang))]
                // each target's code, through its writer -- `js/solid`'s first:  it's the one that runs
                for (const target of this.targets) {
                  if (target.can.draw === false && SpellProject.draws(parts)) {
                    throw new P.ParserError({
                      message: `'${this.projectName}' draws a UI, which target '${target.name}' can't.`,
                      activity: "SpellProject.compile",
                      params: { target: target.name }
                    })
                  }
                  const header = this.importHeader(target.writer)
                  // a source map as it's written, for a javascript-family target that runs -- see `P.SourceMarks`
                  // - never a library's (`ts/lib`):  its `.lib.ts` is source the repo commits and imports, not output
                  const sourceMarks =
                    target.writer instanceof P.JSWriter && target.can.run !== false
                      ? new P.SourceMarks(SpellProject.sourcePlaceOf)
                      : undefined
                  const combine = () =>
                    SpellProject.combineCompiled(parts, target.writer, header, this.scope, {
                      listsStartAt: this.contents?.listsStartAt
                    })
                  const marked = sourceMarks ? P.SourceMarks.during(sourceMarks, combine) : combine()
                  // each declaring statement's marker comes out, into our declarations -- see `SP.SpellDeclarations`
                  const split = SP.SpellDeclarations.split(marked, this.scope!, {
                    version,
                    exports,
                    languages
                  })
                  const { declarations } = split
                  let { code } = split
                  const outputFile = this.outputFileFor(target)
                  if (sourceMarks) {
                    const mapped = sourceMarks.extract(code, {
                      file: outputFile.location.file,
                      sources: this.sourceTexts,
                      // each source by its name in the project, e.g. `Card.spell`:  its text is in the map
                      nameOf: (path) => SP.SpellLocation.filePathOf(path)?.replace(/^\//, "") || path
                    })
                    code = mapped.code
                    this.sourceMapFileFor(target).contents = JSON.stringify(mapped.map)
                  }
                  // the file points dev tools at its map, beside it in our build folder;  `compiled` stays without
                  outputFile.contents = sourceMarks
                    ? `${code.trimEnd()}\n//# sourceMappingURL=${outputFile.location.file}.map\n`
                    : code
                  // a target with words of its own, keyed by its names, e.g. Python's `move_to_pile`:  one per language
                  for (const lang of SP.SpellDeclarations.languagesOf(declarations)) {
                    const wordsFile = this.targetWordsFileFor(target, lang)
                    if (wordsFile) {
                      wordsFile.contents = SP.SpellWords.json(SP.SpellWords.of(declarations, target.writer, lang))
                    }
                  }
                  // a target whose page draws in javascript, e.g. Python's:
                  // the drawing half, `Solitaire.elements.spell.js`
                  const elementsFile = this.elementsFileFor(target)
                  if (elementsFile && SpellProject.draws(parts)) {
                    const writer = PY.ElementsWriter.instance
                    const elements = SpellProject.combineCompiled(
                      parts,
                      writer,
                      this.importHeader(writer),
                      this.scope,
                      {
                        listsStartAt: this.contents?.listsStartAt
                      }
                    )
                    const drawing = SP.SpellDeclarations.split(elements, this.scope!, { version, exports }).code
                    // the language it speaks, if not English:  its page turns Spell UI's on before it draws (`<es-texto>`)
                    const { lang } = this.languages[0]!
                    elementsFile.contents =
                      lang === "en" ? drawing : `${drawing.trimEnd()}\n\nexport const lang = ${JSON.stringify(lang)}\n`
                    // and its web app, `Solitaire.app.py`, for a target with one
                    if (target.appSuffix) {
                      const name = this.projectName ?? this.projectId
                      this.appTexts.set(
                        target.name,
                        PY.quartApp({
                          projectName: name,
                          program: `${name}${target.suffix}`,
                          elements: `${name}${target.elementsSuffix}`,
                          // the app stays beside our source, the program goes where the server builds:  see `buildFolder`
                          outputs: this.contents?.buildFolder ?? ".",
                          projects: this.importedElementsFor(target)
                        })
                      )
                    }
                  }
                  if (target.name !== SP.RUNNING_TARGET) continue
                  this.setState("compiled", code)
                  this.declarationsFile.contents = JSON.stringify(declarations, null, 2)
                  // spell's wording of each member, by the names this code uses, a file per language -- see `SP.SpellWords`
                  this.compiledLanguages = SP.SpellDeclarations.languagesOf(declarations)
                  for (const lang of this.compiledLanguages) {
                    this.wordsFileFor(lang).contents = SP.SpellWords.script(
                      SP.SpellWords.of(declarations, P.JSWriter.instance, lang),
                      this.projectName ?? this.projectId
                    )
                  }
                }
                return this.compiled
              })
          }),
          new Task({
            name: "Saving compiled output",
            run: async () => {
              // beside our source:  our declarations, so another project can import us WITHOUT parsing it,
              // and our words, for a runner's Thing Explorer.  Our compiled code goes in our build folder.
              if (!this.saveCompiled) return this.outputFile.contents
              await this.declarationsFile.save(undefined)
              for (const wordsFile of this.wordsFiles) await wordsFile.save(undefined)
              for (const target of this.targets) {
                const map = this.sourceMapFileFor(target)
                if (map.contents) await map.save(undefined)
              }
              for (const target of this.targets.slice(1)) {
                await this.outputFileFor(target).save(undefined)
                for (const lang of this.wordsLanguages) await this.targetWordsFileFor(target, lang)?.save(undefined)
                const elementsFile = this.elementsFileFor(target)
                if (elementsFile?.contents) await elementsFile.save(undefined)
                await this.saveAppFor(target)
              }
              return await this.outputFile.save(undefined)
            }
          })
        ]
      })
    })
  }

  /**
   * Our code for target `name` (`ts/solid`, `py` ...), written now from the files as last compiled:
   * what an editor shows of a target the project file doesn't list, without compiling to it.
   * - Read only:  nothing is saved, and our compiled javascript, declarations and words stay as they were.
   * - Call after `compile()`:  a file never compiled yet writes as empty.
   * - throws if there's no such target (`SP.targetFor()`), or its writer can't write our code
   */
  codeFor(name: string): string {
    const target = SP.targetFor(name)
    const files = [...this.sourceImportFiles, ...this.activeImports]
    const parts = files.map((file) => (file.AST instanceof P.ASTStatementGroup ? file.AST : file.compiled))
    return this.scope!.parser!.inPlay(() => {
      const marked = SpellProject.combineCompiled(parts, target.writer, this.importHeader(target.writer), this.scope, {
        listsStartAt: this.contents?.listsStartAt
      })
      return SP.SpellDeclarations.stripComments(marked)
    })
  }

  /**
   * A project's files' code as ONE module, in order, the writer's `fileSeparator` between each.
   * - Each `part` is a `.spell` file's AST, or code as is, e.g. a `.css` file's.
   * - Each class gets its members from EVERY file -- see `SP.hoistClassMembers()`:
   *   e.g. `Card.move_to_$pile` from `Pile.spell` goes in `Card.spell`'s `class Card`.
   *   Each file's own were moved in by `SP.Block`.
   * - Also how a fixture compiles -- see `compiledFixture()` in spell-app's `spell/app/spaces/test`.
   * - `writer`:  the target's, javascript's by default -- see `SP.TARGETS`.
   *   It sees the whole project first (`P.ProgramWriter.forProject()`),
   *   and finishes the module last (`P.Writer.module()`).
   * - `header`:  what the module starts with, e.g. `importHeaderFor()`'s imports.
   * - `scope`:  the project's, which the writer may read what it imports from (`P.ProgramWriter.forProject()`).
   * - `options`:  what its project file says that changes the code, e.g. where its lists start (`P.WriterOptions`).
   * - Last, a call of each of its `to test ...` methods, the first time it loads (epic page `outline-spell`, P17):
   *   `if (!core.isCarryingOver) testCardSetup()` -- see `testRuns()`.
   */
  static combineCompiled(
    parts: Array<P.ASTStatementGroup | string | undefined>,
    writer: P.ProgramWriter = P.JSWriter.instance,
    header = "",
    scope?: P.Scope,
    options?: P.WriterOptions
  ): string {
    const hoisted = SP.hoistClassMembers(parts.map((part) => (typeof part === "object" ? (part.statements ?? []) : [])))
    const projectWriter = writer.forProject(hoisted, scope, options)
    const code = parts
      .map((part, index) => {
        if (typeof part !== "object") return projectWriter.codePart(part ?? "")
        return String(projectWriter.write(new P.ASTStatementGroup(part.match, { statements: hoisted[index] })))
      })
      .join(projectWriter.fileSeparator)
    const tests = SpellProject.testRuns(hoisted)
    const testCode = tests ? projectWriter.fileSeparator + String(projectWriter.write(tests)) : ""
    return projectWriter.module(header + code + testCode)
  }

  ////////////////
  // ## One chunk
  ////////////////

  /**
   * Compile ONE chunk of a file on its own (epic `elemental-spell` P16):  what a notebook re-draws when a cell changes.
   * - `text`:  file `path`'s whole new text, of which the chunk is `span`.
   * - `into`:  the project it's parsed into, `P.IncrementalProject`:  the file is updated there, which re-parses as
   *   little as it can (one body, or from the first changed line), then just the chunk is written.
   * - `kind`:
   *   - `drawing`:  an element in a drawing (`<example "one counter">`, `<section>`):  a javascript expression,
   *     `h("spell-example", ...)`, which reads `this` as the drawing's thing
   *   - `template`:  a template the file declares (`<spell-view "counter">`):  its whole class, members and all,
   *     `class Counter extends View { ... }`, and the class's name
   * - `errors`:  the parse errors inside `span`, `"<line>:<ch> <message>"`, lines from 1.
   * - Throws if `path` isn't one of `into`'s files;  a chunk it can't find compiles to `""`.
   */
  static compileChunk(options: CompileChunkOptions): CompiledChunk {
    const { into, path, text, span, kind } = options
    into.update(path, text)
    const parse = into.getFile(path)!
    const file = parse.match
    const errors = SpellProject.errorsIn(file, span)
    if (!file) return { code: "", errors }
    const parser = (into.scope.parser ?? parse.parser) as SP.SpellParser
    if (kind === "drawing") {
      const element = SpellProject.elementAt(file, span.start)
      const code = element
        ? parser.inPlay(() => (P.JSWriter.instance.writeMatch(element) as string | undefined) ?? "")
        : ""
      return { code, errors }
    }
    // the file's classes, each with its members:  the template's is the one declared at `span`
    const all = file.AST instanceof P.ASTStatementGroup ? file.AST : undefined
    const code = parser.inPlay(() => SpellProject.combineCompiled([all], P.JSWriter.instance, "", into.scope))
    const className = new RegExp(`type: "(\\w+)",[^}]*?defined: "[^"]*:${span.start}-`).exec(code)?.[1]
    if (!className) return { code: "", errors }
    const lines = SP.SpellDeclarations.stripComments(code).split("\n")
    const start = lines.findIndex((line) => line.startsWith(`export class ${className} `))
    const end = lines.findIndex((line, index) => index > start && line === "}")
    if (start < 0 || end < 0) return { code: "", errors }
    const classCode = lines
      .slice(start, end + 1)
      .join("\n")
      .replace(/^export /, "")
    return { code: classCode, errors, className }
  }

  /**
   * The element match in drawing `match` starting at `offset`, its children's and attributes' too.
   * - Not a fragment, but an `<html>` block, which is one (P18):  `<section label="Slots"><html>...</html>`.
   */
  private static elementAt(match: P.Match, offset: number): P.Match | undefined {
    const data = match.data as { children?: unknown[]; attributes?: unknown[]; htmlBlock?: boolean }
    const isElement = !(match.AST instanceof P.ASTJSXFragment) || data.htmlBlock
    if (match.start === offset && match.AST instanceof P.ASTJSXElement && isElement) return match
    for (const inner of [...match.matched, ...(data.children ?? []), ...(data.attributes ?? [])]) {
      if (!(inner instanceof P.Match)) continue
      const { start } = inner
      const end = inner.end
      if (start === undefined || end === undefined || start > offset || end < offset) continue
      const found = SpellProject.elementAt(inner, offset)
      if (found) return found
    }
    return undefined
  }

  /** The parse errors in file `match` inside `span`:  `"<line>:<ch> <message>"`, lines from 1. */
  private static errorsIn(match: P.Match | undefined, span: { start: number; end: number }): string[] {
    if (!match) return []
    // each block's own, its indented bodies' too:  an incremental parse re-parses a body as a block of its own
    const all = new Set<P.Match>()
    const visit = (each: P.Match) => {
      for (const error of SP.Block.getParseErrors(each) ?? []) all.add(error)
      for (const inner of each.matched) if (inner instanceof P.Match) visit(inner)
    }
    visit(match)
    return [...all]
      .filter((error) => (error.start ?? -1) >= span.start && (error.start ?? -1) <= span.end)
      .map((error) => {
        const message = (error.AST as unknown as { value?: string } | undefined)?.value ?? error.inputText
        return `${(error.line ?? 0) + 1}:${error.char ?? 0} ${message}`
      })
  }

  /**
   * A call of each `to test ...` method the project's files declare at their top level, in order:
   * `if (!core.isCarryingOver) testCardSetup()` (epic page `outline-spell`, P17).
   * - So a program runs its own tests the first time it loads, never on a hot reload (`core.isCarryingOver`).
   * - Not one the program already calls at its start, e.g. a `test card setup` line.
   * - `spell test` counts the ones a program runs itself, and doesn't run them again.
   * - `undefined` for none.
   */
  private static testRuns(files: SP.HoistableStatement[][]): P.ASTStatementGroup | undefined {
    const tests: P.ASTMethodDefinition[] = []
    const called = new Set<string>()
    const visit = (statement: SP.HoistableStatement) => {
      if (statement instanceof P.ASTStatementGroup) statement.statements?.forEach(visit)
      else if (SpellProject.isTestDefinition(statement)) tests.push(statement as P.ASTMethodDefinition)
      else if (statement instanceof P.ASTProgramStart) {
        const [call] = statement.statements?.statements ?? []
        if (call instanceof P.ASTMethodInvocation && call.methodName) called.add(call.methodName)
      }
    }
    files.forEach((statements) => statements.forEach(visit))
    const toRun = tests.filter(({ methodName }) => methodName && !called.has(methodName))
    if (!toRun.length) return undefined
    const runs = toRun.map(
      (test) =>
        new P.ASTProgramStart(test.match, {
          statement: new P.ASTMethodInvocation(test.match, { methodName: test.methodName!, args: [] })
        })
    )
    return new P.ASTStatementGroup(toRun[0]!.match, { statements: runs })
  }

  /** Is `statement` a `to test ...` method:  a function whose body is a `core.test(...)` call? */
  private static isTestDefinition(statement: SP.HoistableStatement): boolean {
    if (!(statement instanceof P.ASTMethodDefinition) || !statement.exported) return false
    const body = statement.body as P.ASTNode | undefined
    let [first] = body instanceof P.ASTStatementBlock ? (body.statements ?? []) : [body]
    if (first instanceof P.ASTReturnStatement) first = first.value
    return first instanceof P.ASTCoreMethodInvocation && first.methodName === "test"
  }

  /**
   * Does any of `parts` draw a UI -- hold a JSX element anywhere?
   * - For a target that can't draw:  see `SP.TargetAbilities`.
   */
  static draws(parts: Array<P.ASTStatementGroup | string | undefined>): boolean {
    return parts.some((part) => typeof part === "object" && containsJSX(part))
  }

  /**
   * One of our `file`s has updated its contents, e.g. on each keystroke:  re-parse as little as possible.
   * - A spell file we've parsed => `incremental` re-parses what changed, and each changed file gets its new `match`.
   *   - What it re-parses:  maybe just one indented body, else from the first changed line on, plus every later file.
   * - Otherwise, or if that throws, has ALL of our files `resetCompiled()` so they'll parse + compile again.
   */
  updatedContentsFor(file: SP.AnySpellFile): void {
    const { incremental } = this
    if (file instanceof SP.SpellFile && incremental?.getFile(file.path) && !incremental.isBroken) {
      try {
        const changed = incremental.update(file.path, file.parseText)
        changed.forEach((parse) => {
          const path = incremental.files.find((it) => it.parse === parse)!.path
          const changedFile = this.spellFiles.find((it) => it.path === path)
          if (changedFile instanceof SP.SpellFile) changedFile.setParsed(parse)
        })
        return
      } catch (error) {
        console.error("SpellProject.updatedContentsFor(): incremental parse failed", error)
      }
    }
    this.incremental = undefined
    this.activeImports.forEach((item) => item.resetCompiled())
  }

  /**
   * An editor changed `file`'s text to `text`, e.g. on a keystroke:  take it, and re-parse as little as possible.
   * - Returns the spell files whose parse changed -- one edit can change LATER files, e.g. by renaming a type.
   * - A file we don't parse (see `SpellFile.isActive`) just takes the text, so it's there if it becomes active.
   * - If the incremental parse couldn't cope, parses from scratch straight away,
   *   rather than leaving every file without a `match` until the next `compile()`.
   *   A crash there is left in `parseError`, NOT thrown.
   * - Does NOT mark `file` dirty or save it:  that's the editor's business.
   */
  async updateText(file: SP.SpellFile, text: string): Promise<SP.SpellFile[]> {
    if (file.contents !== text) file.contents = text
    if (!file.isActive) return [file]

    const before = new Map(this.spellFiles.map((it) => [it, it.match]))
    this.updatedContentsFor(file)
    if (!this.incremental) await this.parse().catch(() => undefined)
    return this.spellFiles.filter((it) => it.match !== before.get(it))
  }

  ////////////////
  // ## Loading / contents
  ////////////////

  /** URL to load this project's index:  `/api/projects/index/<project>` (`SP.SpellUrls.indexUrl()`). */
  get url(): string {
    return SP.SpellUrls.indexUrl(this.projectId)
  }

  /**
   * HACK:  when our `contents` are updated, re-calculate the derived properties below at once.
   * - So the caches fill HERE, not inside whatever reads them first, e.g. a Solid computation,
   *   which would then be the one making our files.
   * - First added to dodge `react-easy-state` rendering errors.
   */
  onContentsUpdated(): void {
    // Which files we have, or their order, may have changed:  parse from scratch next time.
    this.incremental = undefined
    const { manifest, files, imports, activeImports } = this
    void manifest
    void files
    void imports
    void activeImports
  }

  /** Load our index if necessary, calling `die()` if something goes wrong. */
  async loadOrDie(die: ReturnType<typeof getDier>): Promise<void> {
    if (this.isLoaded) return
    try {
      await this.load(undefined)
    } catch (e) {
      die(`Error loading ${this.type} index`, e)
    }
  }

  /**
   * Our `manifest` map, from our `contents`:  each of our files, by path.
   * - `{}` if not loaded, or the index is malformed.
   * - Each entry has:
   *   - `path` string
   *   - `location` as `SpellLocation` for its `path`
   *   - `file` as pointer to `SpellFile` (etc) for its `path`
   *   - `created` as created timestamp
   *   - `modified` as last modified timestamp
   *   - `size` as file size in bytes
   */
  /*@memoizeForProp("contents")*/
  get manifest(): Record<string, SP.ProjectManifestEntry> {
    return this.derivedFrom(
      "manifest",
      () => {
        if (!this.contents?.manifest) return {}
        // add useful stuff to manifest entries
        Object.entries(this.contents.manifest).forEach(([path, entry]) => {
          entry.path = path
          entry.location = new SP.SpellLocation(path)
          entry.file = SpellProject.getFileForPath(path)
        })
        return this.contents.manifest
      },
      [this.contents]
    )
  }

  /**
   * Return pointers to all `SpellFiles` in our manifest.
   * Returns `[]` if we're not loaded.
   */
  /*@memoizeForProp("contents")*/
  get files(): SP.AnySpellFile[] {
    return this.derivedFrom(
      "files",
      () => {
        return Object.values(this.manifest).map((item) => item.file!)
      },
      [this.contents]
    )
  }

  /**
   * Our full ordered `imports` list, from our `contents`, inactive items included.
   * - `[]` if not loaded, or the index is malformed.
   * - Another project's entry isn't here:  see `projectImports`.
   * - Each entry has:
   *   - `path` full path string
   *   - `active` boolean, `true` if file should be included in compilation
   *   - `location` as `SpellLocation` for its `path`
   *   - `file` as pointer to `SpellFile` (etc) for its `path`
   * - The index's preloaded `contents` (only for text files with certain extensions) are left out.
   */
  /*@memoizeForProp("contents")*/
  get imports(): SP.ProjectImportRef[] {
    return this.derivedFrom(
      "imports",
      () => {
        if (!this.contents?.imports) return []
        // another project's entry isn't a file of ours -- see `projectImports`
        return this.contents.imports
          .filter(({ path }) => !SP.SpellLocation.isAddress(path))
          .map(({ path, active }) => {
            const location = SP.SpellLocation.getFileLocation(this.projectId, path)
            const file = SpellProject.getFileForPath(location.path)
            return {
              path: location.path,
              active,
              location,
              file
            }
          })
      },
      [this.contents]
    )
  }

  /**
   * Return `SpellFile` / `SpellCSSFile` objects for our `active` imports -- the ones we parse + compile.
   * - Returns `[]` if we're not loaded or index is malformed.
   * - NOTE: skips anything we can't compile, e.g. an active `.js` import, which has no `parse()`.
   */
  /*@memoizeForProp("contents")*/
  get activeImports(): SP.CompilableSpellFile[] {
    return this.derivedFrom(
      "activeImports",
      () => {
        const { manifest } = this
        return this.imports //
          .filter((item) => item.active)
          .map((item) => manifest[item.path]?.file)
          .filter((file) => file instanceof SP.SpellFile || file instanceof SP.SpellCSSFile)
      },
      [this.contents]
    )
  }

  /**
   * Spell files we parse:  our active `.spell` imports, in order -- see `activeImports`.
   * - After any `source` project imports' files, which parse first -- see `sourceImportFiles`.
   */
  get spellFiles(): SP.SpellFile[] {
    const own = this.activeImports.filter((file): file is SP.SpellFile => file instanceof SP.SpellFile)
    return [...this.sourceImportFiles, ...own]
  }

  /**
   * Other projects we import, from our project file:  entries naming a project, e.g. `@spell/library/people`.
   * - Kept out of `imports`:  they aren't files of ours.
   * - Inactive ones are left out.
   */
  get projectImports(): SP.ProjectImport[] {
    return (this.contents?.imports ?? [])
      .filter(({ path, active }) => SP.SpellLocation.isAddress(path) && active !== false)
      .map(({ path, import: picks, version, source }) => ({
        from: path,
        projectId: SpellProject.projectIdForImport(path),
        import: picks,
        version,
        source
      }))
  }

  /**
   * `.spell` files of projects we import with `source: true`, in import order -- they parse ahead of ours.
   * - Empty until `loadImportScope()` has loaded those projects.
   */
  get sourceImportFiles(): SP.SpellFile[] {
    return this.projectImports.filter((it) => it.source).flatMap((it) => new SP.SpellProject(it.projectId).spellFiles)
  }

  /**
   * Import layer for our `projectImports`, under `parentScope`, or `parentScope` itself if we import none.
   * - A compiled import:  reads its `<Project>.declarations.json5`, fresh each time (`declarationsOf()`).
   * - A `source` import:  loads that project, so its files parse ahead of ours (`sourceImportFiles`).
   *   - It can't rename what it imports, e.g. `Card:Playingcard`:  its sources parse as they are.
   * - Throws `P.ParserError` if one can't be loaded, e.g. it's never been compiled.
   *   See `SP.SpellDeclarations.load()`.
   */
  async loadImportScope(parentScope: P.Scope): Promise<P.Scope> {
    const imports: SP.DeclarationsImport[] = []
    for (const it of this.projectImports) {
      const project = new SP.SpellProject(it.projectId)
      await project.load(undefined)
      if (it.source) {
        // its sources parse just as they are -- only a compiled import's declarations can be renamed
        const renaming = it.import?.find((pick) => pick.includes(":"))
        if (renaming) {
          throw new P.ParserError({
            message: `Can't import '${it.from}':  renaming ('${renaming}') needs a compiled import, not \`source: true\`.`,
            activity: "SpellProject.loadImportScope",
            params: { from: it.from }
          })
        }
        continue
      }
      const declarations = await SpellProject.declarationsOf(project)
      if (!declarations) {
        throw new P.ParserError({
          message: `Can't import '${it.from}':  it has no compiled declarations -- compile it first.`,
          activity: "SpellProject.loadImportScope",
          params: { from: it.from }
        })
      }
      const module = `${SP.SPELL_PROJECT_MODULE}${encodeURI(it.projectId)}`
      imports.push({
        from: it.from,
        projectId: it.projectId,
        declarations,
        import: it.import,
        version: it.version,
        module
      })
    }
    return imports.length ? SP.SpellDeclarations.importScope(parentScope, imports) : parentScope
  }

  /**
   * Compiled `project`'s declarations, from its `declarationsFile`.
   * - Else from the comments in its `outputFile`, for a project compiled before that file existed.
   * - `undefined` if neither has any.
   * - Fresh each time:  another project's compile may have changed them since we last looked.
   */
  static async declarationsOf(project: SpellProject): Promise<SP.SpellDeclarationsData | undefined> {
    const { declarationsFile, outputFile } = project
    declarationsFile.cacheDuration = 0
    const json = await declarationsFile.load(undefined).catch(() => undefined)
    const declarations = json && SP.SpellDeclarations.read(json)
    if (declarations) return declarations
    outputFile.cacheDuration = 0
    const compiled = await outputFile.load(undefined).catch(() => undefined)
    return compiled ? SP.SpellDeclarations.fromComments(compiled) : undefined
  }

  /**
   * `import`s leading our compiled output:  spell's runtime, then what we import from other projects.
   * - e.g.
   *   `import { core, Thing, List, App, View, ViewableList } from "@spell/core"`
   *   `import { Card as Playingcard, Deck, Pile } from "@spell/project/owen@spell/cards"`
   * - Why:  compiled spell reaches everything it didn't declare through `import`s -- NO globals.
   * - A runner rewrites each specifier onto the module it means:
   *   see `runCompiled()` in `spell/app/app/runner/runCompiled`.
   * - A `source` import needs none:  its files compile into our output.
   * - `writer`:  the target's, which spells them in its language -- see `P.ProgramWriter.importsHeader()`.
   */
  importHeader(writer: P.ProgramWriter = P.JSWriter.instance): string {
    return SpellProject.importHeaderFor(this.scope, writer)
  }

  /** `importHeader()` of a project parsed in `scope` -- also for one parsed headlessly, e.g. a test fixture. */
  static importHeaderFor(scope: P.Scope | undefined, writer: P.ProgramWriter = P.JSWriter.instance): string {
    return writer.importsHeader(SpellProject.importsOf(scope))
  }

  /** What a project parsed in `scope` imports, by module:  spell's runtime first, then other projects'. */
  static importsOf(scope: P.Scope | undefined): P.ModuleImport[] {
    const imports: P.ModuleImport[] = [{ module: SPELL_CORE_MODULE, names: [...SPELL_CORE_NAMES] }]
    const importScope = scope?.parentScope
    if (importScope instanceof P.ImportScope) {
      for (const [module, names] of importScope.modules) imports.push({ module, names })
    }
    return imports
  }

  /**
   * Project id an `imports` entry's `path` names:  the project's address, as it is, e.g. `@spell/library/people`.
   * - throws `TypeError` if it isn't an address, or names a file (`.../Card.spell`:  a dot in its last part, Q41)
   * - Its shape only:  whether its group is known waits for loading it.
   *   So a compile with no groups registered (a test's) can still name its imports.
   */
  static projectIdForImport(path: string): string {
    if (!SP.SpellLocation.isAddress(path) || path.slice(path.lastIndexOf("/") + 1).includes("."))
      throw new TypeError(`SpellProject:  import '${path}' isn't a project's address`)
    return path
  }

  ////////////////
  // ## Project file access
  ////////////////

  /**
   * End of a file's name -> the `SpellFile` subclass for it, lazily built in `getFileForPath()`.
   * - Anything else is spell source, a `SpellFile`.
   */
  static extensionMap?: Record<string, new (path: string) => SP.AnySpellFile>
  /**
   * Given `fullPath` to a file, return a `SpellFile` or `SpellCSSFile` etc.
   * - Its kind is the END of its name, never everything after its first dot (`SpellLocation.extension`):
   *   `calculator.en.js`, an old name's words file, is javascript, NOT spell to parse;  so is `helpers.min.js`.
   */
  static getFileForPath(fullPath: string): SP.AnySpellFile {
    SpellProject.extensionMap ??= {
      ".css": SP.SpellCSSFile,
      ".js": SP.SpellJSFile,
      ".jsx": SP.SpellJSFile,
      // a property editor page:  any text file, never compiled
      [SP.EDITOR_PAGE_SUFFIX]: SP.SpellJSFile
    }
    const location = new SP.SpellLocation(fullPath)
    if (!location.isFilePath) {
      throw new TypeError(`SpellProject.getFileForPath('${fullPath}'): path is not a file path.`)
    }
    const name = location.file ?? ""
    const suffix = Object.keys(SpellProject.extensionMap).find((suffix) => name.endsWith(suffix))
    const Constructor = suffix ? SpellProject.extensionMap[suffix] : SP.SpellFile
    return new Constructor(fullPath)
  }

  /**
   * Given `path` as:
   * - `fullPath`, e.g. `owen@spell/project/file.spell`
   * - `filePath`, e.g. `file.spell` or `/file.spell`
   * - `SpellLocation` for a file
   * return `SpellLocation` for the file.
   *
   * Returns `undefined` if not found, path is not valid or is not a file path.
   */
  getFileLocation(path: string | SP.SpellLocation): SP.SpellLocation | undefined {
    let location: SP.SpellLocation | undefined
    if (path instanceof SP.SpellLocation) {
      location = path
    } else if (typeof path === "string") {
      try {
        if (SP.SpellLocation.isAddress(path)) location = SP.SpellLocation.getFileLocation(path)
        else location = SP.SpellLocation.getFileLocation(this.projectId, path)
      } catch {
        return undefined
      }
    }
    if (location?.isFilePath) return location
    return undefined
  }

  /**
   * Assuming we're loaded, return manifest `info` for a file specified by `filePath`.
   * `filePath` can be any of:
   * - `fullPath`, e.g. `owen@spell/project/file.spell`
   * - `filePath`, e.g. `file.spell` or `/file.spell`
   * - `SpellLocation` for a file
   *
   * Returns `undefined` if file not found, couldn't load index, etc.
   */
  getFileInfo(filePath: string | SP.SpellLocation): SP.ProjectManifestEntry | undefined {
    const location = this.getFileLocation(filePath)
    if (location) return this.manifest[location.path]
    return undefined
  }

  /**
   * Assuming we're loaded, then return one of our `files` as a `SpellFile` or `SpellCSSFile` etc.
   * `filePath` can be any of:
   * - `fullPath`, e.g. `owen@spell/project/file.spell`
   * - `filePath`, e.g. `file.spell` or `/file.spell`
   * - `SpellLocation` for a file
   *
   * Returns `undefined` if file not found, couldn't load index, etc.
   */
  getFile(filePath: string | SP.SpellLocation): SP.AnySpellFile | undefined {
    return this.getFileInfo(filePath)?.file
  }

  ////////////////
  // ## Debug
  ////////////////

  /** Debug string, e.g. `SpellProject: owen@spell/myProject`. */
  toString(): string {
    return `${this.constructor.name}: ${this.path}`
  }
}

/** What `SpellProject.compileChunk()` takes. */
export type CompileChunkOptions = {
  /** the project the file is parsed into */
  into: P.IncrementalProject
  /** the file's path in it, e.g. `/Counter.spellx` */
  path: string
  /** the file's whole new text */
  text: string
  /** where the chunk is in `text` */
  span: { start: number; end: number }
  /** what the chunk is:  an element in a drawing, or a template */
  kind: "drawing" | "template"
}

/** What `SpellProject.compileChunk()` gives. */
export type CompiledChunk = {
  /** its javascript:  an expression for a drawing, a class for a template;  `""` when it isn't found */
  code: string
  /** the parse errors inside it, `"<line>:<ch> <message>"` */
  errors: string[]
  /** a template's class name, e.g. `Counter` */
  className?: string
}

/** Does AST `node` hold a JSX element, anywhere in its fields?  See `SpellProject.draws()`. */
function containsJSX(node: unknown): boolean {
  if (node instanceof P.ASTJSXElement) return true
  if (Array.isArray(node)) return node.some(containsJSX)
  if (!(node instanceof P.ASTNode)) return false
  return Object.entries(node).some(([key, value]) => key !== "match" && containsJSX(value))
}
