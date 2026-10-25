import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"

import type {
  SiteAttribute,
  SiteOldName,
  SiteDataFile,
  SiteEvent,
  SiteNamed,
  SiteTag
} from "spell-ui/docs-components/docs-components.types"
import { SRV } from "spell/server"
import type { CssCustomData, CssCustomDataEntry, CustomElementsManifest, HtmlCustomData } from "./tools.types.ts"

import { FamilyFiles } from "./FamilyFiles.ts"

/****************
 * ### `ElementManifests`
 * What editors read about the elements:  the STANDARD descriptions, and the JSX types.
 * - Made from the site data (`docs/__data/components.json5`, every vocabulary).
 * - `custom-elements.json`:  a Custom Elements Manifest (schema 2.1),
 *   what web-component tools read (Storybook, linters, IDE plugins, Claude)
 *   - `package.json`'s `customElements` points at it
 * - `html-custom-data.json`:  VS Code's HTML custom data (`html.customData`):
 *   autocomplete and hover docs for every `<ui-*>` tag, attribute and value in any `.html` file
 *   - spell-app's VS Code extension carries a copy, made when it's built:  one in every window
 * - `css-custom-data.json`:  VS Code's CSS custom data (`css.customData`), for any `.css` file:
 *   - every family's custom properties (`--ui-button-radius`), completed as property names, with hover docs
 *   - every part, as `::part(icon)`, and every custom state, as `:state(open)`
 *     - for ANY selector:  VS Code can't tell which tag a selector names,
 *       so each one's docs list the tags that have it
 *   - loaded beside the HTML data
 * - `src/jsx.ts` (`spell-ui/jsx`, `jsxTypes()`):  every tag's attributes and events, as types for Solid's JSX
 *   - so VS Code completes, explains and checks `<ui-*>` tags in a `.tsx` file of any program that imports it
 * - Written by `yarn site:data`, and committed:  editors read them with no build of Spell UI.
 *   - The HTML and CSS data show after spell-app's extension is rebuilt (`spell app vscode`):  it copies them.
 *   - The three data files beside `components.json5`;  the JSX types in `src/`, as code imports them.
 *   - `tests/tools/ElementManifests.test.ts` fails while they're stale.
 * - All list COMPONENT tags only, not the doc-only `<ui-docs-*>`.
 * - Pure data in, text out:  reads only the family barrels' file names (`className()`).
 * - Another package's elements written the same way (the brand's `<brand-*>`):
 *   its own `yarn site:data` makes these with its own folders, beside ITS site data
 *   (spell-brand's `scripts/site-data.ts`).
 * - Why not the `custom-elements-manifest analyze` script (`yarn manifest`):
 *   it reads classes, and our attributes, events and slots live in the vocabulary objects, which it can't see.
 ****************/
export class ElementManifests {
  /** site data, as `yarn site:data` builds it */
  readonly data: SiteDataFile
  /** the package folder (`spell-ui/`, `spell-brand/`), absolute:  where element class files are looked up */
  readonly packageFolder: string
  /** family folders, relative to `packageFolder`:  `components`, as every set lays them out (Spell UI's, the brand's) */
  readonly componentsPath: string
  /** the manifest's `readme` line */
  readonly readme: string

  constructor({
    data,
    packageFolder,
    componentsPath = "src/components",
    readme = SPELL_UI_README
  }: ElementManifestsProps) {
    this.data = data
    this.packageFolder = packageFolder
    this.componentsPath = componentsPath
    this.readme = readme
  }

  /**
   * The three data files as `yarn site:data` writes them, `[path, text]`, into `dataFolder` (`docs/__data/`).
   * - `JSON.stringify(..., 2)`:  oxfmt skips a set's `docs/__data/`,
   *   so the bytes stay ours, and the staleness test can compare them.
   */
  outputs(dataFolder: string): [file: string, text: string][] {
    return [
      [join(dataFolder, "custom-elements.json"), JSON.stringify(this.customElements(), null, 2) + "\n"],
      [join(dataFolder, "html-custom-data.json"), JSON.stringify(this.htmlCustomData(), null, 2) + "\n"],
      [join(dataFolder, "css-custom-data.json"), JSON.stringify(this.cssCustomData(), null, 2) + "\n"]
    ]
  }

  /** The Custom Elements Manifest:  one module per family (its `index.ts`, which defines every tag of it). */
  customElements(): CustomElementsManifest {
    const folders = [...new Set(this.data.components.map((tag) => tag.folder))].sort()
    return {
      schemaVersion: "2.1.0",
      readme: this.readme,
      modules: folders.map((folder) => {
        const path = `${this.componentsPath}/${folder}/index.ts`
        const tags = this.data.components.filter((tag) => tag.folder === folder)
        const family = this.data.families[folder]
        return {
          kind: "javascript-module",
          path,
          declarations: tags.map((tag) => this.declaration(tag, tag.main ? family?.tokens : undefined)),
          exports: tags.flatMap((tag) => {
            const declaration = { name: this.className(tag), module: path }
            return [
              { kind: "js", name: declaration.name, declaration },
              { kind: "custom-element-definition", name: tag.tag, declaration }
            ]
          })
        }
      })
    }
  }

