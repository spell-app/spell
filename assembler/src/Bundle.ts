import { spawnSync, type StdioOptions } from "node:child_process"
import { createHash } from "node:crypto"
import { existsSync, readdirSync, readFileSync, realpathSync, statSync, writeFileSync } from "node:fs"
import { basename, dirname, join, relative, resolve, sep } from "node:path"

import { AS } from "$/assembler"

/**
 * One bundle of the checkout at `root` that is BUILT on demand, never committed (`AS.BUNDLES`).
 * - The brand pages' and Spell UI's docs site's:  only the page server serves them.
 * - `check()`:  stale when
 *   - never built
 *   - its entry is missing, or newer than its build
 *   - its sources' hash isn't the one its last build recorded (`AS.BUNDLE_RECORD`, in its output folder)
 * - `build()`:  runs its build command, then records the hash
 * - The page server runs `spell dev bundles build --stale` when it starts, so a page always loads a current build.
 * - WHICH bundles:  the ones whose output folders the checkout's root `package.json` names,
 *   in `"pageServer": { "bundles": [...] }`, the list the page server reads too (`Bundle.specs()`)
 * - Knows no checkout's LAYOUT:  each bundle by its PACKAGE (`AS.BUNDLES`), found through the checkout's
 *   `node_modules` wherever its repo is (epic `repo-split` P8);  imports no other package.
 */
export class Bundle {
  /** the checkout's root */
  readonly root: string

  /** what to build, from where, into where */
  readonly spec: AS.BundleSpec

  constructor(root: string, spec: AS.BundleSpec) {
    this.root = root
    this.spec = spec
  }

  /** the bundle's name, e.g. `brand` */
  get name(): string {
    return this.spec.name
  }

  /** the folder of its package, `spec.package`, as the checkout finds it;  throws when it isn't installed */
  get packageDir(): string {
    const found = packageFolder(this.spec.package, this.root)
    if (!found) throw new Error(`Bundle:  ${this.spec.package} isn't installed where ${this.root} finds packages`)
    return found
  }

  /** its output folder, absolute */
  get outputDir(): string {
    return join(this.packageDir, this.spec.output)
  }

  /** its output folder, relative to the checkout, `/`-separated:  as the settings' `bundles` name it */
  get output(): string {
    return relative(canonical(this.root), this.outputDir).split(sep).join("/")
  }

