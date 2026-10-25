import { P } from "spell-parser/parser"
// Import directly, NOT through the `spell-parser/core` barrel:  the parser MUST NOT load `core` itself.
// Each runner runs its own copy:  see `spellRuntime.ts`.
import { SP } from "spell-parser/spell"

// Registers `RulexParser` on `P.Parser.rulexParser` -- MUST load before any rule with a `syntax:` string.
import "spell-parser/parser/rulex"

/** Spell's tokenizer's props -- see `SpellParser.spellTokenizer`. */
const SPELL_TOKENIZER_PROPS: P.TokenizerProps = {
  // Only support double-quotes as quote symbols (so we can do contractions with single quotes)
  // TODO: backtick as alternative quote, for embedding double quotes?
  quoteSymbols: [`"`],
  // Remove "normal" whitespace (leaving newlines and indents) when parsing
  whitespacePolicy: P.WhitespacePolicy.LEADING_ONLY,
  // never read as spell:  a view type's own styles (`css_block`),
  // and formatted text (`markdown_block`, `markdown_description`)
  rawTextTags: ["css", "markdown"]
}

// Above the class:  read while this module is still loading (the built-in templates compile then)
/** The built-in kinds a thing may be the one of:  an app, or a page (epic `elemental-spell` Q16). */
const ONE_OF_A_KIND_DATATYPES: ReadonlySet<P.Datatype> = new Set(["app", "page"])

/**
 * The kinds each scope's files declare, as the scan before parsing read them:  `card-game` => `["app"]`
 * (`SpellParser.oneOfAKindsIn()`).
 * - By a project's scope, so a file scanned later knows an earlier file's kinds.
 * - Only grows:  a kind an edit removed stays until the project is parsed afresh, which at worst stubs one more type.
 */
const SCANNED_KINDS = new WeakMap<P.Scope, Map<string, string[]>>()

/** Words each `statement` rule starts with -- see `SpellParser.statementWordsFor()`. */
const STATEMENT_WORDS = new WeakMap<P.Rule, Set<string>>()

/**
 * `P.Parser` subclass for the spell language.
 * - Holds spell's `tokenizer`:
 *   - double-quote strings only
 *   - `LEADING_ONLY` whitespace, so indentation stays significant
 * - Its `tokenize()` re-groups tokens into indented blocks, for the `"block"` rule.
 * - `SpellParser.rootScope` is the single shared root every project/file scope descends from:
 *   it carries spell's base types.
 *   - How project-specific parsers `clone()` off of it:
 *     `getScope()`, `SpellFile.getScope()`, `SpellProject.getScope()`.
 * - `SP.spellParser` (see `./rules`) is the actual shared instance,
 *   used by both the client UI and the server's `compileFile()` (`src/server/project-utils.ts`).
 *   - So keep this class free of browser-only globals at module-evaluation time.
 */
export class SpellParser extends P.Parser {
  /**
   * Re-defines `defaultRule` as `"block"` directly on `SpellParser.prototype`.
   * - TODO: looks redundant -- `P.Parser`'s own static block already sets the same value on
   *   `Parser.prototype`, which `SpellParser` would inherit anyway.
   */
  static {
    Object.defineProperty(this.prototype, "defaultRule", { value: "block", writable: true })
  }

  /**
   * Tokenizer for spell source: double-quote strings only, keeping newlines/indents (`LEADING_ONLY`
   * whitespace policy) since block structure is significant.
   */
  get tokenizer(): P.Tokenizer {
    if (this.form === "spellx") {
      return this.derived(
        "spellxTokenizer",
        () =>
          new SP.SpellxTokenizer({
            ...SPELL_TOKENIZER_PROPS,
            language: this.language ?? SP.Language.default,
            // a drawing's markup:  `</>` closes any element there (Q40, P7)
            emptyEndTagCloses: true,
            spell: this.spellTokenizer
          })
      )
    }
    return this.spellTokenizer
  }

  /** Spell's own tokenizer, for code spell -- and inside a spellx file's tags (`SP.SpellxTokenizer.spell`). */
  get spellTokenizer(): P.Tokenizer {
    return this.derived("tokenizer", () => new P.Tokenizer(SPELL_TOKENIZER_PROPS))
  }

