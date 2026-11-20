import { foldEffect, unfoldEffect } from "@codemirror/language"
import {
  type ChangeSet,
  EditorSelection,
  EditorState,
  type Extension,
  Prec,
  type RangeSet,
  RangeSetBuilder,
  StateEffect,
  StateField,
  type Transaction
} from "@codemirror/state"
import { Decoration, type DecorationSet, EditorView, ViewPlugin, type ViewUpdate } from "@codemirror/view"

import { after, type CancelablePromise } from "spell/util/timing"
import type { Region } from "./CodeMirrorMarkup"
import { CodeMirrorSetup } from "./CodeMirrorSetup"

/****************
 * ### `CodeMirrorRelayout`
 * Decorations worked out from the whole text, which follow the text as it's typed,
 * and are worked out again once the typing pauses.
 * - Typing never waits:  CodeMirror moves the marks with each change at once (`decorations.map()`).
 *   - What a moved mark can't show, a line the edit just wrote, is added at once by `drawnAtOnce()`, if given:
 *     a blank body line's room, so the caret on it never moves as the layout comes (epic `language` I158).
 * - Worked out again after an edit once nothing has changed for `msec`,
 *   and as a view takes the state, which a parse may have reached while it was shown nowhere.
 * - And at once, in the same update, when a new parse comes (`CodeMirrorSetup.PARSED`):  it came after the typing
 *   paused anyway, and waiting showed the old layout a moment longer.
 * - Text not parsed yet in its project (`isAwaitingParse()`;  the editor opened a project from the compile cache, so
 *   its parse comes a second or two later):  the lines are hidden, so their first drawing is the parse's
 *   (epic `language` I148:  a row of feet drawn the old way for 1-2 seconds, from a parse of the file alone).
 *   - Shown when the parse comes, in the same update as its layout;  or after `AWAIT_PARSE_MSEC` at the most.
 * - And at once, in the same update, when a block folds or unfolds:  a folded block is drawn as its head alone
 *   (epic `language` I116), and waiting showed its body's rails and feet under it for a moment.
 * - The caret's line stays where it is on screen as the layout changes under the typing (epic `codemirror` I21):
 *   a new layout (at the pause, or with a parse) can make the lines above it taller or shorter, by a row of feet,
 *   a block, a description's rows, which moved the line being typed in by up to 150px (`keepCaretLine()`).
 *   - Only while the editor has the keyboard and the caret's on screen:  else CodeMirror keeps the top line still,
 *     as it always does.
 * - The pause doesn't lay a project's file out from its text alone when its project's parse is on its way
 *   (`isParseOnItsWay()`):  that drew it the other way for a moment, 200px shorter in Solitaire.spell,
 *   then back again 50ms later as the parse came (epic `codemirror` I21);  it waits for that parse,
 *   or `AWAIT_PARSE_MSEC` at the most.
 * - In the editor's state, not a view plugin's, so its decorations may be block widgets.
 * - A layout may keep its marks out of the state (`LaidOut.marksIn()`;  epic `codemirror` P7):
 *   a view plugin draws them only for the lines CodeMirror draws, the screen and a margin round it (`view.viewport`),
 *   again as they change, from the same layout.
 *   - Typing moves them with the text, as the state's (`marksTyped()`, if given);
 *     a stretch scrolled to before the next layout is marked from the last one, through the edits since.
 *   - CodeMirror runs the plugin before it draws, so a line never comes on screen plain.
 *   - The state's part keeps what changes a line's height or is read far off screen:  CodeMirror must know a hidden line
 *     break to guess the height of the lines it hasn't drawn.
 * - A decoration whose spec says `atomic: true` is one step for the caret (`EditorView.atomicRanges`):
 *   e.g. the line breaks hidden between a row of feet (`CodeMirrorDecorations.feetRow()`;  epic `language` I132)
 * - Drawn at the lowest precedence:  CodeMirror draws a lower source's marks OUTSIDE a higher's,
 *   so a found word's or a problem's mark goes inside, rather than cutting one of these in two.
 * - Its position in the import graph:  CodeMirror and util's timing alone.
 ****************/
export class CodeMirrorRelayout {
  /** The most the lines wait hidden for their parse, in msec:  a parse that never comes still shows them. */
  static AWAIT_PARSE_MSEC = 4000

  /**
   * Is `file` a project's file its project hasn't parsed yet, so a parse is on its way (`isAwaitingParse()`)?
   * - e.g. a project the editor opened from the compile cache:  nothing's parsed till it compiles behind the app
   */
  static isUnparsed(file: { match?: unknown } | undefined): boolean {
    return !!file && !file.match
  }

