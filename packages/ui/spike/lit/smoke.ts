/// <reference types="node" />

/**
 * Scripted run of the demo pages in real chromium:  framework smoke pages, the translation page, the
 * duplicate-Lit page and the perf page.  `yarn smoke` (needs network for esm.sh / unpkg).
 * - Starts the spike's Vite dev server, visits each page, waits for `#result` (or `window.perfResult`),
 *   prints everything and writes `smoke-results.json`.
 */

import { writeFileSync } from "node:fs"
import { chromium } from "playwright"
import { createServer } from "vite"

/** Pages whose `#result` says PASS / FAIL. */
const PAGES = [
  "demo/frameworks/vanilla.html",
  "demo/frameworks/react.html",
  "demo/frameworks/vue.html",
  "demo/frameworks/solid.html",
  "demo/frameworks/duplicate-lit.html",
  "demo/translate.html"
]

const server = await createServer({ configFile: "vite.config.ts", server: { port: 5199, strictPort: true } })
await server.listen()
const browser = await chromium.launch()
const results: Record<string, unknown> = {}
try {
  for (const path of PAGES) {
    const page = await browser.newPage()
    const errors: string[] = []
    page.on("pageerror", (error) => errors.push(error.message))
    page.on("console", (message) => {
      if (message.type() === "error") errors.push(message.text())
    })
    await page.goto(`http://localhost:5199/${path}`)
    const text = await page
      .waitForFunction(() => !document.querySelector("#result")?.textContent?.startsWith("checking"), null, {
        timeout: 30_000
      })
      .then(() => page.textContent("#result"))
      .catch((error: Error) => `FAIL timeout ${error.message.split("\n")[0]}`)
    results[path] = { result: text, errors }
    console.log(path, "=>", text, errors.length ? errors : "")
    await page.close()
  }
  const page = await browser.newPage()
  await page.goto("http://localhost:5199/demo/perf.html")
  await page.waitForFunction(() => "perfResult" in window, null, { timeout: 30_000 })
  results["demo/perf.html"] = await page.evaluate(() => (window as unknown as { perfResult: unknown }).perfResult)
  console.log("demo/perf.html =>", JSON.stringify(results["demo/perf.html"]))
} finally {
  await browser.close()
  await server.close()
}
writeFileSync("smoke-results.json", JSON.stringify(results, null, 2))
