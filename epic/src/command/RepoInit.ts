import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs"
import { basename, dirname, join, relative } from "node:path"

import chalk from "chalk"

import { DataFile } from "spell/server/DataFile"
import { Git } from "spell/server/Git"
import { CLI } from "spell/cli"
import { Editor } from "spell/epic/config/Editor"
import { EpicConfig, type EpicSettings } from "spell/epic/config/EpicConfig"
import { EpicHome } from "spell/epic/config/EpicHome"
import { GitHub, type RepoVisibility } from "spell/epic/config/GitHub"
import { PeopleColors } from "spell/epic/config/PeopleColors"
import { VoiceColor } from "spell/epic/config/VoiceColor"

import { EXIT, EpicCommandError, parseVerbArgs, stringFlag } from "./command.types"
import { Hub } from "./Hub"
import { PluginInstall } from "./PluginInstall"
import { Shared } from "./Shared"

/****************
 * ### `RepoInit`
 * `epic init [--name <name>] [--color <colour>] [--content-repo <name> | --remote <address> | --no-remote] [--public]
 * [--no-plugin] [--no-server] [--dry-run] [--json]`:
 * set a repo up for epics (epic `epic-eject` P9), from any folder of its main checkout or a worktree of it;  the ONE
 * command a new repo, and each teammate joining it, runs (epic `epic-friend` P13:  `npx spell@next epic init`).
 *
 * In order, each step skipped when it's done already, so it's safe to run again:
 * 0. the epic plugin, installed for Claude Code when it isn't yet (`pluginStep()`, `PluginInstall`):  the machine's,
 *    once;  `--no-plugin` skips it
 * 1. writes `.epic/config.json5` (`EpicConfig`), with values for THIS repo (`EpicConfig.defaultsFor()`):
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
 *    - the FIRST person:  asks what to call it (`CLI.ask()`, suggesting `<repo>.epics`;  `--content-repo`
 *      answers), and whether it's private or public (private suggested;  `--public` answers;  epic `epic-friend`
 *      T19), makes it on GitHub (`GitHub.createRepo()`), pushes, and writes its address into the config
 *      (`contentRemote`)
 *      - no terminal to ask in:  private, unless `--public`;  public says, in one line, that the plans will be too
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
 * 6. the colour their words are drawn in (`colorStep()`, epic `epic-friend` P13):  "Which colour should your words be?",
 *    from Spell UI's colour names nobody has yet, the first suggested;  `--color` answers it
 *    - kept in the SHARED plans repo, `people/<name>.json5` (`PeopleColors`), so it reaches everyone with the plans and
 *      nobody commits anything;  a colour the config's `colors` gives them wins
 *    - asked only when they have none yet;  no terminal, the suggestion;  every name taken, the shared colour
 * 7. the epic server, serving this repo, started (`serverStep()`, `Hub`):  its address the last line;  `--no-server`
 *    skips it
 *
 * - `--dry-run`:  says what it would do, and writes nothing (it asks `gh` whether it could make the shared repo)
 * - `--json`:  the report as JSON
 * - a failed plugin install or server start is one line, and init carries on
 * - it commits the files it wrote in the repo (the config and `.gitignore`) on the base branch, asking first in a
 *   terminal (`commitStep()`;  `--no-commit`):  every new worktree branches from there, and needs the `.gitignore` to
 *   leave the links alone;  on another branch it says so, and commits nothing
 * - it starts with "Initializing Epic for repo <main>" and ends with "Epics initialized!", in colour;  the settings it
 *   wrote are in the file, not printed (Owen, 2026-10-29)
 ****************/
export class RepoInit {
  /** the repo's main checkout:  where the config goes, and the folders are relative to */
  readonly main: string
  /** what installs the epic plugin (`pluginStep()`):  made when the step runs */
  readonly plugin: () => Pick<PluginInstall, "isInstalled" | "install">
  /** the machine's epic server (`serverStep()`) */
  readonly hub: () => Pick<Hub, "registerHere" | "addressOf">

  /**
   * - `main`:  default the main checkout of the repo the current folder is in
   * - `plugin`, `hub`:  default the machine's own (`PluginInstall`, `Hub`);  a test hands in stand-ins
   */
  constructor({ main, plugin = () => new PluginInstall(), hub = () => new Hub() }: RepoInitProps = {}) {
    this.main = main ?? RepoInit.mainHere()
    this.plugin = plugin
    this.hub = hub
  }

