import { existsSync, readFileSync, realpathSync, writeFileSync } from "node:fs"
import { join, relative } from "node:path"

import { Git } from "spell/server/Git"
import { SRV } from "spell/server"
import { PeopleColors } from "spell/epic/config/PeopleColors"
import { AuthorWords } from "spell/epic/tool/AuthorWords"
import { RootLinks } from "spell/epic/tool/migrations/RootLinks"
import { SharedComments } from "spell/epic/tool/SharedComments"

import { PersonCommands } from "./PersonCommands"

/****************
 * ### `NameSweep`
 * A person's old name rewritten as their new one wherever it says who WROTE something, across the content folder
 * (epic `epic-friend` P2, Q10:  the name is the identity, so a rename is a rewrite):  `epic whoami --rename <new>`.
 *
 * ```ts
 * new NameSweep({ content }).run("Ana", "Ana Lima", { dryRun: true })
 * // => { from: "Ana", to: "Ana Lima", count: 6, files: [{ path: "epics/seo/seo.plan.html", count: 2 }, ...] }
 * ```
 *
 * - Where, in the pages and data files `PersonCommands.filesIn()` reads (epics, sagas, guides, pages):
 *   - a page's markup:  `from="Ana"` on any element (`<epic-reply>`, `<epic-status>` ...), `by="Ana"` on any (a
 *     guide's `<spell-note-reply>`);  escaped markup (`&lt;epic-reply from="Ana"&gt;`) is a page SHOWING it:  left
 *   - a page's text:  the phrases the writers put a name in (`AuthorWords`:  "Ana's run", "Ana picked B",
 *     `<b>Ana:</b>` ...);  "Ana" anywhere else in a sentence stays
 *   - a data file (an inbox, an answer, a draft):  `"by": "Ana"`, quoted or not
 * - The name matched whole, any case (`PersonCommands.sameName()`, as `whois` counts):  "Anabel" is someone else.
 * - Each file written only when it changed, every other byte kept, under the lock its writers take
 *   (`RootLinks.lockOf()`:  a part locks its page);  `dryRun` writes nothing and counts the same.
 * - Then each of their COMMENTS FILES moves to the new name (`SharedComments.rename()`, epic `epic-friend` P9):
 *   `seo.comments.ana.json5` => `seo.comments.ana-lima.json5`;  and their colour's, `people/ana.json5` =>
 *   `people/ana-lima.json5`, the name in it too (`PeopleColors.rename()`, epic `epic-friend` P13);  and when the content folder is a repo of its own,
 *   all of it is ONE commit there (`commit()`), so a teammate's sync sees a move, not a new person.
 * - Its position:  the command layer's;  knows the content folder's files, never a page's elements.
 ****************/
export class NameSweep {
  /** the content folder it sweeps */
  readonly content: string

  /** - `content`:  the content folder (`PersonCommands`' own) */
  constructor({ content }: { content: string }) {
    this.content = content
  }

  /**
   * Rename `from` as `to` in every file that names them as an author;  what changed (or would, with `dryRun`).
   * - files in path order;  none:  `count` 0
   * - NEVER throws for a file that won't read:  it's skipped
   */
  run(from: string, to: string, { dryRun = false }: { dryRun?: boolean } = {}): SweepResult {
    const files: SweptFile[] = []
    const all = PersonCommands.filesIn(this.content)
    for (const file of all) {
      const count = dryRun ? this.sweepFile(file, from, to, "count") : this.sweepUnderLock(file, from, to)
      if (count) files.push({ path: relative(this.content, file), count })
    }
    const colorFile = PeopleColors.rename(this.content, from, to, { dryRun })
    const moved = [
      ...SharedComments.rename(all, from, to, { dryRun }),
      ...(colorFile && colorFile[0] !== colorFile[1] ? [colorFile] : [])
    ].map(([old, now]) => [relative(this.content, old), relative(this.content, now)] as [string, string])
    return { from, to, dryRun, count: files.reduce((sum, file) => sum + file.count, 0), files, moved }
  }