  /**
   * Which FORM of spell we read:  code spell (`Card.spell`), or spellx, its tag-shaped form (`Card.spellx`).
   * - Only our tokenizer differs:  a spellx file's tags are tokens of their own (`SP.SpellxTokenizer`), and each tag
   *   line reads as its code-spell twin (`SP.SpellxTwin`), parsed by the same rules (epic `elemental-spell` P6).
   * - A project's spellx files parse with its twin of that form (`twinFor()`).
   */
  declare form: SP.SpellForm | undefined

  /**
   * The component packs a spellx drawing names components from, by their bare names (`<button>`):
   * its project file's `packs`, set on the project's parser and its twins (`SP.ComponentPacks`;  P7).
   * - `undefined`:  `SP.ComponentPacks.DEFAULT`.
   */
  declare packs: readonly string[] | undefined

  /**
   * Register a rule class with ONLY its `syntax` + `tests` -- everything else lives on the class as `@proto static`.
   * - Why:  the class is the rule, reusable by another language's parser with its own `syntax`.
   * - TYPE-ONLY narrowing of `P.Parser.addRule()`, same behaviour.
   */
  addRule<RuleType extends P.Rule>(rule: Class<RuleType>, definition?: P.SyntaxAndTests): P.Rule | undefined
  addRule(rule: P.Rule | P.RuleConstructor, ruleName?: string | string[]): P.Rule | undefined
  addRule(
    rule: P.Rule | P.RuleConstructor,
    namesOrDefinition?: string | string[] | P.RuleDefinitionProps
  ): P.Rule | undefined {
    const definition =
      typeof namesOrDefinition === "object" && !Array.isArray(namesOrDefinition) ? namesOrDefinition : undefined
    // NOTE:  duck-typed, not `instanceof SP.SpellStatement`:  rule modules register while the `SP` barrel loads
    if (typeof rule === "function" && definition && (rule.prototype as OperandTwinned).operandInExpressions) {
      const statement = this.addStatementAndOperand(rule as unknown as typeof P.Rule, definition)
      if (statement) return statement
    }
    // Overloads hide `super`'s implementation signature -- it takes either shape, so any overload will do.
    return super.addRule(rule as Class<P.Rule>, namesOrDefinition as P.DefinitionFor<P.Rule>)
  }

  /**
   * Register statement class `ruleClass` as TWO rules -- see `SP.SpellStatement.operandInExpressions`.
   * - `ruleClass` says `operandInExpressions`, and is aliased both `statement` and `expression`.
   * - The statement:  its `definition` as is.
   * - The expression (so an `operand`):  a twin whose LAST slot is an operand,
   *   its `statementRule` pointing back at the statement.
   * - e.g. `to notify (message)` declares a call rule with syntax `notify {message:expression}`, which we make:
   *   - the statement `notify {message:expression}`:  a LINE takes the whole expression after it:
   *     `notify "hi " + name` => `notify_$message("hi " + name)`
   *   - the twin `notify {message:operand}`:  INSIDE an expression it takes one operand,
   *     so the rest stays the outer expression's:  `if notify x is 4` => `if (notify_$message(x) == 4)`
   * - Returns the statement, which is what `scope.addRule()` records:
   *   so a project's declarations write ONE rule, and loading it here makes both again.
   * - `undefined` (nothing registered) if `ruleClass` isn't all that,
   *   or its syntax doesn't end in an `{expression}` slot.
   */
  private addStatementAndOperand(ruleClass: typeof P.Rule, definition: P.RuleDefinitionProps): P.Rule | undefined {
    const syntax = definition.syntax ?? (ruleClass.prototype as { syntax?: string }).syntax
    const operandSyntax =
      typeof syntax === "string"
        ? syntax.replace(SpellParser.LAST_EXPRESSION_SLOT, (_slot, name = "expression", optional) => {
            return `{${name}:operand}${optional}`
          })
        : undefined
    if (!operandSyntax || operandSyntax === syntax) return undefined
    // as `P.Parser.addRule()` instantiates a class
    const registered: P.RuleDefinitionProps = this.module ? { ...definition, module: this.module } : { ...definition }
    const statement = ruleClass.instantiate(registered)
    const names = statement?.names ?? []
    if (!statement || !names.includes("statement") || !names.includes("expression")) return undefined
    const operand = ruleClass.instantiate({
      ...registered,
      syntax: operandSyntax,
      tests: undefined,
      statementRule: statement
    } as P.RuleDefinitionProps)!
    const statementNames = names.filter((name) => name !== "expression")
    super.addRule(statement, statement.tests ? [...statementNames, "_testable_"] : statementNames)
    super.addRule(operand, ["expression"])
    return statement
  }

