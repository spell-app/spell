// the types-only leaf, as `V`:  `spell/ui/api` would bring every element (and Solid's JSX) into a node tool's type check
import type * as V from "spell/element/vocabulary.types"

/****************
 * ### `PropertyLayouts`
 * A Spell UI component's PROPERTY EDITOR LAYOUT:  where each of its attributes goes in a property editor
 * (the spell editor's Inspector, any `<ui-property-editor schema="ui-button">`), kept in a file beside its vocabulary,
 * for tweaking by hand (epic `editor` T97).
 *
 * ```html
 * <ui-property-editor schema="ui-action" data-omit="value link target">
 *   <ui-property-group label="Appearance" data-group="appearance">
 *     <ui-fields>
 *       <ui-property name="label"></ui-property>
 *       <ui-property name="icon"></ui-property>
 *     </ui-fields>
 *     <ui-property name="appearance"></ui-property>
 *   </ui-property-group>
 * </ui-property-editor>
 * ```
 *
 * - The file:  `<tag>.editor.html` in the tag's family folder (`ui-action/ui-action.editor.html`),
 *   an editor page of the same shape as a program's own (`Card.editor.html`, `PropertyEditorPages`).
 * - Its sections, in order:  each `<ui-property-group>`, its vocabulary group in `data-group`
 *   (`appearance`, `content` ... `E.ATTRIBUTE_GROUPS`), its title in `label`.
 * - Each section's ROWS, in order:
 *   - a `<ui-property>` alone:  a row of its own, or half a row by its kind (a size, a yes or no), as before
 *   - a `<ui-fields>`:  its properties side by side, on one row
 * - `data-omit`:  the attributes left out of the editor, by name.
 * - An attribute in the vocabulary but in no row and not left out is NEVER hidden (`place()`):
 *   it goes in its group's section, after the section's own rows, or in a section of its own at the end.
 *   A test names it, so it gets a place on purpose.
 * - DOM only, no Solid:  the page's own DOM, or linkedom's under node.
 * - STATIC and instance-free, but for the files it has loaded (`load()`).
 ****************/
export class PropertyLayouts {
  ////////////////
  // ## Reading a layout
  ////////////////

  /** The layout in `text`, a layout file's markup;  `undefined` when it has no `<ui-property-editor>`. */
  static parse(text: string, document: Document = globalThis.document): PropertyLayout | undefined {
    const template = document.createElement("template")
    template.innerHTML = text
    const editor = template.content.querySelector(EDITOR_TAG)
    return editor ? PropertyLayouts.read(editor) : undefined
  }

  /** The layout of `editor`, a layout's `<ui-property-editor>`. */
  static read(editor: Element): PropertyLayout {
    const sections: SectionRead[] = []
    let loose: SectionRead | undefined
    const sectionFor = (property: Element): SectionRead => {
      const group = property.closest(GROUP_TAG)
      if (!group) return (loose ??= { group: undefined, label: undefined, rows: [] })
      let section = sections.find((each) => each.element === group)
      if (!section) {
        section = {
          group: (group.getAttribute(GROUP_ATTRIBUTE) as V.AttributeGroup | null) ?? undefined,
          label: group.getAttribute("label") ?? undefined,
          rows: [],
          element: group
        }
        sections.push(section)
      }
      return section
    }
    for (const property of editor.querySelectorAll(PROPERTY_TAG)) {
      const name = property.getAttribute("name")
      if (!name) continue
      const section = sectionFor(property)
      const row = property.closest(ROW_TAG)
      const last = section.rows.at(-1)
      if (row && last && last.row === row) last.names.push(name)
      else section.rows.push({ names: [name], row: row ?? undefined })
    }
    if (loose) sections.unshift(loose)
    return {
      tag: editor.getAttribute("schema") ?? "",
      omitted: (editor.getAttribute(OMIT_ATTRIBUTE) ?? "").split(/\s+/).filter(Boolean),
      sections: sections.map(({ group, label, rows }) => ({
        group,
        label,
        rows: rows.map((row) => row.names)
      }))
    }
  }

