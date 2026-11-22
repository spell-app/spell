import { join } from "node:path"

import { stableHash, textHash } from "spell/util/string"
import { parseBodies } from "./bodies"
import { DiskCache } from "./DiskCache"
import { Router } from "./Router"
import { ServerLog } from "./ServerLog"
import type { Drawer, Drawing, DrawingItem, DrawingsConfig, DrawingsTable, ServedFile } from "./server.types"

/****************
 * ### `Drawings`
 * What pages show that never changes, drawn ahead on the server:  Mermaid's diagrams, coloured code
 * (epic `solid-2-final` P15).
 * - A page whose drawings are all here loads none of what draws them:  no Mermaid, no highlight.js, no Spell parser.
 * - It knows no drawer itself:  each folder hands in its own (`add()`), from its route module, as the page server
 *   loads it (`RouteContext.drawings`):  Spell UI's Mermaid and highlight.js, the app's Spell.
 * - ONE cache on disk for all of them, a folder each (`DiskCache`, `~/.spell/cache/drawings/<drawer>/`),
 *   by a hash of what's drawn (`keyFor()`):  the same text and settings are drawn once, whichever page shows them.
 *   - each drawer's `version` is the cache's:  a new version starts empty
 * - Two ways a page gets one:
 *   - FILLED IN as the page is served (`fill()`):  each item a drawer `find()`s in its HTML that's in the cache goes
 *     into a table in the page, which its elements read before drawing anything themselves;
 *     one that isn't is drawn in the background, for the next view
 *   - ASKED for (`router()`, `POST /api/server/drawings/<kind>`):  an element whose drawing isn't in its page
 *     (a README's diagram, read by `<ui-markdown>` after the page loaded) asks once, before loading its engine
 *     - a drawing not done in `waitMs` (a headless browser starting) answers 204, and goes on drawing:
 *       the page draws it itself meanwhile, so nothing waits;  the next view has it
 * - The elements' half:  Spell UI's `GivenDrawings`.
 * - NEVER throws while serving:  a drawer that fails is logged, and the page draws as it always did.
 ****************/
export class Drawings {
  /** Its drawers, the latest added first. */
  private readonly drawers: Drawer[] = []

  /** Each drawer's cache, by its name. */
  private readonly caches = new Map<string, DiskCache>()

  /** Drawings under way, by key:  asked twice, drawn once. */
  private readonly drawing = new Map<string, Promise<Drawing | undefined>>()

  /** Background draws waiting their turn:  ONE at a time, so a big page doesn't start fifty. */
  private queue: Promise<unknown> = Promise.resolve()

  /** How many background draws are waiting. */
  private queued = 0

  /** Folder the caches are in. */
  readonly folder: string

  /** The most each drawer's cache may take, in bytes. */
  readonly limit: number

  /** How long an asked-for drawing may take before the answer is "none yet" (204), in ms. */
  readonly waitMs: number

  /** Where problems are written. */
  readonly log: ServerLog

  constructor({
    folder = join(DiskCache.home, "drawings"),
    limit = DiskCache.DEFAULT_LIMIT,
    waitMs = 2_000,
    log = new ServerLog({ prefix: "drawings" })
  }: DrawingsProps = {}) {
    this.folder = folder
    this.limit = limit
    this.waitMs = waitMs
    this.log = log
  }

  /** Where it's asked for drawings:  `POST <API>/<kind>`. */
  static readonly API = "/api/server/drawings"

  /** The attribute marking a page's table of drawings (`DrawingsTable`). */
  static readonly TABLE_ATTRIBUTE = "data-spell-drawings"

  /** The most background draws waiting at once:  past it, an item waits for a page that shows it again. */
  static readonly QUEUE_LIMIT = 200

  /**
   * The key that names item `item` in a page and here alike:  a hash of its kind, its settings (keys in any order)
   * and its text.
   * - Spell UI's `GivenDrawings.keyFor()` is the same, from the same `stableHash()`.
   */
  static keyFor(item: DrawingItem): string {
    return stableHash([item.kind, item.settings, item.text])
  }

  /**
   * The key `item`'s drawing is kept under here:  its key (`keyFor()`), or with its `hints` too when it has them.
   * - so a page whose look differs (its colours, its font) asks for, and is kept, a drawing of its own, beside the one
   *   pages are filled with
   */
  static cacheKeyFor(item: DrawingItem): string {
    return item.hints ? stableHash([item.kind, item.settings, item.text, item.hints]) : Drawings.keyFor(item)
  }

  ////////////////
  // ## Drawers
  ////////////////

