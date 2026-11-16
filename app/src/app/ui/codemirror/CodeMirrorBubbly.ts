import { type EditorState, type Extension, Prec, type Range, StateEffect, StateField } from "@codemirror/state"
import { Decoration, type DecorationSet, EditorView, ViewPlugin, type ViewUpdate, WidgetType } from "@codemirror/view"

import { after, type CancelablePromise } from "spell/util/timing"
import { SP } from "spell/parser/spell"
import { BubblyHtml } from "spell/app/app/components/spell-code/BubblyHtml"
import { BubblyMarkup } from "spell/app/app/components/spell-code/BubblyMarkup"
import { CodeMirrorSetup } from "./CodeMirrorSetup"

/****************
 * ### `CodeMirrorBubbly`
 * Spell drawn in the bubbly look in a CodeMirror editor (epic `editor` P30, the CodeMirror test), from the parser's
 * `SP.BubblyLayout`, the same data Monaco's `SpellBubbly` and the page's `BubblyHtml` draw from.
 * - Everything is a REAL element in the text's own lines, laid out by the browser:
 *   - each declaration's head on a band:  a mark round its words (`cmb-band`), in its part of speech's colour
 *   - its body's rail:  a line decoration on every line under it, a stripe per enclosing block (`--cmb-rails`)
 *   - its foot:  a block widget after its last line
 *   - what a person typed in white pills, a quoted one's curly marks, bold names, italic values, faint marks,
 *     one dotted line under each value and question:  marks in the classes of the look's one sheet, `bubbly.css`
 *   - a drawing's code, `{…}`, an inverted pill;  a drawing's tag in a band of its own
 * - No layer behind the text, no injected text for room:  padding round a pill is the pill's own padding,
 *   and the caret still lands on its letters, as CodeMirror measures the lines as they're drawn.
 * - Typing never waits for the layout:  CodeMirror moves the marks with the text,
 *   and the layout is worked out again once the typing pauses (`RELAYOUT_MSEC`).
 * - The editor's box is a `.bubbly` too (`EDITOR_CLASSES`), so the sheet's settings and rules reach it;
 *   only what's the editor's own is in `codemirror.css`.
 * - Its position in the import graph:  the parser's types and layout, CodeMirror;  never Monaco.
 * - NEVER throws:  a layout that fails leaves the code plain, and logs why.
 ****************/
export class CodeMirrorBubbly {
  /**
   * The extension drawing a Spell file bubbly.
   * - `fileOf()`:  the project file the editor shows, if it is one, so the layout reads the project's own parse of it.
   */
  static extension(fileOf: () => SP.SpellFile | undefined): Extension {
    // a block widget (a foot) can't come from a view plugin:  the layout lives in the state
    const laidOut = StateEffect.define<DecorationSet>()
    const layout = StateField.define<DecorationSet>({
      create: (state) => CodeMirrorBubbly.decorationsOf(state, fileOf()),
      update(decorations, transaction) {
        for (const effect of transaction.effects) if (effect.is(laidOut)) return effect.value
        // the marks follow the text at once;  laid out again once the typing pauses
        return transaction.docChanged ? decorations.map(transaction.changes) : decorations
      },
      // lowest:  CodeMirror draws a lower source's marks OUTSIDE a higher's, so a found word's or a problem's mark goes
      // inside a pill, rather than cutting it in two
      provide: (field) => Prec.lowest(EditorView.decorations.from(field))
    })
    const relayout = ViewPlugin.fromClass(
      class {
        private timer: CancelablePromise<void> | undefined

        constructor(readonly view: EditorView) {}

        update(update: ViewUpdate) {
          // laid out again after an edit, or a new parse
          const isParsed = update.transactions.some((it) => it.effects.some((e) => e.is(CodeMirrorSetup.PARSED)))
          if (!update.docChanged && !isParsed) return
          this.timer?.cancel()
          this.timer = after(CodeMirrorBubbly.RELAYOUT_MSEC / 1000, () => {
            const decorations = CodeMirrorBubbly.decorationsOf(this.view.state, fileOf())
            this.view.dispatch({ effects: laidOut.of(decorations) })
          })
        }

        destroy() {
          this.timer?.cancel()
        }
      }
    )
    return [layout, relayout, EditorView.editorAttributes.of({ class: EDITOR_CLASSES })]
  }

  /** How long the typing must pause before the code's laid out again, in msec:  Monaco's `SpellBubbly` waits 300. */
  static RELAYOUT_MSEC = 150

  /**
   * Every decoration of `state`'s text, laid out bubbly.
   * - `within`:  its project file, whose parse is read when it's of this very text.
   * - NEVER throws:  `Decoration.none` when the layout fails.
   */
  static decorationsOf(state: EditorState, within?: SP.SpellFile): DecorationSet {
    const text = state.doc.toString()
    try {
      const parser = within ? SP.Language.forFile(within.path).parser : SP.spellParser
      const drawing = SP.BubblyLayout.of(text, parser, { within })
      return new BubblyDecorations(state, drawing, (tag) => isViewTag(within, tag)).build()
    } catch (error) {
      console.error("CodeMirrorBubbly:  couldn't lay the code out", error)
      return Decoration.none
    }
  }
}

