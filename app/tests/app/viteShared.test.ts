import type { UserConfig } from "vite"
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
    expect(proxy["/api/places"]?.headers).toEqual({ "x-server-token": "t0k3n" })
    for (const [path, options] of Object.entries(proxy)) {
      if (path !== "/api/places") expect(options.headers, path).toBeUndefined()
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
    expect(pageServerProxy({ target: TARGET })["/api/places"]?.headers).toBeUndefined()
  })
})