  ////////////////
  // ## Placing a component's attributes
  ////////////////

  /**
   * The sections a property editor draws for `attributes` (a vocabulary's, in its order), as `layout` lays them out.
   * - The layout's sections and rows first, as written;  a name `attributes` doesn't have is skipped.
   * - Every other attribute that isn't left out, in `attributes`' order (the vocabulary rule):
   *   - one that follows another (`inverted` after `color`, `FOLLOWS`):  a row of its own right after that one's row
   *   - else in its group's section, a row of its own after the section's rows (no group:  `appearance`)
   *   - a group the layout has no section for:  a section of its own, after the layout's, in `E.ATTRIBUTE_GROUPS`'s order
   * - No layout:  the vocabulary rule alone, a section per group in `E.ATTRIBUTE_GROUPS`'s order.
   * - A section left with no rows isn't returned.
   */
  static place(layout: PropertyLayout | undefined, attributes: readonly AttributeLike[]): PlacedSection[] {
    const known = new Set(attributes.map((attribute) => attribute.name))
    const sections: PlacedSection[] = (layout?.sections ?? []).map((section) => ({
      group: section.group,
      label: section.label,
      rows: section.rows.map((row) => row.filter((name) => known.has(name))).filter((row) => row.length)
    }))
    const added: PlacedSection[] = []
    const unplaced = PropertyLayouts.unplaced(layout, attributes)
    // one that follows another goes last, so the one it follows has its place by then
    const ordered = [...unplaced.filter((name) => !FOLLOWS[name]), ...unplaced.filter((name) => FOLLOWS[name])]
    for (const name of ordered) {
      const anchor =
        FOLLOWS[name] && [...sections, ...added].find((each) => each.rows.some((row) => row.includes(FOLLOWS[name]!)))
      if (anchor) {
        anchor.rows.splice(anchor.rows.findIndex((row) => row.includes(FOLLOWS[name]!)) + 1, 0, [name])
        continue
      }
      const group = attributes.find((attribute) => attribute.name === name)?.group ?? DEFAULT_GROUP
      let section = sections.find((each) => each.group === group) ?? added.find((each) => each.group === group)
      if (!section) {
        section = { group, label: undefined, rows: [] }
        added.push(section)
      }
      section.rows.push([name])
    }
    added.sort((a, b) => GROUP_ORDER.indexOf(a.group!) - GROUP_ORDER.indexOf(b.group!))
    return [...sections, ...added].filter((section) => section.rows.length)
  }

  /** The names of `attributes` that `layout` neither places nor leaves out, in their order:  `place()` adds them. */
  static unplaced(layout: PropertyLayout | undefined, attributes: readonly AttributeLike[]): string[] {
    const named = new Set([
      ...(layout?.omitted ?? []),
      ...(layout?.sections ?? []).flatMap((section) => section.rows.flat())
    ])
    return attributes.map((attribute) => attribute.name).filter((name) => !named.has(name))
  }

  /** The names `layout` places or leaves out that `attributes` doesn't have:  a renamed or dropped attribute. */
  static unknown(layout: PropertyLayout, attributes: readonly AttributeLike[]): string[] {
    const known = new Set(attributes.map((attribute) => attribute.name))
    const named = [...layout.omitted, ...layout.sections.flatMap((section) => section.rows.flat())]
    return named.filter((name) => !known.has(name))
  }

  ////////////////
  // ## Writing one
  ////////////////

