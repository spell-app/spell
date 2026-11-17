/**
 * spell-epic's `spell` commands:  `spell voice check`, a second name for `epic voice check` (epic `epic-engine` J256).
 * - Runs the REAL `spell` (the kit's bin), so it proves the kit finds this folder's command list and the command runs.
 * - The reader is a stand-in `claude` first on the `PATH`, never a model:  it answers a fixed verdict, and keeps what
 *   it was asked, so the test sees the same `VoiceCheck` ran.
 */
import { spawnSync } from "node:child_process"
import { chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs"
import { createRequire } from "node:module"
import { tmpdir } from "node:os"
import { delimiter, dirname, join } from "node:path"

import { afterAll, expect, test } from "vite-plus/test"

import { EXIT } from "spell/epic/command/command.types"

/** The kit `spell` runs from:  this checkout's. */
const KIT = dirname(createRequire(import.meta.url).resolve("spell/package.json"))

const folder = mkdtempSync(join(tmpdir(), "spell-voice-"))
afterAll(() => rmSync(folder, { recursive: true, force: true }))

/** Where the stand-in reader writes the command line it was given. */
const ASKED = join(folder, "asked.json")

/** The stand-in `claude`:  keeps its arguments and stdin, answers a failing verdict as `claude -p` would. */
const READER = `#!/usr/bin/env node
const { readFileSync, writeFileSync } = require("node:fs")
writeFileSync(${JSON.stringify(ASKED)}, JSON.stringify({ args: process.argv.slice(2), text: readFileSync(0, "utf8") }))
process.stdout.write(JSON.stringify({ structured_output: {
  comprehensible: false, concise: true, clear: false, agentSpeak: true, summary: "Insider words.",
  problems: [{ quote: "synced", why: "Nobody new knows it.", rewrite: "saved" }], pass: false
} }))
`
writeFileSync(join(folder, "claude"), READER)
chmodSync(join(folder, "claude"), 0o755)

test("spell voice check runs epic voice check's VoiceCheck, flags and all", () => {
  const run = spawnSync(
    process.execPath,
    [join(KIT, "bin", "spell.mjs"), "voice", "check", "--text", "Your draft is synced.", "--model", "haiku", "--json"],
    {
      cwd: KIT,
      encoding: "utf8",
      env: { ...process.env, PATH: `${folder}${delimiter}${process.env.PATH ?? ""}` }
    }
  )
  expect(run.stderr).toBe("")
  expect(run.status).toBe(EXIT.ERRORS)
  expect(JSON.parse(run.stdout)).toMatchObject({ voice: "novice", model: "haiku", pass: false, agentSpeak: true })
  const asked = JSON.parse(readFileSync(ASKED, "utf8")) as { args: string[]; text: string }
  expect(asked.text).toBe("Your draft is synced.")
  expect(asked.args).toEqual(expect.arrayContaining(["-p", "--model", "haiku", "--no-session-persistence"]))
})

test("a voice the repo hasn't got:  the same usage error, exit 2", () => {
  const run = spawnSync(
    process.execPath,
    [join(KIT, "bin", "spell.mjs"), "voice", "check", "--voice", "nope", "--text", "hi"],
    {
      cwd: KIT,
      encoding: "utf8"
    }
  )
  expect(run.status).toBe(EXIT.USAGE)
  expect(run.stderr).toContain("no such voice here")
})
