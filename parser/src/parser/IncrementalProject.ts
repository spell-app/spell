import { P } from "spell/parser/parser"

/**
 * Files of one project, parsed in order into one `scope`, so an edit to one file re-parses as little as possible
 * -- see `P.IncrementalParse`.
 * - Every file shares the project scope's parser, and so its `journal` (`P.ParseJournal`):
 *   what file 1 declares, file 2 can use, and rewinding file 1 takes back file 2 as well.
 *   - A file may bring a parser of its own, e.g. one in another human language (spell's `SpellParser.twinFor()`):
 *     it records in the same journal, and shares the rules the project adds.
 * - Each file gets its own `P.FileScope` under `scope`, with its own parser if it brought one.
 * - Before any file parses, every type and method the files declare is stubbed,
 *   so a line can name a type, or call a method, declared further down:
 *   `parser.stubDeclaredTypes()`, `stubDeclaredVariables()`, `stubDeclaredMethods()`, `stubDeclaredProperties()`.
 * - An edit which changes WHICH types or properties a file declares, or what a type is, stubs that file again
 *   and parses it again whole:  the only way a line above it learns of the change (`reparseDeclaring()`).
 *   - WHICH methods:  everything parses again, so every call registered ahead of a definition reads again
 *     (`parser.changesMethods()`, epic `editor` I170).
 * - Whenever a file parses again from part way, the files after it are KEPT if what they looked up finds the same
 *   (epic `language` P59):  each file's `P.Outline`, held up against the `P.ParseDiff` of what parsed again.
 *   - A kept file's journal entries are put back onto the new records (`P.JournalChange.redo`),
 *     and its lines pointed at the new records in place of the old ones (`P.ParseDiff.keepPlan()`).
 *   - The rest parse again, in order, and what they change counts for the files after them.
 * - A file ALONE, one a language says holds one thing and nothing else (spell's page alone in its file,
 *   `P.FileHead`, epic `notebook` P10) stays out of all that:
 *   - the project knows only its head, its name and what it has, by a scan, with no parse
 *   - it parses in a small scope of its own under the project's, with its own copy of the parser and journal:
 *     what it declares is its own, so an edit to it touches nothing else
 *   - it parses when it's wanted (`parsesAlone`, `parseAlone()`), so a project of hundreds starts in a moment
 *   - an edit that changes its head re-parses the rest;  one that stops it being alone starts over (`isBroken`)
 */
export class IncrementalProject {
  /** Project scope every file's scope is under. */
  declare scope: P.Scope
  /**
   * Our files, in parse order.
   * - `types`:  names of the types it declares, joined -- see `parser.declaredTypes()`, `update()`.
   * - `parser`:  the one it parses with:  the project scope's, unless it brought its own.
   * - `head`:  the file is alone, and this is what the project knows of it.
   * - `text`:  its text, for an alone file that hasn't parsed yet.
   * - `parse`:  `undefined` only for an alone file not parsed yet.
   */
  declare files: IncrementalFile[]
  /** Do broken lines keep their last working declarations?  See `IncrementalProjectProps.keepLastGood`. */
  declare keepLastGood: boolean
  /** Journal mark before the types we stub -- rewinding to it takes back the whole project. */
  declare startMark: P.JournalMark
  /**
   * Where each file's stubs start in the journal, one run per kind of stub and file:
   * every file's types, then every file's variables, methods and properties -- see `stub()`.
   * - `kind`:  which of `STUBS`;  `file`:  its index in `files`.
   * - So an edit that changes what a file declares stubs just that file again (`reparseDeclaring()`).
   */
  declare stubMarks: StubMark[]
  /** Journal mark after every stub, before the first file's parse. */
  declare stubsEndMark: P.JournalMark
  /** Reads a file's head after an edit:  see `IncrementalProjectProps.headOf`. */
  declare headOf: IncrementalProjectProps["headOf"]
  /**
   * `true` if an `update()` threw part way through, so our parse state can't be trusted.
   * - Next `update()` re-parses every file from scratch.
   */
  isBroken = false

