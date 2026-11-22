import { chromium, type Browser, type BrowserContext, type Page, type Route } from "playwright"
import { afterAll, beforeAll, describe, expect, test } from "vite-plus/test"

import { CodeEditor, EDITOR, SERVING } from "./runningEditor"

/**
 * The Inspector's Code band, on Solitaire (epic `editor`, Events In Code):  each event's, ability's and action's code
 * is the code editor on its lines of the file, so typing there is typing in the file.
 * - NOTHING reaches the disk:  every save is answered here, and a later read of the file gets what was saved,
 *   so the built-in examples can't change.
 * - Needs this checkout's editor running:  `spell server start all`.
 *   Skips itself when it isn't, as in CI, where nothing serves the editor.
 * - Headless Playwright, never a real browser window.
 */

/**
 * A browser context whose saves go nowhere near the disk:  a read of a saved file gets the saved text.
 * - AutoSave keeps each edit once typing pauses, and the editor reads its open file again now and then
 *   (`editor.watchOpenFile()`):  read from the disk, a saved edit would seem undone by someone else, and be reloaded.
 * - SEE:  editorPolish.test.ts's, the same.
 */
async function contextWithNoSaving(context: BrowserContext): Promise<void> {
  const saved = new Map<string, string>()
  // a file by where it's served:  `/api/projects/file/@spell/...` is `/spaces/@spell/...`
  const keyOf = (url: string) => new URL(url).pathname.replace(/^\/api\/projects\/file\//, "/spaces/")
  const answer = (route: Route) => {
    const request = route.request()
    const key = keyOf(request.url())
    if (request.method() !== "GET") {
      saved.set(key, request.postData() ?? "")
      return route.fulfill({ status: 200, contentType: "application/json", body: "{}" })
    }
    const text = saved.get(key)
    return text === undefined ? route.continue() : route.fulfill({ status: 200, contentType: "text/plain", body: text })
  }
  await context.route(/\/api\/projects\/file\//, answer)
  await context.route(/\.spell(\?.*)?$/, answer)
}

/** What a compile and redraw takes, at most. */
const SETTLE_MS = 2500

describe.skipIf(!SERVING)("The Inspector's Code band", { timeout: 180_000 }, () => {
  let browser: Browser
  let context: BrowserContext
  let page: Page

  /** Solitaire's main file, as the editor holds it now. */
  const mainFile = () =>
    page.evaluate(
      () =>
        (
          window as unknown as { project: { spellFiles: { path: string; contents: string }[] } }
        ).project.spellFiles.find((file) => file.path.endsWith("/Solitaire.spell"))!.contents
    )

  /** Every spell file of Solitaire, as the editor holds them now, one after another. */
  const allFiles = () =>
    page.evaluate(() =>
      (window as unknown as { project: { spellFiles: { contents: string }[] } }).project.spellFiles
        .map((file) => file.contents)
        .join("\n")
    )

  /** The Code band's row starting with `words`. */
  const row = (words: string) => page.locator(".InspectorEvent").filter({ hasText: words }).first()

  beforeAll(async () => {
    browser = await chromium.launch()
    context = await browser.newContext({ viewport: { width: 1500, height: 950 } })
    await contextWithNoSaving(context)
    page = await context.newPage()
    await page.goto(`${EDITOR}edit/@spell/examples/Solitaire`, { timeout: 60_000 })
    await new CodeEditor(page).shown()
    await page.waitForTimeout(3000)
    if (!(await page.evaluate(() => !!document.querySelector(".InspectAppButton.inspecting")))) {
      await page.locator(".InspectAppButton [part~=item]").first().click({ force: true })
    }
    await page.waitForTimeout(1500)
    // the lowest card on screen:  face up;  selected itself, as a click on it selects its card image (the card's look,
    // `<card-image card={it} />`, since Solitaire's language T138), with events of its own
    await page.evaluate(() => {
      const cards: Element[] = []
      const walk = (root: ParentNode) => {
        for (const element of root.querySelectorAll("*")) {
          if (element.localName === "solitaire-card") cards.push(element)
          if (element.shadowRoot) walk(element.shadowRoot)
        }
      }
      walk(document)
      const card = cards
        .filter((card) => card.getBoundingClientRect().width > 10)
        .sort((a, b) => b.getBoundingClientRect().bottom - a.getBoundingClientRect().bottom)[0]!
      ;(window as unknown as { Inspector: { select(element: Element): void } }).Inspector.select(card)
    })
    await page.waitForTimeout(SETTLE_MS)
  }, 120_000)

  afterAll(async () => {
    await browser?.close()
  })

  test("a card's events and actions show their lines of the file, in the code editor", async () => {
    expect(await page.locator(".InspectorCard[data-panel=code]").getAttribute("label")).toBe("Code")
    await expect
      .poll(async () =>
        (await row("when clicked").locator(".CodeSlice .cm-line").allInnerTexts()).map((line) =>
          line.replace(/\s+/g, " ").trim()
        )
      )
      // its words are its row's header, `when clicked` since Solitaire's language T155 (was `on click`):
      // the field holds only its code (Solitaire as it is now, I62)
      .toEqual(["if it is face up or its pile is solitaire's stock", "play the card"])
    // an action:  its signature in its band, its name a pill, each type a blank in it (T98), then its code
    const action = page
      .locator(".InspectorEvent.action")
      .filter({ has: page.locator(".InspectorActionSignature", { hasText: /to\s*play/ }) })
      .first()
    const signature = action.locator(".InspectorActionSignature")
    expect((await signature.innerText()).replace(/\s+/g, " ").trim()).toBe("to play a card")
    expect(await signature.locator(".InspectorActionType").allInnerTexts()).toEqual(["a card"])
    // it takes nothing else:  a run button for the card selected, at its row's right (I116)
    expect(await action.locator(":scope > ui-button.InspectorActionButton[slot=actions]").count()).toBe(1)
    // one that needs a pile (`to move a card to a pile`, was `put ... on`):  each type a blank in its pill, and no select or button, as it can't run from here
    const putOn = page.locator(".InspectorActionSignature").filter({ hasText: /move/ }).first()
    expect(await putOn.locator(".InspectorActionType").allInnerTexts()).toEqual(["a card", "a pile"])
    expect(await putOn.locator("ui-button, ui-select, ui-input").count()).toBe(0)
    expect((await action.locator(".CodeSlice .cm-content").innerText()).replace(/\s+/g, " ")).toContain(
      "if the card is in the stock"
    )
    // found where the compiler says it's declared, not by its words:  one whose words name another type (J58);
    // `the points for (a card) on (a pile)` since Solitaire's language P56 (was `count the points ...`)
    const points = page
      .locator(".InspectorEvent.action")
      .filter({ has: page.locator(".InspectorActionSignature", { hasText: /points/ }) })
      .first()
    await expect
      .poll(async () => (await points.locator(".CodeSlice .cm-content").innerText()).replace(/\s+/g, " "))
      .toContain("return 10 if the pile is a foundation")
  })

  test("typing in one is typing in the file:  the app keeps running, and undo takes it back", async () => {
    const before = await mainFile()
    await page.evaluate(() => {
      ;(window as unknown as { app: Element | null }).app = document.querySelector("solitaire-app")
    })
    // the points a move scores:  its last line, `return 0`;  found by its signature, as another row's code says its words
    const line = page
      .locator(".InspectorEvent.action")
      .filter({ has: page.locator(".InspectorActionSignature", { hasText: /points/ }) })
      .first()
      .locator(".CodeSlice .cm-line")
      .last()
    await line.click()
    await page.keyboard.press("End")
    await page.keyboard.type(" + 0")
    await page.keyboard.press("ControlOrMeta+Enter")
    await page.waitForTimeout(SETTLE_MS)
    expect(await mainFile()).toContain("\t\treturn 0 + 0\n")
    // the same app, not drawn again (Edit Without Redraw)
    expect(
      await page.evaluate(() => {
        const kept = (window as unknown as { app: Element | null }).app
        return !!kept && kept.isConnected && kept === document.querySelector("solitaire-app")
      })
    ).toBe(true)
    // undo, from the same editor
    for (let step = 0; step < 8 && (await mainFile()) !== before; step++) {
      await page.keyboard.press("ControlOrMeta+Z")
      await page.waitForTimeout(150)
    }
    expect(await mainFile()).toBe(before)
    // each row keeps its own head, at once:  not read again while the program's compile is behind the text (I220:
    // the click's row read `if it is face up ...`, its code `play the card`, till the next compile ran)
    const clicked = page.locator(".InspectorEvent").nth(1)
    expect((await clicked.locator(".InspectorEventWords").innerText()).replace(/\s+/g, " ").trim()).toBe("when clicked")
    expect((await clicked.locator(".CodeSlice .cm-line").first().innerText()).trim()).toBe(
      "if it is face up or its pile is solitaire's stock"
    )
  })

  // Solitaire's card has no one-line row any more (`- clickable when ...` is its `when clicked`'s `if` now, I62):
  // what this keeps is a row's first line, where Home lands at its code, past the file's indent
  test("a row's field starts at its code, and typing at its start lands there", async () => {
    const before = await mainFile()
    const field = row("when clicked").locator(".CodeSlice")
    await expect
      .poll(async () => (await field.locator(".cm-content").innerText()).replace(/\s+/g, " ").trim())
      .toMatch(/^if it is face up or its pile is solitaire's stock/)
    await field.locator(".cm-line").first().click()
    await page.keyboard.press("Home")
    await page.keyboard.type("really ")
    await page.waitForTimeout(300)
    expect(await mainFile()).toContain("\t\treally if it is face up")
    for (let step = 0; step < 8 && (await mainFile()) !== before; step++) {
      await page.keyboard.press("ControlOrMeta+Z")
      await page.waitForTimeout(150)
    }
    expect(await mainFile()).toBe(before)
  })

  test("the band's + writes an empty handler in its place, which takes the cursor", async () => {
    const before = await mainFile()
    const beforeFiles = await allFiles()
    // its pick, as the dropdown tells it:  the dropdown itself is Spell UI's, tested there
    await page.evaluate(() =>
      document
        .querySelector("ui-dropdown.InspectorAddEvent")!
        .dispatchEvent(new CustomEvent("ui-changed", { detail: { value: "dblclick" } }))
    )
    await page.waitForTimeout(SETTLE_MS)
    // one more handler than before, at the end of the card's declaration (`a "card" is a ...`, Card.spell), its own row
    const after = await allFiles()
    expect(after.split("\ton double click").length).toBe(beforeFiles.split("\ton double click").length + 1)
    expect(await row("on double click").locator(".CodeSlice").count()).toBe(1)
    expect(await page.evaluate(() => !!document.activeElement?.closest(".CodeSlice"))).toBe(true)
    // put it back, as the editor's own undo would
    await page.evaluate(() => (window as unknown as { editor: { history: { undo(): void } } }).editor.history.undo())
    await page.waitForTimeout(800)
    expect(await mainFile()).toBe(before)
  })

  test("Add Action on a Spell UI element writes the action into the view drawing it, which is selected (I197)", async () => {
    const beforeFiles = await allFiles()
    // a Spell UI element in the app's drawing:  its first `<ui-*>` that's drawn
    await page.evaluate(() => {
      const app = document.querySelector("solitaire-app")!
      const element = [...app.querySelectorAll("*")].find(
        (each) => each.localName.startsWith("ui-") && each.getBoundingClientRect().width > 10
      )!
      ;(window as unknown as { Inspector: { select(element: Element): void } }).Inspector.select(element)
    })
    await page.waitForTimeout(SETTLE_MS)
    const addAction = page.locator(".InspectorCard[data-panel=code] ui-button.InspectorAddAction")
    expect(await addAction.count()).toBe(1)
    expect(await addAction.getAttribute("icon")).toBe("fa7-free:circle-play")
    await addAction.click()
    await page.waitForTimeout(SETTLE_MS)
    // one more action than before, `to "new action"`, in the app's own type;  the app selected, its row with the cursor
    const after = await allFiles()
    expect(after.split('to "new action"').length).toBe(beforeFiles.split('to "new action"').length + 1)
    expect(await page.locator(".InspectorTrail").innerText()).toContain("Solitaire")
    expect(await page.evaluate(() => !!document.activeElement?.closest(".CodeSlice"))).toBe(true)
    await page.evaluate(() => (window as unknown as { editor: { history: { undo(): void } } }).editor.history.undo())
    await page.waitForTimeout(800)
    expect(await allFiles()).toBe(beforeFiles)
  })

  test("each row drawn as its block in the code:  band, rail and foot joined, the band to the right edge (I215)", async () => {
    await page.evaluate(() =>
      (window as unknown as { Inspector: { select(element: Element): void } }).Inspector.select(
        document.querySelector("solitaire-app")!
      )
    )
    await page.waitForTimeout(SETTLE_MS)
    const scoreRow = row("the score changes")
    await expect.poll(() => scoreRow.locator(".CodeSlice .cmb-band-open").count()).toBe(1)
    const drawn = await scoreRow.evaluate((section) => {
      const band = section.querySelector(".InspectorEventWords")!.getBoundingClientRect()
      const content = section.shadowRoot!.querySelector("[part~=content]")!
      const actions = section.shadowRoot!.querySelector("[part~=actions]")!.getBoundingClientRect()
      const slice = section.querySelector(".CodeSlice")!
      const scroller = slice.querySelector(".cm-scroller")!
      return {
        bandToBody: content.getBoundingClientRect().top - band.bottom,
        bandToButtons: actions.left - band.right,
        buttonsToPaperEnd: slice.getBoundingClientRect().right - actions.right,
        buttonsBehind: getComputedStyle(section.shadowRoot!.querySelector("[part~=actions]")!).backgroundColor,
        bandBehind: getComputedStyle(section.querySelector(".InspectorEventWords")!).backgroundColor,
        overflow: scroller.scrollWidth - scroller.clientWidth,
        railAndFoot: getComputedStyle(content).backgroundImage.split("linear-gradient").length - 1,
        // its `if`:  its body under its band, railed, ending in a foot
        ifRailed: [...slice.querySelectorAll(".cm-line")].filter((line) =>
          line.getAttribute("style")?.includes("--cmb-rails")
        ).length,
        ifFeet: slice.querySelectorAll(".cmb-foot").length
      }
    })
    // the rail drops straight from the band's square corner:  no glass between them
    expect(drawn.bandToBody).toBeCloseTo(0, 1)
    // the band runs on behind the ✕, out to the paper's right edge
    expect(drawn.bandToButtons).toBeCloseTo(0, 1)
    expect(drawn.buttonsToPaperEnd).toBeCloseTo(0, 1)
    expect(drawn.buttonsBehind).toBe(drawn.bandBehind)
    // lines that fit don't scroll sideways
    expect(drawn.overflow).toBe(0)
    // the rail, the foot, the swoop's corner and the paper's top corner:  all the band's colour behind the paper
    expect(drawn.railAndFoot).toBe(4)
    expect(drawn.ifRailed).toBe(2)
    expect(drawn.ifFeet).toBe(1)
  })
})
