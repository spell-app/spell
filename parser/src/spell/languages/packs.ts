/**
 * Checks a language pack against English, and writes stubs for what it lacks (epic `spanish` P7).
 * - What it checks:
 *   - each rules module's `<module>.<lang>.ts` against its `<module>.en.ts`:
 *     every rule English registers is registered again, in the same order, with a syntax and tests
 *   - every rule class a rules folder exports is registered by some `<module>.en.ts`
 *   - the pack's word tables have every table English has, and name every built-in type English does
 * - What it fixes:  `fixPackModule()` copies each missing registration from English, as a stub to translate.
 * - It reads the rule files as TEXT, not by loading them:  a registration's place in its file is what the fix needs,
 *   and a missing one is a line of code to write.
 *   - So it sees `<parser>.addRule(<Rule>, { ... })` calls, wherever they are:
 *     a loop's registrations count once, as written.
 * - Node-free:  the `spell lang packs` commands (`spell-lang/cli/packsCommand`) read the files and print.
 * - Imported by path, `spell-lang/spell/languages/packs`:  the barrel leaves it out, as only the commands need it.
 */
import { SP } from "spell-lang/spell"

////////////////
// ## Checking
////////////////

/**
 * What language `lang`'s pack lacks, against English:  one report per rules module, and its words.
 * - `sources`:  every rules module's text, see `PackSources`
 * - `english`, `other`:  the two packs, for their word tables
 * - NEVER throws:  a file it can't read is a module with no `other` text, reported as missing
 */
export function checkPack(sources: PackSources, english: SP.Language, other: SP.Language): PackReport {
  const modules = sources.modules.map((source) => checkPackModule(source, sources.lang))
  const unregistered = unregisteredRules(sources.modules)
  const words = checkWords(english, other)
  const isComplete =
    unregistered.length === 0 && words.length === 0 && modules.every((module) => isModuleComplete(module))
  return { lang: sources.lang, modules, unregistered, words, isComplete }
}

/** One module's report:  its `<module>.<lang>.ts` against its `<module>.en.ts`. */
export function checkPackModule(source: PackModuleSource, lang: string): ModulePackReport {
  const file = `${source.module}/${source.module}.${lang}.ts`
  const english = scanRegistrations(source.english)
  if (source.other === undefined) {
    const none: PackRegistration[] = []
    return {
      module: source.module,
      file,
      hasFile: false,
      missing: english,
      untested: none,
      noSyntax: none,
      outOfOrder: none,
      extra: none
    }
  }
  const other = scanRegistrations(source.other)
  const { pairs, missing, extra } = alignRegistrations(english, other)
  // a key both missing and extra is there, in another place:  out of order, not missing
  const outOfOrder: PackRegistration[] = []
  const leftOut = [...source.other.matchAll(LEFT_OUT)].map((match) => match[1]!)
  const stillMissing = missing.filter((registration) => {
    const at = extra.findIndex((it) => it.key === registration.key)
    if (at !== -1) {
      outOfOrder.push(extra.splice(at, 1)[0]!)
      return false
    }
    const said = leftOut.indexOf(registration.key)
    if (said === -1) return true
    leftOut.splice(said, 1)
    return false
  })
  const lacks = (has: (it: PackRegistration) => boolean) =>
    pairs.filter(([en, it]) => has(en) && !has(it) && !it.isDeliberate).map(([, it]) => it)
  return {
    module: source.module,
    file,
    hasFile: true,
    missing: stillMissing,
    untested: lacks((it) => it.hasTests),
    noSyntax: lacks((it) => it.hasSyntax),
    outOfOrder: outOfOrder.filter((it) => !it.isDeliberate),
    extra
  }
}

/**
 * Marks a registration that differs from English ON PURPOSE, in a comment line above it, with the reason:
 * `// packs: ok -- `si no` is `else` AND `if no`:  `else` must come first`.
 * - Then `check` doesn't report it out of order, or without a syntax or tests.
 * - A registration left out on purpose is a comment line too, anywhere in the file, naming its key (`LEFT_OUT`):
 *   `// packs: none AThingsProperty -- Spanish has no "a card's color"`.
 */
