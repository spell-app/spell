import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  realpathSync,
  statSync,
  writeFileSync
} from "node:fs"
import { builtinModules } from "node:module"
import { dirname, extname, join, matchesGlob, posix, relative, resolve, sep } from "node:path"
import type { Plugin } from "esbuild"
import JSON5 from "json5"

import { packageRootFor } from "spell/toolchain/sourceNames"
import { Git } from "spell/server/Git"
import { ALWAYS_EXCLUDED, DIST, type BuildReport, type PublishedRepo } from "spell/cli/publish"

/****************
 * ### PackageBuild
 * Builds one repo's `src/` into the `dist/` of its staging folder:  the JavaScript its npm package ships.
 * - ONE file per source file, at the same path (`src/util/string.ts` => `dist/util/string.js`), so every name the
 *   package's `exports` gives (`spell/util/string`) still finds its file.
 *   - Not a bundle:  a bundle would copy what two entries share, and a page could then load two `DOMElement`s.
 * - Each file through esbuild:  types stripped, standard decorators lowered (`target: es2022`, as the toolchain's
 *   decorator pre-pass does), class names kept.
 *   - Solid's JSX through Solid's own compiler (`@solidjs/compiler`, the Vite plugin's), for the DOM;
 *     React's (Ink's screens, `reactJsx`) through esbuild.
 * - Every import made one node and any bundler run as written:
 *   - the repo's own names (`spell/ui/core`) and `./peer` imports become relative paths to the built file
 *     (`../core.js`)
 *   - another package's names stay names (`spell/element`):  its own package, a dependency, answers them
 *   - `x.css?inline`, `x.css?raw` and `x.json` become JavaScript modules beside the file, each exporting the text
 *     (`x.css.inline.js`;  CSS minified by Lightning CSS for the kit's browsers)
 *   - `import.meta.glob("./*\/index.ts")` (Vite's) becomes the list of what it matched, as Vite would make it
 * - Other files of `src/` are copied as they are:  data a file reads beside itself, Python, icon packs.
 * - Declarations:  the repo's `spell-types` build (`dist-types/src/`), copied in.
 * - Which files:  the ones git tracks in `src/`, less `ALWAYS_EXCLUDED` and the repo's `exclude`.
 * - Node only;  loads esbuild, Solid's compiler and Lightning CSS when it runs, so `spell help` never does.
 ****************/
export class PackageBuild {
  /** Where the built files go:  `<stage>/dist/`. */
  readonly dist: string

  /** The repo's folder, its links resolved:  esbuild names files by their real paths (`/private/var/...` on a Mac). */
  readonly root: string

  /** The repo's `src/`. */
  readonly src: string

  /** JavaScript modules made from CSS, raw text and JSON, by the file they're written to. */
  private modules = new Map<string, { source: string; kind: ModuleKind }>()

  /** Code outside `src/` that a built file imports, in a folder the package ships (`spaces/`):  compiled in place. */
  private outsideCode = new Set<string>()

  /** What `build()` reports. */
  private report: BuildReport = { compiled: 0, modules: 0, copied: 0, declarations: 0, warnings: [] }

  constructor(
    readonly repo: PublishedRepo,
    readonly stage: string,
    /** the one version every package publishes at:  `__PACKAGE_VERSION__` */
    readonly version: string,
    /**
     * where the built files go, when not `<stage>/dist/`:  a folder of the ONE package builds into its own
     * `dist/<folder>/` (`spell/ui/core` => `dist/ui/core.js`), its other files in `<stage>`, its folder
     */
    dist?: string
  ) {
    this.dist = dist ?? join(stage, DIST)
    this.root = realpathSync(repo.root)
    this.src = join(this.root, "src")
  }

  /** Build it:  compile, make the modules, copy the rest and the declarations.  Throws on a compile error. */
  async build(): Promise<BuildReport> {
    const files = this.sourceFiles()
    const verbatim = this.repo.settings.verbatim ?? []
    const code: string[] = []
    for (const file of files) {
      if (CODE_FILE.test(file) && !file.endsWith(".d.ts") && !matchesAny(file, verbatim)) code.push(file)
      else this.copy(join(this.src, file), join(this.dist, file))
    }
    const react = this.repo.settings.reactJsx ?? []
    await this.compile(
      code.filter((file) => !matchesAny(file, react)),
      "solid"
    )
    await this.compile(
      code.filter((file) => matchesAny(file, react)),
      "react"
    )
    if (this.outsideCode.size) await this.compileOutside()
    await this.writeModules()
    this.copyDeclarations()
    return this.report
  }

