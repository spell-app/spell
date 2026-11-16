import { invertedEffects, redo, redoDepth, undo, undoDepth } from "@codemirror/commands"
import { MergeView } from "@codemirror/merge"
import { type ChangeDesc, EditorState, StateEffect, StateField } from "@codemirror/state"
import { EditorView } from "@codemirror/view"

import { CodeMirrorBubbly } from "./CodeMirrorBubbly"
import { CodeMirrorLook } from "./CodeMirrorLook"
import { CodeMirrorSetup } from "./CodeMirrorSetup"
import { CodeMirrorTokens } from "./CodeMirrorTokens"

/****************
 * ### `CodeMirrorMerge`
 * Two sides of a file, side by side:  CodeMirror's merge view, as Publish shows a clash (epic `editor` T75, T101).
 * - `mine` left, the result, editable;  `theirs` right, read only (Owen, T101:  "Your Changes should be on the left").
 * - Each change has an arrow in the centre column, pointing left:  a click takes theirs into yours.
 *   - Taken, the arrow turns into an undo icon in the same place:  a click puts yours back, that change alone.
 *   - `undo()` / `redo()` step through the takes and put-backs, and what was typed, in order:
 *     what the dialog's ⌘Z and ⇧⌘Z run (I218), wherever the focus is.
 * - Both sides drawn bubbly while the look's on, each on its own, lined up round the collapsed gaps
 *   (`CodeMirrorLook`);  coloured by their tokens while it's off.
 * - Plain DOM and CodeMirror, no Solid:  `<DiffView>` holds one.
 ****************/
export class CodeMirrorMerge {
  /** CodeMirror's merge view:  `a` is yours, `b` theirs. */
  readonly view: MergeView
  /** The undo icons, over the centre column:  a box of our own, as the merge view redraws the column's arrows. */
  private readonly undoIcons: HTMLDivElement
  /** The undo icon's tooltip, as the dialog words it. */
  private readonly undoIconWords: string
  /** A redraw of the undo icons is waiting for the next frame. */
  private isDrawQueued = false

  constructor(parent: HTMLElement, sides: MergeTexts) {
    this.undoIconWords = sides.words.putBack
    this.undoIcons = document.createElement("div")
    this.undoIcons.className = "cm-merge-taken"
    this.undoIcons.addEventListener("mousedown", this.onUndoIconPressed)
    const redraws = EditorView.updateListener.of(() => this.queueDraw())
    this.view = new MergeView({
      parent,
      a: {
        doc: sides.mine,
        extensions: [
          bubbly(),
          takes,
          tookOnRevert,
          takesUndone,
          redraws,
          EditorView.updateListener.of((update) => {
            if (update.docChanged) sides.onChange?.(update.state.doc.toString())
          }),
          CodeMirrorSetup.extensions()
        ]
      },
      b: { doc: sides.theirs, extensions: [bubbly(), redraws, CodeMirrorSetup.extensions({ editable: false })] },
      revertControls: "b-to-a",
      renderRevertControl: () => iconButton("arrow left", sides.words.take),
      highlightChanges: true,
      gutter: true,
      collapseUnchanged: { margin: 3, minSize: 6 }
    })
    this.view.dom.querySelector(".cm-mergeViewEditors")?.append(this.undoIcons)
    // the merge view draws its arrows at a line's top:  each one new, centred on its line
    const arrows = this.view.dom.querySelector(".cm-merge-revert")
    if (arrows) new MutationObserver(() => this.centreArrows()).observe(arrows, { childList: true })
    rootOnceConnected(parent, [this.view.a, this.view.b])
  }

  /** Your side. */
  get mine(): EditorView {
    return this.view.a
  }

  /** Is there something to `action`? */
  canUndo(action: "undo" | "redo"): boolean {
    return (action === "undo" ? undoDepth : redoDepth)(this.mine.state) > 0
  }

  /** Undo or redo on your side, the focus wherever it is;  true if it did. */
  undo(action: "undo" | "redo"): boolean {
    return (action === "undo" ? undo : redo)(this.mine)
  }

