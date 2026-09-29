/// <reference types="node" />

import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs"
import { isAbsolute, join } from "node:path"
import type { InlineConfig } from "vite"

import type { ImportMap, ViteLike } from "./shared.types.ts"
import { SpikeMeasure } from "./SpikeMeasure.ts"

/**
 * Vendors a spike's peer set for import-map pages:  ONE ES module per peer specifier (`lit`,
 * `lit/decorators.js`, `solid-js`, `@solidjs/web` ...), so a page maps each specifier to a local file and runs
 * offline and deterministically.
 * - One Vite build with every specifier as its own entry:  modules they share (`lit-html`, `@solidjs/signals`)
 *   land in shared chunks, so each module exists ONCE and identities hold across specifiers.
 * - Production conditions and `process.env.NODE_ENV`, minified:  what an app would ship.
 * - `resolve.dedupe` on every peer package:  a LINKED peer (`@spell/solid-element` -> `../solid-element`)
 *   otherwise resolves its own imports (`solid-js`) from its own `node_modules`, bundling a second runtime.
 * - Tree-shaken to what the spike USES:  each specifier's file re-exports only the bindings the built `dist/`
 *   imports from it (`SpikeMeasure.importedBindings()`), so an import-map page downloads the "library (as used)"
 *   size, not every export.  A namespace import (`import * as`), a specifier `dist/` never imports, or no
 *   `dist/` at all => the whole specifier.
 * - NOTE: run it AFTER `yarn build`, and again when `dist/` starts importing a new binding:  a page importing a
 *   binding the vendored file lacks fails to load ("does not provide an export named ...").
 * - Writes `<outDir>/<specifier>.js` (+ `chunks/`), and `<outDir>/importmap.json` mapping each specifier to
 *   `<urlPrefix><file>`.
 */
export class PeerVendor {
  /** the `vite` module doing the build */
  private readonly vite: ViteLike
  /** package root the specifiers resolve from, absolute */
  private readonly root: string
  /** `export * as x from "<spec>"` file listing the specifiers */
  private readonly peerEntry: string
  /** output directory, absolute */
  readonly outDir: string
  /** URL the output directory is served at */
  readonly urlPrefix: string
  /** built output whose imports decide what's vendored, absolute;  `undefined` => everything */
  readonly usedBy: string | undefined

  constructor(options: PeerVendorOptions) {
    this.vite = options.vite
    this.root = options.root
    this.peerEntry = isAbsolute(options.peerEntry) ? options.peerEntry : join(options.root, options.peerEntry)
    this.outDir = join(options.root, options.outDir ?? "vendor")
    this.urlPrefix = options.urlPrefix ?? "/vendor/"
    this.usedBy = options.usedBy === false ? undefined : join(options.root, options.usedBy ?? "dist")
  }

  /** Peer specifiers, from `peerEntry`. */
  specifiers(): string[] {
    return SpikeMeasure.specifiers(this.peerEntry)
  }

  /** Build the vendored files;  resolves with (and writes) the import map. */
  async build(): Promise<ImportMap> {
    const specifiers = this.specifiers()
    const used = this.used()
    // the lib entries are bare specifiers:  a virtual module per entry re-exports each one
    const { plugin, entry } = SpikeMeasure.virtualEntries(
      Object.fromEntries(
        specifiers.map((specifier) => [PeerVendor.fileOf(specifier), PeerVendor.reexport(specifier, used?.[specifier])])
      )
    )
    await this.vite.build({
      root: this.root,
      configFile: false,
      logLevel: "warn",
      plugins: [plugin],
      resolve: { dedupe: PeerVendor.packages(specifiers) },
      define: { "process.env.NODE_ENV": JSON.stringify("production") },
      build: {
        outDir: this.outDir,
        emptyOutDir: true,
        minify: true,
        lib: { entry, formats: ["es"] },
        rolldownOptions: {
          preserveEntrySignatures: "strict",
          output: { entryFileNames: "[name].js", chunkFileNames: "chunks/[name]-[hash].js" }
        }
      }
    } satisfies InlineConfig)
    const map: ImportMap = {
      imports: Object.fromEntries(
        specifiers.map((specifier) => [specifier, `${this.urlPrefix}${PeerVendor.fileOf(specifier)}.js`])
      )
    }
    mkdirSync(this.outDir, { recursive: true })
    writeFileSync(join(this.outDir, "importmap.json"), `${JSON.stringify(map, null, 2)}\n`)
    const shaken = specifiers.filter((specifier) => used?.[specifier] && !used[specifier].includes("*")).length
    console.log(
      `vendored ${specifiers.length} specifiers (${shaken} tree-shaken to what dist/ uses) into ${this.outDir}`
    )
    return map
  }

  /**
   * Bindings `usedBy`'s `.js` files import, per specifier;  `undefined` when there's nothing to read (then
   * every specifier is vendored whole).
   */
  private used(): Record<string, string[]> | undefined {
    if (!this.usedBy || !existsSync(this.usedBy)) return undefined
    const files = readdirSync(this.usedBy, { recursive: true, encoding: "utf8" }).filter((file) => file.endsWith(".js"))
    return SpikeMeasure.importedBindings(files.map((file) => readFileSync(join(this.usedBy!, file), "utf8")))
  }

  /** npm packages of `specifiers`, once each:  `["lit", "lit/decorators.js"]` => `["lit"]`. */
  static packages(specifiers: string[]): string[] {
    return [...new Set(specifiers.map((specifier) => SpikeMeasure.packageOf(specifier)))]
  }

  /** Output name of `specifier` (no extension):  `lit/decorators.js` => `lit/decorators`. */
  static fileOf(specifier: string): string {
    return specifier.replace(/\.m?js$/, "")
  }

  /**
   * Source of the virtual entry for `specifier`:  `names` only, or every export without them (or with `"*"`).
   * - NOTE: `export *` skips `default`;  none of today's peers (`lit`, `solid-js`, `@solidjs/web`) has one.
   */
  private static reexport(specifier: string, names?: string[]): string {
    const from = JSON.stringify(specifier)
    if (!names?.length || names.includes("*")) return `export * from ${from}\n`
    return `export { ${names.join(", ")} } from ${from}\n`
  }
}

/** Constructor options of `PeerVendor`. */
export type PeerVendorOptions = {
  /** the `vite` module to build with */
  vite: ViteLike
  /** package root the specifiers resolve from */
  root: string
  /** `export * as x from "<spec>"` file listing the specifiers, absolute or relative to `root` */
  peerEntry: string
  /** output directory relative to `root`;  default `vendor` */
  outDir?: string
  /** URL the output directory is served at;  default `/vendor/` */
  urlPrefix?: string
  /**
   * Built output (relative to `root`) whose imports decide which bindings are vendored;  default `dist`.
   * - `false` vendors every export.
   */
  usedBy?: string | false
}