  ////////////////
  // ## Which files
  ////////////////

  /** The files of `src/` that ship, from `src/`:  git's, less the excluded. */
  sourceFiles(): string[] {
    const excluded = [...ALWAYS_EXCLUDED, ...(this.repo.settings.exclude ?? [])]
    return trackedFiles(this.root, "src")
      .map((file) => file.slice("src/".length))
      .filter((file) => !matchesAny(file, excluded))
  }

  ////////////////
  // ## Compiling
  ////////////////

  /** Compile `files` (from `src/`), with `jsx`'s JSX, into `dist/`, each import rewritten (`importsPlugin()`). */
  private async compile(files: string[], jsx: "solid" | "react"): Promise<void> {
    if (!files.length) return
    const { build } = await import("esbuild")
    const result = await build({
      entryPoints: files.map((file) => join(this.src, file)),
      outdir: this.dist,
      outbase: this.src,
      absWorkingDir: this.root,
      ...SHARED_OPTIONS,
      jsx: jsx === "react" ? "automatic" : "preserve",
      define: { __PACKAGE_VERSION__: JSON.stringify(this.version) },
      plugins: [this.sourcePlugin(jsx), this.importsPlugin()]
    })
    for (const output of result.outputFiles) {
      // a `.mjs` source keeps its extension:  esbuild names every output `.js`
      const source = join(this.src, relative(this.dist, output.path)).replace(/\.js$/, "")
      const out = existsSync(`${source}.mjs`) ? output.path.replace(/\.js$/, ".mjs") : output.path
      mkdirSync(dirname(out), { recursive: true })
      writeFileSync(out, output.text)
      this.report.compiled++
    }
  }

  /** Compile `outsideCode` beside itself in the staging folder (`spaces/x/y.lib.ts` => `spaces/x/y.lib.js`). */
  private async compileOutside(): Promise<void> {
    const { build } = await import("esbuild")
    const result = await build({
      ...SHARED_OPTIONS,
      entryPoints: [...this.outsideCode],
      outdir: this.stage,
      outbase: this.root,
      absWorkingDir: this.root,
      jsx: "preserve",
      define: { __PACKAGE_VERSION__: JSON.stringify(this.version) },
      plugins: [this.sourcePlugin("solid"), this.importsPlugin()]
    })
    for (const output of result.outputFiles) {
      mkdirSync(dirname(output.path), { recursive: true })
      writeFileSync(output.path, output.text)
      this.report.compiled++
    }
  }

  /**
   * Loads each source file, made ready for esbuild:  Vite's `import.meta.glob()` expanded, and a Solid file's JSX
   * compiled by Solid's compiler (after esbuild has stripped its types and lowered its decorators).
   * - Names kept by the build itself (`keepNames`), not here:  else every file gets two copies of the helper.
   */
  private sourcePlugin(jsx: "solid" | "react"): Plugin {
    return {
      name: "spell-publish-source",
      setup: (build) => {
        build.onLoad({ filter: /\.[cm]?[jt]sx?$/ }, async ({ path }) => {
          const loader = path.endsWith("x") ? "tsx" : path.endsWith("ts") ? "ts" : "js"
          let code = readFileSync(path, "utf8")
          if (code.includes("import.meta.glob")) code = expandGlobs(code, path)
          if (jsx === "react" || loader !== "tsx") return { contents: code, loader }
          const { transform } = await import("esbuild")
          const stripped = await transform(code, {
            loader: "tsx",
            jsx: "preserve",
            target: "es2022",
            format: "esm",
            sourcefile: path,
            tsconfigRaw: { compilerOptions: { useDefineForClassFields: true, experimentalDecorators: false } }
          })
          const solid = await import("@solidjs/compiler")
          const compiled = solid.transform(stripped.code, {
            filename: path,
            generate: "dom",
            hydratable: false,
            dev: false,
            sourceNames: false
          })
          return { contents: compiled.code, loader: "js" }
        })
      }
    }
  }

