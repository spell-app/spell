import type { SP } from "spell/parser/spell"
import { SX } from "spell/parser/spellx"
// By file:  the folder's barrel loads the language service
import { SourceEdits, dedented, indentAt, indented, replaceSpan, type TextSpan } from "spell/app/lsp/SourceEdits"

/**
 * A `.spell` NOTEBOOK as the cells of its page, and the edits its page makes to its text (epic `elemental-spell` P16):
 * an example's code, the lock.
 * - A notebook is any page with the `notebook` flag:  the editor shows it in place, editable.
 * - Moving, adding and deleting cells is the editor's drag and drop (`PartEdits`, epic `notebook` P5):
 *   a run of prose is found for it by `proseAt()`.
 * - The cells come from the file's chunk tree (`SX.SpellxView`):  what's inside its notebook, in order.
 *   The notebook:  `<spell-page "x" notebook>`, or its short spelling, `<spell-notebook "x">`.
 *   - `prose`:  a run of markdown;  a new cell at each `##` heading, which starts a section of the page
 *   - `heading`:  the page's title or a section's start, written as a tag rather than markdown (either works):
 *     - the title:  a top-level `<header level="1">`, its sub header (a `<header>` inside it) the line under it
 *     - a section:  a top-level `<section label="...">`, this cell its opening tag;
 *       what's inside it, cells of their own, in its section of the page
 *   - `template`:  one of its own templates, `<spell-view "counter">`
 *   - `drawing`:  an element drawn in place, `<example "one counter">`, `<section>`;  the examples in it, in order
 *     - an example's description is its own `description="..."`, as `<ui-example>` takes it (epic `notebook` P6):
 *       the text before it is just text
 *   - `html`:  an `<html>` block, drawn as written
 *   - `member`:  anything else it declares (`<property>` ...), shown as code
 * - No ids are written into the file:  a cell is found by its place among the others.
 * - Every edit returns the file's NEW TEXT, changing only what it's about:  the rest stays byte for byte.
 * - A cell's code is shown without its indent (`indent`), which an edit puts back on every line.
 * - Plain TypeScript, no Solid:  `<NotebookPage>` draws these, and the tests check them in node.
 */
export class NotebookPageCells {
  /**
   * The notebook in `text`, a `.spell` file at `path` (its language from its name):  its tag and its cells.
   * - `undefined` when the file holds no notebook.
   * - NEVER throws.
   */
  static of(text: string, path?: string): NotebookPageModel | undefined {
    const file = SX.SpellxView.read(text, { path })
    const notebook = file.templates.find((template) => NotebookPageCells.isNotebook(template))
    if (!notebook) return undefined
    const cells = notebook.children.flatMap((node) => NotebookPageCells.cellsFor(text, node, "top"))
    const locked = notebook.attributes.some((attribute) => attribute.name === "locked")
    // the file's language's word for `locked`, `bloqueado`
    const words = file.language.words.spellx?.attributes ?? {}
    const lockWord = Object.entries(words).find(([, english]) => english === "locked")?.[0]
    return { name: notebook.name ?? "", locked, lockWord, notebook, cells, language: file.language.lang }
  }

  /**
   * Is `template` a notebook:  a page with the `notebook` flag, however it's spelled (epic `notebook` P1)?
   * - The editor's own test:  the language only asks whether a page draws its body (`SX.SpellxTemplate.drawsBody`).
   */
  static isNotebook(template: SX.SpellxTemplate): boolean {
    return template.type === "page" && template.attributes.some((attribute) => attribute.name === NOTEBOOK_FLAG)
  }

  /**
   * Does `file`, a `.spell` file, hold a notebook?  Read from its chunk tree, kept until its text changes.
   * - Its text, not its parse:  a project compiled from the cache parses nothing (`SP.CompileCache`).
   * - NEVER throws.
   */
  static holdsNotebook(file: SP.SpellFile): boolean {
    return NotebookPageCells.pagesIn(file).notebook !== undefined
  }

  /** The name of the notebook `file` holds, `"counter notebook"`;  `""` for none.  As `holdsNotebook()` reads it. */
  static notebookNameIn(file: SP.SpellFile): string {
    return NotebookPageCells.pagesIn(file).notebook ?? ""
  }

