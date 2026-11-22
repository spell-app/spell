import { spawnSync, type StdioOptions } from "node:child_process"
import { createHash } from "node:crypto"
import {
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  readlinkSync,
  rmSync,
  statSync,
  symlinkSync,
  writeFileSync
} from "node:fs"
import { dirname, join, posix, relative, resolve, sep } from "node:path"
import { brotliCompressSync, constants as zlib, gzipSync } from "node:zlib"

import { kb } from "spell/util/number"
import { findUp } from "spell/util/node/findUp"
import { SRV } from "spell/server"
import { pageServerSettings, settingsParts } from "spell/server/page/settings"
import { packageRootFor } from "spell/toolchain/sourceNames"

/**
 * One bundle of the checkout at `root` that is BUILT on demand, never committed (`SRV.BUNDLES`).
 * - Spell UI's docs site's:  only the page server serves it.
 * - Or a COMMITTED generated file (`spec.committed`;  epic `epic-engine` P54):  Spell UI's root catalog, the epics
 *   pack, spell-epic's docs bundle
 *   - rebuilt only in a WORKTREE (`buildsWhenStale`;  Owen, Q61:  "Only in a worktree"):  the main checkout's
 *     `spell bundle --stale` writes nothing, and says what to run (`fixLine`)
 *   - its record in the install's git-ignored cache (`recordFile`), never beside the file it writes
 *   - the main checkout tells it's current by its `spec.check` command, never a record;  a worktree by its record,
 *     made by the first build or a passing check
 *   - "never edited by hand":  so a merge rewriting it says nothing, unlike a bundle's "changed since"
 * - `check()`:  stale when
 *   - never built
 *   - its entry is missing, or newer than its build
 *   - any file that build made is missing:  a lazy engine, a chunk, a script beside its folder (`missingFile()`;
 *     epic `epic-engine` I364:  with only the entry looked for, a lost engine was never built again)
 *   - its sources' hash isn't the one its last build recorded (`SRV.BUNDLE_RECORD`, in its output folder)
 * - `build()`:  runs its build command, then records the hash, and every file it made
 * - The page server runs `spell bundle --stale` once it listens, so a page always loads a current build.
 * - WHICH bundles:  the ones whose output folders the page server's settings name, `"bundles"`
 *   (every installed repo's `"pageServer"` part, merged:  `pageServerSettings()`), the list the page server reads too
 *   (`Bundle.specs()`)
 * - Its build scripts share their steps through it (`clearOutput()`, `linkBuiltInFiles()`, `sizeReport()`):
 *   Spell UI's site bundle's.
 * - Knows no checkout's LAYOUT:  each bundle by its PACKAGE (`SRV.BUNDLES`), found through the checkout's
 *   `node_modules` wherever its repo is (epic `repo-split` P8);  imports no other package.
 */
export class Bundle {
  /** the checkout's root */
  readonly root: string

  /** what to build, from where, into where */
  readonly spec: SRV.BundleSpec

  constructor(root: string, spec: SRV.BundleSpec) {
    this.root = root
    this.spec = spec
  }

  /** the bundle's name, e.g. `ui-site` */
  get name(): string {
    return this.spec.name
  }

  /** the folder of its package, `spec.package`, as the checkout finds it;  throws when it isn't installed */
  get packageDir(): string {
    const found = Bundle.packageDirFor(this.spec.package, this.root)
    if (!found) throw new Error(`Bundle:  ${this.spec.package} isn't installed where ${this.root} finds packages`)
    return found
  }

  /** its output folder, absolute */
  get outputDir(): string {
    return join(this.packageDir, this.spec.output)
  }

  /** its output folder, relative to the checkout, `/`-separated:  as the settings' `bundles` name it */
  get output(): string {
    return relative(SRV.RealPath.of(this.root), this.outputDir).split(sep).join("/")
  }

