import { execFileSync } from "node:child_process"
import fs from "node:fs"
import os from "node:os"
import path from "node:path"
import { describe, expect, test } from "vite-plus/test"

import { crc32, filesInZip, zipOf } from "spell/app/spaces/models/zip"
import { unzipped, zipped } from "spell/app/spaces/server/node/storage/zip"

/** Some bytes no text decoder would take:  every byte value, twice. */
const ALL_BYTES = Uint8Array.from({ length: 512 }, (_, index) => index % 256)

/** Is `command` on this machine's `PATH`? */
function hasCommand(command: string): boolean {
  try {
    execFileSync("which", [command], { stdio: "ignore" })
    return true
  } catch {
    return false
  }
}

describe("crc32()", () => {
  test("the standard check value", () => {
    expect(crc32(new TextEncoder().encode("123456789"))).toBe(0xcbf43926)
    expect(crc32(new Uint8Array())).toBe(0)
  })
})

describe("zipOf() and filesInZip()", () => {
  test("a round trip keeps every path and byte, text and binary, in order", async () => {
    const files = [
      { path: "Proj/Proj.spell", bytes: new TextEncoder().encode("# Café ☕\n") },
      { path: "Proj/Button/Usage.spell", bytes: new TextEncoder().encode("usage\n") },
      { path: "Proj/__thumbnail.png", bytes: ALL_BYTES },
      { path: "Proj/empty.txt", bytes: new Uint8Array() }
    ]
    const back = await filesInZip(await zipOf(files))
    expect(back.map(({ path }) => path)).toEqual(files.map(({ path }) => path))
    back.forEach(({ bytes }, index) => expect([...bytes]).toEqual([...files[index]!.bytes]))
  })

  test("node's twin reads the browser's zip, and the browser's reads node's:  one layout", async () => {
    const zip = await zipOf([{ path: "a/b.bin", bytes: ALL_BYTES }])
    expect(unzipped(Buffer.from(zip))).toEqual([["/a/b.bin", Buffer.from(ALL_BYTES)]])
    const fromNode = zipped([["/c.txt", Buffer.from("see")]])
    const [file] = await filesInZip(fromNode)
    expect(file!.path).toBe("c.txt")
    expect(new TextDecoder().decode(file!.bytes)).toBe("see")
  })

  test("not a zip throws TypeError", async () => {
    await expect(filesInZip(new TextEncoder().encode("hello"))).rejects.toThrow(TypeError)
  })

  test.runIf(hasCommand("zip") && hasCommand("unzip"))("the system's zip and unzip agree with it", async () => {
    const folder = fs.mkdtempSync(path.join(os.tmpdir(), "spell-zip-test-"))
    try {
      // the system's zip, read here:  folders' own entries left out, a data descriptor read from the directory
      fs.mkdirSync(path.join(folder, "Proj/Button"), { recursive: true })
      fs.writeFileSync(path.join(folder, "Proj/Proj.spell"), "my app\n")
      fs.writeFileSync(path.join(folder, "Proj/Button/logo.png"), ALL_BYTES)
      execFileSync("zip", ["-qr", "made.zip", "Proj"], { cwd: folder })
      const read = await filesInZip(new Uint8Array(fs.readFileSync(path.join(folder, "made.zip"))))
      expect(read.map(({ path: each }) => each).sort()).toEqual(["Proj/Button/logo.png", "Proj/Proj.spell"])
      expect([...read.find(({ path: each }) => each.endsWith(".png"))!.bytes]).toEqual([...ALL_BYTES])

      // ours, read by the system's unzip
      const ours = await zipOf([
        { path: "Out/Out.spell", bytes: new TextEncoder().encode("out\n") },
        { path: "Out/pic.png", bytes: ALL_BYTES }
      ])
      fs.writeFileSync(path.join(folder, "ours.zip"), ours)
      execFileSync("unzip", ["-tq", "ours.zip"], { cwd: folder })
      execFileSync("unzip", ["-q", "ours.zip", "-d", "out"], { cwd: folder })
      expect(fs.readFileSync(path.join(folder, "out/Out/Out.spell"), "utf8")).toBe("out\n")
      expect([...fs.readFileSync(path.join(folder, "out/Out/pic.png"))]).toEqual([...ALL_BYTES])
    } finally {
      fs.rmSync(folder, { recursive: true, force: true })
    }
  })
})