  /**
   * A syntax's LAST slot, if it's an `{expression}` -- its group name and any `?` captured.
   * - See `addStatementAndOperand()`.
   */
  static LAST_EXPRESSION_SLOT = /\{(?:(\w+):)?expression\}(\??)\s*$/

  /** Without the `/*! SPELL: DECLARES` comments -- a rule's tests are about its code.  See `SpellDeclarations`. */
  normalizeTestOutput(compiled: unknown): unknown {
    return typeof compiled === "string" ? SP.SpellDeclarations.stripComments(compiled) : compiled
  }

  /** Names a `{subrule}` parses an expression by -- see `getNamesForRule()`. */
  static EXPRESSION_RULES = ["expression", "operand"]

  /**
   * Every rule aliased `expression` is registered as an `operand` instead.
   * - Except `expression` itself, `CompoundExpression`, which is an operand plus any operators after it.
   * - So `{expression}` is a whole expression, operators and all.
   * - `{operand}` is what an operator acts on:  one expression with no operator at its top,
   *   e.g. `5`, `the first card of the deck`, `(x + 1)`.
   * - Throws for an operand which STARTS with an expression:  it would recurse forever.
   *   Something after an expression is an `expression_suffix` instead, e.g. `list_membership_test`.
   */
  protected getNamesForRule(rule: P.Rule, names: string[]): string[] {
    const isOperand = rule.name !== "expression" && names.includes("expression")
    const result = isOperand ? names.map((name) => (name === "expression" ? "operand" : name)) : names
    const first = rule instanceof P.Sequence ? rule.rules[0] : undefined
    if (isOperand && first instanceof P.Subrule && SpellParser.EXPRESSION_RULES.includes(first.rule)) {
      throw new P.ParserError({
        message: `Rule '${rule.name}' starts with an expression, so it would recurse forever.  Make it an expression_suffix.`,
        context: this,
        activity: "getNamesForRule",
        params: { rule, names }
      })
    }
    return result
  }

  /**
   * The language this parser reads, e.g. English -- see `SP.Language`.
   * - Set by its language pack;  copied by `clone()`, so every project's parser knows its language.
   */
  declare language: SP.Language | undefined

  ////////////////
  // ## Twins:  one project, several languages
  ////////////////

  /**
   * This project parser's twin reading `language` in `form`, for a file written so -- us, for our own.
   * - `form`:  `spellx` for a spellx file, `Card.spellx` (epic `elemental-spell` P6):  the same rules, its own tokenizer.
   * - So one project can mix languages (epic `spanish` P19):  `Carta.es.spell` beside `Card.spell`.
   * - The twin has `language`'s own rules, plus every rule our project added, ours and our imports':
   *   - the ones there already, copied from each layer between us and our language's parser
   *     (`SpellDeclarations.importScope()`'s, then ours)
   *   - and each one any twin adds from now on, which every other twin adds too (`addOwnRule()`):
   *     a method an English file defines, a Spanish file calls by its English words
   * - Its journal is ours (`P.IncrementalProject` gives every file's parser the same one).
   * - One per language, kept while this parser lives:  a new parse's new project parser makes new ones.
   */
  twinFor(language: SP.Language, form: SP.SpellForm = "spell"): SpellParser {
    const formOf = (parser: SpellParser) => parser.form ?? "spell"
    if (!this.language || (language === this.language && form === formOf(this))) return this
    const twins = (this.twins ??= [this])
    const existing = twins.find((twin) => twin.language === language && formOf(twin) === form)
    if (existing) return existing
    const twin = language.parser.clone({
      module: this.module,
      ...(form === "spellx" ? { form } : {}),
      ...(this.packs ? { packs: this.packs } : {})
    } as P.ParserProps)
    for (const layer of this.layersOver(this.language.parser).reverse()) {
      for (const [ruleName, rule] of Object.entries(layer.ownRules)) twin.addTwinsRule(ruleName, rule)
    }
    twin.journal = this.journal
    twin.twins = twins
    twins.push(twin)
    return twin
  }

