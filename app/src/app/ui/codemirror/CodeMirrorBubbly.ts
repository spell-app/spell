import {
  EditorSelection,
  type EditorState,
  type Extension,
  type SelectionRange,
  StateEffect,
  StateField
} from "@codemirror/state"
import { Decoration, type DecorationSet, EditorView, ViewPlugin, WidgetType } from "@codemirror/view"

import { SP } from "spell/parser/spell"
import { BubblyHtml } from "spell/app/app/components/spell-code/BubblyHtml"
import { CodeMirrorDecorations, CodeMirrorMarkup, railsStyle, type Indent, type Rail } from "./CodeMirrorMarkup"
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
 *     one that doesn't fit there gets rows of its own under the head, wrapped (`DescriptionRoom`;  epic `language` I120)
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
        CodeMirrorBubbly.RELAYOUT_MSEC,
        {
          isAwaitingParse: () => CodeMirrorRelayout.isUnparsed(fileOf()),
          // a project's file just typed in:  its project parses it again once the typing pauses
          isParseOnItsWay: (state) => {
            const file = fileOf()
            return !!file?.match && !SP.BubblyLayout.isParseOf(file, state.doc.toString())
          }
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
  /** The feet under each line end, by where it is, innermost first:  as they stack. */
  private readonly feet = new Map<number, FootWidget[]>()
  /** Where each line with a band starts. */
  private readonly bandLines = new Set<number>()

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
    // a band right under a foot:  room between the two blocks (T141)
    for (const [at, feet] of this.feet) if (this.bandLines.has(at + 1)) feet.at(-1)!.isAboveBand = true
    return this.decorations.build()
  }

  /**
   * `nodes`, inside the blocks `rails` holds, outermost first.
   * - `isGroupBody`:  they're a group's body, drawn:  its own lines, its notes, where its members' words are
   *   (`cmb-group-line`;  epic `language` I134)
   */
  private nodes(nodes: SP.BubblyNode[], rails: Rail[], isGroupBody = false) {
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
          this.decorations.line(node.start, rails, isGroupBody ? ["cmb-group-line"] : [])
          // a plain body line's words where a band's on its level are, a tab in (I142);  a group's are already
          if (!isGroupBody) this.plainIndent(node)
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

  /**
   * A plain line's indent, in a body:  a tab wider (`cmb-plain-indent`), so its first word is where a band's words on
   * the same level are (Owen, epic `language` I142:  "I'd prefer if `it lives` lined up where `it's name` does").
   * - Its words moved, not the line:  its column 0, the caret's place on the rail (I140), stays where it is.
   * - A line in no block, or a slice's line shown with no indent, keeps its words where they were.
   */
  private plainIndent(line: SP.BubblyLine) {
    const { from, to } = this.decorations.shownIndentBefore(line.start)
    if (this.text.slice(from, to).includes("\t")) this.mark(from, to, ["cmb-plain-indent"])
  }

  /** A declaration, or a control line with steps under it:  its band, its body, its foot. */
  private block(block: SP.BubblyBlock, rails: Rail[]) {
    const { head, partOfSpeech } = block
    const isShown = this.isWhollyShown(block)
    // folded:  its head alone, a pill with the fold's `…` in its end;  nothing of its hidden body (I116)
    const isFolded = isShown && this.decorations.isFoldedAt(head.start)
    const hasBody = !isFolded && block.body.some((node) => node.kind !== "gap")
    this.decorations.line(head.start, rails, isShown ? ["cmb-head"] : [])
    // a group's band and rail hang a tab out, its rail on its parent's, so its members' bands sit clear of it (I113)
    const isHung = block.isGroup && this.decorations.indentAt(head.start).tabs > 0
    const indent = hung(this.decorations.indentAt(head.start), isHung)
    const hue = ["cmb-hue", `bubbly-${partOfSpeech}`, ...(block.isGroup ? ["bubbly-group"] : [])]
    const hasDescription = this.line(head, partOfSpeech)
    if (isShown) {
      const band = ["cmb-band", hasBody ? "cmb-band-open" : "cmb-band-pill", ...hue]
      if (isFolded) band.push("cmb-band-folded")
      if (hasDescription) band.push("cmb-band-described")
      if (isHung) band.push("cmb-band-hung")
      // a body opening with a group:  the group's band hangs on the rail right under this one, so no inside corner (I119)
      if (hasBody && opensWithGroup(block)) band.push("cmb-band-opens-group")
      this.decorations.mark(head.start, head.end, band, { style: `--cmb-column: ${indent.tabs}` })
      this.bandLines.add(this.state.doc.lineAt(head.start).from)
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
   * `block`'s foot, under its last line, its rail at `indent` inside `rails`.
   * - Blocks in it ending on the same line have theirs first, and this one goes under them,
   *   as far below the one right above it as its rail is left of that one's:  the feet as far apart down as the rails
   *   across (Owen, 2026-11-11), as the drawn-bubbly page stacks them (epic `language` I125).
   * - A group in it ending there too, hung on its rail, ends in the SAME foot, the group's drawn:
   *   stacked under it, they were one foot twice as thick, in two colours (Owen, 2026-11-13;  I125).
   */
  private foot(block: SP.BubblyBlock, indent: Indent, rails: Rail[]) {
    const last = lastLineEnd(block)
    const at = this.state.doc.lineAt(last).to
    const above = this.feet.get(at)?.at(-1)
    const rail = rails.length
    // its rail stops short in the row above its foot, where the foot's round corner turns:  its last line, or the foot of
    // a block in it that ends there too
    if (above && above.column <= indent.tabs) {
      // the group's foot is this one's:  this rail ends beside it, stopping short where the group's does
      above.ended.add(rail)
      if (above.stoppedIn) above.stoppedIn.stopped.add(rail)
      else this.decorations.stopRail(last, rail)
      return
    }
    // a group's foot is its band's colour, as its rail is (I147)
    const foot = block.isGroup
      ? new FootWidget(indent.tabs, groupHue(rails), rails, "group")
      : new FootWidget(indent.tabs, block.partOfSpeech, rails)
    if (above) {
      above.stopped.add(rail)
      above.drop = above.column - indent.tabs
      foot.stoppedIn = above
      foot.dropsAbove = above.dropsAbove + above.drop
    } else this.decorations.stopRail(last, rail)
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

/** Where `block`'s last line that isn't a gap ends. */

function lastLineEnd(block: SP.BubblyBlock): number {
  const last = block.body.findLast((node) => node.kind !== "gap")
  if (!last) return block.head.end
  return last.kind === "block" ? lastLineEnd(last) : (last as SP.BubblyLine).end
}

/****************
 * ### `DescriptionRoom`
 * Rows of their own under a head for its description, when it doesn't fit at its band's right end (epic `language` I120).
 * - The description floats at the band's right end;  too wide for the room beside the head's words,
 *   the browser drops it under them, where it was drawn over the next lines (`a "card"`'s over its first comments,
 *   a group's behind its first member's band).
 * - So it's measured as drawn:  a head line whose description reaches below its row gets as many rows under it as
 *   the description takes, wrapped, its words starting under the head's (`cmb-head-description-below`, `bubbly.css`).
 *   - CodeMirror measures lines as they're drawn, so the caret, the gutter and the lines below follow.
 *   - Measured again as the editor changes:  a wider one puts it back at the band's end (`fitsOnBand()`).
 * - Only lines on screen are measured;  the rest keep the rows they had, moved with the text.
 * - Its position in the import graph:  CodeMirror alone.
 ****************/
class DescriptionRoom {
  /** The rows under each head line, by where it starts, set as they're measured. */
  private static readonly measured = StateEffect.define<Map<number, number>>()

  /** The rows under each head line, by where it starts:  only lines that have any. */
  private static readonly rows = StateField.define<Map<number, number>>({
    create: () => new Map(),
    update(rows, transaction) {
      for (const effect of transaction.effects) if (effect.is(DescriptionRoom.measured)) return effect.value
      if (!transaction.docChanged || !rows.size) return rows
      const moved = new Map<number, number>()
      for (const [from, count] of rows) moved.set(transaction.changes.mapPos(from), count)
      return moved
    },
    provide: (it) =>
      EditorView.decorations.compute([it], (state) =>
        Decoration.set(
          [...state.field(it)]
            .filter(([from]) => from <= state.doc.length)
            .map(([from, count]) =>
              Decoration.line({
                class: DescriptionRoom.BELOW,
                attributes: { style: `--cmb-description-rows: ${count}` }
              }).range(state.doc.lineAt(from).from)
            ),
          true
        )
      )
  })

  /** A head line's class while its description is in rows under it. */
  static readonly BELOW = "cmb-head-description-below"

  /** Measures the descriptions on screen after each update, and sets the rows when they've changed. */
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
          read: (view) => ({ state: view.state, rows: DescriptionRoom.rowsOnScreen(view) }),
          write: ({ state, rows }, view) => {
            if (view.state !== state) return
            const known = state.field(DescriptionRoom.rows)
            const next = new Map(known)
            for (const [from, count] of rows) {
              if (count) next.set(from, count)
              else next.delete(from)
            }
            if (sameRows(known, next)) return
            // not inside CodeMirror's own update:  once it's done
            queueMicrotask(() => {
              if (view.state === state) view.dispatch({ effects: DescriptionRoom.measured.of(next) })
            })
          }
        })
      }
    }
  )

  /**
   * A press in the rows under a head:  the caret on the description's letter under the pointer, and a drag from it
   * selects as over any text (epic `codemirror` I19).
   * - CodeMirror finds the place under the pointer from the boxes of the line's pieces, in their order.
   *   The description is drawn out of the band's box, in the rows under it, so its box is in no piece's:
   *   CodeMirror took the band for the nearest piece, and put the caret in the head's words above the press.
   * - Two clicks pick a word, three the line, as CodeMirror's own;  four and more are `CodeMirrorSetup`'s.
   * - A drag from anywhere else is CodeMirror's own, so one ending in a description's rows ends in the head's words.
   */
  private static readonly presses = EditorView.mouseSelectionStyle.of((view, event) => {
    if (event.button !== 0 || event.detail > 3 || event.metaKey || event.ctrlKey || event.altKey) return null
    const pressed = DescriptionRoom.posInRows(view, event.clientX, event.clientY)
    if (pressed === undefined) return null
    const { state } = view
    let start: SelectionRange
    if (event.detail === 1) start = EditorSelection.cursor(pressed)
    else if (event.detail === 2) start = state.wordAt(pressed) ?? EditorSelection.cursor(pressed)
    else {
      const line = state.doc.lineAt(pressed)
      start = EditorSelection.range(line.from, Math.min(line.to + 1, state.doc.length))
    }
    if (event.shiftKey) start = EditorSelection.range(state.selection.main.anchor, start.head)
    return {
      get(current) {
        const head =
          DescriptionRoom.posInRows(view, current.clientX, current.clientY) ??
          view.posAtCoords({ x: current.clientX, y: current.clientY }, false)
        if (event.detail === 1) return EditorSelection.single(start.anchor, head)
        if (head >= start.from && head <= start.to) return EditorSelection.single(start.anchor, start.head)
        // past the press's word or line:  from its far end to the place under the pointer, a whole word or line
        const line = view.state.doc.lineAt(head)
        const to =
          event.detail === 2
            ? (view.state.wordAt(head) ?? EditorSelection.cursor(head))
            : EditorSelection.range(line.from, line.to)
        return head < start.from ? EditorSelection.single(start.to, to.from) : EditorSelection.single(start.from, to.to)
      },
      update(update) {
        if (update.docChanged) start = start.map(update.changes)
      }
    }
  })

  /**
   * The place under `x`, `y` when it's in the rows under a head, in its description:  the letter it's over, or, beside
   * its words, the nearest end of the row it's in;  `undefined` anywhere else.
   */
  private static posInRows(view: EditorView, x: number, y: number): number | undefined {
    for (const line of view.contentDOM.querySelectorAll<HTMLElement>(`.cm-line.${DescriptionRoom.BELOW}`)) {
      const box = line.getBoundingClientRect()
      const band = line.querySelector<HTMLElement>(".cmb-band")
      const description = line.querySelector<HTMLElement>(".cmb-description")
      if (!band || !description || y < band.getBoundingClientRect().bottom || y > box.bottom) continue
      return DescriptionRoom.posInText(view, description, x, y)
    }
    return undefined
  }

  /** The place in `element`'s text nearest `x`, `y`:  in the row nearest `y`, before or after the letter nearest `x`. */
  private static posInText(view: EditorView, element: HTMLElement, x: number, y: number): number | undefined {
    let best: { node: Text; offset: number; dy: number; dx: number } | undefined
    const letter = document.createRange()
    const walker = document.createTreeWalker(element, NodeFilter.SHOW_TEXT)
    for (let node = walker.nextNode() as Text | null; node; node = walker.nextNode() as Text | null) {
      for (let at = 0; at < node.length; at++) {
        letter.setStart(node, at)
        letter.setEnd(node, at + 1)
        const rect = letter.getBoundingClientRect()
        if (!rect.height) continue
        const dy = y < rect.top ? rect.top - y : y > rect.bottom ? y - rect.bottom : 0
        const dx = x < rect.left ? rect.left - x : x > rect.right ? x - rect.right : 0
        if (best && (dy > best.dy || (dy === best.dy && dx >= best.dx))) continue
        best = { node, offset: x > (rect.left + rect.right) / 2 ? at + 1 : at, dy, dx }
      }
    }
    return best && view.posAtDOM(best.node, best.offset)
  }

  /** Measuring and drawing the rows under heads, and presses in them, for a bubbly editor. */
  static readonly extension: Extension = [DescriptionRoom.rows, DescriptionRoom.measure, DescriptionRoom.presses]

  /**
   * Each line on screen's rows for its description:  0 for one with none, or whose description fits on its band.
   * - Rows of the line's own height, as many as the description reaches below its row.
   */
  private static rowsOnScreen(view: EditorView): Map<number, number> {
    const rows = new Map<number, number>()
    const scale = view.scaleY || 1
    for (const line of view.contentDOM.querySelectorAll<HTMLElement>(".cm-line")) {
      const description = line.querySelector<HTMLElement>(".cmb-description")
      const from = view.posAtDOM(line, 0)
      if (!description) {
        rows.set(from, 0)
        continue
      }
      const rowHeight = Number.parseFloat(getComputedStyle(line).lineHeight)
      if (!(rowHeight > 0)) continue
      if (line.classList.contains(DescriptionRoom.BELOW) && DescriptionRoom.fitsOnBand(description)) {
        rows.set(from, 0)
        continue
      }
      const below = (description.getBoundingClientRect().bottom - line.getBoundingClientRect().top) / scale - rowHeight
      // a pixel's slack:  a description on its band never reaches below it by more
      rows.set(from, below > 1 ? Math.ceil((below - 1) / rowHeight) : 0)
    }
    return rows
  }

  /**
   * Would `description`, drawn under its head, fit at its band's right end again, after the head's words?
   * - Drawn under it, it's as wide as its words, up to the band's:  narrower than the band's room after the words,
   *   it fits there, as the browser decides for it at the band's end.
   */
  private static fitsOnBand(description: HTMLElement): boolean {
    const band = description.closest<HTMLElement>(".cmb-band")
    if (!band?.firstChild) return false
    const words = document.createRange()
    words.setStartBefore(band.firstChild)
    words.setEndBefore(description)
    const end = band.getBoundingClientRect().right - Number.parseFloat(getComputedStyle(band).paddingRight)
    return words.getBoundingClientRect().right + description.getBoundingClientRect().width <= end + 0.5
  }
}

