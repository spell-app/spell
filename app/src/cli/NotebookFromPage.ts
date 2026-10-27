import { parseHTML } from "linkedom"

import { SP } from "spell/parser/spell"

/****************
 * ### `NotebookFromPage`
 * A Spell UI component page (`ui/docs/ui-button.html`) as a project of notebooks, one per tab
 * (epic `elemental-spell` P19):  `spell app notebook convert`.
 * - What it writes, by file name:
 *   - `<Tab>.spellx` per tab (`Examples.spellx`, `Usage.spellx` ...):  the page's title and subtitle, the tab bar,
 *     the tab's section tabs, then each section, in order
 *   - `TabBar.spellx`:  the tab bar every notebook draws, `<button-tab-bar showing="usage"/>`, its own tab selected
 *   - `__project.json5`
 * - Each example's markup in spellx's bare names (`<button>` is `<ui-button>`), as Avatar's notebooks are written:
 *   - a run of markup that holds one of the web's own tags (`<span>`, `<div>`), or a tag no pack has
 *     (`<ui-docs-api>`), is an `<html>` block, written as the web writes it
 *   - a bare element whose text holds the web's inline tags (`<code>`, `<a>`) stays bare, only its text an `<html>`
 *     block:  the smallest one (epic `elemental-spell` P25)
 *   - the section tabs under the tab bar:  `<menu>` and `<item>`
 *   - an example's `<p slot="description">` is its `description=`, its `<code>` backticked;
 *     other description markup (a `<ui-message>`) stays slotted beside it
 *   - relative URLs (`images/...`) as the page server serves them, from the page's folder (`/components/ui/images/...`)
 * - Prose (`<ui-markdown>`) is a `<markdown>` block;  a code block (`<ui-code>`) a fenced one inside a `<markdown>`.
 * - Links to the page's own sections point into the notebook that holds them:
 *   `#examples-types-labeled` => `#types-labeled` in the Examples notebook, its full address from the others.
 *   A sub-section keeps an `id` only when something links to it.
 * - The page's comments between its sections, prose and examples (each tab's notes on how the page is written, the
 *   `GAP` notes) are spellx comments, `<!-- ... -->`, where they were:  never drawn (Owen, 2026-10-26).
 *   Those inside an example's markup (the playground's markers) are left out.
 * - Every tag closes with `</>` (Owen, 2026-10-27), except:
 *   - `</spell-notebook>` and `</example>`, written in full
 *   - the markup inside an example, its code, written as people write it (`</button>`, `</ui-segment>`)
 * - What it couldn't write as the page has it is in `warnings`, for a person to tidy by hand.
 * - Pure:  given the page's text, it returns the files' text, and writes nothing.
 *   Its bare names come from Spell UI's pack (`SP.ComponentPacks`), registered by `spell/app/spaces`.
 ****************/
export class NotebookFromPage {
  /** What it couldn't write as the page has it:  one line each. */
  readonly warnings: string[] = []

  /** The page, parsed. */
  private readonly document: Document
  /** The page's tabs, in order. */
  private readonly tabs: Tab[]
  /** Every in-page id something links to (`examples-types-labeled`). */
  private readonly linkedIds: Set<string>