  /**
   * everything its build writes, relative to the checkout, `/`-separated:
   * its output folder, and what it writes beside it (`spec.generated`)
   */
  get outputs(): string[] {
    const root = SRV.RealPath.of(this.root)
    return this.writtenPaths().map((path) =>
      relative(root, SRV.RealPath.of(join(this.packageDir, path)))
        .split(sep)
        .join("/")
    )
  }

  /** `outputs`, as the spec spells them:  from its package's folder. */
  private writtenPaths(): string[] {
    return [...new Set([this.spec.output, ...(this.spec.generated ?? [])])]
  }

  /**
   * where its last build recorded its sources' hash:  in its output folder;  a committed one's in the install's
   * git-ignored cache (`node_modules/.cache/spell-bundles/<name>.json`)
   */
  get recordFile(): string {
    if (!this.spec.committed) return join(this.outputDir, SRV.BUNDLE_RECORD)
    return join(installRoot(this.root), "node_modules", ".cache", "spell-bundles", `${this.name}.json`)
  }

  /** Is the checkout a worktree (`SRV.checkoutOf()`), not the main checkout? */
  get isWorktree(): boolean {
    return SRV.checkoutOf(this.root)?.worktree !== undefined
  }

  /** Does `spell bundle --stale` build it here when it's stale?  A bundle anywhere;  a committed one in a worktree. */
  get buildsWhenStale(): boolean {
    return !this.spec.committed || this.isWorktree
  }

  /** What to run, and where, to build it by hand:  `run yarn gen:root in ui/`. */
  get fixLine(): string {
    const where = relative(SRV.RealPath.of(this.root), join(this.packageDir, this.spec.cwd)).split(sep).join("/")
    return `run ${this.spec.run.join(" ")} in ${where ? `${where}/` : "the checkout"}`
  }

  /**
   * Every bundle of the checkout at `root` (`Bundle.specs()`);  `names`:  only those, in that order.
   * - throws a `TypeError` naming the known bundles for an unknown name
   */
  static all(root: string, names: string[] = []): Bundle[] {
    const specs = Bundle.specs(root)
    if (!names.length) return specs.map((spec) => new Bundle(root, spec))
    return names.map((name) => {
      const spec = specs.find((each) => each.name === name)
      if (!spec) {
        const known = specs.map((each) => each.name).join(", ")
        throw new TypeError(`Bundle.all():  no bundle '${name}';  bundles:  ${known}`)
      }
      return new Bundle(root, spec)
    })
  }

  /**
   * The bundles of the checkout at `root`:  for each folder the page server's settings name in `"bundles"`
   * (`pageServerSettings()`:  spell-ui's part names its site's), in that order, the one of
   * `SRV.BUNDLES` that builds into it.
   * - ONE list, which the page server reads too (its `BundleBuild` waits on those folders)
   * - none without a list, as the page server
   * - throws a `TypeError` for a folder no bundle builds into
   */
  static specs(root: string): SRV.BundleSpec[] {
    return (pageServerSettings(root).bundles ?? []).map((folder) => {
      const wanted = SRV.RealPath.of(resolve(root, folder))
      const spec = SRV.BUNDLES.find((each) => {
        const dir = Bundle.packageDirFor(each.package, root)
        return dir !== undefined && SRV.RealPath.of(join(dir, each.output)) === wanted
      })
      if (!spec) throw new TypeError(`Bundle.specs():  no bundle builds into '${folder}' (the "pageServer" settings)`)
      return spec
    })
  }

  /**
   * Package `name`'s folder, as the checkout at `root` finds it:  installed (`node_modules`), else one of the page
   * server's settings parts by that name (a project beside the kit with its own install, epic
   * `repo-split` P20);  `undefined` when neither has it.
   */
  static packageDirFor(name: string, root: string): string | undefined {
    const installed = packageRootFor(name, root)
    if (installed) return installed
    return settingsParts(root).find(({ dir }) => {
      try {
        return (JSON.parse(readFileSync(join(dir, "package.json"), "utf8")) as { name?: string }).name === name
      } catch {
        return false
      }
    })?.dir
  }

