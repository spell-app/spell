import { spawnSync } from "node:child_process"
import {
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  realpathSync,
  rmSync,
  statSync,
  writeFileSync
} from "node:fs"
import { createRequire } from "node:module"
import { dirname, join, relative, resolve, sep } from "node:path"

import { aliasesOf, isInside, readJson5, repoOf, resolveAlias, type Alias } from "./aliasTable.ts"

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
 * - A package of several FOLDERS, each its own TypeScript program (the kit, `spell-kit`:  epic `repo-split` P9):
 *   its `package.json` lists them in `"spellTypes"`, in build order (`["util", "server", "assembler", "element"]`).
 *   - Each is built on its own `tsconfig.json`, so each keeps its own `lib` and `types` (server and assembler node
 *     only, util and element browser-safe), into the package's ONE `dist-types/`, mirroring the package:
 *     `util/src/index.ts` => `dist-types/util/src/index.d.ts`.
 *   - A folder reads the folders built before it by their declarations, as a repo-mate's.
 *   - `spell-types` in the package's root builds them all;  in one folder, that one.
 *
 * - Why:  a package's `exports` point at its SOURCE (Vite, Vitest and `tsx` run it as is), and that source imports
 *   its own repo's `$/` aliases.  `tsc` in a repo above would read it with the ABOVE repo's alias table, which
 *   doesn't have them (TS2307 by the hundred).  Its declarations instead name every file of their own repo by a
 *   relative path, so any repo can read them, with only its own alias table.
 * - Where:  `<package>/dist-types/`, mirroring the package (`src/core.ts` => `dist-types/src/core.d.ts`), git-ignored.
 *   - Its `exports` say so:  each entry `{ "types": "./dist-types/src/core.d.ts", "default": "./src/core.ts" }`.
 *     TypeScript takes `types`;  Vite, Vitest, `tsx` and node take `default`, the source, as before.
 *   - Not built (a fresh clone):  TypeScript falls back to `default`, the source, and says TS2307 as before.
 * - How, for one package:
 *   1. `tsc` on the package's own `tsconfig.json`, emitting declarations only (and their maps, so "Go to Definition"
 *      lands in the source), incrementally:  nothing changed, nothing to do.
 *      - Its program reads its repo-mates' DECLARATIONS, not their source (the repo's alias table, re-pointed):
 *        a package's output holds only its own files.  So a repo builds its packages in dependency order
 *        (`yarn workspaces foreach -t`).
 *   2. Every `$/` specifier in the output is rewritten to a relative path:  to the package's own declarations, or to
 *      a repo-mate's (`../../../parser/dist-types/src/index`).
 *   - It IS the package's type check:  a package's `yarn ts` runs it in place of a bare `tsc`.
 * - `--below`:  the packages of OTHER repos that this repo's packages depend on (`@spell-app/*` in their
 *   `package.json`s, and theirs, and so on), lowest first, each built as above.  A repo's `yarn ts` runs it first, so
 *   what it reads is never stale;  up-to-date ones take a second or two each.
 * - Node runs this file as is (types stripped, `bin/spell-types.ts`):  node's modules and `json5` only, no alias, no
 *   `enum`, no parameter property.
 ****************/
export class Declarations {
  /** the folder each package writes its declarations to */
  static readonly FOLDER = "dist-types"

  /** the generated `tsconfig` of a package's declarations build, in `FOLDER` */
  static readonly TSCONFIG = ".tsconfig.json"

  /** the folder built:  where its `tsconfig.json` is;  the package's own, or one of its `"spellTypes"` folders */
  readonly dir: string

  /** the package's folder:  where its `package.json` is (`dir`, or above it) */
  readonly root: string

  /** its repo's root:  the folder of the `tsconfig.base.json` holding the repo's `$/` aliases */
  readonly repo: string

  /** its repo's alias table:  each `$/` pattern and its target, absolute */
  readonly aliases: Alias[]

  constructor(dir: string) {
    this.dir = realpathSync(resolve(dir))
    this.root = packageRootOf(this.dir)
    this.repo = repoOf(this.dir)
    this.aliases = aliasesOf(this.repo)
  }

  /** where this package's declarations go */
  get out(): string {
    return join(this.root, Declarations.FOLDER)
  }

  /** the generated files' name stem in `out`:  `""` for a package's own folder, `.util` for the kit's `util/` */
  get stem(): string {
    const inside = relative(this.root, this.dir)
    return inside ? `.${inside.split(sep).join(".")}` : ""
  }