  /** VS Code's HTML custom data:  every component tag, its attributes and their values, as markdown docs. */
  htmlCustomData(): HtmlCustomData {
    return {
      version: 1.1,
      tags: this.data.components.map((tag) => ({
        name: tag.tag,
        description: { kind: "markdown", value: ElementManifests.tagMarkdown(tag) },
        attributes: tag.attributes
          .filter((attribute) => attribute.kind !== "json")
          .flatMap((attribute) =>
            [attribute.name, ...(attribute.aliases ?? [])]
              .map((name) => ({
                name,
                description: {
                  kind: "markdown" as const,
                  value: ElementManifests.attributeMarkdown(
                    attribute,
                    name === attribute.name ? undefined : attribute.name
                  )
                },
                ...(ElementManifests.values(attribute).length && {
                  values: ElementManifests.values(attribute).map((value) => ({ name: value }))
                })
              }))
              .concat(
                (attribute.replaces ?? []).map((old) => ({
                  name: old.name,
                  description: { kind: "markdown" as const, value: ElementManifests.oldNameMarkdown(attribute, old) }
                }))
              )
          )
      }))
    }
  }

  /**
   * VS Code's CSS custom data:  every family's custom properties, every part and every custom state.
   * - Properties:  each family's tokens, by its main tag, with its default and the family's tag in the docs.
   * - Parts and states, by name (`::part(icon)`, `:state(open)`), A-Z:
   *   VS Code offers them after ANY selector, so each one's docs list the tags that have it, and what it is on each.
   */
  cssCustomData(): CssCustomData {
    const properties = new Map<string, CssCustomDataEntry>()
    for (const tag of this.data.components) {
      if (!tag.main) continue
      for (const token of this.data.families[tag.folder]?.tokens ?? []) {
        if (properties.has(token.name)) continue
        const lines = [token.description ?? "", "", `\`<${tag.tag}>\`'s token.  Default:  \`${token.default}\``]
        properties.set(token.name, ElementManifests.cssEntry(token.name, lines.join("\n").trim()))
      }
    }
    return {
      version: 1.1,
      properties: [...properties.values()],
      pseudoElements: this.cssNamed(
        (tag) => tag.parts,
        (name) => `::part(${name})`,
        "Part"
      ),
      pseudoClasses: this.cssNamed(
        (tag) => tag.states,
        (name) => `:state(${name})`,
        "Custom state"
      )
    }
  }

  /**
   * One CSS custom data entry per distinct name `namedOf()` gives, A-Z (`cssCustomData()`):
   * written by `nameFor()`, its docs `<kind> of` each tag with it, and what it is there.
   */
  private cssNamed(
    namedOf: (tag: SiteTag) => readonly SiteNamed[],
    nameFor: (name: string) => string,
    kind: string
  ): CssCustomDataEntry[] {
    const byName = new Map<string, string[]>()
    for (const tag of this.data.components) {
      for (const named of namedOf(tag)) {
        const lines = byName.get(named.name) ?? []
        lines.push(`- \`<${tag.tag}>\`:  ${named.description}`)
        byName.set(named.name, lines)
      }
    }
    return [...byName.keys()]
      .sort()
      .map((name) => ElementManifests.cssEntry(nameFor(name), [`${kind} of:`, "", ...byName.get(name)!].join("\n")))
  }

  /** A CSS custom data entry:  `name`, with `markdown` as its docs. */
  private static cssEntry(name: string, markdown: string): CssCustomDataEntry {
    return { name, description: { kind: "markdown", value: markdown } }
  }

  ////////////////
  // ## Declarations
  ////////////////

