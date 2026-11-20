import { createServer, type Server } from "node:http"
import type { AddressInfo } from "node:net"

import type { Browser } from "playwright"
import { afterAll, beforeAll, describe, expect, test } from "vite-plus/test"

import { BrowserPage } from "spell/element-tools/BrowserPage"

/**
 * `BrowserPage`'s problems:  a file that won't load names itself (epic `epic-engine` I361:  every `<epic-code>` on an
 * older worktree's details page logged a bare "404 (Not Found)", and nobody could find which file it was).
 */

const PAGE = `<!doctype html><html><body><p>hi</p><script src="/lazy/code-engine.js"></script></body></html>`

let server: Server
let base: string
let browser: Browser

beforeAll(async () => {
  server = createServer((request, response) => {
    if (request.url === "/") response.writeHead(200, { "content-type": "text/html" }).end(PAGE)
    else response.writeHead(404).end()
  })
  await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve))
  base = `http://127.0.0.1:${(server.address() as AddressInfo).port}`
  browser = await BrowserPage.launch()
})
afterAll(async () => {
  await browser?.close()
  server?.close()
})

describe("watch()", () => {
  test("a file that 404s is named in its problem", async () => {
    const problems: string[] = []
    const page = await BrowserPage.open(browser, `${base}/`, {
      onProblem: (text) => problems.push(text),
      settle: { quiet: 300, timeout: 1000 }
    })
    await page.close()
    expect(problems).toEqual([
      `Failed to load resource: the server responded with a status of 404 (Not Found):  ${base}/lazy/code-engine.js`
    ])
  })
})

describe("withFileUrl()", () => {
  test("adds the URL to the browser's couldn't-load line only", () => {
    const failed = "Failed to load resource: the server responded with a status of 404 (Not Found)"
    expect(BrowserPage.withFileUrl(failed, "http://x/a.js")).toBe(`${failed}:  http://x/a.js`)
    expect(BrowserPage.withFileUrl(failed, "")).toBe(failed)
    expect(BrowserPage.withFileUrl("TypeError: x is undefined", "http://x/a.js")).toBe("TypeError: x is undefined")
  })
})