  /**
   * The extension keeping `decorationsOf(state)` on the editor:  at once, then again `msec` after the typing pauses.
   * - `decorationsOf()` MUST NOT throw:  it's called from CodeMirror's update.
   */
  static extension(
    decorationsOf: (state: EditorState) => DecorationSet | LaidOut,
    msec: number,
    { isAwaitingParse = () => false, isParseOnItsWay = () => false, drawnAtOnce, marksTyped }: RelayoutOptions = {}
  ): Extension {
    /** each view on this extension, so a transaction can find its own and keep its caret's line still */
    const views = new Set<EditorView>()
    const laidOut = StateEffect.define<Layout>()
    const layoutOf = (state: EditorState): Layout => {
      const made = decorationsOf(state)
      return "decorations" in made ? made : { decorations: made }
    }
    const field = StateField.define<Layout>({
      create: (state) => layoutOf(state),
      update(layout, transaction) {
        for (const effect of transaction.effects) if (effect.is(laidOut)) return effect.value
        if (
          transaction.effects.some(
            (effect) => effect.is(foldEffect) || effect.is(unfoldEffect) || effect.is(CodeMirrorSetup.PARSED)
          )
        ) {
          return layoutOf(transaction.state)
        }
        if (!transaction.docChanged) return layout
        const moved = layout.decorations.map(transaction.changes)
        return {
          ...layout,
          decorations: drawnAtOnce ? drawnAtOnce(moved, transaction) : moved,
          // the edits since the layout, for marks made from it
          editsSince: layout.marksIn
            ? (layout.editsSince?.compose(transaction.changes) ?? transaction.changes)
            : undefined
        }
      },
      provide: (it) => [
        Prec.lowest(EditorView.decorations.from(it, (layout) => layout.decorations)),
        EditorView.atomicRanges.of((view) => atomicIn(view.state.field(it).decorations))
      ]
    })
    const onScreen = ViewPlugin.fromClass(
      class {
        /** The marks drawn, for `region`. */
        marks: DecorationSet = Decoration.none
        /** The stretch of the text `marks` were made for, moved with the text since. */
        private region: Region | undefined
        /** The layout they were made from. */
        private layout: Layout

        constructor(readonly view: EditorView) {
          this.layout = view.state.field(field)
          this.mark()
        }

        update(update: ViewUpdate) {
          const layout = update.state.field(field)
          const isNew = layout.marksIn !== this.layout.marksIn
          this.layout = layout
          if (isNew) return this.mark()
          if (update.docChanged) {
            for (const transaction of update.transactions) {
              if (!transaction.docChanged) continue
              const moved = this.marks.map(transaction.changes)
              this.marks = marksTyped ? marksTyped(moved, transaction) : moved
            }
            if (this.region) {
              this.region = {
                from: update.changes.mapPos(this.region.from, -1),
                to: update.changes.mapPos(this.region.to, 1)
              }
            }
          }
          const { from, to } = update.view.viewport
          if (!this.region || from < this.region.from || to > this.region.to) this.mark()
        }

        /** Mark the lines CodeMirror draws now, from the layout, through the edits since. */
        private mark() {
          const { marksIn, editsSince } = this.layout
          const { from, to } = this.view.viewport
          this.region = { from, to }
          if (!marksIn) {
            this.marks = Decoration.none
            return
          }
          const back = editsSince?.invertedDesc
          const marks = marksIn(back ? { from: back.mapPos(from, -1), to: back.mapPos(to, 1) } : { from, to })
          this.marks = editsSince ? marks.map(editsSince) : marks
        }
      },
      {
        provide: (plugin) => [
          Prec.lowest(EditorView.decorations.of((view) => view.plugin(plugin)?.marks ?? Decoration.none)),
          EditorView.atomicRanges.of((view) => atomicIn(view.plugin(plugin)?.marks ?? Decoration.none))
        ]
      }
    )
    const relayout = ViewPlugin.fromClass(
      class {
        private timer: CancelablePromise<void> | undefined

        constructor(readonly view: EditorView) {
          views.add(view)
          // once more as a view takes the state:  a parse that came while it was shown nowhere told no plugin
          // (epic `editor` I215:  the code pane drew the `if`s it opened on as plain lines)
          this.relayoutSoon()
        }

        update(update: ViewUpdate) {
          if (update.docChanged) this.relayoutSoon()
          // the parse it waited for came, and the field laid the text out with it
          else if (update.transactions.some((it) => it.effects.some((effect) => effect.is(CodeMirrorSetup.PARSED))))
            this.timer?.cancel()
        }
        /**
         * Lay the text out again `msec` from now, unless something else changes first.
         * - Its parse on its way then:  wait for it (it lays the text out as it comes), `AWAIT_PARSE_MSEC` at the most.
         */
        relayoutSoon(wait = msec) {
          this.timer?.cancel()
          this.timer = after(wait / 1000, () => {
            const { state } = this.view
            if (wait === msec && isParseOnItsWay(state)) return this.relayoutSoon(CodeMirrorRelayout.AWAIT_PARSE_MSEC)
            this.view.dispatch({ effects: laidOut.of(layoutOf(state)) })
          })
        }

        destroy() {
          views.delete(this.view)
          this.timer?.cancel()
        }
      }
    )
    const awaitingParse = ViewPlugin.fromClass(
      class {
        /** Are the lines hidden, waiting for their parse?  Once it came, or the wait's over, never again. */
        isAwaiting = isAwaitingParse()
        /** the most they stay hidden */
        private readonly timer = this.isAwaiting
          ? after(CodeMirrorRelayout.AWAIT_PARSE_MSEC / 1000, () => this.stopAwaiting())
          : undefined

        constructor(readonly view: EditorView) {}

        update() {
          if (!this.isAwaiting || isAwaitingParse()) return
          this.isAwaiting = false
          this.timer?.cancel()
        }
        /** Show the lines though their parse hasn't come:  an empty update, so the editor's class follows. */
        stopAwaiting() {
          if (!this.isAwaiting) return
          this.isAwaiting = false
          this.view.dispatch({})
        }

        destroy() {
          this.timer?.cancel()
        }
      },
      {
        provide: (plugin) =>
          EditorView.editorAttributes.of((view) => (view.plugin(plugin)?.isAwaiting ? { class: AWAITING_PARSE } : null))
      }
    )
    const caretLineStill = EditorState.transactionExtender.of((transaction) => {
      if (!transaction.effects.some((effect) => effect.is(laidOut) || effect.is(CodeMirrorSetup.PARSED))) return null
      for (const view of views) {
        if (view.state === transaction.startState) return keepCaretLine(view)
      }
      return null
    })
    return [field, onScreen, relayout, awaitingParse, caretLineStill]
  }
}

