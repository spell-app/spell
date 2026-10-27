// oxlint-disable-next-line spell-ui/no-solid-effect -- a helper class, not a component:  no decorator reaches it
import { onSettled } from "solid-js"
import { isServer } from "@solidjs/web"

import { E, UIT } from "spell/ui/core"
import { itemVocabulary } from "spell/ui/components/ui-item/UIItem.en"

/****************
 * ### `SlottedItems`
 * The options a dropdown's light-DOM `<ui-item>` children describe, as reactive `MenuEntry`s:
 * shared by `<ui-dropdown>` and `<ui-select>`.
 * - Read on connect, and on every change to the DOM element's subtree
 *   (a `MutationObserver`:  children, attributes, text).
 *   That covers what `slotchange` would, and the attribute and text edits it wouldn't.
 * - Plain items become `MenuOption`s:
 *   `value` (default `text`), `text` (default the text content), `description`,
 *   `icon`, `image`, `flag`, `disabled`, `selected` (or its alias `active`, as `UIItem` reads it).
 *   - The ONE reader of an item, `entryOf()`:  the dropdown's and the select's, and their native fallbacks'.
 *   - The dropdown renders them in ITS shadow root,
 *     because the listbox must share a tree with the combobox for `aria-activedescendant`.
 * - RICH items (element children) keep their markup:
 *   the item gets a generated `slot` name and the dropdown projects it into its menu row,
 *   so the content stays live (listeners, framework-rendered children).
 *   - NOTE: that writes a `slot` attribute onto the author's element.
 *   - Text for search / labels is its text content.
 * - Option objects are cached per element and reused while unchanged, so keyed `<For>` keeps their rows.
 ****************/
export class SlottedItems {
  /** Entries in document order;  tracked. */
  @E.state accessor entries: readonly E.MenuEntry[] = []

  /** Generated slot name of each rich option. */
  readonly slots = new WeakMap<E.MenuOption, string>()

  /** The dropdown's DOM element. */
  private readonly domElement: E.DOMElement

  /** Last entry per element, reused while equal. */
  private readonly cache = new WeakMap<Element, E.MenuEntry>()

  /** Counter for generated slot names. */
  private counter = 0

  /** Read `domElement`'s items now, and again on every change to its subtree once settled. */
  constructor(domElement: E.DOMElement) {
    this.domElement = domElement
    this.entries = this.read()
    onSettled(() => {
      // oxlint-disable-next-line spell-ui/no-mutation-observer -- a helper class:  `@E.watches` is for components
      const observer = new MutationObserver(() => (this.entries = this.read()))
      observer.observe(domElement, { childList: true, subtree: true, attributes: true, characterData: true })
      this.entries = this.read()
      return () => observer.disconnect()
    })
  }

  /** The values of the items marked `selected`:  the starting value, a list when `multiple`, else the first. */
  selectedValue(isMultiple: boolean): string | string[] | undefined {
    return SlottedItems.selectedValueIn(this.entries, isMultiple)
  }

  /** Every item child, read now. */
  private read(): E.MenuEntry[] {
    return SlottedItems.itemsOf(this.domElement).map((element) => this.cachedEntryOf(element))
  }

  /** Entry for one `<ui-item>`, reusing the cached object when nothing changed. */
  private cachedEntryOf(element: Element): E.MenuEntry {
    const next = SlottedItems.entryOf(element)
    const cached = this.cache.get(element)
    const entry = cached && SlottedItems.isSameEntry(cached, next) ? cached : next
    this.cache.set(element, entry)
    if (element.children.length > 0 && !("type" in entry)) {
      let slot = this.slots.get(entry)
      if (!slot) this.slots.set(entry, (slot = `${SLOT_PREFIX}${++this.counter}`))
      if (element.slot !== slot) element.slot = slot
    }
    return entry
  }

  ////////////////
  // ## Reading items:  plain DOM, so the native fallbacks read them too
  ////////////////

  /**
   * The item children of `domElement`:  each `<ui-item>`, or a translated alias of it.
   * - STATIC:  pure DOM reading, for the components and their native fallbacks alike.
   */
  static itemsOf(domElement: Element): Element[] {
    return [...domElement.children].filter(
      (element) =>
        element.localName === itemVocabulary.tag || SlottedItems.definitionOf(element)?.vocabulary === itemVocabulary
    )
  }

