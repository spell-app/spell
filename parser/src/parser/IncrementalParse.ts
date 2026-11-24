import { P } from "spell/parser/parser"

/**
 * Parse one file so that after an edit, `update(newText)` can re-use as much of the last parse as possible --
 * e.g. on every keystroke in an editor.  Usually one of several files in a `P.IncrementalProject`.
 * - Parses TOP-LEVEL ITEMS one by one:  the `tokens` of the file's root `BlockToken`, each a line or an indented
 *   block.  An item's match covers one of them, or two for a header line + its indented body.
 * - Before each item, marks the parser's `journal` -- see `P.ParseJournal` -- so we can take back everything
 *   from that item on, e.g. the types and rules it declared, and re-parse from there as if it never happened.
 * - `update()`, cheapest first:
 *   - only ONE item's indented body changed:  rewind to just before that body, re-parse it, then replay
 *     everything after it -- later items and later files are kept as they are.
 *     Only if the body's changes stay inside it -- see `Parser.reparseBody()`.
 *     - First, the innermost body inside it, if only one changed:  one method's steps in a type's body
 *       (`Parser.reparseInnerBody()`), keeping the type and its other members as well.
 *   - otherwise:  rewind to the first changed item, and re-parse from there to the end of the file.
 *     That also took back every LATER file, which must be re-parsed too -- `P.IncrementalProject` does that.
 * - With `keepLastGood`, a line being edited into a BROKEN state keeps its last working declarations, so later
 *   lines still parse as they did -- see `parseItem()`.  Deliberately NOT what a full parse gives, so opt-in.
 * - Language hooks are `Parser` methods:  `tokenizeRoot()`, `parseItem()`, `isBrokenItem()`, `getBodyMark()`,
 *   `reparseBody()`, `assembleFile()`.  Without them we re-parse the whole file every time.
 */
export class IncrementalParse {
  /** Parser for the file -- supplies the language hooks, and its `journal` records what parsing changes. */
  declare parser: P.Parser
  /** File's scope, kept across updates. */
  declare scope: P.Scope
  /** Text of the last parse. */
  declare text: string
  /** File match from the last parse, if it parsed:  `tokens` is `[root BlockToken]`, `matched` the item matches. */
  declare match: P.Match | undefined
  /** Top-level items of the last parse, in order. */
  declare items: IncrementalItem[]
  /** Journal mark before our first item. */
  declare startMark: P.JournalMark
  /** Journal mark after our last item, i.e. before the next file's. */
  declare endMark: P.JournalMark
  /** What our last `update()` did, e.g. for tests / debugging. */
  lastUpdate: IncrementalUpdate | undefined
  /** Should a line edited into a broken state keep its last working declarations?  See `parseItem()`. */
  declare keepLastGood: boolean
  /**
   * What our parses looked up in shared state, since we last parsed from scratch -- see `P.Outline`.
   * - `P.IncrementalProject` keeps us when an earlier file parses again, if nothing we looked up changed.
   */
  readonly outline = new P.Outline()
  /**
   * When our last `update()` or `parseAll()` rewound, what it took back:  our own entries from then (`own`),
   * and every later file's after them (`later`) -- `undefined` if it didn't.
   * - `from`:  the mark our entries now start from, where our own re-parse went back to.
   * - So `P.IncrementalProject` can compare our parse then and now, and put back later files it can keep
   *   (epic `language` P59).
   */
  rewound: { own: P.JournalEntry[]; later: P.JournalEntry[]; from: P.JournalMark } | undefined

  /**
   * Parse `text` in `scope` from scratch.
   * - SIDE EFFECT: gives `parser` a `journal` if it hasn't got one.
   */
  constructor({ parser, scope, text, keepLastGood = false }: IncrementalParseProps) {
    Object.assign(this, { parser, scope, keepLastGood })
    parser.journal ??= new P.ParseJournal()
    this.parseAll(text)
  }

  /** Journal shared by every file parsed with our parser. */
  get journal(): P.ParseJournal {
    return this.parser.journal!
  }

