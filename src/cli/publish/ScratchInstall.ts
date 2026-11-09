import { execFileSync } from "node:child_process"
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { SRV } from "spell/server"
import { BrowserPage } from "spell/element-tools/BrowserPage"
import type { PackedPackage, PublishCheck } from "spell/cli/publish"

/****************
 * ### ScratchInstall
 * The packed packages, installed the way someone outside would:  a project in the system's temp folder, far from any
 * checkout, `npm install`s every `.tgz`, then these checks run there (epic `repo-split` P19's Verify):
 * 1. node imports `spell/util` and `spell/parser/parser`
 * 2. a page Vite builds, importing `spell/ui/ui-button` and `spell/element`, draws a `<ui-button>` in headless Chromium,
 *    with ONE element base:  the button's class extends the page's own `E.DOMElement`, and the built page holds one
 *    `class DOMElement`
 * 3. `npx spell help` runs;  and `npx epic --help`, when `spell-epic` is among them
 * 4. with `spell-epic`:  `epic init` in a scratch git repo starts the epic server, under a scratch `HOME`, on a free port;
 *    an epic page and the epics pack answer (epic `epic-engine` I246:  it started only from a checkout)
 * - Third-party packages come from the npm registry:  it needs the network.
 * - Each package's name is pinned to its `.tgz` (`overrides`), so the packages' dependencies on each other
 *   (`spell` on `spell-ui` ...) find the packed ones, never the registry's.
 * - Vite is the published `spell`'s own (`vite-plus`);  Chromium is the checkout's Playwright.
 * - The folder is removed when every check passes;  else kept, and named, to look into.
 ****************/
export class ScratchInstall {
  /** The scratch project's folder. */
  readonly dir: string

  constructor(readonly packed: PackedPackage[]) {
    this.dir = mkdtempSync(join(tmpdir(), "spell-publish-"))
  }

  /** Install, then run the checks;  every result, passed or failed.  NEVER throws. */
  async run(): Promise<PublishCheck[]> {
    const checks: PublishCheck[] = []
    const install = this.step("npm install of every .tgz, outside the checkout", () => this.install())
    checks.push(install)
    if (install.ok) {
      checks.push(this.step("node imports spell/util and spell/parser/parser", () => this.nodeImports()))
      checks.push(await this.asyncStep("a Vite page draws <ui-button>, with one DOMElement", () => this.page()))
      checks.push(this.step("npx spell help runs", () => this.spellHelp()))
      if (this.packed.some((pkg) => pkg.name === "spell-epic")) {
        checks.push(this.step("npx epic --help runs (spell-epic's bin, on spell's code)", () => this.epicHelp()))
        checks.push(await this.asyncStep("the epic server starts and serves an epic page", () => this.epicServer()))
      }
    }
    if (checks.every((check) => check.ok)) rmSync(this.dir, { recursive: true, force: true })
    else checks.push({ check: "scratch project kept, to look into", ok: true, detail: this.dir })
    return checks
  }

  ////////////////
  // ## The steps
  ////////////////

  /** `npm install` every packed file, each name pinned to its file. */
  private install(): string {
    const dependencies = Object.fromEntries(this.packed.map((pkg) => [pkg.name, `file:${pkg.tgz}`]))
    const overrides = Object.fromEntries(this.packed.map((pkg) => [pkg.name, `$${pkg.name}`]))
    writeJson(join(this.dir, "package.json"), {
      name: "spell-scratch",
      private: true,
      type: "module",
      dependencies,
      overrides
    })
    this.exec("npm", ["install", "--no-audit", "--no-fund", "--loglevel=error"], { timeout: 600_000 })
    return `${this.packed.length} packages in ${this.dir}`
  }

  /** Node imports two names, from the installed packages' built files. */
  private nodeImports(): string {
    const script = [
      'const util = await import("spell/util")',
      'const parser = await import("spell/parser/parser")',
      "console.log(`spell/util: ${Object.keys(util).length} exports;  spell/parser/parser: ${Object.keys(parser).length}`)"
    ].join("\n")
    return this.exec(process.execPath, ["--input-type=module", "-e", script]).trim()
  }

  /** `npx spell help`, from the installed `spell`. */
  private spellHelp(): string {
    const help = this.exec("npx", ["--no-install", "spell", "help"])
    if (!/Usage|spell/.test(help)) throw new Error(`printed no help:  ${help.slice(0, 200)}`)
    return `${help.split("\n").length} lines`
  }