  /** Run `epic init <args>`;  resolves to the exit code.  Throws `EpicCommandError` outside a git repo. */
  async run(args: string[]): Promise<number> {
    const { flags } = parseVerbArgs(args, ["dryRun", "json", "noRemote", "public", "noPlugin", "noServer", "noCommit"])
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
    const color = stringFlag(flags.color)
    if (color !== undefined && !VoiceColor.isColor(color))
      throw new EpicCommandError(
        `epic init:  --color ${color} isn't a colour:  one of ${VoiceColor.NAMES.join(", ")}, or a CSS colour`
      )
    // asked only when it'd be kept, and never into JSON's output
    const ask = !dryRun && !flags.json
    const print = (lines: string[]) => {
      if (!flags.json) for (const line of lines) CLI.out(line)
    }
    const say = (text: string) => print([chalk.gray(text)])
    print([chalk.cyan.bold(`Initializing Epic for repo ${this.main}`)])
    // every question first, then what they come to
    const answers = await this.questions({
      ask,
      dryRun,
      name: stringFlag(flags.name),
      color,
      remote,
      contentRepo,
      visibility: flags.public === true ? "public" : undefined,
      noRemote,
      say
    })
    print(RepoInit.summaryLines(answers.plan))
    const plugin = flags.noPlugin === true ? undefined : this.pluginStep({ dryRun })
    if (plugin) print(RepoInit.pluginLines(plugin))
    // the section's head first:  its slow steps' progress lines go under it
    print(["", chalk.bold(FILES_HEAD)])
    const report = await this.init({
      dryRun,
      name: answers.name,
      remote,
      contentRepo: answers.contentRepo,
      visibility: answers.visibility,
      noRemote,
      color: answers.color,
      cloned: answers.cloned,
      say
    })
    if (plugin) report.plugin = plugin
    print([...RepoInit.fileLines(report, { head: false }), ...RepoInit.noteLines(report)])
    if (flags.noCommit !== true && report.content.action !== "missing") {
      if (RepoInit.changedFiles(report).length) print(["", chalk.bold(COMMIT_HEADER)])
      report.commit = await RepoInit.commitStep({ report, ask, say })
      print(RepoInit.commitResultLines(report.commit))
    }
    if (flags.noServer !== true && report.content.action !== "missing") {
      if (!dryRun) say("starting the epic server…")
      report.server = await this.serverStep({ dryRun })
    }
    if (flags.json) CLI.out(JSON.stringify(report, null, 2))
    else print(RepoInit.doneLines(report))
    return EXIT.OK
  }

  /**
   * `epic init`'s questions, ALL asked before anything is done (Owen, 2026-10-29):  the answers, and what they come to.
   * - their name, every time (`askName()`);  `name` (`--name`) answers it
   * - their colour, from the names nobody has (`askColor()`), unless they have one already;  `color` answers it
   *   - a teammate joining, the team's plans not here yet:  cloned FIRST, quietly, so the taken colours are known
   *     (`cloned`;  `init()` reports it)
   * - the shared repo's name and private or public, only when `init()` will make it on GitHub (`willMakeRepo()`)
   * - no terminal (`ask` off):  nothing asked;  the plan says what the flags and the suggestions come to
   * - SIDE EFFECT:  the clone, for a teammate joining (not `dryRun`)
   */
  async questions({
    ask,
    dryRun,
    name,
    color,
    remote,
    contentRepo,
    visibility,
    noRemote,
    say = () => {}
  }: QuestionOptions): Promise<Answers> {
    const { main } = this
    const settings = RepoInit.settingsOf(main)
    const content = join(main, settings.contentFolder)
    const answers: Answers = { name, color, contentRepo, visibility, plan: {} }
    if (ask && !name) answers.name = await RepoInit.askName()
    const person = answers.name?.trim() || EpicHome.person().name
    // a teammate joining:  the plans first, for the colours they hold
    const address = settings.contentRemote
    if (address && !noRemote && !dryRun && !existsSync(content)) {
      say("cloning the team's plans…")
      const shared = new Shared({ checkout: main, config: { main, dir: content, worktrees: [], links: [] } })
      answers.cloned = !shared.clone(address)
    }
    const colors = RepoInit.colorsOf({ content, person, settings })
    if (ask && !color && person && !colors.own && colors.free.length)
      answers.color = await RepoInit.askColor(colors.free)
    const repoPlan = this.willMakeRepo({ settings, content, remote, noRemote })
    if (repoPlan) {
      const suggestion = `${basename(main)}.epics`
      answers.contentRepo ??= ask ? await CLI.ask(REPO_QUESTION, { suggestion }) : suggestion
      answers.visibility ??= ask ? await RepoInit.askVisibility() : "private"
    }
    answers.plan = {
      name: person,
      color: colors.own ?? answers.color,
      sharedRepo: repoPlan
        ? `${repoPlan.owner}/${answers.contentRepo}, ${answers.visibility}`
        : noRemote
          ? "none:  the plans stay on this machine"
          : (remote ?? address)
    }
    return answers
  }

  /**
   * Whether `init()` will make the shared repo on GitHub:  its owner when it will, else `undefined`.
   * - not when the content repo has a remote, the config names one, or `remote` / `noRemote` was given
   * - only with `gh` installed and logged in (`GitHub.status()`, a few seconds), as `remoteStep()` asks
   */
  willMakeRepo({
    settings,
    content,
    remote,
    noRemote
  }: {
    settings: EpicSettings
    content: string
    remote?: string
    noRemote?: boolean
  }): { owner: string } | undefined {
    if (noRemote || remote || settings.contentRemote) return undefined
    if (existsSync(join(content, ".git")) && Git.out(["remote", "get-url", "origin"], content)) return undefined
    if (GitHub.status() !== "ready") return undefined
    const owner = RepoInit.ownerFor(this.main)
    return owner ? { owner } : undefined
  }