  /**
   * Commit what `result` (`run()`'s) changed in the content folder, as ONE commit, when the folder is a git repo of
   * its own (the content repo):  its short hash, else `undefined` (not a repo, a dry run, nothing changed).
   * - only those files:  anything else waiting stays for the turn's commit (`epic shared commit`)
   * - NEVER throws:  a git failure leaves the files for the turn's commit
   * - SIDE EFFECT:  `git add` and `git commit` in the content repo
   */
  commit(result: SweepResult): string | undefined {
    if (result.dryRun) return undefined
    const top = Git.out(["rev-parse", "--show-toplevel"], this.content)
    if (!top || realpathSync(top) !== realpathSync(this.content)) return undefined
    const paths = [...result.files.map((file) => file.path), ...result.moved.flat()]
    const known = [...new Set(paths)].filter(
      (path) =>
        existsSync(join(this.content, path)) || Git.run(["ls-files", "--error-unmatch", "--", path], this.content).ok
    )
    if (!known.length) return undefined
    if (!Git.run(["add", "-A", "--", ...known], this.content).ok) return undefined
    const message = `epic whoami --rename:  ${result.from} as ${result.to}`
    const commit = Git.run(["-c", "commit.gpgsign=false", "commit", "-q", "-m", message, "--", ...known], this.content)
    return commit.ok ? Git.out(["rev-parse", "--short", "HEAD"], this.content) : undefined
  }

  /** `file` swept under its writers' lock;  how many names changed. */
  private sweepUnderLock(file: string, from: string, to: string): number {
    return SRV.FileLock.run(RootLinks.lockOf(file), () => this.sweepFile(file, from, to, "write"), RootLinks.LOCK)
  }

  /** `file` swept:  how many names it holds, and (`write`) rewritten when any;  0 for a file that won't read. */
  private sweepFile(file: string, from: string, to: string, mode: "count" | "write"): number {
    let text: string
    try {
      text = readFileSync(file, "utf8")
    } catch {
      return 0
    }
    const swept = file.endsWith(".html") ? NameSweep.renamePage(text, from, to) : NameSweep.renameData(text, from, to)
    if (mode === "write" && swept.count) writeFileSync(file, swept.text)
    return swept.count
  }

  ////////////////
  // ## Statics:  one file's text
  ////////////////

  /**
   * Page `html` with `from` renamed `to` as an author:  `from=` / `by=` on an element written in the page, and the
   * writers' phrases (`AuthorWords.rename()`);  and how many.
   */
  static renamePage(html: string, from: string, to: string): Renamed {
    let count = 0
    const tags = html.replace(ELEMENT, (tag) =>
      tag.replace(AUTHOR_ATTRIBUTE, (whole, name: string, value: string) => {
        if (!PersonCommands.sameName(value, from)) return whole
        count++
        return ` ${name}="${escapeAttribute(to)}"`
      })
    )
    const phrases = AuthorWords.rename(tags, from, to)
    return { text: phrases.text, count: count + phrases.count }
  }

  /** Data file `text` (JSON5) with every `by` naming `from` renamed `to`, as written (quotes kept);  and how many. */
  static renameData(text: string, from: string, to: string): Renamed {
    let count = 0
    const renamed = text.replace(BY_KEY, (whole, key: string, value: string) => {
      if (!PersonCommands.sameName(value, from)) return whole
      count++
      return `${key}${JSON.stringify(to)}`
    })
    return { text: renamed, count }
  }
}

/** What `NameSweep.run()` changed, or would. */
export type SweepResult = {
  /** the old name */
  from: string
  /** the new name */
  to: string
  /** nothing was written */
  dryRun: boolean
  /** names changed, in all */
  count: number
  /** each file that names them, its path from the content folder */
  files: SweptFile[]
  /** each comments file moved to the new name, `[from, to]` from the content folder (`SharedComments.rename()`) */
  moved: [string, string][]
}

/** One file's part of a `SweepResult`. */
export type SweptFile = {
  /** its path from the content folder, `epics/seo/parts/q3.html` */
  path: string
  /** names changed in it */
  count: number
}

/** A text with a name renamed, and how many times. */
type Renamed = { text: string; count: number }

/** An element's opening tag written in a page (not escaped as `&lt;`), with any attributes. */
const ELEMENT = /<[a-z][\w-]*\s[^<>]*>/g

/** An author attribute in a tag:  `from="Ana"`, `by="Ana"`. */
const AUTHOR_ATTRIBUTE = /\s(from|by)="([^"]*)"/g

/** A data file's `by` and its text:  `"by": "Ana"`, `by: "Ana"`;  the key and its colon kept as written. */
const BY_KEY = /((?<![\w$])["']?by["']?\s*:\s*)"([^"]*)"/g

/** `text` for an attribute's double quotes. */
function escapeAttribute(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/"/g, "&quot;").replace(/</g, "&lt;")
}