  /** One tag's class declaration;  `tokens`:  its family's CSS custom properties (on the main tag only). */
  private declaration(tag: SiteTag, tokens?: readonly { name: string; default: string; description?: string }[]) {
    const attributes = tag.attributes.filter((attribute) => attribute.kind !== "json")
    const properties = tag.attributes.filter((attribute) => attribute.kind === "json")
    return {
      kind: "class",
      name: this.className(tag),
      tagName: tag.tag,
      customElement: true,
      summary: tag.description ?? "",
      description: [tag.description, tag.aka.length ? `Also known as:  ${tag.aka.join(", ")}.` : ""]
        .filter(Boolean)
        .join("\n\n"),
      attributes: attributes.map((attribute) => ({
        name: attribute.name,
        description: attribute.description,
        type: { text: ElementManifests.typeText(attribute) },
        ...(attribute.default !== undefined &&
          attribute.default !== null && { default: JSON.stringify(attribute.default) }),
        fieldName: attribute.property ?? ElementManifests.camel(attribute.name)
      })),
      members: properties.map((attribute) => ({
        kind: "field",
        name: attribute.property ?? ElementManifests.camel(attribute.name),
        description: `${attribute.description}  A JS property (rich data), not an attribute.`,
        type: { text: "unknown" }
      })),
      events: tag.events.map((event) => ({
        name: event.name,
        description: event.description + (event.cancelable ? "  Cancelable:  `preventDefault()` vetoes it." : ""),
        type: { text: `CustomEvent<${event.detail}>` }
      })),
      slots: tag.slots.map((slot) => ({ name: slot.name, description: slot.description })),
      cssParts: tag.parts.map((part) => ({ name: part.name, description: part.description })),
      cssStates: tag.states.map((state) => ({ name: state.name, description: state.description })),
      cssProperties: (tokens ?? []).map((token) => ({
        name: token.name,
        default: token.default,
        ...(token.description && { description: token.description })
      }))
    }
  }

  /**
   * `tag`'s class name, by `FamilyFiles.stem()`'s rule:  `ui-breadcrumb-section` => `UIBreadcrumbSection`.
   * - Any set's prefix:  `brand-blob` => `BrandBlob`.
   * - Checked against its family folder, for a file of that name.
   * - Else the class the family barrel names ending in `<Name>`:  `ui-event` => `UIFeedEvent`.
   */
  className(tag: SiteTag): string {
    const name = FamilyFiles.stem(tag.tag)
    const folder = join(this.packageFolder, this.componentsPath, tag.folder)
    if ([".tsx", ".ts"].some((extension) => existsSync(join(folder, name + extension)))) return name
    const barrel = join(folder, "index.ts")
    if (!existsSync(barrel)) return name
    const first = tag.tag.startsWith("ui-") ? "UI" : ""
    const found = readFileSync(barrel, "utf8").match(
      new RegExp(`\\b${first}\\w*${ElementManifests.pascal(tag.tag)}\\b`)
    )
    return found?.[0] ?? name
  }

  ////////////////
  // ## JSX types
  ////////////////

  /**
   * `src/jsx.ts`, as `yarn site:data` writes it, `[path, text]`:  `jsxTypes()`, formatted as `yarn format` would.
   * - Committed, and checked byte for byte by the staleness test, so it's written already tidy.
   * - throws if the text doesn't parse (a generator bug)
   */
  async jsxOutput(): Promise<[file: string, text: string]> {
    const file = join(this.packageFolder, JSX_FILE)
    return [file, await SRV.formatHTML(file, this.jsxTypes())]
  }

  /**
   * The JSX types of every component tag, as TypeScript text:  `spell-ui/jsx`.
   * - Per tag, two interfaces:
   *   - `<Class>Attributes`:  the attributes its vocabulary names, aliases too, and its rich (`json`) properties
   *   - `<Class>JSXAttributes`:  those, plus HTML's global ones (`class`, `id`, `slot`, `onClick`, `aria-*` ...)
   *   - and `<Class>EventMap`, for a tag that sends events:  each event's `CustomEvent`, its `detail` typed
   * - Then Solid's `JSX.IntrinsicElements` entry per tag, with its hover docs.
   * - Then the DOM's own maps (`jsxDomMaps()`):  each tag's element, and every event name.
   * - EXACT:  a name the vocabulary doesn't give is an error.
   *   - Except a dashed one (`sise-x`):  TypeScript never checks a JSX attribute name with a dash in it.
   * - throws if two tags would get the same type name
   */
  jsxTypes(): string {
    const names = new Set<string>()
    const lines = [...JSX_HEADER, ""]
    for (const tag of this.data.components) {
      const name = this.className(tag)
      if (names.has(name)) throw new Error(`ElementManifests.jsxTypes():  two tags are both \`${name}\`;  rename one`)
      names.add(name)
      lines.push(...this.jsxTagTypes(tag, name), "")
    }
    lines.push(`declare module "@solidjs/web/types/jsx.js" {`, "  namespace JSX {", "    interface IntrinsicElements {")
    for (const tag of this.data.components) {
      lines.push(
        ...ElementManifests.docstring(ElementManifests.jsxTagDocs(tag), "      "),
        `      "${tag.tag}": ${this.className(tag)}JSXAttributes`
      )
    }
    lines.push("    }", "  }", "}", "", ...this.jsxDomMaps())
    return lines.join("\n")
  }