  /**
   * The text of `tag`'s layout file, laid out as the vocabulary rule lays out `attributes` (`place()` with no layout):
   * the file a new tag starts from, which changes nothing until it's tweaked.
   * - Each section titled with its group's `GROUP_LABELS` name.
   * - Built from elements (`outerHTML`), not from strings.
   */
  static write(tag: string, attributes: readonly AttributeLike[], document: Document = globalThis.document): string {
    const editor = document.createElement(EDITOR_TAG)
    editor.setAttribute("schema", tag)
    editor.setAttribute(OMIT_ATTRIBUTE, "")
    for (const section of PropertyLayouts.place(undefined, attributes)) {
      const group = document.createElement(GROUP_TAG)
      group.setAttribute("label", PropertyLayouts.labelOf(section.group))
      group.setAttribute(GROUP_ATTRIBUTE, section.group ?? DEFAULT_GROUP)
      for (const row of section.rows) {
        const holder = row.length > 1 ? document.createElement(ROW_TAG) : group
        for (const name of row) {
          const property = document.createElement(PROPERTY_TAG)
          property.setAttribute("name", name)
          holder.append(property)
        }
        if (holder !== group) group.append(holder)
      }
      editor.append(group)
    }
    return `${HEADER(tag)}\n${PropertyLayouts.lines(editor, 0).join("\n")}\n`
  }

  /** A section's title for `group`, in English:  `Appearance`.  (The Inspector shows its own words for each group.) */
  static labelOf(group: V.AttributeGroup | undefined): string {
    return GROUP_LABELS[group ?? DEFAULT_GROUP]
  }

  ////////////////
  // ## The shipped files
  ////////////////

  /**
   * Spell UI's layout of `tag`, read from its file;  `undefined` when it has none.
   * - Each file is its own chunk, loaded the first time it's asked for, then kept.
   * - NEVER throws:  a file that won't load is no layout, and the vocabulary rule lays the tag out.
   */
  static load(tag: string): Promise<PropertyLayout | undefined> {
    let loading = PropertyLayouts.loading.get(tag)
    if (!loading) {
      loading = PropertyLayouts.fetch(tag)
      PropertyLayouts.loading.set(tag, loading)
    }
    return loading
  }

  /** `tag`'s layout if `load()` has it already:  a layout, `null` for none, `undefined` while it's not in yet. */
  static loaded(tag: string): PropertyLayout | null | undefined {
    return PropertyLayouts.done.get(tag)
  }

  /** Spell UI's tags that have a layout file. */
  static get tags(): string[] {
    return Object.keys(PropertyLayouts.files)
  }

  /** The layouts asked for, by tag. */
  private static readonly loading = new Map<string, Promise<PropertyLayout | undefined>>()

  /** The layouts in, by tag;  `null` for a tag with none. */
  private static readonly done = new Map<string, PropertyLayout | null>()

  /** Read `tag`'s file (see `load()`). */
  private static async fetch(tag: string): Promise<PropertyLayout | undefined> {
    let layout: PropertyLayout | undefined
    try {
      const file = PropertyLayouts.files[tag]
      layout = file ? PropertyLayouts.parse(await file()) : undefined
    } catch (error) {
      console.error(`PropertyLayouts.load():  can't read ${tag}'s layout`, error)
    }
    PropertyLayouts.done.set(tag, layout ?? null)
    return layout
  }

  /** Every shipped layout file's loader, by tag:  `{}` where nothing builds them in (node). */
  private static get files(): Readonly<Record<string, () => Promise<string>>> {
    return (PropertyLayouts.fileLoaders ??= PropertyLayouts.findFiles())
  }
  private static fileLoaders: Readonly<Record<string, () => Promise<string>>> | undefined

