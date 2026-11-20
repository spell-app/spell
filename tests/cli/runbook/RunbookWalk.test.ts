/**
 * Tests of `RunbookWalk`, on a fake terminal:  every step kind, carrying on where it stopped, skipping, stopping, a
 * failing command, a walk that's lapsed, and no secret anywhere it shouldn't be.
 * - The terminal is two streams that say they're one;  each question, as it's drawn, gets the next answer.
 * - Commands never run:  the stand-in `run` answers what each was scripted to print.
 */
import { mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { PassThrough } from "node:stream"
import { afterEach, describe, expect, test } from "vite-plus/test"

import { SRV } from "spell/server"
import { Runbook, RunbookProgress, RunbookWalk, type RunbookTools } from "spell/cli/runbook"

/** A token no output, progress file or log may show. */
const TOKEN = "nbt_fake1234.secret5678"

/** Enter, to a pick:  done. */
const ENTER = "\r"

/** The runbook walked:  one step by hand, a secret and a plain value, then two commands. */
const TEXT = [
  "---",
  "title: A try",
  "fresh until: 04:00 UTC",
  "---",
  "## Make an account",
  "",
  "Open [the demo](https://demo.example.com/).",
  "",
  "## Make a token",
  "",
  "```ask TOKEN secret",
  "Paste the token",
  "```",
  "",
  "```ask CITY",
  "Which city?",
  "```",
  "",
  "## Make the place",
  "",
  "```sh",
  "make-place",
  "```",
  "",
  "<details><summary>Output</summary>",
  "",
  "```text",
  "Added ...",
  "```",
  "",
  "</details>",
  "",
  "If not:  start again.",
  "",
  "## Check it",
  "",
  "```sh",
  "check-place",
  "```"
].join("\n")

const folders: string[] = []
afterEach(() => {
  for (const folder of folders.splice(0)) rmSync(folder, { recursive: true, force: true })
})

/** What a stream drew, its colours and cursor moves taken out. */
function plain(drawn: string): string {
  // oxlint-disable-next-line no-control-regex -- the terminal's colour codes and cursor moves
  return drawn.replace(/\x1b\[[0-9;]*[A-Za-z]/g, "")
}

/** A stream that says it's a terminal. */
function terminalStream(): PassThrough & { isTTY: boolean } {
  return Object.assign(new PassThrough(), { isTTY: true })
}

/**
 * A walk's world:  a scratch home, a fake terminal answering `answers` in turn, and commands that print `prints`.
 * - `now`:  the clock, which a test moves
 */
function world() {
  const home = mkdtempSync(join(tmpdir(), "runbook-walk-"))
  folders.push(home)
  const progress = new RunbookProgress({ folder: join(home, "runbooks") })
  const secrets = new SRV.Secrets({ folder: join(home, "secrets"), environment: {} })
  const ran: { commands: string; env: NodeJS.ProcessEnv }[] = []
  const opened: string[] = []
  const state = {
    now: new Date("2026-11-20T10:00:00Z"),
    prints: {} as Record<string, { text: string; status?: number }>
  }
  const tools: RunbookTools = {
    run: async (commands, { env, onOutput }) => {
      ran.push({ commands, env })
      const { text, status = 0 } = state.prints[commands] ?? { text: "" }
      // in two pieces, the token split between them
      onOutput(text.slice(0, 10))
      onOutput(text.slice(10))
      return status
    },
    open: (url) => opened.push(url),
    now: () => state.now
  }
  const runbook = new Runbook(join(home, "a-try.runbook.md"), TEXT)

  /** A walk, answering `answers` one a question. */
  const walk = (answers: string[]) => {
    const input = terminalStream()
    const output = terminalStream()
    let drawn = ""
    output.on("data", (chunk: Buffer) => {
      const text = String(chunk)
      drawn += text
      if (plain(text).startsWith("? ") && answers.length) {
        const answer = answers.shift()!
        setImmediate(() => input.write(answer))
      }
    })
    const walking = new RunbookWalk(runbook, {
      progress,
      secrets,
      tools,
      environment: { HOME: home },
      input,
      output,
      typedAheadMs: 0
    })
    return { walking, drawn: () => plain(drawn) }
  }

  /** Every file the walk wrote, as text. */
  const everythingWritten = () =>
    [progress.folder]
      .flatMap((folder) => readdirSync(folder).map((file) => readFileSync(join(folder, file), "utf8")))
      .join("\n")

  return { home, progress, secrets, ran, opened, state, walk, runbook, everythingWritten }
}

describe("RunbookWalk", () => {
  test("start to finish:  by hand, asks, commands with every value in their environment;  the token never shown", async () => {
    const w = world()
    w.state.prints = {
      "make-place": { text: `Added the place, with ${TOKEN} echoed\n` },
      "check-place": { text: "fine\n" }
    }
    const { walking, drawn } = w.walk(["o", ENTER, `${TOKEN}\r`, "Lima\n"])
    expect(await walking.start()).toBe(0)
    expect(w.opened).toEqual(["https://demo.example.com/"])
    expect(w.ran.map(({ commands }) => commands)).toEqual(["make-place", "check-place"])
    expect(w.ran[0]!.env).toMatchObject({ TOKEN, CITY: "Lima", HOME: w.home })
    expect(drawn()).toContain("Added the place, with [the secret TOKEN] echoed")
    expect(drawn()).toContain("All 4 steps are done.")
    expect(drawn()).not.toContain(TOKEN)
    expect(w.secrets.kept("TOKEN")).toBe(TOKEN)
    expect(w.progress.read("a-try")).toMatchObject({
      steps: { "Make an account": "done", "Make a token": "done", "Make the place": "done", "Check it": "done" },
      values: { CITY: "Lima" }
    })
    expect(w.everythingWritten()).not.toContain(TOKEN)
  })

  test("a skipped step stays skipped;  nothing typed for a value stops there, and the next start carries on", async () => {
    const w = world()
    const stopping = w.walk(["s", "\x04"])
    expect(await stopping.walking.start()).toBe(1)
    expect(stopping.drawn()).toContain("You didn't type anything, so it stopped here.")
    expect(w.progress.read("a-try")).toMatchObject({
      steps: { "Make an account": "skipped" },
      stoppedAt: { step: "Make a token", why: "stopped" }
    })
    w.state.prints = { "make-place": { text: "Added it\n" } }
    const again = w.walk([`${TOKEN}\r`, "Lima\n"])
    expect(await again.walking.start()).toBe(0)
    expect(again.drawn()).toContain('Carrying on from step 2 of 4, "Make a token".')
    expect(w.walk([]).walking.statusLines().join("\n")).toContain("- 1. Make an account  (skipped)")
  })

  test("q stops at a step by hand;  the next start begins there", async () => {
    const w = world()
    const stopped = w.walk(["q"])
    expect(await stopped.walking.start()).toBe(0)
    expect(stopped.drawn()).toContain("Stopped at step 1.  To carry on later, type:  spell runbook start a-try")
    expect(w.progress.read("a-try")?.stoppedAt).toEqual({ step: "Make an account", why: "stopped" })
    w.state.prints = { "make-place": { text: "Added it\n" } }
    const again = w.walk([ENTER, `${TOKEN}\r`, "Lima\n"])
    expect(await again.walking.start()).toBe(0)
    expect(again.drawn()).toContain("4 steps.")
  })

  test("a command that fails:  stops there with its If not;  the next start tries that step again", async () => {
    const w = world()
    w.state.prints = { "make-place": { text: "403: Invalid v2 token\n", status: 1 } }
    const failing = w.walk([ENTER, `${TOKEN}\r`, "Lima\n"])
    expect(await failing.walking.start()).toBe(1)
    expect(failing.drawn()).toContain("That step didn't work:  the command ran into a problem and stopped (status 1).")
    expect(failing.drawn()).toContain("If it didn't work:  start again.")
    expect(w.progress.read("a-try")?.stoppedAt).toEqual({ step: "Make the place", why: "failed" })
    expect(w.walk([]).walking.statusLines().join("\n")).toContain("✗ 3. Make the place  (stopped here")

    w.state.prints = { "make-place": { text: "Added it\n" } }
    const again = w.walk([])
    expect(await again.walking.start()).toBe(0)
    expect(again.drawn()).toContain('Carrying on from step 3 of 4, "Make the place".')
    // the kept token comes back for the commands, with no question
    expect(w.ran.at(-1)!.env.TOKEN).toBe(TOKEN)
  })

  test("output that isn't what its fold says:  a failure, showing what it should print", async () => {
    const w = world()
    w.state.prints = { "make-place": { text: "Something else\n" } }
    const walk = w.walk([ENTER, `${TOKEN}\r`, "Lima\n"])
    expect(await walk.walking.start()).toBe(1)
    expect(walk.drawn()).toContain("That isn't what this step should show.  You should see:\n  Added ...")
  })

  test("past its fresh until:  the walk is forgotten, and starts again from step 1", async () => {
    const w = world()
    expect(await w.walk(["q"]).walking.start()).toBe(0)
    w.state.now = new Date("2026-11-21T05:00:00Z")
    const later = w.walk(["q"])
    expect(await later.walking.start()).toBe(0)
    expect(later.drawn()).toContain(
      "Your progress from last time was cleared at 04:00 UTC, so you start again from step 1."
    )
    expect(w.progress.read("a-try")?.startedAt).toBe("2026-11-21T05:00:00.000Z")
  })

  test("a secret given before:  Enter keeps it", async () => {
    const w = world()
    w.secrets.keep("TOKEN", TOKEN)
    w.state.prints = { "make-place": { text: "Added it\n" } }
    const walk = w.walk([ENTER, "\r", "Lima\n"])
    expect(await walk.walking.start()).toBe(0)
    expect(walk.drawn()).toContain("Press Enter to keep the value you gave last time.")
    expect(w.ran[0]!.env.TOKEN).toBe(TOKEN)
  })

  test("no terminal:  refused, saying why", async () => {
    const w = world()
    const walking = new RunbookWalk(w.runbook, {
      progress: w.progress,
      input: new PassThrough(),
      output: new PassThrough()
    })
    await expect(walking.start()).rejects.toThrow(/This needs a terminal window/)
  })

  test("reset forgets the walk", async () => {
    const w = world()
    await w.walk(["q"]).walking.start()
    expect(w.walk([]).walking.reset()).toBe(true)
    expect(w.walk([]).walking.reset()).toBe(false)
    expect(w.walk([]).walking.statusLines().at(-1)).toBe("Not started yet.")
  })
})
