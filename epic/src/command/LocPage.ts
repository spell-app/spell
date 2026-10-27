import { existsSync, readFileSync, writeFileSync } from "node:fs"
import { relative } from "node:path"

import { parseHTML } from "linkedom"

import { Markup } from "spell/epic/markup"

import { LOC_TABLE, type LocCounts, type LocScan } from "./command.types"
import { EpicTools } from "./EpicTools"
import { LinesOfCode } from "./LinesOfCode"

/****************
 * ### `LocPage`
 * The LOC guide (`guides/loc/loc.html`), its numbers rewritten from a scan (`LinesOfCode.scan()`):  `epic loc`'s page.
 * - What it rewrites, and nothing else:
 *   - section 1's headline numbers, its table (a code row and a tests row per repo, then All code, Tests, Both) and
 *     its `#loc-ratio` line
 *   - section 2's sub-section per repo (`#folders-<repo>`), each a table of its rows, the same three under it;
 *     a repo no longer scanned loses its sub-section
 *   - the files left out (`#left-out`'s aside), the "Scanned:" line, and the dates in the lede and the footer
 * - So the page's prose stays as written, and every id with it:  links into it still land.
 * - Missing:  made from the guide template, as `epic pages create durable` makes one (`create`), its template
 *   sections swapped for this page's four, with a few lines of prose each.
 * - The tables are DOM nodes (`Markup.plain()`), never HTML strings;  written as the docs tools write a page
 *   (`pages.js` `serialize()`), then tidied (`tidy()`:  links, oxfmt).
 ****************/
export class LocPage {
  /** the page, absolute */
  readonly file: string

  /** what it shows */
  readonly scan: LocScan

  /** the checkout `epic pages create` runs in, for a missing page */
  readonly root: string

  /** the content folder the page is in */
  readonly content: string

  /** how a missing page is made:  default `epic pages create durable` */
  private readonly create: (page: LocPage) => Promise<void>

  /** whether it's tidied after writing (links, oxfmt);  tests leave it */
  private readonly shouldTidy: boolean

  constructor(options: {
    file: string
    scan: LocScan
    root: string
    content?: string
    create?: (page: LocPage) => Promise<void>
    tidy?: boolean
  }) {
    this.file = options.file
    this.scan = options.scan
    this.root = options.root
    this.content = options.content ?? options.file.replace(/\/guides\/loc\/loc\.html$/, "")
    this.create = options.create ?? LocPage.fromTemplate
    this.shouldTidy = options.tidy ?? true
  }

  /**
   * Rewrite the page (making it first when missing);  `{ created }`.
   * - SIDE EFFECT:  writes the page;  may run `epic pages create`, which lists it on the Guides page
   * - throws `Error` when a missing page couldn't be made
   */
  async write(): Promise<{ created: boolean }> {
    const created = !existsSync(this.file)
    if (created) await this.create(this)
    if (!existsSync(this.file)) throw new Error(`LocPage.write():  ${this.file} couldn't be made`)
    const { document } = parseHTML(readFileSync(this.file, "utf8"))
    this.update(document, { fresh: created })
    // Imported here:  the docs tools' module reads the checkout (`EPIC_CHECKOUT`) as it loads
    process.env.EPIC_CHECKOUT ??= this.root
    const pages = await import("spell/epic/tools/pages.js")
    writeFileSync(this.file, pages.serialize(document))
    if (this.shouldTidy && !pages.tidy([this.file])) process.stderr.write(`epic loc:  couldn't tidy ${this.file}\n`)
    return { created }
  }

  /**
   * Every change, on `document`.
   * - `fresh`:  just made from the template:  its placeholder sections go, and this page's are written whole
   */
  update(document: Document, { fresh = false }: { fresh?: boolean } = {}): void {
    const main = document.querySelector("main") ?? document.body
    if (fresh) this.clearTemplate(document, main)
    this.dates(main)
    this.scannedLine(document, main)
    this.byRepo(document, main, fresh)
    this.byFolder(document, main, fresh)
    this.howItsCounted(document, main, fresh)
    this.refresh(document, main, fresh)
  }

  ////////////////
  // ## The sections
  ////////////////

