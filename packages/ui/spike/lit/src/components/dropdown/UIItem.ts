import { nothing } from "lit"

import { Converters, type MenuOption, type ItemType, UIElement } from "../../core"
import { itemVocabulary } from "$/components/dropdown/dropdown.vocabulary.en"

/****************
 * ### `<ui-item>`
 * One option (or `type="header"` / `"divider"`) of a dropdown:  DATA, not rendering.
 * - Renders nothing.  The dropdown reads every child item (`UIItem.entryOf()`) and renders its own
 *   `.item[role=option]` in ITS shadow root, because `aria-activedescendant` can't point across roots.
 * - Rich content is carried by ATTRIBUTES:  `icon`, `image`, `flag`, `description`, `text`.  Light-DOM children
 *   only contribute their text (`textContent`) -- arbitrary markup isn't cloned into the listbox.
 * - Attribute / text changes reach the dropdown through its `MutationObserver`;  properties reflect, so a
 *   property write is an attribute change too.
 ****************/
export class UIItem extends UIElement.for(itemVocabulary) {
  protected override render() {
    return nothing
  }

  /**
   * Menu entry for a child element of a dropdown, or `undefined` if it isn't an item.
   * - Reads properties of an upgraded item (canonical, even on a translated element), else the canonical
   *   attributes, so items parsed before `<ui-item>` is defined still count.
   */
  static entryOf(element: Element): MenuEntry | undefined {
    const item = element instanceof UIItem ? element : undefined
    if (!item && element.localName !== itemVocabulary.tag) return undefined
    const read = (name: ItemAttribute) => (item ? item.read(name) : element.getAttribute(name))
    const type = (read("type") as ItemType | null) ?? "item"
    const text = (read("text") as string | null) ?? element.textContent?.trim() ?? ""
    if (type !== "item") return { type, text }
    const option: MenuOption = {
      value: (read("value") as string | null) ?? text,
      text,
      description: (read("description") as string | null) ?? undefined,
      icon: read("icon") ?? undefined,
      image: read("image") ?? undefined,
      flag: read("flag") ?? undefined,
      disabled: Converters.boolean(read("disabled") as string | boolean | null, "disabled"),
      selected: Converters.boolean(read("selected") as string | boolean | null, "selected")
    }
    return { type, text, option }
  }

  /** Property value for canonical attribute `name`, `null` when unset. */
  private read(name: ItemAttribute): unknown {
    for (const [property, declaration] of this.declarations) {
      if (declaration.spec.name === name) return (this as Record<string, unknown>)[property] ?? null
    }
    return null
  }
}

/** Canonical attribute names of `<ui-item>`. */
type ItemAttribute = (typeof itemVocabulary.attributes)[number]["name"]

/** One entry of a dropdown's model:  an option, or a header / divider (never filtered, never chosen). */
export type MenuEntry = {
  type: ItemType
  /** header text, or the option's text */
  text: string
  /** `type === "item"` only */
  option?: MenuOption
}