  /** `npx epic --help`, from the installed `spell-epic`:  its bin runs `spell`'s built epic command. */
  private epicHelp(): string {
    const help = this.exec("npx", ["--no-install", "epic", "--help"])
    if (!/epic/.test(help)) throw new Error(`printed no help:  ${help.slice(0, 200)}`)
    return `${help.split("\n").length} lines`
  }

  /**
   * `epic init` in a scratch git repo, under a scratch `HOME` and on a free port:  the epic server starts from the
   * install, then an epic page and the epics pack answer.  The server is stopped again, whatever happens.
   * - `--no-plugin`:  no Claude Code, no editor, no network;  `--no-commit`, `--no-remote`:  nothing to push
   */
  private async epicServer(): Promise<string> {
    const home = join(this.dir, "epic-home")
    const repo = join(this.dir, "epic-repo")
    for (const folder of [home, repo]) mkdirSync(folder, { recursive: true })
    const port = await SRV.freePort()
    // no git settings handed down (a publish started from a hook, or with another index):  the repo is its own
    const env = {
      HOME: home,
      CLAUDE_CONFIG_DIR: join(home, ".claude"),
      SPELL_EPIC_PORT: String(port),
      GIT_DIR: undefined,
      GIT_INDEX_FILE: undefined,
      GIT_WORK_TREE: undefined
    }
    const epic = (...args: string[]) => this.exec("npx", ["--no-install", "epic", ...args], { cwd: repo, env })
    this.exec("git", ["init", "-q"], { cwd: repo, env })
    this.exec(
      "git",
      [
        "-c",
        "user.name=Scratch",
        "-c",
        "user.email=scratch@example.com",
        "commit",
        "-q",
        "--allow-empty",
        "-m",
        "scratch"
      ],
      { cwd: repo, env }
    )
    try {
      epic("init", "--no-plugin", "--no-remote", "--no-commit", "--name", "Scratch", "--color", "teal")
      epic("create", "hello", "--title", "Hello")
      const base = `http://127.0.0.1:${port}`
      const page = await answerOf(`${base}/epics/hello/hello.plan.html`)
      if (!page.includes("<epic-page")) throw new Error("its epic page holds no <epic-page>")
      const pack = await answerOf(`${base}/_epic/pack/epics.pack.js`)
      return `port ${port}:  an epic page, ${page.length} bytes;  the epics pack, ${pack.length} bytes`
    } finally {
      try {
        epic("server", "stop")
      } catch {
        // already stopped, or never started:  the check above says which
      }
    }
  }

  /**
   * A page importing `spell-ui` and `spell/element`, built by the installed Vite, served, and opened in headless
   * Chromium:  it draws a `<ui-button>`, whose class extends the page's own `E.DOMElement`.
   */
  private async page(): Promise<string> {
    const page = join(this.dir, "page")
    mkdirSync(page, { recursive: true })
    writeFileSync(join(page, "index.html"), PAGE_HTML)
    writeFileSync(join(page, "main.js"), PAGE_SCRIPT)
    this.exec(
      "npx",
      ["--no-install", "vp", "build", "page", "--outDir", "../page-dist", "--emptyOutDir", "--minify", "false"],
      { timeout: 300_000 }
    )
    const built = join(this.dir, "page-dist")
    const definitions = readdirSync(built, { recursive: true, withFileTypes: true })
      .filter((entry) => entry.isFile() && entry.name.endsWith(".js"))
      .map((entry) => readFileSync(join(entry.parentPath, entry.name), "utf8").match(DOM_ELEMENT_CLASS)?.length ?? 0)
      .reduce((sum, count) => sum + count, 0)
    if (definitions !== 1) throw new Error(`the built page defines DOMElement ${definitions} times`)

    // the kit's own web server, on a free port (epic `coherence` P29:  its own little server before)
    const server = new SRV.WebServer({ mounts: [{ prefix: "/", dir: built }] })
    const { url } = await server.listen({ port: 0 })
    try {
      return await BrowserPage.with(async (browser) => {
        const errors: string[] = []
        const onProblem = (text: string) => errors.push(text)
        const tab = await BrowserPage.open(browser, `${url}/`, { onProblem, consoleTypes: [], settle: false })
        await tab.waitForFunction(() => (window as unknown as { scratchResult?: unknown }).scratchResult, null, {
          timeout: 20_000
        })
        const result = await tab.evaluate(() => (window as unknown as { scratchResult: ScratchResult }).scratchResult)
        if (errors.length) throw new Error(`page errors:  ${errors.join(";  ")}`)
        if (!result.defined || !result.oneBase || !result.drawn) throw new Error(JSON.stringify(result))
        return `<ui-button> defined, extends the page's DOMElement, drew ${result.drawn};  1 class DOMElement`
      })
    } finally {
      await server.close()
    }
  }

