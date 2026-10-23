import { P } from "spell-lang/parser"
import { SP } from "spell-lang/spell"
import { BODY_KEYWORDS } from "spell-lang/spell/spell.types"
import { NumberLiteral, TextLiteral } from "spell-lang/spell/rules/core"
import { CompoundExpression, Wording } from "spell-lang/spell/rules/expressions"
import { SubjectIt, SubjectRule } from "spell-lang/spell/rules/types"
import { MethodSignature, QuotedMethodSignature, QuotedSignatureWords } from "spell-lang/spell/rules/methods"
import { SpellJSX, SpellJSXExpression, SpellJSXText } from "spell-lang/spell/rules/JSX"
import type { ElementNames } from "./ElementNames"
import type { TranslationNames } from "./TranslationNames"
import type { DeclarationStatement, ImportedProject, MissingName, SourceFile, TranslatedFile } from "./translate.types"

/**
 * Writes a spell project in another human language, rule by rule (epic `spanish` P24):
 * `spell lang translate <project> --to es`.
 * - Each line's statement is written back with the SAME rule's syntax in the other language
 *   -- its registration in `<module>.<lang>.ts` -- its slots filled with its children, translated the same way.
 * - The names a project's people chose come from its names dictionary (`TranslationNames`).
 * - One line out for each line in:  so a line that changes in English changes one line here (`--update`).
 * - A line it can't write (a rule with no twin, a name the dictionary lacks) keeps its English, marked
 *   `// TODO: translate`, and says why in `TranslatedFile.todo`.
 * - A line it wrote whose word order may be wrong there (a text joined to a value with `+`) is noted in
 *   `TranslatedFile.risky`, for the fix-up pass to look at in context (epic `spanish` P25).
 * - A call of a method a project it IMPORTS declares:  its words as that project declares them (`imports`).
 * - Its elements' tags, attributes and values through `ElementNames`:  `<ui-text>` => `<es-texto>` (epic `spanish` P25).
 * - Pure:  no files, no `claude`.  The command (spell-app's `translateCommand`) reads, asks and writes.
 * - Knows no particular language:  what it needs of one is in its pack (`SP.Language`):
 *   its parser's registrations, its articles' agreement, its `it` words, its contractions.
 */
export class Translator {
  /** The language the project is written in. */
  readonly from: SP.Language
  /** The language to write it in. */
  readonly to: SP.Language
  /** The project's names dictionary. */
  readonly names: TranslationNames
  /** Each `from` rule's registrations in `to`, the one registered in the same place first -- see `twinsFor()`. */
  private readonly twins: Map<P.Rule, P.Rule[]>
  /** The rules nothing could write, by name, each with how many lines it held up. */
  readonly untranslatable = new Map<string, number>()
  /** The projects it imports:  what they declare, for a call of one of their methods. */
  readonly imports: ImportedProject[]
  /** Its elements' names in the other language, if given;  else its JSX's tags and attributes stay as written. */
  readonly elements: ElementNames | undefined

  constructor({
    from,
    to,
    names,
    imports = [],
    elements
  }: {
    from: SP.Language
    to: SP.Language
    names: TranslationNames
    imports?: ImportedProject[]
    elements?: ElementNames
  }) {
    this.from = from
    this.to = to
    this.names = names
    this.imports = imports
    this.elements = elements
    this.twins = twinsFor(from.parser, to.parser)
  }

  /**
   * The statement an imported project declares method `methodName` with (`increment`), if one does:
   * its words, `increment it`, are what the other language's parser reads for it.
   */
  importedMethod(methodName: string): DeclarationStatement | undefined {
    for (const { declarations } of this.imports) {
      const found = declarations.statements.find((each) => each.output === methodName && each.name)
      if (found) return found
    }
    return undefined
  }

  ////////////////
  // ## Files
  ////////////////

  /**
   * `file` in the other language, one line for each of its lines.
   * - Blank lines stay as they are;  a comment goes through the dictionary, else stays as it was.
   * - SIDE EFFECT:  the dictionary notes each name it lacked (`names.missing`), and `untranslatable` each rule.
   */
  translateFile(file: SourceFile): TranslatedFile {
    const writing = new FileWriting(this, file)
    if (file.match) writing.writeBlock(file.match)
    return writing.finish()
  }

  ////////////////
  // ## Rules
  ////////////////

  /** `rule`'s registrations in the other language, the twin of its own first;  none for a rule made while parsing. */
  twinsOf(rule: P.Rule): P.Rule[] {
    return this.twins.get(rule) ?? []
  }

  /** Note that `ruleName` held up a line. */
  noteUntranslatable(ruleName: string): void {
    this.untranslatable.set(ruleName, (this.untranslatable.get(ruleName) ?? 0) + 1)
  }

  /** The other language's word for `it`, as an object:  Spanish's `eso`;  `it` for a language with none. */
  get itWord(): string {
    return [...(this.to.words.itWords ?? [])][0] ?? "it"
  }

  /** The words before which the other language leaves `it` out, e.g. Spanish's `es`, `no está` -- its `implied_it`'s. */
  get impliedItWords(): string[] {
    if (!this._impliedItWords) {
      const rules = membersOf(this.to.parser.rules.implied_it)
      const wordRule = rules.map((rule) => (rule as { wordRule?: P.Rule }).wordRule).find(Boolean)
      this._impliedItWords = wordRule ? literalAlternatives(wordRule) : []
    }
    return this._impliedItWords
  }
  private _impliedItWords?: string[]

  /** Is `word` our language's `it`? */
  isIt(word: string): boolean {
    const words = this.from.words.itWords ?? new Set(["it"])
    return words.has(word.toLowerCase()) || word.toLowerCase() === "it"
  }
}

/**
 * Thrown when a match can't be written in the other language:  its rule has no twin there, a slot can't be filled,
 * or the dictionary lacks a name.
 * - Caught a line at a time:  the line keeps its English, marked TODO.
 */
export class Untranslatable extends Error {
  /** The rule that couldn't be written. */
  declare ruleName: string

  constructor(message: string, ruleName: string) {
    super(message)
    this.ruleName = ruleName
  }
}
Untranslatable.prototype.name = "Untranslatable"

////////////////
// ## Writing one file
////////////////

/**
 * One file being written:  its lines out, and what each lacked.
 * - Made by `Translator.translateFile()`.
 */
class FileWriting {
  declare translator: Translator
  declare file: SourceFile
  /** The source's lines. */
  declare sourceLines: string[]
  /** The lines out, by index;  `undefined` where none was written yet. */
  declare lines: Array<string | undefined>
  /** Why each line still needs a person, by index. */
  declare todo: Map<number, string[]>
  /** What each line asked the dictionary for and didn't find, by index. */
  declare missing: Map<number, MissingName[]>
  /** Why each line written may read in the wrong order, by index -- see `TranslatedFile.risky`. */
  declare risky: Map<number, string>
  /** How many lines each statement over several lines takes, by index -- see `TranslatedFile.spans`. */
  declare spans: Map<number, number>
  /** What a line's comment or JSX text asked for and didn't find:  kept as written, so never a TODO. */
  declare soft: MissingName[]
  /** The scope rule records (`scope.rules`) of the project, by the rule each made -- see `declarationOf()`. */
  declare declarations: Map<P.Rule, P.ScopeRule> | undefined

  constructor(translator: Translator, file: SourceFile) {
    this.translator = translator
    this.file = file
    this.sourceLines = file.contents.split("\n")
    this.lines = []
    this.todo = new Map()
    this.missing = new Map()
    this.risky = new Map()
    this.spans = new Map()
    this.soft = []
  }

  /** Note `names` missing on line `index`. */
  noteMissing(index: number, names: MissingName[]): void {
    if (names.length) this.missing.set(index, [...(this.missing.get(index) ?? []), ...names])
  }

  /** The finished file:  any line nobody wrote, as it was. */
  finish(): TranslatedFile {
    const lines = this.sourceLines.map((line, index) => this.lines[index] ?? line)
    return {
      path: this.file.path,
      lines,
      todo: this.todo,
      missing: this.missing,
      risky: this.risky,
      spans: this.spans
    }
  }

  /** Write each line of `block`, and of the blocks inside it. */
  writeBlock(block: P.Match): void {
    for (const item of block.matched) {
      if (!(item instanceof P.Match)) continue
      if (item.rule instanceof SP.Block) this.writeBlock(item)
      else this.writeLine(item)
    }
  }

