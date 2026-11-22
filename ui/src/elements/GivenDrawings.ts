import { E } from "spell/ui/core"

/****************
 * ### `GivenDrawings`
 * Drawings a page server drew ahead, for the elements that would otherwise draw them in the page:
 * `<ui-mermaid-diagram>`'s diagrams, `<ui-code>`'s colours (so `<spell-code>`'s too).
 * - A drawing the page was GIVEN:  the page server put a table of them in the page as it served it
 *   (`<script type="application/json" data-spell-drawings>`, the kit's `SRV.Drawings.fill()`), each by its key.
 *   - every table on the page counts, a part's loaded later too;  read again only when a new one has come
 * - Else ASKED for, once:  `POST SPELL_SERVER.drawings.api/<kind>` (`ask`), when the page server draws that kind;
 *   a page it didn't serve, or one with no such server, asks nothing.
 *   - a 204, an error or no answer in `ASK_LIMIT_MS`:  none, and the element draws it itself, as always
 * - KEYS:  `keyFor()`, a hash of the kind, the settings and the text, the same as the page server's
 *   (`SRV.Drawings.keyFor()`, on the same `stableHash()`):  text edited since, or other settings, is another key,
 *   so a stale drawing is never shown.
 * - What it knows of the page server comes from `SPELL_SERVER.drawings` (`SRV.DrawingsConfig`):  its address, its
 *   kinds, its tables' selector.  It imports nothing of the server.
 * - STATIC and instance-free:  ONE set of tables per page, shared by every element.
 ****************/
export class GivenDrawings {
  /** The key that names `item`:  as the page server's `SRV.Drawings.keyFor()`. */
  static keyFor(item: DrawingItem): string {
    return E.stableHash([item.kind, item.settings, item.text])
  }

  /**
   * `item`'s drawing, as the page server drew it:  from the page's tables, else asked for (with `ask`);
   * `undefined` for none, and the element draws it itself.
   * - its `sheet` the CSS itself, not a key
   * - `fits`:  does a drawing suit this page (`<ui-mermaid-diagram>`'s colours and font)?  The page's one that doesn't
   *   is passed over, and asked for with the item's `hints`, which the page server keeps a drawing of its own for
   * - NEVER throws
   */
  static async find(
    item: DrawingItem,
    { ask = false, fits = () => true }: FindOptions = {}
  ): Promise<GivenDrawing | undefined> {
    const given = GivenDrawings.inPage(GivenDrawings.keyFor(item))
    if (given && fits(given)) return given
    const key = GivenDrawings.answerKeyFor(item)
    const asked = GivenDrawings.answers.get(key)
    if (asked || !ask || !GivenDrawings.isDrawnByServer(item.kind)) return asked
    const answer = GivenDrawings.asked(item)
    GivenDrawings.answers.set(key, answer)
    return answer
  }

  /** What an answer is kept under:  the item's key, its `hints` too (as the page server's `cacheKeyFor()`). */
  private static answerKeyFor(item: DrawingItem): string {
    return item.hints ? E.stableHash([item.kind, item.settings, item.text, item.hints]) : GivenDrawings.keyFor(item)
  }

  /**
   * What the page server answered, by key, the ask under way too:  a redraw of the same text (the page's look
   * changed) finds it again, without asking twice or loading the engine.
   */
  private static readonly answers = new Map<string, Promise<GivenDrawing | undefined>>()

  /** `key`'s drawing in the page's tables, its sheet looked up;  `undefined` for none. */
  static inPage(key: string): GivenDrawing | undefined {
    const tables = GivenDrawings.tables()
    const drawing = tables.drawings[key]
    if (!drawing) return undefined
    const sheet = drawing.sheet === undefined ? undefined : tables.sheets[drawing.sheet]
    return { ...drawing, sheet }
  }

  /** Does the page server draw `kind`?  Only a page it served is told. */
  static isDrawnByServer(kind: string): boolean {
    return GivenDrawings.config()?.kinds.includes(kind) ?? false
  }

  ////////////////
  // ## The page's tables
  ////////////////