  /** Root `BlockToken` of the last parse, if it had one. */
  get root(): P.BlockToken | undefined {
    const [root] = this.match?.tokens ?? []
    return root instanceof P.BlockToken ? root : undefined
  }

  /**
   * Parse `text` from scratch, first taking back our last parse -- and everything after it -- if still in the journal.
   * - Also how `P.IncrementalProject` re-parses a later file after an earlier one rewound.
   */
  parseAll(text: string) {
    this.rewound = undefined
    if (this.startMark && this.journal.has(this.startMark))
      this.noteRewound(this.journal.rewindTo(this.startMark), this.startMark)
    else this.startMark = this.journal.mark()
    this.text = text
    this.outline.clear()
    this.outline.noting(() => {
      const root = this.parser.tokenizeRoot(text)
      if (!root) {
        // Can't go item by item:  parse it whole.
        this.items = []
        this.match = this.scope.parse(text, this.parser.defaultRule)
      } else {
        this.items = this.parseItems(root.tokens, 0)
        this.match = this.assemble(root, root.tokens)
      }
    })
    this.endMark = this.journal.mark()
  }

  /** Note what rewinding to `from` took back, `undone`:  see `rewound`. */
  private noteRewound(undone: P.JournalEntry[], from: P.JournalMark) {
    // rewound to our end:  all of it is later files'
    const end = from === this.endMark ? 0 : undone.indexOf(this.endMark) + 1 || undone.length
    this.rewound = { own: undone.slice(0, end), later: undone.slice(end), from }
  }

  /**
   * Re-parse for `text`, re-using what we can of the last parse.
   * - `"same"`:  nothing changed.
   * - `"body"`:  just one indented body was re-parsed.  Everything else, later files included, was kept.
   * - `"region"`:  just the changed items were re-parsed.  Everything after them, later files included, was kept.
   * - `"rewound"`:  re-parsed from the first changed item on.  Every LATER file was taken back, and MUST be
   *   re-parsed with `parseAll()`.
   * - `span`:  where the text changed (`P.EditedSpan`), if the caller knows:  the items wholly before or after it are
   *   known to be the same without comparing their text.  A span that doesn't fit the texts is ignored.
   * - SIDE EFFECT: kept tokens after the edit are moved to their new offsets / lines.
   */
  update(text: string, span?: P.EditedSpan): IncrementalUpdate {
    this.rewound = undefined
    const edited = P.EditedSpan.fits(span, this.text, text) ? span : undefined
    return (this.lastUpdate = this.outline.noting(() => this.reparse(text, edited)))
  }

