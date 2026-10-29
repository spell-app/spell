import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { basename, dirname, join, relative } from "node:path"

import { DataFile } from "spell/server/DataFile"
import { Git } from "spell/server/Git"
import { CLI } from "spell/cli"
import { EpicConfig, type EpicSettings } from "spell/epic/config/EpicConfig"
import { EpicHome } from "spell/epic/config/EpicHome"
import { GitHub } from "spell/epic/config/GitHub"

import { EXIT, EpicCommandError, parseVerbArgs, stringFlag } from "./command.types"
import { Shared } from "./Shared"

/****************
 * ### `RepoInit`
 * `epic init [--name <name>] [--content-repo <name> | --remote <address> | --no-remote] [--dry-run] [--json]`:
 * set a repo up for epics (epic `epic-eject` P9), in its main checkout or any worktree of it.
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
 *    - a LATER person (the config names its `contentRemote`, the folder is missing):  clones it instead
 *      (`Shared.clone()`, plain git;  epic `epic-friend` P4)
 * 2b. gives the content repo its REMOTE, so a team shares the plans (`remoteStep()`, epic `epic-friend` P4, Q1):
 *    - the FIRST person:  asks what to call it (`CLI.ask()`, suggesting `<repo>-epics`;  `--content-repo`
 *      answers), makes it on GitHub, private (`GitHub.createRepo()`), pushes, and writes its address into the
 *      config (`contentRemote`)
 *      - its owner:  the code repo's when that's an organization, else the person's own GitHub account
 *      - GitHub only, for now:  without `gh`, or logged out, it says how to get it, and carries on without
 *    - `--remote <address>`:  a repo made already;  `--no-remote`:  none, the plans stay on this machine
 *    - a content repo with a remote already:  its address written into the config, when it isn't there
 * 3. links those folders in at the checkout's root (`Shared.link()`)
 * 4. lists in the repo's `.gitignore`, between `# shared:start` and `# shared:end`:  the links
 *    - not the window files (`epic window`:  each machine's own):
 *      they're in the content folder since epic `epic-eject` P13, whose `.gitignore` takes them (`Shared.init()`)
 * 5. keeps the name this machine's person goes by on the epics (`EpicHome.keepPerson()`;  epic `epic-friend` P1)
 *    - `--name <name>`;  else, with no name kept yet, asks "What do you want to be called?" in a terminal,
 *      suggesting their GitHub login, else git's `user.name` (`CLI.ask()`, `EpicHome.refreshGithub()`);
 *      with no terminal (a skill, a Claude session), that suggestion
 *    - a name kept already stays, unless `--name` gives another
 *
 * - `--dry-run`:  says what it would do, and writes nothing (it asks `gh` whether it could make the shared repo)
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
    const { flags } = parseVerbArgs(args, ["dryRun", "json", "noRemote"])
    const dryRun = flags.dryRun === true
    const remote = stringFlag(flags.remote)
    const contentRepo = stringFlag(flags.contentRepo)
    const noRemote = flags.noRemote === true
    if ([remote, contentRepo, noRemote || undefined].filter(Boolean).length > 1)
      throw new EpicCommandError("epic init:  give one of --content-repo, --remote or --no-remote")
    if (contentRepo && !REPO_NAME.test(contentRepo))
      throw new EpicCommandError(
        `epic init:  --content-repo ${contentRepo} isn't a GitHub repo name;  letters, digits, ".", "-" and "_" only`
      )
    // asked only when it'd be kept, and never into JSON's output
    const ask = !dryRun && !flags.json
    const name = stringFlag(flags.name) ?? (ask ? await RepoInit.askName() : undefined)
    const report = await this.init({ dryRun, name, remote, contentRepo, noRemote, ask })
    if (flags.json) CLI.out(JSON.stringify(report, null, 2))
    else for (const line of RepoInit.lines(report)) CLI.out(line)
    return EXIT.OK
  }

  /**
   * Set the repo up (the class's steps);  what it did, or would do with `dryRun`.
   * - the options:  `InitOptions`
   * - SIDE EFFECT (not `dryRun`):  writes the config and `.gitignore`, makes (or clones) the content repo and the
   *   links, may make the shared repo on GitHub and push to it, keeps the person's name in the epic home
   */
  async init({
    dryRun = false,
    name,
    remote,
    contentRepo,
    noRemote = false,
    ask = false
  }: InitOptions = {}): Promise<InitReport> {
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
      remote: { action: "skipped" },
      gitignore: { file: join(main, ".gitignore"), action: "ok" },
      person: RepoInit.personStep({ dryRun, name })
    }
    const config = { main, dir: content, worktrees: [], links: folders }
    const shared = new Shared({ checkout: main, config })
    // a later person:  the shared repo's address in the config, the folder missing:  cloned
    const address = settings.contentRemote
    if (address && !noRemote && !existsSync(content)) {
      report.remote = { action: dryRun ? "would clone" : "cloned", address }
      const error = dryRun ? undefined : shared.clone(address)
      if (error) report.remote = { action: "clone failed", address, error }
    }
    // the content repo, and any of its folders missing
    const isRepo = existsSync(join(content, ".git"))
    const missing = folders.filter((folder) => !existsSync(join(content, folder)))
    report.content.made = isRepo ? missing : folders
    report.content.action = isRepo ? (missing.length ? "added" : "exists") : "created"
    if (report.remote.action === "cloned") report.content.action = "cloned"
    if (report.remote.action === "would clone") report.content = { folder: content, action: "would clone", made: [] }
    if (report.remote.action === "clone failed") report.content = { folder: content, action: "missing", made: [] }
    if (!dryRun && report.content.action !== "missing") {
      if (!isRepo) shared.init()
      else {
        for (const folder of missing) {
          mkdirSync(join(content, folder), { recursive: true })
          writeFileSync(join(content, folder, ".gitkeep"), "")
        }
        // its own `.gitignore` and `.gitattributes` brought up to date (epic `epic-friend` P5)
        shared.keepRepoFiles()
      }
    }
    // its remote:  made, added or found, unless it was just cloned (or couldn't be)
    if (!["cloned", "would clone", "clone failed"].includes(report.remote.action))
      report.remote = await this.remoteStep({ shared, settings, dryRun, remote, contentRepo, noRemote, ask })
    // the address written:  the report's settings say so too
    if (REMOTE_WRITTEN.has(report.remote.action) && report.remote.address)
      report.config.settings = { ...report.config.settings, contentRemote: report.remote.address }
    // the links:  what each is now, and what linking does;  none into a content repo that isn't there
    report.links =
      report.content.action === "missing"
        ? []
        : dryRun
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

  /**
   * The content repo's REMOTE (the class's step 2b):  what it did, or would do with `dryRun`.
   * - a remote already:  its address written into the config when it isn't there (`recorded`)
   *   - `remote` naming another:  throws `EpicCommandError`, saying how to change it
   * - `noRemote`:  `skipped`
   * - `remote`, else the config's `contentRemote`:  made the remote, pushed (`added`)
   * - else made on GitHub (`made`), when `gh` is there and logged in (`no gh`, `logged out`);  `failed` with gh's
   *   words when GitHub said no
   *   - its name:  `contentRepo`, else asked when `ask` (in a terminal), else `<repo>-epics`
   * - a push that failed is in `error`:  the repo and its address stand
   * - SIDE EFFECT (not `dryRun`):  the repo on GitHub, the remote, the push, `contentRemote` in the config
   */
  async remoteStep({
    shared,
    settings,
    dryRun,
    remote,
    contentRepo,
    noRemote,
    ask
  }: RemoteStepOptions): Promise<RemoteReport> {
    const configFile = join(this.main, EpicConfig.FILE)
    const origin = shared.remote
    if (origin) {
      if (remote && remote !== origin)
        throw new EpicCommandError(
          `epic init:  the content repo's remote is ${origin} already;  to change it:  git -C ${shared.config.dir} ` +
            `remote set-url origin ${remote}, then epic init again`
        )
      if (settings.contentRemote === origin) return { action: "already", address: origin }
      if (!dryRun) RepoInit.keepRemote(configFile, origin)
      return { action: dryRun ? "would record" : "recorded", address: origin }
    }
    if (noRemote) return { action: "skipped" }
    const given = remote ?? settings.contentRemote
    if (given) {
      if (dryRun) return { action: "would add", address: given }
      const error = shared.publish(given)
      if (given !== settings.contentRemote) RepoInit.keepRemote(configFile, given)
      return { action: "added", address: given, ...(error && { error }) }
    }
    // made on GitHub:  only with gh, logged in (Owen:  "this only works with GitHub for now")
    const gh = GitHub.status()
    if (gh === "missing") return { action: "no gh" }
    const owner = gh === "ready" ? RepoInit.ownerFor(this.main) : undefined
    if (!owner) return { action: "logged out" }
    const suggestion = `${basename(this.main)}-epics`
    const repoName = contentRepo ?? (ask ? await CLI.ask(REPO_QUESTION, { suggestion }) : suggestion)
    if (!REPO_NAME.test(repoName))
      return { action: "failed", repo: `${owner}/${repoName}`, error: 'letters, digits, ".", "-" and "_" only' }
    const repo = `${owner}/${repoName}`
    if (dryRun) return { action: "would make", repo }
    let address: string
    try {
      GitHub.createRepo(repo, { description: `The epic pages of ${basename(this.main)}:  plans, guides and sagas` })
      address = GitHub.addressOf(repo)
    } catch (error) {
      return { action: "failed", repo, error: (error as Error).message }
    }
    const error = shared.publish(address)
    RepoInit.keepRemote(configFile, address)
    return { action: "made", repo, address, ...(error && { error }) }
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
   * Whose GitHub account a new shared repo goes in, for the code repo at `main`:  the code repo's owner when that's
   * an ORGANIZATION (its `origin` on GitHub), else the person's own login;  `undefined` when gh knows no login.
   * - why not always the code repo's owner:  a person can't make a repo in someone else's own account
   * - runs `gh` (the login, kept as `EpicHome.refreshGithub()` keeps it;  the owner's kind)
   */
  static ownerFor(main: string): string | undefined {
    const login = EpicHome.refreshGithub()
    const origin = Git.out(["remote", "get-url", "origin"], main)
    const owner = origin ? GitHub.ownerIn(origin) : undefined
    if (owner && owner !== login && GitHub.isOrganization(owner)) return owner
    return login
  }

  /**
   * Write `address` into config file `file` as its `contentRemote`, keeping the rest as written.
   * - the line `epic init` writes is changed in place;  a file without one (written before epic `epic-friend` P4)
   *   gets the key through `DataFile`, its comments kept
   * - SIDE EFFECT:  writes the file
   */
  static keepRemote(file: string, address: string): void {
    const text = readFileSync(file, "utf8")
    const line = /^(\s*"contentRemote":\s*)"(?:[^"\\]|\\.)*"/m
    if (line.test(text))
      writeFileSync(
        file,
        text.replace(line, (_all, key: string) => key + JSON.stringify(address))
      )
    else DataFile.edit<Record<string, unknown>>(file, (settings) => ({ ...settings, contentRemote: address }))
  }

  /**
   * The init's last step:  the person's name kept (`EpicHome`), or what's kept already.
   * - `name`:  the one to keep;  none:  the name kept stays, else git's is kept
   * - SIDE EFFECT (not `dryRun`):  writes the epic home's `person.json5`
   */
  static personStep({ dryRun, name }: { dryRun: boolean; name?: string }): InitReport["person"] {
    const now = EpicHome.person()
    const wanted = name?.trim() || (now.source === "kept" ? undefined : now.name)
    if (!wanted) return { name: now.name, action: now.source === "kept" ? "already" : "none" }
    if (now.source === "kept" && now.name === wanted) return { name: wanted, action: "already" }
    if (dryRun) return { name: wanted, action: "would keep" }
    return { name: EpicHome.keepPerson(wanted).name, action: "kept" }
  }

  /**
   * The name to keep, asked in a terminal:  "What do you want to be called?", suggesting their GitHub login, else
   * git's `user.name` (Owen, 2026-10-29).
   * - the login looked up first (`EpicHome.refreshGithub()`), and kept, so pages never run `gh`
   * - `undefined` when a name is kept already (it stays), or nothing was said and neither knows a name
   * - no terminal:  the suggestion, asking nothing (`CLI.ask()`)
   */
  static async askName(): Promise<string | undefined> {
    EpicHome.refreshGithub()
    const now = EpicHome.person()
    if (now.source === "kept") return undefined
    return (await CLI.ask(NAME_QUESTION, { suggestion: now.github ?? now.fullName ?? "" })) || undefined
  }

  /**
   * The settings `epic init` writes for the repo whose main checkout is `main`:
   * - `contentFolder`:  `../<repo>.epics`;  `worktreesFolder`:  `../<repo>.worktrees`, both beside the repo
   * - `contentRemote`:  `""`, none yet:  `remoteStep()` writes it
   * - `baseBranch`:  the remote's default branch (`origin/HEAD`), else the main checkout's branch, else `main`
   * - `installCommand`:  what the repo's lock file names (`installCommandOf()`), `""` with none
   * - `installOnCreate`:  on when there is one, so a worktree's window never opens without its packages
   * - `extraInstalls`:  none (`[]`);  the file says what it's for
   * - `windows`:  named for the repo and its content folder;  `worktreeOnly` on (every worktree is beside the repo)
   *   - no VS Code `settings` of its own (`{}`):  left out of the file (`configText()`)
   * - `linkSessionFolders` on:  each worktree's saved sessions show in every window's Claude panel
   * - `sharedFolders`:  what the epic tooling reads and writes (`INIT_FOLDERS`)
   * - `engineFolder`:  `""`, no `spell-epic` link:  only spell-app reaches the engine's code through one
   * - `repoTemplates`:  `""`, none:  the engine's templates are the repo's
   *   (spell-epic's `templates/`, epic `epic-eject` T11)
   * - `windowsFolder`:  `../<repo>.epics/windows`, the content folder's `windows/` (epic `epic-eject` P13)
   * - `app`:  none (the default);  the file shows how to declare one, in a comment
   * - `checkoutPatches`:  none (`[]`);  the file shows one, in a comment
   * - `promptAck`:  on, the default
   * - `renamedRepos`:  none (`{}`);  the file shows one, in a comment
   * - static:  needs no instance
   */
  static settingsFor(main: string): EpicSettings {
    const repo = basename(main)
    const installCommand = RepoInit.installCommandOf(main)
    return {
      contentFolder: `../${repo}.epics`,
      contentRemote: "",
      baseBranch: RepoInit.baseBranchOf(main),
      worktreesFolder: `../${repo}.worktrees`,
      installCommand,
      installOnCreate: Boolean(installCommand),
      installTimeout: EpicConfig.DEFAULTS.installTimeout,
      extraInstalls: [],
      windows: { default: repo, repoName: repo, contentName: `${repo}.epics`, worktreeOnly: true, settings: {} },
      linkSessionFolders: true,
      sharedFolders: [...INIT_FOLDERS],
      engineFolder: "",
      repoTemplates: "",
      windowsFolder: `../${repo}.epics/windows`,
      app: { ...EpicConfig.DEFAULTS.app },
      repos: "",
      voices: {},
      pageVoices: { ...EpicConfig.DEFAULTS.pageVoices },
      checkoutPatches: [],
      promptAck: true,
      renamedRepos: {}
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
  // the content repo's address, which everyone pulls from and pushes to ("":  none, the plans stay on this machine);
  // epic init writes it as it makes the shared repo, and clones it where the content folder is missing
  "contentRemote": ${value("contentRemote")},
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
  // and fixes every checkout gets at once, the worktrees behind main too (\`epic worktree patch\`):  main's file
  // copied in where it isn't tracked yet, or a command run once in each checkout:
  // "checkoutPatches": [{ "id": "vscode-ignore", "date": "2026-10-22", "why": "...", "copy": ".ignore" }]
  // and the repo's old GitHub addresses, once it's renamed, so epic pages recording one are still this repo's:
  // "renamedRepos": { "https://github.com/o/old-name": "https://github.com/o/new-name" }
}
`
  }

  /**
   * `.gitignore` text `text` with its shared block (`# shared:start` ... `# shared:end`) listing `ignored`,
   * one pattern a line (`/epics`).
   * - the block is replaced where it is, else added at the end
   * - nothing to ignore and no block yet (a repo that links nothing in, as the kit):  `text` as it is, no empty block
   * - `content`:  the content folder from the main checkout, for the block's comment
   */
  static withIgnoreBlock(text: string, ignored: string[], content: string): string {
    if (!ignored.length && !text.includes(BLOCK_START)) return text
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
      contentLineFor(report),
      ...remoteLinesFor(report),
      ...report.links.map(({ path, action }) => `${join(report.main, path)}:  ${action}`),
      `${report.gitignore.file}:  ${report.gitignore.action === "ok" ? "lists the links already" : `${would}${report.gitignore.action}`}`,
      personLineFor(report.person)
    ]
    if (report.dryRun) return [...lines, "dry run:  nothing changed"]
    const remote = report.remote
    const configChanged = config.action === "written" || REMOTE_WRITTEN.has(remote.action)
    const toCommit = [
      ...(configChanged ? [EpicConfig.FILE] : []),
      ...(report.gitignore.action === "ok" ? [] : [".gitignore"])
    ]
    const next = toCommit.length
      ? [
          `next:  commit ${toCommit.join(" and ")} on the base branch, so every new worktree starts with ${toCommit.length > 1 ? "them" : "it"}` +
            (remote.address && configChanged ? ", and push it:  then a teammate's epic init clones the plans" : "")
        ]
      : remote.action === "cloned"
        ? ["next:  epic server start, to see the epics"]
        : content.action === "exists" && !REMOTE_WRITTEN.has(remote.action)
          ? ["set up already"]
          : []
    const more = SHOW_README.has(remote.action) ? [`more on sharing the epics:  ${README_EPICS}`] : []
    return [...lines, ...next, ...more]
  }
}

