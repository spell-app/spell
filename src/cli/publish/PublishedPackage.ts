import { execFileSync } from "node:child_process"
import { chmodSync, cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { dirname, join, posix } from "node:path"

import {
  DIST,
  DOC_FILES,
  KEPT_FIELDS,
  PackageBuild,
  type BuildReport,
  type PackedPackage,
  type PublishCheck,
  type PublishedRepo,
  type SourceManifest
} from "spell/cli/publish"

/****************
 * ### PublishedPackage
 * One repo's npm package:  its staging folder (`dist-packs/stage/<name>/`), exactly what ships, then packed.
 * - `stage()`:  the build (`PackageBuild`), its bins, its docs and other files, and the PUBLISHED `package.json`
 *   (`manifest()`);  the checkout's own `package.json` never changes (the kit's stays `private`, with its
 *   `workspaces`, for yarn).
 * - `pack()`:  `npm pack` of the staging folder, into `dist-packs/`.
 * - `checks()`:  what the packed file list and the published `package.json` must hold.
 ****************/
export class PublishedPackage {
  /** What the build reported, once `stage()` ran. */
  built?: BuildReport

  constructor(
    readonly repo: PublishedRepo,
    /** its staging folder, absolute */
    readonly stageDir: string,
    /** the one version every package publishes at */
    readonly version: string,
    /**
     * the published `dependencies` of each name, beyond its own:  the kit's names every other package
     * (`npm install spell` brings everything)
     */
    readonly extraDependencies: Record<string, string> = {},
    /** the yarn `catalog:` versions, by package (the kit's `.yarnrc.yml`) */
    readonly catalog: Record<string, string> = {}
  ) {}

  /** The package's name. */
  get name(): string {
    return this.repo.name
  }

  /** Build and fill the staging folder, emptied first.  Throws on a compile error. */
  async stage(): Promise<BuildReport> {
    rmSync(this.stageDir, { recursive: true, force: true })
    mkdirSync(this.stageDir, { recursive: true })
    this.built = await new PackageBuild(this.repo, this.stageDir, this.version).build()
    this.writeBins()
    for (const file of readdirSync(this.repo.root)) {
      if (DOC_FILES.test(file)) cpSync(join(this.repo.root, file), join(this.stageDir, file))
    }
    for (const file of this.repo.settings.files ?? []) {
      mkdirSync(dirname(join(this.stageDir, file)), { recursive: true })
      cpSync(join(this.repo.root, file), join(this.stageDir, file), { recursive: true })
    }
    writeFileSync(join(this.stageDir, "package.json"), `${JSON.stringify(this.manifest(), null, 2)}\n`)
    return this.built
  }

  ////////////////
  // ## The published package.json
  ////////////////

  /**
   * The `package.json` npm publishes:  the checkout's, made for an install with no checkout.
   * - Kept:  `KEPT_FIELDS` (name, description, license, `peerDependencies` ...).
   * - `version`:  the one version.
   * - `dependencies`:  `workspace:*` => the one version, `catalog:` => the catalog's, plus `extraDependencies`.
   * - `exports`:  every name to its built file and declarations (`publishedExports()`).
   * - `bin`, `files`:  what `stage()` wrote.
   * - `sideEffects`, `"spell"` (its commands and hooks) and `"pageServer"`:  their `src/` paths made `dist/` ones.
   * - Dropped:  `private`, `workspaces`, `scripts` (the `postinstall` with them), `devDependencies`,
   *   `resolutions`, `publishConfig`, and the checkout's own settings (`spellTypes`, `spellPack`, `spellPublish` ...).
   */
  manifest(): Record<string, unknown> {
    const source = this.repo.manifest
    const out: Record<string, unknown> = {}
    for (const field of KEPT_FIELDS) if (source[field] !== undefined) out[field] = source[field]
    out.version = this.version
    const exports = publishedExports(source, this.distFiles())
    if (exports["."]) Object.assign(out, { main: "./dist/index.js", types: "./dist/index.d.ts" })
    out.exports = exports
    const bins = Object.keys(this.repo.settings.bin ?? {})
    if (bins.length) out.bin = Object.fromEntries(bins.map((name) => [name, `./${this.binPath(name)}`]))
    out.files = this.stagedEntries()
    const sideEffects = source.sideEffects
    if (Array.isArray(sideEffects)) out.sideEffects = sideEffects.flatMap((entry: string) => builtPathOrNone(entry))
    else if (sideEffects !== undefined) out.sideEffects = sideEffects
    out.dependencies = this.dependencies()
    if (source.spell) out.spell = this.shippedSpellEntry(source.spell as Record<string, string>)
    if (source.pageServer) out.pageServer = mapStrings(source.pageServer, builtPath)
    for (const field of ["peerDependencies", "optionalDependencies"] as const) {
      if (out[field]) out[field] = this.resolvedVersions(out[field] as Record<string, string>)
    }
    return out
  }

  /**
   * The `"spell"` entry (its commands and hooks), at their built files:  only those the package ships (Spell UI's
   * commands are its repo's tools, left out, so its published package adds none).
   */
  private shippedSpellEntry(entry: Record<string, string>): Record<string, string> | undefined {
    const shipped = Object.entries(entry)
      .map(([key, path]) => [key, builtPath(path)] as const)
      .filter(([, path]) => existsSync(join(this.stageDir, path)))
    return shipped.length ? Object.fromEntries(shipped) : undefined
  }

  /** The published `dependencies`. */
  private dependencies(): Record<string, string> {
    return this.resolvedVersions({ ...this.repo.manifest.dependencies, ...this.extraDependencies })
  }

  /** `versions` with yarn's `workspace:` and `catalog:` made versions npm reads. */
  private resolvedVersions(versions: Record<string, string>): Record<string, string> {
    return Object.fromEntries(
      Object.entries(versions).map(([name, version]) => {
        if (version.startsWith("workspace:")) return [name, this.version]
        if (version.startsWith("catalog:")) {
          const resolved = this.catalog[name]
          if (!resolved)
            throw new TypeError(`PublishedPackage:  ${this.name}'s ${name} is "catalog:", not in the catalog`)
          return [name, resolved]
        }
        return [name, version]
      })
    )
  }

  /** The built files, from the staging folder (`dist/util/index.js` ...). */
  private distFiles(): string[] {
    const dist = join(this.stageDir, DIST)
    if (!existsSync(dist)) return []
    return readdirSync(dist, { recursive: true, withFileTypes: true })
      .filter((entry) => entry.isFile())
      .map((entry) => posix.join(DIST, posix.relative(dist.split("\\").join("/"), entry.parentPath), entry.name))
  }

  /** The staging folder's top-level files and folders, but `package.json`:  `package.json`'s `files` (npm adds only `README.md` by itself, not `README-vscode.md`). */
  private stagedEntries(): string[] {
    return readdirSync(this.stageDir).filter((entry) => entry !== "package.json")
  }

  ////////////////
  // ## Bins
  ////////////////

  /** Each `bin`, at `binPath()`:  a file that imports its module's build, run when imported. */
  private writeBins(): void {
    for (const [name, module] of Object.entries(this.repo.settings.bin ?? {})) {
      const file = join(this.stageDir, this.binPath(name))
      mkdirSync(dirname(file), { recursive: true })
      writeFileSync(
        file,
        `#!/usr/bin/env node\n// \`${name}\`:  runs ${this.name}'s built \`${module}\` (written by \`spell publish\`)\n` +
          `await import("../${DIST}/${module}.js")\n`
      )
      chmodSync(file, 0o755)
    }
  }

  /**
   * Where bin `name` goes, from the package's root:  where the checkout's own is (`bin/spell.mjs`, `bin/epic`), so a
   * tool that runs it by path finds it, a `.ts` one as `.js` (node runs no TypeScript from `node_modules`);
   * else `bin/<name>.js`.
   */
  private binPath(name: string): string {
    const own = (this.repo.manifest.bin as Record<string, string> | undefined)?.[name]
    return own ? posix.normalize(own).replace(/\.ts$/, ".js") : `bin/${name}.js`
  }

  ////////////////
  // ## Packing and checks
  ////////////////

  /** `npm pack` the staging folder into `packsDir`:  the packed file and its list.  Throws when npm fails. */
  pack(packsDir: string): PackedPackage {
    const json = execFileSync("npm", ["pack", this.stageDir, "--json", "--pack-destination", packsDir], {
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"]
    })
    const [result] = JSON.parse(json) as NpmPackResult[]
    if (!result) throw new Error(`PublishedPackage.pack():  npm pack printed nothing for ${this.name}`)
    return {
      name: result.name,
      version: result.version,
      tgz: join(packsDir, result.filename),
      size: result.size,
      unpackedSize: result.unpackedSize,
      files: result.files.map((entry) => entry.path)
    }
  }

  /**
   * What `packed` and the published `package.json` must hold:
   * - built files only:  no TypeScript but declarations, no `src/` (C20)
   * - nothing a checkout needs:  no `private`, `workspaces`, `devDependencies`, `postinstall`, `workspace:`, `catalog:`
   * - every `exports` file there
   * - no copy of the kit's element code in another package:  `class DOMElement` only in `spell` (C22)
   * - the build placed every import
   */
  checks(packed: PackedPackage): PublishCheck[] {
    const manifest = JSON.parse(readFileSync(join(this.stageDir, "package.json"), "utf8")) as Record<string, unknown>
    const check = (name: string, problems: string[]): PublishCheck => ({
      pkg: this.name,
      check: name,
      ok: !problems.length,
      ...(problems.length && { detail: problems.slice(0, 5).join(";  ") + (problems.length > 5 ? " ..." : "") })
    })
    // a shipped data folder's spell projects (`spaces/`) keep their `.ts`:  the code is `dist/` and `bin/`
    const typescript = packed.files.filter(
      (file) => /^(dist|bin)\//.test(file) && /\.(tsx?|mts)$/.test(file) && !file.endsWith(".d.ts")
    )
    const checkoutOnly = ["private", "workspaces", "devDependencies", "scripts", "resolutions"].filter(
      (field) => field in manifest
    )
    const yarnVersions = Object.entries((manifest.dependencies ?? {}) as Record<string, string>)
      .filter(([, version]) => /^(workspace|catalog):/.test(version))
      .map(([name]) => name)
    const missing = exportTargets(manifest.exports)
      .filter((target) => !target.includes("*"))
      .filter((target) => !packed.files.includes(target.replace(/^\.\//, "")))
    const elementCopies =
      this.name === "spell"
        ? []
        : packed.files.filter(
            (file) =>
              file.endsWith(".js") &&
              /\bclass DOMElement\b|\bDOMElement = class\b/.test(readFileSync(join(this.stageDir, file), "utf8"))
          )
    return [
      check("built code only (no TypeScript in dist/ or bin/ but declarations, no code in src/)", [
        ...typescript,
        ...packed.files.filter((file) => file.startsWith("src/") && CODE_IN_SRC.test(file))
      ]),
      check("no checkout-only fields or yarn versions", [...checkoutOnly, ...yarnVersions]),
      check("every exports file is packed", missing),
      check("no copy of the kit's element code (one DOMElement)", elementCopies),
      check("every import placed", this.built?.warnings ?? [])
    ]
  }
}

/**
 * Code in a package's `src/`:  never shipped.  A doc there may be (spell-epic's skills link
 * `${CLAUDE_PLUGIN_ROOT}/src/AGENTS.md`).
 */
const CODE_IN_SRC = /\.(tsx?|mts|jsx?|mjs)$/

/** One package's line of `npm pack --json`. */
type NpmPackResult = {
  name: string
  version: string
  filename: string
  size: number
  unpackedSize: number
  files: { path: string }[]
}

////////////////
// ## Paths and exports
////////////////

/**
 * A checkout path made its published one:  `./src/x/y.ts` => `./dist/x/y.js`, `src/tools/_assets` =>
 * `dist/tools/_assets`;  any other path as it is.
 */
export function builtPath(path: string): string {
  const match = /^(\.\/)?src\/(.*)$/.exec(path)
  if (!match) return path
  const rest = match[2]!
  if (rest.endsWith(".d.ts")) return `${match[1] ?? ""}${DIST}/${rest}`
  return `${match[1] ?? ""}${DIST}/${rest.replace(/\.(mts|mjs)$/, ".mjs").replace(/\.(tsx?|jsx?)$/, ".js")}`
}

/** A `sideEffects` entry, published:  a `src/` path made a `dist/` one, a bare glob kept, any other path dropped. */
function builtPathOrNone(entry: string): string[] {
  if (!entry.startsWith("./")) return [entry]
  return entry.startsWith("./src/") ? [builtPath(entry)] : []
}

/** `value` with `map` applied to every string in it, however deep. */
function mapStrings(value: unknown, map: (text: string) => string): unknown {
  if (typeof value === "string") return map(value)
  if (Array.isArray(value)) return value.map((item) => mapStrings(item, map))
  if (value && typeof value === "object") {
    return Object.fromEntries(Object.entries(value).map(([key, item]) => [key, mapStrings(item, map)]))
  }
  return value
}

/**
 * The published `exports`:  every name the checkout's `exports` gives, to the built file and its declarations.
 * - `./*` (and `./*.ts`, plain node's):  `./dist/*.js`, `./dist/*.d.ts`.
 * - Every folder with an `index` gets its own entry (`./util` => `./dist/util/index.js`):  node's `exports` add no
 *   `index`, so `./*` alone would look for `dist/util.js`.
 * - An explicit entry of the checkout's (`./toolchain/lint/imports`) keeps its name, at its built file.
 * - `./*.json`, `./*.css`, `./*.d.ts`, `./*.mjs`, `./*.js`:  those files as they are (spell-epic's hooks import
 *   `spell-epic/window.mjs`).
 * - Entries outside `src/` (a `vite.config.ts`) are dropped:  they don't ship.
 * - The repo's own extra names (`"spellPublish": { "exports" }`):  Spell UI's short names, `./ui-*`.
 * - Only `types` and `default`:  the `<package>-source` condition is the checkout's.
 */
export function publishedExports(source: SourceManifest, distFiles: string[]): Record<string, unknown> {
  const exports: Record<string, unknown> = {}
  const shipped = new Set(distFiles)
  for (const [key, value] of Object.entries(source.exports ?? {})) {
    if (key.includes("*") || key === "./package.json") continue
    const file = defaultTarget(value)
    if (!file?.startsWith("./src/")) continue
    const built = builtPath(file)
    if (!shipped.has(built.slice(2))) continue
    exports[key] = /\.(m?js)$/.test(built)
      ? withTypes(built, shipped)
      : file.endsWith(".d.ts")
        ? { types: built }
        : built
  }
  for (const file of distFiles) {
    const index = /^dist\/(.+)\/index\.js$/.exec(file) ?? (file === "dist/index.js" ? [file, ""] : null)
    if (!index) continue
    const key = index[1] ? `./${index[1]}` : "."
    exports[key] ??= withTypes(`./${file}`, shipped)
  }
  for (const [key, module] of Object.entries(source.spellPublish?.exports ?? {})) {
    const types = `./${DIST}/${module}.d.ts`
    exports[key] = { types, default: `./${DIST}/${module}.js` }
  }
  return {
    ...exports,
    "./*.json": "./dist/*.json",
    "./*.css": "./dist/*.css",
    "./*.d.ts": "./dist/*.d.ts",
    "./*.mjs": "./dist/*.mjs",
    "./*.js": "./dist/*.js",
    "./*.ts": { types: "./dist/*.d.ts", default: "./dist/*.js" },
    "./*": { types: "./dist/*.d.ts", default: "./dist/*.js" },
    "./package.json": "./package.json"
  }
}

/** An `exports` value for built file `built`:  with its declarations when they ship. */
function withTypes(built: string, shipped: Set<string>): unknown {
  const types = built.replace(/\.m?js$/, ".d.ts")
  return shipped.has(types.slice(2)) ? { types, default: built } : built
}

/** The file an `exports` value names for a bundler:  its `default`, else its one path. */
function defaultTarget(value: unknown): string | undefined {
  if (typeof value === "string") return value
  if (Array.isArray(value)) return defaultTarget(value[0])
  if (value && typeof value === "object") return defaultTarget((value as Record<string, unknown>).default)
  return undefined
}

/** Every file an `exports` map names, its conditions' too. */
function exportTargets(value: unknown): string[] {
  if (typeof value === "string") return [value]
  if (Array.isArray(value)) return value.flatMap(exportTargets)
  if (value && typeof value === "object") return Object.values(value).flatMap(exportTargets)
  return []
}
