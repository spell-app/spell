import { CODE_SITE, declaresSite } from "spell/app/spaces/models/siteFiles"

/****************
 * ### `SiteEdits`
 * A site's program, changed by what a person did rather than typed (epic `mockup` P2):
 * a new page, made where an address had none.
 * - Plain text in, text out:  it loads no parser, so it's tested in node, and the editor applies the result as one
 *   step of its history (`RunSite.createPage()`).
 * - A site may be its routing alone, `X.site.spell`, each page in a file of its own (epic `mockup` P17):
 *   a page's name is then its title, and `group` lines head its board's sections.
 * - It reads a site as plain Spell writes it, `galaxy guide is a site:`, its lines bare (epic `language` P46) or bulleted.
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
   * - `HarborNew.site.spell`;  in another language, `Sitio.site.es.spell`.
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
    const title = part.title ?? part.name
    const quoted = JSON.stringify(part.name)
    const heading = escapeTagText(title)
    // a page in plain Spell (epic `language` P45):  its plain head, its body what it draws
    if (part.kind === "page") {
      const head = language === "es" ? `${quoted} es una página` : `${quoted} is a page`
      return `${head}\n\t<header size="large">${heading}</header>\n`
    }
    // a dialog's or sidebar's view, in plain Spell (epic `language` P47)
    const head =
      language === "es" ? `una ${quoted} es una vista:\n\tpara dibujarla:` : `a ${quoted} is a view:\n\tto draw it:`
    return `${head}\n\t\t<header size="medium">${heading}</header>\n`
  }

  /**
   * `text`, a file declaring a site, with a page `name` added:
   * declared just before the site, and listed in it, last, at `address`.
   * - `a "tatooine page" is a page`, then `it has a tatooine page at "/planets/tatooine"` in the site
   * - Indented as the file is:  with tabs, or with what its site's first part is indented by.
   * - `listOnly`:  only its line in the site, for a site whose pages are each in a file of their own (`isRoutingOnly()`)
   * - throws `TypeError` when `text` declares no site
   */
  static withPageAdded(text: string, name: string, address: string, options: { listOnly?: boolean } = {}): string {
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
   * (`a "x" is a page`), when this file has one.
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
    // a bare name that can't stay bare is quoted:  `it has a "Boxes & Blades" at ...`
    const renamedLine = part.isQuoted ? line.replace(name, wanted) : line.replace(name, writtenName(wanted))
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
    const changed = codeLineWith(line, part, said)
    return text.slice(0, part.line.start) + changed + text.slice(part.line.end)
  }

  /**
   * Where page `name`'s own declaration is written in `text`, with its body:
   * `a "x" is a page:` and its lines, or a page's head, `"x" is a page`.
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
   * - A line of its body, `its thumbnail is "..."`.
   * - A site's `button usage page` may be declared as `button usage`:  either name finds it.
   */
  static thumbnailOf(text: string, name: string): string | undefined {
    if (!text.includes("thumbnail")) return undefined
    for (const each of [name, name.replace(/ page$/, "")]) {
      const declared = declarationOf(text, each)
      if (declared) return THUMBNAIL_LINE.exec(text.slice(declared.start, declared.end))?.[1]
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
    const changed = codeLineWith(line, part, said)
    return text.slice(0, part.line.start) + changed + text.slice(part.line.end)
  }

  /**
   * `text` with the part `name`, and its pages, moved to `place`.
   * - `before` or `after` another part:  at that part's depth, `after` going below that part's own pages too.
   * - `into` a page:  its first page, whether or not it has any yet.
   * - A page's address stays as it's written, wherever it moves.
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
    const moving = withLineBreak(text.slice(part.span.start, part.span.end))
    const taken = withLineBreak(text.slice(0, part.span.start) + text.slice(part.span.end))
    const without = taken
    const there = SiteEdits.allParts(SiteEdits.partsIn(without) ?? []).find((each) => each.name === target.name)!
    if (place.where === "into") return withPartInside(without, there, reindent(moving, part.indent, indentUnder(there)))
    const at = place.where === "before" ? there.line.start : there.span.end
    return without.slice(0, at) + reindent(moving, part.indent, there.indent) + without.slice(at)
  }

  /** `text` with a page added to the site whose line starts at `start`. */
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
    const listed = `${indent}it has ${articleFor(name)} ${writtenName(name)} at ${JSON.stringify(address)}\n`
    const tail = text.slice(end)
    return `${text.slice(0, start)}${declared}${opened}\n${body}${body && !body.endsWith("\n") ? "\n" : ""}${listed}${tail}`
  }
}

/** `a` or `an`, for `name`. */
function articleFor(name: string): string {
  return /^[aeiou]/i.test(name) ? "an" : "a"
}

/**
 * `name` as a site's line writes it:  bare when it's lowercase words, `films page`;
 * else quoted, as a title is (`"My Inbox"`, `"Boxes & Blades"`), which the language reads as any name.
 */