/** What `epic init` says about the content folder. */
function contentLineFor({ content, remote, dryRun }: InitReport): string {
  const { folder } = content
  switch (content.action) {
    case "exists":
      return `${folder}:  there already`
    case "added":
      return `${folder}:  ${dryRun ? "would add" : "added"} ${content.made.join(", ")}`
    case "cloned":
      return `${folder}:  cloned from ${remote.address}`
    case "would clone":
      return `${folder}:  would clone it from ${remote.address}`
    case "missing":
      return `${folder}:  couldn't clone ${remote.address}:  ${remote.error}`
    default:
      /* case "created" */ return `${folder}:  ${dryRun ? "would make it" : "made"}, a git repo with ${content.made.join(", ")}`
  }
}

/** What `epic init` says about the content repo's remote:  none for a clone (the content line says it). */
function remoteLinesFor({ remote, content, main }: InitReport): string[] {
  const { address, repo, error } = remote
  const pushByHand = `  push it by hand:  git -C ${content.folder} push -u origin HEAD`
  const pushed = (what: string) =>
    error ? [`shared repo:  ${what};  the push failed:  ${error}`, pushByHand] : [`shared repo:  ${what}, and pushed`]
  const inConfig = `${EpicConfig.FILE} (contentRemote)`
  switch (remote.action) {
    case "cloned":
    case "would clone":
      return []
    case "clone failed":
      return [`  check you can reach it (git clone ${address} ${content.folder}), then run epic init again`]
    case "made":
      return [...pushed(`made ${repo} on GitHub, private`), `  its address, ${address}, is in ${inConfig}`]
    case "would make":
      return [`shared repo:  would make ${repo} on GitHub, private, push to it, and write its address in ${inConfig}`]
    case "added":
      return [...pushed(`${address}, the content repo's remote now`), `  its address is in ${inConfig}`]
    case "would add":
      return [`shared repo:  would make ${address} the content repo's remote, push to it, and write it in ${inConfig}`]
    case "recorded":
    case "would record":
      return [
        `shared repo:  ${address}, ${remote.action === "recorded" ? "written" : "would be written"} in ${inConfig}`
      ]
    case "already":
      return [`shared repo:  ${address}`]
    case "skipped":
      return [`shared repo:  none (--no-remote):  the plans stay on this machine`]
    case "failed":
      return [
        `shared repo:  couldn't make ${repo} on GitHub:  ${error}`,
        `  another name:  epic init --content-repo <name>;  a repo you made:  epic init --remote <address>`
      ]
    default: /* case "no gh", "logged out" */ {
      const why = remote.action === "no gh" ? "GitHub's command, gh, isn't installed" : "gh isn't logged in to GitHub"
      return [
        `shared repo:  not made:  ${why}.  Sharing the epics works only with GitHub for now:`,
        "  brew install gh        (other systems:  https://cli.github.com)",
        "  gh auth login",
        `  then epic init again, in ${main};  or epic init --remote <address>, for a repo you made yourself`
      ]
    }
  }
}