/** Do `a` and `b` give the same lines the same rows? */
function sameRows(a: Map<number, number>, b: Map<number, number>): boolean {
  if (a.size !== b.size) return false
  for (const [from, count] of a) if (b.get(from) !== count) return false
  return true
}

/****************
 * ### `FootWidget`
 * A block's foot:  a short bar off the bottom of its rail, turning out of it round a corner (I113),
 * on a line of its own under its last line.
 * - The rails of the blocks around it run on beside it;
 *   one whose own foot is in the row under it stops short there, for that foot's corner (`stopped`).
 * - Feet stacked under one line (I125):
 *   - a row with another foot under it is as tall as their rails are apart across (`drop`), so each foot is that far
 *     below the one above it
 *   - the last row takes the rest, so the line under the stack starts on a whole pixel, as under one foot (I114)
 * - Right above a band, the last row has room under its foot (`--cmb-block-gap`), so the two blocks stand apart
 *   (Owen:  "add some space between the pill blocks";  T141):  in the foot's row, not the band's line,
 *   so the band's fold arrow stays centred on it, and a click there lands where a click on the foot does.
 * - A group's foot is its band's colour, as its rail is, drawn over its parent's (Owen, epic `language` I147:
 *   "This bar and curly should be colored by group, not app";  before, the parent's hue).
 ****************/
