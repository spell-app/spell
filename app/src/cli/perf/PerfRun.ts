import { execFileSync, spawnSync } from "node:child_process"
import { existsSync, readFileSync } from "node:fs"
import { join } from "node:path"

import { CliError } from "spell/cli"
import type { PerfPageName, PerfProfileName, PerfRecord, PerfRunOptions, PerfServers } from "./perf.types"
import { PerfMachine } from "./PerfMachine"
import { PerfBuilds } from "./PerfBuilds"
import { PerfResults } from "./PerfResults"
import { LoadMeasure } from "./LoadMeasure"
import { LeaksMeasure } from "./LeaksMeasure"
import { HugeListsMeasure } from "./HugeListsMeasure"
import { TypingMeasure } from "./TypingMeasure"
import { A11yMeasure } from "./A11yMeasure"
import { ListenersMeasure } from "./ListenersMeasure"
import { SheetsMeasure } from "./SheetsMeasure"
import { CpuMeasure } from "./CpuMeasure"

/****************
 * ### `PerfRun`
 * One `spell perf run`:  the pages measured in headless Chromium, on a desktop and an emulated phone, and the
 * results kept and compared (epic `solid-2-final` P1).
 * - It waits for a quiet machine first (`PerfMachine`):  still busy after `waitMinutes`, it runs anyway, marked busy.
 * - The editor and run mode:  a production build of the editor made into a temporary folder and served, its page
 *   server paths passed on to the running page server (`PerfBuilds`);  the CPU profile gets an unminified one.
 *   Nothing in the checkout changes:  the editor's writes are refused while it's measured.
 * - The docs and epic pages:  the page server's, which must be running (`spell server start`).
 * - Each step its own class (`LoadMeasure` ...);  `pipeline` runs `spell speedtest --pipeline`.
 * - Writes ONE dated file in the kit's `.perf-results/` (`PerfResults`):  the numbers, the machine before and after,
 *   the commit, Chrome's version, what was asked;  `--baseline save` makes it the baseline too.
 * - A step that fails is named in `failures`, and the rest go on.
 ****************/
export class PerfRun {
  /** the kit's root */
  readonly kitRoot: string

  /** what's measured */
  readonly options: PerfRunOptions

  /** where progress lines go */
  readonly say: (line: string) => void

  /** the machine's load, as the run goes */
  readonly machine = new PerfMachine()

  /** the steps that failed, named */
  readonly failures: string[] = []

  constructor(kitRoot: string, options: PerfRunOptions, say: (line: string) => void) {
    this.kitRoot = kitRoot
    this.options = options
    this.say = say
  }

  /**
   * Measure, write the dated file, and say how it compares;  resolves to the record and its file.
   * - throws `CliError` when the page server isn't running
   */
  async run(): Promise<{ record: PerfRecord; file: string }> {
    const { options } = this
    const pagePort = this.pageServerPort()
    if (!options.force) await this.machine.waitForQuiet(options.waitMinutes, this.say)
    const before = this.machine.state
    const busyAtStart = this.machine.isBusy
    if (busyAtStart) this.say(`BUSY MACHINE:  1-minute load ${before.load[0]}:  times will be noisy`)
    const started = new Date()
    const builds = new PerfBuilds(join(this.kitRoot, "app", "app"), { https: options.https })
    const data: PerfRecord["data"] = {}
    let chromeVersion = ""
    try {
      const servers = await this.servers(builds, pagePort)
      chromeVersion = await this.chromeVersion()
      await this.measure(servers, builds, pagePort, data)
    } finally {
      await builds.dispose()
    }
    const busy = busyAtStart || this.machine.wasBusy
    const record: PerfRecord = {
      when: started.toISOString(),
      busyMachine: busy,
      ...(busy && {
        warning:
          `BUSY MACHINE:  the 1-minute load reached ${Math.max(...this.machine.loadsSeen)} ` +
          `(over ${this.machine.busyLoad}):  times are noisy, bytes, heap and counts are not`
      }),
      machine: {
        before,
        after: this.machine.state,
        loadsSeen: this.machine.loadsSeen,
        waitedSeconds: this.machine.waitedSeconds,
        ...this.machine.description
      },
      gitSha: this.git("rev-parse", "HEAD"),
      gitBranch: this.git("rev-parse", "--abbrev-ref", "HEAD"),
      chromeVersion,
      options,
      failures: this.failures,
      numbers: PerfResults.numbersOf(data),
      data
    }
    const results = new PerfResults(this.kitRoot)
    const file = results.write(record, options.out)
    // a number this run didn't measure (a quick run's pipeline) keeps the baseline's
    const { baseline } = PerfResults
    const numbers = { ...baseline.saved?.numbers, ...record.numbers }
    if (options.baseline === "save") baseline.save({ numbers, when: record.when }, record.gitSha)
    return { record, file }
  }

