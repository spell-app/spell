import type { ChunkFormat, ChunkList } from "spell/util/places/ChunkedPlace"
import type { PlaceRow } from "spell/util/places/places.types"

/** The parts folder, beside the skeleton:  `epics/<name>/parts/`. */
export const PARTS_DIR = "parts"

/** A part file's extension:  a part is told from a page by its folder (`PlanParts`'s banner). */
export const PART_EXT = ".html"

/** A part's `source`, as a skeleton writes it:  `parts/<id>.html`, `id` a section's or item's. */
export const PART_SOURCE = /^parts\/([\w-]+)\.html$/

/** The field of a row holding its element's tag. */
const TAG_FIELD = "tag"

/** The field of a whole row holding its body:  a part file's text. */
const BODY_FIELD = "html"

/** What the list reads of a skeleton:  the elements that host a body, or take a mark (`ReviewInbox.itemIds()`). */
const LISTED_TAGS =
  /<(epic-item|epic-section|epic-phase|epic-summary|epic-page|epic-change|epic-update|epic-choices)\b[^>]*>/g

/** One attribute of an opening tag, in order:  `name`, or `name="value"`. */
const ATTRIBUTE = /\s([\w:-]+)(?:="([^"]*)")?/g

/** Which fields a row holds, besides its id:  its tag, and the attributes anything reads of one. */
const SUMMARY_FIELDS = [
  TAG_FIELD,
  "kind",
  "source",
  "part-ids",
  "status",
  "to-accept",
  "to-see",
  "stage",
  "standing",
  "closed",
  "seen",
  "accepted"
] as const

/****************
 * ### `EpicPageFormat`
 * What an epic page looks like as a `ChunkedPlace` (epic `data` P6):  its LIST is its skeleton, a thing's BODY its part file.
 *
 * ```ts
 * const place = PlanParts.placeOf("/x/epics/seo/seo.plan.html")
 * await place.list("seo.plan.html", {})                       // the skeleton alone:  a row per item, phase ...
 * await place.bodyOf("seo.plan.html", "q1")                   // parts/q1.html alone:  { html }
 * ```
 *
 * - A collection is the page's file name, in a store rooted at the page's own folder, so an address never climbs:
 *   the same two addresses in a folder (`ChunkFiles`) and on a page server (`WebChunks`).
 * - The disk stays as it was:  this only reads it, and the addresses are the `source`s a skeleton already writes.
 * - READ ONLY (no `listText`, `bodyText`):  the place says `write: "none"`.
 *   The tool edits a whole page under its lock, and writes the files through `ChunkFiles` (`PlanDocFiles.writeDoc()`):
 *   not one change per edit, on purpose (epic `data` J13).
 * - Bare text, no DOM:  as `ReviewInbox.itemIds()` always read a page, cheap for every mark.
 *   - A row's attributes are as the skeleton writes them, entities not decoded.
 *   - It relies on what the tool writes:  `>` in an attribute is written `&gt;` (`PlanMarkup.escapeAttributes()`).
 * - Position in the import graph:  imports types only, so a page's pack takes it (`EpicBodies`) as node does:  the ONE file
 *   of `tool/` in the pack.  What knows about splitting, hosts and links stays in `EpicParts` and `PlanParts`.
 ****************/
export class EpicPageFormat implements ChunkFormat {
  /** An element's id. */
  readonly idOf = "id"

  /** The skeleton:  the page's own file. */
  listAddress(page: string): string {
    return encodeURIComponent(page)
  }

  /** A part file, beside the skeleton. */
  bodyAddress(_page: string, id: string): string {
    return `${PARTS_DIR}/${encodeURIComponent(id)}${PART_EXT}`
  }

  /** What a row holds:  anything else takes a body. */
  summaryFields(): readonly string[] {
    return SUMMARY_FIELDS
  }

  /**
   * Every element of `LISTED_TAGS` in a skeleton's text, in page order:  its tag and every attribute.
   * - One with no id (`<epic-page>`, `<epic-summary>`) has none in its row:  nothing finds it by id.
   * - A boolean attribute is `""`.
   * - Reads a page in one file too:  whatever's in the text.
   */
  listIn(text: string): ChunkList {
    return { rows: Array.from(text.matchAll(LISTED_TAGS), ([tag, name]) => rowOf(tag, name!)) }
  }

  /** A part file's text, as it is. */
  bodyIn(text: string): PlaceRow {
    return { [BODY_FIELD]: text }
  }

  /** Only what names a `source` has a part:  the rest is read for nothing. */
  hasBody(summary: PlaceRow): boolean {
    return Boolean(summary.source)
  }

  /** The text a read of a body found (`bodyIn()`). */
  static textOf(body: PlaceRow | undefined): string | undefined {
    return body?.[BODY_FIELD] as string | undefined
  }

  /** The tag of `row`. */
  static tagOf(row: PlaceRow): string {
    return row[TAG_FIELD] as string
  }

  /** The part id a `source` names (`parts/q1.html` => `q1`);  `undefined` for any other. */
  static partIdOf(source: string): string | undefined {
    return PART_SOURCE.exec(source)?.[1]
  }
}

/** One opening tag as a row. */
function rowOf(tag: string, name: string): PlaceRow {
  const row: PlaceRow = { [TAG_FIELD]: name }
  for (const [, attribute, value] of tag.slice(name.length + 1).matchAll(ATTRIBUTE)) {
    if (!(attribute! in row)) row[attribute!] = value ?? ""
  }
  // an empty id is none, or `idOfRow()` would take it for one
  if (row.id === "") delete row.id
  return row
}