  /**
   * Our project parser and its twins in other languages, which add each other's rules -- see `twinFor()`.
   * - `undefined` until we make one.
   * - NEVER copied by `clone()`:  a family is one project's.
   */
  declare twins: SpellParser[] | undefined

  /** Add `rule` to our own rules, and to each of our twins' (`twinFor()`):  a rule one adds, they all read. */
  protected addOwnRule(ruleName: string, rule: P.Rule): void {
    super.addOwnRule(ruleName, rule)
    this.twins?.forEach((twin) => twin !== this && twin.addTwinsRule(ruleName, rule))
  }

  /** Add a rule one of our twins added, to our own rules only:  it's added to the others already. */
  private addTwinsRule(ruleName: string, rule: P.Rule): void {
    super.addOwnRule(ruleName, rule)
  }

  /**
   * Us, then each parser we import down to `base`, which is left out:  the layers a project's parser adds.
   * - Each imports one:  a project's parser clones its import scope's, which clones its language's.
   * - Just us if `base` isn't below us.
   */
  private layersOver(base: P.Parser): P.Parser[] {
    const layers: P.Parser[] = [this]
    let layer = this.imports?.length === 1 ? this.imports[0] : undefined
    while (layer && layer !== base) {
      layers.push(layer)
      layer = layer.imports?.length === 1 ? layer.imports[0] : undefined
    }
    return layer === base ? layers : [this]
  }

  /** A clone of us, as `P.Parser.clone()`, but none of our twins:  a family is one project's (`twinFor()`). */
  clone(properties?: P.ParserProps): this {
    const clone = super.clone(properties)
    delete clone.twins
    return clone
  }

  /**
   * The default language's root scope:  spell's built-in types and their members -- see `SP.Language.rootScope`.
   * - Every project scope in English points back to this;  another language's to its own.
   */
  static get rootScope(): P.RootScope {
    return SP.Language.default.rootScope
  }

  /**
   * Return a `P.ProjectScope` with a new parser that `clone()`s this one under `moduleName`.
   * - Lets us tweak rules/etc for that scope without touching the original (e.g. shared `rootScope`).
   */
  getScope(moduleName = "ad_hoc"): P.ProjectScope {
    const parser = this.clone({ module: moduleName })
    return new P.ProjectScope({
      name: moduleName,
      parser,
      parentScope: this.language?.rootScope ?? SpellParser.rootScope
    })
  }

  /**
   * Tokenize `input`, then re-group into indented blocks when `ruleName` is `"block"`.
   * - Why:  spell's significant-whitespace block structure isn't just a flat token stream.
   * - A spellx parser's tokenizer reads only a whole file, a `"block"`:  any other text it parses is spell, e.g. a
   *   quoted alias, `"is a (suit)"`, read again as its words -- so it's tokenized as spell (`spellTokenizer`).
   */
  tokenize(input: string, ruleName: string) {
    if (this.form === "spellx" && ruleName !== "block" && typeof input === "string") {
      return this.spellTokenizer.tokenize(input)
    }
    const tokens = super.tokenize(input)
    if (!tokens) return undefined
    if (typeof input === "string" && ruleName === "block") return this.tokenizer.breakIntoIndentedBlocks(tokens)
    return tokens
  }

