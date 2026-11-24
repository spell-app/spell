import { existsSync, readdirSync, readFileSync } from "node:fs"
import { basename, dirname, join, relative, resolve, sep } from "node:path"

import type { SRV } from "spell/server"

/**
 * WHAT'S IN a built bundle's files, and WHO LOADS each:  the step `Bundle.firstLoad()` doesn't take (epic
 * `solid-2-final` P19).
 * - `of()`:  one file's code, by the module it came from (its source map), and the files that import it
 * - `duplicates()`:  modules built into more than one of the files asked about:  a second copy a page may load
 * - by source map:  each byte of the built file goes to the module its mapping names, so a module's `bytes` are what
 *   it adds to the file, raw (minified, before compression);  bytes no mapping names are `(unmapped)`
 * - no `.map` beside a file:  its `modules` are empty and `isMapped` false;  build with source maps to see inside
 *   (`PerfBuilds`' `editor-mapped`)
 * - Node only, files and data:  no build tool
 * - NOTE: its VLQ reader is a small private copy of the parser's (`P.SourceMapLines`):  the server never imports the
 *   parser (every arrow points down)
 */
export class BundleContents {
  /** the bundle's folder */
  readonly folder: string

  /** where module paths are told from (the kit's root);  none:  as the map has them, `../` dropped */
  readonly root: string | undefined

  /**
   * the folder the build was set to write (its config's `outDir`), which its maps' paths may be from;  none:  `folder`
   * - a build sent elsewhere (`--outDir`, `PerfBuilds`' temporary folder) with hidden maps writes their paths from
   *   there;  one whose maps are written as it builds, from where they land:  each path is tried both ways (`moduleOf()`)
   */
  readonly builtAt: string | undefined

  /** every `.js` file under `folder`, `/`-separated, read once (`texts`) */
  private readonly texts: Map<string, string>

  constructor(folder: string, { root, builtAt }: { root?: string; builtAt?: string } = {}) {
    this.folder = folder
    this.root = root
    this.builtAt = builtAt
    this.texts = new Map(jsFilesUnder(folder).map((file) => [file, readFileSync(join(folder, file), "utf8")]))
  }

  /**
   * What built file `file` holds, by module, biggest first, and who loads it.
   * - `importedBy`:  the files that import it, `static` (with them) or `dynamic` (later, `import()`);  a file named in
   *   none is an entry a page or worker names itself
   */
  of(file: string): SRV.BuiltFileContents {
    const text = this.texts.get(file) ?? readFileSync(join(this.folder, file), "utf8")
    const mapFile = join(this.folder, `${file}.map`)
    const modules = existsSync(mapFile)
      ? bytesBySource(text, JSON.parse(readFileSync(mapFile, "utf8")) as MapFile, (source) =>
          this.moduleOf(source, [dirname(mapFile), ...(this.builtAt ? [dirname(join(this.builtAt, file))] : [])])
        )
      : []
    return {
      file,
      raw: Buffer.byteLength(text),
      isMapped: existsSync(mapFile),
      modules,
      importedBy: this.importersOf(file)
    }
  }

  /**
   * The modules built into more than one of `files`, with each file's bytes of it:  biggest first.
   * - what a page that loads them all downloads twice, or a worker downloads again beside its page
   */
  duplicates(files: string[]): SRV.DuplicateModule[] {
    const where = new Map<string, Array<{ file: string; bytes: number }>>()
    for (const file of files) {
      for (const { module, bytes } of this.of(file).modules) {
        if (module === UNMAPPED) continue
        where.set(module, [...(where.get(module) ?? []), { file, bytes }])
      }
    }
    return [...where]
      .filter(([, inFiles]) => inFiles.length > 1)
      .map(([module, inFiles]) => ({
        module,
        files: inFiles,
        bytes: inFiles.reduce((sum, each) => sum + each.bytes, 0)
      }))
      .sort((a, b) => b.bytes - a.bytes)
  }

  /**
   * `modules` gathered by where they're from:  a package (`node_modules/x` => `x`, `@a/b`) or our folder
   * (`parser/src/spell/...` => `parser/src/spell`), biggest first.
   */
  static grouped(modules: SRV.ModuleBytes[]): SRV.ModuleBytes[] {
    const groups = new Map<string, number>()
    for (const { module, bytes } of modules) {
      const group = BundleContents.groupOf(module)
      groups.set(group, (groups.get(group) ?? 0) + bytes)
    }
    return [...groups].map(([module, bytes]) => ({ module, bytes })).sort((a, b) => b.bytes - a.bytes)
  }

  /** Where module `module` is from:  its package, or its first three folders. */
  static groupOf(module: string): string {
    const packaged = /(?:^|\/)node_modules\/((?:@[^/]+\/)?[^/]+)/.exec(module)
    if (packaged) return packaged[1]!
    return module.split("/").slice(0, 3).join("/")
  }