  /** The settings in force in checkout `main`:  its config's, else what `epic init` would write. */
  static settingsOf(main: string): EpicSettings {
    return existsSync(join(main, EpicConfig.FILE)) ? new EpicConfig(main).settings : EpicConfig.defaultsFor(main)
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
    visibility,
    noRemote = false,
    ask = false,
    color,
    plugin = false,
    server = false,
    commit = false,
    cloned = false,
    say = () => {}
  }: InitOptions = {}): Promise<InitReport> {
    const { main } = this
    // the plugin first:  the machine's, whatever happens to the repo
    const pluginReport = plugin ? this.pluginStep({ dryRun }) : undefined
    const configFile = join(main, EpicConfig.FILE)
    const hadConfig = existsSync(configFile)
    const settings = hadConfig ? new EpicConfig(main).settings : EpicConfig.defaultsFor(main)
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
      person: RepoInit.personStep({ dryRun, name }),
      ...(pluginReport && { plugin: pluginReport })
    }
    const config = { main, dir: content, worktrees: [], links: folders }
    const shared = new Shared({ checkout: main, config })
    // a later person:  the shared repo's address in the config, the folder missing:  cloned
    const address = settings.contentRemote
    if (address && cloned) report.remote = { action: "cloned", address }
    else if (address && !noRemote && !existsSync(content)) {
      report.remote = { action: dryRun ? "would clone" : "cloned", address }
      if (!dryRun) say("cloning the team's plans…")
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
      report.remote = await this.remoteStep({
        shared,
        settings,
        dryRun,
        remote,
        contentRepo,
        visibility,
        noRemote,
        ask,
        say
      })
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
    // the files it wrote in the repo, committed on the base branch
    if (commit) report.commit = await RepoInit.commitStep({ report, ask, say })
    // their colour, kept with the plans
    if (report.content.action !== "missing" && report.content.action !== "would clone")
      report.color = await RepoInit.colorStep({
        dryRun,
        content,
        person: report.person.name,
        settings: report.config.settings,
        color,
        ask
      })
    // a colour kept with shared plans goes to the team now, not at the next turn's end
    if (report.color?.action === "kept" && report.config.settings.contentRemote) {
      say("sharing your colour with the team…")
      report.color.shared = await RepoInit.shareNow(main)
    }
    // the server last:  its address is what to open next
    if (server && report.content.action !== "missing") {
      if (!dryRun) say("starting the epic server…")
      report.server = await this.serverStep({ dryRun })
    }
    return report
  }

  /**
   * The files `epic init` wrote in the repo (the config, `.gitignore`) committed on its base branch, and pushed;
   * what it did.
   * - asks first in a terminal ("Commit and push ... on main?", `y` suggested);  with no terminal, yes
   * - only those files, whatever else is staged (`git commit -- <files>`);  none changed:  `none`
   * - on another branch:  `other branch`, nothing committed (a worktree branches from the base branch)
   * - pushed (`pushBranch()`):  to the branch's upstream, else `origin`;  neither:  committed, nothing to push to
   * - NEVER throws:  a failed commit is `failed`, a failed push `push:  "failed"`, with git's words
   * - SIDE EFFECT (not `dryRun`):  a commit in the repo, a push
   */
  static async commitStep({
    report,
    ask,
    say = () => {}
  }: {
    report: InitReport
    ask: boolean
    say?: (text: string) => void
  }): Promise<CommitReport> {
    const { main, dryRun } = report
    const base = report.config.settings.baseBranch
    const files = RepoInit.changedFiles(report)
    if (!files.length) return { action: "none", files, branch: base }
    const branch = Git.out(["rev-parse", "--abbrev-ref", "HEAD"], main) ?? ""
    if (branch !== base) return { action: "other branch", files, branch }
    if (dryRun) return { action: "would commit", files, branch }
    const pushable = !!RepoInit.pushTarget(main, branch)
    const question = `${pushable ? "Commit and push" : "Commit"} ${files.join(" and ")} on ${branch}?`
    const answer = ask ? await CLI.ask(question, { suggestion: "y" }) : "y"
    if (/^n/i.test(answer.trim())) return { action: "declined", files, branch }
    const added = Git.run(["add", "--", ...files], main)
    const done = added.ok ? Git.run(["commit", "-m", COMMIT_MESSAGE, "--", ...files], main) : added
    if (!done.ok) return { action: "failed", files, branch, error: done.err || `git exited ${done.code}` }
    return { action: "committed", files, branch, ...RepoInit.pushBranch(main, branch, say) }
  }

  /** The files `epic init` changed in the repo, still to commit:  the config, `.gitignore`. */
  static changedFiles({ main }: Pick<InitReport, "main">): string[] {
    return [EpicConfig.FILE, ".gitignore"].filter((file) => Git.out(["status", "--porcelain", "--", file], main))
  }

  /** Where `branch` of checkout `main` pushes:  its upstream (`git push`), else `origin`;  none:  `undefined`. */
  static pushTarget(main: string, branch: string): string[] | undefined {
    if (Git.out(["rev-parse", "--abbrev-ref", "--symbolic-full-name", `${branch}@{u}`], main)) return ["push"]
    if (Git.out(["remote", "get-url", "origin"], main)) return ["push", "-u", "origin", branch]
    return undefined
  }

  /**
   * Push `branch` of checkout `main` where it goes (`pushTarget()`):  how it went, for the commit's report.
   * - NEVER throws
   */
  static pushBranch(
    main: string,
    branch: string,
    say: (text: string) => void
  ): Pick<CommitReport, "push" | "pushError"> {
    const target = RepoInit.pushTarget(main, branch)
    if (!target) return { push: "nowhere" }
    say(`pushing ${branch}…`)
    const pushed = Git.run(target, main, { timeout: PUSH_TIMEOUT })
    return pushed.ok ? { push: "pushed" } : { push: "failed", pushError: pushed.err || `git exited ${pushed.code}` }
  }

  /**
   * The content repo of checkout `main` committed and synced at once (`Shared.sync()`, every turn's end):  whether
   * it pushed.
   * - NEVER throws:  a sync that fails waits for the next turn's, as any does
   * - SIDE EFFECT:  commits in the content repo, a pull and a push
   */
  static async shareNow(main: string): Promise<boolean> {
    try {
      const { sync } = await new Shared({ checkout: main }).sync({ checkout: main })
      return sync?.pushed === true
    } catch {
      return false
    }
  }

  /**
   * The epic plugin, installed for Claude Code when it isn't yet (the class's step 0);  what it did, or would.
   * - installed already:  its install run anyway, which changes nothing but what's missing, such as the VS Code
   *   extension (epic `epic-friend` P15);  `already` when it changed nothing
   * - NEVER throws:  a failure is `failed`, with its words, and init carries on
   * - SIDE EFFECT (not `dryRun`):  Claude Code's settings and lists, the links, the extension (`PluginInstall`)
   */
  pluginStep({ dryRun }: { dryRun: boolean }): PluginReport {
    try {
      const installer = this.plugin()
      const installed = installer.isInstalled()
      if (dryRun) return { action: installed ? "already" : "would install" }
      const changes = installer.install().changes
      const notes = changes.filter((change) => EDITOR_NOTE.test(change))
      if (installed && changes.length === notes.length) return { action: "already", ...(notes.length && { notes }) }
      return { action: "installed", changes: changes.length, ...(notes.length && { notes }) }
    } catch (error) {
      return { action: "failed", error: (error as Error).message }
    }
  }

  /**
   * The epic server, serving this repo (the class's step 7):  registered if need be, started, and its address.
   * - NEVER throws:  a failure is `failed`, with its words, and init carries on
   * - SIDE EFFECT (not `dryRun`):  the repo list, a server started in the background
   */
  async serverStep({ dryRun }: { dryRun: boolean }): Promise<ServerReport> {
    if (dryRun) return { action: "would start" }
    try {
      const hub = this.hub()
      hub.registerHere(this.main)
      return { action: "started", address: await hub.addressOf(this.main) }
    } catch (error) {
      return { action: "failed", error: (error as Error).message }
    }
  }

  /**
   * The content repo's REMOTE (the class's step 2b):  what it did, or would do with `dryRun`.
   * - a remote already:  its address written into the config when it isn't there (`recorded`)
   *   - `remote` naming another:  throws `EpicCommandError`, saying how to change it
   * - `noRemote`:  `skipped`
   * - `remote`, else the config's `contentRemote`:  made the remote, pushed (`added`)
   * - else made on GitHub (`made`), when `gh` is there and logged in (`no gh`, `logged out`);  `failed` with gh's
   *   words when GitHub said no
   *   - its name:  `contentRepo`, else asked when `ask` (in a terminal), else `<repo>.epics`
   *   - private or public:  `visibility`, else asked when `ask` (`askVisibility()`), else private
   * - a push that failed is in `error`:  the repo and its address stand
   * - SIDE EFFECT (not `dryRun`):  the repo on GitHub, the remote, the push, `contentRemote` in the config
   */
  async remoteStep({
    shared,
    settings,
    dryRun,
    remote,
    contentRepo,
    visibility,
    noRemote,
    ask,
    say = () => {}
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
    const suggestion = `${basename(this.main)}.epics`
    const repoName = contentRepo ?? (ask ? await CLI.ask(REPO_QUESTION, { suggestion }) : suggestion)
    if (!REPO_NAME.test(repoName))
      return { action: "failed", repo: `${owner}/${repoName}`, error: 'letters, digits, ".", "-" and "_" only' }
    const repo = `${owner}/${repoName}`
    const seenBy = visibility ?? (ask ? await RepoInit.askVisibility() : "private")
    if (dryRun) return { action: "would make", repo, visibility: seenBy }
    say(`making ${repo} on GitHub…`)
    let address: string
    try {
      GitHub.createRepo(repo, {
        visibility: seenBy,
        description: `The epic pages of ${basename(this.main)}:  plans, guides and sagas`
      })
      address = GitHub.addressOf(repo)
    } catch (error) {
      return { action: "failed", repo, visibility: seenBy, error: (error as Error).message }
    }
    const error = shared.publish(address)
    RepoInit.keepRemote(configFile, address)
    return { action: "made", repo, address, visibility: seenBy, ...(error && { error }) }
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
   * Whether the shared repo is private or public, picked in a terminal from the two (`CLI.choose()`), private first.
   * - no terminal:  private, asking nothing
   */
  static async askVisibility(): Promise<RepoVisibility> {
    return (await CLI.choose(VISIBILITY_QUESTION, VISIBILITY_CHOICES)) as RepoVisibility
  }

  /**
   * The name to keep, asked in a terminal EVERY time (Owen, 2026-10-29:  "never asked for my user name"):
   * "What do you want to be called?", suggesting the name kept already, else their GitHub login, else git's
   * `user.name`;  Enter keeps it.
   * - the login looked up first (`EpicHome.refreshGithub()`), and kept, so pages never run `gh`
   * - `undefined` when nothing was said and nobody knows a name
   * - no terminal:  the suggestion, asking nothing (`CLI.ask()`)
   */
  static async askName(): Promise<string | undefined> {
    EpicHome.refreshGithub()
    const now = EpicHome.person()
    const suggestion = (now.source === "kept" ? now.name : undefined) ?? now.github ?? now.fullName ?? ""
    return (await CLI.ask(NAME_QUESTION, { suggestion })) || undefined
  }

  /**
   * Their colour (the class's step 6):  kept, there already, or why not.
   * - `person`:  their short name;  none, no colour
   * - theirs already:  the config's `colors`, else their file in `people/` (`EpicConfig.colors`' order)
   * - the free names:  Spell UI's (`VoiceColor.NAMES`) less every one the config and `people/` give anyone
   * - `color`:  `--color`;  a name someone has is `taken`;  else asked when `ask` (`askColor()`), else none
   * - SIDE EFFECT (not `dryRun`):  writes `people/<name>.json5` in the content folder
   */
  static async colorStep({ dryRun, content, person, settings, color, ask }: ColorStepOptions): Promise<ColorReport> {
    if (!person) return { action: "none", free: [] }
    const { own, free, taken } = RepoInit.colorsOf({ content, person, settings })
    if (own) return { action: "already", color: own, free: [] }
    if (color && taken.has(color.trim().toLowerCase())) return { action: "taken", color, free }
    if (!color && !free.length) return { action: "all taken", free }
    const wanted = color ?? (ask ? await RepoInit.askColor(free) : undefined)
    if (!wanted) return { action: "none", free }
    const file = PeopleColors.fileFor(content, person)
    if (dryRun) return { action: "would keep", color: wanted, file, free }
    PeopleColors.write(content, person, wanted)
    return { action: "kept", color: wanted, file, free }
  }

  /**
   * The colours of checkout's content folder `content` and `settings`, for `person`:
   * - `own`:  theirs already, the config's `colors`, else their file in `people/` (`EpicConfig.colors`' order)
   * - `taken`:  every colour anyone has, lower case;  `free`:  Spell UI's names (`VoiceColor.NAMES`) nobody has
   */
  static colorsOf({
    content,
    person,
    settings
  }: {
    content: string
    person: string | undefined
    settings: EpicSettings
  }): { own?: string; free: string[]; taken: Set<string> } {
    const all = { ...PeopleColors.read(content), ...settings.colors.people }
    const own = person
      ? Object.entries(all).find(([name]) => name.trim().toLowerCase() === person.trim().toLowerCase())?.[1]
      : undefined
    const taken = new Set(
      [...Object.values(all), ...Object.values(settings.colors.agents)].map((value) => value.trim().toLowerCase())
    )
    return { own, free: VoiceColor.NAMES.filter((name) => !taken.has(name)), taken }
  }

  /**
   * Their colour, picked in a terminal from `free` (`CLI.choose()`), the first marked.
   * - no terminal:  the first, asking nothing
   */
  static async askColor(free: readonly string[]): Promise<string> {
    return CLI.choose(
      COLOR_QUESTION,
      free.map((name) => ({ value: name, label: RepoInit.colored(name, name) }))
    )
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
// - Every key is optional:  one left out reads as \`epic init\` writes it for this repo;  \`epic config\` shows it.
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

  ////////////////
  // ## The report's lines:  sections, as `run()` prints them while it works
  ////////////////

  /**
   * The report as lines, every section in order:  what `run()` prints, piece by piece, as it goes.
   * - pure:  a test reads it;  colour by `chalk`, none when the output isn't a terminal
   */
  static lines(report: InitReport): string[] {
    return [
      ...RepoInit.summaryLines(RepoInit.planOf(report)),
      ...(report.plugin ? RepoInit.pluginLines(report.plugin) : []),
      ...RepoInit.fileLines(report),
      ...RepoInit.noteLines(report),
      ...(report.commit?.action && report.commit.action !== "none"
        ? ["", chalk.bold(COMMIT_HEADER), ...RepoInit.commitResultLines(report.commit)]
        : []),
      ...RepoInit.doneLines(report)
    ]
  }

  /** What `report` comes to for the summary, when no questions were asked first (`init()` alone). */
  static planOf(report: InitReport): Plan {
    const { remote } = report
    return {
      name: report.person.name,
      color: report.color?.color,
      sharedRepo:
        remote.repo && remote.visibility
          ? `${remote.repo}, ${remote.visibility}`
          : remote.action === "skipped"
            ? "none:  the plans stay on this machine"
            : remote.address
    }
  }

  /** The summary under the questions:  `> Your name  :  owenoak`, the values bold, the colour in its colour. */
  static summaryLines({ name, color, sharedRepo }: Plan): string[] {
    return [
      ...(name ? [`> Your name  :  ${chalk.bold(name)}`] : []),
      ...(color ? [`> Your colour:  ${RepoInit.colored(color, color)}`] : []),
      ...(sharedRepo ? [`> Shared repo:  ${chalk.bold(sharedRepo)}`] : [])
    ]
  }

  /** `text` bold, in `color`:  a Spell UI colour name's terminal hex, or a CSS hex;  else bold alone. */
  static colored(text: string, color: string): string {
    const hex = TERMINAL_COLORS[color.trim().toLowerCase()] ?? (CSS_HEX.test(color.trim()) ? color.trim() : undefined)
    return hex ? chalk.bold.hex(hex)(text) : chalk.bold(text)
  }

  /** The epic plugin's section:  installed, there already, or why not;  the VS Code extension's lines under it. */
  static pluginLines(plugin: PluginReport): string[] {
    const said = (() => {
      switch (plugin.action) {
        case "already":
          return ["> epic is installed for Claude Code already"]
        case "would install":
          return ["> would install epic for Claude Code (epic plugin install)"]
        case "installed":
          return [`> installed epic for Claude Code:  /reload-plugins in a running session`]
        default:
          /* case "failed" */ return [
            `> couldn't install epic for Claude Code:  ${plugin.error}`,
            "  epic plugin install --dry-run says what it would do"
          ]
      }
    })()
    return ["", chalk.bold("Checking the epic plugin:"), ...said, ...(plugin.notes ?? []).map((note) => `> ${note}`)]
  }

  /**
   * The files section:  a table of what was written, made and linked, in gray (Owen:  "make it light text to show
   * they can ignore it"), an action column, then the path.
   */
  static fileLines(report: InitReport, { head = true }: { head?: boolean } = {}): string[] {
    const { dryRun, config, content, remote, gitignore, person, color, main } = report
    const would = (done: string, wouldDo: string) => (dryRun ? wouldDo : done)
    const rows: [string, string][] = [
      [config.action === "kept" ? "already present" : would("wrote", "would write"), config.file]
    ]
    switch (content.action) {
      case "created":
        rows.push([would("made", "would make"), content.folder])
        break
      case "added":
        rows.push([would("added", "would add"), `${content.folder}  (${content.made.join(", ")})`])
        break
      case "cloned":
        rows.push(["cloned", `${content.folder}  (from ${remote.address})`])
        break
      case "would clone":
        rows.push(["would clone", `${content.folder}  (from ${remote.address})`])
        break
      case "exists":
        rows.push(["already present", content.folder])
        break
      default:
      /* case "missing":  its own note */
    }
    rows.push(...remoteRowsFor(remote))
    for (const { path, action } of report.links)
      rows.push([action === "ok" ? "already linked" : action, join(main, path)])
    rows.push([
      gitignore.action === "ok"
        ? "already present"
        : would(gitignore.action === "written" ? "wrote" : "updated", "would update"),
      gitignore.file
    ])
    if (person.action === "kept" || person.action === "would keep")
      rows.push([would("kept", "would keep"), `${EpicHome.personFile()}  (your name)`])
    if ((color?.action === "kept" || color?.action === "would keep") && color.file)
      rows.push([
        would("wrote", "would write"),
        `${color.file}  (your colour${color.shared === true ? ", pushed" : color.shared === false ? ", pushed at your next turn" : ""})`
      ])
    const width = Math.max(...rows.map(([action]) => action.length))
    return [
      ...(head ? ["", chalk.bold(FILES_HEAD)] : []),
      ...rows.map(([action, path]) => chalk.gray(`  ${action.padEnd(width)}   ${path}`))
    ]
  }

  /** What needs a word of its own, under the files:  the shared repo's problems, the colour's, no name. */
  static noteLines(report: InitReport): string[] {
    const notes = [...remoteNotesFor(report), ...colorNotesFor(report.color)]
    if (report.person.action === "none") notes.push("no name yet (git has no user.name):  epic whoami <name> keeps one")
    if (!notes.length) return []
    return ["", chalk.bold("Note:"), ...notes]
  }

  /** What the commit came to (`commitStep()`), under its question. */
  static commitResultLines({ action, files, branch, error, push, pushError }: CommitReport): string[] {
    const named = files.join(" and ")
    switch (action) {
      case "committed":
        if (push === "pushed") return ["> Committed and pushed"]
        if (push === "failed")
          return [`> Committed;  the push failed:  ${pushError}`, `  push it by hand:  git push origin ${branch}`]
        return ["> Committed;  no remote to push to"]
      case "would commit":
        return [`> would commit ${named} on ${branch}, and push it`]
      case "declined":
        return [`> Not committed:  commit ${named} on ${branch}, so every new worktree starts with them`]
      case "other branch":
        return [`> Not committed:  you're on ${branch};  commit ${named} on the base branch`]
      case "failed":
        return [
          `> Couldn't commit ${named} on ${branch}:  ${error}`,
          `  commit them by hand:  git commit -- ${files.join(" ")}`
        ]
      default:
        /* case "none" */ return []
    }
  }

  /** The last lines:  done, and where to see the epics (a browser's link, the editor's view);  a dry run's word. */
  static doneLines(report: InitReport): string[] {
    if (report.dryRun) return ["", "dry run:  nothing changed"]
    if (report.content.action === "missing") return []
    const editor = Editor.of({ setting: report.config.settings.editor })
    const { server, main } = report
    const browser =
      server?.action === "started" && server.address
        ? terminalLink(server.address)
        : "epic server start, then the address it prints"
    const view =
      editor.id === "cursor"
        ? "the Review view (View:  Open View...  ›  Review)"
        : "the Review view in its right side bar"
    return [
      "",
      chalk.green.bold(DONE),
      "To see your epics:",
      `- Web browser:  ${browser}`,
      `- ${editor.name}:  open ${main} in ${editor.name} (${editor.command} ${main}), then ${view};  ` +
        "epic open <epic> --review shows one there",
      ...(server?.action === "failed"
        ? [`  the epic server couldn't start:  ${server.error};  epic server start says more`]
        : []),
      ...(SHOW_README.has(report.remote.action) ? [`More on sharing the epics:  ${README_EPICS}`] : [])
    ]
  }
}

/** The shared repo's rows of the files table:  made, pushed to, recorded;  none for a problem (its note says it). */
function remoteRowsFor({ action, address, repo, visibility, error }: RemoteReport): [string, string][] {
  switch (action) {
    case "made":
      return [[error ? "made" : "made, pushed", `${repo} on GitHub, ${visibility}  (${address})`]]
    case "would make":
      return [["would make", `${repo} on GitHub, ${visibility}`]]
    case "added":
      return [[error ? "remote" : "pushed to", address ?? ""]]
    case "would add":
      return [["would push to", address ?? ""]]
    case "recorded":
    case "would record":
      return [[action === "recorded" ? "recorded" : "would record", `${address}  (in ${EpicConfig.FILE})`]]
    case "already":
      return [["shared with", address ?? ""]]
    default:
      return []
  }
}

/** What needs saying about the shared repo:  a problem, a push to do by hand, a public repo. */
function remoteNotesFor({ remote, content, main }: InitReport): string[] {
  const { address, repo, error, visibility = "private" } = remote
  const pushByHand = [`the push failed:  ${error}`, `  push it by hand:  git -C ${content.folder} push -u origin HEAD`]
  switch (remote.action) {
    case "made":
    case "would make":
      return [...(error ? pushByHand : []), ...publicWarning(visibility)]
    case "added":
      return error ? pushByHand : []
    case "clone failed":
      return [
        `couldn't clone the team's plans from ${address}:  ${error}`,
        `  check you can reach it (git clone ${address} ${content.folder}), then run epic init again`
      ]
    case "skipped":
      return ["no shared repo (--no-remote):  the plans stay on this machine"]
    case "failed":
      return [
        `couldn't make ${repo} on GitHub:  ${error}`,
        `  another name:  epic init --content-repo <name>;  a repo you made:  epic init --remote <address>`
      ]
    case "no gh":
    case "logged out": {
      const why = remote.action === "no gh" ? "GitHub's command, gh, isn't installed" : "gh isn't logged in to GitHub"
      return [
        `no shared repo made:  ${why}.  Sharing the epics works only with GitHub for now:`,
        "  brew install gh        (other systems:  https://cli.github.com)",
        "  gh auth login",
        `  then epic init again, in ${main};  or epic init --remote <address>, for a repo you made yourself`
      ]
    }
    default:
      return []
  }
}

/** The one line `epic init` warns with when the shared repo is public;  none when it's private. */
function publicWarning(visibility: RepoVisibility): string[] {
  return visibility === "public"
    ? ["it's PUBLIC:  everything in the plans (epic pages, guides, comments) can be read by anyone"]
    : []
}

/** What needs saying about their colour:  someone's already, every one taken, or none picked. */
function colorNotesFor(color: ColorReport | undefined): string[] {
  switch (color?.action) {
    case "taken":
      return [`your colour:  ${color.color} is someone's already;  free:  ${color.free.join(", ")} (--color <name>)`]
    case "all taken":
      return ["your colour:  every colour name is taken:  your words keep the shared colour"]
    case "none":
      return color.free.length
        ? [`your colour:  the shared one;  pick your own:  epic init --color <name> (${color.free.join(", ")})`]
        : []
    default:
      return []
  }
}

/** `url` as a link a terminal opens on a click (OSC 8), when the output is a terminal;  else the bare address. */
function terminalLink(url: string): string {
  return chalk.level > 0 ? `\u001b]8;;${url}\u0007${chalk.underline(url)}\u001b]8;;\u0007` : url
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
  /** the epic plugin (`pluginStep()`);  none with `--no-plugin` */
  plugin?: PluginReport
  /** their colour (`colorStep()`);  none when the content folder isn't there */
  color?: ColorReport
  /** the epic server (`serverStep()`);  none with `--no-server` */
  server?: ServerReport
  /** the files it wrote in the repo, committed (`commitStep()`);  none with `--no-commit` */
  commit?: CommitReport
}

/**
 * What `epic init` did about committing the files it wrote in the repo (`RepoInit.commitStep()`):
 * `committed`, `would commit`, `declined` (asked, and no), `other branch` (not the base branch), `failed`,
 * `none` (nothing to commit)
 */
export type CommitReport = {
  action: "committed" | "would commit" | "declined" | "other branch" | "failed" | "none"
  /** the files, from the repo's root:  the config, `.gitignore` */
  files: string[]
  /** the branch the repo is on (the base branch, unless `other branch`) */
  branch: string
  /** why it failed */
  error?: string
  /** after the commit:  `pushed`, `nowhere` (no upstream, no `origin`), or `failed` (`pushError`, git's words) */
  push?: "pushed" | "nowhere" | "failed"
  /** why the push failed */
  pushError?: string
}

/** What `epic init`'s questions came to (`RepoInit.questions()`):  `init()`'s answers, and the summary. */
export type Answers = Pick<InitOptions, "name" | "color" | "contentRepo" | "visibility" | "cloned"> & {
  /** what the summary under the questions says */
  plan: Plan
}

/** The summary under `epic init`'s questions (`RepoInit.summaryLines()`):  each one there's something to say for. */
export type Plan = {
  /** their short name */
  name?: string
  /** their colour */
  color?: string
  /** the shared repo:  `owner/name, private` to make, the address to join, or none */
  sharedRepo?: string
}

/** What `RepoInit.questions()` takes:  `run()`'s flags, and whether to ask. */
export type QuestionOptions = Pick<
  InitOptions,
  "name" | "color" | "remote" | "contentRepo" | "visibility" | "noRemote" | "say"
> & {
  /** ask in a terminal:  off for `--json` and `--dry-run` */
  ask: boolean
  /** only say what it would do:  nothing cloned */
  dryRun: boolean
}

/** What `epic init` did about the epic plugin:  `installed` (and how many `changes`), `already`, ... */
export type PluginReport = {
  action: "installed" | "already" | "would install" | "failed"
  /** what `PluginInstall.install()` changed */
  changes?: number
  /** its lines about the editor's extension (`PluginInstall`'s step 7):  installed, or why not */
  notes?: string[]
  /** why it failed */
  error?: string
}

/**
 * What `epic init` did about the person's colour (`RepoInit.colorStep()`):
 * - `kept` (`would keep`) in `file`;  `already` theirs;  `taken` by someone else;  `all taken`;  `none` asked for
 * - `free`:  the colour names nobody has
 */
export type ColorReport = {
  action: "kept" | "would keep" | "already" | "taken" | "all taken" | "none"
  /** the colour */
  color?: string
  /** where it's kept:  `people/<name>.json5` in the content folder */
  file?: string
  /** kept with shared plans:  whether it was pushed at once (`RepoInit.shareNow()`) */
  shared?: boolean
  /** Spell UI's colour names nobody has yet */
  free: string[]
}

/** What `epic init` did about the epic server:  `started` (its repo's `address`), `would start`, `failed`. */
export type ServerReport = {
  action: "started" | "would start" | "failed"
  /** this repo's home page on the server */
  address?: string
  /** why it failed */
  error?: string
}

/** What `RepoInit` takes. */
export type RepoInitProps = {
  /** the repo's main checkout;  default the one the current folder is in */
  main?: string
  /** what installs the epic plugin;  default the machine's `PluginInstall` */
  plugin?: () => Pick<PluginInstall, "isInstalled" | "install">
  /** the machine's epic server;  default its `Hub` */
  hub?: () => Pick<Hub, "registerHere" | "addressOf">
}

/** What `RepoInit.colorStep()` takes. */
export type ColorStepOptions = {
  /** only say what it would do */
  dryRun: boolean
  /** the content folder:  `people/` is in it */
  content: string
  /** their short name;  none, no colour */
  person: string | undefined
  /** the settings in force:  the config's `colors` */
  settings: EpicSettings
  /** the colour asked for (`--color`) */
  color?: string
  /** whether to ask in a terminal */
  ask: boolean
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
  /** who can see that repo:  `private` or `public` (`made`, `would make`, `failed`) */
  visibility?: RepoVisibility
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
  /** the name to give the shared repo on GitHub (`--content-repo`);  none:  asked, else `<repo>.epics` */
  contentRepo?: string
  /** whether the shared repo made on GitHub is private or public (`--public`);  none:  asked, else private */
  visibility?: RepoVisibility
  /** no remote, no shared repo (`--no-remote`):  the plans stay on this machine;  default `false` */
  noRemote?: boolean
  /**
   * whether to ask the shared repo's name, and private or public, and their colour, in a terminal (`CLI.ask()`);
   * default `false`:  the suggestions, and no colour
   */
  ask?: boolean
  /** their colour (`--color`):  a Spell UI colour name, or a CSS colour;  none:  asked when `ask` */
  color?: string
  /** install the epic plugin when Claude Code doesn't have it (`--no-plugin` turns it off);  default `false` */
  plugin?: boolean
  /** start the epic server, serving the repo, last (`--no-server` turns it off);  default `false` */
  server?: boolean
  /** commit the files it wrote in the repo on the base branch (`--no-commit` turns it off);  default `false` */
  commit?: boolean
  /** the team's plans cloned already (`questions()`, for the colours they hold):  reported as `cloned` */
  cloned?: boolean
  /** a progress line, before each slow step (a clone, GitHub, a push, the server);  default:  nothing said */
  say?: (text: string) => void
}

/** What `RepoInit.remoteStep()` takes:  `init()`'s options, the content repo and the settings in force. */
export type RemoteStepOptions = Pick<InitOptions, "remote" | "contentRepo" | "visibility"> & {
  shared: Shared
  settings: EpicSettings
  dryRun: boolean
  noRemote: boolean
  ask: boolean
  /** a progress line, before GitHub makes the repo */
  say?: (text: string) => void
}

/** What `epic init` asks, in a terminal, when no name is kept. */
const NAME_QUESTION = "What do you want to be called?"

/** What `epic init` asks, in a terminal, when they have no colour yet. */
const COLOR_QUESTION = "Which colour should your words be?"

/** What `epic init` asks, in a terminal, before it makes the shared repo on GitHub. */
const REPO_QUESTION = "What should the shared epics repo be called?"

/** "Private or public?"'s two choices, private first (`askVisibility()`). */
const VISIBILITY_CHOICES = [
  { value: "private", label: "private", hint: "only the people you add can see the plans" },
  { value: "public", label: "public", hint: "anyone can read every epic page, guide and comment" }
]

/** What `epic init` asks, in a terminal, before it makes the shared repo on GitHub:  who can see it. */
const VISIBILITY_QUESTION = "Private or public?"

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

/** `epic init`'s line, in colour, once the repo is set up. */
const DONE = "Epics initialized!"

/** The files section's head. */
const FILES_HEAD = "Setting up epic files:"

/** The commit section's head:  why `epic init` asks to commit in the code repo. */
const COMMIT_HEADER = "We need to make a commit in the main repo to enable epics."

/** How long a push of the base branch may take:  a network call, longer than git's local default. */
const PUSH_TIMEOUT = 120_000

/** Spell UI's colour names as a terminal can draw them (Fomantic's own hexes, which its theme starts from). */
const TERMINAL_COLORS: Readonly<Record<string, string>> = {
  red: "#DB2828",
  orange: "#F2711C",
  yellow: "#FBBD08",
  olive: "#B5CC18",
  green: "#21BA45",
  teal: "#00B5AD",
  blue: "#2185D0",
  violet: "#6435C9",
  purple: "#A333C8",
  pink: "#E03997",
  brown: "#A5673F",
  grey: "#767676",
  black: "#1B1C1D"
}

/** A CSS hex colour (`#2f9e6e`):  the one kind of CSS colour a terminal can draw. */
const CSS_HEX = /^#(?:[0-9a-f]{3}|[0-9a-f]{6})$/i

/** `PluginInstall`'s lines about the editor's extension (its step 7):  "VS Code:  extension ...", "Cursor:  ...". */
const EDITOR_NOTE = /^(?:VS Code|Cursor):  /

/** The message of the commit `epic init` makes in the repo (`RepoInit.commitStep()`). */
const COMMIT_MESSAGE = "epic init:  set up epics (.epic/config.json5, .gitignore)"

/** The `.gitignore` block's first and last lines, as spell-app's own `.gitignore` has them. */
const BLOCK_START = "# shared:start"
const BLOCK_END = "# shared:end"
