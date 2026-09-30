import { createEffect, createMemo, untrack, type Accessor } from "solid-js"

import { Icons, type IconData, type IconStyle } from "$/icons"

import { Cell } from "./Cell"

/**
 * An icon NAME (attribute, shorthand) turned into an `<svg>`, loaded through `Icons` -- shared by `<ui-icon>`,
 * the `icon` shorthand of `<ui-label>` / `<ui-divider>` and the label's delete icon.
 * - Starts from `Icons.peek()`, so an icon whose chunk is already cached draws in the first frame.
 * - A later name wins over an earlier, slower load.
 * - `svg()` is a fresh `aria-hidden` `<svg>` per data change;  the box around it is the caller's.
 * - MUST be created under the element's owner:  it creates a signal, a memo and an effect.
 */
export class IconGlyph {
  /** Loaded data, `undefined` until loaded (or for an unknown name);  tracked. */
  readonly data: Cell<IconData | undefined>

  /** The `<svg>`, or `undefined`;  tracked. */
  readonly svg: Accessor<SVGSVGElement | undefined>

  /** `name` + `style` last asked for, so a slower earlier load can't win. */
  private request?: string

  constructor(name: Accessor<string | undefined>, style: Accessor<IconStyle | undefined> = () => undefined) {
    this.data = new Cell(untrack(() => IconGlyph.peek(name(), style())))
    this.svg = createMemo(() => {
      const data = this.data.get()
      return data ? Icons.svg(data) : undefined
    })
    createEffect(
      () => [name(), style()] as const,
      ([nameNow, styleNow]) => void this.load(nameNow, styleNow)
    )
  }

  /** Load `name`'s data;  writes only if it is still the latest request. */
  private async load(name: string | undefined, style: IconStyle | undefined) {
    const request = `${name}|${style}`
    this.request = request
    const data = name ? await Icons.get(name, style) : undefined
    if (this.request === request) this.data.set(data)
  }

  /** Cached data for `name`, or `undefined`. */
  private static peek(name: string | undefined, style: IconStyle | undefined) {
    return name ? Icons.peek(name, style) : undefined
  }
}
