import { mkdirSync, mkdtempSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import JSON5 from "json5"
import { afterAll, describe, expect, test, vi } from "vite-plus/test"

import { EpicConfig } from "spell/epic/config/EpicConfig"
import { fakeMainCheckout, fakeWorktree } from "spell/server/test/checkouts"

/** the kit's config, as committed (comments and all):  Spell's own layout, every value spelled out */
const KIT_CONFIG = resolve(dirname(fileURLToPath(import.meta.url)), "../../..", EpicConfig.FILE)

/** spell-epic's own config, as committed (comments and all). */
const REPO_CONFIG = resolve(dirname(fileURLToPath(import.meta.url)), "../..", EpicConfig.FILE)

/** A main checkout, a worktree in it, and one beside it, as git leaves them. */
const TOP = realpathSync(mkdtempSync(join(tmpdir(), "epic-config-")))
const MAIN = fakeMainCheckout(join(TOP, "repo"))
const INSIDE = fakeWorktree(MAIN, join(MAIN, ".claude", "worktrees", "seo"))
afterAll(() => rmSync(TOP, { recursive: true, force: true }))

/** Write `text` as `main`'s `.epic/config.json5`. */
function configFile(main: string, text: string): void {
  mkdirSync(join(main, ".epic"), { recursive: true })
  writeFileSync(join(main, EpicConfig.FILE), text)
}

describe("EpicConfig", () => {
  test("no file:  the repo's own values, as `epic init` would write them (epic-friend P6);  NOT set up", () => {
    const config = new EpicConfig(MAIN)
    expect(config.isSetUp).toBe(false)
    expect(EpicConfig.ofSetUp(INSIDE)).toBeUndefined()
    expect(config.settings).toEqual(EpicConfig.defaultsFor(MAIN))
    expect(config.values()).toEqual({
      contentFolder: join(TOP, "repo.epics"),
      contentRemote: "",
      baseBranch: "main",
      worktreesFolder: join(TOP, "repo.worktrees"),
      // no lock file:  nothing to install
      installCommand: "",
      installOnCreate: false,
      installTimeout: 600,
      extraInstalls: "",
      "windows.default": "repo",
      "windows.repoName": "repo",
      "windows.contentName": "repo.epics",
      "windows.worktreeOnly": true,
      "windows.settings": "{}",
      linkSessionFolders: true,
      sharedFolders: "epics,sagas,guides,pages",
      engineFolder: "",
      repoTemplates: "",
      windowsFolder: join(TOP, "repo.epics", "windows"),
      "app.path": "/editor/",
      "app.url": "",
      "app.urlFile": "",
      "app.start": "",
      // a single repo:  no child repos, no multi-repo top (epic-engine P10)
      repos: "",
      top: "",
      // spell-epic's own voices, and the default kinds of page (epic readme P13)
      "voices.blog": join(EpicConfig.ENGINE_VOICES, "blog.md"),
      "voices.brand": join(EpicConfig.ENGINE_VOICES, "brand.md"),
      "voices.novice": join(EpicConfig.ENGINE_VOICES, "novice.md"),
      "voices.readme": join(EpicConfig.ENGINE_VOICES, "readme.md"),
      "pageVoices.readme": "readme",
      "pageVoices.guide": "readme",
      "pageVoices.code": "code",
      "pageVoices.epic-page": "code",
      checkoutPatches: "",
      promptAck: true,
      renamedRepos: "{}"
    })
    // no app declared
    expect(config.app).toBeUndefined()
    // a worktree in Claude Code's own place is still found there;  new ones go beside the repo
    expect(config.worktreeFolder("seo")).toBe(INSIDE)
    expect(config.worktreeFolder("new")).toBe(join(TOP, "repo.worktrees", "new"))
    expect(config.worktreesPattern).toBeUndefined()
    expect(config.worktreesFolders).toEqual([join(TOP, "repo.worktrees"), join(MAIN, ".claude", "worktrees")])
    expect(config.worktreesPatterns).toEqual([".claude/worktrees"])
    expect(config.worktreeOnlyWindow("seo")).toBe(true)
  })

  test("set up:  a file there, read from any worktree (`ofSetUp()`, the hooks' one check)", () => {
    const main = fakeMainCheckout(join(TOP, "set-up"))
    const worktree = fakeWorktree(main, join(TOP, "set-up.worktrees", "seo"))
    expect(EpicConfig.ofSetUp(worktree)).toBeUndefined()
    configFile(main, "{}")
    expect(EpicConfig.ofSetUp(worktree)?.main).toBe(main)
    expect(new EpicConfig(main).isSetUp).toBe(true)
  })

  test("a key left out reads as the repo's own (`defaultsFor()`):  never another repo's", () => {
    const main = fakeMainCheckout(join(TOP, "my-app"))
    writeFileSync(join(main, "pnpm-lock.yaml"), "")
    writeFileSync(join(main, ".git", "HEAD"), "ref: refs/heads/trunk\n")
    configFile(main, '{ "contentFolder": "../plans" }')
    const config = new EpicConfig(main)
    expect(config.contentFolder).toBe(join(TOP, "plans"))
    // what follows another key follows it:  the content folder's name in a window, its windows/
    expect(config.windows).toEqual({
      default: "my-app",
      repoName: "my-app",
      contentName: "plans",
      worktreeOnly: true,
      settings: {}
    })
    expect(config.windowsFolder).toBe(join(TOP, "plans", "windows"))
    expect(config.worktreesFolder).toBe(join(TOP, "my-app.worktrees"))
    expect(config.installCommand).toBe("pnpm install")
    expect(config.installOnCreate).toBe(true)
    // the base branch from git:  what's checked out, with no remote and no main or master
    expect(config.baseBranch).toBe("trunk")
    writeFileSync(join(main, ".git", "packed-refs"), "abc refs/heads/master\n")
    expect(new EpicConfig(main).baseBranch).toBe("master")
    mkdirSync(join(main, ".git", "refs", "remotes", "origin"), { recursive: true })
    writeFileSync(join(main, ".git", "refs", "remotes", "origin", "HEAD"), "ref: refs/remotes/origin/develop\n")
    expect(new EpicConfig(main).baseBranch).toBe("develop")
    // an install command named as none:  nothing run in a new worktree either
    configFile(main, '{ "installCommand": "" }')
    expect(new EpicConfig(main).installOnCreate).toBe(false)
  })

  test("the kit's own config names every value Spell's layout needs:  none comes from the repo's defaults", () => {
    const text = readFileSync(KIT_CONFIG, "utf8")
    const named = EpicConfig.parse(text) as Record<string, Record<string, unknown>>
    for (const key of ["contentFolder", "baseBranch", "worktreesFolder", "installCommand", "installOnCreate"])
      expect(named[key], key).toBeDefined()
    for (const key of ["linkSessionFolders", "sharedFolders", "engineFolder", "windowsFolder"])
      expect(named[key], key).toBeDefined()
    for (const key of ["default", "repoName", "contentName", "worktreeOnly"])
      expect(named.windows[key], key).toBeDefined()
    // so they read the same in any folder:  nothing left to the repo's name or its git
    const here = EpicConfig.settingsFrom(text, KIT_CONFIG, "/somewhere/spell")
    const elsewhere = EpicConfig.settingsFrom(text, KIT_CONFIG, join(TOP, "other-name"))
    expect(here).toEqual(elsewhere)
    expect(here).toMatchObject({
      contentFolder: "spell.epics",
      worktreesFolder: "../spell.worktrees",
      installCommand: "yarn install",
      installOnCreate: true,
      windows: { default: "spell", repoName: "spell", contentName: "spell.epics", worktreeOnly: true },
      linkSessionFolders: true,
      sharedFolders: [],
      engineFolder: "",
      windowsFolder: "spell.epics/windows"
    })
  })

  test("the install command, from the lock file;  none without one", () => {
    const dir = join(TOP, "locks")
    mkdirSync(dir)
    expect(EpicConfig.installCommandOf(dir)).toBe("")
    writeFileSync(join(dir, "package.json"), "{}")
    expect(EpicConfig.installCommandOf(dir)).toBe("npm install")
    writeFileSync(join(dir, "pnpm-lock.yaml"), "")
    expect(EpicConfig.installCommandOf(dir)).toBe("pnpm install")
    writeFileSync(join(dir, "yarn.lock"), "")
    expect(EpicConfig.installCommandOf(dir)).toBe("yarn install")
    expect(EpicConfig.defaultsFor(dir).installOnCreate).toBe(true)
  })

  test("the repo's committed config reads as JSON5 reads it (`DataFile`'s reader)", () => {
    const text = readFileSync(REPO_CONFIG, "utf8")
    expect(EpicConfig.parse(text)).toEqual(JSON5.parse(text))
  })

  test("ANY valid JSON5 reads, as the page server reads the same file:  unquoted keys, single quotes", () => {
    expect(EpicConfig.parse("{ contentFolder: '../spell.epics', /* why */ baseBranch: \"main\", }")).toEqual({
      contentFolder: "../spell.epics",
      baseBranch: "main"
    })
    expect(() => EpicConfig.parse("{ contentFolder: ", "x/config.json5")).toThrow(/x\/config\.json5 won't read/)
  })

  test("a worktree reads the MAIN checkout's file, from any folder in it", () => {
    const other = fakeMainCheckout(join(TOP, "other"))
    const beside = fakeWorktree(other, join(TOP, "other.worktrees", "vite"))
    configFile(other, '{ "baseBranch": "trunk", "worktreesFolder": "../other.worktrees" }')
    const config = EpicConfig.of(join(beside, "packages", "ui"))
    expect(config.main).toBe(other)
    expect(config.baseBranch).toBe("trunk")
    expect(config.worktreesFolder).toBe(join(TOP, "other.worktrees"))
    // outside the checkout:  the new place has no pattern inside it;  the old place is still read
    expect(config.worktreesPattern).toBeUndefined()
    expect(config.worktreesFolders).toEqual([join(TOP, "other.worktrees"), join(other, ".claude", "worktrees")])
    expect(config.worktreesPatterns).toEqual([".claude/worktrees"])
    expect(config.worktreeNameOf(join(beside, "epics"))).toBe("vite")
    expect(config.worktreeNameOf("/elsewhere/.claude/worktrees/seo")).toBe("seo")
    expect(config.worktreeNameOf(join(TOP, "other"))).toBeUndefined()
  })

  test("worktrees moved beside the repo:  new ones go there, old ones are found where they are", () => {
    const moved = fakeMainCheckout(join(TOP, "moved"))
    configFile(moved, '{ "worktreesFolder": "../moved.worktrees", "windows": { "worktreeOnly": false } }')
    const old = fakeWorktree(moved, join(moved, ".claude", "worktrees", "old"))
    const config = new EpicConfig(moved)
    expect(config.worktreeFolder("old")).toBe(old)
    expect(config.worktreeFolder("new")).toBe(join(TOP, "moved.worktrees", "new"))
    expect(config.newWorktreeFolder("old")).toBe(join(TOP, "moved.worktrees", "old"))
    expect(config.worktreeNameOf(join(old, "packages"))).toBe("old")
    // the window:  a worktree beside the repo gets a worktree-only one, an old one keeps the old layout
    expect(config.worktreeOnlyWindow("new")).toBe(true)
    expect(config.worktreeOnlyWindow("old")).toBe(false)
    expect(config.isOutside(join(TOP, "moved.worktrees", "new"))).toBe(true)
    expect(config.isOutside(old)).toBe(false)
  })

  test("the P8 keys:  install in the hook, its timeout, worktree-only windows for every worktree", () => {
    const main = fakeMainCheckout(join(TOP, "p8"))
    configFile(
      main,
      '{ "installOnCreate": true, "installTimeout": 30, "windows": { "worktreeOnly": true }, "linkSessionFolders": true }'
    )
    const config = new EpicConfig(main)
    expect(config.installOnCreate).toBe(true)
    expect(config.installTimeout).toBe(30)
    expect(config.windows.worktreeOnly).toBe(true)
    expect(config.worktreeOnlyWindow("seo")).toBe(true)
    expect(() => EpicConfig.settingsFrom('{ "installTimeout": 0 }', "x.json5")).toThrow(
      /"installTimeout" must be a number/
    )
    expect(() => EpicConfig.settingsFrom('{ "installTimeout": "9" }', "x.json5")).toThrow(/must be a number/)
  })

  test("windows.settings (epic intellisense P4):  VS Code settings every window file gets;  none by default", () => {
    expect(EpicConfig.settingsFrom("").windows.settings).toEqual({})
    const text = '{ "windows": { "settings": { "js/ts.experimental.useTsgo": false } } }'
    const settings = EpicConfig.settingsFrom(text, EpicConfig.FILE, MAIN)
    expect(settings.windows.settings).toEqual({ "js/ts.experimental.useTsgo": false })
    expect(settings.windows.default).toBe("repo")
    expect(() => EpicConfig.settingsFrom('{ "windows": { "settings": [] } }', "x.json5")).toThrow(
      /"windows.settings" must be an object/
    )
  })

  test("extraInstalls (epic-engine I65):  the folders that are yarn projects of their own, paths from the root", () => {
    const settings = EpicConfig.settingsFrom('{ "extraInstalls": ["epic/vscode", "vscode"] }')
    expect(settings.extraInstalls).toEqual(["epic/vscode", "vscode"])
    for (const bad of ['["/abs/vscode"]', '["../vscode"]', '["a//b"]', '["./vscode"]', '"vscode"', "[3]"])
      expect(() => EpicConfig.settingsFrom(`{ "extraInstalls": ${bad} }`, "x.json5")).toThrow(
        /"extraInstalls" must be a list of folders/
      )
  })

  test("the P9 keys:  no install command (an empty one), and the folders linked in", () => {
    const settings = EpicConfig.settingsFrom('{ "installCommand": "", "sharedFolders": ["epics", "sagas"] }')
    expect(settings.installCommand).toBe("")
    expect(settings.sharedFolders).toEqual(["epics", "sagas"])
    // `""`, the default:  no engine link
    expect(new EpicConfig(MAIN).engineFolder).toBeUndefined()
    expect(EpicConfig.settingsFrom('{ "engineFolder": "../spell-epic" }').engineFolder).toBe("../spell-epic")
    // epic-eject T11:  the repo's own templates, none by default;  a folder from each checkout's root, as written
    expect(new EpicConfig(MAIN).repoTemplates).toBe("")
    expect(EpicConfig.settingsFrom('{ "repoTemplates": "docs/templates" }').repoTemplates).toBe("docs/templates")
    expect(() => EpicConfig.settingsFrom('{ "sharedFolders": "epics" }', "x.json5")).toThrow(
      /"sharedFolders" must be a list of folder names/
    )
    expect(() => EpicConfig.settingsFrom('{ "sharedFolders": ["../up"] }', "x.json5")).toThrow(/list of folder names/)
    // an empty name is still refused for every other text key
    expect(() => EpicConfig.settingsFrom('{ "baseBranch": "" }', "x.json5")).toThrow(/"baseBranch" must be a string/)
  })

  test("the window files (epic-eject P13):  the content folder's windows/;  the old workspaces/ until they move", () => {
    const main = fakeMainCheckout(join(TOP, "windows"))
    configFile(main, '{ "contentFolder": "../windows.epics" }')
    const config = new EpicConfig(main)
    const windows = join(TOP, "windows.epics", "windows")
    expect(config.newWindowsFolder).toBe(windows)
    expect(config.windowsFolder).toBe(windows)
    expect(config.windowFile("ui")).toBe(join(windows, "ui.code-workspace"))
    expect(config.worktreeWindowFile("seo")).toBe(join(windows, "ongoing", "seo.code-workspace"))
    // the old folder there, the new one not yet:  the old one, until `epic window move`
    mkdirSync(join(main, "workspaces"))
    expect(config.windowsFolder).toBe(join(main, "workspaces"))
    expect(config.oldWindowsFolder).toBe(join(main, "workspaces"))
    mkdirSync(windows, { recursive: true })
    expect(config.windowsFolder).toBe(windows)
    // a folder of its own, from the main checkout
    configFile(main, '{ "windowsFolder": "../my-windows" }')
    expect(new EpicConfig(main).newWindowsFolder).toBe(join(TOP, "my-windows"))
  })

  test("a key left out keeps its default;  comments and trailing commas read;  an unknown key is skipped", () => {
    const main = fakeMainCheckout(join(TOP, "partial"))
    configFile(
      main,
      `// a comment
{
  /* the content repo */ "contentFolder": "../content//with-slashes",
  "windows": { "default": "whole", },
  "linkSessionFolders": true,
  "later": "a key from a newer checkout",
}
`
    )
    const config = new EpicConfig(main)
    expect(config.contentFolder).toBe(join(TOP, "content", "with-slashes"))
    expect(config.windows).toEqual({
      ...EpicConfig.DEFAULTS.windows,
      default: "whole",
      repoName: "partial",
      contentName: "with-slashes"
    })
    expect(config.linkSessionFolders).toBe(true)
    expect(config.baseBranch).toBe("main")
  })

  // epic `epic-engine` I49:  the top bar's App tab, through the epic server
  test("the repo's app:  its URL or record file (from the main checkout) and start command;  `path` defaults", () => {
    const main = fakeMainCheckout(join(TOP, "with-app"))
    configFile(main, '{ "app": { "urlFile": ".app.json", "start": "node app.mjs" } }')
    const config = new EpicConfig(main)
    expect(config.app).toEqual({ path: "/editor/", url: "", urlFile: join(main, ".app.json"), start: "node app.mjs" })
    expect(config.values()["app.urlFile"]).toBe(join(main, ".app.json"))
    configFile(main, '{ "app": { "path": "/studio/", "url": "http://localhost:5173/" } }')
    expect(new EpicConfig(main).app).toEqual({
      path: "/studio/",
      url: "http://localhost:5173/",
      urlFile: "",
      start: ""
    })
    // a start command alone is no app:  nothing says where it answers
    configFile(main, '{ "app": { "start": "node app.mjs" } }')
    expect(new EpicConfig(main).app).toBeUndefined()
    expect(() => EpicConfig.settingsFrom('{ "app": "http://x/" }', "x.json5")).toThrow(/"app" must be an object/)
    expect(() => EpicConfig.settingsFrom('{ "app": { "url": 3 } }', "x.json5")).toThrow(/"app\.url" must be a string/)
  })

  test("refuses, naming the file:  text that won't read, a value of the wrong kind, an empty name", () => {
    expect(() => EpicConfig.settingsFrom("{ nope", "x.json5")).toThrow(SyntaxError)
    expect(() => EpicConfig.settingsFrom("{ nope", "x.json5")).toThrow(/x\.json5 won't read/)
    expect(() => EpicConfig.settingsFrom('{ "baseBranch": 3 }', "x.json5")).toThrow(
      /x\.json5's "baseBranch" must be a string, not 3/
    )
    expect(() => EpicConfig.settingsFrom('{ "windows": { "default": " " } }', "x.json5")).toThrow(
      /"windows\.default" must be a string/
    )
    expect(() => EpicConfig.settingsFrom("[]", "x.json5")).toThrow(/must hold an object/)
  })

  test("renamedRepos (epic-engine I150):  old repo addresses to new;  none by default;  refuses anything else", () => {
    const renamed = { "https://github.com/o/old": "https://github.com/o/new" }
    expect(EpicConfig.settingsFrom(JSON.stringify({ renamedRepos: renamed })).renamedRepos).toEqual(renamed)
    expect(EpicConfig.settingsFrom("").renamedRepos).toEqual({})
    expect(() => EpicConfig.settingsFrom('{ "renamedRepos": ["x"] }', "x.json5")).toThrow(
      /x\.json5's "renamedRepos" must be an object of old repo addresses to new ones/
    )
    expect(() => EpicConfig.settingsFrom('{ "renamedRepos": { "a": " " } }', "x.json5")).toThrow(TypeError)
  })
})

// epic `readme` P13:  voices, a name each, the repo's own over spell-epic's
describe("EpicConfig voices", () => {
  test("no file:  spell-epic's readme voice, no code voice, and the default kinds of page", () => {
    const config = new EpicConfig(MAIN)
    expect(config.voiceFile("readme")).toBe(join(EpicConfig.ENGINE_VOICES, "readme.md"))
    expect(config.voiceFile("code")).toBeUndefined()
    expect(config.voiceFor("guide")).toBe("readme")
    expect(config.voiceFor("epic-page")).toBe("code")
    expect(config.voiceFor("brand")).toBe("brand")
    expect(config.voiceNames).toContain("readme")
    expect(config.values()["voices.readme"]).toBe(join(EpicConfig.ENGINE_VOICES, "readme.md"))
    expect(config.values()["pageVoices.guide"]).toBe("readme")
  })

  test("the repo's own:  a voice from its main checkout, one of spell-epic's replaced, a kind sent elsewhere", () => {
    const main = fakeMainCheckout(join(TOP, "voices"))
    configFile(
      main,
      '{ "voices": { "code": "agents/wwod/writing.md", "readme": "docs/our-readme.md" }, "pageVoices": { "guide": "code" } }'
    )
    const config = new EpicConfig(main)
    expect(config.voiceFile("code")).toBe(join(main, "agents/wwod/writing.md"))
    expect(config.voiceFile("readme")).toBe(join(main, "docs/our-readme.md"))
    expect(config.voiceFor("guide")).toBe("code")
    expect(config.voiceFor("readme")).toBe("readme")
    expect(config.voiceNames).toEqual(expect.arrayContaining(["code", "readme"]))
  })

  test("refuses voices that aren't names to files", () => {
    expect(() => EpicConfig.settingsFrom('{ "voices": ["code"] }', "x.json5")).toThrow(
      /x\.json5's "voices" must be an object of names to text/
    )
    expect(() => EpicConfig.settingsFrom('{ "voices": { "code": "" } }', "x.json5")).toThrow(/"voices"/)
    expect(() => EpicConfig.settingsFrom('{ "pageVoices": { "a b": "readme" } }', "x.json5")).toThrow(/"pageVoices"/)
  })
})

// epic `epic-eject` P12:  the tools read pages from the content folder itself, never through a link at the root
describe("EpicConfig.contentOf()", () => {
  test("the content folder the config names, from the main checkout or a worktree;  no links needed", () => {
    const main = fakeMainCheckout(join(TOP, "named"))
    const worktree = fakeWorktree(main, join(TOP, "named.worktrees", "seo"))
    const content = join(TOP, "named.epics")
    mkdirSync(join(content, "epics"), { recursive: true })
    configFile(main, '{ "contentFolder": "../named.epics" }')
    expect(EpicConfig.contentOf(main)).toBe(content)
    expect(EpicConfig.contentOf(worktree)).toBe(content)
  })

  test("the checkout itself:  no config file, a folder that isn't there, a file that won't read", () => {
    const write = vi.spyOn(process.stderr, "write").mockImplementation(() => true)
    try {
      expect(EpicConfig.contentOf(MAIN)).toBe(resolve(MAIN))
      const missing = fakeMainCheckout(join(TOP, "missing"))
      configFile(missing, '{ "contentFolder": "../missing.epics" }')
      expect(EpicConfig.contentOf(missing)).toBe(resolve(missing))
      const broken = fakeMainCheckout(join(TOP, "broken"))
      configFile(broken, "{ nope")
      expect(EpicConfig.contentOf(broken)).toBe(resolve(broken))
      // a folder the file NAMES, not there:  said, never silent (epic `epic-engine` I59);  the rest quiet
      expect(write.mock.calls.map(([text]) => String(text))).toEqual([
        `EpicConfig:  contentFolder ../missing.epics is missing:  ${join(TOP, "missing.epics")};  using the checkout` +
          ` itself, ${missing} -- update ${join(missing, EpicConfig.FILE)}\n`
      ])
    } finally {
      write.mockRestore()
    }
  })

  test("a content folder is its own:  it holds no config", () => {
    const content = join(TOP, "own.epics")
    mkdirSync(join(content, "epics"), { recursive: true })
    expect(EpicConfig.contentOf(content)).toBe(content)
  })
})

describe("EpicConfig.worktreeNameOf()", () => {
  const config = new EpicConfig(MAIN)

  test("the worktree a path is in;  `undefined` in the main checkout or outside", () => {
    expect(config.worktreeNameOf(INSIDE)).toBe("seo")
    expect(config.worktreeNameOf(join(INSIDE, "packages", "ui"))).toBe("seo")
    expect(config.worktreeNameOf(MAIN)).toBeUndefined()
    expect(config.worktreeNameOf(join(MAIN, ".claude", "worktrees"))).toBeUndefined()
    expect(config.worktreeNameOf(undefined)).toBeUndefined()
  })

  test("while the folder is inside the checkout:  the same folder of ANY checkout counts (a session's `cwd`)", () => {
    expect(config.worktreeNameOf("/repo/.claude/worktrees/other/packages/ui")).toBe("other")
    expect(config.worktreeNameOf("/repo/.claude/worktreesX/other")).toBeUndefined()
  })
})
