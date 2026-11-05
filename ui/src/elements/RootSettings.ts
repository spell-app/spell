// Import directly to avoid circular import:  spell-element imports nothing of Spell UI, so it has always loaded first
import { state } from "spell/element"
import type { E } from "spell/ui/core"
// Import directly:  `SpellUISettings` (below `core`) hands `defaultsFor()` to spell-element, so this file never
// imports the `core` entry (ui's AGENTS.md, "Imports")
import { flatParentFor, Warnings } from "spell/ui/util"
import { DefaultValues } from "spell/ui/vocabulary"

/****************
 * ### `RootSettings`
 * The settings each `<ui-root>` gives its subtree (icon packs, emoji names, attribute defaults), by root element,
 * and the lookup from any element inside:  the NEAREST root that sets a key wins, so a nested root inherits what it
 * doesn't set.
 * - In `core`, not in the root's family:  icons, emoji and every element read it, and must never import `<ui-root>`.
 * - The lookup climbs the FLAT tree (`flatParentFor()`:  slot, parent, shadow host), so an icon inside a component's
 *   shadow root finds the root around the component.
 * - `generation` changes whenever a root's settings do:  icons, emoji and the elements taking a default inside track
 *   it and redraw.  Page-wide on purpose:  a root changing its settings is rare.
 * - Attribute defaults (epic `language` P28):  `defaultsFor()`, which spell-element's `DOMElement` reads through
 *   `SpellSolidSettings.defaults` ("Root defaults" there).
 *   - Merged attribute by attribute:  an inner root's default for `<ui-button appearance>` wins over the outer's,
 *     and the outer's `size` still counts.
 *   - Checked here, before an element converts them:  a content attribute, an attribute the tag doesn't have, or a
 *     value its vocabulary refuses warns ONCE per root, naming the root and the tag, and is left out.
 * - STATIC and instance-free on purpose:  ONE registry per page, which every root writes and every element reads.
 ****************/
export class RootSettings {
  /** Bumped on every change;  read it (tracked) to redraw when any root's settings change. */
  @state static accessor generation = 0

  /**
   * Set `root`'s settings (replacing its earlier ones) and bump `generation`.
   * - A state write:  call it from an event handler, a promise callback or an effect's APPLY.
   */
  static set(root: Element, settings: RootSettingsValue) {
    RootSettings.byRoot.set(root, settings)
    RootSettings.generation += 1
  }

  /** Forget `root`'s settings (it left the page) and bump `generation`. */
  static delete(root: Element) {
    if (!RootSettings.byRoot.delete(root)) return
    RootSettings.generation += 1
  }

  /** `key` from the nearest root at or above `element` that sets it, else `undefined`. */
  static nearest<K extends keyof RootSettingsValue>(
    element: Element | undefined,
    key: K
  ): RootSettingsValue[K] | undefined {
    for (let current = element; current; current = flatParentFor(current)) {
      const value = RootSettings.byRoot.get(current)?.[key]
      if (value !== undefined) return value
    }
    return undefined
  }

  /**
   * Forget every root's settings, for tests;  bumps `generation`, so icons and emoji redraw.
   * - A state write, like `set()`.
   */
  static reset() {
    RootSettings.byRoot = new WeakMap()
    RootSettings.warned = new WeakMap()
    RootSettings.generation += 1
  }

  ////////////////
  // ## Attribute defaults
  ////////////////

