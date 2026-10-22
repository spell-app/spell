import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { basename, dirname, join, relative } from "node:path"

import { EpicConfig, type EpicSettings } from "spell-epic/config/EpicConfig"

import { EXIT, EpicCommandError, parseVerbArgs } from "./command.types"
import { Git } from "./Git"
import { Shared } from "./Shared"

/****************
 * ### `RepoInit`
 * `epic init [--dry-run] [--json]`:  set a repo up for epics (epic `epic-eject` P9),
 * in its main checkout or any worktree of it.
 *
 * In order, each step skipped when it's done already, so it's safe to run again:
 * 1. writes `.epic/config.json5` (`EpicConfig`), with values for THIS repo (`settingsFor()`):
 *    - the content folder `../<repo>.epics`
 *    - the base branch from git
 *    - worktrees in `../<repo>.worktrees`
 *    - the install command its lock file names (none without one)
 *    - window names from the repo's name;  the window files in the content folder's `windows/` (git-ignored there)
 *    - a file already there is kept as it is
 * 2. makes the content folder, a git repo of its own, with a folder for each of `sharedFolders`
 *    (`Shared.init()`):  `epics`, `sagas`, `guides`, `pages`
 * 3. links those folders in at the checkout's root (`Shared.link()`)
 * 4. lists in the repo's `.gitignore`, between `# shared:start` and `# shared:end`:  the links
 *    - not the window files (`epic window`:  each machine's own):  they're in the content folder since epic
 *      `epic-eject` P13, whose `.gitignore` takes them (`Shared.init()`)
 *
 * - `--dry-run`:  says what it would do, and writes nothing
 * - `--json`:  the report as JSON
 * - it commits nothing in the repo:  it says which files to commit (the config and `.gitignore`),
 *   since every new worktree branches from the base branch and needs the `.gitignore` to leave the links alone
 ****************/
export class RepoInit {
  /** the repo's main checkout:  where the config goes, and the folders are relative to */
  readonly main: string

  /** - `main`:  default the main checkout of the repo the current folder is in */
  constructor({ main }: { main?: string } = {}) {
    this.main = main ?? RepoInit.mainHere()
  }

  /** Run `epic init <args>`;  resolves to the exit code.  Throws `EpicCommandError` outside a git repo. */
  async run(args: string[]): Promise<number> {
    const { flags } = parseVerbArgs(args, ["dryRun", "json"])
    const report = this.init({ dryRun: flags.dryRun === true })
    if (flags.json) out(JSON.stringify(report, null, 2))
    else for (const line of RepoInit.lines(report)) out(line)
    return EXIT.OK
  }

  /**
   * Set the repo up (the class's steps);  what it did, or would do with `dryRun`.
   * - SIDE EFFECT (not `dryRun`):  writes the config and `.gitignore`, makes the content repo and the links
   */
  init({ dryRun = false }: { dryRun?: boolean } = {}): InitReport {
    const { main } = this
    const configFile = join(main, EpicConfig.FILE)
    const hadConfig = existsSync(configFile)
    const settings = hadConfig ? new EpicConfig(main).settings : RepoInit.settingsFor(main)
    if (!hadConfig && !dryRun) {
      mkdirSync(dirname(configFile), { recursive: true })
      writeFileSync(configFile, RepoInit.configText(settings))
    }
    const content = join(main, settings.contentFolder)
    const folders = settings.sharedFolders
    const report: InitReport = {
      main,
      dryRun,
      config: { file: configFile, action: hadConfig ? "kept" : "written", settings },
      content: { folder: content, action: "exists", made: [] },
      links: [],
      gitignore: { file: join(main, ".gitignore"), action: "ok" }
    }
    // the content repo, and any of its folders missing
    const isRepo = existsSync(join(content, ".git"))
    const missing = folders.filter((folder) => !existsSync(join(content, folder)))
    report.content.made = isRepo ? missing : folders
    report.content.action = isRepo ? (missing.length ? "added" : "exists") : "created"
    const config = { main, dir: content, worktrees: [], links: folders }
    const shared = new Shared({ checkout: main, config })
    if (!dryRun) {
      if (!isRepo) shared.init()
      else
        for (const folder of missing) {
          mkdirSync(join(content, folder), { recursive: true })
          writeFileSync(join(content, folder, ".gitkeep"), "")
        }
    }
    // the links:  what each is now, and what linking does
    report.links = dryRun
      ? folders.map((path) => {
          const state = shared.linkState(main, path)
          return { path, action: state === "ok" ? "ok" : `would link (${state})` }
        })
      : shared.link(main).map(({ path, action, state }) => ({ path, action: action ?? state }))
    // the `.gitignore` block
    const ignoreFile = report.gitignore.file
    const before = existsSync(ignoreFile) ? readFileSync(ignoreFile, "utf8") : ""
    const ignored = folders.map((folder) => `/${folder}`)
    const after = RepoInit.withIgnoreBlock(before, ignored, relative(main, content))
    report.gitignore.action = after === before ? "ok" : before ? "updated" : "written"
    if (!dryRun && after !== before) writeFileSync(ignoreFile, after)
    return report
  }

