import { spawnSync } from "node:child_process"
import { createHash, X509Certificate } from "node:crypto"
import { mkdtempSync, readFileSync, rmSync } from "node:fs"
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
 * - `https`:  served over HTTPS and HTTP/2, with a throwaway certificate openssl makes in the folder (epic
 *   `solid-2-final` P14);  this machine trusts nothing new:  Chromium is told to trust its key alone (`trustedKey`)
 * - `dispose()`:  stops every server, and removes the folder
 */
export class PerfBuilds {
  /** the app's build folder, where its Vite configs are:  `app/app` */
  readonly appBuildFolder: string

  /** the temporary folder every build goes in */
  readonly folder = mkdtempSync(join(tmpdir(), "spell-perf-"))

  /** the servers `serve()` started */
  private readonly servers: SRV.WebServer[] = []

  /** serve over HTTPS and HTTP/2 */
  readonly https: boolean

  /** the throwaway certificate, made the first time it's needed */
  private certificate?: SRV.CertificateFiles

  constructor(appBuildFolder: string, { https = false }: { https?: boolean } = {}) {
    this.appBuildFolder = appBuildFolder
    this.https = https
  }

  /** the throwaway certificate's key, as Chromium's `--ignore-certificate-errors-spki-list` takes it;  none on HTTP */
  get trustedKey(): string | undefined {
    if (!this.certificate) return undefined
    const key = new X509Certificate(this.certificate.cert).publicKey.export({ type: "spki", format: "der" })
    return createHash("sha256").update(key).digest("base64")
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
    const certificate = this.https ? this.throwawayCertificate() : undefined
    const web = EditorServer.builtServer({ dir, pagePort, certificate })
    const { port } = await web.listen({ port: await SRV.freePort(), host: SRV.LOCALHOST })
    this.servers.push(web)
    return web.secureUrl ? `${web.secureUrl}/` : `http://${SRV.LOCALHOST}:${port}/`
  }

  /**
   * A certificate for `localhost`, made once by openssl in the folder, for a day.
   * - throws when openssl can't make one
   */
  private throwawayCertificate(): SRV.CertificateFiles {
    if (this.certificate) return this.certificate
    const [key, cert] = [join(this.folder, "localhost-key.pem"), join(this.folder, "localhost.pem")]
    const made = spawnSync(
      "openssl",
      [
        ...["req", "-x509", "-newkey", "ec", "-pkeyopt", "ec_paramgen_curve:prime256v1", "-nodes", "-days", "1"],
        ...["-subj", "/CN=localhost", "-addext", "subjectAltName=DNS:localhost,IP:127.0.0.1"],
        ...["-keyout", key, "-out", cert]
      ],
      { encoding: "utf8" }
    )
    if (made.status !== 0) throw new Error(`PerfBuilds:  openssl made no certificate:  ${made.stderr || made.error}`)
    this.certificate = { key: readFileSync(key, "utf8"), cert: readFileSync(cert, "utf8") }
    return this.certificate
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