  /**
   * Is it stale, and why.
   * - a committed one (`spec.committed`):  `checkCommitted()`
   */
  check(): SRV.BundleCheck {
    const sources = this.sourcesHash()
    const found = { name: this.name, output: this.output, sources }
    if (this.spec.committed) return this.checkCommitted(found)
    const record = this.record()
    if (!record) return { ...found, stale: "never built" }
    const entry = statSync(join(this.outputDir, this.spec.entry), { throwIfNoEntry: false })
    if (!entry) return { ...found, stale: `no ${this.spec.entry}` }
    // written after its build:  something else wrote it, e.g. a merge of a branch that still commits the bundle
    if (entry.mtimeMs > statSync(this.recordFile).mtimeMs)
      return { ...found, stale: `${this.spec.entry} changed since` }
    if (record.sources !== sources) return { ...found, stale: "built from older sources" }
    const missing = this.missingFile(record)
    if (missing) return { ...found, stale: `no ${missing}` }
    return found
  }

  /**
   * A committed one's `check()`:  stale when its entry is missing, and
   * - in the main checkout:  when its `spec.check` command fails (none:  current);  `fix` says what to run
   * - in a worktree:  when its sources' hash isn't its record's;  with no record, when its `spec.check` fails (a pass
   *   is recorded), or it has none
   * - SIDE EFFECT:  runs `spec.check`;  records a passing one in a worktree
   */
  private checkCommitted(found: SRV.BundleCheck): SRV.BundleCheck {
    const stale = (why: string) => ({ ...found, stale: why, ...(!this.isWorktree && { fix: this.fixLine }) })
    if (!existsSync(join(this.outputDir, this.spec.entry))) return stale(`no ${this.spec.entry}`)
    if (!this.isWorktree) return this.passesCheck() === false ? stale("its check failed") : found
    const record = this.record()
    if (record) return record.sources === found.sources ? found : stale("built from older sources")
    if (!this.passesCheck()) return stale("never built here")
    this.writeRecord(found.sources)
    return found
  }

  /** Its `spec.check` command's verdict, run in its `cwd`, quietly;  `undefined` when it has none. */
  private passesCheck(): boolean | undefined {
    if (!this.spec.check) return undefined
    const [command, ...args] = this.spec.check
    return spawnSync(command!, args, { cwd: join(this.packageDir, this.spec.cwd), stdio: "ignore" }).status === 0
  }

  /**
   * Record `sources` as what its build is current with, and the files it made (not a committed one's:  its output
   * folder holds sources too).
   * - SIDE EFFECT:  writes `recordFile`, making its folder
   */
  private writeRecord(sources: string): void {
    const record: SRV.BundleRecord = {
      sources,
      built: new Date().toISOString(),
      ...(!this.spec.committed && { files: this.builtFiles() })
    }
    mkdirSync(dirname(this.recordFile), { recursive: true })
    writeFileSync(this.recordFile, `${JSON.stringify(record, null, 2)}\n`)
  }

  /**
   * Is a file its build makes missing?  The quick half of `check()`, reading no source:  for a request to ask
   * (`BundleBuild.repairIfMissing()`).
   * - never built, or its record gone with its folder:  yes
   * - never a committed one
   */
  get isIncomplete(): boolean {
    if (this.spec.committed) return false
    const record = this.record()
    return !record || this.missingFile(record) !== undefined
  }

  /** The first file of `record`'s build, or its entry, that isn't there, from its package's folder;  else `undefined`. */
  private missingFile({ files = [] }: SRV.BundleRecord): string | undefined {
    const dir = this.packageDir
    const entry = posix.join(this.spec.output, this.spec.entry)
    return [entry, ...files].find((file) => !existsSync(join(dir, file)))
  }

