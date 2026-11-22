import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { brotliDecompressSync } from "node:zlib"
import { afterAll, describe, expect, it } from "vite-plus/test"

import { brotliCopies, writeCopies } from "spell/toolchain/brotliCopies"

describe("brotliCopies()", () => {
  const dir = mkdtempSync(join(tmpdir(), "brotli-copies-"))
  const script = `export const words = ${JSON.stringify("words ".repeat(400))}\n`

  afterAll(() => rmSync(dir, { recursive: true, force: true }))

  it("is a build-only plugin", () => {
    expect(brotliCopies()).toMatchObject({ name: "spell:brotli-copies", apply: "build" })
  })

  it("writes a brotli copy beside each file of 1 KB or more, and skips small or missing ones", async () => {
    writeFileSync(join(dir, "big.js"), script)
    writeFileSync(join(dir, "small.css"), "a{}")
    expect(await writeCopies(dir, ["big.js", "small.css", "gone.js"])).toBe(1)
    expect(brotliDecompressSync(readFileSync(join(dir, "big.js.br"))).toString()).toBe(script)
    expect(existsSync(join(dir, "small.css.br"))).toBe(false)
  })

  it("writes copies for what the build wrote:  its text files, not its pictures", async () => {
    writeFileSync(join(dir, "chunk.js"), script)
    writeFileSync(join(dir, "picture.png"), Buffer.alloc(4000, 7))
    const plugin = brotliCopies() as unknown as {
      writeBundle: (options: { dir: string }, bundle: object) => Promise<void>
    }
    await plugin.writeBundle({ dir }, { "chunk.js": {}, "picture.png": {} })
    expect([existsSync(join(dir, "chunk.js.br")), existsSync(join(dir, "picture.png.br"))]).toEqual([true, false])
  })
})
