/**
 * `node --test tests/window.test.mjs`:  how `Window.current()` finds a session's window, `Window.request()`,
 * the worktree windows' moves, and `should-stay`'s advice.
 * - Registry entries go in a temp folder (`SPELL_WINDOWS_DIR`), never `~/.spell/windows`.
 * - The "window" is a stand-in:  our own parent pid (an ancestor, like a session's extension host), a `sleep`
 *   child (alive, but not an ancestor), or a pid that has exited.
 * - The repo the windows are for is a temp one, with no `.epic/config.json5` settings of its own.
 *   - `EPIC_CHECKOUT`, set before the script loads:  it reads the config once
 *   - so it has the defaults, spell-app's OLD layout:
 *     worktrees nested in `.claude/worktrees`, the main root in every window
 *     (its folder is still `spell-app/`, but a window names the main root by the default `windows.repoName`, `spell`)
 *   - Never the checkout the tests run in:  its config moves worktrees beside the repo (spell-epic's since 2ad9973,
 *     spell-app's since epic `epic-eject` T18), and a session's `EPIC_CHECKOUT` picks whichever it's in.
 *   - The layout beside the repo has a test of its own (epic-eject P8), in a child process.
 */
import assert from "node:assert/strict"
import { spawn, spawnSync } from "node:child_process"
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  realpathSync,
  rmSync,
  symlinkSync,
  writeFileSync
} from "node:fs"
import { createServer } from "node:http"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { after, beforeEach, test } from "node:test"

/** The repo the windows are for:  a temp main checkout, its config the defaults. */
const repo = join(mkdtempSync(join(tmpdir(), "spell-windows-repo-")), "spell-app")
mkdirSync(join(repo, ".git"), { recursive: true })
mkdirSync(join(repo, ".epic"))
writeFileSync(join(repo, ".epic", "config.json5"), "{}\n")
// a checkout with a `package.json`, as spell-app is:  its links sit beside it
writeFileSync(join(repo, "package.json"), '{ "name": "spell-app" }\n')
process.env.EPIC_CHECKOUT = repo

/**
 * Claude Code's own folder, a temp one with no plugin lists:  nothing says the end-of-turn hook won't run
 * (`SessionMoves.pluginProblem()`), and the real `~/.claude` is never read.
 */
const claudeHome = mkdtempSync(join(tmpdir(), "spell-windows-claude-"))
process.env.CLAUDE_CONFIG_DIR = claudeHome

const {
  LOOKS,
  Window,
  brokenWorktreeLines,
  claudeSessions,
  codeEnv,
  envCheckout,
  launchPlan,
  look,
  movedWindowFile,
  movedWorkspace,
  moveWindowFiles,
  parseLsof,
  processTable,
  stayAdvice,
  tint,
  titledFor,
  withLook,
  withoutStay,
  withStay,
  worktreeOf
} = await import("spell/epic/window.mjs")

/** The temp registry folder:  spell-epic's bridges' (`Window.registry`). */
const dir = mkdtempSync(join(tmpdir(), "spell-windows-"))
process.env.SPELL_EPIC_WINDOWS_DIR = dir

/** The spell language extension's registry folder, read after spell-epic's:  a temp one too, never `~/.spell/windows`. */
const oldDir = mkdtempSync(join(tmpdir(), "spell-windows-old-"))
process.env.SPELL_WINDOWS_DIR = oldDir

/** A live process that isn't our ancestor:  a `sleep`, killed after the tests. */
const sleeper = spawn("sleep", ["60"], { stdio: "ignore" })

/** A Claude Code session id. */
const SESSION = "476d3ed5-a6ab-45fb-ae80-323bd1948901"

/** A pid that has exited. */
const dead = spawnSync("true").pid

beforeEach(() => {
  rmSync(dir, { recursive: true, force: true })
  mkdirSync(dir)
})

after(() => {
  sleeper.kill()
  rmSync(dir, { recursive: true, force: true })
  rmSync(claudeHome, { recursive: true, force: true })
  rmSync(dirname(repo), { recursive: true, force: true })
})

test("no registry entries:  no window", () => {
  assert.equal(Window.current(), null)
})

test("finds the entry of an ANCESTOR pid (our parent), over a cwd match", () => {
  register(sleeper.pid, ["/repo", process.cwd()])
  register(process.ppid, ["/repo", "/somewhere/else"])
  assert.equal(Window.current()?.pid, process.ppid)
})

test("no ancestor:  falls back to the window with cwd in a folder after the first", () => {
  register(sleeper.pid, ["/repo", process.cwd()])
  assert.equal(Window.current()?.pid, sleeper.pid)
})

test("never matches cwd against the FIRST folder (the repo root, in every window)", () => {
  register(sleeper.pid, [process.cwd(), "/somewhere/else"])
  assert.equal(Window.current(), null)
})

test("skips a dead pid's entry", () => {
  register(dead, ["/repo", process.cwd()])
  assert.equal(Window.current(), null)
})

test("request():  POSTs the op with the token;  throws the window's error", async () => {
  const seen = []
  const server = createServer((request, response) => {
    let body = ""
    request.on("data", (chunk) => (body += chunk))
    request.on("end", () => {
      seen.push({ url: request.url, auth: request.headers.authorization, body: JSON.parse(body) })
      const ok = request.url === "/show-doc"
      response.writeHead(ok ? 200 : 404, { "Content-Type": "application/json" })
      response.end(JSON.stringify(ok ? { ok: true, file: "/x.html" } : { ok: false, error: "unknown op" }))
    })
  })
  await new Promise((done) => server.listen(0, "127.0.0.1", done))
  const window = { pid: process.ppid, port: server.address().port, token: "abc", folders: [] }
  try {
    assert.deepEqual(await Window.request("show-doc", { file: "/x.html" }, window), { ok: true, file: "/x.html" })
    assert.deepEqual(seen[0], { url: "/show-doc", auth: "Bearer abc", body: { file: "/x.html" } })
    await assert.rejects(Window.request("nope", {}, window), /`nope` failed:  unknown op/)
  } finally {
    server.close()
  }
})

test("show():  sends `show-doc` to this session's window, with `hash` and `view` only when given", async () => {
  const seen = []
  const server = createServer((request, response) => {
    let body = ""
    request.on("data", (chunk) => (body += chunk))
    request.on("end", () => {
      seen.push(JSON.parse(body))
      response.writeHead(200, { "Content-Type": "application/json" })
      response.end(JSON.stringify({ ok: true }))
    })
  })
  await new Promise((done) => server.listen(0, "127.0.0.1", done))
  const window = { pid: process.ppid, port: server.address().port, token: "t", folders: [], workspaceFile: null }
  writeFileSync(join(dir, `${process.ppid}.json`), JSON.stringify(window))
  try {
    // no session:  nothing pending, so straight to the window
    assert.equal((await Window.show("/a.html", { sessionId: "" })).window.pid, process.ppid)
    await Window.show("/b.html", { hash: "q3", view: "review", sessionId: "" })
    assert.deepEqual(seen, [{ file: "/a.html" }, { file: "/b.html", hash: "q3", view: "review" }])
  } finally {
    server.close()
  }
})

