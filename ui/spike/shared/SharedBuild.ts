/// <reference types="node" />

import { existsSync, readFileSync } from "node:fs"
import { fileURLToPath } from "node:url"
import solid from "@solidjs/vite-plugin"
import * as vite from "vite"

import type { ImportMap } from "./shared.types.ts"
import { PeerVendor } from "./PeerVendor.ts"

/**
 * Builds what `spike/shared/` serves itself, ONCE, with its own pinned toolchain:
 * - `frameworks/solid/dist/app.js` -- the Solid 2 host app (`@solidjs/vite-plugin` 3.0.0-next.46, `solid-js` /
 *   `@solidjs/web` 2.0.0-rc.11), with `solid-js` and `@solidjs/web` EXTERNAL so the page's import map picks
 *   the copy
 * - `vendor/` -- `solid-js` + `@solidjs/web` for pages whose spike doesn't ship Solid (import map at
 *   `/shared/vendor/`)
 * - `yarn build` in `spike/shared/`;  `SmokeRunner` calls `ensure()`, which builds only what's missing.
 */
export class SharedBuild {
  /** `spike/shared/`, absolute */
  static readonly ROOT = fileURLToPath(new URL("./", import.meta.url))
  /** the app's specifiers resolve through the page's import map */
  static readonly SOLID_EXTERNAL = /^solid-js(\/|$)|^@solidjs\/web(\/|$)/

  /** Build anything missing;  resolves with the shared import map (Solid, vendored here). */
  static async ensure(): Promise<ImportMap> {
    if (!existsSync(`${SharedBuild.ROOT}frameworks/solid/dist/app.js`)) await SharedBuild.app()
    if (!existsSync(`${SharedBuild.ROOT}vendor/importmap.json`)) await SharedBuild.vendor()
    return JSON.parse(readFileSync(`${SharedBuild.ROOT}vendor/importmap.json`, "utf8")) as ImportMap
  }

  /** Build everything. */
  static async all(): Promise<void> {
    await SharedBuild.app()
    await SharedBuild.vendor()
  }

  /** Compile the Solid 2 host app. */
  static async app(): Promise<void> {
    const pkg = JSON.parse(readFileSync(`${SharedBuild.ROOT}node_modules/solid-js/package.json`, "utf8"))
    await vite.build({
      root: SharedBuild.ROOT,
      configFile: false,
      logLevel: "warn",
      plugins: [solid({ dev: false })],
      define: { __SOLID_VERSION__: JSON.stringify((pkg as { version: string }).version) },
      build: {
        outDir: `${SharedBuild.ROOT}frameworks/solid/dist`,
        emptyOutDir: true,
        minify: false,
        lib: { entry: { app: `${SharedBuild.ROOT}frameworks/solid/app.tsx` }, formats: ["es"] },
        rolldownOptions: { external: (id) => SharedBuild.SOLID_EXTERNAL.test(id) }
      }
    })
    console.log("built frameworks/solid/dist/app.js")
  }

  /** Vendor `solid-js` + `@solidjs/web` into `vendor/`, served at `/shared/vendor/`. */
  static async vendor(): Promise<ImportMap> {
    return new PeerVendor({
      vite,
      root: SharedBuild.ROOT,
      peerEntry: "frameworks/solid/peers.ts",
      urlPrefix: "/shared/vendor/",
      // whole:  the host app's imports aren't in any `dist/`
      usedBy: false
    }).build()
  }
}