  /**
   * Parse `files` in order, from scratch.
   * - SIDE EFFECT: gives `scope.parser` a fresh `journal`, and each file's own parser the same one.
   */
  constructor({ scope, files, keepLastGood, headOf, parsesAlone }: IncrementalProjectProps) {
    const parser = scope.parser!
    const journal = (parser.journal = new P.ParseJournal())
    const parsers = files.map((file) => file.parser ?? parser)
    for (const it of parsers) it.journal = journal
    this.scope = scope
    this.keepLastGood = !!keepLastGood
    this.headOf = headOf
    this.startMark = journal.mark()
    for (const { head } of files) head?.declareIn(scope)
    this.stub(files.flatMap(({ text, head }, index) => (head ? [] : [{ text, parser: parsers[index]!, index }])))
    this.files = files.map(({ path, name = path, text, head }, index) => {
      const fileParser = parsers[index]!
      if (head) return { path, name, text, types: "", parser: fileParser, head }
      const own = fileParser === parser ? {} : { parser: fileParser }
      const fileScope = new P.FileScope({ name, path, parentScope: scope, ...own })
      const types = fileParser.declaredTypes(text).join()
      const parse = new P.IncrementalParse({ parser: fileParser, scope: fileScope, text, keepLastGood })
      return { path, name, text, types, parser: fileParser, parse }
    })
    for (const file of this.files) if (file.head && (parsesAlone?.(file.path) ?? true)) this.parseAloneFile(file)
  }

  /** `IncrementalParse` for file `path`, if it's one of ours and has parsed. */
  getFile(path: string): P.IncrementalParse | undefined {
    return this.files.find((file) => file.path === path)?.parse
  }

  /** Is file `path` one of ours, parsed or not? */
  has(path: string): boolean {
    return this.files.some((file) => file.path === path)
  }

  /** Is file `path` alone (`P.FileHead`)? */
  isAlone(path: string): boolean {
    return !!this.files.find((file) => file.path === path)?.head
  }

  /**
   * Parse alone file `path` now, if it hasn't:  it's the page about to be shown.
   * - Returns its parse when this parsed it;  `undefined` when there was nothing to do.
   */
  parseAlone(path: string): P.IncrementalParse | undefined {
    const file = this.files.find((it) => it.path === path)
    if (!file?.head || file.parse) return undefined
    return this.parseAloneFile(file)
  }

  /** Parse alone `file`, in a scope and with a parser of its own -- see the class. */
  private parseAloneFile(file: IncrementalFile): P.IncrementalParse {
    const { scope, keepLastGood } = this
    const parser = file.parser.cloneForAloneFile()
    parser.journal = new P.ParseJournal()
    const own = new P.ProjectScope({ name: scope.name, path: `${scope.path}${file.path}`, parser, parentScope: scope })
    const fileScope = new P.FileScope({ name: file.name, path: file.path, parentScope: own })
    file.parse = new P.IncrementalParse({ parser, scope: fileScope, text: file.text, keepLastGood })
    file.head?.parsed?.(own)
    return file.parse
  }

  /**
   * File `path` now has `text`:  re-parse as little as possible.
   * - Returns every file whose `match` changed, in order:  none, just that file, or that file + every later one.
   * - Throws if `path` isn't one of ours.
   */
  update(path: string, text: string): P.IncrementalParse[] {
    const index = this.files.findIndex((file) => file.path === path)
    const entry = this.files[index]
    if (!entry)
      throw new P.ParserError({ message: `IncrementalProject.update(): unknown file '${path}'`, context: this })
    const head = this.headOf?.(entry.parser, text, path)
    // a file that became alone, or stopped being:  it needs another kind of scope, so start over
    if (!!head !== !!entry.head) {
      this.isBroken = true
      return []
    }
    if (entry.head) return this.updateAlone(entry, text, head!)
    const file = entry.parse!

    try {
      // changed which types, methods or properties it declares:  every line above may read differently
      const { parser } = entry
      const types = parser.declaredTypes(text).join()
      if (this.isBroken) return this.parseAll(path, text)
      // a declaration's line being typed in keeps what it declared till the next full parse;  an edit of many lines
      // (a rename, its head and every call) is a change like any other (epic `editor` I170)
      const keepEdited = this.keepLastGood && changesOneLine(file.text, text)
      // which methods there are:  every call registered ahead of its definition reads again (epic `editor` I170)
      if (parser.changesMethods(this.scope, file.text, text, keepEdited)) return this.parseAll(path, text)
      if (
        types !== entry.types ||
        parser.changesProperties(file.text, text, keepEdited) ||
        parser.changesTypeKinds(file.text, text, keepEdited)
      ) {
        return this.reparseDeclaring(index, text)
      }
      const kindsBefore = this.typeKinds()
      const oldMatch = file.match
      const result = file.update(text)
      if (result === "same") return []
      if (result === "body" || result === "region") return [file]
      // Rewinding took back every later file:  keep those whose lookups find the same, re-parse the rest, in order.
      // Alone files are never in the journal we rewound.
      const { own, later, from } = file.rewound!
      const diff = new P.ParseDiff()
      diff.compare(own, this.journal.entriesFrom(from), oldMatch, file.match)
      const parsed = this.keepOrParse(this.files.slice(index + 1), later, diff)
      // A type line the scan still sees, but the parse no longer reads as one (swallowed by a tag left open above
      // it, `<text>🂠</text`):  what it is changed after all, so every line above may read differently.
      if (this.typeKinds() !== kindsBefore) return this.parseAll(path, text)
      return [file, ...parsed]
    } catch (error) {
      // e.g. a rule's `getAST()` crashed while committing a line -- a full parse would crash too.
      this.isBroken = true
      throw error
    }
  }

