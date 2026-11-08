import { existsSync, readFileSync, statSync } from "node:fs"
import { basename, dirname, join } from "node:path"

import { SRV } from "spell/server"

import { PlanCommits } from "./PlanCommits"
import type { PlanDoc } from "./PlanDoc"
import { PROMISED_CARD, SETTLED_AS, type ItemKind, type Phase } from "./planDoc.types"

/****************
 * ### `StaleFacts`
 * The FACTS for judging which of an epic's open judgement calls, issues and todos have gone stale (`epic stale`,
 * epic `epic-engine` Q69):  it decides nothing.  `/epic tidy`'s agents read them against the code.
 * - each item's age (from when it was WRITTEN, never its `changed` stamp), its phase and whether that's done
 * - the files and code names it mentions, and whether they still exist, in the epic's worktree OR on `main`
 *   (a worktree can be far behind);  something that was never in the repo isn't reported at all:  only what git's
 *   history has can be gone
 * - the commits that touched those files since it was written, and the commits naming it (this epic's only)
 * - later items and phases that mention it, the todo made to follow it up, the done phases it says it waits for
 * - every status card already on it
 * - whether `epic close --why` would refuse it (`PlanDoc.closeRefusal()`), whether a tidy already left a card,
 *   whether Owen has settled it
 * - Fast for 300 items:  git runs a fixed few times for the whole page (`ls-files` per checkout, one `log` for the
 *   commits and one for what was deleted, one `grep` of a few old trees), never per item;  names are looked up in one
 *   pass over the tracked code files.
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

  /** the main checkout, when `checkout` is a worktree:  a name or file there counts as still existing */
  readonly main: string | undefined

  /** the page's file:  the epic repo's history of its part files says when each item was written */
  readonly file: string | undefined

  /** every epic's name:  `data T16` in this page's text is another epic's item, not this one's */
  readonly epics: ReadonlySet<string>

  constructor({ plan, epic, checkout, marked = new Set(), main, file, epics = new Set() }: StaleFactsOptions) {
    this.plan = plan
    this.epic = epic
    this.checkout = checkout
    this.marked = marked
    this.main = main === checkout ? undefined : main
    this.file = file
    this.epics = epics
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
    const files = this.trackedFiles()
    const tracked = StaleFacts.byBaseName(files)
    const found = this.codeWords(files)
    const oldest = Math.min(...open.map(({ element }) => written.get(element.id) ?? Infinity))
    const history = this.history(oldest)
    const deleted = this.deletedFiles()
    const once = this.namesOnceInCode(
      [...new Set(open.flatMap(({ mentions }) => mentions.names))].filter((name) => !found.has(name)),
      oldest
    )
    const later = this.laterMentions(written)
    const followUps = this.followUps()
    const now = this.plan.now.getTime()
    const items = open.map(({ kind, element, mentions }): StaleItem => {
      const facts = this.plan.facts(element)
      const at = written.get(facts.id)
      const paths = mentions.paths.flatMap((path) => this.pathFacts(path, tracked, deleted) ?? [])
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
        names: mentions.names
          .filter((name) => found.has(name) || once.has(name))
          .map((name) => ({ name, found: found.has(name) })),
        commits: { count: commits.length, latest: commits.slice(0, LATEST_COMMITS).map(StaleFacts.commitLine) },
        namedInCommits: (history.byItem.get(facts.id) ?? []).slice(0, LATEST_COMMITS).map(StaleFacts.commitLine),
        laterMentions: later.get(facts.id) ?? [],
        madeTodo: followUps.get(facts.id),
        waitsOnDone: this.waitsOnDone(element, facts.title),
        statusCards: StaleFacts.statusCards(element),
        closeRefused: this.plan.closeRefusal(facts.id, { marked: this.marked }),
        tidyNoted: StaleFacts.tidyNoted(element),
        settled: StaleFacts.isSettled(kind, facts)
      }
    })
    return { epic: this.epic, checkout: this.checkout, main: this.main, items }
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
        ...(item.madeTodo ? [`todo ${item.madeTodo.id} ${item.madeTodo.status}`] : []),
        ...(item.waitsOnDone.length
          ? [`waits on done:  ${item.waitsOnDone.map((each) => `P${each.number}`).join(" ")}`]
          : []),
        ...(item.statusCards.length ? [`${item.statusCards.length} card(s)`] : []),
        ...(item.closeRefused ? [`refused:  ${item.closeRefused}`] : []),
        ...(item.tidyNoted ? ["tidy noted"] : []),
        ...(item.settled ? ["settled"] : [])
      ]
      return `${item.id.toUpperCase().padEnd(6)}${item.title}\n      ${facts.join("  ·  ")}`
    }
    return [`${epic}:  ${items.length} open`, ...items.map(line)]
  }

  /** `<epic-status>` text:  a tidy's doubtful note on `item` already, its time;  `undefined` for none. */
  private static tidyNoted(item: Element): string | undefined {
    const card = StaleFacts.cardsOf(item).find((each) => TIDY_NOTE.test((each.textContent ?? "").trim()))
    return card ? (card.getAttribute("at") ?? "") : undefined
  }

  /** `item`'s own status cards. */
  private static cardsOf(item: Element): Element[] {
    return Array.from(item.querySelectorAll(":scope > epic-status"))
  }

  /** Every status card on `item`, oldest first:  "Obviated by ..." and a leftover Done card are facts too. */
  private static statusCards(item: Element): StaleCard[] {
    return StaleFacts.cardsOf(item).map((card) => ({
      state: card.getAttribute("state") ?? "",
      at: card.getAttribute("at") ?? "",
      text: (card.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, CARD_TEXT)
    }))
  }

  /**
   * A judgement call Owen has settled:  approved as it stands, followed up by a todo, or reviewed with no ask.
   * - `/epic tidy` doesn't read these again:  a call that only records something is finished with once he's seen it
   */
  private static isSettled(kind: ItemKind, facts: { reviewed: string | undefined; reviewAs: string | undefined }) {
    if (kind !== "judgement") return false
    return SETTLED_AS.has(facts.reviewAs ?? "") || (facts.reviewed !== undefined && facts.reviewAs === undefined)
  }

  /**
   * The todo made to follow each item up, by the item's id:  its "Made todo T23" card, else a todo's "From I7" line.
   * - status included:  a follow-up that exists is usually what makes an issue moot
   */
  private followUps(): Map<string, StaleItem["madeTodo"]> {
    const made = new Map<string, StaleItem["madeTodo"]>()
    const facts = (todo: string) => {
      const item = this.plan.findItem(todo)
      return item ? { id: item.id, status: item.getAttribute("status") ?? "open" } : undefined
    }
    for (const item of Array.from(this.plan.document.querySelectorAll("epic-item[id]"))) {
      const fromLine = Array.from(item.querySelectorAll("p")).find((each) => FROM_LINE.test(each.textContent ?? ""))
      const from = fromLine?.querySelector('a[href^="#"]')?.getAttribute("href")?.slice(1).toLowerCase()
      if (from && item.id.startsWith("t") && !made.has(from)) made.set(from, facts(item.id))
    }
    for (const item of Array.from(this.plan.document.querySelectorAll("epic-item[id]"))) {
      for (const card of StaleFacts.cardsOf(item)) {
        const todo = MADE_TODO.exec((card.textContent ?? "").trim())?.[1]
        if (todo) made.set(item.id, facts(todo) ?? made.get(item.id))
      }
    }
    return made
  }

  /**
   * The DONE phases `item` says it waits for ("until P35", "comes with P35's setup"):  a promise to check.
   * - its own words:  title and text, not cards, replies or commits
   */
  private waitsOnDone(item: Element, title: string): StaleItem["waitsOnDone"] {
    const copy = item.cloneNode(true) as Element
    for (const each of Array.from(copy.querySelectorAll(NOT_ITS_WORDS))) each.remove()
    const numbers = new Set(
      Array.from(`${title} ${copy.textContent ?? ""}`.matchAll(WAITS_ON_PHASE), (match) => match[1]!)
    )
    return this.plan.phases
      .filter((phase) => phase.status === "done" && numbers.has(phase.number))
      .map(({ id, number, name }) => ({ id, number, name }))
  }

  /**
   * When each item was written (ms):  the earliest of the facts that can't be moved by a later edit.
   * - its part file first appearing in the epic repo's history
   * - the first log line naming it (another epic's id doesn't count)
   * - the earliest dated thing inside it (a status card, a reply)
   * - NEVER its `changed` stamp, which any edit moves;  none of these:  unknown
   */
  private writtenTimes(): Map<string, number> {
    const written = new Map<string, number>()
    const earliest = (id: string, at: number) => {
      if (at > -Infinity) written.set(id, Math.min(written.get(id) ?? Infinity, at))
    }
    for (const [id, at] of this.partFilesAdded()) earliest(id, at)
    for (const { at, text } of this.plan.reviewLines())
      for (const id of this.idsIn(text)) earliest(id, StaleFacts.timeOf(at))
    for (const item of Array.from(this.plan.document.querySelectorAll("epic-item[id]")))
      for (const dated of Array.from(item.querySelectorAll("[at]")))
        earliest(item.id, StaleFacts.timeOf(dated.getAttribute("at")))
    return written
  }

  /** When each item's part file was added to the epic repo, by item id;  best effort, none without git. */
  private partFilesAdded(): Map<string, number> {
    const added = new Map<string, number>()
    if (!this.file) return added
    const folder = dirname(this.file)
    const out = SRV.Git.out(
      ["log", "--diff-filter=A", "--no-renames", "--name-only", "--format=%x01%at", "--", "parts"],
      folder,
      { timeout: GIT_TIMEOUT }
    )
    // newest first:  a file added twice keeps its first adding
    for (const record of (out ?? "").split("\x01").filter(Boolean)) {
      const [seconds, ...files] = record.split("\n").filter(Boolean)
      for (const file of files) added.set(basename(file, ".html"), Number(seconds) * 1000)
    }
    return added
  }

  /**
   * The item ids (lower case) `text` names as this epic's.
   * - not one written after another epic's name:  `data T16`, ````data`` T16, T17`
   */
  private idsIn(text: string): Set<string> {
    const ids = new Set<string>()
    let foreign = false
    let end = 0
    for (const match of text.matchAll(ITEM_WORD)) {
      const before = text.slice(end, match.index)
      const word = /([a-z][a-z0-9-]*)`?\s+$/.exec(before)?.[1]
      foreign =
        word !== undefined && word !== this.epic && this.epics.has(word) ? true : foreign && LIST_JOIN.test(before)
      if (!foreign) ids.add(match[1]!.toLowerCase())
      end = match.index + match[0].length
    }
    return ids
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
      // a file's span isn't a name too:  `saved.ts` would look for `ts`
      const name = path ? undefined : StaleFacts.codeName(text)
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
   * Every word in the tracked code files of the checkout and `main`, one pass:  a code name is found when it's among
   * them.
   * - generated files and files past `MAX_SEARCHED` left out
   * - a file the same in both is read once (by its git blob)
   * - NOT `git grep -f`:  its `-F -w` with hundreds of patterns took over a minute on this repo
   */
  private codeWords(files: TrackedFile[]): Set<string> {
    const words = new Set<string>()
    const seen = new Set<string>()
    for (const { root, file, blob } of files) {
      if (seen.has(blob) || !CODE_FILE.test(file) || NOT_SEARCHED.test(file)) continue
      seen.add(blob)
      try {
        const path = join(root, file)
        if (statSync(path).size > MAX_SEARCHED) continue
        for (const word of readFileSync(path, "utf8").matchAll(CODE_WORD)) words.add(word[0])
      } catch {
        // deleted in the working tree, or unreadable:  nothing to find there
      }
    }
    return words
  }

  /** The checkouts to look in:  the epic's own, then `main` when that's another. */
  private get roots(): string[] {
    return this.main ? [this.checkout, this.main] : [this.checkout]
  }

  /** The tracked files of each checkout;  a missing git:  none. */
  private trackedFiles(): TrackedFile[] {
    return this.roots.flatMap((root) =>
      SRV.Git.lines(["ls-files", "-s"], root, { timeout: GIT_TIMEOUT }).flatMap((line) => {
        const [head, file] = line.split("\t")
        const blob = head?.split(" ")[1]
        return file && blob ? [{ root, file, blob }] : []
      })
    )
  }

  /** `files` by base name, each path once. */
  private static byBaseName(files: TrackedFile[]): Map<string, string[]> {
    const byName = new Map<string, Set<string>>()
    for (const { file } of files) {
      const name = basename(file)
      byName.set(name, (byName.get(name) ?? new Set()).add(file))
    }
    return new Map(Array.from(byName, ([name, paths]) => [name, [...paths]]))
  }

  /**
   * Every file ever deleted, by base name:  only these can be "gone".
   * - one `git log`, the whole history
   */
  private deletedFiles(): Map<string, Set<string>> {
    const out = SRV.Git.out(
      ["log", "--no-renames", "--diff-filter=D", "--name-only", "--format=", ...this.revisions()],
      this.checkout,
      { timeout: GIT_TIMEOUT }
    )
    const deleted = new Map<string, Set<string>>()
    for (const file of (out ?? "").split("\n").filter(Boolean)) {
      const name = basename(file)
      deleted.set(name, (deleted.get(name) ?? new Set()).add(file))
    }
    return deleted
  }

  /**
   * Which of `names` (missing from the code now) were in the code at some point since `since`:  only those can be
   * "gone".  A word that only looks like code, or that an item's prose coined, is in no old tree.
   * - `git grep` over a few trees spread across the window:  a name that came and went between two of them is missed,
   *   which only loses a hint
   */
  private namesOnceInCode(names: string[], since: number): Set<string> {
    const once = new Set<string>()
    if (!names.length) return once
    const after = Number.isFinite(since) ? [`--since=${new Date(since - DAY).toISOString()}`] : []
    const commits = SRV.Git.lines(["rev-list", ...after, ...this.revisions()], this.checkout, { timeout: GIT_TIMEOUT })
    if (!commits.length) return once
    const trees = Array.from(
      { length: OLD_TREES },
      (_, at) => commits[Math.round(((commits.length - 1) * at) / Math.max(1, OLD_TREES - 1))]!
    )
    const patterns = names.flatMap((name) => ["-e", name])
    const out = SRV.Git.out(
      ["grep", "-h", "-o", "-w", "-F", ...patterns, ...new Set(trees), "--", ...NOT_GREPPED],
      this.checkout,
      { timeout: GIT_TIMEOUT }
    )
    for (const word of (out ?? "").split("\n")) if (word) once.add(word)
    return once
  }

  /** The commits to read:  this checkout's, and `main`'s when that's another. */
  private revisions(): string[] {
    const mainHead = this.main
      ? SRV.Git.out(["rev-parse", "HEAD"], this.main, { timeout: GIT_TIMEOUT })?.trim()
      : undefined
    return mainHead ? ["HEAD", mainHead] : ["HEAD"]
  }

  /**
   * What `path` (as an item wrote it) is:  tracked as written, by its end, or by its base name;  else on disk;
   * else gone, when git's history deleted it;  else `undefined`:  it was never a repo file
   * (a runtime path, an example:  `__members/owen@spell.json5`, `recipes/<id>.json`).
   */
  private pathFacts(
    path: string,
    tracked: Map<string, string[]>,
    deleted: Map<string, Set<string>>
  ): StalePath | undefined {
    const candidates = tracked.get(basename(path)) ?? []
    const at = candidates.filter((file) => file === path || file.endsWith(`/${path}`))
    if (at.length) return { path, exists: true, at }
    if (candidates.length && !path.includes("/")) return { path, exists: true, at: candidates }
    if (this.roots.some((root) => existsSync(join(root, path)))) return { path, exists: true, at: [] }
    const was = [...(deleted.get(basename(path)) ?? [])]
    return was.some((file) => file === path || file.endsWith(`/${path}`)) ? { path, exists: false, at: [] } : undefined
  }

  /** The commits since `since` (ms), newest first, by file and by the item they name;  empty without git. */
  private history(since: number): CommitHistory {
    const after = Number.isFinite(since) ? [`--since=${new Date(since - DAY).toISOString()}`] : []
    const out = SRV.Git.out(
      [
        "log",
        "--no-merges",
        "--no-renames",
        "--name-only",
        `--format=%x01%h%x09%at%x09%s`,
        ...after,
        ...this.revisions()
      ],
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

  /**
   * The commits, newest first, touching any of `paths` (a file gone included, by its end) since `written`.
   * - a bare base name that several files share (`index.ts`, `places.ts`) says nothing:  left out, or every commit
   *   to any of them would count (data J69 had 48)
   */
  private static commitsFor(paths: StalePath[], history: CommitHistory, written: number | undefined): StaleCommit[] {
    const files = new Set(
      paths.flatMap(({ path, at }) => (at.length === 0 ? [path] : path.includes("/") || at.length === 1 ? at : []))
    )
    const seen = new Map<string, StaleCommit>()
    for (const file of files) {
      const direct = history.byFile.get(file)
      const ends = direct ? [] : [...history.byFile].filter(([each]) => each.endsWith(`/${file}`))
      if (!file.includes("/") && ends.length > 1) continue
      const commits = direct ?? ends.flatMap(([, list]) => list)
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
   * in their text);  a phase not finished counts as later.  Another epic's `data I7` doesn't count.
   */
  private laterMentions(written: Map<string, number>): Map<string, StaleMention[]> {
    const ids = new Set(Array.from(this.plan.document.querySelectorAll("epic-item[id]"), (item) => item.id))
    const later = new Map<string, StaleMention[]>()
    const add = (mentioner: StaleMention, at: number, text: Element) => {
      const named = this.idsIn(text.textContent ?? "")
      for (const link of Array.from(text.querySelectorAll('a[href^="#"], epic-link[item], epic-mark[item]'))) {
        const other = link.getAttribute("epic")
        if (other && other !== this.epic) continue
        named.add((link.getAttribute("href")?.slice(1) ?? link.getAttribute("item") ?? "").toLowerCase())
      }
      for (const id of named) {
        // not `<=`:  a todo made in the same minute as what it follows up is still later
        if (id === mentioner.id || !ids.has(id) || at < (written.get(id) ?? -Infinity)) continue
        later.set(id, [...(later.get(id) ?? []), mentioner])
      }
    }
    for (const item of Array.from(this.plan.document.querySelectorAll("epic-item[id]"))) {
      add(
        { id: item.id, status: item.getAttribute("status") ?? "open", title: this.plan.facts(item).title },
        // no date on it:  it may be later, so it counts
        written.get(item.id) ?? Infinity,
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
  /** the main checkout, when `checkout` is a worktree */
  main?: string
  /** the page's file:  its part files' history says when items were written */
  file?: string
  /** every epic's name:  to tell another epic's `T16` from this one's */
  epics?: ReadonlySet<string>
}

/** What `epic stale --json` prints. */
export type StaleReport = {
  /** the epic's name */
  epic: string
  /** the checkout the files and commits were read from */
  checkout: string
  /** `main`, read too when `checkout` is a worktree;  `undefined` when `checkout` is it */
  main: string | undefined
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
  /** when it was written, ISO, from what no later edit moves (`writtenTimes()`);  `undefined` for unknown */
  written: string | undefined
  /** whole days since `written` */
  ageDays: number | undefined
  /** the phase it's filed in, and whether that's done;  `undefined` for none */
  phase: { id: string; number: string; name: string; status: string; done: boolean } | undefined
  /** the files it mentions that are or were in the repo, and whether each still exists */
  paths: StalePath[]
  /** the code names it mentions that are or were in the code, and whether each still is */
  names: { name: string; found: boolean }[]
  /** the commits touching those files since it was written:  how many, and the latest few */
  commits: { count: number; latest: { sha: string; date: string; subject: string }[] }
  /** commits whose subject names it, as this epic's (`<epic> I7:  ...`) */
  namedInCommits: { sha: string; date: string; subject: string }[]
  /** later items and phases that mention it */
  laterMentions: StaleMention[]
  /** the todo made to follow it up, and that todo's status */
  madeTodo: { id: string; status: string } | undefined
  /** the done phases it says it waits for ("until P35"):  check the promised thing arrived */
  waitsOnDone: { id: string; number: string; name: string }[]
  /** every status card already on it, oldest first */
  statusCards: StaleCard[]
  /** why `epic close --why` would refuse it;  `undefined` when it wouldn't */
  closeRefused: string | undefined
  /** a tidy already left its card (`Maybe obsolete:`, `Partly obsolete:`, `Promised, not delivered:`):  that card's time */
  tidyNoted: string | undefined
  /** a judgement call Owen has settled:  tidy doesn't read it again */
  settled: boolean
}

/** A status card already on an item. */
export type StaleCard = {
  /** `underway`, `done` or `noted` */
  state: string
  /** its time, as the page writes it */
  at: string
  /** its words, cut short */
  text: string
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

/** A file git tracks in a checkout. */
type TrackedFile = { root: string; file: string; blob: string }

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
const TIDY_NOTE = new RegExp(`^(?:Maybe obsolete:|Partly obsolete:|${PROMISED_CARD})`)

/** Between two ids of one list:  `data T16, T17`, `T16 and T17`. */
const LIST_JOIN = /^\s*(?:,|and|,\s*and)\s*$/

/** A status card's start, saying a follow-up was made:  its todo's id. */
const MADE_TODO = /^Made todo (T\d+)\b/

/** A follow-up todo's line naming what it came from (`PlanDoc.followUp()`). */
const FROM_LINE = /^\s*From [A-Z]\d+\b/

/** Inside an item, what isn't its own words:  for what it says it's waiting for. */
const NOT_ITS_WORDS = "epic-status, epic-reply, epic-original, epic-commit, epic-choices"

/** Words saying an item waits for a phase:  "until P35", "needs P28", "comes with P35's setup". */
const WAITS_ON_PHASE =
  /\b(?:until|till|waits?\s+(?:for|on)|waiting\s+(?:for|on)|needs|comes?\s+with|left\s+(?:to|for)|deferred\s+to|once)\s+(?:phase\s+)?P(\d+)\b/gi

/** The most of a card's words a report holds. */
const CARD_TEXT = 240

/** How many old trees `namesOnceInCode()` searches. */
const OLD_TREES = 4

/** Left out of that search:  bundles, as `NOT_SEARCHED`. */
const NOT_GREPPED = [":!*/_assets/*", ":!*/__pack/*", ":!*/dist/*", ":!*.lock"]

/** Generated files and vendored bundles, left out of the search for names. */
const NOT_SEARCHED = /(?:^|\/)(?:_assets|__pack|dist|node_modules)\/|\.lock$/

/** The largest file searched for names:  past it, a bundle or a data file. */
const MAX_SEARCHED = 1_048_576

/** A word in code:  an identifier, or a hyphened name (`epic-item`). */
const CODE_WORD = /[\w$]+(?:-[\w$]+)*/g