  /**
   * Draw `drawer`'s kind with it, before the drawers added already.
   * - throws a `TypeError` for a name that's no plain folder name
   */
  add(drawer: Drawer): this {
    if (!DRAWER_NAME.test(drawer.name))
      throw new TypeError(`Drawings.add():  '${drawer.name}' isn't a drawer's name;  use letters, digits, . and -`)
    this.drawers.unshift(drawer)
    // asked each time:  a drawer's version may change while the server runs (its page's bundle rebuilt)
    const version = () => textHash(drawer.version)
    this.caches.set(drawer.name, new DiskCache({ folder: join(this.folder, drawer.name), version, limit: this.limit }))
    return this
  }

  /** The kinds it draws, each once. */
  get kinds(): string[] {
    return [...new Set(this.drawers.map((drawer) => drawer.kind))]
  }

  /** The drawer that draws `item`:  the latest added of its kind that takes it. */
  drawerFor(item: DrawingItem): Drawer | undefined {
    return this.drawers.find((drawer) => drawer.kind === item.kind && (drawer.takes?.(item) ?? true))
  }

  /** What every page is told:  `SPELL_SERVER.drawings`;  `undefined` while it has no drawer. */
  pageConfig(): DrawingsConfig | undefined {
    if (!this.drawers.length) return undefined
    return { api: Drawings.API, kinds: this.kinds, table: `script[${Drawings.TABLE_ATTRIBUTE}]` }
  }

  /** Stop every drawer (`Drawer.stop()`):  as the page server stops.  NEVER throws. */
  async stop(): Promise<void> {
    for (const drawer of this.drawers) {
      try {
        await drawer.stop?.()
      } catch (error) {
        this.log.error(`drawer ${drawer.name} didn't stop:`, error)
      }
    }
  }

  ////////////////
  // ## Drawing
  ////////////////

  /** `item`'s drawing, if it's in the cache;  `undefined` when it isn't, or no drawer draws it.  NEVER throws. */
  cached(item: DrawingItem): Drawing | undefined {
    const drawer = this.drawerFor(item)
    if (!drawer) return undefined
    const cache = this.caches.get(drawer.name)!
    try {
      const text = cache.read(cache.version(), Drawings.cacheKeyFor(item))
      return text === undefined ? undefined : (JSON.parse(text) as Drawing)
    } catch (error) {
      this.log.error(`drawer ${drawer.name}:  a cached drawing didn't read`, error)
      return undefined
    }
  }

  /**
   * `item`'s drawing:  from the cache, else drawn (and kept);  `undefined` when no drawer draws it, or it can't.
   * - asked again while it draws:  the same promise
   * - NEVER throws:  a drawer's failure is logged
   */
  draw(item: DrawingItem): Promise<Drawing | undefined> {
    const kept = this.cached(item)
    if (kept) return Promise.resolve(kept)
    const drawer = this.drawerFor(item)
    if (!drawer) return Promise.resolve(undefined)
    const key = Drawings.cacheKeyFor(item)
    const under = this.drawing.get(key)
    if (under) return under
    const drawn = this.drawNow(drawer, item, key).finally(() => this.drawing.delete(key))
    this.drawing.set(key, drawn)
    return drawn
  }

  /** `drawer`'s drawing of `item`, kept under `key`.  NEVER throws. */
  private async drawNow(drawer: Drawer, item: DrawingItem, key: string): Promise<Drawing | undefined> {
    try {
      const drawing = await drawer.draw(item)
      if (!drawing) return undefined
      const cache = this.caches.get(drawer.name)!
      cache.write(cache.version(), key, JSON.stringify(drawing))
      return drawing
    } catch (error) {
      this.log.debug(`drawer ${drawer.name} couldn't draw a ${item.kind}:`, error)
      return undefined
    }
  }

  /** Draw `item` in the background, after the ones waiting, unless too many are.  NEVER throws. */
  private later(item: DrawingItem): void {
    const key = Drawings.cacheKeyFor(item)
    if (this.drawing.has(key) || this.queued >= Drawings.QUEUE_LIMIT) return
    this.queued += 1
    this.queue = this.queue.then(() => this.draw(item)).finally(() => (this.queued -= 1))
  }

  ////////////////
  // ## In pages
  ////////////////