  /** Journal shared by every file. */
  private get journal(): P.ParseJournal {
    return this.scope.parser!.journal!
  }

  /**
   * File `index` now has `text`, which changes what it declares:  stub it again, then keep every other file whose
   * lookups find the same, and parse it and the rest again (epic `language` P59).
   * - Takes back everything, as `parseAll()` does, then puts back what it can:
   *   - every other file's stubs, as they were;  this file's, from `text`, its types the same records where they can be
   *   - each file in order:  this one parsed again;  each other one kept, if its lookups find the same
   *     (`P.ParseDiff.keepPlan()`), else parsed again too
   * - Before, every file parsed again:  ~150-230ms for a member renamed in Solitaire's first file.
   * - Falls back on `parseAll()` when this file's types are another's too:  only the first file's stub stands.
   */
  private reparseDeclaring(index: number, text: string): P.IncrementalParse[] {
    const { journal, scope } = this
    const edited = this.files[index]!
    const path = edited.path
    const types = edited.parser.declaredTypes(text)
    const others = new Set(this.files.flatMap((file, at) => (at === index ? [] : file.types.split(","))))
    const shared = [...types, ...edited.types.split(",")].some((name) => name && others.has(name))
    if (shared || !journal.has(this.startMark) || !this.stubsEndMark) return this.parseAll(path, text)

    const undone = journal.rewindTo(this.startMark)
    const at = (mark: P.JournalMark) => undone.indexOf(mark)
    const diff = new P.ParseDiff()

    // alone files' heads, then the stubs:  every other file's as they were, this one's again
    journal.replay(undone.slice(0, at(this.stubMarks[0]?.mark ?? this.stubsEndMark)))
    const ends = [...this.stubMarks.slice(1).map(({ mark }) => mark), this.stubsEndMark]
    this.stubMarks = this.stubMarks.map((stub, segment) => {
      const old = undone.slice(at(stub.mark), at(ends[segment]!))
      if (stub.file !== index) {
        journal.replay(old)
        return stub
      }
      const mark = journal.mark()
      STUBS[stub.kind]!(edited.parser, scope, [text], stubbedTypesIn(old))
      diff.compare(old, journal.entriesFrom(mark))
      return { ...stub, mark }
    })
    this.stubsEndMark = journal.mark()

    // then each file, in order:  this one parsed again, each other one kept if it can be
    edited.types = types.join()
    const parsed = this.keepOrParse(this.files, undone, diff, { index, text })
    const aloneParsed = this.files.flatMap((file) => {
      if (!file.head || !file.parse) return []
      file.parse = undefined
      return [this.parseAloneFile(file)]
    })
    this.isBroken = false
    return [...parsed, ...aloneParsed]
  }

