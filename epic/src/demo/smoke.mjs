// Scratch smoke check (not shipped):  load a page in Chromium, report whether the epics pack defined its tags.
import { BrowserPage } from "spell/element-tools/BrowserPage"

const url = process.argv[2]
const logs = []
await BrowserPage.with(async (browser) => {
  const page = await BrowserPage.open(browser, url, {
    consoleTypes: ["log", "debug", "info", "warning", "error"],
    onProblem: (text, kind) =>
      logs.push(`${kind === "page error" ? "pageerror" : kind.slice("console ".length)}: ${text}`),
    settle: false
  })
  await page.waitForTimeout(3000)
  const out = await page.evaluate(() => ({
    defined: !!customElements.get("epic-page"),
    shadow: document.querySelector("epic-page")?.shadowRoot?.innerHTML?.slice(0, 200) ?? null,
    ready: document.querySelector("ui-root")?.matches(":state(ready)"),
    packs: Object.keys(window.SpellUI ?? {}).filter((k) => /pack/i.test(k)),
  }))
  console.log(JSON.stringify(out, null, 2))
  console.log(logs.join("\n"))
})
