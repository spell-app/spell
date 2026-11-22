import { parseHTML } from "linkedom"

import { ROOT_CATALOG } from "spell/ui/components/ui-root/UIRoot.catalog"

/****************
 * ### `SpellMarkup`
 * Spell UI's HTML as the Spell UI site's Spell:  sections, prose, examples and their markup,
 * written as the site's notebook pages write them (`@spell/guides/SpellUI`, epic `notebook` P10's layout).
 *
 * ```ts
 * const spell = new SpellMarkup({ pageAddress: (file) => addresses[file] })
 * const tab = SpellMarkup.parse(html).querySelector('ui-tab[value="examples"]')!
 * spell.body(tab, 1)   // the Examples page's body, one tab in
 * ```
 *
 * - Its users:  `yarn site:kitchen`, which writes the site's Kitchen Sink page with it,
 *   and epic `editor` P42, which ported Spell UI's components pages into the site with it.
 * - Each example's markup in Spell's bare names (`<button>` is `<ui-button>`), as the site's pages are written:
 *   - the web's own tags as Spell UI's (`webTagsAsSpellUI()`):  `<p>` is `<text paragraph>`, `<b>` `<text bold>`,
 *     `<a>` `<link>`, a table's rows `<row>`s of `<cell>`s, `<div>` a `<stack>`, a `<br>` a `<space/>`,
 *     but a paragraph's `<br>` a blank line ...
 *   - what's left, a run of markup holding one of the web's own tags (a `<pre>`, a data `<script>`), or a tag no
 *     pack has (`<ui-docs-api>`), is an `<html>` block, written as the web writes it
 *   - a bare element whose text holds the web's inline tags it couldn't write stays bare,
 *     only its text an `<html>` block:  the smallest one
 *   - an example is always named:  its heading, else its section's title
 *   - its description paragraphs are its `description=`, their `<code>` backticked, their links `[words](link)`;
 *     other description markup (a `<ui-message>`, a list) stays slotted, AFTER the example's own markup
 *   - relative URLs (`images/...`) as the page server serves them, from the page's folder
 *     (`/components/ui/images/...`)
 * - Prose (`<ui-markdown>`) is a `<markdown>` block;  a code block (`<ui-code>`) a fenced one inside a `<markdown>`.
 * - A tab's top sections are `<section label="Types">`;  deeper ones keep their attributes but `id`:
 *   the site names each section by its label (`TocIndex`).
 * - Links:  to a section of the page (`#examples-types-labeled`), its label's id, from the page that holds it
 *   (`addressOf()`);  to another page (`ui-card.html`), its address in the site (`pageAddress()`).
 * - The page's comments between its sections, prose and examples are Spell's, `<!-- ... -->`, where they were;
 *   those inside an example's markup are left out.
 * - Every tag closes with `</>`, but the markup inside an example, its code, written as people write it
 *   (`</button>`), and `</example>`.
 * - A page's own script that drives its examples (`<script type="module">`) is left out:
 *   it finds the page's elements by their ids as the page loads, so in a notebook, drawn later, it finds nothing.
 * - What it couldn't write as the page has it is in `warnings`, for a person to tidy by hand.
 * - Pure:  given markup, it returns text, and writes nothing.
 * - Brought back from the editor's retired page converter (`NotebookFromPage`, retired by epic `content` P1)
 *   for epic `editor` P42, Owen's call (2026-11-21).
 * - Node only (linkedom);  its bare names come from Spell UI's own catalog (`ROOT_CATALOG`), never the parser's:
 *   Spell UI uses nothing of Spell.
 ****************/
export class SpellMarkup {
  /** What it couldn't write as the page has it:  one line each. */
  readonly warnings: string[] = []

  /** The `<ui-space>`s that were `<br>`s:  an `<html>` block writes them as `<br />` again. */
  private readonly swappedBreaks = new WeakSet<Element>()

  constructor(readonly options: SpellMarkupOptions = {}) {}

  /** `html` parsed, a whole page or a fragment:  its document (linkedom's). */
  static parse(html: string): Document {
    const page = /^\s*(<!doctype|<html)/i.test(html) ? html : `<!doctype html><html><body>${html}</body></html>`
    return parseHTML(page).document as unknown as Document
  }

  /**
   * `parent`'s children, at `indent` tabs, as a notebook page's body:  sections, prose, code, examples and markup,
   * its comments where they were.
   * - `tab`:  the tab of the page it's from (`examples`), for links to the page's own sections
   */
  body(parent: Element, indent: number, { tab }: { tab?: string } = {}): string {
    const out = new Writer()
    this.writeChildren(out, parent, indent, { tab, depth: 0, inExample: false })
    return out.text
  }

  /** One `<ui-example>`, at `indent` tabs. */
  example(example: Element, indent: number, { tab }: { tab?: string } = {}): string {
    const out = new Writer()
    this.writeExample(out, example, indent, { tab, depth: 1, inExample: false })
    return out.text
  }

  /** `nodes`, a run of markup, at `indent` tabs:  an example's code when `inExample`. */
  markup(nodes: Node[], indent: number, { inExample = true, tab }: { inExample?: boolean; tab?: string } = {}): string {
    const out = new Writer()
    this.writeMarkup(out, nodes as Element[], indent, { tab, depth: 1, inExample })
    return out.text
  }

  ////////////////
  // ## Sections, prose, examples
  ////////////////

