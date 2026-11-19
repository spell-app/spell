import {
  type EditorState,
  type Extension,
  type Line,
  type Range,
  StateEffect,
  StateField,
  type Text as Doc,
  type Transaction
} from "@codemirror/state"
import { Decoration, type DecorationSet, EditorView, ViewPlugin, WidgetType } from "@codemirror/view"

import { SP } from "spell/parser/spell"
import { BubblyHtml } from "spell/app/app/components/spell-code/BubblyHtml"
import { CodeMirrorDecorations, CodeMirrorMarkup, type Indent, type Rail } from "./CodeMirrorMarkup"
import { CodeMirrorRelayout } from "./CodeMirrorRelayout"
import { CodeMirrorSelection } from "./CodeMirrorSelection"

/****************
 * ### `CodeMirrorBubbly`
 * Spell drawn in the bubbly look in a CodeMirror editor,
 * from the parser's `SP.BubblyLayout`, the same data the page's `BubblyHtml` draws from
 * (epic `editor` P30, the CodeMirror test;  epic `codemirror` P3).
 * - Everything is a REAL element in the text's own lines, laid out by the browser:
 *   - each declaration's head on a band:  a mark round its words (`cmb-band`), in its part of speech's colour;
 *     a head's description, `-- A playing card`, at the band's right end, the band reaching the editor's edge (Owen);
 *     one that doesn't fit there is cut short with a `…`, so the head stays one line (`DescriptionRoom`)
 *   - its body's rail:  a line decoration on every line under it, a stripe per enclosing block (`--cmb-rails`)
 *   - its foot:  drawn in the line under its last line, taking no room of its own (`FeetWidget`):  every line is one
 *     line tall, so CodeMirror's guess at the height of lines it hasn't drawn is always right (epic `codemirror` P7)
 *   - folded:  its head alone, a pill, the fold's `…` in its right end (`CodeMirrorSetup`;  epic `language` I116)
 *   - what a person typed in white pills, a quoted one's curly marks, bold names, italic values, faint marks,
 *     one dotted line under each value and question:  marks in the classes of the look's one sheet, `bubbly.css`
 *   - a drawing's tags as HTML is drawn, its ends pointed, from the page's own reading of markup
 *     (`CodeMirrorMarkup`, `BubblyMarkup`):  a `{…}` an inverted pill
 * - `slice`:  a range of the file shown alone (`<CodeSlice>`):  only what's wholly in its lines is drawn, so a block it
 *   cuts draws no band or rail cut off at its edges.
 * - No layer behind the text, no injected text for room round Spell's pills:  padding round a pill is the pill's own,
 *   and the caret still lands on its letters, as CodeMirror measures the lines as they're drawn.
 * - Typing never waits for the layout:  CodeMirror moves the marks with the text,
 *   and the layout is worked out again once the typing pauses (`RELAYOUT_MSEC`, `CodeMirrorRelayout`).
 *   - A blank body line the edit wrote is drawn at once, so the caret on it never moves (`blankLinesDrawn()`, I158).
 * - The editor's box is a `.bubbly` too (`EDITOR_CLASSES`), so the sheet's settings and rules reach it:
 *   its CodeMirror section draws the bands, rails, feet and tags.
 * - Its position in the import graph:  the parser's types and layout, CodeMirror, the shared marks.
 * - NEVER throws:  a layout that fails leaves the code plain, and logs why.
 ****************/
export class CodeMirrorBubbly {
  /**
   * The extension drawing a Spell file bubbly.
   * - `fileOf()`:  the project file the editor shows, if it is one, so the layout reads the project's own parse of it.
   * - `sliceOf(state)`:  the lines shown, when it's a slice of its file (`FileStates.showSlice()`)
   */
  static extension(
    fileOf: () => SP.SpellFile | undefined,
    sliceOf: (state: EditorState) => Slice | undefined = () => undefined
  ): Extension {
    return [
      CodeMirrorRelayout.extension(
        (state) => CodeMirrorBubbly.decorationsOf(state, fileOf(), sliceOf(state)),
        CodeMirrorBubbly.RELAYOUT_MSEC,
        {
          isAwaitingParse: () => CodeMirrorRelayout.isUnparsed(fileOf()),
          // a project's file just typed in:  its project parses it again once the typing pauses
          isParseOnItsWay: (state) => {
            const file = fileOf()
            return !!file?.match && !SP.BubblyLayout.isParseOf(file, state.doc.toString())
          },
          drawnAtOnce: (decorations, transaction) =>
            blankLinesDrawn(decorations, transaction, sliceOf(transaction.state)?.hiddenIndent)
        }
      ),
      EditorView.editorAttributes.of({ class: EDITOR_CLASSES }),
      CodeMirrorMarkup.tabStops,
      CodeMirrorMarkup.tagBlocks,
      CodeMirrorSelection.extension,
      DescriptionRoom.extension
    ]
  }

  /** How long the typing must pause before the code's laid out again, in msec. */
  static RELAYOUT_MSEC = 150

  /**
   * Every decoration of `state`'s text, laid out bubbly.
   * - `within`:  its project file, whose parse is read when it's of this very text.
   * - `slice`:  the lines shown, when it's a slice:  only what's wholly in them is drawn
   * - NEVER throws:  `Decoration.none` when the layout fails.
   */
  static decorationsOf(state: EditorState, within?: SP.SpellFile, slice?: Slice): DecorationSet {
    const text = state.doc.toString()
    try {
      const parser = within ? SP.Language.forFile(within.path).parser : SP.spellParser
      const drawing = SP.BubblyLayout.of(text, parser, { within })
      return new BubblyDecorations(state, drawing, { isView: (tag) => isViewTag(within, tag), slice }).build()
    } catch (error) {
      console.error("CodeMirrorBubbly:  couldn't lay the code out", error)
      return Decoration.none
    }
  }
}

