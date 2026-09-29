import { onSettled, type Accessor } from "solid-js"

import type { MenuOption } from "$/elements"
import { itemVocabulary } from "$/components/dropdown/dropdown.vocabulary.en"

import { Cell } from "$spike/Cell"
import type { ElementDefinition } from "$spike/ElementDefinition"
import type { AttributeName, MenuEntry, MenuSeparator } from "$spike/spike.types"
import type { UIHost } from "$spike/UIHost"

/**
 * The options a dropdown's light-DOM `<ui-item>` children describe, as a signal of `MenuEntry`s.
 * - Read on connect and on every mutation of the host's subtree (`MutationObserver`:  children, attributes,
 *   text) -- that also covers what `slotchange` would, and attribute / text edits it wouldn't.
 * - Plain items become `MenuOption`s:  `value` (default `text`), `text` (default the text content), `description`,
 *   `icon`, `image`, `flag`, `disabled`, `selected`.  The dropdown renders them in ITS shadow root, because
 *   the listbox must share a tree with the combobox for `aria-activedescendant`.
 * - RICH items (element children) keep their markup:  the item gets a generated `slot` name and the dropdown
 *   projects it into its menu row, so the content stays live (listeners, framework-rendered children).
 *   NOTE: that writes a `slot` attribute onto the author's element.  Text for search / labels is its text content.
 * - Option objects are cached per element and reused while unchanged, so keyed `<For>` keeps their rows.
 */
export class SlottedItems {
  /** Entries in document order. */
  readonly entries: Accessor<readonly MenuEntry[]>

  /** Generated slot name of each rich option. */
  readonly slots = new WeakMap<MenuOption, string>()

  /** The dropdown. */
  private readonly host: UIHost

  /** Writable `entries`. */
  private readonly cell: Cell<readonly MenuEntry[]>

  /** Last entry per element, reused while equal. */
  private readonly cache = new WeakMap<Element, MenuEntry>()

  /** Counter for generated slot names. */
  private counter = 0

  constructor(host: UIHost) {
    this.host = host
    this.cell = new Cell<readonly MenuEntry[]>(this.read())
    this.entries = this.cell.get
    onSettled(() => {
      const observer = new MutationObserver(() => this.cell.set(this.read()))
      observer.observe(host, { childList: true, subtree: true, attributes: true, characterData: true })
      this.cell.set(this.read())
      return () => observer.disconnect()
    })
  }

  /** Every item child, read now. */
  private read(): MenuEntry[] {
    const entries: MenuEntry[] = []
    const definition = SlottedItems.definition()
    for (const element of this.host.children) {
      if (element.localName !== itemVocabulary.tag && !(definition && element instanceof definition.Host)) continue
      entries.push(this.entry(element, definition?.definition))
    }
    return entries
  }

  /** Entry for one `<ui-item>`, reusing the cached object when nothing changed. */
  private entry(element: Element, definition: ElementDefinition | undefined): MenuEntry {
    const read = <N extends AttributeName<typeof itemVocabulary>>(name: N) =>
      SlottedItems.value(element, definition, name)
    const type = read("type")
    const rich = element.children.length > 0
    const text = (read("text") as string | undefined) ?? element.textContent?.trim() ?? ""
    let next: MenuEntry
    if (type === "header" || type === "divider") next = { type, text } satisfies MenuSeparator
    else {
      next = {
        value: (read("value") as string | undefined) ?? text,
        text,
        description: read("description") as string | undefined,
        icon: read("icon"),
        image: read("image"),
        flag: read("flag"),
        disabled: read("disabled") as boolean,
        selected: read("selected") as boolean
      }
    }
    const cached = this.cache.get(element)
    const entry = cached && SlottedItems.same(cached, next) ? cached : next
    this.cache.set(element, entry)
    if (rich && !("type" in entry)) {
      let slot = this.slots.get(entry)
      if (!slot) this.slots.set(entry, (slot = `${SLOT_PREFIX}${++this.counter}`))
      if (element.slot !== slot) element.slot = slot
    }
    return entry
  }

  /** Converted value of item attribute `name`:  the property once upgraded, else the attribute. */
  private static value(element: Element, definition: ElementDefinition | undefined, name: string): unknown {
    const spec = itemVocabulary.attributes.find((attribute) => attribute.name === name)!
    if (!definition) {
      const raw = element.getAttribute(spec.name)
      return spec.kind === "keyOnly" ? raw !== null && raw !== "false" && raw !== "no" : (raw ?? undefined)
    }
    const attribute = definition.attribute(name)
    const raw =
      (element as unknown as Record<string, unknown>)[attribute.key] ?? element.getAttribute(attribute.attribute)
    return definition.convert(attribute, raw)
  }

  /** The registered `<ui-item>` class and its definition, if defined yet. */
  private static definition() {
    const Host = customElements.get(itemVocabulary.tag) as
      | (CustomElementConstructor & { definition: ElementDefinition })
      | undefined
    return Host ? { Host, definition: Host.definition } : undefined
  }

  /** Shallow equality of two entries. */
  private static same(a: MenuEntry, b: MenuEntry): boolean {
    const keys = Object.keys(b) as (keyof MenuEntry)[]
    return keys.length === Object.keys(a).length && keys.every((key) => a[key] === b[key])
  }
}

/** Prefix of generated slot names for rich items. */
const SLOT_PREFIX = "ui-item-"
