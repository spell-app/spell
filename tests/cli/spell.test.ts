import { spawnSync } from "node:child_process"
import { mkdirSync, mkdtempSync, realpathSync, rmSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join, resolve } from "node:path"
import { pathToFileURL } from "node:url"
import { afterAll, beforeAll, describe, expect, test, vi } from "vite-plus/test"

/**
 * The kit's `spell`, end to end:  `bin/spell.mjs` run as a separate process, as a person would.
 * - Every installed repo's commands load, so `spell help` here lists theirs too;  their own tests are theirs.
 */
const SPELL = resolve(import.meta.dirname, "../../bin/spell.mjs")

/** The kit's root. */
const KIT = resolve(import.meta.dirname, "../..")

/** The settings the bin hands `tsx`. */
const TSX_SETTINGS = join(KIT, "tsconfig.tsx.json")

// each run starts node and `tsx`;  slower under the load of every test file at once
vi.setConfig({ testTimeout: 30_000 })

/** Run `spell ...args` from `cwd`. */
function spell(args: string[], cwd = process.cwd()) {
  const { status, stdout, stderr } = spawnSync(process.execPath, [SPELL, ...args], { cwd, encoding: "utf8" })
  return { status, stdout, stderr }
}

describe("spell help", () => {
  test("the kit's commands, under its name", () => {
    const { status, stdout } = spell(["help"])
    expect(status).toBe(0)
    expect(stdout).toMatch(/^Usage: spell \[options\] \[command\]\n/)
    expect(stdout).toMatch(/^spell-kit:$/m)
    for (const command of ["server", "bundle", "commands", "wwod", "pony", "help"]) {
      expect(stdout).toMatch(new RegExp(`^ {2}${command} `, "m"))
    }
  })

  test("one command, and a sub-command, by its path", () => {
    expect(spell(["help", "server"]).stdout).toMatch(/^Usage: spell server \[options\] \[command\]\n/)
    expect(spell(["help", "server", "stop"]).stdout).toMatch(/^Usage: spell server stop \[options\] \[which\]\n/)
  })

  test("an unknown command", () => {
    const { status, stderr } = spell(["help", "nope"])
    expect(status).toBe(2)
    expect(stderr).toContain("No command 'nope'")
  })

  test("spell dev is gone (epic repo-split P13)", () => {
    const { status, stderr } = spell(["dev", "server", "status"])
    expect(status).not.toBe(0)
    expect(stderr).toContain("unknown command 'dev'")
  })
})

describe("spell pony", () => {
  test("says what it's told", () => {
    const { status, stdout } = spell(["pony", "hello", "there"])
    expect(status).toBe(0)
    expect(stdout).toContain(" < hello there >")
  })
})

describe("the settings `tsx` runs `spell` under:  tsconfig.tsx.json, as the bin registers it", () => {
  test("a child repo's JSX compiles for the automatic runtime, no `React` in scope (epic repo-split I69)", () => {
    // a stand-in child repo, inside the kit, with a fake `react/jsx-runtime`:  the kit installs no React
    const repo = mkdtempSync(join(import.meta.dirname, "tsx-settings-"))
    try {
      mkdirSync(join(repo, "node_modules", "react"), { recursive: true })
      writeFileSync(join(repo, "node_modules", "react", "package.json"), `{ "name": "react", "type": "module" }`)
      writeFileSync(
        join(repo, "node_modules", "react", "jsx-runtime.js"),
        `export const jsx = (type, props) => ({ type, props })\n`
      )
      writeFileSync(join(repo, "Screen.tsx"), `export const screen = () => <b>hi</b>\n`)
      const probe = [
        `import { register } from "tsx/esm/api"`,
        `register({ tsconfig: ${JSON.stringify(TSX_SETTINGS)} })`,
        `const { screen } = await import(${JSON.stringify(pathToFileURL(join(repo, "Screen.tsx")).href)})`,
        `console.log(JSON.stringify(screen()))`
      ].join("\n")
      const { status, stdout, stderr } = spawnSync(process.execPath, ["--input-type=module", "-e", probe], {
        cwd: KIT,
        encoding: "utf8"
      })
      expect(stderr).not.toContain("React is not defined")
      expect(status).toBe(0)
      expect(JSON.parse(stdout)).toEqual({ type: "b", props: { children: "hi" } })
    } finally {
      rmSync(repo, { recursive: true, force: true })
    }
  })
})

