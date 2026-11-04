import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs"
import path from "node:path"

import { chromium, type Browser, type Page } from "playwright"
import { afterAll, beforeAll, describe, expect, test } from "vite-plus/test"

import environment from "spell/app/spaces/server/node/environment"

/**
 * Drafts, Publish and versions in the editor (epic `editor` P24):  a save is your draft, Discard deletes it, Publish
 * makes it public and keeps a version, and a clash shows both side by side.
 * - On a project of its own in your space, made and removed here:  the built-in examples never change.
 * - Needs this checkout's editor running:  `spell server start all`.
 *   Skips itself when it isn't, as in CI, where nothing serves the editor.
 * - Headless Playwright, never a real browser window.
 */

/** The kit's root, where the page server leaves its note of the editor's address. */
const KIT = path.resolve(import.meta.dirname, "../../../..")

/** The running editor's address, from that note;  `undefined`:  none noted. */
function editorAddress(): string | undefined {
  const note = path.join(KIT, ".spell-server.editor.json")
  return existsSync(note) ? (JSON.parse(readFileSync(note, "utf8")) as { url: string }).url : undefined
}

/** Does it answer? */
async function isServing(address: string | undefined): Promise<boolean> {
  if (!address) return false
  try {
    return (await fetch(address)).ok
  } catch (ignored) {
    return false
  }
}

const EDITOR = editorAddress()
const SERVING = await isServing(EDITOR)

/** The project this test makes, in your space. */
const PROJECT = `owen@spell/drafts-test-${process.pid}`
/** Its folder on disk. */
const FOLDER = path.join(environment.userFilesRoot, PROJECT.split("/")[1]!)
/** Its one file. */
const FILE = "/Note.spell"
/** What's published at first. */
const FIRST = `## Note\na "note" is a thing where:\n  - its "words" is text\n`

describe.skipIf(!SERVING)("drafts, Publish and versions", { timeout: 180_000 }, () => {
  let browser: Browser
  let page: Page

  /** Ask the editor's API, from the page. */
  const api = (url: string, method: string, body: object) =>
    page.evaluate(
      async ([url, method, body]) =>
        (await fetch(url, { method, headers: { "content-type": "application/json" }, body: JSON.stringify(body) }))
          .status,
      [url, method, body] as const
    )
  /** Change the file's text in the editor, and save it. */
  const edit = (from: string, to: string) =>
    page.evaluate(
      async ([from, to]) => {
        const { editor } = window as unknown as {
          editor: { file: { contents: string }; saveFile(): Promise<void> }
        }
        editor.file.contents = editor.file.contents.replace(from, to)
        await editor.saveFile()
      },
      [from, to] as const
    )
  /** The project's drafts folder's files. */
  const drafts = () => (existsSync(path.join(FOLDER, "__draft")) ? readdirSync(path.join(FOLDER, "__draft")) : [])
  const published = () => readFileSync(path.join(FOLDER, FILE), "utf8")

  beforeAll(async () => {
    browser = await chromium.launch()
    page = await (await browser.newContext({ viewport: { width: 1400, height: 900 } })).newPage()
    await page.goto(`${EDITOR}`, { timeout: 60_000 })
    await api("/api/projects/create/project", "POST", { projectId: PROJECT, filePath: FILE, contents: FIRST })
    await page.goto(`${EDITOR}edit/${PROJECT}`, { timeout: 60_000 })
    await page.waitForSelector(".InputEditor .monaco-editor .view-line", { timeout: 60_000 })
    await page.waitForTimeout(1500)
  })

  afterAll(async () => {
    await api("/api/projects/remove/project", "DELETE", { projectId: PROJECT }).catch(() => undefined)
    await browser?.close()
  })

  test("a save is your draft:  the public file stays, the private folder answers not found", async () => {
    await edit('"words"', '"text"')
    expect(published()).toBe(FIRST)
    const draft = drafts().find((name) => /^Note\.owen-\d{4}-\d{2}-\d{2}\.spell$/.test(name))
    expect(draft).toBeDefined()
    const status = await page.evaluate(async (url) => (await fetch(url)).status, `/spaces/${PROJECT}/__draft/${draft}`)
    expect(status).toBe(404)
    expect(await page.evaluate(() => (window as any).editor.canPublish)).toBe(true)
  })

  test("Discard Changes deletes your draft, back to what's published", async () => {
    await page.evaluate(() => (window as any).editor.discardChanges())
    expect(drafts()).toEqual([])
    expect(await page.evaluate(() => (window as any).editor.file.contents)).toBe(FIRST)
  })

  test("Publish makes it public, keeps a version, and the draft goes", async () => {
    await edit('"words"', '"text"')
    await page.evaluate(() => (window as any).editor.publish())
    expect(published()).toContain('"text"')
    expect(drafts()).toEqual([])
    expect(readdirSync(path.join(FOLDER, "versions"))).toHaveLength(1)
  })

  test("published since your draft began:  both side by side, and Start Again takes theirs", async () => {
    await edit('"text"', '"mine"')
    const theirs = published().replace('"text"', '"theirs"')
    writeFileSync(path.join(FOLDER, FILE), theirs) // as if someone else published
    const publishing = page.evaluate(() => (window as any).editor.publish())
    await page.waitForSelector("ui-modal.PublishClash .DiffView .monaco-diff-editor", { timeout: 20_000 })
    await page.locator("ui-modal.PublishClash ui-button", { hasText: "Start Again" }).click()
    await publishing
    expect(drafts()).toEqual([])
    expect(published()).toBe(theirs)
    expect(await page.evaluate(() => (window as any).editor.file.contents)).toBe(theirs)
  })
})
