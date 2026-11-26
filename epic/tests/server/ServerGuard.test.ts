import { spawnSync } from "node:child_process"
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"
import { afterAll, describe, expect, test } from "vite-plus/test"

import { fakeMainCheckout, fakeWorktree } from "spell/server/test/checkouts"
import { ServerGuard } from "spell/epic/server/ServerGuard"

/** The hook, as the plugin runs it. */
const HOOK = resolve(dirname(fileURLToPath(import.meta.url)), "../../hooks/server-guard.mjs")

/** A main checkout the hub serves, one of its worktrees beside it, its app folder, and a checkout it doesn't serve. */
const TEMP = realpathSync(mkdtempSync(join(tmpdir(), "server-guard-")))
const MAIN = fakeMainCheckout(join(TEMP, "spell"))
const WORKTREE = fakeWorktree(MAIN, join(TEMP, "spell.worktrees", "seo"))
const OTHER = fakeMainCheckout(join(TEMP, "other"))
mkdirSync(join(MAIN, "app", "app"), { recursive: true })
mkdirSync(join(WORKTREE, "app"), { recursive: true })
afterAll(() => rmSync(TEMP, { recursive: true, force: true }))

/** The machine's servers, as `serverProcesses()` would list them:  main's page server, editor and hub;  the worktree's. */
const SERVERS = [
  {
    pid: 101,
    command: `node --import tsx ${MAIN}/src/server/page/cli.ts serve --root ${MAIN} --port 4747`,
    port: 4747
  },
  {
    pid: 102,
    command: `node ${MAIN}/node_modules/vite-plus/bin/vp dev --port 3000 --strictPort`,
    // no port of its own:  its child, Vite, listens
    cwd: `${MAIN}/app/app`
  },
  { pid: 103, command: `node --import tsx ${MAIN}/epic/bin/epic hub serve --port 4848`, port: 4848 },
  {
    pid: 201,
    command: `node --import tsx ${WORKTREE}/src/server/page/cli.ts serve --root ${WORKTREE} --port 52000`,
    port: 52000
  },
  {
    pid: 202,
    command: `node ${WORKTREE}/node_modules/vite-plus/bin/vp dev --port 52001`,
    cwd: `${WORKTREE}/app/app`
  }
]

/** The guard, main the one main checkout, the servers above. */
const guard = new ServerGuard({
  mains: [MAIN],
  servers: () => SERVERS,
  // `vp dev` runs Vite as its child, which holds the port:  `lsof -ti:3000` names the child
  listeners: (port) => (port === 3000 ? [1102] : port === 52001 ? [1202] : []),
  parents: () =>
    new Map([
      [1102, 102],
      [1202, 202],
      [102, 1]
    ])
})

