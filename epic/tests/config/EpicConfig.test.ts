import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import JSON5 from "json5"
import { afterAll, describe, expect, test } from "vite-plus/test"

import { EpicConfig } from "$/epics/config/EpicConfig"
import { fakeMainCheckout, fakeWorktree } from "$/server/test/checkouts"

/**
 * spell-app's config, as committed:
 * in the spell-app checkout spell-epic uses (`.spell-app`, the root's link).
 */
const REPO_CONFIG = resolve(dirname(fileURLToPath(import.meta.url)), "../../.spell-app", EpicConfig.FILE)

/** A main checkout, a worktree in it, and one beside it, as git leaves them. */
const TOP = mkdtempSync(join(tmpdir(), "epic-config-"))
const MAIN = fakeMainCheckout(join(TOP, "repo"))
const INSIDE = fakeWorktree(MAIN, join(MAIN, ".claude", "worktrees", "seo"))
afterAll(() => rmSync(TOP, { recursive: true, force: true }))

/** Write `text` as `main`'s `.epic/config.json5`. */
function configFile(main: string, text: string): void {
  mkdirSync(join(main, ".epic"), { recursive: true })
  writeFileSync(join(main, EpicConfig.FILE), text)
}

describe("EpicConfig", () => {
  test("no file:  the defaults, today's spell-app layout, folders from the main checkout", () => {
    const config = new EpicConfig(MAIN)
    expect(config.settings).toEqual(EpicConfig.DEFAULTS)
    expect(config.values()).toEqual({
      contentFolder: join(TOP, "spell-app-dev"),
      baseBranch: "main",
      worktreesFolder: join(MAIN, ".claude", "worktrees"),
      installCommand: "yarn install",
      installOnCreate: false,
      installTimeout: 600,
      "windows.default": "spell-app",
      "windows.repoName": "spell-app",
      "windows.contentName": "spell-app-dev",
      "windows.worktreeOnly": false,
      linkSessionFolders: false,
      sharedFolders: "epics,guides,pages,brand,goals,sagas,agents",
      engineFolder: join(TOP, "spell-epic"),
      repoTemplates: "",
      windowsFolder: join(TOP, "spell-app-dev", "windows"),
      "app.path": "/editor/",
      "app.url": "",
      "app.urlFile": "",
      "app.start": ""
    })
    // no app declared
    expect(config.app).toBeUndefined()
    expect(config.worktreeFolder("seo")).toBe(INSIDE)
    expect(config.worktreesPattern).toBe(".claude/worktrees")
    // one place:  nothing moved
    expect(config.worktreesFolders).toEqual([join(MAIN, ".claude", "worktrees")])
    expect(config.worktreesPatterns).toEqual([".claude/worktrees"])
    expect(config.worktreeOnlyWindow("seo")).toBe(false)
  })

  test("the repo's committed config reads as JSON5 reads it (`DataFile`'s reader)", () => {
    const text = readFileSync(REPO_CONFIG, "utf8")
    expect(EpicConfig.parse(text)).toEqual(JSON5.parse(text))
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
    configFile(moved, '{ "worktreesFolder": "../moved.worktrees" }')
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

  test("the P9 keys:  no install command (an empty one), and the folders linked in", () => {
    const settings = EpicConfig.settingsFrom('{ "installCommand": "", "sharedFolders": ["epics", "sagas"] }')
    expect(settings.installCommand).toBe("")
    expect(settings.sharedFolders).toEqual(["epics", "sagas"])
    // `""`:  no engine link
    expect(new EpicConfig(MAIN).engineFolder).toBe(join(TOP, "spell-epic"))
    expect(EpicConfig.settingsFrom('{ "engineFolder": "" }').engineFolder).toBe("")
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
    expect(config.windows).toEqual({ ...EpicConfig.DEFAULTS.windows, default: "whole" })
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
    expect(EpicConfig.contentOf(MAIN)).toBe(resolve(MAIN))
    const missing = fakeMainCheckout(join(TOP, "missing"))
    configFile(missing, '{ "contentFolder": "../missing.epics" }')
    expect(EpicConfig.contentOf(missing)).toBe(resolve(missing))
    const broken = fakeMainCheckout(join(TOP, "broken"))
    configFile(broken, "{ nope")
    expect(EpicConfig.contentOf(broken)).toBe(resolve(broken))
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
