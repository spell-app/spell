import { chmodSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { describe, expect, test } from "vite-plus/test"

import { Editor } from "spell/epic/config/Editor"

// what each window puts in the environment of what it starts, as seen in each (Cursor's bundle id from its Info.plist,
// Cursor 3.22;  VS Code's from a session in its Claude panel)
const IN_VSCODE = {
  __CFBundleIdentifier: "com.microsoft.VSCode",
  VSCODE_PID: "47633",
  VSCODE_CODE_CACHE_PATH: "/Users/ana/Library/Application Support/Code/CachedData/e646868"
}
const IN_CURSOR_MAC = { __CFBundleIdentifier: "com.todesktop.230313mzl4w4u92", VSCODE_PID: "512" }
const IN_CURSOR_LINUX = {
  TERM_PROGRAM: "vscode",
  VSCODE_CODE_CACHE_PATH: "/home/ana/.config/Cursor/CachedData/3a92974"
}
const IN_CURSOR_WINDOWS = {
  TERM_PROGRAM: "vscode",
  VSCODE_GIT_ASKPASS_NODE: "C:\\Users\\ana\\AppData\\Local\\Programs\\cursor\\Cursor.exe",
  VSCODE_NLS_CONFIG: '{"defaultMessagesFile":"C:\\\\Users\\\\ana\\\\AppData\\\\Roaming\\\\Cursor\\\\clp\\\\x.json"}'
}

describe("Editor", () => {
  test("ofWindow():  the window that started the process, from what it put in the environment", () => {
    expect(Editor.ofWindow(IN_VSCODE)).toBe("code")
    expect(Editor.ofWindow(IN_CURSOR_MAC)).toBe("cursor")
    expect(Editor.ofWindow(IN_CURSOR_LINUX)).toBe("cursor")
    expect(Editor.ofWindow(IN_CURSOR_WINDOWS)).toBe("cursor")
    expect(Editor.ofWindow({ CURSOR_TRACE_ID: "abc" })).toBe("cursor")
    expect(Editor.ofWindow({ TERM_PROGRAM: "vscode" })).toBe("code")
    expect(Editor.ofWindow({ TERM_PROGRAM: "iTerm.app" })).toBeUndefined()
  })

  test("idOf():  this machine's, else the window's, else the repo's setting, else code", () => {
    expect(Editor.idOf({ env: {} })).toBe("code")
    expect(Editor.idOf({ setting: "cursor", env: {} })).toBe("cursor")
    expect(Editor.idOf({ setting: "cursor", env: IN_VSCODE })).toBe("code")
    expect(Editor.idOf({ setting: "code", env: IN_CURSOR_MAC })).toBe("cursor")
    expect(Editor.idOf({ setting: "code", env: { ...IN_CURSOR_MAC, SPELL_EPIC_EDITOR: "Code" } })).toBe("code")
    expect(Editor.idOf({ setting: "zed", env: {} })).toBe("code")
  })

  test("its command, name and links", () => {
    const [code, cursor] = [new Editor("code"), new Editor("cursor")]
    expect([code.command, code.name, code.url("anthropic.claude-code/open")]).toEqual([
      "code",
      "VS Code",
      "vscode://anthropic.claude-code/open"
    ])
    expect([cursor.command, cursor.name, cursor.url("spell-app.spell-epic/doc-preview")]).toEqual([
      "cursor",
      "Cursor",
      "cursor://spell-app.spell-epic/doc-preview"
    ])
  })

  test("run():  the editor's command, found on the PATH", () => {
    const bin = mkdtempSync(join(tmpdir(), "editor-bin-"))
    const said = join(bin, "said.txt")
    writeFileSync(join(bin, "cursor"), `#!/bin/sh\necho "$@" > "${said}"\n`)
    chmodSync(join(bin, "cursor"), 0o755)
    const run = new Editor("cursor").run(["--open-url", "cursor://x"], { env: { PATH: bin } })
    expect(run.status).toBe(0)
    expect(readFileSync(said, "utf8").trim()).toBe("--open-url cursor://x")
  })
})