  /** Does `update()`'s work. */
  private reparse(text: string, span: P.EditedSpan | undefined): IncrementalUpdate {
    if (text === this.text) return "same"
    const oldRoot = this.root
    const newRoot = this.parser.tokenizeRoot(text)
    if (!oldRoot || !newRoot) {
      this.parseAll(text)
      return "rewound"
    }
    const oldItems = oldRoot.tokens
    const newItems = newRoot.tokens

    // How many items are the same at the start, and at the end?
    const shortest = Math.min(oldItems.length, newItems.length)
    let before = 0
    const oldText = this.text
    const same = (oldIndex: number, newIndex: number) =>
      itemsMatch({ items: oldItems, text: oldText, index: oldIndex }, { items: newItems, text, index: newIndex }, span)
    while (before < shortest && same(before, before)) before++
    let after = 0
    while (after < shortest - before && same(oldItems.length - 1 - after, newItems.length - 1 - after)) {
      after++
    }

    // Only one item changed, and it's an indented body on both sides?
    if (oldItems.length === newItems.length && before + after === oldItems.length - 1) {
      if (this.updateBody(before, oldRoot, newRoot, text)) return "body"
    }

    // Re-parse from the item holding the first change -- or the one BEFORE it if the change starts with an
    // indented block, which that item may now take as its body.
    const holding = this.items.findIndex((item) => item.index + item.length > before)
    let from = holding === -1 ? this.items.length : holding
    if (from > 0 && this.items[from]?.index === before && newItems[before] instanceof P.BlockToken) from--
    const firstToken = this.items[from]?.index ?? oldItems.length
    const rewoundTo = this.items[from]?.mark ?? this.endMark
    const undone = this.journal.rewindTo(rewoundTo)
    const kept = this.items.slice(0, from)
    const region: IncrementalItem[] = []
    this.text = text

    // Once we're back in step with the unchanged items at the end, try keeping them -- see `canKeepFrom()`.
    const shift = newItems.length - oldItems.length
    const tailStart = newItems.length - after
    let triedToKeep = false
    let index = firstToken
    while (index < newItems.length) {
      const keepFrom =
        index >= tailStart && !triedToKeep ? this.items.findIndex((item) => item.index === index - shift) : -1
      if (keepFrom !== -1) {
        triedToKeep = true
        if (this.canKeepFrom(keepFrom, from, region, kept)) {
          // Put back everything from there on -- later files included -- instead of re-parsing it.
          // NOTE: if we rewound to the first kept item's own mark, it's still in the journal BEFORE `region`:
          //  give that item a new mark after `region`, and put back everything we undid.
          const keepMark = this.items[keepFrom]!.mark
          const rewoundToKept = keepFrom === from
          const newKeepMark = rewoundToKept ? this.journal.mark() : keepMark
          this.journal.replay(rewoundToKept ? undone : undone.slice(undone.indexOf(keepMark)))
          const laterTokens = oldItems.slice(index - shift)
          const tokens = [...oldItems.slice(0, firstToken), ...newItems.slice(firstToken, index), ...laterTokens]
          const later = this.items.slice(keepFrom).map((item, i) => ({
            ...item,
            index: item.index + shift,
            mark: i === 0 ? newKeepMark : item.mark
          }))
          this.items = [...kept, ...region, ...later]
          this.match = this.assemble(newRoot, tokens)
          this.parser.tokenizer.moveTokens(laterTokens, newItems[index]!.start - laterTokens[0]!.start, text)
          return "region"
        }
      }
      // Editing within one item?  Then it can keep that item's last working declarations -- see `parseItem()`.
      const singleEdit = oldItems.length === newItems.length && index === firstToken && firstToken === before
      const item = this.parseItem(newItems, index, singleEdit ? this.items[from] : undefined)
      region.push(item)
      index += item.length
    }

    const tokens = [...oldItems.slice(0, firstToken), ...newItems.slice(firstToken)]
    this.noteRewound(undone, rewoundTo)
    this.items = [...kept, ...region]
    this.match = this.assemble(newRoot, tokens)
    this.endMark = this.journal.mark()
    return "rewound"
  }

  /**
   * After re-parsing `region` in place of our old items `from` up to `keepFrom`, can we keep our old items from
   * `keepFrom` on -- and every later file -- rather than re-parse them?
   * - Only if they'd parse exactly the same, i.e. state going into them is the same as before:
   *   - nothing in the old or new region changes `"global"` scope, e.g. declares a type or a rule
   *   - the file's own variables have the same names -- and output names -- after the new region as after
   *     the old one, e.g. `set x to 1` changed to `set x to 2`
   */
  private canKeepFrom(keepFrom: number, from: number, region: IncrementalItem[], kept: IncrementalItem[]) {
    const oldRegion = this.items.slice(from, keepFrom)
    // One broken item standing in for the same last good version as before => exactly the same changes.
    const [oldItem, newItem] = [oldRegion[0], region[0]]
    const sameChanges =
      oldRegion.length === 1 &&
      region.length === 1 &&
      !!newItem!.keptLastGood &&
      newItem!.lastGood === oldItem!.lastGood
    const changesGlobalScope = (item: IncrementalItem) =>
      !!item.match && IncrementalParse.changesGlobalScope(item.match)
    if (!sameChanges && (oldRegion.some(changesGlobalScope) || region.some(changesGlobalScope))) return false
    const oldVariables = this.items[keepFrom - 1]?.variables
    const newVariables = (region.at(-1) ?? kept.at(-1))?.variables
    return oldVariables === newVariables
  }

