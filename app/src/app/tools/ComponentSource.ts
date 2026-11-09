import { readTypeScript, walk, type SourceNode, type TypeScriptSource } from "spell/util/node/typescript"

import type { AppUIProp, SourceComponent, SourceUse, TypeSourceFinder } from "./tools.types.ts"

/****************
 * ### `ComponentSource`
 * One of the app's `.tsx` files, read for the App UI docs set (`AppUIDataBuilder`, `yarn site:data`):
 * its documented components, and every component it draws.
 * - A documented component is an EXPORTED function or class with a banner comment above it (WWOD §6):
 *   `### `<Name>``, then what it is.
 *   Its page shows the banner's first paragraph, and its props.
 * - Its props:  the members of its first parameter's type, as written, each with its docstring.
 *   - A props type named in this file, or imported from another file of the app, is followed:
 *     intersections, `Pick<>` and `Omit<>` of it too.
 *   - A type from outside the app (`JSX.HTMLAttributes<HTMLDivElement>`) is one row, `...` and its name.
 * - What it draws:  every JSX tag starting with a capital, and the top-level declaration it's in.
 * - Reads the syntax only, with the kit's TypeScript reader (`readTypeScript()`, oxc's parser):
 *   no type checker, so a file reads in a millisecond and needs nothing else to compile.
 *   - TypeScript 6's parser until epic `coherence` P26.
 * - Node only:  a build tool, never in a bundle.
 ****************/
export class ComponentSource {
  /** The file, from spell-app's root, e.g. `src/app/solid/Inspector.tsx`. */
  readonly file: string

  /** Its syntax tree, comments and imports. */
  private readonly source: TypeScriptSource

  /** Finds the file another type comes from (`AppUIDataBuilder`'s);  none:  types stay in this file. */
  private readonly findTypeSource: TypeSourceFinder | undefined

  /** Reads another file's types, when a props type is imported. */
  private readonly sourceFor: ((file: string) => ComponentSource) | undefined

  constructor({ file, text, findTypeSource, sourceFor }: ComponentSourceProps) {
    this.file = file
    this.source = readTypeScript(file, text, { lang: "tsx" })
    this.findTypeSource = findTypeSource
    this.sourceFor = sourceFor
  }

  /** Every exported component with a banner, in file order. */
  get components(): SourceComponent[] {
    const components: SourceComponent[] = []
    for (const statement of this.statements) {
      if (!EXPORTS.has(statement.type)) continue
      const declaration = statement.declaration as SourceNode | null
      if (declaration?.type !== FUNCTION && declaration?.type !== CLASS) continue
      const name = (declaration.id as SourceNode | null)?.name as string | undefined
      const banner = name && this.bannerOf(statement)
      if (!name || banner === undefined) continue
      components.push({
        name,
        description: banner,
        props: declaration.type === FUNCTION ? this.propsOf(declaration) : []
      })
    }
    return components
  }

  /**
   * Every JSX tag starting with a capital it draws, with the top-level declaration it's drawn in;  file order.
   * - A dotted tag counts as its last name:  `<LazyMonaco.FileEditor>` draws `FileEditor`, once loaded.
   * - Drawn outside any declaration (an entry's `render(...)`):  by the file's name, `index`.
   */
  get uses(): SourceUse[] {
    const uses: SourceUse[] = []
    const fileName = this.file.slice(this.file.lastIndexOf("/") + 1).replace(/\.\w+$/, "")
    for (const statement of this.statements) {
      const by = ComponentSource.declaredName(statement) ?? fileName
      const tags: SourceNode[] = []
      walk(statement, (node) => {
        if (node.type === "JSXOpeningElement") tags.push(node)
      })
      for (const node of tags.sort((a, b) => a.start - b.start)) {
        const tag = this.textOf(node.name as SourceNode)
          .split(".")
          .at(-1)!
        if (COMPONENT_TAG.test(tag)) uses.push({ tag, by })
      }
    }
    return uses
  }

  /** The file's top-level statements. */
  private get statements(): SourceNode[] {
    return this.source.program.body as SourceNode[]
  }

  ////////////////
  // ## Banners
  ////////////////

