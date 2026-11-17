import { chromium, type Browser, type Locator, type Page } from "playwright"
import { afterAll, beforeAll, beforeEach, describe, expect, test } from "vite-plus/test"

import { EDITOR, SERVING } from "./runningEditor"

/**
 * The site editor, `/site/<project>` (epic `mockup` P4):  its board of the site's parts, a page's form,
 * adding, moving and undoing, each one step of the editor's history written into the site's file.
 * - Every save is answered here, and goes nowhere:  the editor holds what was changed, and the example on disk stays
 *   as it is.
 * - Needs this checkout's editor running:  `spell server start all`.
 *   Skips itself when it isn't, as in CI, where nothing serves the editor.
 * - Headless Playwright, never a real browser window.
 */

/** The project, and its site's file. */
const PROJECT = "@spell/examples/StarWarsSite"
const FILE = "StarWarsSite.spell"

/** What a compile and redraw takes, at most. */
const SETTLE_MS = 1500

describe.skipIf(!SERVING)("the site editor", { timeout: 180_000 }, () => {
  let browser: Browser
  let page: Page

  /** The site's file, as the editor holds it. */
  const text = () =>
    page.evaluate((file) => {
      const { project } = window as unknown as { project: { spellFiles: { path: string; contents: string }[] } }
      return project.spellFiles.find((each) => each.path.endsWith(`/${file}`))!.contents
    }, FILE)

  /** The box of the card saying `words`. */
  const cardWith = (words: string) => page.locator(".SiteCard", { hasText: words }).locator("[part~=card]")

  /** The box of part `name`'s card. */
  const cardOf = (name: string) => page.locator(`.SiteCard[data-part="${name}"]`).locator("[part~=card]")

  /** Room between the cards' frame (the board's scroll box) and the block of its cards and group lines, each side. */
  const boardGaps = () =>
    page.evaluate(() => {
      const frame = document.querySelector(".SiteEditorPage .cards")!.getBoundingClientRect()
      const boxes = [
        ...[...document.querySelectorAll(".SiteBoard .SiteCard")].map((card) =>
          card.shadowRoot!.querySelector("[part~=card]")!.getBoundingClientRect()
        ),
        ...[...document.querySelectorAll(".SiteGroupHeader")].map((line) => line.getBoundingClientRect())
      ]
      return {
        left: Math.min(...boxes.map((box) => box.left)) - frame.left,
        right: frame.right - Math.max(...boxes.map((box) => box.right)),
        top: Math.min(...boxes.map((box) => box.top)) - frame.top,
        padding: getComputedStyle(document.querySelector(".SiteBoard")!).padding
      }
    })

  /** Press on `from`'s middle and move to `x`, `y`;  the press stays down, for the caller to end. */
  const dragTo = async (from: Locator, to: () => Promise<{ x: number; y: number }>) => {
    const box = (await from.boundingBox())!
    await page.mouse.move(box.x + box.width / 2, box.y + box.height / 2)
    await page.mouse.down()
    await page.mouse.move(box.x + box.width / 2 + 12, box.y + box.height / 2 + 12, { steps: 3 })
    const { x, y } = await to()
    await page.mouse.move(x, y, { steps: 6 })
    // the browser hands out pointer moves a frame at a time
    await page.waitForTimeout(150)
  }

  /** The middle of spot `row`, `column` of section `section`. */
  const spotCentre = async (section: string, row: number, column: number) => {
    const spot = page.locator(
      `.SiteSection[data-section="${section}"] .spot[data-row="${row}"][data-column="${column}"]`
    )
    const box = (await spot.boundingBox())!
    return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
  }

  /** ⌘Z, from the board's title, and what it settles to. */
  const undo = async () => {
    await page.locator(".SiteEditorPage h1").click()
    await page.keyboard.press("Meta+z")
    await page.waitForTimeout(SETTLE_MS)
  }

  beforeAll(async () => {
    browser = await chromium.launch()
    const context = await browser.newContext({ viewport: { width: 1400, height: 860 } })
    await context.route(/\/api\/projects\/file\/|\.(spell)(\?.*)?$/, (route) => {
      const request = route.request()
      if (request.isNavigationRequest() || request.method() === "GET") return route.continue()
      return route.fulfill({ status: 200, contentType: "application/json", body: "{}" })
    })
    page = await context.newPage()
    await page.goto(`${EDITOR}site/${PROJECT}`)
    await page.locator(".SiteCard [part~=card]").first().waitFor({ timeout: 30_000 })
  })

  afterAll(async () => {
    await browser?.close()
  })

  test("shows every part of the site as cards, on the editor's own panes", async () => {
    // six collections, a list and a page each, the reviews page, two dialogs, a sidebar, the not found and error pages
    expect(await page.locator(".SiteCard").count()).toBe(18)
    // no tree of the pages beside the board (epic `mockup` I13):  the board and the form, each a pane as Edit's are
    expect(await page.locator("ui-tree-item").count()).toBe(0)
    expect(await page.locator(".SiteEditorPage.EditorColumns > .SplitPane").count()).toBe(2)
    // ... looking as the Inspector's cards do (epic `mockup` I18):  on a panel's own fill, the board's bar the top bar's
    const looks = await page.evaluate(() => {
      const fill = (background: string) => {
        const sample = document.createElement("div")
        sample.style.background = background
        document.body.append(sample)
        const { backgroundColor, backgroundImage } = getComputedStyle(sample)
        sample.remove()
        return `${backgroundColor} ${backgroundImage}`
      }
      const panes = [...document.querySelectorAll(".SiteEditorPage > .SplitPane")]
      const bar = getComputedStyle(document.querySelector(".SiteEditorPage .board > header")!)
      return {
        panel: fill("var(--spell-panel-background)"),
        panes: panes.map((pane) => getComputedStyle(pane, "::before").backgroundColor),
        menuBar: fill("var(--spell-menu-bar-background)"),
        bar: `${bar.backgroundColor} ${bar.backgroundImage}`
      }
    })
    expect(looks.panes.map((color) => `${color} none`)).toEqual([looks.panel, looks.panel])
    expect(looks.bar).toBe(looks.menuBar)
    // the app isn't run here:  nothing of the site is drawn over the page
    expect(await page.locator(".spell-site").count()).toBe(0)
  })

  test("a page's card shows its icon before its title, and its address under it (T34)", async () => {
    const films = page.locator('.SiteCard[data-part="films page"]')
    await expect.poll(() => films.locator(".heading ui-icon").getAttribute("name")).toBe("film")
    expect(await films.locator(".heading .title").textContent()).toBe("Films")
    expect(await films.locator(".line:not(.stories)").textContent()).toMatch(/^\/films\b/)
    expect(await films.locator("button.edit").getAttribute("aria-label")).toBe("Edit Films")
    // a dialog has no icon, and says what it is
    const settings = page.locator('.SiteCard[data-part="settings dialog"]')
    expect(await settings.locator(".heading ui-icon").count()).toBe(0)
  })

  test("the cards sit in the middle of their frame, 20px in from its edges (I37)", async () => {
    const gaps = await boardGaps()
    expect(gaps.padding).toBe("20px")
    expect(gaps.top).toBeCloseTo(20, 0)
    expect(gaps.left).toBeGreaterThan(20)
    expect(Math.abs(gaps.left - gaps.right)).toBeLessThanOrEqual(1)
    // too narrow for them:  20px in from the left, scrolling to 20px past the right
    await page.setViewportSize({ width: 900, height: 860 })
    await expect.poll(async () => (await boardGaps()).left).toBeCloseTo(20, 0)
    const frame = page.locator(".SiteEditorPage .cards")
    await frame.evaluate((pane) => {
      pane.scrollLeft = pane.scrollWidth
    })
    expect((await boardGaps()).right).toBeCloseTo(20, 0)
    await frame.evaluate((pane) => {
      pane.scrollLeft = 0
    })
    await page.setViewportSize({ width: 1400, height: 860 })
  })

  test("the bar's Run | Edit | Site:  Site chosen here, and only for a site", async () => {
    const modes = page.locator("ui-menu.ModeTabs > ui-item")
    expect(await modes.count()).toBe(3)
    expect(await modes.nth(2).getAttribute("selected")).not.toBeNull()
  })

  test("a page's title changed in its form:  written into its line", async () => {
    await cardWith("/films/:film").click()
    const title = page.locator("ui-property-editor input").nth(1)
    await title.fill("Movie")
    await title.press("Enter")
    await page.waitForTimeout(SETTLE_MS)
    expect(await text()).toContain('\t\tit has a film page at "/films/:film", named "Movie"\n')
  })

  test("a page added, then taken back with ⌘Z", async () => {
    await page.locator(".SiteEditorPage .board header ui-button", { hasText: "Add a page" }).click()
    await page.waitForTimeout(SETTLE_MS)
    expect(await text()).toContain('\tit has a new page at "/new-page", named "New page"\n')
    expect(await text()).toContain('a "new page" is a page\n')
    await page.locator(".SiteEditorPage h1").click()
    await page.keyboard.press("Meta+z")
    await page.waitForTimeout(SETTLE_MS)
    expect(await text()).not.toContain('"new page"')
  })

  test("a page with pages under it:  asked first, then all of them go, as one step ⌘Z takes back", async () => {
    await cardWith("/planets").first().click()
    await page.locator(".SiteEditorPage .form ui-button", { hasText: "Delete" }).click()
    const ask = page.getByText("Delete planets page and the page under it (Planet)?")
    await ask.waitFor({ timeout: 10_000 })
    await page.getByRole("button", { name: "Delete them all" }).click()
    await page.waitForTimeout(SETTLE_MS)
    expect(await text()).not.toMatch(/it has an? planets? page|^planets? page is a page/m)
    await page.locator(".SiteEditorPage h1").click()
    await page.keyboard.press("Meta+z")
    await page.waitForTimeout(SETTLE_MS)
    expect(await text()).toContain('\t\tit has a planet page at "/planets/:planet", named "Planet"\n')
    expect(await text()).toContain("\nplanets page is a page\n")
  })

  test("a page's stories:  one added, then ticked off, each one step written into the page;  its card counts them", async () => {
    await cardOf("films page").click()
    const stories = page.locator(".SitePageStories")
    await stories.locator("li").first().waitFor({ timeout: 10_000 })
    expect(await stories.locator("li").count()).toBe(3)
    await stories.locator("ui-button", { hasText: "Add a story" }).click()
    await page.waitForTimeout(SETTLE_MS)
    expect(await text()).toContain('open a film\'s page from its row</story>\n\t\t<story "S4"></story>\n')
    await stories.locator("li").last().locator('input[type="checkbox"]').check()
    await page.waitForTimeout(SETTLE_MS)
    expect(await text()).toContain('<story "S4" done></story>')
    expect(
      await page
        .locator(".SiteCard", { hasText: "/films" })
        .filter({ has: page.locator(".line.stories", { hasText: "3 of 4 stories" }) })
        .count()
    ).toBe(1)
  })

  test("a story moves by its thumb;  deleting one asks first, unless Option is held", async () => {
    const stories = page.locator(".SitePageStories")
    const rows = stories.locator("li")
    const before = await rows.first().locator("textarea.text").inputValue()
    const thumb = (await rows.first().locator(".thumb").boundingBox())!
    const second = (await rows.nth(1).boundingBox())!
    await page.mouse.move(thumb.x + thumb.width / 2, thumb.y + thumb.height / 2)
    await page.mouse.down()
    await page.mouse.move(thumb.x + thumb.width / 2, second.y + second.height / 2, { steps: 4 })
    await page.mouse.move(thumb.x + thumb.width / 2, second.y + second.height - 1, { steps: 2 })
    await page.mouse.up()
    await page.waitForTimeout(SETTLE_MS)
    expect(await rows.nth(1).locator("textarea.text").inputValue()).toBe(before)

    const count = await rows.count()
    const deleteLast = rows.last().locator("ui-button")
    await deleteLast.click()
    await page.locator("ui-button", { hasText: "Cancel" }).click()
    await page.waitForTimeout(SETTLE_MS)
    expect(await rows.count()).toBe(count)
    await deleteLast.click({ modifiers: ["Alt"] })
    await page.waitForTimeout(SETTLE_MS)
    expect(await rows.count()).toBe(count - 1)
  })

  describe("moving on the board", () => {
    // every section in sight at once, whatever the tests before scrolled to
    beforeEach(async () => {
      await page.setViewportSize({ width: 1400, height: 1500 })
      await page.locator(".SiteEditorPage .cards").evaluate((pane) => {
        pane.scrollTop = 0
      })
    })

    test("a press that doesn't move still picks", async () => {
      await cardOf("people page").click()
      await page.locator(".SiteCard.selected[data-part='people page']").waitFor({ state: "attached", timeout: 5000 })
    })

    test("a section's card moves the whole section, a line showing where;  ⌘Z takes it back", async () => {
      const before = await text()
      const films = (await page.locator('.SiteSection[data-section="films page"]').boundingBox())!
      await dragTo(cardOf("people page"), async () => ({ x: films.x + 40, y: films.y + 4 }))
      expect(await page.locator('.SiteSection[data-section="films page"][data-drop="before"]').count()).toBe(1)
      await page.mouse.up()
      await page.waitForTimeout(SETTLE_MS)
      const after = await text()
      expect(after.indexOf("it has a people page")).toBeLessThan(after.indexOf("it has a films page"))
      // the board shows the new order
      const onBoard = await page
        .locator(".SiteSection[data-headed]")
        .evaluateAll((blocks) => blocks.map((block) => block.getAttribute("data-section")))
      expect(onBoard.indexOf("people page")).toBeLessThan(onBoard.indexOf("films page"))
      await undo()
      expect(await text()).toBe(before)
    })

    test("a section added at the end, picked;  its line dragged above another moves it;  ⌘Z takes each back", async () => {
      const before = await text()
      const addSection = page.locator(".SiteEditorPage ui-button", { hasText: "Add a section" })
      await addSection.click()
      await page.waitForTimeout(SETTLE_MS)
      await addSection.click()
      await page.waitForTimeout(SETTLE_MS)
      expect(await text()).toBe(`${before}\tgroup "New section"\n\tgroup "New section 2"\n`)
      // the new one is picked, a line over its section, not a card
      await page.locator('.SiteGroupHeader.selected[data-part="#group New section 2"]').waitFor({ timeout: 5000 })
      expect(await page.locator(".SiteCard[data-part^='#group']").count()).toBe(0)
      const first = (await page.locator('.SiteSection[data-section="#group New section"]').boundingBox())!
      await dragTo(page.locator('.SiteGroupHeader[data-part="#group New section 2"]'), async () => ({
        x: first.x + 40,
        y: first.y + 2
      }))
      expect(await page.locator('.SiteSection[data-section="#group New section"][data-drop="before"]').count()).toBe(1)
      // a group lands only beside a section:  no spots shown
      expect(await page.locator(".SiteBoard[data-moving]").count()).toBe(0)
      await page.mouse.up()
      await page.waitForTimeout(SETTLE_MS)
      expect(await text()).toBe(`${before}\tgroup "New section 2"\n\tgroup "New section"\n`)
      await undo()
      await undo()
      await undo()
      expect(await text()).toBe(before)
    })

    test("a card to an empty spot of its section:  the spot lights up, its place is written", async () => {
      const before = await text()
      await dragTo(cardOf("film page"), () => spotCentre("films page", 1, 3))
      expect(await page.locator(".SiteBoard[data-moving] .spot[data-drop]").count()).toBe(1)
      await page.mouse.up()
      await page.waitForTimeout(SETTLE_MS)
      expect(await text()).toMatch(/it has a film page at [^\n]*, in row 1 column 3\n/)
      expect(await page.locator(".SiteBoard[data-moving]").count()).toBe(0)
      await undo()
      expect(await text()).toBe(before)
    })

    test("a card into another section goes under it", async () => {
      const before = await text()
      await dragTo(cardOf("review dialog"), () => spotCentre("reviews page", 1, 2))
      await page.mouse.up()
      await page.waitForTimeout(SETTLE_MS)
      expect(await text()).toMatch(/it has a reviews page at [^\n]*\n\t+it has a review dialog, in row 1 column 2\n/)
      await undo()
      expect(await text()).toBe(before)
    })

    test("a card dropped on a page's middle:  its first page, the page lit up;  ⌘Z takes it back in one step", async () => {
      const before = await text()
      const reviews = cardOf("reviews page")
      const middle = async () => {
        const box = (await reviews.boundingBox())!
        return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
      }
      await dragTo(cardOf("starship page"), middle)
      // the section under the pointer opens a row, so the sections below it move:  aim again once they have
      const settled = await middle()
      await page.mouse.move(settled.x, settled.y, { steps: 3 })
      await page.waitForTimeout(150)
      expect(await page.locator('.SiteCard[data-part="reviews page"]').getAttribute("data-drop")).toBe("into")
      // its edge still means its spot:  the card there moves along
      const box = (await reviews.boundingBox())!
      await page.mouse.move(box.x + 4, box.y + box.height / 2, { steps: 3 })
      await page.waitForTimeout(150)
      expect(await page.locator('.SiteCard[data-drop="into"]').count()).toBe(0)
      const { x, y } = await middle()
      await page.mouse.move(x, y, { steps: 3 })
      await page.waitForTimeout(150)
      await page.mouse.up()
      await page.waitForTimeout(SETTLE_MS)
      // whatever else the reviews page's line says (its title, its icon), the starship page is now under it
      expect(await text()).toMatch(/\tit has a reviews page at "\/reviews"[^\n]*\n\t\tit has a starship page at /)
      await undo()
      expect(await text()).toBe(before)
    })

    test("a card can't go into itself or one of its own pages:  no mark", async () => {
      const planets = cardOf("planets page")
      await dragTo(planets, async () => {
        const box = (await cardOf("planet page").boundingBox())!
        return { x: box.x + box.width / 2, y: box.y + box.height / 2 }
      })
      expect(await page.locator('.SiteCard[data-drop="into"]').count()).toBe(0)
      await page.keyboard.press("Escape")
      await page.mouse.up()
    })

    test("a card moving shifts nothing:  the one more column takes no room in the centred board (I37)", async () => {
      const before = await boardGaps()
      await dragTo(cardOf("film page"), () => spotCentre("films page", 1, 3))
      expect(await page.locator(".SiteBoard[data-moving]").count()).toBe(1)
      expect((await boardGaps()).left).toBeCloseTo(before.left, 0)
      await page.keyboard.press("Escape")
      await page.mouse.up()
    })

    test("Escape moves nothing", async () => {
      const before = await text()
      await dragTo(cardOf("film page"), () => spotCentre("films page", 1, 3))
      await page.keyboard.press("Escape")
      await page.mouse.up()
      await page.waitForTimeout(SETTLE_MS)
      expect(await text()).toBe(before)
      expect(await page.locator(".SiteBoard[data-moving], [data-drop]").count()).toBe(0)
    })

    test("a drop nowhere moves nothing", async () => {
      const before = await text()
      await dragTo(cardOf("film page"), async () => ({ x: 700, y: 8 }))
      await page.mouse.up()
      await page.waitForTimeout(SETTLE_MS)
      expect(await text()).toBe(before)
    })
  })

  describe("a group's sites, /site/<group>", () => {
    test("lists the group's sites, each opening in the site editor, and its editor comes back", async () => {
      await page.goto(`${EDITOR}site/@spell/examples`)
      const card = page.locator('#sites .TileCard[href="/site/@spell/examples/StarWarsSite"]')
      await card.waitFor({ timeout: 30_000 })
      // only sites:  Solitaire is an example, and no site
      expect(await page.locator("#sites .TileCard", { hasText: "Solitaire" }).count()).toBe(0)
      await card.click()
      await page.waitForURL(/\/site\/@spell\/examples\/StarWarsSite$/, { timeout: 30_000 })
      await page.locator(".SiteCard [part~=card]").first().waitFor({ timeout: 30_000 })
      // no "All sites" in the bar since epic `mockup` T36:  the browser's Back
      expect(await page.locator(".SiteEditorPage ui-button", { hasText: "All sites" }).count()).toBe(0)
      await page.goBack()
      await page.waitForURL(/\/site\/@spell\/examples$/, { timeout: 30_000 })
      await card.waitFor({ timeout: 30_000 })
      await card.click()
      await page.locator(".SiteCard [part~=card]").first().waitFor({ timeout: 30_000 })
    })

    test("a group with no sites says so, and how to make one", async () => {
      const other = await page.context().newPage()
      await other.goto(`${EDITOR}site/@spell/library`)
      await other.getByText("No sites here yet").waitFor({ timeout: 30_000 })
      expect(await other.locator("#sites .TileCard:not(.empty)").count()).toBe(0)
      await other.close()
    })
  })

  test("a double click opens the page in Edit, and Back to the site comes back", async () => {
    await cardWith("/people/:person").dblclick()
    await page.waitForURL(/\/edit\//, { timeout: 30_000 })
    const back = page.locator(".BackToSite ui-button")
    await back.waitFor({ timeout: 30_000 })
    await back.click()
    await page.waitForURL(/\/site\//, { timeout: 30_000 })
    await page.locator(".SiteCard [part~=card]").first().waitFor({ timeout: 30_000 })
  })

  test("the pencil in a card's corner opens it in Edit, in the same tab (I24)", async () => {
    const pages = page.context().pages().length
    await page.locator(".SiteCard", { hasText: "/people/:person" }).locator("button.edit").click()
    await page.waitForURL(/\/edit\//, { timeout: 30_000 })
    expect(page.context().pages().length).toBe(pages)
    await page.locator(".BackToSite ui-button").click()
    await page.waitForURL(/\/site\//, { timeout: 30_000 })
    await page.locator(".SiteCard [part~=card]").first().waitFor({ timeout: 30_000 })
  })
})
