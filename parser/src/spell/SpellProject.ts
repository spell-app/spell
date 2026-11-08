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

  /**
   * Our words files, one per language in `wordsLanguages`, the one our program speaks first -- see `wordsFileFor()`;
   * then one per language we have action titles in, but aren't written in (`titleLanguages`).
   */
  get wordsFiles(): SP.SpellJSFile[] {
    return [...this.wordsLanguages, ...this.titleLanguages].map((lang) => this.wordsFileFor(lang))
  }

  /**
   * Languages our last compile found action titles in, from a names dictionary beside us, which our files aren't
   * written in:  each a words file of titles alone (epic `language` P18, Q20) -- see `writeTitleWords()`.
   */
  titleLanguages: string[] = []

  /**
   * SIDE EFFECT:  a words file of titles alone for each language we have a names dictionary in
   * (`<Project>.es.names.json5`, `spell translate`'s) but aren't written in -- see `SP.SpellWordsData.titles`.
   * - e.g. the editor's English menus, `AppMenus.es.js`:  `{ "Compile and Run": "Compilar y ejecutar" }`.
   * - A language whose dictionary has words for none of our titles, or that we have none for:  no file.
   * - NEVER throws:  a dictionary it can't read is left out.
   */
  protected async writeTitleWords(): Promise<void> {
    this.titleLanguages = []
    const declarations = SP.SpellDeclarations.read(this.declarationsFile.contents ?? "")
    if (!declarations?.statements.some((statement) => statement.title)) return
    for (const lang of SP.Language.all.keys()) {
      if (this.wordsLanguages.includes(lang)) continue
      const location = this.getFileLocation(`${this.projectName}.${lang}.names.json5`)
      if (!location) continue
      let text: string | undefined
      try {
        text = (await new SP.SpellJSFile(location.path).load(undefined)) as string | undefined
      } catch {
        continue
      }
      const titles = SP.SpellWords.titlesFrom(declarations, SP.SpellWords.textsOfNames(text))
      if (!titles) continue
      this.wordsFileFor(lang).contents = SP.SpellWords.script(
        { lang, types: {}, titles },
        this.projectName ?? this.projectId
      )
      this.titleLanguages.push(lang)
    }
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
   *   parses with its twin (`SP.SpellParser.twinFor()`);  so does a spellx file, `Card.spellml`.
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
   * - With a compile cache installed (`compileCache`, the editor's), asks it first, on a project not parsed yet:
   *   - found:  takes what it holds and saves it as a compile would, without parsing or compiling a line
   *     (`compiledFrom` says `"cache"`)
   *   - not found:  compiles, then keeps what a clean compile wrote, for next time
   *   - never with a `parser` passed in:  the cache's key can't vouch for a scope it didn't make
   *   - never with `cached: false`:  a compile behind a cache hit, for what reads the parse and each file's compile
   *     (another target's code and map, `compiled`), as the editor's `compileBehind()` does
   */
  async compile(
    parser?: P.Scope,
    { save = true, targets, cached = true }: { save?: boolean; targets?: string[]; cached?: boolean } = {}
  ): Promise<unknown> {
    this.parser.cancel()
    this.compiler.cancel()
    this.saveCompiled = save
    this.targetsThisRun = targets
    const run = ++this.compileRun
    const cache = parser || !cached ? undefined : SpellProject.compileCache
    // the key of what we're about to compile, worked out first:  the text may change while it compiles
    const key = cache ? await cache.keyFor(this).catch(() => undefined) : undefined
    if (cache && key && this.needsFullParse) {
      const entry = await cache.entryFor(key)
      // a later `compile()` took over while we asked:  it does the work
      if (run !== this.compileRun) return undefined
      if (entry) {
        // nothing parsed:  no scope or match of an older parse may outlive it
        this.resetCompiled()
        this.incremental = undefined
        for (const file of this.spellFiles) file.resetCompiled()
        this.takeCachedEntry(entry)
        cache.noteCompile(this, "cached")
        return await this.saveOutput()
      }
    }
    if (run !== this.compileRun) return undefined
    const result = await this.compiler.start(parser)
    if (run !== this.compileRun) return result
    this.compiledFrom = "compile"
    if (cache) {
      cache.noteCompile(this, "compiled", this.spellFiles.length)
      // kept as the program runs, not before
      if (key && this.compiledCleanly) {
        void cache.keep(key, this.cachedEntry()).catch((error) => console.error("SpellProject.compile():", error))
      }
    }
    return result
  }

  /**
   * The compile cache every project's `compile()` asks first, if one is installed:  the editor installs one.
   * - None (the `spell` command, tests):  every compile compiles.
   */
  static compileCache: SP.CompileCache | undefined

  /**
   * Where our last `compile()`'s output came from:  `"compile"`, or `"cache"`.
   * - `"cache"`:  nothing parsed, so `scope` and each file's `match` are still to come, from a `parse()`.
   * - NOTE: plain field, as `saveCompiled`.
   */
  compiledFrom: "compile" | "cache" | undefined

  /** Counts our `compile()`s, so one that waited on the cache knows a later one took over. */
  private compileRun = 0

  /** Did our last compile parse with no errors, in our files and those we import as source? */
  get compiledCleanly(): boolean {
    if (this.parseError) return false
    return this.spellFiles.every((file) => file.match && !SP.Block.getParseErrors(file.match)?.length)
  }

  /** What our last compile wrote, for the compile cache:  see `SP.CompiledEntry`. */
  cachedEntry(): SP.CompiledEntry {
    const languages = this.compiledLanguages ?? []
    const targets: Record<string, SP.CompiledTargetEntry> = {}
    for (const target of this.targets) {
      const words = Object.fromEntries(
        languages.flatMap((lang) => {
          const text = this.targetWordsFileFor(target, lang)?.contents
          return text === undefined || text === null ? [] : [[lang, String(text)]]
        })
      )
      targets[target.name] = definedOnly({
        code: String(this.outputFileFor(target).contents ?? ""),
        map: optionalText(this.sourceMapFileFor(target).contents),
        words: Object.keys(words).length ? words : undefined,
        elements: optionalText(this.elementsFileFor(target)?.contents),
        app: this.appTexts.get(target.name)
      })
    }
    return {
      compiled: this.compiled ?? "",
      declarations: String(this.declarationsFile.contents ?? ""),
      languages,
      words: Object.fromEntries(languages.map((lang) => [lang, String(this.wordsFileFor(lang).contents ?? "")])),
      targets
    }
  }

  /**
   * Take `entry` as our compile's output, as a compile would have written it:  then `saveOutput()` saves it.
   * - SIDE EFFECT:  `compiled`, our output files' contents, `compiledLanguages`, `compiledFrom`.
   */
  takeCachedEntry(entry: SP.CompiledEntry): void {
    for (const target of this.targets) {
      const written = entry.targets[target.name]
      if (!written) continue
      this.outputFileFor(target).contents = written.code
      if (written.map !== undefined) this.sourceMapFileFor(target).contents = written.map
      for (const [lang, text] of Object.entries(written.words ?? {})) {
        const wordsFile = this.targetWordsFileFor(target, lang)
        if (wordsFile) wordsFile.contents = text
      }
      const elementsFile = this.elementsFileFor(target)
      if (elementsFile && written.elements !== undefined) elementsFile.contents = written.elements
      if (written.app !== undefined) this.appTexts.set(target.name, written.app)
    }
    this.setState("compiled", entry.compiled)
    this.declarationsFile.contents = entry.declarations
    this.compiledLanguages = entry.languages
    for (const [lang, text] of Object.entries(entry.words)) this.wordsFileFor(lang).contents = text
    this.compiledFrom = "cache"
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
    return SpellProject.placeOfMatch(node.match)
  }

  /**
   * Where `node` came from, if it's a drawn tag or a made thing:  its file, line and column -- see `P.SourceMarks`.
   * - A drawn tag spell made itself, a branch's `<span>`:  the place of the words it holds.
   */
  static partPlaceOf(node: P.ASTNode): P.SourcePlace | undefined {
    if (!(node instanceof P.ASTJSXElement || node instanceof P.ASTNewInstanceExpression)) return undefined
    return SpellProject.placeOfMatch(node.match)
  }

  /** Where `match` is:  its file, line and column. */
  private static placeOfMatch(match: P.AnyMatch | undefined): P.SourcePlace | undefined {
    const path = match?.getScopeOfType(P.FileScope)?.path
    const line = match?.line
    const column = match?.char
    if (!path || line === undefined || column === undefined) return undefined
    return { path, line, column }
  }

  /**
   * File for `target`'s source map, beside its output in our build folder, e.g. `Solitaire.spell.js.map` (epic
   * `elemental-spell` P14):  each line of its code back to the `.spell` / `.spellml` line it came from.
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
                  const refusedKind = SpellProject.placeKindRefusedBy(target, parts)
                  if (refusedKind === "any") {
                    throw new P.ParserError({
                      message: `'${this.projectName}' keeps things in a place, which target '${target.name}' can't yet:  it's browser work first (epic data, J10).`,
                      activity: "SpellProject.compile",
                      params: { target: target.name }
                    })
                  }
                  if (refusedKind !== undefined) {
                    throw new P.ParserError({
                      message: `'${this.projectName}' keeps things in a ${refusedKind}, which target '${target.name}' can't:  not in ${target.name === "py" ? "Python" : target.name} yet.`,
                      activity: "SpellProject.compile",
                      params: { target: target.name, kind: refusedKind }
                    })
                  }
                  const header = this.importHeader(target.writer)
                  // a source map as it's written, for a javascript-family target that runs -- see `P.SourceMarks`
                  // - never a library's (`ts/lib`):  its `.lib.ts` is source the repo commits and imports, not output
                  const sourceMarks =
                    target.writer instanceof P.JSWriter && target.can.run !== false
                      ? new P.SourceMarks(SpellProject.sourcePlaceOf, SpellProject.partPlaceOf)
                      : undefined
                  const combine = () =>
                    SpellProject.combineCompiled(
                      parts,
                      target.writer,
                      header,
                      this.scope,
                      this.writerOptions(),
                      this.mainFileIn(files)
                    )
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
                      nameOf: SpellProject.sourceNameOf
                    })
                    code = mapped.code
                    // where each declaration is written, for the editor's side bar -- see `SP.SpellDeclarationPlaces`
                    const declared = SP.SpellDeclarationPlaces.of(this.spellFiles, SpellProject.sourceNameOf)
                    if (declared.length) mapped.map.x_spellDeclarations = declared
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
                      this.writerOptions(),
                      this.mainFileIn(files)
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
            run: () => this.saveOutput()
          })
        ]
      })
    })
  }

  /**
   * Save what our compile wrote, unless the running `compile()` said not to (`saveCompiled`):
   * - beside our source:  our declarations, so another project can import us WITHOUT parsing it,
   *   and our words, for a runner's Thing Explorer
   * - in our build folder:  our compiled code, each target's, its source map, words and drawing half
   * - each target's web app, over an unedited one (`saveAppFor()`)
   * - Returns what saving our output file returns;  not saving, its contents.
   * - The last step of a compile, and all a compile from the cache does (`compile()`).
   */
  async saveOutput(): Promise<unknown> {
    if (!this.saveCompiled) return this.outputFile.contents
    await this.declarationsFile.save(undefined)
    await this.writeTitleWords()
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
      const marked = SpellProject.combineCompiled(
        parts,
        target.writer,
        this.importHeader(target.writer),
        this.scope,
        this.writerOptions(),
        this.mainFileIn(files)
      )
      return SP.SpellDeclarations.stripComments(marked)
    })
  }

  /**
   * `codeFor()`, with the source map it was written with, so an editor can say where each of its lines came from
   * (epic `editor`, Code Follows Along).
   * - The code is EXACTLY `codeFor()`'s:  its marks come out as a compile's do (`P.SourceMarks`).
   * - throws as `codeFor()` does
   */
  codeWithMapFor(name: string): { code: string; map: P.SourceMapV3 } {
    const target = SP.targetFor(name)
    const files = [...this.sourceImportFiles, ...this.activeImports]
    const parts = files.map((file) => (file.AST instanceof P.ASTStatementGroup ? file.AST : file.compiled))
    const marks = new P.SourceMarks(SpellProject.sourcePlaceOf, SpellProject.partPlaceOf)
    return this.scope!.parser!.inPlay(() => {
      const marked = P.SourceMarks.during(marks, () =>
        SpellProject.combineCompiled(
          parts,
          target.writer,
          this.importHeader(target.writer),
          this.scope,
          this.writerOptions(),
          this.mainFileIn(files)
        )
      )
      return marks.extract(SP.SpellDeclarations.stripComments(marked), {
        file: this.outputFileFor(target).location.file,
        sources: this.sourceTexts,
        nameOf: SpellProject.sourceNameOf
      })
    })
  }

  /** What our project file says that changes our code:  see `writerOptionsFor()`. */
  writerOptions(): P.WriterOptions {
    return SpellProject.writerOptionsFor(this.contents ?? {})
  }

  /**
   * What project file `contents` says that changes the code (`P.WriterOptions`):
   * - where its lists start, `listsStartAt`
   * - the types it `exports`, which another project may extend:  `extendable` (epic `language` P26)
   */
  static writerOptionsFor(contents: Pick<SP.ProjectManifestJSON5, "exports" | "listsStartAt">): P.WriterOptions {
    const { exports, listsStartAt } = contents
    return { ...(listsStartAt !== undefined && { listsStartAt }), ...(exports && { extendable: exports }) }
  }

  /** A source file's name in a map, its name in the project:  `Card.spell` for its path. */
  static sourceNameOf(path: string): string {
    return SP.SpellLocation.filePathOf(path)?.replace(/^\//, "") || path
  }

  /**
   * A project's files' code as ONE module, in order, the writer's `fileSeparator` between each.
   * - Each `part` is a `.spell` file's AST, or code as is, e.g. a `.css` file's.
   * - Each class gets its members from EVERY file -- see `SP.hoistClassMembers()`:
   *   e.g. `Card.move_to_$pile` from `Pile.spell` goes in `Card.spell`'s `class Card`.
   *   Each file's own were moved in by `SP.Block`.
   * - An imported type it adds to becomes a class of its own first, at the top of its first file
   *   (`SP.subclassImportedTypes()`):  its `header` then imports the library's by another name, `Card as CardsCard`.
   * - Also how a fixture compiles -- see `compiledFixture()` in spell-app's `spell/app/spaces/test`.
   * - `writer`:  the target's, javascript's by default -- see `SP.TARGETS`.
   *   It sees the whole project first (`P.ProgramWriter.forProject()`),
   *   and finishes the module last (`P.Writer.module()`).
   * - `header`:  what the module starts with, e.g. `importHeaderFor()`'s imports.
   * - `scope`:  the project's, which the writer may read what it imports from (`P.ProgramWriter.forProject()`).
   * - `options`:  what its project file says that changes the code, e.g. where its lists start (`P.WriterOptions`).
   * - Near its end, its app or page starts by itself, if nothing in it says `start` (`startedByItself()`).
   * - Last, a call of each of its `to test ...` methods, the first time it loads (epic page `outline-spell`, P17):
   *   `if (!core.isCarryingOver) testCardSetup()` -- see `testRuns()`.
   * - `mainFile`:  which of `parts` is the file named for the project:  its app is the one that starts.
   */
  static combineCompiled(
    parts: Array<P.ASTStatementGroup | string | undefined>,
    writer: P.ProgramWriter = P.JSWriter.instance,
    header = "",
    scope?: P.Scope,
    options?: P.WriterOptions,
    mainFile?: number
  ): string {
    const statements = parts.map((part) => (typeof part === "object" ? (part.statements ?? []) : []))
    const firstFile = Math.max(
      0,
      parts.findIndex((part) => typeof part === "object")
    )
    const subclassed = SP.subclassImportedTypes(statements, scope, firstFile)
    const hoisted = SP.hoistClassMembers(subclassed.files)
    const projectWriter = writer.forProject(hoisted, scope, { ...options, noteForAuthor: SP.SpellWarnings.noteRead })
    // an imported type we subclass is imported by another name, its class's:  `Card as CardsCard`
    if (header && subclassed.names.length) {
      header = projectWriter.importsHeader(SpellProject.importsOf(scope, subclassed.names))
    }
    const code = parts
      .map((part, index) => {
        if (typeof part !== "object") return projectWriter.codePart(part ?? "")
        return String(projectWriter.write(new P.ASTStatementGroup(part.match, { statements: hoisted[index] })))
      })
      .join(projectWriter.fileSeparator)
    const starts = [SpellProject.startedByItself(hoisted, mainFile), SpellProject.testRuns(hoisted)].filter(
      (it) => !!it
    )
    const startCode = starts.map((it) => projectWriter.fileSeparator + String(projectWriter.write(it))).join("")
    return projectWriter.module(header + code + startCode)
  }

  /**
   * The spell names of what waits in this project, as last parsed:  the pass every target compiles with,
   * for what asks with no compile in hand, e.g. the language server's hover (`P.WriterProject.findWaiting()`).
   * - An empty set if its files can't be read yet.
   * - NEVER throws.
   */
  waitingNames(): ReadonlySet<string> {
    try {
      const parts = this.spellFiles.map(({ match }) => match?.AST as P.ASTStatementGroup | undefined)
      const subclassed = SP.subclassImportedTypes(
        parts.map((part) => part?.statements ?? []),
        this.scope
      )
      const hoisted = SP.hoistClassMembers(subclassed.files)
      return P.JSWriter.instance.forProject(hoisted, this.scope).project.waitingNames
    } catch (error) {
      console.error(error)
      return new Set()
    }
  }

  /**
   * The line that starts the project's app or page, when nothing in it says to (epic `editor`, Edit Without Redraw):
   * `if (!core.isCarryingOver) game.start()`.
   * - So a program needs no `start the game` line, in any language, and no edit can change how it starts.
   * - `undefined` when anything in the program calls `start`:  a written line wins, or a method that does more.
   * - Its site, if it has one (epic `mockup` P2);  else its top-level things whose type is an app or a page, by the
   *   project's own types:
   *   the one in `mainFile` if it has one, else the first.
   * - `undefined` for none, e.g. a library.
   */
  private static startedByItself(files: SP.HoistableStatement[][], mainFile?: number): P.ASTStatementGroup | undefined {
    let isWritten = false
    P.forEachNode(files, (node) => {
      if (node instanceof P.ASTScopedMethodInvocation && node.methodName === "start") isWritten = true
    })
    if (isWritten) return undefined
    const baseOf = new Map<string, string | undefined>()
    const made: { file: number; statement: P.ASTAssignmentStatement; type: string }[] = []
    const visit = (file: number, statement: SP.HoistableStatement) => {
      if (statement instanceof P.ASTStatementGroup) statement.statements?.forEach((it) => visit(file, it))
      else if (statement instanceof P.ASTClassDeclaration) {
        // our own class of an imported one extends its own name (`SP.subclassImportedTypes()`):  no base we know
        const base = statement.superType?.name
        baseOf.set(statement.type.name, base === statement.type.name ? undefined : base)
      } else if (
        statement instanceof P.ASTAssignmentStatement &&
        statement.isNewVariable &&
        statement.value instanceof P.ASTNewInstanceExpression
      ) {
        made.push({ file, statement, type: statement.value.type.name })
      }
    }
    files.forEach((statements, file) => statements.forEach((it) => visit(file, it)))
    const isA = (type: string | undefined, bases: ReadonlySet<string>): boolean => {
      for (let at = type; at; at = baseOf.get(at)) if (bases.has(at)) return true
      return false
    }
    // a site starts, not its first page:  it shows the page its address names (epic `mockup` P2)
    const sites = made.filter(({ type }) => isA(type, SITE_TYPES))
    const apps = sites.length ? sites : made.filter(({ type }) => isA(type, STARTING_TYPES))
    const { statement } = apps.find(({ file }) => file === mainFile) ?? apps[0] ?? {}
    if (!statement) return undefined
    const start = new P.ASTScopedMethodInvocation(statement.match, { thing: statement.thing, methodName: "start" })
    return new P.ASTStatementGroup(statement.match, {
      statements: [new P.ASTProgramStart(statement.match, { statement: start })]
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

  /** Which of `files` is named for the project, e.g. `Solitaire.spellml` in `Solitaire`:  `undefined` if none is. */
  private mainFileIn(files: readonly { path: string }[]): number | undefined {
    const name = this.projectName?.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "")
    const at = files.findIndex(({ path }) => {
      const stem = path.split("/").at(-1)?.split(".")[0]
      return stem?.toLowerCase().replace(/[^\p{L}\p{N}]/gu, "") === name
    })
    return at < 0 ? undefined : at
  }

  /** Does a program made of `parts` name a place?  A target that says `places: false` can't write one. */
  static keepsThingsInPlaces(parts: Array<P.ASTStatementGroup | string | undefined>): boolean {
    return SpellProject.placeKindsIn(parts).length > 0
  }

  /**
   * The kind of each place a program made of `parts` names, by its word (`"data folder"`), in order:
   * `""` for a kind a library adds, which its class knows.
   */
  static placeKindsIn(parts: Array<P.ASTStatementGroup | string | undefined>): string[] {
    const kinds: string[] = []
    P.forEachNode(
      parts.filter((part) => typeof part === "object"),
      (node) => {
        if (!(node instanceof P.ASTCoreMethodInvocation) || node.methodName !== "place") return
        const details = node.args.args?.[1]
        const kind =
          details instanceof P.ASTObjectLiteral
            ? details.properties.find(
                (each): each is P.ASTObjectLiteralProperty =>
                  each instanceof P.ASTObjectLiteralProperty && each.property.value === "kind"
              )?.value
            : undefined
        kinds.push(kind instanceof P.ASTStringLiteral ? (JSON.parse(kind.value) as string) : "")
      }
    )
    return kinds
  }

  /**
   * The place a program made of `parts` keeps things in that `target` can't write (epic `data` P40):
   * - `"any"`:  the target keeps nothing in a place (`places: false`), and the program names one
   * - a kind's word, `"personal atmosphere account"`:  the first place of a kind the target doesn't list;
   *   a kind a library adds is `"place of its own kind"`
   * - `undefined`:  every place it names, the target can write
   */
  static placeKindRefusedBy(
    target: SP.Target,
    parts: Array<P.ASTStatementGroup | string | undefined>
  ): string | undefined {
    const { places } = target.can
    if (places === undefined) return undefined
    const kinds = SpellProject.placeKindsIn(parts)
    if (!kinds.length) return undefined
    if (places === false) return "any"
    const refused = kinds.find((kind) => !places.includes(kind))
    return refused === "" ? "place of its own kind" : refused
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

  /**
   * What a project parsed in `scope` imports, by module:  spell's runtime first, then other projects'.
   * - `subclassed`:  the imported types the project makes its own class of (`SP.subclassImportedTypes()`),
   *   each imported by its base's name, `Card as CardsCard` -- see `P.WriterProject.importedBaseName()`.
   */
  static importsOf(scope: P.Scope | undefined, subclassed: string[] = []): P.ModuleImport[] {
    const imports: P.ModuleImport[] = [{ module: SPELL_CORE_MODULE, names: [...SPELL_CORE_NAMES] }]
    const importScope = scope?.parentScope
    if (importScope instanceof P.ImportScope) {
      for (const [module, names] of importScope.modules) {
        const origin = (name: string) => importScope.origins.get(name) ?? module
        const named = names.map((name) =>
          subclassed.includes(name) ? `${name} as ${P.WriterProject.importedBaseName(name, origin(name))}` : name
        )
        imports.push({ module, names: named })
      }
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
    // a property editors file, `Card.editor.spellml` (epic `editor` P25):  text the Inspector reads, never compiled
    if (SP.isPropertyEditorsName(name)) return new SP.SpellJSFile(fullPath)
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

/** Does AST `node` hold a JSX element, anywhere in its fields?  See `SpellProject.draws()`. */
function containsJSX(node: unknown): boolean {
  if (node instanceof P.ASTJSXElement) return true
  if (Array.isArray(node)) return node.some(containsJSX)
  if (!(node instanceof P.ASTNode)) return false
  return Object.entries(node).some(([key, value]) => key !== "match" && containsJSX(value))
}

/** The built-in types that start by themselves, whichever language's words made them. */
const STARTING_TYPES = new Set(["App", "Page"])

/** What a program with one starts, before any of its pages:  its site, which shows the page its address names. */
const SITE_TYPES = new Set(["Site"])

/** `text`, if a file holds any:  `undefined` for none. */
function optionalText(text: unknown): string | undefined {
  return typeof text === "string" && text ? text : undefined
}

/** `props` without the keys whose value is `undefined`:  an entry keeps only what a target wrote. */
function definedOnly<T extends object>(props: T): T {
  return Object.fromEntries(Object.entries(props).filter(([, value]) => value !== undefined)) as T
}