  /** `parent`'s children, at `indent`:  sections, prose, code, examples and markup;  its comments where they were. */
  private writeChildren(out: Writer, parent: Element, indent: number, place: Place) {
    let markup: Element[] = []
    const flushMarkup = () => {
      if (markup.length) this.writeMarkup(out, markup, indent, place)
      markup = []
    }
    for (const node of [...parent.childNodes]) {
      if (node.nodeType === COMMENT) {
        flushMarkup()
        this.writeComment(out, node.textContent ?? "", indent)
        continue
      }
      if (node.nodeType === TEXT) {
        if (node.textContent!.trim()) markup.push(node as unknown as Element)
        continue
      }
      if (node.nodeType !== ELEMENT) continue
      const element = node as Element
      const special = [SECTION, EXAMPLE, MARKDOWN, CODE].includes(element.localName)
      if (special || element.localName === "ui-header") flushMarkup()
      if (element.localName === SECTION) this.writeSection(out, element, indent, place)
      else if (element.localName === EXAMPLE) this.writeExample(out, element, indent, place)
      else if (element.localName === MARKDOWN) this.writeMarkdown(out, [markdownOf(element)], indent, place)
      else if (element.localName === CODE) this.writeMarkdown(out, [fenceOf(element)], indent, place)
      else if (element.localName === "ui-message" && element.querySelector(MARKDOWN)) {
        flushMarkup()
        this.writeMessage(out, element, indent, place)
      } else markup.push(element)
    }
    flushMarkup()
  }

  /**
   * A section:  at the top, `<section label="Types">`, which the site draws as its page's section;
   * deeper, its attributes kept but its `id`:  the site names it by its label.
   */
  private writeSection(out: Writer, section: Element, indent: number, place: Place) {
    const label = section.getAttribute("label") ?? ""
    let head: string
    if (place.depth === 0) head = `<section label="${escapeAttribute(label)}">`
    else {
      const attributes = section
        .getAttributeNames()
        .filter((name) => name !== "id")
        .map((name) => attributeText(name, section.getAttribute(name)!))
      head = `<section ${attributes.join(" ")}>`
    }
    out.blankLine()
    out.line(indent, head)
    this.writeChildren(out, section, indent + 1, { ...place, depth: place.depth + 1 })
    out.line(indent, CLOSER)
  }

  /**
   * An example:  `<example "Name" description="...">`, its markup in bare names.
   * - A `<p slot="description">` of text, `<code>` and links is its `description=`;
   *   other description markup (a `<ui-message>`, a list) stays, slotted, in bare names where it can be,
   *   AFTER the example's own markup:  the code reads first.
   */
  private writeExample(out: Writer, example: Element, indent: number, place: Place) {
    const children = [...example.children]
    const plain = children.filter((child) => child.getAttribute("slot") === "description" && isPlainParagraph(child))
    const description =
      [example.getAttribute("description"), ...plain.map((child) => this.descriptionOf(child, place))]
        .filter(Boolean)
        .map((text) => this.relinked(text!, place))
        .join("  ") || undefined
    // always named:  its heading, else its section's title
    const name =
      example.getAttribute("heading") ??
      example.getAttribute("header") ??
      example.closest(SECTION)?.getAttribute("label") ??
      undefined
    const heads = [
      "example",
      ...(name ? [`"${escapeAttribute(name)}"`] : []),
      ...example
        .getAttributeNames()
        .filter((attribute) => !["description", "heading", "header"].includes(attribute))
        .map((attribute) => attributeText(attribute, example.getAttribute(attribute)!)),
      ...(description ? [`description="${escapeAttribute(description)}"`] : [])
    ]
    out.line(indent, `<${heads.join(" ")}>`)
    // a `<template>` is a page's way to run an example's script with it:  its contents are the example
    const body = [...example.childNodes]
      .flatMap((node) => templateContentsOf(node))
      .filter(
        (node) =>
          !plain.includes(node as Element) &&
          !(node.nodeType === TEXT && !node.textContent!.trim()) &&
          node.nodeType !== COMMENT
      ) as Element[]
    const isDescription = (node: Element) => node.nodeType !== TEXT && node.getAttribute("slot") === "description"
    const ordered = [...body.filter((node) => !isDescription(node)), ...body.filter(isDescription)]
    this.writeMarkup(out, ordered, indent + 1, { ...place, inExample: true })
    out.line(indent, "</example>")
  }

  /** `<ui-message>` around prose:  `<message ...>` holding `<markdown>`, its other markup as markup. */
  private writeMessage(out: Writer, message: Element, indent: number, place: Place) {
    const attributes = message.getAttributeNames().map((name) => attributeText(name, message.getAttribute(name)!))
    out.line(indent, `<message${attributes.length ? " " + attributes.join(" ") : ""}>`)
    this.writeChildren(out, message, indent + 1, place)
    out.line(indent, CLOSER)
  }

  /** Prose:  a `<markdown>` block, its text as written, its links relinked (`relinked()`). */
  private writeMarkdown(out: Writer, texts: string[], indent: number, place: Place) {
    const text = this.relinked(texts.join("\n\n"), place)
    const lines = text.split("\n")
    if (lines.length === 1 && !/[<{}]/.test(text)) {
      out.line(indent, `<markdown>${text}${CLOSER}`)
      return
    }
    out.line(indent, "<markdown>")
    for (const line of lines) out.line(line ? indent + 1 : 0, line)
    out.line(indent, CLOSER)
  }

