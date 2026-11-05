import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterAll, describe, expect, test } from "vite-plus/test"

import { after, waitUntil } from "spell/util/timing"
import { SRV } from "spell/server"

/** A scratch folder, gone after the tests. */
const DIR = mkdtempSync(join(tmpdir(), "folder-watch-"))
afterAll(() => rmSync(DIR, { recursive: true, force: true }))

/** A fresh folder in the scratch one. */
function folder(name: string): string {
  const path = join(DIR, name)
  mkdirSync(join(path, "sub"), { recursive: true })
  return path
}

/** Let macOS start watching:  it misses changes for a moment after `fs.watch()`. */
const settle = () => after(0.2)

/**
 * The files among `paths`:  macOS also reports folders made just before the watch began (the folder itself, `sub`),
 * which a watcher reports too (a folder renamed is a change)
 */
const filesOf = (paths: string[]) => paths.filter((path) => path.includes("."))

describe("FolderWatch", () => {
  test("reports a change by its path from the folder;  skips locks, editors' temp files and dot files", async () => {
    const dir = folder("skips")
    const seen: string[] = []
    const watching = new SRV.FolderWatch(dir, {}, (paths) => seen.push(...paths))
    expect(watching.isWatching).toBe(true)
    await settle()
    writeFileSync(join(dir, "page.html.lock"), "")
    writeFileSync(join(dir, "page.html.123.tmp"), "")
    writeFileSync(join(dir, "page.html~"), "")
    writeFileSync(join(dir, ".hidden"), "")
    writeFileSync(join(dir, "sub", "page.html"), "x")
    expect(await waitUntil(() => seen.includes("sub/page.html"), { timeout: 3 })).toBe(true)
    await after(0.2)
    expect(filesOf(seen).filter((path) => path !== "sub/page.html")).toEqual([])
    watching.close()
    expect(watching.isWatching).toBe(false)
  })

  test("`quiet`:  a burst is reported once, after it, each path once", async () => {
    const dir = folder("quiet")
    const reports: string[][] = []
    const watching = new SRV.FolderWatch(dir, { quiet: 300 }, (paths) => reports.push(paths))
    await settle()
    for (const name of ["a.ts", "b.ts", "a.ts"]) writeFileSync(join(dir, name), name + Math.random())
    expect(reports).toEqual([])
    expect(await waitUntil(() => reports.length > 0, { timeout: 3 })).toBe(true)
    await after(0.4)
    expect(reports).toHaveLength(1)
    expect(filesOf(reports[0]!).sort()).toEqual(["a.ts", "b.ts"])
    watching.close()
  })

  test("`only` and `recursive: false`:  one file of a folder", async () => {
    const dir = folder("only")
    const seen: string[] = []
    const watching = new SRV.FolderWatch(dir, { recursive: false, only: (path) => path === "answers.json5" }, (paths) =>
      seen.push(...paths)
    )
    await settle()
    writeFileSync(join(dir, "run.json5"), "{}")
    writeFileSync(join(dir, "answers.json5"), "{}")
    expect(await waitUntil(() => seen.includes("answers.json5"), { timeout: 3 })).toBe(true)
    expect(seen.every((path) => path === "answers.json5")).toBe(true)
    watching.close()
  })

  test("a missing folder is watched by nobody, and nothing throws", () => {
    const watching = new SRV.FolderWatch(join(DIR, "missing"), {}, () => {})
    expect(watching.isWatching).toBe(false)
    watching.close()
  })
})
