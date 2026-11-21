import {
  CodeActionKind,
  CompletionItemKind,
  DiagnosticSeverity,
  DocumentHighlightKind,
  FoldingRangeKind,
  InsertTextFormat,
  MarkupKind,
  SemanticTokensBuilder,
  SymbolKind,
  type CodeAction,
  type CompletionItem,
  type CompletionList,
  type Diagnostic,
  type DocumentHighlight,
  type DocumentSymbol,
  type FoldingRange,
  type FormattingOptions,
  type Hover,
  type Location,
  type MarkupContent,
  type ParameterInformation,
  type Position,
  type Range,
  type SelectionRange,
  type SemanticTokens,
  type SemanticTokensDelta,
  type SemanticTokensLegend,
  type SignatureHelp,
  type TextEdit,
  type WorkspaceEdit,
  type WorkspaceSymbol
} from "vscode-languageserver"

import { withoutAccents } from "spell/util/string"
import { P } from "spell/parser/parser"
import { MD, type InlineNode } from "spell/parser/markdown"
import { SP } from "spell/parser/spell"
import { BuiltInSounds } from "spell/ui/sounds"
import { LSP } from "spell/app/lsp"

/**
 * Answers editor questions about parsed spell files, in Language Server Protocol shapes -- one method per request.
 * - Works from each file's current `match`, as kept up to date by `SpellProject.updateText()`.
 * - Positions come from match / token OFFSETS in `file.parseText`, turned into line + character here.
 *   NEVER from `token.line` / `ch`:  offsets are what incremental parsing keeps exact.
 * - `character` counts UTF-16 code units, as JS strings do, which is the protocol's default encoding.
 */
export class SpellLanguageService {
  /** How the editor addresses the files we answer about. */
  declare addresses: LSP.FileAddresses
  /** Line-start offsets of each file, with the text they were worked out from. */
  #lineStartsCache = new WeakMap<SP.SpellFile, { text: string; lineStarts: number[] }>()
  /** Whole-file semantic tokens builder per file, remembering what it built last -- see `semanticTokensDelta()`. */
  #tokenBuilders = new WeakMap<SP.SpellFile, SemanticTokensBuilder>()
  /**
   * Can the editor asking pick an attribute's value (a colour, an icon) as well as list its words?
   * - The app's code editor says so:  it runs `PICK_VALUE_COMMAND`.  VS Code doesn't, so its list has
   *   no Pick row (epic `editor` T61).
   */
  picksValues = false
  /** Docstrings of each file's declarations, by statement -- keyed by the file's `match`, so one per parse. */
  #docsCache = new WeakMap<P.Match, Map<P.Match, SP.DocComment>>()
  /** The `<css>` blocks in each file, answered as CSS -- see `LSP.SpellCSS`. */
  css = new LSP.SpellCSS()
  /**
   * The names each host fills by name in a project of its own, checked as its code is edited (`LSP.HostNameCheck`):
   * the app's editor hands its own Spell's (epic `editor` I123);  none by default.
   */
  hostNames: LSP.HostNames[] = []

  constructor(addresses: LSP.FileAddresses) {
    this.addresses = addresses
  }

  ////////////////
  // ## Positions
  ////////////////

  /** Line + character of `offset` in `file`. */
  positionAt(file: SP.SpellFile, offset: number): Position {
    const { line, ch } = P.positionForOffset(this.lineStarts(file), offset)
    return { line, character: ch }
  }

  /** Offset of `position` in `file`, clamped to the end of its line. */
  offsetAt(file: SP.SpellFile, { line, character }: Position): number {
    return P.offsetForPosition(this.lineStarts(file), { line, ch: character }, file.parseText.length)
  }

  /** Range of `match`'s text in `file` -- up to its last character, NOT its trailing whitespace. */
  rangeOf(file: SP.SpellFile, match: P.Match): Range | undefined {
    const { start, end } = match
    if (start === undefined || end === undefined) return undefined
    return { start: this.positionAt(file, start), end: this.positionAt(file, end) }
  }

  /**
   * Every match at `position` in `file`, outermost (the file's) first.
   * - Descends through what rules keep in `match.data` too, e.g. what JSX parses out of `{...}`.
   * - A cursor just after a word counts as on it.
   */
  matchesAt(file: SP.SpellFile, position: Position): P.Match[] {
    if (!file.match) return []
    return this.deepestMatchesAt(file.match, this.offsetAt(file, position))
  }

  /** Line starts for `file`'s current text, worked out once per text. */
  private lineStarts(file: SP.SpellFile): number[] {
    const text = file.parseText
    let cached = this.#lineStartsCache.get(file)
    if (cached?.text !== text) {
      cached = { text, lineStarts: P.getLineStarts(text) }
      this.#lineStartsCache.set(file, cached)
    }
    return cached.lineStarts
  }

  ////////////////
  // ## Diagnostics
  ////////////////

  /**
   * Problems to show in `file`:
   * - its parse errors, each under the text it couldn't make sense of
   * - then its warnings, each under what it's about, e.g. a property with no type -- see `SP.SpellWarnings`
   * - then the CSS mistakes in its `<css>` blocks -- see `LSP.SpellCSS`
   * - then each name its host fills that the code no longer declares -- see `LSP.HostNameCheck`
   * - A file its project doesn't parse, or a project whose parse crashed, gets ONE diagnostic saying so, at the top.
   */
  diagnostics(file: SP.SpellFile): Diagnostic[] {
    const top: Range = { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } }
    if (!file.isActive) {
      const message = `Not parsed:  '${SP.SpellProject.sourceNameOf(file.path)}' isn't active in this project's .imports.json`
      return [{ range: top, severity: DiagnosticSeverity.Information, source: "spell", message }]
    }
    const problem = file.project.parseError
    if (problem) {
      const message = `Parser crashed, will try again after the next edit:  ${problem}`
      return [{ range: top, severity: DiagnosticSeverity.Error, source: "spell", message }]
    }
    if (!file.match) return []

