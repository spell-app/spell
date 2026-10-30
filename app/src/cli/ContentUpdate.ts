import { existsSync, mkdirSync, readFileSync } from "node:fs"
import { dirname, join } from "node:path"

import { escapeRegExp } from "spell/util/string"
import { DataFile } from "spell/server/DataFile"
import { Git } from "spell/server/Git"
import { contentFolderOf } from "spell/server/contentFolder"
import { CLI } from "spell/cli"
import { EpicDocs } from "spell/epic/tool/EpicDocs"
import { PlanCommits } from "spell/epic/tool/PlanCommits"
import { PlanDocFiles } from "spell/epic/tool/PlanDocFiles"
import type {
  AlwaysRule,
  ContentUpdateMemory,
  ContentUpdateReport,
  EpicChanges,
  NewAttribute,
  NewComponent,
  NewRule,
  OfferedOption,
  UpdateCommit,
  UpdateMark
} from "spell/app/cli/cli.types"

/****************
 * ### `ContentUpdate`
 * What the parser and Spell UI learned since the examples and notebooks were last brought up to date:
 * the work behind `spell content update` (epic `content` P3).
 *
 * ```ts
 * const update = ContentUpdate.of(checkout)
 * update.gather()                    // => { since, head, epics, components, attributes, grammar, options }
 * update.done({ always: ["component"] }) // the stop commit moves to HEAD;  every new component always upgraded
 * ```
 *
 * - What it lists, since the stop commit:
 *   - the commits under `parser/` and `ui/`, grouped by the epic their subjects name, each epic with its changelog
 *     entry
 *   - Spell UI's new components and new attributes (its component data, then and now)
 *   - the parser's new grammar rules (its syntax table, then and now)
 * - Each listed change has an id (`component:ui-space`), which marks it:
 *   - an "always" rule matching it
 *   - an option of the content epic's standing set "Upgrades on offer" naming it:  on offer, picked or turned down
 * - What it remembers, `content-updates.json5` in the content epic's shared folder:  the stop commit and the always
 *   rules;  the picks are the standing set's own.
 * - "Then" is the file as it was at the last commit before the stop commit's time that changed it:  the parser's and
 *   Spell UI's histories were merged into this repo (epic `repo-split` P20), so an older stop commit's tree may not
 *   have their folders at all.
 * - Its position:  node only, NOT in `spell/app/cli`'s barrel;  imports the epic tool's node files by path
 *   (`PlanCommits`, `EpicDocs`, `PlanDocFiles`), and nothing of spell itself.
 * - Reads only, but for `done()`.
 ****************/
export class ContentUpdate {
  /** the kit checkout it reads:  its git, its parser's and Spell UI's data files */
  readonly root: string

  /** the shared content folder:  the epic page, the changelog, the memory file */
  readonly content: string

  constructor({ root, content }: { root: string; content: string }) {
    this.root = root
    this.content = content
  }

  /**
   * The update of the checkout at `checkout`, with its shared content folder.
   * - throws `CliError` when the checkout names no content folder
   */
  static of(checkout: string): ContentUpdate {
    const content = contentFolderOf(checkout)
    if (!content) throw new CLI.CliError("no shared content folder:  .epic/config.json5 names none (contentFolder)")
    return new ContentUpdate({ root: checkout, content })
  }

  ////////////////
  // ## Remembering
  ////////////////

  /** The memory file:  `epics/content/content-updates.json5` in the shared content. */
  get file(): string {
    return join(this.content, "epics", CONTENT_EPIC, MEMORY_FILE)
  }

  /** What the last update left:  its stop commit and the always rules;  none yet, no stop commit and no rules. */
  get memory(): ContentUpdateMemory {
    return DataFile.read<ContentUpdateMemory>(this.file) ?? { always: [] }
  }