  /** is `target` (absolute) in the folder this build compiles, not one it reads by its declarations? */
  owns(target: string): boolean {
    return target === this.dir || isInside(target, this.dir)
  }

  /**
   * Builds them:  type-checks the package, writes `dist-types/`, rewrites its `$/` specifiers;  `tsc`'s exit status.
   * - `clean`:  its declarations deleted first:  `dist-types/`, or (one folder of the kit) its part of it.
   * - Prints `tsc`'s errors as it does.
   */
  build({ clean = false } = {}): number {
    if (clean && !this.stem) rmSync(this.out, { recursive: true, force: true })
    if (clean && this.stem) {
      rmSync(join(this.out, relative(this.root, this.dir)), { recursive: true, force: true })
      rmSync(join(this.out, `${this.stem}.tsbuildinfo`), { force: true })
    }
    mkdirSync(this.out, { recursive: true })
    const config = join(this.out, `${this.stem}${Declarations.TSCONFIG}`)
    writeFileSync(config, `${JSON.stringify(this.tsconfig(), null, 2)}\n`)
    const status = spawnSync(process.execPath, [tscBin(), "-p", config], { cwd: this.dir, stdio: "inherit" }).status
    this.rewrite()
    return status ?? 1
  }

  /**
   * The declarations build's `tsconfig`:  the folder's own, emitting declarations into `dist-types/`, with its repo's
   * aliases re-pointed at each repo-mate's declarations (and, in the kit, each other folder's).
   * - Paths relative to `dist-types/`, where it's written.
   */
  tsconfig(): object {
    const paths: Record<string, string[]> = {}
    for (const alias of this.aliases) {
      const target = this.owns(alias.target) ? alias.target : declarationOf(alias.target, alias.package)
      paths[alias.pattern] = [relativeTo(this.out, target)]
    }
    return {
      // GENERATED by `spell-types` (`spell-kit/toolchain`'s `Declarations`):  rewritten on every build
      extends: relativeTo(this.out, join(this.dir, "tsconfig.json")),
      compilerOptions: {
        noEmit: false,
        declaration: true,
        emitDeclarationOnly: true,
        declarationMap: true,
        composite: false,
        incremental: true,
        tsBuildInfoFile: `./${this.stem}.tsbuildinfo`,
        rootDir: relativeTo(this.out, this.root),
        outDir: ".",
        paths
      }
    }
  }

  /** Every `$/` specifier in `dist-types/` rewritten as a relative path;  the files it changed. */
  rewrite(): number {
    let changed = 0
    for (const file of filesIn(this.out, (name) => name.endsWith(".d.ts"))) {
      const text = readFileSync(file, "utf8")
      const next = text.replace(SPECIFIER, (match, before: string, quote: string, specifier: string) => {
        const target = this.declarationFor(specifier)
        return target ? `${before}${quote}${relativeTo(dirname(file), target)}${quote}` : match
      })
      if (next !== text) {
        writeFileSync(file, next)
        changed++
      }
    }
    return changed
  }

  /** the declaration file (no extension) `$/` specifier `specifier` names;  `undefined`:  not one of the repo's */
  declarationFor(specifier: string): string | undefined {
    const source = resolveAlias(specifier, this.aliases)
    if (!source) return undefined
    const owner = this.aliases.find((alias) => isInside(source, alias.package))?.package ?? this.root
    return declarationOf(source, owner)
  }

  /**
   * The packages of the repos BELOW `dir`'s repo that `dir`'s repo's packages use, lowest first:  what
   * `spell-types --below` builds.
   * - Found by the `workspace:` dependencies in each `package.json` (`spell-kit`, `@spell-app/ui` ...), through
   *   `node_modules`.
   * - A package of several folders (the kit's `"spellTypes"`) is each of them, in its order.
   * - Only the ones with a `tsconfig.json`, that have aliases to rewrite:  one with none (the kit's `toolchain/`, not in
   *   its `"spellTypes"`) is read from its source.
   */
  static below(dir: string): Declarations[] {
    const repo = repoOf(realpathSync(resolve(dir)))
    const order: string[] = []
    const seen = new Set<string>()
    const visit = (packageDir: string): void => {
      if (seen.has(packageDir)) return
      seen.add(packageDir)
      for (const name of spellDependencies(packageDir)) {
        const found = packageFolder(name, packageDir)
        if (found) visit(found)
      }
      order.push(packageDir)
    }
    for (const packageDir of packagesOf(repo)) visit(packageDir)
    return order
      .filter((packageDir) => packageDir !== repo && !isInside(packageDir, repo))
      .flatMap((packageDir) => foldersOf(packageDir))
      .filter((folder) => existsSync(join(folder, "tsconfig.json")))
      .map((folder) => new Declarations(folder))
      .filter((each) => each.aliases.some((alias) => each.owns(alias.target)))
  }

