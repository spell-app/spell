import { parseHTML } from "linkedom"

/****************
 * ### `DrawnItems`
 * What Spell UI's drawers share to find their elements in a page's HTML, as the page server serves it
 * (`CodeOnServer`, `MermaidOnServer`;  the app's Spell drawer too).
 * - `elementsIn()`:  each `<tag>…</tag>` cut out of the page first, then parsed alone (linkedom):
 *   a page of thousands of elements and none of these costs a text search, not a parse
 * - `isOn()`:  a yes-or-no attribute as Spell UI reads one
 * - STATIC and instance-free:  text in, elements out.
 ****************/
export class DrawnItems {
  /**
   * The `tag` elements in `page`, each parsed on its own.
   * - one nested in another of the same tag, or a `</tag>` written in its text, is cut short:  its text then differs
   *   from the element's, so its key matches nothing, and the page draws it itself
   */
  static elementsIn(page: string, tag: string): Element[] {
    if (!page.includes(`<${tag}`)) return []
    const found = page.match(new RegExp(`<${tag}\\b[^>]*>[\\s\\S]*?</${tag}\\s*>`, "g")) ?? []
    return found.flatMap((markup) => {
      const { document } = parseHTML(`<!doctype html><html><body>${markup}</body></html>`)
      const element = document.querySelector(tag)
      return element ? [element as unknown as Element] : []
    })
  }

  /** Is yes-or-no attribute `name` on:  there, and not `false` or `no` (Spell UI's booleans)? */
  static isOn(element: Element, name: string): boolean {
    const value = element.getAttribute(name)
    return value !== null && !OFF.test(value.trim())
  }

  /** `name`'s value when it's one of `values`;  else `undefined`, as an enum attribute reads a value it doesn't take. */
  static oneOf<T extends string>(element: Element, name: string, values: readonly T[]): T | undefined {
    const value = element.getAttribute(name)
    return values.includes(value as T) ? (value as T) : undefined
  }
}

/** A yes-or-no attribute's values for "no". */
const OFF = /^(false|no)$/i
