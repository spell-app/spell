import { readFileSync } from "node:fs"
import { basename, dirname, join } from "node:path"

import { escapeRegExp } from "spell/util/string"
import { Git } from "spell/server/Git"

import { CODE_FILE, GENERATED_FILE, TEST_CALL, TEST_FILE } from "./coherence.types"

/****************
 * ### `RepoCode`
 * One repo's code, as the score reads it:  its `src/`, at a commit or in the working tree, by `git grep`.
 * - Code only:  never tests or their helpers, generated files or bundles (`isScored()`).
 * - Paths are from the CHECKOUT's root, as the catalog writes them:  `ui/src/runtime/Sources.ts`.
 * - `commit`:  none:  the working tree, untracked files too (a plan's new files count before they're committed)
 * - Every git run through the kit's `Git`:  NEVER throws for a search that finds nothing.
 ****************/
export class RepoCode {
  /** The repo's code files (`src/`), from the repo's root:  what every search is limited to. */
  private scoredFiles?: Set<string>

  /**
   * - `root`:  the repo's folder;  `folder`:  that from the checkout's root (the kit's:  `""`)
   * - `commit`:  the commit to read;  none:  the working tree
   * - `inside`:  folders inside `root` that are code of their own (the kit's folders, `ui` ...), left out here
   */
  constructor(
    readonly name: string,
    readonly root: string,
    readonly folder: string,
    readonly commit?: string,
    readonly inside: readonly string[] = []
  ) {}

  /** Each scored file, from the checkout's root. */
  get files(): string[] {
    return [...this.scored].map((path) => this.fromCheckout(path))
  }

  /**
   * Each line of the scored code `pattern` matches (git's Perl regex), as `{ file, line }`, files from the
   * checkout's root.
   * - `-o`:  only what matched is read back, never a bundle's megabyte line
   * - NEVER throws:  a bad pattern finds nothing, and says so on stderr through `onProblem`
   */
  grep(pattern: string, onProblem: (message: string) => void = () => {}): Array<{ file: string; line: number }> {
    const run = Git.run(
      ["grep", "-n", "-o", "-I", "-P", ...this.grepFlags, "-e", codeLine(pattern), ...this.revision, "--", ...SEARCHED],
      this.root,
      {
        trim: false
      }
    )
    if (!run.ok && run.code !== 1) onProblem(`${this.name}:  git grep -P '${pattern}' failed:  ${run.err}`)
    const seen = new Set<string>()
    const found: Array<{ file: string; line: number }> = []
    for (const each of run.out.split("\n")) {
      const match = this.withoutRevision(each).match(/^(.+?):(\d+):/)
      if (!match || !this.scored.has(match[1]!)) continue
      const key = `${match[1]}:${match[2]}`
      if (seen.has(key)) continue
      seen.add(key)
      found.push({ file: this.fromCheckout(match[1]!), line: Number(match[2]) })
    }
    return found
  }

  /**
   * The scored files using any of `names`, from the checkout's root:  called, constructed or read
   * (`after(`, `new Git(`, `Git.out`, `Map<`), through a package's namespace (`P.Tokenizer`, `UIT.Key`) or extended;
   *   never a member of something else (`.every(`)
   */
  filesNaming(names: string[]): string[] {
    if (!names.length) return []
    const any = names.map((name) => escapeRegExp(name)).join("|")
    const words = `(?<![.\\w$])(${any})\\b(?=\\s*[(.<])|\\b[A-Z]{1,3}\\.(${any})\\b|\\bextends (${any})\\b`
    return [...new Set(this.grep(words).map((hit) => hit.file))]
  }

  /** File `path`'s text (from the checkout's root), at the commit;  `undefined` when it isn't there. */
  text(path: string): string | undefined {
    const inRepo = this.inRepo(path)
    if (inRepo === undefined) return undefined
    if (this.commit) return Git.out(["show", `${this.commit}:${inRepo}`], this.root, { trim: false })
    try {
      return readFileSync(join(this.root, inRepo), "utf8")
    } catch {
      return undefined
    }
  }