  ////////////////
  // ## Statics:  the values, the files' text, the report's lines
  ////////////////

  /**
   * The main checkout of the repo the current folder is in.
   * - throws `EpicCommandError` outside a git repo
   */
  static mainHere(cwd = process.cwd()): string {
    if (!Git.run(["rev-parse", "--git-dir"], cwd).ok)
      throw new EpicCommandError("epic init:  not in a git repo.  Run it in the repo's checkout (git init first)")
    return Git.mainRoot(cwd)
  }

  /**
   * The settings `epic init` writes for the repo whose main checkout is `main`:
   * - `contentFolder`:  `../<repo>.epics`;  `worktreesFolder`:  `../<repo>.worktrees`, both beside the repo
   * - `baseBranch`:  the remote's default branch (`origin/HEAD`), else the main checkout's branch, else `main`
   * - `installCommand`:  what the repo's lock file names (`installCommandOf()`), `""` with none
   * - `installOnCreate`:  on when there is one, so a worktree's window never opens without its packages
   * - `extraInstalls`:  none (`[]`);  the file says what it's for
   * - `windows`:  named for the repo and its content folder;  `worktreeOnly` on (every worktree is beside the repo)
   * - `linkSessionFolders` on:  each worktree's saved sessions show in every window's Claude panel
   * - `sharedFolders`:  what the epic tooling reads and writes (`INIT_FOLDERS`)
   * - `engineFolder`:  `""`, no `spell-epic` link:  only spell-app reaches the engine's code through one
   * - `repoTemplates`:  `""`, none:  the engine's templates are the repo's (spell-epic's `templates/`, epic `epic-eject` T11)
   * - `windowsFolder`:  `../<repo>.epics/windows`, the content folder's `windows/` (epic `epic-eject` P13)
   * - `app`:  none (the default);  the file shows how to declare one, in a comment
   * - static:  needs no instance
   */
  static settingsFor(main: string): EpicSettings {
    const repo = basename(main)
    const installCommand = RepoInit.installCommandOf(main)
    return {
      contentFolder: `../${repo}.epics`,
      baseBranch: RepoInit.baseBranchOf(main),
      worktreesFolder: `../${repo}.worktrees`,
      installCommand,
      installOnCreate: Boolean(installCommand),
      installTimeout: EpicConfig.DEFAULTS.installTimeout,
      extraInstalls: [],
      windows: { default: repo, repoName: repo, contentName: `${repo}.epics`, worktreeOnly: true },
      linkSessionFolders: true,
      sharedFolders: [...INIT_FOLDERS],
      engineFolder: "",
      repoTemplates: "",
      windowsFolder: `../${repo}.epics/windows`,
      app: { ...EpicConfig.DEFAULTS.app },
      repos: "",
      voices: {},
      pageVoices: { ...EpicConfig.DEFAULTS.pageVoices }
    }
  }

  /** The branch worktrees start from in the repo at `main`:  `origin/HEAD`'s branch, else `main`'s own, else `main`. */
  static baseBranchOf(main: string): string {
    const remote = Git.run(["symbolic-ref", "--quiet", "--short", "refs/remotes/origin/HEAD"], main)
    if (remote.ok && remote.out.includes("/")) return remote.out.slice(remote.out.indexOf("/") + 1)
    return Git.run(["branch", "--show-current"], main).out || "main"
  }