  /**
   * Does `file`, a `.spell` file, hold a LOCKED page, `<spell-page "x" locked>`, a notebook or not?
   * - What the editor asks before keeping or saving a file (`editor.isLocked()`, epic `notebook` P3).
   * - Read and kept as `holdsNotebook()` is.
   */
  static holdsLockedPage(file: SP.SpellFile): boolean {
    return NotebookPageCells.pagesIn(file).isLocked
  }

  /**
   * The run of prose drawn as ONE part, written at `offset` in `text`:
   * its whole span, for the editor's drag and drop (`PartEdits`, epic `notebook` P5).
   * - In a page that draws its body (`SX.SpellxTemplate.drawsBody`), a notebook or not.
   * - What the page draws of its prose, each marked where its first line is written (`SP.SpellxTwin`):
   *   - a `<markdown>` block:  a run of prose, to its last line with text
   *   - a `##` heading's section:  the heading, its prose, and what follows it
   *     up to the next section or a line of code, as the twin gathers it
   *   - a `##` section's own `<markdown>`, from its first line after the heading
   * - `undefined` when no run of prose starts at `offset`:  a tag's is `SourceEdits.elementAt()`'s.
   * - NEVER throws.
   */
  static proseAt(text: string, offset: number, path?: string): TextSpan | undefined {
    const pages = SX.SpellxView.read(text, { path }).templates.filter((template) => template.drawsBody)
    const page = pages.find((each) => each.span.start < offset && offset < each.span.end)
    if (!page) return undefined
    const cells = page.children.flatMap((node) => NotebookPageCells.cellsFor(text, node, "top"))
    const index = cells.findIndex((cell) => cell.span.start <= offset && offset < cell.span.end)
    const cell = cells[index]
    if (cell?.kind !== "prose") return undefined
    if (!cell.heading) return offset === cell.span.start ? cell.span : undefined
    // the section's own markdown, under its heading
    if (offset > cell.span.start) return { start: offset, end: cell.span.end }
    let end = cell.span.end
    for (const next of cells.slice(index + 1)) {
      if (next.heading || !SECTION_HOLDS.has(next.kind)) break
      end = next.span.end
    }
    return { start: cell.span.start, end }
  }

  /**
   * Does `file`, a tag-shaped file, hold a page that draws its body (`SX.SpellxTemplate.drawsBody`), a notebook or not?
   * - What the palette asks before offering a page's own row, a new view (epic `notebook` P5).
   * - Read and kept as `holdsNotebook()` is.
   */
  static holdsDrawnPage(file: SP.AnySpellFile): boolean {
    return "form" in file && file.form === "spellx" && NotebookPageCells.pagesIn(file).drawsBody
  }

  /**
   * Where the first page in `text` that draws its body opens, its `<`.
   * - What's added with nothing selected goes last in it (`PartEdits`).
   * - `undefined` when it has none.
   * - NEVER throws.
   */
  static drawnPageIn(text: string, path?: string): number | undefined {
    return SX.SpellxView.read(text, { path }).templates.find((template) => template.drawsBody)?.span.start
  }

  /** What `file`'s pages say, read from its chunk tree once for each text it has.  NEVER throws. */
  private static pagesIn(file: SP.AnySpellFile): PagesRead {
    const contents = file.contents ?? ""
    const known = PAGES_READ.get(file)
    if (known?.contents === contents) return known
    const pages = SX.SpellxView.read(contents, { path: file.path }).templates.filter((each) => each.type === "page")
    const notebook = pages.find(NotebookPageCells.isNotebook)
    const read = {
      contents,
      notebook: notebook && (notebook.name ?? ""),
      isLocked: pages.some((page) => page.attributes.some((attribute) => attribute.name === LOCKED)),
      drawsBody: pages.some((page) => page.drawsBody)
    }
    PAGES_READ.set(file, read)
    return read
  }

  ////////////////
  // ## Edits
  ////////////////

  /** `text` with `cell`'s code changed to `code`, as its editor shows it:  its indent put back. */
  static withCode(text: string, cell: CodeSpan, code: string): string {
    return replaceSpan(text, cell.span, indented(code, cell.indent))
  }

  /**
   * The edits that lock the notebook in `text` (`locked`) or unlock it:
   * its tag's `locked`, in the file's language (`bloqueado`),
   * added or taken off as the Inspector sets any attribute (`SourceEdits.settingAttribute()`).
   */
  static lockEdits(text: string, model: NotebookPageModel, locked: boolean) {
    return SourceEdits.settingAttribute(text, model.notebook.headSpan.start, model.lockWord ?? LOCKED, locked)
  }