  ////////////////
  // ## Imports
  ////////////////

  /** Every import, rewritten to what the published package finds (see the class's docstring) and left external. */
  private importsPlugin(): Plugin {
    return {
      name: "spell-publish-imports",
      setup: (build) => {
        build.onResolve({ filter: /.*/ }, ({ path, importer, kind }) => {
          if (kind === "entry-point") return undefined
          return { path: this.importFor(path, importer), external: true }
        })
      }
    }
  }

  /** What `importer` (a source file) imports `specifier` as, once both are built. */
  importFor(specifier: string, importer: string): string {
    const [path, query] = specifier.split("?", 2) as [string, string | undefined]
    const own = this.repo.name
    let target: string | undefined
    if (path === `${own}/package.json`) target = join(this.root, "package.json")
    else if (path === "." || path === ".." || path.startsWith("./") || path.startsWith("../")) {
      target = resolveSource(resolve(dirname(importer), path))
    } else if (path === own || path.startsWith(`${own}/`)) {
      const rest = path.slice(own.length)
      target = resolveSource(join(this.src, rest)) ?? this.shippedOutsideSrc(rest)
    } else return isBuiltin(path) ? specifier : this.otherPackageImport(path, query)

    if (!target || !this.ships(target)) {
      this.report.warnings.push(`${relative(this.root, importer)}:  can't place "${specifier}"`)
      return specifier
    }
    const kind: ModuleKind | undefined =
      target === join(this.root, "package.json")
        ? "manifest"
        : query === "inline"
          ? "inline"
          : query === "raw"
            ? "raw"
            : target.endsWith(".json")
              ? "json"
              : undefined
    let built = target
    if (kind) {
      built = `${target}${MODULE_SUFFIX[kind]}`
      this.modules.set(this.stagedPath(built), { source: target, kind })
    } else if (CODE_FILE.test(target)) {
      if (!target.startsWith(`${this.src}${sep}`)) this.outsideCode.add(target)
      built = target.replace(/\.(mts|mjs)$/, ".mjs").replace(/\.(tsx?|jsx?)$/, ".js")
    }
    const from = dirname(this.stagedPath(importer))
    const relativePath = posix.normalize(relative(from, this.stagedPath(built)).split(sep).join("/"))
    return relativePath.startsWith(".") ? relativePath : `./${relativePath}`
  }

  /**
   * How a built file imports another package's `path`:  as a name its `exports` answers, or node finds.
   * - `.ts` written (plain node's way, `spell/util/node/json5.ts`):  dropped, the published `./*` adds `.js`
   * - `?inline` / `?raw`:  the module the other package's build made (`spell-ui/x/Y.css.inline`)
   * - a file of a package with no `exports` (`lodash/get`):  its extension added (`lodash/get.js`), as node needs
   */
  private otherPackageImport(path: string, query: string | undefined): string {
    if (query === "inline" || query === "raw") return `${path}.${query}`
    const named = path.replace(/\.tsx?$/, "")
    const [, pkg, sub] = /^((?:@[^/]+\/)?[^/]+)(?:\/(.+))?$/.exec(named) ?? []
    if (!pkg || !sub || extname(sub)) return named
    const folder = packageRootFor(pkg, this.root)
    if (!folder || (JSON.parse(readFileSync(join(folder, "package.json"), "utf8")) as { exports?: unknown }).exports) {
      return named
    }
    if (isFile(join(folder, `${sub}.js`))) return `${named}.js`
    if (isFile(join(folder, sub, "index.js"))) return `${named}/index.js`
    return named
  }

  /** Where source file `path` (in `src/`, a shipped folder, or the package's `package.json`) goes when staged. */
  private stagedPath(path: string): string {
    // the package's own `package.json`, as a module (`manifest`):  in `dist/`, with the code
    if (path === join(this.root, `package.json${MODULE_SUFFIX.manifest}`)) return join(this.dist, "package.json.js")
    return path.startsWith(`${this.src}${sep}`)
      ? join(this.dist, relative(this.src, path))
      : join(this.stage, relative(this.root, path))
  }

