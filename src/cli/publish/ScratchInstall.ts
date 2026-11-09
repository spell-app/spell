import { execFileSync } from "node:child_process"
import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { SRV } from "spell/server"
import { BrowserPage } from "spell/element-tools/BrowserPage"
import type { PackedPackage, PublishCheck } from "spell/cli/publish"

/****************
 * ### ScratchInstall
 * The packed packages, installed the way someone outside would, in the system's temp folder, far from any checkout,
 * and tried out.  Twice, because there are two ways in (epic `epic-engine` P66):
 * - LEAN:  `spell` alone, as `npx spell@next epic init` gets it:
 *   1. it's small enough:  `LEAN_LIMITS`, so the install can't quietly grow again
 *   2. `npx spell help` runs
 *   3. `spell epic init` in a scratch git repo starts the epic server, under a scratch `HOME`, on a free port;
 *      an epic page and the epics pack answer (epic `epic-engine` I246);  every route module loaded;
 *      an edit saves and formats the page
 *   4. a command that needs a package left out prints the line to paste
 * - WHOLE:  every `.tgz`, plus the add-ons that line names (epic `repo-split` P19's Verify):
 *   1. node imports `spell/util` and `spell/parser/parser`
 *   2. a page Vite builds, importing `spell/ui/ui-button` and `spell/element`, draws a `<ui-button>` in headless Chromium,
 *      with ONE element base:  the button's class extends the page's own `E.DOMElement`, and the built page holds one
 *      `class DOMElement`
 *   3. `npx spell help` runs, and the command the lean install couldn't;  and `npx epic --help`, and the epic checks
 *      above, when `spell-epic` is among them
 * - Third-party packages come from the npm registry:  it needs the network.
 * - Each package's name is pinned to its `.tgz` (`overrides`), so the packages' dependencies on each other
 *   (`spell` on `spell-ui` ...) find the packed ones, never the registry's.
 * - Vite is the whole install's `vite-plus`;  Chromium is the checkout's Playwright.
 * - The folder is removed when every check passes;  else kept, and named, to look into.
 ****************/
export class ScratchInstall {
  /** The scratch folder, holding the two projects. */
  readonly dir: string

  /** The project the steps are working in now. */
  private project: string

  constructor(readonly packed: PackedPackage[]) {
    this.dir = mkdtempSync(join(tmpdir(), "spell-publish-"))
    this.project = this.dir
  }

  /** Install, then run the checks;  every result, passed or failed.  NEVER throws. */
  async run(): Promise<PublishCheck[]> {
    const checks = [...(await this.lean()), ...(await this.whole())]
    if (checks.every((check) => check.ok)) rmSync(this.dir, { recursive: true, force: true })
    else checks.push({ check: "scratch project kept, to look into", ok: true, detail: this.dir })
    return checks
  }

  /** `spell` alone, as `npx spell@next epic init` installs it. */
  private async lean(): Promise<PublishCheck[]> {
    const install = this.step("lean:  npm install of spell alone", () =>
      this.install(
        "lean",
        this.packed.filter((pkg) => pkg.name === SPELL)
      )
    )
    if (!install.ok) return [install]
    const spellEpic = (...args: string[]) => ["--no-install", SPELL, "epic", ...args]
    return [
      install,
      this.step("lean:  small enough", () => this.leanSize()),
      this.step("lean:  npx spell help runs", () => this.spellHelp()),
      await this.asyncStep("lean:  the epic server starts, and an epic page saves", () => this.epicServer(spellEpic)),
      this.step("lean:  a command needing a left-out package prints the line to paste", () => this.addOnMessage())
    ]
  }

  /** Every `.tgz`, plus the add-ons the lean install's message names. */
  private async whole(): Promise<PublishCheck[]> {
    const addOns = this.addOns()
    const install = this.step("whole:  npm install of every .tgz and the add-ons", () =>
      this.install("whole", this.packed, addOns)
    )
    if (!install.ok) return [install]
    const checks = [
      install,
      this.step("whole:  node imports spell/util and spell/parser/parser", () => this.nodeImports()),
      await this.asyncStep("whole:  a Vite page draws <ui-button>, with one DOMElement", () => this.page()),
      this.step("whole:  npx spell help runs", () => this.spellHelp()),
      this.step("whole:  a command needing an add-on runs", () => this.addOnCommand())
    ]
    if (this.packed.some((pkg) => pkg.name === "spell-epic")) {
      checks.push(this.step("whole:  npx epic --help runs (spell-epic's bin, on spell's code)", () => this.epicHelp()))
      const epic = (...args: string[]) => ["--no-install", "epic", ...args]
      checks.push(
        await this.asyncStep("whole:  the epic server starts and serves an epic page", () => this.epicServer(epic))
      )
    }
    return checks
  }

  ////////////////
  // ## The steps
  ////////////////

