import { type EditorState, type Extension, Prec, RangeSetBuilder, StateEffect, StateField } from "@codemirror/state"
import {
  Decoration,
  type DecorationSet,
  EditorView,
  showTooltip,
  type Tooltip,
  ViewPlugin,
  type ViewUpdate,
  WidgetType
} from "@codemirror/view"

import { after, type CancelablePromise } from "spell/util/timing"
import { CodeEditorFeatures } from "spell/app/app/ui/CodeEditorFeatures"
import { hoverDelay } from "spell/app/app/ui/codePopups"

/****************
 * ### `CodeMirrorLinks`
 * A web address in the code opens in a new tab, in a CodeMirror editor (epic `codemirror` P5),
 * as in VS Code:
 * - after each one, a small "open" icon (Font Awesome's `up-right-from-square`):  a plain click on it opens it
 *   - a widget, not in the text:  the caret steps over it, and copying the line leaves it out
 *   - muted, the link's colour when hovered (`codemirror.css`, `.cmb-link-icon`)
 * - ⌘-click on the address opens it (Ctrl-click off a Mac), ahead of the editor's own ⌘-click, go to definition
 *   (`SpellCodeMirror`):  this one's handler is `Prec.highest`
 * - with ⌘ held over one, it's underlined and the pointer shows a hand;
 *   a plain hover says how ("⌘-click to open") once it rests `hoverDelay()`, as the hover does
 * - Where the addresses are, the key and the tip's words:  `CodeEditorFeatures`.
 * - Any editor of a project file:  Spell and HTML alike (`FileStates`).
 * - Its position in the import graph:  CodeMirror, the app's code settings and `CodeEditorFeatures`.
 ****************/
export class CodeMirrorLinks {
  /** The links, for an editor of a project file. */
  static extension(): Extension {
    return [
      UNDER,
      ICONS,
      Prec.highest(EditorView.domEventHandlers({ mousedown: (event, view) => CodeMirrorLinks.pressed(event, view) })),
      EditorView.decorations.compute([UNDER], (state) => readyMark(state))
    ]
  }

  /**
   * A press on an address with ⌘ held:  open it, and nothing else happens;  `false` leaves it to the rest.
   * - Its icon's own press is the icon's (`LinkIcon`):  the editor hears nothing of it.
   */
  private static pressed(event: MouseEvent, view: EditorView): boolean {
    if (event.button !== 0 || !CodeEditorFeatures.isOpenKey(event)) return false
    const address = addressAtPoint(view, event.clientX, event.clientY)
    if (!address) return false
    event.preventDefault()
    open(address.url)
    return true
  }
}

////////////////
// ## The address under the mouse
////////////////

/** An address in the code:  its text, and where it is, offsets in the document. */
type AddressSpan = {
  /** the address */
  url: string
  /** where it starts */
  from: number
  /** just after it */
  to: number
}

/** What the mouse is over now:  `UNDER`'s value. */
type Under = {
  /** the address under the mouse, if any (not its icon) */
  address?: AddressSpan
  /** ⌘ (Ctrl off a Mac) held, as of the mouse's last move or the last key */
  isKeyHeld: boolean
  /** the tip shows */
  showsTip: boolean
}

/** A new `Under`, from the plugin following the mouse. */
const setUnder = StateEffect.define<Under>()

/** What the mouse is over, in each state:  read by the underline and the tip;  an edit forgets it. */
const UNDER = StateField.define<Under>({
  create: () => NOTHING_UNDER,
  update(under, transaction) {
    for (const effect of transaction.effects) if (effect.is(setUnder)) return effect.value
    return transaction.docChanged ? NOTHING_UNDER : under
  },
  provide: (field) => showTooltip.from(field, (under) => tipFor(under))
})

/** Nothing under the mouse. */
const NOTHING_UNDER: Under = { isKeyHeld: false, showsTip: false }

/** The underline and the hand on the address under the mouse, while ⌘ is held. */
function readyMark(state: EditorState): DecorationSet {
  const { address, isKeyHeld } = state.field(UNDER)
  return address && isKeyHeld ? Decoration.set([READY.range(address.from, address.to)]) : Decoration.none
}

/** The mark on an address ready to open. */
const READY = Decoration.mark({ class: "cmb-link-ready" })

/**
 * The address at `x`, `y` on the page, if the mouse is over its letters:  not past its line's end, not its icon.
 * - CodeMirror gives the nearest place to a point:  so the point must be within the address's own box.
 */
function addressAtPoint(view: EditorView, x: number, y: number): AddressSpan | undefined {
  const pos = view.posAtCoords({ x, y }, false)
  if (pos === null) return undefined
  const line = view.state.doc.lineAt(pos)
  const found = CodeEditorFeatures.addressAt(line.text, pos - line.from)
  if (!found) return undefined
  const address = { url: found.url, from: line.from + found.start, to: line.from + found.end }
  const start = view.coordsAtPos(address.from, 1)
  const end = view.coordsAtPos(address.to, -1)
  if (!start || !end || y < start.top || y > end.bottom || x < start.left || x > end.right) return undefined
  return address
}

