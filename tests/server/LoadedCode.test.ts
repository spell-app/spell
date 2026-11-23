import { execFileSync } from "node:child_process"
import { mkdtempSync, readFileSync, rmSync, utimesSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { createRequire } from "node:module"
import { fileURLToPath, pathToFileURL } from "node:url"
import { afterEach, beforeEach, describe, expect, it } from "vite-plus/test"

import { LOADED_CODE_VARIABLE, LoadedCode } from "spell/server/LoadedCode"
import { SRV } from "spell/server"

/** The hook a background page server loads first, by its path, as `PageServer.ensure()` passes it. */
const HOOK = fileURLToPath(new URL("../../src/server/loadedCodeHook.ts", import.meta.url))

/** `tsx`'s loader, by its address:  the test's folder is a temporary one, where `--import tsx` finds nothing. */
const TSX = pathToFileURL(createRequire(import.meta.url).resolve("tsx/esm")).href

describe("LoadedCode:  the code files a running page server loaded (epic `epic-engine` I309)", () => {
  let root: string
  beforeEach(() => {
    root = mkdtempSync(join(tmpdir(), "loaded-code-"))
  })
  afterEach(() => rmSync(root, { recursive: true, force: true }))

  it("the hook writes each file the process loads, with its time when loaded", () => {
    writeFileSync(join(root, "package.json"), `{ "type": "module" }`)
    writeFileSync(join(root, "used.js"), "export const used = 1\n")
    writeFileSync(join(root, "unused.js"), "export const unused = 2\n")
    writeFileSync(
      join(root, "main.js"),
      `import { used } from "./used.js"\nsetTimeout(() => {}, 1500)\nconsole.log(used)\n`
    )
    execFileSync(process.execPath, ["--import", TSX, "--import", HOOK, join(root, "main.js")], { cwd: root })
    const record = JSON.parse(readFileSync(LoadedCode.fileFor(root), "utf8")) as { pid: number; files: object }
    const loaded = Object.keys(record.files).map((path) => path.replace(/.*[/\\]/, ""))
    expect(loaded).toContain("main.js")
    expect(loaded).toContain("used.js")
    expect(loaded).not.toContain("unused.js")
  })

  it("isChanged():  a loaded file changed or gone since;  undefined with no record for that process", () => {
    const used = join(root, "used.js")
    writeFileSync(used, "export const used = 1\n")
    const loaded = 1_700_000_000_000
    utimesSync(used, loaded / 1000, loaded / 1000)
    const record = { pid: 4242, files: { [used]: loaded } }
    const file = LoadedCode.fileFor(root)
    writeFileSync(file, JSON.stringify(record))

    expect(LoadedCode.isChanged(file, 4242)).toBe(false)
    // another server's record:  not this one's to judge
    expect(LoadedCode.isChanged(file, 99)).toBeUndefined()

    utimesSync(used, (loaded + 5000) / 1000, (loaded + 5000) / 1000)
    expect(LoadedCode.isChanged(file, 4242)).toBe(true)

    rmSync(used)
    expect(LoadedCode.isChanged(file, 4242)).toBe(true)
  })

  it("no record at all:  undefined", () => {
    expect(LoadedCode.isChanged(LoadedCode.fileFor(root), 1)).toBeUndefined()
  })

  // a project's page server on the kit wrote over Spell's record, and Spell's then restarted by the folders rule
  it("a project's server keeps its own record, named by its spaces:  Spell's is left alone", () => {
    writeFileSync(join(root, "package.json"), `{ "type": "module" }`)
    writeFileSync(join(root, "main.js"), `setTimeout(() => {}, 1500)\n`)
    const spells = SRV.PidFile.forPageServer(root, SRV.defaultSpacesOf(root))
    const projects = SRV.PidFile.forPageServer(root, join(root, "my-app", "spaces"))
    expect(spells.codeFile).toBe(LoadedCode.fileFor(root))
    expect(projects.codeFile).toMatch(/\.spell-server\.my-app-[0-9a-f]{8}\.code\.json$/)

    writeFileSync(spells.codeFile, JSON.stringify({ pid: 4242, files: {} }))
    const env = { ...process.env, [LOADED_CODE_VARIABLE]: projects.codeFile }
    execFileSync(process.execPath, ["--import", TSX, "--import", HOOK, join(root, "main.js")], { cwd: root, env })

    expect(JSON.parse(readFileSync(spells.codeFile, "utf8"))).toEqual({ pid: 4242, files: {} })
    const record = JSON.parse(readFileSync(projects.codeFile, "utf8")) as { files: object }
    expect(Object.keys(record.files).some((path) => path.endsWith("main.js"))).toBe(true)
    // each server reads its own:  Spell's record still answers for Spell's server
    expect(LoadedCode.isChanged(spells.codeFile, 4242)).toBe(false)
  })
})