  /**
   * Types `text` declares, by a scan of its lines, so a line ABOVE one knows the type:
   * - e.g. `a card is a thing`, `a deck is a list of cards`, `create a type called hand as a list of cards`
   * - See `P.Parser.stubDeclaredTypes()`.
   * - Only a line STARTING that way, as `create_type` / `create_list_type` would read it:  a comment never does.
   * - `a card is` is enough:  a declaration being typed, e.g. `a card is a`, still declares `card`,
   *   so the editor keeps its last good version rather than re-parsing everything.
   *   See `P.IncrementalProject.update()`.
   * - A value kind too, `- "suits" as one of ...` declares `suit` (`value_kind`):  so a card above the deck
   *   can say `its "suit" is a suit` (epic page `outline-spell`, issue I3).
   * - A name of several words too, e.g. `a stock pile is a pile`, `a bank account aka account is a thing`.
   *   Only before `is a` / `is an` or `aka`:  `a cards color is black` names no type.
   * - A one-of-a-kind app too, with no article:  `solitaire is an app` (`create_one_of_a_kind`).
   *   - And one of a declared kind of app or page, `klondike is a card game`:  see `oneOfAKindsIn()`.
   * - The kind of a property's values too, e.g. `card suit` (epic `spanish` P22):  see `declaredPropertyKinds()`.
   */
  declaredTypes(text: string, scope?: P.Scope): string[] {
    if (this.form === "spellx") text = SP.SpellxTwin.skeletonOf(text, this)
    const types = [...text.matchAll(this.declarations.typeDeclaration)].map(
      ([, type, words, created, onlyOne]) =>
        type ??
        (words ?? onlyOne)
          ?.trim()
          .split(/[ \t]+/)
          .join("-") ??
        created!
    )
    const onlyOnes = this.oneOfAKindsIn(text, scope).filter((name) => !types.includes(name))
    const kinds = [...text.matchAll(this.declarations.valueKindDeclaration)].map(([, plural]) => P.singularize(plural!))
    return [...types, ...onlyOnes, ...kinds, ...this.declaredPropertyKinds(text, new Set(onlyOnes))]
  }

  /**
   * One-of-a-kinds `text` declares by a kind other than `app`, its name dashed:  `klondike` for
   * `klondike is a card game`, `high-scores` for `high scores is a score page` (epic `elemental-spell` J50, C27).
   * - Two passes, so no type is invented from any `x is a y`:
   *   1. each declaration's kind, read from `text` (`a "card game" is an app`)
   *   2. each line with no article, `<name> is a <kind>`, whose kind is an app or a page, or a kind of one
   * - The kind is known from `text` itself, or, with `scope`, from a file scanned before it (`SCANNED_KINDS`),
   *   an import or a built-in.
   *   One declared only in a file scanned AFTER it isn't known yet:  its line says so when it parses.
   * - Longest kind first, up to 4 words, as `create_one_of_a_kind` reads it:  `card game` in
   *   `klondike is a card game for two:`.
   * - Never a line a statement starts, e.g. `if klondike is a card game`:  that's a test of its kind.
   */
  private oneOfAKindsIn(text: string, scope?: P.Scope): string[] {
    const language = this.language ?? SP.Language.default
    const dashed = (words: string) =>
      words
        .trim()
        .split(/[ \t]+/)
        .join("-")
    const lines = [...text.matchAll(this.declarations.kindDeclaration)].map(([, article, name, kind]) => ({
      article: !!article,
      name: dashed(name!),
      kind: kind!.trim().split(/[ \t]+/)
    }))
    // the kinds every file scanned so far declares, ours among them:  so a later file knows an earlier one's
    const kindOf = scope ? (SCANNED_KINDS.get(scope) ?? new Map<string, string[]>()) : new Map<string, string[]>()
    if (scope) SCANNED_KINDS.set(scope, kindOf)
    for (const { name, kind } of lines) kindOf.set(name.toLowerCase(), kind)
    if (!lines.some(({ article }) => !article)) return []
    const statementWords = SpellParser.statementWordsFor(scope ?? language.rootScope)

    // Is `kind` an app or a page, or a kind of one?  `seen`:  the kinds this question passed through
    const isOneOfAKindKind = (kind: string[], seen: Set<string>): boolean => {
      for (let count = Math.min(MAX_KIND_WORDS, kind.length); count > 0; count--) {
        const words = kind.slice(0, count).join("-")
        const datatype = P.typeName(words, language.typeWords, language.words.listOfWord)
        if (ONE_OF_A_KIND_DATATYPES.has(datatype)) return true
        const declared = kindOf.get(words.toLowerCase())
        if (declared && !seen.has(words) && isOneOfAKindKind(declared, new Set(seen).add(words))) return true
        const known = scope?.getType(P.isValueType(datatype) ? datatype : P.classCase(datatype))
        if (known instanceof P.TypeScope && (known.isA("App") || known.isA("Page"))) return true
      }
      return false
    }
    return lines
      .filter(({ article, name, kind }) => {
        if (article || statementWords.has(name.split("-")[0]!.toLowerCase())) return false
        return isOneOfAKindKind(kind, new Set())
      })
      .map(({ name }) => name)
  }