  /** The command line:  `spell-types [--below] [--clean]`, in a package's folder;  the exit status. */
  static main(args: string[]): number {
    const clean = args.includes("--clean")
    if (args.includes("--below")) {
      for (const each of Declarations.below(process.cwd())) {
        console.log(`>> spell-types:  ${relative(process.cwd(), each.dir) || "."}`)
        const status = each.build({ clean })
        if (status !== 0) return status
      }
      return 0
    }
    const folders = foldersOf(process.cwd())
    for (const folder of folders) {
      if (folders.length > 1) console.log(`>> spell-types:  ${relative(process.cwd(), folder)}`)
      const status = new Declarations(folder).build({ clean })
      if (status !== 0) return status
    }
    return 0
  }
}

/** A module specifier in a `.d.ts` file:  after `from`, `import`, `import(`, `require(` or `declare module`. */
const SPECIFIER = /(\bfrom\s*|\bimport\s*\(?\s*|\brequire\s*\(\s*|\bdeclare\s+module\s+)(["'])(\$\/[^"']+)\2/g

/** Source file `source` of package `packageDir` as its declaration, without an extension:  `src/a.ts` => `dist-types/src/a`. */
function declarationOf(source: string, packageDir: string): string {
  const inside = relative(packageDir, source).replace(/\.(d\.)?([mc]?tsx?|[mc]?jsx?)$/, "")
  return join(packageDir, Declarations.FOLDER, inside)
}

/** `to` from folder `from`, as a module specifier:  always `./` or `../` first, `/` between. */
function relativeTo(from: string, to: string): string {
  const path = relative(from, to).split(sep).join("/")
  return path.startsWith(".") ? path : `./${path}`
}

/** Every file under `dir` whose name passes `keep`. */
function filesIn(dir: string, keep: (name: string) => boolean): string[] {
  if (!existsSync(dir)) return []
  return readdirSync(dir, { recursive: true, encoding: "utf8" })
    .map((name) => join(dir, name))
    .filter((file) => keep(file) && statSync(file).isFile())
}

/**
 * The packages of the repo at `repo`:  its root's `workspaces`, or the repo itself (a flat repo, or the kit, whose
 * `workspaces` are the child repos inside it, not its own packages).
 */
function packagesOf(repo: string): string[] {
  const { workspaces, spellTypes } = readJson5<Manifest>(join(repo, "package.json"))
  return workspaces && !spellTypes ? workspaces.map((folder) => join(repo, folder)) : [repo]
}

/**
 * The folders built for the package at `packageDir`, in order:  its `"spellTypes"` (the kit's), else the package
 * itself;  a folder with no `package.json` (one of the kit's) is itself.
 */
function foldersOf(packageDir: string): string[] {
  const manifest = join(packageDir, "package.json")
  if (!existsSync(manifest)) return [packageDir]
  const { spellTypes } = readJson5<Manifest>(manifest)
  return spellTypes ? spellTypes.map((folder) => join(packageDir, folder)) : [packageDir]
}

/** The package `dir` is in:  the nearest folder up, `dir` itself first, with a `package.json`. */
function packageRootOf(dir: string): string {
  for (let at = dir; ; at = dirname(at)) {
    if (existsSync(join(at, "package.json"))) return at
    if (dirname(at) === at) throw new Error(`spell-types:  no package.json at or above ${dir}`)
  }
}

/** The packages of this install `packageDir`'s `package.json` depends on (`workspace:` ones), every kind. */
function spellDependencies(packageDir: string): string[] {
  const manifest = readJson5<Manifest>(join(packageDir, "package.json"))
  const all = { ...manifest.dependencies, ...manifest.devDependencies, ...manifest.peerDependencies }
  return Object.entries(all)
    .filter(([, range]) => range.startsWith("workspace:"))
    .map(([name]) => name)
}

/** The real folder of package `name` as `from` finds it in `node_modules`;  `undefined` when it isn't installed. */
function packageFolder(name: string, from: string): string | undefined {
  for (let at = from; ; at = dirname(at)) {
    const link = join(at, "node_modules", name)
    if (existsSync(join(link, "package.json"))) return realpathSync(link)
    if (dirname(at) === at) return undefined
  }
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
  /** a package of several folders (the kit):  each built on its own, in this order */
  spellTypes?: string[]
}
