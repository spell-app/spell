import { existsSync, readdirSync, readFileSync, watch, type FSWatcher } from "node:fs"
import { basename, dirname, join, relative, sep } from "node:path"

import { escapeRegExp } from "spell/util/string"
import { RealPath } from "spell/server/RealPath"
import { ClaudeHome } from "spell/epic/config/ClaudeHome"
import { EpicConfig } from "spell/epic/config/EpicConfig"
import { SessionFolders } from "spell/epic/config/SessionFolders"
import { DataFile } from "spell/epic/data/DataFile"
import { SRV } from "spell/server"

import { planDocIn } from "spell/epic/tools/pages.js"
import {
  EPIC_CARDS_END,
  EPIC_CARDS_START,
  FAVORITES_FILE,
  epicCardHtml,
  eventTimesIn,
  lastWorked,
  favoritesIn,
  type SagaLook
} from "./EpicCards"
import { URGENT_STATES } from "./EpicState"

/****************
 * ### `RunningEpics`
 * Lets the main checkout's page server show every RUNNING epic's page:
 * the ones still in their worktree, not yet merged into the main checkout.
 * - where:  `.claude/worktrees/<w>/epics/<name>/<name>.plan.html`, or an old `<name>.html`;  `<w>` in each of the
 *   repo's worktrees folders, beside the repo (`../spell-app.worktrees`) and the old place (epic `epic-eject` P8)
 *   - a worktree on older code keeps its epic pages in `packages/docs/content/epics/` (before 2026-10-05)
 *     or `packages/docs/epics/` (before 2026-10-04):  found there too (`EPICS_DIRS`)
 * - Why:  each worktree has its own page server (its own port),
 *   and the main one refuses `.claude/...` (a dot path), so the epics list couldn't show an epic until it merged.
 * - The page server serves worktree `<w>`'s files at `/worktrees/<w>/...` (dot files still refused),
 *   so an epic page's relative assets come from its own worktree.
 * - On the page server through epics' route module (`runningRoutes.ts`):
 *   - `/api/epics/running`:  the list, as JSON (`list()`:  `RunningEpic[]`)
 *   - the Epics list page, as below (`render()`), and live reload (`watch()`)
 * - The Epics list page (`epics/index.html`;  the home page until claude-design P5), on each request (`render()`):
 *   - running and merged epics in ONE list, its `<epic-list>`, which groups, sorts and filters them in the browser
 *     (`EpicCards`):  Favorites, Active, Planning, Urgent, Done
 *   - the running epics' cards join the written ones before its end marker (`EPIC_CARDS_END`)
 *   - EVERY card marked as things are now, as `docs index` can't know when it writes the page:
 *     - `running`:  a session running for it (its state's mark, in progress or paused, is the card's to draw)
 *     - `favorite`:  from the favourites as they are now (`FAVORITES_FILE`)
 *   - opened from disk:  the cards as `docs index` wrote them
 * - Live:  an epic page's change reloads its page and the list page (`watch()`).
 * - Which docs:  `<name>` === `<w>` (the epic the worktree is for), or any `<name>` the main checkout lacks.
 *   The rest are stale copies of epics merged before the worktree was cut.
 * - NOTE:  edit mode on a worktree's page isn't offered through here:  `PageEditor` refuses dot paths too.
 *   Its own worktree's server edits it.
 ****************/
export class RunningEpics {
  /** the main checkout */
  readonly root: string

  /**
   * the folders holding the worktrees, the new place first:  `<root>/.claude/worktrees` (`worktreesFolder` in
   * `.epic/config.json5`), or beside the repo and the old place too (`EpicConfig.worktreesFolders`)
   */
  readonly worktrees: string[]

  /** the watchers `watch()` started, one per worktrees folder there is, closed by `close()` */
  private watchers: FSWatcher[] = []

  /** the Epics list page, `epics/index.html`, whose marker becomes the list (`epic pages index` writes it) */
  readonly index: string

  /**
   * Claude Code's own folder, whose `sessions/<pid>.json` say which sessions run (`runningNames()`):
   * `ClaudeHome.home()` (a test points `CLAUDE_CONFIG_DIR` at a fixture)
   */
  readonly claudeHome: string