export const DELIBERATE_MARKER = "packs: ok"

/** A comment naming a registration left out on purpose, its key captured:  `// packs: none Wording(pause_units)`. */
const LEFT_OUT = /\/\/.*\bpacks:\s+none\s+(\S+)/g

/** Is `report`'s module complete:  its file there, nothing missing, untested, without syntax or out of order? */
export function isModuleComplete(report: ModulePackReport): boolean {
  const { hasFile, missing, untested, noSyntax, outOfOrder } = report
  return hasFile && missing.length + untested.length + noSyntax.length + outOfOrder.length === 0
}

/**
 * Rule classes a rules folder exports which no `<module>.en.ts` registers, so no language can read them.
 * - A class another class extends is a base, not a rule of its own:  never reported, e.g. `Wording`.
 * - It must extend something:  a rule class is a `P.Rule`'s subclass.
 * - A rule built while parsing (`@proto static importableAs`, `scope.addRule()`) is never registered:  not reported.
 */
export function unregisteredRules(modules: PackModuleSource[]): UnregisteredRule[] {
  const registered = new Set(
    modules.flatMap((module) => scanRegistrations(module.english).map((it) => lastName(it.ruleClass)))
  )
  const classes = modules.flatMap((module) =>
    Object.entries(module.ruleFiles).flatMap(([file, text]) =>
      BUILT_WHILE_PARSING.test(text)
        ? []
        : [...maskCode(text).matchAll(EXPORTED_CLASS)].map((match) => ({
            module: module.module,
            file,
            ruleClass: match[1]!,
            base: lastName(match[2]!)
          }))
    )
  )
  const bases = new Set(classes.map((it) => it.base))
  return classes
    .filter((it) => !registered.has(it.ruleClass) && !bases.has(it.ruleClass))
    .map(({ module, file, ruleClass }) => ({ module, file, ruleClass }))
}

/**
 * What `other`'s word tables lack, against English's.
 * - `words`:  every table English has (`SP.LanguageWords`), and every one of its `declarations`
 * - `typeWords`:  a word for every built-in type English has a word for (the words themselves differ)
 * - `builtInMembers`:  each names a built-in member there is (`SP.BUILT_IN_TYPE_TABLE`), never a stale one
 */
export function checkWords(english: SP.Language, other: SP.Language): WordProblem[] {
  const problems: WordProblem[] = []
  for (const table of Object.keys(english.words)) {
    if (!(table in other.words)) problems.push({ table: "words", key: table, problem: "missing" })
  }
  for (const pattern of Object.keys(english.words.declarations ?? {})) {
    if (!(pattern in (other.words.declarations ?? {}))) {
      problems.push({ table: "declarations", key: pattern, problem: "missing" })
    }
  }
  const typesNamed = new Set(Object.values(other.typeWords))
  for (const type of new Set(Object.values(english.typeWords))) {
    if (!typesNamed.has(type)) problems.push({ table: "typeWords", key: type, problem: "missing" })
  }
  const members = new Set(SP.BUILT_IN_TYPE_TABLE.flatMap((type) => type.members.map((member) => member.words)))
  for (const member of Object.keys(other.words.builtInMembers ?? {})) {
    if (!members.has(member)) problems.push({ table: "builtInMembers", key: member, problem: "unknown" })
  }
  return problems
}

////////////////
// ## Fixing
////////////////

/**
 * `source`'s `<module>.<lang>.ts` with a stub for each registration it lacks, and the stubs written.
 * - Each stub is English's registration, copied:
 *   - its comment lines above it, then `// TODO: translate`
 *   - its syntax and its tests, in English, to translate
 *   - registered on this language's parser, e.g. `asyncEs.addRule(...)` for English's `_async.addRule(...)`
 * - Where:  after the registration English has before it, so ties break the same way;
 *   the first goes before the file's first registration.
 * - The imports a stub needs (its rule class, a constant) are added from English's.
 * - `translate`:  turns a stub into this language, e.g. by asking an AI (`spell lang packs fix --ai`);
 *   it returns the registration to write instead, or `undefined` to keep the stub.
 * - A module with no file yet gets one:  a header, its parser, then every stub.
 *   NOTE: the language's `parser.ts` must then import it -- the fix doesn't.
 * - Pure:  writes nothing, so it works on a string.
 */