  /**
   * Try to re-parse just the indented body at `index`, keeping everything else -- see `update()`.
   * - Returns `false` (having changed nothing) if that's not possible or not safe.
   */
  private updateBody(index: number, oldRoot: P.BlockToken, newRoot: P.BlockToken, text: string): boolean {
    const oldBody = oldRoot.tokens[index]
    const newBody = newRoot.tokens[index]
    if (!(oldBody instanceof P.BlockToken && newBody instanceof P.BlockToken)) return false
    const position = this.items.findIndex((item) => item.match?.tokens[1] === oldBody)
    const item = this.items[position]

    // Just one body inside it, e.g. one method's steps in a type's body?  Then the rest of it is kept too.
    const inner = item?.match && this.parser.reparseInnerBody(item.match, newBody, { oldText: this.text, text })
    if (inner) {
      this.items[position] = { ...item!, match: inner }
      this.keepAround(index, oldRoot, newRoot, inner.tokens[1] as P.BlockToken, text)
      return true
    }
    const bodyMark = item?.match && this.parser.getBodyMark(item.match)
    if (!item?.match || !bodyMark || !this.journal.has(bodyMark)) return false

    // Take back the body and everything after it, re-parse the body, then put back the rest.
    const undone = this.journal.rewindTo(bodyMark)
    const nextMark = this.items[position + 1]?.mark ?? this.endMark
    const later = undone.slice(undone.indexOf(nextMark))
    const newMatch = this.parser.reparseBody(item.match, newBody)
    if (!newMatch) {
      // Not safe after all:  put everything back as it was.
      this.journal.rewindTo(bodyMark)
      this.journal.replay(undone)
      return false
    }
    this.journal.replay(later)
    this.items[position] = { ...item, match: newMatch }
    this.keepAround(index, oldRoot, newRoot, newBody, text)
    return true
  }

  /**
   * After the body at `index` was re-parsed as `body`:  our match, in one root with the other items' tokens, kept,
   * and moved by however much the body grew or shrank.
   */
  private keepAround(index: number, oldRoot: P.BlockToken, newRoot: P.BlockToken, body: P.BlockToken, text: string) {
    const laterTokens = oldRoot.tokens.slice(index + 1)
    const tokens = [...oldRoot.tokens.slice(0, index), body, ...laterTokens]
    this.match = this.assemble(newRoot, tokens)
    const delta = laterTokens.length ? newRoot.tokens[index + 1]!.start - laterTokens[0]!.start : 0
    this.parser.tokenizer.moveTokens(laterTokens, delta, text)
    this.text = text
  }

  /** Parse `tokens` from `index` on, one item at a time -- see `parseItem()`. */
  private parseItems(tokens: P.Token[], index: number): IncrementalItem[] {
    const items: IncrementalItem[] = []
    while (index < tokens.length) {
      const item = this.parseItem(tokens, index)
      items.push(item)
      index += item.length
    }
    return items
  }

  /**
   * Parse the item at `index` of `tokens`, marking the journal first.
   * - With `keepLastGood`:
   *   - an item which ISN'T broken records its journal entries as its `lastGood`
   *   - a broken item which is an edit of `oldItem` (same number of tokens) swaps what it changed for `oldItem`'s
   *     `lastGood` entries, so later items still see e.g. the type it used to declare.  Its broken match stays,
   *     so its errors still show.
   */
  private parseItem(tokens: P.Token[], index: number, oldItem?: IncrementalItem): IncrementalItem {
    const mark = this.journal.mark()
    const start = this.journal.length
    const match = this.parser.parseItem(this.scope, tokens.slice(index))
    // Didn't parse => skip it, as `Block.parse()` does.
    const length = match?.length || 1
    const item: IncrementalItem = { mark, index, length, match, variables: "" }
    if (this.keepLastGood) {
      if (!this.parser.isBrokenItem(match)) item.lastGood = this.journal.slice(start)
      else if (oldItem?.lastGood && oldItem.length === length) {
        this.journal.rewindTo(mark)
        this.journal.replay(oldItem.lastGood)
        item.lastGood = oldItem.lastGood
        item.keptLastGood = true
      }
    }
    item.variables = (this.scope.variables?.get() ?? [])
      .map(({ name, output }) => (output ? `${name}=${output}` : name))
      .join(",")
    return item
  }

