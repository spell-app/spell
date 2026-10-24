/**
 * `spell translate <project> --to es`'s work, once the project is parsed (epic `spanish` P24-P26), in three passes:
 * 1. NAMES:  every name the project's people chose, into its names dictionary:  its types, properties, values and
 *    methods (its declarations), its texts and comments
 *    - first from the language pack's shared glossary (`NamesGlossary`):  no call for a name another project chose
 *    - the rest by Claude (`NamesPass`):  the types in one small call, then the rest in a few calls at once
 * 2. LINES:  each file written again, line by line, by its rules' twins in the other language (`Translator`)
 * 3. FIX-UPS:  each line that fails lint or a test, compiles to a different program than its English (`ShapeCheck`),
 *    couldn't be written, or may read in the wrong order, written again by Claude in context (`FixUps`);
 *    checked again, a few rounds at most
 * - Claude through the API when `ANTHROPIC_API_KEY` is set, else `claude -p` (`claudeRunnerFor()`, epic `spanish` P27);
 *   `--effort fast|balanced|best` says how much every pass spends, `--names-effort` and `--fix-ups-effort` one pass's
 *   (`askingFor()`):  the runner picks the model and effort for each (`CLAUDE_TIERS`).
 * - `--learn`, instead:  the project's dictionary added to the shared glossary, for every project after it.
 * - `--cold` (epic `spanish` P29), for timing:  from nothing pre-calculated -- no shared glossary, no dictionary of
 *   the project's, no record, no seed -- and it writes only into `--out`.  Every report says which it started from.
 * - `translationOf()`:  the same, and what it did in numbers (`TranslationResult`), for `spell translate speedtest`
 *   (`translateTimes.ts`).
 * - spell-app's `translateCommand` finds and parses the project, the app's way (an address, a folder), and hands it here
 *   with what only the app can give:  its declarations, the projects it imports, Spell UI's names, and the checker
 *   that lints and tests the translation.  So this file needs no project groups, only parsed files.
 * - Beside the project, two files of its own:
 *   - `<Project>.<lang>.names.json5`:  its names dictionary, for a person to review (`TranslationNames`)
 *   - `<Project>.<lang>.translated.json5`:  what each source line was when it was last translated, a hash per line,
 *     so `--update` re-translates only the lines changed since;  and each fix-up, so it's never asked for again
 * - Loaded only when it runs (`commands.ts` imports the hook's work dynamically):  it loads all of spell.
 */
