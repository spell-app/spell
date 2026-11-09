/**
 * `spell space cloud serve`'s browser bundle (epic `atmosphere` I15):  it never starts on a stale one.
 * And `spell space cloud password` (T64), asked of a running cloud that's stood in for.
 */
import { Readable } from "node:stream"
import { afterEach, describe, expect, test, vi } from "vite-plus/test"

import { CLI } from "spell/cli"
import type { SRV } from "spell/server"
import { browserBundleCurrentOrDie, cloudCommand } from "spell/app/cli/commands/cloudCommand"
import { SpellCloud } from "spell/app/spaces/server/node/routes/SpellCloud"

describe("spell space cloud password (epic `atmosphere` T64)", () => {
  const RECORD = { port: 4949, token: "the-token", pid: 1, started: "now", address: "" }
  const realStdin = Object.getOwnPropertyDescriptor(process, "stdin")!

  /** `spell space cloud password` with `piped` on standard input:  what it asked the running cloud. */
  async function ran(piped: string, answer: object = { person: "ana@spell" }, status = 200) {
    vi.spyOn(SpellCloud, "record").mockReturnValue(RECORD as never)
    vi.spyOn(console, "log").mockImplementation(() => undefined)
    const fetched = vi.fn(async (_url: string, _init: RequestInit) => Response.json(answer, { status }))
    vi.stubGlobal("fetch", fetched)
    Object.defineProperty(process, "stdin", { value: Readable.from([piped]), configurable: true })
    return { fetched, result: cloudCommand("password", "ana@example.com", {}) }
  }

  afterEach(() => {
    Object.defineProperty(process, "stdin", realStdin)
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
  })

  test("reads it from standard input, and hands it to the running cloud with its token, exactly as typed", async () => {
    const { fetched, result } = await ran("  spaced words here  \n")
    await expect(result).resolves.toBe(0)
    const [url, init] = fetched.mock.calls[0]!
    expect(url).toBe("http://127.0.0.1:4949/api/sign-in/password/for")
    expect(new Headers(init.headers).get("x-server-token")).toBe("the-token")
    expect(JSON.parse(init.body as string)).toEqual({ email: "ana@example.com", password: "  spaced words here  " })
  })

  test("nothing piped in:  refused, and nothing asked", async () => {
    const { fetched, result } = await ran("")
    await expect(result).rejects.toThrow(/no password/)
    expect(fetched).not.toHaveBeenCalled()
  })

  test("the cloud's refusal is what it says", async () => {
    const { result } = await ran("short\n", { error: "A password takes at least 8 characters." }, 400)
    await expect(result).rejects.toThrow(/at least 8/)
  })

  test("no cloud running:  says so", async () => {
    vi.spyOn(SpellCloud, "record").mockReturnValue(undefined as never)
    await expect(cloudCommand("password", "ana@example.com", {})).rejects.toThrow(/isn't running/)
  })
})

/** A stand-in for the bundle:  `stale` says why;  `fails`, its build throws. */
function bundleThat({ stale, fails }: { stale?: string; fails?: boolean }) {
  return {
    packageDir: "/kit/app",
    check: () => ({ name: "app-element", output: "app/dist-element", sources: "abc", ...(stale && { stale }) }),
    build: vi.fn(() => {
      if (fails) throw new Error("the build failed")
    })
  } as unknown as SRV.Bundle & { build: ReturnType<typeof vi.fn> }
}

describe("the cloud's browser bundle", () => {
  test("current:  nothing is built", () => {
    const bundle = bundleThat({})
    browserBundleCurrentOrDie(bundle)
    expect(bundle.build).not.toHaveBeenCalled()
  })

  test("stale:  built first", () => {
    const bundle = bundleThat({ stale: "built from older sources" })
    browserBundleCurrentOrDie(bundle)
    expect(bundle.build).toHaveBeenCalledOnce()
  })

  test("a build that fails stops the cloud, saying how to see why", () => {
    const bundle = bundleThat({ stale: "never built", fails: true })
    expect(() => browserBundleCurrentOrDie(bundle)).toThrow(CLI.CliError)
    expect(() => browserBundleCurrentOrDie(bundle)).toThrow(/cd \/kit\/app && yarn build:element/)
  })
})