/**
 * The lines a slice shows, `from` the first's start `to` the last's end:  offsets into its file.
 * - `hiddenIndent`:  how many characters of indent are hidden at the start of each line, when it's shown dedented:
 *   its rails and feet stand that much further left, under its bands (epic `language` I128)
 */
export type Slice = { from: number; to: number; hiddenIndent?: number }

/** The editor's own classes:  a `.bubbly`, so `bubbly.css` reaches it, and ours. */
const EDITOR_CLASSES = "bubbly cmb-editor"

/** One drawing being turned into decorations. */
class BubblyDecorations {
  private readonly decorations: CodeMirrorDecorations
  private readonly text: string
  /** A drawing's tags:  drawn as HTML is (`CodeMirrorMarkup`), so Spell's marks leave them alone. */
  private readonly tags: Array<{ start: number; end: number }> = []
  /** The feet of the blocks ending on each line, by where that line ends, innermost first. */
  private readonly feet = new Map<number, Foot[]>()

  constructor(
    private readonly state: EditorState,
    private readonly drawing: SP.BubblyDrawing,
    private readonly options: {
      /** is a drawing's tag one of the project's own views? */
      isView: (tag: string) => boolean
      /** the lines shown, when it's a slice */
      slice?: Slice | undefined
    }
  ) {
    this.text = drawing.text
    this.decorations = new CodeMirrorDecorations(state, options.slice?.hiddenIndent)
  }

  /** The decorations, sorted as CodeMirror wants them. */
  build(): DecorationSet {
    this.nodes(this.drawing.nodes, [])
    for (const [at, feet] of this.feet) this.drawFeet(at, feet)
    return this.decorations.build()
  }

  /**
   * The feet of the blocks ending on the line that ends `at`, side by side, each at its block's indent
   * (Owen, 2026-11-19:  "feet in a blank line -- I like 'side by side in the blank line' a lot"):
   * - a blank line under it:  along that line's top (`blank`)
   * - a line with words under it:  along the bottom of the block's own last line, so they never sit on those words
   *   (`above`)
   * - nothing under it, the file's end or a slice's:  the same, drawn from the last line itself (`end`)
   * - none takes any room:  the line under keeps its one line's height ("make line spacing completely regular")
   */
  private drawFeet(at: number, feet: Foot[]) {
    const { doc } = this.state
    const last = doc.lineAt(at)
    const next = last.number < doc.lines ? doc.line(last.number + 1) : undefined
    const isNextShown = !!next && (!this.options.slice || next.to <= this.options.slice.to)
    if (!next || !isNextShown) {
      this.decorations.add(FeetWidget.decoration(feet, "end").range(last.to))
      return
    }
    const placement = next.text.trim() ? "above" : "blank"
    this.decorations.add(FeetWidget.decoration(feet, placement).range(next.from))
  }

  /**
   * `nodes`, inside the blocks `rails` holds, outermost first.
   * - `isGroupBody`:  they're a group's body, drawn:  its own lines, its notes, where its members' words are
   *   (`cmb-group-line`;  epic `language` I134)
   */
  private nodes(nodes: SP.BubblyNode[], rails: Rail[], isGroupBody = false) {
    for (let index = 0; index < nodes.length; index++) {
      const node = nodes[index]!
      if (this.isTagLine(node)) {
        index = this.markup(nodes, index, rails)
        continue
      }
      switch (node.kind) {
        case "gap":
          // a group's:  so a blank line written there is drawn as the group's own lines are, at once (I158)
          this.decorations.line(node.start, rails, isGroupBody ? [IN_GROUP] : [])
          break
        case "line":
          this.decorations.line(node.start, rails, isGroupBody ? [GROUP_LINE, IN_GROUP] : [])
          // a plain body line's words where a band's on its level are, a tab in (I142);  a group's are already;
          // a blank one right above a drawing's tags is the drawing's:  a tag typed there starts at its indent (I157)
          if (!isGroupBody && !this.isAboveTags(nodes, index)) this.plainIndent(node)
          this.line(node)
          break
        case "block":
          this.block(node, rails, isGroupBody)
          break
      }
    }
  }

  /**
   * A drawing's lines, from `nodes[first]`, the first that starts with a tag, to the last line before the next block:
   * its tags drawn as HTML is (`CodeMirrorMarkup.within()`), the rest as Spell;  returns the index of its last line.
   */
  private markup(nodes: SP.BubblyNode[], first: number, rails: Rail[]): number {
    let last = first
    while (nodes[last + 1] && nodes[last + 1]!.kind !== "block") last++
    const lines = nodes.slice(first, last + 1).filter((node): node is SP.BubblyLine => node.kind === "line")
    for (const node of nodes.slice(first, last + 1)) if (node.kind !== "block") this.decorations.line(node.start, rails)
    const tags = CodeMirrorMarkup.within(this.decorations, {
      from: lines[0]!.start,
      to: lines.at(-1)!.end,
      rails,
      isView: this.options.isView,
      declaringTags: this.drawing.declaringTags,
      codes: lines.flatMap((line) => line.codes ?? [])
    })
    this.tags.push(...tags)
    for (const line of lines) this.line(line)
    return last
  }