  /**
   * The first paragraph of `node`'s banner, on one line;  `undefined` when it has none.
   * - A banner is the block comment right above it whose second line is `### `<Name>`` (or `### `Name``).
   * - The paragraph ends at the first bullet or blank line.
   */
  private bannerOf(node: SourceNode): string | undefined {
    const comment = this.source.docCommentOf(node)
    if (!comment) return undefined
    const lines = ComponentSource.commentLines(this.textOf(comment))
    const heading = lines.findIndex((line) => BANNER_HEADING.test(line))
    if (heading < 0) return undefined
    const paragraph: string[] = []
    for (const line of lines.slice(heading + 1)) {
      if (!line || line.startsWith("- ")) break
      paragraph.push(line)
    }
    return paragraph.join(" ")
  }

  ////////////////
  // ## Props
  ////////////////

  /** `component`'s props:  its first parameter's type, as rows. */
  private propsOf(component: SourceNode): AppUIProp[] {
    const [first] = component.params as SourceNode[]
    const type = ComponentSource.annotated(first?.typeAnnotation)
    return type ? this.propsOfType(type, new Set()) : []
  }

  /**
   * The rows of a props type:  a type literal's members;  a named type followed (here, or in its own file);
   * an intersection's parts in turn;  `Pick<>` / `Omit<>` of a followed type, filtered.
   * - Anything else is one row:  `...` and the type as written.
   * - `seen` stops a type naming itself.
   */
  private propsOfType(type: SourceNode, seen: Set<string>): AppUIProp[] {
    if (type.type === "TSTypeLiteral") return this.membersOf(type.members as SourceNode[])
    if (type.type === "TSIntersectionType") {
      return (type.types as SourceNode[]).flatMap((part) => this.propsOfType(part, seen))
    }
    if (type.type === "TSParenthesizedType") return this.propsOfType(type.typeAnnotation as SourceNode, seen)
    const typeName = type.typeName as SourceNode | undefined
    if (type.type === "TSTypeReference" && typeName?.type === "Identifier") {
      const name = typeName.name as string
      const [first, keys] = ((type.typeArguments as SourceNode | null)?.params ?? []) as SourceNode[]
      if ((name === PICK || name === OMIT) && first && keys) {
        const picked = new Set(ComponentSource.literalsOf(keys))
        const inner = this.propsOfType(first, seen)
        if (!inner.some((prop) => prop.name.startsWith(SPREAD))) {
          return inner.filter((prop) => picked.has(prop.name) === (name === PICK))
        }
      } else if (!seen.has(name)) {
        const followed = this.followType(name, new Set([...seen, name]))
        if (followed) return followed
      }
    }
    const text = ComponentSource.flat(this.textOf(type))
    return [{ name: `${SPREAD}${text}`, type: text, description: TAKES_EVERY_PROP }]
  }

  /** The rows of the type alias or interface `name`:  declared here, else in the app file it's imported from. */
  private followType(name: string, seen: Set<string>): AppUIProp[] | undefined {
    for (const statement of this.statements) {
      const declaration = EXPORTS.has(statement.type) ? (statement.declaration as SourceNode | null) : statement
      if ((declaration?.id as SourceNode | undefined)?.name !== name) continue
      if (declaration!.type === "TSTypeAliasDeclaration") {
        return this.propsOfType(declaration!.typeAnnotation as SourceNode, seen)
      }
      if (declaration!.type === "TSInterfaceDeclaration" && !(declaration!.extends as unknown[] | null)?.length) {
        return this.membersOf((declaration!.body as SourceNode).body as SourceNode[])
      }
    }
    const specifier = this.importedFrom(name)
    const file = specifier && this.findTypeSource?.(this.file, specifier)
    return file && this.sourceFor ? this.sourceFor(file).followType(name, seen) : undefined
  }

  /** The module `name` is imported from, as written (`./modals.types`, `spell/app/app/solid/monaco`);  else `undefined`. */
  private importedFrom(name: string): string | undefined {
    return this.source.imports.find(
      ({ kind, names }) =>
        kind === "import" && names.some((it) => it.local === name && !it.namespace && it.name !== DEFAULT)
    )?.from
  }

  /** A type literal's or interface's members as rows, index signatures left out. */
  private membersOf(members: SourceNode[]): AppUIProp[] {
    const props: AppUIProp[] = []
    for (const member of members) {
      if (member.type !== "TSPropertySignature" && member.type !== "TSMethodSignature") continue
      const type = ComponentSource.annotated(
        member.type === "TSMethodSignature" ? member.returnType : member.typeAnnotation
      )
      const typeText =
        member.type === "TSMethodSignature"
          ? `(${(member.params as SourceNode[]).map((param) => this.textOf(param)).join(", ")}) => ` +
            (type ? this.textOf(type) : "void")
          : type
            ? this.textOf(type)
            : "unknown"
      props.push({
        name: this.textOf(member.key as SourceNode),
        type: ComponentSource.flat(typeText),
        ...(!member.optional && { required: true }),
        description: this.docOf(member)
      })
    }
    return props
  }