    const text = file.parseText
    const errors = (SP.Block.getParseErrors(file.match) ?? []).flatMap((error): Diagnostic[] => {
      const range = this.rangeOf(file, error)
      if (!range) return []
      const message =
        error.message ||
        SP.Language.of(error.scope).parserMessage("dont-understand", { text: text.slice(error.start, error.end) })
      return [{ range, severity: DiagnosticSeverity.Error, source: "spell", message }]
    })
    const warnings = SP.SpellWarnings.in(file.match).flatMap(({ at, message }): Diagnostic[] => {
      const range = this.rangeOf(file, at)
      return range ? [{ range, severity: DiagnosticSeverity.Warning, source: "spell", message }] : []
    })
    return [...errors, ...warnings, ...this.css.diagnostics(text), ...LSP.HostNameCheck.diagnostics(this, file)]
  }

  /**
   * `spell/testDiagnostics`:  each failed check of `tests` as an error on its line, in the file it's in --
   * for EVERY spell file of `project`, so a file whose tests now pass has its errors cleared.
   * - e.g. `it is the queen of spades should be yes` that was `no`:
   *   "Unexpected: `it is the queen of spades` should be `yes` but is actually `false`", under that line.
   * - A test is found by its function's name, `testCardSetup`;  a check by the spell it was written as
   *   (`TestFailure.what`, `expected`), then by `occurrence` when its test says the same thing more than once.
   *   - So the compiled code needs no line numbers:  `core.expect()` is called with that spell already.
   *   - A check run more often than it's written, e.g. in a loop, is the last one written so.
   * - A test that threw, or a failed check found nowhere (the file changed since), is an error on its `to test` line.
   * - From the files as last parsed:  the runner reports on what it ran, which compiled from them.
   */
  testDiagnostics(project: SP.SpellProject, tests: LSP.TestReport[]): LSP.FileDiagnostics[] {
    const definitions = new Map<string, TestDefinition>()
    for (const file of project.spellFiles) {
      if (file.match) this.testDefinitionsIn(file, file.match, definitions)
    }
    const byFile = new Map<SP.SpellFile, Diagnostic[]>(project.spellFiles.map((file) => [file, []]))
    const add = (file: SP.SpellFile, match: P.Match, message: string) => {
      const range = this.rangeOf(file, match)
      if (range) byFile.get(file)?.push({ range, severity: DiagnosticSeverity.Error, source: TEST_SOURCE, message })
    }
    for (const test of tests) {
      const definition = test.method === undefined ? undefined : definitions.get(test.method)
      if (!definition) continue
      for (const { what, expected, message, occurrence } of test.failures) {
        const written = definition.checks.filter((check) => check.what === what && check.expected === expected)
        const check = written[Math.min(occurrence, written.length - 1)]
        add(definition.file, check?.match ?? definition.match, message)
      }
      if (test.threw !== undefined) add(definition.file, definition.match, test.threw)
    }
    return [...byFile].map(([file, diagnostics]) => ({ uri: this.addresses.uriFor(file), diagnostics }))
  }

  /**
   * Each `to test ...` in `block` of `file`, and the ones in the bodies under it, into `definitions`,
   * by its function's name:  with its checks, in the order they're written.
   */
  private testDefinitionsIn(file: SP.SpellFile, block: P.Match, definitions: Map<string, TestDefinition>): void {
    for (const statement of SpellLanguageService.statementsIn(block)) {
      if (!statement.groups.asTest) continue
      const ast = statement.AST
      const statements = ast instanceof P.ASTStatementGroup ? (ast.statements ?? []) : [ast]
      // spell's own name, `test_card_setup`:  as javascript names it, as the runner reports it
      const name = statements.find((node) => node instanceof P.ASTMethodDefinition)?.methodName
      if (!name) continue
      const method = P.camelCaseOf(name)
      const checks: TestDefinition["checks"] = []
      const body = statement.data.body as P.Match | undefined
      for (const inBody of body ? SpellLanguageService.statementsIn(body) : []) {
        const check = inBody.AST
        if (!(check instanceof P.ASTExpectMethodInvocation)) continue
        const [, what, , expected] = (check.args.args ?? []) as Array<P.ASTStringLiteral | undefined>
        checks.push({ what: String(what?.value), expected: expected && String(expected.value), match: inBody })
      }
      definitions.set(method, { file, match: statement, checks })
    }
  }

  /**
   * Every statement in `block`, in the order they're written:  each line's, then the ones in its indented body.
   * - Not what JSX or a rule keeps in `match.data` otherwise:  statements only.
   */
  private static *statementsIn(block: P.Match): Generator<P.Match> {
    for (const item of block.matched) {
      if (!(item instanceof P.Match)) continue
      if (item.rule.name === "block") {
        yield* SpellLanguageService.statementsIn(item)
        continue
      }
      const statement = item.data.statement as P.Match | undefined
      if (!statement) continue
      yield statement
      const body = statement.data.body as P.Match | undefined
      if (body?.rule.name === "block") yield* SpellLanguageService.statementsIn(body)
    }
  }

  ////////////////
  // ## Structure
  ////////////////

  /**
   * Foldable regions of `file`:
   * - a statement with an indented body, e.g. a method definition or an `if`
   * - a JSX element spanning several lines
   * - a run of two or more comment-only lines
   */
  foldingRanges(file: SP.SpellFile): FoldingRange[] {
    if (!file.match) return []
    const ranges: FoldingRange[] = []
    const commentLines: number[] = []
    SpellLanguageService.walk(file.match, (match) => {
      if (match.rule.name === "line") {
        if (match.tokens.length === 2) this.addFold(file, ranges, match.start, match.end)
        const isCommentOnly = !match.data.statement && match.matched.some((item) => this.isMatchOf(item, "comment"))
        if (isCommentOnly && match.start !== undefined) commentLines.push(this.positionAt(file, match.start).line)
      }
    })
    P.Tokenizer.forEachToken(file.match.tokens, (token) => {
      if (token instanceof P.JSXElementToken || token instanceof P.JSXFragmentToken)
        this.addFold(file, ranges, token.start, token.end)
    })
    for (const [startLine, endLine] of this.runsOf(commentLines))
      ranges.push({ startLine, endLine, kind: FoldingRangeKind.Comment })
    for (const region of this.css.regionsIn(file.parseText)) this.addFold(file, ranges, region.start, region.end)
    return ranges
  }

  /** Add a fold from `start` to `end` to `ranges`, if they're on different lines. */
  private addFold(file: SP.SpellFile, ranges: FoldingRange[], start?: number, end?: number) {
    if (start === undefined || end === undefined) return
    const startLine = this.positionAt(file, start).line
    const endLine = this.positionAt(file, end).line
    if (endLine > startLine) ranges.push({ startLine, endLine })
  }

  /**
   * "Expand selection" steps at each of `positions`:  innermost match first, out to the whole file.
   * - Only ranges which contain the position, each strictly bigger than the last -- editors reject anything else.
   */
  selectionRanges(file: SP.SpellFile, positions: Position[]): SelectionRange[] {
    const whole: SelectionRange = {
      range: { start: { line: 0, character: 0 }, end: this.positionAt(file, file.parseText.length) }
    }
    return positions.map((position) => {
      let selection = whole
      for (const match of this.matchesAt(file, position)) {
        const range = this.rangeOf(file, match)
        if (!range || !this.rangeContains(range, position) || this.sameRange(range, selection.range)) continue
        selection = { range, parent: selection }
      }
      return selection === whole ? { range: { start: position, end: position }, parent: whole } : selection
    })
  }

  /**
   * Outline of `file`:  the types, properties, methods, event handlers and variables it declares.
   * - A property or method of a type this file declares nests under that type.
   * - A declaration's indented body contributes its own declarations as children.
   *   Other statements' bodies (`if`, loops...) don't:  their names aren't the file's.
   */
  documentSymbols(file: SP.SpellFile): DocumentSymbol[] {
    if (!file.match) return []
    return this.nestUnderTypes(this.symbolsIn(file, file.match))
  }

  /** Declarations in every project we've parsed (see `SP.SpellProject.registry`) whose names contain `query`'s characters in order, ignoring case. */
  workspaceSymbols(query: string): WorkspaceSymbol[] {
    const results: WorkspaceSymbol[] = []
    for (const project of SP.SpellProject.registry.values()) {
      for (const file of project.spellFiles) {
        const uri = this.addresses.uriFor(file)
        for (const { symbol, containerName } of this.allSymbols(this.documentSymbols(file))) {
          const { name, kind, selectionRange } = symbol
          if (this.isSubsequence(query, name))
            results.push({ name, kind, containerName, location: { uri, range: selectionRange } })
        }
      }
    }
    return results
  }

  /** Symbols for the declarations among `block`'s items, each with the ones in its own body as children. */
  private symbolsIn(file: SP.SpellFile, block: P.Match): LSP.SpellSymbol[] {
    return block.matched.flatMap((item) => {
      if (!(item instanceof P.Match)) return []
      if (item.rule.name === "block") return this.symbolsIn(file, item)
      const statement = item.data.statement as P.Match | undefined
      const found = statement && this.symbolFor(file, item, statement)
      if (!found) return []
      const body = statement.data.body as P.Match | undefined
      if (body?.rule.name === "block") found.symbol.children = this.nestUnderTypes(this.symbolsIn(file, body))
      return [found]
    })
  }

  /**
   * Symbol for `statement` on `line`, if it declares something -- asks its rule (`getDeclaration()`).
   * - `range` covers the whole line and any body;  `selectionRange` just the name.
   * - Type names show in PascalCase, as the compiled classes are named.
   */
  private symbolFor(file: SP.SpellFile, line: P.Match, statement: P.Match): LSP.SpellSymbol | undefined {
    const declaration = statement.rule.getDeclaration(statement)
    const range = this.rangeOf(file, line)
    if (!declaration || !range) return undefined
    const { kind, name, nameMatch, of, detail } = declaration
    return {
      symbol: {
        name: kind === "type" ? P.typeCase(name) : name,
        kind: SpellLanguageService.SYMBOL_KINDS[kind],
        detail,
        range,
        selectionRange: this.rangeOf(file, nameMatch) ?? range
      },
      typeName: of && P.typeCase(of)
    }
  }

  ////////////////
  // ## Highlighting
  ////////////////

  /** Semantic token types we send, in legend order -- every `P.HighlightKind`. */
  static HIGHLIGHT_KINDS: P.HighlightKind[] = [
    "keyword",
    "operator",
    "variable",
    "parameter",
    "type",
    "enumMember",
    "function",
    "property",
    "number",
    "string",
    "comment"
  ]

  /**
   * Semantic token legend, sent on `initialize`.  Modifier bits:  `declaration` = 1, `defaultLibrary` = 2,
   * then `heading1` = 4 ... `heading4` = 32, then `bold` = 64, `italic` = 128, `link` = 256, `strikethrough` = 512.
   * - `heading<N>` are ours, for a heading comment with N `#`s:  `##` => `heading2`, and 4 or more => `heading4`.
   *   - A modifier is a flag, not a value, so one per level.
   *   - The VS Code extension declares them, and shows them bold.
   * - `bold` ... `strikethrough` are ours too:  markdown inside a comment (`commentSpans()`),
   *   which the extension styles to match.
   */
  static TOKEN_LEGEND: SemanticTokensLegend = {
    tokenTypes: SpellLanguageService.HIGHLIGHT_KINDS,
    tokenModifiers: [
      "declaration",
      "defaultLibrary",
      "heading1",
      "heading2",
      "heading3",
      "heading4",
      "bold",
      "italic",
      "link",
      "strikethrough"
    ]
  }

  /** Deepest heading level with its own `heading<N>` modifier -- deeper ones share it.  See `TOKEN_LEGEND`. */
  static MAX_HEADING = 4

  /**
   * Which highlight kinds of a declared name's tokens get the `declaration` modifier, for each kind of declaration.
   * - A method's name is its whole signature:  its words and argument names, NOT the types of its arguments.
   */
  static DECLARED_AS: Record<P.DeclarationKind, P.HighlightKind[]> = {
    type: ["type"],
    property: ["property"],
    method: ["function", "parameter"],
    function: ["function", "parameter"],
    variable: ["variable"],
    event: []
  }

  /**
   * Semantic tokens for `file`, or just those overlapping `range`:  how the editor should colour each word.
   * - A token running over several lines, e.g. a multi-line string, is sent once per line, as the protocol requires.
   */
  semanticTokens(file: SP.SpellFile, range?: Range): SemanticTokens {
    if (range) {
      const builder = new SemanticTokensBuilder()
      this.pushTokens(builder, file, this.offsetAt(file, range.start), this.offsetAt(file, range.end))
      return builder.build()
    }
    const builder = this.tokensBuilderFor(file)
    // NOTE: a builder keeps what was pushed until `previousResult()` starts afresh -- `build()` doesn't.
    // An id that matches nothing starts afresh with nothing to diff against.
    builder.previousResult("")
    this.pushTokens(builder, file)
    return builder.build()
  }

  /**
   * `file`'s semantic tokens as EDITS to what we sent as `previousResultId` -- or all of them, if that isn't the
   * last whole-file result we sent for it, e.g. after a restart.
   * - Diffs the token data, so an edit to one line sends that line's tokens, not the file's.
   */
  semanticTokensDelta(file: SP.SpellFile, previousResultId: string): SemanticTokens | SemanticTokensDelta {
    const builder = this.tokensBuilderFor(file)
    builder.previousResult(previousResultId)
    this.pushTokens(builder, file)
    return builder.canBuildEdits() ? builder.buildEdits() : builder.build()
  }

  /** Builder for `file`'s whole-file tokens:  kept, as it remembers what it built last, for `semanticTokensDelta()`. */
  private tokensBuilderFor(file: SP.SpellFile): SemanticTokensBuilder {
    let builder = this.#tokenBuilders.get(file)
    if (!builder) this.#tokenBuilders.set(file, (builder = new SemanticTokensBuilder()))
    return builder
  }

  /** Push `file`'s tokens from offset `from` up to `to` onto `builder`. */
  private pushTokens(builder: SemanticTokensBuilder, file: SP.SpellFile, from = 0, to = Infinity): void {
    for (const span of this.highlightSpans(file)) {
      if (span.end <= from || span.start >= to) continue
      const kind = SpellLanguageService.HIGHLIGHT_KINDS.indexOf(span.kind)
      const heading = span.heading ? 1 << (1 + Math.min(span.heading, SpellLanguageService.MAX_HEADING)) : 0
      const markdown =
        (span.bold ? 64 : 0) | (span.italic ? 128 : 0) | (span.link ? 256 : 0) | (span.strikethrough ? 512 : 0)
      const modifiers = (span.declaration ? 1 : 0) | (span.defaultLibrary ? 2 : 0) | heading | markdown
      for (const [start, end] of this.splitByLine(file, span.start, span.end)) {
        const { line, character } = this.positionAt(file, start)
        builder.push(line, character, end - start, kind, modifiers)
      }
    }
  }

  /**
   * What to colour in `file`, in order, never overlapping.
   * - Each match's OWN tokens take its rule's `highlightAs`, e.g. `property` for `suit` in `its suit`.
   * - Refined from what the parse found:
   *   - the words of a call to a method the project defines are `function`, not `keyword`
   *   - an argument is a `parameter`
   *   - something built in, e.g. the `thing` type, is `defaultLibrary`
   *   - a name where it's declared, e.g. `card` in `a card is a thing`, is a `declaration`
   * - JSX tag names are `type`s, attribute names `property`s.
   * - Nothing in a `<css>` block:  editors colour it as CSS themselves.
   * - A page file (epic `language` P47):  its tags' words and closers are `keyword`s, their attribute names
   *   `property`s, a prose line's text a comment -- see `pageSpans()`;
   *   a twin's own words, standing at a tag with no text of their own, are never coloured (C24).
   */
  highlightSpans(file: SP.SpellFile): LSP.HighlightSpan[] {
    if (!file.match) return []
    const generated = this.generatedRules(file.project)
    // Kind of declaration each declared name's tokens are part of, by token start.
    const declared = new Map<number, P.DeclarationKind>()
    const spans: LSP.HighlightSpan[] = []
    // a page file's own words, and where its prose lines start:  the twin's comments standing there are drawn by these
    const prose = new Set<number>()
    if (file.form === "page") spans.push(...this.pageSpans(file, prose))
    SpellLanguageService.walk(file.match, (match, parent) => {
      const declaration = match.rule.getDeclaration(match)
      if (declaration) {
        P.Tokenizer.forEachToken(declaration.nameMatch.tokens, (token) => {
          declared.set(token.start, declaration.kind)
        })
      }
      for (const item of match.matched) {
        if (item instanceof P.Match) continue
        if (item instanceof P.JSXToken) {
          spans.push(...this.jsxSpans(item))
          continue
        }
        // a page's prose:  drawn from the file's own tokens, `pageSpans()`
        if (item instanceof SP.PageProseToken && prose.has(item.start)) continue
        const kind = match.rule.highlightAs && this.refineKind(match.rule.highlightAs, item, match, parent, generated)
        if (!kind || !SpellLanguageService.isColourable(item)) continue
        const declaredKind = declared.get(item.start)
        const span: LSP.HighlightSpan = {
          start: item.start,
          end: item.end,
          kind,
          declaration: !!declaredKind && SpellLanguageService.DECLARED_AS[declaredKind].includes(kind),
          defaultLibrary: this.isBuiltIn(match),
          heading:
            item instanceof P.CommentToken && item.commentSymbol.startsWith("#") ? item.commentSymbol.length : undefined
        }
        if (item instanceof P.CommentToken) spans.push(...SpellLanguageService.commentSpans(item, span))
        else spans.push(span)
      }
    })
    spans.sort((a, b) => a.start - b.start)
    return spans.filter(
      (span, index) =>
        (index === 0 || span.start >= spans[index - 1]!.end) && !this.css.isInBlock(file.parseText, span.start)
    )
  }

  /**
   * A comment's highlight, split by the markdown in its text (`MD.InlineParser`):  `**bold**`, `*italic*`,
   * `~~struck~~` and links keep the comment colour with a `bold` / `italic` / `strikethrough` / `link` modifier;
   * a `` `code` `` span is coloured as a `string`.
   * - Comments are spell's docstrings, which ARE markdown (`docMarkdown()`).
   * - `span` is the whole comment's highlight:  every piece keeps its `heading` level.
   * - Plain text (no `*` `_` `~` `` ` `` `[` `<` in it) stays one span.
   */
  static commentSpans(token: P.CommentToken, span: LSP.HighlightSpan): LSP.HighlightSpan[] {
    const text = token.value
    if (!/[*_~`[<]/.test(text)) return [span]
    const textStart = token.start + token.commentSymbol.length + token.initialWhitespace.length
    // one style per character of `text`, painted by the markdown nodes over it
    const styles: CommentStyle[] = Array.from({ length: text.length }, () => ({}))
    paint(MD.InlineParser.parse(text), {})

    const pieces: LSP.HighlightSpan[] = []
    if (textStart > span.start) pieces.push({ ...span, end: textStart })
    for (let i = 0; i < text.length;) {
      let end = i + 1
      while (end < text.length && sameStyle(styles[end]!, styles[i]!)) end++
      const { code, ...marks } = styles[i]!
      pieces.push({ ...span, ...marks, kind: code ? "string" : span.kind, start: textStart + i, end: textStart + end })
      i = end
    }
    if (span.end > textStart + text.length) pieces.push({ ...span, start: textStart + text.length })
    // neighbours that draw the same are one span (e.g. the `//` and the plain text after it)
    const merged: LSP.HighlightSpan[] = []
    for (const piece of pieces) {
      const last = merged.at(-1)
      if (piece.end <= piece.start) continue
      if (last && last.end === piece.start && sameSpan(last, piece)) last.end = piece.end
      else merged.push(piece)
    }
    return merged

    /** Give every character `node` covers the style of its ancestors plus its own. */
    function paint(node: InlineNode, inherited: CommentStyle) {
      for (const child of node.children()) {
        const style: CommentStyle = { ...inherited }
        if (child.kind === "strong") style.bold = true
        else if (child.kind === "emph") style.italic = true
        else if (child.kind === "del") style.strikethrough = true
        else if (child.kind === "link" || child.kind === "image") style.link = true
        else if (child.kind === "code") style.code = true
        if (child.start !== undefined && child.end !== undefined && Object.keys(style).length) {
          for (let i = child.start; i < child.end && i < styles.length; i++) styles[i] = { ...styles[i], ...style }
        }
        paint(child, style)
      }
    }

    /** Do highlight spans `a` and `b` draw the same? */
    function sameSpan(a: LSP.HighlightSpan, b: LSP.HighlightSpan) {
      return a.kind === b.kind && sameStyle(a, b)
    }

    /** Do `a` and `b` draw the same? */
    function sameStyle(a: CommentStyle, b: CommentStyle) {
      return (
        !!a.bold === !!b.bold &&
        !!a.italic === !!b.italic &&
        !!a.link === !!b.link &&
        !!a.code === !!b.code &&
        !!a.strikethrough === !!b.strikethrough
      )
    }
  }

  /** `kind` for `token`, which `match` holds directly, refined by what the parse found -- see `highlightSpans()`. */
  private refineKind(
    kind: P.HighlightKind,
    token: P.Token,
    match: P.Match,
    parent: P.Match | undefined,
    generated: Map<P.Rule, P.ScopeRule>
  ): P.HighlightKind {
    const isGenerated = generated.has(match.rule) || (!!parent && generated.has(parent.rule))
    if (kind === "keyword" && isGenerated && token instanceof P.WordToken) return "function"
    const { scopeVar } = match.data as { scopeVar?: unknown }
    if (kind === "variable" && scopeVar instanceof P.ScopeVariable && scopeVar.kind === "argument") return "parameter"
    // a paren-free argument's type, e.g. `card` in `to give a card to a pile`:  the whole of it is a parameter
    if (kind === "type" && parent?.rule.highlightAs === "parameter") return "parameter"
    return kind
  }

  /** Is `match` a reference to something built in, i.e. a scope record which wasn't declared in any file? */
  private isBuiltIn(match: P.Match): boolean {
    const record = this.recordOf(match)
    return !!record && !record.declaredBy
  }

  /**
   * Spans for a JSX token's names:  tag names (`<div`, `</div>`) as `type`s, attribute names as `property`s.
   * - None for a fragment, `<>...</>`:  it has no name.
   */
  /**
   * A page file's own words, from its tokens (epic `language` P47):
   * - a page's head, `"x" is a notebook page`:  its words after its name `keyword`s
   * - a tag's word and its `<`, `>` or `/>`:  `keyword`
   * - its attributes' names:  `property`  (their values and a phrase are the twin's, coloured by the parse)
   * - a closer, `</>` or `</if>`:  `keyword`
   * - a prose line's text:  a comment, its markdown styled as a docstring's
   * - `prose`:  gets where each prose line starts, where the twin's own comments stand too
   */
  private pageSpans(file: SP.SpellFile, prose: Set<number>): LSP.HighlightSpan[] {
    const text = file.parseText
    const spans: LSP.HighlightSpan[] = []
    const keyword = (start: number, end: number) => {
      if (end > start) spans.push({ start, end, kind: "keyword" })
    }
    P.Tokenizer.forEachToken(file.match?.tokens ?? [], (token) => {
      if (token instanceof SP.PageTagToken) {
        const { tag } = token
        if (tag.category === "page") {
          keyword(tag.name?.quoted?.end ?? token.start, token.end)
          return
        }
        keyword(token.start, token.start + 1 + tag.word.length)
        for (const attribute of tag.attributes) {
          spans.push({ start: attribute.start, end: attribute.start + attribute.word.length, kind: "property" })
        }
        const close = tag.selfClosing ? "/>" : ">"
        if (token.raw?.endsWith(close)) keyword(token.end - close.length, token.end)
      } else if (token instanceof SP.PageCloserToken) {
        keyword(token.start, token.end)
      } else if (token instanceof SP.PageProseToken) {
        prose.add(token.start)
        spans.push(...this.proseSpans(text, token))
      }
    })
    return spans
  }

  /** A page's prose line:  its text a comment. */
  private proseSpans(text: string, token: SP.PageProseToken): LSP.HighlightSpan[] {
    const lineEnd = text.indexOf("\n", token.start)
    const line = text.slice(token.start, lineEnd < 0 ? undefined : lineEnd).trimEnd()
    const value = token.value
    const at = value ? line.indexOf(value) : -1
    if (at < 0) return []
    const spans: LSP.HighlightSpan[] = []
    const textStart = token.start + at
    const textEnd = textStart + value.length
    const comment = { value, start: textStart, commentSymbol: "", initialWhitespace: "" } as P.CommentToken
    spans.push(...SpellLanguageService.commentSpans(comment, { start: textStart, end: textEnd, kind: "comment" }))
    return spans
  }

  private jsxSpans(token: P.JSXToken): LSP.HighlightSpan[] {
    if (token instanceof P.JSXElementToken) {
      return [{ start: token.start + 1, end: token.start + 1 + token.tagName.length, kind: "type" }]
    }
    // a fragment's `</>` has no name;  nor has a drawing's, closing the element it ends (`emptyEndTagCloses`)
    if (token instanceof P.JSXEndTagToken && token.tagName && token.raw?.startsWith(`</${token.tagName}`)) {
      return [{ start: token.start + 2, end: token.start + 2 + token.tagName.length, kind: "type" }]
    }
    if (token instanceof P.JSXAttributeToken) {
      return [{ start: token.start, end: token.start + token.name.length, kind: "property" }]
    }
    return []
  }

  /** `[start, end]` of each line's part of the text from `start` to `end`, leaving out newlines. */
  private splitByLine(file: SP.SpellFile, start: number, end: number): Array<[number, number]> {
    const lineStarts = this.lineStarts(file)
    const pieces: Array<[number, number]> = []
    let line = this.positionAt(file, start).line
    for (let from = start; from < end; line++) {
      const nextLineStart = lineStarts[line + 1]
      const to = nextLineStart === undefined ? end : Math.min(end, nextLineStart - 1)
      if (to > from) pieces.push([from, to])
      if (nextLineStart === undefined) break
      from = nextLineStart
    }
    return pieces
  }

  ////////////////
  // ## Hover
  ////////////////

  /**
   * What to show when hovering over `position`:
   * - in a `<css>` block:  the CSS service's hover, e.g. a property's docs -- see `LSP.SpellCSS`
   * - on a component's tag or attribute in a drawing (`<button color`):  what it is -- see `componentHover()`
   * - the rule that matched there, its syntax and an example from its tests
   * - what the word refers to and where that was declared, e.g. a variable's kind and output name
   * - the javascript its statement compiles to
   * - `detail` says who's reading (`LSP.HoverDetail`):
   *   - `"full"`:  all of the above, for programmers:  VS Code, and `spell explain`
   *   - `"plain"`:  the sentence and its description, no compiler words:  the editor app, unless someone asks
   *     (`CodeSettings`).  A word with nothing to say in plain words shows no hover at all.
   */
  hover(file: SP.SpellFile, position: Position, detail: LSP.HoverDetail = "full"): Hover | null {
    const offset = this.offsetAt(file, position)
    const cssHover = this.css.hover(file.parseText, offset, position)
    if (cssHover !== undefined) return cssHover
    const markupHover = this.componentHover(file, position)
    if (markupHover) return markupHover
    const stack = this.matchesAt(file, position)
    const described = [...stack]
      .reverse()
      .find((match) => match.rule.name && match.start !== undefined && match.start <= offset && offset <= match.end!)
    if (!described || described === file.match) return null
    const subject = this.subjectIn(file, stack, offset)
    const statement = [...stack].reverse().find((match) => match.data.statement instanceof P.Match)?.data.statement as
      | P.Match
      | undefined

    const ruleMatch = described.data.statement instanceof P.Match ? described.data.statement : described
    const sections = detail === "full" ? [this.describeRule(ruleMatch)] : this.describeBuiltIns(ruleMatch)
    // an outline body's line, as the sentence style says it -- see `SP.SpellStatement.getLongForm()`
    const longForm = statement?.rule instanceof SP.SpellStatement ? statement.rule.getLongForm(statement) : undefined
    if (longForm) sections.unshift(`**${LSP.LspTexts.for(file.language).text("readsAs")}**  \`${longForm}\``)
    if (subject) sections.push(this.describeSubject(subject, file, detail))
    const compiled = detail === "full" && statement && SpellLanguageService.compileQuietly(statement)
    if (compiled) sections.push(["```js", SpellLanguageService.truncateLines(compiled, 20), "```"].join("\n"))
    if (!sections.length) return null
    const range = subject ? this.rangeOf(file, subject.nameMatch) : this.rangeOf(file, described)
    return { contents: { kind: MarkupKind.Markdown, value: sections.join("\n\n---\n\n") }, range }
  }

  /**
   * What the component tag or attribute at `position` is, in a drawing (epic `editor` I55):
   * `<button>` => "a component that ...";  `color` inside it => the attribute, what it is, the words it takes.
   * - Spell UI's, in the file's language (`SP.ComponentPacks.help()`).
   * - An attribute on a line of its own, under its tag's, too (epic `editor` I64):  see `openTagBefore()`.
   * - Public for the app's Go to Definition, which shows it where there's nothing to go to (epic `editor` I148).
   * - `null` for anything else, the program's own views among them.
   */
  componentHover(file: SP.SpellFile, position: Position): Hover | null {
    const at = this.markupWordAt(file, position)
    if (!at) return null
    const { word, scope, range } = at
    const help = SpellLanguageService.componentHelpAt(scope)
    if (!help) return null
    const texts = LSP.LspTexts.of(scope)
    let value: string | undefined
    if (at.kind === "tag") {
      const tag = !SpellLanguageService.ownViewOf(scope, word) && help.tags.find((it) => it.tag === word)
      if (tag) value = [`**\\<${word}>** · ${texts.text("componentTag")}`, tag.description].filter(Boolean).join("\n\n")
    } else if (!SpellLanguageService.ownViewOf(scope, at.tag)) {
      const attribute = help.attributesOf(at.tag)?.find((it) => it.name === word)
      if (attribute) {
        const takes = attribute.values.map((it) => `\`${it}\``).join(" · ")
        // `\<`:  a bare `<container>` reads as HTML, and shows nothing
        const of = texts.text("attributeOf", { tag: at.tag }).replace(/</g, "\\<")
        value = [`**${word}** · ${of}`, attribute.description, takes].filter(Boolean).join("\n\n")
      }
    }
    return value ? { contents: { kind: MarkupKind.Markdown, value }, range } : null
  }

  /**
   * The tag name or attribute name at `position`, in a drawing:
   * `stock-pile` in `<stock-pile "stock" />`, `suit` in `<foundation "clubs" suit=clubs />`.
   * - An attribute on a line of its own, under its tag's, too (epic `editor` I64):  see `openTagBefore()`.
   * - `undefined` anywhere else:  a quoted value, a `{...}`, text between tags, code.
   */
  private markupWordAt(file: SP.SpellFile, position: Position): MarkupWord | undefined {
    const text = file.parseText
    const offset = this.offsetAt(file, position)
    const lineStart = text.lastIndexOf("\n", offset - 1) + 1
    const lineEnd = text.indexOf("\n", offset)
    const line = text.slice(lineStart, lineEnd < 0 ? undefined : lineEnd)
    const at = offset - lineStart
    const start = at - /[\p{L}\p{M}\d-]*$/u.exec(line.slice(0, at))![0].length
    const end = at + /^[\p{L}\p{M}\d-]*/u.exec(line.slice(at))![0].length
    const word = line.slice(start, end)
    if (!word || !/\p{L}/u.test(word)) return undefined
    const scope = this.scopeAt(file, offset)
    const range = {
      start: { line: position.line, character: start },
      end: { line: position.line, character: end }
    }
    // a tag's attributes on lines of their own:  the tag's lines as one (epic `editor` I64)
    const before = openTagBefore(text, lineStart + start) ?? line.slice(0, start)
    if (/<\/?$/.test(before)) return { kind: "tag", word, scope, range }
    const open = /<(\p{L}[\p{L}\p{M}\d-]*)(\s[^<>]*)?\s$/u.exec(before)
    if (!open || isInQuotesOrBraces(open[2] ?? "")) return undefined
    return { kind: "attribute", word, tag: open[1]!, scope, range }
  }

  /**
   * Markdown for `match`'s rule:  its name, syntax, and the first example from its tests.
   * - Then what `describeBuiltIns()` says of it.
   */
  private describeRule(match: P.Match): string {
    const { rule } = match
    const texts = LSP.LspTexts.of(match.scope)
    const syntax = SpellLanguageService.truncate(rule.toRulexSyntax(), 160)
    const lines = [syntax ? `**${rule.name}** \`${syntax}\`` : `**${rule.name}**`]
    const example = SpellLanguageService.firstExample(rule)
    if (example) lines.push(`${texts.text("forExample")} \`${example}\``)
    return [lines.join("  \n"), ...this.describeBuiltIns(match)].join("\n\n")
  }

  /**
   * Markdown for each built-in type's member `match`'s rule spells, e.g. `list_shuffle`:
   * that member and its docs -- see `SP.BUILT_IN_TYPE_TABLE`.
   */
  private describeBuiltIns(match: P.Match): string[] {
    const { rule } = match
    const texts = LSP.LspTexts.of(match.scope)
    const members = rule.name ? SP.builtInMembersOfRule(rule.name) : []
    return members.map(({ type, member }) =>
      [texts.text("builtIn", { words: member.words, type: type.name }), member.docstring].filter(Boolean).join("\n\n")
    )
  }

  /**
   * Markdown for what `subject` is, and where it was declared -- in its program's language (`textsFor()`).
   * - `"plain"` leaves out what only the compiler cares for:  output names, what it matches, what it compiles to.
   */
  private describeSubject(subject: LSP.SpellSubject, file?: SP.SpellFile, detail: LSP.HoverDetail = "full"): string {
    const texts = SpellLanguageService.textsFor(subject)
    const isFull = detail === "full"
    const lines: string[] = []
    if (subject.kind === "variable") {
      const { name, output, kind, datatype, isAlias } = subject.record
      // what it holds, e.g. `card: Card` for an argument `(a card)`, a loop's item, `it` in a method
      const bits = [`${texts.text("variable")} **${name}**${datatype ? `: ${datatype}` : ""}`]
      if (isFull && output && output !== name) bits.push(`${texts.text("as")} \`${output}\``)
      if (kind) bits.push(kind)
      if (isAlias) bits.push(texts.text("alias"))
      lines.push(bits.join(" · "))
    } else if (subject.kind === "type") {
      const { name, superType, stub, classVariables } = subject.record
      const isA = superType ? texts.text("isA", { superType }) : ""
      lines.push(`${texts.text("type")} **${name}**${isA}${stub ? ` ${texts.text("stub")}` : ""}`)
      const properties = SpellLanguageService.propertiesOf(subject.record).map((it) =>
        SpellLanguageService.memberWords(it.name, it)
      )
      if (properties.length) lines.push(`${texts.text("properties")}:  ${properties.join(", ")}`)
      const enumerations = classVariables.get().map((variable) => variable.name)
      if (enumerations.length) lines.push(`${texts.text("enumerations")}:  ${enumerations.join(", ")}`)
    } else if (subject.kind === "constant") {
      const output = isFull ? ` ${texts.text("as")} \`${subject.record.output}\`` : ""
      lines.push(`${texts.text("constant")} **${subject.record.name}**${output}`)
    } else if (subject.kind === "method") {
      const declaration =
        subject.record.declaredBy && subject.record.declaredBy.rule.getDeclaration(subject.record.declaredBy)
      const kind = declaration?.kind === "function" ? texts.text("function") : texts.text("method")
      lines.push(`${kind} **${declaration?.name ?? subject.record.name}**`)
      // no word in the source says it (epic `language` P13):  from the pass every target compiles with
      const { record } = subject
      if (file && ((record instanceof P.ScopeMethod && record.waits) || file.project.waitingNames().has(record.name))) {
        lines.push(texts.text("waits"))
      }
      const { syntax } = subject.record.definition
      const or = ` ${texts.text("or")} `
      if (isFull && syntax) lines.push(`${texts.text("matches")} \`${[syntax].flat().join(`\`${or}\``)}\``)
      if (isFull && declaration?.detail) lines.push(`${texts.text("compilesTo")} \`${declaration.detail}\``)
    } else {
      const { record, owner } = subject
      const type = record?.scope instanceof P.TypeScope ? record.scope : owner
      const words = SpellLanguageService.memberWords(subject.name, record)
      const bits = [`${texts.text("property")} **${words}**${type ? texts.text("ofType", { type: type.name }) : ""}`]
      if (record?.datatype) bits.push(texts.text("aDatatype", { datatype: record.datatype }))
      if (record?.autoDeclared) bits.push(texts.text("autoDeclared"))
      // `the pile of a card`:  from `a card belongs to one pile`, which "declared in" links to
      if (record?.exclusive) bits.push(texts.text("exclusive", { datatype: record.datatype ?? "" }))
      lines.push(bits.join(" · "))
    }
    const imported = this.declarationsOf(subject).length ? undefined : this.importedDeclarationOf(subject)
    const declared = imported
      ? SpellLanguageService.linkToLocation(imported)
      : this.declarationsOf(subject)
          .map((it) => this.linkTo(it))
          .join(", ")
    if (declared) lines.push(texts.text("declaredIn", { where: declared }))
    // docstring as its own paragraph, just under the name
    const [title, ...rest] = lines
    const docs = this.docsOf(subject)
    return [title, docs, rest.join("  \n")].filter(Boolean).join("\n\n")
  }

  /**
   * The labels for `subject`, in the language its program is written in (`LSP.LspTexts.of()`).
   * - The scope it's declared in:  a type's own, else its record's, else where its name was matched.
   */
  private static textsFor(subject: LSP.SpellSubject): LSP.LspTexts {
    const record = "record" in subject ? (subject.record as RecordScopes | P.TypeScope | undefined) : undefined
    const scope = record instanceof P.Scope ? record : (record?.scope ?? record?.declaredBy?.scope)
    return LSP.LspTexts.of(scope ?? (subject.nameMatch as P.Match | undefined)?.scope)
  }

  /**
   * Scope record `subject` described as hover does, with no cursor -- e.g. for `ScopeExplorer`:
   * - `hover`:  all of it, as markdown
   * - `summary`:  just what it is, e.g. `type **Card** is a Thing` -- the hover's first paragraph
   * - `description`:  its docstring, as markdown -- see `docMarkdown()`
   * - `location`:  where it was declared
   * - NOTE: `describeSubject()` only reads `nameMatch` for a property WITHOUT a record, which a `ScopeRecord` can't be.
   */
  describeRecord(subject: LSP.ScopeRecord): {
    hover: string
    summary: string
    description?: string
    location?: Location
  } {
    const full = subject as LSP.SpellSubject
    const [declared] = this.declarationsOf(full)
    const hover = this.describeSubject(full)
    return {
      hover,
      summary: hover.split("\n\n")[0]!,
      description: this.docMarkdownOf(full),
      location: declared && this.locationOf(declared)
    }
  }

  /**
   * Edits making `text` the docstring of what the statement starting on `line` of `file`, from 1, declares:
   * see `SP.Block.getDocComments()`.  `null` if no declaring statement starts there.
   * - `text` is markdown, as `docMarkdown()` gives:  a `#`, `##` ... line becomes that heading comment,
   *   any other line a `// ` comment -- indented like the statement.  Empty `text` removes the docstring.
   * - Replaces the comment lines above it -- a heading directly above included -- or else the comment at the end
   *   of its line.  With neither, adds lines directly above it.
   */
  descriptionEdits(file: SP.SpellFile, line: number, text: string): TextEdit[] | null {
    const found = file.match && this.declarationStartingOn(file, line)
    if (!found) return null
    const { statement, doc } = found
    const lineStart = { line: this.positionAt(file, statement.start!).line, character: 0 }
    const indent = file.parseText.slice(this.offsetAt(file, lineStart), statement.start).match(/^[ \t]*/)![0]
    const block = SpellLanguageService.commentLines(text, indent)
    const comments = doc?.comments
    if (!comments?.length) return block ? [{ range: { start: lineStart, end: lineStart }, newText: block }] : []
    const first = this.rangeOf(file, comments[0]!)!
    const last = this.rangeOf(file, comments.at(-1)!)!
    // a comment at the end of the statement's own line:  drop it, and its space before
    if (first.start.line === lineStart.line) {
      const before = file.parseText.slice(0, comments[0]!.start).match(/[ \t]*$/)![0].length
      const range = { start: this.positionAt(file, comments[0]!.start! - before), end: last.end }
      return [
        { range, newText: "" },
        ...(block ? [{ range: { start: lineStart, end: lineStart }, newText: block }] : [])
      ]
    }
    // whole comment lines above it
    const range = { start: { line: first.start.line, character: 0 }, end: { line: last.end.line + 1, character: 0 } }
    return [{ range, newText: block }]
  }

  /**
   * Docstring of `file`, as markdown:  the comment lines at its very top, if the first is a `#` heading --
   * e.g. `# Solitaire cards`.  See `docMarkdown()`.
   */
  fileDescription(file: SP.SpellFile): string | undefined {
    const doc = this.fileDocComment(file)
    return doc && SpellLanguageService.docMarkdown(doc)
  }

  /**
   * Edits making `text` the docstring of `file` -- see `fileDescription()`.
   * - Replaces its comment lines at the top, or adds them there.  Empty `text` removes them.
   * - Its first line becomes a `#` heading if it isn't a heading already, or it wouldn't read as the file's.
   */
  fileDescriptionEdits(file: SP.SpellFile, text: string): TextEdit[] {
    const heading = text.trim() && !/^#/.test(text.trimStart()) ? `# ${text.trimStart()}` : text
    const block = SpellLanguageService.commentLines(heading, "")
    const top = { line: 0, character: 0 }
    const doc = this.fileDocComment(file)
    if (!doc) return block ? [{ range: { start: top, end: top }, newText: block }] : []
    const last = this.rangeOf(file, doc.comments.at(-1)!)!
    return [{ range: { start: top, end: { line: last.end.line + 1, character: 0 } }, newText: block }]
  }

  /**
   * Heading comments in `file`, in order, e.g. `## actions` -- NOT those of its docstring, see `fileDescription()`.
   * - Each's `text` without its `#`s.  One with no text, e.g. a `##########` rule, is left out.
   * - Found as `highlightSpans()` colours them, so what reads as a heading in the editor is one here.
   */
  headingsOf(file: SP.SpellFile): Array<{ start: number; level: number; text: string }> {
    const docEnd = this.fileDocComment(file)?.comments.at(-1)?.end ?? -1
    const headings = this.highlightSpans(file)
      .filter((span) => span.heading && span.start >= docEnd)
      .map((span) => ({
        start: span.start,
        level: span.heading!,
        text: file.parseText
          .slice(span.start, span.end)
          .replace(/^\s*#+/, "")
          .trim()
      }))
      .filter((heading) => heading.text)
    // a file's group, `group "The piles"`, is the heading `## The piles` (epic `language` P55, Q54)
    const groups = SpellLanguageService.fileGroupsOf(file)
    return groups.length ? [...headings, ...groups].sort((a, b) => a.start - b.start) : headings
  }

  /** The groups at `file`'s top level, `group "The piles"`, as level-2 headings -- see `headingsOf()`. */
  private static fileGroupsOf(file: SP.SpellFile): Array<{ start: number; level: number; text: string }> {
    const found: Array<{ start: number; level: number; text: string }> = []
    for (const item of file.match?.matched ?? []) {
      const statement = item instanceof P.Match ? (item.data as { statement?: P.Match }).statement : undefined
      const rule = statement?.rule as
        | { isFileHeading?(match: P.Match): boolean; groupName?(match: P.Match): string }
        | undefined
      if (!statement || !rule?.isFileHeading?.(statement) || statement.start === undefined) continue
      found.push({ start: statement.start, level: GROUP_HEADING_LEVEL, text: rule.groupName!(statement) })
    }
    return found
  }

  /** Comment-only lines at the very top of `file`, if the first is a `#` heading -- see `fileDescription()`. */
  private fileDocComment(file: SP.SpellFile): SP.DocComment | undefined {
    const comments: P.Match[] = []
    for (const item of file.match?.matched ?? []) {
      const only = item instanceof P.Match && item.matched.length === 1 ? item.matched[0] : undefined
      if (!(only instanceof P.Match) || only.tokens.length !== 1 || !(only.tokens[0] instanceof P.CommentToken)) break
      comments.push(only)
    }
    const first = comments[0]?.tokens[0] as P.CommentToken | undefined
    if (first?.commentSymbol !== "#") return undefined
    return { comments, lines: comments.map((comment) => (comment.tokens[0] as P.CommentToken).value) }
  }

  /**
   * Markdown `text` as spell comment lines, each ending in a newline:  a `#`, `##` ... line as that heading
   * comment, any other as a `// ` one, all indented `indent`.  `""` for empty `text`.
   */
  static commentLines(text: string, indent: string): string {
    if (!text.trim()) return ""
    return text
      .trimEnd()
      .split("\n")
      .map((line) => {
        const heading = /^(#+)\s*(.*)$/.exec(line.trim())
        return `${indent}${heading ? `${heading[1]} ${heading[2]}` : `// ${line}`}`.trimEnd() + "\n"
      })
      .join("")
  }

  /**
   * Statement starting on `line` of `file`, from 1, that declares something -- and its docstring if any.
   * - Asks each block for its docstrings, as they're per block -- see `SP.Block.getDocComments()`.
   * - A line holds one statement, so its line is enough to find it.
   */
  private declarationStartingOn(
    file: SP.SpellFile,
    line: number
  ): { statement: P.Match; doc?: SP.DocComment } | undefined {
    let found: { statement: P.Match; doc?: SP.DocComment } | undefined
    SpellLanguageService.walk(file.match!, (match) => {
      if (found || !(match.rule instanceof SP.Block)) return
      const docs = match.rule.getDocComments(match)
      for (const blockLine of match.matched) {
        const statement = blockLine instanceof P.Match ? blockLine.data.statement : undefined
        if (
          statement instanceof P.Match &&
          statement.start !== undefined &&
          this.positionAt(file, statement.start).line === line - 1 &&
          statement.rule.getDeclaration(statement)
        ) {
          found = { statement, doc: docs.get(statement) }
        }
      }
    })
    return found
  }

  /**
   * Docstring of what `subject` names:  the comments documenting its declaration -- see `SP.Block.getDocComments()`.
   * - Only if that declaration really names it:  an argument's `declaredBy` is its METHOD, whose docs aren't its own.
   * - Properties only when we know which type they're on.
   * - A type with no comments:  the `<markdown>` block in its outline, if it has one -- see `outlineDescriptionOf()`.
   */
  docsOf(subject: LSP.SpellSubject): string | undefined {
    const builtIn = SpellLanguageService.builtInDoc(subject)
    if (builtIn) return builtIn
    if (!subject.record) return undefined
    return this.docsOfRecord(subject.record, subject.kind === "method") ?? this.outlineDescriptionOf(subject.record)
  }

  /** Docstring of what `subject` names, as markdown -- see `docMarkdown()`, and `docsOf()` for a type's. */
  docMarkdownOf(subject: LSP.SpellSubject): string | undefined {
    const builtIn = SpellLanguageService.builtInDoc(subject)
    if (builtIn) return builtIn
    if (!subject.record) return undefined
    const doc = this.docCommentOfRecord(subject.record, subject.kind === "method")
    return doc ? SpellLanguageService.docMarkdown(doc) : this.outlineDescriptionOf(subject.record)
  }

  /**
   * The `<markdown>` description in type `record`'s outline, if it has one -- see `SP.MarkdownDescription`.
   * - `undefined` for anything but a type.
   */
  private outlineDescriptionOf(record: { name: string; declaredBy?: P.Match }): string | undefined {
    if (!(record instanceof P.TypeScope) || !record.declaredBy) return undefined
    let description: string | undefined
    SpellLanguageService.walk(record.declaredBy, (match) => {
      if (description === undefined && match.is(SP.MarkdownDescription) && match.data.typeName === record.name)
        description = SP.MarkdownDescription.descriptionOf(match)
    })
    return description
  }

  /**
   * Docs of a built-in type's member, e.g. a list's `length`.
   * - From its record, as `SP.BUILT_IN_TYPE_TABLE` gave them:  there's no statement to read them from.
   */
  private static builtInDoc(subject: LSP.SpellSubject): string | undefined {
    const { record } = subject
    return record instanceof P.ScopeVariable && !record.declaredBy ? record.docstring : undefined
  }

  /** Docstring of scope record `record`, if its declaration names it -- or always for a method's rule. */
  private docsOfRecord(record: { name: string; declaredBy?: P.Match }, isMethod = false): string | undefined {
    return this.docCommentOfRecord(record, isMethod)?.lines.join("\n")
  }

  /** Doc comment of scope record `record`, if its declaration names it -- or always for a method's rule. */
  private docCommentOfRecord(
    record: { name: string; declaredBy?: P.Match },
    isMethod = false
  ): SP.DocComment | undefined {
    const { declaredBy } = record
    const file = declaredBy && this.fileOf(declaredBy)
    const declaration = declaredBy?.rule.getDeclaration(declaredBy)
    if (!file || !declaration) return undefined
    const isNamed = isMethod || SpellLanguageService.sameName(`${this.nameLeaf(declaration).raw}`, record.name)
    return isNamed ? this.docCommentsIn(file).get(declaredBy) : undefined
  }

  /**
   * `doc` as markdown:  a heading comment as a heading of its level -- `# Cards` => `# Cards` -- the rest as is.
   * - Round-trips through `descriptionEdits()`, which turns each line back into its comment.
   */
  static docMarkdown(doc: SP.DocComment): string {
    return doc.comments
      .map((comment, index) => {
        const { commentSymbol } = comment.tokens[0] as P.CommentToken
        return commentSymbol.startsWith("#") ? `${commentSymbol} ${doc.lines[index]}` : doc.lines[index]
      })
      .join("\n")
  }

  /** `text` as markdown for an editor, e.g. completion `documentation`. */
  private markdown(text: string | undefined): MarkupContent | undefined {
    return text ? { kind: MarkupKind.Markdown, value: text } : undefined
  }

  /** Doc comment of each declaration in `file`, by its statement -- worked out once per parse of `file`. */
  private docCommentsIn(file: SP.SpellFile): Map<P.Match, SP.DocComment> {
    if (!file.match) return new Map()
    let docs = this.#docsCache.get(file.match)
    if (!docs) {
      const found = new Map<P.Match, SP.DocComment>()
      SpellLanguageService.walk(file.match, (match) => {
        if (!(match.rule instanceof SP.Block)) return
        for (const [statement, doc] of match.rule.getDocComments(match)) found.set(statement, doc)
      })
      docs = found
      this.#docsCache.set(file.match, docs)
    }
    return docs
  }

  /** Markdown link to `match` in `file`, as `File.spell:12`. */
  private linkTo({ file, match }: LSP.FileMatch): string {
    const line = match.start === undefined ? 1 : this.positionAt(file, match.start).line + 1
    return `[${SP.SpellProject.sourceNameOf(file.path)}:${line}](${this.addresses.uriFor(file)}#L${line})`
  }

  /** Markdown link to `location`, as `linkTo()` writes one:  its file's name and line. */
  private static linkToLocation({ uri, range }: Location): string {
    const line = range.start.line + 1
    return `[${decodeURIComponent(uri.slice(uri.lastIndexOf("/") + 1))}:${line}](${uri}#L${line})`
  }

  ////////////////
  // ## Navigation
  ////////////////

  /**
   * Where the thing at `position` was declared -- several places for a property declared on several types.
   * - An imported one's, where its declarations say:  see `importedDeclaration()`.
   * - In a drawing, a view's tag and its attributes too (epic `editor` I148):  see `drawnSubjectAt()`.
   * - `[]` on Spell UI's tags and attributes:  the app shows their help instead (`componentHover()`).
   */
  definition(file: SP.SpellFile, position: Position): Location[] {
    const drawn = this.drawnSubjectAt(file, position)
    if (drawn) return this.definitionOf(drawn)
    const subject = this.subjectAt(file, position)
    return subject ? this.definitionOf(subject) : []
  }

  /** Where `subject` was declared:  in the workspace, else where an imported one's declarations say. */
  private definitionOf(subject: LSP.SpellSubject): Location[] {
    const declared = this.declarationsOf(subject).map((it) => this.locationOf(it))
    const imported = declared.length ? undefined : this.importedDeclarationOf(subject)
    return imported ? [imported] : declared
  }

  /**
   * Where the thing a word at `position` names was declared, when it names one a running program has:
   * a property or variable (`the stock`, `the deck`, `la reserva`), never a type, an action or a keyword.
   * - Its file and line, from 0:  the editor inspects what that line makes or draws (epic `editor` T64).
   * - `undefined` for anything else, or one declared in no file of the workspace (imported).
   */
  declaredThingAt(file: SP.SpellFile, position: Position): { file: SP.SpellFile; line: number } | undefined {
    const subject = this.subjectAt(file, position)
    if (subject?.kind !== "property" && subject?.kind !== "variable") return undefined
    const [declared] = this.declarationsOf(subject)
    if (declared?.match.start !== undefined) {
      return { file: declared.file, line: this.positionAt(declared.file, declared.match.start).line }
    }
    // a member made where it's drawn (`<stock-pile "stock"/>`):  its tag declared it, and says no declaration itself
    const declaredBy = subject.record?.declaredBy
    const declaringFile = declaredBy && this.fileOf(declaredBy)
    if (!declaringFile || declaredBy?.start === undefined) return undefined
    return { file: declaringFile, line: this.positionAt(declaringFile, declaredBy.start).line }
  }

  /**
   * Where IMPORTED `record` was declared, as its `declaredAt` says (`P.DeclaredAt`):  it has no `declaredBy`.
   * - in a file of a project the workspace has parsed, e.g. an import's own source
   * - else in one the workspace finds on disk, e.g. a built-in template's, `TwoSidedView.spell`
   *   (`LSP.FileAddresses.sourceFor()`, epic `elemental-spell` C20)
   * - `undefined` if neither:  a compiled-only library's text usually isn't loaded.
   */
  importedDeclaration(record: LSP.ScopeRecord["record"]): Location | undefined {
    const at = "declared" in record ? record.declared?.declaredAt : (record as { declaredAt?: P.DeclaredAt }).declaredAt
    if (!at) return undefined
    const file = SP.SpellFile.registry.get(at.path)
    if (file?.parseText) {
      const range = { start: this.positionAt(file, at.start), end: this.positionAt(file, at.end) }
      return { uri: this.addresses.uriFor(file), range }
    }
    const source = this.addresses.sourceFor?.(at.path)
    if (!source) return undefined
    const lineStarts = P.getLineStarts(source.text)
    const positionOf = (offset: number): Position => {
      const { line, ch } = P.positionForOffset(lineStarts, offset)
      return { line, character: ch }
    }
    return { uri: source.uri, range: { start: positionOf(at.start), end: positionOf(at.end) } }
  }

  /** Where `subject` was declared, if it was imported:  see `importedDeclaration()`. */
  private importedDeclarationOf(subject: LSP.SpellSubject): Location | undefined {
    return subject.record ? this.importedDeclaration(subject.record) : undefined
  }

  /**
   * The program's own type or property a drawing names at `position` (epic `editor` I148):
   * - a view's tag:  `<stock-pile "stock" />` => the type `stock pile`
   * - one of its attributes that's a property of that type:  `suit` in `<foundation "clubs" suit=clubs />`
   * - `undefined` for anything else, Spell UI's tags and attributes among them:  their help is `componentHover()`.
   */
  private drawnSubjectAt(file: SP.SpellFile, position: Position): LSP.SpellSubject | undefined {
    const at = this.markupWordAt(file, position)
    if (!at) return undefined
    const type = SpellLanguageService.ownViewOf(at.scope, at.kind === "tag" ? at.word : at.tag)
    if (!type) return undefined
    const nameMatch = this.matchesAt(file, position).at(-1) ?? file.match!
    if (at.kind === "tag") return { kind: "type", record: type, nameMatch }
    const name = at.word.replace(/-/g, " ")
    const record = SP.MemberReadExpression.propertyOf(type, name)
    return record ? { kind: "property", name, nameMatch, owner: type, record } : undefined
  }

  /**
   * Where the TYPE of the variable or property at `position` was declared -- see `typeOfVariable()`.
   */
  typeDefinition(file: SP.SpellFile, position: Position): Location[] {
    const subject = this.subjectAt(file, position)
    if (subject?.kind !== "variable" && subject?.kind !== "property") return []
    const type = subject.record && this.typeOfVariable(subject.record, subject.nameMatch.scope)
    if (!type) return []
    return this.declarationsOf({ kind: "type", record: type, nameMatch: subject.nameMatch }).map((it) =>
      this.locationOf(it)
    )
  }

  /**
   * Everywhere in the project the thing at `position` is used, and where it was declared if `includeDeclaration`.
   * - Variables, types and constants by the scope record each word resolved to while parsing -- exact.
   * - Methods by the rule a call matched.
   * - Properties by NAME:  a `suit` of one type and a `suit` of another are both found.
   */
  references(file: SP.SpellFile, position: Position, includeDeclaration = true): Location[] {
    const subject = this.subjectAt(file, position)
    if (!subject) return []
    return this.occurrencesOf(subject, includeDeclaration).map((it) => this.locationOf(it))
  }

  /** Other uses in `file` of the thing at `position`:  its declaration as `Write`, the rest as `Read`. */
  documentHighlights(file: SP.SpellFile, position: Position): DocumentHighlight[] {
    const subject = this.subjectAt(file, position)
    if (!subject) return []
    const declarations = new Set(this.declarationsOf(subject).map(({ match }) => match))
    return this.occurrencesOf(subject, true).flatMap(({ file: at, match }) => {
      const range = at === file ? this.rangeOf(file, match) : undefined
      if (!range) return []
      return [{ range, kind: declarations.has(match) ? DocumentHighlightKind.Write : DocumentHighlightKind.Read }]
    })
  }

  /**
   * Range and current name of what `position` would rename, or `null` if it can't be renamed.
   * - Only variables, types, constants and properties -- NOT `it`, nor an alias like `its` for `this`.
   * - Only if every use of it is that one word, e.g. NOT a type written as both `card` and `cards`.
   */
  prepareRename(file: SP.SpellFile, position: Position): { range: Range; placeholder: string } | null {
    const subject = this.subjectAt(file, position)
    if (subject?.kind === "method") {
      const action = this.actionNamed(subject)
      const range = action && this.rangeOf(file, subject.nameMatch)
      return range ? { range, placeholder: action!.words } : null
    }
    const occurrences = subject && this.renamable(subject)
    const range = occurrences && subject && this.rangeOf(file, subject.nameMatch)
    return range ? { range, placeholder: subject!.nameMatch.raw! } : null
  }

  /**
   * Edits renaming the thing at `position` to `newName` wherever it's used, in every file -- see `prepareRename()`.
   * - `null` where it can't:  `renameSaying()` says why, for an action.
   */
  rename(file: SP.SpellFile, position: Position, newName: string): WorkspaceEdit | null {
    try {
      return this.renameSaying(file, position, newName)
    } catch (error) {
      if (error instanceof LSP.RenameError) return null
      throw error
    }
  }

  /**
   * `rename()`, but an action renamed as the Inspector renames it, saying why it can't (epic `editor` I111, I139, I147):
   * its calls and buttons too (`renameActionAt()`).
   * - What the app's editors ask, so F2 refuses in the Inspector's words.
   * - `null` where anything else can't be renamed `newName`.
   * - throws `LSP.RenameError` for an action that can't be:  `cause.kind` says why.
   */
  renameSaying(file: SP.SpellFile, position: Position, newName: string): WorkspaceEdit | null {
    const subject = this.subjectAt(file, position)
    if (subject?.kind === "method") return this.renameActionAt(file, position, newName)
    if (!SpellLanguageService.RENAMABLE_WORD.test(newName)) return null
    const occurrences = subject && this.renamable(subject)
    if (!occurrences) return null
    const changes: Record<string, TextEdit[]> = {}
    for (const { file: at, match } of occurrences) {
      const range = this.rangeOf(at, match)
      if (range) {
        // a declaration's quotes stay:  `its "score" is ...`
        const newText = match.tokens[0] instanceof P.TextToken ? `"${newName}"` : newName
        ;(changes[this.addresses.uriFor(at)] ??= []).push({ range, newText })
      }
    }
    return { changes }
  }

  /**
   * Edits renaming the action whose name is at `position` -- its head, `to "cheat"` -- to `newWords`, wherever it's named
   * (epic `editor` I111):  its head, each call (`cheat`, `if anything changed auto play`) and each button and menu row
   * (`<action "cheat"/>`), in every file of the project.
   * - Only an action of the program's own that takes nothing (`SP.ActionButton.actionsIn()`):
   *   one that takes something is called in its own words around what it takes, which a rename can't follow.
   * - Its head keeps its quotes, its title and its icon:  `to "peek" with shortcut "C", icon "eye"`.
   * - throws `LSP.RenameError` when it can't:  `cause.kind` says why, for the editor's message.
   */
  renameActionAt(file: SP.SpellFile, position: Position, newWords: string): WorkspaceEdit {
    const subject = this.subjectAt(file, position)
    const action = subject?.kind === "method" ? this.actionNamed(subject) : undefined
    if (!action)
      throw new LSP.RenameError("renameActionAt():  no action of the program's own here", {
        cause: { kind: "not-an-action" }
      })
    const words = newWords.trim().replace(/\s+/g, " ")
    const { project } = file
    const fail = (kind: LSP.RenameErrorCause["kind"], takenBy?: LSP.RenameErrorCause["takenBy"]) =>
      new LSP.RenameError(`renameActionAt():  can't rename "${action.words}" to "${words}" (${kind})`, {
        cause: { kind, words: action.words, ...(takenBy && { takenBy }) }
      })
    if (!words) throw fail("empty")
    if (!SpellLanguageService.ACTION_WORDS.test(words)) throw fail("not-words")
    // another action a button may name, or any other member of its type:  a property, an action that takes something
    const member = SpellLanguageService.typeOf(action.scope)?.getMember(words)
    if (member && member !== subject!.record && !sameWords(words, action.words))
      throw fail("taken", member instanceof P.ScopeVariable ? "property" : "action")
    const otherAction = SP.ActionButton.actionsIn(action.scope).some(
      (other) => sameWords(other.words, words) && !sameWords(other.words, action.words)
    )
    if (otherAction) throw fail("taken", "action")
    const changes: Record<string, TextEdit[]> = {}
    const change = (at: SP.SpellFile, range: Range | undefined, newText: string) => {
      if (range) (changes[this.addresses.uriFor(at)] ??= []).push({ range, newText })
    }
    // its head:  quoted or not, as written
    const head = subject!.nameMatch
    const headFile = this.fileOf(head)!
    change(headFile, this.rangeOf(headFile, head), head.tokens[0] instanceof P.TextToken ? `"${words}"` : words)
    // each call:  the whole statement, which is its words alone
    for (const { file: at, match } of this.occurrencesOf(subject!, false)) {
      const text = at.parseText.slice(match.start, match.end)
      if (!sameWords(text, action.words)) throw fail("calls-differ")
      change(at, this.rangeOf(at, match), words)
    }
    // each button and menu row naming it:  its quoted word
    for (const at of project?.spellFiles ?? []) {
      if (!at.match) continue
      SpellLanguageService.walk(at.match, (match) => {
        if (match.rule.name !== ACTION_BUTTON_RULE) return
        const element = match.tokens[0]
        const quoted = element instanceof P.JSXElementToken ? element.quotedWord?.value : undefined
        if (!(quoted instanceof P.TextToken) || !sameWords(quoted.innerText, action.words)) return
        if (quoted.start === undefined || quoted.end === undefined) return
        change(at, { start: this.positionAt(at, quoted.start), end: this.positionAt(at, quoted.end) }, `"${words}"`)
      })
    }
    return { changes }
  }

  /**
   * The action `subject` names, if it's one of the program's own that takes nothing:  its words as written, `cheat`,
   * and the scope its buttons are found in;  `undefined` for any other method.
   */
  private actionNamed(
    subject: Extract<LSP.SpellSubject, { kind: "method" }>
  ): { words: string; scope: P.Scope } | undefined {
    const { declaredBy } = subject.record
    if (!declaredBy) return undefined
    const name = subject.nameMatch.tokens[0]
    const words = name instanceof P.TextToken ? name.innerText : `${subject.nameMatch.raw ?? ""}`
    const scope = declaredBy.scope
    const action = SP.ActionButton.actionsIn(scope).find((it) => sameWords(it.words, words))
    return action ? { words: action.words, scope } : undefined
  }

  /**
   * The type `scope` is about:  the thing its method runs on, the subject of the body it's in (`solitaire is an app`),
   * else itself or the nearest type around it.
   */
  private static typeOf(scope: P.Scope): P.TypeScope | undefined {
    const about = P.MethodScope.thingTypeOf(scope) ?? P.SubjectScope.of(scope)?.subjectType
    if (about) return about
    for (let at: P.Scope | undefined = scope; at; at = at.parentScope) if (at instanceof P.TypeScope) return at
    return undefined
  }

  /** Words an action's name can be:  a letter first, then letters, digits, spaces, dashes and apostrophes. */
  static ACTION_WORDS = /^\p{L}[\p{L}\p{M}\d' -]*$/u

  /** Does `property` list its values, so its type holds them as an enumeration, e.g. `suits` for a card's `suit`? */
  private static hasValuesListed({ name, scope }: P.ScopeVariable): boolean {
    const plural = scope instanceof P.TypeScope ? scope.variables.get(P.pluralize(name)) : undefined
    return !!plural && "enumeration" in plural
  }

  /** A word a rename can produce:  what `identifier` / `type` / `constant` rules match. */
  static RENAMABLE_WORD = P.ALPHANUMERIC_WORD_WITH_DASHES

  /** Every occurrence of `subject`, declaration included, if they can ALL be renamed -- see `prepareRename()`. */
  private renamable(subject: LSP.SpellSubject): LSP.FileMatch[] | undefined {
    if (subject.kind === "method") return undefined
    // a property we can't place on its type, or a use we can't:  it might be some other type's, so NOT a guess
    if (subject.kind === "property" && !subject.record) return undefined
    // its values' phrases name it in their own words, e.g. `is a (suit)`:  those would be left behind
    if (subject.kind === "property" && SpellLanguageService.hasValuesListed(subject.record!)) return undefined
    if (subject.kind === "variable" && (subject.record.isAlias || subject.record.name === "it")) return undefined
    const word = subject.nameMatch.raw
    const occurrences = this.occurrencesOf(subject, true)
    const isSure = occurrences.every(({ unsure }) => !unsure)
    const allSame = occurrences.every(({ match }) => match.tokens.length === 1 && match.raw === word)
    return isSure && allSame ? occurrences : undefined
  }

  /**
   * What's at `position` that was declared somewhere -- see `subjectIn()`.
   * - `undefined` for keywords, literals, and names nothing declared.
   */
  subjectAt(file: SP.SpellFile, position: Position): LSP.SpellSubject | undefined {
    return this.subjectIn(file, this.matchesAt(file, position), this.offsetAt(file, position))
  }

  /**
   * Innermost thing in `stack` (outermost first) that was declared somewhere:
   * - a word resolved to a scope record while parsing:  `data.scopeVar` / `scopeType` / `scopeConstant`
   * - a property name
   * - a call to a method the project defines
   * - the name in a declaration itself, e.g. `card` in `a card is a thing`, if `offset` is on it
   */
  private subjectIn(file: SP.SpellFile, stack: P.Match[], offset: number): LSP.SpellSubject | undefined {
    const generated = this.generatedRules(file.project)
    for (let index = stack.length - 1; index >= 0; index--) {
      const match = stack[index]!
      const record = match.rule.highlightAs
        ? (this.recordOf(match) ?? SpellLanguageService.variableNamedBy(match, stack.slice(0, index)))
        : undefined
      if (record instanceof P.ScopeVariable) return { kind: "variable", record, nameMatch: match }
      if (record instanceof P.TypeScope) return { kind: "type", record, nameMatch: match }
      if (record instanceof P.ScopeConstant) return { kind: "constant", record, nameMatch: match }
      if (match.rule.highlightAs === "property") {
        const owner = this.ownerOf(match, [stack[index - 1], stack[index - 2]])
        return this.propertySubject(match, owner)
      }
      const scopeRule = generated.get(match.rule) ?? SpellLanguageService.importedRuleOf(match)
      if (scopeRule) return { kind: "method", record: scopeRule, nameMatch: match }

      const declaration = match.rule.getDeclaration(match)
      const { nameMatch } = declaration ?? {}
      if (!declaration || !nameMatch || nameMatch.start === undefined) continue
      if (offset < nameMatch.start || offset > nameMatch.end!) continue
      const subject = this.subjectDeclaredBy(match, declaration, generated)
      if (subject) return subject
    }
    return undefined
  }

  /**
   * The variable the word `match` MAKES for the body of a statement around it, if any:
   * `card` in `for card in the deck` (epic `language` I83).
   * - The loop looks its word up before it makes the variable, so the word's own lookup found nothing:
   *   the variable is in the scope the loop opens for its body, `declaredBy` the word.
   * - `ancestors`:  the matches around `match`, outermost first.
   */
  private static variableNamedBy(match: P.Match, ancestors: P.Match[]): P.ScopeVariable | undefined {
    for (let index = ancestors.length - 1; index >= 0; index--) {
      const statement = ancestors[index]!
      const scope = statement.nestedScope
      if (scope === statement.scope) continue
      const found = scope.variables?.get().find((it) => it.declaredBy === match)
      if (found) return found
    }
    return undefined
  }

  /**
   * The IMPORTED rule `match` is a call of, if any:  e.g. a built-in template's `turn it over`, loaded into the root
   * scope from its declarations (`SP.loadBuiltInTemplates()`), whose `declared` says where it came from.
   * - Each scope's rules are a list of its own, so this looks in each scope from `match.scope` up.
   */
  private static importedRuleOf(match: P.Match): P.ScopeRule | undefined {
    for (let scope: P.Scope | undefined = match.scope; scope; scope = scope.parentScope) {
      const found = scope.rules?.get().find((it) => it.declared && it.instance === match.rule)
      if (found) return found
    }
    return undefined
  }

  /** What `statement` declares as `declaration`, as a subject named where it's declared. */
  private subjectDeclaredBy(
    statement: P.Match,
    declaration: P.Declaration,
    generated: Map<P.Rule, P.ScopeRule>
  ): LSP.SpellSubject | undefined {
    const nameMatch = this.nameLeaf(declaration)
    const { scope } = statement
    if (declaration.kind === "variable") {
      const record = SpellLanguageService.visible(scope.variables).find((it) => declaredBy(it, statement))
      return record && { kind: "variable", record, nameMatch }
    }
    if (declaration.kind === "type") {
      const record = SpellLanguageService.visible(scope.types).find((it) => declaredBy(it, statement))
      return record && { kind: "type", record, nameMatch }
    }
    if (declaration.kind === "method" || declaration.kind === "function") {
      const record = [...generated.values()].find((it) => declaredBy(it, statement))
      return record && { kind: "method", record, nameMatch }
    }
    if (declaration.kind === "property") {
      return this.propertySubject(nameMatch, declaration.of ? scope.types?.get(declaration.of) : undefined)
    }
    return undefined
  }

  /** Subject for property `nameMatch`, used on `owner` if known -- with its record, if `owner` has one. */
  private propertySubject(nameMatch: P.Match, owner: P.TypeScope | undefined): LSP.SpellSubject {
    const name = `${nameMatch.value}`
    const record = SP.MemberReadExpression.propertyOf(owner, name)
    return { kind: "property", name, nameMatch, owner, record }
  }

  /**
   * Type the property `property` is used on, from the matches around it (`ancestors`, innermost first):
   * - any member read:  the type it noted while parsing (`SP.MemberReadExpression.memberRead()`),
   *   e.g. `the stock` in an action, which no `it` stands beside
   * - `its suit` in a method or getter:  the type its `it` stands for
   * - `the color of a card`:  the type named beside it
   * - `the suit of the card`:  the type of the variable beside it, if that's known
   * - `undefined` if nothing says, or the thing beside it has no known type.
   */
  private ownerOf(property: P.Match, ancestors: Array<P.Match | undefined>): P.TypeScope | undefined {
    for (const ancestor of ancestors) {
      if (!ancestor) continue
      const read = SP.MemberReadExpression.memberRead(ancestor)
      if (read?.property === property && read.type) return read.type
      const { itVar } = ancestor.data as { itVar?: unknown }
      if (itVar instanceof P.ScopeVariable) return this.typeOfVariable(itVar, property.scope)
      for (const child of ancestor.matched) {
        if (!(child instanceof P.Match) || child === property) continue
        const record = this.recordOf(child)
        if (record instanceof P.TypeScope) return record
        if (record instanceof P.ScopeVariable) return this.typeOfVariable(record, property.scope)
      }
    }
    return undefined
  }

  /**
   * Type of `variable`, looked up in `scope` -- see `P.Scope.getType()`.
   * - Its `datatype`, else the type a method's `it` / `this` stands for, e.g. `card` in `to turn (a card) over`.
   */
  private typeOfVariable(variable: P.ScopeVariable, scope: P.Scope): P.TypeScope | undefined {
    const { datatype, output } = variable
    const methodScope = variable.scope instanceof P.MethodScope ? variable.scope : undefined
    return scope.getType(datatype ?? (output === "this" ? methodScope?.thisVar : undefined))
  }

  /**
   * Where `subject` was declared, as the match naming it there:
   * - a scope record:  the name in its `declaredBy` statement, e.g. `className` in `set className to ...`,
   *   or an argument's name in its method's signature
   * - a property:  its record's declaration, or if we can't tell which type it's on,
   *   every statement declaring a property of that name, in any file
   * - nothing for built-ins, e.g. the `thing` type
   */
  declarationsOf(subject: LSP.SpellSubject): LSP.FileMatch[] {
    if (subject.kind === "property" && subject.record) {
      const { declaredBy } = subject.record
      const file = declaredBy && this.fileOf(declaredBy)
      const declaration = declaredBy?.rule.getDeclaration(declaredBy)
      return file && declaration ? [{ file, match: this.nameLeaf(declaration) }] : []
    }
    if (subject.kind === "property") {
      const name = SpellLanguageService.propertyKey(subject.name)
      return this.allDeclarations(subject.nameMatch).flatMap(({ file, declaration }) => {
        if (declaration.kind !== "property" || SpellLanguageService.propertyKey(declaration.name) !== name) return []
        return [{ file, match: this.nameLeaf(declaration) }]
      })
    }
    const { declaredBy, name } = subject.record
    const file = declaredBy && this.fileOf(declaredBy)
    if (!declaredBy || !file) return []
    const declaration = declaredBy.rule.getDeclaration(declaredBy)
    // a type's record is named as it compiles, `StockPile`, its declaration as it's written, `stock pile`
    const isType = subject.kind === "type" && declaration?.kind === "type"
    if (declaration && (subject.kind === "method" || isType || SpellLanguageService.sameName(declaration.name, name))) {
      return [{ file, match: subject.kind === "method" ? declaration.nameMatch : this.nameLeaf(declaration) }]
    }
    // e.g. an argument, declared inside its method's signature
    let named: P.Match | undefined
    SpellLanguageService.walk(declaredBy, (match) => {
      if (!named && match.rule.highlightAs && SpellLanguageService.sameName(`${match.raw}`, name)) named = match
    })
    return [{ file, match: named ?? declaredBy }]
  }

  /** Every use of `subject` in its project, and its declarations if `includeDeclaration` -- see `references()`. */
  private occurrencesOf(subject: LSP.SpellSubject, includeDeclaration: boolean): LSP.FileMatch[] {
    const project = this.fileOf(subject.nameMatch)?.project
    if (!project) return []
    const occurrences: LSP.FileMatch[] = includeDeclaration ? this.declarationsOf(subject) : []
    const seen = new Set(occurrences.map(({ match }) => match))
    for (const file of project.spellFiles) {
      if (!file.match) continue
      const parents = new Map<P.Match, P.Match | undefined>()
      SpellLanguageService.walk(file.match, (match, parent) => {
        parents.set(match, parent)
        if (seen.has(match)) return
        const isUse =
          subject.kind === "property"
            ? this.isPropertyUse(subject, match, [parent, parent && parents.get(parent)])
            : isOccurrence(match)
        if (!isUse) return
        seen.add(match)
        const unsure = subject.kind === "property" && !this.ownerOf(match, [parent, parent && parents.get(parent)])
        occurrences.push({ file, match, ...(unsure ? { unsure } : {}) })
      })
    }
    return occurrences

    /** Is `match` a use of `subject`, which isn't a property? */
    function isOccurrence(match: P.Match): boolean {
      if (subject.kind === "method") {
        const rule = SP.SpellStatement.statementRuleOf(match.rule)
        return rule === subject.record.instance || SpellLanguageService.isCallAheadOf(rule, subject.record.instance)
      }
      if (!match.rule.highlightAs) return false
      const { scopeVar, scopeType, scopeConstant } = match.data as Record<string, unknown>
      return (scopeVar ?? scopeType ?? scopeConstant) === (subject as { record?: unknown }).record
    }
  }

  /**
   * Is `rule` the call of `method` registered AHEAD of its definition (`MethodDefinition.callAhead()`)?
   * - A line above the definition is parsed with that rule, a rule of its own:
   *   `restart the game` in `when creating solitaire`, above `to "restart the game"` (epic `editor` I170).
   * - The same method:  the same name, on the same type.
   */
  private static isCallAheadOf(rule: P.Rule, method: P.Rule | undefined): boolean {
    type CallRule = P.Rule & { ahead?: boolean; methodName?: string; thisType?: unknown }
    const { ahead, methodName, thisType } = rule as CallRule
    const real = method as CallRule
    return !!ahead && !!methodName && methodName === real.methodName && thisType === real.thisType
  }

  /**
   * Is `match` a use of property `subject`?  It must have the same name, and then:
   * - if we know `subject`'s type and `match`'s owner, the owner must be that type or a sub-type,
   *   e.g. NOT `its name` in a method on a pile, for a card's `name`
   * - otherwise we can't tell, so yes
   */
  private isPropertyUse(
    subject: Extract<LSP.SpellSubject, { kind: "property" }>,
    match: P.Match,
    ancestors: Array<P.Match | undefined>
  ): boolean {
    if (match.rule.highlightAs !== "property") return false
    if (!SpellLanguageService.sameName(`${match.value}`, subject.name)) return false
    const type = subject.record?.scope
    if (!(type instanceof P.TypeScope)) return true
    const owner = this.ownerOf(match, ancestors)
    return !owner || owner.isA(type)
  }

  ////////////////
  // ## Custom requests
  ////////////////

  /**
   * `spell/bubbly`:  `file` in the BUBBLY LOOK, stretch by stretch, for VS Code's decorations (epic `language` P51).
   * - Laid out as the code editor lays it out (`SP.BubblyLayout`, in the file's own language, from its project's parse of it),
   *   and cut into the same stretches
   *   (`SP.BubblyStretches`).
   * - `[]` for a page file, which isn't drawn bubbly, and for a blank one.
   * - NEVER throws:  a layout that fails is `[]`, logged.
   */
  bubbly(file: SP.SpellFile): LSP.BubblyRange[] {
    const text = file.contents ?? ""
    if (!text.trim() || file.form === "page") return []
    try {
      const drawing = SP.BubblyLayout.of(text, file.language.parser, { within: file })
      return SP.BubblyStretches.of(drawing).map(({ start, end, ...stretch }) => ({
        range: { start: this.positionAt(file, start), end: this.positionAt(file, end) },
        ...stretch
      }))
    } catch (error) {
      console.error("SpellLanguageService.bubbly():  couldn't lay the code out", error)
      return []
    }
  }

  /**
   * `spell/compiled`:  the code `file` compiles to for `target`, javascript by default --
   * or a comment saying why it can't, in that language.
   * - Written by that target's writer (`SP.TARGETS`), as `spell compile --target` writes it.
   */
  compiled(file: SP.SpellFile, target: LSP.CompiledTarget = "js"): string {
    const { name, comment } = SpellLanguageService.COMPILED_TARGETS[target]
    if (!file.match) return `${comment} ${SP.SpellProject.sourceNameOf(file.path)} hasn't been parsed`
    const { writer } = SP.targetFor(name)
    return (
      SpellLanguageService.compileQuietly(file.match, writer) ??
      `${comment} ${SP.SpellProject.sourceNameOf(file.path)} couldn't be compiled to ${name}`
    )
  }

  /**
   * What each of `spell/compiled`'s short names stands for -- see `LSP.CompiledTarget`:
   * - `name`:  its target
   * - `comment`:  how its language starts a line comment
   */
  static COMPILED_TARGETS: Record<LSP.CompiledTarget, { name: string; comment: string }> = {
    js: { name: SP.RUNNING_TARGET, comment: "//" },
    ts: { name: "ts/solid", comment: "//" },
    py: { name: "py", comment: "#" }
  }

  /**
   * `spell/lineTree`:  the spell tree of line `line` (0-based) of `file`, as `<ui-tree-diagram>` draws it.
   * - `null` if no line parsed there, e.g. a blank line.
   * - From the file as last parsed, so unsaved edits show.
   */
  lineTree(file: SP.SpellFile, line: number): P.TreeNode | null {
    if (!file.match) return null
    const indent = file.parseText.split("\n")[line]?.match(/^[ \t]*/)?.[0].length ?? 0
    const ast = SP.BlockLine.lineAt(file.match, this.offsetAt(file, { line, character: indent }))?.AST
    return P.TreeWriter.treeOf(ast) ?? null
  }

  /** `spell/project`:  `file`'s project's spell files in parse order, with their error counts. */
  projectInfo(file: SP.SpellFile): LSP.ProjectInfo {
    const { project } = file
    return {
      project: project.projectId,
      files: project.spellFiles.map((it) => ({
        uri: this.addresses.uriFor(it),
        file: SP.SpellProject.sourceNameOf(it.path),
        errors: (it.match && SP.Block.getParseErrors(it.match)?.length) ?? 0
      })),
      problem: project.parseError,
      compiledUri: this.addresses.uriFor(project.outputFile),
      folderUri: this.addresses.uriFor(project),
      wordsUris: project.wordsFiles.map((it) => this.addresses.uriFor(it))
    }
  }

  ////////////////
  // ## Completion
  ////////////////

  /**
   * What could be typed at `position`:
   * - in a `<css>` block:  CSS, e.g. `color` for `col` -- see `LSP.SpellCSS`
   * - typing a JSX tag (`<chi`):  spell's own tags, e.g. `children`, `action`, then Spell UI's -- see `tagItems()`;
   *   each, and each attribute, written whole when chosen (`<action "|" />`, `color="|"`) -- see `LSP.CompletionShapes`
   * - inside a tag (`<button col`):  its attributes, each saying what it is;  in its quotes (`color="`), its words --
   *   see `attributeItems()`, `attributeValueItems()`
   * - in an action's quoted word (`<action "au`):  the program's actions, e.g. `auto play` -- see `actionItems()`
   * - mid-statement:  what can come NEXT, if the parser can say -- see `expectedNext()`
   * - otherwise, names visible there:  variables declared before it, types, constants
   * - at the start of a statement:  the first words of every kind of statement (`to`, `if`, `set`...),
   *   and calls to the project's own methods, as snippets
   * - mid-statement, if `expectedNext()` has nothing:  calls to methods usable as expressions
   * - A keyword with a written accent is offered with it, and found as typed without it:
   *   typing `esta` and accepting the suggestion writes `está` -- see `keywordItems()`.
   */
  completion(file: SP.SpellFile, position: Position): CompletionList {
    const offset = this.offsetAt(file, position)
    const text = file.parseText
    const cssList = this.css.completion(text, offset, position)
    if (cssList) return cssList
    if (!file.match) return { isIncomplete: false, items: [] }
    const lineText = text.slice(text.lastIndexOf("\n", offset - 1) + 1, offset)
    // a drawing's markup as it's typed:  the file's text now, which a parse may not have caught up with yet
    // (`<` alone parses as an error;  the editor asks the moment it's typed)
    const typedLine = file.contents?.split("\n")[position.line]?.slice(0, position.character) ?? lineText
    // inside a tag split over lines:  the tag's lines as one, so its attributes help on every line (epic `editor` I64)
    const typedTag = SpellLanguageService.openTagTyped(file, position) ?? typedLine
    // what's already written after the caret, so a tag or an attribute chosen is never written twice (I70)
    const afterCaret = file.contents?.split("\n")[position.line]?.slice(position.character) ?? ""
    const tagItems =
      this.tagItems(file, offset, typedLine, afterCaret) ??
      this.actionItems(file, offset, position, typedLine) ??
      this.attributeValueItems(file, offset, position, typedTag) ??
      this.soundItems(file, offset, position, typedLine) ??
      this.attributeItems(file, offset, typedTag, afterCaret)
    if (tagItems) return { isIncomplete: false, items: tagItems }
    const atStatementStart = /^\s*[\p{L}\p{M}\d_-]*$/u.test(lineText)
    if (!atStatementStart) {
      const expected = this.expectedNext(file, position)
      if (expected.items.length) return expected
    }
    const scope = this.scopeAt(file, offset)
    const items = [
      ...this.variableItems(file, scope, offset),
      ...this.typeItems(file, scope, offset),
      ...this.constantItems(file, scope, offset),
      ...this.methodItems(file, scope, offset, atStatementStart ? "statement" : "expression")
    ]
    if (atStatementStart && scope.parser) {
      const statement = LSP.LspTexts.for(file.language).text("statement")
      items.push(...this.keywordItems(file, this.statementWords(scope.parser, file.project), statement))
    }
    return { isIncomplete: false, items }
  }

  /**
   * Completions for keywords `words`, each with `detail`, e.g. `if` or `si`:
   * - A word with a written accent is offered WITH it, found by the word without it,
   *   so `esta` and `está` are ONE suggestion, `está`, which typing `esta` finds first.
   *   SEE:  `LSP.SpellKeywords.completionSpelling()`.
   * - Why:  the editor accepts the suggestion on Enter, so `esta` must find `está` above a longer name like `estado`
   *   (epic `spanish` I7).
   */
  private keywordItems(file: SP.SpellFile, words: Iterable<string>, detail: string): CompletionItem[] {
    const keywords = LSP.SpellKeywords.of(file.language)
    const items = new Map<string, CompletionItem>()
    const offered = new Set(words)
    for (const word of offered) {
      const spelling = keywords.completionSpelling(word, offered)
      if (!items.has(spelling.label))
        items.set(spelling.label, { ...spelling, kind: CompletionItemKind.Keyword, detail })
    }
    return [...items.values()]
  }

  /**
   * Spell's own JSX tags, in the file's language, while one is being typed at the end of `lineText` --
   * `undefined` if no tag is (`SP.spellTagsIn()`).
   * - e.g. for `return <div><chi`:  `children`, spell's word for the web's `<slot>`;
   *   `action`, `context-menu` and `divider` (epic `language` P53).
   * - Spanish's for a Spanish file:  `hijos`, `acción`, `menú-contextual`, `divisor`.
   * - The web's own tags aren't offered.
   * - A tag is a `<` right before a word:  `x < y` isn't one.
   * - Each is written whole when chosen, the caret where you type next, unless `afterCaret` already goes on:
   *   `<action "|" />`, `<content>` ... -- see `LSP.CompletionShapes` (epic `editor` I70).
   */
  private tagItems(
    file: SP.SpellFile,
    offset: number,
    lineText: string,
    afterCaret: string
  ): CompletionItem[] | undefined {
    if (!JSX_TAG_TYPED.test(lineText)) return undefined
    const scope = this.scopeAt(file, offset)
    const texts = LSP.LspTexts.of(scope)
    const own: CompletionItem[] = SP.spellTagsIn(scope).map(({ tag, meaning }) => ({
      label: tag,
      kind: CompletionItemKind.Keyword,
      detail: texts.text(SPELL_TAG_DETAILS[meaning] ?? "spellWordFor", { tag: meaning }),
      sortText: `0${tag}`,
      ...LSP.CompletionShapes.spellTag(tag, meaning, afterCaret)
    }))
    const components = (SpellLanguageService.componentHelpAt(scope)?.tags ?? [])
      // a word spell has for its own (`action`, `acción`) is spell's, accented or not
      .filter(({ tag }) => !own.some((item) => withoutAccents(item.label) === withoutAccents(tag)))
      .map((help) => ({
        label: help.tag,
        kind: CompletionItemKind.Class,
        detail: texts.text("componentTag"),
        sortText: `1${help.tag}`,
        ...(help.description && {
          labelDetails: { description: help.description },
          documentation: this.markdown(help.description)
        }),
        ...LSP.CompletionShapes.componentTag(scope, help, afterCaret)
      }))
    return [...own, ...components]
  }

  /**
   * The attributes of the component whose tag is open at the end of `lineText`, as one is typed:
   * `<button col` => `color`, `fluid` ... each with what it is -- `undefined` if no tag is open there.
   * - Spell UI's, in the file's language (`SP.ComponentPacks.help()`):  `<botón tam` => `tamano`.
   * - Not inside a quoted value or a `{...}`.
   * - Each is written whole when chosen, unless `afterCaret` has its `=` already:  `color="|"`, its words listed at
   *   once;  `fluid` alone -- see `LSP.CompletionShapes` (epic `editor` I70).
   */
  private attributeItems(
    file: SP.SpellFile,
    offset: number,
    lineText: string,
    afterCaret: string
  ): CompletionItem[] | undefined {
    const typing = ATTRIBUTE_TYPED.exec(lineText)
    if (!typing || isInQuotesOrBraces(typing[2] ?? "")) return undefined
    const scope = this.scopeAt(file, offset)
    if (SpellLanguageService.isOwnView(scope, typing[1]!)) return undefined
    const attributes = SpellLanguageService.componentHelpAt(scope)?.attributesOf(typing[1]!)
    if (!attributes) return undefined
    const texts = LSP.LspTexts.of(scope)
    return attributes.map((help) => {
      const { name, description, values } = help
      const takes = values.length ? values.map((it) => `\`${it}\``).join(" · ") : undefined
      const docs = [description, takes].filter(Boolean).join("\n\n")
      return {
        label: name,
        kind: CompletionItemKind.Property,
        detail: texts.text("attributeOf", { tag: typing[1]! }),
        ...(description && { labelDetails: { description } }),
        ...(docs && { documentation: this.markdown(docs) }),
        ...LSP.CompletionShapes.attribute(help, afterCaret, this.picksValues)
      }
    })
  }

  /**
   * Spell's built-in sounds, as one's name is typed in quotes after `play`, `stop` or `load` (epic `mockup` P28):
   * `play "card s` => `card slide`, `card shove` ... -- `undefined` anywhere else.
   * - The words are the file's language's, read off its rules (`play_sound`, `stop_sound`, `load_sound`):
   *   `reproducir "` too, its names Spanish (`deslizar carta`);  either language's name plays the sound.
   * - First, in the app's code editor, "Pick a sound…":  it opens the sound picker at the caret, to listen first
   *   (`PICK_VALUE_COMMAND`;  the editor says it runs it, `picksValues`).
   * - Each replaces what's typed inside the quotes.
   */
  private soundItems(
    file: SP.SpellFile,
    offset: number,
    position: Position,
    lineText: string
  ): CompletionItem[] | undefined {
    const typing = SOUND_NAME_TYPED.exec(lineText)
    if (!typing) return undefined
    const [, verb, typed] = typing as unknown as [string, string, string]
    const scope = this.scopeAt(file, offset)
    const parser = scope.parser
    if (!parser) return undefined
    const verbs = SOUND_RULES.flatMap((name) => {
      const rule = parser.rules[name]
      return rule ? SpellLanguageService.firstWords(rule, { parser }) : []
    })
    if (!verbs.some((word) => word.toLowerCase() === verb.toLowerCase())) return undefined
    const spanish = file.language.lang === "es"
    const names = BuiltInSounds.all.map((sound) => (spanish ? sound.es : sound.name))
    const range = { start: { line: position.line, character: position.character - typed.length }, end: position }
    const texts = LSP.LspTexts.of(scope)
    const items: CompletionItem[] = BuiltInSounds.all.map((sound, order) => ({
      label: names[order]!,
      kind: CompletionItemKind.Value,
      detail: texts.text("builtInSound"),
      sortText: String(order + 1).padStart(3, "0"),
      textEdit: { range, newText: names[order]! }
    }))
    if (!this.picksValues) return items
    const pick: CompletionItem = {
      label: texts.text("pickSound"),
      kind: CompletionItemKind.Event,
      sortText: "000",
      filterText: typed,
      preselect: true,
      insertText: typed,
      textEdit: { range, newText: typed },
      command: { title: "", command: PICK_VALUE_COMMAND, arguments: [{ kind: "sound" }, names] }
    }
    return [pick, ...items]
  }

  /**
   * The words the attribute whose quoted value `position` is in takes:  `spacing="x|s"` => `spacing`, `none`, `xs` ...
   * - For the app's choices shown beside a value the caret rests in (epic `editor` T70).
   * - `undefined` anywhere else, or for an attribute that takes any words.
   * - Read from the file's text now, as `completion()` reads a typed tag, and its parse's scope for the component.
   */
  attributeValuesAt(file: SP.SpellFile, position: Position): LSP.AttributeValues | undefined {
    if (!file.match) return undefined
    const typedTag = SpellLanguageService.openTagTyped(file, position)
    const typing = typedTag && ATTRIBUTE_VALUE_TYPED.exec(typedTag)
    if (!typing) return undefined
    const [, tag, attribute] = typing as unknown as [string, string, string, string]
    const spec = SpellLanguageService.componentHelpAt(this.scopeAt(file, this.offsetAt(file, position)))
      ?.attributesOf(tag)
      ?.find((it) => it.name === attribute)
    return spec?.values.length ? { tag, attribute, values: spec.values } : undefined
  }

  /**
   * The words an attribute takes, as its quoted value is typed at the end of `lineText`:
   * `<button color="pr` => `primary`, `red` ... -- `undefined` if no attribute's value is being typed there.
   * - Each replaces what's typed inside the quotes.
   */
  private attributeValueItems(
    file: SP.SpellFile,
    offset: number,
    position: Position,
    lineText: string
  ): CompletionItem[] | undefined {
    const typing = ATTRIBUTE_VALUE_TYPED.exec(lineText)
    if (!typing) return undefined
    const [, tag, attribute, typed] = typing as unknown as [string, string, string, string]
    const scope = this.scopeAt(file, offset)
    const spec = SpellLanguageService.componentHelpAt(scope)
      ?.attributesOf(tag)
      ?.find((it) => it.name === attribute)
    if (!spec) return undefined
    const picker = this.picksValues ? spec.picker : undefined
    if (!spec.values.length && !picker) return undefined
    const word = /[^\s"]*$/.exec(typed)![0]
    const range = { start: { line: position.line, character: position.character - word.length }, end: position }
    const words: CompletionItem[] = spec.values.map((value, order) => ({
      label: value,
      kind: CompletionItemKind.EnumMember,
      detail: attribute,
      sortText: String(order + 1).padStart(3, "0"),
      textEdit: { range, newText: value }
    }))
    if (!picker) return words
    // first, whatever is typed:  it writes nothing itself, and opens the picker (epic `editor` T61)
    const texts = LSP.LspTexts.of(scope)
    const pick: CompletionItem = {
      label: texts.text(picker.kind === "color" ? "pickColor" : "pickIcon"),
      kind: picker.kind === "color" ? CompletionItemKind.Color : CompletionItemKind.Event,
      sortText: "000",
      filterText: word,
      preselect: true,
      // writes back what's typed:  the app's editor writes `insertText` (else the label), an LSP client the `textEdit`
      insertText: word,
      textEdit: { range, newText: word },
      command: { title: "", command: PICK_VALUE_COMMAND, arguments: [picker, spec.values] }
    }
    return [pick, ...words]
  }

  /**
   * What's typed of the tag open at `position`, its lines as one:  `<button` then `\tcol` => `<button \tcol`.
   * - The file's text now, as `completion()` reads a typed line:  a parse may not have caught up with it.
   * - `undefined` when no tag is open there -- see `openTagBefore()`.
   */
  private static openTagTyped(file: SP.SpellFile, position: Position): string | undefined {
    const lines = (file.contents ?? file.parseText).split("\n")
    const offset = lines.slice(0, position.line).reduce((sum, line) => sum + line.length + 1, 0) + position.character
    return openTagBefore(lines.join("\n"), offset)
  }

  /** Does `tag` name one of the program's own types (`<card>` in Solitaire), not a pack's component? */
  private static isOwnView(scope: P.Scope, tag: string): boolean {
    return !!SpellLanguageService.ownViewOf(scope, tag)
  }

  /** The program's own type `tag` draws (`<stock-pile>` => `stock pile`), if it names one, not a pack's component. */
  private static ownViewOf(scope: P.Scope, tag: string): P.TypeScope | undefined {
    return scope.getType(SP.typeName(tag))
  }

  /** What the components a drawing in `scope` names are, in its language;  `undefined` while none can say. */
  private static componentHelpAt(scope: P.Scope): SP.ComponentHelp | undefined {
    const packs = (scope.parser as SP.SpellParser | undefined)?.packs
    return SP.ComponentPacks.help(SP.Language.of(scope).lang, packs ?? SP.ComponentPacks.DEFAULT)
  }

  /**
   * The program's actions, while an `<action "...">`'s quoted word is being typed at the end of `lineText`:
   * `auto play`, `deal the cards` ... -- `undefined` if no action's word is (epic `language` P53).
   * - Its tag in the file's language:  `<acción "jugar solo" />` in a Spanish file.
   * - The drawing's own type's first, then the app's `undo` and `redo`, then every other type's
   *   (`SP.ActionButton.actionsIn()`).
   * - Each replaces what's typed inside the quotes, so a word of several words is found as it's typed.
   */
  private actionItems(
    file: SP.SpellFile,
    offset: number,
    position: Position,
    lineText: string
  ): CompletionItem[] | undefined {
    const typing = ACTION_WORD_TYPED.exec(lineText)
    if (!typing) return undefined
    const [, tag, typed] = typing as unknown as [string, string, string]
    const scope = this.scopeAt(file, offset)
    if (!SP.spellTagsIn(scope).some((it) => it.tag === tag && it.meaning === ACTION_TAG)) return undefined
    const texts = LSP.LspTexts.of(scope)
    const range = { start: { line: position.line, character: position.character - typed.length }, end: position }
    return SP.ActionButton.actionsIn(scope).map(({ words, kind, of }, order) => ({
      label: words,
      kind: CompletionItemKind.Method,
      detail: kind === "app" ? texts.text("appAction") : texts.text("actionOf", { type: of ?? "" }),
      sortText: `${ACTION_KINDS.indexOf(kind)}${String(order).padStart(3, "0")}`,
      filterText: words,
      textEdit: { range, newText: words }
    }))
  }

  /**
   * What can come NEXT in the statement being typed at `position`, e.g. `to` after `set x`.
   * - `[]` if nothing is typed yet, or the parser can't say.
   * - Parses the line up to the cursor in expecting mode -- see `P.Parser.expectedAfter()`.
   *   A word the cursor is touching is still being typed:  it's what the editor filters by, NOT input.
   * - Each expectation offers:
   *   - partway through a call to one of the project's methods:  the REST of it, as a snippet -- see `methodTail()`
   *   - the names that fit it, by the `highlightAs` of the rules it can start with -- see `firstKinds()`:
   *     `{type}` => types, `{expression}` => variables, constants, methods...
   *   - the words it can start with, e.g. `to`, or `the` / `a` / `its`... for an `{expression}`
   * - What only EXTENDS something complete (`continues`), e.g. an operator after `x`,
   *   only if the word being typed starts it:  `if x a` => `and`, but `if x ` offers no operators.
   *   - So with no word typed yet, a list that left any out is INCOMPLETE:
   *     the editor asks again as the word is typed, and `si e` finds `está`, not only names like `estado`.
   * - Ranked by `sortText`:  what's needed before what continues, shallower before deeper,
   *   then snippet, names, words.
   */
  expectedNext(file: SP.SpellFile, position: Position): CompletionList {
    const list: CompletionList = { isIncomplete: false, items: [] }
    if (!file.match) return list
    const offset = this.offsetAt(file, position)
    const text = file.parseText
    const beforeCursor = text.slice(text.lastIndexOf("\n", offset - 1) + 1, offset)
    const typed = /[\p{L}\p{M}\d_-]*$/u.exec(beforeCursor)![0]
    const input = beforeCursor.slice(0, beforeCursor.length - typed.length).trim()
    const scope = this.scopeAt(file, offset)
    if (!input || !scope.parser) return list

    const items = new Map<string, CompletionItem>()
    const startsWithTyped = (item: CompletionItem) => [item.label, item.filterText].some((it) => it?.startsWith(typed))
    for (const expectation of scope.parser.expectedAfter(input, "statement", scope)) {
      // partway through something, not what's next -- see `signatureHelp()`
      if (expectation.within) continue
      const rank = `${expectation.continues ? 1 : 0}${String(expectation.depth).padStart(2, "0")}`
      for (const [order, item] of this.expectedItems(expectation, file, scope, offset)) {
        if (expectation.continues && !typed) list.isIncomplete = true
        if (expectation.continues && (!typed || !startsWithTyped(item))) continue
        const key = `${item.kind}:${item.label}`
        if (!items.has(key)) items.set(key, { ...item, sortText: `${rank}${order}:${item.label}` })
      }
    }
    list.items = [...items.values()]
    return list
  }

  /**
   * Completions for one `expectation`, each with its order within it:  `0` snippet, `1` names, `2` words.
   * - see `expectedNext()`
   */
  private expectedItems(
    { rule, sequence, index }: P.Expectation,
    file: SP.SpellFile,
    scope: P.Scope,
    offset: number
  ): Array<[order: number, item: CompletionItem]> {
    const parser = scope.parser!
    const items: Array<[number, CompletionItem]> = []
    const tail = sequence && index !== undefined ? this.methodTail(file.project, parser, sequence, index) : undefined
    if (tail) items.push([0, tail])
    for (const kind of SpellLanguageService.firstKinds(rule, parser)) {
      const names =
        kind === "type"
          ? this.typeItems(file, scope, offset)
          : kind === "variable"
            ? this.variableItems(file, scope, offset)
            : kind === "enumMember"
              ? this.constantItems(file, scope, offset)
              : kind === "property"
                ? this.propertyItems(scope)
                : this.methodItems(file, scope, offset, "expression")
      // in an action, its thing's properties first:  they're what `the ` reads there (epic `language`, P5)
      const thing = kind === "property" ? P.MethodScope.thingTypeOf(scope) : undefined
      const own = thing && SpellLanguageService.propertiesOf(thing, { inherited: true })
      const isOwn = (name: CompletionItem) =>
        own?.some((property) => SpellLanguageService.memberWords(property.name, property) === name.label)
      for (const name of names) items.push([isOwn(name) ? 0 : 1, name])
    }
    // Words from categories too, e.g. `{expression}` => `the`, `a`, `its`... -- NOT `Card` when there's `card`
    const words = new Set(SpellLanguageService.firstWords(rule, { parser, followGroups: true }))
    const lowerCase = [...words].filter((word) => word === word.toLowerCase() || !words.has(word.toLowerCase()))
    const next = LSP.LspTexts.for(file.language).text("next")
    for (const item of this.keywordItems(file, lowerCase, next)) items.push([2, item])
    return items
  }

  /**
   * The rest of a call to one of `project`'s methods, from child `index` of its call rule `sequence`, as a
   * snippet, e.g. `to ${1:pile}` after `move the card` for `to move (a card) to (a pile)`.
   * - `undefined` if `sequence` isn't a method's call rule.
   * - Leaves out optional parts;  placeholders are named for the method's parameters -- see `slotNames()`.
   */
  private methodTail(
    project: SP.SpellProject,
    parser: P.Parser,
    sequence: P.Sequence,
    index: number
  ): CompletionItem | undefined {
    const scopeRule = this.generatedRules(project).get(sequence)
    const declaration = scopeRule?.declaredBy?.rule.getDeclaration(scopeRule.declaredBy)
    if (!scopeRule || !declaration) return undefined
    const argNames = SpellLanguageService.slotNames(sequence, SpellLanguageService.methodOf(scopeRule))
    let argIndex = sequence.rules.slice(0, index).filter((rule) => rule instanceof P.Subrule).length
    const label: string[] = []
    const snippet: string[] = []
    let placeholder = 0
    for (const rule of sequence.rules.slice(index)) {
      if (rule.optional) continue
      if (rule instanceof P.Subrule) {
        const name = argNames[argIndex++] ?? rule.matchGroup ?? rule.rule
        label.push(`(${name})`)
        snippet.push(`\${${++placeholder}:${name}}`)
      } else {
        const word = SpellLanguageService.firstWords(rule, { parser })[0] ?? rule.toRulexSyntax()
        label.push(word)
        snippet.push(word.replace(/[$}\\]/g, "\\$&"))
      }
    }
    if (!snippet.length) return undefined
    return {
      label: label.join(" "),
      kind: declaration.kind === "method" ? CompletionItemKind.Method : CompletionItemKind.Function,
      detail: declaration.name,
      documentation: this.markdown(this.docsOfRecord(scopeRule, true)),
      insertText: snippet.join(" "),
      insertTextFormat: InsertTextFormat.Snippet
    }
  }

  ////////////////
  // ## Signature help
  ////////////////

  /**
   * The call to one of the project's methods being typed at `position`, e.g. `move (a card) to (a pile)`, with
   * the argument being typed -- or next -- as `activeParameter`.  `null` if not in one.
   * - Parses the line up to the cursor in expecting mode, as `expectedNext()` does, then takes the INNERMOST
   *   method call rule anything was waiting in:  what comes next in it, or what we're partway `within`.
   * - Its arguments are the call rule's `{subrules}`, in order:
   *   the signature's arguments, `(a card)` or paren-free `a card`, where its `method_signature` found them.
   *   See `argRanges()`.
   */
  signatureHelp(file: SP.SpellFile, position: Position): SignatureHelp | null {
    if (!file.match) return null
    const offset = this.offsetAt(file, position)
    const text = file.parseText
    const input = text.slice(text.lastIndexOf("\n", offset - 1) + 1, offset).trim()
    const scope = this.scopeAt(file, offset)
    if (!input || !scope.parser) return null

    const generated = this.generatedRules(file.project)
    let call: P.Expectation | undefined
    for (const expectation of scope.parser.expectedAfter(input, "statement", scope)) {
      const { sequence, continues, depth } = expectation
      if (continues || !sequence || !generated.has(sequence)) continue
      if (!call || depth > call.depth) call = expectation
    }
    const scopeRule = call && generated.get(call.sequence!)
    const declaration = scopeRule?.declaredBy?.rule.getDeclaration(scopeRule.declaredBy)
    if (!call || !scopeRule || !declaration) return null

    const label = declaration.name
    const parameters: ParameterInformation[] = SpellLanguageService.argRanges(label, declaration.nameMatch).map(
      (range) => ({ label: range })
    )
    // args before `index`:  the one we're in, or the next one after a word like `to`
    const activeParameter = call.sequence!.rules.slice(0, call.index).filter((rule) => rule instanceof P.Subrule).length
    return {
      signatures: [{ label, documentation: this.markdown(this.docsOfRecord(scopeRule, true)), parameters }],
      activeSignature: 0,
      activeParameter: Math.min(activeParameter, Math.max(parameters.length - 1, 0))
    }
  }

  /**
   * Where each argument is in `label`, a method's signature as written,
   * e.g. `[5, 11]` for `a card` in `move a card to a pile`.
   * - In order, as its `method_signature` match (`signature`) found them:  `(a card)` or `a card`.
   * - NOT a `(with ...)` clause:  its call takes it as an optional extra.
   */
  static argRanges(label: string, signature: P.Match | undefined): Array<[number, number]> {
    const args = (signature?.data as { argMatches?: P.Match[] } | undefined)?.argMatches ?? []
    const ranges: Array<[number, number]> = []
    let from = 0
    for (const arg of args) {
      const text = arg.inputText.trim()
      const start = label.indexOf(text, from)
      if (start === -1) continue
      ranges.push([start, start + text.length])
      from = start + text.length
    }
    return ranges
  }

  ////////////////
  // ## Code actions
  ////////////////

  /**
   * Quick fixes for `range` of `file`:  for each WHOLE line in it that didn't parse, "Define `to <phrase>`" --
   * a method whose signature is the line's words, so the line becomes a call to it.
   * - The phrase is the whole line -- or, for words left over after a statement that parsed,
   *   that statement AND its leftovers,
   *   e.g. `shuffle the deck 3 times`, where `shuffle the deck` parsed => `to shuffle a deck (number) times`.
   *   Once defined, the line parses as the new method:  it matches every word, and the longest match wins.
   * - NOT for a line that's just unfinished, e.g. `set x to` -- see `isUnfinished()`.
   * - Goes just above the top-level statement the line is in, as a method is only visible to lines AFTER it.
   * - See `methodSignatureFor()` for how the words become a signature.
   * - And "Make it code" / "Make it text" on the attribute value the caret is in (`codeOrText()`, epic `editor` T74).
   * - And a fix for each of Spell's old forms on the lines, "Change "parts" to "slots"", "Move the note below" ...,
   *   and "Upgrade this file", every one in it at once (`oldFormsFixed()`, epic `language` P68).
   * - And "Change to ..." on a read of a place's field marked gone, to its likely new name (`placeFieldsRenamed()`,
   *   epic `language` P68).
   */
  codeActions(file: SP.SpellFile, range: Range): CodeAction[] {
    if (!file.match) return []
    const text = file.parseText
    const from = this.offsetAt(file, range.start)
    const to = this.offsetAt(file, range.end)
    const actions: CodeAction[] = []
    for (const error of SP.Block.getParseErrors(file.match) ?? []) {
      const { start, end } = error
      if (start === undefined || end === undefined || end < from || start > to) continue
      const lineStart = text.lastIndexOf("\n", start - 1) + 1
      const scope = this.scopeAt(file, start)
      // after a statement that parsed, from its start -- else only a WHOLE line
      const before = this.statementBefore(file, start)
      if (!before && text.slice(lineStart, start).trim()) continue
      const phraseStart = before?.start ?? start
      const words = text.slice(phraseStart, end)
      if (this.isUnfinished(words, scope)) continue
      const signature = this.methodSignatureFor(words, scope)
      const at = this.topLevelLineStart(file, start)
      const diagnostic = this.diagnostics(file).find(
        (it) => it.severity === DiagnosticSeverity.Error && this.offsetAt(file, it.range.start) === start
      )
      if (!signature || at === undefined) continue
      const newText = `${signature}:\n\t// TODO\n\n`
      const position = this.positionAt(file, at)
      actions.push({
        title: LSP.LspTexts.of(scope).text("define", { signature }),
        kind: CodeActionKind.QuickFix,
        diagnostics: diagnostic ? [diagnostic] : undefined,
        isPreferred: true,
        edit: { changes: { [this.addresses.uriFor(file)]: [{ range: { start: position, end: position }, newText }] } }
      })
    }
    const switched = this.codeOrText(file, from)
    if (switched) actions.push(switched)
    actions.push(...this.oldFormsFixed(file, from, to))
    actions.push(...this.placeFieldsRenamed(file, from, to))
    return actions
  }

  /**
   * A fix for each of Spell's old forms on the lines `from` ... `to`, then "Upgrade this file" (epic `language` P68):
   * - "Change "parts" to "slots"", "Take out "wait for"", "Move the note below ..." -- each the quick fix for the
   *   warning (or, once Spell drops it, the error) it noted, its diagnostic attached, and PREFERRED:
   *   the editor's "Fix it" button and VS Code's quick-fix key apply it (Owen's C3).
   * - "Upgrade this file to Spell 0.9":  every old form in the file at once, when there are any.
   * - The edits are `SP.OldForms`', the same `spell lint --fix` and `spell upgrade` make.
   */
  private oldFormsFixed(file: SP.SpellFile, from: number, to: number): CodeAction[] {
    const uses = SP.OldForms.uses(file)
    if (!uses.length) return []
    const text = file.parseText
    const lineStart = text.lastIndexOf("\n", from - 1) + 1
    const lineEnd = text.indexOf("\n", to) < 0 ? text.length : text.indexOf("\n", to)
    const actions = uses
      .filter((use) => use.end >= lineStart && use.start <= lineEnd)
      .map((use): CodeAction => {
        const diagnostic = this.diagnostics(file).find(
          (it) => it.severity !== DiagnosticSeverity.Information && this.offsetAt(file, it.range.start) === use.start
        )
        return {
          title: this.oldFormFixTitle(file, use),
          kind: CodeActionKind.QuickFix,
          diagnostics: diagnostic ? [diagnostic] : undefined,
          isPreferred: true,
          edit: this.oldFormsEdit(file, [use])
        }
      })
    if (!actions.length) return []
    const version = SP.OldForms.shortVersion(SP.SPELL_VERSION)
    actions.push({
      title: LSP.LspTexts.of(this.scopeAt(file, from)).text("upgradeFile", { version }),
      kind: CodeActionKind.QuickFix,
      edit: this.oldFormsEdit(file, uses)
    })
    return actions
  }

  /**
   * The fix for the old form at `position` in `file`, if one is written there:  its title and its edit.
   * - What the language server's hover offers as its "Fix it" link, in VS Code (Owen's C3).
   * - `null` where there's none.
   */
  oldFormFixAt(file: SP.SpellFile, position: Position): { title: string; edit: WorkspaceEdit } | null {
    const offset = this.offsetAt(file, position)
    const use = SP.OldForms.uses(file).find((it) => it.start <= offset && offset <= it.end)
    return use ? { title: this.oldFormFixTitle(file, use), edit: this.oldFormsEdit(file, [use]) } : null
  }

  /** What the fix for `use`, an old form in `file`, is called:  `Change "parts" to "slots"`. */
  private oldFormFixTitle(file: SP.SpellFile, use: SP.OldFormUse): string {
    const texts = LSP.LspTexts.of(this.scopeAt(file, use.start))
    if (use.form.id === "line-end-comment") return texts.text("moveLineEndNote")
    const replacement = use.edits[0]?.newText
    return replacement
      ? texts.text("changeOldForm", { written: use.written.trim(), replacement })
      : texts.text("takeOutOldForm", { written: use.written.trim() })
  }

  /** The edit rewriting `uses`, old forms in `file`, the new way. */
  private oldFormsEdit(file: SP.SpellFile, uses: readonly SP.OldFormUse[]): WorkspaceEdit {
    const edits = uses.flatMap((use) =>
      use.edits.map(({ start, end, newText }) => ({
        range: { start: this.positionAt(file, start), end: this.positionAt(file, end) },
        newText
      }))
    )
    return { changes: { [this.addresses.uriFor(file)]: edits } }
  }

  /**
   * "Change to "owner"" on each read of a place's field marked gone, on the lines `from` ... `to`,
   * when the same look found its likely new name (`SP.PlaceFieldMarks`, epic `language` P68, Q82).
   * - A quick fix for the warning the read noted, its diagnostic attached.
   * - Keeps the read's quotes:  `the "user" of the job` => `the "owner" of the job`.
   */
  private placeFieldsRenamed(file: SP.SpellFile, from: number, to: number): CodeAction[] {
    const text = file.parseText
    const lineStart = text.lastIndexOf("\n", from - 1) + 1
    const lineEnd = text.indexOf("\n", to) < 0 ? text.length : text.indexOf("\n", to)
    return SP.SpellWarnings.in(file.match!).flatMap(({ at }): CodeAction[] => {
      const name = SP.PlaceFieldMarks.renameAt(at)
      const { start, end } = at
      if (!name || start === undefined || end === undefined || end < lineStart || start > lineEnd) return []
      const range = this.rangeOf(file, at)!
      const newText = text.startsWith('"', start) ? `"${name}"` : name
      const diagnostic = this.diagnostics(file).find(
        (it) => it.severity === DiagnosticSeverity.Warning && this.offsetAt(file, it.range.start) === start
      )
      return [
        {
          title: LSP.LspTexts.of(at.scope).text("changeToNewField", { name }),
          kind: CodeActionKind.QuickFix,
          diagnostics: diagnostic ? [diagnostic] : undefined,
          isPreferred: true,
          edit: { changes: { [this.addresses.uriFor(file)]: [{ range, newText }] } }
        }
      ]
    })
  }

  /**
   * "Make it code" on a drawing's attribute value the caret is in, `color="blue"` => `color={blue}`;
   * "Make it text" on code, back (epic `editor` T74):  in the right-click menu's Refactor and the light bulb.
   * - `undefined` outside a value, or for one whose words can't switch (`LSP.CodeOrText.switched()`).
   */
  private codeOrText(file: SP.SpellFile, offset: number): CodeAction | undefined {
    const text = file.parseText
    const value = LSP.CodeOrText.valueAt(text, offset)
    const newText = value && LSP.CodeOrText.switched(text, value)
    if (!value || newText === undefined) return undefined
    const range = { start: this.positionAt(file, value.start), end: this.positionAt(file, value.end) }
    return {
      title: LSP.LspTexts.of(this.scopeAt(file, offset)).text(value.kind === "text" ? "makeItCode" : "makeItText"),
      kind: CodeActionKind.RefactorRewrite,
      edit: { changes: { [this.addresses.uriFor(file)]: [{ range, newText }] } }
    }
  }

  /**
   * Method signature a line of `words` would call, e.g. `shuffle the deck twice` => `to shuffle a deck twice`.
   * - The first word stays a word:  it's the method's name.
   * - After that, the LONGEST run of words that parses as a whole expression in `scope` becomes a parameter:
   *   - a type's name, e.g. `the deck` if there's a type `deck` => `a deck`;  or what it is, if a type:
   *     `the deck of solitaire` => `a deck`
   *     paren-free:  a known type after `a` is a parameter -- see spell's `bare_type_arg`
   *   - a number => `(number)`, text => `(text)`
   *   - otherwise its last word => `(deck)`, numbered if it's already taken -- a type's name too, the second time
   * - `undefined` if there are no words, or `scope` has no parser.
   */
  private methodSignatureFor(words: string, scope: P.Scope): string | undefined {
    const parser = scope.parser
    const tokens = parser?.tokenize(words.trim())?.filter((token) => !(token instanceof P.WhitespaceToken)) ?? []
    if (!parser || !tokens.length) return undefined
    const types = new Set(SpellLanguageService.visible(scope.types).map((type) => type.instanceName))
    const bits: string[] = [tokens[0]!.raw ?? ""]
    const names = new Set<string>()
    for (let index = 1; index < tokens.length;) {
      let length = tokens.length - index
      let match: P.Match | undefined
      for (; length > 0; length--) {
        match = parser.parse(tokens.slice(index, index + length), "expression", scope)
        if (match?.length === length) break
      }
      if (!length) {
        bits.push(tokens[index++]!.raw ?? "")
        continue
      }
      const expression = tokens.slice(index, index + length)
      index += length
      const last = expression.at(-1)!
      // what it IS, if a type:  `the deck of solitaire` is a deck -- else its last word
      const datatype = typeof match?.datatype === "string" ? match.datatype : undefined
      const isLiteral = last instanceof P.NumberToken || last instanceof P.TextToken
      const typed = !isLiteral && datatype ? scope.getType(datatype)?.instanceName : undefined
      const word = typed && types.has(typed) ? typed : (last.raw ?? "").toLowerCase()
      if (types.has(word) && !names.has(word)) {
        names.add(word)
        bits.push(`a ${word}`)
        continue
      }
      const param = !isLiteral ? word : last instanceof P.NumberToken ? "number" : "text"
      let name = param
      for (let count = 2; names.has(name); count++) name = `${param}${count}`
      names.add(name)
      bits.push(`(${name})`)
    }
    return `to ${bits.join(" ")}`
  }

  /**
   * Statement that parsed just before `offset` on its line, if any, e.g. `shuffle the deck` before leftover `3 times`.
   * - The innermost match there whose rule is a `statement`, ending before `offset`.
   */
  private statementBefore(file: SP.SpellFile, offset: number): P.Match | undefined {
    const text = file.parseText
    let before = offset - 1
    while (before >= 0 && /[ \t]/.test(text[before]!)) before--
    if (before < 0 || text[before] === "\n") return undefined
    const stack = this.deepestMatchesAt(file.match!, before)
    for (let index = stack.length - 1; index >= 0; index--) {
      const match = stack[index]!
      if ([match.rule.alias].flat().includes("statement") && match.end! <= offset) return match
    }
    return undefined
  }

  /** Is `words` the start of a statement, just not finished?  i.e. does any statement need more after it? */
  private isUnfinished(words: string, scope: P.Scope): boolean {
    const expected = scope.parser?.expectedAfter(words.trim(), "statement", scope) ?? []
    return expected.some(({ continues, within, depth }) => !continues && !within && depth === 0)
  }

  /** Offset of the start of the top-level line `offset` is in -- its own, if it's top-level. */
  private topLevelLineStart(file: SP.SpellFile, offset: number): number | undefined {
    const item = file.match!.matched.find((it) => it instanceof P.Match && it.start! <= offset && offset <= it.end!)
    const start = item instanceof P.Match ? item.start : undefined
    return start === undefined ? undefined : file.parseText.lastIndexOf("\n", start - 1) + 1
  }

  ////////////////
  // ## Completion helpers
  ////////////////

  /** Variables visible in `scope`, declared before `offset`. */
  private variableItems(file: SP.SpellFile, scope: P.Scope, offset: number): CompletionItem[] {
    return SpellLanguageService.visible(scope.variables).flatMap((variable) => {
      if (this.isLater(file, offset, variable.declaredBy)) return []
      const { name, kind, output } = variable
      const texts = LSP.LspTexts.of(scope)
      const detail = [kind ?? texts.text("variable"), output && output !== name ? `${texts.text("as")} ${output}` : ""]
        .filter(Boolean)
        .join(" ")
      const documentation = this.markdown(this.docsOfRecord(variable))
      return [{ label: SpellLanguageService.asWritten(name), kind: CompletionItemKind.Variable, detail, documentation }]
    })
  }

  /** Types visible in `scope`, declared before `offset`. */
  private typeItems(file: SP.SpellFile, scope: P.Scope, offset: number): CompletionItem[] {
    return SpellLanguageService.visible(scope.types).flatMap((type) => {
      if (this.isLater(file, offset, type.declaredBy)) return []
      const label = SpellLanguageService.asWritten(type.instanceName)
      const documentation = this.markdown(this.docsOfRecord(type))
      const detail = LSP.LspTexts.of(scope).text("typeNamed", { name: type.name })
      return [{ label, kind: CompletionItemKind.Class, detail, documentation }]
    })
  }

  /**
   * Properties of every type visible in `scope`, as written, e.g. `short rank`.
   * - Once each, with the types declaring it.
   * - Every type's:  what's being typed, e.g. `the short`, doesn't know yet what it'll be read from.
   * - NOT an enumeration's values, e.g. `suits`:  `card suits` reads those.
   */
  private propertyItems(scope: P.Scope): CompletionItem[] {
    const owners = new Map<string, Array<{ type: string; doc?: string }>>()
    for (const type of SpellLanguageService.visible(scope.types)) {
      for (const property of SpellLanguageService.propertiesOf(type)) {
        const words = SpellLanguageService.memberWords(property.name, property)
        // a built-in's docs from its record;  a declared one's from its docstring, as its hover says (epic `editor` I55)
        const doc = property.declaredBy ? this.docsOfRecord(property) : property.docstring
        owners.set(words, [...(owners.get(words) ?? []), { type: type.name, doc }])
      }
    }
    return [...owners].map(([label, of]) => {
      // each type's docs, if more than one says
      const docs = of.filter((it) => it.doc).map((it) => (of.length > 1 ? `**${it.type}**:  ${it.doc}` : it.doc))
      // in the row itself:  the first type's first line, as the list shows it
      const description = of.find((it) => it.doc)?.doc?.split("\n")[0]
      return {
        label,
        kind: CompletionItemKind.Property,
        detail: LSP.LspTexts.of(scope).text("propertyOf", { types: of.map((it) => it.type).join(", ") }),
        ...(description && { labelDetails: { description } }),
        ...(docs.length ? { documentation: this.markdown(docs.join("\n\n")) } : {})
      }
    })
  }

  /** Constants visible in `scope`, declared before `offset`. */
  private constantItems(file: SP.SpellFile, scope: P.Scope, offset: number): CompletionItem[] {
    return SpellLanguageService.visible(scope.constants).flatMap((constant) => {
      if (this.isLater(file, offset, constant.declaredBy)) return []
      return [
        { label: constant.name, kind: CompletionItemKind.EnumMember, detail: LSP.LspTexts.of(scope).text("constant") }
      ]
    })
  }

  /** Calls to the project's methods visible in `scope` which are `alias`es, e.g. `"expression"`, as snippets. */
  private methodItems(file: SP.SpellFile, scope: P.Scope, offset: number, alias: string): CompletionItem[] {
    return SpellLanguageService.visible(scope.rules).flatMap((scopeRule) => {
      // Ask the BUILT rule -- `alias` usually lives on its class (`@proto static`), not in `definition`.
      const ruleAlias = scopeRule.instance?.alias
      if (this.isLater(file, offset, scopeRule.declaredBy) || ![ruleAlias].flat().includes(alias)) return []
      const item = this.methodCompletion(scopeRule)
      return item ? [{ ...item, documentation: this.markdown(this.docsOfRecord(scopeRule, true)) }] : []
    })
  }

  /** Was `declaredBy` later in `file` than `offset`, so not usable there yet? */
  private isLater(file: SP.SpellFile, offset: number, declaredBy: P.Match | undefined): boolean {
    return !!declaredBy && this.fileOf(declaredBy) === file && declaredBy.start! > offset
  }

  /** Scope at `offset` in `file`:  of the deepest match there. */
  private scopeAt(file: SP.SpellFile, offset: number): P.Scope {
    return this.deepestMatchesAt(file.match!, offset).at(-1)!.scope
  }

  /**
   * Snippet calling the method `scopeRule` matches, e.g. `turn ${1:card} face up` for `to turn a card face up`.
   * - Placeholders are named for the method's parameters, in order -- see `slotNames()`.
   */
  private methodCompletion(scopeRule: P.ScopeRule): CompletionItem | undefined {
    const { declaredBy, definition, instance } = scopeRule
    const { syntax } = definition
    const declaration = declaredBy?.rule.getDeclaration(declaredBy)
    if (!syntax || !declaration) return undefined
    const method = SpellLanguageService.methodOf(scopeRule)
    const argNames = instance instanceof P.Sequence ? SpellLanguageService.slotNames(instance, method) : []
    let argIndex = 0
    const snippet = syntax
      .split(/\s+/)
      .map((bit) => {
        const arg = /^\{(?:(\w+):)?(\w+)\}\??$/.exec(bit)
        if (arg) return `\${${argIndex + 1}:${argNames[argIndex++] ?? arg[1] ?? arg[2]}}`
        const choice = /^\(([^|)]+)\|.*\)\??$/.exec(bit)
        return (choice ? choice[1]! : bit.replace(/\?$/, "")).replace(/\\(.)/g, "$1").replace(/[$}\\]/g, "\\$&")
      })
      .join(" ")
    return {
      label: declaration.name,
      kind: declaration.kind === "method" ? CompletionItemKind.Method : CompletionItemKind.Function,
      detail: declaration.detail,
      insertText: snippet,
      insertTextFormat: InsertTextFormat.Snippet
    }
  }

  /**
   * Words a statement can start with, e.g. `to`, `if`, `set`, `repeat` -- from each `statement` rule's syntax.
   * - Leaves out the project's own methods:  `methodCompletion()` offers those as snippets.
   */
  private statementWords(parser: P.Parser, project: SP.SpellProject): string[] {
    const generated = this.generatedRules(project)
    const statements = parser.rules.statement
    const rules = statements instanceof P.Choice ? statements.rules : statements ? [statements] : []
    const words = new Set<string>()
    for (const rule of rules) {
      if (generated.has(rule)) continue
      for (const word of SpellLanguageService.firstWords(rule, { parser })) words.add(word)
    }
    return [...words].sort()
  }

  ////////////////
  // ## Formatting
  ////////////////

  /** Spacing around spell's punctuation -- see `P.TokenFormatter`. */
  static FORMAT_SPACING = {
    spaceAfter: [",", ":"],
    noSpaceBefore: [",", ":", ")", "]"],
    noSpaceAfter: ["(", "["]
  }

  /**
   * Edits formatting `file`, or just the lines overlapping `range` -- whitespace ONLY, see `P.TokenFormatter`:
   * - one TAB per level, ALWAYS -- spell indents with tabs, whatever the editor's `insertSpaces` says
   * - a body one level under its head;  a drawing's markup laid out as a tree, a tag's children one level under it,
   *   its closing tag back at its level, as a paste lays it out (`LSP.MarkupIndent`, epic `editor` T71):
   *   see `markupLaidOut()`
   * - one space between words;  one after `,` and `:`, none before them or just inside brackets,
   *   and none at the end of a line
   * - at most 2 blank lines in a row;  comments, strings and JSX left as written
   * - `trimFinalNewlines` / `insertFinalNewline` if `options` ask, as VS Code settings of those names do
   * - One edit per changed line, so the editor keeps the cursor in place.  None if it can't format safely;
   *   the markup left as written if laying it out would make it read differently.
   */
  formatting(file: SP.SpellFile, options: FormattingOptions, range?: Range): TextEdit[] {
    const text = file.contents ?? ""
    if (!text.trim()) return []
    // the file's own form's:  a `.spell` file's tags are tokens of its own tokenizer (epic `elemental-spell` P8)
    const tokenizer = file.scope?.parser?.tokenizer ?? file.language.parser.tokenizer
    const formatter = new P.TokenFormatter({
      tokenizer,
      indent: "\t",
      trimFinalBlankLines: !range && !!options.trimFinalNewlines,
      ...SpellLanguageService.FORMAT_SPACING
    })
    const formattedLines = formatter.formatLines(text)
    if (!formattedLines) return []
    const lines = this.markupLaidOut(file, formattedLines, { tokenizer, tabSize: options.tabSize || 1 })
    const from = range ? this.offsetAt(file, range.start) : 0
    const to = range ? this.offsetAt(file, range.end) : text.length
    const edits: TextEdit[] = []
    for (const { start, end, next, text: formatted } of lines) {
      if (start > to || next <= from) continue
      if (formatted === undefined) edits.push(this.editFor(file, start, next, ""))
      else if (formatted !== text.slice(start, end)) edits.push(...this.lineEdits(file, start, end, formatted))
    }
    if (!range && options.insertFinalNewline && !text.endsWith("\n")) {
      edits.push(this.editFor(file, text.length, text.length, "\n"))
    }
    return edits
  }

  /**
   * `lines`, as `P.TokenFormatter` formatted them, with each drawing's markup laid out as a tree (`LSP.MarkupIndent`):
   * a drawing, one token over several lines, is copied as written by the formatter.
   * - Its first line where the formatter put it;  each line under it a level in per tag still open above it.
   * - `lines` as they were if the result reads differently to the parser:  see `readsTheSame()`.
   */
  private markupLaidOut(
    file: SP.SpellFile,
    lines: P.FormattedLine[],
    { tokenizer, tabSize }: { tokenizer: P.Tokenizer; tabSize: number }
  ): P.FormattedLine[] {
    const written = file.contents ?? ""
    const indentOfWidth = (width: number) => "\t".repeat(Math.floor(width / tabSize)) + " ".repeat(width % tabSize)
    let changed = false
    const laidOut = lines.map((line) => {
      if (!line.text?.includes("\n")) return line
      let text = line.text
      // last first, so each drawing's place in `text` stays where the tokenizer said
      for (const token of tokenizer.tokenize(line.text).toReversed()) {
        if (!(token instanceof P.JSXToken) || token.end === undefined) continue
        const drawing = text.slice(token.start, token.end)
        if (!drawing.includes("\n")) continue
        const lineStart = text.lastIndexOf("\n", token.start - 1) + 1
        const base = LSP.MarkupIndent.widthOf(/^[ \t]*/.exec(text.slice(lineStart))![0], tabSize)
        // how far the formatter moved the drawing's first line:  the lines under it that keep their place move as far
        const firstMoved = lineStart
          ? 0
          : base - LSP.MarkupIndent.widthOf(/^[ \t]*/.exec(written.slice(line.start))![0], tabSize)
        const options = { base, tabSize, indentOfWidth, tokenizer, firstMoved }
        const tree = LSP.MarkupIndent.layout(drawing.split("\n"), options)
        text = text.slice(0, token.start) + tree.join("\n") + text.slice(token.end)
      }
      if (text === line.text) return line
      changed = true
      return { ...line, text }
    })
    if (!changed) return lines
    const before = P.TokenFormatter.applyLines(written, lines)
    const after = P.TokenFormatter.applyLines(written, laidOut)
    return this.readsTheSame(file, tokenizer, before, after) ? laidOut : lines
  }

  /**
   * Does `after` read as `before` does, `file`'s text with only whitespace changed?
   * - The same tokens, whitespace aside;  but a drawing whose lines moved is compiled, before and after, in the scope
   *   it's drawn in:  its text's line breaks and indents are the parser's to read (`SpellJSXText`, `rawTextTags`).
   * - NEVER throws:  a drawing that won't compile reads differently.
   */
  private readsTheSame(file: SP.SpellFile, tokenizer: P.Tokenizer, before: string, after: string): boolean {
    const tokensOf = (text: string) => tokenizer.tokenize(text).filter((token) => !(token instanceof P.WhitespaceToken))
    const was = tokensOf(before)
    const now = tokensOf(after)
    // where each was in the file, for its scope:  the formatter moved them, never changed them
    const inFile = tokensOf(file.contents ?? "")
    if (was.length !== now.length || inFile.length !== was.length) return false
    return was.every((token, index) => {
      const other = now[index]!
      const written = before.slice(token.start, token.end)
      const rewritten = after.slice(other.start, other.end)
      if (token.constructor !== other.constructor) return false
      if (written === rewritten) return true
      if (!(token instanceof P.JSXToken)) return false
      const rule = token instanceof P.JSXFragmentToken ? "jsxFragment" : "jsxElement"
      // a file not parsed yet, e.g. new:  its own scope, else its language's
      const scope = file.match ? this.scopeAt(file, inFile[index]!.start) : (file.scope ?? file.language.rootScope)
      try {
        return `${scope.compile(written, rule)}` === `${scope.compile(rewritten, rule)}`
      } catch {
        return false
      }
    })
  }

  /**
   * Edits replacing `file`'s text from `start` to `end`, one line or a drawing over several, with `newText`:
   * one edit per line that changed, only its indent if that's all, so the caret keeps its place.
   * - One edit for the whole if the line count changed.
   */
  private lineEdits(file: SP.SpellFile, start: number, end: number, newText: string): TextEdit[] {
    const was = (file.contents ?? "").slice(start, end).split("\n")
    const now = newText.split("\n")
    if (was.length !== now.length) return [this.editFor(file, start, end, newText)]
    const edits: TextEdit[] = []
    let at = start
    for (const [index, line] of was.entries()) {
      const rewritten = now[index]!
      const indent = /^[ \t]*/.exec(line)![0].length
      const newIndent = /^[ \t]*/.exec(rewritten)![0].length
      // only its indent changed:  only its indent edited, so a caret further along stays where it is
      if (line.slice(indent) === rewritten.slice(newIndent) && line !== rewritten)
        edits.push(this.editFor(file, at, at + indent, rewritten.slice(0, newIndent)))
      else if (line !== rewritten) edits.push(this.editFor(file, at, at + line.length, rewritten))
      at += line.length + 1
    }
    return edits
  }

  /** Edit replacing `file`'s text from offset `start` to `end` with `newText`. */
  private editFor(file: SP.SpellFile, start: number, end: number, newText: string): TextEdit {
    return { range: { start: this.positionAt(file, start), end: this.positionAt(file, end) }, newText }
  }

  ////////////////
  // ## Accent fixes
  ////////////////

  /**
   * What the editor asks `onTypeFormatting()` after:  a space, or a new line.
   * - VS Code asks only with `editor.formatOnType` on:  the extension turns it on for spell.
   */
  static ON_TYPE_TRIGGERS = [" ", "\n"]

  /**
   * Edits as `typed` goes in at `position`:  the accent fixes of what's just been finished (epic `spanish` P10).
   * - A space:  the line so far;  a new line:  the line just ended too.
   * - So `el numero de cartas` becomes `el número de cartas` once its line parses, with nothing for you to do:
   *   see `accentEdits()`.
   * - A line that doesn't parse yet is left alone:  only a parse says a word is a keyword.
   */
  onTypeFormatting(file: SP.SpellFile, position: Position, typed: string): TextEdit[] {
    const offset = this.offsetAt(file, position)
    const text = file.parseText
    const lineStart = text.lastIndexOf("\n", offset - 1) + 1
    const from = typed === "\n" ? text.lastIndexOf("\n", lineStart - 2) + 1 : lineStart
    return this.accentEdits(file, from, offset)
  }

  /**
   * Edits putting back the written accent of each keyword typed without it, from offset `from` to `to` of `file`:
   * `numero` => `número`, `esta` => `está`.
   * - Only words its language's parse matched as one of its own keywords, and only where that's unambiguous:
   *   see `LSP.SpellKeywords.accentFixFor()`.
   *   - So a person's name `numero`, or `si` (`if`, as well as an unaccented `sí`), stays as typed.
   * - None in a language with no such keywords, e.g. English.
   */
  accentEdits(file: SP.SpellFile, from = 0, to = Infinity): TextEdit[] {
    if (!file.match) return []
    const keywords = LSP.SpellKeywords.of(file.language)
    if (!keywords.hasAccentFixes) return []
    const text = file.parseText
    const edits = new Map<number, TextEdit>()
    if (file.form === "page") this.pageAccentEdits(file, keywords, from, to, edits)
    SpellLanguageService.walk(file.match, (match) => {
      if (match.end === undefined || match.start === undefined || match.end < from || match.start > to) return
      for (const token of match.matched) {
        if (!(token instanceof P.WordToken) || token.start < from || token.end > to || edits.has(token.start)) continue
        // a page twin's own word, standing at its tag:  not typed there (C24)
        if (SP.PageTwin.isSynthetic(token)) continue
        const fixed = keywords.accentFixFor(match.rule, text.slice(token.start, token.end))
        if (fixed) edits.set(token.start, this.editFor(file, token.start, token.end, fixed))
      }
    })
    return [...edits.values()]
  }

  /**
   * The accent fixes of a page file's own words from offset `from` to `to`, into `edits` (epic `elemental-spell`
   * P8, Q49):  a tag's word and its attributes' names, typed without their accents --
   * `<vacio>` => `<vacío>`, `titulo=` => `título=`.
   * - Named closers too:  `</vacio>` => `</vacío>`.
   * - `SpellKeywords.pageAccentFixFor()` says which:  only the language's own page words, unambiguously.
   */
  private pageAccentEdits(
    file: SP.SpellFile,
    keywords: LSP.SpellKeywords,
    from: number,
    to: number,
    edits: Map<number, TextEdit>
  ) {
    const fix = (start: number, word: string) => {
      const fixed = keywords.pageAccentFixFor(word)
      if (fixed && start >= from && start + word.length <= to)
        edits.set(start, this.editFor(file, start, start + word.length, fixed))
    }
    P.Tokenizer.forEachToken(file.match?.tokens ?? [], (token) => {
      if (token.end < from || token.start > to) return
      // a named closer:  `</vacio>`
      if (token instanceof SP.PageCloserToken && token.word) fix(token.start + 2, token.word)
      if (!(token instanceof SP.PageTagToken)) return
      const { tag } = token
      // a page's head:  its flags, `bloqueada`;  its own word is the language's pattern's
      if (tag.category !== "page") fix(token.start + 1, tag.word)
      for (const attribute of tag.attributes) fix(attribute.start, attribute.word)
    })
  }

  ////////////////
  // ## Project lookups
  ////////////////

  /** Spell file `match` is in, by its `FileScope`'s path. */
  fileOf(match: P.Match): SP.SpellFile | undefined {
    const path = match.getScopeOfType(P.FileScope)?.path
    if (!path) return undefined
    const file = SP.SpellFile.registry.get(path)
    return file?.isActive ? file : undefined
  }

  /**
   * Every rule `project`'s files generated while parsing, e.g. a method's call-site rule, to the record of it.
   * - A call's expression twin finds its statement rule's record too -- see `GeneratedRules`.
   */
  generatedRules(project: SP.SpellProject): Map<P.Rule, P.ScopeRule> {
    const generated = new GeneratedRules()
    for (const scopeRule of SpellLanguageService.visible(project.scope?.rules)) {
      if (scopeRule.instance) generated.set(scopeRule.instance, scopeRule)
    }
    return generated
  }

  /**
   * Record of the method `scopeRule`'s call rule calls:  its `P.ScopeMethod`, which its declaring statement noted.
   * - `undefined` if it has none, e.g. it was imported, or it's a property's rule.
   */
  static methodOf(scopeRule: P.ScopeRule): P.ScopeMethod | undefined {
    const declared = (scopeRule.declaredBy?.data as { declared?: unknown[] } | undefined)?.declared ?? []
    return declared.find((item): item is P.ScopeMethod => item instanceof P.ScopeMethod)
  }

  /**
   * Name of each argument slot of `method`'s call rule `sequence`, in order,
   * e.g. `move a card to a pile` => `card`, `pile`:
   * - its receiver (`{thisArg}`) by its type, e.g. `card`
   * - each other by its parameter's name, from the method's record (`P.ScopeMethod.params`), e.g. `pile`
   * - else the slot's own group or rule name
   */
  static slotNames(sequence: P.Sequence, method: P.ScopeMethod | undefined): string[] {
    const params = method?.params ?? []
    let param = 0
    return sequence.rules
      .filter((rule): rule is P.Subrule => rule instanceof P.Subrule)
      .map((slot) => {
        if (slot.matchGroup === "thisArg" && method?.of) return P.instanceCase(method.of)
        return params[param++]?.name ?? slot.matchGroup ?? slot.rule
      })
  }

  /** What every statement in the project of `match` declares, in file order. */
  private allDeclarations(match: P.Match): Array<{ file: SP.SpellFile; declaration: P.Declaration }> {
    const project = this.fileOf(match)?.project
    if (!project) return []
    const declarations: Array<{ file: SP.SpellFile; declaration: P.Declaration }> = []
    for (const file of project.spellFiles) {
      if (!file.match) continue
      SpellLanguageService.walk(file.match, (item) => {
        const declaration = item.rule.getDeclaration(item)
        if (declaration) declarations.push({ file, declaration })
      })
    }
    return declarations
  }

  /**
   * Scope record `match` resolved to while parsing, if any -- see `SpellIdentifier` / `SpellType` / `SpellConstant`.
   * - NEVER looked up again now:  scope has moved on since.
   */
  private recordOf(match: P.Match): P.ScopeVariable | P.TypeScope | P.ScopeConstant | undefined {
    const { scopeVar, scopeType, scopeConstant } = match.data as Record<string, unknown>
    const record = scopeVar ?? scopeType ?? scopeConstant
    const isRecord =
      record instanceof P.ScopeVariable || record instanceof P.TypeScope || record instanceof P.ScopeConstant
    return isRecord ? record : undefined
  }

  /**
   * Single-word match naming what `declaration` declares, e.g. `deck` in `set the deck to ...`.
   * - A method's whole signature, which IS its name.
   */
  private nameLeaf(declaration: P.Declaration): P.Match {
    const { nameMatch, kind } = declaration
    if (kind === "method" || kind === "function") return nameMatch
    let leaf: P.Match | undefined
    SpellLanguageService.walk(nameMatch, (match) => {
      const colour = match.rule.highlightAs
      if (!leaf && colour && colour !== "keyword" && colour !== "operator") leaf = match
    })
    return leaf ?? nameMatch
  }

  /** `Location` of `match` in `file`, for the editor. */
  private locationOf({ file, match }: LSP.FileMatch): Location {
    const range = this.rangeOf(file, match) ?? { start: { line: 0, character: 0 }, end: { line: 0, character: 0 } }
    return { uri: this.addresses.uriFor(file), range }
  }

  ////////////////
  // ## Helpers
  ////////////////

  /** Editor symbol kind for each kind of declaration. */
  private static SYMBOL_KINDS: Record<P.DeclarationKind, SymbolKind> = {
    type: SymbolKind.Class,
    property: SymbolKind.Property,
    method: SymbolKind.Method,
    function: SymbolKind.Function,
    variable: SymbolKind.Variable,
    event: SymbolKind.Event
  }

  /**
   * Matches directly below `match`:  its `matched` ones, then any a rule keeps in `data`,
   * e.g. a statement's parsed `body`, or what JSX rules parse out of their tokens.
   * - Skips `data.errors`:  those are ALL the parse errors below, gathered up.
   */
  private static childMatches(match: P.Match): P.Match[] {
    const children = new Set<P.Match>()
    for (const item of match.matched) if (item instanceof P.Match) children.add(item)
    for (const [key, value] of Object.entries(match.data)) {
      if (key === "errors") continue
      for (const item of [value].flat()) if (item instanceof P.Match && item !== match) children.add(item)
    }
    return [...children]
  }

  /**
   * Every line in `project` naming site part `name` (epic `mockup` P6, T13):
   * `go to the films page`, `show the settings dialog`, `the address of the film page for this film`.
   * - Each is the WORDS naming it, `films page`, a match in its file:  what a rename of the part changes.
   * - A page's names are several words, so the one-word `rename()` can't take them.
   */
  static sitePartUses(project: SP.SpellProject, name: string): LSP.FileMatch[] {
    const uses: LSP.FileMatch[] = []
    for (const file of project.spellFiles) {
      if (!file.match) continue
      SpellLanguageService.walk(file.match, (match) => {
        const named = SP.ShowSitePart.partNamedBy(match) ?? SP.SiteAddressOf.partNamedBy(match)
        if (named?.name === name) uses.push({ file, match: named.words })
      })
    }
    return uses
  }

  /**
   * Call `visit` for `match` and every match below it, parents first -- see `childMatches()`.
   * - `parent` is the match `visit`'s match was found under.
   */
  static walk(
    match: P.Match,
    visit: (match: P.Match, parent: P.Match | undefined) => void,
    parent?: P.Match,
    seen = new Set<P.Match>()
  ) {
    if (seen.has(match)) return
    seen.add(match)
    visit(match, parent)
    for (const child of SpellLanguageService.childMatches(match)) SpellLanguageService.walk(child, visit, match, seen)
  }

  /**
   * `match`, then the deepest chain of matches below it containing `offset`.
   * - Tries EVERY child containing `offset`, not just the first:
   *   a statement's body placeholder and its parsed body cover the same text, and only the parsed one goes deeper.
   */
  private deepestMatchesAt(match: P.Match, offset: number): P.Match[] {
    let deepest: P.Match[] = []
    for (const child of SpellLanguageService.childMatches(match)) {
      if (!this.containsOffset(child, offset)) continue
      const stack = this.deepestMatchesAt(child, offset)
      if (stack.length > deepest.length) deepest = stack
    }
    return [match, ...deepest]
  }

  /** Is `offset` within `match`:  from its start, up to where the next token starts, or just after its text? */
  private containsOffset(match: P.Match, offset: number): boolean {
    const { end, next } = match
    // a page twin's own words stand at its tag, with no text of their own (C24):  a match starts at its first real one
    const start = SpellLanguageService.realStartOf(match)
    if (start === undefined || start > offset) return false
    return (next !== undefined && offset < next) || (end !== undefined && offset <= end)
  }

  /**
   * Where `match` starts in the file's text:  its first token that isn't a page twin's own word (C24).
   * - `undefined` for a match of twin words alone:  nothing of it is there to point at.
   */
  private static realStartOf(match: P.Match): number | undefined {
    const [first] = match.tokens
    if (!first || !SP.PageTwin.isSynthetic(first)) return match.start
    return match.tokens.find((token) => !SP.PageTwin.isSynthetic(token))?.start
  }

  /** Is `item` a match of the rule named `ruleName`? */
  private isMatchOf(item: P.Match | P.Token, ruleName: string): boolean {
    return item instanceof P.Match && item.rule.name === ruleName
  }

  /** `[first, last]` of each run of 2 or more consecutive numbers in sorted `numbers`. */
  private runsOf(numbers: number[]): Array<[number, number]> {
    const runs: Array<[number, number]> = []
    let first = numbers[0]
    numbers.forEach((number, index) => {
      const next = numbers[index + 1]
      if (next === number + 1) return
      if (first !== undefined && number > first) runs.push([first, number])
      first = next
    })
    return runs
  }

  /** Does `range` contain `position`, ends included? */
  private rangeContains({ start, end }: Range, { line, character }: Position): boolean {
    const afterStart = line > start.line || (line === start.line && character >= start.character)
    const beforeEnd = line < end.line || (line === end.line && character <= end.character)
    return afterStart && beforeEnd
  }

  /** Do ranges `a` and `b` cover exactly the same text? */
  private sameRange(a: Range, b: Range): boolean {
    return (
      a.start.line === b.start.line &&
      a.start.character === b.start.character &&
      a.end.line === b.end.line &&
      a.end.character === b.end.character
    )
  }

  /**
   * `symbols` as sent to the editor, in order, with each property or method of a type declared among them
   * moved under that type's symbol.
   */
  private nestUnderTypes(symbols: LSP.SpellSymbol[]): DocumentSymbol[] {
    const types = new Map<string, DocumentSymbol>()
    for (const { symbol } of symbols) if (symbol.kind === SymbolKind.Class) types.set(symbol.name, symbol)
    return symbols.flatMap(({ symbol, typeName }) => {
      const type = typeName ? types.get(typeName) : undefined
      if (!type) return [symbol]
      ;(type.children ??= []).push(symbol)
      return []
    })
  }

  /** Every symbol in `symbols`, children included, with the name of the symbol it's under. */
  private *allSymbols(
    symbols: DocumentSymbol[] | undefined,
    containerName?: string
  ): Generator<{ symbol: DocumentSymbol; containerName?: string }> {
    for (const symbol of symbols ?? []) {
      yield { symbol, containerName }
      yield* this.allSymbols(symbol.children, symbol.name)
    }
  }

  /** Are `query`'s characters all in `name`, in order, ignoring case?  An empty `query` matches everything. */
  private isSubsequence(query: string, name: string): boolean {
    const lowerName = name.toLowerCase()
    let index = 0
    for (const char of query.toLowerCase()) {
      index = lowerName.indexOf(char, index) + 1
      if (index === 0) return false
    }
    return true
  }

  /**
   * Items of `list` and the lists it falls back to, innermost first -- each key once, as `list.get(key)` would find it.
   * - e.g. every variable visible in a method body:  its own, its file's, its project's.
   */
  static visible<T>(list: P.ScopeList<T, any> | undefined): T[] {
    const seen = new Set<string | undefined>()
    const items: T[] = []
    for (let at: P.ScopeList<T, any> | undefined = list; at; at = at.parent) {
      for (const item of at.get()) {
        const key = at.getKeyFor(item)
        if (seen.has(key)) continue
        seen.add(key)
        items.push(item)
      }
    }
    return items
  }

  /**
   * Words `rule` can start with:  its leading literals, through sequences, choices and repeats -- `P.leadingRules()`.
   * - Follows a `{subrule}` only to a single rule, NOT a category like `{expression}`, which could start with
   *   anything -- unless `options.followGroups`, e.g. for operators, filtered by what's being typed.
   */
  static firstWords(rule: P.Rule, options: P.LeadingRulesOptions): string[] {
    const words = P.leadingRules(rule, options).flatMap((leading) => {
      if (leading instanceof P.Literal) return [leading.literal].flat()
      if (!(leading instanceof P.Literals)) return []
      const leadingWords: string[] = []
      for (const { literal, optional } of leading.literals) {
        leadingWords.push(...[literal].flat())
        if (!optional) break
      }
      return leadingWords
    })
    return words.filter((word) => P.ALPHANUMERIC_WORD_WITH_DASHES.test(word))
  }

  /** Kinds of NAME a completion can offer, by the `highlightAs` of the rule that matches them -- see `firstKinds()`. */
  static NAME_KINDS: P.HighlightKind[] = ["type", "variable", "enumMember", "function", "property"]

  /**
   * Kinds of name `rule` can start with, e.g. `{type}` => `type`, `{expression}` => `variable`, `enumMember`...
   * - By the `highlightAs` of the rules it can start with -- NOT by rule names --
   *   through sequences, choices, repeats and subrules, categories too (`P.leadingRules()`).
   */
  static firstKinds(rule: P.Rule, parser: P.Parser): Set<P.HighlightKind> {
    const kinds = new Set<P.HighlightKind>()
    for (const { highlightAs } of P.leadingRules(rule, { parser, followGroups: true })) {
      if (highlightAs && SpellLanguageService.NAME_KINDS.includes(highlightAs)) kinds.add(highlightAs)
    }
    return kinds
  }

  /**
   * Properties declared on `type` itself -- NOT the enumerations `define_property_has` also files there.
   * - `inherited`:  its super-types' too, nearest first.
   */
  static propertiesOf(type: P.TypeScope, { inherited = false } = {}): P.ScopeVariable[] {
    const types = inherited ? type.chain() : [type]
    return types.flatMap((each) => each.variables.get().filter((variable) => !("enumeration" in variable)))
  }

  /** Is `token` one an editor should colour:  a word, symbol, number, string or comment -- NOT whitespace? */
  static isColourable(token: P.Token): boolean {
    // a page twin's own words stand at its tag, with no text of their own (C24)
    if (SP.PageTwin.isSynthetic(token)) return false
    return (
      token instanceof P.WordToken ||
      token instanceof P.SymbolToken ||
      token instanceof P.NumberToken ||
      token instanceof P.TextToken ||
      token instanceof P.CommentToken
    )
  }

  /**
   * `match` compiled by `writer`, javascript's by default, naming things as its project does
   * (`P.ProgramWriter.writeMatch()`).
   * - `undefined` if that throws, e.g. for a half-typed statement.
   */
  static compileQuietly(match: P.Match, writer: P.ProgramWriter = P.JSWriter.instance): string | undefined {
    try {
      const compiled = writer.writeMatch(match)
      // declaration markers are for the declarations file, not for people -- see `SP.SpellDeclarations`
      return typeof compiled === "string" ? SP.SpellDeclarations.stripComments(compiled) : undefined
    } catch {
      return undefined
    }
  }

  /** Input of the first of `rule`'s tests, e.g. to show as an example of what it matches. */
  static firstExample(rule: P.Rule): string | undefined {
    for (const block of rule.tests ?? []) {
      for (const test of block.tests) {
        const input = Array.isArray(test) ? test[0] : test.input
        const text = [input].flat().join("\n")
        if (text) return SpellLanguageService.truncate(text.split("\n")[0]!, 80)
      }
    }
    return undefined
  }

  /** `text`, cut to `length` characters with `…` if longer. */
  static truncate(text: string, length: number): string {
    return text.length > length ? `${text.slice(0, length - 1)}…` : text
  }

  /** `text`, cut to `count` lines with `…` if longer. */
  static truncateLines(text: string, count: number): string {
    const lines = text.split("\n")
    return lines.length > count ? [...lines.slice(0, count), "…"].join("\n") : text
  }

  /** Do spell names `a` and `b` name the same thing, e.g. `Card` / `card`, `bank-account` / `bank_account`? */
  static sameName(a: string, b: string): boolean {
    return SpellLanguageService.propertyKey(a) === SpellLanguageService.propertyKey(b)
  }

  /**
   * Spell name `name` as it's written in spell, e.g. `all-piles` for variable `all_piles`.
   * - Scope records keep names as they compile, with underscores;  either spelling parses the same.
   */
  static asWritten(name: string): string {
    return name.replace(/_/g, "-")
  }

  /**
   * `name` normalized for comparing:  lower case, dashes and spaces as underscores,
   * e.g. `short-suit` or `short suit` => `short_suit`.
   */
  static propertyKey(name: string): string {
    return name.toLowerCase().replace(/[-\s]+/g, "_")
  }

  /**
   * Member `name` as it's written in spell, e.g. `short rank` for `short_rank`.
   * - Its record's `asWritten`, if it has one, else its name with spaces.
   * - Hover AND the Type Explorer show this, so a member reads the same in both.
   */
  static memberWords(name: string, record?: P.ScopeVariable): string {
    return record?.asWritten ?? (record?.name ?? name).replace(/_/g, " ")
  }
}