/** What `epic init` says about the person's name. */
function personLineFor(person: InitReport["person"]): string {
  const file = EpicHome.personFile()
  if (person.action === "none") return "you:  no name yet (git has no user.name):  epic whoami <name> keeps one"
  if (person.action === "already") return `you:  ${person.name}, kept in ${file} already`
  return `you:  ${person.name}, ${person.action === "kept" ? "kept" : "would be kept"} in ${file}`
}

/** What `epic init` did, or would do:  `RepoInit.init()`. */
export type InitReport = {
  main: string
  dryRun: boolean
  config: { file: string; action: "written" | "kept"; settings: EpicSettings }
  /**
   * the content folder:  `created` (a new repo), `cloned` from the shared repo, `added` folders, `exists`;
   * `would clone` (a dry run);  `missing` when the clone failed
   */
  content: {
    folder: string
    action: "created" | "cloned" | "added" | "exists" | "would clone" | "missing"
    made: string[]
  }
  /** the content repo's remote, the shared repo:  `RemoteReport` */
  remote: RemoteReport
  links: { path: string; action: string }[]
  gitignore: { file: string; action: "ok" | "updated" | "written" }
  /** the name this machine's person goes by:  `kept` now, kept `already`, `would keep` (a dry run), or `none` */
  person: { name: string | undefined; action: "kept" | "already" | "would keep" | "none" }
}

