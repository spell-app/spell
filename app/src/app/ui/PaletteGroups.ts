/**
 * The editor palette's rule:  which Spell UI components it offers, and in which group (epic `editor` T81, I174, I180;
 * Spell UI's `ComponentDefinitions` held it until epic `editor` P42, Q81).
 * - Its groups are the palette's TABLE (`paletteGroups.json`, spaces' models), as Owen arranged them on the palette
 *   groups page;  what the table doesn't name is filed by today's rule.
 * - Reads Spell UI's own descriptions and snippets (`ComponentDefinitions`):  every vocabulary, so a LAZY chunk,
 *   imported by path where it's needed (`<Palette>`, `<PaletteGroupsPage>`), never through `spell/app/app/ui`.
 * - No Solid, no editor:  the palette and its page both draw from it.
 */

import { ComponentDefinitions, type ComponentDefinition } from "spell/ui/components/ComponentDefinitions"
import { ValueSets, type ComponentTopic } from "spell/ui/vocabulary"
import type { SPACES } from "spell/app/spaces"
import shippedTable from "spell/app/spaces/models/paletteGroups.json"

/** One group of the editor's palette:  its topic or title, and its components, in order. */
export type PaletteGroup = Omit<SPACES.PaletteTableGroup, "tags"> & { parts: ComponentDefinition[] }

/****************
 * ### `PaletteGroups`
 * What the editor's palette offers, in its groups.
 * - Static:  the rule is one for the page, over Spell UI's definitions, which are loaded once.
 ****************/
export class PaletteGroups {
  /**
   * The palette, in groups, as its table says:  its groups in order, each its components in order.
   * - A component the table doesn't name, nor hides, still shows:  where today's rule files it (`byTopic()`),
   *   at the end of the table's group for that topic, else in a group of its own at the end.
   *   So a new component shows up with nothing to do.
   * - A tag the table names that isn't a component (any more), or names twice, is skipped.
   * - `table`:  the one the editor ships with, unless handed another (the page, as it's edited;  tests).
   */
  static inGroups(table: SPACES.PaletteTable = SHIPPED_TABLE): PaletteGroup[] {
    const hidden = new Set(table.hidden ?? [])
    const placed = new Set<string>()
    const groups: PaletteGroup[] = table.groups.map(({ topic, title, icon, tags }) => ({
      topic,
      title,
      icon,
      parts: tags.flatMap((tag) => {
        const definition = ComponentDefinitions.byTag(tag)
        if (!definition || placed.has(tag) || NEVER_ADDED.has(tag)) return []
        placed.add(tag)
        return [definition]
      })
    }))
    for (const { topic, parts } of PaletteGroups.byTopic()) {
      const unlisted = parts.filter((definition) => !placed.has(definition.tag) && !hidden.has(definition.tag))
      if (!unlisted.length) continue
      const group = groups.find((each) => each.topic === topic)
      if (group) group.parts.push(...unlisted)
      else groups.push({ topic, parts: unlisted })
    }
    return groups.filter(({ parts }) => parts.length)
  }

  /**
   * Today's rule, for what the table doesn't name:  by topic, in `ValueSets.topics` order, the topics with
   * anything in them.
   * - `parts`:  every component filed there, all shown (epic `editor` I174):
   *   what it offers ready-made first (`readyMadeByTopic()`), then the rest (`othersByTopic()`).
   */
  static byTopic(): { topic: ComponentTopic; parts: ComponentDefinition[] }[] {
    const readyMade = PaletteGroups.readyMadeByTopic()
    const others = PaletteGroups.othersByTopic()
    return ValueSets.topics
      .filter((topic) => readyMade.has(topic) || others.has(topic))
      .map((topic) => ({ topic, parts: [...(readyMade.get(topic) ?? []), ...(others.get(topic) ?? [])] }))
  }

  /** What the palette offers READY-MADE, sorted by name:  each component with a snippet of its own. */
  static readyMade(): ComponentDefinition[] {
    // its own:  a tag built on another's vocabulary (`<ui-toolbar>`, on the menu's) doesn't inherit its offer
    return ComponentDefinitions.all.filter((definition) => definition.snippet?.startsWith(`<${definition.tag}`))
  }