  /** Every table on the page, merged;  read again only when the page holds more of them than last time. */
  private static tables(): ServedTable {
    const selector = GivenDrawings.config()?.table ?? TABLE_SELECTOR
    const scripts = typeof document === "undefined" ? [] : [...document.querySelectorAll(selector)]
    if (scripts.length === GivenDrawings.tableCount) return GivenDrawings.merged
    GivenDrawings.tableCount = scripts.length
    const merged: ServedTable = { drawings: {}, sheets: {} }
    for (const script of scripts) {
      try {
        const table = JSON.parse(script.textContent ?? "") as Partial<ServedTable>
        Object.assign(merged.drawings, table.drawings)
        Object.assign(merged.sheets, table.sheets)
      } catch (error) {
        E.Warnings.warn(WARNING_SOURCE, "a table of drawings didn't read;  the page draws them itself", error)
      }
    }
    GivenDrawings.merged = merged
    return merged
  }

  /** How many tables `merged` was read from. */
  private static tableCount = 0

  /** The tables read so far, merged. */
  private static merged: ServedTable = { drawings: {}, sheets: {} }

  /** Forget the tables read and the answers kept:  for tests, which write and remove them. */
  static reset(): void {
    GivenDrawings.answers.clear()
    GivenDrawings.tableCount = 0
    GivenDrawings.merged = { drawings: {}, sheets: {} }
  }

  ////////////////
  // ## Asking the page server
  ////////////////

  /** `item` asked of the page server;  `undefined` when it doesn't draw its kind, or didn't in time.  NEVER throws. */
  private static async asked(item: DrawingItem): Promise<GivenDrawing | undefined> {
    const config = GivenDrawings.config()
    if (!config?.kinds.includes(item.kind)) return undefined
    // the limit is on the ANSWER:  its body is read however busy the page is (a big page can hold its thread for
    // seconds, and a body cut off then was drawn again in the page)
    const stop = new AbortController()
    const limit = E.after(ASK_LIMIT_MS / 1000, () => stop.abort())
    try {
      const response = await fetch(`${config.api}/${encodeURIComponent(item.kind)}`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text: item.text, settings: item.settings, hints: item.hints }),
        signal: stop.signal
      })
      limit.cancel()
      if (response.status !== 200) return undefined
      return (await response.json()) as GivenDrawing
    } catch {
      // no server, or too slow:  the element draws it itself
      return undefined
    } finally {
      limit.cancel()
    }
  }

  /** What the page server told the page (`SPELL_SERVER.drawings`);  `undefined` on a page it didn't serve. */
  private static config(): DrawingsConfig | undefined {
    const server = (globalThis as { SPELL_SERVER?: { drawings?: DrawingsConfig } }).SPELL_SERVER
    const drawings = server?.drawings
    return drawings && Array.isArray(drawings.kinds) && typeof drawings.api === "string" ? drawings : undefined
  }
}

/** What's drawn:  the kit's `SRV.DrawingItem`. */
export type DrawingItem = {
  /** what draws it, `mermaid`, `code` */
  kind: string
  /** everything it depends on besides the text, JSON */
  settings: Record<string, unknown>
  /** as the element reads it */
  text: string
  /** what the page knows that the server can't, sent when it asks, NOT part of its key:  Mermaid's settings */
  hints?: Record<string, unknown>
}

/** `GivenDrawings.find()`'s options. */
export type FindOptions = {
  /** ask the page server when the page has none */
  ask?: boolean
  /** does a drawing the page holds suit it?  default yes */
  fits?: (drawing: GivenDrawing) => boolean
}

/** A drawing the page server drew:  the kit's `SRV.Drawing`. */
export type GivenDrawing = {
  /** an SVG, coloured code */
  markup: string
  /** the CSS it's drawn in, when the element doesn't have it */
  sheet?: string
  /** what else the element reads */
  data?: Record<string, unknown>
}

/** A page's table, as served:  the kit's `SRV.DrawingsTable`, each drawing's `sheet` a key of `sheets`. */
type ServedTable = { drawings: Record<string, GivenDrawing>; sheets: Record<string, string> }

/** What the page server tells a page:  the kit's `SRV.DrawingsConfig`. */
type DrawingsConfig = { api: string; kinds: string[]; table: string }

/** The tables' selector when the page server says none. */
const TABLE_SELECTOR = "script[data-spell-drawings]"

/** The longest an ask waits:  past it, the element draws it itself. */
const ASK_LIMIT_MS = 4_000

/** `Warnings` source of this class's warnings. */
const WARNING_SOURCE = "GivenDrawings"