  /** Section 1:  its headline numbers, its table, its ratio line. */
  private byRepo(document: Document, main: Element, fresh: boolean): void {
    const section = this.section(document, main, "1-by-repo", "1. By repo", "cubes")
    const { code, tests } = LinesOfCode.allOf(this.scan)
    if (fresh) {
      section.append(
        list(document, [
          "A row per repo for its code, and a row right under it for its tests.",
          '"Code: Lines" are lines of actual code:  no blank lines, no comments.',
          '"All" is the same code files, counted whole.',
          "Hover a number for its exact value."
        ])
      )
    }
    const stats = Markup.plain(document, "ui-statistics", { class: "spell-stats", size: "mini" }, [
      statistic(document, code.codeLines, "lines of code"),
      statistic(document, tests.codeLines, "lines of tests"),
      statistic(document, code.docLines + tests.docLines, "lines of docs")
    ])
    replaceOrAdd(section, ":scope > ui-statistics", stats, "first")
    const rows = this.scan.repos.flatMap((repo) => [
      { name: repo.name, counts: repo.code, bold: true },
      { name: `${repo.name} tests`, counts: repo.tests }
    ])
    replaceOrAdd(section, ":scope > ui-table", this.table(document, "repo", rows, code, tests))
    if (fresh) section.append(Markup.plain(document, "ul", {}, [Markup.plain(document, "li", { id: "loc-ratio" })]))
    const ratio = section.querySelector("#loc-ratio")
    if (ratio) {
      const perTest = tests.codeLines ? (code.codeLines / tests.codeLines).toFixed(1) : "--"
      ratio.textContent =
        `Across the repos:  ${code.codeLines.toLocaleString("en-US")} lines of code and ` +
        `${tests.codeLines.toLocaleString("en-US")} lines of tests, a line of test for every ${perTest} of code.`
    }
  }

  /** Section 2:  a folded sub-section per repo, its rows' table;  a repo no longer scanned loses its own. */
  private byFolder(document: Document, main: Element, fresh: boolean): void {
    const section = this.section(document, main, "2-by-folder", "2. By folder", "folder")
    if (fresh) {
      section.append(
        Markup.plain(document, "p", {}, [
          "Each repo's rows, as the settings file names them (see How it's counted), then everything else."
        ]),
        list(document, [
          '"src/ (top files)":  files right in src/, in no folder.',
          '"other":  files in no row, e.g. the READMEs, configs, bin/.',
          "Its tests are the Tests row under the table, not a row of their own."
        ])
      )
    }
    const ids = new Set(this.scan.repos.map((repo) => `folders-${repo.name}`))
    for (const old of section.querySelectorAll(":scope > ui-section[id^='folders-']")) {
      if (!ids.has(old.id)) old.remove()
    }
    for (const repo of this.scan.repos) {
      const sub = this.section(document, section, `folders-${repo.name}`, repo.name)
      sub.setAttribute("label", repo.name)
      const rows = Object.keys(repo.rows)
        .toSorted((a, b) => Number(a === "other") - Number(b === "other") || a.localeCompare(b))
        .map((name) => ({ name, counts: repo.rows[name]! }))
      replaceOrAdd(sub, ":scope > ui-table", this.table(document, "folder", rows, repo.code, repo.tests))
    }
  }

  /** Section 3:  fresh, how it's counted;  always, the files left out. */
  private howItsCounted(document: Document, main: Element, fresh: boolean): void {
    const section = this.section(document, main, "3-how-its-counted", "3. How it's counted", "list check")
    if (fresh) {
      section.append(
        Markup.plain(document, "p", {}, [
          "Every file git tracks in each repo, sorted into code and docs by its extension, as ",
          Markup.plain(document, "code", {}, [relative(this.content, this.settingsFile)]),
          " says:  which folders are rows, which files are tests, which extensions count, what's left out."
        ])
      )
    }
    const leftOut = this.section(document, section, "left-out", "Left out")
    if (fresh) {
      leftOut.append(
        list(document, [
          "generated files:  marked linguist-generated in a repo's .gitattributes, or GENERATED on their first line",
          "bundles:  lines over 400 characters long on average",
          'whatever the settings file\'s "leaveOut" names'
        ])
      )
    }
    const skipped = this.scan.skipped
    const why = { generated: "GENERATED on its first line", bundled: "a bundle:  long lines" }
    const aside = Markup.plain(document, "ui-accordion", { class: "spell-aside", appearance: "styled" }, [
      Markup.plain(document, "ui-title", {}, [
        `The ${skipped.length} files left out this scan, besides ${this.scan.generatedByAttribute} marked ` +
          "linguist-generated"
      ]),
      Markup.plain(document, "ui-content", {}, [
        Markup.plain(
          document,
          "ul",
          {},
          skipped.map((each) =>
            Markup.plain(document, "li", {}, [Markup.plain(document, "code", {}, [each.file]), `:  ${why[each.why]}`])
          )
        )
      ])
    ])
    replaceOrAdd(leftOut, ":scope > ui-accordion", aside)
  }

