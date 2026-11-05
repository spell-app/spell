/**
 * Checks a language pack against English, and writes stubs for what it lacks (epic `spanish` P7).
 * - What it checks:
 *   - each rules module's `<module>.<lang>.ts` against its `<module>.en.ts`:
 *     every rule English registers is registered again, in the same order, with a syntax and tests
 *   - every rule class a rules folder exports is registered by some `<module>.en.ts`
 *   - the pack's word tables have every table English has, and name every built-in type English does
 *   - its parser messages have every key English's do (`SP.Language.parserMessages`)
 * - What it fixes:  `fixPackModule()` copies each missing registration from English, as a stub to translate.
 * - It reads the rule files' syntax trees, not by loading them:  a registration's place in its file is what the fix
 *   needs, and a missing one is a line of code to write.
 *   - Read by the kit's TypeScript reader (`readTypeScript()`), so a call in a comment or a string never counts.
 *   - So it sees `<parser>.addRule(<Rule>, { ... })` calls, wherever they are:
 *     a loop's registrations count once, as written.
 * - Node only (the reader is oxc's native parser), on text:
 *   the `spell translate check|fix` commands (`spell/parser/cli/packsCommand`) read the files and print.
 * - Imported by path, `spell/parser/spell/languages/packs`:  the barrel leaves it out, as only the commands need it.
 */