  /**
   * Record an update's end:  the stop commit moves to `HEAD`, and `always` joins the always rules (each id once).
   * - returns the memory as written
   * - SIDE EFFECT:  writes the memory file (its folder too);  the shared content's turn hook commits it
   * - throws `CliError` when git can't read `HEAD`
   */
  done({ always = [], today = new Date() }: { always?: string[]; today?: Date } = {}): ContentUpdateMemory {
    const memory = this.memory
    const added = today.toISOString().slice(0, 10)
    for (const id of always) if (!memory.always.some((rule) => rule.id === id)) memory.always.push({ id, added })
    memory.last = this.commitAt("HEAD")
    mkdirSync(dirname(this.file), { recursive: true })
    DataFile.write(this.file, memory)
    return memory
  }

  ////////////////
  // ## Gathering
  ////////////////

  /**
   * Everything new since the stop commit, each change marked.
   * - before any `--done`:  since `FIRST_STOP`, `guessed`
   * - throws `CliError` when git doesn't know the stop commit
   */
  gather(): ContentUpdateReport {
    const { last, always } = this.memory
    const since = { ...this.commitAt(last?.commit ?? FIRST_STOP), guessed: !last }
    const epics = this.epicChanges(since)
    const components = ContentUpdate.newComponents(
      this.jsonAt(COMPONENTS_FILE, since.date),
      this.jsonAt(COMPONENTS_FILE)
    )
    const grammar = ContentUpdate.newGrammar(this.jsonAt(SYNTAX_FILE, since.date), this.jsonAt(SYNTAX_FILE))
    const report: ContentUpdateReport = {
      since,
      head: this.commitAt("HEAD"),
      epics,
      ...components,
      grammar,
      options: this.offeredOptions()
    }
    ContentUpdate.mark(report, always)
    return report
  }

  /** `ref`'s full sha and commit time;  throws `CliError` when git doesn't know it. */
  commitAt(ref: string): { commit: string; date: string } {
    const line = Git.out(["log", "-1", "--format=%H%x09%cI", ref], this.root)
    if (!line) throw new CLI.CliError(`git doesn't know commit '${ref}' in ${this.root}`)
    const [commit, date] = line.split("\t")
    return { commit: commit!, date: date! }
  }

  /**
   * The commits under `parser/` and `ui/` since `since`, merges left out, grouped by epic, most commits first.
   * - reachable from `HEAD` and not from `since`, and made after its time:  without the time, the merged-in
   *   histories of both folders would all count as new
   * - an epic:  the one `PlanCommits.parseCommitSubject()` reads (`debut I89:`), else a bare `<name>:` naming an epic
   *   folder of the shared content (`debut:  ...`);  else `other`
   */
  epicChanges(since: { commit: string; date: string }): EpicChanges[] {
    const raw = Git.out(
      [
        "log",
        "--no-merges",
        `--format=${LOG_FORMAT}`,
        `--since=${since.date}`,
        `${since.commit}..HEAD`,
        "--",
        ...WATCHED
      ],
      this.root
    )
    const commits = PlanDocFiles.parseTimedLog(raw ?? "").map(({ sha, time, subject }) => ({
      epic: this.epicOf(subject),
      commit: { sha: sha.slice(0, 9), date: time!, subject, ...ContentUpdate.namedIn(subject) }
    }))
    const groups = ContentUpdate.groupByEpic(commits)
    for (const group of groups) if (group.epic) group.changelog = EpicDocs.changelogEntryIn(this.content, group.epic)
    return groups
  }

  /** The epic `subject` names:  as an epic page lists a commit, else a bare `<epic>:` lead;  `null` for none. */
  epicOf(subject: string): string | null {
    const named = PlanCommits.parseCommitSubject(subject)?.epic
    if (named) return named
    const bare = BARE_EPIC.exec(subject)?.[1]
    return bare && existsSync(join(this.content, "epics", bare)) ? bare : null
  }