  /** File match for `root` holding `tokens`, from our item matches. */
  private assemble(root: P.BlockToken, tokens: P.Token[]): P.Match | undefined {
    const matches = this.items.map((item) => item.match).filter((match): match is P.Match => !!match)
    const fileRoot = new P.BlockToken({ ...root.record, tokens: tokens as P.BlockToken["tokens"] })
    return this.parser.assembleFile(this.scope, fileRoot, matches)
  }

  /**
   * Does `match`, or anything inside it, change `"global"` scope?
   * - `true` => re-parsing it could change how anything after it parses -- see `Rule.getScopeChanges()`.
   */
  static changesGlobalScope(match: P.Match): boolean {
    if (match.rule.getScopeChanges(match) === "global") return true
    return match.matched.some((item) => item instanceof P.Match && IncrementalParse.changesGlobalScope(item))
  }
}

/** Constructor props for `IncrementalParse`. */
export type IncrementalParseProps = {
  /** Parser to parse with -- shared by every file of a project. */
  parser: P.Parser
  /** File's scope. */
  scope: P.Scope
  /** Text to parse. */
  text: string
  /** Should a line edited into a broken state keep its last working declarations?  Default `false`. */
  keepLastGood?: boolean
}

/** One top-level item of an `IncrementalParse`. */
export type IncrementalItem = {
  /** Journal mark just before we parsed it. */
  mark: P.JournalMark
  /** Index of its first token in the root `BlockToken`. */
  index: number
  /** How many root tokens it covers:  2 for a header line + its indented body. */
  length: number
  /** Its match, or `undefined` if it didn't parse. */
  match: P.Match | undefined
  /**
   * The file's own variables after it, with output names if different, e.g. `"x,it=it_2"` -- see `canKeepFrom()`.
   * - Output names matter:  a later `get` declares `it_3` rather than `it_2` if an earlier one was added.
   */
  variables: string
  /** With `keepLastGood`:  journal entries of its last parse which wasn't broken -- see `parseItem()`. */
  lastGood?: P.JournalEntry[]
  /** `true` if it's broken, so its `lastGood` entries stand in for what it would change. */
  keptLastGood?: boolean
}

/** What `IncrementalParse.update()` did -- see there. */
export type IncrementalUpdate = "same" | "body" | "region" | "rewound"

/**
 * Is an old item the same as a new one:  same kind, same source text, same indent?
 * - An item's source runs from its `start` to the next item's, as `LineToken` / `BlockToken` have no `raw`.
 * - Compares `indent` too, as a blank line's comes from the line AFTER it.
 * - With `span`:  two items at the same place wholly before it, or wholly after it, have the same text without
 *   comparing it (epic `solid-2-final` P9).
 */
function itemsMatch(old: ItemAt, now: ItemAt, span: P.EditedSpan | undefined) {
  const oldItem = old.items[old.index]!
  const newItem = now.items[now.index]!
  if (oldItem.constructor !== newItem.constructor) return false
  if ((oldItem as P.LineToken).indent !== (newItem as P.LineToken).indent) return false
  const oldEnd = itemEnd(old)
  const newEnd = itemEnd(now)
  if (span) {
    // before the change:  the same offsets in both
    if (oldItem.start === newItem.start && oldEnd === newEnd && oldEnd <= span.from) return true
    // after it:  the same offsets, each from its text's end of the change
    const startsAfter = oldItem.start >= span.to && newItem.start >= span.toNew
    if (
      startsAfter &&
      oldItem.start - span.to === newItem.start - span.toNew &&
      oldEnd - span.to === newEnd - span.toNew
    )
      return true
  }
  return old.text.slice(oldItem.start, oldEnd) === now.text.slice(newItem.start, newEnd)
}

/** An item of a parse, by its place in the root's tokens, and that parse's text. */
type ItemAt = { items: P.Token[]; text: string; index: number }

/** Where item `index`'s source ends:  the next item's start, or the text's end. */
function itemEnd({ items, text, index }: ItemAt): number {
  return items[index + 1]?.start ?? text.length
}
