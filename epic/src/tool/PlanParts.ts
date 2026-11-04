import { dirname, posix } from "node:path"

import { ChunkedPlace } from "spell/util/places/ChunkedPlace"
import { SRV } from "spell/server"
// By file:  the barrel brings every place and their server, which an `epic` command doesn't need
import { ChunkFiles } from "spell/server/places/ChunkFiles"

import { EpicPageFormat, PART_EXT, PARTS_DIR, PART_SOURCE } from "./EpicPageFormat"

export { PART_EXT, PARTS_DIR, PART_SOURCE }

/****************
 * ### `PlanParts`
 * An epic page in PARTS (epic `claude-design`, P3):  a SKELETON, `epics/<name>/<name>.plan.html`, plus one BODY file
 * per bulky section or item, `epics/<name>/parts/<id>.html`, which the page loads the first time it's opened.  Rules:
 * `PLAN-DOC.md` beside this, "Parts".
 * - the parts' FILES and URLS:  where a part lives (`partFile()`), reading one (`reader()`), the few relative URLs a
 *   body still holds rebased to `parts/` and back (`rebase()`), formatting (`formatHTML()`)
 *   - the files are the kit's chunked files' (`ChunkFiles`, epic `data` P6), as `EpicPageFormat` says where they are:
 *     `partFile()` and `reader()` call through, and `PlanDocFiles.writeDoc()` writes through it
 *   - a page's place, for what needs only its list:  `placeOf()`
 *   - every other link is a ROOT PATH (epic `epic-engine` P46), the same text in a part as in its page:  only a
 *     page's links into its own folder stay relative (Owen's Q1), and a part's own `parts/` siblings
 * - `EpicParts` beside this splits and assembles a doc on them;  so does the converter (`spell-epic/convert`), whose
 *   first pass also assembles a doc in the old markup (`OldParts`)
 * - a part is told from a page by its FOLDER, `parts/`:  every page walker skips it (`pages.js` `findPages()`:  the
 *   `docs index`, `docs update`;  `relocate.js`;  `spell ssr`), so a part is never taken for a page (Q12)
 * - `.html` only:  the `.htm` of a doc split before Q12 is read no more (epic `epic-components` P15:  every doc was
 *   converted, and its parts written `.html`, at P12)
 * - STATIC:  every helper works on paths, URLs or the element it's given, never a document of its own
 * - Node only (`node:fs`, oxfmt through `spell/server`):  NOT in the `spell-epic` barrel, imported by path.
 ****************/
export class PlanParts {
  ////////////////
  // ## URLs
  ////////////////

  /**
   * Rewrite every relative URL in `element` (itself included) with `change`:  `URL_ATTRIBUTES` only, never a
   * `#hash`, an absolute URL (`https:`, `mailto:`), a root path (`/x`) or an empty one.
   * - a pure rewrite of any element
   */
  static rebase(element: Element, change: (url: string) => string): void {
    for (const node of [element, ...element.querySelectorAll("*")])
      for (const name of URL_ATTRIBUTES) {
        const value = node.getAttribute(name)
        if (value === null || !isRelative(value)) continue
        node.setAttribute(name, change(value))
      }
  }

  /**
   * A page-relative URL as a part of the page served from `folder` (its root path, `/epics/seo/`) holds it:
   * `parts/y` -> `y` (`parts/` itself -> `./`);  any other, the page's own folder's (`x.png`, `requests/r3/a.png`) -> its root path,
   * `/epics/seo/x.png` (epic `epic-engine` P46:  from `parts/` it would climb, and a link never does)
   * - one that climbs above the root (none should, after the linker), or no `folder` (a test's doc):  `../` more, as
   *   before P46
   * - pure;  the callback `rebase()` takes
   */
  static toPartFrom(folder?: string): (url: string) => string {
    return (url) => {
      // the parts folder itself:  the part's own folder, `./` (an empty href would be the part's own page)
      if (url.startsWith(`${PARTS_DIR}/`)) return url.slice(PARTS_DIR.length + 1) || "./"
      // from the root without its slash, so one that climbs above it says so (`../x`), never clamped to `/x`
      const rooted = folder === undefined ? ".." : posix.normalize(`${folder.replace(/^\/|\/?$/g, "")}/${url}`)
      return rooted.startsWith("..") ? `../${url}` : `/${rooted}`
    }
  }

  /**
   * A part-relative URL as the page sees it:  `y` -> `parts/y`;  `../x` -> `x`.
   * - reads a part written before epic `epic-engine` P46 too, whose links climb from `parts/`;  a root path, which
   *   every link is since, isn't relative and is never rebased
   */
  static toPage = (url: string): string => (url.startsWith("../") ? url.slice(3) : `${PARTS_DIR}/${url}`)

  ////////////////
  // ## Files
  ////////////////

  /** The file of part `id` of the skeleton at `file`:  `<folder>/parts/<id>.html`. */
  static partFile(file: string, id: string): string {
    return ChunkFiles.bodyFile(file, id, PART_FILES)
  }

  /** The part files of the skeleton at `file`, as a reader:  `id` -> its text, or `undefined`. */
  static reader(file: string): PartReader {
    return ChunkFiles.reader(file, PART_FILES)
  }

  /**
   * The epic page at `file` as a place:  its collection is the page's file name.
   * - `list()` reads the skeleton alone, no body:  what a mark checks against (`ReviewInbox.itemIdsOf()`)
   * - read only:  edits go through `PlanDocFiles.edit()`, under its lock (epic `data` J13)
   */
  static placeOf(file: string): ChunkedPlace {
    return new ChunkedPlace({ store: new ChunkFiles({ root: dirname(file) }), format: new EpicPageFormat() })
  }

  /**
   * `html` formatted as `vp fmt` would format the file at `file` (its extension picks the parser), in this
   * process:  `spell/server`'s `formatHTML()`.  Throws on a parse error.
   */
  static formatHTML(file: string, html: string): Promise<string> {
    return SRV.formatHTML(file, html)
  }
}

/** Part `id`'s text, `undefined` when there's no such part. */
export type PartReader = (id: string) => string | undefined

/** Where a skeleton's parts are, to the chunked files. */
const PART_FILES = { folder: PARTS_DIR, ending: PART_EXT }

/** A file name in `parts/` that's a part:  `[, id]`. */
export const PART_FILE = /^([\w-]+)\.html$/

/** The comment a part file starts with (`EpicParts` writes it):  stripped when assembling. */
export const PART_COMMENT = /^\s*plan-doc part\b/

/** URL attributes `SourceMarkup` rewrites against a body's `source` (`URL_ATTRIBUTES` in `spell-ui` elements). */
const URL_ATTRIBUTES = ["href", "src", "action", "poster", "source"]

/** Is `url` relative to the document it's in (not empty, a hash, absolute, or from the root)? */
function isRelative(url: string): boolean {
  return url !== "" && !url.startsWith("#") && !url.startsWith("/") && !/^[a-z][a-z0-9+.-]*:/i.test(url)
}
