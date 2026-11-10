import { existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, rmSync, rmdirSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { basename, dirname, join, relative } from "node:path"

import chalk from "chalk"

import { DataFile } from "spell/server/DataFile"
import { Git } from "spell/server/Git"
import { CLI } from "spell/cli"
import { Editor } from "spell/epic/config/Editor"
import { EpicConfig, type EpicSettings } from "spell/epic/config/EpicConfig"
import { EpicHome } from "spell/epic/config/EpicHome"
import { CodeHost, type CodeHostClient, type CodeHostKind } from "spell/epic/config/CodeHost"
import { GitHub, type CodeHostWords, type FirstPushHelp, type RepoVisibility } from "spell/epic/config/GitHub"
import { PeopleColors } from "spell/epic/config/PeopleColors"
import { VoiceColor } from "spell/epic/config/VoiceColor"

import { EXIT, EpicCommandError, parseVerbArgs, stringFlag } from "./command.types"
import { Hub } from "./Hub"
import { PluginInstall } from "./PluginInstall"
import { Shared } from "./Shared"
import type { SyncReport } from "./SharedSync"

/****************
 * ### `RepoInit`
 * `epic init [--local] [--name <name>] [--color <colour>] [--content-repo <name> | --remote <address> | --no-remote]
 * [--public] [--host github|gitlab] [--protected-base] [--no-plugin] [--no-server] [--dry-run] [--json]`:
 * set a repo up for epics (epic `epic-eject` P9), from any folder of its main checkout or a worktree of it;  the ONE
 * command a new repo, and each teammate joining it, runs (epic `epic-friend` P13:  `npx spell@next epic init`).
 *
 * In order, each step skipped when it's done already, so it's safe to run again:
 * 0. the epic plugin, installed for Claude Code when it isn't yet (`pluginStep()`, `PluginInstall`):  the machine's,
 *    once;  `--no-plugin` skips it
 * 1. writes `.epic/config.json5` (`EpicConfig`), with values for THIS repo (`EpicConfig.defaultsFor()`):
 *    - the epic folder `../<repo>.epics`
 *    - the base branch from git
 *    - worktrees in `../<repo>.worktrees`
 *    - the install command its lock file names (none without one)
 *    - window names from the repo's name;  the window files in the epic folder's `windows/` (git-ignored there)
 *    - where the code is hosted (`codeHost`):  `--host`, the config's, the `origin` remote's address, or asked in a
 *      terminal when that address doesn't say (`codeHostChoice()`)
 *    - a file already there is kept as it is;  `--host`, or that question, writes its `codeHost`
 * 2. makes the epic folder, a git repo of its own, with a folder for each of `sharedFolders`
 *    (`Shared.init()`):  `epics`, `sagas`, `guides`, `pages`
 *    - a LATER person (the config names its `contentRemote`, the folder is missing):  clones it instead
 *      (`Shared.clone()`, plain git;  epic `epic-friend` P4)
 * 2b. gives the epic repo its REMOTE, so a team shares the plans (`remoteStep()`, epic `epic-friend` P4, Q1):
 *    - the FIRST person:  asks what to call it (`CLI.ask()`, suggesting `<repo>.epics`;  `--content-repo`
 *      answers), and whether it's private or public (private suggested;  `--public` answers;  epic `epic-friend`
 *      T19), makes it on the code host (`CodeHost.of()`:  GitHub or GitLab), pushes, and writes its address into the config
 *      (`contentRemote`)
 *      - no terminal to ask in:  private, unless `--public`;  public says, in one line, that the plans will be too
 *      - its owner:  the code repo's when that's an organization (a GitLab group), else the person's own account
 *      - without the host's command (`gh`, `glab`), or logged out, it says how to get it, and carries on without
 *      - GitLab protects a new project's default branch:  opened up at once (`letTeamPush()`), or says what to do
 *      - GitLab refusing the FIRST push (your role can't push to a protected default branch;  epic `epic-engine` P69):
 *        a Maintainer has to push the first commit and let everyone push:  it says so, with the members page and
 *        exactly what they run (`CodeHostClient.firstPushRefusal()`), never "push it by hand", and the end says
 *        sharing isn't working yet
 *      - private or public:  each choice says who can read the plans, naming the server (`CodeHostWords.canRead`);
 *        public asks again, no suggested
 *    - `--remote <address>`:  a repo made already, cloned when it holds the team's plans and the folder is missing;
 *      `--no-remote`:  none, the plans stay on this machine, whatever remote the epic folder has
 *    - an epic repo with a remote already:  its address written into the config, when it isn't there;  commits the
 *      remote lacks (a refused first push, since let through) pushed now, on top of what's there (`pushPending()`)
 * 3. links those folders in at the checkout's root (`Shared.link()`)
 * 4. lists in the repo's `.gitignore`, between `# shared:start` and `# shared:end`:  the links
 *    - not the window files (`epic window`:  each machine's own):
 *      they're in the epic folder since epic `epic-eject` P13, whose `.gitignore` takes them (`Shared.init()`)
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
 * - `--dry-run`:  says what it would do, and writes nothing (it asks `gh` whether it could make the epic repo)
 * - `--json`:  the report as JSON
 * - a failed plugin install or server start is one line, and init carries on
 * - it commits the files it wrote in the repo (the config and `.gitignore`) on the base branch, asking first in a
 *   terminal (`commitStep()`;  `--no-commit`):  every new worktree branches from there, and needs the `.gitignore` to
 *   leave the links alone;  on another branch it says so, and commits nothing
 * - a base branch that takes only pull requests (`baseBranchProtected`):  it NEVER commits there
 *   (`commitViaPullRequest()`):  the two files go on a new branch, `epic-setup`, pushed, with a pull request opened
 *   (`gh` or `glab`), else what to run printed;  the base branch's checkout is left as it was, and epics start once
 *   it's merged;  on GitLab it's a merge request
 *   - on when `--protected-base` says so, or the code host does (`protectionStep()`), in one line
 * - it starts with "Initializing Epic for repo <main>" and ends with "Epics initialized!", in colour;  the settings it
 *   wrote are in the file, not printed (Owen, 2026-10-29)
 * - `--local` (epic `epic-engine` P69:  a colleague "doesn't want any of it in the jarvis repo"):  NOTHING in the repo
 *   - no `.gitignore` lines and no commit, ever:  `.epic/` and the links go in `.git/info/exclude` (`excludeStep()`)
 *   - kept in the config (`localSetup`):  run again with no flag, it stays local
 *   - nothing made on the code host unless `--content-repo` says;  `--remote` with the team's plans clones them
 *   - refused, first, where the base branch tracks the config already (`refuseCommittedSetup()`)
 *   - a setup pull or merge request an earlier run left open:  named, to close, and never touched
 *     (`openSetupRequest()`)
 *   - its end says nothing was added to the repo, what's on this machine only, and what each teammate runs
 * - the questions:  keys pressed during the code host's lookups aren't printed, with a gray line saying what it's
 *   waiting on (`CLI.waiting()`)
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
    const { flags } = parseVerbArgs(args, [
      "dryRun",
      "json",
      "noRemote",
      "public",
      "noPlugin",
      "noServer",
      "noCommit",
      "protectedBase",
      "local"
    ])
    const dryRun = flags.dryRun === true
    const local = flags.local === true
    const remote = stringFlag(flags.remote)
    const contentRepo = stringFlag(flags.contentRepo)
    const noRemote = flags.noRemote === true
    if ([remote, contentRepo, noRemote || undefined].filter(Boolean).length > 1)
      throw new EpicCommandError("epic init:  give one of --content-repo, --remote or --no-remote")
    if (contentRepo && !REPO_NAME.test(contentRepo))
      throw new EpicCommandError(
        `epic init:  --content-repo ${contentRepo} isn't a repo name;  letters, digits, ".", "-" and "_" only`
      )
    const host = flags.host
    if (host !== undefined && !CodeHost.isKind(host))
      throw new EpicCommandError(
        `epic init:  --host ${String(host)} isn't a code host:  one of ${CodeHost.KINDS.join(", ")}`
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
    // a setup already committed can't go local:  refused before anything is asked or written
    if (local) RepoInit.refuseCommittedSetup(this.main)
    print([chalk.cyan.bold(`Initializing Epic for repo ${this.main}`)])
    // every question first, then what they come to
    const answers = await this.questions({
      local,
      ask,
      dryRun,
      name: stringFlag(flags.name),
      color,
      remote,
      contentRepo,
      visibility: flags.public === true ? "public" : undefined,
      noRemote,
      host,
      say
    })
    print(RepoInit.summaryLines(answers.plan))
    const plugin = flags.noPlugin === true ? undefined : this.pluginStep({ dryRun })
    if (plugin) print(RepoInit.pluginLines(plugin))
    // the section's head first:  its slow steps' progress lines go under it
    print(["", chalk.bold(FILES_HEAD)])
    const report = await this.init({
      dryRun,
      local,
      name: answers.name,
      remote,
      contentRepo: answers.contentRepo,
      visibility: answers.visibility,
      noRemote,
      color: answers.color,
      cloned: answers.cloned,
      codeHost: answers.codeHost,
      protectedBase: flags.protectedBase === true,
      say
    })
    if (plugin) report.plugin = plugin
    print([...RepoInit.fileLines(report, { head: false }), ...RepoInit.noteLines(report)])
    // local:  nothing committed, ever
    if (report.local) {
      // nothing to say:  the files' table and the end say what stayed on this machine
    } else if (flags.noCommit !== true && report.content.action !== "missing") {
      if (RepoInit.changedFiles(report).length) print(["", chalk.bold(RepoInit.commitHeader(report))])
      report.commit = await RepoInit.commitStep({ report, ask, say })
      print(RepoInit.commitResultLines(report.commit, RepoInit.wordsOf(report)))
    } else if (flags.noCommit === true && report.config.settings.baseBranchProtected) {
      const files = RepoInit.changedFiles(report)
      if (files.length)
        print([
          `> Not committed (--no-commit):  ${report.config.settings.baseBranch} takes only ` +
            `${RepoInit.wordsOf(report).pullRequest}s, so put ${files.join(" and ")} on a branch and open one`
        ])
    }
    // waiting on its pull or merge request, the repo has no config yet, and the server has nothing to serve
    if (flags.noServer !== true && report.content.action !== "missing" && report.commit?.action !== "on branch") {
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
   * - where the code is hosted, only when the `origin` address doesn't say and nothing else does (`codeHostChoice()`)
   * - their colour, from the names nobody has (`askColor()`), unless they have one already;  `color` answers it
   *   - a teammate joining, the team's plans not here yet:  cloned FIRST, quietly, so the taken colours are known
   *     (`cloned`;  `init()` reports it)
   * - the epic repo's name and private or public, only when `init()` will make it on the code host (`willMakeRepo()`)
   * - no terminal (`ask` off):  nothing asked;  the plan says what the flags and the suggestions come to
   * - SIDE EFFECT:  the clone, for a teammate joining (not `dryRun`)
   */
  async questions({
    ask,
    dryRun,
    local = false,
    name,
    color,
    remote,
    contentRepo,
    visibility,
    noRemote,
    host,
    say = () => {}
  }: QuestionOptions): Promise<Answers> {
    const { main } = this
    const found = RepoInit.settingsOf(main)
    const content = join(main, found.contentFolder)
    const answers: Answers = { name, color, contentRepo, visibility, plan: {} }
    const isLocal = local || found.localSetup
    answers.codeHost = await RepoInit.codeHostChoice({ main, host, ask })
    const settings = { ...found, codeHost: answers.codeHost.kind }
    const codeHost = CodeHost.of({ main, codeHost: settings.codeHost })
    // the code host asked:  a line saying so, and keys pressed meanwhile not printed (`CLI.waiting()`)
    const slow = <T>(work: () => T): T => (ask ? CLI.waiting(`checking ${codeHost.words.name}…`, work) : work())
    if (ask && !name)
      answers.name = await RepoInit.askName(
        codeHost,
        slow(() => CodeHost.loginOn(codeHost))
      )
    const person = answers.name?.trim() || EpicHome.person().name
    // a teammate joining:  the plans first, for the colours they hold;  the config's address, or `--remote`'s when
    // it holds the team's plans already
    const address =
      settings.contentRemote ||
      (remote && !noRemote && !existsSync(content) && RepoInit.holdsCommits(remote, main) ? remote : "")
    if (address && !noRemote && !dryRun && !existsSync(content)) {
      say("cloning the team's plans…")
      const shared = new Shared({ checkout: main, config: { main, dir: content, worktrees: [], links: [] } })
      answers.cloned = !shared.clone(address)
    }
    const colors = RepoInit.colorsOf({ content, person, settings })
    if (ask && !color && person && !colors.own && colors.free.length)
      answers.color = await RepoInit.askColor(colors.free)
    const repoPlan = slow(() => this.willMakeRepo({ settings, content, remote, noRemote, local: isLocal, contentRepo }))
    if (repoPlan) {
      const suggestion = `${basename(main)}.epics`
      answers.contentRepo ??= ask ? await CLI.ask(REPO_QUESTION, { suggestion }) : suggestion
      answers.visibility ??= ask ? await RepoInit.askVisibility(codeHost.words) : "private"
    }
    const stays = noRemote || (isLocal && !contentRepo && !remote && !settings.contentRemote && !repoPlan)
    answers.plan = {
      name: person,
      color: colors.own ?? answers.color,
      sharedRepo: repoPlan
        ? `${repoPlan.owner}/${answers.contentRepo}, ${answers.visibility}`
        : stays
          ? "none:  the plans stay on this machine"
          : remote || address || undefined,
      ...(isLocal && { local: true })
    }
    return answers
  }

  /**
   * Whether `init()` will make the epic repo on the code host:  its owner when it will, else `undefined`.
   * - not when the epic repo has a remote, the config names one, or `remote` / `noRemote` was given
   * - not in local mode (`--local`), unless `contentRepo` (`--content-repo`) asks for one:  `--local` alone never makes
   *   anything on the code host
   * - only with the host's command installed and logged in (`status()`, a few seconds), as `remoteStep()` asks
   */
  willMakeRepo({
    settings,
    content,
    remote,
    noRemote,
    local = false,
    contentRepo
  }: {
    settings: EpicSettings
    content: string
    remote?: string
    noRemote?: boolean
    local?: boolean
    contentRepo?: string
  }): { owner: string } | undefined {
    if (noRemote || remote || settings.contentRemote) return undefined
    if (local && !contentRepo) return undefined
    if (existsSync(join(content, ".git")) && Git.out(["remote", "get-url", "origin"], content)) return undefined
    const host = CodeHost.of({ main: this.main, codeHost: settings.codeHost })
    if (host.status() !== "ready") return undefined
    const owner = RepoInit.ownerFor(this.main, host)
    return owner ? { owner } : undefined
  }

  /** The settings in force in checkout `main`:  its config's, else what `epic init` would write. */
  static settingsOf(main: string): EpicSettings {
    return existsSync(join(main, EpicConfig.FILE)) ? new EpicConfig(main).settings : EpicConfig.defaultsFor(main)
  }

  /**
   * Set the repo up (the class's steps);  what it did, or would do with `dryRun`.
   * - the options:  `InitOptions`
   * - local (`local`, or the config's `localSetup`):  the `.gitignore` left alone, the config and the links listed in
   *   the repo's private ignore list instead, nothing committed, the code host asked nothing unless `contentRepo` says
   *   - throws `EpicCommandError` first, writing nothing, when the base branch tracks the config already
   * - SIDE EFFECT (not `dryRun`):  writes the config and `.gitignore` (local:  `.git/info/exclude`), makes (or clones)
   *   the epic repo and the links, may make the epic repo on the code host and push to it, keeps the person's name in
   *   the epic home
   */
  async init({
    dryRun = false,
    local: localFlag = false,
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
    protectedBase = false,
    codeHost,
    say = () => {}
  }: InitOptions = {}): Promise<InitReport> {
    const { main } = this
    const configFile = join(main, EpicConfig.FILE)
    const hadConfig = existsSync(configFile)
    const found = hadConfig ? new EpicConfig(main).settings : EpicConfig.defaultsFor(main)
    // local stays local, run again with no flag
    const local = localFlag || found.localSetup
    if (local) RepoInit.refuseCommittedSetup(main, found.baseBranch)
    // the plugin first:  the machine's, whatever happens to the repo
    const pluginReport = plugin ? this.pluginStep({ dryRun }) : undefined
    const hosted = codeHost ?? (await RepoInit.codeHostChoice({ main, ask: false }))
    const withHost = { ...found, codeHost: hosted.kind }
    const protection = RepoInit.protectionStep({ main, configFile, hadConfig, settings: withHost, protectedBase })
    const settings = { ...withHost, baseBranchProtected: protection.on, localSetup: local }
    if (!hadConfig && !dryRun) {
      mkdirSync(dirname(configFile), { recursive: true })
      writeFileSync(configFile, RepoInit.configText(settings))
    }
    if (hadConfig && !dryRun && local && !found.localSetup) RepoInit.keepValue(configFile, "localSetup", true)
    if (hadConfig && !dryRun && (protection.action === "flag" || protection.action === "detected"))
      RepoInit.keepProtected(configFile)
    if (hadConfig && !dryRun && (hosted.source === "flag" || hosted.source === "asked"))
      RepoInit.keepCodeHost(configFile, hosted.kind)
    const content = join(main, settings.contentFolder)
    const folders = settings.sharedFolders
    const report: InitReport = {
      main,
      dryRun,
      local,
      config: { file: configFile, action: hadConfig ? "kept" : "written", settings },
      content: { folder: content, action: "exists", made: [] },
      links: [],
      remote: { action: "skipped" },
      gitignore: { file: join(main, ".gitignore"), action: "ok" },
      protection,
      codeHost: hosted,
      person: RepoInit.personStep({ dryRun, name }),
      ...(pluginReport && { plugin: pluginReport })
    }
    const config = { main, dir: content, worktrees: [], links: folders }
    const shared = new Shared({ checkout: main, config })
    // a later person:  the epic repo's address in the config, or `--remote`'s holding the team's plans already, the
    // folder missing:  cloned
    const address =
      settings.contentRemote ||
      (remote && !noRemote && (cloned || (!existsSync(content) && RepoInit.holdsCommits(remote, main))) ? remote : "")
    if (address && cloned) report.remote = { action: "cloned", address }
    else if (address && !noRemote && !existsSync(content)) {
      report.remote = { action: dryRun ? "would clone" : "cloned", address }
      if (!dryRun) say("cloning the team's plans…")
      const error = dryRun ? undefined : shared.clone(address)
      if (error) report.remote = { action: "clone failed", address, error }
    }
    // the epic repo, and any of its folders missing
    const isRepo = existsSync(join(content, ".git"))
    const missing = folders.filter((folder) => !existsSync(join(content, folder)))
    report.content.made = isRepo ? missing : folders
    report.content.action = isRepo ? (missing.length ? "added" : "exists") : "created"
    if (report.remote.action === "cloned") report.content.action = "cloned"
    if (report.remote.action === "would clone") report.content = { folder: content, action: "would clone", made: [] }
    if (report.remote.action === "clone failed") report.content = { folder: content, action: "missing", made: [] }
    // cloned from `--remote`:  its address goes in the config, so the turns sync with it
    if (report.remote.action === "cloned" && address !== settings.contentRemote && !dryRun)
      RepoInit.keepRemote(configFile, address)
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
        local,
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
    // the links:  what each is now, and what linking does;  none into an epic repo that isn't there
    report.links =
      report.content.action === "missing"
        ? []
        : dryRun
          ? folders.map((path) => {
              const state = shared.linkState(main, path)
              return { path, action: state === "ok" ? "ok" : `would link (${state})` }
            })
          : shared.link(main).map(({ path, action, state }) => ({ path, action: action ?? state }))
    if (local) {
      // local:  the config and the links in the repo's private ignore list, its `.gitignore` as it was
      report.exclude = RepoInit.excludeStep(report)
      report.setupRequest = RepoInit.openSetupRequest(main, settings)
    } else {
      // the `.gitignore` block
      const ignoreFile = report.gitignore.file
      const before = existsSync(ignoreFile) ? readFileSync(ignoreFile, "utf8") : ""
      const ignored = folders.map((folder) => `/${folder}`)
      const after = RepoInit.withIgnoreBlock(before, ignored, relative(main, content))
      report.gitignore.action = after === before ? "ok" : before ? "updated" : "written"
      if (!dryRun && after !== before) writeFileSync(ignoreFile, after)
    }
    // the files it wrote in the repo, committed on the base branch;  never in local mode
    if (commit && !local) report.commit = await RepoInit.commitStep({ report, ask, say })
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
   * - a base branch that takes only pull requests:  `commitViaPullRequest()` instead, NEVER a commit on it
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
    if (report.config.settings.baseBranchProtected) return RepoInit.commitViaPullRequest({ report, ask, say })
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

  /**
   * The files `epic init` wrote, for a base branch that takes only pull requests:  committed on a new branch
   * (`SETUP_BRANCH`) WITHOUT touching the base branch, pushed, a pull request opened;  what it did.
   * - asks first in a terminal, `y` suggested;  with no terminal, yes
   * - on another branch:  `other branch`, nothing done
   * - a commit of `epic init`'s own on the base branch, not pushed (a run before this setting was on, its push refused):
   *   taken back first, keeping its files (`undoOwnCommit()`)
   * - the branch is made without checking it out (`commitOnSetupBranch()`), then the base branch's checkout put back as
   *   it was (`restoreBase()`):  so "safe to run again", whatever else is staged or changed
   * - the pull or merge request:  opened when the host's command is logged in;  else `pullRequestError` says why, and the
   *   lines say what to run
   * - NEVER throws
   * - SIDE EFFECT (not `dryRun`):  a branch, a push, a pull request, the two files out of the checkout
   */
  static async commitViaPullRequest({
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
    const via = { viaPullRequest: true, base }
    const branch = Git.out(["rev-parse", "--abbrev-ref", "HEAD"], main) ?? ""
    if (!dryRun && branch === base) RepoInit.undoOwnCommit(main, base)
    const files = RepoInit.changedFiles(report)
    if (!files.length) return { action: "none", files, branch: base, ...via }
    if (branch !== base) return { action: "other branch", files, branch, ...via }
    if (dryRun) return { action: "would branch", files, branch: SETUP_BRANCH, ...via }
    const question =
      `Put ${files.join(" and ")} on a new branch ${SETUP_BRANCH}, push it, and open a ` +
      `${RepoInit.wordsOf(report).pullRequest}?`
    const answer = ask ? await CLI.ask(question, { suggestion: "y" }) : "y"
    if (/^n/i.test(answer.trim())) return { action: "declined", files, branch, ...via }
    try {
      RepoInit.commitOnSetupBranch(main, base, files)
      RepoInit.restoreBase(main, files, report.config.settings.sharedFolders)
    } catch (error) {
      return { action: "failed", files, branch: SETUP_BRANCH, error: (error as Error).message, ...via }
    }
    const pushed = RepoInit.pushBranch(main, SETUP_BRANCH, say)
    const done: CommitReport = { action: "on branch", files, branch: SETUP_BRANCH, ...via, ...pushed }
    const host = CodeHost.of({ main, codeHost: report.config.settings.codeHost })
    return pushed.push === "pushed" ? { ...done, ...RepoInit.pullRequestStep(main, base, say, host) } : done
  }

  /**
   * Take back `epic init`'s own commit from base branch `base`, when it's its last commit and the only one `origin`'s
   * lacks:  an earlier run's, its push refused.  Its files stay, uncommitted.
   * - anything else on the branch that `origin`'s lacks:  left alone
   * - SIDE EFFECT:  `git reset --mixed HEAD~1`
   */
  private static undoOwnCommit(main: string, base: string): void {
    if (Git.out(["rev-list", "--count", `refs/remotes/origin/${base}..${base}`], main) !== "1") return
    if (Git.out(["log", "-1", "--format=%s", base], main) !== COMMIT_MESSAGE) return
    Git.run(["reset", "-q", "--mixed", "HEAD~1"], main)
  }

  /**
   * `files`, as they are on disk, committed on `SETUP_BRANCH`:  with a temporary index, so HEAD, the checkout's own
   * index and any other change there are never touched.
   * - from `base`, or on top of the branch when it holds work `base` doesn't (a run before, its pull request open)
   * - nothing new to commit:  the branch stays
   * - throws a `GitError` when git can't
   * - SIDE EFFECT:  a commit, and the branch made or moved
   */
  private static commitOnSetupBranch(main: string, base: string, files: string[]): void {
    const tip = Git.out(["rev-parse", "--verify", "--quiet", `refs/heads/${SETUP_BRANCH}`], main)
    const parent =
      tip && !Git.run(["merge-base", "--is-ancestor", tip, base], main).ok
        ? tip
        : Git.mustRun(["rev-parse", base], main)
    const folder = mkdtempSync(join(tmpdir(), "epic-setup-"))
    const env = { ...process.env, GIT_INDEX_FILE: join(folder, "index") }
    try {
      Git.mustRun(["read-tree", parent], main, { env })
      for (const file of files) {
        const blob = Git.mustRun(["hash-object", "-w", "--", file], main)
        Git.mustRun(["update-index", "--add", "--cacheinfo", `100644,${blob},${file}`], main, { env })
      }
      const tree = Git.mustRun(["write-tree"], main, { env })
      if (tree === Git.out(["rev-parse", `${parent}^{tree}`], main)) return
      const commit = Git.mustRun(["commit-tree", tree, "-p", parent, "-m", COMMIT_MESSAGE], main)
      Git.mustRun(["update-ref", `refs/heads/${SETUP_BRANCH}`, commit], main)
    } finally {
      rmSync(folder, { recursive: true, force: true })
    }
  }

  /**
   * Put the base branch's checkout back:  `files` as HEAD has them, or gone when it hasn't any, so `git status` is clean.
   * - the links `init()` made (`links`) are listed in `.git/info/exclude`:  the `.gitignore` that names them is on the
   *   setup branch until it's merged
   * - throws a `GitError` when git can't
   * - SIDE EFFECT:  the two files, the exclude file
   */
  private static restoreBase(main: string, files: string[], links: string[]): void {
    for (const file of files) {
      if (Git.run(["cat-file", "-e", `HEAD:${file}`], main).ok) Git.mustRun(["checkout", "HEAD", "--", file], main)
      else {
        Git.run(["rm", "-q", "--cached", "--ignore-unmatch", "--", file], main)
        rmSync(join(main, file), { force: true })
      }
    }
    try {
      rmdirSync(join(main, dirname(EpicConfig.FILE)))
    } catch {
      // holds other files, or is gone:  it stays as it is
    }
    Git.exclude(
      links.map((link) => `/${link}`),
      EXCLUDE_NOTE,
      main
    )
  }

  /**
   * The pull or merge request for `SETUP_BRANCH`, opened by `host`:  its address, or why not.
   * - NEVER throws
   * - SIDE EFFECT:  a pull or merge request on the code host
   */
  private static pullRequestStep(
    main: string,
    base: string,
    say: (text: string) => void,
    host: CodeHostClient
  ): Pick<CommitReport, "pullRequest" | "pullRequestError"> {
    const { words } = host
    const status = host.status()
    if (status === "missing") return { pullRequestError: `${words.name}'s command, ${words.command}, isn't installed` }
    if (status === "logged-out") return { pullRequestError: `${words.command} isn't logged in to ${words.name}` }
    say(`opening the ${words.pullRequest}…`)
    try {
      return {
        pullRequest: host.openPullRequest({
          branch: SETUP_BRANCH,
          base,
          title: PR_TITLE,
          body: prBody(words.pullRequest),
          cwd: main
        })
      }
    } catch (error) {
      return { pullRequestError: (error as Error).message }
    }
  }

  /**
   * Whether the base branch takes only pull requests, and how that's known;  what `init()` puts in the config.
   * - already on in the config, or in the setup branch's (run again, its pull request not merged yet):  `config`
   * - `protectedBase` (`--protected-base`):  `flag`
   * - else the code host's word (`hostRequiresPullRequest()`):  `detected`;  no such rule:  `off`
   * - a config that says `false` in so many words stays so (a file already there is kept):  `says off`, and a note
   * - NEVER throws:  failing to find out is `off`, never a failed init
   */
  static protectionStep({
    main,
    configFile,
    hadConfig,
    settings,
    protectedBase
  }: {
    main: string
    configFile: string
    hadConfig: boolean
    settings: EpicSettings
    protectedBase: boolean
  }): ProtectionReport {
    if (settings.baseBranchProtected || RepoInit.setupBranchSaysProtected(main)) return { action: "config", on: true }
    if (protectedBase) return { action: "flag", on: true }
    try {
      if (!RepoInit.hostRequiresPullRequest(main, settings)) return { action: "off", on: false }
      const written = hadConfig ? (EpicConfig.parse(readFileSync(configFile, "utf8"), configFile) as object) : {}
      return "baseBranchProtected" in written ? { action: "says off", on: false } : { action: "detected", on: true }
    } catch {
      return { action: "off", on: false }
    }
  }

  /** Whether `SETUP_BRANCH`, when there is one, holds a config with `baseBranchProtected` on. */
  private static setupBranchSaysProtected(main: string): boolean {
    const text = Git.out(["show", `refs/heads/${SETUP_BRANCH}:${EpicConfig.FILE}`], main)
    if (!text) return false
    try {
      return EpicConfig.settingsFrom(text, EpicConfig.FILE, main).baseBranchProtected
    } catch {
      return false
    }
  }

  /** Whether the code host, as its command can see it, requires a request into the base branch of checkout `main`. */
  private static hostRequiresPullRequest(main: string, settings: EpicSettings): boolean {
    const host = CodeHost.of({ main, codeHost: settings.codeHost })
    const origin = CodeHost.originOf(main)
    const repo = origin ? host.repoIn(origin) : undefined
    return repo !== undefined && host.status() === "ready" && host.requiresPullRequest(repo, settings.baseBranch)
  }

  /**
   * Where the code is hosted, and how that's known (`init()`'s `codeHost`, `epic init`'s question).
   * - `--host` (`host`):  `flag`;  the config names one:  `config`
   * - else the `origin` address's:  `address`;  it doesn't say (`git.acme.com`):  `asked` in a terminal, else `assumed`
   *   GitHub, which `noteLines()` says in one line;  no remote:  `default`, GitHub
   * - NEVER throws
   */
  static async codeHostChoice({
    main,
    host,
    ask
  }: {
    main: string
    host?: CodeHostKind
    ask: boolean
  }): Promise<CodeHostReport> {
    const origin = CodeHost.originOf(main)
    const hostName = CodeHost.hostOf(origin)
    const said = { ...(hostName && { host: hostName }), ...(origin && { address: origin }) }
    if (host) return { kind: host, source: "flag", ...said }
    if (existsSync(join(main, EpicConfig.FILE))) {
      try {
        const written = EpicConfig.parse(readFileSync(join(main, EpicConfig.FILE), "utf8"), EpicConfig.FILE) as {
          codeHost?: unknown
        }
        if (CodeHost.isKind(written.codeHost)) return { kind: written.codeHost, source: "config", ...said }
      } catch {
        // an unreadable config:  settled from the address, and `new EpicConfig()` says why it won't read
      }
    }
    if (!CodeHost.isUnknownAddress(origin))
      return { kind: CodeHost.kindOfAddress(origin), source: origin ? "address" : "default", ...said }
    if (ask && process.stdin.isTTY && process.stdout.isTTY)
      return {
        kind: (await CLI.choose(HOST_QUESTION, HOST_CHOICES)) as CodeHostKind,
        source: "asked",
        ...said
      }
    return { kind: "github", source: "assumed", ...said }
  }

  /**
   * Write `kind` into config file `file` as its `codeHost`, keeping the rest as written.
   * - a line that's there is changed in place;  else the key goes in through `DataFile`, its comments kept
   * - SIDE EFFECT:  writes the file
   */
  static keepCodeHost(file: string, kind: CodeHostKind): void {
    RepoInit.keepValue(file, "codeHost", kind)
  }

  /**
   * Turn `baseBranchProtected` on in config file `file`, keeping the rest as written.
   * - the line `epic init` writes is changed in place;  a file without one gets the key through `DataFile`
   * - SIDE EFFECT:  writes the file
   */
  static keepProtected(file: string): void {
    RepoInit.keepValue(file, "baseBranchProtected", true)
  }

  /**
   * Write `value` into config file `file` as its `key`, keeping the rest as written:  the ONE way `epic init` changes
   * a config that's there.
   * - the line `epic init` writes (`"key": "text"`, `true`, `false`) is changed in place;  a file without one (an
   *   older file, or one written by hand) gets the key through `DataFile`, its comments kept
   * - SIDE EFFECT:  writes the file
   */
  static keepValue(file: string, key: keyof EpicSettings, value: string | boolean): void {
    const text = readFileSync(file, "utf8")
    const line = new RegExp(`^(\\s*"${key}":\\s*)(?:"(?:[^"\\\\]|\\\\.)*"|true|false)`, "m")
    if (line.test(text))
      writeFileSync(
        file,
        text.replace(line, (_all, start: string) => start + JSON.stringify(value))
      )
    else DataFile.edit<Record<string, unknown>>(file, (settings) => ({ ...settings, [key]: value }))
  }

  /** What the commit section says first:  why `epic init` asks to commit, or to open a pull or merge request. */
  static commitHeader(report: Pick<InitReport, "config"> & Partial<Pick<InitReport, "codeHost">>): string {
    return report.config.settings.baseBranchProtected
      ? pullRequestHeader(RepoInit.wordsOf(report).pullRequest)
      : COMMIT_HEADER
  }

  /** What a person reads about `report`'s code host:  "merge request" on GitLab, GitHub's by default. */
  static wordsOf({
    config,
    codeHost
  }: Pick<InitReport, "config"> & Partial<Pick<InitReport, "codeHost">>): CodeHostWords {
    return CodeHost.wordsFor(config.settings.codeHost, codeHost?.host)
  }

  /**
   * The files `epic init` changed in the repo, still to commit:  the config, `.gitignore`.
   * - a dry run wrote nothing:  the ones it would have count too
   */
  static changedFiles({ main, dryRun, config, gitignore }: ChangedFilesInput): string[] {
    const wouldWrite = (file: string) =>
      dryRun && (file === EpicConfig.FILE ? config?.action === "written" : gitignore?.action !== "ok")
    return [EpicConfig.FILE, ".gitignore"].filter(
      (file) => wouldWrite(file) || Git.out(["status", "--porcelain", "--", file], main)
    )
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
   * The epic repo of checkout `main` committed and synced at once (`Shared.sync()`, every turn's end):  whether
   * it pushed.
   * - NEVER throws:  a sync that fails waits for the next turn's, as any does
   * - SIDE EFFECT:  commits in the epic repo, a pull and a push
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
   * The epic repo's REMOTE (the class's step 2b):  what it did, or would do with `dryRun`.
   * - `noRemote`:  `skipped`, whatever the epic repo has:  no `contentRemote` written, so no turn's sync pushes
   * - a remote already:  its address written into the config when it isn't there (`recorded`)
   *   - `remote` naming another:  throws `EpicCommandError`, saying how to change it
   *   - the remote lacking this machine's commits (an earlier run's push refused):  pushed now, through the sync
   *     (`pushPending()`), and opened up for the team once it went through (`pushed`)
   * - `remote`, else the config's `contentRemote`:  made the remote, pushed (`added`)
   * - local (`local`) with no `contentRepo`:  `kept local`, nothing made on the code host
   * - else made on the code host (`made`), when its command is there and logged in (`no gh` for either's, `logged out`);
   *   `failed` with its words when it said no
   *   - its name:  `contentRepo`, else asked when `ask` (in a terminal), else `<repo>.epics`
   *   - private or public:  `visibility`, else asked when `ask` (`askVisibility()`), else private
   * - a push that failed is in `error`:  the repo and its address stand;  GitLab refusing a first push to its protected
   *   default branch is in `refusal` too:  what a Maintainer runs (`CodeHostClient.firstPushRefusal()`)
   * - GitLab:  after the first push, its default branch opened up to teammates (`warning`, when it couldn't be)
   * - SIDE EFFECT (not `dryRun`):  the repo on the code host, the remote, the push, `contentRemote` in the config
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
    say = () => {},
    local = false
  }: RemoteStepOptions): Promise<RemoteReport> {
    const configFile = join(this.main, EpicConfig.FILE)
    const host = CodeHost.of({ main: this.main, codeHost: settings.codeHost })
    // before the folder's own remote:  --no-remote means none, whatever the epic repo has
    if (noRemote) return { action: "skipped" }
    const origin = shared.remote
    if (origin) {
      if (remote && remote !== origin)
        throw new EpicCommandError(
          `epic init:  the epic repo's remote is ${origin} already;  to change it:  git -C ${shared.config.dir} ` +
            `remote set-url origin ${remote}, then epic init again`
        )
      const known: RemoteReport =
        settings.contentRemote === origin
          ? { action: "already", address: origin }
          : { action: dryRun ? "would record" : "recorded", address: origin }
      if (dryRun) return known
      if (known.action === "recorded") RepoInit.keepRemote(configFile, origin)
      return { ...known, ...(await this.pushPending({ shared, host, address: origin, say })) }
    }
    const given = remote ?? settings.contentRemote
    if (given) {
      if (dryRun) return { action: "would add", address: given }
      const error = shared.publish(given)
      if (given !== settings.contentRemote) RepoInit.keepRemote(configFile, given)
      const refusal = error ? RepoInit.refusalOf(host, error, given, shared) : undefined
      return { action: "added", address: given, ...(error && { error }), ...(refusal && { refusal }) }
    }
    // local:  nothing made on the code host, unless --content-repo asks
    if (local && !contentRepo) return { action: "kept local" }
    // made on the code host:  only with its command, logged in
    const status = host.status()
    if (status === "missing") return { action: "no gh" }
    const owner = status === "ready" ? RepoInit.ownerFor(this.main, host) : undefined
    if (!owner) return { action: "logged out" }
    const suggestion = `${basename(this.main)}.epics`
    const repoName = contentRepo ?? (ask ? await CLI.ask(REPO_QUESTION, { suggestion }) : suggestion)
    if (!REPO_NAME.test(repoName))
      return { action: "failed", repo: `${owner}/${repoName}`, error: 'letters, digits, ".", "-" and "_" only' }
    const repo = `${owner}/${repoName}`
    const seenBy = visibility ?? (ask ? await RepoInit.askVisibility(host.words) : "private")
    if (dryRun) return { action: "would make", repo, visibility: seenBy }
    say(`making ${repo} on ${host.words.name}…`)
    let address: string
    try {
      host.createRepo(repo, {
        visibility: seenBy,
        description: `The epic pages of ${basename(this.main)}:  plans, guides and sagas`
      })
      address = host.addressOf(repo)
    } catch (error) {
      return { action: "failed", repo, visibility: seenBy, error: (error as Error).message }
    }
    const error = shared.publish(address)
    RepoInit.keepRemote(configFile, address)
    // only once pushed:  GitLab protects a new project's default branch when that first push makes it
    const branch = Git.out(["rev-parse", "--abbrev-ref", "HEAD"], shared.config.dir) ?? "main"
    const warning = error ? undefined : host.letTeamPush(repo, branch)
    const refusal = error ? host.firstPushRefusal(error, { fullName: repo, address, branch }) : undefined
    return {
      action: "made",
      repo,
      address,
      visibility: seenBy,
      ...(error && { error }),
      ...(refusal && { refusal }),
      ...(warning && { warning })
    }
  }

  /**
   * The epic repo's commits its remote (`address`) lacks, pushed:  run again after a push that was refused (GitLab's
   * first push, until a Maintainer has made one), it finishes the job.
   * - asks the remote first (`git fetch`):  nothing to push, nothing said, nothing more run
   * - pushes through the turn's sync (`Shared.sync()`), so commits a Maintainer pushed meanwhile go under ours
   *   (`SharedSync`'s no-shared-history case)
   * - pushed:  the team let push to its branch (`letTeamPush()`;  `warning` when it couldn't);  refused or failed:
   *   `error`, and `refusal` when it's GitLab's first-push rule
   * - NEVER throws
   * - SIDE EFFECT:  a fetch, commits, a rebase and a push in the epic repo;  maybe a change on the code host
   */
  async pushPending({
    shared,
    host,
    address,
    say = () => {}
  }: {
    shared: Shared
    host: CodeHostClient
    address: string
    say?: (text: string) => void
  }): Promise<Pick<RemoteReport, "pushed" | "error" | "refusal" | "warning">> {
    const { dir } = shared.config
    if (!RepoInit.lacksCommits(dir)) return {}
    say("pushing your plans…")
    let sync: SyncReport | undefined
    try {
      sync = (await new Shared({ checkout: this.main }).sync({ checkout: this.main })).sync
    } catch (error) {
      return { error: (error as Error).message }
    }
    const branch = Git.out(["rev-parse", "--abbrev-ref", "HEAD"], dir) ?? "main"
    const repo = host.repoIn(address)
    if (sync?.pushed) {
      const warning = repo ? host.letTeamPush(repo, branch) : undefined
      return { pushed: true, ...(warning && { warning }) }
    }
    if (!sync?.error || sync.result === "up to date" || sync.result === "synced") return {}
    const refusal = repo ? host.firstPushRefusal(sync.error, { fullName: repo, address, branch }) : undefined
    return { error: sync.error, ...(refusal && { refusal }) }
  }

  /**
   * Whether the epic repo at `dir` has commits its remote's branch lacks, or the remote has no such branch yet.
   * - asks the remote (`git fetch`);  offline:  `false`, the next turn's sync pushes
   */
  static lacksCommits(dir: string): boolean {
    const branch = Git.out(["rev-parse", "--abbrev-ref", "HEAD"], dir)
    if (!branch || branch === "HEAD" || !Git.out(["rev-parse", "--verify", "-q", "HEAD"], dir)) return false
    if (!Git.run(["fetch", "-q", "origin"], dir, { timeout: PUSH_TIMEOUT }).ok) return false
    const theirs = `refs/remotes/origin/${branch}`
    if (!Git.run(["rev-parse", "--verify", "-q", theirs], dir).ok) return true
    return Number(Git.out(["rev-list", "--count", `${theirs}..HEAD`], dir) ?? 0) > 0
  }

  /** What `host` says to do about git's words `error` from the epic repo's first push to `address`. */
  private static refusalOf(
    host: CodeHostClient,
    error: string,
    address: string,
    shared: Shared
  ): FirstPushHelp | undefined {
    const repo = host.repoIn(address)
    const branch = Git.out(["rev-parse", "--abbrev-ref", "HEAD"], shared.config.dir) ?? "main"
    return repo ? host.firstPushRefusal(error, { fullName: repo, address, branch }) : undefined
  }

  /**
   * Refuse `epic init --local` where the setup is committed already:  base branch `base` of checkout `main` tracks
   * the config.  Its files have to come out by a merge request first;  local mode can't take them out by itself.
   * - `base`:  default the base branch the settings in force name
   * - throws `EpicCommandError`, before anything is asked or written
   */
  static refuseCommittedSetup(main: string, base = RepoInit.settingsOf(main).baseBranch): void {
    if (!Git.run(["cat-file", "-e", `${base}:${EpicConfig.FILE}`], main).ok) return
    throw new EpicCommandError(
      `epic init --local:  ${base} tracks ${EpicConfig.FILE} already, so epics are set up in the repo itself.  ` +
        `To go local, take it and the .gitignore's # shared:start block out of ${base} first ` +
        "(a commit, or a merge request where it takes only those), then run epic init --local again"
    )
  }

  /**
   * Whether git address `address` holds commits (`git ls-remote --heads`):  a teammate's epic repo, to clone, not an
   * empty one to push the first commit to.  NEVER throws:  unreachable is `false`.
   */
  static holdsCommits(address: string, cwd: string): boolean {
    return Git.lines(["ls-remote", "--heads", address], cwd, { timeout: PUSH_TIMEOUT }).length > 0
  }

  /**
   * Local mode's ignore step:  `.epic/` and each of the plans' links listed in the repo's private ignore list
   * (`Git.exclude()`), never its `.gitignore`;  what it did, or would.
   * - only the paths that are links now:  a folder the repo tracks itself stays out
   * - SIDE EFFECT (not `dryRun`):  appends to `.git/info/exclude`
   */
  static excludeStep({ main, dryRun, links }: Pick<InitReport, "main" | "dryRun" | "links">): ExcludeReport {
    const isLink = (path: string) => {
      try {
        return lstatSync(join(main, path)).isSymbolicLink()
      } catch {
        return false
      }
    }
    const linked = links.filter(({ path, action }) => (dryRun ? /^(ok|would link)/.test(action) : isLink(path)))
    const lines = [`/${dirname(EpicConfig.FILE)}/`, ...linked.map(({ path }) => `/${path}`)]
    const added = Git.exclude(lines, LOCAL_EXCLUDE_NOTE, main, { dryRun })
    return { file: Git.excludeFile(main), action: added.length ? (dryRun ? "would update" : "updated") : "ok", lines }
  }

  /**
   * The setup's pull or merge request an earlier `epic init` opened, still open:  local mode says to close it, and
   * touches nothing.  Its address, when the code host says;  else `{}` when only its branch (`SETUP_BRANCH`) is
   * here;  none:  `undefined`.
   * - NEVER throws
   */
  static openSetupRequest(main: string, settings: EpicSettings): SetupRequestReport | undefined {
    const host = CodeHost.of({ main, codeHost: settings.codeHost })
    const address =
      host.status() === "ready" ? host.openPullRequestOf(SETUP_BRANCH, settings.baseBranch, main) : undefined
    if (address) return { address }
    const hasBranch = [`refs/heads/${SETUP_BRANCH}`, `refs/remotes/origin/${SETUP_BRANCH}`].some(
      (ref) => Git.run(["rev-parse", "--verify", "-q", ref], main).ok
    )
    return hasBranch ? {} : undefined
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
   * Whose account a new epic repo goes in, for the code repo at `main`:  the code repo's owner when that's
   * an ORGANIZATION (a GitHub org, a GitLab group or subgroup), else the person's own login;  `undefined` when the
   * host's command knows no login.
   * - why not always the code repo's owner:  a person can't make a repo in someone else's own account
   * - runs its command (the login, `CodeHost.loginOn()`;  the owner's kind)
   */
  static ownerFor(main: string, host: CodeHostClient): string | undefined {
    const login = CodeHost.loginOn(host)
    // as written in `.git/config`, not as git rewrites it (`url.<base>.insteadOf`):  the host's own address
    const origin = CodeHost.originOf(main)
    const owner = origin ? host.ownerIn(origin) : undefined
    if (owner && owner !== login && host.isOrganization(owner)) return owner
    return login
  }

  /**
   * Write `address` into config file `file` as its `contentRemote`, keeping the rest as written.
   * - the line `epic init` writes is changed in place;  a file without one (written before epic `epic-friend` P4)
   *   gets the key through `DataFile`, its comments kept
   * - SIDE EFFECT:  writes the file
   */
  static keepRemote(file: string, address: string): void {
    RepoInit.keepValue(file, "contentRemote", address)
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
   * Whether the epic repo is private or public, picked in a terminal from the two (`CLI.choose()`), private first.
   * - each choice says who can read the plans, and how access is controlled, naming the real server (`words`, the
   *   code host's;  Owen, 2026-11-09:  "Maybe describe this in the CLI interface a bit more")
   * - public asks again, saying the same in one line, NO suggested:  no, or Enter, makes it private, and `say`s so
   *   (a stray key once picked public on a company's GitLab)
   * - no terminal:  private, asking nothing
   */
  static async askVisibility(
    words: CodeHostWords = GitHub.words,
    say: (text: string) => void = CLI.out
  ): Promise<RepoVisibility> {
    const picked = await CLI.choose(VISIBILITY_QUESTION, RepoInit.visibilityChoices(words))
    if (picked !== "public") return "private"
    const sure = await CLI.ask(`Public:  ${words.canRead.public}.  Make it public?`, { suggestion: "n" })
    if (/^y/i.test(sure.trim())) return "public"
    say(`> Private, then:  ${words.canRead.private}`)
    return "private"
  }

  /** "Private or public?"'s two choices, private first, each saying who can read it on code host `words`. */
  static visibilityChoices(words: CodeHostWords): CLI.Choice[] {
    return [
      { value: "private", label: "private", hint: words.canRead.private },
      { value: "public", label: "public", hint: words.canRead.public }
    ]
  }

  /**
   * The name to keep, asked in a terminal EVERY time (Owen, 2026-10-29:  "never asked for my user name"):
   * "What do you want to be called?", suggesting the name kept already, else their login on the code host, else
   * git's `user.name`;  Enter keeps it.
   * - the login looked up first (`CodeHost.loginOn()`;  GitHub's is kept, so pages never run `gh`), unless `login`
   *   was looked up already (`questions()`, which says so while it waits)
   * - `undefined` when nothing was said and nobody knows a name
   * - no terminal:  the suggestion, asking nothing (`CLI.ask()`)
   */
  static async askName(host: CodeHostClient = GitHub, login = CodeHost.loginOn(host)): Promise<string | undefined> {
    const now = EpicHome.person()
    const suggestion = (now.source === "kept" ? now.name : undefined) ?? login ?? now.github ?? now.fullName ?? ""
    return (await CLI.ask(NAME_QUESTION, { suggestion })) || undefined
  }

  /**
   * Their colour (the class's step 6):  kept, there already, or why not.
   * - `person`:  their short name;  none, no colour
   * - theirs already:  the config's `colors`, else their file in `people/` (`EpicConfig.colors`' order)
   * - the free names:  Spell UI's (`VoiceColor.NAMES`) less every one the config and `people/` give anyone
   * - `color`:  `--color`;  a name someone has is `taken`;  else asked when `ask` (`askColor()`), else none
   * - SIDE EFFECT (not `dryRun`):  writes `people/<name>.json5` in the epic folder
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
   * The colours of checkout's epic folder `content` and `settings`, for `person`:
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
  // the epic repo:  epic pages, sagas, guides, pages;  a git repo of its own, read from there
  "contentFolder": ${value("contentFolder")},
  // the epic repo's address, which everyone pulls from and pushes to ("":  none, the plans stay on this machine);
  // epic init writes it as it makes the epic repo, and clones it where the epic folder is missing
  "contentRemote": ${value("contentRemote")},
  // the branch worktrees start from and merge into
  "baseBranch": ${value("baseBranch")},
  // whether that branch can't be pushed to, and work reaches it only through a pull request (a merge request, on
  // GitLab):  epic init opens one, epic merge refuses, and the skills finish with one
  "baseBranchProtected": ${value("baseBranchProtected")},
  // whether epic init --local set this repo up:  nothing of epics committed in it, this file and the links on this
  // machine only (listed in .git/info/exclude);  epic init run again keeps it so
  "localSetup": ${value("localSetup")},
  // where the code is hosted, "github" or "gitlab":  picks gh or glab, and which words pages say;
  // left out, it's worked out from the origin remote each time it's read
  "codeHost": ${value("codeHost")},
  // where new worktrees go, one folder each:  <worktreesFolder>/<name>
  "worktreesFolder": ${value("worktreesFolder")},
  // what makes a new worktree ready to run, from its root ("":  nothing to install)
  "installCommand": ${value("installCommand")},
  // whether the worktree hook runs installCommand before it hands a new worktree over
  "installOnCreate": ${value("installOnCreate")},
  // the seconds that install may take
  "installTimeout": ${value("installTimeout")},
  // folders that are projects of their own, outside that install (a \`vscode/\` extension), from a worktree's
  // root:  installCommand runs in each too
  "extraInstalls": ${value("extraInstalls")},
  // the VS Code windows:  the window file a worktree's window is opened from, the folder names a window shows,
  // and whether a worktree's window holds only the worktree and the epic folder
  "windows": {
    "default": ${JSON.stringify(windows.default)},
    "repoName": ${JSON.stringify(windows.repoName)},
    "contentName": ${JSON.stringify(windows.contentName)},
    "worktreeOnly": ${JSON.stringify(windows.worktreeOnly)}
  },
  // whether each new worktree's saved-session folder is linked to the main checkout's (every window lists every
  // session)
  "linkSessionFolders": ${value("linkSessionFolders")},
  // the epic repo's folders, each linked in at the root of every checkout
  "sharedFolders": ${value("sharedFolders")},
  // the spell-epic checkout, linked in at every checkout's root as \`spell-epic\` ("":  no link;  a repo whose code
  // imports the engine, as spell-app's does, names it)
  "engineFolder": ${value("engineFolder")},
  // the repo's own page templates, a folder from each checkout's root, listed beside spell-epic's
  // ("":  none, spell-epic's templates are all there are)
  "repoTemplates": ${value("repoTemplates")},
  // the VS Code window files (\`epic window\`), each machine's own:  git-ignored in the epic repo
  // ("":  the epic folder's windows/)
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
   * - `content`:  the epic folder from the main checkout, for the block's comment
   */
  static withIgnoreBlock(text: string, ignored: string[], content: string): string {
    if (!ignored.length && !text.includes(BLOCK_START)) return text
    const block = [
      `${BLOCK_START}  (links into ${content}, the epic repo, and the VS Code window files:  never tracked;  ` +
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
        ? [
            "",
            chalk.bold(RepoInit.commitHeader(report)),
            ...RepoInit.commitResultLines(report.commit, RepoInit.wordsOf(report))
          ]
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
          : remote.action === "skipped" || remote.action === "kept local"
            ? "none:  the plans stay on this machine"
            : remote.address,
      ...(report.local && { local: true })
    }
  }

  /**
   * The summary under the questions:  `> Your name  :  owenoak`, the values bold, the colour in its colour;  local mode
   * says so first.
   */
  static summaryLines({ name, color, sharedRepo, local }: Plan): string[] {
    return [
      ...(local ? [`> Setup:  ${chalk.bold(LOCAL_SETUP)}`] : []),
      ...(name ? [`> Your name  :  ${chalk.bold(name)}`] : []),
      ...(color ? [`> Your colour:  ${RepoInit.colored(color, color)}`] : []),
      ...(sharedRepo ? [`> Epic repo:  ${chalk.bold(sharedRepo)}`] : [])
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
    const hostName = RepoInit.wordsOf(report).name
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
    rows.push(...remoteRowsFor(remote, hostName))
    for (const { path, action } of report.links)
      rows.push([action === "ok" ? "already linked" : action, join(main, path)])
    if (report.exclude)
      rows.push([
        report.exclude.action === "ok" ? "already present" : report.exclude.action,
        `${report.exclude.file}  (this machine's ignore list:  ${report.exclude.lines.join(" ")})`
      ])
    else
      rows.push([
        gitignore.action === "ok"
          ? "already present"
          : would(gitignore.action === "written" ? "wrote" : "updated", "would update"),
        gitignore.file
      ])
    if (person.action === "kept" || person.action === "would keep")
      rows.push([would("kept", "would keep"), `${EpicHome.personFile()}  (your name)`])
    if ((color?.action === "kept" || color?.action === "would keep") && color.file) {
      // no "at your next turn" while no push can go through (a refused first push)
      const later = remote.refusal ? ", shared once the epic repo takes a push" : ", pushed at your next turn"
      const shared = color.shared === true ? ", pushed" : color.shared === false ? later : ""
      rows.push([would("wrote", "would write"), `${color.file}  (your colour${shared})`])
    }
    const width = Math.max(...rows.map(([action]) => action.length))
    return [
      ...(head ? ["", chalk.bold(FILES_HEAD)] : []),
      ...rows.map(([action, path]) => chalk.gray(`  ${action.padEnd(width)}   ${path}`))
    ]
  }

  /** What needs a word of its own, under the files:  the epic repo's problems, the colour's, no name. */
  static noteLines(report: InitReport): string[] {
    const notes = [
      ...codeHostNotesFor(report),
      ...protectionNotesFor(report),
      ...remoteNotesFor(report),
      ...setupRequestNotesFor(report),
      ...colorNotesFor(report.color)
    ]
    if (report.person.action === "none") notes.push("no name yet (git has no user.name):  epic whoami <name> keeps one")
    if (!notes.length) return []
    return ["", chalk.bold("Note:"), ...notes]
  }

  /** What the commit came to (`commitStep()`), under its question;  `words`:  the code host's. */
  static commitResultLines(commit: CommitReport, words: CodeHostWords = CodeHost.wordsFor("github")): string[] {
    const { action, files, branch, error, push, pushError } = commit
    const named = files.join(" and ")
    if (commit.viaPullRequest) return viaPullRequestLines(commit, words)
    switch (action) {
      case "committed":
        if (push === "pushed") return ["> Committed and pushed"]
        if (push === "failed")
          return [
            `> Committed;  the push failed:  ${pushError}`,
            `  push it by hand:  git push origin ${branch}`,
            ...(PUSH_REFUSED.test(pushError ?? "")
              ? [
                  `  or, if ${branch} takes only ${words.pullRequest}s:  epic init --protected-base ` +
                    "(it moves this commit onto a branch, and opens one)"
                ]
              : [])
          ]
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

  /**
   * The last lines:  done, and where to see the epics (a browser's link, the editor's view);  a dry run's word.
   * - sharing that isn't working yet (the epic repo's push refused or failed) says so, and why, last, or ahead of the
   *   ending that waits on a merge request
   * - local mode:  that nothing was added to the repo, what's on this machine only, and what each teammate runs
   */
  static doneLines(report: InitReport): string[] {
    if (report.dryRun) return ["", "dry run:  nothing changed"]
    if (report.content.action === "missing") return []
    const unshared = unsharedLines(report)
    if (report.commit?.action === "on branch")
      return ["", ...unshared, chalk.green.bold(doneOnceMerged(RepoInit.wordsOf(report).pullRequest))]
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
      // run again after a refused first push:  it went through this time
      ...(report.remote.pushed ? [`Your plans are shared now:  pushed to ${report.remote.address}`] : []),
      "To see your epics:",
      `- Web browser:  ${browser}`,
      `- ${editor.name}:  open ${main} in ${editor.name} (${editor.command} ${main}), then ${view};  ` +
        "epic open <epic> --review shows one there",
      ...(server?.action === "failed"
        ? [`  the epic server couldn't start:  ${server.error};  epic server start says more`]
        : []),
      ...(SHOW_README.has(report.remote.action) ? [`More on sharing the epics:  ${README_EPICS}`] : []),
      ...(report.local ? localLines(report) : []),
      ...(unshared.length ? ["", ...unshared] : [])
    ]
  }
}

/** What `epic init --local` left, for the last lines:  nothing in the repo, what's here only, what teammates run. */
function localLines({ main, links, exclude, remote, config }: InitReport): string[] {
  const linked = links.map(({ path }) => path).join(", ")
  const address = remote.address || config.settings.contentRemote
  return [
    "",
    "Nothing was added to this repo:  no commit, no .gitignore lines.",
    `On this machine only:  ${EpicConfig.FILE}${linked ? `, the links (${linked})` : ""}, and their lines in ` +
      `${exclude ? relative(main, exclude.file) || exclude.file : ".git/info/exclude"}.`,
    address
      ? `Each teammate runs their own:  epic init --local --remote ${address}`
      : "Each teammate runs their own epic init --local;  to share the plans, make an epic repo and give its " +
        "address:  epic init --local --remote <address>"
  ]
}

/** Why the plans aren't shared yet, for the last lines:  the epic repo's push refused or failed;  none when it went. */
function unsharedLines(report: InitReport): string[] {
  const { remote } = report
  const { name } = RepoInit.wordsOf(report)
  if (remote.refusal)
    return [
      chalk.yellow.bold(
        `Sharing isn't working yet:  ${name} refused the epic repo's first push, so a Maintainer has to push the ` +
          `first commit and let everyone push to ${remote.refusal.branch} (the note above says what they run).`
      ),
      "Your plans wait here;  epic init again, once they're done, shares them."
    ]
  if (remote.error && PUSHED_ACTIONS.has(remote.action))
    return [
      chalk.yellow.bold(
        "Sharing isn't working yet:  the epic repo's push failed (the note above says why).  Your plans wait here."
      )
    ]
  return []
}

/** The remote steps that push the epic repo:  a push of theirs that failed means the plans aren't shared. */
const PUSHED_ACTIONS: ReadonlySet<RemoteAction> = new Set(["made", "added", "already", "recorded"])

/** The epic repo's rows of the files table:  made, pushed to, recorded;  none for a problem (its note says it). */
function remoteRowsFor(
  { action, address, repo, visibility, error, pushed }: RemoteReport,
  hostName: string
): [string, string][] {
  switch (action) {
    case "made":
      return [[error ? "made" : "made, pushed", `${repo} on ${hostName}, ${visibility}  (${address})`]]
    case "would make":
      return [["would make", `${repo} on ${hostName}, ${visibility}`]]
    case "added":
      return [[error ? "remote" : "pushed to", address ?? ""]]
    case "would add":
      return [["would push to", address ?? ""]]
    case "recorded":
    case "would record":
      return [
        [action === "recorded" ? "recorded" : "would record", `${address}  (in ${EpicConfig.FILE})`],
        ...(pushed ? ([["pushed to", address ?? ""]] as [string, string][]) : [])
      ]
    case "already":
      return [[pushed ? "pushed to" : "shared with", address ?? ""]]
    default:
      return []
  }
}

/** What `epic init` says about where the code is hosted, when it had to guess. */
function codeHostNotesFor({ codeHost }: InitReport): string[] {
  if (codeHost?.source !== "assumed") return []
  return [`${codeHost.host} doesn't say whose it is:  treated as GitHub;  on GitLab, run:  epic init --host gitlab`]
}

/** What `epic init` says about a base branch that takes only pull requests:  how it knows, or a config against it. */
function protectionNotesFor(report: InitReport): string[] {
  const { protection, config } = report
  const base = config.settings.baseBranch
  const { name, pullRequest } = RepoInit.wordsOf(report)
  if (protection.action === "detected")
    return [`${name} requires a ${pullRequest} into ${base}:  baseBranchProtected is on (${EpicConfig.FILE})`]
  if (protection.action === "says off")
    return [
      `${name} requires a ${pullRequest} into ${base}, but ${EpicConfig.FILE} says baseBranchProtected false:  ` +
        "epic init --protected-base turns it on"
    ]
  return []
}

/** What the commit came to, for a base branch that takes only pull requests:  what happened, and what's left to do. */
function viaPullRequestLines(commit: CommitReport, words: CodeHostWords): string[] {
  const { action, files, branch, error, push, pushError, pullRequest, pullRequestError, base } = commit
  const named = files.join(" and ")
  const asked = words.pullRequest
  const openIt = [`  ${words.openCommand(base ?? "", SETUP_BRANCH)}`]
  const merged = [
    `> Once it's merged:  git pull on ${base}, and epics work here;  teammates can join then (epic init in their clone)`
  ]
  switch (action) {
    case "on branch": {
      const said = [`> ${named} are on branch ${SETUP_BRANCH};  your ${base} is as it was`]
      if (push === "failed")
        return [
          ...said,
          `> The push failed:  ${pushError}`,
          "  to finish:",
          `  git push -u origin ${SETUP_BRANCH}`,
          ...openIt,
          ...merged
        ]
      if (push === "nowhere")
        return [...said, `> No remote to push to:  push ${SETUP_BRANCH} once there is, and open a ${asked}`, ...merged]
      if (pullRequest) return [...said, `> ${words.PullRequest}:  ${pullRequest}`, ...merged]
      return [...said, `> Pushed;  no ${asked} yet (${pullRequestError}).  To open one:`, ...openIt, ...merged]
    }
    case "would branch":
      return [
        `> would put ${named} on a new branch ${SETUP_BRANCH}, push it and open a ${asked};  ${base} stays as it is`
      ]
    case "declined":
      return [`> Not done:  ${base} takes only ${asked}s, so ${named} need one before epics work here`]
    case "other branch":
      return [`> Not done:  you're on ${branch};  run epic init on ${base}, which puts ${named} on a new branch`]
    case "failed":
      return [`> Couldn't put ${named} on branch ${SETUP_BRANCH}:  ${error}`]
    default:
      /* case "none" */ return []
  }
}

/**
 * What needs saying about the epic repo:  a problem, a push to do by hand, a public repo.
 * - a first push GitLab refused (`refusal`):  who has to do what, in place of "push it by hand", which would fail the
 *   same way
 */
function remoteNotesFor(report: InitReport): string[] {
  const { remote, content, main } = report
  const words = RepoInit.wordsOf(report)
  const { address, repo, error, warning, refusal, visibility = "private" } = remote
  const pushByHand = [`the push failed:  ${error}`, `  push it by hand:  git -C ${content.folder} push -u origin HEAD`]
  const failed = refusal ? refusalLines(refusal, words) : error ? pushByHand : []
  switch (remote.action) {
    case "made":
    case "would make":
      return [...failed, ...(warning ? [warning] : []), ...publicWarning(visibility, words)]
    case "added":
    case "already":
    case "recorded":
      return [...failed, ...(warning ? [warning] : [])]
    case "kept local":
      return [
        "no epic repo made (--local):  the plans stay on this machine;  " +
          "to share them:  epic init --local --content-repo <name>, or --remote <address> for one made already"
      ]
    case "clone failed":
      return [
        `couldn't clone the team's plans from ${address}:  ${error}`,
        `  check you can reach it (git clone ${address} ${content.folder}), then run epic init again`
      ]
    case "skipped":
      return ["no epic repo (--no-remote):  the plans stay on this machine"]
    case "failed":
      return [
        `couldn't make ${repo} on ${words.name}:  ${error}`,
        `  another name:  epic init --content-repo <name>;  a repo you made:  epic init --remote <address>`
      ]
    case "no gh":
    case "logged out": {
      const why =
        remote.action === "no gh"
          ? `${words.name}'s command, ${words.command}, isn't installed`
          : `${words.command} isn't logged in to ${words.name}`
      return [
        `no epic repo made:  ${why}.  To share the epics, run:`,
        ...words.install,
        `  then epic init again, in ${main};  or epic init --remote <address>, for a repo you made yourself`
      ]
    }
    default:
      return []
  }
}

/** The one line `epic init` warns with when the epic repo is public, `words` the code host's;  none when private. */
function publicWarning(visibility: RepoVisibility, words: CodeHostWords): string[] {
  return visibility === "public" ? [`it's PUBLIC:  ${words.canRead.public}`] : []
}

/**
 * What to do when GitLab refused the epic repo's first push (Owen, 2026-11-09:  "Ask a Maintainer", main kept):
 * who has to do it, where to find them, exactly what they run, and that every teammate needs push rights too.
 */
function refusalLines({ membersPage, commands, branch }: FirstPushHelp, words: CodeHostWords): string[] {
  return [
    `${words.name} won't take the epic repo's first push:  ${branch} is protected, and your role can't push the ` +
      "first commit.",
    `  A Maintainer has to push the first commit and allow pushes to ${branch}.  Find one:  ${membersPage}`,
    "  What they run:",
    ...commands.map((line) => `    ${line}`),
    "  The first commit is empty:  they don't have your plans, which go on top of it.",
    `  The last line lets everyone push to ${branch}.  To keep it protected instead:  Settings › Repository › ` +
      'Protected branches, "Allowed to push and merge":  Developers and Maintainers.',
    `  Every teammate needs to push to ${branch} too:  the plans sync by pushing to it at the end of every turn.`,
    "  Once they're done:  epic init again finishes it here, or your next turn's sync does."
  ]
}

/** What `epic init --local` says about a setup pull or merge request an earlier run left open:  close it. */
function setupRequestNotesFor(report: InitReport): string[] {
  const { setupRequest } = report
  if (!setupRequest) return []
  const { pullRequest } = RepoInit.wordsOf(report)
  return setupRequest.address
    ? [
        `the ${pullRequest} an earlier epic init opened is still open:  ${setupRequest.address}`,
        `  close it there:  local mode needs none of it;  epic init left it and its branch ${SETUP_BRANCH} as they were`
      ]
    : [
        `branch ${SETUP_BRANCH} is left from an earlier epic init:  close its ${pullRequest} if it has one;  ` +
          "epic init left it as it was"
      ]
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
  /** set up locally (`--local`, or the config's `localSetup`):  nothing of epics committed in the repo */
  local: boolean
  config: { file: string; action: "written" | "kept"; settings: EpicSettings }
  /**
   * the epic folder:  `created` (a new repo), `cloned` from the epic repo, `added` folders, `exists`;
   * `would clone` (a dry run);  `missing` when the clone failed
   */
  content: {
    folder: string
    action: "created" | "cloned" | "added" | "exists" | "would clone" | "missing"
    made: string[]
  }
  /** the epic repo's remote, the epic repo:  `RemoteReport` */
  remote: RemoteReport
  links: { path: string; action: string }[]
  gitignore: { file: string; action: "ok" | "updated" | "written" }
  /** local mode:  the repo's private ignore list, in place of its `.gitignore` (`excludeStep()`) */
  exclude?: ExcludeReport
  /** local mode:  a setup pull or merge request an earlier run left open (`openSetupRequest()`) */
  setupRequest?: SetupRequestReport
  /** whether the base branch takes only pull requests, and how that's known (`protectionStep()`) */
  protection: ProtectionReport
  /** where the code is hosted, and how that's known (`codeHostChoice()`) */
  codeHost: CodeHostReport
  /** the name this machine's person goes by:  `kept` now, kept `already`, `would keep` (a dry run), or `none` */
  person: { name: string | undefined; action: "kept" | "already" | "would keep" | "none" }
  /** the epic plugin (`pluginStep()`);  none with `--no-plugin` */
  plugin?: PluginReport
  /** their colour (`colorStep()`);  none when the epic folder isn't there */
  color?: ColorReport
  /** the epic server (`serverStep()`);  none with `--no-server` */
  server?: ServerReport
  /** the files it wrote in the repo, committed (`commitStep()`);  none with `--no-commit` */
  commit?: CommitReport
}

/**
 * What `epic init` did about committing the files it wrote in the repo (`RepoInit.commitStep()`):
 * `committed`, `would commit`, `declined` (asked, and no), `other branch` (not the base branch), `failed`,
 * `none` (nothing to commit);  for a base branch that takes only pull requests, `on branch` (`SETUP_BRANCH`) and
 * `would branch` in place of the commits
 */
export type CommitReport = {
  action: "committed" | "would commit" | "on branch" | "would branch" | "declined" | "other branch" | "failed" | "none"
  /** the files, from the repo's root:  the config, `.gitignore` */
  files: string[]
  /** the branch the repo is on (the base branch, unless `other branch`), or the setup branch */
  branch: string
  /** the base branch takes only pull requests:  `commitViaPullRequest()` did this */
  viaPullRequest?: boolean
  /** the base branch, with `viaPullRequest` */
  base?: string
  /** the pull request's address */
  pullRequest?: string
  /** why there's none yet:  no command, logged out, or its words */
  pullRequestError?: string
  /** why it failed */
  error?: string
  /** after the commit:  `pushed`, `nowhere` (no upstream, no `origin`), or `failed` (`pushError`, git's words) */
  push?: "pushed" | "nowhere" | "failed"
  /** why the push failed */
  pushError?: string
}

/**
 * Whether the base branch takes only pull requests (`RepoInit.protectionStep()`):  `on`, and how that's known:
 * `config` (it says so), `flag` (`--protected-base`), `detected` (GitHub says so), `off`, or `says off` (GitHub requires
 * one, but the config says `false`, and stays so)
 */
export type ProtectionReport = { action: "config" | "flag" | "detected" | "off" | "says off"; on: boolean }

/**
 * Where the code is hosted (`RepoInit.codeHostChoice()`):  `kind`, and how that's known:
 * `flag` (`--host`), `config`, `address` (`origin`'s), `asked`, `assumed` (unknown host, no terminal:  GitHub), `default`
 * (no remote)
 */
export type CodeHostReport = {
  kind: CodeHostKind
  source: "flag" | "config" | "address" | "asked" | "assumed" | "default"
  /** the `origin` remote's host */
  host?: string
  /** the `origin` remote's address */
  address?: string
}

/** What `RepoInit.changedFiles()` reads off the report. */
export type ChangedFilesInput = Pick<InitReport, "main"> & Partial<Pick<InitReport, "dryRun" | "config" | "gitignore">>

/** What `epic init`'s questions came to (`RepoInit.questions()`):  `init()`'s answers, and the summary. */
export type Answers = Pick<InitOptions, "name" | "color" | "contentRepo" | "visibility" | "cloned" | "codeHost"> & {
  /** what the summary under the questions says */
  plan: Plan
}

/** The summary under `epic init`'s questions (`RepoInit.summaryLines()`):  each one there's something to say for. */
export type Plan = {
  /** their short name */
  name?: string
  /** their colour */
  color?: string
  /** the epic repo:  `owner/name, private` to make, the address to join, or none */
  sharedRepo?: string
  /** set up locally:  nothing in the repo */
  local?: boolean
}

/** What `RepoInit.questions()` takes:  `run()`'s flags, and whether to ask. */
export type QuestionOptions = Pick<
  InitOptions,
  "name" | "color" | "remote" | "contentRepo" | "visibility" | "noRemote" | "say" | "local"
> & {
  /** ask in a terminal:  off for `--json` and `--dry-run` */
  ask: boolean
  /** only say what it would do:  nothing cloned */
  dryRun: boolean
  /** where the code is hosted (`--host`) */
  host?: CodeHostKind
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
  /** where it's kept:  `people/<name>.json5` in the epic folder */
  file?: string
  /** kept with shared plans:  whether it was pushed at once (`RepoInit.shareNow()`) */
  shared?: boolean
  /** Spell UI's colour names nobody has yet */
  free: string[]
}

/**
 * What local mode did with the repo's private ignore list (`RepoInit.excludeStep()`):  `updated` (`would update`), or
 * `ok`, every line there already
 */
export type ExcludeReport = {
  /** the file:  the main checkout's `.git/info/exclude` */
  file: string
  action: "updated" | "would update" | "ok"
  /** the lines it holds for epics:  `/.epic/`, then a link each (`/epics`) */
  lines: string[]
}

/** A setup pull or merge request still open (`RepoInit.openSetupRequest()`):  its address, when the code host said. */
export type SetupRequestReport = { address?: string }

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
  /** the epic folder:  `people/` is in it */
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
 * What `epic init` did about the epic repo's remote, the Epic repo (`RepoInit.remoteStep()`):
 * - `action`:
 *   - `cloned`:  a later person's epic folder, cloned from `address`;  `clone failed`, git's words in `error`
 *   - `made`:  `repo` made on the code host, pushed to, its `address` written in the config
 *   - `added`:  `address` (`--remote`, or the config's) made the remote, pushed to
 *   - `recorded`:  the remote the epic repo had, written in the config;  `already`:  there already
 *   - `skipped`:  `--no-remote`;  `kept local`:  `--local`, with nothing asking for an epic repo
 *   - `no gh`, `logged out`:  the code host's command (`gh` or `glab`) missing, or not logged in:  nothing made
 *   - `failed`:  the code host said no (`error`:  its words)
 *   - `would ...`:  a dry run's
 * - `error`:  also a push that failed (`made`, `added`, and run again `already`, `recorded`):  the remote stands;
 *   `refusal`, when it was GitLab refusing the first push:  what a Maintainer runs
 */
export type RemoteReport = {
  action: RemoteAction
  /** the epic repo's address, as git takes it */
  address?: string
  /** the repo made on the code host, or that would be:  `owner/name` */
  repo?: string
  /** who can see that repo:  `private` or `public` (`made`, `would make`, `failed`) */
  visibility?: RepoVisibility
  /** git's or the code host's words, when something failed */
  error?: string
  /** one line about what the team must do by hand:  GitLab's default branch left protected */
  warning?: string
  /** GitLab refused the first push:  what a Maintainer runs (`CodeHostClient.firstPushRefusal()`) */
  refusal?: FirstPushHelp
  /** run again (`already`, `recorded`):  the commits the remote lacked, pushed now (`pushPending()`) */
  pushed?: boolean
}

/** What `epic init` did about the epic repo:  `RemoteReport`. */
export type RemoteAction =
  | "cloned"
  | "clone failed"
  | "made"
  | "added"
  | "recorded"
  | "already"
  | "skipped"
  | "kept local"
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
  /**
   * set the repo up on this machine only (`--local`):  nothing committed, no `.gitignore` lines, nothing made on the
   * code host unless `contentRepo`;  default `false`, but a config saying `localSetup` keeps it on
   */
  local?: boolean
  /** the name to keep for this machine's person (`EpicHome`);  none:  git's, when no name is kept yet */
  name?: string
  /** the epic repo's address, made already (`--remote`):  made the epic repo's remote, and pushed to */
  remote?: string
  /** the name to give the epic repo on the code host (`--content-repo`);  none:  asked, else `<repo>.epics` */
  contentRepo?: string
  /** whether the epic repo made on the code host is private or public (`--public`);  none:  asked, else private */
  visibility?: RepoVisibility
  /** no remote, no epic repo (`--no-remote`):  the plans stay on this machine;  default `false` */
  noRemote?: boolean
  /**
   * whether to ask the epic repo's name, and private or public, and their colour, in a terminal (`CLI.ask()`);
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
  /** the base branch takes only pull requests (`--protected-base`);  default `false`:  the host's word, else off */
  protectedBase?: boolean
  /** where the code is hosted, settled already (`questions()`);  none:  worked out, asking nothing */
  codeHost?: CodeHostReport
  /** a progress line, before each slow step (a clone, GitHub, a push, the server);  default:  nothing said */
  say?: (text: string) => void
}

/** What `RepoInit.remoteStep()` takes:  `init()`'s options, the epic repo and the settings in force. */
export type RemoteStepOptions = Pick<InitOptions, "remote" | "contentRepo" | "visibility"> & {
  shared: Shared
  settings: EpicSettings
  dryRun: boolean
  noRemote: boolean
  ask: boolean
  /** a progress line, before the code host makes the repo */
  say?: (text: string) => void
  /** local mode:  nothing made on the code host unless `contentRepo` */
  local?: boolean
}

/** What `epic init` asks, in a terminal, when no name is kept. */
const NAME_QUESTION = "What do you want to be called?"

/** What `epic init` asks, in a terminal, when they have no colour yet. */
const COLOR_QUESTION = "Which colour should your words be?"

/** What `epic init` asks, in a terminal, when the `origin` address doesn't say whose it is. */
const HOST_QUESTION = "Where is this repo hosted?"

/** "Where is this repo hosted?"'s two choices, GitHub first:  it's the default. */
const HOST_CHOICES = [
  { value: "github", label: "GitHub", hint: "uses gh" },
  { value: "gitlab", label: "GitLab", hint: "uses glab, self-hosted too" }
]

/** What `epic init` asks, in a terminal, before it makes the epic repo on the code host. */
const REPO_QUESTION = "What should the shared epics repo be called?"

/** What `epic init` asks, in a terminal, before it makes the epic repo on the code host:  who can see it. */
const VISIBILITY_QUESTION = "Private or public?"

/** A repo name on the code host:  letters, digits, `.`, `-` and `_`, at most 100. */
const REPO_NAME = /^[\w.-]{1,100}$/

/** The remote steps that write the epic repo's address into the config, so it's to commit. */
const REMOTE_WRITTEN: ReadonlySet<RemoteAction> = new Set(["made", "added", "recorded", "cloned"])

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

/** `epic init`'s line, in colour, when what's left is a request to merge. */
function doneOnceMerged(pullRequest: string): string {
  return `Epics are set up, and start here once that ${pullRequest} is merged.`
}

/** The files section's head. */
const FILES_HEAD = "Setting up epic files:"

/** The commit section's head:  why `epic init` asks to commit in the code repo. */
const COMMIT_HEADER = "We need to make a commit in the main repo to enable epics."

/** What the commit section says first when the base branch takes only pull requests. */
function pullRequestHeader(pullRequest: string): string {
  return `This repo takes only ${pullRequest}s into its base branch, so epics are enabled through one.`
}

/** The branch `epic init` puts its two files on, for a base branch that takes only pull requests. */
const SETUP_BRANCH = "epic-setup"

/** The pull or merge request `epic init` opens:  its title. */
const PR_TITLE = "Set up epics"

/** The pull or merge request `epic init` opens:  its body. */
function prBody(pullRequest: string): string {
  return (
    "Adds `.epic/config.json5` and the `.gitignore` lines that the `epic` tooling needs, nothing else.\n\n" +
    "Once this is merged:  `git pull` on the base branch, and teammates can run `epic init`.\n\n" +
    "The epic pages live in a repo of their own beside this one, which needs direct pushes:  " +
    `if an org-wide rule requires ${pullRequest}s, it must leave that repo out.`
  )
}

/** The comment above the links `epic init` excludes until its pull or merge request is merged (`restoreBase()`). */
const EXCLUDE_NOTE = "# epic init:  its links, until the pull request that lists them in .gitignore is merged"

/** The comment above what `epic init --local` lists in the repo's private ignore list (`excludeStep()`). */
const LOCAL_EXCLUDE_NOTE = "# epic init --local:  its config and links, on this machine only (never in .gitignore)"

/** The summary's line for local mode. */
const LOCAL_SETUP = "local:  nothing is added to this repo;  it all stays on this machine"

/** A push git's server refused, rather than one that never got there. */
const PUSH_REFUSED = /rejected|declined|protected|pull request|GH0\d\d/i

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