  ////////////////
  // ## Making cells
  ////////////////

  /**
   * The cells of `node`, one of the notebook's children (`"top"`) or of a section written as a tag (`"section"`).
   * - A top-level `<header level="1">` is the page's title.
   * - A top-level `<section label>` is a section, its children cells after it.
   */
  private static cellsFor(text: string, node: SX.SpellxNode, place: "top" | "section"): PageCell[] {
    if (node.kind === "prose") return NotebookPageCells.proseCells(text, node.span)
    if (node.kind === "template")
      return [cellOf(text, "template", node.span, { name: node.name ?? "", groups: groupsOf(node) })]
    if (node.kind === "element") {
      const title = place === "top" ? titleOf(node) : undefined
      if (title) return [cellOf(text, "heading", node.span, title)]
      const label = place === "top" ? sectionLabelOf(node) : undefined
      if (label === undefined) return [NotebookPageCells.drawingCell(text, node)]
      const opener = cellOf(text, "heading", node.headSpan, { heading: label, block: node.span })
      return [opener, ...node.children.flatMap((child) => NotebookPageCells.cellsFor(text, child, "section"))]
    }
    // loose text in a section:  markdown, as the notebook's own
    if (node.kind === "text") {
      const lead = node.text.length - node.text.trimStart().length
      const trimmed = node.text.trim()
      if (!trimmed) return []
      const start = node.span.start + lead
      return [NotebookPageCells.proseCell(text, { start, end: start + trimmed.length })]
    }
    if (node.kind === "declaration" && (node.type as string) === "html") return [cellOf(text, "html", node.span)]
    if (node.kind !== "code" || node.lines.length) return [cellOf(text, "member", node.span)]
    return []
  }

  /** The prose cells of the run of markdown at `span`:  a new one at each `##` heading. */
  private static proseCells(text: string, span: SX.SpellxSpan): PageCell[] {
    const cells: PageCell[] = []
    let start = span.start
    let at = span.start
    while (at < span.end) {
      const lineEnd = Math.min(span.end, text.indexOf("\n", at) < 0 ? span.end : text.indexOf("\n", at))
      const line = text.slice(at, lineEnd).trimStart()
      if (at > start && HEADING.test(line)) {
        cells.push(NotebookPageCells.proseCell(text, { start, end: trimmedEnd(text, start, at) }))
        start = at + (text.slice(at, lineEnd).length - line.length)
      }
      at = lineEnd + 1
    }
    cells.push(NotebookPageCells.proseCell(text, { start, end: span.end }))
    return cells
  }

  /** The prose cell at `span`:  its markdown, and its heading if it starts a section. */
  private static proseCell(text: string, span: SX.SpellxSpan): PageCell {
    const cell = cellOf(text, "prose", span)
    const heading = HEADING.exec(cell.code.split("\n")[0] ?? "")
    if (heading) cell.heading = heading[1]!.trim()
    const title = TITLE.exec(cell.code.split("\n")[0] ?? "")
    if (title) {
      cell.title = title[1]!.trim()
      cell.lead = cell.code.split("\n").slice(1).join("\n").trim() || undefined
    }
    return cell
  }

  /** The drawing cell for element `node`:  the examples in it, however deep, in order. */
  private static drawingCell(text: string, node: SX.SpellxElement): PageCell {
    const cell = cellOf(text, "drawing", node.span, { name: nameOf(node) })
    const examples: ExampleSpan[] = []
    const visit = (element: SX.SpellxNode) => {
      if (element.kind !== "element") return
      if (EXAMPLE_TAGS.has(element.name)) examples.push(NotebookPageCells.exampleOf(text, element))
      else element.children.forEach(visit)
    }
    visit(node)
    cell.examples = examples
    return cell
  }

