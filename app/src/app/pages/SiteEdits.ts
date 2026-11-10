import { escapeRegExp } from "spell/util/string"
import { CODE_SITE, SPELLX_SITE, declaresSite } from "spell/app/spaces/models/siteFiles"

/****************
 * ### `SiteEdits`
 * A site's program, changed by what a person did rather than typed (epic `mockup` P2):
 * a new page, made where an address had none.
 * - Plain text in, text out:  it loads no parser, so it's tested in node, and the editor applies the result as one
 *   step of its history (`RunSite.createPage()`).
 * - A site may be its routing alone, `X.site.spell`, each page in a file of its own (epic `mockup` P17):
 *   a page's name is then its title, and `<group>` lines head its board's sections.
 * - It reads both of Spell's forms:  spellx's `<site>`, and code spell's `galaxy guide is a site:`.
 * - Static and instance-free on purpose:  it holds nothing, and every caller has its own text.
 ****************/
export class SiteEdits {
  /**
   * The words of a new page at `address`, from its last part that isn't a parameter:
   * `/planets/tatooine` => `tatooine page`;  `/` => `home page`;  `/new-page` => `new page`.
   * - A name `taken` already gets a number:  `tatooine page 2`.
   */
  static pageNameFor(address: string, taken: readonly string[] = []): string {
    const part = address
      .split("/")
      .filter((segment) => segment && !segment.startsWith(":"))
      .at(-1)
    const words = part
      ? decodeURIComponent(part)
          .replace(/[-_.]+/g, " ")
          .trim()
          .toLowerCase()
      : "home"
    // `/new-page` is `new page`, not `new page page`
    const name = /\bpage$/.test(words) ? words : `${words} page`
    if (!taken.includes(name)) return name
    let number = 2
    while (taken.includes(`${name} ${number}`)) number++
    return `${name} ${number}`
  }

  /** Does `text` declare a site, in either form? */
  static hasSite(text: string): boolean {
    return declaresSite(text)
  }

  /**
   * Is the file at `path` a site's routing alone, its pages each in a file of their own (epic `mockup` P17)?
   * - `JarvisNew.site.spell`;  in another language, `Sitio.site.es.spell`.
   */
  static isRoutingOnly(path: string): boolean {
    return ROUTING_ONLY_FILE.test(path)
  }

  /** What part `group`'s heading is known by, to pick and move it:  a group may share its name with a page. */
  static groupKey(title: string): string {
    return `${GROUP_KEY}${title}`
  }

  /** `title`, a free name among `taken`:  `New page`, then `New page 2`. */
  static freeName(title: string, taken: readonly string[]): string {
    if (!taken.includes(title)) return title
    let number = 2
    while (taken.includes(`${title} ${number}`)) number++
    return `${title} ${number}`
  }

