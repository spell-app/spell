import { spawnSync } from "node:child_process"
import { createHash } from "node:crypto"
import {
  chmodSync,
  existsSync,
  mkdirSync,
  mkdtempSync,
  readdirSync,
  readFileSync,
  rmSync,
  writeFileSync
} from "node:fs"
import { homedir, tmpdir } from "node:os"
import { dirname, extname, join, relative, sep } from "node:path"

/****************
 * ### `PrivateNames`
 * The names this repo must never hold (a customer's project, a company), read from a private file on this machine:
 * `~/.spell/private-names` (epic `epic-engine` T153).
 * - The list lives OUTSIDE every repo, so no rule, test or commit ever names what's on it.
 * - One name a line, matched in any case;  `#` starts a comment.
 *   - A line may be a pattern:  letters, digits, spaces and `| ( ) [ ] . * + ? { } , - _ ^ $`.
 *     Nothing else, so git and JavaScript read it the same way:  a line the check can't read fails it, loudly.
 *   - `allow <commit>`:  a commit already public, let through (its message, its changes and pictures).
 * - Missing:  `load()` writes an empty one (mode 600) saying how to add a name, and the check passes, saying so.
 * - Another file:  `SPELL_PRIVATE_NAMES` (the tests' own).
 ****************/
export class PrivateNames {
  /** the list's file */
  readonly file: string
  /** each name or pattern, with its line in the file */
  readonly patterns: ListPattern[]
  /** commits let through, full or short ids */
  readonly allowed: string[]
  /** was there no file, before `load()` wrote one? */
  readonly wasMissing: boolean

  constructor({ file, text, wasMissing = false }: { file: string; text: string; wasMissing?: boolean }) {
    this.file = file
    this.wasMissing = wasMissing
    this.patterns = []
    this.allowed = []
    text.split("\n").forEach((raw, index) => {
      const line = raw.trim()
      if (!line || line.startsWith("#")) return
      const allow = ALLOW_LINE.exec(line)
      if (allow) return void this.allowed.push(allow[1]!.toLowerCase())
      if (!READABLE_PATTERN.test(line))
        throw new SyntaxError(
          `PrivateNames:  line ${index + 1} of ${file} can't be read, so nothing was checked.\n` +
            "Write a plain name, or use only letters, digits, spaces and | ( ) [ ] . * + ? { } , - _ ^ $"
        )
      let regex: RegExp
      try {
        regex = new RegExp(line, "i")
      } catch {
        throw new SyntaxError(`PrivateNames:  line ${index + 1} of ${file} isn't a pattern that works:  fix it first`)
      }
      this.patterns.push({ line: index + 1, source: line, regex })
    })
  }

  /** Where the list is on this machine:  `SPELL_PRIVATE_NAMES`, else `~/.spell/private-names`. */
  static get home(): string {
    return process.env[PRIVATE_NAMES_SETTING] || join(homedir(), ".spell", "private-names")
  }

  /**
   * The list in `file`;  none there:  an empty one written first (mode 600), saying how to add a name.
   * - throws `SyntaxError` for a line it can't read:  a misread list never passes silently
   */
  static load(file = PrivateNames.home): PrivateNames {
    const wasMissing = !existsSync(file)
    if (wasMissing) {
      mkdirSync(dirname(file), { recursive: true })
      writeFileSync(file, EMPTY_LIST, { mode: 0o600 })
      chmodSync(file, 0o600)
    }
    return new PrivateNames({ file, text: readFileSync(file, "utf8"), wasMissing })
  }

  /** Are there no names to look for? */
  get isEmpty(): boolean {
    return !this.patterns.length
  }

  /** The list's line of the first name `text` holds;  `undefined` when it holds none. */
  lineFor(text: string): number | undefined {
    return this.patterns.find((pattern) => pattern.regex.test(text))?.line
  }

  /** Is `commit` (a full id) let through by an `allow` line? */
  allows(commit: string): boolean {
    return this.allowed.some((id) => commit.startsWith(id))
  }

  /** Every name as one pattern, for git (`git grep -E`) and a quick first look in JavaScript. */
  get combined(): string {
    return this.patterns.map((pattern) => `(${pattern.source})`).join("|")
  }
}