  /**
   * Data file `path` (from the checkout's root) parsed as JSON5:  as it is now, or, given `before`, as the last commit
   * before then that changed it left it;  `undefined` when there was none.
   */
  jsonAt(path: string, before?: string): unknown {
    if (!before) {
      const file = join(this.root, path)
      return existsSync(file) ? DataFile.parse(readFileSync(file, "utf8")) : undefined
    }
    const sha = Git.out(["log", "-1", "--format=%H", `--before=${before}`, "HEAD", "--", path], this.root)
    const text = sha && Git.out(["show", `${sha}:${path}`], this.root)
    return text ? DataFile.parse(text) : undefined
  }

  /**
   * The options of the content epic's standing set "Upgrades on offer", in letter order;  none when it isn't there.
   * - read from the epic page itself:  `epic items --json` lists no standing set
   */
  offeredOptions(): OfferedOption[] {
    const files = new PlanDocFiles({ root: this.root, content: this.content })
    const set = files.read(files.findDoc(CONTENT_EPIC)).document.querySelector(`epic-choices#${UPGRADES_SET}`)
    return set ? ContentUpdate.optionsIn(set) : []
  }

  ////////////////
  // ## Pure steps
  ////////////////

  /** A standing set's options:  each one's letter, title, text (its earlier versions left out) and state. */
  static optionsIn(set: Element): OfferedOption[] {
    return Array.from(set.querySelectorAll(":scope > epic-option"), (option) => {
      const slot = option.getAttribute("slot")
      const now = Array.from(option.childNodes).filter((node) => (node as Element).getAttribute?.("slot") !== "was")
      const title = option.getAttribute("title") ?? ""
      return {
        letter: option.getAttribute("letter") ?? "",
        title,
        text: [title, ...now.map((node) => node.textContent ?? "")].join(" "),
        state: slot === "picked" ? "picked" : slot === "removed" ? "removed" : "offered"
      }
    })
  }

  /** The phases and items a commit subject names (`PlanCommits.parseCommitSubject()`);  none when it names none. */
  static namedIn(subject: string): Pick<UpdateCommit, "phases" | "items"> {
    const parsed = PlanCommits.parseCommitSubject(subject)
    return { phases: parsed?.phases ?? [], items: parsed?.items ?? [] }
  }

  /** Commits grouped by epic, newest first in each;  groups by most commits, `other` last. */
  static groupByEpic(commits: { epic: string | null; commit: UpdateCommit }[]): EpicChanges[] {
    const groups = new Map<string | null, EpicChanges>()
    for (const { epic, commit } of commits) {
      const group = groups.get(epic) ?? { id: `epic:${epic ?? OTHER}`, epic, commits: [], marks: [] }
      group.commits.push(commit)
      groups.set(epic, group)
    }
    return [...groups.values()].sort((a, b) => Number(!a.epic) - Number(!b.epic) || b.commits.length - a.commits.length)
  }

  /**
   * Spell UI's new components, and the new attributes of the ones it had, from its component data then and now
   * (`ui/docs/__data/components.json5`'s `components`).
   */
  static newComponents(before: unknown, after: unknown): { components: NewComponent[]; attributes: NewAttribute[] } {
    const then = new Map(componentsOf(before).map((component) => [component.tag, component]))
    const components: NewComponent[] = []
    const attributes: NewAttribute[] = []
    for (const component of componentsOf(after)) {
      const { tag, name = tag, description = "" } = component
      const old = then.get(tag)
      if (!old) {
        components.push({ id: `component:${tag}`, tag, name, description, marks: [] })
        continue
      }
      const had = new Set((old.attributes ?? []).map((attribute) => attribute.name))
      for (const attribute of component.attributes ?? [])
        if (!had.has(attribute.name))
          attributes.push({
            id: `attribute:${tag}:${attribute.name}`,
            tag,
            name: attribute.name,
            description: attribute.description ?? "",
            marks: []
          })
    }
    return { components, attributes }
  }