/** The editor's own classes:  a `.bubbly`, so `bubbly.css` reaches it, and ours. */
const EDITOR_CLASSES = "bubbly cmb-editor"

/** One enclosing block, as a body line draws its rail:  where its band starts, in tab stops, and its colour. */
type Rail = { column: number; partOfSpeech: SP.BubblyPartOfSpeech }

/** One drawing being turned into decorations. */
class BubblyDecorations {
  private readonly ranges: Array<Range<Decoration>> = []
  /**
   * Each mark's classes, by its range (`start:end`):  ONE mark per range, its classes together.
   * - CodeMirror nests two marks over the same range in no set order, so `bubbly-quoted` round `bubbly-input`
   *   came out either way round;  a longer mark always holds a shorter one.
   */
  private readonly marks = new Map<string, Set<string>>()
  private readonly text: string

  constructor(
    private readonly state: EditorState,
    private readonly drawing: SP.BubblyDrawing,
    /** is a drawing's tag one of the project's own views? */
    private readonly isView: (tag: string) => boolean
  ) {
    this.text = drawing.text
  }

  /** The decorations, sorted as CodeMirror wants them. */
  build(): DecorationSet {
    this.nodes(this.drawing.nodes, [])
    for (const [range, classes] of this.marks) {
      const [start, end] = range.split(":").map(Number) as [number, number]
      this.ranges.push(Decoration.mark({ class: [...classes].join(" ") }).range(start, end))
    }
    return Decoration.set(this.ranges, true)
  }

  /** `nodes`, inside the blocks `rails` holds, outermost first. */
  private nodes(nodes: SP.BubblyNode[], rails: Rail[]) {
    for (const node of nodes) {
      switch (node.kind) {
        case "gap":
          this.lineOf(node.start, rails)
          break
        case "line":
          this.lineOf(node.start, rails)
          this.line(node)
          break
        case "block":
          this.block(node, rails)
          break
      }
    }
  }

  /** A declaration, or a control line with steps under it:  its band, its body, its foot. */
  private block(block: SP.BubblyBlock, rails: Rail[]) {
    const { head, partOfSpeech } = block
    const line = this.state.doc.lineAt(head.start)
    const column = head.start - line.from
    const hasBody = block.body.some((node) => node.kind !== "gap")
    this.lineOf(head.start, rails, ["cmb-head"])
    const hue = ["cmb-hue", `bubbly-${partOfSpeech}`, ...(block.isGroup ? ["bubbly-group"] : [])]
    const band = ["cmb-band", hasBody ? "cmb-band-open" : "cmb-band-pill", ...hue]
    this.mark(head.start, head.end, band)
    this.line(head, partOfSpeech)
    if (!hasBody) return
    const inside = [...rails, { column, partOfSpeech }]
    this.nodes(block.body, inside)
    // the foot, under its last line
    const last = lastLineEnd(block)
    this.ranges.push(
      Decoration.widget({
        widget: new FootWidget(column, partOfSpeech, rails),
        block: true,
        // an inner block's foot before its parent's, when they end on the same line
        side: 1000 - block.level
      }).range(this.state.doc.lineAt(last).to)
    )
  }

  /** A line's stretches as marks:  each piece's look, a quoted input's pill and marks, the dotted lines. */
  private line(line: SP.BubblyLine, band?: SP.BubblyPartOfSpeech) {
    const stretches = SP.BubblyStretches.ofLine(this.text, line, band ? { band } : {})
    for (const [index, stretch] of stretches.entries()) {
      const { start, end, kind } = stretch
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
          this.mark(start, end, ["bubbly-comment", ...(band ? ["bubbly-band-comment"] : [])])
          if (this.text.startsWith("--", start)) this.mark(start, start + 2, ["bubbly-dash"])
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
      this.mark(code.start, code.end, ["bubbly-input", "bubbly-expression"])
      this.mark(code.start, code.start + 1, ["bubbly-code-brace"])
      this.mark(code.end - 1, code.end, ["bubbly-code-brace"])
    }
    this.tags(line, this.isView)
  }

  /** A Spell expression's `{` and `}` among faint marks:  a step darker, so a `{…}` reads as one. */
  private braces(start: number, end: number) {
    for (let at = start; at < end; at++) {
      if (this.text[at] === "{" || this.text[at] === "}") this.mark(at, at + 1, ["bubbly-brace"])
    }
  }

