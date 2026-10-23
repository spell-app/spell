/**
 * `spell parser translate <project> --to es`'s work, once the project is parsed (epic `spanish` P24):
 * read its names dictionary, translate each file (`SP`'s `Translator`), ask `claude -p` for the names it lacks,
 * and write the project in the other language.
 * - spell-app's `translateCommand` finds and parses the project, the app's way (an address, a folder), and hands it here:
 *   so this file needs no project groups, only parsed files.
 * - Beside the project, two files of its own:
 *   - `<Project>.<lang>.names.json5`:  its names dictionary, for a person to review (`TranslationNames`)
 *   - `<Project>.<lang>.translated.json5`:  what each source line was when it was last translated, a hash per line,
 *     so `--update` re-translates only the lines changed since
 * - Loaded only when it runs (`commands.ts` imports the hook's work dynamically):  it loads all of spell.
 */
import { spawnSync } from "node:child_process"
import { createHash } from "node:crypto"
import { copyFileSync, existsSync, mkdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs"
import { basename, dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

import { keepingCommentsIn, readJSON5File } from "spell/util/node/json5"
import { CLI } from "spell/cli"
import { SP } from "spell-parser/spell"
import type { TranslateOptions } from "spell-parser/cli"
import { NamesSeeder } from "spell-parser/spell/translate/NamesSeeder"
import { NAMES_KINDS, TranslationNames } from "spell-parser/spell/translate/TranslationNames"
import { Translator } from "spell-parser/spell/translate/Translator"
import type { MissingName, NamesData, SourceFile, TranslatedFile } from "spell-parser/spell/translate/translate.types"

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
}

/**
 * Translate `source` into language `options.to`, and write it:  see the file's docstring.
 * - Returns the exit code:  `EXIT.ERRORS` if any line still needs a person (`// TODO: translate`).
 * - Throws `CliError` for a language it doesn't know, or the language the project is already in.
 */
export async function translateProject(source: TranslateSource, options: TranslateOptions): Promise<number> {
  const started = performance.now()
  const from = SP.Language.forFile(source.files[0]?.path ?? "")
  if (!SP.Language.all.has(options.to)) {
    throw new CLI.CliError(`No language pack '${options.to}':  try ${[...SP.Language.all.keys()].join(", ")}`)
  }
  const to = SP.Language.for(options.to)
  if (to === from) throw new CLI.CliError(`${source.projectName} is in ${to.name} already`)

  const paths = translationPaths(source, to)
  const names = new TranslationNames(existsSync(paths.names) ? readJSON5File<NamesData>(paths.names) : {}, { from, to })
  const seeded = source.seed ? new NamesSeeder(names).seed(source.files, source.seed) : 0
  const record = options.update && existsSync(paths.record) ? readJSON5File<TranslationRecord>(paths.record) : undefined

  let translated = translateAll(source, from, to, names)
  const outName = projectNameIn(names, source.projectName)
  const outFolder = resolve(options.out ?? join(dirname(source.folder), outName))
  const plans = source.files.map((file, at) => linePlan(file, translated.files[at]!, record, outFolder))

  // the names the lines to write lack:  asked for once, then saved
  const missing = missingIn(translated.files, plans)
  let drafted = 0
  if (missing.length && options.ai !== false) {
    drafted = draftNames(missing, names, source, to)
    translated = translateAll(source, from, to, names)
  }
  names.markTodo(missingIn(translated.files, plans).filter(({ kind }) => kind !== "comments"))

  // write the project, its dictionary and its record
  mkdirSync(outFolder, { recursive: true })
  const outputs = source.files.map((file, at) => {
    const output = outputPathFor(file.path, names, to)
    const lines = plans[at]!.lines.map((old, index) => old ?? translated.files[at]!.lines[index]!)
    writeFileSync(join(outFolder, output), lines.join("\n"))
    return { output, lines }
  })
  writeManifest(
    source,
    outFolder,
    names,
    outName,
    outputs.map(({ output }) => output)
  )
  copyOtherFiles(source.folder, outFolder)
  writeFileSync(paths.names, keepingCommentsIn(paths.names, `${JSON.stringify(names.toJSON(), null, 2)}\n`))
  writeFileSync(paths.record, `${JSON.stringify(recordOf(source, outputs, to), null, 2)}\n`)

  return report({ source, to, outFolder, translated, plans, seeded, drafted, names, started, paths })
}

////////////////
// ## Translating
////////////////

/** Every file of `source`, translated with `names`;  and the rules none could write. */
function translateAll(source: TranslateSource, from: SP.Language, to: SP.Language, names: TranslationNames) {
  const translator = new Translator({ from, to, names })
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

/** The names the lines to write lack, each once:  comments and JSX texts too. */
function missingIn(files: TranslatedFile[], plans: LinePlan[]): MissingName[] {
  const seen = new Set<string>()
  const missing: MissingName[] = []
  files.forEach((file, at) => {
    for (const [index, names] of file.missing) {
      if (plans[at]!.lines[index] !== undefined) continue
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
// ## Files
////////////////

/** Where `source`'s dictionary and record live:  beside it, `<Project>.<lang>.names.json5`, `.translated.json5`. */
function translationPaths(source: TranslateSource, to: SP.Language) {
  const base = join(source.folder, `${source.projectName}.${to.lang}`)
  return { names: `${base}.names.json5`, record: `${base}.translated.json5` }
}

/**
 * What `--update` reads:  each source file's output file, and a hash of each of its source lines when last written.
 * - Its output has one line for each source line, so line `i` of one is line `i` of the other.
 */
type TranslationRecord = {
  /** The languages, from and to. */
  from: string
  to: string
  /** Each source file, by its path in the project, e.g. `/Card.spell`. */
  files: Record<string, { output: string; lines: string[] }>
}

/** The record of what was just written. */
function recordOf(source: TranslateSource, outputs: Array<{ output: string }>, to: SP.Language): TranslationRecord {
  const files = Object.fromEntries(
    source.files.map((file, at) => [
      file.path,
      { output: outputs[at]!.output, lines: file.contents.split("\n").map(hashOf) }
    ])
  )
  return { from: SP.Language.forFile(source.files[0]?.path ?? "").lang, to: to.lang, files }
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

/** Write the project file:  its files renamed, its title the project's new name, its description translated if known. */
function writeManifest(
  source: TranslateSource,
  outFolder: string,
  names: TranslationNames,
  outName: string,
  outputs: string[]
): void {
  const manifestPath = join(source.folder, SP.PROJECT_FILE)
  if (!existsSync(manifestPath)) return
  const manifest = readJSON5File<ProjectManifest>(manifestPath)
  const renamed = new Map(source.files.map((file, at) => [file.path, outputs[at]!]))
  manifest.title = outName
  if (manifest.description) manifest.description = names.data.texts[manifest.description] ?? manifest.description
  manifest.imports = manifest.imports?.map((file) => ({ ...file, path: renamed.get(file.path) ?? file.path }))
  writeFileSync(join(outFolder, SP.PROJECT_FILE), `${JSON.stringify(manifest, null, 2)}\n`)
}

/** What a project file holds that a translation changes:  its title, its description, its files' names. */
type ProjectManifest = { title?: string; description?: string; imports?: Array<{ path: string }> }

/** Copy the project's other files as they are, e.g. `styles.css`:  never its spell, its builds or our own files. */
function copyOtherFiles(folder: string, outFolder: string): void {
  for (const name of readdirSync(folder)) {
    const path = join(folder, name)
    if (!statSync(path).isFile() || NOT_COPIED.test(name)) continue
    copyFileSync(path, join(outFolder, name))
  }
}

/** The files a translation never copies:  spell, the project file, what compiling writes, our own. */
const NOT_COPIED =
  /\.spell$|^__project\.json5$|^project\.json$|\.declarations\.json5$|\.[a-z]{2}\.js$|\.names\.json5$|\.translated\.json5$/

////////////////
// ## Asking claude
////////////////

/**
 * Draft the names `missing` with `claude -p`, into `names`:  how many it added.
 * - A name spell can't read (`unreadableName()`) is asked for again, once, saying why;  still unreadable, it stays TODO.
 */
function draftNames(missing: MissingName[], names: TranslationNames, source: TranslateSource, to: SP.Language): number {
  let drafts = askClaude(missing, names, source, to)
  const rejected = rejectUnreadable(drafts, to)
  if (rejected.length) {
    const again = askClaude(
      rejected.map(({ name }) => name),
      names,
      source,
      to,
      rejected.map(({ why }) => why)
    )
    rejectUnreadable(again, to)
    drafts = mergedDrafts(drafts, again)
  }
  return names.merge(drafts)
}

/** Take each name out of `drafts` that spell can't read as one name, saying why. */
function rejectUnreadable(drafts: NamesData, to: SP.Language): Array<{ name: MissingName; why: string }> {
  const rejected: Array<{ name: MissingName; why: string }> = []
  for (const kind of ["names", "phrases"] as const) {
    const section = drafts[kind] ?? {}
    for (const [words, value] of Object.entries(section)) {
      const why = unreadableName(value, kind, to)
      if (!why) continue
      delete section[words]
      rejected.push({ name: { kind, words }, why: `\`${words}\` => \`${value}\`:  ${why}` })
    }
  }
  return rejected
}

/**
 * Why spell can't read `value` as a name of section `kind` in `to`, if it can't:
 * - a name holding one of the language's small words (`de`, `en`, `y`):  `carta de prueba` reads as `carta` of `prueba`
 * - a phrase with `it` (`eso`) not straight after its verb:  `dar vuelta eso`
 */
function unreadableName(value: string, kind: "names" | "phrases", to: SP.Language): string | undefined {
  const words = value.split(/\s+/)
  if (kind === "names") {
    const small = words.find(
      (word) => to.words.memberStopWords.has(word.toLowerCase()) || to.words.blacklist[word.toLowerCase()]
    )
    return small && words.length > 1 ? `holds \`${small}\`, one of spell's own words` : undefined
  }
  const it = words.findIndex((word, at) => at > 0 && to.words.itWords?.has(word))
  return it > 1
    ? `\`${words[it]}\` must come straight after the verb, e.g. \`voltear ${words[it]} boca arriba\``
    : undefined
}

/** `first` with `second`'s names added. */
function mergedDrafts(first: NamesData, second: NamesData): NamesData {
  return Object.fromEntries(NAMES_KINDS.map((kind) => [kind, { ...first[kind], ...second[kind] }]))
}

/**
 * Ask `claude -p` for the names `missing`, once, all together:  what it answers, as dictionary sections.
 * - `rejected`:  drafts it gave before that spell can't read, and why, for it to do better.
 * - It sees the project's source, the names already chosen (to stay consistent) and the language's glossary.
 * - A `claude` that fails, or answers what won't read as JSON, gives nothing:  the names stay `TODO`, said on stderr.
 * - SIDE EFFECT:  runs `claude`;  it must be on the `PATH`, signed in.
 */
function askClaude(
  missing: MissingName[],
  names: TranslationNames,
  source: TranslateSource,
  to: SP.Language,
  rejected: string[] = []
): NamesData {
  const prompt = namesPrompt(missing, names, source, to, rejected)
  const result = spawnSync("claude", ["-p"], { input: prompt, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 })
  if (result.error || result.status !== 0) {
    CLI.err(`claude couldn't draft the names:  ${result.error?.message ?? result.stderr}`)
    return {}
  }
  const json = result.stdout.match(/```(?:json5?)?\n([\s\S]*?)```/)?.[1] ?? result.stdout
  try {
    const answer = JSON.parse(json.slice(json.indexOf("{"), json.lastIndexOf("}") + 1)) as NamesData
    return Object.fromEntries(NAMES_KINDS.map((kind) => [kind, answer[kind] ?? {}]))
  } catch {
    CLI.err("claude's names aren't JSON:  left them TODO")
    return {}
  }
}

/** What `claude` is asked:  see `askClaude()`. */
function namesPrompt(
  missing: MissingName[],
  names: TranslationNames,
  source: TranslateSource,
  to: SP.Language,
  rejected: string[]
): string {
  const wanted = Object.fromEntries(
    NAMES_KINDS.map((kind) => [
      kind,
      Object.fromEntries(missing.filter((name) => name.kind === kind).map(({ words }) => [words, ""]))
    ])
  )
  const { comments: _comments, ...chosen } = names.toJSON()
  const program = source.files.map((file) => `### ${file.path}\n\`\`\`spell\n${file.contents}\n\`\`\``).join("\n\n")
  const glossary = glossaryFor(to.lang)
  return [
    `Translate the names the people who wrote a spell program chose, from English into ${to.name} (\`${to.lang}\`).`,
    "Spell reads programs written in plain words;  its own words are already translated.",
    "Fill in every empty value below, and answer with ONE JSON object with the same keys, in a ```json fence:",
    '- `types`:  each type\'s name, singular, as `{ "name": "...", "gender": "masculine" | "feminine" }`',
    "- `names`:  each property, variable, value or event, as written (a plural stays plural)",
    `  - NEVER with one of spell's own small words inside, which end a name:  ${smallWords(to)}`,
    "    e.g. `test card` => `candidata`, not `carta de prueba`;  one word is best",
    "- `phrases`:  a method's or quoted phrase's words, as declared:",
    `  - keep each \`(slot)\`, its words translated as \`names\` translates them;  write \`it\` as \`${[...(to.words.itWords ?? ["it"])][0]}\`,`,
    "    straight after the verb:  `turn it face up` => `voltear eso boca arriba`, `turn it over` => `voltear eso`",
    "  - keep each `a <type>` as the type's name with its article, e.g. `a card` => `una carta`",
    "- `texts`:  quoted text people see:  keep its spaces, punctuation and symbols",
    "- `comments`:  the program's comments:  keep their code (in backticks) as the translated program says it",
    "Use the names already chosen, so the whole program reads as one language.",
    "",
    ...(rejected.length
      ? ["## Your drafts spell can't read:  try again", ...rejected.map((why) => `- ${why}`), ""]
      : []),
    "## To fill in",
    "```json",
    JSON.stringify(wanted, null, 2),
    "```",
    "",
    "## Names already chosen",
    "```json",
    JSON.stringify(chosen, null, 2),
    "```",
    "",
    "## The program",
    program,
    ...(glossary ? ["", `## The ${to.name} glossary:  spell's own words`, glossary] : [])
  ].join("\n")
}

/** The language's small words a name may not hold, for the prompt:  its `memberStopWords`. */
function smallWords(to: SP.Language): string {
  return [...to.words.memberStopWords].map((word) => `\`${word}\``).join(", ")
}

/** The language pack's glossary, `languages/<lang>/GLOSSARY.md`, if it has one. */
function glossaryFor(lang: string): string | undefined {
  const path = join(LANGUAGES_FOLDER, lang, "GLOSSARY.md")
  return existsSync(path) ? readFileSync(path, "utf8") : undefined
}

/** spell's language packs' folder. */
const LANGUAGES_FOLDER = fileURLToPath(new URL("../spell/languages/", import.meta.url))

////////////////
// ## Reporting
////////////////

/** Print what was done, and what's left for a person;  the exit code. */
function report(done: {
  source: TranslateSource
  to: SP.Language
  outFolder: string
  translated: ReturnType<typeof translateAll>
  plans: LinePlan[]
  seeded: number
  drafted: number
  names: TranslationNames
  started: number
  paths: { names: string; record: string }
}): number {
  const { source, to, outFolder, translated, plans, seeded, drafted, started, paths } = done
  const seconds = ((performance.now() - started) / 1000).toFixed(2)
  const lines = source.files.reduce((sum, file) => sum + file.contents.split("\n").length, 0)
  const written = plans.reduce((sum, plan) => sum + plan.changed, 0)
  CLI.out(
    `${source.projectName} in ${to.name}:  ${CLI.relativePath(outFolder)}  (${source.files.length} files, translated in ${seconds}s)`
  )
  CLI.out(
    `  ${written} of ${lines} lines translated${written < lines ? ", the rest unchanged since the last run" : ""}`
  )
  CLI.out(
    `  names:  ${CLI.relativePath(paths.names)}` +
      (seeded ? `, ${seeded} seeded` : "") +
      (drafted ? `, ${drafted} drafted by claude:  review them` : "")
  )
  const todo = translated.files.flatMap((file, at) =>
    [...file.todo]
      .filter(([index]) => plans[at]!.lines[index] === undefined)
      .map(([index, why]) => ({ file, index, why }))
  )
  if (todo.length) {
    CLI.out(`  ${todo.length} lines still need a person, marked // TODO: translate:`)
    for (const { file, index, why } of todo) CLI.out(`    ${file.path.slice(1)}:${index + 1}  ${why.join(", ")}`)
  }
  if (translated.untranslatable.size) {
    const rules = [...translated.untranslatable].map(([rule, count]) => `${rule} (${count})`)
    CLI.out(`  rules it can't write yet:  ${rules.join(", ")}`)
  }
  return todo.length ? CLI.EXIT.ERRORS : CLI.EXIT.OK
}