  constructor(
    /** the page's HTML */
    html: string,
    readonly options: NotebookFromPageOptions
  ) {
    this.document = parseHTML(html).document as unknown as Document
    this.tabs = [...this.document.querySelectorAll("ui-tabs.site-tabs > ui-tab")].map((element) => {
      const label = element.getAttribute("label") ?? element.getAttribute("value") ?? "Page"
      return {
        element,
        value: element.getAttribute("value") ?? slugOf(label),
        label,
        file: `${fileNameOf(label)}.spellx`
      }
    })
    if (!this.tabs.length)
      throw new TypeError('NotebookFromPage:  the page has no tabs (`<ui-tabs class="site-tabs">`)')
    this.linkedIds = new Set(
      [...html.matchAll(/(?:link|href)="#([\w-]+)"|\]\(#([\w-]+)\)/g)].map((match) => match[1] ?? match[2]!)
    )
  }

  ////////////////
  // ## The page
  ////////////////

  /** The page's title:  `Button`. */
  get title(): string {
    const header = this.document.querySelector(".site-title")
    const text = header && [...header.childNodes].find((node) => node.nodeType === TEXT && node.textContent!.trim())
    return text?.textContent!.trim() ?? this.document.title.replace(/\s*\|.*$/, "")
  }

  /** Its subtitle:  `A button indicates a possible user action.` */
  get subtitle(): string | undefined {
    return this.document.querySelector(".site-title > ui-header")?.textContent?.trim() || undefined
  }

  /** The project's folder name, and its views' prefix:  `Button`, `button`. */
  private get prefix(): string {
    return slugOf(this.title)
  }

  /** The project's folder:  its title, each word capitalised, `Button`, `TableOfContents`. */
  get folder(): string {
    return fileNameOf(this.title)
  }

  /** The project's address, `@spell/notebooks/Button`. */
  private get project(): string {
    return `${this.options.into}/${this.folder}`
  }

  /** The tab bar's tag, `<button-tab-bar>`. */
  private get tabBarTag(): string {
    return `${this.prefix}-tab-bar`
  }

  ////////////////
  // ## Files
  ////////////////

  /** Every file, by its name:  a notebook per tab, the tab bar, the project file. */
  get files(): Map<string, string> {
    const files = new Map<string, string>()
    for (const tab of this.tabs) files.set(tab.file, this.notebookFor(tab))
    files.set("TabBar.spellx", this.tabBar())
    files.set("__project.json5", this.projectFile())
    return files
  }

  /** `__project.json5`:  each notebook, then the tab bar. */
  private projectFile(): string {
    const imports = [...this.tabs.map((tab) => tab.file), "TabBar.spellx"]
      .map((file) => `    {\n      "path": "/${file}",\n      "active": true\n    }`)
      .join(",\n")
    const tabs = listOf(this.tabs.map((tab) => tab.label))
    return (
      `{\n  "title": ${JSON.stringify(this.title)},\n` +
      `  "description": ${JSON.stringify(
        `Spell UI's ${this.title} page as notebooks:  its ${tabs} tabs, each a notebook of its own, linked by the ` +
          `page's tab bar (written by \`spell app notebook convert\`)`
      )},\n  "imports": [\n${imports}\n  ]\n}\n`
    )
  }

  /** `TabBar.spellx`:  the tabs, a segmented menu of links, the one `showing` names selected. */
  private tabBar(): string {
    const values = this.tabs.map((tab) => tab.value)
    const items = this.tabs.map(
      (tab) =>
        `\t\t\t\t<ui-item link="${this.addressOf(tab)}" selected={its showing is ${tab.value}}>${tab.label}${CLOSER}`
    )
    return [
      "# The tab bar",
      `The ${this.title} page's tab bar:  ${listOf(this.tabs.map((tab) => tab.label))}, each a notebook of this project.`,
      `Each notebook draws it under its title, \`<${this.tabBarTag} showing="${values[1] ?? values[0]}"/>\`, its own tab selected;  a click`,
      "opens another.  A view of several words is drawn by its element's name.",
      "Under it, each notebook draws its own sections' tabs, the docs site's second row:  `<ui-menu class=\"ui-docs-section-tabs\">`.",
      "",
      `<spell-view "tab bar">`,
      `\t<property "showing" one-of="${listOf(values, "or")}" description="Which notebook it's drawn in:  its tab is selected"/>`,
      "",
      `\t<draw description="The tab strip a component page's tabs draw:  a segmented bar the width of the page, its tabs one size, on the docs site's panel (its box exported as docs-tabs)">`,
      "\t\t<html>",
      `\t\t\t<ui-menu class="${this.folder}Tabs" appearance="segmented" align="fluid" equal aria-label="${this.title}" exportparts="menu: docs-tabs">`,
      ...items,
      `\t\t\t${CLOSER}`,
      `\t\t${CLOSER}`,
      `\t${CLOSER}`,
      CLOSER,
      ""
    ].join("\n")
  }

  /** Tab `tab`'s notebook. */
  private notebookFor(tab: Tab): string {
    const out = new Writer()
    out.line(0, `<spell-notebook "${this.prefix} ${tab.value}">`)
    out.line(1, `<header level="1">`)
    out.line(2, escapeText(this.title))
    if (this.subtitle) out.line(2, `<header>${escapeText(this.subtitle)}${CLOSER}`)
    out.line(1, CLOSER)
    out.line(1, `<${this.tabBarTag} showing="${tab.value}"/>`)

    const sections = childElements(tab.element).filter((element) => element.localName === SECTION)
    if (sections.length) {
      out.line(1, "<section>")
      out.line(2, `<menu class="ui-docs-section-tabs" appearance="segmented" aria-label="Sections">`)
      for (const section of sections) {
        const label = section.getAttribute("label") ?? ""
        out.line(3, `<item link="#${slugOf(label)}">${escapeText(label)}${CLOSER}`)
      }
      out.line(2, CLOSER)
      out.line(1, CLOSER)
    }

    this.writeChildren(out, tab.element, 1, { tab, depth: 0, inExample: false })
    out.line(0, "</spell-notebook>")
    return out.text
  }

  ////////////////
  // ## Sections, prose, examples
  ////////////////

  /** `parent`'s children, at `indent`:  sections, prose, code, examples and markup;  its comments where they were. */
  private writeChildren(out: Writer, parent: Element, indent: number, place: Place) {
    const children = [...parent.childNodes]
    let markup: Element[] = []
    const flushMarkup = () => {
      if (markup.length) this.writeMarkup(out, markup, indent, place)
      markup = []
    }
    for (const node of children) {
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
      if (element.localName === SECTION) {
        this.writeSection(out, element, indent, place)
        continue
      }
      if (element.localName === EXAMPLE) this.writeExample(out, element, indent, place)
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
   * A section:  at the tab's top, `<section label="Types">`, which the notebook draws as its page's section
   * (its id the label's slug);  deeper, the page's attributes kept, its id only when something links to it.
   */
  private writeSection(out: Writer, section: Element, indent: number, place: Place) {
    const label = section.getAttribute("label") ?? ""
    const id = section.getAttribute("id") ?? ""
    const ownId = this.ownIdOf(id, place.tab)
    let head: string
    if (place.depth === 0) {
      head = `<section label="${escapeAttribute(label)}">`
      if (ownId && ownId !== slugOf(label)) this.warn(`${id}:  the notebook names this section #${slugOf(label)}`)
      for (const name of section.getAttributeNames())
        if (!TOP_SECTION_ATTRIBUTES.has(name))
          this.warn(
            `${place.tab.label} › ${label}:  a page section's ${name}="${section.getAttribute(name)}" is left out`
          )
    } else {
      const attributes = section
        .getAttributeNames()
        .filter((name) => name !== "id")
        .map((name) => attributeText(name, section.getAttribute(name)!))
      if (ownId && this.linkedIds.has(id)) attributes.push(`id="${ownId}"`)
      head = `<section ${attributes.join(" ")}>`
    }
    out.blankLine()
    out.line(indent, head)
    this.writeChildren(out, section, indent + 1, { ...place, depth: place.depth + 1 })
    out.line(indent, CLOSER)
  }

  /**
   * An example:  `<example description="...">`, its header its quoted name, its markup in bare names.
   * - A `<p slot="description">` of text and `<code>` is its `description=`;
   *   other description markup (a `<ui-message>`) stays, slotted, in bare names where it can be.
   */
  private writeExample(out: Writer, example: Element, indent: number, place: Place) {
    const children = childElements(example)
    // its plain paragraphs (text and `<code>`) are its `description=`;  any other description markup stays, slotted
    const plain = children.filter((child) => child.getAttribute("slot") === "description" && isPlainParagraph(child))
    const description =
      [example.getAttribute("description"), ...plain.map((child) => backtickedTextOf(child))]
        .filter(Boolean)
        .join("  ") || undefined
    const header = example.getAttribute("heading") ?? example.getAttribute("header")
    const heads = [
      "example",
      ...(header ? [`"${escapeAttribute(header)}"`] : []),
      ...example
        .getAttributeNames()
        .filter((name) => !["description", "heading", "header"].includes(name))
        .map((name) => attributeText(name, example.getAttribute(name)!)),
      ...(description ? [`description="${escapeAttribute(description)}"`] : [])
    ]
    out.line(indent, `<${heads.join(" ")}>`)
    // a `<template>` is the page's way to run an example's script with it:  its contents are the example
    const body = [...example.childNodes]
      .flatMap((node) => templateContentsOf(node))
      .filter(
        (node) =>
          !plain.includes(node as Element) &&
          !(node.nodeType === TEXT && !node.textContent!.trim()) &&
          node.nodeType !== COMMENT
      ) as Element[]
    this.writeMarkup(out, body, indent + 1, { ...place, inExample: true })
    out.line(indent, "</example>")
  }

  /** `<ui-message>` around prose:  `<message ...>` holding `<markdown>`, its other markup as markup. */
  private writeMessage(out: Writer, message: Element, indent: number, place: Place) {
    const attributes = message.getAttributeNames().map((name) => attributeText(name, message.getAttribute(name)!))
    out.line(indent, `<message${attributes.length ? " " + attributes.join(" ") : ""}>`)
    this.writeChildren(out, message, indent + 1, place)
    out.line(indent, CLOSER)
  }

  /** Prose:  a `<markdown>` block, its text as written, its links to the page's sections pointed into the notebooks. */
  private writeMarkdown(out: Writer, texts: string[], indent: number, place: Place) {
    const text = this.relinked(texts.join("\n\n"), place.tab)
    const lines = text.split("\n")
    if (lines.length === 1 && !/[<{}]/.test(text)) {
      out.line(indent, `<markdown>${text}${CLOSER}`)
      return
    }
    out.line(indent, "<markdown>")
    for (const line of lines) out.line(line ? indent + 1 : 0, line)
    out.line(indent, CLOSER)
  }

  /**
   * One of the page's comments, `comment` its text:  a spellx comment, never drawn.
   * - One line:  `<!-- GAP I23:  ... -->`;  several:  `<!--`, its lines one tab in, `-->`.
   */
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
   * A run of markup:  each element in bare names where it can be (`<button>`), else runs of `<html>` blocks, as the
   * web writes them.
   */
  private writeMarkup(out: Writer, nodes: Element[], indent: number, place: Place) {
    let html: Node[] = []
    const flushHtml = () => {
      if (!html.length) return
      out.line(indent, "<html>")
      for (const node of html) this.writeHtml(out, node, indent + 1, place)
      out.line(indent, closerOf("html", place))
      html = []
    }
    for (const node of nodes) {
      if (this.isPageScript(node, place)) continue
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
          `${this.openTag(node)}<html>${this.htmlInnerOf(node, place)}${closerOf("html", place)}${closerOf(this.bareNameOf(node.localName)!, place)}`
        )
      } else html.push(node)
    }
    flushHtml()
  }

  /** Can `element` and everything inside it be written in bare names? */
  private isBare(element: Element): boolean {
    if (!this.bareNameOf(element.localName)) return false
    for (const name of element.getAttributeNames()) if (/[{}[\]]/.test(element.getAttribute(name)!)) return false
    for (const node of element.childNodes) {
      if (node.nodeType === COMMENT) return false
      if (node.nodeType === TEXT && /[<>{}&]/.test(node.textContent!)) return false
      if (node.nodeType === ELEMENT && !this.isBare(node as Element)) return false
    }
    return true
  }

  /**
   * Is `element` bare itself, holding text with the web's own inline tags (`<code>`, `<a>`, `<b>`) and nothing
   * else that can't be bare:  `<message size="small"><html>Set <code>--ui-primary</code> ...</html></message>`,
   * the smallest `<html>` block.
   */
  private hasBareText(element: Element): boolean {
    if (!this.bareNameOf(element.localName)) return false
    for (const name of element.getAttributeNames()) if (/[{}[\]]/.test(element.getAttribute(name)!)) return false
    const children = [...element.childNodes]
    if (children.some((node) => node.nodeType === COMMENT)) return false
    const hasText = children.some((node) => node.nodeType === TEXT && node.textContent!.trim())
    const inline = (node: ChildNode) => node.nodeType !== ELEMENT || INLINE_TAGS.has((node as Element).localName)
    return hasText && children.every(inline)
  }

  /** `element`'s children as the web writes them, on one line:  an `<html>` block's inside. */
  private htmlInnerOf(element: Element, place: Place): string {
    return [...element.childNodes]
      .map((node) => {
        if (node.nodeType === TEXT) return escapeText(node.textContent!.replace(/\s*\n\s*/g, " "))
        return node.nodeType === ELEMENT ? this.htmlOf(node as Element, place) : ""
      })
      .join("")
      .trim()
  }

  /** `element` in bare names:  its children a line each, or on its own line when it mixes text and elements. */
  private writeBare(out: Writer, element: Element, indent: number, place: Place) {
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

  /** `element` on one line, in bare names. */
  private inlineOf(element: Element, place: Place): string {
    const inner = [...element.childNodes]
      .map((node) => {
        if (node.nodeType === TEXT) return escapeText(node.textContent!.replace(/\s*\n\s*/g, " "))
        if (node.nodeType === ELEMENT) return this.inlineOf(node as Element, place)
        return ""
      })
      .join("")
      .trim()
    if (!inner) return `${this.openTag(element)}`.replace(/>$/, "/>")
    return `${this.openTag(element)}${inner}${closerOf(this.bareNameOf(element.localName)!, place)}`
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
   * - Never one of spell's own block words (`<markdown>`, `<example>`, `<html>`):  `<ui-markdown>` stays so.
   * - Never a docs element's (`<ui-docs-api>`):  the notebook's page loads them for its `<html>` blocks
   *   (`NotebookDocs`), so a bare `<docs-api>` would draw nothing.
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
      out.line(indent, this.htmlOf(element, place))
      return
    }
    out.line(indent, `${this.htmlOpenTag(element)}>`)
    for (const child of children)
      if (child.nodeType === ELEMENT && !this.isPageScript(child, place)) this.writeHtml(out, child, indent + 1, place)
    out.line(indent, closerOf(element.localName, place))
  }

  /**
   * A `<script>` or `<style>`, its text as written:  spellx reads it so, as the web does.
   * - One line:  `<style>:root { ... }</style>`;  several:  its lines, dedented, one tab in.
   */
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
   * - Left out, and noted in `warnings`:  it finds the page's elements by their ids as the page loads, so in a
   *   notebook, drawn later and again on each edit, it finds nothing and throws.
   */
  private isPageScript(node: Node, place: Place): boolean {
    const element = node as Element
    if (node.nodeType !== ELEMENT || element.localName !== "script") return false
    if (DATA_SCRIPT.test(element.getAttribute("type") ?? "")) return false
    const what = element.getAttribute("src") ?? collapsed(element.textContent ?? "").slice(0, 60)
    this.warn(`${place.tab.label}:  the page's script that drives its examples is left out (${what} ...)`)
    return true
  }

  /** `element`'s markup on one line:  void tags closed (`<img ... />`), comments left out, URLs served. */
  private htmlOf(element: Element, place: Place): string {
    const open = this.htmlOpenTag(element)
    if (VOID_TAGS.has(element.localName)) return `${open} />`
    const inner = [...element.childNodes]
      .map((node) => {
        if (node.nodeType === TEXT) return escapeText(node.textContent!.replace(/\s*\n\s*/g, " "))
        if (node.nodeType === ELEMENT && !this.isPageScript(node, place)) return this.htmlOf(node as Element, place)
        return ""
      })
      .join("")
      .trim()
    return `${open}>${inner}${closerOf(element.localName, place)}`
  }

  /** `element`'s opening tag as the web writes it, without its `>`. */
  private htmlOpenTag(element: Element): string {
    const attributes = element
      .getAttributeNames()
      .map((name) => attributeText(name, this.urlFor(name, element.getAttribute(name)!)))
    return `<${[element.localName, ...attributes].join(" ")}`
  }

  ////////////////
  // ## Addresses
  ////////////////

  /** `value` of attribute `name`, a relative URL made the page server's (`images/x.png` => `/components/ui/images/x.png`). */
  private urlFor(name: string, value: string): string {
    if (!URL_ATTRIBUTES.has(name) || /^([a-z]+:|\/|#)/i.test(value) || !value) return value
    // `source` names a file only with a folder or an extension:  `<ui-embed source="youtube">` names a site
    if (name === "source" && !/[./]/.test(value)) return value
    return new URL(value, `http://page${this.options.page}`).pathname
  }

  /** Tab `tab`'s notebook's address in the editor:  `/edit/@spell/notebooks/Button/Usage.spellx`. */
  private addressOf(tab: Tab): string {
    return `/edit/${this.project}/${tab.file}`
  }

  /** In-page id `id` as the notebook names it:  `examples-types-labeled` => `types-labeled`, in its tab. */
  private ownIdOf(id: string, tab: Tab): string | undefined {
    return id.startsWith(`${tab.value}-`) ? id.slice(tab.value.length + 1) : undefined
  }

  /** `text`'s links:  to the page's sections, into their notebooks;  to the page's neighbours, as served. */
  private relinked(text: string, from: Tab): string {
    return text.replace(/\]\(([^)\s]+)\)/g, (whole, target: string) => {
      if (target.startsWith("#")) {
        const id = target.slice(1)
        const tab = this.tabs.find((each) => id.startsWith(`${each.value}-`))
        if (!tab) return whole
        const own = this.ownIdOf(id, tab)!
        return `](${tab === from ? "" : this.addressOf(tab)}#${own})`
      }
      return `](${this.urlFor("href", target)})`
    })
  }

  private warn(text: string) {
    this.warnings.push(text)
  }
}