  /**
   * Write `line`, a `line` match:  its bullet, statement and comment;  then the lines of any body under it.
   * - A statement that won't write keeps its English, marked TODO.
   */
  writeLine(line: P.Match): void {
    const index = line.line ?? 0
    const source = this.sourceLines[index] ?? ""
    const indent = /^[ \t]*/.exec(source)![0]
    const children = line.matched.filter((each): each is P.Match => each instanceof P.Match)
    const comment = children.find((each) => each.ruleName === "comment")
    const statement = children.find((each) => each !== comment && each.ruleName !== "blank_line")
    if (!statement) {
      this.lines[index] = comment ? `${indent}${this.writeComment(comment)}` : source
      this.noteMissing(index, this.translator.names.takeMissing())
      return
    }
    const bullet = /^-[ \t]+/.exec(source.slice(indent.length))?.[0] ?? ""
    const names = this.translator.names
    this.soft = []
    names.takeMissing()
    let text: string
    const why: string[] = []
    try {
      if (statement.rule instanceof SP.ParseError) throw new Untranslatable("a line that doesn't parse", "parse_error")
      text = this.render(statement, index)
    } catch (error) {
      if (!(error instanceof Untranslatable)) throw error
      this.translator.noteUntranslatable(error.ruleName)
      why.push(error.message)
      text = this.sourceText(statement)
    }
    const missing = names.takeMissing()
    this.noteMissing(index, [...missing, ...this.soft])
    why.push(...missing.map(({ kind, words }) => `${kind} "${words}"`))
    let out = `${indent}${bullet}${text}`
    if (comment) {
      out += `${this.commentGap(source, comment)}${this.writeComment(comment)}`
      this.noteMissing(index, names.takeMissing())
    }
    const risk = why.length ? undefined : riskIn(statement)
    if (risk) this.risky.set(index, risk)
    if (why.length) {
      this.todo.set(index, why)
      out += `${comment ? "  " : "  "}// TODO: translate (${why.join(", ")})`
    }
    const outLines = out.split("\n")
    outLines.forEach((each, at) => (this.lines[index + at] = each))
    if (outLines.length > 1) this.spans.set(index, outLines.length)
    for (const body of bodiesIn(statement)) this.writeBlock(body)
  }

  /** `match`'s text as the source has it, its first line only for one with a body. */
  sourceText(match: P.Match): string {
    return SP.SpellStatement.firstLineOf(match)
  }

  /** The whitespace between `comment` and what's before it on `source`'s line. */
  commentGap(source: string, comment: P.Match): string {
    const at = source.lastIndexOf(comment.inputText.trimEnd())
    return at < 0 ? "  " : (/[ \t]*$/.exec(source.slice(0, at))?.[0] ?? "  ")
  }