/**
 * An effect keeping `view`'s caret's line where it is on screen through the transaction it goes in, as its lines
 * above change height;  `null` when the editor hasn't the keyboard, or the caret's off screen.
 * - CodeMirror's own scroll snapshot, anchored on the caret's line instead of the top one:  applied once the new
 *   heights are measured, before anything's painted.
 * - SIDE EFFECT:  reads the scroll position, and the layout if it's due:  once a layout, never at every key.
 */
function keepCaretLine(view: EditorView): { effects: StateEffect<unknown> } | null {
  if (!view.hasFocus) return null
  const { scrollTop, clientHeight } = view.scrollDOM
  const line = view.lineBlockAt(view.state.selection.main.head)
  const top = line.top - scrollTop
  if (top < 0 || top > clientHeight) return null
  const snapshot = view.scrollSnapshot()
  // HACK:  CodeMirror makes snapshots of the top line alone;  its target's fields are plain, so this one's moved onto
  // the caret's line (`ScrollTarget`:  `range` the line's place, `yMargin` its top below the scroller's)
  Object.assign(snapshot.value, { range: EditorSelection.cursor(line.from), yMargin: top })
  return { effects: snapshot }
}

/**
 * A text laid out, split in two (epic `codemirror` P7):
 * - `decorations`:  the whole file's, kept in the editor's state
 * - `marksIn(region)`:  the rest, for the lines in `region` of the text laid out, as a view draws them
 *   - MUST NOT throw
 */
export type LaidOut = { decorations: DecorationSet; marksIn?: ((region: Region) => DecorationSet) | undefined }

/** A layout as the editor's state keeps it:  `editsSince`, the edits made since it, which its marks are moved through. */
type Layout = LaidOut & { editsSince?: ChangeSet | undefined }

/** What else `CodeMirrorRelayout.extension()` takes. */
export type RelayoutOptions = {
  /**
   * Is the parse the layout reads still on its way, so the lines wait hidden for it?
   * - Read as the view's made and at each update:  `CodeMirrorSetup.PARSED` brings one.
   * - MUST NOT throw.
   */
  isAwaitingParse?: () => boolean
  /**
   * Is a parse of `state`'s text on its way, as one of a project's files is parsed again once its typing pauses
   * (`FileStates.parseSoon()`)?  The pause's layout waits for it, rather than drawing the text alone.
   * - MUST NOT throw.
   */
  isParseOnItsWay?: (state: EditorState) => boolean
  /**
   * `decorations`, moved with `transaction`'s edit, and what the lines it wrote need drawn at once,
   * before the text is laid out again (`CodeMirrorBubbly`'s blank body lines;  epic `language` I158).
   * - MUST NOT throw.
   */
  drawnAtOnce?: (decorations: DecorationSet, transaction: Transaction) => DecorationSet
  /**
   * The marks on screen (`LaidOut.marksIn()`), moved with `transaction`'s edit, and changed as it needs at once.
   * - MUST NOT throw.
   */
  marksTyped?: (marks: DecorationSet, transaction: Transaction) => DecorationSet
}

/** The editor's class while its lines wait for their parse:  `codemirror.css` hides them. */
const AWAITING_PARSE = "cm-awaiting-parse"

/** Each set's atomic decorations, worked out once. */
const ATOMIC = new WeakMap<DecorationSet, RangeSet<Decoration>>()

/** The decorations in `decorations` whose spec says `atomic: true`. */
function atomicIn(decorations: DecorationSet): RangeSet<Decoration> {
  let atomic = ATOMIC.get(decorations)
  if (atomic) return atomic
  const builder = new RangeSetBuilder<Decoration>()
  for (const each = decorations.iter(); each.value; each.next()) {
    if (each.value.spec.atomic) builder.add(each.from, each.to, each.value)
  }
  atomic = builder.finish()
  ATOMIC.set(decorations, atomic)
  return atomic
}
