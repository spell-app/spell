import { readFile, stat, writeFile } from "node:fs/promises"
import { extname, join } from "node:path"
import { promisify } from "node:util"
import { brotliCompress, constants } from "node:zlib"
import type { Plugin } from "vite"

/**
 * A BROTLI COPY beside each built text file:  `x.js` gets `x.js.br`, brotli at its best (epic `solid-2-final` P2).
 * - a build-only Vite plugin:  its files are written once the build has written its own (`writeBundle`)
 * - the kit's servers send the copy as it is to a browser that takes brotli (`SRV.Reply.sendFile()`):
 *   about a fifth of the file, and nothing compressed per request
 * - scripts, styles, pages, JSON, SVG and WebAssembly, of at least 1 KB (`MIN_BYTES`);  never a file the build left
 *   in its folder from before (a `.br` is written only for a file this build wrote)
 * - who:  the app's builds (`appConfig()`:  the editor, the element builds, the runner, a Python program's page side),
 *   Spell UI's site bundle and the docs pages' bundle (epic `solid-2-final` P7)
 * - NOT a file the repo commits:  a copy beside it would double what git keeps;  the servers gzip it as it's sent, once
 *   a run
 * - node's own zlib:  no dependency
 */
export function brotliCopies(): Plugin {
  let outDir = ""
  return {
    name: "spell:brotli-copies",
    apply: "build",
    configResolved(config) {
      outDir = config.build.outDir.startsWith("/") ? config.build.outDir : join(config.root, config.build.outDir)
    },
    async writeBundle(options, bundle) {
      const folder = options.dir ?? outDir
      await writeCopies(
        folder,
        Object.keys(bundle).filter((name) => COMPRESSED_EXTENSIONS.has(extname(name)))
      )
    }
  }
}

/**
 * Write a brotli copy beside each of `names` (paths inside `folder`) of at least `MIN_BYTES`;  resolves to how many.
 * - NEVER throws for a file that isn't there:  it's skipped
 */
export async function writeCopies(folder: string, names: string[]): Promise<number> {
  let written = 0
  await Promise.all(
    names.map(async (name) => {
      const file = join(folder, name)
      const found = await stat(file).catch(() => undefined)
      if (!found?.isFile() || found.size < MIN_BYTES) return
      const body = await compress(await readFile(file), {
        params: {
          [constants.BROTLI_PARAM_QUALITY]: constants.BROTLI_MAX_QUALITY,
          [constants.BROTLI_PARAM_SIZE_HINT]: found.size
        }
      })
      await writeFile(`${file}.br`, body)
      written++
    })
  )
  return written
}

/** The extensions a brotli copy is made for:  text of every kind, and WebAssembly. */
const COMPRESSED_EXTENSIONS = new Set([".js", ".mjs", ".css", ".html", ".json", ".svg", ".wasm", ".map", ".txt"])

/** Smaller than this, a file goes as it is (the kit's `COMPRESS_MIN_BYTES`). */
const MIN_BYTES = 1024

const compress = promisify(brotliCompress)