  /**
   * A plain line's indent, in a body:  a tab wider (`cmb-plain-indent`), so its first word is where a band's words on
   * the same level are (Owen, epic `language` I142:  "I'd prefer if `it lives` lined up where `it's name` does").
   * - Its words moved, not the line:  its column 0, the caret's place on the rail (I140), stays where it is.
   * - A blank line, its indent alone:  the caret at its end drawn past that room too,
   *   where its words will go once typed (`WordsPlace`;  epic `language` I157).
   * - A line in no block, or a slice's line shown with no indent, keeps its words where they were.
   */
  private plainIndent(line: SP.BubblyLine) {
    const { from, to } = this.decorations.shownIndentBefore(line.start)
    if (!this.text.slice(from, to).includes("\t")) return
    this.mark(from, to, [PLAIN_INDENT])
    if (isBlank(line)) this.decorations.add(WordsPlace.decoration.range(to))
  }

  /**
   * Is `nodes[index]` a blank line among those right above a drawing's tags (a body's `<deck "deck" />`)?
   * - A tag typed there is drawn from its indent, as the tags under it are:  so the caret stays at the indent's end,
   *   and no room after it moves a `<` being typed (epic `language` I157).
   */
  private isAboveTags(nodes: SP.BubblyNode[], index: number): boolean {
    const isBlankNode = (node: SP.BubblyNode) => node.kind === "gap" || (node.kind === "line" && isBlank(node))
    if (!isBlankNode(nodes[index]!)) return false
    const next = nodes.slice(index + 1).find((node) => !isBlankNode(node))
    return !!next && this.isTagLine(next)
  }

  /** Does `node` start with a tag:  a line of a drawing (`<deck "deck" />`)? */
  private isTagLine(node: SP.BubblyNode): boolean {
    return node.kind === "line" && this.text[node.start] === "<"
  }

  /**
   * A declaration, or a control line with steps under it:  its band, its body, its foot.
   * - `isInGroup`:  it's a group's member, in its body (`IN_GROUP`)
   */
  private block(block: SP.BubblyBlock, rails: Rail[], isInGroup = false) {
    const { head, partOfSpeech } = block
    const isShown = this.isWhollyShown(block)
    // folded:  its head alone, a pill with the fold's `…` in its end;  nothing of its hidden body (I116)
    const isFolded = isShown && this.decorations.isFoldedAt(head.start)
    const hasBody = !isFolded && block.body.some((node) => node.kind !== "gap")
    this.decorations.line(head.start, rails, [...(isShown ? [HEAD] : []), ...(isInGroup ? [IN_GROUP] : [])])
    // a group's band and rail hang a tab out, its rail on its parent's, so its members' bands sit clear of it (I113)
    const isHung = block.isGroup && this.decorations.indentAt(head.start).tabs > 0
    const indent = hung(this.decorations.indentAt(head.start), isHung)
    const hue = ["cmb-hue", `bubbly-${partOfSpeech}`, ...(block.isGroup ? [GROUP_BAND] : [])]
    const hasDescription = this.line(head, partOfSpeech)
    if (isShown) {
      const band = ["cmb-band", hasBody ? "cmb-band-open" : "cmb-band-pill", ...hue]
      if (isFolded) band.push("cmb-band-folded")
      if (hasDescription) band.push("cmb-band-described")
      if (isHung) band.push("cmb-band-hung")
      // a body opening with a group:  the group's band hangs on the rail right under this one, so no inside corner (I119)
      if (hasBody && opensWithGroup(block)) band.push("cmb-band-opens-group")
      this.decorations.mark(head.start, head.end, band, { style: `--cmb-column: ${indent.tabs}` })
    }
    if (!hasBody) return
    // a block the slice cuts:  its body drawn, its rail not;  a group's in its band's colour (I147)
    const groupOf = block.isGroup ? groupHue(rails) : undefined
    const inside = isShown ? [...rails, { ...indent, partOfSpeech, groupOf }] : rails
    this.nodes(block.body, inside, isShown && block.isGroup)
    if (!isShown) return
    this.foot(block, indent, rails)
  }

  /**
   * `block`'s foot, under its last line, its rail at `indent` inside `rails` (`drawFeet()`).
   * - Its rail stops short on its last line, where the foot's round corner turns.
   * - Blocks in it ending on the same line have theirs first:  side by side with this one, each at its own indent,
   *   overlapping (Owen, 2026-11-19, epic `codemirror` P7, question 4's A).
   * - A group in it ending there too, hung on its rail, ends in the SAME foot, the group's drawn:
   *   two feet there were one foot twice as thick, in two colours (Owen, 2026-11-13;  epic `language` I125).
   */
  private foot(block: SP.BubblyBlock, indent: Indent, rails: Rail[]) {
    const last = lastLineEnd(block)
    const at = this.state.doc.lineAt(last).to
    const feet = this.feet.get(at) ?? []
    this.decorations.stopRail(last, rails.length)
    // the group's foot is this one's:  this rail ends beside it
    if (feet.at(-1) && feet.at(-1)!.column <= indent.tabs) return
    // a group's foot is its band's colour, as its rail is (I147)
    feet.push(
      block.isGroup
        ? { column: indent.tabs, partOfSpeech: groupHue(rails), isGroup: true }
        : { column: indent.tabs, partOfSpeech: block.partOfSpeech, isGroup: false }
    )
    this.feet.set(at, feet)
  }

