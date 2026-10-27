import { describe, expect, test } from "vite-plus/test"

import { HtmlFormatter } from "spell/ui/components/ui-example/HtmlFormatter"

describe("HtmlFormatter.format()", () => {
  test.each([
    [
      '<ui-button\n    color="primary"\n    size="small">A</ui-button>',
      '<ui-button color="primary" size="small">A</ui-button>'
    ],
    ['<ui-button fluid="">A</ui-button>', "<ui-button fluid>A</ui-button>"],
    [
      "<div><ui-button>A</ui-button><ui-button>B</ui-button></div>",
      "<div>\n  <ui-button>A</ui-button>\n  <ui-button>B</ui-button>\n</div>"
    ],
    [
      '<ui-code language="js">  if (x) {\n    y()\n  }</ui-code>',
      '<ui-code language="js">  if (x) {\n    y()\n  }</ui-code>'
    ],
    ["<p>Some <code>code</code> here</p>", "<p>Some <code>code</code> here</p>"],
    [
      '<div><script type="module">\n          if (x) {\n            y()\n          }\n        </script></div>',
      '<div>\n  <script type="module">\n    if (x) {\n      y()\n    }\n  </script>\n</div>'
    ]
  ])("formats %j", (html, expected) => {
    expect(HtmlFormatter.format(html)).toBe(expected)
  })
})