  /**
   * `node`'s docstring (the `/** ... *\/` right above it), on one line;  `""` for none.
   * - A `//` line between them is passed over:  `/** Hide after 3s. *\/`, then `// TODO: ...`, then the member.
   */
  private docOf(node: SourceNode): string {
    const comment =
      this.source.docCommentOf(node) ??
      this.source.commentsAbove(node.start).findLast((it) => it.type === "Block" && it.value.startsWith("*"))
    return comment ? ComponentSource.commentLines(this.textOf(comment)).filter(Boolean).join(" ") : ""
  }

  /** `node`'s text, as written. */
  private textOf(node: { start: number; end: number }): string {
    return this.source.text.slice(node.start, node.end)
  }

  ////////////////
  // ## Helpers
  ////////////////

  /** The type a `: Type` annotation holds (a parameter's, a member's, a method's return);  none:  `undefined`. */
  private static annotated(annotation: unknown): SourceNode | undefined {
    return (annotation as SourceNode | null | undefined)?.typeAnnotation as SourceNode | undefined
  }

  /** A block comment's text lines:  fences, leading `*`s and their space taken off;  rows of `*` dropped. */
  private static commentLines(comment: string): string[] {
    return comment
      .replace(/^\/\*+/, "")
      .replace(/\*+\/$/, "")
      .split("\n")
      .map((line) => line.replace(/^\s*\*?\s?/, "").trimEnd())
      .filter((line) => !/^\*+$/.test(line))
      .map((line) => line.trim())
  }

  /** `text` on one line:  every run of whitespace one space. */
  private static flat(text: string): string {
    return text.replace(/\s+/g, " ").trim()
  }

  /** The string literals of a union of them (`"onMount" | "onUnmount"`), or of one. */
  private static literalsOf(type: SourceNode): string[] {
    const parts = type.type === "TSUnionType" ? (type.types as SourceNode[]) : [type]
    return parts.flatMap((part) => {
      const literal = part.literal as SourceNode | undefined
      return part.type === "TSLiteralType" && typeof literal?.value === "string" ? [literal.value] : []
    })
  }

  /** The name a top-level statement declares (a function, class or the first variable);  else `undefined`. */
  private static declaredName(statement: SourceNode): string | undefined {
    const declaration = EXPORTS.has(statement.type) ? (statement.declaration as SourceNode | null) : statement
    if (declaration?.type === FUNCTION || declaration?.type === CLASS) {
      return (declaration.id as SourceNode | null)?.name as string | undefined
    }
    if (declaration?.type === "VariableDeclaration") {
      const id = (declaration.declarations as SourceNode[])[0]?.id as SourceNode | undefined
      return id?.type === "Identifier" ? (id.name as string) : undefined
    }
    return undefined
  }
}

/** What `ComponentSource` reads. */
export type ComponentSourceProps = {
  /** the file, from spell-app's root */
  file: string
  /** its text */
  text: string
  /** finds the file a type is imported from;  none:  only this file's types are followed */
  findTypeSource?: TypeSourceFinder
  /** reads another file (cached by the caller) */
  sourceFor?: (file: string) => ComponentSource
}

/** A banner's heading line:  `### `<Name>``, or `### `Name``. */
const BANNER_HEADING = /^### `<?[\w-]+>?`$/

/** A JSX tag that's a component, not an element:  it starts with a capital (`PropertiesCard`). */
const COMPONENT_TAG = /^[A-Z]/

/** The statements that export a declaration:  `export function`, `export default class`. */
const EXPORTS = new Set(["ExportNamedDeclaration", "ExportDefaultDeclaration"])

/** A function's node, and a class's. */
const FUNCTION = "FunctionDeclaration"
const CLASS = "ClassDeclaration"

/** The name a default import takes from its module. */
const DEFAULT = "default"

/** The type helpers whose kept or dropped keys a props table follows. */
const PICK = "Pick"
const OMIT = "Omit"

/** Before a type a props table takes whole:  `...JSX.HTMLAttributes<HTMLDivElement>`. */
const SPREAD = "..."

/** The description of such a row. */
const TAKES_EVERY_PROP = "Every prop of this type too."