  /** Is all of `block` in the lines shown:  always, but in a slice that cuts it. */
  private isWhollyShown(block: SP.BubblyBlock): boolean {
    const { slice } = this.options
    return !slice || (block.head.start >= slice.from && lastLineEnd(block) <= slice.to)
  }

  /**
   * A line's stretches as marks:  each piece's look, a quoted input's pill and marks, the dotted lines;
   * returns whether it has a head's description.
   */
  private line(line: SP.BubblyLine, band?: SP.BubblyPartOfSpeech): boolean {
    let hasDescription = false
    const stretches = SP.BubblyStretches.ofLine(this.text, line, band ? { band } : {})
    for (const [index, stretch] of stretches.entries()) {
      const { start, end, kind } = stretch
      // a drawing's tag:  HTML's marks;  a stretch running across tags, `/></>`, only its pieces between them, so no
      // mark of Spell's cuts a tag's pill in two (one over `/></>` split `<number "score" />`'s pill;  epic `language` I114)
      const outside = this.outsideTags(start, end)
      if (outside.length !== 1 || outside[0]!.start !== start || outside[0]!.end !== end) {
        for (const piece of outside)
          this.mark(piece.start, piece.end, kind === "mark" ? ["bubbly-mark"] : classesOf(kind))
        continue
      }
      switch (kind) {
        case "underline":
          this.mark(start, end, ["bubbly-underline"])
          break
        case "quote-open":
        case "quote-close": {
          // a quoted input's own `"`:  inside its pill, its curly mark drawn just outside it (`bubbly.css`)
          const isAlone = !stretches[index + (kind === "quote-open" ? 1 : -1)]?.isQuoted
          this.mark(start, end, ["bubbly-quote-mark", `bubbly-${kind}`, ...(isAlone ? ["bubbly-quote-alone"] : [])])
          break
        }
        case "input":
        case "choice": {
          const classes = [...classesOf(kind), ...(stretch.isName ? ["bubbly-name"] : [])]
          // a quoted one's pill takes its marks in:  `"card"` is one white pill
          if (stretch.isQuoted) {
            this.mark(start - 1, end + 1, ["bubbly-quoted", ...classes])
          } else this.mark(start, end, classes)
          break
        }
        case "comment": {
          // a head's description:  at its band's right end (Owen)
          const isDescription = !!band
          hasDescription ||= isDescription
          this.mark(start, end, [
            "bubbly-comment",
            ...(isDescription ? ["bubbly-band-comment", "cmb-description"] : [])
          ])
          if (this.text.startsWith("--", start)) this.mark(start, start + 2, [BubblyHtml.DASH])
          break
        }
        case "mark":
          this.mark(start, end, ["bubbly-mark"])
          this.braces(start, end)
          break
        default:
          this.mark(start, end, classesOf(kind))
      }
    }
    for (const code of line.codes ?? []) {
      if (this.tags.some((tag) => code.start >= tag.start && code.end <= tag.end)) continue
      this.mark(code.start, code.end, ["bubbly-input", "bubbly-expression"])
      this.mark(code.start, code.start + 1, ["bubbly-code-brace"])
      this.mark(code.end - 1, code.end, ["bubbly-code-brace"])
    }
    return hasDescription
  }

  /** A Spell expression's `{` and `}` among faint marks:  a step darker, so a `{…}` reads as one. */
  private braces(start: number, end: number) {
    for (let at = start; at < end; at++) {
      if (this.text[at] === "{" || this.text[at] === "}") this.mark(at, at + 1, ["bubbly-brace"])
    }
  }

  /** Mark `start`-`end` with `classes`. */
  private mark(start: number, end: number, classes: string[]) {
    this.decorations.mark(start, end, classes)
  }

  /** The pieces of `start`-`end` outside every drawing's tag, in order;  none when it's all in tags. */
  private outsideTags(start: number, end: number): Array<{ start: number; end: number }> {
    const pieces: Array<{ start: number; end: number }> = []
    let from = start
    const crossing = this.tags.filter((tag) => tag.start < end && tag.end > start).sort((a, b) => a.start - b.start)
    for (const tag of crossing) {
      if (tag.start > from) pieces.push({ start: from, end: tag.start })
      from = Math.max(from, tag.end)
    }
    if (from < end) pieces.push({ start: from, end })
    return pieces
  }
}

/** A stretch's classes in the sheet, as the page's (`BubblyHtml.classesFor()`). */
function classesOf(kind: SP.BubblyStretchKind): string[] {
  if (kind === "quote-open" || kind === "quote-close" || kind === "underline") return []
  return BubblyHtml.classesFor(kind).split(" ").filter(Boolean)
}

/** Is `tag` one of `file`'s project's own views, `<stock-pile>`?  As the compiler decides it (`SP.SpellJSX.isDrawnType()`). */
function isViewTag(file: SP.SpellFile | undefined, tag: string): boolean {
  const type = tag && file?.scope?.getType(SP.typeName(tag))
  return !!type && SP.SpellJSX.isDrawnType(type)
}

/** Does `block`'s body start, on the line under its head, with a group:  its band hung on this block's rail. */
function opensWithGroup(block: SP.BubblyBlock): boolean {
  const first = block.body[0]
  return first?.kind === "block" && first.isGroup
}