  /**
   * The name of a file of its own for part `name`, not one of `taken`:  `My Inbox` => `my-inbox.spell`.
   * - `language`:  `es` writes `.es.spell`.
   */
  static fileNameFor(name: string, taken: readonly string[], language: "en" | "es" = "en"): string {
    const words = name
      .normalize("NFD")
      .replace(/\p{M}/gu, "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "")
    const base = words || "page"
    const ending = language === "es" ? ".es.spell" : ".spell"
    let file = `${base}${ending}`
    for (let number = 2; taken.includes(file); number++) file = `${base}-${number}${ending}`
    return file
  }

  /**
   * What a new file of its own for `part` starts with:  a page, or a dialog's or sidebar's view, showing its name.
   * - `language`:  whose words it's written in.
   */
  static stubFor(part: SitePart, language: "en" | "es" = "en"): string {
    const prefix = language === "es" ? "encanto" : "spell"
    const kind = part.kind === "page" ? (language === "es" ? "página" : "page") : language === "es" ? "vista" : "view"
    const title = part.title ?? part.name
    const quoted = JSON.stringify(part.name)
    const heading = escapeTagText(title)
    if (part.kind === "page") return `<${prefix}-${kind} ${quoted}>\n\t<header size="large">${heading}</header>\n</>\n`
    return `<${prefix}-${kind} ${quoted}>\n\t<draw>\n\t\t<header size="medium">${heading}</header>\n\t</draw>\n</>\n`
  }

  /**
   * `text`, a file declaring a site, with a page `name` added:
   * declared just before the site, and listed in it, last, at `address`.
   * - spellx:  `<page "tatooine page"/>` at the top, then `<page "tatooine page" address="/planets/tatooine"/>` in the site
   * - code spell:  `a "tatooine page" is a page`, then `- it has a tatooine page at "/planets/tatooine"`
   * - Indented as the file is:  with tabs, or with what its site's first part is indented by.
   * - `listOnly`:  only its line in the site, for a site whose pages are each in a file of their own (`isRoutingOnly()`)
   * - throws `TypeError` when `text` declares no site, or its `<site>` closes on its own line (`<site .../>`)
   */
  static withPageAdded(text: string, name: string, address: string, options: { listOnly?: boolean } = {}): string {
    const spellx = SPELLX_SITE.exec(text)
    if (spellx) return SiteEdits.addedToSpellx(text, spellx.index, name, address, options)
    const code = CODE_SITE.exec(text)
    if (code) return SiteEdits.addedToCode(text, code.index, name, address, options)
    throw new TypeError("SiteEdits.withPageAdded():  this file declares no site;  pass the one that does")
  }

  ////////////////
  // ## Reading a site's parts (epic `mockup` P4)
  ////////////////

  /**
   * The parts `text`'s site lists, nested as it nests them:  its pages, dialogs and sidebars, in the file's order.
   * - Each with where its own line is, and where its lines end, its pages' included (`SitePart`).
   * - `undefined`:  `text` declares no site.
   * - A line it can't read (a comment, a stray line) is skipped:  it stays as it is through every edit.
   */
  static partsIn(text: string): SitePart[] | undefined {
    const spellx = SPELLX_SITE.exec(text)
    if (spellx) return spellxPartsIn(text, spellx.index)
    const code = CODE_SITE.exec(text)
    if (code) return codePartsIn(text, code.index)
    return undefined
  }

  /** Every part of `parts`, its pages' pages too, in the file's order. */
  static allParts(parts: readonly SitePart[]): SitePart[] {
    return parts.flatMap((part) => [part, ...SiteEdits.allParts(part.parts)])
  }

  /**
   * The part named `name` in `text`'s site.
   * - throws `TypeError` when there's no such part, or no site
   */
  static partNamed(text: string, name: string): SitePart {
    const part = SiteEdits.allParts(SiteEdits.partsIn(text) ?? []).find((each) => each.name === name)
    if (!part) throw new TypeError(`SiteEdits.partNamed():  the site lists no "${name}";  pick one it lists`)
    return part
  }

  ////////////////
  // ## Changing a site's parts (epic `mockup` P4)
  ////////////////

  /**
   * `text` with the part `name` taken out of its site, its pages under it with it, and each page's own declaration
   * (`<page "x">`, `a "x" is a page`), when this file has one.
   * - A page from another project (the Spell UI site's notebooks) is only taken off the list:  its project stays.
   * - Asking first, when it has pages under it, is the caller's (`SiteWrites.removePart()`):  `partNamed()` says.
   */
  static withPartRemoved(text: string, name: string): string {
    const part = SiteEdits.partNamed(text, name)
    let after = text.slice(0, part.span.start) + text.slice(part.span.end)
    for (const each of SiteEdits.allParts([part]))
      if (each.kind === "page") after = withoutDeclaration(after, each.name)
    return after
  }

  /**
   * `text` with the part `name` called `newName`:  in its site's list, and in its own declaration.
   * - Lines elsewhere naming it (`go to the films page`) aren't this text edit's:
   *   `SiteWrites.renamePart()` finds them by the project's parse, in every file,
   *   and renames them in the same step (epic `mockup` P6, T13).
   * - throws `TypeError` when `newName` is taken, or isn't one the language reads as this kind of part
   */
  static withPartRenamed(text: string, name: string, newName: string): string {
    const part = SiteEdits.partNamed(text, name)
    const wanted = newName.trim().replace(/\s+/g, " ")
    if (wanted === name) return text
    if (!PART_NAME.test(wanted)) {
      throw new TypeError(`SiteEdits.withPartRenamed():  "${wanted}" isn't a name;  use words, no quotes`)
    }
    const isGroup = part.kind === "group"
    if (isGroup && wanted === part.title) return text
    const key = isGroup ? SiteEdits.groupKey(wanted) : wanted
    const all = SiteEdits.allParts(SiteEdits.partsIn(text) ?? [])
    if (all.some((each) => each.name === key)) {
      throw new TypeError(`SiteEdits.withPartRenamed():  the site has a "${wanted}" already;  pick another name`)
    }
    const line = text.slice(part.line.start, part.line.end)
    if (isGroup) {
      return text.slice(0, part.line.start) + line.replace(`"${part.title}"`, `"${wanted}"`) + text.slice(part.line.end)
    }
    const renamedLine = part.form === "spellx" ? line.replace(`"${name}"`, `"${wanted}"`) : line.replace(name, wanted)
    const after = text.slice(0, part.line.start) + renamedLine + text.slice(part.line.end)
    return withDeclarationRenamed(after, name, wanted)
  }

  /**
   * `text` with page `name`'s address, title, state, thumbnail or live link changed;
   * an empty title takes it out, and the page goes by its name.
   * - Only pages have them:  a dialog's or sidebar's are ignored.
   * - throws `TypeError` for an address that doesn't start with `/`, one another page has,
   *   or a live link that isn't a web address
   */
  static withPartChanged(
    text: string,
    name: string,
    change: { address?: string; title?: string; state?: string; thumbnail?: string; live?: string }
  ): string {
    const part = SiteEdits.partNamed(text, name)
    if (part.kind !== "page") return text
    const address = change.address === undefined ? part.address : change.address.trim()
    const title = change.title === undefined ? part.title : change.title.trim() || undefined
    if (address !== undefined && !address.startsWith("/")) {
      throw new TypeError(`SiteEdits.withPartChanged():  an address starts with "/":  "/${address}", say`)
    }
    const others = SiteEdits.allParts(SiteEdits.partsIn(text) ?? []).filter((each) => each.name !== part.name)
    const taken = address && others.find((each) => each.address === address)
    if (taken) {
      throw new TypeError(`SiteEdits.withPartChanged():  "${taken.name}" is at ${address} already;  pick another`)
    }
    const state = change.state === undefined ? part.state : change.state || undefined
    const line = text.slice(part.line.start, part.line.end)
    const thumbnail = change.thumbnail === undefined ? part.thumbnail : change.thumbnail || undefined
    const live = change.live === undefined ? part.live : change.live.trim() || undefined
    if (live && !SiteEdits.isLiveLink(live)) {
      throw new TypeError(`SiteEdits.withPartChanged():  a live link starts with "https://":  "${live}" doesn't`)
    }
    const said = { ...wordsOf(part), address, title, state, thumbnail, live }
    const changed = part.form === "spellx" ? spellxLineWith(line, said) : codeLineWith(line, part, said)
    return text.slice(0, part.line.start) + changed + text.slice(part.line.end)
  }

  /**
   * Where page `name`'s own declaration is written in `text`, with its body:
   * `<page "x">...</>` or `a "x" is a page:` and its lines.
   * - none for a page `text` doesn't declare (another file's, another project's)
   */
  static declarationOf(text: string, name: string): TextSpan | undefined {
    return declarationOf(text, name)
  }

  /** Is `link` a web address, safe to open?  A live link is the only address a card opens that a person typed. */
  static isLiveLink(link: string): boolean {
    return /^https?:\/\//i.test(link)
  }

  /** `text` with `name`'s own declaration, in this file, calling it `newName`:  `text` as it is when it has none. */
  static withDeclarationRenamed(text: string, name: string, newName: string): string {
    return withDeclarationRenamed(text, name, newName)
  }

  /**
   * The thumbnail written on part `name`'s own page or view in `text`, if it's declared there.
   * - `<page "x" thumbnail="...">`, `<view "x" thumbnail="...">` (or their old spellings), or a line of its body,
   *   `- its thumbnail is "..."`.
   * - A site's `button usage page` may be declared as `button usage`:  either name finds it.
   */
  static thumbnailOf(text: string, name: string): string | undefined {
    if (!text.includes("thumbnail")) return undefined
    for (const quoted of [name, name.replace(/ page$/, "")].map((each) => escapeRegExp(JSON.stringify(each)))) {
      const tag = new RegExp(`^<${PAGE_OR_VIEW} ${quoted}[^\\n]*`, "m").exec(text)?.[0]
      if (tag) return ATTRIBUTE("thumbnail").exec(tag)?.[1]
      const body = new RegExp(`^an? ${quoted} is an? (?:page|view)[^\\n]*\\n((?:[ \\t]+[^\\n]*\\n)*)`, "m").exec(text)
      if (body) return /^[ \t]*- its thumbnail is "([^"]*)"/m.exec(body[1]!)?.[1]
    }
    return undefined
  }

  /**
   * Can `part` have pages under it?
   * - A group, the lines after it;  a page with an address:  the not found and error pages are shown when no address
   *   matches, and nothing goes under a dialog or sidebar, so the language reads nothing there.
   */
  static canNest(part: SitePart): boolean {
    return part.kind === "group" || (part.kind === "page" && part.address !== undefined)
  }

  /**
   * Can `part` go under a page?
   * - A page with an address, a dialog or a sidebar (which belongs to that page's section of the board);
   *   not the not found and error pages, which the language only reads at the site's top, nor a group, which is flat.
   */
  static canGoUnder(part: SitePart): boolean {
    return part.kind !== "group" && (part.kind !== "page" || part.address !== undefined)
  }

  /**
   * `text` with the part `name`'s card at `place`, a row and column of its section;  none takes its place out.
   * - Any part:  a dialog's card has a place too.
   */
  static withPartPlaced(text: string, name: string, place: { row: number; column: number } | undefined): string {
    const part = SiteEdits.partNamed(text, name)
    const line = text.slice(part.line.start, part.line.end)
    const said = { ...wordsOf(part), row: place?.row, column: place?.column }
    const changed = part.form === "spellx" ? spellxLineWith(line, said) : codeLineWith(line, part, said)
    return text.slice(0, part.line.start) + changed + text.slice(part.line.end)
  }

  /**
   * `text` with the part `name`, and its pages, moved to `place`.
   * - `before` or `after` another part:  at that part's depth, `after` going below that part's own pages too.
   * - `into` a page:  its first page, whether or not it has any yet.
   * - A page's address stays as it's written, wherever it moves.
   * - A spellx page left with no pages closes on its own line again:  `<page "x"/>`.
   * - throws `TypeError` for a move into itself or its own pages,
   *   or `into` something that can't hold it (`canNest()`, `canGoUnder()`)
   */
  static withPartMoved(text: string, name: string, place: SitePartPlace): string {
    const part = SiteEdits.partNamed(text, name)
    const target = SiteEdits.partNamed(text, place.part)
    if (target.name === name) {
      if (place.where === "into") {
        throw new TypeError(`SiteEdits.withPartMoved():  "${name}" can't go inside itself;  pick another page`)
      }
      return text
    }
    if (target.span.start >= part.span.start && target.span.end <= part.span.end) {
      throw new TypeError(`SiteEdits.withPartMoved():  "${name}" can't go under one of its own pages`)
    }
    if (place.where === "into" && !(SiteEdits.canGoUnder(part) && SiteEdits.canNest(target))) {
      throw new TypeError(
        `SiteEdits.withPartMoved():  "${name}" can't go inside "${target.name}";  only a page with an address holds parts`
      )
    }
    const everyPart = SiteEdits.allParts(SiteEdits.partsIn(text) ?? [])
    const parentName = everyPart.find((each) => each.parts.some((under) => under.name === name))?.name
    const moving = withLineBreak(text.slice(part.span.start, part.span.end))
    const taken = withLineBreak(text.slice(0, part.span.start) + text.slice(part.span.end))
    const without =
      place.where === "into" && place.part === parentName ? taken : withPageClosedIfEmpty(taken, parentName)
    const there = SiteEdits.allParts(SiteEdits.partsIn(without) ?? []).find((each) => each.name === target.name)!
    if (place.where === "into") return withPartInside(without, there, reindent(moving, part.indent, indentUnder(there)))
    const at = place.where === "before" ? there.line.start : there.span.end
    return without.slice(0, at) + reindent(moving, part.indent, there.indent) + without.slice(at)
  }

  /** `text` with a page added to the `<site>` opening at `start`. */
  private static addedToSpellx(
    text: string,
    start: number,
    name: string,
    address: string,
    { listOnly }: { listOnly?: boolean }
  ): string {
    const close = CLOSING_TAG.exec(text.slice(start))
    if (!close) {
      throw new TypeError("SiteEdits.withPageAdded():  its <site> has no closing line;  write </> under it")
    }
    const end = start + close.index
    const indent = /\n([ \t]+)</.exec(text.slice(start, end))?.[1] ?? "\t"
    const listed = `${indent}<page ${JSON.stringify(name)} address=${JSON.stringify(address)}/>\n`
    const declared = listOnly ? "" : `<page ${JSON.stringify(name)}/>\n\n`
    return text.slice(0, start) + declared + text.slice(start, end) + listed + text.slice(end)
  }

  /** `text` with a page added to the code-spell site whose line starts at `start`. */
  private static addedToCode(
    text: string,
    start: number,
    name: string,
    address: string,
    { listOnly }: { listOnly?: boolean }
  ): string {
    const lineEnd = text.indexOf("\n", start)
    const siteLine = text.slice(start, lineEnd < 0 ? undefined : lineEnd)
    // the site's body:  every line after it that's indented, or blank
    let end = lineEnd < 0 ? text.length : lineEnd + 1
    const bodyLines: string[] = []
    while (end < text.length) {
      const next = text.indexOf("\n", end)
      const line = text.slice(end, next < 0 ? undefined : next)
      if (line.trim() && !/^[ \t]/.test(line)) break
      bodyLines.push(line)
      end = next < 0 ? text.length : next + 1
    }
    while (bodyLines.length && !bodyLines.at(-1)!.trim()) {
      end -= bodyLines.pop()!.length + 1
    }
    const indent = /^([ \t]+)/.exec(bodyLines.find((line) => line.trim()) ?? "")?.[1] ?? "\t"
    const opened = siteLine.trimEnd().endsWith(":") ? siteLine : `${siteLine.trimEnd()}:`
    const body = text.slice(lineEnd < 0 ? text.length : lineEnd + 1, end)
    const declared = listOnly ? "" : `a ${JSON.stringify(name)} is a page\n`
    const listed = `${indent}- it has ${articleFor(name)} ${name} at ${JSON.stringify(address)}\n`
    const tail = text.slice(end)
    return `${text.slice(0, start)}${declared}${opened}\n${body}${body && !body.endsWith("\n") ? "\n" : ""}${listed}${tail}`
  }
}

