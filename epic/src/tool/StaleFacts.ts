import { existsSync, readFileSync, statSync } from "node:fs"
import { basename, join } from "node:path"

import { SRV } from "spell/server"

import { PlanCommits } from "./PlanCommits"
import type { PlanDoc } from "./PlanDoc"
import type { ItemKind, Phase } from "./planDoc.types"

/****************
 * ### `StaleFacts`
 * The FACTS for judging which of an epic's open judgement calls, issues and todos have gone stale (`epic stale`,
 * epic `epic-engine` Q69):  it decides nothing.  `/epic tidy`'s agents read them against the code.
 * - each item's age, its phase and whether that's done
 * - the files and code names it mentions, and whether they still exist in the checkout
 * - the commits that touched those files since it was written, and the commits naming it
 * - later items and phases that mention it
 * - whether `epic close --why` would refuse it (`PlanDoc.closeRefusal()`), and whether a tidy already left a card
 * - Fast for 300 items:  git runs twice for the whole page (`ls-files`, one `log`), never per item;  names are looked
 *   up in one pass over the tracked code files.
 *   - All of it best effort:  without git, every file reads as missing and no commit is listed.
 * - Node only (git, the checkout's files);  imported by `PlanDocCommands`, by path.
 ****************/
export class StaleFacts {
  /** the page, its parts read in */
  readonly plan: PlanDoc

  /** the epic's name, as commit subjects give it */
  readonly epic: string

  /** the checkout to look in:  the epic's own worktree when it has one */
  readonly checkout: string

  /** ids (lower case) holding a mark of Owen's not yet taken (`closeRefusal()`) */
  readonly marked: ReadonlySet<string>

  constructor({ plan, epic, checkout, marked = new Set() }: StaleFactsOptions) {
    this.plan = plan
    this.epic = epic
    this.checkout = checkout
    this.marked = marked
  }

  /**
   * The facts on every open judgement call, issue and todo (and limit, a todo that's only a note), in page order.
   * - NEVER throws for a git failure:  see the class docstring
   */
  report(): StaleReport {
    const written = this.writtenTimes()
    const open = STALE_KINDS.flatMap((kind) =>
      this.plan
        .itemsOf(kind)
        .filter((item) => (item.getAttribute("status") ?? "open") === "open")
        .map((element) => ({ kind, element, mentions: StaleFacts.mentionsIn(element) }))
    )
    const tracked = this.trackedFiles()
    const found = this.codeWords(tracked)
    const oldest = Math.min(...open.map(({ element }) => written.get(element.id) ?? Infinity))
    const history = this.history(oldest)
    const later = this.laterMentions(written)
    const now = this.plan.now.getTime()
    const items = open.map(({ kind, element, mentions }): StaleItem => {
      const facts = this.plan.facts(element)
      const at = written.get(facts.id)
      const paths = mentions.paths.map((path) => StaleFacts.pathFacts(path, tracked, this.checkout))
      const commits = StaleFacts.commitsFor(paths, history, at)
      return {
        id: facts.id,
        kind,
        title: facts.title,
        state: this.plan.itemState(element),
        written: at === undefined ? undefined : new Date(at).toISOString(),
        ageDays: at === undefined ? undefined : Math.floor((now - at) / DAY),
        phase: this.phaseFacts(element),
        paths,
        names: mentions.names.map((name) => ({ name, found: found.has(name) })),
        commits: { count: commits.length, latest: commits.slice(0, LATEST_COMMITS).map(StaleFacts.commitLine) },
        namedInCommits: (history.byItem.get(facts.id) ?? []).slice(0, LATEST_COMMITS).map(StaleFacts.commitLine),
        laterMentions: later.get(facts.id) ?? [],
        closeRefused: this.plan.closeRefusal(facts.id, { marked: this.marked }),
        tidyNoted: StaleFacts.tidyNoted(element)
      }
    })
    return { epic: this.epic, checkout: this.checkout, items }
  }

  /** `report` as lines to read, one per item. */
  static lines({ epic, items }: StaleReport): string[] {
    const line = (item: StaleItem) => {
      const phase = item.phase ? `P${item.phase.number} ${item.phase.status}` : "no phase"
      const age = item.ageDays === undefined ? "?" : `${item.ageDays}d`
      const gone = item.paths.filter((path) => !path.exists).length
      const missing = item.names.filter((name) => !name.found).length
      const facts = [
        phase,
        age,
        `files ${item.paths.length - gone}/${item.paths.length}`,
        `names ${item.names.length - missing}/${item.names.length}`,
        `${item.commits.count} commits since`,
        ...(item.laterMentions.length ? [`later:  ${item.laterMentions.map((each) => each.id).join(" ")}`] : []),
        ...(item.closeRefused ? [`refused:  ${item.closeRefused}`] : []),
        ...(item.tidyNoted ? ["tidy noted"] : [])
      ]
      return `${item.id.toUpperCase().padEnd(6)}${item.title}\n      ${facts.join("  ·  ")}`
    }
    return [`${epic}:  ${items.length} open`, ...items.map(line)]
  }