/****************
 * ### `PictureText`
 * The words in pictures, read by macOS's own text recognition (Vision, through `osascript`), kept by each
 * picture's git blob id in `~/.spell/cache/picture-text/`:  a picture is read once, ever.
 * - Off macOS:  `canRead` is false, and `read()` reads nothing.
 * - Another folder:  `SPELL_PICTURE_TEXT` (the tests' own).
 * - NOTE:  text too small or too faint to recognise is missed, as it would be by eye.
 ****************/
export class PictureText {
  /** the folder the words are kept in, a file per picture */
  readonly folder: string
  /** reads pictures' words, by their files;  macOS's own by default */
  readonly recognise: (files: string[]) => Map<string, string>
  /** can it read pictures on this machine? */
  readonly canRead: boolean

  constructor({
    folder = process.env[PICTURE_TEXT_SETTING] || join(homedir(), ".spell", "cache", "picture-text"),
    recognise,
    canRead = !!recognise || process.platform === "darwin"
  }: PictureTextOptions = {}) {
    this.folder = folder
    this.recognise = recognise ?? recogniseOnMac
    this.canRead = canRead
  }

  /** The git blob id of `bytes`, which names a picture the same in a repo and in a packed file. */
  static idOf(bytes: Buffer): string {
    return createHash("sha1").update(`blob ${bytes.length}\0`).update(bytes).digest("hex")
  }

  /**
   * The words in each picture, by id:  `bytesOf(id)` gives a picture's file contents, asked only when it isn't kept.
   * - `unread`:  the ids it couldn't read (a broken file, or not macOS)
   * - NEVER throws for a picture:  one that won't read is `unread`
   */
  read(pictures: Picture[], bytesOf: (picture: Picture) => Buffer): { text: Map<string, string>; unread: string[] } {
    const text = new Map<string, string>()
    const unread: string[] = []
    const wanted: Picture[] = []
    for (const picture of pictures) {
      const kept = join(this.folder, `${picture.id}.txt`)
      if (existsSync(kept)) text.set(picture.id, readFileSync(kept, "utf8"))
      else wanted.push(picture)
    }
    if (!wanted.length) return { text, unread }
    if (!this.canRead) return { text, unread: wanted.map((picture) => picture.id) }
    const temp = mkdtempSync(join(tmpdir(), "spell-pictures-"))
    try {
      const files = new Map<string, Picture>()
      for (const picture of wanted) {
        const file = join(temp, `${picture.id}${picture.extension}`)
        writeFileSync(file, bytesOf(picture))
        files.set(file, picture)
      }
      const seen = this.recognise([...files.keys()])
      mkdirSync(this.folder, { recursive: true, mode: 0o700 })
      for (const [file, picture] of files) {
        const words = seen.get(file)
        if (words === undefined) unread.push(picture.id)
        else {
          text.set(picture.id, words)
          writeFileSync(join(this.folder, `${picture.id}.txt`), words, { mode: 0o600 })
        }
      }
    } finally {
      rmSync(temp, { recursive: true, force: true })
    }
    return { text, unread }
  }
}

/** Is `path` a picture the check reads, by its extension? */
export function isPicture(path: string): boolean {
  return PICTURE_EXTENSIONS.test(path)
}

/****************
 * ### `NameCheck`
 * Looks for the private names (`PrivateNames`) in what is about to leave this machine:  a push's commits, or a
 * packed npm file (epic `epic-engine` T153).
 * - A push (`push()`, `revisions()`):
 *   - the files at each pushed tip, by `git grep`
 *   - each new commit's message, the lines it adds, and the pictures it adds or changes
 *   - each branch or tag name pushed
 *   - "new":  not on the remote yet (`--not --remotes=<remote>`);  a commit the list `allow`s is let through
 * - A folder (`folder()`):  every file in it, text and pictures:  `spell publish` checks each packed file this way.
 * - Each hit says where (file and line, commit, branch, picture) and WHICH line of the list matched, never the name:
 *   the check's output never names what's on the list.
 * - Pictures:  `PictureText`, so only pictures it hasn't seen before cost anything.
 ****************/