/** A closing line at the file's left edge:  the end of a top-level tag, `</>` or `</site>` (or `</spell-site>`). */
const CLOSING_TAG = /^<\/(?:(?:(?:spell|encanto)-)?(?:site|sitio))?>/m

/**
 * A page's or view's tag word, in English and Spanish:  short (epic `language` P41), or with its old prefix.
 * - Its Spanish words with their accents and without, as a person may type them.
 */
const PAGE_OR_VIEW = "(?:(?:spell|encanto)-)?(?:page|view|página|pagina|vista)"

/** `a` or `an`, for `name`. */
function articleFor(name: string): string {
  return /^[aeiou]/i.test(name) ? "an" : "a"
}

////////////////
// ## A site's parts, read from its text
////////////////

/** One part a site lists:  a page, a dialog or a sidebar, where it's written, and the parts under it. */
export type SitePart = {
  /** What it is:  a page has an address;  a dialog or sidebar opens over any page. */
  kind: SitePartKind
  /** Its name, as the program knows it:  `films page`, `settings dialog`. */
  name: string
  /** A page's address:  `/films/:film`;  none for a dialog, a sidebar, or the not found and error pages. */
  address?: string
  /** A page's title, for its link:  `Films`;  none goes by its name.  A group's words, as they're written. */
  title?: string
  /** A page's state, if its line says:  `old`, `new`, `mocked` or `built` (epic `mockup` P13, T14). */
  state?: string
  /** A thumbnail of a page, a file of the project:  `snapshots/films.png`. */
  thumbnail?: string
  /** The real page it stands for, on the live site:  what its card's new-tab icon opens. */
  live?: string
  /** What its tab says, if its line says. */
  tab?: string
  /** What it's filed under, as its line writes it:  `Forms, Inputs`. */
  tags?: string
  /** Which row of its section of the board its card is in, from 1, if its line says. */
  row?: number
  /** Which column of its section, from 1. */
  column?: number
  /** Its card's colour, one of Spell UI's, if its line says;  the parts under it take it too. */
  color?: string
  /** Its name is written in quotes, in code spell:  `- it has a "films page" at "/films"`. */
  isQuoted?: boolean
  /** The parts under it, as the side navigation nests them. */
  parts: SitePart[]
  /** How deep it is:  0 for the site's own parts. */
  depth: number
  /** Which of Spell's forms it's written in. */
  form: "spellx" | "code"
  /** Its own line, its line break included. */
  line: TextSpan
  /** Its line and every line of its parts, a closing `</>` included. */
  span: TextSpan
  /** What its line starts with:  its indent, tabs or spaces. */
  indent: string
}

