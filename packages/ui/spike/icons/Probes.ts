import { mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs"
import path from "node:path"
import { fileURLToPath } from "node:url"
import { gzipSync } from "node:zlib"
import { build } from "vite"

/** Package root. */
const HERE = fileURLToPath(new URL("./", import.meta.url))
const DIST = path.join(HERE, "dist")

/** Size of a set of files. */
export type SetSize = {
  files: number
  /** Sum of file sizes. */
  raw: number
  /** Sum of each file gzipped ON ITS OWN (what a server sends per request). */
  gzip: number
  /** Sum of allocated disk blocks (`du`-style):  thousands of tiny files round up to whole blocks. */
  allocated: number
}

/** Every file under `directory`, recursively. */
export function walk(directory: string): string[] {
  return readdirSync(directory, { withFileTypes: true }).flatMap((entry) =>
    entry.isDirectory() ? walk(path.join(directory, entry.name)) : [path.join(directory, entry.name)]
  )
}

/** `SetSize` of `files`. */
export function sizeOf(files: string[]): SetSize {
  let raw = 0
  let gzip = 0
  let allocated = 0
  for (const file of files) {
    const stat = statSync(file)
    raw += stat.size
    allocated += stat.blocks * 512
    gzip += gzipSync(readFileSync(file)).length
  }
  return { files: files.length, raw, gzip, allocated }
}

/** What `yarn build` recorded. */
type BuildInfo = { fontAwesome: string; dataChunks: string[] }

/**
 * Static facts about the four asset sets, and the three "can a bundler take only what the app names?" probes.
 */
export class Probes {
  private readonly info = JSON.parse(readFileSync(path.join(DIST, "build-info.json"), "utf8")) as BuildInfo

  /** On-disk size of each candidate's asset set, plus its loader code. */
  disk(): Record<string, unknown> {
    const dataChunks = this.info.dataChunks
      .filter((chunk) => chunk.startsWith("a/"))
      .map((chunk) => path.join(DIST, chunk))
    const modules = walk(path.join(DIST, "icons"))
    const svgs = walk(path.join(DIST, "svg"))
    const canonical = new Set(modules.map((file) => path.relative(path.join(DIST, "icons"), file).replace(/\.js$/, "")))
    const svgCanonical = svgs.filter((file) =>
      canonical.has(path.relative(path.join(DIST, "svg"), file).replace(/\.svg$/, ""))
    )
    const code = (id: string) => sizeOf([path.join(DIST, "a", `${id}.js`)])
    return {
      today: { data: sizeOf(dataChunks), loaderEntry: code("today") },
      module: { data: sizeOf(modules), loaderEntry: code("module") },
      svgAsShipped: {
        data: sizeOf(svgs),
        loaderEntry: code("mask"),
        note: "includes FA alias copies (e.g. ad.svg, add.svg)"
      },
      svgCanonicalOnly: { data: sizeOf(svgCanonical), loaderEntry: code("fetch") },
      sharedChunk: sizeOf(walk(path.join(DIST, "a/chunks")).filter((file) => path.basename(file).startsWith("base-")))
    }
  }

  /** Licence facts read from the shipped package. */
  licence(): Record<string, unknown> {
    const pkg = path.join(HERE, "node_modules/@fortawesome/fontawesome-free")
    const svgs = walk(path.join(pkg, "svgs"))
    let withComment = 0
    let commentBytes = 0
    let gzipWith = 0
    let gzipWithout = 0
    let sample = ""
    for (const file of svgs) {
      const text = readFileSync(file, "utf8")
      const match = /<!--![\s\S]*?-->/.exec(text)
      if (match) {
        withComment++
        commentBytes += match[0].length
        sample ||= match[0]
      }
      gzipWith += gzipSync(text).length
      gzipWithout += gzipSync(text.replace(/<!--![\s\S]*?-->/, "")).length
    }
    const licenseText = readFileSync(path.join(pkg, "LICENSE.txt"), "utf8")
    const attribution = /# Attribution\s+([\s\S]*?)\n-{10,}/.exec(licenseText)?.[1]?.replace(/\s+/g, " ").trim()
    return {
      svgFiles: svgs.length,
      withComment,
      sampleComment: sample,
      commentBytesTotal: commentBytes,
      gzipBytesWithComment: gzipWith,
      gzipBytesWithoutComment: gzipWithout,
      packageAttributionText: attribution
    }
  }

  /**
   * Can a bundler include only the icons an app names?
   * - `today`:  `Icons.get("user", "solid")` -- reports what the build emits.
   * - `module`:  static `import user from ".../icons/solid/user.js"` x3.
   * - `svgUrl`:  `import url from ".../user.svg?url"` x3, with the default inline limit and with `assetsInlineLimit: 0`.
   */
  async bundling(): Promise<Record<string, unknown>> {
    const work = path.join(HERE, ".tmp/bundling")
    rmSync(work, { recursive: true, force: true })
    mkdirSync(work, { recursive: true })
    const src = path.resolve(HERE, "../../src")
    const fa = path.join(HERE, "node_modules/@fortawesome/fontawesome-free")
    const gear = pathOf("solid", "gear")
    const star = pathOf("solid", "star")

    const today = await this.bundle(
      "today",
      `import { Icons } from "$/icons"\nIcons.get("user", "solid").then((data) => console.log(data))\n`,
      { alias: [{ find: /^\$\//, replacement: src + "/" }] }
    )
    const named = ["solid/user", "solid/house", "brands/github"]
    const moduleImports = named.map((n, i) => `import i${i} from "${DIST}/icons/${n}.js"`).join("\n")
    const modules = await this.bundle(
      "module",
      `${moduleImports}\nconsole.log(${named.map((_n, i) => `i${i}`).join(", ")})\n`
    )
    const urlImports = named.map((n, i) => `import u${i} from "${fa}/svgs/${n}.svg?url"`).join("\n")
    const urlEntry = `${urlImports}\nconsole.log(${named.map((_n, i) => `u${i}`).join(", ")})\n`
    const svgInlined = await this.bundle("svg-inline", urlEntry)
    const svgFiles = await this.bundle("svg-files", urlEntry, { assetsInlineLimit: 0 })

    const moduleText = modules.text
    return {
      today: {
        emitted: today.size,
        note: "every data chunk is emitted (CHUNK_LOADERS lists them all):  cannot include just the icons named",
        containsUnnamedGear: today.text.includes(gear)
      },
      module: {
        emitted: modules.size,
        containsNamed: named.length,
        containsUnnamedGear: moduleText.includes(gear),
        containsUnnamedStar: moduleText.includes(star),
        note: "static imports tree-shake to exactly the named paths, inlined into the app bundle"
      },
      svgUrlDefault: {
        emitted: svgInlined.size,
        note: "files under 4 KB become data: URIs by Vite's default `assetsInlineLimit`"
      },
      svgUrlNoInline: { emitted: svgFiles.size, note: "one hashed file per named icon, nothing else" },
      computedNames:
        "a URL built from a runtime name (all of candidates 2, 3a, 3b as `ui-icon name=...` would use them) is invisible to a bundler:  the app must copy the whole set, or import the named icons statically and register them"
    }

    /** `d="..."` payload of one icon module, to grep the bundle for it. */
    function pathOf(style: string, name: string): string {
      const module = readFileSync(path.join(DIST, "icons", style, `${name}.js`), "utf8")
      return (JSON.parse(module.slice("export default ".length)) as [number, number, string])[2]
    }
  }

  /** Builds `entry` as a tiny app;  returns emitted sizes and the concatenated JS text. */
  private async bundle(
    name: string,
    entry: string,
    config: { alias?: { find: RegExp; replacement: string }[]; assetsInlineLimit?: number } = {}
  ): Promise<{ size: SetSize; text: string }> {
    const directory = path.join(HERE, ".tmp/bundling", name)
    mkdirSync(directory, { recursive: true })
    const file = path.join(directory, "entry.ts")
    writeFileSync(file, entry)
    // NOTE: an app build (HTML entry), not lib mode -- lib mode always inlines assets, which hides `?url` behaviour.
    writeFileSync(
      path.join(directory, "index.html"),
      `<!doctype html><script type="module" src="./entry.ts"></script>\n`
    )
    await build({
      root: directory,
      configFile: false,
      logLevel: "silent",
      publicDir: false,
      resolve: { alias: config.alias ?? [] },
      build: {
        outDir: path.join(directory, "out"),
        emptyOutDir: true,
        assetsInlineLimit: config.assetsInlineLimit,
        rolldownOptions: { input: path.join(directory, "index.html") }
      }
    })
    const files = walk(path.join(directory, "out"))
    const text = files
      .filter((f) => f.endsWith(".js") || f.endsWith(".html"))
      .map((f) => readFileSync(f, "utf8"))
      .join("\n")
    return { size: sizeOf(files), text }
  }
}