  /** One of the page's comments, `comment` its text:  a Spell comment, never drawn. */
  private writeComment(out: Writer, comment: string, indent: number) {
    const text = dedented(comment)
    if (!text.trim()) return
    out.blankLine()
    const lines = text.split("\n")
    if (lines.length === 1) {
      out.line(indent, `<!-- ${text.trim()} -->`)
      return
    }
    out.line(indent, "<!--")
    for (const line of lines) out.line(line ? indent + 1 : 0, line)
    out.line(indent, "-->")
  }

  ////////////////
  // ## Markup
  ////////////////

  /**
   * A run of markup:  each element in bare names where it can be (`<button>`), else runs of `<html>` blocks,
   * as the web writes them.
   */
  private writeMarkup(out: Writer, _nodes: Element[], indent: number, place: Place) {
    const nodes = this.webTagsAsSpellUI(_nodes)
    let html: Node[] = []
    const flushHtml = () => {
      if (!html.length) return
      out.line(indent, "<html>")
      for (const node of html) this.writeHtml(out, node, indent + 1, place)
      out.line(indent, closerOf("html", place))
      html = []
    }
    for (const node of nodes) {
      if (this.isPageScript(node)) continue
      if (node.nodeType === TEXT) {
        flushHtml()
        out.line(indent, escapeText(collapsed(node.textContent!)))
      } else if (this.isBare(node)) {
        flushHtml()
        this.writeBare(out, node, indent, place)
      } else if (this.hasBareText(node)) {
        flushHtml()
        out.line(
          indent,
          `${this.openTag(node)}<html>${this.htmlInnerOf(node)}${closerOf("html", place)}` +
            closerOf(this.bareNameOf(node.localName)!, place)
        )
      } else html.push(node)
    }
    flushHtml()
  }

  /** Can `element` and everything inside it be written in bare names? */
  private isBare(element: Element): boolean {
    if (!this.bareNameOf(element.localName)) return false
    for (const name of element.getAttributeNames()) if (/[{}]/.test(element.getAttribute(name)!)) return false
    for (const node of element.childNodes) {
      if (node.nodeType === COMMENT) return false
      // a paragraph's `<br>`:  a blank line in its text (`writeParagraph()`)
      if (isLineBreak(node) && isParagraph(element)) continue
      if (node.nodeType === ELEMENT && !this.isBare(node as Element)) return false
    }
    return true
  }

  /**
   * Is `element` bare itself, holding text with the web's own inline tags (`<code>`, `<a>`, `<b>`),
   * and nothing else that can't be bare:  `<message size="small"><html>Set <code>--ui-primary</code></html></message>`.
   */
  private hasBareText(element: Element): boolean {
    if (!this.bareNameOf(element.localName)) return false
    for (const name of element.getAttributeNames()) if (/[{}]/.test(element.getAttribute(name)!)) return false
    const children = [...element.childNodes]
    if (children.some((node) => node.nodeType === COMMENT)) return false
    const hasText = children.some((node) => node.nodeType === TEXT && node.textContent!.trim())
    const inline = (node: ChildNode) => node.nodeType !== ELEMENT || INLINE_TAGS.has((node as Element).localName)
    return hasText && children.every(inline)
  }

  /** `element`'s children as the web writes them, on one line:  an `<html>` block's inside. */
  private htmlInnerOf(element: Element): string {
    return [...element.childNodes]
      .map((node) => {
        if (node.nodeType === TEXT) return escapeText(node.textContent!.replace(/\s*\n\s*/g, " "))
        return node.nodeType === ELEMENT ? this.htmlOf(node as Element, true) : ""
      })
      .join("")
      .trim()
  }

  /** `element` in bare names:  its children a line each, or on its own line when it mixes text and elements. */
  private writeBare(out: Writer, element: Element, indent: number, place: Place) {
    if (isParagraph(element) && [...element.childNodes].some(isLineBreak)) {
      this.writeParagraph(out, element, indent, place)
      return
    }
    const children = [...element.childNodes].filter((node) => node.nodeType !== COMMENT)
    const isBlock = children.every((node) => node.nodeType !== TEXT || !node.textContent!.trim())
    const kids = children.filter((node) => node.nodeType === ELEMENT) as Element[]
    if (!children.some((node) => node.nodeType === ELEMENT || node.textContent!.trim()))
      out.line(indent, `${this.openTag(element)}/>`.replace(/>\/>$/, "/>"))
    else if (!isBlock) out.line(indent, this.inlineOf(element, place))
    else {
      out.line(indent, this.openTag(element))
      this.writeMarkup(out, kids, indent + 1, place)
      out.line(indent, closerOf(this.bareNameOf(element.localName)!, place))
    }
  }

  /**
   * A paragraph holding line breaks (`<p>One<br>Two</p>`), in bare names:
   * its lines one tab in, a blank line where each `<br>` was, which `<text paragraph>` draws as a line break.
   */
  private writeParagraph(out: Writer, paragraph: Element, indent: number, place: Place) {
    out.line(indent, this.openTag(paragraph))
    let line: ChildNode[] = []
    const lines: ChildNode[][] = [line]
    for (const node of paragraph.childNodes) {
      if (isLineBreak(node)) lines.push((line = []))
      else line.push(node)
    }
    lines.forEach((nodes, index) => {
      if (index) out.line(0, "")
      out.line(indent + 1, this.inlineChildrenOf(nodes, place))
    })
    out.line(indent, closerOf(this.bareNameOf(paragraph.localName)!, place))
  }

  /** `element` on one line, in bare names. */
  private inlineOf(element: Element, place: Place): string {
    const inner = this.inlineChildrenOf([...element.childNodes], place)
    if (!inner) return `${this.openTag(element)}`.replace(/>$/, "/>")
    return `${this.openTag(element)}${inner}${closerOf(this.bareNameOf(element.localName)!, place)}`
  }