export class NameCheck {
  readonly names: PrivateNames
  readonly pictures: PictureText

  constructor({ names, pictures = new PictureText() }: { names: PrivateNames; pictures?: PictureText }) {
    this.names = names
    this.pictures = pictures
  }

  /**
   * What a push would send:  git's pre-push lines (`<local ref> <local sha> <remote ref> <remote sha>`), to
   * `remote`, from the repo at `repo`.
   * - a deletion (an all-zero local sha) sends nothing
   */
  push(repo: string, lines: string, remote: string): NameReport {
    const pushes = lines
      .split("\n")
      .map((line) => line.trim().split(" "))
      .filter((parts) => parts.length === 4 && !ZERO.test(parts[1]!))
    const tips = pushes.map((parts) => parts[1]!)
    const known = pushes.map((parts) => parts[3]!).filter((sha) => !ZERO.test(sha) && hasCommit(repo, sha))
    const refs = [...new Set(pushes.flatMap((parts) => [parts[0]!, parts[2]!]))]
    return this.revisions(repo, { tips, exclude: [...known, `--remotes=${remote}`], refs })
  }

  /**
   * `tips` and the commits behind them that `exclude` doesn't reach, in the repo at `repo`, and ref names `refs`.
   * - throws when git fails:  a check that couldn't look must not pass
   */
  revisions(repo: string, { tips, exclude = [], refs = [] }: RevisionsOptions): NameReport {
    const report = this.emptyReport()
    if (this.names.isEmpty || !tips.length) return report
    const range = [...tips, "--not", ...exclude]
    const commits = git(repo, ["rev-list", ...range])
      .split("\n")
      .filter(Boolean)
    report.commits = commits.length
    const own = commits.filter((commit) => !this.names.allows(commit))

    for (const ref of refs) {
      const listLine = this.names.lineFor(ref)
      if (listLine) report.hits.push({ kind: "branch", where: ref, listLine })
    }
    for (const tip of new Set(tips)) this.tree(repo, tip, report)
    if (own.length) {
      this.messages(repo, own, report)
      this.changes(repo, own, report)
      this.commitPictures(repo, own, report)
    }
    return report
  }

  /**
   * Every file under `dir`:  text line by line, pictures by `PictureText`;  `label` starts each place it names
   * (`spell-ui@0.8.19`).
   */
  folder(dir: string, label = ""): NameReport {
    const report = this.emptyReport()
    if (this.names.isEmpty) return report
    const pictures: Picture[] = []
    const files = new Map<string, string>()
    for (const file of walk(dir)) {
      const shown = `${label}${label ? ":  " : ""}${relative(dir, file).split(sep).join("/")}`
      const bytes = readFileSync(file)
      if (isPicture(file)) {
        const id = PictureText.idOf(bytes)
        files.set(id, file)
        pictures.push({ id, extension: extname(file).toLowerCase(), where: shown })
        continue
      }
      if (bytes.subarray(0, BINARY_PROBE).includes(0)) continue
      this.lines(bytes.toString("utf8"), (line) => shown + `:${line}`, report)
    }
    this.readPictures(pictures, (picture) => readFileSync(files.get(picture.id)!), report)
    return report
  }

  ////////////////
  // ## A push's parts
  ////////////////

  /** The tracked files at `tip`, by `git grep`, each hit checked again here to say which list line matched. */
  private tree(repo: string, tip: string, report: NameReport): void {
    const found = spawnSync("git", ["grep", "-z", "-n", "-I", "-i", "-E", "-e", this.names.combined, tip], {
      cwd: repo,
      encoding: "utf8",
      maxBuffer: MAX_OUTPUT
    })
    // 1:  nothing found
    if (found.status === 1) return
    if (found.status !== 0) throw new Error(`NameCheck:  git grep failed in ${repo}:  ${found.stderr.trim()}`)
    for (const hit of found.stdout.split("\n").filter(Boolean)) {
      const [place = "", line = "", text = ""] = hit.split("\0")
      const listLine = this.names.lineFor(text) ?? this.names.patterns[0]!.line
      const path = place.slice(tip.length + 1)
      report.hits.push({ kind: "file", where: `${path}:${line}`, listLine })
    }
  }