  /**
   * The kinds of property values the type bodies in `text` declare, by a scan of their lines (epic `spanish` P22):
   * `- its "suit" is one of ...` under `a card is a thing where:` declares `card-suit`, `card suit`.
   * - So a type above the card can say `its "suit" is a card suit`:  a name of several words needs its type known.
   * - Named in our language's word order:  `palo-de-carta` in Spanish (`SP.Language.propertyKindName()`).
   * - Only a list with `one of` / `either`, as `propertyListDeclaration` finds it:
   *   a bare `up or down` is known once its line parses.
   * - Blank lines don't end a body;  any other line at the left edge does.
   * - `onlyOnes`:  the one-of-a-kinds `text` declares by a kind other than `app` (`oneOfAKindsIn()`).
   */
  private declaredPropertyKinds(text: string, onlyOnes?: ReadonlySet<string>): string[] {
    const language = this.language ?? SP.Language.default
    const found: string[] = []
    let subject = ""
    for (const line of text.split("\n")) {
      if (!line.trim()) continue
      if (!/^\s/.test(line)) {
        subject = this.subjectOf(line, onlyOnes) ?? ""
        continue
      }
      const listed = subject ? this.declarations.propertyListDeclaration.exec(line) : undefined
      const property = listed?.[1] ?? listed?.[2]
      if (property) found.push(language.propertyKindName(subject, property).split(" ").join("-"))
    }
    return found
  }

  /**
   * First lines of the methods `text` defines, found by scanning its lines (epic page `outline-spell`, P22).
   * - Each is `<type>\t<first line>`, its type empty at a file's top.  See `P.Parser.declaredMethods()`.
   * - At a file's top:  `to play a card`, `animation deal the cards`.
   * - In a type's outline body, one tab in:
   *   `- to debug it:` under `solitaire is an app where:` is `solitaire\tto debug it`.
   *   - The type's line is any that declares one (`TYPE_DECLARATION`), or re-opens one, `a solitaire:`.
   * - Up to its `:`, so its body isn't parsed:  `to cheat at it:  print 1` is `to cheat at it`.
   */
  declaredMethods(text: string): string[] {
    if (this.form === "spellx") text = SP.SpellxTwin.skeletonOf(text, this)
    const onlyOnes = new Set(this.oneOfAKindsIn(text))
    const found: string[] = []
    let subject = ""
    for (const line of text.split("\n")) {
      if (!/^\s/.test(line)) {
        subject = this.subjectOf(line, onlyOnes) ?? ""
        if (this.declarations.methodLine.test(line)) found.push(`\t${firstLineOf(line)}`)
        continue
      }
      const bullet = /^(?:\t| {2,4})-[ \t]+(.*)$/.exec(line)?.[1]
      if (subject && bullet && this.declarations.methodLine.test(bullet))
        found.push(`${subject}\t${firstLineOf(bullet)}`)
    }
    return found
  }

  /**
   * Make each method `texts` define callable ahead of its definition (epic page `outline-spell`, P22):
   * parse its first line alone, then register its call -- see `MethodDefinition.callAhead()`.
   * - A body's method is parsed in a `P.SubjectScope` of its type, as its body would be.
   * - One that doesn't parse alone, e.g. naming a type nobody declares, is left out:  its definition says why.
   */
  stubDeclaredMethods(scope: P.Scope, texts: string[]): void {
    for (const found of texts.flatMap((text) => this.declaredMethods(text))) {
      const match = this.parseFirstLine(scope, found)
      // our language in play:  the method's name is worked out by its rules, as when it's parsed
      if (match) this.inPlay(() => (match.rule as CallsAhead).callAhead!(match))
    }
  }