  /**
   * `npm install` `packages` and `addOns` in a new project `name`, which becomes the one the steps work in;
   * each packed name pinned to its file.
   */
  private install(name: string, packages: PackedPackage[], addOns: Record<string, string> = {}): string {
    this.project = join(this.dir, name)
    mkdirSync(this.project, { recursive: true })
    const dependencies = { ...addOns, ...Object.fromEntries(packages.map((pkg) => [pkg.name, `file:${pkg.tgz}`])) }
    const overrides = Object.fromEntries(packages.map((pkg) => [pkg.name, `$${pkg.name}`]))
    writeJson(join(this.project, "package.json"), {
      name: "spell-scratch",
      private: true,
      type: "module",
      dependencies,
      overrides
    })
    this.exec("npm", ["install", "--no-audit", "--no-fund", "--loglevel=error"], { timeout: 600_000 })
    return `${packages.length} packed, ${Object.keys(addOns).length} add-ons, in ${this.project}`
  }

  /** The lean install's packages and megabytes, against `LEAN_LIMITS`;  throws when it's over either. */
  private leanSize(): string {
    const { packages } = JSON.parse(readFileSync(join(this.project, "node_modules", ".package-lock.json"), "utf8")) as {
      packages: Record<string, unknown>
    }
    const count = Object.keys(packages).length
    const megabytes = Math.round(Number(this.exec("du", ["-sk", "node_modules"]).split(/\s/)[0]) / 1024)
    const size = `${count} packages, ${megabytes} MB (limits:  ${LEAN_LIMITS.packages}, ${LEAN_LIMITS.megabytes} MB)`
    if (count > LEAN_LIMITS.packages || megabytes > LEAN_LIMITS.megabytes) throw new Error(size)
    return size
  }

  /** The add-ons as the published `spell` lists them:  its optional `peerDependencies`. */
  private addOns(): Record<string, string> {
    const spell = this.packed.find((pkg) => pkg.name === SPELL)
    if (!spell) return {}
    const manifest = JSON.parse(this.exec("tar", ["-xzOf", spell.tgz, "package/package.json"])) as {
      peerDependencies?: Record<string, string>
      peerDependenciesMeta?: Record<string, { optional?: boolean }>
    }
    return Object.fromEntries(
      Object.entries(manifest.peerDependencies ?? {}).filter(
        ([name]) => manifest.peerDependenciesMeta?.[name]?.optional
      )
    )
  }

  /** `npx spell projects`, which needs a package left out:  it must fail saying what to install. */
  private addOnMessage(): string {
    let output: string
    try {
      output = this.exec("npx", ["--no-install", SPELL, "projects"])
    } catch (error) {
      output = (error as Error).message
    }
    const line = /npm install spell@\S+ .*/.exec(output)?.[0]
    if (!line) throw new Error(`no line to paste:  ${output.slice(0, 300)}`)
    return `${line.slice(0, 60)} ...`
  }

  /** `npx spell projects`, the command the lean install couldn't run. */
  private addOnCommand(): string {
    return `${this.exec("npx", ["--no-install", SPELL, "projects"]).split("\n").length} lines`
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
   * - `command`:  `npx`'s arguments for an epic command, so each install tries the way its people will
   * - an item added afterwards saves and formats the page;  the server's log says no route module failed
   */
  private async epicServer(command: (...args: string[]) => string[]): Promise<string> {
    const home = join(this.project, "epic-home")
    const repo = join(this.project, "epic-repo")
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
    const epic = (...args: string[]) => this.exec("npx", command(...args), { cwd: repo, env })
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
      epic("add", "hello#I", "A scratch issue")
      const saved = await answerOf(`${base}/epics/hello/hello.plan.html`)
      if (!saved.includes("A scratch issue")) throw new Error("an item added didn't reach its epic page")
      const log = readFileSync(join(home, ".spell-epic", "server.log"), "utf8")
      const failed = /route module \S+ failed to load[^\n]*/.exec(log)?.[0]
      if (failed) throw new Error(failed)
      return `port ${port}:  an epic page, ${page.length} bytes;  the epics pack, ${pack.length} bytes;  an item saved`
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
    const page = join(this.project, "page")
    mkdirSync(page, { recursive: true })
    writeFileSync(join(page, "index.html"), PAGE_HTML)
    writeFileSync(join(page, "main.js"), PAGE_SCRIPT)
    this.exec(
      "npx",
      ["--no-install", "vp", "build", "page", "--outDir", "../page-dist", "--emptyOutDir", "--minify", "false"],
      { timeout: 300_000 }
    )
    const built = join(this.project, "page-dist")
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
   * Run `command` in the current project (or `cwd`);  its output.  Throws with its stderr when it fails.
   * - `env`:  added to this process's;  the checkout's own `epic` variables never reach it
   */
  private exec(
    command: string,
    args: string[],
    {
      timeout = 120_000,
      cwd = this.project,
      env = {}
    }: { timeout?: number; cwd?: string; env?: NodeJS.ProcessEnv } = {}
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

/** The one package everything else is built on, and the only one `npx spell@next epic init` installs. */
const SPELL = "spell"

/**
 * The most the lean install may hold, as `du` and npm's own lockfile count it.
 * - TODO:  40 packages and 120 MB once epic `epic-engine`'s Dependency Safety phase replaces json5-writer, which is
 *   about 300 of today's 334 packages.
 */
const LEAN_LIMITS = { packages: 340, megabytes: 150 }

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