  /** Put your side back as it was before the take `takeId`, that change alone:  one undo step. */
  putBack(takeId: number): void {
    const take = this.mine.state.field(takes).find((each) => each.takeId === takeId)
    if (!take) return
    this.mine.dispatch({
      changes: { from: take.from, to: take.to, insert: take.before },
      effects: putBackEffect.of(take),
      userEvent: PUT_BACK
    })
  }

  /** Measure again:  e.g. once a hidden one shows. */
  requestMeasure(): void {
    this.view.a.requestMeasure()
    this.view.b.requestMeasure()
    this.queueDraw()
  }

  /** Take it off the page. */
  destroy(): void {
    this.view.destroy()
  }

  ////////////////
  // ## The arrows and the undo icons
  ////////////////

  /**
   * Centre each arrow on its change's first line (Owen, epic `editor` T101):
   * the merge view puts it at the line's top, without the code's own padding, so a margin moves it.
   */
  private centreArrows() {
    for (const arrow of this.view.dom.querySelectorAll<HTMLElement>(".cm-merge-revert > [data-chunk]")) {
      const chunk = this.view.chunks[Number(arrow.dataset.chunk)]
      if (chunk) arrow.style.marginTop = `${this.centredTop(chunk.fromA, arrow) - parseFloat(arrow.style.top || "0")}px`
    }
  }

  /** Where `button`'s top goes, in the centre column, to be centred on `pos`'s line. */
  private centredTop(pos: number, button: HTMLElement): number {
    const column = this.view.dom.querySelector<HTMLElement>(".cm-merge-revert")
    const line = this.mine.lineBlockAt(pos)
    const lineMiddle = this.mine.documentTop + line.top + line.height / 2
    return lineMiddle - (column?.getBoundingClientRect().top ?? 0) - (button.offsetHeight || BUTTON_HEIGHT) / 2
  }

  /** Draw the undo icons at the next frame, once the merge view has measured. */
  private queueDraw() {
    if (this.isDrawQueued) return
    this.isDrawQueued = true
    requestAnimationFrame(() => {
      this.isDrawQueued = false
      this.drawUndoIcons()
    })
  }

  /** An undo icon for each take, where its arrow was:  in the centre column, centred on its first line. */
  private drawUndoIcons() {
    const column = this.view.dom.querySelector<HTMLElement>(".cm-merge-revert")
    if (!column) return
    const box = this.undoIcons.style
    box.left = `${column.offsetLeft}px`
    box.top = `${column.offsetTop}px`
    box.width = `${column.offsetWidth}px`
    const old = new Map(
      [...this.undoIcons.children].map((icon) => [Number((icon as HTMLElement).dataset.take), icon as HTMLElement])
    )
    for (const take of this.mine.state.field(takes)) {
      const icon = old.get(take.takeId) ?? iconButton("undo", this.undoIconWords)
      old.delete(take.takeId)
      icon.dataset.take = String(take.takeId)
      if (!icon.isConnected) this.undoIcons.append(icon)
      icon.style.top = `${this.centredTop(take.from, icon)}px`
    }
    for (const gone of old.values()) gone.remove()
    // a line's height can change without the merge view drawing its arrows again
    this.centreArrows()
  }

  /** A press on an undo icon:  that take put back, the focus left where it is (as the arrows do). */
  private readonly onUndoIconPressed = (event: MouseEvent) => {
    const icon = (event.target as Element).closest<HTMLElement>("[data-take]")
    if (!icon) return
    event.preventDefault()
    this.putBack(Number(icon.dataset.take))
  }
}

/** The two sides `CodeMirrorMerge` shows. */
export type MergeTexts = {
  /** the published text, right */
  theirs: string
  /** your draft, left:  the result */
  mine: string
  /** your side's text after each change */
  onChange?: (mine: string) => void
  /** the centre column's tooltips, in the page's language */
  words: {
    /** an arrow's:  take their change */
    take: string
    /** an undo icon's:  put yours back */
    putBack: string
  }
}