  /**
   * The family folders' `*.editor.html` files, by tag.
   * - NOTE:  `import.meta.glob()` MUST stay a literal call:  Vite rewrites it at build time.
   *   Under plain node (`tsx`) there's none, so it throws:  no files there.
   * - RELATIVE, as `Themes`' glob is:  a glob takes no package name.
   */
  private static findFiles(): Readonly<Record<string, () => Promise<string>>> {
    try {
      const found = import.meta.glob<string>("../components/*/*.editor.html", { query: "?raw", import: "default" })
      return Object.fromEntries(
        Object.entries(found).map(([path, loader]) => [path.replace(/^.*\//, "").replace(LAYOUT_SUFFIX, ""), loader])
      )
    } catch {
      return {}
    }
  }

  ////////////////
  // ## Helpers
  ////////////////

  /** `element`'s lines, `depth` levels in:  one line with no element inside it, else its start tag, its children, its end. */
  private static lines(element: Element, depth: number): string[] {
    const indent = INDENT.repeat(depth)
    if (!element.children.length) return [`${indent}${element.outerHTML}`]
    const empty = (element.cloneNode(false) as Element).outerHTML
    const end = `</${element.localName}>`
    const children = [...element.children].flatMap((child) => PropertyLayouts.lines(child, depth + 1))
    return [`${indent}${empty.slice(0, -end.length)}`, ...children, `${indent}${end}`]
  }
}

/** A layout, read from its file. */
export type PropertyLayout = {
  /** Its tag:  its editor's `schema`. */
  tag: string
  /** Its sections, in order. */
  sections: LayoutSection[]
  /** The attributes it leaves out (`data-omit`). */
  omitted: string[]
}

/** One of a layout's sections, as written. */
export type LayoutSection = {
  /** Its vocabulary group (`data-group`);  `undefined` for the properties outside any group, which come first. */
  group: V.AttributeGroup | undefined
  /** Its title as written (`label`). */
  label: string | undefined
  /** Its rows, in order:  each row's attribute names, side by side. */
  rows: string[][]
}

/** A section as `read()` gathers it:  its element, and each row's `<ui-fields>`, to tell its rows apart. */
type SectionRead = {
  group: V.AttributeGroup | undefined
  label: string | undefined
  rows: { names: string[]; row?: Element }[]
  element?: Element
}

/** A section a property editor draws (`place()`):  as written, plus the attributes the layout didn't place. */
export type PlacedSection = LayoutSection

/** What `place()` reads of an attribute:  its name and its group. */
export type AttributeLike = Pick<V.AttributeSpec, "name" | "group">

/** The family's tags, and a row's. */
const EDITOR_TAG = "ui-property-editor"
const GROUP_TAG = "ui-property-group"
const PROPERTY_TAG = "ui-property"
const ROW_TAG = "ui-fields"

/** Where a section's group and the omitted attributes are written. */
const GROUP_ATTRIBUTE = "data-group"
const OMIT_ATTRIBUTE = "data-omit"

/**
 * Attributes the vocabulary rule puts right after another, wherever that one is, in place of their own group's end:
 * - `inverted` after `color`:  a colour and its inverse go together (Owen, epic `editor` T94)
 */
const FOLLOWS: Readonly<Record<string, string>> = { inverted: "color" }

/** An attribute with no group is in this one, as the Inspector has always shown it. */
const DEFAULT_GROUP: V.AttributeGroup = "appearance"

/**
 * The groups in a property editor's order.
 * - A copy of `E.ATTRIBUTE_GROUPS` (`spell/element/vocabulary.types`):  a value import of it would bring the element
 *   into a node tool;  the layouts test checks the two agree.
 */
export const GROUP_ORDER: readonly V.AttributeGroup[] = [
  "name",
  "content",
  "appearance",
  "layout",
  "states",
  "form",
  "link",
  "behaviour",
  "advanced"
]

/** Each group's title in a layout file, in English:  the Inspector shows its own words for the group. */
const GROUP_LABELS: Record<V.AttributeGroup, string> = {
  name: "Name",
  content: "Content",
  appearance: "Appearance",
  layout: "Layout",
  states: "States",
  form: "Form",
  link: "Link",
  behaviour: "Behaviour",
  advanced: "Advanced"
}

/** A layout file's name, after its tag. */
const LAYOUT_SUFFIX = ".editor.html"

/** A layout file's first lines:  what it is, and where the how-to is. */
const HEADER = (tag: string) =>
  `<!-- <${tag}>'s property editor layout:  move, pair (<ui-fields>) or leave out (data-omit) its properties.  ` +
  `How:  Spell UI's AGENTS.md, "Property editor layouts". -->`

/** One level of a file's indent. */
const INDENT = "  "