  /** Does the package ship `path`:  in `src/`, its `package.json`, or in one of its `files`? */
  private ships(path: string): boolean {
    if (path.startsWith(`${this.src}${sep}`) || path === join(this.root, "package.json")) return true
    return (this.repo.settings.files ?? []).some((file) => path.startsWith(`${join(this.root, file)}${sep}`))
  }

  /** `rest` of an own name (`/spaces/x/y.lib.ts`) as a file in one of the package's `files`;  else `undefined`. */
  private shippedOutsideSrc(rest: string): string | undefined {
    const file = resolveSource(join(this.root, rest))
    return file && this.ships(file) ? file : undefined
  }

  ////////////////
  // ## Modules, copies and declarations
  ////////////////

  /** Write each module an import asked for:  CSS (minified, for the kit's browsers), raw text, JSON. */
  private async writeModules(): Promise<void> {
    for (const [out, { source, kind }] of this.modules) {
      let value: string
      if (kind === "manifest") {
        const { name } = JSON.parse(readFileSync(source, "utf8")) as { name: string }
        mkdirSync(dirname(out), { recursive: true })
        writeFileSync(
          out,
          `export const name = ${JSON.stringify(name)}\nexport const version = ${JSON.stringify(this.version)}\nexport default { name, version }\n`
        )
        this.report.modules++
        continue
      }
      if (kind === "json") value = readFileSync(source, "utf8").trim()
      else if (kind === "raw" || !source.endsWith(".css")) value = JSON.stringify(readFileSync(source, "utf8"))
      else value = JSON.stringify(await minifiedCss(source))
      mkdirSync(dirname(out), { recursive: true })
      writeFileSync(out, `export default ${value}\n`)
      this.report.modules++
    }
  }

  /** Copy one file, making its folder. */
  private copy(from: string, to: string): void {
    mkdirSync(dirname(to), { recursive: true })
    copyFileSync(from, to)
    this.report.copied++
  }