  /** A comment's text in the other language, through the dictionary:  its marker (`//`, `##`) kept. */
  writeComment(comment: P.Match): string {
    const text = comment.inputText.trimEnd()
    const [, marker = "", words = ""] = /^(\/\/+\s*|#+\s*|--\s*)?([\s\S]*)$/.exec(text) ?? []
    if (!words.trim()) return text
    const translated = this.translator.names.comment(words.trim())
    return translated === undefined ? text : `${marker}${translated}`
  }

  ////////////////
  // ## Rendering
  ////////////////

  /** `match`, a statement on line `index`, in the other language. */
  render(match: P.Match, index: number): string {
    return assemble(this.write(match, { line: index }), this.translator)
  }

  /** The pieces of `match` in the other language -- throws `Untranslatable` if it can't. */
  write(match: P.Match, context: WriteContext): Piece[] {
    const { rule } = match
    if (rule instanceof SP.Block) return []
    if (rule instanceof SpellJSX) return [this.writeJSX(match, context)]
    if (
      rule instanceof MethodSignature ||
      rule instanceof QuotedSignatureWords ||
      rule instanceof QuotedMethodSignature
    ) {
      return this.writeDeclaredPhrase(match)
    }
    const twins = this.translator.twinsOf(rule)
    if (!twins.length) {
      const declaration = this.declarationOf(rule)
      const phrase = declaration?.declaredBy && phraseIn(declaration.declaredBy)
      if (phrase) return this.writeCall(match, phrase, context)
      // a method a project we import declares:  its words as it declares them
      const { methodName } = rule as { methodName?: string }
      const imported = methodName ? this.translator.importedMethod(methodName) : undefined
      if (imported?.name) return this.writeCall(match, imported.name.replace(/^"|"$/g, ""), context)
      if (declaration) throw this.cant(match, `call ${match.ruleName}`)
    }
    if (rule instanceof Wording) return this.writeWording(match, twins)
    if (!match.matched.some((each) => each instanceof P.Match) || rule instanceof SubjectRule) {
      return this.writeLeaf(match, twins, context)
    }
    if (!twins.length) throw this.cant(match)
    const isIt = this.isItMatch(match)
    if (isIt) return [{ text: this.translator.itWord }]
    let lastError: Untranslatable | undefined
    for (const twin of twins) {
      try {
        const pieces = new TemplateWriting(this, match, twin, context).write()
        return rule instanceof CompoundExpression ? this.leavingItOut(match, pieces) : pieces
      } catch (error) {
        if (!(error instanceof Untranslatable)) throw error
        lastError = error
      }
    }
    throw lastError ?? this.cant(match)
  }

  /**
   * `pieces`, an expression starting with `it`, without it where the language leaves it out:
   * Spanish's `si eso está boca arriba` is `si está boca arriba` (its `implied_it`).
   */
  leavingItOut(match: P.Match, pieces: Piece[]): Piece[] {
    const lhs = (match.groups as { lhs?: P.Match }).lhs
    if (!lhs || !this.isItMatch(lhs) || pieces[0]?.text !== this.translator.itWord) return pieces
    const rest = assemble(pieces.slice(1), this.translator)
    const leadsIn = this.translator.impliedItWords.some((words) => rest === words || rest.startsWith(`${words} `))
    return leadsIn ? pieces.slice(1) : pieces
  }

  /** An `Untranslatable` for `match`'s rule. */
  cant(match: P.Match, why = `rule ${match.ruleName}`): Untranslatable {
    return new Untranslatable(why, match.ruleName ?? match.rule.constructor.name)
  }

  /** Is `match` the variable `it`, e.g. `the? {identifier}` holding just `it`? */
  isItMatch(match: P.Match): boolean {
    return (
      /^(?:variable|known_variable|identifier)$/.test(match.ruleName ?? "") &&
      this.translator.isIt(match.inputText.trim())
    )
  }

  /**
   * A match with no rule below it:  a name, a number, a text, a word rule's form, a value word (`yes`, `first`).
   */
  writeLeaf(match: P.Match, twins: P.Rule[], context: WriteContext): Piece[] {
    const { rule } = match
    const raw = match.inputText.trim()
    const { names } = this.translator
    if (rule.zeroWidth) return []
    if (rule instanceof NumberLiteral) return [{ text: raw }]
    if (rule instanceof TextLiteral) {
      const words = raw.slice(1, -1)
      // one of a Spell UI attribute's values, `color={... "blue"}`:  its word there, `"azul"`
      const { element } = context
      const { elements } = this.translator
      if (element && elements?.takesValues(element.tag, element.attribute)) {
        return [{ text: `"${elements.attribute(element.tag, element.attribute, words).value ?? words}"` }]
      }
      const translated = context.slot === "alias" ? names.phrase(words) : names.text(words)
      return [{ text: `"${translated ?? words}"` }]
    }
    if (rule instanceof SubjectIt) throw this.cant(match, "subject it")
    if (this.translator.isIt(raw) && /identifier|variable/.test(match.ruleName ?? "")) {
      return [{ text: this.translator.itWord }]
    }
    const twin = twins[0]
    if (twin instanceof SubjectRule) {
      if (!twin.wordRule) throw this.cant(match, `${match.ruleName}:  no word in ${this.translator.to.name}`)
      return literalPieces(twin.wordRule, this.translator)
    }
    if (twin instanceof P.Literal) return [literalPiece(alternativesOf(twin.literal), 0, this.translator)]
    if (twin instanceof P.Literals)
      return twin.literals
        .filter((each) => !each.optional)
        .map((each) => literalPiece(alternativesOf(each.literal), 0, this.translator))
    const valueMap = (twin as P.Pattern | undefined)?.VALUE_MAP
    if (valueMap && Object.keys(valueMap).length) return [this.writeValueWord(match, twin as P.Pattern)]
    return [this.writeName(match, raw)]
  }

  /**
   * A value word, e.g. `yes` or `first`, as the other language's word with the same value.
   * - Their words that are forms of one (`primero`, `primera` ...):  the first, agreeing with its noun.
   * - Otherwise the one in the same place among the words for that value:  `yes` is `true`'s second word, as `sí` is.
   */
  writeValueWord(match: P.Match, twin: P.Pattern): Piece {
    const raw = match.inputText.trim().toLowerCase()
    const ownMap = (match.rule as P.Pattern).VALUE_MAP ?? {}
    const value = ownMap[raw] ?? match.value
    const same = (map: Record<string, unknown>) =>
      withoutAccentTwins(Object.keys(map).filter((key) => map[key] === value))
    const ours = same(ownMap)
    const theirs = same(twin.VALUE_MAP)
    if (!theirs.length) throw this.cant(match, `value ${raw}`)
    const stem = (word: string) => word.replace(/(os|as|o|a|es|s)$/, "")
    const forms = theirs.filter((each) => stem(each) === stem(theirs[0]!))
    if (forms.length > 1) return { text: forms[0]!, agree: forms }
    const at = Math.min(Math.max(ours.indexOf(raw), 0), theirs.length - 1)
    return { text: theirs[at]! }
  }

  /** A name a person chose, through the dictionary:  a type's, or any other;  quoted if it was. */
  writeName(match: P.Match, raw: string): Piece {
    const { names } = this.translator
    const quoted = /^".*"$/.test(raw)
    const words = quoted ? raw.slice(1, -1) : raw
    const isType = /type/.test(match.ruleName ?? "")
    let translated: string | undefined
    let gender: string | undefined
    if (isType) {
      const type = names.type(words)
      translated = type?.name
      gender = type?.gender
    } else {
      translated = this.builtInMember(words) ?? names.name(words)
    }
    const text = translated ?? words
    // plural as ours was:  `as` (`ace`) is one ace, though it ends in `s`
    const plural = this.translator.from.inflector.plurality(words.split(" ").at(-1)!) === "plural"
    return { text: quoted ? `"${text}"` : text, noun: true, gender, plural }
  }

  /** `words`, if a built-in type's member (`name`, `length`), as the other language's first word for it. */
  builtInMember(words: string): string | undefined {
    const theirs = this.translator.to.words.builtInMembers
    const ours = this.translator.from.words.builtInMembers
    const key = ours ? Object.keys(ours).find((each) => ours[each]!.includes(words)) : words
    return key ? theirs?.[key]?.[0] : undefined
  }

  /** A word rule's form (`is not`, `msec`), as the other language's form with the same meaning. */
  writeWording(match: P.Match, twins: P.Rule[]): Piece[] {
    const twin = twins[0]
    if (!(twin instanceof P.Choice)) throw this.cant(match)
    const meaning = Wording.meaningOf(match)
    const forms = twin.rules
      .filter((each) => (meaning ? each.matchGroup === meaning : !each.matchGroup))
      .flatMap(literalAlternatives)
    if (!forms.length) throw this.cant(match, `meaning ${meaning ?? "plain"} of ${match.ruleName}`)
    // the first form, its article agreeing:  `es un`, `es una`
    return [literalPiece(forms, 0, this.translator)]
  }

  ////////////////
  // ## Phrases:  methods and quoted phrases
  ////////////////

  /**
   * A method's or quoted phrase's words where it's DECLARED, through the dictionary's phrases:
   * `turn it face up` => `voltearla boca arriba`.
   * - Its `it` fused onto its verb where the language does that, agreeing with the type it's on:
   *   `voltear eso` => `voltearla` on a card.
   */
  writeDeclaredPhrase(match: P.Match): Piece[] {
    const raw = match.inputText.trim()
    const quoted = /^".*"$/.test(raw)
    const words = quoted ? raw.slice(1, -1) : raw
    const translated = this.translator.names.phrase(words)
    if (translated === undefined) return [{ text: raw }]
    const fused = this.fuseIt(translated, typeOf(match.scope))
    return [{ text: quoted ? `"${fused}"` : fused, raw: true }]
  }

  /** `phrase` with `<verb> eso` fused into `<verb>lo` / `<verb>la`, by the gender of `typeName`'s type. */
  fuseIt(phrase: string, typeName: string | undefined): string {
    const { to } = this.translator
    if (!to.words.fusedIt || !typeName) return phrase
    const words = phrase.split(" ")
    const at = words.findIndex((word, index) => index > 0 && to.words.itWords?.has(word))
    if (at < 1 || !/(?:ar|er|ir|ár|ér|ír)$/i.test(words[at - 1]!)) return phrase
    const type = this.translator.names.type(typeName)
    const pronoun = type?.gender === "feminine" ? "la" : "lo"
    words.splice(at - 1, 2, `${words[at - 1]}${pronoun}`)
    return words.join(" ")
  }

  /**
   * A CALL of a method or quoted phrase this project declared (or one it imports), `ourPhrase` its words as declared:
   * its phrase in the other language
   * (`voltearla boca arriba`), each of its slots filled with the call's arguments, translated.
   * - Slots:  `it` (or a verb with `it` fused on, `voltearla`), `(name)`, and `a <type>`.
   * - Matched by what they are:  `it` to `it`, `(rank)` to `(rango)`, `a card` to `una carta`;  else in order.
   * - A call that says `not` says it before the phrase:  `no es una figura`.
   */
  writeCall(match: P.Match, ourPhrase: string, context: WriteContext): Piece[] {
    const { names, to } = this.translator
    const theirPhrase = names.phrase(ourPhrase)
    if (theirPhrase === undefined) return [{ text: match.inputText.trim() }]
    const ourSlots = phraseSlots(ourPhrase, this.translator, "from")
    // `a <type>` is a slot only where ours has one:  `es una carta numérica` is words
    const hasTypes = ourSlots.some((slot) => slot.kind === "type")
    // an imported project's own words, kept as it declares them:  read as ours are, `increment it`
    const theirSlots = phraseSlots(theirPhrase, this.translator, theirPhrase === ourPhrase ? "from" : "to", hasTypes)
    const args = callArguments(match)
    if (args.length !== ourSlots.filter((slot) => slot.kind !== "word").length) {
      throw this.cant(match, `call ${match.ruleName}:  ${args.length} arguments`)
    }
    // each of our slots' argument, by its slot
    const argumentFor = new Map(ourSlots.filter((slot) => slot.kind !== "word").map((slot, at) => [slot, args[at]!]))
    const pieces: Piece[] = []
    const operator = (match.groups as { operator?: P.Match }).operator
    if (operator && SP.Negatable.isNegated(operator)) pieces.push({ text: negationWord(to) })
    const used = new Set<PhraseSlot>()
    for (const slot of theirSlots) {
      if (slot.kind === "word") {
        pieces.push(wordPiece(slot.text, this.translator))
        continue
      }
      const ours = matchingSlot(slot, [...argumentFor.keys()], used, names)
      if (!ours) throw this.cant(match, `call ${match.ruleName}:  slot ${slot.text}`)
      used.add(ours)
      if (slot.verb) pieces.push({ text: slot.verb })
      pieces.push(...this.write(argumentFor.get(ours)!, { ...context, slot: "argument" }))
    }
    return pieces
  }

  /** The scope record of the rule `rule` is, if this project made it while parsing (a method's call). */
  declarationOf(rule: P.Rule): P.ScopeRule | undefined {
    if (!this.declarations) {
      this.declarations = new Map()
      const scope = this.file.match?.scope
      for (let list = scope?.rules; list; list = list.parent as P.ScopeList<P.ScopeRule> | undefined) {
        for (const record of list.get()) if (record.instance) this.declarations.set(record.instance, record)
      }
    }
    const found = this.declarations.get(rule)
    if (found) return found
    // a call read ahead of its method (`DynamicMethodRule.ahead`):  the method's own rule, by its name
    const { methodName } = rule as { methodName?: string }
    if (!methodName) return undefined
    return [...this.declarations.values()].find(
      (record) =>
        (record.instance as { methodName?: string } | undefined)?.methodName === methodName && record.declaredBy
    )
  }

  ////////////////
  // ## JSX
  ////////////////

  /**
   * A JSX element as written, each `{expression}` in it translated, and each text the dictionary has.
   * - Its tags, attributes and their values through `Translator.elements`, when given (epic `spanish` P25):
   *   `<ui-text color="red">` => `<es-texto color="rojo">`;  else they stay as written.
   * - Starting below its statement's line:  the line break and indent before it kept.
   */
  writeJSX(match: P.Match, context: WriteContext): Piece {
    const { contents } = this.file
    const { elements } = this.translator
    const start = match.start!
    const end = match.end!
    const edits: Array<{ start: number; end: number; text: string }> = []
    const visit = (each: P.Match | undefined, tag = "") => {
      if (!each) return
      const data = each.data as SP.JSXMatchData & { children?: P.Match[] }
      if (each.rule instanceof SpellJSX && elements) {
        const written = /^<([\w.-]+)/.exec(contents.slice(each.start!))?.[1]
        const theirs = written && elements.tag(written)
        if (written && theirs) {
          edits.push({ start: each.start! + 1, end: each.start! + 1 + written.length, text: theirs })
          const closing = contents.lastIndexOf(`</${written}`, each.end! - 1)
          if (closing > each.start!) edits.push({ start: closing + 2, end: closing + 2 + written.length, text: theirs })
        }
        data.attributes?.forEach((attribute) => visit(attribute, written ?? ""))
        data.children?.forEach((child) => visit(child))
        return
      }
      if (each.rule instanceof SpellJSXExpression && data.expression) {
        const inner = assemble(this.write(data.expression, context), this.translator)
        edits.push({ start: each.start!, end: each.end!, text: `{${inner}}` })
        return
      }
      if (each.rule instanceof SpellJSXText) {
        const text = each.inputText.trim()
        const { names } = this.translator
        const before = names.missing.length
        const translated = text && names.text(text)
        this.soft.push(...names.missing.splice(before))
        if (translated && translated !== text) {
          const at = contents.indexOf(text, each.start!)
          if (at >= 0) edits.push({ start: at, end: at + text.length, text: translated })
        }
        return
      }
      if (each.ruleName === "jsxAttribute") {
        const expression = data.expression ?? data.statement
        const source = contents.slice(each.start!, each.end!)
        const open = source.indexOf("{")
        // the match may start with the line break before it
        const lead = /^\s*/.exec(source)![0].length
        const [, name = "", quoted, value] = /^([\w:.-]+)(?:\s*=\s*("([^"]*)"))?/.exec(source.slice(lead)) ?? []
        // its name, and a text value, in the other language;  an event's name (`onClick`) is the platform's
        if (elements && name && !/^on[A-Z]/.test(name)) {
          const localized = elements.attribute(tag, name, value)
          if (localized.attribute !== name) {
            edits.push({ start: each.start! + lead, end: each.start! + lead + name.length, text: localized.attribute })
          }
          if (quoted && localized.value !== value) {
            const at = each.start! + source.indexOf(quoted)
            edits.push({ start: at, end: at + quoted.length, text: `"${localized.value}"` })
          }
        }
        if (expression && open >= 0) {
          const inner = assemble(
            this.write(expression, { ...context, element: { tag, attribute: name } }),
            this.translator
          )
          edits.push({ start: each.start! + open, end: each.start! + source.lastIndexOf("}") + 1, text: `{${inner}}` })
        }
        return
      }
      data.attributes?.forEach((attribute) => visit(attribute, tag))
      data.children?.forEach((child) => visit(child))
    }
    visit(match)
    if (elements) this.soft.push(...elements.takeMissed())
    let text = ""
    let at = start
    for (const edit of edits.sort((a, b) => a.start - b.start)) {
      text += contents.slice(at, edit.start) + edit.text
      at = edit.end
    }
    text += contents.slice(at, end)
    // below its statement's line:  the line break, and the indent of the line it starts on
    if ((match.line ?? context.line) > context.line) {
      const lineStart = contents.lastIndexOf("\n", start - 1) + 1
      text = `\n${"\n".repeat((match.line ?? 0) - context.line - 1)}${contents.slice(lineStart, start)}${text}`
    }
    return { text, raw: true }
  }
}

////////////////
// ## Writing one rule from its template
////////////////

/**
 * One match written with its twin's syntax:  walk the twin's rules, filling each slot from the match's groups.
 * - Choices:  the alternative whose slots the match has;  else the one in the same place as ours;  else the first.
 * - Optional words (`:?`, `(then|:)?`):  there if ours were, matched up in order -- a symbol to the same symbol.
 */
class TemplateWriting {
  declare writing: FileWriting
  declare match: P.Match
  declare twin: P.Rule
  declare context: WriteContext
  /** Our match's groups, each array taken from as its slots are written. */
  declare groups: Record<string, P.Match[]>
  /** Our syntax's optional and choice words, each with what our match used:  see `wordChoicesOf()`. */
  declare ourWords: WordChoice[]
  /** Our repeats already written, by `writeRepeat()`. */
  usedRepeats = new Set<P.Match>()
  /** Their syntax's optional and choice words, in order. */
  declare theirWords: WordPlace[]