import { createHash } from "node:crypto"
import { existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs"
import { basename, dirname, join, relative, resolve } from "node:path"
import { fileURLToPath } from "node:url"

import { keepingCommentsIn, readJSON5File } from "spell/util/node/json5"
import { CLI } from "spell/cli"
import { SP } from "spell-parser/spell"
import type { TranslateOptions } from "spell-parser/cli"
import { claudeRunnerFor, type ChosenRunner } from "spell-parser/cli/claudeRunners"
import { ElementNames } from "spell-parser/spell/translate/ElementNames"
import { FixUps, type FixUpFile, type FixUpLine } from "spell-parser/spell/translate/FixUps"
import { NamesGlossary } from "spell-parser/spell/translate/NamesGlossary"
import { NamesPass, type NamesStage } from "spell-parser/spell/translate/NamesPass"
import { NamesSeeder } from "spell-parser/spell/translate/NamesSeeder"
import { ShapeCheck } from "spell-parser/spell/translate/ShapeCheck"
import { TranslationNames } from "spell-parser/spell/translate/TranslationNames"
import { Translator } from "spell-parser/spell/translate/Translator"
import type {
  AskingPass,
  ClaudeEffort,
  ClaudeOptions,
  ClaudeRunner,
  DeclarationStatement,
  EffortTier,
  GlossaryData,
  ImportedProject,
  LineProblem,
  MissingName,
  NamesData,
  NamesKind,
  SourceFile,
  TranslatedFile,
  TranslationChecker,
  UIVocabulary
} from "spell-parser/spell/translate/translate.types"

/** A parsed project to translate:  what spell-app's command hands `translateProject()`. */
export type TranslateSource = {
  /** Its name, e.g. `Solitaire`:  its dictionary is `Solitaire.es.names.json5`. */
  projectName: string
  /** Its folder on disk. */
  folder: string
  /** Its spell files, parsed, in its project file's order, e.g. `/Card.spell`. */
  files: SourceFile[]
  /** A translation of it a person made, parsed, in the same order:  `--seed`. */
  seed?: SourceFile[]
  /**
   * A translation of it a person made, parsed, to COMPARE with (`spell translate speedtest`, epic `spanish` P29):
   * how many of the names Claude drafted are the person's too (`TranslationResult.agreement`).
   * - Never a name taken from it:  that's `seed`.
   */
  reference?: SourceFile[]
  /** What it declares (its `<Project>.declarations.json5`, as compiled now):  the names pass asks for each. */
  declarations?: DeclarationStatement[]
  /** Its words (its `<Project>.<lang>.js`):  its types' members, by type, for the names pass's prompt. */
  words?: SP.SpellWordsData
  /** The projects it imports:  what each declares, and its own dictionary when it has a translation. */
  imports?: ImportedProject[]
  /** Spell UI's names in the other language, for its `<ui-*>` tags. */
  ui?: UIVocabulary
  /** Lints and tests the translation in `folder`, as it is on disk:  the fix-up pass checks with it. */
  checker?: (folder: string) => TranslationChecker
}

/**
 * Where `translateProject()` reads the shared glossary, and whether it prints:
 * - `glossaryFile`:  the language pack's `glossary.json5` by default;  a test's own
 * - `print`:  `false` prints nothing -- `spell translate speedtest` prints a table of its own
 */
export type TranslateSettings = { glossaryFile?: string; print?: boolean }

/**
 * What one translation did, in numbers:  what `translateProject()` prints, for a program to read
 * (`spell translate speedtest`, epic `spanish` P29).
 */
export type TranslationResult = {
  /** `EXIT.ERRORS` if any line still needs a person, fails lint, a test, or the shape check;  else `EXIT.OK`. */
  exitCode: number
  /** The project's name, e.g. `Solitaire`. */
  projectName: string
  /** The language it was written in, e.g. `es`. */
  to: string
  /** Where it was written. */
  outFolder: string
  /** What it started from that earlier runs and other projects worked out:  `TranslationLists`. */
  lists: TranslationLists
  /** How it asked Claude, e.g. `Claude API`, `claude -p`. */
  via: string
  /** How long each pass took, in milliseconds, and all of it. */
  timings: Required<Timings>
  /** How many calls each pass made. */
  calls: { names: number; fixUps: number }
  /** The project's lines, how many were written this run (`--update` keeps the rest), and how many fix-ups changed. */
  lines: { total: number; written: number; fixed: number }
  /** Where its names came from:  seeded (`--seed`), the shared glossary, drafted by Claude. */
  names: { seeded: number; fromGlossary: number; drafted: number }
  /** Lines still marked `// TODO: translate`. */
  todo: number
  /** The problems the last check left, by what found them. */
  problems: { lint: number; test: number; shape: number }
  /** How its tests went, when the checker ran them. */
  tests?: { passed: number; failed: number }
  /** How many statements compile to the same program as their English, of how many, when the checker parsed it. */
  shape?: { same: number; statements: number }
  /**
   * Of the names Claude drafted (types, names, phrases), how many the person's translation (`reference`) has,
   * and how many of those are the same word.
   */
  agreement?: { same: number; compared: number }
}

/**
 * What a translation started from that earlier runs and other projects worked out (epic `spanish` P29):
 * - `cold`:  `--cold`:  none of the rest, whatever is on disk
 * - `glossary`:  how many names and phrases the language's shared glossary holds (`glossary.json5`)
 * - `dictionary`:  how many names the project's own `<Project>.<lang>.names.json5` had filled in
 * - `fixes`:  how many fix-ups `--update`'s record had, to use again
 * - `seeded`:  whether `--seed` filled the dictionary first
 */
export type TranslationLists = { cold: boolean; glossary: number; dictionary: number; fixes: number; seeded: boolean }

/**
 * Translate `source` into language `options.to`, and write it:  see the file's docstring.
 * - `run`:  how to ask Claude -- a test's fake;  by default the Claude API with `ANTHROPIC_API_KEY` set, else `claude -p`
 *   (`claudeRunnerFor()`, which says how to speed it up)
 * - `settings`:  `TranslateSettings`
 * - Returns the exit code:  `EXIT.ERRORS` if any line still needs a person, fails lint, a test, or the shape check.
 * - Throws `CliError` for a language it doesn't know, or the language the project is already in;
 *   with `--learn`, for a project with no dictionary yet;  `--cold` with what it rules out (`checkCold()`).
 */
export async function translateProject(
  source: TranslateSource,
  options: TranslateOptions,
  run?: ClaudeRunner,
  settings: TranslateSettings = {}
): Promise<number> {
  if (options.learn) return learnFrom(source, options, settings)
  return (await translationOf(source, options, run, settings)).exitCode
}

/**
 * `translateProject()`, and what it did in numbers (`TranslationResult`):  for `spell translate speedtest`.
 * - `--cold`:  nothing pre-calculated -- no shared glossary, no dictionary of the project's, no record --
 *   and its dictionary and record written only into `--out`, never beside the project.
 * - Throws as `translateProject()` does.
 */
export async function translationOf(
  source: TranslateSource,
  options: TranslateOptions,
  run?: ClaudeRunner,
  { glossaryFile = glossaryFileFor(options.to), print = true }: TranslateSettings = {}
): Promise<TranslationResult> {
  const started = performance.now()
  const { from, to } = languagesOf(source, options)
  const cold = !!options.cold
  if (cold) checkCold(options)
  const ai = options.ai !== false
  // quiet, for a table of runs:  nothing said about speeding it up either
  const chosen: ChosenRunner = run ? { run, via: "claude" } : claudeRunnerFor(process.env, { ai: ai && print })
  // each pass's tier, checked before anything's asked
  const asking = { names: askingFor(options, "names"), fixUps: askingFor(options, "fixUps") }
  const askFor = (pass: AskingPass) => withTier(chosen.run, asking[pass])

  // what earlier runs and other projects worked out:  none of it, cold
  const paths = translationPaths(source, to, options)
  const names = new TranslationNames(!cold && existsSync(paths.names) ? readJSON5File<NamesData>(paths.names) : {}, {
    from,
    to
  })
  const shared = new NamesGlossary(!cold && existsSync(glossaryFile) ? readJSON5File<GlossaryData>(glossaryFile) : {})
  const dictionary = filledIn(names.data)
  const seeded = source.seed && !cold ? new NamesSeeder(names).seed(source.files, source.seed) : 0
  for (const imported of source.imports ?? []) {
    names.addImported(imported.names ?? TranslationNames.asDeclared(imported.declarations.statements))
  }
  // the glossary's genders beneath ours, so an article agrees without a guess
  names.addImported({ genders: shared.data.genders })
  const record = options.update && existsSync(paths.record) ? readJSON5File<TranslationRecord>(paths.record) : undefined
  const lists: TranslationLists = {
    cold,
    glossary: shared.size,
    dictionary,
    fixes: record?.fixes?.length ?? 0,
    seeded: !!source.seed && !cold
  }
  const glossary = glossaryFor(to.lang)
  const timings: Timings = {}

  // 1. names:  what the lines lack, and everything the project declares, asked for at once
  let mark = performance.now()
  // with its elements' names too, so a `part` or an attribute's value the dictionary lacks is asked for
  let translated = translateAll(source, from, to, names, source.imports, new ElementNames({ names, ui: source.ui }))
  let outFolder = outFolderFor(source, names, options, record)
  let plans = source.files.map((file, at) => linePlan(file, translated.files[at]!, record, outFolder))
  const namesPass = new NamesPass({
    names,
    run: askFor("names"),
    files: source.files,
    declarations: source.declarations ?? [],
    words: source.words,
    glossary,
    shared: shared.relevantTo(source.files.map((file) => file.contents).join("\n"))
  })
  // what the glossary knows first:  no call for it
  const { filled: fromGlossary, rest: wanted } = shared.fill(
    names,
    namesPass.wanted(missingIn(translated.files, plans))
  )
  const drafted = ai ? await namesPass.draft(wanted) : 0
  timings.names = performance.now() - mark

  // 2. lines:  each written again with the dictionary
  mark = performance.now()
  const outName = projectNameIn(names, source.projectName)
  outFolder = outFolderFor(source, names, options, record)
  if (!record) plans = source.files.map((file, at) => linePlan(file, translated.files[at]!, record, outFolder))
  const elements = new ElementNames({
    names,
    ui: source.ui,
    projectName: { ours: source.projectName, theirs: outName }
  })
  translated = translateAll(source, from, to, names, source.imports, elements)
  names.markTodo(missingIn(translated.files, plans).filter(({ kind }) => kind !== "comments"))
  const fixes = record?.fixes ?? []
  const outputs = source.files.map((file, at) =>
    outputFor(file, translated.files[at]!, plans[at]!, outputPathFor(file.path, names, to), fixes)
  )
  mkdirSync(outFolder, { recursive: true })
  for (const output of outputs) writeFileSync(join(outFolder, output.path), output.lines.join("\n"))
  writeManifest(source, outFolder, names, outName, outputs)
  copyOtherFiles(source.folder, outFolder, elements)
  timings.lines = performance.now() - mark

  // 3. fix-ups:  each line wrong in context, a round at a time, checked between
  mark = performance.now()
  const fixUps = new FixUps({ run: askFor("fixUps"), names, glossary })
  const checked = await fixUp({ source, outputs, outFolder, fixUps, fixes, ai, shapes: new ShapeCheck() })
  timings.fixUps = performance.now() - mark

  writeFileSync(paths.names, keepingCommentsIn(paths.names, `${JSON.stringify(names.toJSON(), null, 2)}\n`))
  writeFileSync(paths.record, `${JSON.stringify(recordOf(source, outputs, to, outFolder, fixes), null, 2)}\n`)
  timings.total = performance.now() - started

  return report({
    source,
    to,
    outFolder,
    translated,
    outputs,
    plans,
    seeded,
    drafted,
    fromGlossary,
    differences: shared.differences(names),
    paths,
    timings: timings as Required<Timings>,
    checked,
    calls: { names: namesPass.calls, fixUps: fixUps.durations, via: chosen.via },
    notes: [...namesPass.notes, ...fixUps.notes],
    lists,
    agreement: source.reference && agreementOf(names, wanted, source.files, source.reference),
    print
  })
}

/**
 * The language `source` is in, and the one `options.to` names.
 * - throws `CliError` for a language there's no pack for, or the one it's in already
 */
function languagesOf(source: TranslateSource, options: TranslateOptions): { from: SP.Language; to: SP.Language } {
  const from = SP.Language.forFile(source.files[0]?.path ?? "")
  if (!SP.Language.all.has(options.to)) {
    throw new CLI.CliError(`No language pack '${options.to}':  try ${[...SP.Language.all.keys()].join(", ")}`)
  }
  const to = SP.Language.for(options.to)
  if (to === from) throw new CLI.CliError(`${source.projectName} is in ${to.name} already`)
  return { from, to }
}

/**
 * `--cold` translates from nothing pre-calculated, and writes only where `--out` says, so it rules out:
 * - `--update`, `--seed` and `--learn`:  each reads or writes a list it mustn't
 * - no `--out`:  its dictionary and record would go beside the project
 * - throws `CliError` naming the flag
 */
function checkCold(options: TranslateOptions): void {
  for (const flag of ["update", "seed", "learn"] as const) {
    if (options[flag]) throw new CLI.CliError(`--cold uses nothing pre-calculated:  drop --${flag}`)
  }
  if (!options.out) throw new CLI.CliError("--cold writes only where --out says:  pass --out <folder>")
}

/** How many names `data` has filled in:  its types, names and phrases, not `TODO`. */
function filledIn(data: Required<NamesData>): number {
  const filled = (value: string | undefined) => !!value && value !== TranslationNames.TODO
  return (
    Object.values(data.types).filter((type) => filled(type.name)).length +
    Object.values(data.names).filter(filled).length +
    Object.values(data.phrases).filter(filled).length
  )
}

////////////////
// ## Translating
////////////////

/** Every file of `source`, translated with `names`;  and the rules none could write. */
function translateAll(
  source: TranslateSource,
  from: SP.Language,
  to: SP.Language,
  names: TranslationNames,
  imports?: ImportedProject[],
  elements?: ElementNames
) {
  const translator = new Translator({ from, to, names, imports, elements })
  const files = source.files.map((file) => translator.translateFile(file))
  return { files, untranslatable: translator.untranslatable }
}

/**
 * Which of a file's lines to keep as they are, by `--update`'s record:
 * `lines[index]` is the line already written for source line `index`, when it hasn't changed since;
 * `undefined` for a line to (re)write.
 * - Lined up by the hashes of the source's lines, their longest common run:  a line added above moves the rest down.
 * - Kept from the file as it is now, so a person's edit to an unchanged line stays.
 */
function linePlan(
  file: SourceFile,
  translated: TranslatedFile,
  record: TranslationRecord | undefined,
  outFolder: string
): LinePlan {
  const sourceLines = file.contents.split("\n")
  const lines: Array<string | undefined> = sourceLines.map(() => undefined)
  const recorded = record?.files[file.path]
  const outPath = recorded && join(outFolder, recorded.output)
  if (!recorded || !outPath || !existsSync(outPath)) return { lines, changed: sourceLines.length }
  const written = readFileSync(outPath, "utf8").split("\n")
  if (written.length !== recorded.lines.length) return { lines, changed: sourceLines.length }
  const hashes = sourceLines.map(hashOf)
  for (const [now, then] of commonRun(hashes, recorded.lines)) lines[now] = written[then]
  // a line still marked TODO is written again, as the dictionary may have it now;  one a person fixed stays
  for (const index of translated.todo.keys()) if (lines[index]?.includes(TODO_COMMENT)) lines[index] = undefined
  return { lines, changed: lines.filter((line) => line === undefined).length }
}

/** What marks a line still to translate, as `Translator` writes it. */
const TODO_COMMENT = "// TODO: translate"

/** Which source lines to keep (`lines`), and how many will be written. */
type LinePlan = { lines: Array<string | undefined>; changed: number }

/**
 * One source file's translation, as written:  its kept lines, and its new ones -- each new one that a fix-up fixed
 * before, from the record, as it was fixed (`--update` never asks for the same fix twice).
 */
function outputFor(
  file: SourceFile,
  translated: TranslatedFile,
  plan: LinePlan,
  path: string,
  fixes: RecordedFix[]
): TranslationOutput {
  const english = file.contents.split("\n")
  const written = new Set<number>()
  const reused = new Set<number>()
  const lines = plan.lines.map((kept, index) => {
    if (kept !== undefined) return kept
    written.add(index)
    const mechanical = translated.lines[index]!
    const fixed = fixes.find(
      (fix) => fix.path === file.path && fix.source === hashOf(english[index]!) && fix.mechanical === mechanical
    )
    if (!fixed) return mechanical
    reused.add(index)
    return fixed.fixed
  })
  return { file, translated, path, lines, english, written, reused }
}

/** One file of the translation:  where it goes, its lines, and which of them were written this run. */
type TranslationOutput = {
  /** Its source. */
  file: SourceFile
  /** What the writer made of it. */
  translated: TranslatedFile
  /** Its path in the translation, `/Carta.es.spell`. */
  path: string
  /** Its lines, as on disk. */
  lines: string[]
  /** Its source's lines. */
  english: string[]
  /** The lines written this run, by index:  the rest were kept (`--update`). */
  written: Set<number>
  /** The lines written this run from a fix the record has. */
  reused: Set<number>
}

/**
 * The names the lines to write lack, each once:  comments and JSX texts too.
 * - A statement over several lines (JSX) counts when any of its lines is to be written.
 */
function missingIn(files: TranslatedFile[], plans: LinePlan[]): MissingName[] {
  const seen = new Set<string>()
  const missing: MissingName[] = []
  files.forEach((file, at) => {
    for (const [index, names] of file.missing) {
      const lines = plans[at]!.lines.slice(index, index + (file.spans.get(index) ?? 1))
      if (!lines.includes(undefined)) continue
      for (const name of names) {
        const key = `${name.kind}:${name.words}`
        if (seen.has(key)) continue
        seen.add(key)
        missing.push(name)
      }
    }
  })
  return missing
}

/** Pairs of indexes, `[a's, b's]`, of the longest run of equal items `a` and `b` have in common, in order. */
function commonRun(a: string[], b: string[]): Array<[number, number]> {
  const lengths = Array.from({ length: a.length + 1 }, () => new Array<number>(b.length + 1).fill(0))
  for (let i = a.length - 1; i >= 0; i--) {
    for (let j = b.length - 1; j >= 0; j--) {
      lengths[i]![j] = a[i] === b[j] ? lengths[i + 1]![j + 1]! + 1 : Math.max(lengths[i + 1]![j]!, lengths[i]![j + 1]!)
    }
  }
  const pairs: Array<[number, number]> = []
  for (let i = 0, j = 0; i < a.length && j < b.length;) {
    if (a[i] === b[j]) pairs.push([i++, j++])
    else if (lengths[i + 1]![j]! >= lengths[i]![j + 1]!) i++
    else j++
  }
  return pairs
}

/** A source line's hash, as the record keeps it. */
function hashOf(line: string): string {
  return createHash("sha1").update(line).digest("hex").slice(0, 12)
}

////////////////
// ## Fixing up
////////////////

/**
 * Check the translation, and have `claude` fix each line that's wrong, a round at a time:  how it went at the end.
 * - Round 1 also takes each line the writer couldn't write, and each it flagged `risky` (word order);
 *   the later rounds, what's still wrong.
 * - Only lines written THIS run:  a kept line (`--update`) is a person's, or was fixed before.
 * - Each check also compares each line's compiled shape with its English's (`shapes`):
 *   a line that compiles to a different program is a problem too, "means something else".
 * - With no checker, one round, of the lines the writer flagged;  with `--no-ai`, a check and no fixes.
 * - SIDE EFFECT:  rewrites each file it fixes, and adds each fix to `fixes`, for the record.
 */
async function fixUp({
  source,
  outputs,
  outFolder,
  fixUps,
  fixes,
  ai,
  shapes
}: {
  source: TranslateSource
  outputs: TranslationOutput[]
  outFolder: string
  fixUps: FixUps
  fixes: RecordedFix[]
  ai: boolean
  shapes: ShapeCheck
}): Promise<CheckResult> {
  const check = source.checker?.(outFolder)
  const byPath = new Map(outputs.map((output) => [output.path, output]))
  const files = new Map<string, FixUpFile>(outputs.map((output) => [output.path, output]))
  const pairs = new Map(outputs.map((output) => [output.file.path, output.path]))
  let result: CheckResult = { problems: [], checks: 0 }
  for (let round = 0; ; round++) {
    if (check) result = withShapes(await check(), round + 1, shapes, source.files, pairs)
    const wanted = new Map<string, FixUpLine>()
    const want = (path: string, line: number, why: string) => {
      const output = byPath.get(path)
      if (!output?.written.has(line)) return
      const key = `${path}:${line}`
      const item = wanted.get(key) ?? { path, line, why: [] }
      if (!item.why.includes(why)) item.why.push(why)
      wanted.set(key, item)
    }
    for (const problem of result.problems) want(problem.path, problem.line, `${problem.source}:  ${problem.message}`)
    for (const output of outputs) {
      output.lines.forEach((line, index) => {
        if (line.includes(TODO_COMMENT)) want(output.path, index, "not translated yet")
      })
      if (round > 0) continue
      for (const [index, why] of output.translated.risky) {
        if (!output.reused.has(index)) want(output.path, index, `may read in the wrong order:  ${why}`)
      }
    }
    if (!ai || !wanted.size || round >= MAX_ROUNDS) return result
    const fixed = await fixUps.round([...wanted.values()], files)
    if (!fixed.length) return result
    for (const { path, line, text } of fixed) {
      const output = byPath.get(path)!
      const mechanical = output.translated.lines[line]!
      output.lines[line] = text
      const sourceHash = hashOf(output.english[line]!)
      const at = fixes.findIndex(
        (fix) => fix.path === output.file.path && fix.source === sourceHash && fix.mechanical === mechanical
      )
      const fix = { path: output.file.path, source: sourceHash, mechanical, fixed: text }
      if (at >= 0) fixes[at] = fix
      else fixes.push(fix)
    }
    for (const path of new Set(fixed.map((each) => each.path))) {
      writeFileSync(join(outFolder, path), byPath.get(path)!.lines.join("\n"))
    }
    if (!check) return result
  }
}

/** How many rounds of fix-ups, at most:  each one a `claude` call, and a check after. */
const MAX_ROUNDS = 3

/**
 * `checked` (one check's result) with the shape check's problems added:  each line of the translation whose
 * compiled shape differs from its English's (`ShapeCheck`), when the checker gave back the files it parsed.
 */
function withShapes(
  checked: Awaited<ReturnType<TranslationChecker>>,
  checks: number,
  shapes: ShapeCheck,
  sources: SourceFile[],
  pairs: Map<string, string>
): CheckResult {
  if (!checked.files) return { ...checked, checks }
  const mismatches = shapes.compare(sources, checked.files, pairs)
  const from = SP.Language.forFile(sources[0]?.path ?? "").name
  const problems: LineProblem[] = mismatches.map(({ path, line, difference }) => ({
    path,
    line,
    message: `${SHAPE_MESSAGE}:  the ${from} compiles to \`${difference.english}\`, this to \`${difference.translated}\``,
    source: "shape"
  }))
  return {
    ...checked,
    problems: [...checked.problems, ...problems],
    checks,
    shapes: { statements: shapes.statements, same: shapes.statements - mismatches.length }
  }
}

/** What the shape check says of a line that compiles to a different program than its English. */
const SHAPE_MESSAGE = "means something else (compiles to a different program)"

/**
 * How the last check went, and how many checks there were;
 * with how many statements the shape check compared, and how many had the same shape.
 */
type CheckResult = Awaited<ReturnType<TranslationChecker>> & {
  checks: number
  shapes?: { statements: number; same: number }
}

////////////////
// ## Files
////////////////

/**
 * Where `source`'s dictionary and record live:  beside it, `<Project>.<lang>.names.json5`, `.translated.json5`;
 * with `--cold`, in `--out`, so the project is never written to.
 */
function translationPaths(source: TranslateSource, to: SP.Language, options: TranslateOptions) {
  const folder = options.cold && options.out ? resolve(options.out) : source.folder
  const base = join(folder, `${source.projectName}.${to.lang}`)
  return { names: `${base}.names.json5`, record: `${base}.translated.json5` }
}

/**
 * Where the translation goes:  `--out`, else where the record says it went, else beside the project,
 * named as the dictionary names it (`Solitario`).
 */
function outFolderFor(
  source: TranslateSource,
  names: TranslationNames,
  options: TranslateOptions,
  record: TranslationRecord | undefined
): string {
  if (options.out) return resolve(options.out)
  if (record?.outFolder) return resolve(source.folder, record.outFolder)
  return join(dirname(source.folder), projectNameIn(names, source.projectName))
}

/**
 * What `--update` reads:  where the translation went, each source file's output file, a hash of each of its source
 * lines when last written, and each fix-up made.
 * - Its output has one line for each source line, so line `i` of one is line `i` of the other.
 */
type TranslationRecord = {
  /** The languages, from and to. */
  from: string
  to: string
  /** The translation's folder, from the project's. */
  outFolder?: string
  /** Each source file, by its path in the project, e.g. `/Card.spell`. */
  files: Record<string, { output: string; lines: string[] }>
  /** Each line a fix-up wrote:  used again for a line written the same way from the same source (`outputFor()`). */
  fixes?: RecordedFix[]
}

/** A fix-up, recorded:  the source file and line (its hash), what the writer wrote, and what `claude` fixed it to. */
type RecordedFix = { path: string; source: string; mechanical: string; fixed: string }

/** The record of what was just written. */
function recordOf(
  source: TranslateSource,
  outputs: TranslationOutput[],
  to: SP.Language,
  outFolder: string,
  fixes: RecordedFix[]
): TranslationRecord {
  const files = Object.fromEntries(
    outputs.map((output) => [
      output.file.path,
      { output: output.path, lines: output.file.contents.split("\n").map(hashOf) }
    ])
  )
  return {
    from: SP.Language.forFile(source.files[0]?.path ?? "").lang,
    to: to.lang,
    outFolder: relative(source.folder, outFolder),
    files,
    fixes
  }
}

/**
 * The name of the project in the other language:  the dictionary's for its name, capitalized as it was --
 * `Solitaire` => `Solitario`;  `<Project>-<lang>` while the dictionary lacks it.
 */
function projectNameIn(names: TranslationNames, projectName: string): string {
  const translated = nameIn(names, projectName)
  return translated ?? `${projectName}-${names.to.lang}`
}

/** `/Card.spell` in the other language:  `/Carta.es.spell`, by the dictionary's word for `card`. */
function outputPathFor(path: string, names: TranslationNames, to: SP.Language): string {
  const stem = basename(path).replace(/(\.[a-z]{2})?\.spell$/, "")
  return `/${nameIn(names, stem) ?? stem}.${to.lang}.spell`
}

/**
 * `name` (a file's or project's, `Card`) in the other language, written as one word, its words capitalized:
 * the dictionary's type or name for it (`carta` => `Carta`, `pila de reserva` => `PilaDeReserva`).
 */
function nameIn(names: TranslationNames, name: string): string | undefined {
  const words = name.replace(/(?<=\p{Ll})(?=\p{Lu})/gu, " ").toLowerCase()
  const { types, names: others } = names.data
  const found = types[words]?.name ?? others[words]
  if (!found || found === TranslationNames.TODO) {
    names.missing.push({ kind: "names", words })
    return undefined
  }
  return found
    .split(/\s+/)
    .map((word, at) =>
      at === 0 || !/^(de|del|el|la|los|las)$/.test(word) ? word[0]!.toUpperCase() + word.slice(1) : word
    )
    .join("")
    .replace(/ /g, "")
}

/**
 * Write the project file:  its files renamed, its title the project's new name, its description translated if known,
 * and each import that has a translation of its own pointing at it.
 */
function writeManifest(
  source: TranslateSource,
  outFolder: string,
  names: TranslationNames,
  outName: string,
  outputs: TranslationOutput[]
): void {
  const manifestPath = join(source.folder, SP.PROJECT_FILE)
  if (!existsSync(manifestPath)) return
  const manifest = readJSON5File<ProjectManifest>(manifestPath)
  const renamed = new Map<string, string>(outputs.map((output) => [output.file.path, output.path]))
  for (const imported of source.imports ?? []) {
    if (imported.translatedPath) renamed.set(imported.path, imported.translatedPath)
  }
  manifest.title = outName
  if (manifest.description) manifest.description = names.data.texts[manifest.description] ?? manifest.description
  manifest.imports = manifest.imports?.map((file) => ({ ...file, path: renamed.get(file.path) ?? file.path }))
  writeFileSync(join(outFolder, SP.PROJECT_FILE), `${JSON.stringify(manifest, null, 2)}\n`)
}

/** What a project file holds that a translation changes:  its title, its description, its files' names. */
type ProjectManifest = { title?: string; description?: string; imports?: Array<{ path: string }> }

/**
 * Copy the project's other files, e.g. `styles.css`:  never its spell, its builds, its snapshots or our own files.
 * - A style sheet's selectors in the other language (`ElementNames.translateStyles()`):
 *   `ui-item[type="header"]` => `es-elemento[tipo="encabezado"]`.
 */
function copyOtherFiles(folder: string, outFolder: string, elements: ElementNames): void {
  for (const name of readdirSync(folder)) {
    const path = join(folder, name)
    if (!statSync(path).isFile() || NOT_COPIED.test(name)) continue
    const text = readFileSync(path, "utf8")
    writeFileSync(join(outFolder, name), name.endsWith(".css") ? elements.translateStyles(text) : text)
  }
}

/** The files a translation never copies:  spell, the project file, what compiling writes, snapshots, our own. */
const NOT_COPIED =
  /\.spell$|^__project\.json5$|^project\.json$|\.declarations\.json5$|\.[a-z]{2}\.js$|\.snapshot\.|\.names\.json5$|\.translated\.json5$/

////////////////
// ## Asking claude
////////////////

/**
 * How `pass` asks:  its tier, from its own flag (`--names-effort`), else `--effort`, else `balanced`;
 * and the exact model and effort `--model <model>[:<effort>]` passes through, in the runner's own terms.
 * - throws `CliError` for a tier there isn't
 */
export function askingFor(
  options: TranslateOptions,
  pass: AskingPass
): Required<Pick<ClaudeOptions, "pass" | "tier">> & Pick<ClaudeOptions, "model" | "effort"> {
  const tier = options[`${pass}Effort`] ?? options.effort ?? "balanced"
  if (!TIERS.includes(tier as EffortTier)) {
    throw new CLI.CliError(`No effort '${tier}':  try ${TIERS.join(", ")}`)
  }
  const [model, effort] = (options.model ?? "").split(":")
  return {
    pass,
    tier: tier as EffortTier,
    ...(model ? { model } : {}),
    ...(effort ? { effort: effort as ClaudeEffort } : {})
  }
}

/** The tiers `--effort` takes, quickest first. */
const TIERS: EffortTier[] = ["fast", "balanced", "best"]

/**
 * `run`, asked as `asking` says:  the pass and its tier, for the runner to map to its own model and effort;
 * over the model and effort the pass itself names, which the tier replaces.
 */
function withTier(run: ClaudeRunner, asking: ReturnType<typeof askingFor>): ClaudeRunner {
  return (prompt, options) => run(prompt, { ...options, model: undefined, effort: undefined, ...asking })
}

/** The language pack's glossary, `languages/<lang>/GLOSSARY.md`, if it has one. */
function glossaryFor(lang: string): string | undefined {
  const path = join(LANGUAGES_FOLDER, lang, "GLOSSARY.md")
  return existsSync(path) ? readFileSync(path, "utf8") : undefined
}

/** The language pack's names glossary, `languages/<lang>/glossary.json5`:  see `NamesGlossary`. */
function glossaryFileFor(lang: string): string {
  return join(LANGUAGES_FOLDER, lang, "glossary.json5")
}

/** spell's language packs' folder. */
const LANGUAGES_FOLDER = fileURLToPath(new URL("../spell/languages/", import.meta.url))

////////////////
// ## Learning
////////////////

/**
 * `--learn`, from `source`'s dictionary into the shared glossary (`settings.glossaryFile`):  `learn()`.
 * - throws `CliError` with `--cold`, which never writes the glossary
 */
function learnFrom(
  source: TranslateSource,
  options: TranslateOptions,
  { glossaryFile = glossaryFileFor(options.to) }: TranslateSettings
): number {
  if (options.cold) checkCold(options)
  const { from, to } = languagesOf(source, options)
  const paths = translationPaths(source, to, options)
  const names = new TranslationNames(existsSync(paths.names) ? readJSON5File<NamesData>(paths.names) : {}, { from, to })
  const shared = new NamesGlossary(existsSync(glossaryFile) ? readJSON5File<GlossaryData>(glossaryFile) : {})
  return learn(source, names, shared, paths.names, glossaryFile)
}

/**
 * `--learn`:  add `source`'s dictionary (`names`, from `namesPath`) to the shared glossary, and write it:
 * every project after it gets the same names.
 * - Prints how many it added, and each name it kept because the glossary's own source is as good or better.
 * - throws `CliError` if the project has no dictionary yet:  translate it first
 */
function learn(
  source: TranslateSource,
  names: TranslationNames,
  shared: NamesGlossary,
  namesPath: string,
  glossaryFile: string
): number {
  if (!existsSync(namesPath)) {
    throw new CLI.CliError(`${source.projectName} has no ${basename(namesPath)} to learn from:  translate it first`)
  }
  const { added, kept } = shared.learn(names, source.projectName)
  writeFileSync(glossaryFile, keepingCommentsIn(glossaryFile, `${JSON.stringify(shared.toJSON(), null, 2)}\n`))
  CLI.out(
    `${source.projectName}'s names in the ${names.to.name} glossary:  ${added} added, ${CLI.relativePath(glossaryFile)}`
  )
  for (const each of kept) CLI.out(`  ${each}`)
  return CLI.EXIT.OK
}

////////////////
// ## Reporting
////////////////

/** How long each pass took, in milliseconds. */
type Timings = { names?: number; lines?: number; fixUps?: number; total?: number }

/**
 * Print what was done, and what's left for a person (unless `print` is `false`);  what it did, in numbers.
 * - Says what it started from (`lists`):  nothing, cold, or the glossary, the dictionary, the record.
 */
function report(done: {
  source: TranslateSource
  to: SP.Language
  outFolder: string
  translated: ReturnType<typeof translateAll>
  outputs: TranslationOutput[]
  plans: LinePlan[]
  seeded: number
  drafted: number
  fromGlossary: number
  differences: string[]
  paths: { names: string; record: string }
  timings: Required<Timings>
  checked: CheckResult
  calls: { names: Array<{ stage: NamesStage; ms: number }>; fixUps: number[]; via: string }
  notes: string[]
  lists: TranslationLists
  agreement?: TranslationResult["agreement"]
  print: boolean
}): TranslationResult {
  const { source, to, outFolder, translated, outputs, plans, seeded, drafted, paths, timings, checked, calls } = done
  const out = done.print ? CLI.out : (_text: string) => {}
  const err = done.print ? CLI.err : (_text: string) => {}
  const seconds = (ms = 0) => `${(ms / 1000).toFixed(ms < 1000 ? 2 : 1)}s`
  const lines = source.files.reduce((sum, file) => sum + file.contents.split("\n").length, 0)
  const written = plans.reduce((sum, plan) => sum + plan.changed, 0)
  out(
    `${source.projectName} in ${to.name}:  ${CLI.relativePath(outFolder)}  (${source.files.length} files, ${seconds(timings.total)})`
  )
  out(`  ${written} of ${lines} lines translated${written < lines ? ", the rest unchanged since the last run" : ""}`)
  out(
    `  names:  ${CLI.relativePath(paths.names)}` +
      (seeded ? `, ${seeded} seeded` : "") +
      (done.fromGlossary ? `, ${done.fromGlossary} from the glossary` : "") +
      (drafted ? `, ${drafted} drafted by claude:  review them` : "")
  )
  out(`  pre-calculated:  ${listsLine(done.lists, to)}`)
  const fixed = outputs.reduce(
    (sum, output) =>
      sum + output.lines.filter((line, at) => line !== output.translated.lines[at] && output.written.has(at)).length,
    0
  )
  const each = (durations: number[]) => (durations.length ? ` (${durations.map((ms) => seconds(ms)).join(", ")})` : "")
  const plural = (count: number, word: string) => `${count} ${word}${count === 1 ? "" : "s"}`
  out(
    `  passes:  names ${seconds(timings.names)}, lines ${seconds(timings.lines)}, fix-ups ${seconds(timings.fixUps)}` +
      ` (${plural(fixed, "line")} fixed in ${plural(calls.fixUps.length, "round")}, ${plural(checked.checks, "check")})`
  )
  const stage = (name: NamesStage) => calls.names.filter((call) => call.stage === name).map(({ ms }) => ms)
  const namesCalls = (["types", "names", "again"] as const)
    .filter((name) => stage(name).length)
    .map((name) => `${name} ${stage(name).length}${each(stage(name))}`)
  out(
    `  ${calls.via}:  ${calls.names.length + calls.fixUps.length} calls:  ` +
      [...namesCalls, `fix-ups ${calls.fixUps.length}${each(calls.fixUps)}`].join(", ")
  )
  const { tests, shapes } = checked
  if (tests && tests.passed + tests.failed) out(`  tests:  ${tests.passed} passed, ${tests.failed} failed`)
  if (shapes) {
    const from = SP.Language.forFile(source.files[0]?.path ?? "").name
    out(`  shape:  ${shapes.same} of ${shapes.statements} statements compile to the same program as the ${from}`)
  }
  const { agreement } = done
  if (agreement) {
    out(`  agreement:  ${agreement.same} of ${agreement.compared} drafted names are the person's translation's`)
  }
  if (done.differences.length) {
    out(`  ${plural(done.differences.length, "name")} chosen otherwise than the ${to.name} glossary:`)
    for (const difference of done.differences) out(`    ${difference}`)
  }
  for (const note of done.notes) err(`  ${note}`)
  const todo = outputs.flatMap((output) =>
    output.lines.flatMap((line, index) => {
      if (!line.includes(TODO_COMMENT) || !output.written.has(index)) return []
      // a statement over several lines (JSX) says so on its last:  its why is its first line's
      const from = [...output.translated.todo.keys()].filter((at) => at <= index).at(-1)
      return [{ output, index, why: (from !== undefined && output.translated.todo.get(from)) || [] }]
    })
  )
  if (todo.length) {
    out(`  ${todo.length} lines still need a person, marked // TODO: translate:`)
    for (const { output, index, why } of todo) out(`    ${output.path.slice(1)}:${index + 1}  ${why.join(", ")}`)
  }
  if (checked.problems.length) {
    out(`  ${checked.problems.length} problems left:`)
    for (const problem of checked.problems) out(`    ${problemLine(problem)}`)
  }
  if (translated.untranslatable.size) {
    const rules = [...translated.untranslatable].map(([rule, count]) => `${rule} (${count})`)
    out(`  rules it can't write yet:  ${rules.join(", ")}`)
  }
  const problemsBy = (by: LineProblem["source"]) => checked.problems.filter((problem) => problem.source === by).length
  return {
    exitCode: todo.length || checked.problems.length ? CLI.EXIT.ERRORS : CLI.EXIT.OK,
    projectName: source.projectName,
    to: to.lang,
    outFolder,
    lists: done.lists,
    via: calls.via,
    timings,
    calls: { names: calls.names.length, fixUps: calls.fixUps.length },
    lines: { total: lines, written, fixed },
    names: { seeded, fromGlossary: done.fromGlossary, drafted },
    todo: todo.length,
    problems: { lint: problemsBy("lint"), test: problemsBy("test"), shape: problemsBy("shape") },
    ...(tests ? { tests: { passed: tests.passed, failed: tests.failed } } : {}),
    ...(shapes ? { shape: shapes } : {}),
    ...(agreement ? { agreement } : {})
  }
}

/**
 * What a translation started from, for the report:
 * `none (--cold)`, or `the Spanish glossary (812 names), the project's dictionary (120 names)` ...
 */
function listsLine(lists: TranslationLists, to: SP.Language): string {
  if (lists.cold) return "none (--cold)"
  const used = [`the ${to.name} glossary (${lists.glossary} names)`]
  if (lists.dictionary) used.push(`the project's dictionary (${lists.dictionary} names)`)
  if (lists.fixes) used.push(`the record's fix-ups (${lists.fixes})`)
  if (lists.seeded) used.push("--seed's translation")
  return used.join(", ")
}

/**
 * Of the names Claude drafted (`drafted`:  its types, names and phrases), how many `reference`'s (a person's
 * translation of `files`) has, and how many of those are the same word, ignoring case.
 * - The person's names read from their translation, line by line, as `--seed` reads them (`NamesSeeder`).
 */
function agreementOf(
  names: TranslationNames,
  drafted: MissingName[],
  files: SourceFile[],
  reference: SourceFile[]
): TranslationResult["agreement"] {
  const theirs = new TranslationNames({}, { from: names.from, to: names.to })
  new NamesSeeder(theirs).seed(files, reference)
  const nameIn = (dictionary: TranslationNames, kind: NamesKind, words: string) => {
    const value = kind === "types" ? dictionary.data.types[words]?.name : dictionary.data[kind][words]
    return value && value !== TranslationNames.TODO ? value.toLowerCase() : undefined
  }
  let same = 0
  let compared = 0
  for (const { kind, words } of drafted) {
    if (!AGREEING.includes(kind)) continue
    const ours = nameIn(names, kind, words)
    const person = nameIn(theirs, kind, words)
    if (!ours || !person) continue
    compared++
    if (ours === person) same++
  }
  return { same, compared }
}

/** The names `agreementOf()` compares:  texts and comments are sentences, rarely word for word the same. */
const AGREEING: NamesKind[] = ["types", "names", "phrases"]

/** `problem` on one line:  `Carta.es.spell:142  test:  ...`. */
function problemLine({ path, line, source, message }: LineProblem): string {
  return `${path.slice(1)}:${line + 1}  ${source}:  ${message.split("\n")[0]}`
}
