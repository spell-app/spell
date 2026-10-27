/// <reference types="node" />

import { beforeAll, describe, expect, it } from "vite-plus/test"

import { ServerRuntime, StaticRender } from "spell/ui/static"
import { UIBreadcrumbs } from "spell/ui/components/ui-breadcrumbs/UIBreadcrumbs"
import { UIBreadcrumb } from "spell/ui/components/ui-breadcrumbs/UIBreadcrumb"

/**
 * `<ui-breadcrumbs>` / `<ui-breadcrumb>` in the static server render (`spell/ui/static`, seo plan P3):
 * the class grammar's semantic form, `<nav><ol><li><span class="divider"></span><a class="section">`.
 */
describe("<ui-breadcrumbs> static render", () => {
  beforeAll(async () => {
    StaticRender.define(UIBreadcrumbs, UIBreadcrumb)
    await ServerRuntime.icons()
  })

  it("renders a <nav> landmark around an <ol> of one <li> per section", () => {
    const html = StaticRender.fragment(
      `<ui-breadcrumbs aria-label="Trail"><ui-breadcrumb link="#home">Home</ui-breadcrumb>` +
        `<ui-breadcrumb selected>Shirt</ui-breadcrumb></ui-breadcrumbs>`
    )
    expect(sorted(html)).toBe(
      sorted(
        `<nav data-ui="breadcrumbs" class="ui breadcrumb" part="breadcrumb" aria-label="Trail"><ol part="list">` +
          `<li data-ui-slotted="" data-ui="breadcrumb"><span class="divider" part="divider" aria-hidden="true"></span>` +
          `<a class="section" part="section" href="#home">Home</a></li>` +
          `<li data-ui-slotted="" data-ui="breadcrumb" data-state="selected">` +
          `<span class="divider" part="divider" aria-hidden="true"></span>` +
          `<span class="active section" part="section" aria-current="page">Shirt</span></li></ol></nav>`
      )
    )
  })

  it("publishes a text divider and an icon divider as inline tokens", () => {
    const text = StaticRender.fragment(`<ui-breadcrumbs divider="›"></ui-breadcrumbs>`)
    expect(text).toContain(`--ui-breadcrumb-divider:&quot;›&quot;`)
    const icon = StaticRender.fragment(`<ui-breadcrumbs divider-icon="chevron right"></ui-breadcrumbs>`)
    expect(icon).toMatch(/--ui-breadcrumb-divider-icon:url\(&quot;data:image\/svg\+xml,%3Csvg%20xmlns%3D/)
    expect(icon).toContain(`--_ui-breadcrumb-divider-layout:icon`)
  })
})

/** `html` with each tag's attributes sorted by name:  linkedom adds attributes at the front. */
function sorted(html: string): string {
  return html.replace(/<([a-z][\w-]*)((?:\s+[\w:-]+(?:="[^"]*")?)*)\s*(\/?)>/g, (_match, tag, attributes, close) => {
    const list = (attributes.match(/[\w:-]+(?:="[^"]*")?/g) ?? []).sort()
    return `<${tag}${list.map((each: string) => " " + each).join("")}${close}>`
  })
}