/** `spell app notebook convert`'s settings. */
export type NotebookFromPageOptions = {
  /** the page's served address, `/components/ui/ui-button.html`:  its relative URLs are from its folder */
  page: string
  /** the project group the project goes in, `@spell/notebooks` */
  into: string
  /** the tag a bare name draws, `button` => `ui-button`:  Spell UI's pack's, by default (tests pass their own) */
  tagFor?: (bare: string) => string | undefined
}

////////////////
// ## Helpers
////////////////

/** A tab of the page, and its notebook's file. */
type Tab = { element: Element; value: string; label: string; file: string }

/** Where the writing is:  which tab, how many sections deep, and whether inside an example (its code). */
type Place = { tab: Tab; depth: number; inExample: boolean }

/**
 * The closer for `tag` where `place` is:  `</>` outside an example, `</tag>` in full inside one, its code as people
 * write it (Owen, 2026-10-27).
 */
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
    return this.lines.join("\n") + "\n"
  }
}

/** Spell UI's pack's tag for a bare name. */
function defaultTagFor(bare: string): string | undefined {
  return SP.ComponentPacks.tagFor(bare, "en")
}

/** `name="value"` in spellx markup:  a boolean bare, its value escaped (`escapeAttribute()`). */
function attributeText(name: string, value: string): string {
  if (value === "" && !STRING_ATTRIBUTES.test(name)) return name
  return `${name}="${escapeAttribute(value)}"`
}