/**
 * Generated rules to their records -- see `SpellLanguageService.generatedRules()`.
 * - A call rule's expression twin (`SP.SpellStatement.operandInExpressions`) finds its statement rule's record:
 *   the twin is what a call INSIDE an expression matched, e.g. `double x` in `if double x is 4`.
 */
class GeneratedRules extends Map<P.Rule, P.ScopeRule> {
  /** Record of `rule`, or of the statement rule it's the twin of. */
  get(rule: P.Rule): P.ScopeRule | undefined {
    return super.get(SP.SpellStatement.statementRuleOf(rule))
  }

  /** Is `rule`, or the statement rule it's the twin of, generated? */
  has(rule: P.Rule): boolean {
    return super.has(SP.SpellStatement.statementRuleOf(rule))
  }
}

/** How one character of a comment draws:  the markdown around it -- see `commentSpans()`. */
type CommentStyle = {
  bold?: boolean
  italic?: boolean
  link?: boolean
  strikethrough?: boolean
  /** In a code span:  coloured as a `string`. */
  code?: boolean
}

/**
 * A JSX tag being typed at the end of a line:  `<` right before a word, after a space, `>`, `(` or `{`, e.g. `<div><chi`.
 * - Accented letters too:  `<menú-con`.
 * - Or a `<` alone, starting its line or after `>`, `(` or `{` (`x <` isn't one):
 *   the moment it's typed, before its first letter.
 */