/**
 * The hue of a group's band, in the block whose `rails` it's in:  that block's, as its band takes its line's
 * (`.bubbly-group` in `bubbly.css`);  plain at the top of a file.
 */
function groupHue(rails: Rail[]): string {
  return rails.at(-1)?.partOfSpeech ?? "plain"
}

/** `indent`, a tab further out when `isHung`:  where a group's band and rail start. */
function hung(indent: Indent, isHung: boolean): Indent {
  return isHung ? { ...indent, tabs: indent.tabs - 1 } : indent
}

/** Is `line` blank, its indent alone:  the caret on a new line in a body, before anything's typed on it? */
function isBlank(line: SP.BubblyLine): boolean {
  return line.start === line.end
}

/** Where `block`'s last line that isn't a gap ends. */
function lastLineEnd(block: SP.BubblyBlock): number {
  const last = block.body.findLast((node) => node.kind !== "gap")
  if (!last) return block.head.end
  return last.kind === "block" ? lastLineEnd(last) : (last as SP.BubblyLine).end
}

////////////////
// ## A blank line drawn at once
////////////////

/**
 * `decorations`, moved with `transaction`'s edit, and each blank body line it wrote drawn as the layout will draw it,
 * at once (epic `language` I158):  so the caret on it is drawn where its words will go as it lands, and never moves.
 * - A blank line the caret snaps onto (`CodeMirrorTyping`), or Enter makes:  moved marks have nothing on it,
 *   so the caret stood at the end of its tabs till the typing paused and the text was laid out again,
 *   then stepped a tab right (about 200ms after a click).
 * - And a blank line's first letter, typed with its indent (`LSP.SpellTyping.indentToAdd()`):
 *   the room before it, so it lands where its words will be.
 * - Its look, from the lines round it, as the layout decides it (`BubblyDecorations.nodes()`):
 *   - between a drawing's tags, or a blank line right above them:  nothing, a typed `<` starts at its indent
 *   - a group's own line (`cmb-group-line`):  where its members' words are, as the line beside it in the group
 *   - else, in a body:  the room after its tabs (`cmb-plain-indent`), and a blank one's caret past it (`WordsPlace`)
 * - Feet in a blank line it typed on move up, off its words;  in a line left blank, down into it (`feetReplaced()`).
 * - Only lines with nothing drawn on them yet;  the next layout replaces it all.
 * - `hiddenIndent`:  a slice's, shown dedented (`Slice`)
 * - NEVER throws:  a look it can't work out is left to the layout.
 */
function blankLinesDrawn(decorations: DecorationSet, transaction: Transaction, hiddenIndent = 0): DecorationSet {
  try {
    const { doc } = transaction.state
    const written: Line[] = []
    transaction.changes.iterChangedRanges((fromA, _toA, fromB, toB) => {
      // a letter typed on a blank line:  its line was blank before the edit
      const typedOn = transaction.startState.doc.lineAt(fromA).text.trim() ? 0 : doc.lineAt(fromB).number
      for (let number = doc.lineAt(fromB).number; number <= doc.lineAt(toB).number; number++) {
        const line = doc.line(number)
        if (written.at(-1)?.number !== number && (!line.text.trim() || number === typedOn)) written.push(line)
      }
    })
    if (!written.length) return decorations
    const clipped = feetReplaced(clippedAbove(decorations, written), written)
    const add = written.flatMap((line) => blankLineLook(clipped, doc, line, hiddenIndent))
    return add.length ? clipped.update({ add, sort: true }) : clipped
  } catch (error) {
    console.error("CodeMirrorBubbly:  couldn't draw a blank line at once", error)
    return decorations
  }
}

/**
 * `decorations`, with what moved onto each of `lines` from the line above put back on it.
 * - Enter at the end of a line puts the new line between that line and what was drawn at its end:
 *   - a mark holding its end, a quoted name's (`to "reset the stock"`), grew with the line break, so the new line was
 *     drawn inside the name's pill:  it ends at the line's end again
 *   - what's drawn after its end (the feet of blocks ending on the file's last line) moved down onto the new line,
 *     its caret pushed right:  back at the line's end
 * - A words' place left anywhere but a blank line's end goes (`WordsPlace`), as a line left blank again keeps one at
 *   its start:  `blankLineLook()` places its own.
 */
function clippedAbove(decorations: DecorationSet, lines: readonly Line[]): DecorationSet {
  const blanks = lines.filter((line) => !line.text.trim() && line.number > 1)
  const lineCrossedInto = (from: number, to: number, value: Decoration) =>
    value.point ? undefined : lines.find((line) => from < line.from && to >= line.from)
  // a words' place at a blank line's end is its own, and so are feet at its start
  const isOwn = (widget: WidgetType, from: number, line: Line) =>
    (widget instanceof WordsPlace && from === line.to) || (widget instanceof FeetWidget && widget.placement !== "end")
  const blankHolding = (from: number, value: Decoration) =>
    value.spec.widget
      ? blanks.find((line) => line.from <= from && from <= line.to && !isOwn(value.spec.widget, from, line))
      : undefined
  const putBack: Range<Decoration>[] = []
  let isAny = false
  decorations.between(lines[0]!.from - 1, lines.at(-1)!.to, (from, to, value) => {
    const crossed = lineCrossedInto(from, to, value)
    const blank = blankHolding(from, value)
    if (!crossed && !blank) return
    isAny = true
    if (crossed && crossed.from - 1 > from) putBack.push(value.range(from, crossed.from - 1))
    if (blank && !(value.spec.widget instanceof WordsPlace) && from === to) putBack.push(value.range(blank.from - 1))
  })
  if (!isAny) return decorations
  return decorations.update({
    filter: (from, to, value) => !lineCrossedInto(from, to, value) && !blankHolding(from, value),
    add: putBack,
    sort: true
  })
}

