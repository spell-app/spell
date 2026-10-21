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

  /** the package's folder:  where its `package.json` and `tsconfig.json` are */
  readonly dir: string

  /** its repo's root:  the folder of the `tsconfig.base.json` holding the repo's `$/` aliases */
  readonly repo: string

  /** its repo's alias table:  each `$/` pattern and its target, absolute */
  readonly aliases: Alias[]

  constructor(dir: string) {
    this.dir = realpathSync(resolve(dir))
    this.repo = repoOf(this.dir)
    this.aliases = aliasesOf(this.repo)
  }

  /** where this package's declarations go */
  get out(): string {
    return join(this.dir, Declarations.FOLDER)
  }

  /**
   * Builds them:  type-checks the package, writes `dist-types/`, rewrites its `$/` specifiers;  `tsc`'s exit status.
   * - `clean`:  `dist-types/` deleted first.
   * - Prints `tsc`'s errors as it does.
   */
  build({ clean = false } = {}): number {
    if (clean) rmSync(this.out, { recursive: true, force: true })
    mkdirSync(this.out, { recursive: true })
    const config = join(this.out, Declarations.TSCONFIG)
    writeFileSync(config, `${JSON.stringify(this.tsconfig(), null, 2)}\n`)
    const status = spawnSync(process.execPath, [tscBin(), "-p", config], { cwd: this.dir, stdio: "inherit" }).status
    this.rewrite()
    return status ?? 1
  }

  /**
   * The declarations build's `tsconfig`:  the package's own, emitting declarations into `dist-types/`, with its repo's
   * aliases re-pointed at each repo-mate's declarations.
   * - Paths relative to `dist-types/`, where it's written.
   */
  tsconfig(): object {
    const paths: Record<string, string[]> = {}
    for (const alias of this.aliases) {
      const target = alias.package === this.dir ? alias.target : declarationOf(alias.target, alias.package)
      paths[alias.pattern] = [relativeTo(this.out, target)]
    }
    return {
      // GENERATED by `spell-types` (`@spell-app/toolchain`'s `Declarations`):  rewritten on every build
      extends: "../tsconfig.json",
      compilerOptions: {
        noEmit: false,
        declaration: true,
        emitDeclarationOnly: true,
        declarationMap: true,
        composite: false,
        incremental: true,
        tsBuildInfoFile: "./.tsbuildinfo",
        rootDir: "..",
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
    const owner = this.aliases.find((alias) => isInside(source, alias.package))?.package ?? this.dir
    return declarationOf(source, owner)
  }

  /**
   * The packages of the repos BELOW `dir`'s repo that `dir`'s repo's packages use, lowest first:  what
   * `spell-types --below` builds.
   * - Found by the `@spell-app/*` names in each `package.json`'s dependencies, through `node_modules`.
   * - Only the ones with a `tsconfig.json`, that have aliases to rewrite:  a package with none (the toolchain) is read
   *   from its source.
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
      .filter((packageDir) => existsSync(join(packageDir, "tsconfig.json")))
      .map((packageDir) => new Declarations(packageDir))
      .filter((each) => each.aliases.some((alias) => alias.package === each.dir))
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
    return new Declarations(process.cwd()).build({ clean })
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

/** The packages of the repo at `repo`:  its root's `workspaces`, or the repo itself (a flat repo). */
function packagesOf(repo: string): string[] {
  const { workspaces } = readJson5<{ workspaces?: string[] }>(join(repo, "package.json"))
  return workspaces ? workspaces.map((folder) => join(repo, folder)) : [repo]
}

/** The `@spell-app/*` packages `packageDir`'s `package.json` depends on, every kind. */
function spellDependencies(packageDir: string): string[] {
  const manifest = readJson5<Manifest>(join(packageDir, "package.json"))
  const names = Object.keys({ ...manifest.dependencies, ...manifest.devDependencies, ...manifest.peerDependencies })
  return names.filter((name) => name.startsWith("@spell-app/"))
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
type Manifest = Record<"dependencies" | "devDependencies" | "peerDependencies", Record<string, string> | undefined>
