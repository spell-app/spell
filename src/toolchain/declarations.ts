import { spawnSync } from "node:child_process"
import { existsSync, mkdirSync, readFileSync, realpathSync, rmSync, writeFileSync } from "node:fs"
import { createRequire } from "node:module"
import { basename, dirname, join, relative, resolve, sep } from "node:path"

import JSON5 from "json5"

import { packageRootFor } from "./sourceNames.ts"

/****************
 * ### `Declarations`
 * Builds a package's `.d.ts` files, which the repos ABOVE its repo read instead of its source (epic `repo-split` I12,
 * Owen's pick (c)).
 *
 * ```sh
 * spell-types            # this package (the current folder):  type-checks it and writes `dist-types/`
 * spell-types --below    # first, every package of the LOWER repos this repo's packages use, lowest first
 * spell-types --clean    # this package's `dist-types/` deleted first:  a full build
 * ```
 *
 * - Every package has its code under ONE `src/`, imported by its package name everywhere (epic `repo-split` P14,
 *   Q47).  Its `package.json` lists its TypeScript programs in `"spellTypes"`, as their `tsconfig` files
 *   (`["tsconfig.json", "tsconfig.node.json"]`:  browser-safe code, node code);  without it, `tsconfig.json`.
 * - Each is built into the package's ONE `dist-types/`, mirroring the package:
 *   `src/util/string.ts` => `dist-types/src/util/string.d.ts`.
 *   - Nothing to rewrite:  the declarations name the package's files by its package name, as the source does, and
 *     every reader resolves those through the package's `exports` (`types`).
 *   - Its own program reads its own SOURCE for its own name (`customConditions`:  `<package>-source`), never these.
 * - Why:  `tsc` in a repo above reads a package's declarations, not its source, so it type-checks only its own files,
 *   under its own settings.
 * - Where:  `<package>/dist-types/`, git-ignored.
 *   - Its `exports` say so:  each entry `{ "types": "./dist-types/src/core.d.ts", "default": "./src/core.ts" }`.
 *     TypeScript takes `types`;  Vite, Vitest, `tsx` and node take `default`, the source.
 *   - Not built (a fresh clone):  TypeScript falls back to `default`, the source, and says TS2307 as before.
 * - How, for one program:  `tsc` on its `tsconfig`, emitting declarations only (and their maps, so "Go to
 *   Definition" lands in the source), incrementally:  nothing changed, nothing to do.
 *   - It IS the package's type check:  a package's `yarn ts` runs it in place of a bare `tsc`.
 * - `--below`:  the packages of OTHER repos that this repo's packages depend on (`spell`, `spell-ui` ... in their
 *   `package.json`s, and theirs, and so on), lowest first, each built as above.  A repo's `yarn ts` runs it first, so
 *   what it reads is never stale;  up-to-date ones take a second or two each.
 *   - Only the ones with `"spellTypes"`:  a package no repo reads by its types (spell-epic, spell-app) has none.
 * - Node runs this file as is (types stripped, `bin/spell-types.ts`):  node's modules and `json5` only, no `enum`, no
 *   parameter property.
 ****************/
export class Declarations {
  /** the folder each package writes its declarations to */
  static readonly FOLDER = "dist-types"

  /** the generated `tsconfig` of a program's declarations build, in `FOLDER`, after its `stem` */
  static readonly TSCONFIG = ".tsconfig.json"

  /** the `tsconfig` built, absolute:  a `"spellTypes"` entry (`tsconfig.node.json`), or the package's `tsconfig.json` */
  readonly config: string

  /** the package's folder:  where its `package.json` is (the config's folder, or above it) */
  readonly root: string

  /** `target`:  a `tsconfig` file, or a folder with a `tsconfig.json` */
  constructor(target: string) {
    const path = realpathSync(resolve(target))
    this.config = path.endsWith(".json") ? path : join(path, "tsconfig.json")
    this.root = packageRootOf(dirname(this.config))
  }