  /**
   * What a build made, as it stands right after one, from its package's folder:  every file and link under what it
   * writes (`writtenPaths()`).
   * - never dot files (the record), nor a folder another run was building in (`UNFINISHED`)
   */
  private builtFiles(): string[] {
    const dir = this.packageDir
    const files = this.writtenPaths().flatMap((path) => {
      const stat = statSync(join(dir, path), { throwIfNoEntry: false })
      if (!stat?.isDirectory()) return stat ? [path] : []
      return filesUnder(join(dir, path), { links: "listed" }).map((file) => posix.join(path, file))
    })
    return [...new Set(files.filter((file) => !UNFINISHED.test(file)))]
  }

  /** Does it need a build?  `check()`, when the reason doesn't matter. */
  get isStale(): boolean {
    return this.check().stale !== undefined
  }

  /**
   * Run its build, then record the sources' hash it started from, and the files it made.
   * - `stdio`:  where the build's output goes (default:  this process's stderr, so a `--json` stdout stays clean)
   * - throws when the build fails;  it records nothing then, so the bundle stays stale
   * - SIDE EFFECT:  the build clears and rewrites `outputDir`
   */
  build({ stdio = ["ignore", 2, 2] }: { stdio?: StdioOptions } = {}): SRV.BundleBuilt {
    const sources = this.sourcesHash()
    const started = performance.now()
    const [command, ...args] = this.spec.run
    const cwd = join(this.packageDir, this.spec.cwd)
    const run = spawnSync(command!, args, { cwd, stdio })
    if (run.status !== 0) {
      const why = run.error ? run.error.message : `exit ${run.status ?? run.signal}`
      const where = relative(SRV.RealPath.of(this.root), cwd).split(sep).join("/") || "."
      throw new Error(`Bundle.build():  \`${this.spec.run.join(" ")}\` (in ${where}) failed:  ${why}`)
    }
    this.writeRecord(sources)
    return { name: this.name, sources, seconds: (performance.now() - started) / 1000 }
  }

  /**
   * The hash of every source file:  each one's name (`sourceFiles()`) and bytes, in name order.
   * - a missing source adds nothing, so adding it later changes the hash
   */
  sourcesHash(): string {
    const hash = createHash("sha256").update(`${BUNDLE_FORMAT}\n${this.spec.run.join(" ")}\n`)
    for (const [name, file] of this.sources()) hash.update(`${name}\n`).update(readFileSync(file))
    return hash.digest("hex").slice(0, 16)
  }

  /**
   * Its source files, sorted, by name:  a package's by its npm name and its path in it (`ui/src/core.ts`,
   * `spell/src/element/index.ts`),
   * anything else by its path from the install's root (`yarn.lock`);  `/`-separated.
   * - every file under `spec.sources`, minus `SKIPPED` (tests, snapshots, dot files, the icon packs and sounds), its own `entry`
   *   and what every committed one generates (`spec.generated`:  `generatedFiles()`)
   * - the same names wherever the repos are, so a move makes no bundle stale
   */
  sourceFiles(): string[] {
    return this.sources().map(([name]) => name)
  }

  /**
   * Where its sources are:  each of `spec.sources` as an absolute folder or file, as `sourceFiles()` finds them;
   * the ones not there left out.  For watching them (`BundleBuild.watch()`).
   */
  sourceRoots(): string[] {
    const roots: string[] = []
    for (const source of this.spec.sources) {
      const named = /^(@[^/]+\/[^/]+|[^@./][^/]*)(?:\/(.*))?$/.exec(source)
      const folder = named && Bundle.packageDirFor(named[1]!, this.root)
      if (named?.[1]!.startsWith("@") && !folder) continue
      const path = folder ? join(folder, named![2] ?? "") : join(installRoot(this.root), source)
      if (statSync(path, { throwIfNoEntry: false })) roots.push(path)
    }
    return roots
  }