  constructor(writing: FileWriting, match: P.Match, twin: P.Rule, context: WriteContext) {
    this.writing = writing
    this.match = match
    this.twin = twin
    this.context = context
    this.groups = {}
    for (const [name, value] of Object.entries(match.groups as P.MatchGroups)) {
      if (value) this.groups[name] = [value].flat()
    }
    this.ourWords = wordChoicesOf(match, writing.translator.from)
    this.theirWords = topLevelWords(twin, writing.translator.to)
  }

  /** The pieces, or throws `Untranslatable`. */
  write(): Piece[] {
    const rules = this.twin instanceof P.Sequence ? this.twin.rules : [this.twin]
    const pieces = rules.flatMap((rule) => this.writeRule(rule))
    // a body the twin's syntax took out of its rules, e.g. `if`'s `{statement_body}`:  inline only
    const body = this.groups.body?.[0]
    if (body && !(body.rule instanceof SP.Block) && !rules.some((rule) => mentions(rule, "body"))) {
      pieces.push(...this.writing.write(body, this.context))
    }
    return pieces
  }

  /** The pieces `rule`, one of the twin's syntax's, writes. */
  writeRule(rule: P.Rule): Piece[] {
    if (rule instanceof P.Subrule) return this.writeSlot(rule)
    if (rule instanceof P.Repeat) return this.writeRepeat(rule)
    if (rule instanceof P.Literal || rule instanceof P.Literals) return this.writeWords(rule)
    if (rule instanceof P.Choice) return this.writeChoice(rule)
    if (rule instanceof P.Sequence) return this.writeSequence(rule)
    throw this.writing.cant(this.match, `syntax ${rule.toRulexSyntax?.() ?? rule.constructor.name}`)
  }

  /** A `{slot}`:  our group of that name, translated. */
  writeSlot(rule: P.Subrule): Piece[] {
    const name = rule.matchGroup || rule.rule
    if (rule.zeroWidthRule && !rule.matchGroup) return []
    const body = BODY_KEYWORDS[rule.rule]
    if (body) {
      // a lead-in, `where:`, is a rule of its own;  the body under it is written line by line
      const leadIn = body.leadIn ? this.take(rule.rule) : undefined
      if (leadIn) return this.writing.write(leadIn, this.context)
      const match = this.take("body") ?? this.take(name)
      if (!match || match.rule instanceof SP.Block) return []
      return this.writing.write(match, this.context)
    }
    const match = this.take(name)
    if (!match) {
      if (rule.optional) return []
      throw this.writing.cant(this.match, `slot ${name} of ${this.match.ruleName}`)
    }
    if (rule.zeroWidthRule) return []
    // a word rule's form, by its meaning:  `is not` => `no es`
    const target = this.writing.translator.to.parser.rules[rule.rule]
    if (target instanceof Wording) return this.writing.writeWording(match, [target])
    return this.writing.write(match, { ...this.context, slot: name })
  }

  /** A repeat:  each of our items, with the delimiter in the same place in theirs (`,` or `y`). */
  writeRepeat(rule: P.Repeat): Piece[] {
    const item = rule.rule
    const name = rule.matchGroup || item.matchGroup || (item instanceof P.Subrule ? item.rule : undefined)
    // ours, unnamed:  the match itself, if a repeat, else the first repeat in it
    const ourRepeat = this.match.matched.find(
      (each): each is P.Match => each instanceof P.Match && each.rule instanceof P.Repeat && !this.usedRepeats.has(each)
    )
    const own = this.match.rule instanceof P.Repeat ? [this.match] : ourRepeat ? [ourRepeat] : []
    if (ourRepeat) this.usedRepeats.add(ourRepeat)
    const found = name && this.groups[name]?.length ? this.groups[name]! : own
    const items = found.flatMap((each) => (each.rule instanceof P.Repeat ? itemsOf(each) : [each]))
    const repeatMatch = found.find((each) => each.rule instanceof P.Repeat)
    if (name) delete this.groups[name]
    if (!items.length && !rule.optional && (rule.minCount ?? 1) > 0) {
      throw this.writing.cant(this.match, `repeat ${name} of ${this.match.ruleName}`)
    }
    const delimiters = delimitersBetween(repeatMatch ?? this.match, items)
    const pieces: Piece[] = []
    items.forEach((each, at) => {
      if (at > 0 && rule.delimiter) pieces.push(...this.writeDelimiter(rule.delimiter, delimiters[at - 1]))
      pieces.push(...this.writing.write(each, { ...this.context, slot: name ?? "item" }))
    })
    return pieces
  }

  /** Their delimiter in the place of ours, `ours`:  `and` is `(,|and)`'s second, so `y` of `(,|y|e)`. */
  writeDelimiter(delimiter: P.Rule, ours: string | undefined): Piece[] {
    const theirs = literalAlternatives(delimiter)
    const { to } = this.writing.translator
    const word = ours && CONJUNCTIONS[to.lang]?.[ours.toLowerCase()]
    if (word && theirs.includes(word)) return [{ text: word }]
    const ourAlternatives = this.ourDelimiterAlternatives()
    const at = ours ? ourAlternatives.indexOf(ours) : 0
    return [literalPiece(theirs, at >= 0 && at < theirs.length ? at : 0, this.writing.translator)]
  }