  /** `nodes` on one line, in bare names:  text as written, elements inline. */
  private inlineChildrenOf(nodes: ChildNode[], place: Place): string {
    return nodes
      .map((node) => {
        if (node.nodeType === TEXT) return escapeText(node.textContent!.replace(/\s*\n\s*/g, " "))
        if (node.nodeType === ELEMENT) return this.inlineOf(node as Element, place)
        return ""
      })
      .join("")
      .trim()
  }

  /** `element`'s opening tag in bare names, its URLs as the page server serves them. */
  private openTag(element: Element): string {
    const attributes = element
      .getAttributeNames()
      .map((name) => attributeText(name, this.urlFor(name, element.getAttribute(name)!)))
    return `<${[this.bareNameOf(element.localName), ...attributes].join(" ")}>`
  }

  /**
   * The bare name of Spell UI's `tag`, `ui-button` => `button`, when the pack finds it so;  else `undefined`.
   * - Never one of Spell's own block words (`<markdown>`, `<example>`, `<html>`):  `<ui-markdown>` stays so.
   * - Never a docs element's (`<ui-docs-api>`):  the site's page loads them for its `<html>` blocks,
   *   so a bare `<docs-api>` would draw nothing.
   */
  private bareNameOf(tag: string): string | undefined {
    const bare = tag.replace(/^ui-/, "")
    if (bare === tag || bare.startsWith("docs-") || SPELL_BLOCK_WORDS.has(bare)) return undefined
    return (this.options.tagFor ?? defaultTagFor)(bare) === tag ? bare : undefined
  }

  /**
   * `node` as the web writes it, at `indent`:  an element holding only elements a line each, nested;
   * one holding text on a single line, as JSX joins text across a line break with no space.
   */
  private writeHtml(out: Writer, node: Node, indent: number, place: Place) {
    if (node.nodeType === TEXT) {
      const text = collapsed(node.textContent!)
      if (text) out.line(indent, escapeText(text))
      return
    }
    const element = node as Element
    if (RAW_TEXT_TAGS.has(element.localName)) {
      this.writeRawText(out, element, indent, place)
      return
    }
    const children = [...element.childNodes].filter((child) => child.nodeType !== COMMENT)
    const hasText = children.some((child) => child.nodeType === TEXT && child.textContent!.trim())
    if (VOID_TAGS.has(element.localName) || hasText || !children.some((child) => child.nodeType === ELEMENT)) {
      out.line(indent, this.htmlOf(element, place.inExample))
      return
    }
    out.line(indent, `${this.htmlOpenTag(element)}>`)
    for (const child of children)
      if (child.nodeType === ELEMENT && !this.isPageScript(child)) this.writeHtml(out, child, indent + 1, place)
    out.line(indent, closerOf(element.localName, place))
  }

  /** A `<script>` or `<style>`, its text as written:  Spell reads it so, as the web does. */
  private writeRawText(out: Writer, element: Element, indent: number, place: Place) {
    const open = `${this.htmlOpenTag(element)}>`
    const text = dedented(element.textContent ?? "")
    const closer = closerOf(element.localName, place)
    if (!text.includes("\n")) {
      out.line(indent, `${open}${text}${closer}`)
      return
    }
    out.line(indent, open)
    for (const line of text.split("\n")) out.line(line ? indent + 1 : 0, line)
    out.line(indent, closer)
  }

  /**
   * Is `node` a page's own script, which drives its examples (`<script type="module">`), not data a component reads?
   * - Left out, and noted in `warnings` (the class's docstring says why).
   */
  private isPageScript(node: Node): boolean {
    const element = node as Element
    if (node.nodeType !== ELEMENT || element.localName !== "script") return false
    if (DATA_SCRIPT.test(element.getAttribute("type") ?? "")) return false
    const what = element.getAttribute("src") ?? collapsed(element.textContent ?? "").slice(0, 60)
    this.warn(`a script that drives an example is left out (${what} ...)`)
    return true
  }

  /** `element`'s markup on one line:  void tags closed (`<img ... />`), comments left out, URLs served. */
  private htmlOf(element: Element, inExample: boolean): string {
    // a `<br>` swapped for a space (`spaceFor()`) stays the web's own in an `<html>` block
    if (this.swappedBreaks.has(element)) return "<br />"
    const open = this.htmlOpenTag(element)
    if (VOID_TAGS.has(element.localName)) return `${open} />`
    const inner = [...element.childNodes]
      .map((node) => {
        if (node.nodeType === TEXT) return escapeText(node.textContent!.replace(/\s*\n\s*/g, " "))
        if (node.nodeType === ELEMENT && !this.isPageScript(node)) return this.htmlOf(node as Element, inExample)
        return ""
      })
      .join("")
      .trim()
    return `${open}>${inner}${inExample ? `</${element.localName}>` : CLOSER}`
  }

  /** `element`'s opening tag as the web writes it, without its `>`. */
  private htmlOpenTag(element: Element): string {
    const attributes = element
      .getAttributeNames()
      .map((name) => attributeText(name, this.urlFor(name, element.getAttribute(name)!)))
    return `<${[element.localName, ...attributes].join(" ")}`
  }

  ////////////////
  // ## The web's tags, as Spell UI's
  ////////////////