  /**
   * What its build may never count as a source, absolute:  its own `entry`, and every bundle's `spec.generated`
   * (`SRV.BUNDLES`, those whose package the checkout has), so a build writing beside another's sources never makes
   * that one stale.
   */
  private generatedFiles(): Set<string> {
    const files = new Set([join(SRV.RealPath.of(this.outputDir), this.spec.entry)])
    for (const spec of SRV.BUNDLES) {
      const dir = spec.generated?.length ? Bundle.packageDirFor(spec.package, this.root) : undefined
      for (const path of dir ? spec.generated! : []) files.add(join(SRV.RealPath.of(dir!), path))
    }
    return files
  }

  /** `sourceFiles()`'s names, each with its file, absolute;  sorted by name. */
  private sources(): Array<[name: string, file: string]> {
    const found: Array<[string, string]> = []
    const generated = this.generatedFiles()
    for (const source of this.spec.sources) {
      // a package by its npm name:  scoped (`@scope/name/src`), or unscoped when one's installed by that name
      // (`spell/ui/src`, `spell/src/element`, epic `repo-split` P9 / P11 / P14 / P20);  else a path from the install's root
      // (`yarn.lock`)
      const named = /^(@[^/]+\/[^/]+|[^@./][^/]*)(?:\/(.*))?$/.exec(source)
      const folder = named && Bundle.packageDirFor(named[1]!, this.root)
      if (named?.[1]!.startsWith("@") && !folder) continue
      // by its real path:  the generated files are, whichever package name reached them (`spell/ui`, `spell-ui`)
      const base = SRV.RealPath.of(folder ?? installRoot(this.root))
      const prefix = folder ? named![1]! : ""
      walk(join(base, folder ? (named![2] ?? "") : source), base, prefix)
    }
    return found.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))

    /** add `path`, or every file under it, to `found`, named from `base` with `prefix` */
    function walk(path: string, base: string, prefix: string): void {
      const stat = statSync(path, { throwIfNoEntry: false })
      if (!stat || generated.has(path)) return
      if (!stat.isDirectory()) {
        const name = relative(base, path).split(sep).join("/")
        found.push([prefix ? `${prefix}/${name}` : name, path])
        return
      }
      for (const entry of readdirSync(path, { withFileTypes: true })) {
        if (SKIPPED.test(entry.name)) continue
        if (entry.isDirectory() || entry.isFile()) walk(join(path, entry.name), base, prefix)
      }
    }
  }

  ////////////////
  // ## A build script's steps
  ////////////////

  /**
   * Empty `folder` for a fresh build, so a removed chunk doesn't linger:  everything but the built-in files' links
   * (`linkBuiltInFiles()`), the build record too;  makes it when missing.
   * - SIDE EFFECT:  deletes files
   */
  static clearOutput(folder: string): void {
    mkdirSync(folder, { recursive: true })
    for (const entry of readdirSync(folder)) {
      if (!(entry in BUILT_IN_FILES)) rmSync(join(folder, entry), { recursive: true, force: true })
    }
  }

  /**
   * Link Spell UI's built-in files into `folder`, each unless it's linked there already (`BUILT_IN_FILES`):
   * - its icon packs (its `src/icons/icon-packs`, ~8.7 MB, ~2,200 SVGs), as `icon-packs`
   * - Spell's built-in sounds (its `src/sounds/sound-library`, 1.5 MB, 139 sounds), as `sound-library`
   * - LINKS, never copies:  committing them twice would double them in every clone.
   *   The page server follows them;  a static deploy must copy through them (`cp -RL`).
   * - Relative, so the repos can move together;  Spell UI found in the ONE package `spell` (its `ui/`), wherever it is.
   * - A link left from another layout (the monorepo's `../../../ui/...`) is pointed again.
   * - throws when Spell UI isn't installed, or a link leads to no folder
   * - SIDE EFFECT:  makes or replaces the links
   */
  static linkBuiltInFiles(folder: string): void {
    const spell = packageRootFor("spell", folder)
    if (!spell) throw new Error(`Bundle.linkBuiltInFiles():  spell isn't installed where ${folder} finds packages`)
    for (const [name, from] of Object.entries(BUILT_IN_FILES)) {
      const link = join(folder, name)
      const target = relative(SRV.RealPath.of(folder), join(SRV.RealPath.of(spell), from))
      if (isLink(link) && readlinkSync(link) !== target) rmSync(link)
      if (!existsSync(link) && !isLink(link)) symlinkSync(target, link, "dir")
      if (!statSync(link).isDirectory()) {
        throw new Error(`Bundle.linkBuiltInFiles():  ${link} doesn't lead to ${from};  delete it, and build again`)
      }
    }
  }

  /**
   * The lines that report the sizes of the bundle built in `folder`:  its eager files, the totals, the biggest lazy
   * chunks;  raw, gzipped and brotli, in `kb()`.
   * - eager and counted:  as `firstLoad()` says
   */
  static sizeReport({ name, folder, seconds, entries, only }: SRV.BundleSizeParams): string[] {
    const { files: eager, lazy, all } = Bundle.firstLoad({ folder, entries, only })
    return [
      `${name} bundle (${seconds.toFixed(1)}s):  ${relative(process.cwd(), folder)}/`,
      ...eager.slice(0, 4).map((size) => `  ${size.file.padEnd(28)} ${kb(size.raw).padStart(10)}  gz ${kb(size.gzip)}`),
      `  eager ${kb(sum(eager, "raw"))} (gz ${kb(sum(eager, "gzip"))}, br ${kb(sum(eager, "brotli"))});  ` +
        `all ${all.length} files ${kb(sum(all, "raw"))} (gz ${kb(sum(all, "gzip"))}), icon packs and sounds linked`,
      `  biggest lazy:  ${lazy
        .slice(0, 6)
        .map((size) => `${size.file} ${kb(size.raw)}`)
        .join(", ")}`
    ]
  }

  /**
   * What a page loads FIRST of the bundle built in `folder`, and the rest, each file sized raw, gzipped and brotli,
   * the way a browser fetches them:  each file on its own (`sizesOf()`).
   * - eager (`files`):  `entries` and every chunk a JS one imports STATICALLY, transitively (what a page loads before
   *   any `import()`), biggest first;  `raw`, `gzip`, `brotli` are their sums
   * - `lazy`:  every other file, biggest first;  `all`:  both
   * - counted:  every file under `folder` but the linked built-in files and dot files (the build record), or only those
   *   `only` matches
   * - the ONE way a bundle is sized:  `sizeReport()`, and the app's size budgets (`spell perf budget`)
   */
  static firstLoad({ folder, entries, only }: Omit<SRV.BundleSizeParams, "name" | "seconds">): SRV.BundleLoad {
    const files = filesUnder(folder).filter((file) => !only || only.test(file))
    const sizes = files.map((file) => ({ file, ...Bundle.sizesOf(readFileSync(join(folder, file))) }))
    const eagerFiles = new Set<string>()
    for (const entry of entries) {
      if (entry.endsWith(".js")) staticGraph(folder, entry, eagerFiles)
      else eagerFiles.add(entry)
    }
    const eager = sizes.filter((size) => eagerFiles.has(size.file)).sort((a, b) => b.raw - a.raw)
    const lazy = sizes.filter((size) => !eagerFiles.has(size.file)).sort((a, b) => b.raw - a.raw)
    return {
      files: eager,
      raw: sum(eager, "raw"),
      gzip: sum(eager, "gzip"),
      brotli: sum(eager, "brotli"),
      lazy,
      all: sizes
    }
  }

  /**
   * `bytes` raw, gzipped (level 9) and brotli (quality 11):  as a host that compresses its files ahead would send them.
   * - brotli is the size budgets' unit (epic `solid-2-final` P1)
   */
  static sizesOf(bytes: Buffer): SRV.CompressedSizes {
    return {
      raw: bytes.length,
      gzip: gzipSync(bytes, { level: 9 }).length,
      brotli: brotliCompressSync(bytes, {
        params: { [zlib.BROTLI_PARAM_QUALITY]: 11, [zlib.BROTLI_PARAM_SIZE_HINT]: bytes.length }
      }).length
    }
  }

  /** what its last build recorded;  `undefined` when never built, or unreadable */
  record(): SRV.BundleRecord | undefined {
    try {
      return JSON.parse(readFileSync(this.recordFile, "utf8")) as SRV.BundleRecord
    } catch {
      return undefined
    }
  }
}