  /**
   * `page` with a table of the drawings it shows that are drawn already (`DrawingsTable`), at the end of its
   * `<head>`;  a part with none, at its end, as the page scripts go (its first element stays first)
   * - each it shows that isn't is drawn in the background
   * - `filled`:  the drawers ALL of whose items in the page are in it, a page with none of them too
   *   (`replacedScripts()`)
   * - NEVER throws:  a drawer whose `find()` fails is logged, its items left to the page
   */
  fill(page: string): { page: string; filled: Set<Drawer> } {
    const table: DrawingsTable = { drawings: {}, sheets: {} }
    const missed = new Set<Drawer>()
    for (const finder of this.drawers.filter((drawer) => drawer.find)) {
      let items: DrawingItem[]
      try {
        items = finder.find!(page)
      } catch (error) {
        this.log.error(`drawer ${finder.name} couldn't read a page:`, error)
        continue
      }
      for (const item of items) {
        const drawer = this.drawerFor(item)
        if (!drawer) continue
        const drawing = this.cached(item)
        if (!drawing) {
          missed.add(drawer)
          this.later(item)
          continue
        }
        const { sheet, ...rest } = drawing
        const sheetKey = sheet === undefined ? undefined : textHash(sheet)
        if (sheetKey) table.sheets[sheetKey] = sheet!
        table.drawings[Drawings.keyFor(item)] = sheetKey ? { ...rest, sheet: sheetKey } : rest
      }
    }
    const filled = new Set(this.drawers.filter((drawer) => !missed.has(drawer)))
    if (!Object.keys(table.drawings).length) return { page, filled }
    // `<` written as `<`:  no `</script>` in the JSON ends the tag early
    const json = JSON.stringify(table).replace(/</g, "\\u003c")
    const tag = `<script type="application/json" ${Drawings.TABLE_ATTRIBUTE}>${json}</script>\n`
    const end = page.search(/<\/head>/i)
    return { page: end < 0 ? page + tag : page.slice(0, end) + tag + page.slice(end), filled }
  }

  /**
   * The page scripts a page needn't load, once `filled` (`fill()`):  each filled drawer's `replaces`.
   * - a page holding an item a drawer takes and hasn't drawn yet keeps them, so it draws as before
   */
  replacedScripts(filled: ReadonlySet<Drawer>): Set<string> {
    return new Set([...filled].flatMap((drawer) => drawer.replaces ?? []))
  }

  /**
   * Its HTTP routes, to mount at `Drawings.API`:  `POST /<kind>`, `{ text, settings, hints? }`:
   * - the drawing, as JSON (`Drawing`, its `sheet` in it)
   * - 204 when none came in `waitMs`, or no drawer draws it:  the page draws it itself
   * - 400 for a body that isn't one
   */
  router({ limit = 2 * 1024 * 1024 }: { limit?: number } = {}): Router {
    const router = new Router()
    router.use(parseBodies({ limit }))
    router.post("/:kind", async (request, reply) => {
      const { text, settings, hints } = (request.body ?? {}) as { text?: unknown; settings?: unknown; hints?: unknown }
      if (typeof text !== "string" || !isRecord(settings) || (hints !== undefined && !isRecord(hints)))
        return void reply.status(400).json({ error: "send { text, settings, hints? }" })
      const item = { kind: request.params.kind ?? "", settings, text, ...(hints && { hints }) }
      const drawing = await Promise.race([this.draw(item), waited(this.waitMs)])
      if (!drawing) return void reply.noStore().status(204).end()
      reply.noStore().json(drawing)
    })
    return router
  }

  /**
   * The html hook a page server adds:  each page filled in (`fill()`), its filled drawers kept for its page scripts
   * (`filledFor()`).
   */
  readonly fillServed = (page: string, served: ServedFile): string => {
    const { page: filledPage, filled } = this.fill(page)
    this.fills.set(served, filled)
    return filledPage
  }

  /** The drawers `served`'s page was filled by, as the `fillServed()` hook found them;  `undefined` before it ran. */
  filledFor(served: ServedFile): ReadonlySet<Drawer> | undefined {
    return this.fills.get(served)
  }

  /** What `fillServed()` found, by the file served. */
  private readonly fills = new WeakMap<ServedFile, Set<Drawer>>()
}

/** `new Drawings()` props:  SEE its fields. */
export type DrawingsProps = {
  /** default `~/.spell/cache/drawings` */
  folder?: string
  /** default `DiskCache.DEFAULT_LIMIT`, or the page server's `cacheLimit` */
  limit?: number
  /** default 2s */
  waitMs?: number
  log?: ServerLog
}

/** A drawer's name:  a plain folder name. */
const DRAWER_NAME = /^[a-z0-9][a-z0-9.-]*$/i

/** Is `value` a plain JSON object? */
function isRecord(value: unknown): value is Record<string, unknown> {
  return !!value && typeof value === "object" && !Array.isArray(value)
}

/** `undefined`, after `ms`. */
function waited(ms: number): Promise<undefined> {
  return new Promise((resolve) => setTimeout(() => resolve(undefined), ms).unref?.())
}