  /** `<epic-status>` text:  a tidy's doubtful note on `item` already, its time;  `undefined` for none. */
  private static tidyNoted(item: Element): string | undefined {
    const cards = Array.from(item.querySelectorAll("epic-status"))
    const card = cards.find((each) => TIDY_NOTE.test((each.textContent ?? "").trim()))
    return card ? (card.getAttribute("at") ?? "") : undefined
  }

  /** When each item was written:  its first log line, else its `changed` stamp (ms). */
  private writtenTimes(): Map<string, number> {
    const written = new Map<string, number>()
    for (const { at, text } of this.plan.reviewLines()) {
      for (const [, id] of text.matchAll(ITEM_WORD)) {
        const key = id!.toLowerCase()
        if (!written.has(key)) written.set(key, StaleFacts.timeOf(at))
      }
    }
    for (const item of Array.from(this.plan.document.querySelectorAll("epic-item[id]"))) {
      if (written.has(item.id)) continue
      const changed = StaleFacts.timeOf(item.getAttribute("changed"))
      if (changed > -Infinity) written.set(item.id, changed)
    }
    return written
  }

  /** `text`, a time as the page writes it, in ms;  `-Infinity` for none. */
  private static timeOf(text: string | null | undefined): number {
    const at = text ? Date.parse(text.replace(" ", "T")) : NaN
    return Number.isNaN(at) ? -Infinity : at
  }

  /** `item`'s phase:  its `phase` attribute, else the phase it's nested in. */
  private phaseFacts(item: Element): StaleItem["phase"] {
    const number = item.getAttribute("phase")
    const nested = item.closest("epic-phase")
    const phase: Phase | undefined = this.plan.phases.find(
      (each) => (number !== null && each.number === number) || (nested !== null && each.id === nested.id)
    )
    if (!phase) return undefined
    return { id: phase.id, number: phase.number, name: phase.name, status: phase.status, done: phase.status === "done" }
  }

  /** The files and code names `item` mentions:  its code spans and links, not its status cards or Original Discussion. */
  private static mentionsIn(item: Element): { paths: string[]; names: string[] } {
    const paths = new Set<string>()
    const names = new Set<string>()
    const looked = Array.from(item.querySelectorAll("code, a[href]")).filter(
      (element) => !element.closest("epic-original, epic-status")
    )
    for (const element of looked) {
      if (element.localName === "a") {
        const path = StaleFacts.pathOf(element.getAttribute("href") ?? "")
        if (path) paths.add(path)
        continue
      }
      const titled = StaleFacts.pathOf(element.getAttribute("title") ?? "")
      if (titled) paths.add(titled)
      const text = (element.textContent ?? "").trim()
      const path = StaleFacts.pathOf(text)
      if (path) paths.add(path)
      const name = StaleFacts.codeName(text)
      if (name) names.add(name)
    }
    return { paths: [...paths], names: [...names] }
  }