/** What a site's part is. */
export type SitePartKind = "page" | "dialog" | "sidebar" | "group"

/** Where something is in a text:  from `start` up to `end`, as offsets. */
export type TextSpan = { start: number; end: number }

/** One of a text's lines:  its offsets, its line break included. */
type TextLine = { text: string; start: number; end: number }

/** `text`'s lines, each with where it is. */
function linesOf(text: string): TextLine[] {
  const lines: TextLine[] = []
  let start = 0
  while (start < text.length) {
    const next = text.indexOf("\n", start)
    const end = next < 0 ? text.length : next + 1
    lines.push({ text: text.slice(start, next < 0 ? text.length : next), start, end })
    start = end
  }
  return lines
}

/**
 * Where a part is moved to:  next to another part, or inside a page.
 * - `before` / `after`:  beside `part`, at its depth
 * - `into`:  `part`'s first page
 */
export type SitePartPlace = { where: "before" | "after" | "into"; part: string }

/** What a part's kind is, from the last word of its name:  `settings dialog` is a dialog. */
function kindOfName(name: string): SitePartKind {
  if (/\b(?:dialog|modal)$/.test(name)) return "dialog"
  if (/\b(?:sidebar|flyout)$/.test(name)) return "sidebar"
  return "page"
}

/** The parts of a spellx site, `<site ...>` opening at `start`. */
function spellxPartsIn(text: string, start: number): SitePart[] {
  const top: SitePart[] = []
  const open: SitePart[] = []
  let group: SitePart | undefined
  let isInComment = false
  for (const line of linesOf(text)) {
    if (line.start <= start) continue
    if (CLOSING_TAG.test(line.text)) break
    const trimmed = line.text.trim()
    if (isInComment || trimmed.startsWith("<!--")) {
      isInComment = !trimmed.includes("-->")
      continue
    }
    if (/^<\/(?:page)?>$/.test(trimmed)) {
      const closed = open.pop()
      if (closed) closed.span.end = line.end
      if (group && !open.length) group.span.end = line.end
      continue
    }
    const heading = open.length ? undefined : SPELLX_GROUP.exec(trimmed)
    if (heading) {
      group = groupPart(heading[1]!, "spellx", line, ATTRIBUTE("color").exec(heading[2]!)?.[1])
      top.push(group)
      continue
    }
    const tag = SPELLX_PART.exec(trimmed)
    if (!tag) continue
    const [, word, name, attributes, end] = tag
    const part: SitePart = {
      kind: word === "page" ? "page" : (word as SitePartKind),
      name: name!,
      address: ATTRIBUTE("address").exec(attributes!)?.[1],
      title: ATTRIBUTE("title").exec(attributes!)?.[1],
      tab: ATTRIBUTE("tab").exec(attributes!)?.[1],
      tags: ATTRIBUTE("tags").exec(attributes!)?.[1],
      state: ATTRIBUTE("state").exec(attributes!)?.[1],
      thumbnail: ATTRIBUTE("thumbnail").exec(attributes!)?.[1],
      live: ATTRIBUTE("live").exec(attributes!)?.[1],
      row: numberIn(ATTRIBUTE("row").exec(attributes!)?.[1]),
      column: numberIn(ATTRIBUTE("column").exec(attributes!)?.[1]),
      color: ATTRIBUTE("color").exec(attributes!)?.[1],
      parts: [],
      depth: open.length + (group ? 1 : 0),
      form: "spellx",
      line: { start: line.start, end: line.end },
      span: { start: line.start, end: line.end },
      indent: /^[ \t]*/.exec(line.text)![0]
    }
    ;(open.at(-1)?.parts ?? group?.parts ?? top).push(part)
    if (group && !open.length) group.span.end = line.end
    if (end === ">") open.push(part)
  }
  return top
}