  /** The install command the lock file at `main`'s root names (`INSTALLERS`, first match);  `""` with none. */
  static installCommandOf(main: string): string {
    return INSTALLERS.find(([file]) => existsSync(join(main, file)))?.[1] ?? ""
  }

  /**
   * `.epic/config.json5`'s text for `settings`:  every key, each with a comment saying what it is.
   * - in JSON5's JSON-compatible part (what `EpicConfig.parse()` and `DataFile` read)
   */
  static configText(settings: EpicSettings): string {
    const value = (key: keyof EpicSettings) => JSON.stringify(settings[key])
    const { windows } = settings
    return `// Where this repo keeps its epic things, for spell-epic's \`epic\` command, hooks and skills.
// - Written by \`epic init\`;  \`epic config\` prints what's in force.
// - Folders are relative to this repo's main checkout;  every worktree reads this (the main checkout's) file.
// - Every key is optional:  one left out takes spell-epic's default.
{
  // the content repo:  epic pages, sagas, guides, pages;  a git repo of its own, read from there
  "contentFolder": ${value("contentFolder")},
  // the branch worktrees start from and merge into
  "baseBranch": ${value("baseBranch")},
  // where new worktrees go, one folder each:  <worktreesFolder>/<name>
  "worktreesFolder": ${value("worktreesFolder")},
  // what makes a new worktree ready to run, from its root ("":  nothing to install)
  "installCommand": ${value("installCommand")},
  // whether the worktree hook runs installCommand before it hands a new worktree over
  "installOnCreate": ${value("installOnCreate")},
  // the seconds that install may take
  "installTimeout": ${value("installTimeout")},
  // folders that are yarn projects of their own, outside that install (a \`vscode/\` extension), from a worktree's
  // root:  installCommand runs in each too
  "extraInstalls": ${value("extraInstalls")},
  // the VS Code windows:  the window file a worktree's window is opened from, the folder names a window shows,
  // and whether a worktree's window holds only the worktree and the content folder
  "windows": {
    "default": ${JSON.stringify(windows.default)},
    "repoName": ${JSON.stringify(windows.repoName)},
    "contentName": ${JSON.stringify(windows.contentName)},
    "worktreeOnly": ${JSON.stringify(windows.worktreeOnly)}
  },
  // whether each new worktree's saved-session folder is linked to the main checkout's (every window lists every
  // session)
  "linkSessionFolders": ${value("linkSessionFolders")},
  // the content repo's folders, each linked in at the root of every checkout
  "sharedFolders": ${value("sharedFolders")},
  // the spell-epic checkout, linked in at every checkout's root as \`spell-epic\` ("":  no link;  a repo whose code
  // imports the engine, as spell-app's does, names it)
  "engineFolder": ${value("engineFolder")},
  // the repo's own page templates, a folder from each checkout's root, listed beside spell-epic's
  // ("":  none, spell-epic's templates are all there are)
  "repoTemplates": ${value("repoTemplates")},
  // the VS Code window files (\`epic window\`), each machine's own:  git-ignored in the content repo
  // ("":  the content folder's windows/)
  "windowsFolder": ${value("windowsFolder")}
  // and the repo's app, which the docs' App tab opens through the epic server (started there when it isn't up):
  // "app": { "path": "/editor/", "url": "http://localhost:3000/", "start": "npm run dev" }
}
`
  }

  /**
   * `.gitignore` text `text` with its shared block (`# shared:start` ... `# shared:end`) listing `ignored`,
   * one pattern a line (`/epics`).
   * - the block is replaced where it is, else added at the end
   * - `content`:  the content folder from the main checkout, for the block's comment
   */
  static withIgnoreBlock(text: string, ignored: string[], content: string): string {
    const block = [
      `${BLOCK_START}  (links into ${content}, the content repo, and the VS Code window files:  never tracked;  ` +
        "written by epic init)",
      ...ignored,
      BLOCK_END
    ].join("\n")
    const start = text.indexOf(BLOCK_START)
    const end = text.indexOf(BLOCK_END, start)
    if (start >= 0 && end >= 0) {
      const old = text.slice(start, end + BLOCK_END.length)
      // the same folders:  the block stays as written (its comment may have been edited)
      const listed = old.split("\n").filter((line) => line.startsWith("/"))
      if (listed.join("\n") === ignored.join("\n")) return text
      return text.slice(0, start) + block + text.slice(end + BLOCK_END.length)
    }
    return `${text}${text && !text.endsWith("\n") ? "\n" : ""}${text ? "\n" : ""}${block}\n`
  }

