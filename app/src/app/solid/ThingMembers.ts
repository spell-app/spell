import type { SP } from "spell/parser/spell"
import type { ThingProperty } from "spell/parser/core/things"

/****************
 * ### `ThingMembers`
 * A thing's properties as the Inspector shows them (epic `debut` P26):
 * in BANDS named by its file's groups and headings (`rank`, `suit`, `drawing` ...), each in the file's order.
 * - Puts together what the running program knows of the thing and what its words file says of its type:
 *   - stored or computed:  its class (`ThingRegistry.propertiesOf()`, and what its schema declares)
 *   - which group each is in, and its words:  the project's words file (`SP.SpellWordsData.groups`)
 * - Its type's own bands first, then each type it inherits from, each under its own groups;
 *   a member it overrides shows once, in its own type's place.
 *   - A type's members under no group come first, in a band named for the type (`card`):
 *     they're the ones its file says before any group.
 *   - No words file, or no groups:  one band per type, its stored members first, then its computed ones.
 * - The built-in `id` last, in a band of its own that starts folded.
 * - Knows nothing of Solid or the page, and NEVER imports `spell/parser/core`, only its types:
 *   the Inspector draws what it answers.
 * - Actions aren't here:  the Actions band lists them (`InspectorActions`, epic `debut` Q46 A).
 ****************/
export class ThingMembers {
  /**
   * `thing`'s properties in bands, as the properties card draws them.
   * - `stored`:  the names its schema declares, in its class's order (`ClassSchemas`);  editable.
   * - `properties`:  what the running program knows of it (`ThingRegistry.propertiesOf()`);  its getters with no
   *   setter are `computed`, shown read only.  None when no program runs:  only `stored`.
   * - `words`:  the project's words file;  none, each band is a type.
   */
  static bandsOf(
    thing: object,
    { stored, properties = [], words }: { stored: string[]; properties?: ThingProperty[]; words?: SP.SpellWordsData }
  ): MemberBand[] {
    const chain = ThingMembers.chainOf(thing)
    const members = new Map<string, ThingMember>()
    for (const name of stored) members.set(name, ThingMembers.member(name, "stored", chain, words))
    for (const { name, computed } of properties) {
      if (computed && !members.has(name)) members.set(name, ThingMembers.member(name, "computed", chain, words))
    }
    const placed = new Set<string>(BUILT_IN_MEMBERS.filter((name) => members.has(name)))
    const bands: MemberBand[] = []
    for (const { type } of chain) {
      const own = [...members.values()].filter((member) => member.type === type && !placed.has(member.name))
      const groups = words?.groups?.[type] ?? []
      const grouped = new Set(groups.flatMap((group) => group.members))
      const loose = own.filter((member) => !grouped.has(member.name))
      if (loose.length) bands.push({ key: `${type}:`, title: wordsOfName(type), members: loose })
      loose.forEach((member) => placed.add(member.name))
      for (const group of groups) {
        const inGroup = group.members.flatMap((name) => {
          const member = members.get(name)
          return member && !placed.has(name) ? [member] : []
        })
        if (!inGroup.length) continue
        inGroup.forEach((member) => placed.add(member.name))
        bands.push({ key: `${type}:${group.name}`, ...ThingMembers.titleOf(group), members: inGroup })
      }
    }
    // what no type of the chain owns (a value set on it, never declared):  with its own type's
    const rest = [...members.values()].filter((member) => !placed.has(member.name))
    if (rest.length) bands.push({ key: "rest:", title: wordsOfName(chain[0]?.type ?? ""), members: rest })
    const builtIn = BUILT_IN_MEMBERS.flatMap((name) => members.get(name) ?? [])
    if (builtIn.length) bands.push({ key: BUILT_IN_BAND, title: "", members: builtIn, isBuiltIn: true })
    return bands
  }

  /**
   * A band's title and description, from a group:  a group's own description, else its name's part after a colon
   * (`turning it over:  face up or down` => `turning it over`, `face up or down`).
   */
  static titleOf(group: SP.SpellWordsGroup): { title: string; description?: string } {
    if (group.description) return { title: group.name, description: group.description }
    const colon = group.name.indexOf(":")
    if (colon < 0) return { title: group.name }
    const description = group.name.slice(colon + 1).trim()
    return description
      ? { title: group.name.slice(0, colon).trim(), description }
      : { title: group.name.slice(0, colon) }
  }

  /** `thing`'s classes, its own first, down to -- NOT including -- `Object`:  each with its prototype. */
  private static chainOf(thing: object): { type: string; proto: object }[] {
    const chain: { type: string; proto: object }[] = []
    for (
      let proto = Object.getPrototypeOf(thing) as object | null;
      proto && proto !== Object.prototype;
      proto = Object.getPrototypeOf(proto)
    ) {
      chain.push({ type: (proto.constructor as { name: string }).name, proto })
    }
    return chain
  }

  /**
   * Member `name`, of the first of `chain`'s types that has it:  a getter on its prototype, else one its words list.
   * - Neither (a value set on the thing alone):  the thing's own type.
   */
  private static member(
    name: string,
    kind: ThingMember["kind"],
    chain: { type: string; proto: object }[],
    words: SP.SpellWordsData | undefined
  ): ThingMember {
    const owner =
      chain.find(({ proto }) => Object.getOwnPropertyDescriptor(proto, name)) ??
      chain.find(({ type }) => words?.types[type]?.[name] !== undefined)
    const type = owner?.type ?? chain[0]?.type ?? ""
    const written = chain.map((each) => words?.types[each.type]?.[name]).find((each) => each !== undefined)
    return written === undefined ? { name, kind, type } : { name, kind, type, words: written }
  }
}

/** A band of a thing's properties:  a group of its type's, or the members of a type under none. */
export type MemberBand = {
  /** What its fold is remembered by:  `Card:rank`;  `Card:` for a type's members under no group. */
  key: string
  /** Its title:  the group's name (`rank`), or the type's in words (`card`);  `""` for the built-in band. */
  title: string
  /** What its group's line says of it, its tip. */
  description?: string
  /** Its members, in the file's order. */
  members: ThingMember[]
  /** The built-in members' band (`id`):  it starts folded. */
  isBuiltIn?: boolean
}

/** One of a thing's properties, in a band. */
export type ThingMember = {
  /** Its name in the compiled code:  `isAFaceCard`. */
  name: string
  /** `stored`:  a value it holds, editable;  `computed`:  worked out each time it's read, read only. */
  kind: "stored" | "computed"
  /** The type it's declared on:  `Card`, `TwoSidedView`. */
  type: string
  /** Its words in the program, from the words file:  `is a face card`. */
  words?: string
}

/** The fold key of the built-in members' band. */
export const BUILT_IN_BAND = "builtIn"

/** Spell's own members every thing has, shown last, folded:  its `id`. */
const BUILT_IN_MEMBERS = ["id"]

/** A class or member name in words:  `StockPile` => `stock pile`, `turnOver` => `turn over`. */
export function wordsOfName(name: string): string {
  return name.replace(/([a-z0-9])([A-Z])/g, "$1 $2").toLowerCase()
}