/** A quoted value's `"` and `\` escaped, and its `[` a real bracket (`\[`), not a fill-in. */
function escapeAttribute(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\[/g, "\\[")
}

/**
 * Markup text as written:  `<`, `>`, `&`, `{` and `}` as entities, `[` a real bracket (`\[`), not a fill-in.
 * - spellx reads them back as the characters, as JSX does.
 */
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

/** `element`'s element children. */
function childElements(element: Element): Element[] {
  return [...element.children]
}

/** Is `element` a `<p>` of text and `<code>` alone? */
function isPlainParagraph(element: Element): boolean {
  return (
    element.localName === "p" &&
    [...element.children].every((child) => child.localName === "code" && child.children.length === 0)
  )
}

/** `element`'s text, each `<code>` backticked, its white space collapsed. */
function backtickedTextOf(element: Element): string {
  return collapsed(
    [...element.childNodes]
      .map((node) => (node.nodeType === ELEMENT ? `\`${node.textContent}\`` : node.textContent))
      .join("")
  )
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

/** A label as an id:  `Group Variations` => `group-variations`, as the notebook's page makes its sections' ids. */
function slugOf(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-|-$/g, "")
}

/** A tab's label or a page's title as a file name:  `API` => `API`, `Theming` => `Theming`, `Framework usage` => `FrameworkUsage`. */
function fileNameOf(label: string): string {
  return label
    .split(/[^\p{L}\p{N}]+/u)
    .filter(Boolean)
    .map((word) => word[0]!.toUpperCase() + word.slice(1))
    .join("")
}

