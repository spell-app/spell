import { createRequire } from "node:module"
import type { Page } from "playwright"

import type { PerfPageName, PerfProfileName, PerfServers } from "./perf.types"
import { PerfBrowser } from "./PerfBrowser"

/**
 * Accessibility, quickly:
 * - axe-core over the whole page (it reads open shadow roots):  its problems by rule, impact and count
 * - 30 Tabs:  where the focus lands (through shadow roots), and whether it's visibly marked
 *   (a guess:  an outline or a shadow on the focused element, or on a host above it)
 * - motion:  the page's animations during the same interaction, with `prefers-reduced-motion` and without
 * - axe-core's own browser build, put in the page:  the kit's `A11y.check()` is a test's assertion, which runs inside
 *   a test's page with its `expect`
 */
export class A11yMeasure {
  /** `page` under `profile`. */
  static async measure(page: PerfPageName, profile: PerfProfileName, servers: PerfServers): Promise<A11yResult> {
    const result: A11yResult = { page, profile }
    const plain = await PerfBrowser.open(page, profile, servers)
    try {
      await plain.load({ quietMs: 2000 })
      await plain.page.addScriptTag({ path: AXE() })
      result.axe = await plain.page.evaluate(async () => {
        const axe = (window as unknown as AxeWindow).axe
        const run = await axe.run(document, { resultTypes: ["violations"] })
        return run.violations
          .map((violation) => ({
            rule: violation.id,
            impact: violation.impact,
            count: violation.nodes.length,
            help: violation.help,
            sample: violation.nodes[0]?.target?.join(" >> ")
          }))
          .sort((one, other) => other.count - one.count)
      })
      result.tabs = await A11yMeasure.tabThrough(plain.page)
      result.motionNoPreference = await A11yMeasure.animationsDuring(plain.page, MOTION[page])
    } finally {
      await plain.close()
    }
    const reduced = await PerfBrowser.open(page, profile, servers, { context: { reducedMotion: "reduce" } })
    try {
      await reduced.load({ quietMs: 2000 })
      result.motionReduce = await A11yMeasure.animationsDuring(reduced.page, MOTION[page])
    } finally {
      await reduced.close()
    }
    return result
  }

  /** `TABS` presses of Tab:  how many stops differ, and how many are visibly marked. */
  static async tabThrough(page: Page): Promise<TabsResult> {
    await page.mouse.click(2, 2)
    const stops: Array<{ where: string; visible: boolean }> = []
    for (let index = 0; index < TABS; index++) {
      await page.keyboard.press("Tab")
      await page.waitForTimeout(60)
      stops.push(await page.evaluate(focusStop))
    }
    return {
      presses: TABS,
      distinct: new Set(stops.map((stop) => stop.where)).size,
      visiblyMarked: stops.filter((stop) => stop.visible).length,
      onBody: stops.filter((stop) => stop.where === "body").length
    }
  }

  /** The animations seen while `action` runs, and 1.5s after:  how many, and how many with a duration. */
  static async animationsDuring(page: Page, action: (page: Page) => Promise<void>): Promise<MotionResult> {
    await page.evaluate(() => {
      const holder = window as unknown as { __animations: Set<Animation>; __animationTimer: number }
      holder.__animations = new Set()
      holder.__animationTimer = setInterval(() => {
        for (const animation of document.getAnimations()) holder.__animations.add(animation)
      }, 16) as unknown as number
    })
    await action(page).catch(() => {})
    await page.waitForTimeout(1500)
    return page.evaluate(() => {
      const holder = window as unknown as { __animations: Set<Animation>; __animationTimer: number }
      clearInterval(holder.__animationTimer)
      const list = [...holder.__animations]
      const durations = list.map((animation) => Number(animation.effect?.getComputedTiming().duration ?? 0))
      return { count: list.length, withDuration: durations.filter((duration) => duration > 1).length }
    })
  }
}

/** How many times Tab is pressed. */
const TABS = 30

/** axe-core's browser build, from the kit's install:  looked up when it's needed. */
const AXE = () => createRequire(import.meta.url).resolve("axe-core/axe.min.js")

/** An interaction that should animate, per page, for the reduced-motion check. */
const MOTION: Record<PerfPageName, (page: Page) => Promise<void>> = {
  editor: async (page) => {
    await page.locator(".EditorBar").getByText("View", { exact: true }).first().click()
    await page.waitForTimeout(600)
    await page.keyboard.press("Escape")
  },
  run: async (page) => {
    await page.locator("solitaire-stock-pile").first().click()
  },
  docs: async (page) => {
    await page.evaluate(() => document.querySelector("ui-modal")?.setAttribute("open", ""))
    await page.waitForTimeout(600)
    await page.evaluate(() => document.querySelector("ui-modal")?.removeAttribute("open"))
  },
  epic: async (page) => {
    await page.evaluate(() => document.querySelectorAll("epic-item")[3]?.setAttribute("open", ""))
    await page.waitForTimeout(600)
    await page.evaluate(() => document.querySelectorAll("epic-item")[3]?.removeAttribute("open"))
  },
  // P19's kinds:  nothing chosen to animate yet, so they count what animates by itself
  site: async (page) => {
    await page.waitForTimeout(600)
  },
  cloud: async (page) => {
    await page.waitForTimeout(600)
  },
  programs: async (page) => {
    await page.waitForTimeout(600)
  }
}

/**
 * In the page:  where the focus is, through shadow roots, and whether it's visibly marked.
 * - MUST stay self-contained:  Playwright sends its source
 */
function focusStop(): { where: string; visible: boolean } {
  let element = document.activeElement
  const path: string[] = []
  while (element?.shadowRoot?.activeElement) {
    path.push(element.localName)
    element = element.shadowRoot.activeElement
  }
  if (!element || element === document.body) return { where: "body", visible: false }
  path.push(element.localName)
  const isMarked = (node: Element) => {
    const style = getComputedStyle(node)
    const hasOutline = style.outlineStyle !== "none" && parseFloat(style.outlineWidth) > 0
    return hasOutline || (!!style.boxShadow && style.boxShadow !== "none")
  }
  let visible = isMarked(element)
  let host = (element.getRootNode() as ShadowRoot).host
  while (!visible && host) {
    visible = isMarked(host)
    host = (host.getRootNode() as ShadowRoot).host
  }
  return { where: path.join(" > "), visible }
}

/** The page's `axe`, once its build is in. */
type AxeWindow = Window & {
  axe: {
    run(
      context: Document,
      options: { resultTypes: string[] }
    ): Promise<{
      violations: Array<{
        id: string
        impact?: string
        help: string
        nodes: Array<{ target?: string[] }>
      }>
    }>
  }
}

/** 30 Tabs:  distinct stops, those visibly marked, those on the page's body. */
export type TabsResult = { presses: number; distinct: number; visiblyMarked: number; onBody: number }

/** The animations seen:  how many, and how many with a duration. */
export type MotionResult = { count: number; withDuration: number }

/** What accessibility measured. */
export type A11yResult = {
  page: PerfPageName
  profile: PerfProfileName
  axe?: Array<{ rule: string; impact?: string; count: number; help: string; sample?: string }>
  tabs?: TabsResult
  motionNoPreference?: MotionResult
  motionReduce?: MotionResult
}