  /**
   * The files that load `file`, and how:  each quoted mention of its name, read by what's just before it.
   * - `from "./x.js"` or `import "./x.js"`:  static;  anything else (`import("./x.js")`, a worker's URL):  dynamic
   */
  private importersOf(file: string): SRV.FileImporter[] {
    const name = basename(file)
    const mention = new RegExp(`["'\`]((?:\\.\\.?/|/)?(?:[^"'\`\\s]*/)?${escapeRegExp(name)})["'\`]`, "g")
    const importers: SRV.FileImporter[] = []
    for (const [other, text] of this.texts) {
      if (other === file || !text.includes(name)) continue
      let how: SRV.FileImporter["how"] | undefined
      for (const match of text.matchAll(mention)) {
        const before = text.slice(Math.max(0, match.index - 12), match.index)
        if (/(?:\bfrom|\bimport)\s*$/.test(before)) {
          how = "static"
          break
        }
        how = "dynamic"
      }
      if (how) importers.push({ file: other, how })
    }
    return importers
  }

  /**
   * Source `source` as a reader looks for it:  a package's path from its `node_modules`, else from `root`;  no query.
   * - `from`:  the folders its map's paths may be from, the first that lands inside `root` taken;  none does:  the path
   *   with its `../` dropped
   */
  private moduleOf(source: string, from: string[]): string {
    const plain = source.replace(/\?.*$/, "").replace(/^\/@fs/, "")
    const fromModules = /node_modules\/.*$/.exec(plain)
    if (fromModules) return fromModules[0]
    const bare = plain.replace(/^(\.\.\/)+/, "").replace(/^\/+/, "")
    if (!this.root) return bare
    for (const folder of from) {
      const inside = relative(this.root, resolve(folder, plain))
      if (!inside.startsWith("..") && existsSync(join(this.root, inside))) return inside.split(sep).join("/")
    }
    return bare
  }
}

/** What bytes no mapping names are counted as. */
const UNMAPPED = "(unmapped)"

/** A source map's parts read here. */
type MapFile = { sources: string[]; mappings: string; sourceRoot?: string }

/**
 * `text`'s bytes by the source each of its mappings names, biggest first.
 * - a segment's bytes run to the next segment, or the line's end;  bytes before a line's first segment are unmapped
 * - each source named by `moduleOf()`
 */
function bytesBySource(text: string, map: MapFile, moduleOf: (source: string) => string): SRV.ModuleBytes[] {
  const bytes = new Map<number, number>()
  let unmapped = 0
  const lines = text.split("\n")
  // the VLQ fields are deltas from the last segment read:  only the source is wanted
  let source = 0
  map.mappings.split(";").forEach((group, index) => {
    const line = lines[index] ?? ""
    const starts: Array<[number, number | undefined]> = []
    let column = 0
    for (const segment of group ? group.split(",") : []) {
      const [columnDelta = 0, sourceDelta] = fromVlq(segment)
      column += columnDelta
      if (sourceDelta !== undefined) source += sourceDelta
      starts.push([column, sourceDelta === undefined ? undefined : source])
    }
    if (!starts.length) {
      unmapped += Buffer.byteLength(line) + 1
      return
    }
    unmapped += Buffer.byteLength(line.slice(0, starts[0]![0]))
    starts.forEach(([start, from], at) => {
      const end = starts[at + 1]?.[0] ?? line.length
      const size = Buffer.byteLength(line.slice(start, end)) + (at === starts.length - 1 ? 1 : 0)
      if (from === undefined) unmapped += size
      else bytes.set(from, (bytes.get(from) ?? 0) + size)
    })
  })
  const byModule = new Map<string, number>()
  for (const [index, size] of bytes) {
    const source = map.sources[index]
    const module = source === undefined ? UNMAPPED : moduleOf(source)
    byModule.set(module, (byModule.get(module) ?? 0) + size)
  }
  if (unmapped) byModule.set(UNMAPPED, (byModule.get(UNMAPPED) ?? 0) + unmapped)
  return [...byModule].map(([module, size]) => ({ module, bytes: size })).sort((a, b) => b.bytes - a.bytes)
}

/** Base-64 digits, as source maps use them. */
const BASE64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"

/** The numbers in `segment`, a base-64 VLQ run:  each's sign in its lowest bit, five bits a digit, the sixth saying more follows. */
function fromVlq(segment: string): number[] {
  const numbers: number[] = []
  let value = 0
  let shift = 0
  for (const character of segment) {
    const digit = BASE64.indexOf(character)
    value += (digit & 31) * 2 ** shift
    shift += 5
    if (digit & 32) continue
    numbers.push(value % 2 ? -((value - 1) / 2) : value / 2)
    value = 0
    shift = 0
  }
  return numbers
}

/** `text` with the regular expression characters escaped. */
function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
}

/** Every `.js` file under `folder`, `/`-separated, relative;  never through a link, nor a dot file. */
function jsFilesUnder(folder: string, under = ""): string[] {
  return readdirSync(join(folder, under), { withFileTypes: true }).flatMap((entry) => {
    if (entry.name.startsWith(".") || entry.isSymbolicLink()) return []
    const path = under ? `${under}/${entry.name}` : entry.name
    if (entry.isDirectory()) return jsFilesUnder(folder, path)
    return path.endsWith(".js") ? [path] : []
  })
}