  /** Our own syntax's delimiter's alternatives, e.g. `[",", "and"]`. */
  ourDelimiterAlternatives(): string[] {
    const repeat = findRule(this.match.rule, (rule) => rule instanceof P.Repeat && !!rule.delimiter) as
      | P.Repeat
      | undefined
    return repeat?.delimiter ? literalAlternatives(repeat.delimiter) : []
  }

  /** Words:  a named one if we have its group;  an optional one if ours was there;  a choice by place. */
  writeWords(rule: P.Literal | P.Literals): Piece[] {
    if (rule.matchGroup) {
      const ours = this.take(rule.matchGroup)
      if (!ours && rule.optional) return []
      return this.namedWords(rule, ours)
    }
    const ours = this.oursFor(rule)
    if (rule.optional && !(ours ? ours.present : this.saidArticle(rule))) return []
    const { translator } = this.writing
    if (rule instanceof P.Literal) {
      const alternatives = alternativesOf(rule.literal)
      return [literalPiece(alternatives, indexFor(ours, alternatives.length), translator)]
    }
    // each word in turn, an optional one only if ours was there:  `(para|por) cada?`
    return rule.literals.flatMap((each, inner) => {
      const alternatives = alternativesOf(each.literal)
      const theirs = this.oursFor(rule, inner)
      if (each.optional && !theirs?.present) return []
      return [literalPiece(alternatives, indexFor(theirs, alternatives.length), translator)]
    })
  }

  /**
   * Named words, e.g. `(operator:más|mas|+)`, for ours, `ours`:  the same word if they have it (`+`),
   * else the one in the same place as ours among our syntax's (`plus` is `(plus|+)`'s first, so `más`).
   */
  namedWords(rule: P.Rule, ours: P.Match | undefined): Piece[] {
    const theirs = literalAlternatives(rule)
    const value = ours?.inputText.trim()
    if (value !== undefined && theirs.includes(value)) return [{ text: value }]
    const ourRule = findRule(this.match.rule, (each) => each.matchGroup === rule.matchGroup)
    const at = value === undefined || !ourRule ? 0 : literalAlternatives(ourRule).indexOf(value)
    return [literalPiece(theirs, at >= 0 && at < theirs.length ? at : 0, this.writing.translator)]
  }

  /** A choice:  the alternative whose groups we have, else the first plain one. */
  writeChoice(rule: P.Choice): Piece[] {
    if (rule.matchGroup && this.has(rule.matchGroup) && !hasNamedGroups(rule)) {
      const ours = this.take(rule.matchGroup)!
      if (!hasSlot(rule)) return this.namedWords(rule, ours)
      return this.writing.write(ours, { ...this.context, slot: rule.matchGroup })
    }
    const scored = rule.rules.map((alternative) => ({ alternative, names: namedGroupsIn(alternative) }))
    const filled = scored
      .filter(({ names }) => names.length && names.every((name) => this.has(name)))
      .sort((a, b) => b.names.length - a.names.length)[0]
    const plains = scored.filter(({ names }) => !names.length)
    const ours = this.oursFor(rule)
    const preferredForm = preferred(
      plains.map(({ alternative }) => literalAlternatives(alternative)[0] ?? ""),
      this.writing.translator.to
    )
    const plain =
      plains.find(
        ({ alternative }) => preferredForm !== undefined && literalAlternatives(alternative)[0] === preferredForm
      ) ??
      plains[indexFor(ours, plains.length)] ??
      plains[0]
    const some = scored.find(({ names }) => names.some((name) => this.has(name)))
    const picked = filled ?? (rule.matchGroup ? undefined : plain) ?? some
    if (!picked) {
      if (rule.optional) return []
      throw this.writing.cant(this.match, `choice ${rule.toRulexSyntax?.()}`)
    }
    if (rule.optional && !picked.names.length && !(ours ? ours.present : this.saidArticle(rule))) return []
    return this.writeRule(picked.alternative)
  }

  /** A sequence in parentheses:  optional ones there if we have their groups (or, words alone, if ours was). */
  writeSequence(rule: P.Sequence): Piece[] {
    const names = namedGroupsIn(rule)
    if (rule.matchGroup && names.length === 0) {
      if (!this.take(rule.matchGroup) && rule.optional) return []
    } else if (rule.optional) {
      if (names.length && !names.some((name) => this.has(name))) return []
      if (!names.length && !this.oursFor(rule)?.present) return []
    }
    return rule.rules.flatMap((each) => this.writeRule(each))
  }

  /**
   * For their optional article with nothing of ours in its place (`(el|la)? {property}` for our `the {property}`):
   * did our match say an article of that kind, as a word of its own syntax?
   */
  saidArticle(rule: P.Rule): boolean {
    const { from, to } = this.writing.translator
    const kind = literalAlternatives(rule)
      .map((each) => articleKindOf(each, to))
      .find(Boolean)
    if (!kind) return false
    return this.match.matched.some(
      (each) =>
        each instanceof P.Match && articleKindOf(each.inputText.trim().split(/\s+/)[0]!.toLowerCase(), from) === kind
    )
  }

  /** Do we have a group `name` left to write? */
  has(name: string): boolean {
    return !!this.groups[name]?.length || (BODY_KEYWORDS[name] !== undefined && !!this.groups.body?.length)
  }

  /** Take our next match in group `name`, if any. */
  take(name: string): P.Match | undefined {
    return this.groups[name]?.shift()
  }

