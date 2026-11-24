import { Show } from "solid-js"
import { isServer, type JSX } from "@solidjs/web"

import { E, UI, UIT } from "spell/ui/core"

/****************
 * ### `FieldShortcut`
 * The keys that jump into a text field from anywhere on the page:  `<ui-input shortcut="mod+F">`, `<ui-search>`'s.
 * - Pressed while the field shows on screen, it focuses the field (and selects its text):
 *   the browser's own find (`mod+F`) is stopped only then.
 *   - Shows on screen:  the middle of the field is in the window, and nothing covers it there
 *     (a modal, a menu, a flyout over it).
 *   - Several fields with the same keys, all showing:  the one in an open popover or dialog wins,
 *     else the one connected last.
 *   - A key someone else's code already handled (`preventDefault()`, a code editor's own find) is left alone.
 * - It also draws the keys at the field's end, `<ui-keys>`, while the field is empty (`draw()`):
 *   its box, `<span class="shortcut" part="shortcut">`, is laid out by `UIInput.css`.
 * - ONE document listener for every field (static), while any is connected:
 *   bubbling, so a focused editor's own handler goes first.
 * - Never in a server render:  no script, no keys.
 * - The family that draws it imports `spell/ui/components/ui-keys` (its `index.ts`).
 ****************/
export class FieldShortcut {
  /**
   * Listen for `field`'s keys while it's connected;  returns the cleanup.
   * - SIDE EFFECT:  the first field adds the document listener, the last one removes it.
   */
  static listen(field: ShortcutField): () => void {
    if (!FieldShortcut.fields.size) document.addEventListener("keydown", FieldShortcut.onKeyDown)
    // re-added last:  the field connected last wins a tie
    FieldShortcut.fields.delete(field)
    FieldShortcut.fields.add(field)
    return () => {
      FieldShortcut.fields.delete(field)
      if (!FieldShortcut.fields.size) document.removeEventListener("keydown", FieldShortcut.onKeyDown)
    }
  }

  /** The keys, at the field's end, while `shows()`;  nothing otherwise. */
  static draw(props: FieldShortcutProps): JSX.Element {
    return (
      <Show when={!isServer && props.shows()}>
        <span class={UIT.SHORTCUT_CLASS} part={props.part} aria-hidden="true">
          <ui-keys shortcut={props.shortcut()} />
        </span>
      </Show>
    )
  }

  /**
   * `shortcut` as `aria-keyshortcuts` writes it:  `"mod+F"` => `"Meta+F"` on a Mac, `"Control+F"` elsewhere;
   * `undefined` for none, or for keys it can't read.
   */
  static ariaFor(shortcut: string | undefined): string | undefined {
    if (!shortcut || isServer) return undefined
    const chords = FieldShortcut.chordsFor(shortcut)
    if (!chords.length) return undefined
    return chords
      .map((chord) => {
        const names = [chord.ctrl && "Control", chord.meta && "Meta", chord.alt && "Alt", chord.shift && "Shift"]
        const key = chord.keyText.length === 1 ? chord.keyText.toUpperCase() : chord.keyText
        return [...names.filter(Boolean), key].join("+")
      })
      .join(" ")
  }

  ////////////////
  // ## Internals
  ////////////////

  /** Every connected field with keys, oldest first. */
  private static readonly fields = new Set<ShortcutField>()

  /** A key on the page:  the showing field whose keys they are takes the focus. */
  private static readonly onKeyDown = (event: KeyboardEvent) => {
    if (event.defaultPrevented || event.isComposing) return
    const pressed = [...FieldShortcut.fields].filter((field) =>
      FieldShortcut.chordsFor(field.shortcut).some((chord) => chord.matches(event))
    )
    if (!pressed.length) return
    const showing = pressed.filter((field) => FieldShortcut.isShowing(field.domElement))
    const field = showing.findLast((each) => FieldShortcut.isInOverlay(each.domElement)) ?? showing.at(-1)
    if (!field) return
    event.preventDefault()
    field.focusFromShortcut()
  }

  /**
   * The chords of `shortcut`, a space between two (`"mod+F ctrl+F"`);  none for keys it can't read.
   * - NEVER throws:  a shortcut it can't read warns, and matches nothing.
   */
  private static chordsFor(shortcut: string | undefined): E.Chord[] {
    if (!shortcut || !("keyboard" in UI)) return []
    const chords: E.Chord[] = []
    for (const text of shortcut.trim().split(/\s+/)) {
      try {
        chords.push(UI.keyboard.chord(text))
      } catch (error) {
        E.Warnings.warn("FieldShortcut", `can't read the shortcut ${JSON.stringify(text)}`, error)
      }
    }
    return chords
  }

  /** Does `element` show on screen:  its middle in the window, with nothing over it there? */
  private static isShowing(element: HTMLElement): boolean {
    const box = element.getBoundingClientRect()
    if (!box.width || !box.height) return false
    const x = box.left + box.width / 2
    const y = box.top + box.height / 2
    if (x < 0 || y < 0 || x > innerWidth || y > innerHeight) return false
    let hit = document.elementFromPoint(x, y)
    // down through shadow roots, to what's really there
    while (hit?.shadowRoot) {
      const inner = hit.shadowRoot.elementFromPoint(x, y)
      if (!inner || inner === hit) break
      hit = inner
    }
    for (let node: Node | null = hit; node; node = node.parentNode ?? (node as ShadowRoot).host ?? null) {
      if (node === element) return true
    }
    return false
  }

  /** Is `element` inside an open popover or dialog (a menu, a flyout, a modal), across shadow roots? */
  private static isInOverlay(element: HTMLElement): boolean {
    return !!E.closestAcrossShadow(element, OVERLAYS)
  }
}

/** A text field that takes keys (`FieldShortcut.listen()`). */
export interface ShortcutField {
  /** its DOM element:  where it shows */
  readonly domElement: HTMLElement
  /** its keys, as `<ui-keys>` writes them:  `"mod+F"` */
  readonly shortcut: string | undefined
  /** its keys were pressed:  focus it (and open it, a folded search) */
  focusFromShortcut(): void
}

/** What `FieldShortcut.draw()` draws from. */
export type FieldShortcutProps = {
  /** is the field empty, with keys to show?  Tracked */
  shows: () => boolean
  /** its keys;  tracked */
  shortcut: () => string | undefined
  /** its box's `part`, translated on a translated tag (`partForName()`) */
  part: string
}

/** What counts as an overlay a field may sit in:  an open popover or dialog. */
const OVERLAYS = ":popover-open, dialog[open]"