import { readTypeScript, walk, type SourceNode, type TypeScriptSource } from "spell/util/node/typescript"
import { P } from "spell/parser/parser"
import { SP } from "spell/parser/spell"

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
  const leftOut = leftOutKeys(source.other)
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
    Object.entries(module.ruleFiles).flatMap(([file, text]) => {
      const source = readRuleFile(text)
      if (isBuiltWhileParsing(source)) return []
      return exportedSubclasses(source).map(({ ruleClass, base }) => ({
        module: module.module,
        file,
        ruleClass,
        base: lastName(base)
      }))
    })
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
 * - `parserMessages`:  every key English's has, e.g. `dont-understand`:  one it lacks reads English
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
  for (const key of Object.keys(english.parserMessages)) {
    if (!(key in other.parserMessages)) problems.push({ table: "parserMessages", key, problem: "missing" })
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
 * - `translate`:  turns a stub into this language, e.g. by asking an AI (`spell translate fix --ai`);
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
  const parser = registrations[0]?.parser ?? declaredParser(other) ?? toParser

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
    const copied = withReceiver(registration.text, fromParser, parser)
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
export const TODO_MARKER = "// TODO: translate -- copied from English by `spell translate fix`"

/** Above a registration an AI translated, for a person to check. */
export const AI_MARKER = "// AI draft:  review -- translated by `spell translate fix --ai`"

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
    for (const name of namesIn(stub.text)) {
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
    ` * - Written by \`spell translate fix\`:  translate each \`TODO\`, then import it into the language's \`parser.ts\`.`,
    " */",
    'import { SpellParser } from "spell/parser/spell/SpellParser"',
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
 * - Found in its syntax tree (`readTypeScript()`):  a call in a comment or a string never counts.
 */
export function scanRegistrations(text: string): PackRegistration[] {
  const source = readRuleFile(text)
  const lineStarts = P.getLineStarts(text)
  const registrations: PackRegistration[] = []
  for (const statement of source.program.body as SourceNode[]) {
    walk(statement, (node) => {
      const parser = addRuleReceiver(node)
      if (!parser) return
      const [ruleNode, definitionNode] = node.arguments as SourceNode[]
      const ruleArgument = ruleNode ? text.slice(ruleNode.start, ruleNode.end) : ""
      const specialized = ruleNode && specializedClass(ruleNode)
      const ruleClass = specialized ? text.slice(specialized.class.start, specialized.class.end) : ruleArgument
      const ruleName = specialized && stringProperty(specialized.statics, "ruleName")
      const definition = definitionNode?.type === "ObjectExpression" ? definitionNode : undefined
      const start = lineStartOf(text, statement.start)
      const textStart = commentLinesAbove(source, start)
      registrations.push({
        key: ruleName ? `${ruleClass}(${ruleName})` : ruleClass,
        ruleClass,
        ...(ruleName ? { ruleName } : {}),
        parser: parser.name as string,
        hasSyntax: !!(definition && propertyNamed(definition, "syntax")),
        hasTests: hasTests(definition),
        isDeliberate: text.slice(textStart, start).includes(DELIBERATE_MARKER),
        line: P.positionForOffset(lineStarts, parser.start).line + 1,
        start,
        end: statement.end,
        textStart,
        text: text.slice(textStart, statement.end)
      })
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

/** The imports in `text`:  each one's module, the local names it brings in, and where it ends. */
function scanImports(text: string): ScannedImport[] {
  return readRuleFile(text)
    .imports.filter((it) => it.kind === "import")
    .map(({ from, names, start, end }) => {
      const statement = text.slice(start, end)
      const braceEnd = statement.includes("{") ? start + statement.lastIndexOf("}") : undefined
      return {
        module: from,
        names: names.map((name) => name.local),
        end,
        ...(braceEnd !== undefined ? { braceEnd } : {})
      }
    })
}

/** `text`, a rule module's file, read:  its tree, comments and imports. */
function readRuleFile(text: string): TypeScriptSource {
  return readTypeScript(RULE_FILE, text)
}

/** `node`'s parser, if it's a `<parser>.addRule(...)` call:  the name it's called on. */
function addRuleReceiver(node: SourceNode): SourceNode | undefined {
  if (node.type !== "CallExpression") return undefined
  const callee = node.callee as SourceNode
  if (callee.type !== "MemberExpression" || callee.computed) return undefined
  const object = callee.object as SourceNode
  return (callee.property as SourceNode).name === ADD_RULE && object.type === "Identifier" ? object : undefined
}

/** A specialized rule, `Wording.specialize({ ruleName: "pause_units" })`:  its class's node and its statics. */
function specializedClass(node: SourceNode): { class: SourceNode; statics: SourceNode | undefined } | undefined {
  if (node.type !== "CallExpression") return undefined
  const callee = node.callee as SourceNode
  if (callee.type !== "MemberExpression" || (callee.property as SourceNode).name !== SPECIALIZE) return undefined
  const [statics] = node.arguments as SourceNode[]
  return { class: callee.object as SourceNode, statics }
}

/** An object literal's property named `name` (a plain name or a string);  else `undefined`. */
function propertyNamed(object: SourceNode | undefined, name: string): SourceNode | undefined {
  if (object?.type !== "ObjectExpression") return undefined
  return (object.properties as SourceNode[]).find((it) => it.type === "Property" && keyName(it) === name)
}

/** A property's key, if it's a plain name or a string, e.g. `tests`. */
function keyName(property: SourceNode): string | undefined {
  const key = property.key as SourceNode
  if (property.computed) return undefined
  if (key.type === "Identifier") return key.name as string
  return key.type === "Literal" && typeof key.value === "string" ? key.value : undefined
}

/** The text an object literal's property `name` holds, if it's a plain string:  `ruleName: "pause_units"`. */
function stringProperty(object: SourceNode | undefined, name: string): string | undefined {
  const value = propertyNamed(object, name)?.value as SourceNode | undefined
  if (value?.type === "Literal" && typeof value.value === "string") return value.value
  if (value?.type !== "TemplateLiteral" || (value.expressions as unknown[]).length) return undefined
  return (value.quasis as Array<{ value: { cooked: string } }>)[0]!.value.cooked
}

/** Does `definition` give at least one test:  `tests: [...]`, not empty? */
function hasTests(definition: SourceNode | undefined): boolean {
  const tests = propertyNamed(definition, "tests")?.value as SourceNode | undefined
  return tests?.type === "ArrayExpression" && (tests.elements as unknown[]).length > 0
}

/** Where the `//` comment lines right above `start` begin (no blank line between), else `start`. */
function commentLinesAbove(source: TypeScriptSource, start: number): number {
  const above = source.commentsAbove(start)
  const [first] = above.slice(above.findLastIndex((comment) => comment.type === "Block") + 1)
  return first ? lineStartOf(source.text, first.start) : start
}

/** Where the line holding `offset` starts. */
function lineStartOf(text: string, offset: number): number {
  return text.lastIndexOf("\n", offset - 1) + 1
}

/** The keys a file's `// packs: none <key>` comments name:  registrations left out on purpose. */
function leftOutKeys(text: string): string[] {
  return readRuleFile(text).comments.flatMap((comment) => {
    const match = comment.type === "Line" ? LEFT_OUT.exec(comment.value) : null
    return match ? [match[1]!] : []
  })
}

/** Each class `source` exports that extends another, e.g. `export class Await extends SpellStatement`. */
function exportedSubclasses(source: TypeScriptSource): Array<{ ruleClass: string; base: string }> {
  return (source.program.body as SourceNode[]).flatMap((statement) => {
    const declaration = statement.type === "ExportNamedDeclaration" ? (statement.declaration as SourceNode) : undefined
    const superClass = declaration?.type === "ClassDeclaration" ? (declaration.superClass as SourceNode) : undefined
    if (!superClass) return []
    // what it extends as written, a generic's arguments or a call's left off:  `P.Sequence`
    const base = /^[\w$.]+/.exec(source.text.slice(superClass.start, superClass.end))?.[0]
    return base ? [{ ruleClass: (declaration!.id as SourceNode).name as string, base }] : []
  })
}

/** Is `source` a rule class built while parsing, never registered:  does it say `static importableAs`? */
function isBuiltWhileParsing(source: TypeScriptSource): boolean {
  let isBuilt = false
  walk(source.program, (node) => {
    if (node.static && (node.key as SourceNode | undefined)?.name === IMPORTABLE_AS) isBuilt = true
    return !isBuilt
  })
  return isBuilt
}

/** The parser a language file declares:  `export const asyncEs = new SpellParser(...)`;  none:  `undefined`. */
function declaredParser(text: string): string | undefined {
  for (const statement of readRuleFile(text).program.body as SourceNode[]) {
    const declaration = statement.declaration as SourceNode | undefined
    if (statement.type !== "ExportNamedDeclaration" || declaration?.type !== "VariableDeclaration") continue
    for (const declarator of declaration.declarations as SourceNode[]) {
      const init = declarator.init as SourceNode | null
      if (init?.type === "NewExpression" && (init.callee as SourceNode).name === SPELL_PARSER) {
        return (declarator.id as SourceNode).name as string
      }
    }
  }
  return undefined
}

/** `text` with each `<from>.addRule(` called on `to` instead:  `_async.addRule(` => `asyncEs.addRule(`. */
function withReceiver(text: string, from: string, to: string): string {
  const receivers: SourceNode[] = []
  walk(readRuleFile(text).program, (node) => {
    const receiver = addRuleReceiver(node)
    if (receiver?.name === from) receivers.push(receiver)
  })
  // from the end, so earlier offsets stay true
  for (const { start, end } of receivers.sort((a, b) => b.start - a.start)) {
    text = text.slice(0, start) + to + text.slice(end)
  }
  return text
}

/** Every name `text`'s code uses, in order, repeats kept:  never one in a string or comment. */
function namesIn(text: string): string[] {
  const names: SourceNode[] = []
  walk(readRuleFile(text).program, (node) => {
    if (node.type === "Identifier") names.push(node)
  })
  return names.sort((a, b) => a.start - b.start).map((node) => node.name as string)
}

/** `es` => `Es`, for a module's parser name:  `asyncEs`. */
function classCaseLang(lang: string): string {
  return lang.charAt(0).toUpperCase() + lang.slice(1)
}

/** `P.Sequence` => `Sequence`. */
function lastName(name: string): string {
  return name.split(".").at(-1)!
}

/** The name the reader is handed for a rule file:  it reads it as TypeScript. */
const RULE_FILE = "rules.ts"

/** A registration's method:  `<parser>.addRule(...)`. */
const ADD_RULE = "addRule"

/** A specialized rule's method:  `Wording.specialize({ ruleName: "pause_units", ... })`. */
const SPECIALIZE = "specialize"

/** The static a rule class built while parsing has:  `@proto static importableAs = "quoted_property"`. */
const IMPORTABLE_AS = "importableAs"

/** The class a module's parser is, in its language file:  `export const asyncEs = new SpellParser(...)`. */
const SPELL_PARSER = "SpellParser"

/** A comment naming a registration left out on purpose, its key captured:  `// packs: none Wording(pause_units)`. */
const LEFT_OUT = /\bpacks:\s+none\s+(\S+)/

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