/** Bump to make every bundle stale once, e.g. when what a build records changes. */
const BUNDLE_FORMAT = "bundle 3"

/** A folder a build was still writing, or left when it was stopped (`ComponentPack`'s `epics.building-<pid>`):  no build's file. */
const UNFINISHED = /\.building-\d+(\/|$)/

/** The install's root above `from`:  the nearest folder up holding `yarn.lock`;  `from` itself without one. */
function installRoot(from: string): string {
  return findUp(from, "yarn.lock") ?? resolve(from)
}

/**
 * Names never part of a bundle's sources:  dot files, `node_modules`, snapshots, tests, and the built-in files
 * (each bundle LINKS Spell UI's icon packs and sounds, never bundles them).
 */
const SKIPPED = /^(\..*|node_modules|__snapshots__|icon-packs|sound-library|.*\.test\.[cm]?[jt]sx?)$/

/**
 * Spell UI's built-in files, linked into a bundle's output folder (`linkBuiltInFiles()`):
 * each link's name => its folder in the package `spell`.
 * - The entries a fresh build keeps (`clearOutput()`).
 */
const BUILT_IN_FILES: Record<string, string> = {
  "icon-packs": "ui/src/icons/icon-packs",
  "sound-library": "ui/src/sounds/sound-library"
}