  ////////////////
  // ## Helpers
  ////////////////

  /**
   * Run `command` in the scratch folder (or `cwd`);  its output.  Throws with its stderr when it fails.
   * - `env`:  added to this process's;  the checkout's own `epic` variables never reach it
   */
  private exec(
    command: string,
    args: string[],
    { timeout = 120_000, cwd = this.dir, env = {} }: { timeout?: number; cwd?: string; env?: NodeJS.ProcessEnv } = {}
  ): string {
    try {
      return execFileSync(command, args, {
        cwd,
        encoding: "utf8",
        timeout,
        stdio: ["ignore", "pipe", "pipe"],
        env: { ...process.env, EPIC_CHECKOUT: undefined, npm_config_update_notifier: "false", ...env }
      })
    } catch (error) {
      const { stderr, stdout } = error as { stderr?: string; stdout?: string }
      throw new Error(`${command} ${args.join(" ")}:  ${(stderr || stdout || String(error)).trim().slice(-1500)}`)
    }
  }

  /** One check, from `work`'s result or failure. */
  private step(check: string, work: () => string): PublishCheck {
    try {
      return { check, ok: true, detail: work() }
    } catch (error) {
      return { check, ok: false, detail: (error as Error).message }
    }
  }

  /** `step()`, for async work. */
  private async asyncStep(check: string, work: () => Promise<string>): Promise<PublishCheck> {
    try {
      return { check, ok: true, detail: await work() }
    } catch (error) {
      return { check, ok: false, detail: (error as Error).message }
    }
  }
}

/**
 * A definition of the element base class in built JavaScript, as esbuild or Rolldown write it, minified or not:
 * `class DOMElement` or `DOMElement = class`.
 */
const DOM_ELEMENT_CLASS = /\bclass DOMElement\b|\bDOMElement = class\b/g

/** What `url` answers;  throws unless it's a 200. */
async function answerOf(url: string): Promise<string> {
  const reply = await fetch(url)
  if (!reply.ok) throw new Error(`${url} answered ${reply.status}`)
  return reply.text()
}

/** What the scratch page reports, on `window.scratchResult`. */
type ScratchResult = { defined: boolean; oneBase: boolean; drawn: string; error?: string }

/** The scratch page. */
const PAGE_HTML = `<!doctype html>
<html>
  <head><meta charset="utf-8" /><title>spell scratch</title></head>
  <body>
    <ui-button id="button">Hello</ui-button>
    <script type="module" src="./main.js"></script>
  </body>
</html>
`

/**
 * The scratch page's script:  ONE family, `spell/ui/ui-button`, and `spell/element`, then whether the button is
 * defined, its class extends the page's `E.DOMElement`, and it drew something in its shadow root.
 * - One family, not all of `spell/ui`:  a bundler drops Spell UI's settings unless `core` is a side effect, and only
 *   a family alone showed it (epic `repo-split` P22).
 */
const PAGE_SCRIPT = `import "spell/ui/ui-button"
import { E } from "spell/element"

const report = (result) => (window.scratchResult = result)
try {
  await customElements.whenDefined("ui-button")
  const button = document.getElementById("button")
  await button.ready
  report({
    defined: true,
    oneBase: customElements.get("ui-button").prototype instanceof E.DOMElement,
    drawn: button.shadowRoot ? button.shadowRoot.innerHTML.length + " characters in its shadow root" : ""
  })
} catch (error) {
  report({ defined: false, oneBase: false, drawn: "", error: String(error) })
}
`

/** Write `value` as JSON. */
function writeJson(file: string, value: unknown): void {
  writeFileSync(file, `${JSON.stringify(value, null, 2)}\n`)
}