/** `a, b and c`. */
function listOf(items: string[], last = "and"): string {
  return items.length < 2 ? (items[0] ?? "") : `${items.slice(0, -1).join(", ")} ${last} ${items.at(-1)}`
}

/** How a notebook closes its tags, outside an example:  `</spell-notebook>` and `</example>` are written in full. */
const CLOSER = "</>"

/** How a comment ends, in HTML and in spellx. */
const HTML_COMMENT_END = "-->"

/** Node types. */
const ELEMENT = 1
const TEXT = 3
const COMMENT = 8

/** The page's tags this reads. */
const SECTION = "ui-section"
const EXAMPLE = "ui-example"
const MARKDOWN = "ui-markdown"
const CODE = "ui-code"

/** A tab's top section's attributes the notebook's page draws itself:  the others are left out. */
const TOP_SECTION_ATTRIBUTES = new Set(["id", "label", "sticky", "collapsible", "dividing"])

/** Attributes a page writes `=""` on for an empty text, never as a boolean. */
const STRING_ATTRIBUTES = /^(alt|value|label|aria-.*|title|placeholder)$/

/** Attributes holding a URL:  `source` is Spell UI's, a markdown or code file's (`<ui-markdown source>`), when it has a `.` or `/`. */
const URL_ATTRIBUTES = new Set(["src", "href", "link", "source"])

/** Spell's own words for blocks in a drawing:  a Spell UI tag of the same bare name is written in full. */
const SPELL_BLOCK_WORDS = new Set(["markdown", "html", "example", "css", "spell", "spellx"])

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
