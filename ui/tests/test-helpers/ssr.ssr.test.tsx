/// <reference types="node" />

import { beforeAll, describe, expect, it } from "vite-plus/test"
import { mkdir, rm, writeFile } from "node:fs/promises"
import { resolve } from "node:path"

import { StaticRender, StaticStylesheet } from "spell/ui/static"
import { UIButton } from "spell/ui/components/ui-button/UIButton"
import { UICard } from "spell/ui/components/ui-card/UICard"
import { UIContent } from "spell/ui/components/ui-parts/UIContent"
import { UIDescription } from "spell/ui/components/ui-parts/UIDescription"
import { UIHeader } from "spell/ui/components/ui-parts/UIHeader"
import { UISegment } from "spell/ui/components/ui-segment/UISegment"

/** The page the browser half (`dsd.test.ts`) paints and starts:  a few families, nested, with text that changes. */
const SSR_PAGE = `
<ui-segment raised>
  <ui-button color="primary">Save</ui-button>
  <ui-button basic>Cancel</ui-button>
  <ui-card>
    <ui-content>
      <ui-header>Server-drawn</ui-header>
      <ui-description>Painted before any script.</ui-description>
    </ui-content>
  </ui-card>
</ui-segment>`

/**
 * The server half of the server-drawn shadow roots' probe (epic `solid-2-final` P16):
 * `SSR_PAGE` through the static render's shadow output, written for the browser half, `dsd.test.ts`.
 * - SIDE EFFECT:  writes `.cache/ssr-shadow.html`, and the sheets it links in `.cache/ui-sheets/`.
 * - The page links them at `/.cache/ui-sheets/`, where the browser test's server finds them.
 */
describe("the shadow output, for the browser probe", () => {
  beforeAll(() => {
    StaticRender.define(UIButton, UISegment, UICard, UIContent, UIHeader, UIDescription)
  })

  it("writes each element's shadow root, keyed for hydration, its sheets linked, none copied in", async () => {
    const html = StaticRender.fragment(SSR_PAGE, { output: "shadow", sheets: { href: SHEETS_URL } })
    expect(html.match(/shadowrootmode="open"/g)?.length).toBe(7)
    expect(html).toContain("_hk=")
    expect(html).not.toContain("<style")
    const cache = resolve(import.meta.dirname, "../../.cache")
    const sheets = resolve(cache, "ui-sheets")
    await rm(sheets, { recursive: true, force: true })
    await mkdir(sheets, { recursive: true })
    for (const [file, css] of StaticStylesheet.shadowSheets()) await writeFile(resolve(sheets, file), css)
    await writeFile(
      resolve(cache, "ssr-shadow.html"),
      `<link rel="stylesheet" href="${SHEETS_URL}${StaticStylesheet.pageFile}">${html}`
    )
    // per root, a few short links:  not the 147 KB a copy of every sheet inlined into each root once cost
    expect(html.length / 7).toBeLessThan(2_000)
  })
})

/** Where the browser half's server serves the sheets. */
const SHEETS_URL = "/.cache/ui-sheets/"
