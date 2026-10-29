import { execFileSync } from "node:child_process"
import { cpSync, existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { join } from "node:path"

import {
  DIST,
  DOC_FILES,
  PublishedPackage,
  type BuildReport,
  type PackedPackage,
  type PublishCheck
} from "spell/cli/publish"

/****************
 * ### UIBundle
 * The `spell-ui` package (epic `repo-split` Q63):  Spell UI on its own, for a page that wants only the components --
 * its Vite library build (`yarn build` in `ui/`:  `dist/`, one file per family, `core`, `forms`, `styles` ...), with
 * the kit's element code INSIDE it.
 * - So a page loads EITHER this or `spell/ui/...` from `spell`, never both:  both together carry the element code
 *   twice (its README says so).
 * - Its names:  `spell-ui` (every family), `spell-ui/core`, `spell-ui/ui-button` ...:  `exports` over `dist/`.
 * - Its dependencies:  the folder's own runtime ones but `spell` (built in);  Solid as a peer, as the build leaves it
 *   out (`SOLID_EXTERNAL`).
 * - Built from the folder's `package.json` (its name, `spell-ui`) and `dist/`;  the checkout's files never change.
 ****************/
export class UIBundle extends PublishedPackage {
  /** It ships the element code on purpose:  the one-`DOMElement` check is `spell`'s, not its. */
  override holdsElementCode = true

  /** Build Spell UI's library (`yarn build`, unless `skipBuild`), then fill the staging folder.  Throws when it fails. */
  override async stage(): Promise<BuildReport> {
    rmSync(this.stageDir, { recursive: true, force: true })
    mkdirSync(this.stageDir, { recursive: true })
    if (!this.skipBuild) execFileSync("yarn", ["build"], { cwd: this.repo.root, stdio: "pipe", maxBuffer: 1 << 28 })
    const built = join(this.repo.root, "dist")
    if (!existsSync(join(built, "index.js"))) throw new Error(`UIBundle:  no ${built}/index.js after \`yarn build\``)
    cpSync(built, join(this.stageDir, DIST), { recursive: true, verbatimSymlinks: false, dereference: true })
    for (const file of readdirSync(this.repo.root)) {
      if (DOC_FILES.test(file)) cpSync(join(this.repo.root, file), join(this.stageDir, file))
    }
    writeFileSync(join(this.stageDir, "package.json"), `${JSON.stringify(this.manifest(), null, 2)}\n`)
    const files = readdirSync(join(this.stageDir, DIST), { recursive: true }).length
    this.built = { compiled: 0, modules: 0, copied: files, declarations: 0, warnings: [] }
    return this.built
  }

  /** Set before `stage()` to pack the `dist/` there is:  `spell publish --skip-ui-build`. */
  skipBuild = false

  /** The published `package.json`:  `spell-ui`, its `dist/` names, its runtime dependencies, Solid as a peer. */
  override manifest(): Record<string, unknown> {
    const source = this.repo.manifest
    const kit = this.kitManifest()
    const own = Object.keys(source.dependencies ?? {}).filter((name) => name !== "spell")
    const versions = { ...kit.devDependencies, ...kit.dependencies } as Record<string, string>
    return {
      name: source.name,
      version: this.version,
      description: source.description,
      license: source.license,
      repository: kit.repository,
      type: "module",
      sideEffects: ["**/*.css", "./dist/index.js", "./dist/ui-*.js"],
      exports: {
        ".": withTypes("./dist/index", this.stageDir),
        "./*.css": "./dist/*.css",
        "./*": { types: "./dist/*.d.ts", default: "./dist/*.js" },
        "./package.json": "./package.json"
      },
      files: readdirSync(this.stageDir).filter((entry) => entry !== "package.json"),
      dependencies: Object.fromEntries(own.map((name) => [name, versions[name] ?? source.dependencies![name]!])),
      peerDependencies: { "solid-js": versions["solid-js"], "@solidjs/web": versions["@solidjs/web"] }
    }
  }

  /** The base checks, and its own:  the build's files, and no `spell/...` import left that needs the one package. */
  override checks(packed: PackedPackage): PublishCheck[] {
    const leftover = packed.files.filter(
      (file) =>
        file.endsWith(".js") && /from\s*["']spell\/(?!ui\/)/.test(readFileSync(join(this.stageDir, file), "utf8"))
    )
    return [
      ...super.checks(packed),
      {
        pkg: this.name,
        check: "stands alone:  no import of the one package spell left in its build",
        ok: !leftover.length,
        ...(leftover.length && { detail: leftover.slice(0, 5).join(", ") })
      }
    ]
  }

  /** The kit's `package.json`:  the one install's versions. */
  private kitManifest(): Record<string, unknown> & { dependencies?: object; devDependencies?: object } {
    return JSON.parse(readFileSync(join(this.repo.root, "..", "package.json"), "utf8")) as Record<string, unknown>
  }
}

/** An entry for `base` (`./dist/index`):  its `.js`, with its declarations when the build wrote them. */
function withTypes(base: string, stage: string): unknown {
  return existsSync(join(stage, `${base}.d.ts`)) ? { types: `${base}.d.ts`, default: `${base}.js` } : `${base}.js`
}