  /**
   * `nodes`, the web's own tags in them (and inside them) swapped for Spell UI's where it has one:
   * `<p>` => `<ui-text paragraph>`, `<b>` => `<ui-text bold>`, `<a href>` => `<ui-link link>`, a table's rows =>
   * `<ui-row>`s of `<ui-cell>`s, `<br>` => `<ui-space>` ... (`WEB_TAGS`, `tableRowsOf()`, `spaceFor()`).
   * - SIDE EFFECT:  rewrites the parsed document in place;  returns `nodes` as they now are.
   * - A tag is left as it is when it has an attribute its Spell UI tag has no word for (`rowspan`),
   *   so it's written in an `<html>` block.
   */
  private webTagsAsSpellUI(nodes: Element[]): Element[] {
    return nodes.flatMap((node) => {
      if (node.nodeType !== ELEMENT) return [node]
      const swapped = this.swapped(node)
      for (const each of swapped) this.swapInside(each)
      return swapped
    })
  }

  /** The web's tags inside `parent`, as Spell UI's (`webTagsAsSpellUI()`). */
  private swapInside(parent: Element) {
    if (KEPT_AS_WRITTEN.has(parent.localName)) return
    for (const child of [...parent.childNodes]) {
      if (child.nodeType !== ELEMENT) continue
      for (const each of this.swapped(child as Element)) this.swapInside(each)
    }
  }

  /**
   * `element` as Spell UI's tag, swapped in its place;  `[element]` when it has none, or is one already.
   * - A table's rows replace the `<table>` they're in;  a `<form>` inside a `<ui-form>` its children;
   *   a field's `<label>` goes into its `label`.
   */
  private swapped(element: Element): Element[] {
    const { localName: tag } = element
    if (tag === "table") return this.tableRowsOf(element) ?? [element]
    if (
      tag === "form" &&
      element.parentElement?.localName === "ui-form" &&
      !hasOwnAttributes(element, FORM_ATTRIBUTES)
    ) {
      const children = [...element.childNodes]
      element.replaceWith(...children)
      return children.filter((child) => !isBlank(child)) as Element[]
    }
    if (tag === "label") return this.fieldLabelOf(element) ? [] : [element]
    if (tag === "kbd") return [this.keysOf(element) ?? element]
    if (tag === "br") return [this.spaceFor(element)]
    const swap = WEB_TAGS[tag]
    if (!swap || hasOwnAttributes(element, Object.keys(swap.renamed ?? {}))) return [element]
    const document = element.ownerDocument
    const replacement = document.createElement(swap.tag)
    for (const word of swap.bare ?? []) replacement.setAttribute(word, "")
    for (const name of element.getAttributeNames())
      replacement.setAttribute(swap.renamed?.[name] ?? name, element.getAttribute(name)!)
    replacement.append(...element.childNodes)
    element.replaceWith(replacement)
    return [replacement]
  }

  /**
   * The rows of `table`, a native `<table>` inside a `<ui-table>`, as `<ui-row>`s of `<ui-cell>`s, swapped in its
   * place;  its `<caption>`, the table's `caption`.
   * - `undefined`, the table left as it is, for what rows and cells can't say:  a `rowspan`, a row's or cell's class
   *   words but alignment, the table's own attributes, a rich caption.
   */
  private tableRowsOf(table: Element): Element[] | undefined {
    const owner = table.parentElement
    if (owner?.localName !== "ui-table" || table.getAttributeNames().length) return undefined
    const document = table.ownerDocument
    const rows: Element[] = []
    const contents = new Map<Element, ChildNode[]>()
    let caption: string | undefined
    for (const group of [...table.children]) {
      if (group.localName === "caption") {
        if (group.children.length || group.getAttributeNames().length) return undefined
        caption = collapsed(group.textContent ?? "")
        continue
      }
      const isGroup = TABLE_GROUPS.has(group.localName)
      if (isGroup && group.getAttributeNames().length) return undefined
      for (const tr of isGroup ? [...group.children] : [group]) {
        if (tr.localName !== "tr" || tr.getAttributeNames().length) return undefined
        const row = document.createElement("ui-row")
        if (group.localName === "thead") row.setAttribute("header", "")
        if (group.localName === "tfoot") row.setAttribute("footer", "")
        for (const td of [...tr.children]) {
          const cell = SpellMarkup.cellOf(td, group.localName === "thead")
          if (!cell) return undefined
          contents.set(cell, [...td.childNodes])
          row.append(cell)
        }
        rows.push(row)
      }
    }
    // every row made:  only now is the page's table taken apart
    if (caption) owner.setAttribute("caption", caption)
    for (const [cell, nodes] of contents) cell.append(...nodes)
    table.replaceWith(...rows)
    return rows
  }

  /** `<td>` or `<th>` as an empty `<ui-cell>`, or `undefined` if one can't say it. */
  private static cellOf(td: Element, inHeaderRow: boolean): Element | undefined {
    if (td.localName !== "td" && td.localName !== "th") return undefined
    const cell = td.ownerDocument.createElement("ui-cell")
    if (td.localName === "th" && !inHeaderRow) cell.setAttribute("header", "")
    for (const name of td.getAttributeNames()) {
      const value = td.getAttribute(name)!
      if (name === "colspan") cell.setAttribute("span", value)
      else if (name === "class") {
        const align = value.match(CELL_ALIGNMENT)
        if (!align) return undefined
        cell.setAttribute(VERTICAL_ALIGNMENTS.has(align[1]!) ? "vertical-align" : "align", align[1]!)
      } else if (GLOBAL_ATTRIBUTE.test(name)) cell.setAttribute(name, value)
      else return undefined
    }
    return cell
  }

