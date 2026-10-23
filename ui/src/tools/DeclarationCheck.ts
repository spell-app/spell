/// <reference types="node" />

import { existsSync, readdirSync, readFileSync, statSync } from "node:fs"
import { dirname, join, normalize, relative, resolve } from "node:path"

/****************
 * ### `DeclarationCheck`
 * Checks the built declarations (`dist/**.d.ts`, `vite.config.ts` `declarations()`) are what a consumer needs.
 * - Every `types` path in the PUBLISHED `exports` (and `types`) exists:  `package.json`'s `publishConfig`, which
 *   `yarn pack` writes over the source ones (epic `repo-split` P6);  the top-level fields when it has none.
 * - Every import / export STATEMENT is a bare package name, or a relative path that resolves INSIDE `dist/`:
 *   - no `#...` alias, which a consumer can't resolve
 *   - no `spell-ui/...`:  `dist/` names its own files relatively (the published `exports` name only the entries)
 *   - no `spell/util` or `spell/element`:  not published on their own, their declarations ship in
 *     `dist/_util/` and `dist/_spell-element/`
 *   - nothing escaping `dist/`
 *   - Doc comments may mention any of them.
 * - `problems()` is empty when it's fine;  `yarn smoke` runs it after `vite build` and fails otherwise.
 * - Node only, node built-ins only.
 ****************/
export class DeclarationCheck {
  /** Package root, absolute. */
  readonly root: string

  /** `dist/`, absolute. */
  readonly dist: string

  constructor(root: string) {
    this.root = resolve(root)
    this.dist = join(this.root, "dist")
  }

  /** One message per problem found, `[]` when the declarations are sound. */
  problems(): string[] {
    return [...this.missingExports(), ...this.badSpecifiers()]
  }

  /** Published `exports` / `types` entries naming a `.d.ts` that doesn't exist. */
  private missingExports(): string[] {
    type Published = { types?: string; exports?: Record<string, string | { types?: string }> }
    const packageJson = JSON.parse(readFileSync(join(this.root, "package.json"), "utf8")) as Published & {
      publishConfig?: Published
    }
    const published = packageJson.publishConfig?.exports ? packageJson.publishConfig : packageJson
    const paths = [
      published.types,
      ...Object.values(published.exports ?? {}).map((entry) => (typeof entry === "object" ? entry.types : undefined))
    ]
    return paths
      .filter((path): path is string => !!path)
      .filter((path) => !this.exists(path))
      .map((path) => `package.json names ${path}, which does not exist`)
  }

  /**
   * Whether `path` (from the root) names a file;  a subpath pattern (ONE `*`, the published `./components/ui-*` entry's)
   * when at least one file matches it.
   */
  private exists(path: string): boolean {
    if (!path.includes("*")) return existsSync(join(this.root, path))
    const [before = "", after = ""] = path.split("*")
    const folder = join(this.root, dirname(`${before}x`))
    const start = before.slice(before.lastIndexOf("/") + 1)
    if (!existsSync(folder)) return false
    return readdirSync(folder)
      .filter((name) => name.startsWith(start))
      .some((name) => existsSync(join(this.root, `${before}${name.slice(start.length)}${after}`)))
  }

  /** Import / export statements in `dist/**.d.ts` a consumer couldn't resolve. */
  private badSpecifiers(): string[] {
    const problems: string[] = []
    for (const file of DeclarationCheck.declarationFiles(this.dist)) {
      // block comments dropped first:  a docstring's example (`import("./Engine")`) is no statement
      const code = readFileSync(file, "utf8").replace(/\/\*[\s\S]*?\*\//g, "")
      for (const [, specifier] of code.matchAll(/(?:from |import\(|^import )["']([^"']+)["']/gm)) {
        if (!specifier.startsWith(".")) {
          if (specifier.startsWith("#")) {
            problems.push(`${relative(this.root, file)}:  alias "${specifier}"`)
          } else if (SELF.test(specifier)) {
            problems.push(
              `${relative(this.root, file)}:  "${specifier}" names spell-ui:  dist/ names its own files relatively`
            )
          } else if (UNPUBLISHED.test(specifier)) {
            problems.push(`${relative(this.root, file)}:  "${specifier}" is not published:  it ships inside dist/`)
          }
          continue
        }
        const target = normalize(resolve(dirname(file), specifier))
        const inside = target === this.dist || target.startsWith(`${this.dist}/`)
        if (!inside) problems.push(`${relative(this.root, file)}:  "${specifier}" leaves dist/`)
        else if (!DeclarationCheck.resolvesToDeclaration(target))
          problems.push(`${relative(this.root, file)}:  "${specifier}" not found`)
      }
    }
    return problems
  }

  /** Every `.d.ts` under `dir`, recursively. */
  private static declarationFiles(dir: string): string[] {
    return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
      const path = join(dir, entry.name)
      if (entry.isDirectory()) return DeclarationCheck.declarationFiles(path)
      return entry.name.endsWith(".d.ts") ? [path] : []
    })
  }

  /**
   * Whether `target` (an import path) is a declaration file, or a folder with an `index.d.ts`.
   * - `./x.js` means `./x.d.ts`, as TypeScript reads it (a declaration importing a generated `./x.js`)
   */
  private static resolvesToDeclaration(target: string): boolean {
    return (
      existsSync(`${target}.d.ts`) ||
      existsSync(target.replace(/\.m?js$/, ".d.ts")) ||
      (existsSync(target) && statSync(target).isDirectory() && existsSync(join(target, "index.d.ts")))
    )
  }
}

/** Spell UI's own name:  `declarations()` rewrites it to relative paths, so no `.d.ts` names it. */
const SELF = /^spell-ui(\/|$)/

/** The kit's folders whose declarations ship inside `spell-ui`'s `dist/` (`declarations()`):  never named by a `.d.ts`. */
const UNPUBLISHED = /^spell\/(util|element)(\/|$)/