/** A `<group>` line as a part:  the lines after it, up to the next group, are its `parts`. */
function groupPart(title: string, form: "spellx" | "code", line: TextLine, color?: string): SitePart {
  return {
    kind: "group",
    name: SiteEdits.groupKey(title),
    title,
    color,
    parts: [],
    depth: 0,
    form,
    line: { start: line.start, end: line.end },
    span: { start: line.start, end: line.end },
    indent: /^[ \t]*/.exec(line.text)![0]
  }
}

/** The parts of a code-spell site, whose line starts at `start`. */
function codePartsIn(text: string, start: number): SitePart[] {
  const top: SitePart[] = []
  const open: SitePart[] = []
  let group: SitePart | undefined
  for (const line of linesOf(text)) {
    if (line.start <= start) continue
    if (line.text.trim() && !/^[ \t]/.test(line.text)) break
    const heading = CODE_GROUP.exec(line.text)
    if (heading) {
      open.length = 0
      group = groupPart(heading[1]!, "code", line)
      top.push(group)
      continue
    }
    const written = CODE_PART.exec(line.text)
    if (!written) continue
    const [, indent, written_name, address, title, tab, tags, state, thumbnail, live, row, column, color] = written
    const isQuoted = /^".*"$/.test(written_name!)
    const name = isQuoted ? written_name!.slice(1, -1) : written_name!
    while (open.length && open.at(-1)!.indent.length >= indent!.length) open.pop()
    const part: SitePart = {
      kind: kindOfName(name),
      name,
      address,
      title,
      tab,
      tags,
      state,
      thumbnail,
      live,
      row: numberIn(row),
      column: numberIn(column),
      color,
      isQuoted,
      parts: [],
      depth: open.length + (group ? 1 : 0),
      form: "code",
      line: { start: line.start, end: line.end },
      span: { start: line.start, end: line.end },
      indent: indent!
    }
    ;(open.at(-1)?.parts ?? group?.parts ?? top).push(part)
    for (const above of open) above.span.end = line.end
    if (group) group.span.end = line.end
    open.push(part)
  }
  return top
}

