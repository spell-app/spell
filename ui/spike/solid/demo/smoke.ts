/**
 * Drives the framework smoke pages, the perf page, the translation page and the examples page in headless
 * chromium, against the spike's Vite dev server;  prints one JSON report.
 * - Run:  `yarn smoke` (`node --experimental-strip-types demo/smoke.ts`).  Needs network (esm.sh / unpkg).
 * - Per framework page:  the dropdown shows the host's `value`;  a user pick round-trips through `ui-change`
 *   into host state and back;  the host sets a new value;  the host opens the menu;  console warnings recorded.
 */

import { chromium, type Page } from "playwright"
import { createServer } from "vite"
import { fileURLToPath } from "node:url"

const ROOT = fileURLToPath(new URL("..", import.meta.url))
let server = await createServer({ root: ROOT, configFile: `${ROOT}/vite.config.ts`, server: { port: 5199 } })
await server.listen()
const base = "http://localhost:5199/demo"
const browser = await chromium.launch()
const report: Record<string, unknown> = {}

try {
  for (const name of ["vanilla", "react", "vue", "solid"]) report[name] = await framework(name)
  report.perfDev = await perf()
  report.translate = await translate()
  report.examples = await examples()
  // again with Solid's production runtime:  a fresh server, since the plugin reads the flag at config time
  await server.close()
  process.env.SPIKE_SOLID_PROD = "1"
  server = await createServer({ root: ROOT, configFile: `${ROOT}/vite.config.ts`, server: { port: 5199 } })
  await server.listen()
  report.perfProd = await perf()
} finally {
  await browser.close()
  await server.close()
}
console.log(JSON.stringify(report, null, 2))

/** One framework page:  the round trip, as a list of checks. */
async function framework(name: string) {
  const page = await browser.newPage()
  const errors: string[] = []
  page.on("pageerror", (error) => errors.push(error.message))
  await page.goto(`${base}/frameworks/${name}.html`)
  const text = page.locator("ui-dropdown [part~=text]")
  const checks: Record<string, unknown> = {}
  try {
    await text.filter({ hasText: "Banana" }).waitFor({ timeout: 20_000 })
    checks.initialValue = await text.textContent()
    await page.locator("ui-dropdown [role=combobox]").click()
    await page.locator("ui-dropdown [role=option]", { hasText: "Apple" }).click()
    await page.locator("#value").filter({ hasText: "apple" }).waitFor({ timeout: 5_000 })
    checks.afterPick = { host: await page.locator("#value").textContent(), element: await text.textContent() }
    await page.locator("#set").click()
    await text.filter({ hasText: "Cherry" }).waitFor({ timeout: 5_000 })
    checks.afterHostSet = await text.textContent()
    await page.locator("#open").click()
    await page.waitForTimeout(200)
    checks.openedByHost = await page
      .locator("ui-dropdown [role=listbox]")
      .evaluate((menu) => menu.matches(":popover-open"))
    checks.optionsIsProperty = await page.locator("ui-dropdown").evaluate((element) => !element.hasAttribute("options"))
    if (name === "solid") {
      checks.hostContext = await page.locator("#theme").textContent()
      await page.keyboard.press("Escape")
      await page.locator("#unmount").click()
      await page.waitForTimeout(200)
      checks.unmounted = (await page.locator("ui-dropdown").count()) === 0
      checks.overlaysAfterUnmount = await page.evaluate(
        () =>
          (globalThis as unknown as Record<symbol, { overlays: { entries: unknown[] } }>)[
            Symbol.for("@spell/ui:runtime")
          ]!.overlays.entries.length
      )
    }
    checks.ok = true
  } catch (error) {
    checks.ok = false
    checks.failure = (error as Error).message.split("\n")[0]
  }
  checks.console = await messages(page)
  checks.pageErrors = errors
  await page.close()
  return checks
}

/** The perf page's result. */
async function perf() {
  const page = await browser.newPage()
  await page.goto(`${base}/perf.html`)
  await page.waitForFunction(() => "perfResult" in window, null, { timeout: 60_000 })
  const result = await page.evaluate(() => (window as unknown as { perfResult: unknown }).perfResult)
  await page.close()
  return result
}

/** The translation page:  classes of the Spanish button, and one `ie-cambio`. */
async function translate() {
  const page = await browser.newPage()
  await page.goto(`${base}/translate.html`)
  const button = page.locator("ie-boton[color=rojo] [part~=button]")
  await button.waitFor()
  const classes = await button.getAttribute("class")
  await page.locator("ie-desplegable [role=combobox]").click()
  await page.locator("ie-desplegable [role=option]", { hasText: "Otro" }).click()
  const log = await page.locator("#log").textContent()
  await page.close()
  return { classes, log }
}

/** The examples page renders every pair without errors. */
async function examples() {
  const page = await browser.newPage()
  const errors: string[] = []
  page.on("pageerror", (error) => errors.push(error.message))
  page.on("console", (message) => message.type() === "error" && errors.push(message.text()))
  await page.goto(`${base}/index.html`)
  await page.locator(".pair").first().waitFor()
  await page.waitForTimeout(1500)
  const pairs = await page.locator(".pair").count()
  const elements = await page.locator("ui-button, ui-dropdown").count()
  await page.close()
  return { pairs, elements, errors }
}

/** Console warnings / errors the page's `smoke.ts` collected. */
async function messages(page: Page) {
  return page.evaluate(() => (window as unknown as { smokeMessages?: string[] }).smokeMessages ?? [])
}
