import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"

import type { SiteAttribute, SiteDataFile, SiteTag } from "spell-ui/docs-components/docs-components.types"
import { SRV } from "spell-kit/server"
import type { CustomElementsManifest, HtmlCustomData } from "./tools.types.ts"

import { FamilyFiles } from "./FamilyFiles.ts"

/****************
 * ### `ElementManifests`
 * The editors' element descriptions, from the site data (`docs/__data/components.json5`, every vocabulary):
 * the two STANDARD ones, and the JSX types.
 * - `custom-elements.json`:  a Custom Elements Manifest (schema 2.1),
 *   what web-component tools read (Storybook, linters, IDE plugins, Claude)
 *   - `package.json`'s `customElements` points at it
 * - `html-custom-data.json`:  VS Code's HTML custom data (`html.customData`),
 *   autocomplete and hover docs for every `<ui-*>` tag, attribute and value in any `.html` file
 *   - the repo's `.vscode/settings.json` loads it
 * - `src/jsx.ts` (`spell-ui/jsx`, `jsxTypes()`):  every tag's attributes as TypeScript types for Solid's JSX,
 *   so VS Code completes, explains and checks `<ui-*>` tags in a `.tsx` file of any program that imports it
 * - Written by `yarn site:data`, and committed:  editors read them with no build.
 *   - The two manifests beside `components.json5`;  the JSX types in `src/`, as code imports them.
 *   - `tests/tools/ElementManifests.test.ts` fails while they're stale.
 * - All list COMPONENT tags only, not the doc-only `<ui-docs-*>`.
 * - Why not the `custom-elements-manifest analyze` script (`yarn manifest`):
 *   it reads classes, and our attributes, events and slots live in the vocabulary objects, which it can't see.
 * - Another package's elements written the same way (the brand's `<brand-*>`):
 *   its own `yarn site:data` makes one of these with its own folders, beside ITS site data
 *   (`packages/brand/scripts/site-data.ts`).
 * - Pure data in, text out:  reads only the family barrels' file names (`className()`).
 ****************/