  /** Each commit's message. */
  private messages(repo: string, commits: string[], report: NameReport): void {
    for (const entry of gitLog(repo, ["--format=%x00%H%x01%B"], commits)) {
      const [commit = "", message = ""] = entry.split("\x01")
      const listLine = this.names.lineFor(message)
      if (listLine) report.hits.push({ kind: "commit", where: `${short(commit)}'s message`, listLine })
    }
  }

  /** The lines each commit adds:  a name added, then taken out, is still in what's pushed. */
  private changes(repo: string, commits: string[], report: NameReport): void {
    const quick = new RegExp(this.names.combined, "i")
    const args = ["--format=%x00%H", "-p", "-U0", "--no-color", "--no-ext-diff", "--no-renames"]
    for (const entry of gitLog(repo, args, commits)) {
      if (!quick.test(entry)) continue
      const commit = entry.slice(0, entry.indexOf("\n"))
      let path = ""
      let lineNumber = 0
      for (const line of entry.split("\n")) {
        if (line.startsWith("+++ ")) path = line.replace(/^\+\+\+ (b\/)?/, "")
        else if (line.startsWith("@@")) lineNumber = Number(/\+(\d+)/.exec(line)?.[1] ?? 0)
        else if (line.startsWith("+")) {
          const listLine = this.names.lineFor(line.slice(1))
          if (listLine)
            report.hits.push({ kind: "commit", where: `${short(commit)} adds it to ${path}:${lineNumber}`, listLine })
          lineNumber++
        }
      }
    }
  }

  /** The pictures each commit adds or changes. */
  private commitPictures(repo: string, commits: string[], report: NameReport): void {
    const pictures = new Map<string, Picture>()
    const args = ["--format=%x00%H", "--raw", "--no-abbrev", "--no-renames", "--diff-filter=AMC"]
    for (const entry of gitLog(repo, args, commits)) {
      const commit = entry.slice(0, entry.indexOf("\n"))
      for (const line of entry.split("\n")) {
        const raw = /^:\d+ \d+ [0-9a-f]+ ([0-9a-f]+) \w+\t(.+)$/.exec(line)
        if (!raw || !isPicture(raw[2]!) || pictures.has(raw[1]!)) continue
        const where = `${raw[2]} (in ${short(commit)})`
        pictures.set(raw[1]!, { id: raw[1]!, extension: extname(raw[2]!).toLowerCase(), where })
      }
    }
    this.readPictures([...pictures.values()], (picture) => blob(repo, picture.id), report)
  }

  ////////////////
  // ## Shared
  ////////////////

  /** Pictures read (or found kept), each checked;  counted in `report.pictures`. */
  private readPictures(pictures: Picture[], bytesOf: (picture: Picture) => Buffer, report: NameReport): void {
    if (!pictures.length) return
    const { text, unread } = this.pictures.read(pictures, bytesOf)
    report.pictures.read += text.size
    report.pictures.unread += unread.length
    if (!this.pictures.canRead) report.pictures.cantRead = true
    for (const picture of pictures) {
      const words = text.get(picture.id)
      // lines joined:  a name split over two lines of a picture is still found
      const listLine = words === undefined ? undefined : this.names.lineFor(words.replace(/\n/g, " "))
      if (listLine) report.hits.push({ kind: "picture", where: picture.where, listLine })
    }
  }

  /** Each line of `text` holding a name, as a hit `where(lineNumber)` names. */
  private lines(text: string, where: (line: number) => string, report: NameReport): void {
    if (!new RegExp(this.names.combined, "i").test(text)) return
    text.split("\n").forEach((line, index) => {
      const listLine = this.names.lineFor(line)
      if (listLine) report.hits.push({ kind: "file", where: where(index + 1), listLine })
    })
  }

  /** A report with nothing found yet. */
  private emptyReport(): NameReport {
    const { file, wasMissing, isEmpty, patterns } = this.names
    return {
      list: file,
      listWasMissing: wasMissing,
      names: isEmpty ? 0 : patterns.length,
      commits: 0,
      pictures: { read: 0, unread: 0 },
      hits: []
    }
  }
}

