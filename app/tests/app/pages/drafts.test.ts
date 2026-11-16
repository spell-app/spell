import { existsSync, readFileSync, readdirSync, writeFileSync } from "node:fs"
import path from "node:path"

import { chromium, type Browser, type Page } from "playwright"
import { afterAll, beforeAll, describe, expect, test } from "vite-plus/test"

import { CodeEditor, EDITOR, SERVING } from "./runningEditor"
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
          editor: { file: { contents: string }; saveAll(): Promise<void> }
        }
        editor.file.contents = editor.file.contents.replace(from, to)
        await editor.saveAll()
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
    await new CodeEditor(page).shown()
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
    // while there's a draft:  Draft | Discard | Publish beside the modes, and a pen on its tab
    // (I44, I90, I93, T67, I192);  the label says what a draft is, on hover (its bar tooltip, I217)
    await page.waitForSelector(".PublishDraft", { timeout: 5000 })
    expect(await page.locator(".Drafted:visible").count()).toBe(1)
    expect(await page.locator(".PublishDraft ui-button.DiscardDraft").count()).toBe(1)
    expect((await page.locator(".PublishDraft .DraftState").textContent())?.trim()).toBe("Draft")
    expect(await page.locator(".PublishDraft .DraftState").getAttribute("data-tooltip")).toMatch(/only you see them/)
    await page.locator(".PublishDraft ui-button.Publish").click()
    await page.waitForSelector(".PublishDraft", { state: "detached", timeout: 10_000 })
    expect(await page.locator(".Drafted:visible").count()).toBe(0)
    expect(published()).toContain('"text"')
    expect(drafts()).toEqual([])
    expect(readdirSync(path.join(project.folder, "versions"))).toHaveLength(1)
  })

  test("published since your draft began:  both side by side, and Use Their Changes, once you're sure, takes theirs", async () => {
    await edit('"text"', '"mine"')
    const theirs = published().replace('"text"', '"theirs"')
    writeFileSync(path.join(project.folder, FILE), theirs) // as if someone else published
    const publishing = page.evaluate(() => (window as any).editor.publish())
    await page.waitForSelector("ui-modal.PublishClash .DiffView .cm-mergeView", { timeout: 20_000 })
    await page.locator("ui-modal.PublishClash ui-button.UseTheirs").click()
    // "Are you sure?" first (T101)
    await page.locator("ui-modal:not(.PublishClash) ui-button.approve", { hasText: "Use Their Changes" }).click()
    await publishing
    expect(drafts()).toEqual([])
    expect(published()).toBe(theirs)
    expect(await page.evaluate(() => (window as any).editor.file.contents)).toBe(theirs)
  })

  test("published since your draft began:  take theirs change by change, and Publish My Changes publishes your side, on the left (T75, T101)", async () => {
    await edit("## Note", "## My Note")
    await edit('"theirs"', '"mine"')
    const theirs = published().replace("## Note", "## Their Note")
    writeFileSync(path.join(project.folder, FILE), theirs) // as if someone else published
    const publishing = page.evaluate(() => (window as any).editor.publish())
    const clash = "ui-modal.PublishClash"
    await page.waitForSelector(`${clash} .DiffView .cm-merge-revert button`, {
      state: "attached",
      timeout: 20_000
    })
    expect(await page.locator(`${clash} .PublishClashSides h5`).allTextContents()).toEqual([
      "Your Changes",
      "Current Published Version"
    ])
    // two changes, an arrow each;  the lower one, `"mine"`, taken from theirs (CodeMirror takes it on mousedown)
    const arrows = page.locator(`${clash} .cm-merge-revert button`)
    expect(await arrows.count()).toBe(2)
    await arrows.evaluateAll((all) =>
      all
        .sort((a, b) => a.getBoundingClientRect().top - b.getBoundingClientRect().top)[1]
        .dispatchEvent(new MouseEvent("mousedown", { bubbles: true, cancelable: true }))
    )
    // your side's text, on the left, drawn bubbly or not:  `mine` gone, `theirs` in its place
    await page.waitForFunction((clash) => {
      const text = document.querySelector(`${clash} .cm-merge-a .cm-content`)?.textContent ?? ""
      return !text.includes("mine") && text.includes("theirs")
    }, clash)
    await page.locator(`${clash} ui-button[color=primary]`).click()
    await publishing
    expect(published()).toBe(FIRST.replace("## Note", "## My Note").replace('"words"', '"theirs"'))
    expect(drafts()).toEqual([])
    expect(await page.evaluate(() => (window as any).editor.file.contents)).toBe(published())
  })

  test("Versions, the editor's Spell's box:  Save Current Changes lists your draft, and Restore brings it back (I115)", async () => {
    const box = "ui-modal[visible]"
    const openVersions = async () => {
      await page.evaluate(() => void (window as any).editor.showVersions())
      await page.waitForSelector(`${box} ui-radio`, { timeout: 10_000 })
    }
    await edit('"theirs"', '"kept"')
    await openVersions()
    const before = await page.locator(`${box} ui-radio`).count()
    expect(before).toBeGreaterThan(0)
    await page.locator(`${box} ui-button.KeepChanges`).click()
    await page.waitForFunction(
      (count) => document.querySelectorAll("ui-modal[visible] ui-radio").length > count,
      before
    )
    // kept:  greyed, and the box stays open
    expect(await page.locator(`${box} ui-button.KeepChanges[disabled]`).count()).toBe(1)
    await page.locator(`${box} ui-button.cancel`).click()
    await page.waitForSelector(box, { state: "detached", timeout: 10_000 })

    await edit('"kept"', '"other"')
    await openVersions()
    await page
      .locator(`${box} ui-radio`, { hasText: /your draft/ })
      .first()
      .click()
    await page.locator(`${box} ui-button.approve`).click()
    await page.waitForFunction(() => (window as any).editor.file.contents.includes('"kept"'), undefined, {
      timeout: 10_000
    })
    expect(await page.locator(box).count()).toBe(0)
  })
})