  /**
   * The DOM's own maps (`jsxTypes()`), so plain DOM code knows the tags and their events:
   * - `HTMLElementTagNameMap`:  each tag's element (`jsxElementType()`)
   *   - so `querySelector("ui-button")` gives one whose `addEventListener("ui-toggle", ...)` types `event.detail`
   * - `UIEventMap`, every event name a tag sends, as a `CustomEvent<unknown>`,
   *   added to `HTMLElementEventMap` and `DocumentEventMap`:  any element or the document completes the names
   *   - `unknown`:  the same name is any tag's, other sets' too (`<brand-*>`, `<epic-*>`), each with its own `detail`
   */
  private jsxDomMaps(): string[] {
    const names = new Set(this.data.components.flatMap((tag) => tag.events.map((event) => event.name)))
    return [
      "/**",
      " * Every event name a `<ui-*>` tag sends, on any element or the document:  `addEventListener()` completes them.",
      " * - Its `detail` is `unknown` here:  the same name is any tag's, other sets' too, each with its own.",
      ' *   The tag\'s own element types it:  `querySelector("ui-button")`, or a JSX `ref`.',
      " */",
      "export interface UIEventMap {",
      ...[...names].map((name) => `  "${name}": CustomEvent<unknown>`),
      "}",
      "",
      "declare global {",
      "  interface HTMLElementTagNameMap {",
      ...this.data.components.map((tag) => `    "${tag.tag}": ${this.jsxElementType(tag)}`),
      "  }",
      "  interface HTMLElementEventMap extends UIEventMap {}",
      "  interface DocumentEventMap extends UIEventMap {}",
      "}",
      ""
    ]
  }

  /** `tag`'s element in the DOM's types:  `UIHTMLElement<<Class>EventMap>` when it sends events, else `HTMLElement`. */
  private jsxElementType(tag: SiteTag): string {
    return tag.events.length ? `UIHTMLElement<${this.className(tag)}EventMap>` : "HTMLElement"
  }

  /** `tag`'s two interfaces (`jsxTypes()`), as lines;  `name`:  its class name. */
  private jsxTagTypes(tag: SiteTag, name: string): string[] {
    const members = ElementManifests.jsxAttributeMembers(tag, name)
    return [
      ...ElementManifests.jsxEventTypes(tag, name),
      `/** \`<${tag.tag}>\`'s own attributes, from its vocabulary. */`,
      ...(members.length
        ? [`export interface ${name}Attributes {`, ...members, "}"]
        : [`export type ${name}Attributes = {}`]),
      "",
      `/** \`<${tag.tag}>\` in JSX:  its own attributes, and HTML's global ones. */`,
      `export interface ${name}JSXAttributes`,
      `  extends Omit<UIGlobalJSXAttributes<${this.jsxElementType(tag)}>, keyof ${name}Attributes>, ${name}Attributes {}`
    ]
  }

  /**
   * One member per JSX name `tag`'s vocabulary gives, each with its docstring.
   * - An attribute:  its name and each alias, typed by `jsxType()`.
   * - A rich (`json`) property:  its property name, `options={[...]}`:
   *   a function or object given as a plain prop reaches the element whole (the kit's `RichAttributes`).
   * - The properties no vocabulary names (`JSX_SCRIPT_PROPERTIES`):  their plain name.
   * - Each of those also as `prop:<property>`, the same type, `@deprecated` (`deprecatedProp()`):
   *   compiled spell still writes `prop:` on `<ui-*>` tags, and is checked against these types.
   * - An event:  `on-<event>` (`on-ui-change`), its listener, typed by `<name>EventMap`.
   * - The first of two same names wins.
   */
  private static jsxAttributeMembers(tag: SiteTag, name: string): string[] {
    const members = new Map<string, string[]>()
    for (const attribute of tag.attributes) {
      if (attribute.kind === "json") {
        ElementManifests.addRichProperty(
          members,
          attribute.property ?? ElementManifests.camel(attribute.name),
          attribute.description
        )
        continue
      }
      for (const name of [attribute.name, ...(attribute.aliases ?? [])]) {
        if (members.has(name)) continue
        const key = /^[a-zA-Z_$][\w$]*$/.test(name) ? name : JSON.stringify(name)
        const docs = ElementManifests.attributeDocs(attribute, name === attribute.name ? undefined : attribute.name)
        members.set(name, [
          ...ElementManifests.docstring(docs, "  "),
          `  ${key}?: ${ElementManifests.jsxType(attribute)}`
        ])
      }
      for (const old of attribute.replaces ?? []) {
        if (members.has(old.name)) continue
        const key = /^[a-zA-Z_$][\w$]*$/.test(old.name) ? old.name : JSON.stringify(old.name)
        members.set(old.name, [
          ...ElementManifests.docstring([`@deprecated ${ElementManifests.oldNameMarkdown(attribute, old)}`], "  "),
          `  ${key}?: ${old.value === undefined ? ElementManifests.jsxType(attribute) : 'boolean | ""'}`
        ])
      }
      ElementManifests.deprecatedProp(
        members,
        attribute.property ?? ElementManifests.camel(attribute.name),
        attribute.name,
        [`\`${attribute.name}\`, as the DOM element's property.`],
        ElementManifests.jsxType(attribute)
      )
    }
    for (const { property, type, description, isFor } of JSX_SCRIPT_PROPERTIES) {
      if (!isFor(tag)) continue
      if (!members.has(property))
        members.set(property, [...ElementManifests.docstring([description], "  "), `  ${property}?: ${type}`])
      ElementManifests.deprecatedProp(members, property, property, [description], type)
    }
    for (const event of tag.events) {
      const prop = `on-${event.name}`
      if (members.has(prop)) continue
      members.set(prop, [
        ...ElementManifests.docstring(ElementManifests.eventDocs(event), "  "),
        `  "${prop}"?: (event: ${name}EventMap["${event.name}"]) => void`
      ])
    }
    return [...members.values()].flat()
  }