  /** The report as lines:  each step, then what to do next. */
  static lines(report: InitReport): string[] {
    const would = report.dryRun ? "would be " : ""
    const config = report.config
    const content = report.content
    const lines = [
      `${config.file}:  ${config.action === "kept" ? "kept as it is" : `${would}written`}`,
      ...(config.action === "kept"
        ? []
        : Object.entries({ ...config.settings, ...prefixed("windows.", config.settings.windows) })
            .filter(([key]) => key !== "windows")
            .map(([key, value]) => `  ${key}:  ${JSON.stringify(value)}`)),
      content.action === "exists"
        ? `${content.folder}:  there already`
        : content.action === "added"
          ? `${content.folder}:  ${report.dryRun ? "would add" : "added"} ${content.made.join(", ")}`
          : `${content.folder}:  ${report.dryRun ? "would make it" : "made"}, a git repo with ${content.made.join(", ")}`,
      ...report.links.map(({ path, action }) => `${join(report.main, path)}:  ${action}`),
      `${report.gitignore.file}:  ${report.gitignore.action === "ok" ? "lists the links already" : `${would}${report.gitignore.action}`}`
    ]
    if (report.dryRun) return [...lines, "dry run:  nothing changed"]
    const toCommit = [
      ...(config.action === "written" ? [EpicConfig.FILE] : []),
      ...(report.gitignore.action === "ok" ? [] : [".gitignore"])
    ]
    return [
      ...lines,
      ...(toCommit.length
        ? [
            `next:  commit ${toCommit.join(" and ")} on the base branch, so every new worktree starts with ${toCommit.length > 1 ? "them" : "it"}`
          ]
        : ["set up already"])
    ]
  }
}

/** What `epic init` did, or would do:  `RepoInit.init()`. */
export type InitReport = {
  main: string
  dryRun: boolean
  config: { file: string; action: "written" | "kept"; settings: EpicSettings }
  content: { folder: string; action: "created" | "added" | "exists"; made: string[] }
  links: { path: string; action: string }[]
  gitignore: { file: string; action: "ok" | "updated" | "written" }
}

/**
 * The content repo's folders for a new repo:  what the epic tooling reads and writes.
 * - `epics`:  epic pages, their parts, inboxes, `home.json5` and `favorites.json5`
 * - `sagas`:  the sagas' list and pages
 * - `guides`:  the durable docs epics write
 * - `pages`:  the docs home and the scratch details pages
 * - not spell-app's own (`brand`, `ui`, `goals`, `agents`), nor `templates`, which are spell-epic's
 */
const INIT_FOLDERS = ["epics", "sagas", "guides", "pages"]

/** Lock files and the install command each names, first match wins. */
const INSTALLERS: [file: string, command: string][] = [
  ["yarn.lock", "yarn install"],
  ["pnpm-lock.yaml", "pnpm install"],
  ["bun.lock", "bun install"],
  ["bun.lockb", "bun install"],
  ["package-lock.json", "npm install"],
  ["package.json", "npm install"],
  ["uv.lock", "uv sync"],
  ["Gemfile.lock", "bundle install"]
]

/** The `.gitignore` block's first and last lines, as spell-app's own `.gitignore` has them. */
const BLOCK_START = "# shared:start"
const BLOCK_END = "# shared:end"

/** `values` with each key after `prefix`:  `{ default: "x" }` => `{ "windows.default": "x" }`. */
function prefixed(prefix: string, values: object): Record<string, unknown> {
  return Object.fromEntries(Object.entries(values).map(([key, value]) => [`${prefix}${key}`, value]))
}

/** Write `text` to stdout, on its own line. */
function out(text: string): void {
  process.stdout.write(`${text}\n`)
}