export function fixPackModule(source: PackModuleSource, lang: string, translate?: PackTranslator): PackFix {
  const english = scanRegistrations(source.english)
  const fromParser = english[0]?.parser ?? ""
  const toParser = `${source.module}${classCaseLang(lang)}`
  const other = source.other ?? newModuleFile(source.module, lang, toParser)
  const report = checkPackModule({ ...source, other }, lang)
  const registrations = scanRegistrations(other)
  const parser = registrations[0]?.parser ?? other.match(PARSER_DECLARATION)?.[1] ?? toParser

  // anchor each missing one on the English registration before it, found again in this file
  const { pairs } = alignRegistrations(english, registrations)
  const matched = new Map(pairs)
  const written = new Set<number>()
  const stubs: PackStub[] = []
  for (const registration of report.missing) {
    // a loop that registers several:  copy it once
    if (written.has(registration.start)) continue
    written.add(registration.start)
    // the report scanned English again:  the same registration, by its line
    const index = english.findIndex((it) => it.line === registration.line && it.key === registration.key)
    const before = english
      .slice(0, index)
      .reverse()
      .find((it) => matched.has(it))
    const after = before ? matched.get(before) : undefined
    const copied = registration.text.replace(receiverPattern(fromParser), `${parser}$1.addRule(`)
    const stub: PackStub = { registration, after, text: `${TODO_MARKER}\n${copied}`, isTranslated: false }
    const translated = translate?.(stub, source)
    if (translated !== undefined) {
      stub.text = `${AI_MARKER}\n${translated.trim()}`
      stub.isTranslated = true
    }
    stubs.push(stub)
  }
  const text = addImports(insertStubs(other, stubs, registrations), stubs, source.english, fromParser)
  return { file: report.file, text, stubs, isNewFile: source.other === undefined }
}

/** Above a stub copied from English, untranslated. */
export const TODO_MARKER = "// TODO: translate -- copied from English by `spell lang packs fix`"

/** Above a registration an AI translated, for a person to check. */
export const AI_MARKER = "// AI draft:  review -- translated by `spell lang packs fix --ai`"

/** `text` with each of `stubs` in its place:  after its anchor's statement, else before the first registration. */
function insertStubs(text: string, stubs: PackStub[], registrations: PackRegistration[]): string {
  const at = (stub: PackStub) => (stub.after ? stub.after.end : (registrations[0]?.textStart ?? text.length))
  // from the end, so earlier offsets stay true;  stubs at one place keep English's order
  const places = [...new Set(stubs.map(at))].sort((a, b) => b - a)
  for (const place of places) {
    const here = stubs.filter((stub) => at(stub) === place).map((stub) => stub.text)
    const isFirst = !stubs.find((stub) => at(stub) === place)!.after && registrations.length > 0
    const block = isFirst ? `${here.join("\n\n")}\n\n` : `\n\n${here.join("\n\n")}`
    text = text.slice(0, place) + block + text.slice(place)
  }
  return text
}

/**
 * `text` with every import its stubs need from English's file:  each name a stub uses that English imports.
 * - Added to an import from the same module when there is one, else a new import line after the last.
 * - English's own parser (`_async`) is never imported:  the stubs register on this file's.
 */
function addImports(text: string, stubs: PackStub[], englishText: string, englishParser: string): string {
  const englishImports = scanImports(englishText)
  const imported = new Set(scanImports(text).flatMap((it) => it.names))
  const needed = new Map<string, string[]>()
  for (const stub of stubs) {
    for (const [name] of maskCode(stub.text).matchAll(IDENTIFIER)) {
      if (imported.has(name) || name === englishParser) continue
      const from = englishImports.find((it) => it.names.includes(name))
      if (!from) continue
      imported.add(name)
      needed.set(from.module, [...(needed.get(from.module) ?? []), name])
    }
  }
  for (const [module, names] of needed) {
    const existing = scanImports(text).find((it) => it.module === module && it.braceEnd !== undefined)
    if (existing) {
      const at = existing.braceEnd!
      const head = text.slice(0, at).trimEnd()
      text = `${head}, ${names.join(", ")} ${text.slice(at)}`
    } else {
      const last = scanImports(text).at(-1)
      const at = last ? last.end : 0
      text = `${text.slice(0, at)}\nimport { ${names.join(", ")} } from "${module}"${text.slice(at)}`
    }
  }
  return text
}