/**
 * `decorations`, with the feet at the start of each of `lines` drawn where its words leave room for them, at once:
 * - a line just typed on:  up, along the bottom of the line above, off its words
 * - a line left blank:  along its own top
 * - The next layout decides it all again.
 */
function feetReplaced(decorations: DecorationSet, lines: readonly Line[]): DecorationSet {
  const replaced: Range<Decoration>[] = []
  const isReplaced = (from: number, value: Decoration) => {
    const widget = value.spec.widget
    if (!(widget instanceof FeetWidget) || widget.placement === "end") return false
    const line = lines.find((each) => each.from === from)
    const placement = line && (line.text.trim() ? "above" : "blank")
    return !!placement && placement !== widget.placement
  }
  decorations.between(lines[0]!.from, lines.at(-1)!.to, (from, _to, value) => {
    if (!isReplaced(from, value)) return
    const { feet, placement } = value.spec.widget as FeetWidget
    replaced.push(FeetWidget.decoration(feet, placement === "blank" ? "above" : "blank").range(from))
  })
  if (!replaced.length) return decorations
  return decorations.update({ filter: (from, _to, value) => !isReplaced(from, value), add: replaced, sort: true })
}

/**
 * What body line `line`, blank or with its first words just typed, needs drawn, by the lines round it
 * (`blankLinesDrawn()`);  none when it's drawn already.
 */
function blankLineLook(decorations: DecorationSet, doc: Doc, line: Line, hiddenIndent: number): Range<Decoration>[] {
  const indent = indentOf(line)
  const isBlankLine = indent.length === line.length
  const shownFrom = Math.min(line.from + hiddenIndent, line.from + indent.length)
  const shownTo = line.from + indent.length
  if (!doc.sliceString(shownFrom, shownTo).includes("\t") || isTagText(line.text) || isDrawn(decorations, line))
    return []
  const next = nonBlankLine(doc, line.number, 1)
  const previous = nonBlankLine(doc, line.number, -1)
  // a typed `<` starts at its indent:  on a blank line right above a drawing's tags, or among them
  if (isBlankLine && next && isTagText(next.text)) return []
  if (isInDrawing(decorations, doc, line, indent)) return []
  // in a group's body:  as its own empty line was, else as the line beside it on its level, or right under its head
  const sibling = [next, previous].find((it) => it && indentOf(it) === indent)
  const isGroupLine =
    hasClassAt(decorations, line.from, line.from, IN_GROUP) ||
    (!!sibling && hasClassAt(decorations, sibling.from, sibling.from, IN_GROUP)) ||
    (!!previous && indentOf(previous) === indent && hasClassAt(decorations, previous.from, previous.to, GROUP_BAND))
  if (isGroupLine) return [Decoration.line({ class: GROUP_LINE }).range(line.from)]
  const room = Decoration.mark({ class: PLAIN_INDENT }).range(shownFrom, shownTo)
  return isBlankLine ? [room, WordsPlace.decoration.range(line.to)] : [room]
}

/**
 * Is `line`, at `indent`, among a drawing's lines, as the layout draws them from a drawing's first tag to the next
 * block (`BubblyDecorations.markup()`):  after a tag on its own level, or under a tag (its children, a laid-out tag's
 * attributes)?
 * - Up through the lines above, out from its level:  those further in are inside something, and skipped;
 *   a tag says yes, a head (`cmb-head`) no;  any other line (a tag's attribute, a step among the tags) goes on up,
 *   from its own level.
 */
function isInDrawing(decorations: DecorationSet, doc: Doc, line: Line, indent: string): boolean {
  let level = indent.length
  for (let above = nonBlankLine(doc, line.number, -1); above; above = nonBlankLine(doc, above.number, -1)) {
    const its = indentOf(above).length
    if (its > level) continue
    if (isTagText(above.text)) return true
    if (hasClassAt(decorations, above.from, above.from, HEAD)) return false
    level = its
  }
  return false
}

/** `line`'s indent:  its leading tabs and spaces. */
function indentOf(line: Line): string {
  return /^[ \t]*/.exec(line.text)![0]
}

/**
 * Is `line` drawn already:  the room after its indent, a blank one's words' place at its end, or a group's line?
 * - Only at those places:  a line left blank again keeps a moved words' place at its start, which says nothing.
 */
function isDrawn(decorations: DecorationSet, line: Line): boolean {
  const indentEnd = line.from + indentOf(line).length
  let isDrawn = false
  decorations.between(line.from, line.to, (from, to, value) => {
    const classes = ((value.spec.class as string | undefined) ?? "").split(" ")
    isDrawn ||=
      (value.spec.widget instanceof WordsPlace && from === line.to) ||
      (classes.includes(PLAIN_INDENT) && to === indentEnd) ||
      (from === line.from && classes.includes(GROUP_LINE))
  })
  return isDrawn
}

/** Does a decoration from `from` to `to` (a line's, or a mark in it) have `className`? */
function hasClassAt(decorations: DecorationSet, from: number, to: number, className: string): boolean {
  let has = false
  decorations.between(from, to, (_from, _to, value) => {
    has ||= ((value.spec.class as string | undefined) ?? "").split(" ").includes(className)
  })
  return has
}