/**
 * What `epic init` did about the content repo's remote, the SHARED repo (`RepoInit.remoteStep()`):
 * - `action`:
 *   - `cloned`:  a later person's content folder, cloned from `address`;  `clone failed`, git's words in `error`
 *   - `made`:  `repo` made on GitHub, pushed to, its `address` written in the config
 *   - `added`:  `address` (`--remote`, or the config's) made the remote, pushed to
 *   - `recorded`:  the remote the content repo had, written in the config;  `already`:  there already
 *   - `skipped`:  `--no-remote`
 *   - `no gh`, `logged out`:  GitHub's command missing, or not logged in:  nothing made
 *   - `failed`:  GitHub said no (`error`:  gh's words)
 *   - `would ...`:  a dry run's
 * - `error`:  also a push that failed (`made`, `added`):  the remote stands, the push is left to do by hand
 */
export type RemoteReport = {
  action: RemoteAction
  /** the shared repo's address, as git takes it */
  address?: string
  /** the GitHub repo made, or that would be:  `owner/name` */
  repo?: string
  /** git's or gh's words, when something failed */
  error?: string
}

/** What `epic init` did about the shared repo:  `RemoteReport`. */
export type RemoteAction =
  | "cloned"
  | "clone failed"
  | "made"
  | "added"
  | "recorded"
  | "already"
  | "skipped"
  | "no gh"
  | "logged out"
  | "failed"
  | "would clone"
  | "would make"
  | "would add"
  | "would record"