/** A new `<module>.<lang>.ts`:  its header and its parser, for the stubs to go after. */
function newModuleFile(module: string, lang: string, parser: string): string {
  return [
    "/**",
    ` * The \`${module}\` rules in language \`${lang}\`:  each rule's syntax and its tests (epic \`spanish\` P7).`,
    ` * - Written by \`spell lang packs fix\`:  translate each \`TODO\`, then import it into the language's \`parser.ts\`.`,
    " */",
    'import { SpellParser } from "spell-lang/spell/SpellParser"',
    "",
    `/** \`${module}\`'s rules in language \`${lang}\`. */`,
    `export const ${parser} = new SpellParser({ module: "${module}" })`,
    ""
  ].join("\n")
}

////////////////
// ## Reading rule files
////////////////

/**
 * Every `<parser>.addRule(...)` call in `text`, a rule module's `.en.ts` or other language's file, in order.
 * - Each knows its rule (`key`), whether it has a syntax and tests, and the statement it's in:
 *   a loop's registration is the whole loop.
 */
export function scanRegistrations(text: string): PackRegistration[] {
  const code = maskCode(text)
  const registrations: PackRegistration[] = []
  for (const match of code.matchAll(ADD_RULE)) {
    const open = match.index + match[0].length - 1
    const close = matchingClose(code, open)
    const comma = topLevelComma(code, open + 1, close)
    const ruleArgument = text.slice(open + 1, comma ?? close).trim()
    const definition = comma === undefined ? "" : code.slice(comma + 1, close)
    const { start, end } = statementAround(code, match.index, close)
    const textStart = commentsAbove(text, start)
    const specialized = ruleArgument.match(SPECIALIZE)
    const ruleClass = specialized ? specialized[1]! : ruleArgument
    const ruleName = specialized ? ruleArgument.match(RULE_NAME)?.[1] : undefined
    registrations.push({
      key: ruleName ? `${ruleClass}(${ruleName})` : ruleClass,
      ruleClass,
      ...(ruleName ? { ruleName } : {}),
      parser: match[1]!,
      hasSyntax: /\bsyntax\s*:/.test(definition),
      hasTests: hasTests(text, code, comma, close),
      isDeliberate: text.slice(textStart, start).includes(DELIBERATE_MARKER),
      line: text.slice(0, match.index).split("\n").length,
      start,
      end,
      textStart,
      text: text.slice(textStart, end)
    })
  }
  return registrations
}

/**
 * Pair `english`'s registrations with `other`'s, in order (their longest common run of keys).
 * - `missing`:  English's with no partner;  `extra`:  `other`'s with none
 */
function alignRegistrations(english: PackRegistration[], other: PackRegistration[]) {
  // longest common subsequence of the two key lists
  const rows = english.length
  const columns = other.length
  const table = Array.from({ length: rows + 1 }, () => new Array<number>(columns + 1).fill(0))
  for (let i = rows - 1; i >= 0; i--) {
    for (let j = columns - 1; j >= 0; j--) {
      table[i]![j] =
        english[i]!.key === other[j]!.key ? table[i + 1]![j + 1]! + 1 : Math.max(table[i + 1]![j]!, table[i]![j + 1]!)
    }
  }
  const pairs: Array<[PackRegistration, PackRegistration]> = []
  const missing: PackRegistration[] = []
  const extra: PackRegistration[] = []
  let i = 0
  let j = 0
  while (i < rows && j < columns) {
    if (english[i]!.key === other[j]!.key) pairs.push([english[i++]!, other[j++]!])
    else if (table[i + 1]![j]! >= table[i]![j + 1]!) missing.push(english[i++]!)
    else extra.push(other[j++]!)
  }
  missing.push(...english.slice(i))
  extra.push(...other.slice(j))
  return { pairs, missing, extra }
}