/** The nearest line with words on it, after line `number` (`way` 1) or before it (-1). */
function nonBlankLine(doc: Doc, number: number, way: 1 | -1): Line | undefined {
  for (let at = number + way; at >= 1 && at <= doc.lines; at += way) {
    const line = doc.line(at)
    if (line.text.trim()) return line
  }
  return undefined
}

/** Does `text` start with a tag, a drawing's line (`<deck "deck" />`, `</container>`)? */
function isTagText(text: string): boolean {
  return text.trimStart().startsWith("<")
}

/** A head's line:  a declaration's or a control line's, a band on it. */
const HEAD = "cmb-head"

/** A plain body line's room after its tabs (`BubblyDecorations.plainIndent()`). */
const PLAIN_INDENT = "cmb-plain-indent"

/** A group's own line, where its members' words are (`BubblyDecorations.nodes()`). */
const GROUP_LINE = "cmb-group-line"

/**
 * A line in a group's body, the group's own:  a member's head, a note, an empty line.
 * - No look of its own:  it says where a blank line written beside it goes (`blankLineLook()`).
 */
const IN_GROUP = "cmb-in-group"

/** A group's band, on its head. */
const GROUP_BAND = "bubbly-group"

/****************
 * ### `DescriptionRoom`
 * A head's description cut short with a `…` when it doesn't fit at its band's right end, so the head stays one line
 * (epic `codemirror` P7;  Owen, 2026-11-19:  "make line spacing completely regular").
 * - The description floats at the band's right end;  too wide for the room beside the head's words,
 *   the browser drops it under them, over the next line.
 * - So it's measured as drawn:  a head line whose description doesn't fit gets the room it has, after the head's words
 *   (`--cmb-description-room`, `cmb-description-cut` in `bubbly.css`), and is cut short there.
 *   - Measured again as the editor changes:  a wider one shows it whole again.
 * - Before, it took rows of its own under the head (epic `language` I120):  a head line two or three lines tall,
 *   which CodeMirror guessed as one until it was drawn, so the file's height changed as it scrolled.
 * - Only lines on screen are measured;  the rest keep the room they had, moved with the text.
 * - Its position in the import graph:  CodeMirror alone.
 ****************/
class DescriptionRoom {
  /** The room for each cut description, by where its head line starts, set as they're measured. */
  private static readonly measured = StateEffect.define<Map<number, number>>()

  /** The room for each cut description, in pixels, by where its head line starts:  only lines that cut one. */
  private static readonly rooms = StateField.define<Map<number, number>>({
    create: () => new Map(),
    update(rooms, transaction) {
      for (const effect of transaction.effects) if (effect.is(DescriptionRoom.measured)) return effect.value
      if (!transaction.docChanged || !rooms.size) return rooms
      const moved = new Map<number, number>()
      for (const [from, room] of rooms) moved.set(transaction.changes.mapPos(from), room)
      return moved
    },
    provide: (it) =>
      EditorView.decorations.compute([it], (state) =>
        Decoration.set(
          [...state.field(it)]
            .filter(([from]) => from <= state.doc.length)
            .map(([from, room]) =>
              Decoration.line({
                class: DescriptionRoom.CUT,
                attributes: { style: `--cmb-description-room: ${room}px` }
              }).range(state.doc.lineAt(from).from)
            ),
          true
        )
      )
  })

  /** A head line's class while its description is cut short. */
  static readonly CUT = "cmb-description-cut"

  /** Measures the descriptions on screen after each update, and sets their room when it's changed. */
  private static readonly measure = ViewPlugin.fromClass(
    class {
      constructor(readonly view: EditorView) {
        this.request()
      }

      update() {
        this.request()
      }

      private request() {
        this.view.requestMeasure({
          key: this,
          read: (view) => ({ state: view.state, rooms: DescriptionRoom.roomsOnScreen(view) }),
          write: ({ state, rooms }, view) => {
            if (view.state !== state) return
            const known = state.field(DescriptionRoom.rooms)
            const next = new Map(known)
            for (const [from, room] of rooms) {
              if (room === undefined) next.delete(from)
              else next.set(from, room)
            }
            if (sameRooms(known, next)) return
            // not inside CodeMirror's own update:  once it's done
            queueMicrotask(() => {
              if (view.state === state) view.dispatch({ effects: DescriptionRoom.measured.of(next) })
            })
          }
        })
      }
    }
  )

  /** Measuring and cutting the descriptions on heads, for a bubbly editor. */
  static readonly extension: Extension = [DescriptionRoom.rooms, DescriptionRoom.measure]

  /**
   * Each line on screen's room for its description, in pixels:  `undefined` for one with none, or whose description
   * fits whole on its band.
   */
  private static roomsOnScreen(view: EditorView): Map<number, number | undefined> {
    const rooms = new Map<number, number | undefined>()
    const scale = view.scaleX || 1
    for (const line of view.contentDOM.querySelectorAll<HTMLElement>(".cm-line")) {
      const from = view.posAtDOM(line, 0)
      const description = line.querySelector<HTMLElement>(".cmb-description")
      const band = description?.closest<HTMLElement>(".cmb-band")
      if (!description || !band?.firstChild) {
        rooms.set(from, undefined)
        continue
      }
      const words = document.createRange()
      words.setStartBefore(band.firstChild)
      words.setEndBefore(description)
      const wordsEnd = words.getBoundingClientRect().right
      const end = band.getBoundingClientRect().right - Number.parseFloat(getComputedStyle(band).paddingRight) * scale
      // its whole width, though it's cut:  its text's
      const width = description.scrollWidth * scale
      const room = (end - wordsEnd) / scale - DESCRIPTION_GAP
      rooms.set(from, wordsEnd + width <= end + 0.5 ? undefined : Math.max(0, Math.floor(room)))
    }
    return rooms
  }
}

