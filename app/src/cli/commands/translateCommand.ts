import { cpSync, existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "fs"
import { tmpdir } from "os"
import { basename, dirname, join, resolve } from "path"
import { fileURLToPath } from "url"

import { readJSON5File } from "spell/util/node/json5"
import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"
import { SX } from "spell/parser/spellx"
import type { TranslateSource } from "spell/parser/cli/translateProject"
import type {
  DeclarationStatement,
  ImportedProject,
  LineProblem,
  NamesData,
  SourceFile,
  TranslationChecker,
  UIVocabulary
} from "spell/parser/spell/translate/translate.types"
import { LSP } from "spell/app/lsp"
import { CLI } from "spell/app/cli"

/**
 * `spell translate [project] --to <lang>`:  write a project in another language (epic `spanish` P24-P25).
 * - Here, only what needs the app, handed to spell-parser's `translateProject()`, which does the rest:
 *   - finding the project (an address, a folder, `@here`) and parsing it, and its `--seed` project too
 *   - what it declares and its words, compiled now (`<Project>.declarations.json5`, `<Project>.<lang>.js`)
 *   - the projects it imports:  what each declares, and its own translation, if it has one
 *   - Spell UI's names in the other language, for the `<ui-*>` tags it draws with (`uiVocabulary()`)
 *   - a checker that lints and tests the translation, for the fix-ups (`translationChecker()`)
 * - Returns the exit code:  `EXIT.ERRORS` if any line still needs a person, fails lint, or a test fails.
 */
export async function translateCommand(
  session: CLI.CliSession,
  args: string[],
  options: CLI.TranslateOptions
): Promise<number> {
  const project = await CLI.projectFor(session, args[0] ?? (await session.defaultProject()))
  const { translateProject } = await import("spell/parser/cli/translateProject")
  return translateProject(await translateSourceFor(session, project, options), options)
}

/**
 * `project` as spell-parser's `translateProject()` takes it:  parsed, with all the app knows of it (see above).
 * - `options.seed`:  that project, parsed too
 * - `reference`:  a person's translation of it, by address, parsed, to compare names with (`spell translate speedtest`)
 */
export async function translateSourceFor(
  session: CLI.CliSession,
  project: SP.SpellProject,
  options: CLI.TranslateOptions,
  reference?: string
): Promise<TranslateSource> {
  const seed = options.seed ? await CLI.projectFor(session, options.seed) : undefined
  const theirs = reference ? await CLI.projectFor(session, reference) : undefined
  const declarations = await declarationsOf(project)
  return {
    projectName: project.projectName ?? "Project",
    folder: project.location.serverPath,
    files: await sourceFiles(session, project),
    seed: seed && (await sourceFiles(session, seed)),
    reference: theirs && (await sourceFiles(session, theirs)),
    declarations: declarations?.statements as DeclarationStatement[] | undefined,
    words: declarations && SP.SpellWords.of(declarations),
    imports: await importsOf(project, options.to),
    ui: await uiVocabulary(options.to),
    checker: translationChecker
  }
}

/**
 * `project`'s spell files, parsed, in its project file's order:  their paths in the project, e.g. `/Card.spell`.
 * - The translator writes plain Spell, line by line, so a tag file is handed over as the plain Spell it means
 *   (`SourceFile.tagFile`):  a project with any is parsed from a scratch copy of itself, its tag files written plain,
 *   so each file's names resolve against the rest.  The copy is deleted before this returns.
 */
async function sourceFiles(session: CLI.CliSession, project: SP.SpellProject): Promise<SourceFile[]> {
  const spell = project.files.filter(
    (file): file is SP.SpellFile => file instanceof SP.SpellFile && SP.isSpellSourceName(file.path)
  )
  const tagFiles = spell.filter((file) => file.form === "spellx")
  await session.parse(project)
  if (!tagFiles.length) return parsedFiles(project, spell)

  const scratch = mkdtempSync(join(tmpdir(), "spell-translate-"))
  try {
    const folder = join(scratch, basename(project.location.serverPath))
    const original = project.location.serverPath
    cpSync(original, folder, { recursive: true, filter: (from) => !SCRATCH_SKIPS.has(basename(from)) })
    const tagFileFor = new Map<string, NonNullable<SourceFile["tagFile"]>>()
    for (const file of tagFiles) {
      await file.parse()
      const { text, proseLines } = SX.CodeSpellWriter.writeWithProse(file.contents ?? "", {
        path: file.path,
        componentTag: SP.ComponentTags.of(file).componentTag
      })
      const path = file.path.slice(project.projectId.length)
      const plain = plainPathFor(path)
      rmSync(join(folder, path))
      writeFileSync(join(folder, plain), text)
      tagFileFor.set(plain, { path, proseLines })
    }
    // the project file names its files:  the plain ones, in the copy
    const manifest = join(folder, SP.PROJECT_FILE)
    if (existsSync(manifest)) {
      let text = readFileSync(manifest, "utf8")
      for (const [plain, { path }] of tagFileFor) text = text.split(path).join(plain)
      writeFileSync(manifest, text)
    }
    const copy = await CLI.projectFor(session, folder)
    await session.parse(copy)
    const files = await parsedFiles(
      copy,
      copy.files.filter((file): file is SP.SpellFile => file instanceof SP.SpellFile && SP.isSpellSourceName(file.path))
    )
    return files.map((file) => ({ ...file, tagFile: tagFileFor.get(file.path) }))
  } finally {
    rmSync(scratch, { recursive: true, force: true })
  }
}

/**
 * `files` of `project`, parsed, by their paths in it.
 * - A file turned off in the project gets a scope of its own under the project's:  so it reads in its own language
 *   and knows the project's types, and what it declares stays out of the project.
 */
async function parsedFiles(project: SP.SpellProject, files: SP.SpellFile[]): Promise<SourceFile[]> {
  const { scope } = project
  const offFiles =
    scope &&
    new P.ProjectScope({
      name: "files turned off",
      path: project.projectId,
      parser: scope.parser!.clone({ module: `${project.projectId}:off` }),
      parentScope: scope
    })
  const parsed: SourceFile[] = []
  for (const file of files) {
    const match = await file.parse(file.isActive ? undefined : offFiles)
    parsed.push({ path: file.path.slice(project.projectId.length), contents: file.contents ?? "", match })
  }
  return parsed
}

/** What a scratch copy of a project leaves out:  what's built, and what's installed. */
const SCRATCH_SKIPS = new Set(["build", "node_modules", ".git"])

/** A tag file's plain path:  `/Card.spell` as it is, the old `/Card.spellml` and `/Card.spellx` as `/Card.spell`. */
function plainPathFor(path: string): string {
  const suffix = SP.SPELLML_SUFFIXES.find((each) => path.endsWith(each))
  return suffix ? `${path.slice(0, -suffix.length)}${SP.SPELL_SUFFIX}` : path
}

/**
 * What `project` declares, compiled now, in memory:  writes nothing.
 * - `undefined` if it won't compile:  the names pass then asks only for what the lines lack.
 */
async function declarationsOf(project: SP.SpellProject): Promise<SP.SpellDeclarationsData | undefined> {
  try {
    await project.compile(undefined, { save: false })
    return SP.SpellDeclarations.read(project.declarationsFile.contents ?? "")
  } catch {
    return undefined
  }
}

/**
 * The projects `project` imports, as translating it needs them:  what each declares, as it was last compiled;
 * and, when it was translated into `lang` too (its own `<Project>.<lang>.names.json5`, and the record of where its
 * translation went, beside it in the same group), its names there and its translation's address, to import instead.
 */
async function importsOf(project: SP.SpellProject, lang: string): Promise<ImportedProject[]> {
  const imports: ImportedProject[] = []
  for (const imported of LSP.ScopeExplorer.importedProjects(project)) {
    const folder = imported.location.serverPath
    const name = imported.projectName ?? basename(folder)
    // in its build folder, as any built file:  `serverPath` says where
    const declarationsPath = imported.declarationsFile.location.serverPath
    const text = existsSync(declarationsPath)
      ? readFileSync(declarationsPath, "utf8")
      : (imported.declarationsFile.contents ?? "")
    const declarations = SP.SpellDeclarations.read(text)
    if (!declarations) continue
    const entry: ImportedProject = {
      path: imported.projectId,
      declarations: declarations as ImportedProject["declarations"]
    }
    const namesPath = join(folder, `${name}.${lang}.names.json5`)
    const recordPath = join(folder, `${name}.${lang}.translated.json5`)
    const outFolder = existsSync(recordPath) ? readJSON5File<{ outFolder?: string }>(recordPath).outFolder : undefined
    const translated = outFolder && resolve(folder, outFolder)
    // its translation is a project of its own group:  beside it
    if (existsSync(namesPath) && translated && existsSync(translated) && dirname(translated) === dirname(folder)) {
      entry.names = readJSON5File<NamesData>(namesPath)
      entry.translatedPath = `${dirname(imported.projectId)}/${basename(translated)}`
    }
    imports.push(entry)
  }
  return imports
}

////////////////
// ## Spell UI's names
////////////////

/**
 * Spell UI's names in language `lang`, for the `<ui-*>` tags a project draws with:  `<ui-text color="red">` =>
 * `<es-texto color="rojo">`;  `undefined` for a language Spell UI doesn't speak.
 * - From its dictionaries, `UI<Name>.<lang>.ts` gathered into `components/components.<lang>.ts`,
 *   resolved by its own `Vocabulary`:  the same names a page in that language reads.
 * - Every tag's English vocabulary first, `UI<Name>.en.ts`, from Spell UI's components folder.
 */
async function uiVocabulary(lang: string): Promise<UIVocabulary | undefined> {
  let dictionaryFile: string
  try {
    dictionaryFile = fileURLToPath(import.meta.resolve(`spell/ui/components/components.${lang}.ts`))
  } catch {
    return undefined
  }
  if (!existsSync(dictionaryFile)) return undefined
  const { Vocabulary, SharedVocabulary, ValueSets } = await import("spell/ui/vocabulary")
  const dictionary = (await import(dictionaryFile)) as Record<string, unknown>
  const registry = new Vocabulary()
  const components = dirname(dictionaryFile)
  for (const family of readdirSync(components)) {
    const folder = join(components, family)
    if (!family.startsWith("ui-") || !existsSync(folder)) continue
    for (const file of readdirSync(folder).filter((each) => /^UI\w+\.en\.ts$/.test(each))) {
      const module = (await import(join(folder, file))) as Record<string, unknown>
      for (const value of Object.values(module)) {
        if (value && typeof value === "object" && "tag" in value && "attributes" in value) {
          registry.register(value as Parameters<typeof registry.register>[0])
        }
      }
    }
  }
  const localized = registry.define(lang, dictionary[lang] as Parameters<typeof registry.define>[1])
  const specOf = (tag: string, attribute: string) => {
    const vocabulary = registry.get(tag)
    return vocabulary && SharedVocabulary.attributesFor(vocabulary).find((spec) => spec.name === attribute)
  }
  return {
    tag: (tag) => localized.get(tag)?.tag,
    attribute: (tag, attribute, value) => {
      const theirs = localized.get(tag)?.tag
      return theirs ? registry.localize(theirs, attribute, value) : undefined
    },
    hasValues: (tag, attribute) => {
      const spec = specOf(tag, attribute)
      return !!spec && !!ValueSets.setFor(spec)
    }
  }
}

////////////////
// ## Checking a translation
////////////////

/**
 * A checker for the translation in `folder`:  each call lints it, then runs its tests, as it is on disk then
 * (`spell lint`, `spell test`), and answers what's wrong, line by line.
 * - The project is loaded once;  each later call takes each file's text from disk again, as an editor would.
 * - A failed test's failures, on the lines that checked them (the language server's `testDiagnostics()`).
 * - And the translation's files as it parsed them, for the shape check (`ShapeCheck`, epic `spanish` P26).
 * - NEVER throws:  a project that won't load or compile is one problem, on its first file's first line.
 */
function translationChecker(folder: string): TranslationChecker {
  const session = new CLI.CliSession()
  let project: SP.SpellProject | undefined
  const pathOf = (file: SP.SpellFile) => file.path.slice(project!.projectId.length)
  return async () => {
    try {
      if (!project) project = await CLI.projectFor(session, folder)
      else {
        for (const file of project.spellFiles) {
          const text = readFileSync(file.location.serverPath, "utf8")
          if (text !== file.contents) await project.updateText(file, text)
        }
      }
      const files = project.spellFiles
      const problems: LineProblem[] = session.problems(project).map((problem) => ({
        path: pathOf(files.find((file) => file.location.serverPath === problem.path) ?? files[0]!),
        line: (problem.line ?? 1) - 1,
        message: problem.message,
        source: "lint"
      }))
      await project.compile(undefined, { save: false })
      const run = await CLI.runCompiled("test", project, {}, { capture: true, reports: true })
      const reports = run.tests ?? []
      const byUri = new Map(project.spellFiles.map((file) => [session.service.addresses.uriFor(file), file]))
      for (const { uri, diagnostics } of session.service.testDiagnostics(project, reports)) {
        const file = byUri.get(uri)
        if (!file) continue
        for (const { range, message } of diagnostics) {
          const text = typeof message === "string" ? message : message.value
          problems.push({ path: pathOf(file), line: range.start.line, message: text, source: "test" })
        }
      }
      const failed = reports.filter((report) => !report.passed).length
      if (!reports.length && run.exitCode !== CLI.EXIT.OK) {
        problems.push({ path: pathOf(project.spellFiles[0]!), line: 0, message: run.output.trim(), source: "test" })
      }
      // the translation as parsed in its own project, for the shape check:  every file, one turned off in it too
      const allFiles = project.files.filter(
        (file): file is SP.SpellFile => file instanceof SP.SpellFile && SP.isSpellSourceName(file.path)
      )
      return {
        problems,
        tests: { passed: reports.length - failed, failed },
        files: await parsedFiles(project, allFiles)
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error)
      return { problems: [{ path: project ? pathOf(project.spellFiles[0]!) : "/", line: 0, message, source: "lint" }] }
    }
  }
}