  /** Section 4:  written only on a fresh page. */
  private refresh(document: Document, main: Element, fresh: boolean): void {
    if (!fresh) return
    const section = this.section(document, main, "4-refresh-it", "4. Refresh it", "arrows rotate")
    const code = Markup.plain(document, "code", { class: "language-sh" }, [
      "epic loc            # rescan, rewrite this page\n" +
        "epic loc --print    # the by-repo table, in the terminal\n" +
        "epic loc --json     # the exact numbers"
    ])
    section.append(
      Markup.plain(document, "ui-accordion", { class: "spell-code", appearance: "styled" }, [
        Markup.plain(document, "ui-title", {}, ["Rescan · 3 lines"]),
        Markup.plain(document, "ui-content", {}, [Markup.plain(document, "pre", {}, [code])])
      ]),
      list(document, ["Each repo is scanned at whatever branch it has checked out.", "Short numbers:  1.2k is 1,200."])
    )
  }

  ////////////////
  // ## The page's head and dates
  ////////////////

  /** A page just made from the template:  its placeholder sections, comment and meta lines go;  its lede is ours. */
  private clearTemplate(document: Document, main: Element): void {
    for (const node of [...main.childNodes]) {
      if (node.nodeType === COMMENT_NODE) node.remove()
      else if ((node as Element).localName === "ui-section") node.remove()
    }
    const lede = main.querySelector("p.lede")
    if (lede) {
      lede.textContent = `How big each repo is, in lines and characters of code, tests and docs:  scanned ${this.scan.scanned}.`
    }
    const meta = main.querySelector("ui-list.spell-meta")
    if (meta) {
      meta.replaceChildren(
        Markup.plain(document, "ui-item", { icon: "user" }, [
          'Written for:  anyone asking "how big is this?" about a repo or one of its folders'
        ]),
        Markup.plain(document, "ui-item", { icon: "flask" }, [
          "How:  ",
          Markup.plain(document, "code", {}, ["epic loc"]),
          ", over the files git tracks"
        ])
      )
    }
  }

  /** The "Scanned:" meta line, written anew;  made when missing. */
  private scannedLine(document: Document, main: Element): void {
    const meta = main.querySelector("ui-list.spell-meta")
    if (!meta) return
    const repos = this.scan.repos.length - 1
    const line = Markup.plain(document, "ui-item", { icon: "calendar" }, [
      `Scanned:  ${this.scan.scanned}, the checkout `,
      Markup.plain(document, "code", {}, [this.scan.root.replace(/^\/Users\/[^/]+/, "~")]),
      repos ? ` and its ${repos} child repos, each at its checked-out branch` : ", at its checked-out branch"
    ])
    const old = [...meta.children].find((item) => /^\s*Scanned:/.test(item.textContent ?? ""))
    if (old) old.replaceWith(line)
    else meta.append(line)
  }

  /** The lede's and the footer's dates:  the scan's. */
  private dates(main: Element): void {
    for (const holder of main.querySelectorAll("p.lede, footer .meta")) {
      replaceInText(holder, DATE, this.scan.scanned)
    }
  }

  ////////////////
  // ## Tables
  ////////////////

  /**
   * A `<ui-table>` of `rows`, its header in two rows (each group of `LOC_TABLE` over its columns' short names), then
   * All code (`code`), Tests (`tests`) and Both under it.
   */
  table(
    document: Document,
    first: string,
    rows: { name: string; counts: LocCounts; bold?: boolean }[],
    code: LocCounts,
    tests: LocCounts
  ): Element {
    const groups = Markup.plain(document, "tr", {}, [
      Markup.plain(document, "th", { rowspan: 2 }, [first]),
      ...LOC_TABLE.map(({ group, columns }) =>
        Markup.plain(document, "th", { class: "center aligned", colspan: columns.length }, [group])
      )
    ])
    const names = Markup.plain(
      document,
      "tr",
      {},
      LOC_TABLE.flatMap(({ columns }) => columns).map((column) =>
        Markup.plain(document, "th", { class: "num right aligned", title: column.title }, [column.name])
      )
    )
    const body = rows.map((row) => this.row(document, row.name, row.counts, row.bold))
    const foot = [
      this.row(document, "All code", code, true),
      this.row(document, "Tests", tests, true),
      this.row(document, "Both", LinesOfCode.sum(code, tests), true)
    ]
    return Markup.plain(
      document,
      "ui-table",
      { celled: true, padding: "compact", appearance: "striped", unstackable: true },
      [
        Markup.plain(document, "table", {}, [
          Markup.plain(document, "thead", {}, [groups, names]),
          Markup.plain(document, "tbody", {}, body),
          Markup.plain(document, "tfoot", {}, foot)
        ])
      ]
    )
  }