  /**
   * A drawing's tags on `line`, `<text color="blue">`:  each in a band of its own, in its part of speech's colour,
   * as Monaco's `MarkupMarks` draws them (`BubblyMarkup.partOfSpeechOf()`):  the project's own view, or a tag that
   * declares a member (`<number "score" />`), a thing's.
   */
  private tags(line: SP.BubblyLine, isView: (tag: string) => boolean) {
    const codes = line.codes ?? []
    const isInCode = (at: number) => codes.some((code) => at >= code.start && at < code.end)
    let open: number | undefined
    for (let at = line.start; at < line.end; at++) {
      if (isInCode(at)) continue
      const char = this.text[at]
      if (char === "<") open = at
      else if (char === ">" && open !== undefined) {
        const isClosing = this.text[open + 1] === "/"
        const tag = /^<\/?([\p{L}\p{M}\d_-]*)/u.exec(this.text.slice(open, at))?.[1] ?? ""
        const partOfSpeech =
          isView(tag) || this.drawing.declaringTags.includes(open) ? "thing" : BubblyMarkup.partOfSpeechOf(tag)
        const classes = ["cmb-tag", "cmb-hue", `bubbly-${partOfSpeech}`, ...(isClosing ? ["cmb-tag-close"] : [])]
        this.mark(open, at + 1, classes)
        open = undefined
      }
    }
  }

  /** The line `at` is on:  its rails, from `rails`, outermost first, and `classes`. */
  private lineOf(at: number, rails: Rail[], classes: string[] = []) {
    const line = this.state.doc.lineAt(at)
    const innermost = rails.at(-1)
    const attributes: Record<string, string> = {}
    if (rails.length) attributes.style = `--cmb-rails: ${railsOf(rails)}`
    const lineClasses = [...classes, ...(innermost ? ["cmb-hue", `bubbly-${innermost.partOfSpeech}`] : [])]
    if (!lineClasses.length && !rails.length) return
    this.ranges.push(Decoration.line({ class: lineClasses.join(" "), attributes }).range(line.from))
  }

  /** Mark `start`-`end` with `classes`, along with any other classes the same stretch has. */
  private mark(start: number, end: number, classes: string[]) {
    if (end <= start || !classes.length) return
    const key = `${start}:${end}`
    const marked = this.marks.get(key) ?? new Set()
    for (const each of classes) marked.add(each)
    this.marks.set(key, marked)
  }
}

/** A stretch's classes in the sheet, as the page's (`BubblyHtml.classesFor()`). */
function classesOf(kind: SP.BubblyStretchKind): string[] {
  if (kind === "quote-open" || kind === "quote-close" || kind === "underline") return []
  return BubblyHtml.classesFor(kind).split(" ").filter(Boolean)
}

/**
 * `rails` as a CSS background:  one stripe per enclosing block, at its band's left edge, in its band's colour.
 * - `codemirror.css` sizes a tab stop (`--cmb-indent`) and a rail (`--cmb-rail`):  only the columns are written here.
 */
function railsOf(rails: Rail[]): string {
  return rails
    .map(({ column, partOfSpeech }) => {
      const x = `calc(var(--cmb-line-pad) + ${column} * var(--cmb-indent) - var(--cmb-band-inset))`
      const colour = `var(--cmb-band-${partOfSpeech})`
      return `linear-gradient(to right, transparent ${x}, ${colour} ${x}, ${colour} calc(${x} + var(--cmb-rail)), transparent calc(${x} + var(--cmb-rail)))`
    })
    .join(", ")
}

/** Is `tag` one of `file`'s project's own views, `<stock-pile>`?  As the compiler decides it (`SP.SpellJSX.isDrawnType()`). */
function isViewTag(file: SP.SpellFile | undefined, tag: string): boolean {
  const type = tag && file?.scope?.getType(SP.typeName(tag))
  return !!type && SP.SpellJSX.isDrawnType(type)
}

/** Where `block`'s last line that isn't a gap ends. */
function lastLineEnd(block: SP.BubblyBlock): number {
  const last = block.body.findLast((node) => node.kind !== "gap")
  if (!last) return block.head.end
  return last.kind === "block" ? lastLineEnd(last) : (last as SP.BubblyLine).end
}

/****************
 * ### `FootWidget`
 * A block's foot:  a short bar off the bottom of its rail, on a line of its own under its last line.
 * - The rails of the blocks around it run on beside it.
 ****************/
class FootWidget extends WidgetType {
  constructor(
    readonly column: number,
    readonly partOfSpeech: SP.BubblyPartOfSpeech,
    readonly rails: Rail[]
  ) {
    super()
  }

  eq(other: FootWidget): boolean {
    return (
      other.column === this.column &&
      other.partOfSpeech === this.partOfSpeech &&
      railsOf(other.rails) === railsOf(this.rails)
    )
  }

  toDOM(): HTMLElement {
    const row = document.createElement("div")
    row.className = "cmb-foot-row"
    if (this.rails.length) row.style.setProperty("--cmb-rails", railsOf(this.rails))
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