function writtenName(name: string): string {
  return BARE_NAME.test(name) ? name : JSON.stringify(name)
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
  /** A page's or group's icon in the site's navigation, if its line says:  `film` (epic `mockup` T34, I20). */
  icon?: string
  /** A page's state, if its line says:  `old`, `new`, `mocked` or `built` (epic `mockup` P13, T14). */
  state?: string
  /** A thumbnail of a page, a file of the project:  `snapshots/films.png`. */
  thumbnail?: string
  /** The real page it stands for, on the live site:  what its card's new-tab icon opens. */
  live?: string
  /** A page drawn without the site's top bar, when its line says `, no top bar` (epic `mockup` T35). */
  noTopBar?: boolean
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
  /** Its name is written in quotes:  `it has a "films page" at "/films"`. */
  isQuoted?: boolean
  /** Its line's bullet, `- `, as an older writer wrote it:  kept when its line is written again. */
  bullet?: string
  /** The parts under it, as the side navigation nests them. */
  parts: SitePart[]
  /** How deep it is:  0 for the site's own parts. */
  depth: number
  /** Its own line, its line break included. */
  line: TextSpan
  /** Its line and every line of its parts. */
  span: TextSpan
  /** What its line starts with:  its indent, tabs or spaces. */
  indent: string
}

/** What a site's part is:  a page, a dialog, a sidebar, a group, or its top bar (`it has a top bar`, epic `mockup` T35). */
export type SitePartKind = "page" | "dialog" | "sidebar" | "group" | "topBar"

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
  if (/^(?:top|app) bar$/.test(name)) return "topBar"
  if (/\b(?:dialog|modal)$/.test(name)) return "dialog"
  if (/\b(?:sidebar|flyout)$/.test(name)) return "sidebar"
  return "page"
}

/** A `group` line as a part:  the lines after it, up to the next group, are its `parts`. */
function groupPart(title: string, line: TextLine, color?: string, icon?: string): SitePart {
  return {
    kind: "group",
    name: SiteEdits.groupKey(title),
    title,
    color,
    ...(icon && { icon }),
    parts: [],
    depth: 0,
    line: { start: line.start, end: line.end },
    span: { start: line.start, end: line.end },
    indent: /^[ \t]*/.exec(line.text)![0]
  }
}

/** The parts of a site, whose line starts at `start`. */
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
      group = groupPart(heading[1]!, line, heading[2] ?? heading[3], heading[4])
      top.push(group)
      continue
    }
    const written = CODE_PART.exec(line.text)
    if (!written) continue
    const [
      ,
      indent,
      bullet,
      written_name,
      address,
      title,
      icon,
      tab,
      tags,
      state,
      thumbnail,
      live,
      noTopBar,
      row,
      column,
      color
    ] = written
    const isQuoted = /^".*"$/.test(written_name!)
    const name = isQuoted ? written_name!.slice(1, -1) : written_name!
    while (open.length && open.at(-1)!.indent.length >= indent!.length) open.pop()
    const part: SitePart = {
      kind: kindOfName(name),
      name,
      address,
      title,
      icon,
      tab,
      tags,
      state,
      thumbnail,
      live,
      ...(noTopBar && { noTopBar: true }),
      row: numberIn(row),
      column: numberIn(column),
      color,
      isQuoted,
      ...(bullet ? { bullet } : {}),
      parts: [],
      depth: open.length + (group ? 1 : 0),
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

/** `text` with `lines` as page `page`'s first page. */
function withPartInside(text: string, page: SitePart, lines: string): string {
  return text.slice(0, page.line.end) + lines + text.slice(page.line.end)
}

/** `text` without page `name`'s own declaration, `a "x" is a page`, and the blank line after it. */
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
  // its name quoted, or bare at its line's start:  `films page is a page:`
  const renamed = line.includes(`"${name}"`)
    ? line.replace(`"${name}"`, JSON.stringify(newName))
    : line.replace(name, writtenName(newName))
  return text.slice(0, declared.start) + renamed + text.slice(declared.start + line.length)
}

/** Where page `name`'s own declaration is written, with its body:  none for a page another project declares. */
function declarationOf(text: string, name: string): TextSpan | undefined {
  const quoted = JSON.stringify(name)
  const lines = linesOf(text)
  const starts = DECLARATION_WORDS.map((words) => words.replace("{name}", quoted).replace("{bare}", name))
  const at = lines.findIndex((line) => starts.some((start) => line.text.startsWith(start)))
  if (at < 0) return undefined
  const first = lines[at]!
  let end = first.end
  for (const line of lines.slice(at + 1)) {
    if (!line.text.trim() || /^[ \t]/.test(line.text)) end = line.end
    else break
  }
  return { start: first.start, end }
}

/** What a part's line says, besides its name. */
type PartWords = {
  address?: string
  title?: string
  icon?: string
  tab?: string
  tags?: string
  state?: string
  thumbnail?: string
  live?: string
  noTopBar?: boolean
  row?: number
  column?: number
  color?: string
}

/** What `part`'s line says now, besides its name. */
function wordsOf({
  address,
  title,
  icon,
  tab,
  tags,
  state,
  thumbnail,
  live,
  noTopBar,
  row,
  column,
  color
}: SitePart): PartWords {
  return { address, title, icon, tab, tags, state, thumbnail, live, noTopBar, row, column, color }
}

