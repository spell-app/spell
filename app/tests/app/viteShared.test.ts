import { mkdtempSync, rmSync, utimesSync, writeFileSync } from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import type { ProxyOptions, UserConfig } from "vite"
import { afterEach, describe, expect, test, vi } from "vite-plus/test"

import { pageServerProxy } from "../../app/vite.shared.ts"

/** The page server, as the editor's dev server reaches it. */
const TARGET = "http://127.0.0.1:4747"

describe("vite.config.ts:  the editor's dev server on the house network (epic `atmosphere` P39)", () => {
  /** The config's `server`, read with or without the house site giving the editor an address. */
  async function serverSettings(thisMachineOnly: boolean) {
    vi.resetModules()
    vi.stubEnv("SPELL_EDITOR_THIS_MACHINE_ONLY", thisMachineOnly ? "1" : "")
    const { default: config } = await import("../../app/vite.config.ts")
    return (config as UserConfig).server!
  }

  afterEach(() => void vi.unstubAllEnvs())

  test("it listens on this machine alone, so Caddy is the one way in", async () => {
    expect((await serverSettings(true)).host).toBe("127.0.0.1")
  })

  test("no fixed live-reload address:  vite's page script follows the page, so localhost:3000 keeps working", async () => {
    expect((await serverSettings(true)).hmr).toBeUndefined()
  })

  test("with no site:  as ever", async () => {
    expect((await serverSettings(false)).host).toBe("0.0.0.0")
  })
})

describe("pageServerProxy():  the editor's dev server passing the page server's paths on (epic `language` T68)", () => {
  test("its write token goes on project data folders' requests (`/api/places`), and nowhere else", () => {
    const proxy = pageServerProxy({ target: TARGET, token: "t0k3n" })
    expect(tokenSent(proxy["/api/places"])).toBe("t0k3n")
    for (const [path, options] of Object.entries(proxy)) {
      if (path !== "/api/places") expect(tokenSent(options), path).toBeUndefined()
    }
  })

  // epic `epic-engine` I329:  vite outlives a page server's restart, and the next page server has a new token
  test("with the page server's token file:  the token in it NOW, read again once it changes", () => {
    const folder = mkdtempSync(join(tmpdir(), "vite-token-"))
    const tokenFile = join(folder, ".spell-server.token.json")
    try {
      const places = pageServerProxy({ target: TARGET, token: "started-with", tokenFile })["/api/places"]
      expect(tokenSent(places), "no file yet:  the token it started with").toBe("started-with")
      writeFileSync(tokenFile, JSON.stringify({ pid: 1, token: "first-run" }))
      expect(tokenSent(places)).toBe("first-run")
      writeFileSync(tokenFile, JSON.stringify({ pid: 2, token: "next-run" }))
      // a write in the same millisecond as the last could keep its change time:  move it on
      utimesSync(tokenFile, new Date(), new Date(Date.now() + 1000))
      expect(tokenSent(places)).toBe("next-run")
    } finally {
      rmSync(folder, { recursive: true, force: true })
    }
  })

  test("`/api/places` comes before `/api`:  vite takes the first entry a path starts with", () => {
    const paths = Object.keys(pageServerProxy({ target: TARGET, token: "t0k3n" }))
    expect(paths.indexOf("/api/places")).toBeLessThan(paths.indexOf("/api"))
  })

  test("every path goes to the page server, as its own host;  the live channel's websocket through `/api`", () => {
    const proxy = pageServerProxy({ target: TARGET, token: "t0k3n" })
    expect(Object.keys(proxy)).toEqual([
      "/api/places",
      "/api",
      "/spaces",
      "/element",
      "/components",
      "/epics",
      "/_epic"
    ])
    for (const options of Object.values(proxy)) expect(options).toMatchObject({ target: TARGET, changeOrigin: true })
    expect(proxy["/api"]?.ws).toBe(true)
  })

  test("no token, no header:  the page server then answers 403 there, as before", () => {
    expect(tokenSent(pageServerProxy({ target: TARGET })["/api/places"])).toBeUndefined()
  })
})

/** The token `options`' proxy adds to a request as it sends it on (its `configure()`), or `undefined` for none. */
function tokenSent(options: ProxyOptions | undefined): string | undefined {
  let sent: string | undefined
  const proxy = {
    on: (event: string, handler: (request: { setHeader: (name: string, value: string) => void }) => void) => {
      if (event === "proxyReq") handler({ setHeader: (name, value) => name === "x-server-token" && (sent = value) })
    }
  }
  options?.configure?.(proxy as never, options)
  return sent
}