  /** Does `after` define a method `before` didn't, or the other way round?  See `P.Parser.changesMethods()`. */
  changesMethods(scope: P.Scope, before: string, after: string, keepEdited = false): boolean {
    const was = this.declaredMethods(before)
    const now = this.declaredMethods(after)
    const changed = (from: string[], to: string[]) =>
      to.some((found) => !from.includes(found) && this.parseFirstLine(scope, found))
    // keeping what's broken:  a first line being edited doesn't count, only a method added or deleted
    if (keepEdited && now.length === was.length) return false
    return changed(was, now) || changed(now, was)
  }

  /**
   * A method's first line, as `declaredMethods()` found it, parsed alone in `scope`.
   * - `undefined` unless it's a definition we can call ahead (`MethodDefinition.callAhead()`).
   * - A body's method is parsed in a `P.SubjectScope` of its type, as its body would be.
   */
  private parseFirstLine(scope: P.Scope, found: string): P.Match | undefined {
    const [subject = "", line = ""] = found.split("\t")
    // by OUR rules, a twin's in another language (`twinFor()`):  a scope reads its rules from its parser
    const ours = scope.parser === this ? scope : new P.Scope({ name: scope.name, parentScope: scope, parser: this })
    const at = subject ? new P.SubjectScope({ subject, parentScope: ours }) : ours
    const match = this.parse(line, "statement", at)
    return (match?.rule as CallsAhead | undefined)?.callAhead ? match : undefined
  }

  /**
   * The raw-text patterns of our language that find what a file declares before it's parsed -- see `SP.LanguageWords`.
   * - The default language's for a parser with none of its own.
   */
  get declarations(): SP.DeclarationPatterns {
    return (this.language ?? SP.Language.default).words.declarations
  }

  /**
   * Type a top-level `line` declares or re-opens, e.g. `solitaire` for `a solitaire:` -- `undefined` if none.
   * - `onlyOnes`:  the one-of-a-kinds its text declares by a kind other than `app` (`oneOfAKindsIn()`),
   *   e.g. `klondike` for `klondike is a card game where:`.
   */
  subjectOf(line: string, onlyOnes?: ReadonlySet<string>): string | undefined {
    const { typeDeclaration, kindDeclaration, reopenedType } = this.declarations
    const declared = new RegExp(typeDeclaration.source, "iu").exec(line)
    if (declared) {
      const [, type, words, created, onlyOne] = declared
      return (
        type ??
        (words ?? onlyOne)
          ?.trim()
          .split(/[ \t]+/)
          .join("-") ??
        created
      )
    }
    const onlyOne = onlyOnes?.size ? new RegExp(kindDeclaration.source, "iu").exec(line) : undefined
    const onlyOneName =
      onlyOne && !onlyOne[1]
        ? onlyOne[2]!
            .trim()
            .split(/[ \t]+/)
            .join("-")
        : undefined
    if (onlyOneName && onlyOnes!.has(onlyOneName)) return onlyOneName
    return reopenedType
      .exec(line)?.[1]
      ?.split(/[ \t]+/)
      .join("-")
  }

  /**
   * The words any of `scope`'s statements starts with, lower case, e.g. `return`, `print`, `if`.
   * - From the statements themselves:  each `statement` rule's first fixed word, so a statement added later
   *   guards its word too.
   * - Worked out once per `statement` rule, which changes when a rule is added.
   * - Read by `body_member_words` (`- return x is 1` stays a `return`) and `oneOfAKindsIn()`
   *   (`if klondike is a card game` declares nothing).
   */
  static statementWordsFor(scope: P.Scope): ReadonlySet<string> {
    const statement = scope.getRuleOrDie("statement")
    let words = STATEMENT_WORDS.get(statement)
    if (!words) {
      words = new Set()
      addLeadingWords(statement, words)
      STATEMENT_WORDS.set(statement, words)
    }
    return words
  }

  /** Commit a spell statement parsed on its own -- see `SP.commitStatement()`. */
  commit(match: P.Match) {
    // our language in play:  what the statement declares is named by its rules
    this.inPlay(() => SP.commitStatement(match))
  }