  /**
   * Example `node`'s name and body:  what's between its tags, its code without its indent.
   * - A body that's one `<html>` block (J144) is what's INSIDE it, marked `html`:
   *   the block's own tags are how the file marks web markup, not part of what the example draws (P18).
   */
  private static exampleOf(text: string, node: SX.SpellxElement): ExampleSpan {
    const shown = node.children.filter((child) => child.kind !== "text" || child.text.trim())
    const [first] = shown
    const last = shown.at(-1)
    const span =
      first && last
        ? { start: first.span.start, end: last.span.end }
        : { start: node.headSpan.end, end: node.headSpan.end }
    const block = shown.length === 1 && first?.kind === "element" && first.name === HTML_TAG ? first : undefined
    const inner = block && NotebookPageCells.insideOf(text, block)
    const bodySpan = inner ?? span
    const indent = first ? indentAt(text, bodySpan.start) : ""
    return {
      name: nameOf(node),
      span: node.span,
      body: { span: bodySpan, indent, code: dedented(text.slice(bodySpan.start, bodySpan.end), indent) },
      ...(inner && { html: true })
    }
  }

  /** What's inside element `node`, from its first line's text to its last's:  `undefined` when it's empty. */
  private static insideOf(text: string, node: SX.SpellxElement): SX.SpellxSpan | undefined {
    if (node.selfClosing) return undefined
    const closer = text.lastIndexOf("</", node.span.end)
    if (closer < node.headSpan.end) return undefined
    const inside = text.slice(node.headSpan.end, closer)
    const start = node.headSpan.end + (inside.length - inside.trimStart().length)
    const end = node.headSpan.end + inside.trimEnd().length
    return end > start ? { start, end } : undefined
  }
}

////////////////
// ## Types
////////////////

/** A notebook, read:  its tag and its cells. */
export type NotebookPageModel = {
  /** its name, `counter notebook` */
  name: string
  /** is it locked, `<spell-notebook "..." locked>`? */
  locked: boolean
  /** the language's word for `locked`, when it's another's */
  lockWord?: string
  /** its tag, from the chunk tree */
  notebook: SX.SpellxTemplate
  /** its cells, in order */
  cells: PageCell[]
  /** the file's language, `en` */
  language: string
}

/** A span of code a cell's editor edits:  its text without `indent`, and where it is. */
export type CodeSpan = {
  /** its text, `indent` taken off every line after the first */
  code: string
  /** the indent its first line sits at, put back on an edit */
  indent: string
  /** where it is in the file */
  span: SX.SpellxSpan
}

/** One cell of a notebook's page. */
export type PageCell = CodeSpan & {
  /** what it is:  see `NotebookPageCells` */
  kind: "prose" | "heading" | "template" | "drawing" | "html" | "member"
  /** a template's or an example's name */
  name?: string
  /** a `##` heading, or a `<section label>`'s label:  it starts a section */
  heading?: string
  /** a `#` title, or a `<header level="1">`'s text:  the page's */
  title?: string
  /** the line under the title:  the text after a `#` title, or its `<header>`'s sub header */
  lead?: string
  /** a section written as a tag:  the whole of it, what's inside too (this cell's span is its opening tag) */
  block?: SX.SpellxSpan
  /** a drawing cell's examples, in order */
  examples?: ExampleSpan[]
  /** a template's groups, each with its members' names:  none when it has none */
  groups?: CellGroup[]
}

/** A group of a template's members, as its cell lists it:  its name, its description and its members' names. */
export type CellGroup = { name: string; description: string | undefined; members: string[] }

/** An example in a drawing cell:  its name, and its body's code. */
export type ExampleSpan = {
  /** its name, `one counter` */
  name: string
  /** where the whole `<example>` is */
  span: SX.SpellxSpan
  /** what's inside it;  a lone `<html>` block's:  what's inside that */
  body: CodeSpan
  /** is its body a lone `<html>` block's markup?  Shown as written, in every view */
  html?: boolean
}

////////////////
// ## Helpers
////////////////

/** A cell of `kind` at `span` in `text`, its code without its indent. */
function cellOf(text: string, kind: PageCell["kind"], span: SX.SpellxSpan, more: Partial<PageCell> = {}): PageCell {
  const indent = indentAt(text, span.start)
  return { kind, span, indent, code: dedented(text.slice(span.start, span.end), indent), ...more }
}

/**
 * Template `node`'s groups (`SX.SpellxFile.groupsOf()`):
 * each named one, its description, its members' names or phrases.
 * - `undefined` when it has none.
 */