export class ElementManifests {
  /** site data, as `yarn site:data` builds it */
  readonly data: SiteDataFile
  /** the package folder (`packages/ui`, `packages/brand`), absolute:  where element class files are looked up */
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
   * Both files as `yarn site:data` writes them, `[path, text]`, into `dataFolder` (`docs/__data/`).
   * - `JSON.stringify(..., 2)`:  oxfmt skips a set's `docs/__data/`, so the bytes stay ours and the staleness test can compare.
   */
  outputs(dataFolder: string): [file: string, text: string][] {
    return [
      [join(dataFolder, "custom-elements.json"), JSON.stringify(this.customElements(), null, 2) + "\n"],
      [join(dataFolder, "html-custom-data.json"), JSON.stringify(this.htmlCustomData(), null, 2) + "\n"]
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
            [attribute.name, ...(attribute.aliases ?? [])].map((name) => ({
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
          )
      }))
    }
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
   * `tag`'s class name, by `FamilyFiles.stem()`'s rule (`ui-breadcrumb-section` => `UIBreadcrumbSection`,
   * `brand-blob` => `BrandBlob`), checked against its family folder;  else the class the family barrel names ending in
   * `<Name>` (`ui-event` => `UIFeedEvent`).
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
   * - Then Solid's `JSX.IntrinsicElements` entry per tag, with its hover docs.
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
    lines.push("    }", "  }", "}", "")
    return lines.join("\n")
  }

  /** `tag`'s two interfaces (`jsxTypes()`), as lines;  `name`:  its class name. */
  private jsxTagTypes(tag: SiteTag, name: string): string[] {
    const members = ElementManifests.jsxAttributeMembers(tag)
    return [
      `/** \`<${tag.tag}>\`'s own attributes, from its vocabulary. */`,
      ...(members.length
        ? [`export interface ${name}Attributes {`, ...members, "}"]
        : [`export type ${name}Attributes = {}`]),
      "",
      `/** \`<${tag.tag}>\` in JSX:  its own attributes, and HTML's global ones. */`,
      `export interface ${name}JSXAttributes`,
      `  extends Omit<UIGlobalJSXAttributes, keyof ${name}Attributes>, ${name}Attributes {}`
    ]
  }

  /**
   * One member per JSX name `tag`'s vocabulary gives, each with its docstring.
   * - An attribute:  its name and each alias, typed by `jsxType()`;
   *   and `prop:<property>`, the same type, to set the DOM element's property (a controlled `value`).
   * - A rich (`json`) property:  its property name, and `prop:<property>`
   *   - Solid 2 sets the plain name as an ATTRIBUTE today, so our JSX writes `prop:`;
   *     the plain name is for once objects, arrays and functions go to the property (epic `solid-17`).
   * - The properties no vocabulary names (`JSX_SCRIPT_PROPERTIES`), as `prop:<property>` only.
   * - The first of two same names wins.
   */
  private static jsxAttributeMembers(tag: SiteTag): string[] {
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
      // its property too:  `prop:value={value()}` sets the DOM element's property (a controlled value)
      const property = `prop:${attribute.property ?? ElementManifests.camel(attribute.name)}`
      if (!members.has(property)) {
        members.set(property, [
          `  /** \`${attribute.name}\`, as the DOM element's property. */`,
          `  "${property}"?: ${ElementManifests.jsxType(attribute)}`
        ])
      }
    }
    for (const { property, type, description, isFor } of JSX_SCRIPT_PROPERTIES) {
      const name = `prop:${property}`
      if (!isFor(tag) || members.has(name)) continue
      members.set(name, [...ElementManifests.docstring([description], "  "), `  "${name}"?: ${type}`])
    }
    return [...members.values()].flat()
  }

  /**
   * SIDE EFFECT:  adds a rich (`json`) property's two members to `members` (`jsxAttributeMembers()`):
   * its plain name, and `prop:<property>`.
   */
  private static addRichProperty(members: Map<string, string[]>, property: string, description: string) {
    const docs = [description, "- a JS property (rich data):  an object, array or function"]
    members.set(property, [...ElementManifests.docstring(docs, "  "), `  ${property}?: unknown`])
    members.set(`prop:${property}`, [
      ...ElementManifests.docstring(
        [
          ...docs,
          `- goes once Solid 2 sets rich data on a dashed tag's property itself (epic \`solid-17\`):  then write \`${property}\``
        ],
        "  "
      ),
      `  "prop:${property}"?: unknown`
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
 * The DOM elements' properties no vocabulary names, which JSX may set too:  `prop:<property>`.
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

/** The JSX types' header (`jsxTypes()`):  what the file is, and how a program uses it. */
const JSX_HEADER = [
  "/**",
  " * Every Spell UI `<ui-*>` tag's attributes in JSX (Solid 2's), for completion, hover docs and checks in VS Code.",
  " * - GENERATED by `yarn site:data` from the vocabularies -- do not edit.",
  " *   `tests/tools/ElementManifests.test.ts` fails while it's stale.",
  " * - A program uses it by importing it once, in any of its files (its `.types.ts`, say):",
  ' *   `import type {} from "spell-ui/jsx"`.',
  " *   - Then every `<ui-*>` tag in that program's JSX is checked.",
  " *   - Not by `tsconfig`'s `types`:  that finds packages, not a package's files.",
  " * - EXACT:  an attribute the vocabulary doesn't name is an error;",
  " *   HTML's global attributes (`class`, `id`, `slot`, `style`, `onClick` ...) and `aria-*` stay allowed.",
  " *   - A name with a dash in it (`data-*`, a misspelt `text-alin`) isn't checked:  TypeScript lets any through.",
  ' * - Values:  a flag is `basic`, `basic={true}` or `basic=""`, and `basic={false}` removes it;',
  ' *   other attributes take their text, a number as `{5}` or `"5"`.',
  " * - Rich data (an object, array or function) goes to a property:  `prop:options={...}`.",
  " *   - Any attribute may be set as its property too, typed the same:  `prop:value={value()}`.",
  " * - Component tags only, not the docs site's `<ui-docs-*>`.",
  " * - Type-only:  no code, nothing at run time.",
  " */",
  "",
  'import type { JSX } from "@solidjs/web"',
  "",
  "/** HTML's global attributes, which every `<ui-*>` tag takes:  Solid's own, `class`, `id`, `slot`, `ref`, `onClick` ... */",
  "export type UIGlobalJSXAttributes = JSX.HTMLAttributes<HTMLElement>"
]

/** Spell UI's manifest `readme` line. */
const SPELL_UI_README =
  "Spell UI:  beautiful, themeable, accessible components that load themselves on demand.  Generated by `yarn site:data` -- do not edit."