  /**
   * Copy the repo's built declarations (`dist-types/src/`, `spell-types`'s) into `dist/`, but those of excluded files,
   * without their source-map line:  the source doesn't ship.
   * - None built (spell-epic and spell-app have none:  no repo above reads them):  nothing to copy.
   */
  private copyDeclarations(): void {
    const types = join(this.root, "dist-types", "src")
    if (!existsSync(types)) return
    const excluded = [...ALWAYS_EXCLUDED, ...(this.repo.settings.exclude ?? [])]
    for (const file of walk(types)) {
      if (!file.endsWith(".d.ts")) continue
      const source = file.replace(/\.d\.ts$/, ".ts")
      if (matchesAny(source, excluded) || matchesAny(`${source}x`, excluded)) continue
      const out = join(this.dist, file)
      if (existsSync(out)) continue // a hand-written `.d.ts`, copied from `src/`
      mkdirSync(dirname(out), { recursive: true })
      writeFileSync(out, readFileSync(join(types, file), "utf8").replace(/^\/\/# sourceMappingURL=.*$/m, ""))
      this.report.declarations++
    }
  }
}

/** esbuild's options for every compile:  one file each, every import external (`importsPlugin()`), decorators lowered. */
const SHARED_OPTIONS = {
  bundle: true,
  write: false,
  format: "esm",
  platform: "neutral",
  target: "es2022",
  keepNames: true,
  charset: "utf8",
  logLevel: "silent",
  jsxImportSource: "react",
  tsconfigRaw: { compilerOptions: { useDefineForClassFields: true, experimentalDecorators: false } }
} as const

/**
 * A JavaScript module made from a non-code file:  CSS as a string (`?inline`), raw text (`?raw`), JSON, and the
 * package's own `package.json` (its `name` and the published `version`, nothing else).
 */
type ModuleKind = "inline" | "raw" | "json" | "manifest"

/** What each module's file adds to its source file's name. */
const MODULE_SUFFIX: Record<ModuleKind, string> = { inline: ".inline.js", raw: ".raw.js", json: ".js", manifest: ".js" }

/** Source files esbuild compiles. */
const CODE_FILE = /\.(tsx?|mts|jsx?|mjs)$/

/** What a path with no extension may be, in the order a bundler tries them. */
const EXTENSIONS = [".ts", ".tsx", ".mts", ".js", ".mjs", ".jsx"]

/** Does `file` (from `src/`) match any of `globs`? */
function matchesAny(file: string, globs: readonly string[]): boolean {
  return globs.some((glob) => matchesGlob(file, glob))
}

/** Node's own modules (`node:fs`, `fs`, `fs/promises`). */
function isBuiltin(path: string): boolean {
  return path.startsWith("node:") || builtinModules.includes(path) || builtinModules.includes(path.split("/")[0]!)
}

/** The file `path` names, as a bundler finds it:  as is, with an extension, a folder's `index`, `.js` for `.ts`. */
function resolveSource(path: string): string | undefined {
  if (isFile(path)) return path
  for (const extension of EXTENSIONS) if (isFile(`${path}${extension}`)) return `${path}${extension}`
  for (const extension of EXTENSIONS)
    if (isFile(join(path, `index${extension}`))) return join(path, `index${extension}`)
  const typescript = path.replace(/\.js$/, ".ts")
  return typescript !== path && isFile(typescript) ? typescript : undefined
}

/** Is there a file at `path`? */
function isFile(path: string): boolean {
  return existsSync(path) && statSync(path).isFile()
}

/** The files git tracks under `folder` of the repo at `root`, from `root`;  every file when it isn't a git repo. */
export function trackedFiles(root: string, folder: string): string[] {
  const listed = Git.run(["ls-files", "-z", folder], root, { trim: false })
  if (!listed.ok) return walk(join(root, folder)).map((file) => `${folder}/${file}`)
  return listed.out.split("\0").filter((file) => file && isFile(join(root, file)))
}

/** Every file under `dir`, from `dir`, `/`-separated. */
function walk(dir: string): string[] {
  return readdirSync(dir, { recursive: true, withFileTypes: true })
    .filter((entry) => entry.isFile())
    .map((entry) => relative(dir, join(entry.parentPath, entry.name)).split(sep).join("/"))
}

/**
 * `file`'s CSS, its `@import`s inlined, minified and lowered for the browsers every set commits to (the kit's
 * `CSS_TARGETS`):  what Vite's `?inline` gives in the checkout.
 */
async function minifiedCss(file: string): Promise<string> {
  const { bundle } = await import("lightningcss")
  const { CSS_TARGETS } = await import("spell/element-tools/elementConfig")
  const { code } = bundle({ filename: file, minify: true, targets: CSS_TARGETS, drafts: { customMedia: true } })
  return code.toString()
}

////////////////
// ## import.meta.glob()
////////////////

/**
 * `code` with each `import.meta.glob(...)` replaced by the object Vite makes of it, so the file runs without Vite.
 * - Its patterns:  a string or an array of them, from the file's folder;  `!` leaves files out.
 * - Its options:  `eager` (imported up front), `query` (`"?inline"`), `import` (`"default"`:  that export alone).
 * - Keys as Vite gives them:  the path as the pattern wrote it (`./ui-button/index.ts`).
 * - Throws for a glob it can't read (not literals only):  better than a package that fails at run time.
 */
export function expandGlobs(code: string, file: string): string {
  const eagerImports: string[] = []
  let count = 0
  let out = ""
  let at = 0
  for (const match of code.matchAll(GLOB_CALL)) {
    const start = match.index
    if (inComment(code, start)) continue
    const argsStart = start + match[0].length
    const argsEnd = closingParen(code, argsStart, file)
    const [patterns, options = {}] = literalArgs(code.slice(argsStart, argsEnd), file) as [
      string | string[] | undefined,
      GlobOptions | undefined
    ]
    if (typeof patterns !== "string" && !Array.isArray(patterns)) continue
    const keys = globKeys(patterns, dirname(file))
    const query = options.query ? `${options.query.startsWith("?") ? "" : "?"}${options.query}` : ""
    const entries = keys.map((key) => {
      const spec = JSON.stringify(`${key}${query}`)
      if (!options.eager) {
        const pick = options.import ? `.then((module) => module[${JSON.stringify(options.import)}])` : ""
        return `${JSON.stringify(key)}: () => import(${spec})${pick}`
      }
      const local = `__glob_${count}_${eagerImports.length}`
      eagerImports.push(
        options.import === "default"
          ? `import ${local} from ${spec};`
          : options.import
            ? `import { ${options.import} as ${local} } from ${spec};`
            : `import * as ${local} from ${spec};`
      )
      return `${JSON.stringify(key)}: ${local}`
    })
    out += `${code.slice(at, start)}{ ${entries.join(", ")} }`
    at = argsEnd + 1
    count++
  }
  return `${eagerImports.join("\n")}${eagerImports.length ? "\n" : ""}${out}${code.slice(at)}`
}

/** Is `at` inside a comment:  after `//` on its line, or on a docstring's `*` line? */
function inComment(code: string, at: number): boolean {
  const line = code.slice(code.lastIndexOf("\n", at) + 1, at)
  return line.includes("//") || /^\s*(\/\*|\*)/.test(line)
}

/** `import.meta.glob(` with its type argument, if any:  `import.meta.glob<string>(`. */
const GLOB_CALL = /import\.meta\.glob\s*(?:<[^()]*>)?\s*\(/g

/** `import.meta.glob()`'s options this build knows. */
type GlobOptions = { eager?: boolean; query?: string; import?: string }

/**
 * Where the parenthesis opened just before `from` closes, strings and comments skipped;  `path` names the file in an
 * error.
 * - Comments are skipped so an apostrophe in one (`// a family's other files`) isn't read as a string's start:
 *   that string never closed, and the search started over from the top, forever (epic `repo-split` P22).
 */
function closingParen(code: string, from: number, path: string): number {
  let depth = 1
  for (let at = from; at < code.length; at++) {
    const char = code[at]
    const skipTo = (end: number) => {
      if (end < 0)
        throw new SyntaxError(
          `PackageBuild:  an import.meta.glob() in ${path} has a string or comment that never closes`
        )
      return end
    }
    if (char === "/" && code[at + 1] === "/") {
      at = skipTo(code.indexOf("\n", at))
      continue
    }
    if (char === "/" && code[at + 1] === "*") {
      at = skipTo(code.indexOf("*/", at + 2)) + 1
      continue
    }
    if (char === '"' || char === "'" || char === "`") {
      at = skipTo(code.indexOf(char, at + 1))
      continue
    }
    if (char === "(") depth++
    else if (char === ")" && --depth === 0) return at
  }
  throw new SyntaxError(`PackageBuild:  an import.meta.glob() in ${path} never closes`)
}

/** `text`, a call's arguments, read as literals (strings, arrays, objects of them):  JSON5 reads JavaScript's. */
function literalArgs(text: string, path: string): unknown[] {
  try {
    return JSON5.parse<unknown[]>(`[${text}]`)
  } catch {
    throw new SyntaxError(`PackageBuild:  ${path} has an import.meta.glob() whose arguments aren't literals:  ${text}`)
  }
}

/** The files `patterns` match from `dir`, each as the pattern wrote it (`./x/index.ts`, `../styles/a.css`), sorted. */
function globKeys(patterns: string | string[], dir: string): string[] {
  const list = typeof patterns === "string" ? [patterns] : patterns
  const included = list.filter((pattern) => !pattern.startsWith("!"))
  const excluded = list.filter((pattern) => pattern.startsWith("!")).map((pattern) => pattern.slice(1))
  const keys = new Set<string>()
  for (const pattern of included) {
    const base = resolve(dir, pattern.slice(0, pattern.search(/[*?{[]/)).replace(/[^/]*$/, ""))
    for (const file of existsSync(base) ? walk(base) : []) {
      let key = posix.relative(dir.split(sep).join("/"), join(base, file).split(sep).join("/"))
      if (!key.startsWith(".")) key = `./${key}`
      if (!matchesGlob(key, pattern)) continue
      if (excluded.some((glob) => matchesGlob(key, glob) || matchesGlob(key, `**/${glob.replace(/^(\.\.?\/)+/, "")}`)))
        continue
      keys.add(key)
    }
  }
  return [...keys].sort()
}