/** `text`, ending in a line break:  a part moved from, or to, a file's last line stays a line of its own. */
function withLineBreak(text: string): string {
  return text.endsWith("\n") ? text : `${text}\n`
}

/** `lines` with `from`, what they're indented by, replaced by `to`;  what's further in stays further in. */
function reindent(lines: string, from: string, to: string): string {
  return lines
    .split("\n")
    .map((line) => (line.startsWith(from) ? to + line.slice(from.length) : line))
    .join("\n")
}

/** What a page under `page` is indented by:  as its first page is, else one step further than `page`. */
function indentUnder(page: SitePart): string {
  if (page.kind === "group") return page.indent
  const step = page.indent.slice(0, page.indent.length / (page.depth + 1)) || "\t"
  return page.parts[0]?.indent ?? page.indent + step
}

/** `text` with `lines` as page `page`'s first page:  a spellx page that closes on its own line opens first. */
function withPartInside(text: string, page: SitePart, lines: string): string {
  const line = text.slice(page.line.start, page.line.end)
  const after = text.slice(page.line.end)
  if (page.kind === "group" || page.form === "code" || !SPELLX_CLOSES_ITSELF.test(line)) {
    return text.slice(0, page.line.end) + lines + after
  }
  const opened = line.replace(SPELLX_CLOSES_ITSELF, ">$1")
  return `${text.slice(0, page.line.start)}${opened}${lines}${page.indent}</>\n${after}`
}

