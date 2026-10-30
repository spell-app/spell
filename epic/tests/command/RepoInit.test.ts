import { execFileSync } from "node:child_process"
import {
  chmodSync,
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  writeFileSync
} from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { afterAll, describe, expect, test, vi } from "vite-plus/test"

import { Git } from "spell/server/Git"
import { EpicCheckout } from "spell/epic/command/EpicCheckout"
import { RepoInit } from "spell/epic/command/RepoInit"
import { DataFile } from "spell/server/DataFile"
import { EpicConfig } from "spell/epic/config/EpicConfig"
import { EpicHome } from "spell/epic/config/EpicHome"
import { PeopleColors } from "spell/epic/config/PeopleColors"
import { VoiceColor } from "spell/epic/config/VoiceColor"

/** A throwaway repo `try` on branch `trunk`:  a README, nothing set up for epics yet. */
const TEMP = realpathSync(mkdtempSync(join(tmpdir(), "repo-init-")))
const MAIN = join(TEMP, "try")
const CONTENT = join(TEMP, "try.epics")
/** the person's name goes to a scratch epic home, git's from a scratch config:  never the machine's */
const before = { ...process.env }
process.env.SPELL_EPIC_HOME = join(TEMP, "epic-home")
process.env.GIT_CONFIG_GLOBAL = join(TEMP, "gitconfig")
process.env.GIT_CONFIG_NOSYSTEM = "1"
writeFileSync(
  join(TEMP, "gitconfig"),
  "[user]\n  name = Ana Lima\n  email = ana@example.com\n[commit]\n  gpgsign = false\n"
)
afterAll(() => {
  for (const key of ["SPELL_EPIC_HOME", "GIT_CONFIG_GLOBAL", "GIT_CONFIG_NOSYSTEM"])
    if (before[key] === undefined) delete process.env[key]
    else process.env[key] = before[key]
  rmSync(TEMP, { recursive: true, force: true })
})

mkdirSync(MAIN)
git(MAIN, "init", "-q", "-b", "trunk")
writeFileSync(join(MAIN, "README.md"), "# try\n")
git(MAIN, "add", "-A")
git(MAIN, "-c", "user.name=t", "-c", "user.email=t@t", "-c", "commit.gpgsign=false", "commit", "-q", "-m", "first")