  constructor(root: string, { claudeHome = ClaudeHome.home() }: { claudeHome?: string } = {}) {
    this.root = root
    this.worktrees = new EpicConfig(root).worktreesFolders
    this.epics = join(EpicConfig.contentOf(root), "epics")
    this.index = join(this.epics, "index.html")
    this.claudeHome = claudeHome
  }

  /** the repo's epic pages:  `epics/` in its content folder (`EpicConfig.contentOf()`), shared by every checkout */
  readonly epics: string

  /**
   * every running epic, by worktree then name
   * - shared content (a worktree's epics are the content folder's, as the main checkout's are):
   *   the card links the page's own URL, `/epics/...`, so edit mode and live reload work there
   * - a worktree on older code with epic pages of its own (a real `epics/` folder, or an old place:  `EPICS_DIRS`):
   *   at `/worktrees/<w>/...`
   */
  list(): RunningEpic[] {
    const found: RunningEpic[] = []
    for (const worktree of this.worktreeNames()) {
      const checkout = this.checkoutOf(worktree)
      const own = EPICS_DIRS.find((epics) => existsSync(join(checkout, epics)))
      const dir = own ? join(checkout, own) : this.epics
      const shared = RealPath.same(dir, this.epics)
      for (const name of folders(dir)) {
        const file = planDocIn(join(dir, name), name)
        if (!file) continue
        if (name !== worktree && existsSync(join(this.epics, name))) continue
        found.push({
          name,
          worktree,
          url: shared ? `/epics/${name}/${basename(file)}` : `/worktrees/${worktree}/${own}/${name}/${basename(file)}`,
          ...read(file)
        })
      }
    }
    return found
  }

  /**
   * Whether `file`, a file the page server serves, is the Epics list page (`index`):  named there, or through a
   * checkout's link into the content folder (an older checkout's `epics` link).
   */
  isIndex(file: string): boolean {
    return RealPath.same(file, this.index)
  }

  /**
   * Reload pages when a worktree's epic page changes:  that doc's own page, and the Epics page (its list).
   * - and a worktree's page assets (`ASSET_FILE`:  its docs runtime and bundle, its packs), so its pages served here
   *   (`/worktrees/<w>/...`) hot-reload when that worktree rebuilds them (the live client's `liveAction()`)
   * - SIDE EFFECT:  one recursive `fs.watch` on each worktrees folder that exists (`.claude/worktrees`);  `close()`
   *   ends them
   */
  watch(live: SRV.LiveReload): this {
    for (const folder of this.worktrees) {
      if (!existsSync(folder)) continue
      try {
        const watcher = watch(folder, { recursive: true }, (_event, name) => {
          const path = name?.split(sep).join("/")
          if (!name || !path) return
          if (ASSET_FILE.test(path)) return live.changed(join(folder, name))
          if (!EPIC_FILE.test(path)) return
          live.changed(join(folder, name))
          live.changed(this.index)
        })
        watcher.on("error", () => {})
        this.watchers.push(watcher)
      } catch {
        // can't watch:  pages just don't reload by themselves
      }
    }
    return this
  }

  /** Every worktree's name, in each worktrees folder (the new place first), each name once. */
  worktreeNames(): string[] {
    return [...new Set(this.worktrees.flatMap((folder) => folders(folder)))]
  }

  /** Worktree `name`'s folder:  in the first worktrees folder that has it (the new place, then the old). */
  checkoutOf(name: string): string {
    const found = this.worktrees.map((folder) => join(folder, name)).find((folder) => existsSync(folder))
    return found ?? join(this.worktrees[0]!, name)
  }

  /** stop watching */
  close(): void {
    for (const watcher of this.watchers) watcher.close()
    this.watchers = []
  }

