import { describe, expect, test } from "vite-plus/test"

// `yarn site:sections`'s converter:  a script outside `src/`, so a path (it imports the site's real data)
import { SiteSections } from "../../scripts/site-sections"

/** A components page whose API tab holds a lone `<ui-docs-api>` with `attributes`, as `yarn site:new` writes it. */
function page(attributes: string): string {
  return [
    `<ui-tabs id="site-tabs">`,
    `  <ui-tab value="api" label="API">`,
    `    <ui-docs-api ${attributes}></ui-docs-api>`,
    `  </ui-tab>`,
    `</ui-tabs>`,
    ``
  ].join("\n")
}

/** The API sections' ids and labels, in order. */
function sectionsOf(html: string): string[] {
  return [...html.matchAll(/<ui-section id="([^"]+)" label="([^"]+)"/g)].map((match) => `${match[1]} ${match[2]}`)
}

describe("yarn site:sections:  the API tab's Tags section", () => {
  test('a family of 2+ tags gets a Tags section FIRST, holding `only="tags"`', () => {
    const html = SiteSections.convert(page(`family="ui-button"`))
    expect(sectionsOf(html)[0]).toBe("api-tags Tags")
    expect(sectionsOf(html)[1]).toBe("api-attributes Attributes")
    expect(html).toContain(`<ui-docs-api family="ui-button" only="tags"></ui-docs-api>`)
  })

  test("a one-tag family, or a single tag, gets none", () => {
    expect(sectionsOf(SiteSections.convert(page(`family="ui-accordion"`)))).not.toContain("api-tags Tags")
    const single = SiteSections.convert(page(`tag="ui-or"`))
    expect(sectionsOf(single).length).toBeGreaterThan(0)
    expect(single).not.toContain(`only="tags"`)
  })

  test("running it again changes nothing", () => {
    const once = SiteSections.convert(page(`family="ui-button"`))
    expect(SiteSections.convert(once)).toBe(once)
  })
})