const JSX_TAG_TYPED = /(?:(?:^|[\s>({])<\p{Ll}[\p{L}\p{M}\d_-]*|(?:^\s*|[>({])<)$/u

/**
 * An attribute being typed inside a tag at the end of a line:  the tag, then all after it, `<button fluid col`.
 * - Only after a space, past the tag's name;  a `>` after it closes the tag.
 */
const ATTRIBUTE_TYPED = /<(\p{L}[\p{L}\p{M}\d-]*)(\s[^<>]*?)?\s+[\p{L}-]*$/u

/**
 * The command a value's Pick row runs (epic `editor` T61):  the app's code editor opens the picker at the caret
 * (`ValuePopups`), handed the attribute's `SP.ComponentValuePicker` and its words.
 */
export const PICK_VALUE_COMMAND = "spell.pickValue"

/**
 * A sound's name being typed in quotes after a word at the end of a line:  the word, then what's typed,
 * `play "card s`;  `soundItems()` checks the word is one of the sound rules'.
 */
const SOUND_NAME_TYPED = /(?:^|\s)([\p{L}\p{M}]+)\s+"([^"]*)$/u

/** The rules whose quoted value is a sound's name:  `play`, `stop`, `load` (`UI.en.ts`). */
const SOUND_RULES = ["play_sound", "stop_sound", "load_sound"]

/** An attribute's quoted value being typed at the end of a line:  its tag, its attribute, then what's typed, `<button color="pr`. */
const ATTRIBUTE_VALUE_TYPED = /<(\p{L}[\p{L}\p{M}\d-]*)\s(?:[^<>]*\s)?([\p{L}\p{M}\d-]+)="([^"]*)$/u