  /** where its last build recorded its sources' hash */
  get recordFile(): string {
    return join(this.outputDir, AS.BUNDLE_RECORD)
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
   * The bundles of the checkout at `root`:  for each folder its `package.json` names in
   * `"pageServer": { "bundles": [...] }`, in that order, the one of `AS.BUNDLES` that builds into it.
   * - ONE list, which the page server reads too (page-server's `BundleBuild` waits on those folders)
   * - none without a list, as the page server
   * - throws a `TypeError` for a folder no bundle builds into
   */
  static specs(root: string): AS.BundleSpec[] {
    const file = join(root, "package.json")
    if (!existsSync(file)) return []
    const settings = JSON.parse(readFileSync(file, "utf8")) as { pageServer?: { bundles?: string[] } }
    return (settings.pageServer?.bundles ?? []).map((folder) => {
      const wanted = canonical(resolve(root, folder))
      const spec = AS.BUNDLES.find((each) => {
        const dir = packageFolder(each.package, root)
        return dir !== undefined && canonical(join(dir, each.output)) === wanted
      })
      if (!spec) throw new TypeError(`Bundle.specs():  no bundle builds into '${folder}' (package.json's "pageServer")`)
      return spec
    })
  }

  /** Is it stale, and why. */
  check(): AS.BundleCheck {
    const sources = this.sourcesHash()
    const found = { name: this.name, output: this.output, sources }
    const record = this.record()
    if (!record) return { ...found, stale: "never built" }
    const entry = statSync(join(this.outputDir, this.spec.entry), { throwIfNoEntry: false })
    if (!entry) return { ...found, stale: `no ${this.spec.entry}` }
    // written after its build:  something else wrote it, e.g. a merge of a branch that still commits the bundle
    if (entry.mtimeMs > statSync(this.recordFile).mtimeMs)
      return { ...found, stale: `${this.spec.entry} changed since` }
    if (record.sources !== sources) return { ...found, stale: "built from older sources" }
    return found
  }

  /** Does it need a build?  `check()`, when the reason doesn't matter. */
  get isStale(): boolean {
    return this.check().stale !== undefined
  }

  /**
   * Run its build, then record the sources' hash it started from.
   * - `stdio`:  where the build's output goes (default:  this process's stderr, so a `--json` stdout stays clean)
   * - throws when the build fails;  it records nothing then, so the bundle stays stale
   * - SIDE EFFECT:  the build clears and rewrites `outputDir`
   */
  build({ stdio = ["ignore", 2, 2] }: { stdio?: StdioOptions } = {}): AS.BundleBuilt {
    const sources = this.sourcesHash()
    const started = performance.now()
    const [command, ...args] = this.spec.run
    const cwd = join(this.packageDir, this.spec.cwd)
    const run = spawnSync(command!, args, { cwd, stdio })
    if (run.status !== 0) {
      const why = run.error ? run.error.message : `exit ${run.status ?? run.signal}`
      const where = relative(canonical(this.root), cwd).split(sep).join("/") || "."
      throw new Error(`Bundle.build():  \`${this.spec.run.join(" ")}\` (in ${where}) failed:  ${why}`)
    }
    const record: AS.BundleRecord = { sources, built: new Date().toISOString() }
    writeFileSync(this.recordFile, `${JSON.stringify(record, null, 2)}\n`)
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
   * Its source files, sorted, by name:  a package's by its npm name and its path in it (`@spell-app/ui/src/core.ts`,
   * `spell-kit/element/src/index.ts`),
   * anything else by its path from the install's root (`yarn.lock`);  `/`-separated.
   * - every file under `spec.sources`, minus `SKIPPED` (tests, snapshots, dot files, the icon packs)
   * - the same names wherever the repos are, so a move makes no bundle stale
   */
  sourceFiles(): string[] {
    return this.sources().map(([name]) => name)
  }

  /** `sourceFiles()`'s names, each with its file, absolute;  sorted by name. */
  private sources(): Array<[name: string, file: string]> {
    const found: Array<[string, string]> = []
    for (const source of this.spec.sources) {
      // a package by its npm name:  scoped (`@spell-app/ui/src`), or unscoped when one's installed by that name
      // (`spell-kit/element/src`, epic `repo-split` P9);  else a path from the install's root (`yarn.lock`)
      const named = /^(@[^/]+\/[^/]+|[^@./][^/]*)(?:\/(.*))?$/.exec(source)
      const folder = named && packageFolder(named[1]!, this.root)
      if (named?.[1]!.startsWith("@") && !folder) continue
      const base = folder ?? installRoot(this.root)
      const prefix = folder ? named![1]! : ""
      walk(join(base, folder ? (named![2] ?? "") : source), base, prefix)
    }
    return found.sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0))

    /** add `path`, or every file under it, to `found`, named from `base` with `prefix` */
    function walk(path: string, base: string, prefix: string): void {
      const stat = statSync(path, { throwIfNoEntry: false })
      if (!stat) return
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

  /** what its last build recorded;  `undefined` when never built, or unreadable */
  record(): AS.BundleRecord | undefined {
    try {
      return JSON.parse(readFileSync(this.recordFile, "utf8")) as AS.BundleRecord
    } catch {
      return undefined
    }
  }
}

/** Bump to make every bundle stale once, e.g. when what a build records changes. */
const BUNDLE_FORMAT = "bundle 2"

/**
 * The real folder of package `name` as `from` finds it in `node_modules` (each folder up, as node does);
 * `undefined` when it isn't installed.
 */
function packageFolder(name: string, from: string): string | undefined {
  for (let at = resolve(from); ; at = dirname(at)) {
    const link = join(at, "node_modules", name)
    if (existsSync(join(link, "package.json"))) return realpathSync(link)
    if (dirname(at) === at) return undefined
  }
}

/** The install's root above `from`:  the nearest folder up holding `yarn.lock`;  `from` itself without one. */
function installRoot(from: string): string {
  for (let at = resolve(from); ; at = dirname(at)) {
    if (existsSync(join(at, "yarn.lock"))) return at
    if (dirname(at) === at) return resolve(from)
  }
}

/** `path` with its links followed as far as it exists:  two spellings of one folder compare equal. */
function canonical(path: string): string {
  if (existsSync(path)) return realpathSync(path)
  const parent = dirname(path)
  return parent === path ? path : join(canonical(parent), basename(path))
}

/**
 * Names never part of a bundle's sources:  dot files, `node_modules`, snapshots, tests, and the icon packs
 * (each bundle LINKS Spell UI's `src/icons/icon-packs`, never bundles it).
 */
const SKIPPED = /^(\..*|node_modules|__snapshots__|icon-packs|.*\.test\.[cm]?[jt]sx?)$/