/** The imports in `text`:  each one's module, the names it brings in, and where it ends. */
function scanImports(text: string): ScannedImport[] {
  return [...text.matchAll(IMPORT)].map((match) => {
    const [whole, braces, single, module] = match
    const names = braces
      ? braces
          .split(",")
          .map((it) =>
            it
              .replace(/^\s*type\s+/, "")
              .split(/\s+as\s+/)
              .at(-1)!
              .trim()
          )
          .filter(Boolean)
      : [single!]
    const end = match.index + whole.length
    const braceEnd = braces ? match.index + whole.lastIndexOf("}") : undefined
    return { module: module!, names, end, ...(braceEnd !== undefined ? { braceEnd } : {}) }
  })
}

/**
 * `text` with every string, comment and regex's contents blanked out, the same length:
 * so brackets, commas and names found in it are code.
 * - Quotes and slashes stay;  a line break inside a template literal stays, so lines still count.
 */
export function maskCode(text: string): string {
  const out = text.split("")
  const blank = (from: number, to: number) => {
    for (let k = from; k < to; k++) if (out[k] !== "\n") out[k] = " "
  }
  let i = 0
  let lastCode = ""
  while (i < text.length) {
    const char = text[i]!
    const next = text[i + 1]
    if (char === "/" && next === "/") {
      const end = text.indexOf("\n", i)
      const stop = end === -1 ? text.length : end
      blank(i, stop)
      i = stop
    } else if (char === "/" && next === "*") {
      const end = text.indexOf("*/", i + 2)
      const stop = end === -1 ? text.length : end + 2
      blank(i, stop)
      i = stop
    } else if (char === '"' || char === "'" || char === "`") {
      const stop = stringEnd(text, i)
      blank(i + 1, stop - 1)
      i = stop
      lastCode = char
    } else if (char === "/" && (lastCode === "" || REGEX_BEFORE.includes(lastCode))) {
      const stop = regexEnd(text, i)
      blank(i + 1, stop)
      i = stop
      lastCode = "/"
    } else {
      if (!/\s/.test(char)) lastCode = char
      i++
    }
  }
  return out.join("")
}

/** Characters after which a `/` starts a regex, not a division. */
const REGEX_BEFORE = "(,=:[!&|?{};"

/** Index just after the string or template literal starting at `start`. */
function stringEnd(text: string, start: number): number {
  const quote = text[start]
  let depth = 0
  for (let i = start + 1; i < text.length; i++) {
    const char = text[i]
    if (char === "\\") i++
    else if (quote === "`" && char === "$" && text[i + 1] === "{") depth++
    else if (depth > 0 && char === "}") depth--
    else if (depth === 0 && char === quote) return i + 1
    else if (quote !== "`" && char === "\n") return i
  }
  return text.length
}

/** Index of the last character of the regex literal starting at `start` (its flags after it are code). */
function regexEnd(text: string, start: number): number {
  let inClass = false
  for (let i = start + 1; i < text.length; i++) {
    const char = text[i]
    if (char === "\\") i++
    else if (char === "[") inClass = true
    else if (char === "]") inClass = false
    else if (char === "/" && !inClass) return i
    else if (char === "\n") return i
  }
  return text.length
}

/** Index of the bracket closing the one at `open`, in masked `code`. */
function matchingClose(code: string, open: number): number {
  let depth = 0
  for (let i = open; i < code.length; i++) {
    const char = code[i]!
    if ("([{".includes(char)) depth++
    else if (")]}".includes(char) && --depth === 0) return i
  }
  return code.length - 1
}

/** Index of the first comma between `from` and `to` at depth 0, in masked `code`;  `undefined` for none. */
function topLevelComma(code: string, from: number, to: number): number | undefined {
  let depth = 0
  for (let i = from; i < to; i++) {
    const char = code[i]!
    if ("([{".includes(char)) depth++
    else if (")]}".includes(char)) depth--
    else if (char === "," && depth === 0) return i
  }
  return undefined
}