  /**
   * After an earlier file parsed again, with what changed in `diff`:  each of `files` in order, kept or parsed again.
   * - `undone`:  what was taken back, holding each file's journal entries from its last parse.
   * - A file is kept if its lookups find the same (`P.ParseDiff.keepPlan()`):
   *   its entries put back, made again onto the records as they are now, and its lines pointed at the new records.
   * - Else it parses again, and what it changed goes in `diff` too, for the files after it.
   * - `edited`:  file `index` has new `text`, and always parses again.
   * - Returns the files that parsed again.  Alone files are never in the journal:  left alone.
   */
  private keepOrParse(
    files: IncrementalFile[],
    undone: P.JournalEntry[],
    diff: P.ParseDiff,
    edited?: { index: number; text: string }
  ): P.IncrementalParse[] {
    const { journal } = this
    const parsed: P.IncrementalParse[] = []
    const last = files.reduce((found, file, at) => (!file.head && file.parse ? at : found), -1)
    for (const [at, file] of files.entries()) {
      const { parse } = file
      if (file.head || !parse) continue
      const start = undone.indexOf(parse.startMark)
      const end = undone.indexOf(parse.endMark)
      const old = start === -1 || end === -1 ? [] : undone.slice(start, end + 1)
      const isEdited = edited && this.files[edited.index] === file
      if (!isEdited && old.length) {
        const roots: unknown[] = [parse.match, ...parse.items.map((item) => item.match)]
        const plan = diff.keepPlan(old, parse.outline, roots, parse.text)
        if (plan) {
          // pointed at the new records first:  a field its entries set again is set to the new one
          for (const [holder, key, value] of plan) (holder as Record<string, unknown>)[key] = value
          journal.replay(old)
          continue
        }
      }
      const oldMatch = parse.match
      parse.parseAll(isEdited ? edited.text : parse.text)
      // what it changed only counts for a file after it
      if (at < last) diff.compare(old, journal.entriesFrom(parse.startMark), oldMatch, parse.match)
      parsed.push(parse)
    }
    return parsed
  }

  /**
   * What each type the project declares IS, as parsed:  `Foundation<Pile[Card]`, a stub `?Foundation`.
   * - What `update()` compares across a rewind:  `parser.changesTypeKinds()` only sees the text's type lines,
   *   and an item above a type, kept as it was, read what that type was (`the cards in the foundations`).
   */
  private typeKinds(): string {
    return (this.scope.types?.get() ?? [])
      .map(({ name, stub, superType, itemType }) => `${stub ? "?" : ""}${name}<${superType ?? ""}[${itemType ?? ""}]`)
      .join()
  }

  /**
   * Alone file `entry` now has `text`:  it alone parses again, unless what the project knows of it changed.
   * - Not parsed yet:  it just keeps the text, for when it does.
   */
  private updateAlone(entry: IncrementalFile, text: string, head: P.FileHead): P.IncrementalParse[] {
    entry.text = text
    if (head.key !== entry.head!.key) {
      entry.head = head
      return this.parseAll(entry.path, text)
    }
    const { parse } = entry
    if (!parse) return []
    return parse.update(text) === "same" ? [] : [parse]
  }

  /**
   * Re-parse every file from scratch, with file `path` now `text`.
   * - When:  an `update()` threw, or changed which types, methods or properties a file declares.
   * - Rewinds to our `startMark`, taking back everything, then stubs what the files declare NOW.
   * - Alone files that had parsed parse again, after the rest:  what they read may have changed.
   */
  private parseAll(path: string, text: string): P.IncrementalParse[] {
    const parser = this.scope.parser!
    if (parser.journal?.has(this.startMark)) parser.journal.rewindTo(this.startMark)
    const texts = this.files.map((file) => (file.path === path ? text : (file.parse?.text ?? file.text)))
    for (const file of this.files) file.head?.declareIn(this.scope)
    const rest = this.files.flatMap((file, index) => (file.head ? [] : [{ file, text: texts[index]! }]))
    this.stub(rest.map(({ file, text: its }) => ({ text: its, parser: file.parser, index: this.files.indexOf(file) })))
    for (const { file, text: its } of rest) {
      file.types = file.parser.declaredTypes(its).join()
      file.parse!.parseAll(its)
    }
    const aloneParsed = this.files.flatMap((file, index) => {
      if (!file.head || !file.parse) return []
      file.text = texts[index]!
      file.parse = undefined
      return [this.parseAloneFile(file)]
    })
    this.isBroken = false
    return [...rest.map(({ file }) => file.parse!), ...aloneParsed]
  }

