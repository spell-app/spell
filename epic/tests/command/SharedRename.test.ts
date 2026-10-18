import {
  existsSync,
  lstatSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  readlinkSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync
} from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join, relative } from "node:path"
import { afterAll, describe, expect, test } from "vite-plus/test"

import { SharedRename } from "$/epics/command/SharedRename"
import type { SharedConfig } from "$/epics/command/command.types"
import { EpicConfig } from "$/epics/config/EpicConfig"
import { SessionFolders } from "$/epics/config/SessionFolders"

/**
 * Temp folders only:  never the real `spell-app-dev` or `~/.claude`.
 * - a repo `app` with its content folder `app-dev` beside it
 * - a worktree beside the repo
 * - a temp Claude Code folder
 */
const TEMP = realpathSync(mkdtempSync(join(tmpdir(), "shared-rename-")))
const MAIN = join(TEMP, "app")
const CONTENT = join(TEMP, "app-dev")
const WORKTREE = join(TEMP, "app.worktrees", "w")
const CLAUDE = join(TEMP, "claude")
afterAll(() => rmSync(TEMP, { recursive: true, force: true }))

const CONFIG_TEXT = `// where this repo keeps its epic things
{
  // the content repo
  "contentFolder": "../app-dev",
  "windows": {
    // its window folder
    "contentName": "app-dev"
  }
}
`
put(join(MAIN, ".epic", "config.json5"), CONFIG_TEXT)
put(join(MAIN, "package.json"), JSON.stringify({ shared: { links: ["epics", "guides"] } }))
const AGENTS_TEXT = [
  "# Rules",
  "The content is in `../app-dev`, at its real path:  " + CONTENT + "/<path>.",
  "Windows show `app-dev` as a folder;  never app-devtools, app-dev2 or x.app-dev.",
  ""
].join("\n")
put(join(MAIN, "AGENTS.md"), AGENTS_TEXT)
const SETTINGS_TEXT = JSON.stringify(
  { permissions: { allow: [`Edit(/${CONTENT}/**)`], additionalDirectories: [CONTENT] } },
  null,
  2
)
put(join(MAIN, ".claude", "settings.json"), SETTINGS_TEXT)
put(join(CONTENT, "epics", "x", "x.plan.html"), "<h1>X</h1>\n")
put(join(CONTENT, "guides", "a.html"), "<h1>A</h1>\n")
put(join(WORKTREE, "package.json"), JSON.stringify({ shared: { links: ["epics", "guides"] } }))
put(join(CLAUDE, "settings.json"), JSON.stringify({ permissions: { additionalDirectories: [CONTENT] } }))
const NOTE = join(SessionFolders.folderOf(MAIN, CLAUDE), "memory", "note.md")
put(NOTE, "Logs live in app-dev/agents.\n")
put(join(SessionFolders.folderOf(MAIN, CLAUDE), "memory", "other.md"), "Nothing here.\n")
for (const checkout of [MAIN, WORKTREE])
  for (const path of ["epics", "guides"]) symlinkSync(relative(checkout, join(CONTENT, path)), join(checkout, path))

const config: SharedConfig = {
  main: MAIN,
  dir: CONTENT,
  worktrees: [join(TEMP, "app.worktrees")],
  links: ["epics", "guides"]
}
const rename = new SharedRename({ config, checkouts: [MAIN, WORKTREE], claudeHome: CLAUDE })
const TARGET = join(TEMP, "app.epics")