/**
 * The top-level statement the call at `at` (closing at `close`) is in:  from its line's start to just after it.
 * - Inside a block, e.g. a `for` loop:  the whole block, from the line that opens it.
 */
function statementAround(code: string, at: number, close: number): { start: number; end: number } {
  let depth = 0
  let outerOpen: number | undefined
  for (let i = 0; i < at; i++) {
    const char = code[i]!
    if ("([{".includes(char)) {
      if (depth === 0) outerOpen = i
      depth++
    } else if (")]}".includes(char)) depth--
  }
  const head = depth > 0 && outerOpen !== undefined ? outerOpen : at
  const end = depth > 0 && outerOpen !== undefined ? matchingClose(code, outerOpen) + 1 : close + 1
  // a block's opening line, e.g. `for (...) {`:  back to its start
  return { start: code.lastIndexOf("\n", head - 1) + 1, end }
}

/** Where the `//` comment lines right above `start` begin (no blank line between), else `start`. */
function commentsAbove(text: string, start: number): number {
  let begin = start
  while (begin > 0) {
    const lineStart = text.lastIndexOf("\n", begin - 2) + 1
    if (!text.slice(lineStart, begin).trimStart().startsWith("//")) break
    begin = lineStart
  }
  return begin
}

/** Does the definition between `comma` and `close` have `tests: [` with at least one in it? */
function hasTests(text: string, code: string, comma: number | undefined, close: number): boolean {
  if (comma === undefined) return false
  const match = /\btests\s*:\s*\[/.exec(code.slice(comma, close))
  if (!match) return false
  const after = comma + match.index + match[0].length
  return /^\s*[^\s\]]/.test(text.slice(after))
}

/** A call's receiver as English's file names it:  `_async.addRule(`, its space before the dot kept. */
function receiverPattern(parser: string): RegExp {
  return new RegExp(`\\b${parser.replace(/\$/g, "\\$")}(\\s*)\\.addRule\\(`, "g")
}

/** `es` => `Es`, for a module's parser name:  `asyncEs`. */
function classCaseLang(lang: string): string {
  return lang.charAt(0).toUpperCase() + lang.slice(1)
}

/** `P.Sequence` => `Sequence`. */
function lastName(name: string): string {
  return name.split(".").at(-1)!
}

/** A rule class built while parsing, never registered:  its file says `static importableAs`. */
const BUILT_WHILE_PARSING = /\bstatic\s+importableAs\b/