/** `text` with spellx page `name` closing on its own line, if nothing is left inside it but its closing line. */
function withPageClosedIfEmpty(text: string, name: string | undefined): string {
  const page = SiteEdits.allParts(SiteEdits.partsIn(text) ?? []).find((each) => each.name === name)
  if (!page || page.form !== "spellx" || page.parts.length) return text
  if (!/^[ \t]*<\/(?:page)?>\s*$/.test(text.slice(page.line.end, page.span.end))) return text
  const closed = text.slice(page.line.start, page.line.end).replace(/\s*>(\s*)$/, "/>$1")
  return text.slice(0, page.line.start) + closed + text.slice(page.span.end)
}

/** `text` without page `name`'s own declaration, `<page "x">` or `a "x" is a page`, and the blank line after it. */
function withoutDeclaration(text: string, name: string): string {
  const declared = declarationOf(text, name)
  if (!declared) return text
  let end = declared.end
  if (text.slice(end).startsWith("\n")) end += 1
  return text.slice(0, declared.start) + text.slice(end)
}

/** `text` with page `name`'s own declaration naming `newName`. */
function withDeclarationRenamed(text: string, name: string, newName: string): string {
  const declared = declarationOf(text, name)
  if (!declared) return text
  const line = text.slice(declared.start, text.indexOf("\n", declared.start) + 1 || text.length)
  return (
    text.slice(0, declared.start) + line.replace(`"${name}"`, `"${newName}"`) + text.slice(declared.start + line.length)
  )
}

/** Where page `name`'s own declaration is written, with its body:  none for a page another project declares. */
function declarationOf(text: string, name: string): TextSpan | undefined {
  const quoted = JSON.stringify(name)
  const lines = linesOf(text)
  const starts = DECLARATION_WORDS.map((words) => words.replace("{name}", quoted))
  const at = lines.findIndex((line) => starts.some((start) => line.text.startsWith(start)))
  if (at < 0) return undefined
  const first = lines[at]!
  const isTag = first.text.startsWith("<")
  if (isTag && first.text.trimEnd().endsWith("/>")) {
    return { start: first.start, end: first.end }
  }
  let end = first.end
  for (const line of lines.slice(at + 1)) {
    if (isTag) {
      end = line.end
      if (new RegExp(`^<\\/(?:${PAGE_OR_VIEW})?>`).test(line.text)) break
    } else if (!line.text.trim() || /^[ \t]/.test(line.text)) end = line.end
    else break
  }
  return { start: first.start, end }
}

/** A spellx part's `line` with its address and title as given:  an attribute added, changed or taken out. */
function spellxLineWith(
  line: string,
  { address, title, tab, tags, state, thumbnail, live, row, column, color }: PartWords
): string {
  let changed = line
  for (const [word, value] of [
    ["address", address],
    ["title", title],
    ["tab", tab],
    ["tags", tags],
    ["state", state],
    ["thumbnail", thumbnail],
    ["live", live],
    ["row", row === undefined ? undefined : `${row}`],
    ["column", column === undefined ? undefined : `${column}`],
    ["color", color]
  ] as const) {
    const written = ATTRIBUTE(word).exec(changed)
    if (written && value === undefined) changed = changed.replace(` ${written[0]}`, "")
    else if (written) changed = changed.replace(written[0], `${word}=${JSON.stringify(value)}`)
    else if (value !== undefined) changed = changed.replace(/\s*(\/?>)(\s*)$/, ` ${word}=${JSON.stringify(value)}$1$2`)
  }
  return changed
}

