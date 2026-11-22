import { spawnSync } from "node:child_process"
import { mkdtempSync, rmSync } from "node:fs"
import { createRequire } from "node:module"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"

import { SRV } from "spell/server"
import { EditorServer } from "spell/app/spaces/server/node/routes/EditorServer"

/**
 * The app folder's builds `spell perf` measures, made into a TEMPORARY folder:  nothing in the checkout changes.
 * - `editor`:  the editor, as `yarn build` builds it (`vp build` in the app's build folder)
 *   - `unminified`:  its functions keep their names, for the CPU profile
 * - `element`:  the element builds (`yarn build:element`):  `<spell-viewer>`, its runtime, `<spell-editor>` ...
 * - `serve()`:  an editor build served as an npm install serves the built editor (`EditorServer.builtServer()`),
 *   the page server's paths passed on to it, on a free port
 * - `dispose()`:  stops every server, and removes the folder
 */
export class PerfBuilds {
  /** the app's build folder, where its Vite configs are:  `app/app` */
  readonly appBuildFolder: string

  /** the temporary folder every build goes in */
  readonly folder = mkdtempSync(join(tmpdir(), "spell-perf-"))

  /** the servers `serve()` started */
  private readonly servers: SRV.WebServer[] = []

  constructor(appBuildFolder: string) {
    this.appBuildFolder = appBuildFolder
  }

  /**
   * Build `build` into the temporary folder, once;  resolves to its folder.
   * - throws when a build fails, with the end of what it said
   */
  build(build: PerfBuild): string {
    const outDir = join(this.folder, build)
    for (const config of CONFIGS[build]) {
      const minify = build === "editor-unminified" ? ["--minify", "false"] : []
      const result = spawnSync(
        process.execPath,
        [vpScript(this.appBuildFolder), "build", "-c", config, ...minify, "--outDir", outDir],
        { cwd: this.appBuildFolder, encoding: "utf8" }
      )
      if (result.status !== 0) {
        const said = `${result.stderr}${result.stdout}`.trim().split("\n").slice(-5).join("\n")
        throw new Error(`PerfBuilds.build():  the ${build} build (${config}) failed:\n${said}`)
      }
    }
    return outDir
  }

  /** Serve the editor build in `dir`, its page server paths passed on to `pagePort`;  resolves to its address. */
  async serve(dir: string, pagePort: number): Promise<string> {
    const web = EditorServer.builtServer({ dir, pagePort })
    const { port } = await web.listen({ port: await SRV.freePort(), host: SRV.LOCALHOST })
    this.servers.push(web)
    return `http://${SRV.LOCALHOST}:${port}/`
  }

  /** Stop every server, and remove the folder.  NEVER throws. */
  async dispose(): Promise<void> {
    for (const web of this.servers) await web.close().catch(() => {})
    rmSync(this.folder, { recursive: true, force: true })
  }
}

/** A build `PerfBuilds` makes. */
export type PerfBuild = "editor" | "editor-unminified" | "element"

/**
 * Each build's Vite configs, in the app's build folder, built one after another into one folder:
 * as the app folder's `yarn build` and `yarn build:element` do
 */
const CONFIGS: Record<PerfBuild, string[]> = {
  editor: ["vite.config.ts"],
  "editor-unminified": ["vite.config.ts"],
  element: ["vite.solid.config.ts", "vite.element.config.ts", "vite.editor.config.ts", "vite.code.config.ts"]
}

/**
 * Vite+'s command-line script, as the app's build folder resolves it.
 * - NOT `vite/bin/vite.js`:  `vite` is Vite+'s core, which ships no bin (as `EditorServer`'s `vpScript()` says)
 */
function vpScript(appBuildFolder: string): string {
  const require = createRequire(join(appBuildFolder, "package.json"))
  return join(dirname(require.resolve("vite-plus/package.json")), "bin/vp")
}