  /** `text` as a checkout path (`parser/src/core/page.ts`), else `undefined`:  a link or a span naming a code file. */
  private static pathOf(text: string): string | undefined {
    if (!text || /\s/.test(text) || /^(?:[a-z]+:|#|mailto:)/i.test(text)) return undefined
    const path = text
      .replace(/[?#].*$/, "")
      .replace(/:\d+(?::\d+)?$/, "")
      .replace(/^(?:\.{0,2}\/)+/, "")
    if (!CODE_FILE.test(path) || PAGE_FOLDERS.test(path)) return undefined
    return path
  }

  /**
   * `text` as a code name to look for, or `undefined`:  `PlanDoc.noteStatus()` -> `noteStatus`, `<epic-item>` ->
   * `epic-item`.  Skips plain lower-case words:  they'd be found anywhere.
   */
  private static codeName(text: string): string | undefined {
    const tag = /^<([a-z][a-z0-9]*(?:-[a-z0-9]+)+)\b[^>]*>$/.exec(text)
    if (tag) return tag[1]
    const code = /^([A-Za-z_$][\w$]*(?:\.[A-Za-z_$][\w$]*)*)(\(.*\))?$/.exec(text)
    if (!code) return undefined
    const [, dotted, call] = code
    const last = dotted!.split(".").at(-1)!
    return call !== undefined || dotted!.includes(".") || /[A-Z_]/.test(last) ? last : undefined
  }

  /**
   * Every word in the checkout's tracked code files, one pass:  a code name is found when it's among them.
   * - generated files and files past `MAX_SEARCHED` left out
   * - NOT `git grep -f`:  its `-F -w` with hundreds of patterns took over a minute on this repo
   */
  private codeWords(tracked: Map<string, string[]>): Set<string> {
    const words = new Set<string>()
    for (const files of tracked.values())
      for (const file of files) {
        if (!CODE_FILE.test(file) || NOT_SEARCHED.test(file)) continue
        try {
          const path = join(this.checkout, file)
          if (statSync(path).size > MAX_SEARCHED) continue
          for (const word of readFileSync(path, "utf8").matchAll(CODE_WORD)) words.add(word[0])
        } catch {
          // deleted in the working tree, or unreadable:  nothing to find there
        }
      }
    return words
  }

  /** The checkout's tracked files, by base name;  a missing git:  none. */
  private trackedFiles(): Map<string, string[]> {
    const byName = new Map<string, string[]>()
    for (const file of SRV.Git.lines(["ls-files"], this.checkout, { timeout: GIT_TIMEOUT })) {
      const name = basename(file)
      byName.set(name, [...(byName.get(name) ?? []), file])
    }
    return byName
  }

  /**
   * What `path` (as an item wrote it) is in the checkout:  tracked as written, by its end, or by its base name;
   * else on disk at that path;  else gone.
   */
  private static pathFacts(path: string, tracked: Map<string, string[]>, checkout: string): StalePath {
    const candidates = tracked.get(basename(path)) ?? []
    const at = candidates.filter((file) => file === path || file.endsWith(`/${path}`))
    if (at.length) return { path, exists: true, at }
    if (candidates.length && !path.includes("/")) return { path, exists: true, at: candidates }
    return { path, exists: existsSync(join(checkout, path)), at: [] }
  }

  /** The commits since `since` (ms), newest first, by file and by the item they name;  empty without git. */
  private history(since: number): CommitHistory {
    const after = Number.isFinite(since) ? [`--since=${new Date(since - DAY).toISOString()}`] : []
    const out = SRV.Git.out(
      ["log", "--no-merges", "--no-renames", "--name-only", `--format=%x01%h%x09%at%x09%s`, ...after],
      this.checkout,
      { timeout: GIT_TIMEOUT }
    )
    const history: CommitHistory = { byFile: new Map(), byItem: new Map() }
    for (const record of (out ?? "").split("\x01").filter(Boolean)) {
      const [head, ...files] = record.split("\n").filter(Boolean)
      const [sha, seconds, ...subject] = head!.split("\t")
      const commit = { sha: sha!, at: Number(seconds) * 1000, subject: subject.join("\t") }
      for (const file of files) history.byFile.set(file, [...(history.byFile.get(file) ?? []), commit])
      const named = PlanCommits.parseCommitSubject(commit.subject)
      if (named?.epic === this.epic)
        for (const item of named.items) history.byItem.set(item, [...(history.byItem.get(item) ?? []), commit])
    }
    return history
  }

  /** The commits, newest first, touching any of `paths` (a file gone included, by its end) since `written`. */
  private static commitsFor(paths: StalePath[], history: CommitHistory, written: number | undefined): StaleCommit[] {
    const files = new Set(paths.flatMap(({ path, at }) => (at.length ? at : [path])))
    const seen = new Map<string, StaleCommit>()
    for (const file of files) {
      const direct = history.byFile.get(file)
      const commits =
        direct ?? [...history.byFile].filter(([each]) => each.endsWith(`/${file}`)).flatMap(([, list]) => list)
      for (const commit of commits) if (written === undefined || commit.at >= written) seen.set(commit.sha, commit)
    }
    return [...seen.values()].sort((a, b) => b.at - a.at)
  }

  /** A commit as `epic stale` reports it:  short sha, ISO date, subject. */
  private static commitLine = ({ sha, at, subject }: StaleCommit) => ({
    sha,
    date: new Date(at).toISOString(),
    subject
  })

  /**
   * For each item:  the items and phases written after it that mention it (`<a href="#i7">`, `<epic-link item>`, `I7`
   * in their text);  a phase not finished counts as later.  May name another epic's `I7` too:  a fact to weigh.
   */
  private laterMentions(written: Map<string, number>): Map<string, StaleMention[]> {
    const ids = new Set(Array.from(this.plan.document.querySelectorAll("epic-item[id]"), (item) => item.id))
    const later = new Map<string, StaleMention[]>()
    const add = (mentioner: StaleMention, at: number, text: Element) => {
      const named = new Set<string>()
      for (const [, id] of (text.textContent ?? "").matchAll(ITEM_WORD)) named.add(id!.toLowerCase())
      for (const link of Array.from(text.querySelectorAll('a[href^="#"], epic-link[item], epic-mark[item]')))
        named.add((link.getAttribute("href")?.slice(1) ?? link.getAttribute("item") ?? "").toLowerCase())
      for (const id of named) {
        if (id === mentioner.id || !ids.has(id) || at <= (written.get(id) ?? -Infinity)) continue
        later.set(id, [...(later.get(id) ?? []), mentioner])
      }
    }
    for (const item of Array.from(this.plan.document.querySelectorAll("epic-item[id]"))) {
      add(
        { id: item.id, status: item.getAttribute("status") ?? "open", title: this.plan.facts(item).title },
        written.get(item.id) ?? -Infinity,
        item
      )
    }
    for (const phase of this.plan.phases) {
      const element = this.plan.phase(phase.n)
      const doneAt = StaleFacts.timeOf(element.getAttribute("done-at"))
      add(
        { id: phase.id, status: phase.status, title: `P${phase.number} · ${phase.name}` },
        phase.status === "done" || phase.status === "dropped" ? doneAt : Infinity,
        element
      )
    }
    return later
  }
}

/** `StaleFacts`' constructor. */
export type StaleFactsOptions = {
  plan: PlanDoc
  epic: string
  checkout: string
  marked?: ReadonlySet<string>
}

/** What `epic stale --json` prints. */
export type StaleReport = {
  /** the epic's name */
  epic: string
  /** the checkout the files and commits were read from */
  checkout: string
  /** one per open item, page order */
  items: StaleItem[]
}

/** The facts on one open item. */
export type StaleItem = {
  /** `i7` */
  id: string
  /** `judgement`, `issue`, `todo` or `limit` */
  kind: ItemKind
  title: string
  /** its colour's state, as the page draws it (`PlanReader.itemState()`) */
  state: string
  /** when it was written, ISO:  its first log line, else its last change;  `undefined` for neither */
  written: string | undefined
  /** whole days since `written` */
  ageDays: number | undefined
  /** the phase it's filed in, and whether that's done;  `undefined` for none */
  phase: { id: string; number: string; name: string; status: string; done: boolean } | undefined
  /** the files it mentions, and whether each still exists */
  paths: StalePath[]
  /** the code names it mentions, and whether each is still in the code */
  names: { name: string; found: boolean }[]
  /** the commits touching those files since it was written:  how many, and the latest few */
  commits: { count: number; latest: { sha: string; date: string; subject: string }[] }
  /** commits whose subject names it (`<epic> I7:  ...`) */
  namedInCommits: { sha: string; date: string; subject: string }[]
  /** later items and phases that mention it */
  laterMentions: StaleMention[]
  /** why `epic close --why` would refuse it;  `undefined` when it wouldn't */
  closeRefused: string | undefined
  /** a tidy already noted it might be obsolete:  that card's time */
  tidyNoted: string | undefined
}

/** A file an item mentions. */
export type StalePath = {
  /** as the item wrote it */
  path: string
  /** whether it's in the checkout */
  exists: boolean
  /** the tracked files it names:  several when it's only a base name */
  at: string[]
}

/** An item or phase that mentions an item. */
export type StaleMention = { id: string; status: string; title: string }

/** A commit found by `StaleFacts`. */
type StaleCommit = { sha: string; at: number; subject: string }

/** The commits since the oldest item, by file and by the item a subject names. */
type CommitHistory = { byFile: Map<string, StaleCommit[]>; byItem: Map<string, StaleCommit[]> }

/** The kinds `epic stale` reports, in the page's order. */
const STALE_KINDS: ItemKind[] = ["judgement", "issue", "todo", "limit"]

/** One day, in ms. */
const DAY = 86_400_000

/** How many commits each list keeps:  the count says the rest. */
const LATEST_COMMITS = 5

/** Git calls cover the whole repo at once. */
const GIT_TIMEOUT = 60_000

/** A code file's name:  what a mention must end in to count as a file (`.html`:  a page, left out). */
const CODE_FILE = /\.(?:[cm]?[jt]sx?|css|json5?|mjs|md|py|sh|ya?ml)$/

/** Paths of the epic folder and docs:  pages and logs, not code. */
const PAGE_FOLDERS = /^(?:spell\.epics|epics|guides|pages|brand|sagas|goals|agents|templates)\//

/** Item ids as text:  `I7`, `J12`. */
const ITEM_WORD = /\b([QTJIM]\d+)\b/g

/** A tidy's card for an item it couldn't settle (`/epic tidy`):  not written twice. */
const TIDY_NOTE = /^Maybe obsolete:/

/** Generated files and vendored bundles, left out of the search for names. */
const NOT_SEARCHED = /(?:^|\/)(?:_assets|__pack|dist|node_modules)\/|\.lock$/

/** The largest file searched for names:  past it, a bundle or a data file. */
const MAX_SEARCHED = 1_048_576

/** A word in code:  an identifier, or a hyphened name (`epic-item`). */
const CODE_WORD = /[\w$]+(?:-[\w$]+)*/g