  /**
   * A `<ui-field>`'s first `<label for>` of plain text, as the field's `label`:  the field pairs it with its control.
   * - SIDE EFFECT:  removes the label, and sets the field's `label`;  `true` if it did.
   */
  private fieldLabelOf(label: Element): boolean {
    const field = label.parentElement
    const isFirst = field && field.children[0] === label
    if (field?.localName !== "ui-field" || !isFirst || label.children.length || field.hasAttribute("label"))
      return false
    if (label.getAttributeNames().some((name) => name !== "for")) return false
    field.setAttribute("label", collapsed(label.textContent ?? ""))
    label.remove()
    return true
  }

  /** `<kbd>Ctrl</kbd>` as `<ui-keys shortcut="ctrl">`, swapped in its place;  `undefined` for anything richer. */
  private keysOf(kbd: Element): Element | undefined {
    const text = collapsed(kbd.textContent ?? "")
    if (kbd.children.length || kbd.getAttributeNames().length || !/^[\w+ ]+$/.test(text)) return undefined
    const keys = kbd.ownerDocument.createElement("ui-keys")
    keys.setAttribute("shortcut", text.toLowerCase().replace(/\s*\+\s*/g, "+"))
    kbd.replaceWith(keys)
    return keys
  }

  /**
   * A `<br>` as `<ui-space>`, a line break, swapped in its place:  a drawing has no `<br>`.
   * - Not a paragraph's `<br>`:  a blank line in its text (`writeParagraph()`).
   * - SIDE EFFECT:  swaps it in the parsed document;  an `<html>` block still writes it `<br />` (`htmlOf()`).
   */
  private spaceFor(br: Element): Element {
    if (br.parentElement && isParagraph(br.parentElement)) return br
    const space = br.ownerDocument.createElement("ui-space")
    br.replaceWith(space)
    this.swappedBreaks.add(space)
    return space
  }

  ////////////////
  // ## Descriptions and links
  ////////////////

  /** A description paragraph as `description=`'s text:  `<code>` backticked, a link `[words](link)`, collapsed. */
  private descriptionOf(paragraph: Element, place: Place): string {
    const text = [...paragraph.childNodes]
      .map((node) => {
        if (node.nodeType !== ELEMENT) return node.textContent
        const element = node as Element
        if (element.localName === "code") return `\`${element.textContent}\``
        return `[${collapsed(element.textContent ?? "")}](${element.getAttribute("href") ?? ""})`
      })
      .join("")
    return this.relinked(collapsed(text), place)
  }

