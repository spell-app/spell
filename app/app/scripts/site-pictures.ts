/**
 * `yarn site:pictures [name...]`:  the App UI docs set's PICTURES, `docs/_images/<name>.png`,
 * headless screenshots of the running editor app.
 * - For the Solid components that can't be drawn alone on a docs page (they need the whole editor around them):
 *   the editor's page shell, its panes and editors, its menus, dialogs and notices.
 *   The runner's pieces and the explorers are drawn LIVE on their pages instead, inside a `<spell-viewer>`.
 * - Needs this checkout's editor running:  `spell server start` starts it,
 *   and writes its URL to `.spell-server.editor.json`, at the kit's root.
 * - Rerun after changing how one of them looks, then look at the pictures and commit them.
 * - Headless Playwright, never a real browser window.
 */
import { readFileSync } from "node:fs"
import path from "node:path"

import { chromium, type Page } from "playwright"

import { pageServerRoot } from "spell/server/page/settings"

/** `app/`:  the app's build folder, its docs pages in `docs/`. */
const APP = path.resolve(import.meta.dirname, "..")

/** Where the pictures go. */
const IMAGES = path.join(APP, "docs", "_images")

/** The editor's address, from the page server's note at its root:  the kit's (epic `repo-split` P16). */
const EDITOR = (
  JSON.parse(readFileSync(path.join(pageServerRoot(APP), ".spell-server.editor.json"), "utf8")) as { url: string }
).url

/** The project the pictures show. */
const PROJECT = "edit/@spell/examples/Solitaire"

/** The window the pictures are taken in. */
const WINDOW = { width: 1280, height: 800 }

/** What a picture shows:  a page of the editor, made ready, then one element of it (or a region of the window). */
type Picture = {
  /** the picture's file name, without `.png`:  its page's name */
  name: string
  /** the editor's page, from its root */
  page: string
  /** the editor's preferences to set before the page loads (`spellEditor:<key>`):  Debug's panel on a tab ... */
  prefs?: Record<string, string>
  /** what to do first:  open a menu, show a notice ... */
  prepare?: (page: Page) => Promise<void>
  /** the element to picture (its first match) */
  selector?: string
  /** or a region of the window, in CSS pixels */
  clip?: { x: number; y: number; width: number; height: number }
}

/**
 * The editor as Owen shows it:  Debug, its Program panel open under the code, and the Inspector open.
 * - Its help seen, so it shows the app's parts, not how to use it.
 */
const DEBUG = { programPanel: "true", inspector: "true", "inspector:helpSeen": "true" }

/** Debug, its Program panel on `tab`:  where the console and the sentence tree are drawn. */
const debugOn = (tab: "output" | "tree") => ({ ...DEBUG, programTab: tab })

/** Every picture, by page. */
const PICTURES: Picture[] = [
  { name: "SpellPage", page: "", selector: ".SpellPage" },
  { name: "AppRoot", page: PROJECT, prefs: DEBUG, selector: ".AppRoot" },
  { name: "AppContainer", page: PROJECT, prefs: DEBUG, selector: ".AppContainer" },
  { name: "chrome", page: PROJECT, selector: ".AppMenu" },
  { name: "InputEditor", page: PROJECT, selector: ".InputRoot" },
  {
    name: "CodeMirrorEditor",
    page: PROJECT,
    prefs: { ...DEBUG, codeOutput: "js/solid" },
    selector: ".CodeOutputPane .CodeMirrorEditor"
  },
  { name: "ConsoleViewer", page: PROJECT, prefs: debugOn("output"), selector: ".ConsoleRoot" },
  {
    name: "Actions",
    page: PROJECT,
    prepare: (page) => openDropdown(page, "#FileBarMenu"),
    clip: { x: 0, y: 0, width: 560, height: 360 }
  },
  {
    name: "TreeViewer",
    page: PROJECT,
    prefs: debugOn("tree"),
    prepare: async (page) => {
      // the first line, "a card is a draggable two sided view":  near its start, so the code doesn't scroll sideways
      await page
        .locator(".InputEditor .cm-line")
        .first()
        .click({ position: { x: 60, y: 8 } })
      await page.waitForTimeout(1500)
    },
    selector: ".TreeRoot"
  },
  {
    name: "FileTabs",
    page: PROJECT,
    prepare: async (page) => {
      // a narrow tab row puts most tabs away:  its all-files button, at its end, lists every file
      await page.locator(".FileTabs").evaluate((tabs: HTMLElement) => (tabs.style.width = "260px"))
      await openDropdown(page, ".FileTabs button.all-items")
    },
    clip: { x: 0, y: 30, width: 720, height: 420 }
  },
  {
    name: "MenuBar",
    page: PROJECT,
    // the Spell menu, the bar's first:  its home row, then every example, the one shown ticked
    prepare: (page) => openDropdown(page, "#SpellBarMenu"),
    clip: { x: 0, y: 0, width: 640, height: 340 }
  },
  {
    name: "Chooser",
    page: PROJECT,
    prepare: (page) => showInEditor(page, "chooser"),
    clip: { x: 240, y: 150, width: 800, height: 500 }
  },
  {
    name: "Notice",
    page: PROJECT,
    prepare: (page) => showInEditor(page, "notice"),
    clip: { x: 240, y: 0, width: 800, height: 160 }
  },
  {
    name: "ErrorNotice",
    page: PROJECT,
    prepare: (page) => showInEditor(page, "error"),
    clip: { x: 240, y: 0, width: 800, height: 200 }
  }
]