  /** How many tests the repo has:  each `it(` / `test(` at a line's start, in its test files, wherever they are. */
  get testCount(): number {
    const run = Git.run(
      [
        "grep",
        "-c",
        "-I",
        "-P",
        ...this.grepFlags,
        "-e",
        TEST_CALL,
        ...this.revision,
        "--",
        ".",
        ...this.inside.map((folder) => `:(exclude)${folder}`)
      ],
      this.root
    )
    let count = 0
    for (const each of run.out.split("\n")) {
      const match = this.withoutRevision(each).match(/^(.+):(\d+)$/)
      if (match && TEST_FILE.test(match[1]!) && !match[1]!.includes("node_modules/")) count += Number(match[2])
    }
    return count
  }

  /**
   * Whether the score reads `path` (from the repo's root):  code under `src/`, never a test, generated file or bundle.
   * - `siblings`:  the other files, for a bundle beside its entry (`spell-ui.js` beside `spell-ui.entry.js`)
   */
  static isScored(path: string, siblings: ReadonlySet<string>): boolean {
    if (!path.startsWith("src/") || !CODE_FILE.test(path)) return false
    if (TEST_FILE.test(path) || GENERATED_FILE.test(path)) return false
    return !isBundle(path, siblings)
  }

  /** The scored files, from the repo's root. */
  private get scored(): Set<string> {
    if (this.scoredFiles) return this.scoredFiles
    const listed = this.commit
      ? Git.lines(["ls-tree", "-r", "--name-only", this.commit, "--", "src"], this.root)
      : Git.lines(["ls-files", "--cached", "--others", "--exclude-standard", "--", "src"], this.root)
    const all = new Set(listed)
    this.scoredFiles = new Set(listed.filter((path) => RepoCode.isScored(path, all)))
    return this.scoredFiles
  }

  /** `git grep`'s flags for where it reads:  the working tree's untracked files too. */
  private get grepFlags(): string[] {
    return this.commit ? [] : ["--untracked"]
  }

  /** The commit, as `git grep` takes it after its pattern;  none for the working tree. */
  private get revision(): string[] {
    return this.commit ? [this.commit] : []
  }

  /** A `git grep` line without its `<commit>:` prefix. */
  private withoutRevision(line: string): string {
    return this.commit && line.startsWith(`${this.commit}:`) ? line.slice(this.commit.length + 1) : line
  }

  /** `path`, from the repo's root, as from the checkout's root. */
  private fromCheckout(path: string): string {
    return this.folder ? `${this.folder}/${path}` : path
  }

  /** `path`, from the checkout's root, as from the repo's;  `undefined` when it's another repo's. */
  private inRepo(path: string): string | undefined {
    if (!this.folder) return path.startsWith("src/") ? path : undefined
    return path.startsWith(`${this.folder}/`) ? path.slice(this.folder.length + 1) : undefined
  }
}

/**
 * `pattern`, matched on code lines only:  never a comment's line (starting `//`, `*`, `/*` or `<!--`).
 * - With `-o`, git prints the line up to the match:  so a pattern's own `^` can't be used, and isn't.
 */
export function codeLine(pattern: string): string {
  return `^(?!\\s*(?:\\*|//|/\\*|<!--))(?:.*?)(?:${pattern})`
}

/** What `git grep` reads:  `src/`, without what the score never reads (`GENERATED_FILE`), so no bundle is printed. */
const SEARCHED = [
  "src",
  ":(exclude,glob)**/__pack/**",
  ":(exclude,glob)**/__data/**",
  ":(exclude,glob)**/lazy/**",
  ":(exclude,glob)**/emoji/**",
  ":(exclude,glob)**/*.min.js"
]

/** Whether `path` is a bundle:  built from an entry beside it (`commands.js` beside `commands.entry.js`). */
function isBundle(path: string, siblings: ReadonlySet<string>): boolean {
  const name = basename(path).replace(/\.[cm]?js$/, "")
  if (name === basename(path) || name.endsWith(".entry")) return false
  const folder = dirname(path)
  return [".js", ".ts", ".mjs"].some((extension) => siblings.has(`${folder}/${name}.entry${extension}`))
}