  /**
   * What our syntax's word in the place of their `rule` (its `inner`th word, for words in a row) matched --
   * see `wordChoicesOf()`.
   * - A symbol, `:`, is the same symbol in ours, in order.
   * - An optional word is our optional word in the same place among them;  a choice, our choice in the same place.
   * - None when the two syntaxes don't have as many:  an optional word is then left out, a choice takes its first.
   */
  oursFor(rule: P.Rule, inner?: number): WordChoice | undefined {
    const place = this.theirWords.find((each) => each.rule === rule && each.inner === inner)
    if (!place) return undefined
    const sameKind = (each: { symbol?: string; optional: boolean }) =>
      place.symbol ? each.symbol === place.symbol : !each.symbol && each.optional === place.optional
    const theirs = this.theirWords.filter(sameKind)
    const ours = this.ourWords.filter(sameKind)
    if (!place.symbol && theirs.length !== ours.length) return undefined
    return ours[theirs.indexOf(place)]
  }
}

/** Which alternative to write, of `count`:  the one in the same place as ours, if that's one of them;  else the first. */
function indexFor(ours: WordChoice | undefined, count: number): number {
  const at = ours?.index
  return at !== undefined && at >= 0 && at < count ? at : 0
}

////////////////
// ## Pieces and assembling them
////////////////

/**
 * A word or more of output, before spacing and agreement.
 * - `agree`:  the forms it may take to agree with the noun after it, e.g. `["el", "la", "los", "las"]`.
 * - `noun`:  a name, which an article before it agrees with;  `gender`, if known.
 * - `raw`:  written as is, its spacing too (a phrase, JSX).
 */
type Piece = { text: string; agree?: string[]; noun?: boolean; gender?: string; plural?: boolean; raw?: boolean }

/**
 * Where a match is being written:  its statement's line, and the slot it fills.
 * - `element`:  inside a JSX attribute's `{expression}`, the element's tag and the attribute, as written.
 */
type WriteContext = { line: number; slot?: string; element?: { tag: string; attribute: string } }

/**
 * `pieces` as text:  each `agree` piece agreeing with the noun after it, spaced, contractions made (`a el` => `al`).
 * - Spacing:  none before `,` `:` `)`, none after `(`.
 */
function assemble(pieces: Piece[], translator: Translator): string {
  // words of a syntax's several, one piece each:  so `es un` agrees, `es una carta`
  const words = pieces
    .flatMap((piece) =>
      piece.raw || piece.noun || piece.agree || !/ /.test(piece.text) || /^"/.test(piece.text)
        ? [piece]
        : piece.text.split(" ").map((word) => wordPiece(word, translator))
    )
    .filter((piece) => piece.text !== "")
  words.forEach((piece, at) => {
    if (!piece.agree) return
    const noun = words.slice(at + 1).find((each) => !each.agree)
    // an adjective with no name after it says something of the name before it:  `la pila es vacía` (J146)
    const isArticle = !!articleKindOf(piece.text, translator.to)
    const before =
      !isArticle && !noun?.noun
        ? words
            .slice(0, at)
            .reverse()
            .find((each) => each.noun)
        : undefined
    if (before) piece.text = agreeing(piece, before, translator)
    else if (noun && /\p{L}/u.test(noun.text)) piece.text = agreeing(piece, noun, translator)
  })
  let text = ""
  for (const piece of words) {
    const glueLeft = /^[,:;)\]]/.test(piece.text) && !piece.raw
    const glueRight = /[([]$/.test(text)
    if (text && !glueLeft && !glueRight && !piece.text.startsWith("\n")) text += " "
    text += piece.text
  }
  return contract(text.replace(/(?<=\S) \. \. \.(?= )/g, " ..."), translator.to)
}

/** `piece`'s form agreeing with `noun` in gender and number, e.g. `la` before `carta`, `nuevas` before `cartas`. */
function agreeing(piece: Piece, noun: Piece, translator: Translator): string {
  const { to, names } = translator
  const word = noun.text.replace(/^"|"$/g, "").split(/\s+/)[0] ?? ""
  if (!/\p{L}/u.test(word) || !to.articles?.genderOf) return piece.text
  const gender = noun.gender ?? names.genderOf(word)
  const plural = noun.plural ?? to.inflector.plurality(word) === "plural"
  const candidates = piece.agree!
  // an article, maybe after other words (`es un`):  the one of its kind, in the noun's gender and number
  const lastOf = (words: string) => words.split(" ").at(-1)!
  const leadOf = (words: string) => words.split(" ").slice(0, -1).join(" ")
  const kind = articleKindOf(lastOf(piece.text), to)
  if (kind && candidates.every((each) => articleKindOf(lastOf(each), to))) {
    const wanted = candidates.find((each) => {
      const article = lastOf(each)
      return (
        leadOf(each) === leadOf(piece.text) &&
        articleKindOf(article, to) === kind &&
        to.articles!.genderOf!(article) === gender &&
        /s$/.test(article) === plural
      )
    })
    return wanted ?? piece.text
  }
  // its number first, then its gender where its forms have one:  `su` / `sus` don't, `nuevo` / `nueva` do
  const ofNumber = candidates.filter((each) => /s$/.test(each) === plural)
  const wanted = ofNumber.find((each) => isFeminine(each) === (gender === "feminine")) ?? ofNumber[0]
  return wanted ?? piece.text
}

/** Does `word` end as a feminine form does, `-a` / `-as`? */
function isFeminine(word: string): boolean {
  return /as?$/.test(word)
}

/** `text` with each pair of words the language contracts written as its contraction, outside quotes:  `a el` => `al`. */
function contract(text: string, language: SP.Language): string {
  const contractions = Object.entries(language.words.contractions ?? {})
  if (!contractions.length) return text
  return text
    .split(/("(?:[^"\\]|\\.)*")/)
    .map((part, at) => {
      if (at % 2) return part
      for (const [short, long] of contractions) {
        part = part.replace(new RegExp(`(?<![\\p{L}])${long}(?![\\p{L}])`, "gu"), short)
      }
      return part
    })
    .join("")
}

/** A piece for one of `alternatives`, the `at`th:  agreeing, if they're forms of one word (`el|la`, `nuevo|nueva`). */
function literalPiece(alternatives: string[], at: number, translator: Translator): Piece {
  const text = preferred(alternatives, translator.to) ?? alternatives[at] ?? alternatives[0] ?? ""
  if (areForms(alternatives, translator.to)) return { text, agree: alternatives }
  // words ending in an article, `es un|es una`:  the article agrees, the rest stays
  const endsInArticle = (words: string) => !!articleKindOf(words.split(" ").at(-1)!, translator.to)
  if (/ /.test(text) && endsInArticle(text)) return { text, agree: alternatives.filter(endsInArticle) }
  return { text }
}

/** The pieces a literal rule writes:  its first form of each word, never its optional words. */
function literalPieces(rule: P.Rule, translator: Translator): Piece[] {
  if (rule instanceof P.Literal) return [literalPiece(alternativesOf(rule.literal), 0, translator)]
  if (rule instanceof P.Literals) {
    return rule.literals.map((each) => literalPiece(alternativesOf(each.literal), 0, translator))
  }
  if (rule instanceof P.Choice) return literalPieces(rule.rules[0]!, translator)
  if (rule instanceof P.Sequence)
    return rule.rules.filter((each) => !each.optional).flatMap((each) => literalPieces(each, translator))
  return []
}

/** One word of a phrase as a piece:  an article agrees with what follows (`el` => `la dama`). */
function wordPiece(word: string, translator: Translator): Piece {
  if (articleKindOf(word, translator.to))
    return { text: word, agree: ARTICLE_FORMS.filter((each) => articleKindOf(each, translator.to)) }
  return { text: word }
}

/** Every article form a language may have:  the ones its pack knows a gender for are its own. */
const ARTICLE_FORMS = ["el", "la", "los", "las", "un", "una", "unos", "unas"]

/**
 * Are `alternatives` forms of ONE word, which agree with a noun:  articles (`el|la|los|las`),
 * or the same stem with gender and number endings (`nuevo|nueva`, `su|sus`, `primer|primera`)?
 */
function areForms(alternatives: string[], language: SP.Language): boolean {
  if (alternatives.length < 2 || alternatives.some((each) => /\s/.test(each))) return false
  if (alternatives.every((each) => articleKindOf(each, language))) return true
  // accents aside:  `vacío|vacio|vacía` are one word's forms, written with and without
  const stem = (word: string) =>
    word
      .normalize("NFD")
      .replace(/\p{M}/gu, "")
      .replace(/(os|as|o|a|s)$/, "")
  return alternatives.every((each) => stem(each) === stem(alternatives[0]!))
}

/** Which kind of article `word` is in `language` (`the` is `definite`, `una` `indefinite`), if it's one. */
function articleKindOf(word: string, language: SP.Language): SP.ArticleKind | undefined {
  const articles = language.articles
  if (!articles) return undefined
  const kinds: SP.ArticleKind[] = ["definite", "indefinite"]
  return kinds.find(
    (kind) =>
      ARTICLE_SAMPLES.some((noun) => articles.article(kind, noun, undefined) === word) ||
      (articles.genderOf?.(word) !== undefined && ARTICLE_FORMS.indexOf(word) < 4 === (kind === "definite"))
  )
}

/** Nouns whose articles, together, are every article a language has:  `a` and `an`, `el` and `la`. */
const ARTICLE_SAMPLES = ["card", "apple", "carta", "mazo"]

/** The language's preferred form among `alternatives`, if it has one:  Spanish's `de lo contrario` over `sino`. */
function preferred(alternatives: string[], language: SP.Language): string | undefined {
  const forms = PREFERRED_FORMS[language.lang]
  return forms?.find((form) => alternatives.length > 1 && alternatives.includes(form))
}

/**
 * Forms each language would rather write, where a syntax offers several:  what reads best, the glossary's pick.
 * - Spanish:  `de lo contrario` for `otherwise` (`sino` / `si no` read as `if not`).
 */
const PREFERRED_FORMS: Record<string, string[]> = {
  es: ["de lo contrario"]
}

/** Each language's words for English's `and`, `or` and `nor`, where a list's delimiters offer several:  `y`, not `e`. */
const CONJUNCTIONS: Record<string, Record<string, string>> = {
  es: { and: "y", or: "o", nor: "ni" }
}

/** `literal`'s alternatives as a list. */
function alternativesOf(literal: string | string[]): string[] {
  return [literal].flat().map(String)
}

/** `words` without each one that's another's twin but for an accent:  `sí, si` => `sí`. */
function withoutAccentTwins(words: string[]): string[] {
  const plain = (word: string) => word.normalize("NFD").replace(/\p{M}/gu, "")
  return words.filter((word, at) => !words.slice(0, at).some((each) => plain(each) === plain(word)))
}

/** The word a language says `not` with, before a verb:  Spanish's `no`. */
function negationWord(language: SP.Language): string {
  return NEGATION_WORDS[language.lang] ?? "not"
}

/** Each language's `not`, for a call it negates by putting it first. */
const NEGATION_WORDS: Record<string, string> = { es: "no", en: "not" }

////////////////
// ## Reading a rule's syntax
////////////////

/** One of our syntax's optional or choice words, and what our match did with it. */
type WordChoice = { present: boolean; index?: number; optional: boolean; symbol?: string }

/** One of a syntax's optional or choice words:  its rule, and which word of it for words in a row (`for each?`). */
type WordPlace = { rule: P.Rule; inner?: number; optional: boolean; symbol?: string }

/**
 * Our match's rule's optional or choice WORDS, each with whether it was there and which form:
 * - `if x:` for `if {condition} (then|:)?` => `[{ present: true, index: 1, optional: true }]`
 * - Lined up with the match's `matched` in order:  a slot takes a match from outside the syntax.
 * - Into nested sequences;  each optional word of words in a row too (`for each?`).
 */
function wordChoicesOf(match: P.Match, language: SP.Language): WordChoice[] {
  const choices: WordChoice[] = []
  collectWordChoices((match.rule as P.Sequence).rules ?? [], match, choices, language)
  return choices
}

/**
 * Add the word choices of `rules` (a sequence's) to `choices`, lined up with `match`'s `matched` in order;
 * into a nested sequence too, with its own match -- or, where it wasn't there, each word marked absent.
 */
function collectWordChoices(
  rules: P.Rule[],
  match: P.Match | undefined,
  choices: WordChoice[],
  language: SP.Language
): void {
  const own = new Set<P.Rule>()
  rules.forEach((rule) => collectRules(rule, own))
  const matched = (match?.matched ?? []).filter((each): each is P.Match => each instanceof P.Match)
  let next = 0
  for (const rule of rules) {
    const current = matched[next]
    const isOurs = !!current && contains(rule, current.rule)
    const isSlot = !!current && !own.has(current.rule) && hasSlot(rule)
    if (isWordChoice(rule, language)) {
      const alternatives = literalAlternatives(rule)
      const value = isOurs ? current!.inputText.trim() : undefined
      choices.push({
        present: isOurs,
        index: value === undefined ? undefined : alternatives.indexOf(value),
        optional: !!rule.optional,
        symbol: symbolOf(rule)
      })
    } else if (rule instanceof P.Literals && !rule.matchGroup) {
      choices.push(...innerWordChoices(rule, isOurs ? current!.inputText : "", language))
    } else if (rule instanceof P.Sequence && !rule.matchGroup) {
      collectWordChoices(rule.rules, isOurs && current!.rule === rule ? current : undefined, choices, language)
    }
    if (isOurs || isSlot) next++
  }
}

/** The optional words of words in a row (`for each?`), each with whether `text`, what they matched, has it. */
function innerWordChoices(rule: P.Literals, text: string, language: SP.Language): WordChoice[] {
  const words = text.trim().split(/\s+/)
  const choices: WordChoice[] = []
  let at = 0
  for (const each of rule.literals) {
    const alternatives = alternativesOf(each.literal)
    const found = alternatives.indexOf(words[at] ?? "")
    if (found >= 0) at++
    if (each.optional || (alternatives.length > 1 && !areForms(alternatives, language))) {
      choices.push({ present: found >= 0, index: found >= 0 ? found : undefined, optional: !!each.optional })
    }
  }
  return choices
}

/** `rule`'s optional or choice words, in order, into its nested sequences too -- see `wordChoicesOf()`. */
function topLevelWords(rule: P.Rule, language: SP.Language): WordPlace[] {
  const words: WordPlace[] = []
  const visit = (rules: P.Rule[]) => {
    for (const each of rules) {
      if (isWordChoice(each, language)) words.push({ rule: each, optional: !!each.optional, symbol: symbolOf(each) })
      else if (each instanceof P.Literals && !each.matchGroup) {
        each.literals.forEach((literal, inner) => {
          const alternatives = alternativesOf(literal.literal)
          if (literal.optional || (alternatives.length > 1 && !areForms(alternatives, language))) {
            words.push({ rule: each, inner, optional: !!literal.optional })
          }
        })
      } else if (each instanceof P.Sequence && !each.matchGroup) visit(each.rules)
    }
  }
  visit(rule instanceof P.Sequence ? rule.rules : [])
  return words
}

/**
 * Is `rule` words alone, unnamed, and optional or a choice of several?
 * - Not a choice of a word's forms (`un|una`, `a|an`):  those agree with their noun, whatever ours said.
 */
function isWordChoice(rule: P.Rule, language: SP.Language): boolean {
  if (rule.matchGroup || namedGroupsIn(rule).length || hasSlot(rule) || rule instanceof P.Literals) return false
  const alternatives = literalAlternatives(rule)
  if (!rule.optional && areForms(alternatives, language)) return false
  return !!rule.optional || alternatives.length > 1
}

/** `rule`'s symbol, if it's one alone (`:`, `,`), e.g. for `:?`. */
function symbolOf(rule: P.Rule): string | undefined {
  const alternatives = literalAlternatives(rule)
  return alternatives.length === 1 && /^[^\p{L}\d]+$/u.test(alternatives[0]!) ? alternatives[0] : undefined
}

/** The forms a word rule may take:  `(then|:)` => `["then", ":"]`;  a sequence's, joined with spaces. */
function literalAlternatives(rule: P.Rule): string[] {
  if (rule instanceof P.Literal) return alternativesOf(rule.literal)
  if (rule instanceof P.Literals)
    return [
      rule.literals
        .filter((each) => !each.optional)
        .map((each) => alternativesOf(each.literal)[0])
        .join(" ")
    ]
  if (rule instanceof P.Choice) return rule.rules.flatMap(literalAlternatives)
  if (rule instanceof P.Sequence) return [rule.rules.map((each) => literalAlternatives(each)[0] ?? "").join(" ")]
  return []
}

/** Every rule inside `rule`, itself too, into `into`. */
function collectRules(rule: P.Rule, into: Set<P.Rule>): void {
  into.add(rule)
  for (const child of childRules(rule)) collectRules(child, into)
}

/** `rule`'s rules, as its syntax built them. */
function childRules(rule: P.Rule): P.Rule[] {
  if (rule instanceof P.Repeat) return [rule.rule, rule.delimiter].filter(Boolean) as P.Rule[]
  if (rule instanceof P.Sequence || rule instanceof P.Choice) return rule.rules ?? []
  return []
}

/** Is `inner` `rule`, or inside it? */
function contains(rule: P.Rule, inner: P.Rule): boolean {
  return rule === inner || childRules(rule).some((child) => contains(child, inner))
}

/** The first rule in `rule`'s syntax (itself included) that passes `test`. */
function findRule(rule: P.Rule, test: (rule: P.Rule) => boolean): P.Rule | undefined {
  if (test(rule)) return rule
  for (const child of childRules(rule)) {
    const found = findRule(child, test)
    if (found) return found
  }
  return undefined
}

/** Is there a `{subrule}` in `rule`? */
function hasSlot(rule: P.Rule): boolean {
  return !!findRule(rule, (each) => each instanceof P.Subrule)
}

/** Does `rule` name any group inside it, by a name of its own (`name:`)? */
function hasNamedGroups(rule: P.Rule): boolean {
  return childRules(rule).some((child) => !!findRule(child, (each) => !!each.matchGroup))
}

/** The groups `rule` fills:  each named one inside it, and each subrule's (by its rule's name). */
function namedGroupsIn(rule: P.Rule): string[] {
  const names: string[] = []
  const visit = (each: P.Rule) => {
    if (each.matchGroup) names.push(each.matchGroup)
    else if (each instanceof P.Subrule && !each.zeroWidthRule) names.push(BODY_KEYWORDS[each.rule] ? "body" : each.rule)
    if (!each.matchGroup) childRules(each).forEach(visit)
  }
  visit(rule)
  return names
}

/** Does `rule` take group `name`, anywhere inside it? */
function mentions(rule: P.Rule, name: string): boolean {
  return namedGroupsIn(rule).includes(name)
}

/** The delimiters between `items` in `match`, as written:  `[",", "and"]`. */
function delimitersBetween(match: P.Match, items: P.Match[]): string[] {
  const repeat = findMatch(
    match,
    (each) => each.rule instanceof P.Repeat && each.matched.some((it) => items.includes(it as P.Match))
  )
  if (!repeat) return []
  return repeat.matched
    .filter((each): each is P.Match => each instanceof P.Match && !items.includes(each))
    .map((each) => each.inputText.trim())
}

/** A repeat match's items, without its delimiters. */
function itemsOf(match: P.Match): P.Match[] {
  const delimiter = (match.rule as P.Repeat).delimiter
  return (
    match.items ??
    match.matched.filter(
      (each): each is P.Match => each instanceof P.Match && !(delimiter && contains(delimiter, each.rule))
    )
  )
}

/** The first match in `match` (itself included) that passes `test`. */
function findMatch(match: P.Match, test: (match: P.Match) => boolean): P.Match | undefined {
  if (test(match)) return match
  for (const child of match.matched) {
    if (!(child instanceof P.Match)) continue
    const found = findMatch(child, test)
    if (found) return found
  }
  return undefined
}

/** The nested bodies (`block` matches) of `statement`, at any depth but not inside another body. */
export function bodiesIn(statement: P.Match): P.Match[] {
  const bodies: P.Match[] = []
  const visit = (match: P.Match) => {
    for (const child of match.matched) {
      if (!(child instanceof P.Match)) continue
      if (child.rule instanceof SP.Block) bodies.push(child)
      else visit(child)
    }
  }
  visit(statement)
  return bodies
}

////////////////
// ## Rule twins
////////////////

/**
 * Each of `from`'s registered rules, with `to`'s registrations of the same class under the same name:
 * the one registered in the same place among them first, then the others, in order.
 * - So `if {condition} ...` (English's first `If`) finds `si {condition} ...` (Spanish's first `If`).
 * - The others are tried when the first can't be written, e.g. Spanish's `subject_it` matches no word,
 *   so `it "is a face card"` is written by the registration leaving its subject out.
 */
function twinsFor(from: P.Parser, to: P.Parser): Map<P.Rule, P.Rule[]> {
  const theirs = registrations(to)
  const twins = new Map<P.Rule, P.Rule[]>()
  for (const [rule, key] of registrations(from)) {
    const same = theirs.byPlace.get(key.place)
    const all = theirs.byName.get(key.name) ?? []
    const others = all.filter((each) => each !== same)
    twins.set(rule, same ? [same, ...others] : others)
  }
  return twins
}

/** Where a rule is registered:  `place` its module, name, class and how many of its class came before;  `name` without the count. */
type RuleKey = { name: string; place: string }

/** Every rule `parser`'s modules register, with where;  and indexes of them by place and by name. */
function registrations(parser: P.Parser) {
  const keys = new Map<P.Rule, RuleKey>() as Map<P.Rule, RuleKey> & {
    byPlace: Map<string, P.Rule>
    byName: Map<string, P.Rule[]>
  }
  keys.byPlace = new Map()
  keys.byName = new Map()
  for (const module of parser.imports ?? []) {
    const own = module.ownRules
    for (const [name, rule] of Object.entries(own)) {
      for (const each of membersOf(rule)) {
        if (keys.has(each)) continue
        const home = each.name && membersOf(own[each.name]).includes(each) ? each.name : name
        const same = membersOf(own[home]).filter((it) => it.constructor.name === each.constructor.name)
        const key = { name: `${module.module}:${home}:${each.constructor.name}`, place: "" }
        key.place = `${key.name}:${same.indexOf(each)}`
        keys.set(each, key)
        keys.byPlace.set(key.place, each)
        keys.byName.set(key.name, [...(keys.byName.get(key.name) ?? []), each])
      }
    }
  }
  return keys
}

/** The rules in `rule`:  a group's members, else itself. */
function membersOf(rule: P.Rule | undefined): P.Rule[] {
  if (!rule) return []
  return rule instanceof P.Group ? rule.rules.flatMap(membersOf) : [rule]
}

////////////////
// ## Phrase slots
////////////////

/**
 * One word or slot of a method's or quoted phrase's words:
 * - `it`:  the thing it runs on;  `verb`, when fused onto a verb (`voltearla` => `voltear`)
 * - `argument`:  `(rank)`, its `name` the words inside
 * - `type`:  `a card`, its `name` the type
 * - `word`:  any other word
 */
type PhraseSlot = { kind: "it" | "argument" | "type" | "word"; text: string; name?: string; verb?: string }

/** `phrase`'s words and slots, read as language `side` (`from` or `to`) writes them. */
function phraseSlots(phrase: string, translator: Translator, side: "from" | "to", hasTypes = true): PhraseSlot[] {
  const language = translator[side]
  const words = phrase.match(/\([^)]*\)|\S+/g) ?? []
  const itWords = language.words.itWords ?? new Set(["it"])
  const typeNames = typeNamesOf(translator, side)
  const slots: PhraseSlot[] = []
  for (let at = 0; at < words.length; at++) {
    const word = words[at]!
    if (/^\(.*\)$/.test(word)) {
      slots.push({ kind: "argument", text: word, name: word.slice(1, -1) })
      continue
    }
    if (itWords.has(word.toLowerCase()) || (side === "from" && word.toLowerCase() === "it")) {
      slots.push({ kind: "it", text: word })
      continue
    }
    const fused = side === "to" ? language.words.fusedIt?.exec(word) : undefined
    if (fused) {
      slots.push({ kind: "it", text: word, verb: fused[1] })
      continue
    }
    if (hasTypes && articleKindOf(word.toLowerCase(), language) === "indefinite") {
      const type = typeNames.find((name) => words.slice(at + 1, at + 1 + name.split(" ").length).join(" ") === name)
      if (type) {
        slots.push({ kind: "type", text: `${word} ${type}`, name: type })
        at += type.split(" ").length
        continue
      }
    }
    slots.push({ kind: "word", text: word })
  }
  return slots
}