/** `text` as a number;  none for none. */
function numberIn(text: string | undefined): number | undefined {
  return text === undefined ? undefined : Number(text)
}

/** A part's `line` with what it says as given:  `it has a films page at "/films", named "Films"`. */
function codeLineWith(
  line: string,
  part: SitePart,
  { address, title, icon, tab, tags, state, thumbnail, live, noTopBar, row, column, color }: PartWords
): string {
  const ending = line.endsWith("\n") ? "\n" : ""
  const at = address === undefined ? "" : ` at ${JSON.stringify(address)}`
  const named = title === undefined || !address ? "" : `, named ${JSON.stringify(title)}`
  const iconed = icon === undefined || !address ? "" : `, icon ${JSON.stringify(icon)}`
  const tabbed = tab === undefined || !address ? "" : `, tab ${JSON.stringify(tab)}`
  const tagged = tags === undefined || !address ? "" : `, tagged ${JSON.stringify(tags)}`
  const stated = state === undefined || !address ? "" : `, ${state}`
  const pictured = thumbnail === undefined || !address ? "" : `, thumbnail ${JSON.stringify(thumbnail)}`
  const lived = live === undefined || !address ? "" : `, live ${JSON.stringify(live)}`
  const barless = noTopBar && address ? ", no top bar" : ""
  const placed = row === undefined || column === undefined ? "" : `, in row ${row} column ${column}`
  const colored = color === undefined ? "" : `, colored ${color}`
  const name = part.isQuoted ? JSON.stringify(part.name) : part.name
  return `${part.indent}${part.bullet ?? ""}it has ${articleOf(part.name)} ${name}${at}${named}${iconed}${tabbed}${tagged}${stated}${pictured}${lived}${barless}${placed}${colored}${ending}`
}

/** `a` or `an`, for `name`. */
function articleOf(name: string): string {
  return /^[aeiou]/i.test(name) ? "an" : "a"
}

/**
 * A site's group line:  `group "Hardware"`;  bulleted by an older writer, `- group "Hardware"`.
 * - Its section's colour after it, in any of the language's forms (epic `language` T112):
 *   `, color yellow`, `with color yellow`, `, colored yellow`
 * - Then its icon in the site's navigation, if it names one:  `, icon "microchip"` (epic `mockup` I20)
 */
const CODE_GROUP =
  /^[ \t]+(?:- )?group "([^"]+)"(?:(?:,| with) colou?r (\w+)|, colou?red (\w+))?(?:, icon "([^"]*)")?\s*$/

/**
 * A site's part line:  `it has a films page at "/films", named "Films"`, `it has a settings dialog`;
 * bulleted by an older writer, `- it has ...`.
 */
const CODE_PART =
  /^([ \t]+)(- )?it has an? (.+?)(?: at "([^"]*)")?(?:, named "([^"]*)")?(?:, icon "([^"]*)")?(?:, tab "([^"]*)")?(?:, tagged "([^"]*)")?(?:, (old|new|mocked|built))?(?:, thumbnail "([^"]*)")?(?:, live "([^"]*)")?(?:, (no top bar))?(?:, in row (\d+) column (\d+))?(?:, colou?red (\w+))?\s*$/

/** A name a part may have:  it starts with a letter or number, and has no quotes or brackets;  it's often a title. */
const PART_NAME = /^[\p{L}\p{N}][^"<>{}\n]*$/u

/** A file holding a site's routing alone:  `Galaxy.site.spell`, `Galaxia.site.es.spell`. */
const ROUTING_ONLY_FILE = /\.site(?:\.[a-z]{2})?\.spell$/

/** What starts a group's key (`SiteEdits.groupKey()`):  no name can, as a name starts with a letter or number. */
const GROUP_KEY = "#group "

/** A body's thumbnail line, `its thumbnail is "x.jpg"`;  bulleted by an older writer, `- its thumbnail is ...`. */
const THUMBNAIL_LINE = /^[ \t]+(?:- )?its thumbnail is "([^"]*)"/m

/** A name a site's line writes bare:  lowercase words, `films page`. */
const BARE_NAME = /^[\p{Ll}\p{N}][\p{Ll}\p{N}-]*(?: [\p{Ll}\p{N}-]+)*$/u

/** How a page's or view's own declaration starts, in each language. */
const DECLARATION_WORDS = [
  "a {name} is a page",
  "a {name} is a view",
  // a dialog's or sidebar's view as `stubFor()` writes it in Spanish
  "una {name} es una vista",
  "un {name} es una vista",
  // a page's plain head (epic `language` P45)
  "{name} is a page",
  "{name} is a notebook page",
  "{name} es una página",
  // a page as code spell writes one, by its bare name:  `films page is a page:`
  "{bare} is a page",
  "{bare} is a view",
  "{bare} es una página",
  "{bare} es una vista"
]

/** `text` safe between a tag's start and end. */
function escapeTagText(text: string): string {
  return text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll("{", "&#123;")
}
