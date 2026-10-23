/**
 * `spell parser packs check|fix`:  is a language pack complete, against English?
 * - `fix` writes stubs for what it lacks (epic `spanish` P7).
 * - The checking and the stub writing are `spell-parser/spell/languages/packs` (node-free, on text);
 *   this file reads and writes the rule files, asks `claude` for drafts, and prints.
 * - Their work is HERE, not behind spell-app's `"language"` hook:  it needs no project, only spell-parser's own files.
 * - Loaded only when one of them runs (`commands.ts` imports it dynamically):  it loads all of spell.
 */
import { spawnSync } from "node:child_process"
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs"
import { join } from "node:path"
import { fileURLToPath } from "node:url"

import { CLI } from "spell/cli"
import { SP } from "spell-parser/spell"
import type { PacksOptions } from "spell-parser/cli"
import {
  AI_MARKER,
  checkPack,
  fixPackModule,
  isModuleComplete,
  TODO_MARKER,
  type PackModuleSource,
  type PackReport,
  type PackSources,
  type PackStub
} from "spell-parser/spell/languages/packs"

/**
 * `spell parser packs check [lang]`:  print what each language's pack lacks, per file;  1 if anything does.
 * - `lang`:  one language, e.g. `es`;  none:  every pack but English
 */
export async function checkPacks(lang: string | undefined, options: PacksOptions = {}): Promise<number> {
  let isComplete = true
  for (const language of languagesFor(lang)) {
    const report = checkPack(packSources(language.lang), SP.english, language)
    if (options.json) CLI.out(JSON.stringify(reportData(report), undefined, 2))
    else printReport(report, language)
    isComplete &&= report.isComplete
  }
  return isComplete ? CLI.EXIT.OK : CLI.EXIT.ERRORS
}

/**
 * `spell parser packs fix [lang] [--ai]`:  write a stub into `<module>.<lang>.ts` for each registration it lacks, then
 * print the list to review.
 * - Each stub is English's, marked `// TODO: translate` -- see `fixPackModule()`.
 * - `--ai`:  ask `claude -p` for each one in the language, marked `// AI draft:  review` instead;
 *   one it can't translate stays a stub
 * - It fixes what's MISSING:  a registration without tests, or out of order, is still `check`'s to report.
 */
export async function fixPacks(lang: string | undefined, options: PacksOptions = {}): Promise<number> {
  const review: string[] = []
  for (const language of languagesFor(lang)) {
    const sources = packSources(language.lang)
    const glossary = glossaryFor(language.lang)
    const translate = options.ai ? claudeTranslator(language, glossary) : undefined
    for (const source of sources.modules) {
      const fix = fixPackModule(source, language.lang, translate)
      if (fix.stubs.length === 0) continue
      const path = join(RULES_FOLDER, fix.file)
      writeFileSync(path, fix.text)
      CLI.out(`${CLI.relativePath(path)}:  ${fix.stubs.length} written${fix.isNewFile ? ", a new file" : ""}`)
      if (fix.isNewFile) review.push(`${CLI.relativePath(path)}  import it into languages/${language.lang}/parser.ts`)
      review.push(...reviewLines(path, fix.text))
    }
  }
  if (review.length === 0) {
    CLI.out("Nothing missing:  no stubs written.")
    return CLI.EXIT.OK
  }
  CLI.out("\nTo review:")
  for (const line of review) CLI.out(`  ${line}`)
  CLI.out("\nThen:  spell parser packs check, and the module's rule tests (yarn spell:test:rules).")
  return CLI.EXIT.OK
}

////////////////
// ## Reading the rule files
////////////////

/** spell's rules folder:  a folder per rules module. */
const RULES_FOLDER = fileURLToPath(new URL("../spell/rules/", import.meta.url))

/** spell's language packs' folder:  a folder per language, e.g. `es/`, with its `GLOSSARY.md`. */
const LANGUAGES_FOLDER = fileURLToPath(new URL("../spell/languages/", import.meta.url))