describe("SharedRename", () => {
  test("--dry-run:  says what it would do, changes nothing", () => {
    const report = rename.run("app.epics", { dryRun: true })
    expect(report.to).toBe(TARGET)
    expect(report.relinked.map(({ checkout, path }) => `${relative(TEMP, checkout)}/${path}`)).toEqual([
      "app/epics",
      "app/guides",
      "app.worktrees/w/epics",
      "app.worktrees/w/guides"
    ])
    expect(report.config.keys).toEqual(["contentFolder", "windows.contentName"])
    // every file and line it would rewrite
    expect(report.rewrites.map(({ file }) => relative(TEMP, file))).toEqual([
      "app/AGENTS.md",
      "app/.claude/settings.json",
      "claude/projects/" + SessionFolders.slug(MAIN) + "/memory/note.md"
    ])
    expect(report.rewrites[0]!.lines).toEqual([
      {
        line: 2,
        before: "The content is in `../app-dev`, at its real path:  " + CONTENT + "/<path>.",
        after: "The content is in `../app.epics`, at its real path:  " + TARGET + "/<path>."
      },
      {
        line: 3,
        before: "Windows show `app-dev` as a folder;  never app-devtools, app-dev2 or x.app-dev.",
        after: "Windows show `app.epics` as a folder;  never app-devtools, app-dev2 or x.app-dev."
      }
    ])
    expect(report.rewrites[1]!.lines.map(({ line }) => line)).toEqual([4, 7])
    // Claude Code's own settings:  only listed
    expect(report.byHand.map(({ file, lines }) => [relative(TEMP, file), lines.length])).toEqual([
      ["claude/settings.json", 1]
    ])
    expect(existsSync(TARGET)).toBe(false)
    expect(lstatSync(CONTENT).isDirectory()).toBe(true)
    expect(readFileSync(join(MAIN, ".epic", "config.json5"), "utf8")).toBe(CONFIG_TEXT)
    expect(readFileSync(join(MAIN, "AGENTS.md"), "utf8")).toBe(AGENTS_TEXT)
    expect(readFileSync(NOTE, "utf8")).toBe("Logs live in app-dev/agents.\n")
  })

  test("the move:  a link left at the old name, every checkout relinked, the config written, comments kept", () => {
    rename.run("app.epics")
    expect(lstatSync(TARGET).isDirectory()).toBe(true)
    expect(lstatSync(CONTENT).isSymbolicLink()).toBe(true)
    expect(readlinkSync(CONTENT)).toBe("app.epics")
    for (const checkout of [MAIN, WORKTREE]) {
      expect(readlinkSync(join(checkout, "epics"))).toBe(relative(checkout, join(TARGET, "epics")))
      expect(readFileSync(join(checkout, "guides", "a.html"), "utf8")).toBe("<h1>A</h1>\n")
    }
    // old paths still work, through the link
    expect(readFileSync(join(CONTENT, "epics", "x", "x.plan.html"), "utf8")).toBe("<h1>X</h1>\n")
    const text = readFileSync(join(MAIN, ".epic", "config.json5"), "utf8")
    expect(text).toContain("// the content repo")
    expect(text).toContain("// its window folder")
    const after = new EpicConfig(MAIN)
    expect(after.contentFolder).toBe(TARGET)
    expect(after.windows.contentName).toBe("app.epics")
    // the files it rewrote;  Claude Code's own settings untouched
    expect(readFileSync(join(MAIN, "AGENTS.md"), "utf8")).toBe(
      AGENTS_TEXT.replace("../app-dev", "../app.epics").replace(CONTENT, TARGET).replace("`app-dev`", "`app.epics`")
    )
    expect(JSON.parse(readFileSync(join(MAIN, ".claude", "settings.json"), "utf8"))).toEqual({
      permissions: { allow: [`Edit(/${TARGET}/**)`], additionalDirectories: [TARGET] }
    })
    expect(readFileSync(NOTE, "utf8")).toBe("Logs live in app.epics/agents.\n")
    expect(readFileSync(join(CLAUDE, "settings.json"), "utf8")).toContain(CONTENT)
  })

  test("refuses:  a folder already renamed (a link), a name that's taken, no name", () => {
    expect(() => rename.run("again")).toThrow(/already a link \(to app\.epics\):  renamed before/)
    const fresh = join(TEMP, "fresh")
    mkdirSync(fresh)
    mkdirSync(join(TEMP, "taken"))
    const other = new SharedRename({ config: { ...config, dir: fresh }, checkouts: [], claudeHome: CLAUDE })
    expect(() => other.run("taken")).toThrow(/is taken/)
    expect(() => other.run(" ")).toThrow(/to what/)
  })

  test("renamed():  the full path, the path from the main checkout and the bare name, each once, whole names only", () => {
    const renamed = (text: string) => SharedRename.renamed(text, "/r/app", "/r/app-dev", "/r/app-dev.epics")
    expect(renamed("/r/app-dev/x ../app-dev app-dev.")).toBe("/r/app-dev.epics/x ../app-dev.epics app-dev.epics.")
    expect(renamed("app-devtools app-dev2 x.app-dev app-dev.md")).toBe("app-devtools app-dev2 x.app-dev app-dev.md")
    // a new place elsewhere:  each form its own
    expect(SharedRename.renamed("/r/app-dev ../app-dev `app-dev`", "/r/app", "/r/app-dev", "/s/docs")).toBe(
      "/s/docs ../../s/docs `docs`"
    )
  })

  test("configText():  a key not written is added;  no file:  a file of the keys;  a path names where it goes", () => {
    // no file:  the defaults, `../spell-app-dev` named `spell-app-dev`
    const empty = SharedRename.configText("", "/r/app", "/r/spell-app-dev", "/r/app.epics")
    expect(empty.keys).toEqual(["contentFolder", "windows.contentName"])
    expect(EpicConfig.settingsFrom(empty.text)).toMatchObject({
      contentFolder: "../app.epics",
      windows: { contentName: "app.epics" }
    })
    const partial = SharedRename.configText('{ "baseBranch": "trunk" }', "/r/app", "/r/app-dev", "/r/app.epics")
    expect(EpicConfig.settingsFrom(partial.text)).toMatchObject({ baseBranch: "trunk", contentFolder: "../app.epics" })
    // a window name of its own:  kept
    const named = SharedRename.configText('{ "windows": { "contentName": "docs" } }', "/r/app", "/r/app-dev", "/r/x")
    expect(named.keys).toEqual(["contentFolder"])
    expect(SharedRename.targetOf("/r/app-dev", "app.epics")).toBe("/r/app.epics")
    expect(SharedRename.targetOf("/r/app-dev", "/elsewhere/app.epics")).toBe("/elsewhere/app.epics")
  })
})

/** Write `text` at `file`, making folders. */
function put(file: string, text: string): void {
  mkdirSync(dirname(file), { recursive: true })
  writeFileSync(file, text)
}