  /**
   * What it offers ready-made, by topic, in `ValueSets.topics` order:  each component once, under its first topic,
   * the topics with something in them only.
   */
  static readyMadeByTopic(): Map<ComponentTopic, ComponentDefinition[]> {
    const offered = PaletteGroups.readyMade()
    const topics = new Map<ComponentTopic, ComponentDefinition[]>()
    for (const topic of ValueSets.topics) {
      const list = offered.filter((definition) => definition.topics[0] === topic)
      if (list.length) topics.set(topic, list)
    }
    const other = offered.filter((definition) => !definition.topics.length)
    if (other.length) topics.set(ValueSets.topics[0]!, [...(topics.get(ValueSets.topics[0]!) ?? []), ...other])
    return topics
  }

  /**
   * Every other component the palette could add, by topic, as `readyMadeByTopic()` files them:
   * after its ready-made ones.
   * - A folder's main tag (`ui-<folder>`), and the others that stand alone (`STANDS_ALONE`, `<ui-tabs>` ...):
   *   a part that only makes sense inside another isn't offered (`<ui-tab>`, `<ui-cell>`;  `ONLY_INSIDE`).
   * - Each under its first topic, sorted by name;  none has a snippet, so adding one writes its bare tag.
   */
  static othersByTopic(): Map<ComponentTopic, ComponentDefinition[]> {
    const offered = new Set(PaletteGroups.readyMade())
    const others = ComponentDefinitions.all.filter(
      (definition) =>
        (definition.tag === definition.folder ? !ONLY_INSIDE.has(definition.tag) : STANDS_ALONE.has(definition.tag)) &&
        !offered.has(definition) &&
        !NEVER_ADDED.has(definition.tag) &&
        definition.topics.length
    )
    const topics = new Map<ComponentTopic, ComponentDefinition[]>()
    for (const topic of ValueSets.topics) {
      const list = others.filter((definition) => definition.topics[0] === topic)
      if (list.length) topics.set(topic, list)
    }
    return topics
  }

  /** `tag`'s component, if it is one (`ComponentDefinitions.byTag()`):  for a page that has only this chunk. */
  static definitionOf(tag: string): ComponentDefinition | undefined {
    return ComponentDefinitions.byTag(tag)
  }

  /** Every component the palette could offer, sorted by name:  all but what a page holds once (`<ui-root>` ...). */
  static candidates(): ComponentDefinition[] {
    return ComponentDefinitions.all.filter((definition) => !NEVER_ADDED.has(definition.tag))
  }

  /** `group`'s name in `language`:  its own title, as written, else its topic's word (`ComponentDefinitions.topicIn()`). */
  static groupNameIn(group: Pick<PaletteGroup, "topic" | "title">, language: string): string {
    return group.title ?? (group.topic ? ComponentDefinitions.topicIn(group.topic, language) : "")
  }
}

/** The palette's table as it ships:  read once. */
const SHIPPED_TABLE = shippedTable as SPACES.PaletteTable

/** Tags a page holds once, around everything else:  never something to add to an app. */
const NEVER_ADDED = new Set(["ui-root", "ui-components"])

/**
 * Tags the palette offers though they aren't their folder's main tag (`ui-<folder>`):  each stands alone
 * (epic `editor` I180).
 * - groups of their folder's main tag (`<ui-cards>` ...), and the tags a folder holds beside it (`<ui-textarea>`)
 * - NOT the parts that only go inside another (`<ui-cell>`, `<ui-field>`, `<ui-tree-item>`, the content parts)
 */
const STANDS_ALONE = new Set([
  "ui-audio",
  "ui-cards",
  "ui-comments",
  "ui-icons",
  "ui-images",
  "ui-labels",
  "ui-radio",
  "ui-sections",
  "ui-segments",
  "ui-statistics",
  "ui-steps",
  "ui-tabs",
  "ui-textarea"
])

/** Folders' main tags the palette never offers:  each only goes inside another of its folder's (`<ui-tab>` in `<ui-tabs>`). */
const ONLY_INSIDE = new Set(["ui-step", "ui-tab"])