/** How far back `openTagBefore()` looks for its tag's `<`. */
const OPEN_TAG_REACH = 4000

/**
 * What's written of the tag open at `offset` in `text`, from its `<`, its lines joined by spaces:
 * `<button fluid col`, for `<button fluid` then `\tcol` on the next line (epic `editor` I64).
 * - The nearest `<` before `offset`, if it starts a tag (`<name`, at a line's start or after a space, `>`, `(` or `{`)
 *   and no `>` closes it before `offset`, quoted values and `{...}` aside.
 * - Its lines after the first each indented further than the tag's:  as a tag is split, so code after a stray `<`
 *   (`x <y`, in a comment) isn't read as one.
 * - `undefined` otherwise:  outside a tag, after a closing tag, or `x < y`.
 */
function openTagBefore(text: string, offset: number): string | undefined {
  const start = text.lastIndexOf("<", offset - 1)
  if (start < 0 || offset - start > OPEN_TAG_REACH || !/^<\p{L}/u.test(text.slice(start, start + 2))) return undefined
  if (start > 0 && !/[\s>({]/.test(text[start - 1]!)) return undefined
  const written = text.slice(start, offset)
  const [, ...under] = written.split("\n")
  if (under.length) {
    const tagLine = text.slice(text.lastIndexOf("\n", start - 1) + 1, start)
    const indent = /^[ \t]*/.exec(tagLine)![0].length
    if (under.some((line) => line.trim() && /^[ \t]*/.exec(line)![0].length <= indent)) return undefined
  }
  let quotes = 0
  let braces = 0
  for (const char of written) {
    if (char === '"' && !braces) quotes ^= 1
    else if (!quotes && char === "{") braces++
    else if (!quotes && char === "}") braces = Math.max(0, braces - 1)
    else if (!quotes && !braces && char === ">") return undefined
  }
  return written.replace(/\r?\n/g, " ")
}

/** A tag's or an attribute's name in a drawing, where it is -- see `SpellLanguageService.markupWordAt()`. */
type MarkupWord = {
  /** the name itself, `stock-pile` or `suit` */
  word: string
  /** scope it's drawn in */
  scope: P.Scope
  /** where it's written */
  range: Range
} & ({ kind: "tag" } | { kind: "attribute"; /** the tag it's an attribute of */ tag: string })

/** Is the end of `text`, what's written inside a tag, inside a quoted value or a `{...}`? */
function isInQuotesOrBraces(text: string): boolean {
  let quotes = 0
  let braces = 0
  for (const char of text) {
    if (char === '"' && !braces) quotes ^= 1
    else if (!quotes && char === "{") braces++
    else if (!quotes && char === "}") braces = Math.max(0, braces - 1)
  }
  return !!quotes || !!braces
}

/** An action's quoted word being typed at the end of a line:  its tag, then what's typed inside the quotes, `<action "au`. */
const ACTION_WORD_TYPED = /<(\p{L}[\p{L}\p{M}-]*)\s+"([^"]*)$/u