  /** A row:  its name (bold for a repo's code and the totals), then a cell per column. */
  private row(document: Document, name: string, counts: LocCounts, bold = false): Element {
    const label = bold ? Markup.plain(document, "b", {}, [name]) : name
    return Markup.plain(document, "tr", {}, [
      Markup.plain(document, "td", { class: "single line" }, [label]),
      ...LOC_TABLE.flatMap(({ columns }) => columns).map(({ key }) => {
        const n = counts[key]
        const exact = n < 1000 ? undefined : n.toLocaleString("en-US")
        return Markup.plain(document, "td", { class: "num right aligned", title: exact }, [LinesOfCode.short(n)])
      })
    ])
  }

  ////////////////
  // ## Helpers
  ////////////////

  /** The settings file, beside the page. */
  get settingsFile(): string {
    return this.file.replace(/\.html$/, ".json5")
  }

  /**
   * `parent`'s sub-section `id`, made when missing:  `<ui-section id label sticky collapsible dividing open="false">`,
   * its icon first;  a top-level one goes before the page's footer.
   */
  private section(document: Document, parent: Element, id: string, label: string, icon?: string): Element {
    const found = parent.querySelector(`:scope > ui-section[id="${id}"]`)
    if (found) return found
    const section = Markup.plain(document, "ui-section", {
      id,
      label,
      sticky: true,
      collapsible: true,
      dividing: true,
      open: "false"
    })
    if (icon) section.append(Markup.plain(document, "ui-icon", { slot: "icon", name: icon }))
    const footer = parent.querySelector(":scope > footer")
    if (footer) footer.before(section)
    else parent.append(section)
    return section
  }

  /**
   * Make a missing page as `epic pages create durable` does, in `page.root`'s checkout:  from the guide template, at
   * its depth, listed on the Guides page.
   */
  static async fromTemplate(page: LocPage): Promise<void> {
    await EpicTools.run(
      "pages create",
      [
        "durable",
        relative(page.content, page.file),
        "--title",
        "LOC",
        "--description",
        "The size of every repo:  lines and characters of code, tests and docs, per repo and per folder."
      ],
      { cwd: page.root }
    )
  }
}

/** A date as the page writes it. */
const DATE = /\d{4}-\d{2}-\d{2}/g

/** `Node.COMMENT_NODE`, spelled out:  no DOM global in node. */
const COMMENT_NODE = 8

/** `Node.TEXT_NODE`. */
const TEXT_NODE = 3

/** A `<ui-statistic>` of `n`, short, its label `label`. */
function statistic(document: Document, n: number, label: string): Element {
  return Markup.plain(document, "ui-statistic", { value: LinesOfCode.short(n), label })
}

/** A `<ul>` of `items`, a line each. */
function list(document: Document, items: string[]): Element {
  return Markup.plain(
    document,
    "ul",
    {},
    items.map((item) => Markup.plain(document, "li", {}, [item]))
  )
}

/**
 * Put `node` in place of `parent`'s first child matching `selector`;  none:  add it, at the end, or `first` after
 * the section's icon.
 */
function replaceOrAdd(parent: Element, selector: string, node: Element, where: "first" | "last" = "last"): void {
  const old = parent.querySelector(selector)
  if (old) old.replaceWith(node)
  else if (where === "first") {
    const icon = parent.querySelector(":scope > ui-icon[slot='icon']")
    if (icon) icon.after(node)
    else parent.prepend(node)
  } else parent.append(node)
}

/** Replace `pattern` with `text` in every text node under `element`.  SIDE EFFECT. */
function replaceInText(element: Node, pattern: RegExp, text: string): void {
  for (const child of element.childNodes) {
    if (child.nodeType === TEXT_NODE) child.textContent = child.textContent!.replace(pattern, text)
    else replaceInText(child, pattern, text)
  }
}