describe("epic init", () => {
  test("--dry-run:  says what it would do, and writes nothing", async () => {
    const report = await new RepoInit({ main: MAIN }).init({ dryRun: true })
    expect(report.config.action).toBe("written")
    expect(report.content).toEqual({ folder: CONTENT, action: "created", made: ["epics", "sagas", "guides", "pages"] })
    expect(report.links.map((link) => link.action)).toEqual(Array(4).fill("would link (missing)"))
    expect(existsSync(join(MAIN, EpicConfig.FILE))).toBe(false)
    expect(existsSync(CONTENT)).toBe(false)
    expect(existsSync(join(MAIN, ".gitignore"))).toBe(false)
    expect(RepoInit.lines(report).at(-1)).toBe("dry run:  nothing changed")
  })

  test("the config for THIS repo:  beside it, its branch, no install command, its name", async () => {
    await new RepoInit({ main: MAIN }).init()
    const config = new EpicConfig(MAIN)
    expect(config.contentFolder).toBe(CONTENT)
    expect(config.worktreesFolder).toBe(join(TEMP, "try.worktrees"))
    expect(config.baseBranch).toBe("trunk")
    expect(config.installCommand).toBe("")
    expect(config.installOnCreate).toBe(false)
    expect(config.windows).toEqual({
      default: "try",
      repoName: "try",
      contentName: "try.epics",
      worktreeOnly: true,
      settings: {}
    })
    expect(config.linkSessionFolders).toBe(true)
    expect(config.sharedFolders).toEqual(["epics", "sagas", "guides", "pages"])
    // the window files in the content repo (epic-eject P13)
    expect(config.newWindowsFolder).toBe(join(CONTENT, "windows"))
    // every key, each with its comment
    const text = readFileSync(config.file, "utf8")
    expect(text).toMatch(/\/\/ the branch worktrees start from and merge into\n {2}"baseBranch": "trunk",/)
  })

  test("the content repo, its own git repo with a kept folder each, linked in and ignored", () => {
    expect(Git.run(["log", "--format=%s"], CONTENT).out).toBe("Shared content:  empty")
    for (const folder of ["epics", "sagas", "guides", "pages"]) {
      expect(existsSync(join(CONTENT, folder, ".gitkeep"))).toBe(true)
      expect(lstatSync(join(MAIN, folder)).isSymbolicLink()).toBe(true)
      expect(realpathSync(join(MAIN, folder))).toBe(join(CONTENT, folder))
    }
    expect(readFileSync(join(MAIN, ".gitignore"), "utf8")).toMatch(
      /^# shared:start .*\n\/epics\n\/sagas\n\/guides\n\/pages\n# shared:end\n$/
    )
    // the window files:  in the content repo, ignored there (epic-eject P13)
    expect(readFileSync(join(CONTENT, ".gitignore"), "utf8")).toMatch(/^\/windows\/$/m)
    // nothing but the two files to commit:  the links are ignored
    expect(Git.run(["status", "--porcelain"], MAIN).out.split("\n").sort()).toEqual(["?? .epic/", "?? .gitignore"])
    expect(readFileSync(join(CONTENT, "README.md"), "utf8")).not.toMatch(/spell-app/)
  })

  test("run again:  every step is done, nothing changes;  a repo's own .gitignore lines are kept", async () => {
    const ignore = join(MAIN, ".gitignore")
    writeFileSync(ignore, `node_modules/\n\n${readFileSync(ignore, "utf8")}`)
    const before = readFileSync(join(MAIN, EpicConfig.FILE), "utf8")
    const report = await new RepoInit({ main: MAIN }).init()
    expect(report.config.action).toBe("kept")
    expect(report.content.action).toBe("exists")
    expect(report.links.map((link) => link.action)).toEqual(Array(4).fill("ok"))
    expect(report.gitignore.action).toBe("ok")
    expect(readFileSync(join(MAIN, EpicConfig.FILE), "utf8")).toBe(before)
    expect(readFileSync(ignore, "utf8")).toMatch(/^node_modules\/\n\n# shared:start/)
    // run again:  every row of the files' table says so
    const rows = tableOf(said(report))
    expect(rows.length).toBeGreaterThan(4)
    expect(rows.every((line) => /^ {2}already /.test(line))).toBe(true)
  })

  test("a content folder missing one of its folders:  added, and linked", async () => {
    rmSync(join(CONTENT, "guides"), { recursive: true })
    const report = await new RepoInit({ main: MAIN }).init()
    expect(report.content).toEqual({ folder: CONTENT, action: "added", made: ["guides"] })
    expect(existsSync(join(MAIN, "guides"))).toBe(true)
  })

  test("a repo set up this way is a checkout the epic verbs work on, from any folder in it", () => {
    mkdirSync(join(MAIN, "src"), { recursive: true })
    expect(EpicCheckout.isEpicRepo(MAIN)).toBe(true)
    expect(EpicCheckout.nearest({ from: join(MAIN, "src") })).toBe(MAIN)
    expect(EpicCheckout.isEpicRepo(TEMP)).toBe(false)
  })
})

describe("epic init:  the person's name", () => {
  test("--dry-run:  git's name would be kept;  nothing written", async () => {
    rmSync(EpicHome.folder(), { recursive: true, force: true })
    const report = await new RepoInit({ main: MAIN }).init({ dryRun: true })
    expect(report.person).toEqual({ name: "Ana Lima", action: "would keep" })
    expect(existsSync(EpicHome.personFile())).toBe(false)
  })

  test("no name given, none kept:  git's name kept;  run again, kept already", async () => {
    expect((await new RepoInit({ main: MAIN }).init()).person).toEqual({ name: "Ana Lima", action: "kept" })
    const again = await new RepoInit({ main: MAIN }).init()
    expect(again.person).toEqual({ name: "Ana Lima", action: "already" })
    expect(said(again)).toContain("> Your name  :  Ana Lima")
    expect(said(again).join("\n")).not.toContain("(your name)")
  })

  test("--name:  kept over what was kept", async () => {
    const out = vi.spyOn(process.stdout, "write").mockImplementation(() => true)
    try {
      expect(await offline(MAIN).run(["--name", "Ana", "--json"])).toBe(0)
    } finally {
      out.mockRestore()
    }
    expect(EpicHome.person()).toMatchObject({ name: "Ana", source: "kept" })
  })

  test("the name suggested:  the GitHub login, looked up and kept;  else git's", async () => {
    rmSync(EpicHome.folder(), { recursive: true, force: true })
    const gh = join(TEMP, "gh-ana")
    writeFileSync(gh, "#!/bin/sh\necho analima\n")
    chmodSync(gh, 0o755)
    const was = process.env.SPELL_EPIC_GH
    process.env.SPELL_EPIC_GH = gh
    try {
      expect(await RepoInit.askName()).toBe("analima")
      expect(EpicHome.person()).toMatchObject({ source: "github", github: "analima" })
    } finally {
      process.env.SPELL_EPIC_GH = was
      rmSync(EpicHome.folder(), { recursive: true, force: true })
    }
  })

  test("no terminal to ask in:  the name kept, else git's, asking nothing;  asked every time (Owen, 2026-10-29)", async () => {
    rmSync(EpicHome.folder(), { recursive: true, force: true })
    expect(await RepoInit.askName()).toBe("Ana Lima")
    EpicHome.keepPerson("Ana")
    expect(await RepoInit.askName()).toBe("Ana")
  })
})

describe("RepoInit's statics", () => {
  test("the config's text reads back as the settings it was written from", () => {
    const settings = EpicConfig.defaultsFor(MAIN)
    expect(EpicConfig.settingsFrom(RepoInit.configText(settings))).toEqual(settings)
  })

  test("the .gitignore block:  added after what's there, replaced when its lines change", () => {
    expect(RepoInit.withIgnoreBlock("", ["/epics"], "../x.epics")).toMatch(
      /^# shared:start .*\n\/epics\n# shared:end\n$/
    )
    const once = RepoInit.withIgnoreBlock("dist/", ["/epics"], "../x.epics")
    expect(once).toMatch(/^dist\/\n\n# shared:start/)
    const twice = RepoInit.withIgnoreBlock(once, ["/epics", "/sagas"], "../x.epics")
    expect(twice).toMatch(/^dist\/\n\n# shared:start .*\n\/epics\n\/sagas\n# shared:end\n$/)
    expect(RepoInit.withIgnoreBlock(twice, ["/epics", "/sagas"], "../x.epics")).toBe(twice)
  })

  test("the .gitignore block:  nothing to ignore and no block yet adds none (a repo that links nothing in)", () => {
    expect(RepoInit.withIgnoreBlock("dist/\n", [], "../x.epics")).toBe("dist/\n")
  })
})

describe("epic init:  one command (epic-friend P13)", () => {
  test("the plugin:  installed when Claude Code doesn't have it, first;  run again, its install changes nothing", async () => {
    const app = codeRepo("plugin")
    const plugin = stubPlugin()
    const init = new RepoInit({ main: app, plugin: plugin.make, hub: stubHub().make })
    const report = await init.init({ plugin: true })
    expect(report.plugin).toEqual({ action: "installed", changes: 3 })
    expect(said(report).slice(1, 4)).toEqual([
      "",
      "Checking the epic plugin:",
      "> installed epic for Claude Code:  /reload-plugins in a running session"
    ])
    const again = await init.init({ plugin: true })
    expect(again.plugin).toEqual({ action: "already" })
    // run anyway (epic-friend P15):  it installs what's missing, such as the VS Code extension
    expect(plugin.calls).toEqual(["install", "install"])
  })

  test("the plugin:  a dry run installs nothing;  a failure is one line, and init carries on;  off by default", async () => {
    const app = codeRepo("plugin-fails")
    const dry = await new RepoInit({ main: app, plugin: stubPlugin().make }).init({ plugin: true, dryRun: true })
    expect(dry.plugin).toEqual({ action: "would install" })
    const failing = new RepoInit({ main: app, plugin: stubPlugin({ fails: "no plugin in epic/" }).make })
    const report = await failing.init({ plugin: true })
    expect(report.plugin).toEqual({ action: "failed", error: "no plugin in epic/" })
    expect(said(report)).toEqual(
      expect.arrayContaining([
        "> couldn't install epic for Claude Code:  no plugin in epic/",
        "  epic plugin install --dry-run says what it would do"
      ])
    )
    expect(existsSync(join(app, EpicConfig.FILE))).toBe(true)
    expect((await new RepoInit({ main: app }).init()).plugin).toBeUndefined()
  })

  test("the server:  registered and started last, its address the last line before what to commit", async () => {
    const app = codeRepo("served")
    const hub = stubHub()
    const report = await new RepoInit({ main: app, hub: hub.make }).init({ server: true })
    expect(report.server).toEqual({ action: "started", address: "http://localhost:4848/r/try/" })
    expect(hub.calls).toEqual([`register ${app}`, `address ${app}`])
    expect(said(report)).toContain("- Web browser:  http://localhost:4848/r/try/")
    // a dry run starts nothing
    const dry = await new RepoInit({ main: app, hub: stubHub().make }).init({ server: true, dryRun: true })
    expect(dry.server).toEqual({ action: "would start" })
  })

  test("the server:  a failure is two lines, and init still reports the rest;  a join without it says to start it", async () => {
    const app = codeRepo("unserved")
    const hub = stubHub({ fails: "port 4848 is taken" })
    const report = await new RepoInit({ main: app, hub: hub.make }).init({ server: true })
    expect(report.server).toEqual({ action: "failed", error: "port 4848 is taken" })
    expect(said(report)).toContain(
      "  the epic server couldn't start:  port 4848 is taken;  epic server start says more"
    )
    expect(report.links.map((link) => link.action)).toEqual(Array(4).fill("linked"))
  })

  test("your colour:  none asked for, the free ones named;  --color keeps it with the plans, in people/", async () => {
    const app = codeRepo("colours")
    const content = join(TEMP, "colours", "colours.epics")
    const none = await new RepoInit({ main: app }).init({ name: "Bo" })
    expect(none.color).toEqual({ action: "none", free: [...VoiceColor.NAMES] })
    expect(RepoInit.lines(none)).toContain(
      `your colour:  the shared one;  pick your own:  epic init --color <name> (${VoiceColor.NAMES.join(", ")})`
    )
    const kept = await new RepoInit({ main: app }).init({ name: "Bo", color: "green" })
    const file = join(content, "people", "bo.json5")
    expect(kept.color).toEqual({ action: "kept", color: "green", file, free: [...VoiceColor.NAMES] })
    expect(DataFile.read(file)).toEqual({ name: "Bo", color: "green" })
    expect(new EpicConfig(app).colors.people).toEqual({ Bo: "green" })
    // theirs already:  kept as it is
    const again = await new RepoInit({ main: app }).init({ name: "Bo", color: "teal" })
    expect(again.color).toEqual({ action: "already", color: "green", free: [] })
  })

  test("your colour:  one someone has is refused, naming the free ones;  asked with no terminal, the first free", async () => {
    const app = codeRepo("taken")
    const content = join(TEMP, "taken", "taken.epics")
    await new RepoInit({ main: app }).init({ name: "Bo", color: "red" })
    const taken = await new RepoInit({ main: app }).init({ name: "Cy", color: "Red" })
    expect(taken.color?.action).toBe("taken")
    expect(taken.color?.free).not.toContain("red")
    expect(RepoInit.lines(taken).find((line) => line.startsWith("your colour:"))).toBe(
      `your colour:  Red is someone's already;  free:  ${VoiceColor.NAMES.filter((name) => name !== "red").join(", ")} ` +
        "(--color <name>)"
    )
    // no terminal to ask in:  the suggestion, the first free name
    const asked = await new RepoInit({ main: app }).init({ name: "Cy", ask: true })
    expect(asked.color).toMatchObject({ action: "kept", color: "orange" })
    expect(PeopleColors.read(content)).toEqual({ Bo: "red", Cy: "orange" })
  })

  test("your colour:  every name taken:  the shared colour, said so", async () => {
    const app = codeRepo("full")
    const content = join(TEMP, "full", "full.epics")
    await new RepoInit({ main: app }).init({ name: "Bo" })
    for (const [at, color] of VoiceColor.NAMES.entries()) PeopleColors.write(content, `p${at}`, color)
    const report = await new RepoInit({ main: app }).init({ name: "Cy", ask: true })
    expect(report.color).toEqual({ action: "all taken", free: [] })
    expect(RepoInit.lines(report)).toContain(
      "your colour:  every colour name is taken:  your words keep the shared colour"
    )
  })

  test("--color, --no-plugin and --no-server on the command line;  a colour that isn't one is refused", async () => {
    const app = codeRepo("flags")
    const plugin = stubPlugin()
    const hub = stubHub()
    const init = new RepoInit({ main: app, plugin: plugin.make, hub: hub.make })
    const out = vi.spyOn(process.stdout, "write").mockImplementation(() => true)
    try {
      await init.run(["--name", "Bo", "--color", "teal", "--no-plugin", "--no-server", "--no-remote"])
      expect(plugin.calls).toEqual([])
      expect(hub.calls).toEqual([])
      expect(PeopleColors.read(join(TEMP, "flags", "flags.epics"))).toEqual({ Bo: "teal" })
      await init.run(["--no-remote"])
      expect(plugin.calls).toEqual(["install"])
      expect(hub.calls).toHaveLength(2)
    } finally {
      out.mockRestore()
    }
    await expect(init.run(["--color", "red;}"])).rejects.toThrow(/--color red;} isn't a colour/)
  })
})

describe("epic init:  its words and its commit (Owen, 2026-10-29)", () => {
  test("says which repo first and that it's done last;  prints no settings;  commits the two files on the base branch", async () => {
    const app = codeRepo("words")
    const said = await printed(() => offline(app).run(["--name", "Bo", "--no-remote", "--no-server"]))
    expect(said[0]).toBe(`Initializing Epic for repo ${app}`)
    expect(said).toContain("Epics initialized!")
    expect(said.at(-1)).toMatch(/^- VS Code:  open .* then the Review view in its right side bar/)
    expect(said.some((line) => line.startsWith("  contentFolder:"))).toBe(false)
    expect(said).toContain("We need to make a commit in the main repo to enable epics.")
    expect(said).toContain("> Committed;  no remote to push to")
    expect(git(app, "log", "-1", "--format=%s").trim()).toBe(
      "epic init:  set up epics (.epic/config.json5, .gitignore)"
    )
    expect(git(app, "status", "--porcelain")).toBe("")
    // run again:  nothing left to commit, nothing said about it
    const again = await printed(() => offline(app).run(["--no-remote", "--no-server"]))
    expect(again.some((line) => /commit/.test(line))).toBe(false)
  })

  test("on another branch:  nothing committed, and it says so;  a dry run would commit;  --no-commit leaves them", async () => {
    const app = codeRepo("branchy")
    git(app, "checkout", "-q", "-b", "work")
    const report = await offline(app).init({ name: "Bo", noRemote: true, commit: true })
    expect(report.commit).toEqual({
      action: "other branch",
      files: [".epic/config.json5", ".gitignore"],
      branch: "work"
    })
    expect(said(report).join("\n")).toMatch(/Not committed:  you're on work/)
    git(app, "checkout", "-q", "main")
    const dry = await offline(app).init({ dryRun: true, noRemote: true, commit: true })
    expect(dry.commit?.action).toBe("would commit")
    await printed(() => offline(app).run(["--no-remote", "--no-server", "--no-commit"]))
    expect(git(app, "status", "--porcelain")).toMatch(/\.gitignore/)
  })
})

describe("epic init:  its sections (Owen, 2026-10-29:  colour for fields and values)", () => {
  test("the summary:  a label, then the value;  only what there's something to say for", () => {
    expect(RepoInit.summaryLines({ name: "Bo", color: "teal", sharedRepo: "ana/x.epics, private" }).map(plain)).toEqual(
      ["> Your name  :  Bo", "> Your colour:  teal", "> Shared repo:  ana/x.epics, private"]
    )
    expect(RepoInit.summaryLines({ name: "Bo" }).map(plain)).toEqual(["> Your name  :  Bo"])
  })

  test("the files' table:  its head, then a row each, the paths in one column", async () => {
    const app = codeRepo("table")
    const lines = said(await offline(app).init({ name: "Bo", noRemote: true, color: "pink" }))
    const rows = tableOf(lines)
    expect(rows[0]).toMatch(/^ {2}wrote +.*\.epic\/config\.json5$/)
    expect(rows.map((row) => row.search(/\/.*$/))).toEqual(rows.map(() => rows[0]!.search(/\/.*$/)))
    expect(rows.some((row) => /^ {2}linked +.*\/epics$/.test(row))).toBe(true)
    expect(rows.some((row) => /people\/bo\.json5 {2}\(your colour\)$/.test(row))).toBe(true)
  })

  test("the commit:  made and PUSHED, to origin when the branch has no upstream", async () => {
    const app = codeRepo("pushed")
    const bare = join(TEMP, "pushed", "origin.git")
    git(TEMP, "init", "-q", "--bare", "-b", "main", bare)
    git(app, "remote", "add", "origin", bare)
    const said = await printed(() => offline(app).run(["--name", "Bo", "--no-remote", "--no-server"]))
    expect(said).toContain("> Committed and pushed")
    expect(said).toContain("pushing main…")
    expect(git(bare, "log", "-1", "--format=%s").trim()).toBe(
      "epic init:  set up epics (.epic/config.json5, .gitignore)"
    )
  })

  test("a line before each slow step:  the server's start", async () => {
    const app = codeRepo("progress")
    const said = await printed(() =>
      new RepoInit({ main: app, plugin: stubPlugin({ installed: true }).make, hub: stubHub().make }).run([
        "--name",
        "Bo",
        "--no-remote"
      ])
    )
    expect(said.indexOf("starting the epic server…")).toBeLessThan(said.indexOf("Epics initialized!"))
    expect(said).toContain("- Web browser:  http://localhost:4848/r/try/")
  })
})

describe("epic init:  the shared repo (epic-friend P4)", () => {
  test("gh missing:  nothing made;  says how to get gh, and the README;  the rest of init done", async () => {
    const app = codeRepo("no-gh")
    const report = await new RepoInit({ main: app }).init()
    expect(report.remote).toEqual({ action: "no gh" })
    expect(report.links.map((link) => link.action)).toEqual(Array(4).fill("linked"))
    expect(new EpicConfig(app).contentRemote).toBe("")
    const lines = said(report)
    expect(lines).toContain(
      "no shared repo made:  GitHub's command, gh, isn't installed.  Sharing the epics works only with GitHub for now:"
    )
    expect(lines).toContain("  brew install gh        (other systems:  https://cli.github.com)")
    expect(lines).toContain("  gh auth login")
    expect(lines.at(-1)).toBe(
      "More on sharing the epics:  https://github.com/spell-app/spell/blob/main/README-epics.md"
    )
  })

  test("gh logged out:  nothing made, the same two commands", async () => {
    const app = codeRepo("logged-out")
    const report = await withGh(stubGh(app, { loggedIn: false }), () => new RepoInit({ main: app }).init())
    expect(report.remote).toEqual({ action: "logged out" })
    expect(said(report)).toContain("  gh auth login")
  })

  test("gh logged in:  made private on GitHub as <repo>-epics, pushed, its address in the config", async () => {
    const app = codeRepo("first")
    const gh = stubGh(app)
    const report = await withGh(gh, () => new RepoInit({ main: app }).init())
    const bare = join(gh.repos, "ana", "first.epics.git")
    expect(report.remote).toEqual({ action: "made", repo: "ana/first.epics", address: bare, visibility: "private" })
    expect(readFileSync(gh.log, "utf8")).toMatch(/^repo create ana\/first.epics --private --description /m)
    // the content repo's commit is there
    expect(git(bare, "log", "--format=%s").trim()).toBe("Shared content:  empty")
    expect(new EpicConfig(app).contentRemote).toBe(bare)
    expect(said(report).some((line) => /^ {2}made, pushed +ana\/first\.epics on GitHub, private/.test(line))).toBe(true)
    expect(said(report)).toContain("> Shared repo:  ana/first.epics, private")
    expect(RepoInit.changedFiles(report)).toEqual([".epic/config.json5", ".gitignore"])
    // run again:  there already, nothing made
    const again = await withGh(gh, () => new RepoInit({ main: app }).init())
    expect(again.remote).toEqual({ action: "already", address: bare })
    expect(said(again).some((line) => /^ {2}shared with +/.test(line))).toBe(true)
  })

  test("a later person:  epic init in a clone of the code repo CLONES the shared repo, and links it;  no gh", async () => {
    const app = join(TEMP, "first", "first")
    git(app, "add", "-A")
    git(app, "-c", "user.name=t", "-c", "user.email=t@t", "-c", "commit.gpgsign=false", "commit", "-q", "-m", "epics")
    const friend = join(TEMP, "friend", "first")
    mkdirSync(dirname(friend))
    git(TEMP, "clone", "-q", app, friend)
    const dry = await new RepoInit({ main: friend }).init({ dryRun: true })
    expect(dry.content.action).toBe("would clone")
    expect(existsSync(join(TEMP, "friend", "first.epics"))).toBe(false)
    const report = await new RepoInit({ main: friend }).init()
    const content = join(TEMP, "friend", "first.epics")
    expect(report.content).toEqual({ folder: content, action: "cloned", made: [] })
    expect(report.remote.action).toBe("cloned")
    expect(git(content, "log", "--format=%s").trim()).toBe("Shared content:  empty")
    expect(realpathSync(join(friend, "epics"))).toBe(join(content, "epics"))
    const lines = said(report)
    expect(
      lines.some((line) =>
        line.endsWith(`${content}  (from ${join(TEMP, "first", "gh-repos", "ana", "first.epics.git")})`)
      )
    ).toBe(true)
    expect(lines).toContain("- Web browser:  epic server start, then the address it prints")
  })

  test("the code repo an organization's:  the shared repo goes there too", async () => {
    const app = codeRepo("team")
    git(app, "remote", "add", "origin", "git@github.com:acme/team.git")
    const gh = stubGh(app)
    const report = await withGh(gh, () => new RepoInit({ main: app }).init({ contentRepo: "team-plans" }))
    expect(report.remote).toMatchObject({ action: "made", repo: "acme/team-plans" })
  })

  test("--remote:  a repo made already, pushed to;  --no-remote:  none", async () => {
    const app = codeRepo("given")
    const bare = join(TEMP, "given", "plans.git")
    git(TEMP, "init", "-q", "--bare", bare)
    const out = vi.spyOn(process.stdout, "write").mockImplementation(() => true)
    try {
      expect(await offline(app).run(["--remote", bare, "--json"])).toBe(0)
    } finally {
      out.mockRestore()
    }
    expect(new EpicConfig(app).contentRemote).toBe(bare)
    expect(git(bare, "log", "--format=%s").trim()).toBe("Shared content:  empty")

    const alone = codeRepo("alone")
    const report = await withGh(stubGh(alone), () => new RepoInit({ main: alone }).init({ noRemote: true }))
    expect(report.remote).toEqual({ action: "skipped" })
    expect(new EpicConfig(alone).contentRemote).toBe("")
    expect(said(report)).toContain("no shared repo (--no-remote):  the plans stay on this machine")
  })

  test("--dry-run:  says what it would make, makes nothing", async () => {
    const app = codeRepo("dry")
    const gh = stubGh(app)
    const report = await withGh(gh, () => new RepoInit({ main: app }).init({ dryRun: true, contentRepo: "dry-x" }))
    expect(report.remote).toEqual({ action: "would make", repo: "ana/dry-x", visibility: "private" })
    expect(existsSync(gh.log) && readFileSync(gh.log, "utf8")).not.toMatch(/repo create/)
  })

  test("private by default:  no terminal asks nothing, and gh is told --private", async () => {
    const app = codeRepo("shy")
    const gh = stubGh(app)
    const report = await withGh(gh, () => new RepoInit({ main: app }).init({ ask: true }))
    expect(report.remote).toMatchObject({ action: "made", repo: "ana/shy.epics", visibility: "private" })
    expect(readFileSync(gh.log, "utf8")).toMatch(/^repo create ana\/shy.epics --private /m)
    expect(RepoInit.lines(report).join("\n")).not.toMatch(/PUBLIC/)
  })

  test("--public:  gh is told --public;  one line warns that the plans are public", async () => {
    const app = codeRepo("open")
    const gh = stubGh(app)
    const out = vi.spyOn(process.stdout, "write").mockImplementation(() => true)
    let printed = ""
    try {
      expect(await withGh(gh, () => offline(app).run(["--public"]))).toBe(0)
      printed = out.mock.calls.map(([text]) => String(text)).join("")
    } finally {
      out.mockRestore()
    }
    expect(readFileSync(gh.log, "utf8")).toMatch(/^repo create ana\/open.epics --public /m)
    expect(plain(printed)).toMatch(/made, pushed +ana\/open\.epics on GitHub, public/)
    expect(plain(printed)).toContain(
      "it's PUBLIC:  everything in the plans (epic pages, guides, comments) can be read by anyone"
    )
    // --dry-run says which it would make
    const dry = await withGh(stubGh(codeRepo("open-dry")), () =>
      new RepoInit({ main: join(TEMP, "open-dry", "open-dry") }).init({ dryRun: true, visibility: "public" })
    )
    expect(dry.remote).toEqual({ action: "would make", repo: "ana/open-dry.epics", visibility: "public" })
    expect(said(dry).some((line) => /^ {2}would make +ana\/open-dry\.epics on GitHub, public$/.test(line))).toBe(true)
    expect(said(dry).at(-1)).toBe("dry run:  nothing changed")
  })

  test("--content-repo, --remote and --no-remote:  one at a time;  a repo name GitHub takes", async () => {
    const init = offline(MAIN)
    await expect(init.run(["--remote", "x", "--no-remote"])).rejects.toThrow(/give one of/)
    await expect(init.run(["--content-repo", "no way"])).rejects.toThrow(/isn't a GitHub repo name/)
  })

  test("keepRemote():  in place in the line epic init writes;  added to an older file, its comments kept", () => {
    const file = join(TEMP, "config.json5")
    writeFileSync(file, RepoInit.configText(EpicConfig.defaultsFor(MAIN)))
    RepoInit.keepRemote(file, "git@github.com:o/x.git")
    expect(readFileSync(file, "utf8")).toMatch(/\n {2}"contentRemote": "git@github.com:o\/x.git",\n/)
    writeFileSync(file, '// mine\n{\n  "baseBranch": "main"\n}\n')
    RepoInit.keepRemote(file, "git@github.com:o/x.git")
    expect(readFileSync(file, "utf8")).toMatch(/^\/\/ mine\n/)
    expect(EpicConfig.settingsFrom(readFileSync(file, "utf8")).contentRemote).toBe("git@github.com:o/x.git")
  })
})

/** A code repo `<TEMP>/<name>/<name>` with one commit, nothing set up for epics. */
/**
 * A stand-in for the epic plugin's installer, installed or not:  what `RepoInit` asks of `PluginInstall`.
 * - `fails`:  its install throws, with those words
 */
function stubPlugin({ installed = false, fails }: { installed?: boolean; fails?: string } = {}) {
  const calls: string[] = []
  return {
    calls,
    make: () => ({
      isInstalled: () => installed,
      // as `PluginInstall.install()`:  run again, nothing to change
      install: () => {
        calls.push("install")
        if (fails) throw new Error(fails)
        const changes = installed ? [] : ["a", "b", "c"]
        installed = true
        return { plugin: "epic@spell", version: "1.0.0", from: "/kit/epic", dryRun: false, changes }
      }
    })
  }
}

/**
 * A stand-in for the machine's epic server:  what `RepoInit` asks of `Hub`, every call kept.
 * - `fails`:  its start throws, with those words
 */
function stubHub({ fails }: { fails?: string } = {}) {
  const calls: string[] = []
  return {
    calls,
    make: () => ({
      registerHere: (checkout?: string) => {
        calls.push(`register ${checkout}`)
        return undefined
      },
      addressOf: async (checkout: string) => {
        calls.push(`address ${checkout}`)
        if (fails) throw new Error(fails)
        return "http://localhost:4848/r/try/"
      }
    })
  }
}

/** The terminal's colour codes and OSC 8 links, as `epic init` draws them. */
// oxlint-disable-next-line no-control-regex -- matching them is the point
const TERMINAL_CODES = /\x1b\[[0-9;]*m|\x1b\]8;;[^\x07]*\x07/g

/** `text` without the terminal's colour codes and links. */
function plain(text: unknown): string {
  return String(text).replace(TERMINAL_CODES, "")
}

/** The files' table's rows in `lines`:  after its head, up to the next blank line. */
function tableOf(lines: string[]): string[] {
  const from = lines.indexOf("Setting up epic files:") + 1
  const to = lines.indexOf("", from)
  return lines.slice(from, to < 0 ? undefined : to)
}

/** `report` as `epic init` prints it, without colour. */
function said(report: Parameters<typeof RepoInit.lines>[0]): string[] {
  return RepoInit.lines(report).map(plain)
}

/** What `work` printed, line by line (stdout caught, never shown), without colour. */
async function printed(work: () => Promise<unknown>): Promise<string[]> {
  const lines: string[] = []
  const out = vi.spyOn(process.stdout, "write").mockImplementation((text) => {
    lines.push(...plain(text).replace(/\n$/, "").split("\n"))
    return true
  })
  try {
    await work()
  } finally {
    out.mockRestore()
  }
  return lines
}

/**
 * `RepoInit` for the repo at `main`, its plugin installed and its server a stand-in:  a test's `run()` never touches
 * the machine's Claude Code or starts a server (`run()` installs the plugin and starts the server unless told not to).
 */
function offline(main: string): RepoInit {
  return new RepoInit({ main, plugin: stubPlugin({ installed: true }).make, hub: stubHub().make })
}

function codeRepo(name: string): string {
  const app = join(TEMP, name, name)
  mkdirSync(app, { recursive: true })
  git(app, "init", "-q", "-b", "main")
  writeFileSync(join(app, "README.md"), `# ${name}\n`)
  git(app, "add", "-A")
  git(app, "-c", "user.name=t", "-c", "user.email=t@t", "-c", "commit.gpgsign=false", "commit", "-q", "-m", "first")
  return app
}

/**
 * A stand-in `gh` beside the code repo at `app`, logged in as `ana` (unless `loggedIn` is `false`):
 * `repo create` makes a local BARE repo in `repos`, `repo view` gives its path as both addresses, `acme` is an
 * organization;  every call logged in `log`.
 */
function stubGh(app: string, { loggedIn = true } = {}): { command: string; repos: string; log: string } {
  const dir = dirname(app)
  const command = join(dir, "gh")
  const repos = join(dir, "gh-repos")
  const log = join(dir, "gh.log")
  writeFileSync(
    command,
    `#!/bin/sh
echo "$*" >> "${log}"
case "$1 $2" in
  "--version "*) echo "gh version 2.0.0" ;;
  "auth status") ${loggedIn ? "exit 0" : 'echo "You are not logged into any GitHub hosts." >&2; exit 1'} ;;
  "api user") echo ana ;;
  "api users/acme") echo Organization ;;
  "api users/"*) echo User ;;
  "repo create") mkdir -p "${repos}/$(dirname "$3")" && git init -q --bare "${repos}/$3.git" ;;
  "repo view") echo "{\\"url\\":\\"${repos}/$3.git\\",\\"sshUrl\\":\\"${repos}/$3.git\\"}" ;;
  "config get") echo https ;;
  *) echo "stub gh:  $*" >&2; exit 1 ;;
esac
`
  )
  chmodSync(command, 0o755)
  return { command, repos, log }
}

/** `work()`, with `$SPELL_EPIC_GH` naming the stand-in `gh`, put back after. */
async function withGh<T>(gh: { command: string }, work: () => Promise<T>): Promise<T> {
  const was = process.env.SPELL_EPIC_GH
  process.env.SPELL_EPIC_GH = gh.command
  try {
    return await work()
  } finally {
    process.env.SPELL_EPIC_GH = was
  }
}

/** `git <args>` in `cwd`. */
function git(cwd: string, ...args: string[]): string {
  return execFileSync("git", args, { cwd, encoding: "utf8" })
}
