import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs"
import path from "node:path"

import { chromium, type Browser, type Page } from "playwright"
import { afterAll, beforeAll, describe, expect, test } from "vite-plus/test"

import { EDITOR, SERVING } from "./runningEditor"
import { createTestProject, type TestProject } from "./testProject"

/**
 * Drafts, Publish and versions in the editor (epic `editor` P24):  a save is your draft, Discard deletes it, Publish
 * makes it public and keeps a version, and a clash shows both side by side.
 * - On a project of its own in your space, made and removed by `createTestProject()`:
 *   the built-in examples never change, and a killed run's project goes at the next run.
 * - Needs this checkout's editor running:  `spell server start all`.
 *   Skips itself when it isn't, as in CI, where nothing serves the editor.
 * - Headless Playwright, never a real browser window.
 */

/** Its one file. */
const FILE = "/Note.spell"
/** What's published at first. */
const FIRST = `## Note\na "note" is a thing where:\n  - its "words" is text\n`

describe.skipIf(!SERVING)("drafts, Publish and versions", { timeout: 180_000 }, () => {
  let browser: Browser
  let page: Page
  /** The project this test makes, in your space. */
  let project: TestProject

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
  const drafts = () =>
    existsSync(path.join(project.folder, "__draft")) ? readdirSync(path.join(project.folder, "__draft")) : []
  const published = () => readFileSync(path.join(project.folder, FILE), "utf8")

  beforeAll(async () => {
    browser = await chromium.launch()
    page = await (await browser.newContext({ viewport: { width: 1400, height: 900 } })).newPage()
    project = await createTestProject(EDITOR!, { name: "drafts", filePath: FILE, contents: FIRST })
    await page.goto(`${EDITOR}edit/${project.projectId}`, { timeout: 60_000 })
    await page.waitForSelector(".InputEditor .monaco-editor .view-line", { timeout: 60_000 })
    await page.waitForTimeout(1500)
    // the editor's first load, and its code editor's:  well over a hook's 10 seconds on a cold server
  }, 120_000)

  afterAll(async () => {
    await browser?.close()
    await project?.remove()
  })

  test("a save is your draft:  the public file stays, the private folder answers not found", async () => {
    await edit('"words"', '"text"')
    expect(published()).toBe(FIRST)
    const draft = drafts().find((name) => /^Note\.owen-\d{4}-\d{2}-\d{2}\.spell$/.test(name))
    expect(draft).toBeDefined()
    const status = await page.evaluate(
      async (url) => (await fetch(url)).status,
      `/spaces/${project.projectId}/__draft/${draft}`
    )
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
    // while there's a draft:  Draft | Publish beside the project's name, and a ring on its tab (I44)
    await page.waitForSelector(".DraftPill", { timeout: 5000 })
    expect(await page.locator(".Drafted:visible").count()).toBe(1)
    await page.locator(".DraftPill").click()
    await page.waitForSelector(".DraftPill", { state: "detached", timeout: 10_000 })
    expect(await page.locator(".Drafted:visible").count()).toBe(0)
    expect(published()).toContain('"text"')
    expect(drafts()).toEqual([])
    expect(readdirSync(path.join(project.folder, "versions"))).toHaveLength(1)
  })

  test("published since your draft began:  both side by side, and Start Again takes theirs", async () => {
    await edit('"text"', '"mine"')
    const theirs = published().replace('"text"', '"theirs"')
    writeFileSync(path.join(project.folder, FILE), theirs) // as if someone else published
    const publishing = page.evaluate(() => (window as any).editor.publish())
    await page.waitForSelector("ui-modal.PublishClash .DiffView .monaco-diff-editor", { timeout: 20_000 })
    await page.locator("ui-modal.PublishClash ui-button", { hasText: "Start Again" }).click()
    await publishing
    expect(drafts()).toEqual([])
    expect(published()).toBe(theirs)
    expect(await page.evaluate(() => (window as any).editor.file.contents)).toBe(theirs)
  })
})