/**
 * The lines a report prints, for a person, in the novice voice;  `what` says what was checked ("this push").
 * - NEVER prints a name:  each hit says which line of the list it matched
 */
export function nameReportLines(report: NameReport, what: string): string[] {
  const list = report.list.replace(homedir(), "~")
  if (!report.names)
    return [
      `Private names:  nothing was checked, because your list of private names is empty:  ${list}, one name a line.`
    ]
  const { read, unread, cantRead } = report.pictures
  const lines: string[] = []
  if (!report.hits.length)
    lines.push(`Private names:  none found in ${what}${read ? ` (${plural(read, "picture")} checked)` : ""}.`)
  else {
    lines.push(
      `Private names:  ${what} holds ${plural(report.hits.length, "name")} from your private list, ${list}.`,
      "Nothing was sent.  Take each one out, then try again:"
    )
    for (const hit of report.hits)
      lines.push(`  ${HIT_LABELS[hit.kind]}  ${hit.where}  (line ${hit.listLine} of your list)`)
    const commit = report.hits.find((hit) => hit.kind === "commit")?.where.slice(0, 9)
    if (commit)
      lines.push(`A commit that's already public can be let through:  add the line \`allow ${commit}\` to your list.`)
  }
  if (cantRead) lines.push(`${plural(unread, "picture")} not checked:  only a Mac can read the words in pictures.`)
  else if (unread) lines.push(`${plural(unread, "picture")} not checked:  the file wouldn't open.`)
  return lines
}

/** `1 name`, `2 names`. */
function plural(count: number, word: string): string {
  return `${count} ${word}${count === 1 ? "" : "s"}`
}

////////////////
// ## Types and helpers
////////////////

/** The setting naming another list file (the tests'). */
export const PRIVATE_NAMES_SETTING = "SPELL_PRIVATE_NAMES"

/** The setting naming another folder for the pictures' words (the tests'). */
export const PICTURE_TEXT_SETTING = "SPELL_PICTURE_TEXT"

/** One name or pattern of the list. */
export type ListPattern = {
  /** its line in the file, from 1 */
  line: number
  source: string
  regex: RegExp
}

/** A picture to read. */
export type Picture = {
  /** its git blob id */
  id: string
  /** `.png` ... */
  extension: string
  /** where it is, for a hit */
  where: string
}

/** `PictureText`'s options. */
export type PictureTextOptions = {
  folder?: string
  /** reads each file's words;  a file left out couldn't be read */
  recognise?: (files: string[]) => Map<string, string>
  canRead?: boolean
}

/** `NameCheck.revisions()`'s options. */
export type RevisionsOptions = {
  /** the commits pushed, each a tip */
  tips: string[]
  /** what the other side has already:  commits, or `--remotes=<remote>` */
  exclude?: string[]
  /** branch and tag names pushed */
  refs?: string[]
}

/** One place a name was found. */
export type NameHit = {
  kind: "file" | "commit" | "branch" | "picture"
  /** `path:line`, `abc1234's message`, `refs/heads/x`, `path (in abc1234)` */
  where: string
  /** the list's line that matched */
  listLine: number
}

/** What a check found. */
export type NameReport = {
  /** the list's file */
  list: string
  /** was there no list, before the check wrote an empty one? */
  listWasMissing: boolean
  /** how many names it looked for */
  names: number
  /** how many commits it looked at */
  commits: number
  pictures: {
    read: number
    unread: number
    /** not macOS:  no picture could be read */
    cantRead?: boolean
  }
  hits: NameHit[]
}

/** Each hit kind's label, lined up. */
const HIT_LABELS: Record<NameHit["kind"], string> = {
  file: "file   ",
  commit: "commit ",
  branch: "branch ",
  picture: "picture"
}

/** The file `load()` writes when there's none. */
const EMPTY_LIST = `# Names this machine's repos must never hold:  a customer's project, a company.
# One name a line, any case.  \`spell names check\`, every push and \`spell publish\` look for them.
# A commit that's already public:  allow <commit>
`

/** `allow <commit>` */
const ALLOW_LINE = /^allow\s+([0-9a-f]{7,40})$/i

/** What a list line may hold:  what git's patterns and JavaScript's read the same way. */
const READABLE_PATTERN = /^[\p{L}\p{N} |()[\].*+?{},\-_^$]+$/u

