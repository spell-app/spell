/****************
 * ### `PageChunks`
 * A built site's compiled program cut in two:  what it needs as it starts, and each page alone in its file, as a chunk
 * of its own, loaded when the page is first shown (epic `solid-2-final` P13, TLDR 45).
 * - `split(compiled)`:  the MAIN chunk, with each page chunk's lines left blank, so its source map still holds;
 *   and each page's chunk, by its page's class name.
 *   - The main chunk names them on one of those blank lines, `// spell-lazy-pages: GettingStarted,Grammar`:
 *     what the runner reads (`LazyPages`), so a host that sends the whole file (the static build) just runs it whole.
 *   - A page's chunk is its file's code, under the program's own imports:  the runner hands it the main chunk's
 *     things by name.
 * - Read from the compiled TEXT alone, by its file sections (`P.JSWriter.FILE_SEPARATOR`):  no parse, so the page
 *   server cuts a built file as it serves it.
 * - A file is a page's chunk only when nothing else could need it before it's shown:
 *   - it declares exactly ONE page (`export class Home extends Page`), and no other file names anything it exports
 *     (a page shown by its class's name, the site's `page: "Home"`, is fine:  the site asks before it shows one)
 *   - and no dialog or sidebar of the site draws a view it exports, named in the site's `view: "AddAssetDialog"`:
 *     the site makes that view as it opens, from any page, asking nobody first
 *   - it starts nothing (`if (!core.isCarryingOver) ...`) and imports nothing
 *   - so the first cut is by file:  a page sharing its file with another page stays in the main chunk
 * - The editor's live run stays ONE module:  carrying things over and the Thing Explorer want every class.
 * - A site compiled page by page (epic `editor` P46) uses the same shapes, from a compile of part of the site:
 *   - `withLazyPages(frame, names)`:  the FRAME, the site compiled without its pages alone in their files
 *     (`SpellProject.pagesInPlay` empty), marked with every one of them, so the runner loads each as its main chunk's
 *   - `chunkOfPage(compiled, className)`:  one page's chunk, out of a compile with that page in play
 *   - which files stand alone is then the language's own rule, read from each file's text before it parses
 *     (`SpellProject.headFor()`), not the cut above
 * - Pure, plain text:  imports nothing.
 ****************/
export class PageChunks {
  /**
   * `compiled`, cut:  its main chunk, and each page's chunk by its class.
   * - Nothing to cut (no page alone in its file):  `compiled` as it is, and no pages.
   */
  static split(compiled: string): { main: string; pages: Map<string, string> } {
    const mapAt = compiled.search(SOURCE_MAP_LINE)
    const [code, map] = mapAt >= 0 ? [compiled.slice(0, mapAt), compiled.slice(mapAt)] : [compiled, ""]
    const sections = code.split(FILE_SEPARATOR)
    const imports = code.match(IMPORT_LINES)?.join("\n") ?? ""
    const names = sections.map((section) => wordsIn(section))
    const overlayViews = new Set([...code.matchAll(OVERLAY_VIEW)].map(([, name]) => name!))
    const pages = new Map<string, string>()
    const cut = new Set<number>()
    sections.forEach((section, at) => {
      const page = PageChunks.pageIn(section)
      if (!page) return
      const exported = [...section.matchAll(EXPORTED_NAME)].map(([, , name]) => name!)
      const namedElsewhere = exported.some(
        (name) => overlayViews.has(name) || names.some((words, other) => other !== at && words.has(name))
      )
      if (namedElsewhere) return
      pages.set(page, `${imports}\n${section}`)
      cut.add(at)
    })
    if (!pages.size) return { main: compiled, pages }
    let marked = false
    const main = sections
      .map((section, at) => {
        if (!cut.has(at)) return section
        // its lines left blank, so the source map still holds;  the first one cut names them all
        const blank = "\n".repeat(section.split("\n").length - 1)
        if (marked) return blank
        marked = true
        return `${LAZY_PAGES_MARK}${[...pages.keys()].join(",")}${blank}`
      })
      .join(FILE_SEPARATOR)
    return { main: main + map, pages }
  }