  /** Parse one item of a block:  a nested block, or a line plus any indented body it takes. */
  parseItem(scope: P.Scope, items: P.Token[]): P.Match | undefined {
    const [first] = items
    if (first instanceof P.BlockToken) return this.getRuleOrDie("block").parse(scope, [first])
    if (first instanceof P.LineToken) return this.parse(items, "line", scope)
    return undefined
  }

  /** A top-level item is broken if it didn't parse, or has parse errors -- its own or its body's. */
  isBrokenItem(item: P.Match | undefined): boolean {
    return !item || !!SP.Block.getParseErrors(item)?.length
  }

  /** Journal mark just before a `line`'s nested body was parsed -- see `commitStatement()`. */
  getBodyMark(item: P.Match): P.JournalMark | undefined {
    return item.is(SP.BlockLine) ? item.data.bodyMark : undefined
  }

  /** Re-parse a top-level `line`'s nested body -- see `BlockLine.reparseBody()`. */
  reparseBody(item: P.Match, body: P.BlockToken): P.Match | undefined {
    return item.is(SP.BlockLine) ? item.rule.reparseBody(item, body) : undefined
  }

  /** File match from its top-level item matches, as `Block.parse()` builds it -- see `Block.assembleBlock()`. */
  assembleFile(scope: P.Scope, root: P.BlockToken, items: P.Match[]): P.Match | undefined {
    const rule = this.getRuleOrDie("block")
    return rule instanceof SP.Block ? rule.assembleBlock(scope, root, items) : undefined
  }

  /**
   * Build a `P.Match` for the `parse_error` rule, so a failed parse still produces a `Match` in the tree
   * (rather than `undefined`) -- callers can inspect/report on it, e.g. `SpellFile.parse()`'s `errors` walk.
   */
  createParseError(scope: P.Scope, tokens: P.Token[], message: string) {
    const rule = this.getRuleOrDie("parse_error")
    return new P.Match({
      scope,
      rule,
      matched: tokens,
      tokens: [...tokens],
      message
    })
  }

  /**
   * `Parser.compile()` returns `unknown` (e.g. `rulex` compiles to `Rule` objects), but spell always
   * compiles down to a javascript source string -- narrow that here so `SpellFile`/`SpellProject` compile
   * paths can rely on `string`.
   * - Throws `P.ParserError` if `super.compile()` doesn't return a string.
   */
  compile(input: string | P.Token | P.Token[], ruleName?: string, scope?: P.Scope): string {
    const result = super.compile(input, ruleName, scope)
    if (typeof result !== "string") {
      throw new P.ParserError({
        message: "compile() did not return a string",
        context: this,
        activity: "compile",
        params: { input, ruleName, scope, result }
      })
    }
    return result
  }
}

/**
 * A rule class's prototype, as `SpellParser.addRule()` reads it.
 * - See `SP.SpellStatement.operandInExpressions`.
 */
type OperandTwinned = { operandInExpressions?: boolean }

/** A method definition's first line:  `to ...`, `animation ...`, `create animation ...` -- see `declaredMethods()`. */
/** `line` up to its first `:`, trimmed:  a method's first line without its body. */
function firstLineOf(line: string): string {
  return line.split(":")[0]!.trim()
}

/** A rule which can make its method callable ahead of its definition:  `MethodDefinition`'s. */
type CallsAhead = { callAhead?: (match: P.Match) => void }

/** Most words a kind's name may have, as `create_one_of_a_kind` reads it:  as many as a type's (drawable-thing J7). */
const MAX_KIND_WORDS = 4

/** Add the fixed words `rule` may start with to `words`:  none for a subrule, which could start with anything. */
function addLeadingWords(rule: P.Rule, words: Set<string>): void {
  if (rule instanceof P.Literal) {
    const [word] = [rule.literal].flat()
    if (word) words.add(word.toLowerCase())
  } else if (rule instanceof P.Literals) {
    for (const { literal } of rule.literals) {
      const [word] = [literal].flat()
      if (word) words.add(word.toLowerCase())
    }
  } else if (rule instanceof P.Choice) {
    for (const alternative of rule.rules) addLeadingWords(alternative, words)
  } else if (rule instanceof P.Sequence) {
    for (const child of rule.rules) {
      addLeadingWords(child, words)
      if (!child.optional) break
    }
  }
}