/** Picture files read for their words. */
const PICTURE_EXTENSIONS = /\.(png|jpe?g|gif|webp|heic|tiff?|bmp)$/i

/** git's all-zero id:  a ref deleted, or new on the other side. */
const ZERO = /^0+$/

/** How much of a file is looked at for a NUL, to tell text from binary (git's own amount). */
const BINARY_PROBE = 8000

/** The most output git may give one call. */
const MAX_OUTPUT = 1024 * 1024 * 1024

/** `git <args>` in `repo`, its output;  throws when it fails. */
function git(repo: string, args: string[]): string {
  const run = spawnSync("git", args, { cwd: repo, encoding: "utf8", maxBuffer: MAX_OUTPUT })
  if (run.status !== 0) throw new Error(`NameCheck:  git ${args[0]} failed in ${repo}:  ${run.stderr.trim()}`)
  return run.stdout
}

/** `git log <args>` over exactly `commits`, one entry a commit, each starting with its id. */
function gitLog(repo: string, args: string[], commits: string[]): string[] {
  const run = spawnSync("git", ["log", "--no-walk=unsorted", "--stdin", ...args], {
    cwd: repo,
    input: commits.join("\n"),
    encoding: "utf8",
    maxBuffer: MAX_OUTPUT
  })
  if (run.status !== 0) throw new Error(`NameCheck:  git log failed in ${repo}:  ${run.stderr.trim()}`)
  return run.stdout.split("\0").filter(Boolean)
}

/** A blob's bytes. */
function blob(repo: string, id: string): Buffer {
  return spawnSync("git", ["cat-file", "blob", id], { cwd: repo, maxBuffer: MAX_OUTPUT }).stdout
}

/** Does the repo have `commit`? */
function hasCommit(repo: string, commit: string): boolean {
  return spawnSync("git", ["cat-file", "-e", `${commit}^{commit}`], { cwd: repo }).status === 0
}

/** A commit's short id. */
function short(commit: string): string {
  return commit.slice(0, 9)
}

/** Every file under `dir`. */
function walk(dir: string): string[] {
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => join(entry.parentPath, entry.name))
}

/**
 * Each file's words, by macOS's text recognition (Vision's accurate level, no language correction, any size), through
 * `osascript`'s JavaScript;  a file left out of the map couldn't be read.  50 at a time.
 */
function recogniseOnMac(files: string[]): Map<string, string> {
  const words = new Map<string, string>()
  for (let start = 0; start < files.length; start += 50) {
    const batch = files.slice(start, start + 50)
    const run = spawnSync("osascript", ["-l", "JavaScript", "-e", RECOGNISE_SCRIPT, ...batch], {
      encoding: "utf8",
      maxBuffer: MAX_OUTPUT,
      timeout: 10 * 60 * 1000
    })
    if (run.status !== 0) continue
    for (const line of run.stdout.split("\n").filter(Boolean)) {
      const seen = JSON.parse(line) as { path: string; ok: boolean; text: string }
      if (seen.ok) words.set(seen.path, seen.text)
    }
  }
  return words
}

/** The script `osascript` runs:  each picture named in its arguments, a JSON line of its words. */
const RECOGNISE_SCRIPT = `
ObjC.import("Vision")
function run(paths) {
  const out = []
  for (const path of paths) {
    const handler = $.VNImageRequestHandler.alloc.initWithURLOptions($.NSURL.fileURLWithPath(path), $({}))
    const request = $.VNRecognizeTextRequest.alloc.init
    request.recognitionLevel = 0
    request.usesLanguageCorrection = false
    request.minimumTextHeight = 0
    const ok = handler.performRequestsError($([request]), Ref())
    const lines = []
    if (ok) {
      const results = request.results
      for (let i = 0; i < results.count; i++) {
        const candidates = results.objectAtIndex(i).topCandidates(3)
        for (let j = 0; j < candidates.count; j++) lines.push(candidates.objectAtIndex(j).string.js)
      }
    }
    out.push(JSON.stringify({ path, ok: !!ok, text: lines.join("\\n") }))
  }
  return out.join("\\n")
}
`