  /**
   * `frame` marked as the main chunk of a site whose pages `names` each come as a chunk of their own:
   * `frame` as it is when `names` is empty.
   * - The mark goes after the code, before the source map's line:  no line above it moves, so the map still holds.
   */
  static withLazyPages(frame: string, names: Iterable<string>): string {
    const list = [...names]
    if (!list.length) return frame
    const mark = `${LAZY_PAGES_MARK}${list.join(",")}\n`
    const mapAt = frame.search(SOURCE_MAP_LINE)
    if (mapAt < 0) return `${frame.endsWith("\n") ? frame : `${frame}\n`}${mark}`
    return frame.slice(0, mapAt) + mark + frame.slice(mapAt)
  }

  /**
   * The chunk of page `className` out of `compiled`, a compile with that page in play:  its file's code, under the
   * program's imports, as `split()` cuts one;  `undefined` when no file of `compiled` declares that page.
   */
  static chunkOfPage(compiled: string, className: string): string | undefined {
    const mapAt = compiled.search(SOURCE_MAP_LINE)
    const code = mapAt >= 0 ? compiled.slice(0, mapAt) : compiled
    const imports = code.match(IMPORT_LINES)?.join("\n") ?? ""
    for (const section of code.split(FILE_SEPARATOR)) {
      const declared = [...section.matchAll(PAGE_CLASS)].some(([, name]) => name === className)
      if (!declared) continue
      // the first file holds the program's imports too:  the chunk gets them once
      const own = section.replace(IMPORT_LINES, "").replace(/^\n+/, "")
      return `${imports}\n${own}`
    }
    return undefined
  }

  /**
   * The class of the ONE page `section` declares, when it could be a chunk of its own;  `undefined` otherwise:
   * none, two, or a file that starts something or imports something.
   */
  private static pageIn(section: string): string | undefined {
    if (START_LINE.test(section) || /^import\b/m.test(section)) return undefined
    const pages = [...section.matchAll(PAGE_CLASS)]
    return pages.length === 1 ? pages[0]![1] : undefined
  }
}

/** Every word that could be a name in `code`, its text and comments left out:  what another file may need of one. */
function wordsIn(code: string): Set<string> {
  const bare = code.replace(STRINGS_AND_COMMENTS, " ")
  return new Set(bare.match(NAME) ?? [])
}

/** Between each file's code in compiled javascript:  `P.JSWriter.FILE_SEPARATOR`, a copy (no parser here). */
const FILE_SEPARATOR = "\n// -----------\n"

/** What starts the main chunk's line naming its pages' chunks:  `LazyPages` (the runner's) reads it. */
export const LAZY_PAGES_MARK = "// spell-lazy-pages: "

/** Where the program's source map line starts. */
const SOURCE_MAP_LINE = /^\/\/# sourceMappingURL=/m

/** Each import line, as the compiler writes them. */
const IMPORT_LINES = /^import\s*\{[^}]*\}\s*from\s*"[^"]+";?[ \t]*$/gm

/** A page's class:  `export class Home extends Page`. */
const PAGE_CLASS = /^export class ([\p{L}_$][\p{L}\p{N}_$]*) extends Page\b/gmu

/** A site's dialog or sidebar, naming the view it draws:  `{ name: "add asset dialog", view: "AddAssetDialog" }`. */
const OVERLAY_VIEW = /\bview: "([\p{L}_$][\p{L}\p{N}_$]*)"/gu

/** A declaration exported on its own line:  its kind, then its name. */
const EXPORTED_NAME = /^export\s+((?:async\s+)?function\*?|class|const|let|var)\s+([\p{L}_$][\p{L}\p{N}_$]*)/gmu

/** A line of the program's start:  `if (!core.isCarryingOver) game.start()`. */
const START_LINE = /^if \(!core\.isCarryingOver\) /m

/** A name, as javascript spells one. */
const NAME = /[\p{L}_$][\p{L}\p{N}_$]*/gu

/** Text in quotes or backticks, and comments:  what can't be a name. */
const STRINGS_AND_COMMENTS = /"(?:[^"\\\n]|\\.)*"|'(?:[^'\\\n]|\\.)*'|`(?:[^`\\]|\\.)*`|\/\/[^\n]*|\/\*[\s\S]*?\*\//g