const only = new Set(process.argv.slice(2))
const browser = await chromium.launch()
try {
  for (const picture of PICTURES) {
    if (only.size && !only.has(picture.name)) continue
    const page = await browser.newPage({ viewport: WINDOW })
    if (picture.prefs) await page.addInitScript(setPrefs, picture.prefs)
    await page.goto(new URL(picture.page, EDITOR).href, { waitUntil: "networkidle" })
    await page.waitForTimeout(3000)
    await picture.prepare?.(page)
    const file = path.join(IMAGES, `${picture.name}.png`)
    const clip = picture.clip ?? (await boxOf(page, picture.selector!))
    await page.screenshot({ path: file, clip })
    process.stdout.write(`${path.relative(process.cwd(), file)}\n`)
    await page.close()
  }
} finally {
  await browser.close()
}

/**
 * The box of `selector`'s first match, in CSS pixels.
 * - A `display: contents` element (many `<ui-*>` hosts) has none of its own:  its shadow root's and children's,
 *   together.
 */
async function boxOf(page: Page, selector: string): Promise<{ x: number; y: number; width: number; height: number }> {
  return page.evaluate((selector) => {
    const element = document.querySelector(selector)
    if (!element) throw new Error(`site:pictures:  nothing on the page matches ${selector}`)
    // a loop, not a named helper:  tsx would wrap a named function in a `__name()` the page doesn't have
    const all: DOMRect[] = []
    const queue: Element[] = [element]
    for (let node = queue.shift(); node; node = queue.shift()) {
      const own = node.getBoundingClientRect()
      if (own.width && own.height) all.push(own)
      else queue.push(...(node.shadowRoot?.children ?? []), ...node.children)
    }
    const left = Math.min(...all.map((box) => box.left))
    const top = Math.min(...all.map((box) => box.top))
    const right = Math.max(...all.map((box) => box.right))
    const bottom = Math.max(...all.map((box) => box.bottom))
    return { x: left, y: top, width: right - left, height: bottom - top }
  }, selector)
}

/**
 * Set the editor's preferences, `spellEditor:<key>` in the browser's storage, as text.
 * - Runs in the page, before it loads.
 */
function setPrefs(prefs: Record<string, string>): void {
  for (const [key, value] of Object.entries(prefs)) localStorage.setItem(`spellEditor:${key}`, value)
}

/** Click `selector` (a `<ui-dropdown>`) open, and let its menu show. */
async function openDropdown(page: Page, selector: string): Promise<void> {
  await page.locator(selector).first().click()
  await page.waitForTimeout(800)
}

/** Show a notice, an error or the chooser over the page, through the editor's debug global (`src/debug.ts`). */
async function showInEditor(page: Page, what: "notice" | "error" | "chooser"): Promise<void> {
  await page.evaluate((what) => {
    const editor = (globalThis as unknown as { editor: EditorMessages }).editor
    if (what === "notice") editor.showNotice("File saved.")
    else if (what === "error") editor.showError(new Error("Couldn't load Card.spell:  the server didn't answer."))
    // not awaited:  it answers once someone picks
    else
      /* if (what === "chooser") */ void editor.choose({
        header: "Pick one",
        message: "Message",
        options: ["A", "B", "C"]
      })
  }, what)
  await page.waitForTimeout(1200)
}

/** The calls of the editor's debug global these pictures make. */
type EditorMessages = {
  showNotice(notice: string): void
  showError(error: unknown): void
  choose(props: { header: string; message: string; options: string[] }): Promise<unknown>
}