  /**
   * Stub what `files` declare, before any file parses:  every one's types, then its variables, methods and properties.
   * - Each file by its own parser:  another language's declares in its own words.
   */
  private stub(files: Array<{ text: string; parser: P.Parser; index: number }>): void {
    const journal = this.scope.parser!.journal!
    this.stubMarks = []
    STUBS.forEach((stub, kind) => {
      for (const { text, parser, index } of files) {
        this.stubMarks.push({ kind, file: index, mark: journal.mark() })
        stub(parser, this.scope, [text])
      }
    })
    this.stubsEndMark = journal.mark()
  }
}

/** Where one file's stubs of one kind start in the journal:  see `IncrementalProject.stubMarks`. */
type StubMark = { kind: number; file: number; mark: P.JournalMark }

/**
 * Each kind of stub, in the order every file's are made:  types first, so the rest can name them.
 * - `reuse`:  type stubs made before, for the types to be the same records again -- see `P.Parser.stubDeclaredTypes()`.
 */
const STUBS: Array<(parser: P.Parser, scope: P.Scope, texts: string[], reuse?: P.TypeScope[]) => void> = [
  (parser, scope, texts, reuse) => void parser.stubDeclaredTypes(scope, texts, reuse),
  (parser, scope, texts) => parser.stubDeclaredVariables(scope, texts),
  (parser, scope, texts) => parser.stubDeclaredMethods(scope, texts),
  (parser, scope, texts) => parser.stubDeclaredProperties(scope, texts)
]

/** The type stubs journal `entries` added:  what `STUBS` can add again for a file's types. */
function stubbedTypesIn(entries: P.JournalEntry[]): P.TypeScope[] {
  return entries.flatMap((entry) => {
    const change = "undo" in entry ? entry.change : undefined
    return change?.kind === "list" ? change.items.filter((item) => item instanceof P.TypeScope) : []
  })
}

/** One of `IncrementalProject`'s files:  see `IncrementalProject.files`. */
export type IncrementalFile = {
  path: string
  /** Name for its scope, e.g. in error messages. */
  name: string
  /** Its text as handed to us:  an alone file's latest, until it parses. */
  text: string
  types: string
  parser: P.Parser
  head?: P.FileHead
  parse?: P.IncrementalParse
}

/**
 * What a project knows of a file ALONE:  one a language says holds one thing and nothing else (`IncrementalProject`).
 * - Read from its text with no parse, by the language:  spell's page alone in its file, `SP.AlonePage`.
 */
export type FileHead = {
  /** Same `key` after an edit:  the project reads the same, and only the file parses again. */
  key: string
  /** Make what's known of the file known in `scope`, the project's.  Journaled, if there's a journal. */
  declareIn(scope: P.Scope): void
  /** The file has just parsed, into `own`, its scope. */
  parsed?(own: P.Scope): void
}

/** Constructor props for `IncrementalProject`. */
export type IncrementalProjectProps = {
  /** Project scope to parse into -- its `parser` does the parsing, and gets a journal. */
  scope: P.Scope
  /**
   * Should a line edited into a broken state keep its last working declarations?  Default `false`.
   * - `true` suits an editor:  one half-typed line doesn't break every line after it.
   */
  keepLastGood?: boolean
  /** Reads a file's head after an edit:  `undefined` when it isn't alone.  None:  no file is ever alone. */
  headOf?: (parser: P.Parser, text: string, path: string) => P.FileHead | undefined
  /** Should alone file `path` parse now?  Default:  all do.  The others wait for `parseAlone()`. */
  parsesAlone?: (path: string) => boolean
  /** Files to parse, in order. */
  files: Array<{
    /** Unique path, as passed to `update()`. */
    path: string
    /** Name for the file's scope, e.g. in error messages.  Default `path`. */
    name?: string
    /** File contents. */
    text: string
    /**
     * Parser it parses with, if not the project scope's, e.g. one reading another human language.
     * - MUST share the project's own rules:  see spell's `SpellParser.twinFor()`.
     */
    parser?: P.Parser
    /** It's alone, and this is what the project knows of it. */
    head?: P.FileHead
  }>
}

/**
 * Is `after` `before` with one line changed, and no line added or taken away:  a line being typed in?
 * - What `IncrementalProject.update()` lets keep its declarations till the next full parse (`keepLastGood`).
 */
function changesOneLine(before: string, after: string): boolean {
  const was = before.split("\n")
  const now = after.split("\n")
  if (was.length !== now.length) return false
  let changed = 0
  for (let at = 0; at < was.length && changed < 2; at++) if (was[at] !== now[at]) changed++
  return changed <= 1
}