  /** where this package's declarations go */
  get out(): string {
    return join(this.root, Declarations.FOLDER)
  }

  /** the generated files' name stem in `out`:  `.tsconfig.node` for `tsconfig.node.json` */
  get stem(): string {
    return `.${basename(this.config, ".json")}`
  }

  /**
   * Builds them:  type-checks the program and writes its part of `dist-types/`;  `tsc`'s exit status.
   * - `clean`:  its incremental record deleted first, so every file is written again.
   * - Prints `tsc`'s errors as it does.
   */
  build({ clean = false } = {}): number {
    if (clean) rmSync(join(this.out, `${this.stem}.tsbuildinfo`), { force: true })
    mkdirSync(this.out, { recursive: true })
    const config = join(this.out, `${this.stem}${Declarations.TSCONFIG}`)
    writeFileSync(config, `${JSON.stringify(this.tsconfig(), null, 2)}\n`)
    const status = spawnSync(process.execPath, [tscBin(), "-p", config], {
      cwd: dirname(this.config),
      stdio: "inherit"
    }).status
    return status ?? 1
  }

  /**
   * The declarations build's `tsconfig`:  the program's own, emitting declarations into `dist-types/`.
   * - Paths relative to `dist-types/`, where it's written.
   */
  tsconfig(): object {
    return {
      // GENERATED by `spell-types` (`spell/toolchain`'s `Declarations`):  rewritten on every build
      extends: relativeTo(this.out, this.config),
      compilerOptions: {
        noEmit: false,
        declaration: true,
        emitDeclarationOnly: true,
        declarationMap: true,
        composite: false,
        incremental: true,
        tsBuildInfoFile: `./${this.stem}.tsbuildinfo`,
        rootDir: relativeTo(this.out, this.root),
        outDir: "."
      }
    }
  }

  /**
   * The programs of the packages BELOW `dir`'s that it reads, lowest first:  what `spell-types --below` builds.
   * - A folder of the kit (its `package.json`'s `workspaces`, epic `repo-split` P20):  the kit's own, then each folder
   *   before it in that list, lowest first (`ui/`:  the kit's, `parser/`'s).
   * - Any other package (a project beside the kit, spell-brand):  the local packages it depends on (`workspace:`,
   *   `portal:`, `link:` or `file:`), found through `node_modules`, theirs first;  a kit among them brings its folders
   *   too, after its own.
   * - Only packages with `"spellTypes"`, each of its programs in its order.
   */
  static below(dir: string): Declarations[] {
    const repo = packageRootOf(realpathSync(resolve(dir)))
    const kit = kitAbove(repo)
    const order: string[] = kit ? [kit, ...foldersOf(kit).slice(0, foldersOf(kit).indexOf(repo))] : []
    if (!kit) {
      const seen = new Set<string>()
      const visit = (packageDir: string): void => {
        if (seen.has(packageDir)) return
        seen.add(packageDir)
        for (const name of spellDependencies(packageDir)) {
          const found = packageRootFor(name, packageDir)
          if (found) visit(realpathSync(found))
        }
        order.push(packageDir, ...foldersOf(packageDir))
      }
      visit(repo)
    }
    return order
      .filter((packageDir) => packageDir !== repo && !isInside(packageDir, repo))
      .flatMap(
        (packageDir) =>
          readJson5<Manifest>(join(packageDir, "package.json")).spellTypes?.map((config) => join(packageDir, config)) ??
          []
      )
      .filter((config) => existsSync(config))
      .map((config) => new Declarations(config))
  }