/** What `RepoInit.init()` takes. */
export type InitOptions = {
  /** only say what it would do;  default `false` */
  dryRun?: boolean
  /** the name to keep for this machine's person (`EpicHome`);  none:  git's, when no name is kept yet */
  name?: string
  /** the shared repo's address, made already (`--remote`):  made the content repo's remote, and pushed to */
  remote?: string
  /** the name to give the shared repo on GitHub (`--content-repo`);  none:  asked, else `<repo>-epics` */
  contentRepo?: string
  /** no remote, no shared repo (`--no-remote`):  the plans stay on this machine;  default `false` */
  noRemote?: boolean
  /** whether to ask the shared repo's name in a terminal (`CLI.ask()`);  default `false`:  the suggestion */
  ask?: boolean
}

/** What `RepoInit.remoteStep()` takes:  `init()`'s options, the content repo and the settings in force. */
export type RemoteStepOptions = Pick<InitOptions, "remote" | "contentRepo"> & {
  shared: Shared
  settings: EpicSettings
  dryRun: boolean
  noRemote: boolean
  ask: boolean
}

/** What `epic init` asks, in a terminal, when no name is kept. */
const NAME_QUESTION = "What do you want to be called?"

/** What `epic init` asks, in a terminal, before it makes the shared repo on GitHub. */
const REPO_QUESTION = "What should the shared epics repo be called?"

/** A GitHub repo name:  letters, digits, `.`, `-` and `_`, at most 100. */
const REPO_NAME = /^[\w.-]{1,100}$/

/** The remote steps that write the shared repo's address into the config, so it's to commit. */
const REMOTE_WRITTEN: ReadonlySet<RemoteAction> = new Set(["made", "added", "recorded"])

/** The remote steps after which `epic init` points at the epics README. */
const SHOW_README: ReadonlySet<RemoteAction> = new Set([
  "cloned",
  "clone failed",
  "made",
  "added",
  "no gh",
  "logged out",
  "failed"
])

/** The epics README, on GitHub (it's the kit's `README-epics.md`):  how a team shares the epics. */
const README_EPICS = "https://github.com/spell-app/spell/blob/main/README-epics.md"

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