/** Every rules module's text, with its `<module>.<lang>.ts`'s when it has one. */
export function packSources(lang: string): PackSources {
  const modules = readdirSync(RULES_FOLDER, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && existsSync(join(RULES_FOLDER, entry.name, `${entry.name}.en.ts`)))
    .map((entry) => moduleSource(entry.name, lang))
  return { lang, modules }
}

/** One module's text:  its English, its `lang`'s, and its rule files. */
function moduleSource(module: string, lang: string): PackModuleSource {
  const folder = join(RULES_FOLDER, module)
  const read = (file: string) => readFileSync(join(folder, file), "utf8")
  const otherFile = `${module}.${lang}.ts`
  const ruleFiles = Object.fromEntries(
    readdirSync(folder)
      .filter((file) => file.endsWith(".ts") && !NOT_RULE_FILE.test(file))
      .map((file) => [file, read(file)])
  )
  return {
    module,
    english: read(`${module}.en.ts`),
    other: existsSync(join(folder, otherFile)) ? read(otherFile) : undefined,
    ruleFiles
  }
}

/** A rules folder's file that holds no rule class:  a language's, its parser, its barrel. */
const NOT_RULE_FILE = /^index\.ts$|\.parser\.ts$|\.[a-z]{2}\.ts$/

/** The packs `lang` names, else every one but English. */
function languagesFor(lang: string | undefined): SP.Language[] {
  if (lang !== undefined) {
    if (lang === SP.english.lang) throw new CLI.CliError("English is what packs are checked against:  name another")
    try {
      return [SP.Language.for(lang)]
    } catch (error) {
      throw new CLI.CliError((error as Error).message)
    }
  }
  return [...SP.Language.all.values()].filter((language) => language !== SP.english)
}

/** Language `lang`'s glossary for translators, `languages/<lang>/GLOSSARY.md`;  `undefined` when there's none. */
function glossaryFor(lang: string): string | undefined {
  const path = join(LANGUAGES_FOLDER, lang, "GLOSSARY.md")
  return existsSync(path) ? readFileSync(path, "utf8") : undefined
}

////////////////
// ## Printing
////////////////

/** Print `report`:  a line per problem, under its file. */
function printReport(report: PackReport, language: SP.Language): void {
  const where = (line: number, file: string) => `${file}:${line}`
  for (const module of report.modules) {
    if (isModuleComplete(module)) continue
    const path = CLI.relativePath(join(RULES_FOLDER, module.file))
    const english = `${module.module}/${module.module}.en.ts`
    CLI.out(path + (module.hasFile ? "" : "  (no file)"))
    for (const it of module.missing) CLI.out(`  missing      ${it.key}  (${where(it.line, english)})`)
    for (const it of module.untested) CLI.out(`  no tests     ${it.key}  (line ${it.line})`)
    for (const it of module.noSyntax) CLI.out(`  no syntax    ${it.key}  (line ${it.line})`)
    for (const it of module.outOfOrder) CLI.out(`  out of order ${it.key}  (line ${it.line})`)
    for (const it of module.extra) CLI.out(`  (extra       ${it.key}  line ${it.line}:  English has no partner for it)`)
  }
  for (const it of report.unregistered) {
    CLI.out(`${CLI.relativePath(join(RULES_FOLDER, it.module, it.file))}`)
    CLI.out(`  unregistered ${it.ruleClass}  (no ${it.module}.en.ts registers it)`)
  }
  if (report.words.length > 0) {
    CLI.out(`${language.name}'s words`)
    for (const it of report.words) CLI.out(`  ${it.problem.padEnd(12)} ${it.table}:  ${it.key}`)
  }
  const modules = report.modules.length
  CLI.out(
    report.isComplete
      ? `${language.name} (${report.lang}):  complete, ${modules} modules`
      : `${language.name} (${report.lang}):  INCOMPLETE -- spell parser packs fix ${report.lang} writes stubs for what's missing`
  )
}

/** `report` as plain data, for `--json`:  each registration by its key and line. */
function reportData(report: PackReport) {
  const brief = (it: { key: string; line: number }) => ({ key: it.key, line: it.line })
  return {
    ...report,
    modules: report.modules.map((module) => ({
      ...module,
      missing: module.missing.map(brief),
      untested: module.untested.map(brief),
      noSyntax: module.noSyntax.map(brief),
      outOfOrder: module.outOfOrder.map(brief),
      extra: module.extra.map(brief)
    }))
  }
}