function groupsOf(node: SX.SpellxTemplate): CellGroup[] | undefined {
  const groups = SX.SpellxFile.groupsOf(node).filter((group) => group.name !== undefined)
  if (!groups.length) return undefined
  return groups.map(({ name, group, members }) => ({
    name: name!,
    description: group?.attributes.find((attribute) => attribute.name === "description")?.value,
    members: members.map((member) => {
      if (member.kind === "handler") return `${member.word} ${member.phrase}`
      if (member.kind === "declaration") return member.name ?? member.word
      return member.kind === "note" ? member.word : member.kind
    })
  }))
}

/** Where the text from `start` to `at` ends, less its trailing blank lines. */
function trimmedEnd(text: string, start: number, at: number): number {
  return start + text.slice(start, at).trimEnd().length
}

/** An element's name, `name="..."` or its quoted name. */
function nameOf(node: SX.SpellxElement): string {
  return node.attributes.find((attribute) => attribute.name === "name")?.value ?? ""
}

/**
 * Element `node` as the page's title:  a `<header level="1">`, its text and its sub header's.
 * - `undefined` when it isn't one, or has no text.
 */
function titleOf(node: SX.SpellxElement): Pick<PageCell, "title" | "lead"> | undefined {
  if (!HEADER_TAGS.has(node.name) || attributeOf(node, LEVEL_WORDS) !== "1") return undefined
  const title = textOf(node.children)
  if (!title) return undefined
  const sub = node.children.find((child) => child.kind === "element" && HEADER_TAGS.has(child.name))
  const lead = sub?.kind === "element" ? textOf(sub.children) : undefined
  return { title, lead: lead || undefined }
}

/** Element `node`'s label, when it's a `<section label="...">`;  else `undefined`. */
function sectionLabelOf(node: SX.SpellxElement): string | undefined {
  if (!SECTION_TAGS.has(node.name)) return undefined
  return attributeOf(node, LABEL_WORDS)?.trim() || undefined
}

/** The text of `nodes`' own text nodes, its line breaks and their indents one space:  not the elements among them. */
function textOf(nodes: SX.SpellxNode[]): string {
  return nodes
    .map((node) => (node.kind === "text" ? node.text : " "))
    .join("")
    .replace(/\s*\n\s*/g, " ")
    .trim()
}

/** The value of element `node`'s attribute named one of `names` (its words in each language). */
function attributeOf(node: SX.SpellxElement, names: ReadonlySet<string>): string | undefined {
  return node.attributes.find((attribute) => names.has(attribute.name))?.value
}

/** What a `##` heading's section holds, as the twin gathers it:  markup, examples and prose, up to the next section. */
const SECTION_HOLDS: ReadonlySet<PageCell["kind"]> = new Set(["prose", "drawing", "html"])

/** A section's heading:  `## Try it`. */
const HEADING = /^##\s+(.*)$/

/** The page's title:  `# A counter`. */
const TITLE = /^#\s+(.*)$/

/** An example's tag, in each language:  `example_block`'s words. */
const EXAMPLE_TAGS = new Set(["example", "ejemplo"])

/** An `<html>` block's tag:  web markup, drawn as written (J144);  the same word in every language. */
const HTML_TAG = "html"

/** `<ui-header>`'s bare name, in each language:  the page's title, at `level="1"`. */
const HEADER_TAGS: ReadonlySet<string> = new Set(["header", "encabezado"])

/** `<ui-section>`'s bare name, in each language:  with a `label`, a section of the page. */
const SECTION_TAGS: ReadonlySet<string> = new Set(["section", "seccion"])

/** `level`, in each language. */
const LEVEL_WORDS: ReadonlySet<string> = new Set(["level", "nivel"])

/** `label`, in each language. */
const LABEL_WORDS: ReadonlySet<string> = new Set(["label", "etiqueta"])

/** The flag that makes a page a notebook, by its English name:  `<spell-page "x" notebook>`. */
const NOTEBOOK_FLAG = "notebook"

/** What each `.spell` file's pages say, for the text it had:  `pagesIn()`. */
const PAGES_READ = new WeakMap<SP.AnySpellFile, PagesRead>()

/**
 * What a file's pages say:
 * - its notebook's name (`undefined` for none)
 * - whether any page is locked
 * - whether any draws its body
 */
type PagesRead = { contents: string; notebook: string | undefined; isLocked: boolean; drawsBody: boolean }

/** The word that locks a notebook, `locked`;  a Spanish file's own, `bloqueado` (`lockWord`). */
const LOCKED = "locked"
