import { foldEffect, unfoldEffect } from "@codemirror/language"
import {
  type EditorState,
  type Extension,
  Prec,
  type RangeSet,
  RangeSetBuilder,
  StateEffect,
  StateField
} from "@codemirror/state"
import { type Decoration, type DecorationSet, EditorView, ViewPlugin, type ViewUpdate } from "@codemirror/view"

import { after, type CancelablePromise } from "spell/util/timing"
import { CodeMirrorSetup } from "./CodeMirrorSetup"

/****************
 * ### `CodeMirrorRelayout`
 * Decorations worked out from the whole text, which follow the text as it's typed,
 * and are worked out again once the typing pauses.
 * - Typing never waits:  CodeMirror moves the marks with each change at once (`decorations.map()`).
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
 * - In the editor's state, not a view plugin's, so its decorations may be block widgets.
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
    decorationsOf: (state: EditorState) => DecorationSet,
    msec: number,
    { isAwaitingParse = () => false }: RelayoutOptions = {}
  ): Extension {
    const laidOut = StateEffect.define<DecorationSet>()
    const field = StateField.define<DecorationSet>({
      create: (state) => decorationsOf(state),
      update(decorations, transaction) {
        for (const effect of transaction.effects) if (effect.is(laidOut)) return effect.value
        if (
          transaction.effects.some(
            (effect) => effect.is(foldEffect) || effect.is(unfoldEffect) || effect.is(CodeMirrorSetup.PARSED)
          )
        ) {
          return decorationsOf(transaction.state)
        }
        return transaction.docChanged ? decorations.map(transaction.changes) : decorations
      },
      provide: (it) => [
        Prec.lowest(EditorView.decorations.from(it)),
        EditorView.atomicRanges.of((view) => atomicIn(view.state.field(it)))
      ]
    })
    const relayout = ViewPlugin.fromClass(
      class {
        private timer: CancelablePromise<void> | undefined

        constructor(readonly view: EditorView) {
          // once more as a view takes the state:  a parse that came while it was shown nowhere told no plugin
          // (epic `editor` I215:  the code pane drew the `if`s it opened on as plain lines)
          this.relayoutSoon()
        }

        update(update: ViewUpdate) {
          if (update.docChanged) this.relayoutSoon()
        }
        /** Lay the text out again `msec` from now, unless something else changes first. */
        relayoutSoon() {
          this.timer?.cancel()
          this.timer = after(msec / 1000, () => {
            this.view.dispatch({ effects: laidOut.of(decorationsOf(this.view.state)) })
          })
        }

        destroy() {
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
    return [field, relayout, awaitingParse]
  }
}

/** What else `CodeMirrorRelayout.extension()` takes. */
export type RelayoutOptions = {
  /**
   * Is the parse the layout reads still on its way, so the lines wait hidden for it?
   * - Read as the view's made and at each update:  `CodeMirrorSetup.PARSED` brings one.
   * - MUST NOT throw.
   */
  isAwaitingParse?: () => boolean
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