/** The type names a phrase in language `side` may name, longest first:  the dictionary's. */
function typeNamesOf(translator: Translator, side: "from" | "to"): string[] {
  const types = translator.names.data.types
  const names = side === "from" ? Object.keys(types) : Object.values(types).map(({ name }) => name)
  return names.filter(Boolean).sort((a, b) => b.length - a.length)
}

/** Which of our slots `theirs` is:  the same kind and name (through the dictionary), else the next unused of its kind. */
function matchingSlot(
  theirs: PhraseSlot,
  ours: PhraseSlot[],
  used: Set<PhraseSlot>,
  names: TranslationNames
): PhraseSlot | undefined {
  const free = ours.filter((each) => !used.has(each))
  const sameName = free.find((each) => {
    if (
      each.kind !== theirs.kind &&
      !(each.kind !== "word" && theirs.kind !== "word" && each.kind !== "it" && theirs.kind !== "it")
    ) {
      return false
    }
    if (theirs.kind === "it") return each.kind === "it"
    const ourName = each.name ?? ""
    const translated = each.kind === "type" ? names.data.types[ourName]?.name : names.data.names[ourName]
    return translated === theirs.name || ourName === theirs.name
  })
  return sameName ?? free.find((each) => each.kind === theirs.kind) ?? free.find((each) => each.kind !== "it")
}