  /** `value` of attribute `name`, a relative URL made the page server's (`images/x.png` => `/components/ui/images/x.png`). */
  private urlFor(name: string, value: string): string {
    // a JSON value (`<ui-search source="[{...}]">`) names no file
    if (!URL_ATTRIBUTES.has(name) || /^([a-z]+:|\/|#|\[|\{)/i.test(value) || !value) return value
    // `source` names a file only with a folder or an extension:  `<ui-embed source="youtube">` names a site
    if (name === "source" && !/[./]/.test(value)) return value
    const page = this.pageAddress(value)
    if (name !== "source" && name !== "src" && page) return page
    return new URL(value, `http://page${this.options.page ?? DEFAULT_PAGE}`).pathname
  }

  /** A link to another page (`ui-card.html#examples-x`) as its address in the site, when `pageAddress` knows it. */
  private pageAddress(target: string): string | undefined {
    const match = target.match(/^([\w-]+)\.html(#.*)?$/)
    if (!match) return undefined
    const address = this.options.pageAddress?.(match[1]!)
    if (!address) {
      this.warn(`a link to ${target}:  no address in the site for it`)
      return undefined
    }
    if (match[2]) this.warn(`a link to ${target}:  its section left out, ${address}`)
    return address
  }

  /** `text`'s links:  to the page's sections, as the site names them;  to other pages, their addresses. */
  private relinked(text: string, place: Place): string {
    // code, fenced or inline, is left as written:  `this.#title[1](title)` is a call, not a link
    return text
      .split(CODE_IN_MARKDOWN)
      .map((piece, index) => (index % 2 ? piece : this.relinkedProse(piece, place)))
      .join("")
  }

  /** `relinked()`, on prose with no code in it. */
  private relinkedProse(text: string, place: Place): string {
    return text.replace(/\]\(([^)\s]+)\)/g, (whole, target: string) => {
      if (target.startsWith("#")) return `](${this.sectionLink(target.slice(1), place) ?? target})`
      const page = this.pageAddress(target)
      return page ? `](${page})` : `](${this.urlFor("href", target)})`
    })
  }

  /**
   * A link to section `id` of the page:  `#<its label's id>`, after its page's address when that's another tab's
   * (`options.addressOf`);  `undefined`, left as written, when the page has no such section.
   */
  private sectionLink(id: string, place: Place): string | undefined {
    const document = this.options.document
    const section = document?.getElementById(id)
    if (!section || section.localName !== SECTION) return undefined
    const own = `#${slugOf(section.getAttribute("label") ?? id)}`
    const tab = section.closest("ui-tab")?.getAttribute("value") ?? undefined
    if (!tab || tab === place.tab) return own
    const address = this.options.addressOf?.(tab)
    return address ? `${address}${own}` : own
  }

  private warn(text: string) {
    if (!this.warnings.includes(text)) this.warnings.push(text)
  }
}

/** `SpellMarkup`'s settings. */
export type SpellMarkupOptions = {
  /** the page's served address, `/components/ui/ui-button.html`:  its relative URLs are from its folder */
  page?: string
  /** the tag a bare name draws, `button` => `ui-button`:  Spell UI's catalog's, by default (tests pass their own) */
  tagFor?: (bare: string) => string | undefined
  /** another page's address in the site, by its file name without `.html`:  `ui-card` => `/card` */
  pageAddress?: (file: string) => string | undefined
  /** the parsed page, for links to its own sections */
  document?: Document
  /** the address in the site of one of the page's tabs:  `examples` => `/card/examples` */
  addressOf?: (tab: string) => string | undefined
}

////////////////
// ## Helpers
////////////////

/** Where the writing is:  which tab, how many sections deep, and whether inside an example (its code). */
type Place = { tab?: string; depth: number; inExample: boolean }

/** The closer for `tag`:  `</>` outside an example, `</tag>` in full inside one, its code as people write it. */
function closerOf(tag: string, place: Place): string {
  return place.inExample ? `</${tag}>` : CLOSER
}

/** Lines of tab-indented text. */
class Writer {
  private readonly lines: string[] = []

  line(indent: number, text: string) {
    this.lines.push(text ? "\t".repeat(indent) + text : "")
  }

  /** A blank line, unless the last one is, or it's just after an opening tag or a comment (which goes with what's next). */
  blankLine() {
    const last = this.lines.at(-1)?.trim()
    if (last === undefined || !last || last.endsWith(HTML_COMMENT_END)) return
    if (/<[^/][^>]*[^/]>$/.test(last) && !last.includes("</")) return
    this.lines.push("")
  }

  get text(): string {
    return this.lines.length ? this.lines.join("\n") + "\n" : ""
  }
}

/** Spell UI's tag for a bare name:  `ui-<bare>`, when its catalog has it. */
function defaultTagFor(bare: string): string | undefined {
  const tag = `ui-${bare}`
  return tag in ROOT_CATALOG ? tag : undefined
}

/** `name="value"` in Spell's markup:  a boolean bare, its value escaped (`escapeAttribute()`). */
function attributeText(name: string, value: string): string {
  if (value === "" && !STRING_ATTRIBUTES.test(name)) return name
  return `${name}="${escapeAttribute(value)}"`
}

/** A quoted value's `"` and `\` escaped, and its `[` a real bracket (`\[`), not a fill-in. */
function escapeAttribute(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\[/g, "\\[")
}

/** Markup text as written:  `<`, `>`, `&`, `{` and `}` as entities, `[` a real bracket (`\[`), not a fill-in. */
function escapeText(text: string): string {
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\{/g, "&#123;")
    .replace(/\}/g, "&#125;")
    .replace(/\[/g, "\\[")
}

/** `text`'s line breaks, and the indents around them, as one space, trimmed:  its own double spaces kept. */
function collapsed(text: string): string {
  return text.replace(/\s*\n\s*/g, " ").trim()
}

/** `node`'s own contents when it's a `<template>` (`<ui-example>`'s, around markup and its script), else `node`. */
function templateContentsOf(node: ChildNode): ChildNode[] {
  if (node.nodeType !== ELEMENT || (node as Element).localName !== "template") return [node]
  const content = (node as HTMLTemplateElement).content
  return [...(content?.childNodes.length ? content.childNodes : node.childNodes)]
}

/** Is `element` a `<p>` of text, `<code>` and links alone, no attribute but its `slot`? */
function isPlainParagraph(element: Element): boolean {
  return (
    element.localName === "p" &&
    element.getAttributeNames().every((name) => name === "slot") &&
    [...element.children].every(
      (child) =>
        child.children.length === 0 &&
        (child.localName === "code" ||
          (child.localName === "a" && child.getAttributeNames().every((name) => name === "href")))
    )
  )
}

/** Is `element` a paragraph, `<p>` or `<ui-text paragraph>`:  its `<br>` a blank line in its text? */
function isParagraph(element: Element): boolean {
  return element.localName === "p" || (element.localName === "ui-text" && element.hasAttribute("paragraph"))
}

/** Is `node` a `<br>`? */
function isLineBreak(node: ChildNode): boolean {
  return node.nodeType === ELEMENT && (node as Element).localName === "br"
}

/** Is `node` text of white space alone? */
function isBlank(node: ChildNode): boolean {
  return node.nodeType === TEXT && !node.textContent!.trim()
}

/** Does `element` have an attribute but the web's global ones (`class`, `style`, `aria-*` ...) and `allowed`? */
function hasOwnAttributes(element: Element, allowed: readonly string[]): boolean {
  return element.getAttributeNames().some((name) => !GLOBAL_ATTRIBUTE.test(name) && !allowed.includes(name))
}

/** `<ui-markdown>`'s text:  its `<script type="text/markdown">`'s, or its own, dedented. */
function markdownOf(element: Element): string {
  const script = element.querySelector("script")
  return dedented((script ?? element).textContent ?? "")
}

/** `<ui-code language="js">`'s text as a fenced block. */
function fenceOf(element: Element): string {
  const script = element.querySelector("script")
  const language = element.getAttribute("language") ?? ""
  return `\`\`\`${language}\n${dedented((script ?? element).textContent ?? "")}\n\`\`\``
}

/** `text` without its blank first and last lines, and the indent its lines share. */
function dedented(text: string): string {
  const lines = text
    .replace(/^\s*\n/, "")
    .replace(/\s+$/, "")
    .split("\n")
  const shared = Math.min(...lines.filter((line) => line.trim()).map((line) => line.match(/^ */)![0].length))
  return lines.map((line) => line.slice(Number.isFinite(shared) ? shared : 0)).join("\n")
}

/** A label as an id:  `Group Variations` => `group-variations`, as the site's pages name their sections. */
function slugOf(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-|-$/g, "")
}

/** Code in Markdown, fenced or inline:  its links are left as written (`relinked()`). */
const CODE_IN_MARKDOWN = /(```[\s\S]*?```|`[^`\n]*`)/

/** How a page closes its tags, outside an example:  `</example>` is written in full. */
const CLOSER = "</>"

/** How a comment ends, in HTML and in Spell. */
const HTML_COMMENT_END = "-->"

/** A components page's address, for its relative URLs when none is given. */
const DEFAULT_PAGE = "/components/ui/index.html"

/** Node types. */
const ELEMENT = 1
const TEXT = 3
const COMMENT = 8

/** The page's tags this reads. */
const SECTION = "ui-section"
const EXAMPLE = "ui-example"
const MARKDOWN = "ui-markdown"
const CODE = "ui-code"

/** Attributes a page writes `=""` on for an empty text, never as a boolean. */
const STRING_ATTRIBUTES = /^(alt|value|label|aria-.*|title|placeholder)$/

/** Attributes holding a URL:  `source` is Spell UI's, a markdown or code file's, when it has a `.` or `/`. */
const URL_ATTRIBUTES = new Set(["src", "href", "link", "source"])

/** Spell's own words for blocks in a drawing:  a Spell UI tag of the same bare name is written in full. */
const SPELL_BLOCK_WORDS = new Set(["markdown", "html", "example", "css", "spell", "spellx"])

/**
 * The web's tags Spell UI has its own for:  its tag, the bare words it adds, and the attributes it calls by another
 * name;  any other attribute but the web's global ones keeps the web's tag (`webTagsAsSpellUI()`).
 */
const WEB_TAGS: Record<string, { tag: string; bare?: string[]; renamed?: Record<string, string> }> = {
  p: { tag: "ui-text", bare: ["paragraph"] },
  span: { tag: "ui-text" },
  b: { tag: "ui-text", bare: ["bold"] },
  strong: { tag: "ui-text", bare: ["bold"] },
  em: { tag: "ui-text", bare: ["italic"] },
  i: { tag: "ui-text", bare: ["italic"] },
  ins: { tag: "ui-text", bare: ["underline"] },
  u: { tag: "ui-text", bare: ["underline"] },
  s: { tag: "ui-text", bare: ["strikethrough"] },
  del: { tag: "ui-text", bare: ["strikethrough"] },
  mark: { tag: "ui-text", bare: ["highlight"] },
  sub: { tag: "ui-text", bare: ["subscript"] },
  sup: { tag: "ui-text", bare: ["superscript"] },
  code: { tag: "ui-text", bare: ["code"] },
  a: { tag: "ui-link", renamed: { href: "link", target: "target" } },
  img: { tag: "ui-image", renamed: { src: "src", alt: "alt", width: "width", height: "height", loading: "loading" } },
  ul: { tag: "ui-list", bare: ["bulleted"] },
  ol: { tag: "ui-list", bare: ["ordered"] },
  li: { tag: "ui-item" },
  section: { tag: "ui-section" },
  button: { tag: "ui-button", renamed: { type: "type", name: "name", value: "value", disabled: "disabled" } },
  div: { tag: "ui-stack" },
  form: { tag: "ui-form" }
}

/** The web's global attributes, which any tag takes:  a swapped tag keeps them as they are. */
const GLOBAL_ATTRIBUTE = /^(class|style|id|slot|title|lang|dir|hidden|role|tabindex|aria-.*|data-.*)$/

/** A native `<form>`'s own attributes a `<ui-form>` around it does without:  a docs page's never sends. */
const FORM_ATTRIBUTES = ["method"]

/** A native table's row groups:  their rows are the table's rows. */
const TABLE_GROUPS = new Set(["thead", "tbody", "tfoot"])

/** A cell's class words a `<ui-cell>` can say:  its alignment, `right aligned`, `top aligned`. */
const CELL_ALIGNMENT = /^(left|center|right|justified|top|middle|bottom) aligned$/

/** The alignments that are vertical:  a cell's `vertical-align`. */
const VERTICAL_ALIGNMENTS = new Set(["top", "middle", "bottom"])

/** Tags whose insides are never swapped:  their text is code or data, or the web's own markup inside a template. */
const KEPT_AS_WRITTEN = new Set(["script", "style", "pre", "template", "svg", "math"])

/** The web's inline tags, which text in a bare element may hold, inside an `<html>` block (`hasBareText()`). */
const INLINE_TAGS = new Set(["code", "a", "b", "strong", "em", "i", "kbd", "br", "span", "small", "mark", "sup", "sub"])

/** The web's raw-text tags:  their text as written, never escaped (`writeRawText()`). */
const RAW_TEXT_TAGS = new Set(["script", "style"])

/** A script's `type` that holds data a component reads (`<ui-code>`'s text, a tree's JSON), not code that runs. */
const DATA_SCRIPT = /^(text\/(?!javascript)|application\/(?!javascript))/

/** The web's void tags, closed as `<img ... />` in an `<html>` block. */
const VOID_TAGS = new Set([
  "img",
  "br",
  "hr",
  "input",
  "source",
  "meta",
  "link",
  "wbr",
  "area",
  "col",
  "embed",
  "track"
])