  /**
   * `page` (the Epics list page) as of now:  every card marked again, and the running epics' cards added.
   * - no `<epic-list>` between its markers (`MARKER` ... `EPIC_CARDS_END`):  as is
   *   - an index written before epic `epic-engine` P3 (`<ui-card>`s in groups) too:  `docs index` writes it anew
   * - each card `docs index` wrote (`<epic-card>`):  `running` when a session runs for it (`runningNames()`),
   *   `favorite` when it's starred (`favorites()`)
   * - a merged epic's card of the same name (`epic`) goes:  the worktree's doc is the live one
   *   - its last-worked moment (`worked`:  it may hold the branch's last commit) carries over to the running card
   * - a running card's saga:  its doc's, with the title and purpose a written card gives it (the page server can't
   *   read the sagas' list)
   * - the running cards go before the end marker:  `<epic-list>` places every card itself
   * - the cards' markup:  `EpicCards` `epicCardHtml()`, as `docs index` writes them
   */
  render(page: string, now: Date = new Date()): string {
    const from = page.indexOf(MARKER)
    const to = page.indexOf(EPIC_CARDS_END, from)
    if (from < 0 || to < 0 || !LIST.test(page.slice(0, from))) return page
    const running = this.runningNames()
    const favorites = this.favorites()
    const epics = this.list()
    let html = page.replace(CARD, (card: string, name: string) =>
      remark(card, { running: running.has(name), favorite: favorites.has(name) })
    )
    const sagas = new Map<string, SagaLook>()
    for (const [card] of html.matchAll(CARD)) {
      const saga = sagaOf(card)
      if (saga) sagas.set(saga.id, saga)
    }
    const workedBefore = new Map<string, string>()
    for (const epic of epics) {
      // oxfmt splits a closing tag over lines (`</epic-card\n  >`)
      const merged = new RegExp(`<epic-card\\b[^>]*\\sepic="${escapeRegExp(epic.name)}"[\\s\\S]*?</epic-card\\s*>\\n?`)
      html = html.replace(merged, (card) => {
        const worked = attributeOf(card, "worked")
        if (worked) workedBefore.set(epic.name, worked)
        return ""
      })
    }
    if (!epics.length) return html
    const added = epics.map((epic) => this.runningCard(epic, { running, favorites, now, worked: workedBefore, sagas }))
    const end = html.indexOf(EPIC_CARDS_END, html.indexOf(MARKER))
    return `${html.slice(0, end)}${added.join("\n")}\n${html.slice(end)}`
  }

  /**
   * Running epic `epic`'s card (`epicCardHtml()`), linking its epic page where it runs, its worktree in the meta line.
   * - `running`:  the names sessions run for
   * - `favorites`:  the starred epics
   * - `worked`:  the merged cards' `worked`, by name (`render()`)
   * - `sagas`:  every saga a written card names, by id:  the running doc's saga's title and purpose
   */
  private runningCard(
    epic: RunningEpic,
    context: {
      running: Set<string>
      favorites: Set<string>
      now: Date
      worked: Map<string, string>
      sagas: Map<string, SagaLook>
    }
  ): string {
    const { running, favorites, now, worked, sagas } = context
    const where = relative(this.root, this.checkoutOf(epic.worktree))
    const isRunning = running.has(epic.name) || running.has(epic.worktree)
    const { html } = epicCardHtml(
      {
        name: epic.name,
        title: epic.title,
        href: epic.url,
        target: epic.name,
        meta: `${epic.active ? `${epic.active} · ` : ""}${where}`,
        facts: { ...epic, running: isRunning },
        worked: lastWorked([epic.worked, worked.get(epic.name)]),
        favorite: favorites.has(epic.name),
        saga: epic.saga ? sagas.get(epic.saga) : undefined
      },
      now
    )
    return isRunning ? html.replace(/^<epic-card\b/, "<epic-card running") : html
  }

  /** The starred epics' names (`FAVORITES_FILE`, shared:  the page server's `/api/epics/favorite` writes it). */
  favorites(): Set<string> {
    try {
      return favoritesIn(DataFile.read(join(dirname(this.epics), FAVORITES_FILE)))
    } catch {
      // a file that won't read:  none starred, rather than no list page
      return new Set()
    }
  }

