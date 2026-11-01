/**
 * What a `<ui-json>` sends its parent when its data changes:  plumbing, like the platform's `slotchange`.
 * - Not `ui-changed`, the page's event:  that one's name depends on the tag's language (`es-cambiado`).
 */
export const JSON_CHANGED = "ui-json-data-changed"

/****************
 * ### `JsonChild`
 * How an element that takes JSON reads it from a child:  a `<ui-json>`, or the old `<script type="application/json">`.
 * - STATIC, plain DOM, no Solid, no element:  by `localName`, as a static server render's children are linkedom elements.
 * - A `<ui-json>` before its family loads is read by its text;  once it's loaded, by its `value`,
 *   which a `source` file changes with no change in the page:  the reader listens for `JSON_CHANGED`.
 * - Knows nothing of who reads it:  `<ui-tree-diagram>` today.
 ****************/
export class JsonChild {
  /** `domElement`'s first child holding JSON;  `undefined` without one.  Takes its language's tag too (`<es-json>`). */
  static of(domElement: Element): Element | undefined {
    for (const child of domElement.children) {
      if (JsonChild.isJsonElement(child)) return child
      if (child.localName === "script" && child.getAttribute("type")?.trim() === "application/json") return child
    }
    return undefined
  }

  /**
   * The text of `domElement`'s JSON child, as written;  `undefined` without one.
   * - A reader follows it for changes in the page;  a `source` file's say `JSON_CHANGED`.
   */
  static textOf(domElement: Element): string | undefined {
    const child = JsonChild.of(domElement)
    return child && (child.textContent ?? "")
  }

  /**
   * The data of `domElement`'s JSON child;  `undefined` without one, or with nothing in it yet.
   * - A `<ui-json>` says why it can't read its text itself:  it warns, and this is `undefined`.
   * - throws `SyntaxError` when a script child's text, or a not yet loaded `<ui-json>`'s, isn't JSON:  the caller warns.
   */
  static valueOf(domElement: Element): unknown {
    const child = JsonChild.of(domElement)
    if (!child) return undefined
    if ("value" in child) return child.value
    const text = child.textContent ?? ""
    return text.trim() ? JSON.parse(text) : undefined
  }

  /** Is `child` a `<ui-json>`, in any language? */
  private static isJsonElement(child: Element): boolean {
    return /^[a-z]+-json$/.test(child.localName)
  }
}