  /**
   * The defaults the roots at and above `element` give it, as a tag of `definition`:  one per attribute, the nearest
   * root's (`E.DefaultSettings.for()`).
   * - A root's table is keyed by tag, canonical (`ui-button`) or the element's own (`es-boton`), then by attribute
   *   name, canonical or the tag's own:  `{ "ui-button": { appearance: "pill" } }`.
   * - Tracked:  reads `generation`, so an effect reading it re-runs when any root's settings change.
   * - Left out, with a warning once per root (`DefaultValues`, the check the spell compiler makes too):
   *   a content attribute (`label`, `value`, `text`, rich data), an attribute the tag doesn't have,
   *   a value its vocabulary refuses.
   *   An outer root's default for it still counts.
   */
  static defaultsFor(element: Element, definition: E.ElementDefinition): readonly E.AttributeDefault[] {
    void RootSettings.generation
    const tags = new Set([definition.vocabulary.tag, definition.tag])
    const found = new Map<string, E.AttributeDefault>()
    for (let current: Element | undefined = element; current; current = flatParentFor(current)) {
      const defaults = RootSettings.byRoot.get(current)?.defaults
      if (!defaults) continue
      for (const tag of tags) {
        for (const [name, value] of Object.entries(defaults[tag] ?? {})) {
          const attribute = RootSettings.checkedDefault(current, definition, tag, name, value)
          if (attribute && !found.has(attribute.key)) found.set(attribute.key, { attribute, value })
        }
      }
    }
    return found.size ? [...found.values()] : NO_DEFAULTS
  }

  /**
   * `name`'s attribute, when `root`'s default `value` for it on `tag` is one an element may take;
   * else `undefined`, and a warning once.
   */
  private static checkedDefault(
    root: Element,
    definition: E.ElementDefinition,
    tag: string,
    name: string,
    value: unknown
  ): E.ResolvedAttribute | undefined {
    const attribute = definition.takesAttribute(name) ? definition.attribute(name) : definition.attributeNamed(name)
    const problem = !attribute
      ? `<${tag}> has no attribute ${JSON.stringify(name)}`
      : DefaultValues.isContent(attribute.spec)
        ? `${name} is what each <${tag}> shows, not how it looks:  it takes no default`
        : RootSettings.problemWithValue(attribute.spec, value)
    if (!problem) return attribute
    RootSettings.warnOnce(root, `defaults:  <${tag} ${name}=${JSON.stringify(value)}>:  ${problem};  left out`)
    return undefined
  }

  /** What's wrong with `value` as `spec`'s text (`DefaultValues.problemWith()`), in words;  `undefined` when nothing is. */
  private static problemWithValue(spec: E.AttributeSpec, value: unknown): string | undefined {
    const problem = DefaultValues.problemWith(spec, value)
    return problem && DefaultValues.textOf(problem)
  }

  /** Warn about `message` for `root`, the first time only. */
  private static warnOnce(root: Element, message: string) {
    let messages = RootSettings.warned.get(root)
    if (!messages) RootSettings.warned.set(root, (messages = new Set()))
    if (messages.has(message)) return
    messages.add(message)
    Warnings.warn("<ui-root>", message, root)
  }

  ////////////////
  // ## Registry
  ////////////////

  /**
   * Root element => its settings.
   * - Not `readonly`:  a `WeakMap` can't be cleared, so `reset()` replaces it.
   */
  private static byRoot = new WeakMap<Element, RootSettingsValue>()

  /** Root element => the default warnings it gave already (`warnOnce()`);  replaced by `reset()`. */
  private static warned = new WeakMap<Element, Set<string>>()
}

/** What a `<ui-root>` sets for its subtree, looked up from any element inside it. */
export type RootSettingsValue = {
  /** Its icon packs, over the outer root's (or the page's `UI.icons`). */
  readonly icons?: E.IconPacks
  /** Its emoji name set (`cldr`, `fomantic`). */
  readonly emoji?: string
  /** Its attribute defaults, over the outer root's, attribute by attribute (`defaultsFor()`). */
  readonly defaults?: AttributeDefaults
}

/**
 * A root's attribute defaults:  tag => attribute name => value, as the attribute's text or a property would give it.
 * - `{ "ui-button": { appearance: "pill" }, "ui-segment": { appearance: "raised" } }`
 */
export type AttributeDefaults = Readonly<Record<string, Readonly<Record<string, string | number | boolean>>>>

/** `defaultsFor()`'s answer when no root gives any:  one shared empty list. */
const NO_DEFAULTS: readonly E.AttributeDefault[] = Object.freeze([])