describe("ServerGuard.check():  a table of real commands", () => {
  // [command, folder it runs in, refused (what to run instead) or let through]
  const CASES: [string, string, string | undefined][] = [
    // main's servers asked for by name go through:  in a main checkout, `spell server` asks Spell's keeper itself
    // (epic `epic-engine` P85;  P84 refused these, naming `epic servers`)
    [`cd ${MAIN} && spell server start all`, WORKTREE, undefined],
    ["spell server start", MAIN, undefined],
    ["spell server restart", join(MAIN, "app"), undefined],
    ["yarn server stop", MAIN, undefined],
    [`node ${MAIN}/bin/spell.mjs server start --root ${MAIN}`, WORKTREE, undefined],
    [`epic server start --all`, MAIN, undefined],
    ["FORCE_COLOR=1 nohup spell server start &", MAIN, undefined],
    ["spell keeper start", MAIN, undefined],
    ["epic hub stop", WORKTREE, undefined],
    // 2026-11-23:  sessions killed main's editors by their process numbers
    ["kill 102", WORKTREE, "spell server restart editor"],
    ["kill -9 101 202", WORKTREE, "spell server restart page-server"],
    ["lsof -ti:3000 | xargs kill -9", WORKTREE, "spell server restart editor"],
    ["kill $(lsof -ti tcp:4747)", WORKTREE, "spell server restart page-server"],
    ["kill 1102", WORKTREE, "spell server restart editor"],
    ["pkill -f vite", WORKTREE, "spell server restart editor"],
    ["(sleep 1; kill 103)", WORKTREE, "epic hub stop"],
    // the editor started by hand from main's app folder
    [`cd ${MAIN}/app && yarn start:dev`, WORKTREE, "spell server start editor"],
    [`cd ${MAIN}/app/app && vp dev`, WORKTREE, "spell server start editor"],
    [`cd ${MAIN}/app/app && npx vite`, WORKTREE, "spell server start editor"],
    [`yarn --cwd ${MAIN}/app start:dev`, WORKTREE, "spell server start editor"],
    ["spell app serve --headless", MAIN, "spell server start editor"],
    // a worktree's own servers are its session's
    ["spell server start", WORKTREE, undefined],
    ["spell server restart all", join(WORKTREE, "app"), undefined],
    ["kill 201 202", WORKTREE, undefined],
    [`cd ${WORKTREE}/app && yarn start:dev`, MAIN, undefined],
    ["lsof -ti:52001 | xargs kill", MAIN, undefined],
    // reading is left alone, and so is the way to ask
    ["ps -axo pid,command | grep vite", MAIN, undefined],
    ["lsof -nP -iTCP:3000 -sTCP:LISTEN", MAIN, undefined],
    ["curl -s http://127.0.0.1:4747/api/server", MAIN, undefined],
    ["spell server status", MAIN, undefined],
    ["epic servers restart editor", MAIN, undefined],
    ['echo "vp dev && kill 102"', MAIN, undefined],
    // a checkout nobody keeps is no main's
    ["vp dev", OTHER, undefined],
    ["kill 4242", MAIN, undefined]
  ]
  test.each(CASES)("%s  (in %s)", (command, cwd, instead) => {
    const refused = guard.check(command, cwd)
    if (instead === undefined) expect(refused).toBeUndefined()
    else expect(refused?.instead).toContain(instead)
  })

  test("the message says what was refused, why, and what to run instead", () => {
    const refused = guard.check(`cd ${MAIN}/app/app && vp dev`, WORKTREE)!
    expect(refused.command).toBe("vp dev")
    const message = ServerGuard.message(refused)
    expect(message).toMatch(/^Refused:  vp dev\nWhy:  .*main's editor by hand/)
    expect(message).toContain("Run instead:  spell server start editor")
  })

  test("hands off:  everything goes through", () => {
    const off = new ServerGuard({ mains: [MAIN], isHandsOff: true, servers: () => SERVERS })
    expect(off.check("kill 102", WORKTREE)).toBeUndefined()
  })

  test("the servers are asked only when a kill is there to judge", () => {
    let asked = 0
    const counting = new ServerGuard({ mains: [MAIN], servers: () => (asked++, SERVERS) })
    counting.check("spell server start", MAIN)
    counting.check("yarn start:dev", join(MAIN, "app"))
    counting.check("epic hub stop", MAIN)
    expect(asked).toBe(0)
    counting.check("kill 102; kill 101", WORKTREE)
    expect(asked).toBe(1)
  })
})

describe("the hook, server-guard.mjs", () => {
  // main's checkouts from Spell's keeper's list (`~/.spell/keeper.json5`), the epic hub's list empty
  const home = join(TEMP, "epic-home")
  const keeperHome = join(TEMP, "keeper-home")
  mkdirSync(home, { recursive: true })
  mkdirSync(keeperHome, { recursive: true })
  writeFileSync(join(home, "repos.json5"), JSON.stringify({ repos: [] }))
  writeFileSync(join(keeperHome, "keeper.json5"), JSON.stringify({ checkouts: [{ name: "spell", checkout: MAIN }] }))

  /** the hook run on a Bash call of `command` in `cwd`:  its exit code and what it printed */
  const runHook = (command: string, cwd: string) => {
    const ran = spawnSync(process.execPath, [HOOK], {
      input: JSON.stringify({ tool_name: "Bash", tool_input: { command }, cwd }),
      env: { ...process.env, SPELL_EPIC_HOME: home, SPELL_KEEPER_HOME: keeperHome },
      encoding: "utf8"
    })
    return { status: ran.status, out: ran.stdout.trim() ? JSON.parse(ran.stdout) : undefined }
  }

  test("refuses main's editor started by hand, saying what to run instead", () => {
    const { status, out } = runHook("vp dev", join(MAIN, "app", "app"))
    expect(status).toBe(0)
    expect(out.hookSpecificOutput).toMatchObject({ hookEventName: "PreToolUse", permissionDecision: "deny" })
    expect(out.hookSpecificOutput.permissionDecisionReason).toContain("spell server start editor")
  })

  test("lets spell server in main, a worktree's own start, and anything without a server word, through", () => {
    expect(runHook("spell server restart", MAIN)).toEqual({ status: 0, out: undefined })
    expect(runHook("vp dev", join(WORKTREE, "app"))).toEqual({ status: 0, out: undefined })
    expect(runHook("git status", MAIN)).toEqual({ status: 0, out: undefined })
  })

  test("hands off:  let through, with one line saying so", () => {
    writeFileSync(join(keeperHome, "server-keeper-holds.json"), JSON.stringify({ held: [], handsOff: true }))
    try {
      const { status, out } = runHook("vp dev", join(MAIN, "app", "app"))
      expect(status).toBe(0)
      expect(out.hookSpecificOutput.permissionDecision).toBeUndefined()
      expect(out.hookSpecificOutput.additionalContext).toMatch(/^Hands off is on/)
    } finally {
      rmSync(join(keeperHome, "server-keeper-holds.json"))
    }
  })

  test("fails open:  input it can't read exits 0, printing nothing", () => {
    const ran = spawnSync(process.execPath, [HOOK], { input: "not json", encoding: "utf8" })
    expect(ran.status).toBe(0)
    expect(ran.stdout).toBe("")
  })
})