test("reload:  sends the bridge's `reload-view` with the view to this session's window;  needs no target", async () => {
  const seen = []
  const server = createServer((request, response) => {
    let body = ""
    request.on("data", (chunk) => (body += chunk))
    request.on("end", () => {
      seen.push({ op: request.url, ...JSON.parse(body) })
      const known = request.url === "/reload-view"
      response.writeHead(known ? 200 : 404, { "Content-Type": "application/json" })
      response.end(JSON.stringify(known ? { ok: true, url: "http://127.0.0.1:4747/x.html?t=1" } : { ok: false }))
    })
  })
  await new Promise((done) => server.listen(0, "127.0.0.1", done))
  const window = { pid: process.ppid, port: server.address().port, token: "t", folders: [], workspaceFile: null }
  writeFileSync(join(dir, `${process.ppid}.json`), JSON.stringify(window))
  try {
    assert.equal(await Window.main(["reload"]), 0)
    assert.equal(await Window.main(["reload", "--review"]), 0)
    assert.deepEqual(seen, [
      { op: "/reload-view", view: "docs" },
      { op: "/reload-view", view: "review" }
    ])
  } finally {
    server.close()
  }
})

test("request():  no window, or none listening, throws a clear error", async () => {
  await assert.rejects(Window.request("show-doc", {}, null), /no window/)
  const window = { pid: process.ppid, port: 1, token: "abc", folders: [] }
  await assert.rejects(Window.request("show-doc", {}, window), /didn't answer on port 1/)
})

test("a worktree's window:  the main root first, then the worktree's root, then the shared content repo;  theme, tinted", () => {
  const workspace = Window.worktreeWorkspace("ui", "seo")
  // the file's in the content folder's windows/ongoing (epic-eject P13):  paths relative to it
  assert.deepEqual(workspace.folders, [
    { path: "../../../spell-app", name: "spell" },
    { path: "../../../spell-app/.claude/worktrees/seo", name: "⎇ seo" },
    // `[]` on a machine without `../spell-app-dev`
    ...Window.sharedFolder(dirname(Window.worktreeFile("seo")))
  ])
  assert.equal(workspace.spell.package, "ui")
  assert.equal(workspace.settings["workbench.colorTheme"], Window.theme("ui"))
  assert.deepEqual(workspace.settings["workbench.colorCustomizations"], tint("seo"))
  assert.match(Window.worktreeFile("seo"), /\/spell-app-dev\/windows\/ongoing\/seo\.code-workspace$/)
})

test("looks:  twelve names, Tomorrow Night Blue re-hued;  blue IS the theme;  an unknown name lists them", () => {
  assert.equal(Object.keys(LOOKS).length, 12)
  const blue = look("blue")
  assert.equal(blue.theme, "Tomorrow Night Blue")
  assert.equal(blue.colors["editor.background"], "#002451")
  assert.equal(blue.colors["progressBar.background"], "#bbdaffcc")
  const purple = look("Purple")
  assert.notEqual(purple.colors["editor.background"], "#002451")
  // alpha kept, lightness kept:  the purple badge is as light as the blue one
  assert.match(purple.colors["badge.background"], /^#[0-9a-f]{6}cc$/)
  assert.throws(() => look("magenta"), /no look "magenta":  red, orange/)
})

test("withLook:  the theme, the look's colours scoped to it;  a global colour it sets goes, Owen's others stay", () => {
  const settings = {
    "workbench.colorTheme": "Abyss",
    "workbench.colorCustomizations": { "editor.background": "#000000", "editorCursor.foreground": "#ff0000" }
  }
  withLook(settings, "teal")
  assert.equal(settings["workbench.colorTheme"], "Tomorrow Night Blue")
  const custom = settings["workbench.colorCustomizations"]
  assert.equal(custom["editor.background"], undefined)
  assert.equal(custom["editorCursor.foreground"], "#ff0000")
  assert.deepEqual(custom["[Tomorrow Night Blue]"], look("teal").colors)
})

test("stay:  titled ⎇ <name>, tinted in its theme's scope;  --end puts back exactly what was there", () => {
  const before = {
    settings: {
      "workbench.colorTheme": "Tomorrow Night Blue",
      "window.title": "mine",
      "workbench.colorCustomizations": {
        "[Tomorrow Night Blue]": { "titleBar.activeBackground": "#123456", x: "#fff" }
      }
    },
    spell: { package: "docs" }
  }
  const workspace = structuredClone(before)
  withStay(workspace, "quick-open")
  assert.equal(
    workspace.settings["window.title"],
    "${dirty}${activeEditorShort}${separator}⎇ quick-open${separator}${appName}"
  )
  assert.equal(
    workspace.settings["workbench.colorCustomizations"]["[Tomorrow Night Blue]"]["titleBar.activeBackground"],
    tint("quick-open")["titleBar.activeBackground"]
  )
  // a second stay keeps the first one's record of what to put back
  withStay(workspace, "seo")
  assert.equal(workspace.spell.stay.name, "seo")
  assert.equal(withoutStay(workspace), true)
  assert.deepEqual(workspace, before)
  assert.equal(withoutStay(workspace), false)
})

test("a worktree's window:  --color gives it that look;  else the look of the window it's opened from, no stay tint", () => {
  const colored = Window.worktreeWorkspace("ui", "seo", { color: "green" })
  assert.equal(colored.settings["workbench.colorTheme"], "Tomorrow Night Blue")
  assert.deepEqual(colored.settings["workbench.colorCustomizations"]["[Tomorrow Night Blue]"], look("green").colors)
  const from = withStay({ settings: withLook({}, "purple") }, "other")
  const inherited = Window.worktreeWorkspace("ui", "seo", { from })
  assert.deepEqual(inherited.settings["workbench.colorCustomizations"], {
    "[Tomorrow Night Blue]": look("purple").colors
  })
  assert.equal(inherited.settings["window.title"], undefined)
  assert.ok(from.spell.stay, "the source window's file is left as it was")
})

test("a worktree's window hides the MAIN root's files (beside `.spell-main`), never `packages` outright", () => {
  const exclude = Window.worktreeWorkspace("ui", "seo").settings["files.exclude"]
  assert.deepEqual(exclude["*"], { when: ".spell-main" })
  assert.equal(exclude.packages, undefined)
  assert.equal(exclude[".claude/worktrees"], true)
})

test("worktrees beside the repo (epic-eject P8):  a worktree-only window;  an old nested worktree keeps the old one", () => {
  // a repo of its own, its config moving worktrees beside it:  `CONFIG` is read once, so in a child process
  const top = mkdtempSync(join(tmpdir(), "window-beside-"))
  const repo = join(top, "repo")
  mkdirSync(join(repo, ".git", "worktrees"), { recursive: true })
  mkdirSync(join(repo, ".epic"))
  writeFileSync(join(repo, ".epic", "config.json5"), '{ "worktreesFolder": "../repo.worktrees" }')
  mkdirSync(join(repo, ".claude", "worktrees", "old"), { recursive: true })
  const code =
    // by an env var, not an argument:  the script runs its CLI when it's `argv[1]`
    "const { Window } = await import(process.env.WINDOW_SCRIPT);" +
    'console.log(JSON.stringify({ seo: Window.worktreeWorkspace("ui", "seo"), old: Window.worktreeWorkspace("ui", "old"), ' +
    "exclude: Window.filesExclude() }))"
  const run = spawnSync(process.execPath, ["--input-type=module", "-e", code], {
    encoding: "utf8",
    env: { ...process.env, EPIC_CHECKOUT: repo, WINDOW_SCRIPT: join(import.meta.dirname, "..", "src", "window.mjs") }
  })
  rmSync(top, { recursive: true, force: true })
  assert.equal(run.status, 0, run.stderr)
  const { seo, old, exclude } = JSON.parse(run.stdout)
  // no main checkout, nothing of main's hidden
  assert.deepEqual(seo.folders, [{ path: "../../../repo.worktrees/seo", name: "⎇ seo" }])
  assert.equal(seo.settings["files.exclude"]["*"], undefined)
  // the old layout:  main first, its files hidden beside the marker
  assert.deepEqual(
    old.folders.map(({ name }) => name),
    ["spell", "⎇ old"]
  )
  assert.deepEqual(old.settings["files.exclude"]["*"], { when: ".spell-main" })
  // the old place is still hidden in every window while worktrees may be left there
  assert.equal(exclude[".claude/worktrees"], true)
})

test("a repo with no `packages/` (spell-epic, I15):  `open` writes the whole repo's window first;  `init` puts the content folder back, and the repo's own settings in", () => {
  // a repo of its own, as spell-epic's:  its default window named for it, worktrees and the content folder beside it
  const top = mkdtempSync(join(tmpdir(), "window-plain-"))
  const repo = join(top, "repo")
  mkdirSync(join(repo, ".git", "worktrees"), { recursive: true })
  mkdirSync(join(repo, ".epic"))
  writeFileSync(
    join(repo, ".epic", "config.json5"),
    JSON.stringify({
      worktreesFolder: "../repo.worktrees",
      contentFolder: "../repo.epics",
      windows: {
        default: "repo",
        repoName: "repo",
        contentName: "repo.epics",
        worktreeOnly: true,
        // every window file gets these (epic intellisense P4)
        settings: { "js/ts.experimental.useTsgo": false }
      }
    })
  )
  mkdirSync(join(top, "repo.epics"))
  mkdirSync(join(top, "repo.worktrees", "seo"), { recursive: true })
  // an ongoing window file without the content folder (written while it was missing):
  // in the windows folder, the content folder's windows/
  const ongoing = join(top, "repo.epics", "windows", "ongoing")
  mkdirSync(ongoing, { recursive: true })
  writeFileSync(
    join(ongoing, "old.code-workspace"),
    JSON.stringify({ folders: [{ path: "../../../repo.worktrees/old", name: "⎇ old" }], settings: {} })
  )
  const code =
    "const { Window } = await import(process.env.WINDOW_SCRIPT);" +
    "const { readFileSync } = await import('node:fs');" +
    'const { file } = Window.open("seo", "repo", { fromCurrent: false, noOpen: true });' +
    "const read = (path) => JSON.parse(readFileSync(path, 'utf8'));" +
    "const repoWindow = read(Window.file('repo'));" +
    "const written = Window.init();" +
    "console.log(JSON.stringify({ seo: read(file), repoWindow, written, old: read(process.env.OLD) }))"
  const run = spawnSync(process.execPath, ["--input-type=module", "-e", code], {
    encoding: "utf8",
    env: {
      ...process.env,
      EPIC_CHECKOUT: repo,
      OLD: join(ongoing, "old.code-workspace"),
      WINDOW_SCRIPT: join(import.meta.dirname, "..", "src", "window.mjs")
    }
  })
  rmSync(top, { recursive: true, force: true })
  assert.equal(run.status, 0, run.stderr)
  const { seo, repoWindow, written, old } = JSON.parse(run.stdout)
  // no "no package repo":  the whole repo's window written by `open`, the repo then the content folder,
  // each relative to the file, in the content folder's windows/
  assert.deepEqual(repoWindow.folders, [
    { path: "../../repo", name: "repo" },
    { path: "..", name: "repo.epics" }
  ])
  // the worktree's window:  its own folder, then the content folder
  assert.deepEqual(
    seo.folders.map(({ name }) => name),
    ["⎇ seo", "repo.epics"]
  )
  // `init` gives the old file its content folder, second;  the repo's window is there already
  assert.deepEqual(old.folders, [
    { path: "../../../repo.worktrees/old", name: "⎇ old" },
    { path: "../..", name: "repo.epics" }
  ])
  assert.ok(written.includes("../repo.epics/windows/ongoing/old.code-workspace"))
  assert.ok(!written.includes("../repo.epics/windows/repo.code-workspace"))
  // the repo's own settings (`windows.settings`):  in each new file, and `init` writes them into an old one
  for (const workspace of [seo, repoWindow, old]) assert.equal(workspace.settings["js/ts.experimental.useTsgo"], false)
})

test("a repo moved behind a compat link (I59):  `init` drops the content folder that's gone, adds the one found", () => {
  // spell-epic moved to spell/, its content folder to spell/new.epics, links at the old names;
  // its config still names `../repo.epics`, which only the OLD spelling of the checkout finds
  const top = realpathSync(mkdtempSync(join(tmpdir(), "window-moved-")))
  const real = join(top, "spell", "repo")
  mkdirSync(join(real, ".git"), { recursive: true })
  mkdirSync(join(real, ".epic"))
  writeFileSync(
    join(real, ".epic", "config.json5"),
    JSON.stringify({
      worktreesFolder: "../repo.worktrees",
      contentFolder: "../repo.epics",
      windowsFolder: "workspaces",
      windows: { default: "repo", repoName: "repo", contentName: "repo.epics", worktreeOnly: true }
    })
  )
  mkdirSync(join(top, "spell", "new.epics"))
  mkdirSync(join(top, "spell", "repo.worktrees", "seo"), { recursive: true })
  mkdirSync(join(top, "old"))
  symlinkSync("../spell/repo", join(top, "old", "repo"))
  symlinkSync("../spell/new.epics", join(top, "old", "repo.epics"))
  // a worktree's window file from before the move:  its content folder `../../../repo.epics`, gone from spell/
  const ongoing = join(real, "workspaces", "ongoing")
  mkdirSync(ongoing, { recursive: true })
  writeFileSync(
    join(ongoing, "seo.code-workspace"),
    JSON.stringify({
      folders: [
        { path: "../../../repo.worktrees/seo", name: "⎇ seo" },
        { path: "../../../repo.epics", name: "repo.epics" }
      ],
      settings: {}
    })
  )
  const code =
    "const { Window } = await import(process.env.WINDOW_SCRIPT);" +
    "const { readFileSync } = await import('node:fs');" +
    "const written = Window.init();" +
    "console.log(JSON.stringify({ written, seo: JSON.parse(readFileSync(process.env.SEO, 'utf8')) }))"
  const run = spawnSync(process.execPath, ["--input-type=module", "-e", code], {
    encoding: "utf8",
    env: {
      ...process.env,
      // the checkout by its OLD spelling, as a session started before the move has it
      EPIC_CHECKOUT: join(top, "old", "repo"),
      SEO: join(ongoing, "seo.code-workspace"),
      WINDOW_SCRIPT: join(import.meta.dirname, "..", "src", "window.mjs")
    }
  })
  rmSync(top, { recursive: true, force: true })
  assert.equal(run.status, 0, run.stderr)
  const { written, seo } = JSON.parse(run.stdout)
  // the dead entry gone, the content folder where it really is, second
  assert.deepEqual(seo.folders, [
    { path: "../../../repo.worktrees/seo", name: "⎇ seo" },
    { path: "../../../new.epics", name: "repo.epics" }
  ])
  assert.ok(written.includes("workspaces/ongoing/seo.code-workspace"))
  // said, with what to change
  assert.match(
    run.stderr,
    /contentFolder \.\.\/repo\.epics is missing beside .*spell\/repo;  using .*spell\/new\.epics/
  )
})

test("a package window:  the whole branch, then the shared repo;  shared links shown only under the shared repo", () => {
  const workspace = Window.workspace("ui")
  assert.deepEqual(workspace.folders, [
    { path: "../../spell-app", name: "spell" },
    ...Window.sharedFolder(dirname(Window.file("ui")))
  ])
  const exclude = workspace.settings["files.exclude"]
  // a checkout's links sit beside its package.json;  the shared repo's real folders don't
  assert.deepEqual(exclude.epics, { when: "package.json" })
  assert.deepEqual(exclude.agents, { when: "package.json" })
  assert.equal(exclude["*"], undefined)
  assert.equal(exclude.packages, undefined)
})

test("movedWorkspace():  each folder path made relative to the new place;  every other byte kept", () => {
  // Owen's layout, a comment and a trailing comma (JSONC), an absolute path, a "path" outside the folders
  const text = `{
  // my window
  "folders": [
    { "path": "..", "name": "spell-app" },
    {
      "path": "../../spell-app.epics",
      "name": "spell-app.epics"
    },
    { "path": "/abs/elsewhere" },
  ],
  "settings": { "workbench.colorTheme": "Monokai", "x.path": "..", "path": ".." }
}
`
  const from = "/top/spell-app/workspaces"
  const to = "/top/spell-app.epics/windows"
  const { text: moved, folders } = movedWorkspace(text, from, to)
  assert.deepEqual(folders, [
    ["..", "../../spell-app"],
    ["../../spell-app.epics", ".."],
    ["/abs/elsewhere", "/abs/elsewhere"]
  ])
  assert.equal(
    moved,
    text
      .replace('{ "path": "..", "name": "spell-app" }', '{ "path": "../../spell-app", "name": "spell-app" }')
      .replace('"path": "../../spell-app.epics"', '"path": ".."')
  )
  // no folders list:  as it was
  assert.deepEqual(movedWorkspace('{ "settings": {} }', from, to), { text: '{ "settings": {} }', folders: [] })
})

test("movedWindowFile():  a window file gone from the old place is read from the new one", () => {
  const top = mkdtempSync(join(tmpdir(), "window-moved-"))
  const from = join(top, "spell-app", "workspaces")
  const to = join(top, "spell-app.epics", "windows")
  const old = join(from, "ongoing", "seo.code-workspace")
  const moved = join(to, "ongoing", "seo.code-workspace")
  // neither there:  as it was
  assert.equal(movedWindowFile(old, from, to), old)
  mkdirSync(dirname(moved), { recursive: true })
  writeFileSync(moved, "{}\n")
  assert.equal(movedWindowFile(old, from, to), moved)
  // the old one still there:  it's the one the window shows
  mkdirSync(dirname(old), { recursive: true })
  writeFileSync(old, "{}\n")
  assert.equal(movedWindowFile(old, from, to), old)
  // outside the old folder:  never mapped
  const elsewhere = join(top, "elsewhere", "ongoing", "seo.code-workspace")
  assert.equal(movedWindowFile(elsewhere, from, to), elsewhere)
  rmSync(top, { recursive: true, force: true })
})

test("moveWindowFiles():  package and worktree windows carried over, the old ones kept;  idempotent;  never overwrites", () => {
  const top = mkdtempSync(join(tmpdir(), "window-move-"))
  const from = join(top, "spell-app", "workspaces")
  const to = join(top, "spell-app.epics", "windows")
  mkdirSync(join(from, "ongoing"), { recursive: true })
  const ui =
    '{\n  "folders": [{ "path": "..", "name": "spell-app" }],\n  "settings": { "workbench.colorTheme": "Red" }\n}\n'
  const seo = JSON.stringify({ folders: [{ path: "../../../spell-app.worktrees/seo", name: "⎇ seo" }] })
  writeFileSync(join(from, "ui.code-workspace"), ui)
  writeFileSync(join(from, "ongoing", "seo.code-workspace"), seo)
  writeFileSync(join(from, "notes.txt"), "not a window file")
  try {
    // a dry run writes nothing
    const dry = moveWindowFiles(from, to, { dryRun: true })
    assert.deepEqual(
      dry.map(({ file, action }) => [file, action]),
      [
        ["ui.code-workspace", "would move"],
        ["ongoing/seo.code-workspace", "would move"]
      ]
    )
    assert.equal(existsSync(to), false)
    // the move:  each path still leads where it did
    moveWindowFiles(from, to)
    const movedUi = JSON.parse(readFileSync(join(to, "ui.code-workspace"), "utf8"))
    assert.equal(join(to, movedUi.folders[0].path), join(top, "spell-app"))
    assert.equal(movedUi.settings["workbench.colorTheme"], "Red")
    const movedSeo = JSON.parse(readFileSync(join(to, "ongoing", "seo.code-workspace"), "utf8"))
    assert.equal(join(to, "ongoing", movedSeo.folders[0].path), join(top, "spell-app.worktrees", "seo"))
    assert.equal(existsSync(join(to, "notes.txt")), false)
    // the old files untouched
    assert.equal(readFileSync(join(from, "ui.code-workspace"), "utf8"), ui)
    assert.equal(readFileSync(join(from, "ongoing", "seo.code-workspace"), "utf8"), seo)
    // again:  up to date;  a file changed since (Owen's new theme) is kept
    writeFileSync(join(to, "ui.code-workspace"), "{}")
    assert.deepEqual(
      moveWindowFiles(from, to).map(({ action }) => action),
      ["kept", "up to date"]
    )
    assert.equal(readFileSync(join(to, "ui.code-workspace"), "utf8"), "{}")
  } finally {
    rmSync(top, { recursive: true, force: true })
  }
})

test("tint():  a dark hue per name, the same every time", () => {
  const colours = tint("seo")
  assert.match(colours["titleBar.activeBackground"], /^#[0-9a-f]{6}$/)
  assert.deepEqual(tint("seo"), colours)
  assert.notEqual(tint("docs-index")["titleBar.activeBackground"], colours["titleBar.activeBackground"])
  const [r, g, b] = colours["titleBar.activeBackground"]
    .slice(1)
    .match(/../g)
    .map((hex) => parseInt(hex, 16))
  assert.ok(Math.max(r, g, b) < 0xb0, "dark enough for white text")
})

test("packageOf():  a package window's package, else null", () => {
  assert.equal(Window.packageOf({ workspaceFile: Window.file("ui") }), "ui")
  assert.equal(Window.packageOf({ workspaceFile: Window.worktreeFile("seo") }), null)
  // a window still open from its file's place before epic-eject P13
  assert.equal(Window.packageOf({ workspaceFile: "/repo/workspaces/ui.code-workspace" }), "ui")
  assert.equal(Window.packageOf({ workspaceFile: "/repo/workspaces/ongoing/seo.code-workspace" }), null)
  assert.equal(Window.packageOf(null), null)
})

test("close():  asks the worktree's window to close", async () => {
  const seen = []
  const server = createServer((request, response) => {
    seen.push(request.url)
    request.resume()
    response.writeHead(200, { "Content-Type": "application/json" })
    response.end(JSON.stringify({ ok: true, closing: true }))
  })
  await new Promise((done) => server.listen(0, "127.0.0.1", done))
  const name = `test-${process.pid}`
  const entry = { pid: process.ppid, port: server.address().port, token: "t", folders: [] }
  entry.workspaceFile = Window.worktreeFile(name)
  writeFileSync(join(dir, `${process.ppid}.json`), JSON.stringify(entry))
  try {
    assert.equal(await Window.close(name), true)
    assert.deepEqual(seen, ["/close-window"])
    assert.equal(await Window.close("not-open"), false)
  } finally {
    server.close()
  }
})

test("resume():  opens the session in the target window, then closes its tab, or its window, in the old one", async () => {
  const seen = []
  const server = createServer((request, response) => {
    let body = ""
    request.on("data", (chunk) => (body += chunk))
    request.on("end", () => {
      seen.push([request.url, JSON.parse(body)])
      response.writeHead(200, { "Content-Type": "application/json" })
      response.end(JSON.stringify({ ok: true, closed: true }))
    })
  })
  await new Promise((done) => server.listen(0, "127.0.0.1", done))
  const to = join(dir, "target.code-workspace")
  const port = server.address().port
  writeFileSync(to, "{}")
  const target = { pid: process.ppid, port, token: "t", folders: [], workspaceFile: to }
  writeFileSync(join(dir, `${process.ppid}.json`), JSON.stringify(target))
  const old = { pid: sleeper.pid, port, token: "t", folders: [], workspaceFile: null }
  writeFileSync(join(dir, `${sleeper.pid}.json`), JSON.stringify(old))
  const remove = join(dir, "remove-me")
  writeFileSync(remove, "")
  try {
    const tab = { sessionId: SESSION, to, from: sleeper.pid, close: "tab", remove: null }
    const expected = { opened: true, closed: true, matches: undefined, shown: undefined }
    assert.deepEqual(await Window.resume(tab, "isolate-me"), expected)
    assert.deepEqual(seen.splice(0), [
      ["/open-session", { sessionId: SESSION }],
      ["/close-session-tab", { titles: ["isolate-me"] }]
    ])
    // a doc asked for while the move was pending:  shown beside the session, before the old tab closes
    const show = { file: "/plan.html", hash: "p2" }
    assert.equal((await Window.resume({ ...tab, show }, "isolate-me")).shown, true)
    assert.deepEqual(seen.splice(0), [
      ["/open-session", { sessionId: SESSION }],
      ["/show-doc", show],
      ["/close-session-tab", { titles: ["isolate-me"] }]
    ])
    // ... in the tab it was asked for
    const review = { file: "/plan.html", view: "review" }
    assert.equal((await Window.resume({ ...tab, show: review }, "isolate-me")).shown, true)
    assert.deepEqual(seen.splice(0)[1], ["/show-doc", review])
    // a prompt to type into the new tab, and every title the old tab may show
    assert.equal((await Window.resume({ ...tab, prompt: "continue" }, ["iso", "Claude's title"])).closed, true)
    assert.deepEqual(seen.splice(0), [
      ["/open-session", { sessionId: SESSION, prompt: "continue" }],
      ["/close-session-tab", { titles: ["iso", "Claude's title"] }]
    ])
    // no title at all:  the old tab can't be found, so stays
    assert.equal((await Window.resume(tab)).closed, false)
    assert.deepEqual(seen.splice(0), [["/open-session", { sessionId: SESSION }]])
    const window = { ...tab, close: "window", remove }
    assert.equal((await Window.resume(window)).closed, true)
    assert.deepEqual(seen.splice(0), [
      ["/open-session", { sessionId: SESSION }],
      ["/close-window", {}]
    ])
    assert.equal(existsSync(remove), false)
    await assert.rejects(Window.resume({ ...tab, sessionId: "nope" }), /bad session id/)
  } finally {
    server.close()
  }
})

test("handoff():  records the move, keyed by session;  needs a session and the window file", () => {
  const name = `test-${process.pid}`
  assert.throws(() => Window.handoff(name, undefined), /no session/)
  assert.throws(() => Window.handoff(name, SESSION), /no window file/)
  mkdirSync(dirname(Window.worktreeFile(name)), { recursive: true })
  writeFileSync(Window.worktreeFile(name), JSON.stringify(Window.worktreeWorkspace("ui", name)))
  sawHooks(SESSION)
  try {
    const handoff = Window.handoff(name, SESSION)
    assert.equal(handoff.to, Window.worktreeFile(name))
    assert.equal(handoff.close, "tab")
    assert.equal(handoff.prompt, null)
    assert.deepEqual(JSON.parse(readFileSync(Window.handoffFile(SESSION), "utf8")), handoff)
    assert.equal(Window.handoff(name, SESSION, { prompt: "continue" }).prompt, "continue")
    // not in the worktree's window:  nothing to move back
    assert.equal(Window.handoff(name, SESSION, { back: true }), null)
    const worktree = { pid: process.ppid, port: 1, token: "t", folders: [], workspaceFile: Window.worktreeFile(name) }
    writeFileSync(join(dir, `${process.ppid}.json`), JSON.stringify(worktree))
    const back = Window.handoff(name, SESSION, { back: true })
    assert.equal(back.to, Window.file("ui"))
    assert.equal(back.to.includes(".claude"), false)
    assert.equal(back.close, "window")
    assert.equal(back.remove, Window.worktreeFile(name))
  } finally {
    rmSync(Window.worktreeFile(name), { force: true })
  }
})

test("show():  while a move is pending, the doc waits for the target window;  the last one wins", async () => {
  const record = { sessionId: SESSION, to: "/repo/workspaces/ongoing/seo.code-workspace", show: null }
  mkdirSync(Window.handoffs, { recursive: true })
  writeFileSync(Window.handoffFile(SESSION), JSON.stringify(record))
  try {
    assert.deepEqual(await Window.show("/a.html", { sessionId: SESSION }), { later: record.to })
    assert.deepEqual(await Window.show("/b.html", { hash: "g1", sessionId: SESSION }), { later: record.to })
    const { show } = JSON.parse(readFileSync(Window.handoffFile(SESSION), "utf8"))
    assert.deepEqual(show, { file: "/b.html", hash: "g1" })
    // the Review tab:  the record keeps `view`, for `resume` to send
    await Window.show("/c.html", { view: "review", sessionId: SESSION })
    assert.deepEqual(JSON.parse(readFileSync(Window.handoffFile(SESSION), "utf8")).show, {
      file: "/c.html",
      view: "review"
    })
  } finally {
    rmSync(Window.handoffFile(SESSION), { force: true })
  }
  // nothing pending, and no window:  `request()`'s error
  await assert.rejects(Window.show("/a.html", { sessionId: SESSION }), /no window/)
})

test("processTable() + claudeSessions():  a window's sessions are its extension host's `claude` children", () => {
  const ps = [
    "  100     1 /Applications/Visual Studio Code.app/Contents/MacOS/Code",
    "  200   100 /Applications/Visual Studio Code.app/Contents/Frameworks/Code Helper (Plugin).app/Contents/MacOS/Code Helper (Plugin)",
    "  301   200 /Users/o/.vscode/extensions/anthropic.claude-code-2.1.288-darwin-arm64/resources/native-binary/claude",
    "  302   200 /Users/o/.vscode/extensions/anthropic.claude-code-2.1.288-darwin-arm64/resources/native-binary/claude",
    "  303   200 node",
    "  400   999 /Users/o/.local/bin/claude"
  ].join("\n")
  const processes = processTable(ps)
  assert.deepEqual(processes.get(200), {
    ppid: 100,
    command:
      "/Applications/Visual Studio Code.app/Contents/Frameworks/Code Helper (Plugin).app/Contents/MacOS/Code Helper (Plugin)"
  })
  assert.deepEqual(claudeSessions(processes, 200), [301, 302])
  assert.deepEqual(claudeSessions(processes, 999), [400])
})

test("parseLsof() + worktreeOf():  each session's folder, and the worktree it's in", () => {
  const cwds = parseLsof("p301\nfcwd\nn/repo/.claude/worktrees/seo/packages/ui\np302\nfcwd\nn/repo\n")
  assert.deepEqual(
    [...cwds],
    [
      [301, "/repo/.claude/worktrees/seo/packages/ui"],
      [302, "/repo"]
    ]
  )
  assert.equal(worktreeOf(cwds.get(301)), "seo")
  assert.equal(worktreeOf(cwds.get(302)), null)
  assert.equal(worktreeOf(null), null)
})

test("stayAdvice():  stay when it's the window's only session;  else a window of its own, saying why", () => {
  const window = { pid: 200 }
  const alone = stayAdvice({ window })
  assert.equal(alone.recommend, "stay")
  assert.equal(alone.reasons.length, 1)
  assert.match(stayAdvice({ window, epic: true }).reasons.join(), /side bar/)

  const shared = stayAdvice({
    window,
    others: [
      { pid: 301, cwd: "/repo/.claude/worktrees/seo" },
      { pid: 302, cwd: "/repo" }
    ]
  })
  assert.equal(shared.recommend, "window")
  assert.deepEqual(shared.others, [
    { pid: 301, worktree: "seo" },
    { pid: 302, worktree: null }
  ])
  assert.match(shared.reasons[0], /2 other sessions share this window \(worktree `seo`, the main checkout\)/)
  assert.match(shared.reasons.join(), /Source Control/)

  const main = stayAdvice({ window, others: [{ pid: 302, cwd: "/repo" }], epic: true })
  assert.equal(main.recommend, "window")
  assert.match(main.reasons[0], /^another session shares this window \(the main checkout\)/)
  assert.doesNotMatch(main.reasons.join(), /Source Control/)
  assert.match(main.reasons.join(), /epic page/)

  // no bridge:  a new window can't open, so staying is all there is
  assert.equal(stayAdvice({ window: null, others: [{ pid: 302, cwd: "/repo" }] }).recommend, "stay")
})

test("launchPlan():  wake the epic's running session;  else a new one in its open window;  open it only when it's closed", () => {
  const session = (id, more = {}) => ({
    sessionId: id,
    title: "🚧 seo",
    self: false,
    inWindow: true,
    window: {},
    ...more
  })
  const plan = (windowOpen, sessions) => {
    const { action, rewrite, open, start, wake } = launchPlan({ windowOpen, sessions })
    return { action, rewrite, open, start, wake: wake?.sessionId ?? null }
  }
  const neither = { rewrite: false, open: false, start: false, wake: null }
  // Owen's r2:  the epic's window open, its session running there:  typed into it, the window file left alone
  assert.deepEqual(plan(true, [session("a")]), { ...neither, action: "wake", wake: "a" })
  // its window open, no session:  a new one there, still no rewrite
  assert.deepEqual(plan(true, []), { ...neither, action: "start", start: true })
  // closed, nothing running:  the old way, a fresh look
  assert.deepEqual(plan(false, []), { action: "open", rewrite: true, open: true, start: true, wake: null })
  // closed, but its session runs in another window (it stayed in a main one):  woken there
  assert.deepEqual(plan(false, [session("b", { inWindow: false })]), { ...neither, action: "wake", wake: "b" })
  // its window's own session wins over one elsewhere
  assert.deepEqual(plan(true, [session("b", { inWindow: false }), session("a")]), {
    ...neither,
    action: "wake",
    wake: "a"
  })
  // several:  nothing typed;  a terminal's:  nothing either;  the caller is the epic's own:  nothing to wake
  const several = launchPlan({ windowOpen: true, sessions: [session("a"), session("c")] })
  assert.equal(several.action, "several")
  assert.deepEqual(
    several.sessions.map((it) => it.sessionId),
    ["a", "c"]
  )
  assert.deepEqual(plan(false, [session("a", { window: null, inWindow: false })]), { ...neither, action: "no-window" })
  assert.deepEqual(plan(true, [session("a", { self: true })]), { ...neither, action: "own" })
})

test("titledFor():  the epic's name, without the icon, or as a whole word in the title", () => {
  assert.equal(titledFor("🚧 epic-eject", "epic-eject"), true)
  assert.equal(titledFor("epic-eject review", "epic-eject"), true)
  assert.equal(titledFor("epic-eject-2", "epic-eject"), false)
  assert.equal(titledFor("try-layout", "epic-eject"), false)
  assert.equal(titledFor("", "epic-eject"), false)
})

test("launch():  the epic's window open, its session running:  typed into it;  none:  a new one;  no window file written", async () => {
  const seen = []
  const server = createServer((request, response) => {
    let body = ""
    request.on("data", (chunk) => (body += chunk))
    request.on("end", () => {
      seen.push([request.url, JSON.parse(body)])
      response.writeHead(200, { "Content-Type": "application/json" })
      response.end(JSON.stringify({ ok: true }))
    })
  })
  await new Promise((done) => server.listen(0, "127.0.0.1", done))
  const name = `test-launch-${process.pid}`
  const file = Window.worktreeFile(name)
  // the epic's window:  this test process, the sessions' parent (a window's extension host)
  const entry = { pid: process.pid, port: server.address().port, token: "t", folders: [], workspaceFile: file }
  writeFileSync(join(dir, `${process.pid}.json`), JSON.stringify(entry))
  const home = mkdtempSync(join(tmpdir(), "spell-claude-home-"))
  mkdirSync(join(home, "sessions"))
  // this test's own Claude Code folder, the module's put back after
  process.env.CLAUDE_CONFIG_DIR = home
  const record = (id, title) =>
    writeFileSync(
      join(home, "sessions", `${id}.json`),
      JSON.stringify({ pid: sleeper.pid, sessionId: id, name: title })
    )
  try {
    record(SESSION, `🚧 ${name}`)
    record("other", "try-layout")
    const woken = await Window.launch(name, "spell-app", { prompt: "/epic request x r1" })
    assert.equal(woken.action, "wake")
    assert.deepEqual(seen.splice(0), [["/open-session", { sessionId: SESSION, prompt: "/epic request x r1" }]])
    rmSync(join(home, "sessions", `${SESSION}.json`))
    assert.equal((await Window.launch(name, "spell-app", { prompt: "/epic x" })).action, "start")
    assert.deepEqual(seen.splice(0), [["/open-session", { prompt: "/epic x" }]])
    // never written:  an open window's file changing would recolour it, live
    assert.equal(existsSync(file), false)
  } finally {
    process.env.CLAUDE_CONFIG_DIR = claudeHome
    rmSync(home, { recursive: true, force: true })
    server.close()
  }
})

test("codeEnv() + envCheckout():  a window never inherits the engine's checkout;  one that names no folder is left out", () => {
  // epic `epic-engine` P9:  a window `code` opened carried `EPIC_CHECKOUT` into every session in it
  const env = { PATH: "/bin", EPIC_CHECKOUT: repo, TSX_TSCONFIG_PATH: "/t/tsconfig.json", INIT_CWD: "/x", HOME: "/h" }
  assert.deepEqual(codeEnv(env), { PATH: "/bin", HOME: "/h" })
  assert.equal(envCheckout({ EPIC_CHECKOUT: repo }), repo)
  assert.equal(envCheckout({}), undefined)
  assert.equal(envCheckout({ EPIC_CHECKOUT: join(repo, "gone-worktree") }), undefined)
})

////////////////
// ## Reliable moves (epic `epic-engine` P26, request r20)
////////////////

test("handoff:  refused, no record written, when the end-of-turn hook won't run;  the command says why and what works", async () => {
  const name = `test-refused-${process.pid}`
  mkdirSync(dirname(Window.worktreeFile(name)), { recursive: true })
  writeFileSync(Window.worktreeFile(name), JSON.stringify(Window.worktreeWorkspace("ui", name)))
  try {
    // this session's prompt hook never marked it:  its hooks aren't loaded
    assert.throws(() => Window.handoff(name, SESSION), /can't move .* hooks haven't run/)
    assert.equal(existsSync(Window.handoffFile(SESSION)), false)
    // marked, but Claude Code looks for the plugin in a folder that's gone (r20:  spell-app's old spell-epic/)
    sawHooks(SESSION)
    pluginListsAt(join(claudeHome, "gone-spell-epic"))
    assert.throws(() => Window.handoff(name, SESSION), /gone-spell-epic, which is gone/)
    assert.equal(existsSync(Window.handoffFile(SESSION)), false)
    const { code, err, out } = await mainWith(["handoff", name])
    assert.equal(code, 1)
    assert.equal(out, "")
    assert.match(err, /this session can't move to .*'s window:  Claude Code looks for the plugin's marketplace in/)
    assert.match(err, /fix:  run `epic plugin install`/)
    assert.match(err, new RegExp(`to work there now:  \`epic window launch ${name}\``))
    // put right:  the move is promised, and recorded
    pluginListsAt(dirname(import.meta.dirname))
    assert.equal((await mainWith(["handoff", name])).code, 0)
    assert.equal(existsSync(Window.handoffFile(SESSION)), true)
  } finally {
    rmSync(Window.worktreeFile(name), { force: true })
    rmSync(join(claudeHome, "settings.json"), { force: true })
    rmSync(join(claudeHome, "plugins"), { recursive: true, force: true })
  }
})

test("launch --move:  can't move (the hook won't run):  a NEW session in the epic's open window instead, saying why", async () => {
  const seen = []
  const server = createServer((request, response) => {
    let body = ""
    request.on("data", (chunk) => (body += chunk))
    request.on("end", () => {
      seen.push([request.url, JSON.parse(body)])
      response.writeHead(200, { "Content-Type": "application/json" })
      response.end(JSON.stringify({ ok: true }))
    })
  })
  await new Promise((done) => server.listen(0, "127.0.0.1", done))
  const name = `test-move-${process.pid}`
  const file = Window.worktreeFile(name)
  const entry = { pid: process.pid, port: server.address().port, token: "t", folders: [], workspaceFile: file }
  writeFileSync(join(dir, `${process.pid}.json`), JSON.stringify(entry))
  const home = mkdtempSync(join(tmpdir(), "spell-claude-home-"))
  mkdirSync(join(home, "sessions"))
  // this test's own Claude Code folder, the module's put back after
  process.env.CLAUDE_CONFIG_DIR = home
  // this session, titled for the epic by the prompt hook:  never the epic's own session to wake
  const record = { pid: sleeper.pid, sessionId: SESSION, name: `🚧 ${name}` }
  writeFileSync(join(home, "sessions", `${SESSION}.json`), JSON.stringify(record))
  try {
    // never marked:  its hooks don't run
    const launched = await Window.launch(name, "spell-app", { prompt: `/epic ${name}`, move: SESSION })
    assert.equal(launched.action, "start")
    assert.match(launched.refused.problem, /hooks haven't run/)
    assert.deepEqual(seen.splice(0), [["/open-session", { prompt: `/epic ${name}` }]])
    assert.equal(existsSync(Window.handoffFile(SESSION)), false)
  } finally {
    process.env.CLAUDE_CONFIG_DIR = claudeHome
    rmSync(home, { recursive: true, force: true })
    server.close()
  }
})

test("a move promised, never made:  the next worktree command says so, and clears the record", async () => {
  const name = `test-missed-${process.pid}`
  const to = join(repo, "workspaces", "ongoing", `${name}.code-workspace`)
  mkdirSync(Window.handoffs, { recursive: true })
  writeFileSync(Window.handoffFile(SESSION), JSON.stringify({ sessionId: SESSION, to, show: null }))
  try {
    // the hook could still run:  the record may be this turn's own, so it's left alone
    assert.equal((await mainWith(["close", name])).err, "")
    assert.equal(existsSync(Window.handoffFile(SESSION)), true)
    // the hook can't run:  the move never will
    pluginListsAt(join(claudeHome, "gone-spell-epic"))
    const { err } = await mainWith(["close", name])
    assert.match(err, new RegExp(`was to move to ⎇ ${name}'s window when its last turn ended, and didn't`))
    assert.match(err, new RegExp(`\`epic window launch ${name}\``))
    assert.equal(existsSync(Window.handoffFile(SESSION)), false)
    assert.equal(existsSync(join(Window.handoffs, `${SESSION}.missed.json`)), true)
    assert.match(readFileSync(join(Window.handoffs, `${SESSION}.log`), "utf8"), /missed:  the move to .* never started/)
    // said once:  nothing left to say
    assert.equal((await mainWith(["close", name])).err, "")
  } finally {
    rmSync(join(claudeHome, "settings.json"), { force: true })
    rmSync(join(claudeHome, "plugins"), { recursive: true, force: true })
  }
})

test("a BROKEN worktree (git no longer knows it):  the main checkout's settings, the move recorded to its window file, the fix said", () => {
  // r20:  solid-17's `.git` named `<main>/.git/worktrees/solid-17`, gone;  `CONFIG` is read once, so in a child process
  const top = mkdtempSync(join(tmpdir(), "window-broken-"))
  const main = join(top, "repo")
  mkdirSync(join(main, ".git", "worktrees"), { recursive: true })
  mkdirSync(join(main, ".epic"))
  writeFileSync(join(main, ".epic", "config.json5"), '{ "worktreesFolder": "../repo.worktrees" }')
  const broken = join(top, "repo.worktrees", "solid-17")
  mkdirSync(broken, { recursive: true })
  writeFileSync(join(broken, ".git"), `gitdir: ${join(main, ".git", "worktrees", "solid-17")}\n`)
  // the epic's own worktree, a healthy one, beside it
  const gitdir = join(main, ".git", "worktrees", "elemental-spell")
  mkdirSync(gitdir)
  writeFileSync(join(gitdir, "commondir"), "../..\n")
  mkdirSync(join(top, "repo.worktrees", "elemental-spell"))
  writeFileSync(join(top, "repo.worktrees", "elemental-spell", ".git"), `gitdir: ${gitdir}\n`)
  const registry = join(top, "registry")
  mkdirSync(join(registry, "hooks-seen"), { recursive: true })
  writeFileSync(join(registry, "hooks-seen", SESSION), "")
  const code =
    "const { Window } = await import(process.env.WINDOW_SCRIPT);" +
    'await Window.main(["open", "elemental-spell", "--no-open"]);' +
    'await Window.main(["handoff", "elemental-spell"]);' +
    'console.log(JSON.stringify({ file: Window.worktreeFile("elemental-spell"), ' +
    'record: JSON.parse((await import("node:fs")).readFileSync(Window.handoffFile(process.env.CLAUDE_CODE_SESSION_ID), "utf8")) }))'
  const run = spawnSync(process.execPath, ["--input-type=module", "-e", code], {
    encoding: "utf8",
    env: {
      ...process.env,
      EPIC_CHECKOUT: broken,
      CLAUDE_CODE_SESSION_ID: SESSION,
      SPELL_EPIC_WINDOWS_DIR: registry,
      SPELL_WINDOWS_DIR: join(top, "old-registry"),
      WINDOW_SCRIPT: join(import.meta.dirname, "..", "src", "window.mjs")
    }
  })
  try {
    assert.equal(run.status, 0, run.stderr)
    const { file, record } = JSON.parse(run.stdout.trim().split("\n").at(-1))
    // the main checkout's windows folder (the default content folder's, beside it), never one beside the broken
    // worktree:  before P26, `repo.worktrees/spell-app-dev/windows/...`
    const windows = join(realpathSync(top), "spell-app-dev", "windows")
    assert.equal(file, join(windows, "ongoing", "elemental-spell.code-workspace"))
    assert.equal(record.to, file)
    assert.equal(existsSync(file), true)
    assert.match(run.stderr, /solid-17 is a broken worktree:  git no longer knows it/)
    assert.match(run.stderr, /git worktree repair/)
  } finally {
    rmSync(top, { recursive: true, force: true })
  }
})

test("brokenWorktreeLines():  nothing for a healthy checkout;  for a broken one, what it is and the fix", () => {
  assert.deepEqual(brokenWorktreeLines(undefined), [])
  assert.deepEqual(brokenWorktreeLines({ root: "/r", main: "/r" }), [])
  const lines = brokenWorktreeLines({ root: "/w/x", main: "/m", worktree: "x", missingGitDir: "/m/.git/worktrees/x" })
  assert.match(lines[0], /\/w\/x is a broken worktree.*\/m\/\.git\/worktrees\/x, gone/)
  assert.match(lines.join("\n"), /fix, from \/m:  `git worktree repair \/w\/x`/)
})

/** Mark session `id` as one whose hooks run, as its prompt hook does (`SessionMoves.sawHooks()`). */
function sawHooks(id) {
  mkdirSync(join(dir, "hooks-seen"), { recursive: true })
  writeFileSync(join(dir, "hooks-seen", id), "")
}

/**
 * Claude Code's plugin lists in the temp `claudeHome`, its marketplace and its hooks' folder at `folder`
 * (r20:  both named a folder that was gone).
 */
function pluginListsAt(folder) {
  const marketplace = { source: { source: "directory", path: folder } }
  writeFileSync(
    join(claudeHome, "settings.json"),
    JSON.stringify({ extraKnownMarketplaces: { spell: marketplace } })
  )
  mkdirSync(join(claudeHome, "plugins"), { recursive: true })
  const known = { spell: { ...marketplace, installLocation: folder } }
  writeFileSync(join(claudeHome, "plugins", "known_marketplaces.json"), JSON.stringify(known))
  const installed = { version: 2, plugins: { "epic@spell": [{ installPath: folder }] } }
  writeFileSync(join(claudeHome, "plugins", "installed_plugins.json"), JSON.stringify(installed))
}

/** `Window.main(argv)` as session `SESSION`, its output caught:  `{ code, out, err }`. */
async function mainWith(argv) {
  const out = []
  const err = []
  const { log, error } = console
  console.log = (...line) => out.push(line.join(" "))
  console.error = (...line) => err.push(line.join(" "))
  process.env.CLAUDE_CODE_SESSION_ID = SESSION
  try {
    const code = await Window.main(argv)
    return { code, out: out.join("\n"), err: err.join("\n") }
  } finally {
    Object.assign(console, { log, error })
    delete process.env.CLAUDE_CODE_SESSION_ID
  }
}

/** Write a registry entry for `pid` with `folders`. */
function register(pid, folders) {
  const entry = { pid, port: 1, token: "t", workspaceFile: null, folders }
  writeFileSync(join(dir, `${pid}.json`), JSON.stringify(entry))
}