/** A `path:line  marker` line for each stub marker in `text`. */
function reviewLines(path: string, text: string): string[] {
  return text.split("\n").flatMap((line, index) => {
    if (line.startsWith(TODO_MARKER)) return [`${CLI.relativePath(path)}:${index + 2}  TODO: translate`]
    if (line.startsWith(AI_MARKER)) return [`${CLI.relativePath(path)}:${index + 2}  AI draft:  review`]
    return []
  })
}

////////////////
// ## Asking claude
////////////////

/**
 * A `PackTranslator` that asks the `claude` command (`claude -p`) to translate each stub into `language`.
 * - It sends the rule's class docstring, its English registration, the module's existing translations and the
 *   language's glossary;  it takes back ONE TypeScript statement.
 * - An answer that isn't a registration on the module's parser, or a `claude` that fails, keeps the stub, with a
 *   line on stderr.
 * - SIDE EFFECT:  runs `claude`, once per stub;  it must be on the `PATH`, signed in.
 */
function claudeTranslator(language: SP.Language, glossary: string | undefined) {
  return (stub: PackStub, source: PackModuleSource): string | undefined => {
    const prompt = translationPrompt(stub, source, language, glossary)
    const result = spawnSync("claude", ["-p"], { input: prompt, encoding: "utf8", maxBuffer: 16 * 1024 * 1024 })
    if (result.error || result.status !== 0) {
      CLI.err(`claude couldn't translate ${stub.registration.key}:  ${result.error?.message ?? result.stderr}`)
      return undefined
    }
    const answer = result.stdout.match(/```(?:ts|typescript)?\n([\s\S]*?)```/)?.[1] ?? result.stdout
    if (!answer.includes(".addRule(")) {
      CLI.err(`claude's answer for ${stub.registration.key} isn't a registration:  kept the stub`)
      return undefined
    }
    return answer
  }
}

/** What `claude` is asked, for one stub. */
function translationPrompt(
  stub: PackStub,
  source: PackModuleSource,
  language: SP.Language,
  glossary: string | undefined
): string {
  const ruleClass = stub.registration.ruleClass.split(".").at(-1)!
  const classFile = Object.entries(source.ruleFiles).find(([, text]) =>
    new RegExp(`export\\s+(?:abstract\\s+)?class\\s+${ruleClass}\\b`).test(text)
  )
  const docstring = classFile?.[1].match(
    new RegExp(`(/\\*\\*[\\s\\S]*?\\*/)\\s*export\\s+(?:abstract\\s+)?class\\s+${ruleClass}\\b`)
  )?.[1]
  return [
    `Translate one rule of the spell programming language from English into ${language.name} (\`${language.lang}\`).`,
    "Spell reads programs written in plain words;  each rule is registered once per language, with its own syntax",
    "and tests.  The rule CLASS is shared, so the tests' javascript output stays EXACTLY the same:",
    "translate only the spell -- the syntax's words and each test's input -- never the javascript.",
    "Keep every `{slot:rule}` and named group `(name:...)` in the syntax as it is;  only the words change.",
    "Where a keyword has a written accent, accept it without the accent too, e.g. `(está|esta)`.",
    "",
    "Answer with ONE TypeScript statement, the registration below translated, in a ```ts fence, and nothing else.",
    "Keep its comment lines (translate their examples), but leave out the `// TODO: translate` line.",
    "",
    `## The rule class, \`${ruleClass}\``,
    docstring ?? "(no docstring)",
    "",
    "## Its English registration, to translate",
    "```ts",
    stub.text.replace(`${TODO_MARKER}\n`, ""),
    "```",
    "",
    `## The module's ${language.name} so far:  use the same words`,
    "```ts",
    source.other ?? "(none yet)",
    "```",
    ...(glossary ? ["", `## The ${language.name} glossary`, glossary] : [])
  ].join("\n")
}