describe("spell server:  the page server's own command line, of the checkout the current folder is in", () => {
  /** A fake kit checkout whose page server command line reports what it got, exiting 3. */
  const temp = realpathSync(mkdtempSync(join(tmpdir(), "spell-server-")))
  const CHECKOUT = join(temp, "checkout")
  /** A folder inside it, to run from:  the tool must still be found. */
  const INSIDE = join(CHECKOUT, "spell-app")
  afterAll(() => rmSync(temp, { recursive: true, force: true }))
  beforeAll(() => {
    mkdirSync(join(CHECKOUT, "src", "server", "page"), { recursive: true })
    mkdirSync(INSIDE, { recursive: true })
    writeFileSync(
      join(CHECKOUT, "src", "server", "page", "cli.ts"),
      `console.log(JSON.stringify({ args: process.argv.slice(2), cwd: process.cwd(), tsconfig: process.env.TSX_TSCONFIG_PATH }))
process.exit(3)
`
    )
    writeFileSync(join(CHECKOUT, "tsconfig.node.json"), "{}")
    writeFileSync(join(CHECKOUT, "package.json"), `{ "type": "module" }`)
  })

  /** Run `spell server ...args` in `INSIDE`:  its exit code, and what the fake tool reported. */
  function server(args: string[]) {
    const { status, stdout, stderr } = spell(["server", ...args], INSIDE)
    return { status, stderr, ...(stdout ? JSON.parse(stdout) : {}) }
  }

  test("each verb, its flags verbatim, under tsx with the kit's node settings, in THIS folder", () => {
    const status = server(["status", "--root", "."])
    expect(status).toMatchObject({ status: 3, args: ["status", "--root", "."] })
    expect(status.tsconfig).toBe(join(CHECKOUT, "tsconfig.node.json"))
    expect(realpathSync(status.cwd)).toBe(INSIDE)
    expect(server(["start"])).toMatchObject({ args: ["start"] })
    expect(server(["local", "--port", "4800"])).toMatchObject({ args: ["local", "--port", "4800"] })
    expect(server(["url", "a.html"])).toMatchObject({ args: ["url", "a.html"] })
    expect(server(["prune", "--dry-run"])).toMatchObject({ args: ["prune", "--dry-run"] })
  })

  // the command line finds the kit itself (`pageServerRoot()`, epic `repo-split` P16):  no `--root` added (I62's)
  test("inside a kit:  its arguments verbatim, from any folder", () => {
    const kit = join(temp, "kit")
    const app = join(kit, "app")
    mkdirSync(join(kit, "src", "server", "page"), { recursive: true })
    mkdirSync(join(kit, "lower", ".git"), { recursive: true })
    mkdirSync(join(app, ".git"), { recursive: true })
    mkdirSync(join(kit, ".git"), { recursive: true })
    writeFileSync(
      join(kit, "src", "server", "page", "cli.ts"),
      `console.log(JSON.stringify({ args: process.argv.slice(2) }))\n`
    )
    writeFileSync(join(kit, "tsconfig.node.json"), "{}")
    writeFileSync(join(kit, "package.json"), `{ "type": "module" }`)
    writeFileSync(join(kit, "repos.json5"), `{ repos: [{ name: "lower" }, { name: "app" }] }`)
    writeFileSync(join(kit, "lower", "package.json"), `{ "name": "lower", "spell": {} }`)
    writeFileSync(join(app, "package.json"), `{ "name": "app", "spell": {}, "pageServer": {} }`)
    const run = (args: string[], cwd: string) =>
      JSON.parse(spell(["server", ...args], cwd).stdout) as { args: string[] }
    expect(run(["status"], kit).args).toEqual(["status"])
    expect(run(["start"], join(kit, "lower")).args).toEqual(["start"])
    expect(run(["status"], app).args).toEqual(["status"])
    expect(run(["status", "--root", "."], kit).args).toEqual(["status", "--root", "."])
  })

  test("stop, and stop local:  the page server's stop;  another word is a usage error", () => {
    expect(server(["stop"])).toMatchObject({ args: ["stop"] })
    expect(server(["stop", "local"])).toMatchObject({ args: ["stop"] })
    const bogus = spell(["server", "stop", "bogus"], INSIDE)
    expect(bogus.status).toBe(2)
    expect(bogus.stderr).toContain("local (default) or all")
  })
})