  /**
   * The names live Claude sessions run for.
   * - for each session whose process is alive (`sessions/<pid>.json`):
   *   - the worktree it works in (its `cwd` under `.claude/worktrees/<w>`, or any of the worktrees folders)
   *   - its title without its icon (`🚧 airplane` -> `airplane`:  `/isolate` and `/epic` title a session for its epic)
   * - NEVER throws:  an unreadable record is skipped
   */
  runningNames(): Set<string> {
    const names = new Set<string>()
    for (const session of this.liveSessions()) {
      // by real paths:  a session started before a move behind a compat link keeps the old spelling (I59)
      const inside = this.worktrees.map((each) => RealPath.from(each, session.cwd)).find(Boolean)
      if (inside) names.add(inside.split("/")[0]!)
      const title = bareTitle(session.title)
      if (title) names.add(title)
    }
    return names
  }

  /**
   * Every live Claude session (`ClaudeHome.liveSessions()`):  its pid, id, title, status and folder.
   * - the title its tab shows (`SessionFolders.recordTitle()`):  a session resumed in a new process keeps its
   *   `🚧 <epic>` only in its transcript (epic `epic-engine` I51)
   * - NEVER throws:  an unreadable record is skipped
   */
  liveSessions(): TitledSession[] {
    return ClaudeHome.liveSessions({ home: this.claudeHome, isAlive: SRV.isProcessAlive }).map((record) => ({
      pid: record.pid,
      sessionId: record.sessionId,
      title: SessionFolders.recordTitle(record, this.claudeHome),
      status: record.status ?? "",
      cwd: record.cwd ?? ""
    }))
  }
}

/** A live Claude session, its title as its tab shows it (`RunningEpics.liveSessions()`). */
export type TitledSession = {
  pid: number
  /** Claude Code's session id (a uuid) */
  sessionId: string
  /** its title, icon and all (`🚧 airplane`);  `""` when untitled */
  title: string
  /** `idle`, `busy` ...;  `""` when the record has none */
  status: string
  cwd: string
}

/** `title` without its leading icon:  `🚧 airplane` -> `airplane`. */
export function bareTitle(title: string): string {
  return title.replace(/^[^\p{L}\p{N}]+/u, "").trim()
}

/**
 * The sessions titled for epic `epic` (epic `airplane` P12), by `titleNames()`.
 */
export function sessionsTitledFor(epic: string, sessions: TitledSession[]): TitledSession[] {
  return sessions.filter((session) => titleNames(session.title, epic))
}

/**
 * Whether session title `title` names epic `epic`:  its title without its icon IS the name (`🚧 airplane`),
 * or holds it as a whole word (`airplane review`;  never `airplane-mode`).
 */
export function titleNames(title: string, epic: string): boolean {
  const bare = bareTitle(title).toLowerCase()
  const name = epic.toLowerCase()
  if (!name || !bare) return false
  if (bare === name) return true
  return new RegExp(`(^|[^a-z0-9_-])${escapeRegExp(name)}($|[^a-z0-9_-])`, "u").test(bare)
}

/** The Epics page's list, as `docs index` writes it since epic `epic-engine` P3:  its opening tag. */
const LIST = /<epic-list\b[^>]*>\s*$/

/** An epic's card on the Epics page:  its whole markup, `$1` its name. */
const CARD = /<epic-card\b[^>]*\sepic="([^"]*)"[\s\S]*?<\/epic-card\s*>/g

/** The saga epic card `card` names (`saga`, `saga-title`, `saga-purpose`);  `undefined` for none. */
function sagaOf(card: string): SagaLook | undefined {
  const id = attributeOf(card, "saga")
  if (!id) return undefined
  return {
    id,
    title: decode(attributeOf(card, "saga-title") ?? id),
    purpose: decode(attributeOf(card, "saga-purpose") ?? "")
  }
}

/** Attribute `name` of epic card `card`'s opening tag:  its value, `""` when bare;  `undefined` without it. */
function attributeOf(card: string, name: string): string | undefined {
  const found = attributesOf(card).find(([each]) => each === name)
  return found ? (found[1] ?? "") : undefined
}

/**
 * Epic card `card`'s opening tag's attributes, in order:  `[name, value]`, `value` `undefined` when bare.
 * - read one after another, so a value holding an attribute's name (`active="P2 · running"`) is never taken for it:
 *   `epicCardHtml()` writes every value in double quotes, its own quotes escaped
 */