  /** The command line:  `spell-types [--below] [--clean]`, in a package's folder;  the exit status. */
  static main(args: string[]): number {
    const clean = args.includes("--clean")
    if (args.includes("--below")) {
      for (const each of Declarations.below(process.cwd())) {
        console.log(`>> spell-types:  ${relative(process.cwd(), each.config)}`)
        const status = each.build({ clean })
        if (status !== 0) return status
      }
      return 0
    }
    const configs = configsOf(process.cwd())
    // a package's programs share ONE `dist-types/` tree:  `--clean` empties it once, before the first
    if (clean) rmSync(join(process.cwd(), Declarations.FOLDER), { recursive: true, force: true })
    for (const config of configs) {
      if (configs.length > 1) console.log(`>> spell-types:  ${relative(process.cwd(), config)}`)
      const status = new Declarations(config).build({ clean })
      if (status !== 0) return status
    }
    return 0
  }
}

/** `to` from folder `from`, as a module specifier:  always `./` or `../` first, `/` between. */
function relativeTo(from: string, to: string): string {
  const path = relative(from, to).split(sep).join("/")
  return path.startsWith(".") ? path : `./${path}`
}

/** The programs of the package at `packageDir`, in order:  its `"spellTypes"` `tsconfig` files, else `tsconfig.json`. */
function configsOf(packageDir: string): string[] {
  const { spellTypes } = readJson5<Manifest>(join(packageDir, "package.json"))
  return (spellTypes ?? ["tsconfig.json"]).map((config) => join(packageDir, config))
}

/** Is `path` inside folder `dir` (not `dir` itself)? */
function isInside(path: string, dir: string): boolean {
  const inside = relative(dir, path)
  return Boolean(inside) && !inside.startsWith("..") && !inside.startsWith(sep)
}

/** A JSON5 file's value. */
function readJson5<T>(file: string): T {
  return JSON5.parse(readFileSync(file, "utf8")) as T
}

/** The package `dir` is in:  the nearest folder up, `dir` itself first, with a `package.json`. */
function packageRootOf(dir: string): string {
  for (let at = dir; ; at = dirname(at)) {
    if (existsSync(join(at, "package.json"))) return at
    if (dirname(at) === at) throw new Error(`spell-types:  no package.json at or above ${dir}`)
  }
}

/**
 * The LOCAL packages `packageDir`'s `package.json` depends on, every kind:  a workspace of this install, or a folder on
 * this machine (`portal:`, `link:`, `file:`, as a project beside the kit names the kit).
 */
function spellDependencies(packageDir: string): string[] {
  const manifest = readJson5<Manifest>(join(packageDir, "package.json"))
  const all = { ...manifest.dependencies, ...manifest.devDependencies, ...manifest.peerDependencies }
  return Object.entries(all)
    .filter(([, range]) => /^(workspace|portal|link|file):/.test(range))
    .map(([name]) => name)
}

/** The folders `packageDir`'s `package.json` lists as its `workspaces`, absolute, in order:  the kit's folders. */
function foldersOf(packageDir: string): string[] {
  const { workspaces } = readJson5<Manifest>(join(packageDir, "package.json"))
  return (workspaces ?? [])
    .filter((folder) => !folder.includes("*"))
    .map((folder) => join(packageDir, folder))
    .filter((folder) => existsSync(join(folder, "package.json")))
}

/** The kit `repo` is a folder of:  the nearest package above it that lists it in its `workspaces`;  else `undefined`. */
function kitAbove(repo: string): string | undefined {
  for (let at = dirname(repo); dirname(at) !== at; at = dirname(at)) {
    if (existsSync(join(at, "package.json")) && foldersOf(at).includes(repo)) return at
  }
  return undefined
}

/** The TypeScript compiler's own script, this install's. */
function tscBin(): string {
  const require = createRequire(import.meta.url)
  const manifest = require.resolve("typescript/package.json")
  const { bin } = readJson5<{ bin: Record<string, string> }>(manifest)
  return join(dirname(manifest), bin.tsc!)
}

/** What this file reads of a `package.json`. */
type Manifest = Partial<Record<"dependencies" | "devDependencies" | "peerDependencies", Record<string, string>>> & {
  /** its workspaces' folders */
  workspaces?: string[]
  /** its TypeScript programs, as `tsconfig` files:  each built on its own, in this order */
  spellTypes?: string[]
}