/** The room kept between a head's words and its description cut short, in pixels. */
const DESCRIPTION_GAP = 12

/** Do `a` and `b` give the same lines the same room? */
function sameRooms(a: Map<number, number>, b: Map<number, number>): boolean {
  if (a.size !== b.size) return false
  for (const [from, room] of a) if (b.get(from) !== room) return false
  return true
}

/** A block's foot, as `FeetWidget` draws it:  at its block's indent, in its colour. */
type Foot = {
  /** its block's indent, in tabs:  where its rail is */
  column: number
  /** its colour:  its block's part of speech, or a group's hue */
  partOfSpeech: string
  /** a group's foot:  its band's colour, lighter than its hue's other bands (`cmb-group-foot`) */
  isGroup: boolean
}

/**
 * Where a line's feet are drawn, from the line holding them (`BubblyDecorations.drawFeet()`):
 * - `blank`:  it's the blank line under the blocks, the feet along its top
 * - `above`:  it has words, the feet along the bottom of the line above it, the blocks' last
 * - `end`:  it's the blocks' last line, nothing shown under it, the feet along its own bottom
 */
type FeetPlacement = "blank" | "above" | "end"

/****************
 * ### `FeetWidget`
 * The feet of the blocks ending on one line:  each its block's rail turning round a corner into a short bar (I113),
 * side by side, each at its block's indent, overlapping (Owen, 2026-11-19, epic `codemirror` P7:
 * "feet in a blank line -- I like 'side by side in the blank line' a lot").
 * - An empty span of no size, its feet placed from its line (`.cmb-feet`, `bubbly.css`):  it takes no room, so every
 *   line stays one line tall, and CodeMirror's guess at a line it hasn't drawn is right ("make line spacing completely
 *   regular").  Before, each foot had a thin row of its own, 4-13px, and a stack of them a tab more each.
 * - Its line's start (`blank`, `above`), before its first letter (`side: -1`), so a letter typed there goes after it;
 *   the file's last line's end (`end`), after its last letter.
 * - The rails of the blocks it ends stop short on their last line, for the corners (`--cmb-foot-lift`).
 * - Typing on a blank line holding feet moves them up at once, off the words (`feetReplaced()`).
 * - A group's foot is its band's colour, as its rail is (Owen, epic `language` I147:
 *   "This bar and curly should be colored by group, not app").
 ****************/
class FeetWidget extends WidgetType {
  constructor(
    /** innermost first */
    readonly feet: readonly Foot[],
    readonly placement: FeetPlacement
  ) {
    super()
  }

  /** `feet`, drawn at `placement`, as a decoration. */
  static decoration(feet: readonly Foot[], placement: FeetPlacement): Decoration {
    return Decoration.widget({ widget: new FeetWidget(feet, placement), side: placement === "end" ? 1 : -1 })
  }

  eq(other: FeetWidget): boolean {
    return (
      other.placement === this.placement &&
      other.feet.length === this.feet.length &&
      other.feet.every(
        (foot, index) =>
          foot.column === this.feet[index]!.column &&
          foot.partOfSpeech === this.feet[index]!.partOfSpeech &&
          foot.isGroup === this.feet[index]!.isGroup
      )
    )
  }

  toDOM(): HTMLElement {
    const feet = document.createElement("span")
    feet.className = `cmb-feet cmb-feet-${this.placement}`
    feet.setAttribute("aria-hidden", "true")
    // outermost first, so each foot inside it is drawn over its bar
    for (const { column, partOfSpeech, isGroup } of [...this.feet].reverse()) {
      const foot = document.createElement("span")
      foot.className = `cmb-foot cmb-hue bubbly-${partOfSpeech}${isGroup ? " cmb-group-foot" : ""}`
      foot.style.setProperty("--cmb-column", String(column))
      feet.append(foot)
    }
    return feet
  }
}

/****************
 * ### `WordsPlace`
 * Where a blank body line's words will go:  an empty span at the line's end, of no width,
 * past the room after its indent (`cmb-plain-indent`), so the caret at that end is drawn there (epic `language` I157).
 * - CodeMirror draws the caret against what's beside it.
 *   With nothing after a blank line's tabs, it was drawn at their end, before that room:
 *   a tab left of where a letter typed there lands (Owen:  "this definitely feels like there is an extra tab in there").
 * - Before the caret's place (`side: -1`):  a letter typed there goes after it, where the caret was, so nothing jumps.
 * - Past the room's mark, not in it:  CodeMirror ends a mark before a widget at the mark's end.
 * - Gone once the line has words:  the layout draws them past the same room (`plainIndent()`).
 ****************/
class WordsPlace extends WidgetType {
  /** The one decoration, at a blank line's end. */
  static readonly decoration = Decoration.widget({ widget: new WordsPlace(), side: -1 })

  eq(): boolean {
    return true
  }

  toDOM(): HTMLElement {
    const place = document.createElement("span")
    place.className = "cmb-words-place"
    return place
  }
}