/** What spell's action tag means, whatever its word:  `SP.spellTagsIn()`'s `action`. */
const ACTION_TAG = "action"

/** The detail of each of spell's own tags, by what it means;  any other is spell's word for the web's tag. */
const SPELL_TAG_DETAILS: Record<string, LSP.LspTextKey | undefined> = {
  action: "actionTag",
  context_menu: "contextMenuTag",
  divider: "dividerTag"
}

/** The order an action's completions come in, by whose it is. */
const ACTION_KINDS = ["own", "app", "other"] as const

/** Where a scope record says it's declared:  its scope, or the match declaring it (a method's). */
type RecordScopes = { scope?: P.Scope; declaredBy?: P.Match }

/** Where a test's errors show, in a project's VS Code problems:  apart from the parser's, `spell`. */
const TEST_SOURCE = "spell test"

/** A `to test ...` as written:  where it is, and its checks -- see `SpellLanguageService.testDiagnostics()`. */
type TestDefinition = {
  /** File it's in. */
  file: SP.SpellFile
  /** Its `to test ...` statement:  where a check found nowhere, or a throw, shows. */
  match: P.Match
  /** Each `... should be ...` in it, in the order they're written:  the spell its call names, and its statement. */
  checks: Array<{ what: string; expected?: string; match: P.Match }>
}

/** The heading level a file's `group "..."` is, as `## ...` is:  see `SpellLanguageService.headingsOf()`. */
const GROUP_HEADING_LEVEL = 2

/** The rule of `<action "...">`, a button or menu row naming one of the program's actions:  what an action's rename finds. */
const ACTION_BUTTON_RULE = "action_button"

/** Are `a` and `b` the same words, whatever their case, accents and spacing:  `Auto  play` and `auto play`? */
function sameWords(a: string, b: string): boolean {
  const plain = (text: string) => withoutAccents(text.trim().replace(/\s+/g, " ")).toLowerCase()
  return plain(a) === plain(b)
}

/**
 * Was `record` declared by `statement`, as the latest parse has it?
 * - A record names the statement first parsed;  an edit inside its body re-parses it as a clone (epic `language` P58),
 *   which is what's in the file's matches now:  `P.Match.current`.
 */
function declaredBy(record: { declaredBy?: P.Match }, statement: P.Match): boolean {
  return record.declaredBy?.current === statement
}
