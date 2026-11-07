/****************
 * ### `SiteEdits`
 * A site's program, changed by what a person did rather than typed (epic `mockup` P2):  a new page, made where an
 * address had none.
 * - Plain text in, text out:  it loads no parser, so it's tested in node, and the editor applies the result as one
 *   step of its history (`RunSite.createPage()`).
 * - It reads both of Spell's forms:  spellx's `<spell-site>`, and code spell's `galaxy guide is a site:`.
 * - Static and instance-free on purpose:  it holds nothing, and every caller has its own text.
 ****************/
export class SiteEdits {
  /**
   * The words of a new page at `address`, from its last part that isn't a parameter:  `/planets/tatooine` =>
   * `tatooine page`;  `/` => `home page`.
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
    const name = `${words} page`
    if (!taken.includes(name)) return name
    let number = 2
    while (taken.includes(`${name} ${number}`)) number++
    return `${name} ${number}`
  }

  /** Does `text` declare a site, in either form? */
  static hasSite(text: string): boolean {
    return SPELLX_SITE.test(text) || CODE_SITE.test(text)
  }

  /**
   * `text`, a file declaring a site, with a page `name` added:  declared just before the site, and listed in it, last,
   * at `address`.
   * - spellx:  `<spell-page "tatooine page"/>`, then `<page "tatooine page" address="/planets/tatooine"/>`
   * - code spell:  `a "tatooine page" is a page`, then `- it has a tatooine page at "/planets/tatooine"`
   * - Indented as the file is:  with tabs, or with what its site's first part is indented by.
   * - throws `TypeError` when `text` declares no site, or its `<spell-site>` closes on its own line (`<spell-site .../>`)
   */
  static withPageAdded(text: string, name: string, address: string): string {
    const spellx = SPELLX_SITE.exec(text)
    if (spellx) return SiteEdits.addedToSpellx(text, spellx.index, name, address)
    const code = CODE_SITE.exec(text)
    if (code) return SiteEdits.addedToCode(text, code.index, name, address)
    throw new TypeError("SiteEdits.withPageAdded():  this file declares no site;  pass the one that does")
  }

  /** `text` with a page added to the `<spell-site>` opening at `start`. */
  private static addedToSpellx(text: string, start: number, name: string, address: string): string {
    const close = CLOSING_TAG.exec(text.slice(start))
    if (!close) {
      throw new TypeError("SiteEdits.withPageAdded():  its <spell-site> has no closing line;  write </> under it")
    }
    const end = start + close.index
    const indent = /\n([ \t]+)</.exec(text.slice(start, end))?.[1] ?? "\t"
    const listed = `${indent}<page ${JSON.stringify(name)} address=${JSON.stringify(address)}/>\n`
    const declared = `<spell-page ${JSON.stringify(name)}/>\n\n`
    return text.slice(0, start) + declared + text.slice(start, end) + listed + text.slice(end)
  }

  /** `text` with a page added to the code-spell site whose line starts at `start`. */
  private static addedToCode(text: string, start: number, name: string, address: string): string {
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
    const declared = `a ${JSON.stringify(name)} is a page\n`
    const listed = `${indent}- it has ${articleFor(name)} ${name} at ${JSON.stringify(address)}\n`
    const tail = text.slice(end)
    return `${text.slice(0, start)}${declared}${opened}\n${body}${body && !body.endsWith("\n") ? "\n" : ""}${listed}${tail}`
  }
}

/** Where a spellx site starts:  `<spell-site "galaxy guide">`. */
const SPELLX_SITE = /^<spell-site\b/m

/** Where a code-spell site starts:  `galaxy guide is a site:`, `... is a site at "owen@spell/galaxy":`. */
const CODE_SITE = /^\S.* is an? site\b.*$/m

/** A closing line at the file's left edge:  the end of a top-level tag, `</>` or `</spell-site>`. */
const CLOSING_TAG = /^<\/(?:spell-site)?>/m

/** `a` or `an`, for `name`. */
function articleFor(name: string): string {
  return /^[aeiou]/i.test(name) ? "an" : "a"
}