/** What a part's line says, besides its name. */
type PartWords = {
  address?: string
  title?: string
  tab?: string
  tags?: string
  state?: string
  thumbnail?: string
  live?: string
  row?: number
  column?: number
  color?: string
}

/** What `part`'s line says now, besides its name. */
function wordsOf({ address, title, tab, tags, state, thumbnail, live, row, column, color }: SitePart): PartWords {
  return { address, title, tab, tags, state, thumbnail, live, row, column, color }
}

/** `text` as a number;  none for none. */
function numberIn(text: string | undefined): number | undefined {
  return text === undefined ? undefined : Number(text)
}

/** A code-spell part's `line` with what it says as given:  `- it has a films page at "/films", named "Films"`. */
function codeLineWith(
  line: string,
  part: SitePart,
  { address, title, tab, tags, state, thumbnail, live, row, column, color }: PartWords
): string {
  const ending = line.endsWith("\n") ? "\n" : ""
  const at = address === undefined ? "" : ` at ${JSON.stringify(address)}`
  const named = title === undefined || !address ? "" : `, named ${JSON.stringify(title)}`
  const tabbed = tab === undefined || !address ? "" : `, tab ${JSON.stringify(tab)}`
  const tagged = tags === undefined || !address ? "" : `, tagged ${JSON.stringify(tags)}`
  const stated = state === undefined || !address ? "" : `, ${state}`
  const pictured = thumbnail === undefined || !address ? "" : `, thumbnail ${JSON.stringify(thumbnail)}`
  const lived = live === undefined || !address ? "" : `, live ${JSON.stringify(live)}`
  const placed = row === undefined || column === undefined ? "" : `, in row ${row} column ${column}`
  const colored = color === undefined ? "" : `, colored ${color}`
  const name = part.isQuoted ? JSON.stringify(part.name) : part.name
  return `${part.indent}- it has ${articleOf(part.name)} ${name}${at}${named}${tabbed}${tagged}${stated}${pictured}${lived}${placed}${colored}${ending}`
}

/** `a` or `an`, for `name`. */
function articleOf(name: string): string {
  return /^[aeiou]/i.test(name) ? "an" : "a"
}

/** A spellx part's line:  `<page "films page" address="/films" title="Films">`, `<dialog "settings dialog"/>`. */
const SPELLX_PART = /^<(page|dialog|sidebar)\s+"([^"]+)"([^>]*?)\s*(\/>|>)$/

/** A spellx group's line:  `<group "Hardware"/>`. */
const SPELLX_GROUP = /^<group\s+"([^"]+)"([^>]*)\/>$/

/** A code-spell group's line:  `- group "Hardware"`. */
const CODE_GROUP = /^[ \t]+- group "([^"]+)"\s*$/

/** A code-spell part's line:  `- it has a films page at "/films", named "Films"`, `- it has a settings dialog`. */
const CODE_PART =
  /^([ \t]+)- it has an? (.+?)(?: at "([^"]*)")?(?:, named "([^"]*)")?(?:, tab "([^"]*)")?(?:, tagged "([^"]*)")?(?:, (old|new|mocked|built))?(?:, thumbnail "([^"]*)")?(?:, live "([^"]*)")?(?:, in row (\d+) column (\d+))?(?:, colou?red (\w+))?\s*$/

/** The end of a spellx tag that closes itself, `<page "x"/>`, what follows it in group 1. */
const SPELLX_CLOSES_ITSELF = /\s*\/>(\s*)$/

/** An attribute `word` in a spellx tag, its value in group 1. */
const ATTRIBUTE = (word: string) => new RegExp(`\\b${word}="([^"]*)"`)

/** A name a part may have:  it starts with a letter or number, and has no quotes or brackets;  it's often a title. */
const PART_NAME = /^[\p{L}\p{N}][^"<>{}\n]*$/u

/** A file holding a site's routing alone:  `Galaxy.site.spell`, `Galaxia.site.es.spell`. */
const ROUTING_ONLY_FILE = /\.site(?:\.[a-z]{2})?\.spell(?:ml|x)?$/

/** What starts a group's key (`SiteEdits.groupKey()`):  no name can, as a name starts with a letter or number. */
const GROUP_KEY = "#group "

/** How a page's or view's own declaration starts, in each of Spell's forms and languages. */
const DECLARATION_WORDS = [
  "<page {name}",
  "<view {name}",
  "<página {name}",
  "<pagina {name}",
  "<vista {name}",
  // their old spellings (before epic `language` P41)
  "<spell-page {name}",
  "<spell-view {name}",
  "<encanto-página {name}",
  "<encanto-vista {name}",
  "a {name} is a page",
  "a {name} is a view"
]

/** `text` safe between a tag's start and end. */
function escapeTagText(text: string): string {
  return text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll("{", "&#123;")
}
