import { beforeAll, describe, expect, test } from "vite-plus/test"

import { OldNames } from "spell-ui/tools/OldNames"

/** Every vocabulary's old names, read once. */
let names: OldNames

beforeAll(async () => {
  names = await OldNames.load()
})

/** `text` rewritten. */
function rewrite(text: string) {
  return names.rewrite(text).text
}

describe("OldNames.rewrite()", () => {
  test.each([
    [
      "an old switch becomes its value",
      `<ui-button primary>Save</ui-button>`,
      `<ui-button color="primary">Save</ui-button>`
    ],
    [
      "several switches add their words to one attribute",
      `<ui-button basic circular icon="x"></ui-button>`,
      `<ui-button appearance="basic circular" icon="x"></ui-button>`
    ],
    [
      "an old value maps onto the new one",
      `<ui-table basic="very"></ui-table>`,
      `<ui-table appearance="very-basic"></ui-table>`
    ],
    ["a plain old name keeps its value", `<ui-image href="a.html"></ui-image>`, `<ui-image link="a.html"></ui-image>`],
    [
      "the shared link's old name, on any tag",
      `<ui-text href="a.html">x</ui-text>`,
      `<ui-text link="a.html">x</ui-text>`
    ],
    ["an old switch written off is dropped", `<ui-button primary="false">x</ui-button>`, `<ui-button>x</ui-button>`],
    [
      "written with the new name too, the words merge",
      `<ui-segment appearance="raised" basic></ui-segment>`,
      `<ui-segment appearance="raised basic"></ui-segment>`
    ],
    [
      "an old switch named like today's attribute is old only written bare",
      `<ui-item link>a</ui-item><ui-item link="a.html">b</ui-item>`,
      `<ui-item appearance="link">a</ui-item><ui-item link="a.html">b</ui-item>`
    ],
    [
      "escaped markup in a code sample",
      `&lt;ui-button primary&gt;Save&lt;/ui-button&gt;`,
      `&lt;ui-button color=&quot;primary&quot;&gt;Save&lt;/ui-button&gt;`
    ],
    [
      "the button's old label and content, together",
      `<ui-button content="Like" label="3"></ui-button>`,
      `<ui-button label="Like" badge="3"></ui-button>`
    ],
    [
      "the breadcrumb tags, on a page that still writes the old step",
      `<ui-breadcrumb><ui-breadcrumb-section href="/">Home</ui-breadcrumb-section></ui-breadcrumb>`,
      `<ui-breadcrumbs><ui-breadcrumb link="/">Home</ui-breadcrumb></ui-breadcrumbs>`
    ]
  ])("%s", (_name, before, after) => {
    expect(rewrite(before)).toBe(after)
  })

  test("leaves a page in the new words byte for byte:  running it twice changes nothing more", () => {
    const page = `<ui-breadcrumbs>\n  <ui-breadcrumb link="/">Home</ui-breadcrumb>\n</ui-breadcrumbs>\n<ui-button color="primary">x</ui-button>`
    expect(rewrite(page)).toBe(page)
    const old = `<ui-button\n  primary\n  basic\n>x</ui-button>`
    expect(rewrite(rewrite(old))).toBe(rewrite(old))
  })

  test("`markupOnly` leaves escaped markup, which quotes old names on purpose", () => {
    const page = `<ui-button primary>x</ui-button> <code>&lt;ui-button primary&gt;</code>`
    expect(names.rewrite(page, { markupOnly: true }).text).toBe(
      `<ui-button color="primary">x</ui-button> <code>&lt;ui-button primary&gt;</code>`
    )
  })

  test("leaves markup quoted inside an attribute value alone:  a title naming a tag is text", () => {
    const page =
      `<epic-item title="top tabs = <ui-tabs history basic>"></epic-item>` +
      `<ui-menu title='<ui-menu vertical secondary>' vertical></ui-menu>`
    expect(rewrite(page)).toBe(
      `<epic-item title="top tabs = <ui-tabs history basic>"></epic-item>` +
        `<ui-menu title='<ui-menu vertical secondary>' direction="vertical"></ui-menu>`
    )
  })

  test("lists what it can't see, and never guesses", () => {
    const { text, manual } = names.rewrite(`<ui-button basic={isQuiet}>x</ui-button><ui-button label="3">y</ui-button>`)
    expect(text).toBe(`<ui-button basic={isQuiet}>x</ui-button><ui-button label="3">y</ui-button>`)
    expect(manual).toHaveLength(2)
  })
})