  /**
   * What item `element` describes, read now:  an option, or a `header` / `divider`.
   * - Its `label` (default its text content), `value` (default the label), and the rest of `MenuOption`.
   * - STATIC:  pure DOM reading, as `itemsOf()`.
   */
  static entryOf(element: Element): E.MenuEntry {
    const definition = SlottedItems.definitionOf(element)
    const read = <N extends E.AttributeName<typeof itemVocabulary>>(name: N) =>
      SlottedItems.valueFor(element, definition, name)
    const type = read("kind")
    const text = (read("label") as string | undefined) ?? element.textContent?.trim() ?? ""
    if (type === "header" || type === "divider") return { type, text } satisfies E.MenuSeparator
    return {
      value: (read("value") as string | undefined) ?? text,
      text,
      description: read("description") as string | undefined,
      // `""` is a bare `icon`:  an item has no icon of its own to default to
      icon: (read("icon") as string | undefined) || undefined,
      image: read("image"),
      flag: read("flag"),
      disabled: read("disabled") as boolean,
      selected: (read("selected") as boolean) || E.Converters.boolean(element.getAttribute(UIT.ACTIVE), UIT.ACTIVE)
    }
  }

  /**
   * The chosen values a `value` holds, as a list:  a list as it is, a text split when `multiple` (`"a, b"`),
   * nothing for `""` or no value.
   * - The dropdown's and the select's chosen values, and their native fallbacks'.
   * - STATIC:  pure.
   */
  static valuesIn(value: unknown, isMultiple: boolean): string[] {
    if (Array.isArray(value)) return value.map(String)
    if (typeof value !== "string" || value === "") return []
    return isMultiple ? E.Converters.list(value) : [value]
  }

  /**
   * The values of the options in `entries` marked `selected`:  a list when `multiple`, else the first;
   * `undefined` for none.
   * - STATIC:  pure, for the fallbacks' entries too.
   */
  static selectedValueIn(entries: readonly E.MenuEntry[], isMultiple: boolean): string | string[] | undefined {
    const values = entries
      .filter((entry): entry is E.MenuOption => !("type" in entry) && !!entry.selected)
      .map((option) => option.value)
    if (!values.length) return undefined
    return isMultiple ? values : values[0]
  }

  /**
   * `element`'s definition, by its tag:  a translated alias of `<ui-item>` has the item's vocabulary.
   * - `undefined` while its family isn't registered:  then `entryOf()` reads the attributes by their English names.
   * - STATIC:  pure.
   */
  private static definitionOf(element: Element): E.ElementDefinition | undefined {
    return E.UIComponent.registry.definitions.get(element.localName)
  }

  /**
   * Converted value of item attribute `name`:  the (already converted) property once the item has upgraded
   * (and isn't pending:  defined early, its family not loaded), else its attribute, converted here.
   * - On a server, always the attribute:
   *   linkedom has no `:defined`, and the items' stand-in DOM elements are built after the dropdown's.
   * - Static:  pure, it needs no instance.
   */
  private static valueFor(element: Element, definition: E.ElementDefinition | undefined, name: string): unknown {
    if (!definition) {
      const spec: E.AttributeSpec = itemVocabulary.attributes.find((attribute) => attribute.name === name)!
      const raw = element.getAttribute(spec.name)
      if (spec.kind === "keyOnly") return E.Converters.boolean(raw, spec.name)
      if (spec.kind === "icon") return E.Converters.icon(raw, spec.default)
      return raw ?? undefined
    }
    const attribute = definition.attribute(name)
    if (!isServer && element.matches(":defined") && !E.DOMElement.isPending(element)) {
      return (element as unknown as Record<string, unknown>)[attribute.property]
    }
    return definition.convert(attribute, element.getAttribute(attribute.attribute))
  }

  /**
   * Shallow equality of two entries.
   * - STATIC:  pure, needs no instance.
   */
  private static isSameEntry(a: E.MenuEntry, b: E.MenuEntry): boolean {
    const keys = Object.keys(b) as (keyof E.MenuEntry)[]
    return keys.length === Object.keys(a).length && keys.every((key) => a[key] === b[key])
  }
}

/** Prefix of generated slot names for rich items. */
const SLOT_PREFIX = "ui-item-"