function attributesOf(card: string): [string, string | undefined][] {
  const open = /^<epic-card\b([^>]*)>/.exec(card)?.[1] ?? ""
  return Array.from(open.matchAll(/\s+([^\s=>]+)(?:="([^"]*)")?/g), ([, name, value]) => [name!, value])
}

/**
 * Epic card `card` (as `docs index` wrote it), marked `running` when a session runs for it and `favorite` when it's
 * starred, as they are now;  the rest as written.
 */
function remark(card: string, { running, favorite }: { running: boolean; favorite: boolean }): string {
  const kept = attributesOf(card).filter(([name]) => name !== "running" && name !== "favorite")
  const marks = [...(running ? [["running"]] : []), ...(favorite ? [["favorite"]] : [])] as [string][]
  const open = [...kept, ...marks]
    .map(([name, value]) => (value === undefined ? ` ${name}` : ` ${name}="${value}"`))
    .join("")
  // a function:  a `$` in a value is text, never a replacement pattern
  return card.replace(/^<epic-card\b[^>]*>/, () => `<epic-card${open}>`)
}

/**
 * One running epic.
 * - `name`:  the epic
 * - `worktree`:  the worktree it's in
 * - `url`:  its epic page on the main page server
 * - `title`:  the doc's `<title>`
 * - `phases`:  each phase's status, in order
 * - `done` / `total`:  how many phases are done, of all
 * - `active`:  the active phase's header (`P2 · Name`), if any
 * - `updated`:  the doc's "updated" date (`YYYY-MM-DD`), if any
 *   - with phases left, no session running and no update for a few days, it's paused (`EpicState`)
 * - `future`:  written down with `/epic future`, not planned yet
 * - `standing`:  open for good, every phase merging on its own (epic `epic-workflow`)
 * - `saga`:  the saga its page names, its id (`<epic-page saga>`, epic `epic-workflow` P15)
 * - `urgent`:  the ids of the items that need Owen (red and orange chips:  `URGENT_STATES`):
 *   every phase done with some left, it has errors
 * - `worked`:  when it was last worked on, as the doc says:  the latest of its `updated` day and its log lines' times
 *   (`EpicCards` `lastWorked()`;  `docs index` adds the branch's last commit)
 */
export type RunningEpic = {
  name: string
  worktree: string
  url: string
  title: string
  phases: string[]
  done: number
  total: number
  active?: string
  updated?: string
  future?: boolean
  standing?: boolean
  saga?: string
  urgent?: string[]
  worked?: string
}

/** The marker on the Epics list page where the running epics' cards go:  `EPIC_CARDS_START`. */
export const MARKER = EPIC_CARDS_START

/**
 * Where a worktree on older code keeps its epic pages, relative to its root, newest layout first;  a checkout with
 * none of them reads the content folder's (`RunningEpics.epics`, epic `epic-eject` P12).
 * - `epics`:  since 2026-10-05 (epic `claude-design`, P4):  a link into the content folder (shared), or a real folder
 * - `packages/docs/content/epics`:  since 2026-10-04 (epic `shared-content`, P2)
 *   - a link into the shared repo's old-path links, so the same folder as `epics`
 * - `packages/docs/epics`:  a worktree cut before that, until it merges `main`
 */
const EPICS_DIRS = ["epics", "packages/docs/content/epics", "packages/docs/epics"]

/**
 * An epic page's path inside `.claude/worktrees`:  `<w>/epics/<name>/<name>.plan.html`.
 * - a worktree on older code:  the same under `packages/docs/content/` or `packages/docs/`,
 *   or with the old name `<name>.html`
 */
const EPIC_FILE = /^[^/]+\/(?:packages\/docs\/(?:content\/)?)?epics\/([^/]+)\/\1(?:\.plan)?\.html$/

/**
 * A worktree's page asset, from `.claude/worktrees/`:  `<w>/packages/epics/tools/_assets/...` (the docs runtime, its
 * stylesheet, the docs bundle and its chunks) or a component pack (`<w>/packages/<pkg>/components/__pack/...`).
 * - a worktree on older code:  `packages/docs/tools/_assets/` and `packages/epics/pack/`
 */
const ASSET_FILE =
  /^[^/]+\/packages\/(?:epics\/tools\/_assets|docs\/tools\/_assets|[^/]+\/components\/__pack|epics\/pack)\/.+\.(?:m?js|css)$/

/** The sub-folders of `dir`, sorted;  none if it's missing. */
function folders(dir: string): string[] {
  if (!existsSync(dir)) return []
  return readdirSync(dir, { withFileTypes: true })
    .filter((entry) => entry.isDirectory() && !entry.name.startsWith("."))
    .map((entry) => entry.name)
    .sort()
}

/**
 * Title, phases and urgent items of the epic page at `file`, by pattern.
 * - why:  the Epics page is served on every request,
 *   and a pattern reads the few attributes it needs without parsing the whole doc
 * - attributes in any order, across lines:
 *   - each `<epic-phase title="..." status="S">`, labelled by its place (`P3 · <title>`):  its id is stable
 *     (`p-epic-migrate`, epic `epic-workflow` P15), never its number
 *   - `<epic-page updated future>`
 *   - each `<epic-item id="q3" state="attention">`
 * - a doc still in the old markup (no `<epic-page>`:  one restored from an old backup) reads as an empty plan:
 *   the epic tool refuses it until it's converted (epic `epic-components` P15)
 * - urgent items as `EpicState` `URGENT_SELECTOR` finds them (the Epics list page, `<epic-page>`)
 */
function read(
  file: string
): Pick<
  RunningEpic,
  "title" | "phases" | "done" | "total" | "active" | "updated" | "future" | "standing" | "saga" | "urgent" | "worked"
> {
  const html = readFileSync(file, "utf8")
  // drop the `Epic: ` epic pages' titles start with (since 2026-10-04):  the card is in the Epics list already
  const title = (/<title>([^<]*)<\/title>/.exec(html)?.[1]?.trim() ?? "").replace(/^Epic:\s*/, "")
  const attribute = (tag: string, name: string) => new RegExp(`\\s${name}="([^"]*)"`).exec(tag)?.[1]
  const page = /<epic-page\b[^>]*>/.exec(html)?.[0] ?? ""
  const tags = (pattern: RegExp) => (page ? [...html.matchAll(pattern)].map(([tag]) => tag) : [])
  // numbered as drawn:  the whole-numbered ones counted, a decimal phase its own (`number="11.1"`, `PhaseIds`)
  let whole = 0
  const phases = tags(/<epic-phase\b[^>]*>/g).map((tag) => {
    const decimal = attribute(tag, "number")
    return {
      status: attribute(tag, "status") ?? "todo",
      header: `P${decimal ?? ++whole} · ${attribute(tag, "title") ?? ""}`
    }
  })
  const active = phases.find((phase) => phase.status === "active")?.header
  const updated = /^\d{4}-\d\d-\d\d$/.exec(attribute(page, "updated") ?? "")?.[0]
  const future = /\sfuture(?=[\s=>])/.test(page)
  const standing = /\sstanding(?=[\s=>])/.test(page)
  const saga = attribute(page, "saga")
  const urgent = tags(/<epic-item\b[^>]*>/g)
    .filter((tag) => (URGENT_STATES as readonly string[]).includes(attribute(tag, "state") ?? ""))
    .map((tag) => attribute(tag, "id") ?? "")
    .filter(Boolean)
  const log = join(dirname(file), "parts", "log.html")
  const events = [...eventTimesIn(html), ...(existsSync(log) ? eventTimesIn(readFileSync(log, "utf8")) : [])]
  const worked = lastWorked([updated, ...events])
  return {
    title: decode(title),
    phases: phases.map((phase) => phase.status),
    done: phases.filter((phase) => phase.status === "done").length,
    total: phases.length,
    ...(active && { active: decode(active) }),
    ...(updated && { updated }),
    ...(future && { future }),
    ...(standing && { standing }),
    ...(saga && { saga }),
    ...(urgent.length > 0 && { urgent }),
    ...(worked && { worked: worked.toISOString() })
  }
}

/** The few entities an epic page's `<title>` and headers hold, back to text. */
function decode(value: string): string {
  return value
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
}