/** Open `url` in a new tab, with no way back to this page. */
function open(url: string): void {
  window.open(url, "_blank", "noopener")
}

////////////////
// ## Following the mouse and ⌘
////////////////

/**
 * Follows the mouse over the editor and ⌘, into `UNDER`;  draws an icon after each address it shows.
 * - The keys from the window, so ⌘ held counts with the focus elsewhere, as the mouse does.
 */
const ICONS = ViewPlugin.fromClass(
  class {
    /** The icons, after each address in the lines shown. */
    decorations: DecorationSet
    /** Shows the tip, once the mouse has rested `hoverDelay()`. */
    private timer: CancelablePromise<void> | undefined

    constructor(readonly view: EditorView) {
      this.decorations = iconsIn(view)
      window.addEventListener("keydown", this.keyChanged, true)
      window.addEventListener("keyup", this.keyChanged, true)
    }

    update(update: ViewUpdate): void {
      if (update.docChanged || update.viewportChanged) this.decorations = iconsIn(update.view)
      // the code changed under the mouse:  nothing's under it till it moves (`UNDER` forgets it too)
      if (update.docChanged) this.timer?.cancel()
    }

    destroy(): void {
      this.timer?.cancel()
      window.removeEventListener("keydown", this.keyChanged, true)
      window.removeEventListener("keyup", this.keyChanged, true)
    }

    /** The mouse moved:  the address under it, marked while ⌘ is held;  the tip after `hoverDelay()`. */
    moved(event: MouseEvent): void {
      const isOnIcon = (event.target as Element | null)?.closest?.(`.${ICON_CLASS}`)
      const address = isOnIcon ? undefined : addressAtPoint(this.view, event.clientX, event.clientY)
      const under = this.under
      const isSame = address?.from === under.address?.from && address?.to === under.address?.to
      if (!isSame) {
        this.timer?.cancel()
        if (address) this.timer = after(hoverDelay(), () => this.set({ ...this.under, showsTip: true }))
      }
      this.set({
        address,
        isKeyHeld: CodeEditorFeatures.isOpenKey(event),
        showsTip: isSame && under.showsTip
      })
    }

    /** The mouse left:  nothing's under it. */
    left(): void {
      this.timer?.cancel()
      this.set(NOTHING_UNDER)
    }

    /** ⌘ pressed or let go, the mouse still:  mark it, or not. */
    private readonly keyChanged = (event: KeyboardEvent) => {
      const { under } = this
      if (under.address) this.set({ ...under, isKeyHeld: CodeEditorFeatures.isOpenKey(event) })
    }

    /** What's under the mouse now. */
    private get under(): Under {
      return this.view.state.field(UNDER)
    }

    /** Make `under` what's under the mouse, if it isn't already. */
    private set(under: Under): void {
      const now = this.under
      const isSame =
        now.address?.from === under.address?.from &&
        now.address?.to === under.address?.to &&
        now.isKeyHeld === under.isKeyHeld &&
        now.showsTip === under.showsTip
      if (!isSame) this.view.dispatch({ effects: setUnder.of(under) })
    }
  },
  {
    decorations: (plugin) => plugin.decorations,
    eventHandlers: {
      mousemove(event) {
        this.moved(event)
      },
      mouseleave() {
        this.left()
      }
    }
  }
)

/** An icon after each address in the lines `view` shows. */
function iconsIn(view: EditorView): DecorationSet {
  const icons = new RangeSetBuilder<Decoration>()
  const { doc } = view.state
  for (const { from, to } of view.visibleRanges) {
    for (let at = from; at <= to;) {
      const line = doc.lineAt(at)
      for (const { url, end } of CodeEditorFeatures.addressesIn(line.text))
        icons.add(line.from + end, line.from + end, Decoration.widget({ widget: new LinkIcon(url), side: 1 }))
      at = line.to + 1
    }
  }
  return icons.finish()
}

////////////////
// ## The icon and the tip
////////////////

/** The class of the icon after each address:  a plain click on it opens the address. */
const ICON_CLASS = "cmb-link-icon"

/**
 * The icon after an address:  a press on it opens it, and the editor hears nothing of it.
 * - Its press is its own:  the editor ignores a widget's events (`ignoreEvent()`), so no caret moves.
 */
class LinkIcon extends WidgetType {
  constructor(readonly url: string) {
    super()
  }

  override eq(other: LinkIcon): boolean {
    return other.url === this.url
  }

  toDOM(): HTMLElement {
    const icon = document.createElement("span")
    icon.className = ICON_CLASS
    icon.setAttribute("aria-hidden", "true")
    icon.addEventListener("mousedown", (event) => {
      if (event.button !== 0) return
      event.preventDefault()
      open(this.url)
    })
    return icon
  }
}

/** The tip over the address under the mouse, "⌘-click to open", while `under` says it shows. */
function tipFor(under: Under): Tooltip | null {
  const { address, showsTip } = under
  if (!address || !showsTip) return null
  return {
    pos: address.from,
    above: true,
    create: () => {
      const dom = document.createElement("div")
      dom.className = "cmb-link-tip"
      dom.textContent = CodeEditorFeatures.linkTip()
      return { dom }
    }
  }
}