  /**
   * `<name>EventMap`, `tag`'s events by name, each its `CustomEvent` (`jsxTagTypes()`);  none for a tag that sends none.
   * - `detail`:  the vocabulary's text, its Spell UI type names qualified (`jsxDetailType()`).
   */
  private static jsxEventTypes(tag: SiteTag, name: string): string[] {
    if (!tag.events.length) return []
    return [
      `/** \`<${tag.tag}>\`'s events, from its vocabulary:  each one's \`CustomEvent\`, by name. */`,
      `export interface ${name}EventMap {`,
      ...tag.events.flatMap((event) => [
        ...ElementManifests.docstring(ElementManifests.eventDocs(event), "  "),
        `  "${event.name}": CustomEvent<${ElementManifests.jsxDetailType(tag, event)}>`
      ]),
      "}",
      ""
    ]
  }

  /**
   * An event's `detail` text as TypeScript, for `src/jsx.ts`:  each Spell UI type it names, qualified by its namespace
   * (`FieldValue` => `E.FieldValue`, by `JSX_DETAIL_TYPES`).
   * - The DOM's and TypeScript's own names (`Element`, `Event`, `Record` ...:  `JSX_GLOBAL_TYPE`) stay as they are.
   * - throws for any other name:  add it to `JSX_DETAIL_TYPES`
   */
  static jsxDetailType(tag: SiteTag, event: SiteEvent): string {
    return event.detail.replace(/(["'])(?:(?!\1).)*\1|\b[A-Z]\w*/g, (word) => {
      if (/^["']/.test(word) || JSX_GLOBAL_TYPE.test(word)) return word
      const qualified = JSX_DETAIL_TYPES[word]
      if (qualified) return qualified
      throw new Error(
        `ElementManifests.jsxDetailType():  \`<${tag.tag}>\`'s \`${event.name}\` detail names \`${word}\`;  ` +
          "add it to `JSX_DETAIL_TYPES`, or write the detail as TypeScript"
      )
    })
  }

  /** An event's docstring lines:  what it means, its `detail`'s shape, and whether `preventDefault()` vetoes it. */
  static eventDocs(event: SiteEvent): string[] {
    const lines = [`\`${event.name}\`:  ${event.description}`, `- \`event.detail\`:  \`${event.detail}\``]
    if (event.cancelable) lines.push("- cancelable:  `preventDefault()` vetoes it")
    return lines
  }

  /**
   * SIDE EFFECT:  adds a rich (`json`) property's two members to `members` (`jsxAttributeMembers()`):
   * its plain name, and `prop:<property>`, deprecated.
   */
  private static addRichProperty(members: Map<string, string[]>, property: string, description: string) {
    const docs = [description, "- a JS property (rich data):  an object, array or function, given as it is"]
    members.set(property, [...ElementManifests.docstring(docs, "  "), `  ${property}?: unknown`])
    ElementManifests.deprecatedProp(members, property, property, docs, "unknown")
  }

  /**
   * SIDE EFFECT:  adds `prop:<property>` to `members` (`jsxAttributeMembers()`), unless it's there:
   * `docs`, then a `@deprecated` tag naming `plainName`, what to write instead.
   * - Kept for compiled spell, which still writes `prop:` on `<ui-*>` tags (epic `solid-17`'s J12);
   *   it goes once that's done (epic `intellisense`'s T2).
   * - `@deprecated`, though WWOD's docstrings use no tags:  it's the editor's own signal,
   *   drawn struck through, so people stop writing `prop:` by hand.
   */
  private static deprecatedProp(
    members: Map<string, string[]>,
    property: string,
    plainName: string,
    docs: string[],
    type: string
  ) {
    const name = `prop:${property}`
    if (members.has(name)) return
    members.set(name, [
      ...ElementManifests.docstring(
        [...docs, `@deprecated write \`${plainName}\` -- \`prop:\` stays only for compiled spell`],
        "  "
      ),
      `  "${name}"?: ${type}`
    ])
  }

  /**
   * An attribute's type in JSX:  `typeText()`, as JSX writes it.
   * - `number`:  a number or its text (`max={5}`, `max="5"`);  Solid sets either as the attribute's text.
   * - A value set that also takes free text (`width`):  `string & {}`, so the editor still offers the set.
   * - A flag:  `basic`, `basic={true}` or `basic=""` sets it (the attribute's own text), `basic={false}` removes it.
   */
  static jsxType(attribute: SiteAttribute): string {
    const type = ElementManifests.typeText(attribute)
    if (type === "number") return "number | `${number}`"
    if (type.startsWith("boolean")) return type.replace(/^boolean/, 'boolean | ""')
    return type.endsWith(" | string") ? type.replace(/ \| string$/, " | (string & {})") : type
  }

  /** A tag's hover docs in JSX, as docstring lines:  what it is, also-known-as, slots and events. */
  static jsxTagDocs(tag: SiteTag): string[] {
    const lines = [`\`<${tag.tag}>\`:  ${tag.description ?? ""}`]
    if (tag.aka.length) lines.push(`- also known as:  ${tag.aka.join(", ")}`)
    if (tag.slots.length) {
      lines.push("- slots:")
      for (const slot of tag.slots)
        lines.push(`  - ${slot.name ? `\`${slot.name}\`` : "default"}:  ${slot.description}`)
    }
    if (tag.events.length) lines.push(`- events:  ${tag.events.map((event) => `\`${event.name}\``).join(", ")}`)
    return lines
  }

  /** An attribute's docstring lines;  `aliasOf`:  the canonical name, when this is an alias. */
  static attributeDocs(attribute: SiteAttribute, aliasOf?: string): string[] {
    const lines = [aliasOf ? `Alias of \`${aliasOf}\`.  ${attribute.description}` : attribute.description]
    lines.push(`- takes:  ${ElementManifests.valueWords(attribute)}`)
    if (attribute.default !== undefined && attribute.default !== null)
      lines.push(`- default:  \`${attribute.default}\``)
    return lines
  }

  /** `lines` as a `/** ... *\/` docstring at `indent`;  a line's own line breaks stay, `*\/` is escaped. */
  static docstring(lines: string[], indent: string): string[] {
    const body = lines.flatMap((line) => line.replace(/\*\//g, "*\\/").split("\n"))
    return [`${indent}/**`, ...body.map((line) => `${indent} *${line ? " " + line : ""}`), `${indent} */`]
  }

  ////////////////
  // ## Attribute text (shared with `DesignComponents`)
  ////////////////

  /**
   * An attribute's TypeScript type, as text:  `boolean` for a key-only flag, a string union for a value set,
   * `boolean | "left" | "right"` for one that's either, `string` / `number` otherwise.
   */
  static typeText(attribute: SiteAttribute): string {
    const values = ElementManifests.values(attribute).map((value) => JSON.stringify(value))
    switch (attribute.kind) {
      case "keyOnly":
      case "boolean":
        return "boolean"
      case "keyOrValueAndKey":
        return ["boolean", ...values].join(" | ")
      case "number":
        return "number"
      case "json":
        return "unknown"
      case "multiple":
        return "string"
      case "width":
        return values.length ? [...values, "string"].join(" | ") : "string"
      default:
        return values.length ? values.join(" | ") : "string"
    }
  }

  /** Whether an attribute is a plain on / off flag:  present or absent, no value. */
  static isFlag(attribute: SiteAttribute): boolean {
    return attribute.kind === "keyOnly" || attribute.kind === "boolean"
  }

  /** The values an attribute takes, for completion:  its value set (`multiple`:  each word of it). */
  static values(attribute: SiteAttribute): readonly string[] {
    return ElementManifests.isFlag(attribute) ? [] : (attribute.values ?? [])
  }

  /** What an attribute takes, in words:  `flag`, `` `left` · `right` ``, `string` ... */
  static valueWords(attribute: SiteAttribute): string {
    const values = ElementManifests.values(attribute).map((value) => `\`${value}\``)
    switch (attribute.kind) {
      case "keyOnly":
      case "boolean":
        return "flag (present / absent)"
      case "keyOrValueAndKey":
        return `flag, or ${values.join(" · ")}`
      case "multiple":
        return `space-separated:  ${values.join(" · ")}`
      case "width":
        return `${values.length ? `${values[0]}-${values.at(-1)}` : "columns"}, a fraction (\`1/4\`) or a percentage`
      case "json":
        return "JS property (rich data)"
      case "icon":
        return "icon name"
      case "number":
        return "number"
      default:
        return values.length ? values.join(" · ") : "text"
    }
  }

  /** A tag's hover docs:  description, also-known-as, slots and events. */
  static tagMarkdown(tag: SiteTag): string {
    const lines = [tag.description ?? "", ""]
    if (tag.aka.length) lines.push(`Also known as:  ${tag.aka.join(", ")}.`, "")
    if (tag.slots.length)
      lines.push("**Slots:**  " + tag.slots.map((slot) => (slot.name ? `\`${slot.name}\`` : "default")).join(", "), "")
    if (tag.events.length) lines.push("**Events:**  " + tag.events.map((event) => `\`${event.name}\``).join(", "), "")
    return lines.join("\n").trim()
  }

  /** An attribute's hover docs;  `aliasOf`:  the canonical name, when this is an alias. */
  static attributeMarkdown(attribute: SiteAttribute, aliasOf?: string): string {
    const lines = [aliasOf ? `Alias of \`${aliasOf}\`.  ${attribute.description}` : attribute.description]
    lines.push("", `Takes:  ${ElementManifests.valueWords(attribute)}`)
    if (attribute.default !== undefined && attribute.default !== null) lines.push(`Default:  \`${attribute.default}\``)
    return lines.join("\n")
  }

  /** What an OLD name says in editors:  `An old name:  write \`color="primary"\`.` */
  static oldNameMarkdown(attribute: SiteAttribute, old: SiteOldName): string {
    const instead = old.value === undefined ? attribute.name : `${attribute.name}="${old.value}"`
    return `An old name:  write \`${instead}\`.  It still works until every page is rewritten.`
  }

  /** `ui-breadcrumb-section` => `BreadcrumbSection`. */
  static pascal(tag: string): string {
    return tag
      .replace(/^ui-/, "")
      .split("-")
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join("")
  }

  /** `active-text` => `activeText`. */
  static camel(name: string): string {
    return name.replace(/-([a-z])/g, (_, letter: string) => letter.toUpperCase())
  }
}

/** Constructor props of `ElementManifests`:  the data, and where its package's elements are. */
export type ElementManifestsProps = {
  /** site data, as `yarn site:data` builds it */
  data: SiteDataFile
  /** the package folder, absolute */
  packageFolder: string
  /** family folders, relative to the package folder;  default `components` (Spell UI's) */
  componentsPath?: string
  /** the Custom Elements Manifest's `readme` line;  default Spell UI's */
  readme?: string
}

/** The JSX types' file (`jsxOutput()`), from the package folder:  imported as `spell-ui/jsx`. */
const JSX_FILE = "src/jsx.ts"

/**
 * The DOM elements' properties no vocabulary names, which JSX may set too, by their plain name:  `appContext={...}`.
 * - The element core gives them to a kind of tag, so they're its script API, not attributes.
 *   - A vocabulary attribute would observe one (`app-context`),
 *     and give the component a getter over its base class's own member (`UIComponent.appContext`).
 */
const JSX_SCRIPT_PROPERTIES: readonly {
  /** its property name */
  property: string
  /** its TypeScript type */
  type: string
  /** its hover docs */
  description: string
  /** whether `tag` has it */
  isFor: (tag: SiteTag) => boolean
}[] = [
  {
    property: "appContext",
    type: "unknown",
    description:
      "Your app's own value for every component inside (a theme, a store ...):  each reads it as `appContext`.  " +
      "Set it before or after the components load.",
    isFor: (tag) => tag.tag === "ui-root"
  },
  {
    property: "content",
    type: "string",
    description:
      "The text shown, as a PROPERTY:  set, it shows instead of the source's, until `source` changes or `reload()`.",
    // a source element's (`DOMLoadableElement`):  it takes both of the shared `SourceAttributes`
    isFor: (tag) => ["source", "load"].every((name) => tag.attributes.some((attribute) => attribute.name === name))
  }
]

/**
 * The Spell UI types an event's `detail` text names (`jsxDetailType()`), each as `src/jsx.ts` reaches it:
 * through `spell-ui/core`'s `E` (the element core's and runtime's types) or `UIT` (the components' types).
 */
const JSX_DETAIL_TYPES: Readonly<Record<string, string>> = {
  DimmerCloseReason: "UIT.DimmerCloseReason",
  FieldValue: "E.FieldValue",
  FormChange: "UIT.FormChange",
  ModalCloseReason: "UIT.ModalCloseReason",
  NagCloseReason: "UIT.NagCloseReason",
  SearchResult: "UIT.SearchResult",
  ShapeFlip: "UIT.ShapeFlip",
  SidebarCloseReason: "UIT.SidebarCloseReason",
  StickyEdge: "UIT.StickyEdge",
  ThemeChoices: "UIT.ThemeChoices",
  ToastCloseReason: "UIT.ToastCloseReason",
  VisibilityCalculations: "E.VisibilityCalculations"
}

/** The DOM's and TypeScript's own type names, which a `detail` text may name as they are (`jsxDetailType()`). */
const JSX_GLOBAL_TYPE =
  /^(?:Element|Event|Node|DocumentFragment|File|Blob|(?:HTML|SVG)\w*Element|\w+Event|Record|Readonly|Partial|Array)$/

/** The JSX types' header (`jsxTypes()`):  what the file is, and how a program uses it. */
const JSX_HEADER = [
  "/**",
  " * The JSX types of every Spell UI `<ui-*>` tag, in Solid 2's JSX:  its attributes and events.",
  " * - In VS Code:  completion, hover docs and checks.",
  " * - And each tag's events in plain DOM code.",
  " * - GENERATED by `yarn site:data` from the vocabularies -- do not edit.",
  " *   `tests/tools/ElementManifests.test.ts` fails while it's stale.",
  " * - A program uses it by importing it once, in any of its files (its `.types.ts`, say):",
  ' *   `import type {} from "spell-ui/jsx"`.',
  " *   - Then every `<ui-*>` tag in that program's JSX is checked.",
  " *   - Not by `tsconfig`'s `types`:  that finds packages, not a package's files.",
  " * - EXACT:  an attribute the vocabulary doesn't name is an error.",
  " *   - HTML's global attributes (`class`, `id`, `slot`, `style`, `onClick` ...) and `aria-*` stay allowed.",
  " *   - A name with a dash in it (`data-*`, a misspelt `text-alin`) isn't checked:  TypeScript lets any through.",
  " * - Values:",
  ' *   - a flag:  `basic`, `basic={true}` or `basic=""`;  `basic={false}` removes it',
  ' *   - other attributes take their text, a number as `{5}` or `"5"`',
  " * - Rich data (an object, array or function), as a plain prop:  `options={[...]}`.",
  " *   - It reaches the element whole, as its property.",
  " *   - `prop:options`, and `prop:` for every attribute, are `@deprecated`:  only compiled spell writes them.",
  " * - Events:  `on-<event>` per event a tag sends, its `event.detail` typed:  `on-ui-change={(event) => ...}`.",
  " *   - Solid hands the function to the element, which listens for the event.",
  ' *   - In plain DOM code too:  `querySelector("ui-button")` gives a `<ui-button>` (`HTMLElementTagNameMap`),',
  ' *     whose `addEventListener("ui-toggle", ...)` types `event.detail`.',
  " *     So does a JSX `ref`'s element.",
  " *   - On any other element or the document, every `ui-*` name completes (`UIEventMap`):",
  " *     its `detail` is `unknown`.",
  " *   - A misspelt `on-ui-chnage` isn't checked (it has a dash):  the app's VS Code extension warns on it.",
  " * - Component tags only, not the docs site's `<ui-docs-*>`.",
  " * - Type-only:  no code, nothing at run time.",
  " */",
  "",
  'import type { JSX } from "@solidjs/web"',
  "",
  'import type { E, UIT } from "spell-ui/core"',
  "",
  "/**",
  " * HTML's global attributes, which every `<ui-*>` tag takes:  Solid's own, `class`, `id`, `slot`, `ref`, `onClick` ...",
  " * - `Target`:  the tag's element, as `ref` and `event.currentTarget` see it",
  " */",
  "export type UIGlobalJSXAttributes<Target extends HTMLElement = HTMLElement> = JSX.HTMLAttributes<Target>",
  "",
  "/**",
  " * A `<ui-*>` element in the DOM's types:  an `HTMLElement` whose `addEventListener()` knows its own events.",
  " * - `Events`:  its `<Class>EventMap`, each event's `detail` typed",
  ' * - `querySelector("ui-button")` gives one (`HTMLElementTagNameMap`), and so does a JSX `ref`.',
  " * - Its other members (`value`, `open()` ...) aren't here:  cast to its DOM element class for those.",
  " */",
  "export interface UIHTMLElement<Events> extends HTMLElement {",
  "  addEventListener<K extends keyof Events>(",
  "    type: K,",
  "    listener: (this: this, event: Events[K]) => unknown,",
  "    options?: boolean | AddEventListenerOptions",
  "  ): void",
  "  addEventListener<K extends keyof HTMLElementEventMap>(",
  "    type: K,",
  "    listener: (this: this, event: HTMLElementEventMap[K]) => unknown,",
  "    options?: boolean | AddEventListenerOptions",
  "  ): void",
  "  addEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | AddEventListenerOptions): void",
  "  removeEventListener<K extends keyof Events>(",
  "    type: K,",
  "    listener: (this: this, event: Events[K]) => unknown,",
  "    options?: boolean | EventListenerOptions",
  "  ): void",
  "  removeEventListener<K extends keyof HTMLElementEventMap>(",
  "    type: K,",
  "    listener: (this: this, event: HTMLElementEventMap[K]) => unknown,",
  "    options?: boolean | EventListenerOptions",
  "  ): void",
  "  removeEventListener(type: string, listener: EventListenerOrEventListenerObject, options?: boolean | EventListenerOptions): void",
  "}"
]

/** Spell UI's manifest `readme` line. */
const SPELL_UI_README =
  "Spell UI:  beautiful, themeable, accessible components that load themselves on demand.  Generated by `yarn site:data` -- do not edit."
