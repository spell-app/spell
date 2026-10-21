/// <reference types="node" />

import { join } from "node:path"
import { createServer, mergeConfig, type InlineConfig, type ViteDevServer } from "vite"

/****************
 * ### `DevServer`
 * A package's Vite dev server (its `vite.config.ts`, as `yarn dev` runs it), started from node by the tools that drive
 * its pages in a browser:  Spell UI's `yarn test:visual` (`VisualRunner`), `yarn test:hmr` (`hmr.e2e.ts`),
 * `yarn screenshots`.
 * - Tries the preferred port, else takes the next free one, and says where it REALLY listens (`origin`, from Vite's
 *   `resolvedUrls`):  NEVER a hard-coded `http://localhost:<port>`, which is another server when the port was busy
 *   (epic `wwod-spell-ui`, I10).
 * - Imports `vite` and node built-ins only:  nothing of ours.
 ****************/
export class DevServer {
  /** the running Vite server */
  readonly vite: ViteDevServer
  /** where it listens, without a trailing slash, e.g. `http://localhost:5391` */
  readonly origin: string

  private constructor({ vite, origin }: { vite: ViteDevServer; origin: string }) {
    this.vite = vite
    this.origin = origin
  }

  /**
   * Start the dev server on `port` (or the next free one) and wait until it listens.
   * - `root`:  the package's folder, absolute;  its `vite.config.ts` is the config.
   * - `config` is merged over the defaults:  `root`, its `vite.config.ts`, warnings only.
   * - throws if Vite reports no local URL
   */
  static async start({ root, port, ...config }: DevServerProps): Promise<DevServer> {
    const vite = await createServer(
      mergeConfig<InlineConfig, InlineConfig>(
        { root, configFile: join(root, "vite.config.ts"), logLevel: "warn", server: { port, strictPort: false } },
        config
      )
    )
    await vite.listen()
    const local = vite.resolvedUrls?.local[0]
    if (!local) {
      await vite.close()
      throw new Error("DevServer.start():  Vite reports no local URL;  is `server.host` set to something odd?")
    }
    return new DevServer({ vite, origin: local.replace(/\/$/, "") })
  }

  /** `path` (from the package's folder, starting with `/`) on this server. */
  url(path: string): string {
    return `${this.origin}${path}`
  }

  /** Stop the server. */
  close(): Promise<void> {
    return this.vite.close()
  }
}

/** Options of `DevServer.start()`:  Vite's inline config, plus the package and the port. */
export type DevServerProps = {
  /** the package's folder, absolute:  the server's root, and where its `vite.config.ts` is */
  root: string
  /** preferred port;  the next free one is taken when it's busy */
  port: number
} & Omit<InlineConfig, "root">