/** One change taken from theirs:  where it is in yours now, and what was there before. */
type Take = {
  /** which, to put it back by */
  takeId: number
  /** where its text starts in yours */
  from: number
  /** where its text ends in yours */
  to: number
  /** your text it replaced */
  before: string
}

/** An arrow's and an undo icon's height, before it's drawn:  `codemirror.css`. */
const BUTTON_HEIGHT = 24

/** The user event of a put-back, kept apart from the merge view's own `revert`. */
const PUT_BACK = "putBack"

/** The last `takeId` given. */
let lastTakeId = 0

/** `take`, where it is after `changes`:  text typed at its edges stays outside it. */
function mapTake(take: Take, changes: ChangeDesc): Take {
  const from = changes.mapPos(take.from, 1)
  return { ...take, from, to: Math.max(from, changes.mapPos(take.to, -1)) }
}

/** A change taken from theirs. */
const tookEffect = StateEffect.define<Take>({ map: mapTake })

/** A take put back. */
const putBackEffect = StateEffect.define<Take>({ map: mapTake })

/** The changes taken from theirs, and still there:  each one's undo icon. */
const takes = StateField.define<Take[]>({
  create: () => [],
  update(value, transaction) {
    let next = transaction.docChanged ? value.map((take) => mapTake(take, transaction.changes)) : value
    for (const effect of transaction.effects) {
      if (effect.is(tookEffect)) next = [...next.filter((take) => take.takeId !== effect.value.takeId), effect.value]
      else if (effect.is(putBackEffect)) next = next.filter((take) => take.takeId !== effect.value.takeId)
    }
    // a take typed over until nothing of it is left is gone
    return next.filter((take) => take.from < take.to || take.before !== "")
  }
})

/** An arrow clicked (the merge view's `revert`):  each change it made is a take. */
const tookOnRevert = EditorState.transactionExtender.of((transaction) => {
  if (!transaction.isUserEvent("revert")) return null
  const effects: StateEffect<Take>[] = []
  transaction.changes.iterChanges((fromA, toA, from, to) =>
    effects.push(tookEffect.of({ takeId: ++lastTakeId, from, to, before: transaction.startState.sliceDoc(fromA, toA) }))
  )
  return { effects }
})

/** Undo and redo bring the undo icons back and take them away with the text. */
const takesUndone = invertedEffects.of((transaction) =>
  transaction.effects.flatMap((effect) => {
    if (effect.is(tookEffect)) return [putBackEffect.of(effect.value)]
    if (effect.is(putBackEffect)) return [tookEffect.of(effect.value)]
    return []
  })
)

/** A button in the centre column:  an icon, its tooltip `title`. */
function iconButton(icon: string, title: string): HTMLButtonElement {
  const button = document.createElement("button")
  button.type = "button"
  button.title = title
  button.setAttribute("aria-label", title)
  const glyph = document.createElement("ui-icon")
  glyph.setAttribute("name", icon)
  button.append(glyph)
  return button
}

/** Spell drawn bubbly while the look's on, else coloured by its tokens. */
function bubbly() {
  return CodeMirrorLook.extension((isBubbly) =>
    isBubbly ? CodeMirrorBubbly.extension(() => undefined) : CodeMirrorTokens.extension(() => undefined)
  )
}

/**
 * Give `views` their root (the page, or a shadow root) once `parent` is in it.
 * - HACK: a view made in an element that's not in the page yet (Solid draws a branch, then inserts it) takes that
 *   element's own tree as its root, and puts its style sheet there:  the editor then draws with none of CodeMirror's
 *   own CSS.  `setRoot()` moves it.
 */
function rootOnceConnected(parent: HTMLElement, views: EditorView[], frames = 60) {
  if (parent.isConnected) {
    const root = parent.getRootNode() as Document | ShadowRoot
    for (const view of views) if (view.root !== root) view.setRoot(root)
  } else if (frames > 0) requestAnimationFrame(() => rootOnceConnected(parent, views, frames - 1))
}