/** A static `import ... from "./x.js"` / `import "./x.js"` in minified output (never `import("./x.js")`). */
const STATIC_IMPORT = /(?:^|[;}\n])\s*(?:import|export)(?:[^"'();]*?from)?\s*["'](\.\.?\/[^"']+)["']/g

/** Is `file` a symlink (even a broken one)? */
function isLink(file: string): boolean {
  try {
    return lstatSync(file).isSymbolicLink()
  } catch {
    return false
  }
}

/**
 * Every file under `folder`, `/`-separated, relative:  never through a link (the icon packs, the sounds), nor a dot
 * file.
 * - `links`:  `"listed"` names each link itself;  default `"skipped"`
 */
function filesUnder(folder: string, { links = "skipped" }: { links?: "skipped" | "listed" } = {}): string[] {
  return readdirSync(folder, { withFileTypes: true }).flatMap((entry) => {
    if (entry.name.startsWith(".")) return []
    if (entry.isSymbolicLink()) return links === "listed" ? [entry.name] : []
    if (!entry.isDirectory()) return [entry.name]
    return filesUnder(join(folder, entry.name), { links }).map((file) => `${entry.name}/${file}`)
  })
}

/** Add `entry` (in `folder`) and every chunk it imports STATICALLY, transitively, to `seen`. */
function staticGraph(folder: string, entry: string, seen: Set<string>): void {
  if (seen.has(entry) || !existsSync(join(folder, entry))) return
  seen.add(entry)
  const code = readFileSync(join(folder, entry), "utf8")
  for (const match of code.matchAll(STATIC_IMPORT)) {
    staticGraph(folder, posix.join(posix.dirname(entry), match[1]!), seen)
  }
}

/** The sum of `key` over `list`, bytes. */
function sum(list: readonly SRV.FileSizes[], key: keyof SRV.CompressedSizes): number {
  return list.reduce((total, size) => total + size[key], 0)
}
