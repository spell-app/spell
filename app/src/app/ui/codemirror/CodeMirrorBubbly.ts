import type { EditorState, Extension } from "@codemirror/state"
import { Decoration, type DecorationSet, EditorView, WidgetType } from "@codemirror/view"

import { SP } from "spell/parser/spell"
import { BubblyHtml } from "spell/app/app/components/spell-code/BubblyHtml"
import { CodeMirrorDecorations, CodeMirrorMarkup, railsStyle, type Indent, type Rail } from "./CodeMirrorMarkup"
import { CodeMirrorRelayout } from "./CodeMirrorRelayout"

/****************
 * ### `CodeMirrorBubbly`
 * Spell drawn in the bubbly look in a CodeMirror editor,
 * from the parser's `SP.BubblyLayout`, the same data the page's `BubblyHtml` draws from
 * (epic `editor` P30, the CodeMirror test;  epic `codemirror` P3).
 * - Everything is a REAL element in the text's own lines, laid out by the browser:
 *   - each declaration's head on a band:  a mark round its words (`cmb-band`), in its part of speech's colour;
 *     a head's description, `-- A playing card`, at the band's right end, the band reaching the editor's edge (Owen)
 *   - its body's rail:  a line decoration on every line under it, a stripe per enclosing block (`--cmb-rails`)
 *   - its foot:  a block widget after its last line
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
        CodeMirrorBubbly.RELAYOUT_MSEC
      ),
      EditorView.editorAttributes.of({ class: EDITOR_CLASSES }),
      CodeMirrorMarkup.tabStops
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

/** The lines a slice shows, `from` the first's start `to` the last's end:  offsets into its file. */
export type Slice = { from: number; to: number }

/** The editor's own classes:  a `.bubbly`, so `bubbly.css` reaches it, and ours. */
const EDITOR_CLASSES = "bubbly cmb-editor"

/** One drawing being turned into decorations. */
class BubblyDecorations {
  private readonly decorations: CodeMirrorDecorations
  private readonly text: string
  /** A drawing's tags:  drawn as HTML is (`CodeMirrorMarkup`), so Spell's marks leave them alone. */
  private readonly tags: Array<{ start: number; end: number }> = []
  /** The feet under each line end, by where it is, innermost first:  as they stack. */
  private readonly feet = new Map<number, FootWidget[]>()

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
    this.decorations = new CodeMirrorDecorations(state)
  }

  /** The decorations, sorted as CodeMirror wants them. */
  build(): DecorationSet {
    this.nodes(this.drawing.nodes, [])
    return this.decorations.build()
  }

  /** `nodes`, inside the blocks `rails` holds, outermost first. */
  private nodes(nodes: SP.BubblyNode[], rails: Rail[]) {
    for (let index = 0; index < nodes.length; index++) {
      const node = nodes[index]!
      if (node.kind === "line" && this.text[node.start] === "<") {
        index = this.markup(nodes, index, rails)
        continue
      }
      switch (node.kind) {
        case "gap":
          this.decorations.line(node.start, rails)
          break
        case "line":
          this.decorations.line(node.start, rails)
          this.line(node)
          break
        case "block":
          this.block(node, rails)
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

  /** A declaration, or a control line with steps under it:  its band, its body, its foot. */
  private block(block: SP.BubblyBlock, rails: Rail[]) {
    const { head, partOfSpeech } = block
    const isShown = this.isWhollyShown(block)
    // folded:  its head alone, a pill with the fold's `…` in its end;  nothing of its hidden body (I116)
    const isFolded = isShown && this.decorations.isFoldedAt(head.start)
    const hasBody = !isFolded && block.body.some((node) => node.kind !== "gap")
    this.decorations.line(head.start, rails, isShown ? ["cmb-head"] : [])
    // a group's band and rail hang a tab out, its rail on its parent's, so its members' bands sit clear of it,
    // as Monaco drew them (I113)
    const isHung = block.isGroup && this.decorations.indentAt(head.start).tabs > 0
    const indent = hung(this.decorations.indentAt(head.start), isHung)
    const hue = ["cmb-hue", `bubbly-${partOfSpeech}`, ...(block.isGroup ? ["bubbly-group"] : [])]
    const hasDescription = this.line(head, partOfSpeech)
    if (isShown) {
      const band = ["cmb-band", hasBody ? "cmb-band-open" : "cmb-band-pill", ...hue]
      if (isFolded) band.push("cmb-band-folded")
      if (hasDescription) band.push("cmb-band-described")
      if (isHung) band.push("cmb-band-hung")
      this.decorations.mark(head.start, head.end, band, { style: `--cmb-column: ${indent.tabs}` })
    }
    if (!hasBody) return
    // a block the slice cuts:  its body drawn, its rail not
    const inside = isShown ? [...rails, { ...indent, partOfSpeech }] : rails
    this.nodes(block.body, inside)
    if (!isShown) return
    // the foot, under its last line
    const last = lastLineEnd(block)
    const at = this.state.doc.lineAt(last).to
    const foot = new FootWidget(indent.tabs, partOfSpeech, rails)
    // its rail stops short in the row above its foot, where the foot's round corner turns:  its last line, or the foot of
    // a block in it that ends there too
    const above = this.feet.get(at)?.at(-1)
    if (above) above.stopped.add(rails.length)
    else this.decorations.stopRail(last, rails.length)
    this.feet.set(at, [...(this.feet.get(at) ?? []), foot])
    this.decorations.add(
      Decoration.widget({
        widget: foot,
        block: true,
        // an inner block's foot before its parent's, when they end on the same line
        side: 1000 - block.level
      }).range(at)
    )
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

/** `indent`, a tab further out when `isHung`:  where a group's band and rail start. */
function hung(indent: Indent, isHung: boolean): Indent {
  return isHung ? { ...indent, tabs: indent.tabs - 1 } : indent
}

/** Where `block`'s last line that isn't a gap ends. */

function lastLineEnd(block: SP.BubblyBlock): number {
  const last = block.body.findLast((node) => node.kind !== "gap")
  if (!last) return block.head.end
  return last.kind === "block" ? lastLineEnd(last) : (last as SP.BubblyLine).end
}

/****************
 * ### `FootWidget`
 * A block's foot:  a short bar off the bottom of its rail, turning out of it round a corner, as Monaco's did (I113),
 * on a line of its own under its last line.
 * - The rails of the blocks around it run on beside it;
 *   one whose own foot is in the row under it stops short there, for that foot's corner (`stopped`).
 ****************/
class FootWidget extends WidgetType {
  constructor(
    readonly column: number,
    readonly partOfSpeech: SP.BubblyPartOfSpeech,
    readonly rails: Rail[]
  ) {
    super()
  }

  /** The rails beside it, by their place in `rails`, whose feet are in the row under it:  set while it's laid out. */
  readonly stopped = new Set<number>()

  eq(other: FootWidget): boolean {
    return (
      other.column === this.column &&
      other.partOfSpeech === this.partOfSpeech &&
      railsStyle(other.rails, other.stopped) === railsStyle(this.rails, this.stopped)
    )
  }

  toDOM(): HTMLElement {
    const row = document.createElement("div")
    row.className = "cmb-foot-row"
    if (this.rails.length) row.style.cssText = railsStyle(this.rails, this.stopped)

    const foot = document.createElement("div")
    foot.className = `cmb-foot cmb-hue bubbly-${this.partOfSpeech}`
    foot.style.setProperty("--cmb-column", String(this.column))
    row.append(foot)
    return row
  }

  ignoreEvent(): boolean {
    return false
  }
}