/** A call's arguments, in the order written:  its `thisArg`, `callArgs` and `expression` groups. */
function callArguments(match: P.Match): P.Match[] {
  const groups = match.groups as P.MatchGroups
  return CALL_GROUPS.flatMap((name) => [groups[name] ?? []].flat())
    .filter((each): each is P.Match => !!each)
    .sort((a, b) => (a.start ?? 0) - (b.start ?? 0))
}

/** The groups a call's arguments are in. */
const CALL_GROUPS = ["thisArg", "callArgs", "expression", "props"]

/**
 * Why `statement` may read in the wrong order in another language, if it may (epic `spanish` P25):
 * a text with words in it joined to a value with `+`, e.g. `its color + " joker"` (`"comodín " + su color`).
 * - Each such text is a word in a sentence the program builds:  the other language may put it elsewhere.
 */
function riskIn(statement: P.Match): string | undefined {
  const joined = findOnLine(statement, (each) => {
    if (!(each.rule instanceof CompoundExpression)) return false
    const chain = (each.groups as { rhsChain?: P.Match }).rhsChain
    const suffixes = chain?.items ?? []
    if (!suffixes.some((suffix) => /^\s*(?:\+|plus\b|más\b)/i.test(suffix.inputText))) return false
    const lhs = (each.groups as { lhs?: P.Match }).lhs
    const operands = [lhs, ...suffixes.map(operandOf)].filter((operand): operand is P.Match => !!operand)
    const isWords = (operand: P.Match) => operand.rule instanceof TextLiteral && /\p{L}/u.test(operand.inputText)
    return operands.some(isWords) && operands.some((operand) => !(operand.rule instanceof TextLiteral))
  })
  return joined && `text joined to a value:  \`${joined.inputText.trim()}\``
}

/** The first match in `match` (itself included) that passes `test`, not looking into a body below its line. */
function findOnLine(match: P.Match, test: (match: P.Match) => boolean): P.Match | undefined {
  if (test(match)) return match
  for (const child of match.matched) {
    if (!(child instanceof P.Match) || child.rule instanceof SP.Block) continue
    const found = findOnLine(child, test)
    if (found) return found
  }
  return undefined
}

/** A suffix's operand:  its last match, `+ its suit` => `its suit`. */
function operandOf(suffix: P.Match): P.Match | undefined {
  return suffix.matched.filter((each): each is P.Match => each instanceof P.Match).at(-1)
}

/** The words of the phrase `declaration` declares:  its signature's, or its quoted alias's, quotes off. */
function phraseIn(declaration: P.Match): string | undefined {
  const signature = findMatch(
    declaration,
    (each) =>
      each.rule instanceof MethodSignature ||
      each.rule instanceof QuotedMethodSignature ||
      each.rule instanceof QuotedSignatureWords
  )
  const alias = (declaration.groups as { alias?: P.Match }).alias
  const text = (signature ?? alias)?.inputText.trim()
  return text?.replace(/^"|"$/g, "")
}

/** The type `scope` is in, in words (`stock pile`), if it's a type's body or method. */
function typeOf(scope: P.Scope | undefined): string | undefined {
  for (let each = scope; each; each = each.parentScope) {
    if (each instanceof P.TypeScope) return each.name?.replace(/(?<=\p{Ll})(?=\p{Lu})/gu, " ").toLowerCase()
  }
  return P.SubjectScope.of(scope)?.subjectType?.name?.toLowerCase()
}