  /**
   * The parser's new grammar rules, from its syntax table then and now (`parser/src/spell/spellSyntax.json`):
   * every rule class that wasn't there, internal ones left out.
   */
  static newGrammar(before: unknown, after: unknown): NewRule[] {
    const had = new Set(rulesOf(before).map((rule) => rule.className))
    return rulesOf(after)
      .filter((rule) => !rule.internal && !had.has(rule.className))
      .map(({ className, module, ruleNames = [], purpose = "" }) => ({
        id: `grammar:${className}`,
        className,
        module,
        ruleNames,
        purpose,
        marks: []
      }))
  }

  /**
   * Mark every change in `report`, IN PLACE:  an always rule it matches (its id, or the start of its id up to a
   * colon), and each option of `report.options` whose text names its id.
   */
  static mark(report: ContentUpdateReport, always: AlwaysRule[]): void {
    for (const change of [...report.epics, ...report.components, ...report.attributes, ...report.grammar]) {
      const marks: UpdateMark[] = always
        .filter((rule) => change.id === rule.id || change.id.startsWith(`${rule.id}:`))
        .map((rule) => ({ kind: "always", rule: rule.id }))
      for (const option of report.options)
        if (ContentUpdate.names(option.text, change.id))
          marks.push({ kind: option.state, letter: option.letter, title: option.title })
      change.marks = marks
    }
  }

  /** Does `text` name id `id` as a whole word (`component:ui-space`, not `component:ui-spacer`)? */
  static names(text: string, id: string): boolean {
    return new RegExp(`(^|[^\\w:-])${escapeRegExp(id)}(?![\\w:-])`).test(text)
  }
}

////////////////
// ## Constants and helpers
////////////////

/** The standing epic this command serves:  its folder holds the memory file, its page the standing set. */
const CONTENT_EPIC = "content"

/** The memory file's name, in the content epic's folder. */
const MEMORY_FILE = "content-updates.json5"

/** The standing set the session fills, on the content epic's page. */
const UPGRADES_SET = "s-upgrades-on-offer"

/**
 * Where the first update starts, before any `--done`:  the examples' last rewrite as a whole (Solitaire and Task List
 * in spellx, epic `elemental-spell`, 2026-10-25;  epic `content` J10).
 */
const FIRST_STOP = "6efbde477"

/** The folders whose commits count:  the language and the components. */
const WATCHED = ["parser", "ui"]

/** Spell UI's component data, and the parser's syntax table, from the checkout's root. */
const COMPONENTS_FILE = "ui/docs/__data/components.json5"
const SYNTAX_FILE = "parser/src/spell/spellSyntax.json"

/** `git log`'s line:  sha, commit time, subject (`PlanDocFiles.parseTimedLog()`). */
const LOG_FORMAT = "%H%x09%cI%x09%s"

/** A subject led by a bare epic name:  `debut:  Solitaire's cards ...`. */
const BARE_EPIC = /^([a-z][a-z0-9]*(?:-[a-z0-9]+)*):\s/

/** The group of commits that name no epic. */
const OTHER = "other"

/** A component's entry in Spell UI's component data, as far as this reads it. */
type ComponentEntry = {
  tag: string
  name?: string
  description?: string
  attributes?: { name: string; description?: string }[]
}

/** A rule's entry in the parser's syntax table, as far as this reads it. */
type RuleEntry = { className: string; internal?: boolean; ruleNames?: string[]; purpose?: string }

/** The components of component data `data`;  none when it has none. */
function componentsOf(data: unknown): ComponentEntry[] {
  return (data as { components?: ComponentEntry[] } | undefined)?.components ?? []
}

/** Every rule of syntax table `data`, with its module's name;  none when it has none. */
function rulesOf(data: unknown): (RuleEntry & { module: string })[] {
  const modules = (data as { modules?: { module: string; rules: RuleEntry[] }[] } | undefined)?.modules ?? []
  return modules.flatMap(({ module, rules }) => rules.map((rule) => ({ ...rule, module })))
}