  /**
   * Every step asked for, over every page and profile asked for.
   * - the editor at phone width shows no code pane:  its phone loads run at `phonewide` too, and typing, leaks and
   *   the CPU profile take `phonewide` for the phone
   */
  private async measure(
    servers: { editor: PerfServers },
    builds: PerfBuilds,
    pagePort: number,
    data: PerfRecord["data"]
  ): Promise<void> {
    const { pages, profiles, steps, runs } = this.options
    const firstProfile: PerfProfileName = profiles.includes("desktop") ? "desktop" : "phone"
    const forEditor = (profile: PerfProfileName): PerfProfileName => (profile === "phone" ? "phonewide" : profile)
    const step = async (name: string, key: string, work: () => Promise<unknown>) => {
      this.say(`\n== ${name} ${key}   (load ${this.machine.load})`)
      try {
        ;(data[name] ??= {})[key] = await work()
      } catch (error) {
        this.failures.push(`${name} ${key}:  ${String(error).split("\n")[0]}`)
        this.say(`  FAILED:  ${String(error).split("\n")[0]}`)
      }
    }
    const on = servers.editor
    if (steps.includes("load")) {
      for (const page of pages) {
        for (const profile of profiles) {
          const targets: PerfProfileName[] =
            page === "editor" && profile === "phone" ? ["phone", "phonewide"] : [profile]
          for (const target of targets)
            await step("load", `${page}/${target}`, () => LoadMeasure.measure(page, target, on, runs, this.say))
        }
      }
    }
    if (steps.includes("leaks")) {
      for (const page of pages.filter((each) => each !== "run")) {
        const profile = page === "editor" ? forEditor(firstProfile) : firstProfile
        await step("leaks", `${page}/${profile}`, () => LeaksMeasure.measure(page, profile, on))
      }
    }
    // huge lists are put on the docs page, which defines both:  on the phone when it's asked for
    if (steps.includes("lists") && pages.includes("docs")) {
      const profile: PerfProfileName = profiles.includes("phone") ? "phone" : firstProfile
      await step("lists", `docs/${profile}`, () => HugeListsMeasure.measure("docs", profile, on))
    }
    if (steps.includes("typing") && pages.includes("editor")) {
      for (const profile of [...new Set(profiles.map(forEditor))])
        await step("typing", profile, () => TypingMeasure.measure(profile, on))
    }
    for (const page of steps.includes("a11y") ? pages : [])
      await step("a11y", page, () => A11yMeasure.measure(page, firstProfile, on))
    if (steps.includes("listeners") && pages.includes("editor"))
      await step("listeners", "editor", () => ListenersMeasure.measure("editor", firstProfile, on))
    for (const page of steps.includes("sheets") ? pages.filter((each) => each === "editor" || each === "docs") : [])
      await step("sheets", page, () => SheetsMeasure.measure(page as PerfPageName, firstProfile, on))
    if (steps.includes("cpu") && pages.includes("editor")) {
      const profile: PerfProfileName = profiles.includes("phone") ? "phonewide" : "desktop"
      await step("cpu", profile, async () => {
        const unminified = {
          ...on,
          editor: await builds.serve(builds.build("editor-unminified"), pagePort)
        }
        return CpuMeasure.measure(profile, unminified)
      })
    }
    if (steps.includes("pipeline")) await step("pipeline", "Solitaire", async () => this.pipeline())
  }

  /** The editor build served, when a page asked for needs it;  else only the page server. */
  private async servers(builds: PerfBuilds, pagePort: number): Promise<{ editor: PerfServers }> {
    const pageServer = `http://127.0.0.1:${pagePort}`
    const needsEditor = this.options.pages.some((page) => page === "editor" || page === "run")
    if (!needsEditor) return { editor: { editor: "", pageServer } }
    this.say("Building the editor into a temporary folder ...")
    const editor = await builds.serve(builds.build("editor"), pagePort)
    const trustedKey = builds.trustedKey
    return { editor: { editor, pageServer, ...(trustedKey && { trustedKey }) } }
  }

  /** The speed test's editing pipeline, `spell speedtest --pipeline --json`:  its medians. */
  private pipeline(): { median: Record<string, number> } {
    const result = spawnSync(
      process.execPath,
      [join(this.kitRoot, "bin", "spell.mjs"), "speedtest", "--pipeline", "--json", "--runs", "1"],
      { cwd: this.kitRoot, encoding: "utf8" }
    )
    const last = result.stdout.trim().split("\n").at(-1) ?? ""
    if (result.status !== 0 || !last.startsWith("{")) {
      throw new Error(`spell speedtest --pipeline failed:  ${result.stderr.trim().split("\n").slice(-2).join(" ")}`)
    }
    return { median: JSON.parse(last) as Record<string, number> }
  }

  /** The kit's page server's port, from its `.spell-server.json`;  throws `CliError` when it isn't running. */
  private pageServerPort(): number {
    const file = join(this.kitRoot, ".spell-server.json")
    if (!existsSync(file))
      throw new CliError("spell perf run measures pages the page server serves:  start it first, spell server start")
    return (JSON.parse(readFileSync(file, "utf8")) as { port: number }).port
  }

  /** Chromium's version, for the record. */
  private async chromeVersion(): Promise<string> {
    const { BrowserPage } = await import("spell/element-tools/BrowserPage")
    return BrowserPage.with(async (browser) => browser.version())
  }

  /** git's answer, in the kit. */
  private git(...args: string[]): string {
    return execFileSync("git", args, { cwd: this.kitRoot, encoding: "utf8" }).trim()
  }
}