class FootWidget extends WidgetType {
  constructor(
    readonly column: number,
    readonly partOfSpeech: string,
    readonly rails: Rail[],
    /** a group's foot:  its band's colour, lighter than its hue's other bands (`cmb-group-foot`) */
    readonly of: "block" | "group" = "block"
  ) {
    super()
  }

  /** The rails beside it, by their place in `rails`, whose feet are in the row under it:  set while it's laid out. */
  readonly stopped = new Set<number>()

  /** The rails beside it that end in it, a group's parent's, whose foot it is:  set while it's laid out. */
  readonly ended = new Set<number>()

  /** The foot right above it, in whose row its rail stops short;  none when that's its last line. */
  stoppedIn: FootWidget | undefined

  /** How many tabs further down the foot under it is:  0 when it's the last of its stack. */
  drop = 0

  /** The tabs the rows above it in its stack take. */
  dropsAbove = 0

  /** Is the next line a band:  then its row has room under the foot, so the two blocks stand apart (T141). */
  isAboveBand = false

  eq(other: FootWidget): boolean {
    return (
      other.column === this.column &&
      other.partOfSpeech === this.partOfSpeech &&
      other.of === this.of &&
      other.drop === this.drop &&
      other.dropsAbove === this.dropsAbove &&
      other.isAboveBand === this.isAboveBand &&
      other.style === this.style
    )
  }

  toDOM(): HTMLElement {
    const row = document.createElement("div")
    row.className = "cmb-foot-row"
    row.style.cssText = this.style
    if (this.drop) row.classList.add("cmb-foot-over")
    if (this.isAboveBand) row.classList.add("cmb-foot-above-band")

    const foot = document.createElement("div")
    foot.className = `cmb-foot cmb-hue bubbly-${this.partOfSpeech}${this.of === "group" ? " cmb-group-foot" : ""}`
    foot.style.setProperty("--cmb-column", String(this.column))
    row.append(foot)
    return row
  }

  /** Its row's style:  the rails beside it, and how far down the foot under it is. */
  private get style(): string {
    const styles = this.rails.length ? [railsStyle(this.rails, this.stopped, this.ended)] : []
    if (this.drop) styles.push(`--cmb-foot-drop-tabs: ${this.drop}`)
    if (this.dropsAbove) styles.push(`--cmb-foot-drops-above: ${this.dropsAbove}`)
    return styles.join("; ")
  }

  ignoreEvent(): boolean {
    return false
  }
}