/** A rule registration's start:  `<parser>.addRule(`. */
const ADD_RULE = /\b([A-Za-z_$][\w$]*)\s*\.\s*addRule\s*\(/g

/** A specialized rule:  `Wording.specialize({ ruleName: "pause_units", ... })`, its class captured. */
const SPECIALIZE = /^([\w$.]+)\s*\.\s*specialize\s*\(/

/** A specialized rule's name. */
const RULE_NAME = /ruleName\s*:\s*["'`]([^"'`]+)["'`]/

/** An exported class, and the class it extends. */
const EXPORTED_CLASS = /^export\s+(?:abstract\s+)?class\s+(\w+)(?:\s*<[^{]*?>)?\s+extends\s+([\w.]+)/gm

/** A module's parser, in its language file:  `export const asyncEs = new SpellParser(`. */
const PARSER_DECLARATION = /export\s+const\s+(\w+)\s*=\s*new\s+SpellParser\s*\(/

/** An import of names:  `import { A, type B } from "x"`, or `import A from "x"`. */
const IMPORT = /^import\s+(?:type\s+)?(?:\{([^}]*)\}|(\w+))\s+from\s+"([^"]+)"/gm

/** A name in code. */
const IDENTIFIER = /\b[A-Za-z_$][\w$]*\b/g

////////////////
// ## Types
////////////////

/** The text of every rules module, for checking language `lang`'s pack. */
export type PackSources = {
  /** The language checked, e.g. `es`. */
  lang: string
  /** Every rules module with a `<module>.en.ts`. */
  modules: PackModuleSource[]
}

/** One rules module's text. */
export type PackModuleSource = {
  /** Its folder's name, e.g. `async`. */
  module: string
  /** Its `<module>.en.ts`. */
  english: string
  /** Its `<module>.<lang>.ts`;  `undefined` when there's none. */
  other: string | undefined
  /** Its rule files (not the language files, its parser or its barrel), by file name:  `{ "Await.ts": "..." }`. */
  ruleFiles: Record<string, string>
}

/** One `<parser>.addRule(...)` call in a language file. */
export type PackRegistration = {
  /** What it registers, matched between languages:  the class, with a specialized rule's name, `Wording(pause_units)`. */
  key: string
  /** Its rule class as written, e.g. `Await`, `P.Sequence`. */
  ruleClass: string
  /** A specialized rule's `ruleName`. */
  ruleName?: string
  /** The parser it registers on, e.g. `_async`, `asyncEs`. */
  parser: string
  /** Does its definition give a `syntax`? */
  hasSyntax: boolean
  /** Does its definition give at least one test? */
  hasTests: boolean
  /** Does a comment line above it say it differs from English on purpose (`DELIBERATE_MARKER`)? */
  isDeliberate: boolean
  /** Its line, from 1. */
  line: number
  /** Where its statement starts:  its line, or a loop's around it. */
  start: number
  /** Just after its statement. */
  end: number
  /** Where its comment lines above it start, else `start`. */
  textStart: number
  /** Its statement, with its comment lines. */
  text: string
}

/** What language `lang`'s pack lacks:  `checkPack()`. */
export type PackReport = {
  lang: string
  /** Each rules module's report, in the modules' order. */
  modules: ModulePackReport[]
  /** Rule classes no `.en.ts` registers. */
  unregistered: UnregisteredRule[]
  /** What its word tables lack. */
  words: WordProblem[]
  /** Nothing anywhere to fix? */
  isComplete: boolean
}

/** What one module's `<module>.<lang>.ts` lacks against its `<module>.en.ts`. */
export type ModulePackReport = {
  module: string
  /** Its file, from the rules folder:  `async/async.es.ts`. */
  file: string
  /** Is there a file?  None:  every English registration is `missing`. */
  hasFile: boolean
  /** English's registrations it has no partner for. */
  missing: PackRegistration[]
  /** Its registrations with no tests, where English's have some. */
  untested: PackRegistration[]
  /** Its registrations with no syntax, where English's has one. */
  noSyntax: PackRegistration[]
  /** Its registrations in another place than English's:  a tie between two rules may break the other way. */
  outOfOrder: PackRegistration[]
  /** Its registrations English has no partner for, e.g. a second syntax:  fine, so never a problem. */
  extra: PackRegistration[]
}

/** A rule class a rules folder exports which no `.en.ts` registers. */
export type UnregisteredRule = { module: string; file: string; ruleClass: string }

/**
 * A word table problem.
 * - `missing`:  English has `key` and this pack doesn't
 * - `unknown`:  this pack has `key` and spell has no such thing, e.g. a built-in member that's gone
 */
export type WordProblem = { table: string; key: string; problem: "missing" | "unknown" }

/** A registration `fixPackModule()` writes. */
export type PackStub = {
  /** English's registration it copies. */
  registration: PackRegistration
  /** This file's registration it goes after;  none:  before the first. */
  after: PackRegistration | undefined
  /** What's written, its marker comment first. */
  text: string
  /** Did `translate` write it? */
  isTranslated: boolean
}

/** Turns `stub`'s English into the pack's language, returning the registration to write, or `undefined`. */
export type PackTranslator = (stub: PackStub, source: PackModuleSource) => string | undefined

/** What `fixPackModule()` made. */
export type PackFix = {
  /** The file, from the rules folder. */
  file: string
  /** Its new text. */
  text: string
  /** The stubs written into it, in English's order. */
  stubs: PackStub[]
  /** Is it a new file? */
  isNewFile: boolean
}

/** An import statement, as `scanImports()` reads it. */
type ScannedImport = { module: string; names: string[]; end: number; braceEnd?: number }
