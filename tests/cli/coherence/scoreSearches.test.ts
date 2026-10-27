import { describe, expect, test } from "vite-plus/test"

import { finePaths, scoreSearchesOf, searchesIn } from "spell/cli/coherence"

/** A catalog in the real one's shape:  entries with and without a **Score:** line, a wrapped one, its Fine lines. */
const CATALOG = `# The catalog

## Files

### Watching files

- **It is:**  \`LiveReload\`
- **Flag:**  \`\\bwatch\\(\`
- **Score:**  \`import \\{[^}]*\\bwatch\\b\` · home \`src/server/LiveReload.ts\`
  · not \`app/src/old/\`
- **Copies:**  four
  - Fine:  \`epic/src/tool/InboxPoller.mjs\` keeps its own

### Logging

- **It is:**  \`Logger\`
- **Flag:**  \`console\\.log\\(\`

### Fetching in Spell UI

- **Score:**  \`response\\.ok\` · in \`ui/src\` · home \`ui/src/runtime/runtime.types.ts\`, \`ui/src/Api.ts\`

## Fine as it is

- \`parser/src/markdown/blocks/BlockScanner.ts\`:  a state machine, not a grammar.
- Spell UI's marked and the parser's markdown:  two engines on purpose.
`

describe("the catalog's **Score:** lines", () => {
  const { mechanisms } = scoreSearchesOf(CATALOG, "")

  test("every entry with a Score line is a search;  one without (Logging) isn't", () => {
    expect(mechanisms.map((each) => each.name)).toEqual(["Watching files", "Fetching in Spell UI"])
  })

  test("a wrapped line is read whole:  its search, home and not", () => {
    expect(mechanisms[0]).toMatchObject({
      pattern: "import \\{[^}]*\\bwatch\\b",
      homes: ["src/server/LiveReload.ts"],
      within: []
    })
  })

  test("its own not, its entry's Fine lines and the catalog's Fine as it is are all left out", () => {
    expect(mechanisms[0]!.not).toEqual([
      "app/src/old/",
      "epic/src/tool/InboxPoller.mjs",
      "parser/src/markdown/blocks/BlockScanner.ts"
    ])
  })

  test("in and several homes", () => {
    expect(mechanisms[1]).toMatchObject({
      within: ["ui/src"],
      homes: ["ui/src/runtime/runtime.types.ts", "ui/src/Api.ts"]
    })
  })

  test("Fine as it is:  only its paths, not its prose", () => {
    expect(finePaths(CATALOG)).toEqual(["parser/src/markdown/blocks/BlockScanner.ts"])
  })

  test("the word list reads the same way", () => {
    const words = '### open / close\n\n- **Say:**  open\n- **Score:**  `"ui-(fold|unfold)"`\n'
    expect(scoreSearchesOf(CATALOG, words).words).toEqual([
      expect.objectContaining({ name: "open / close", pattern: '"ui-(fold|unfold)"' })
    ])
  })

  test("a line with no search, or a part it can't read, throws naming its entry", () => {
    expect(() => searchesIn("### X\n\n- **Score:**  home `a/b.ts`\n")).toThrow(/entry "X".*no `search`/)
    expect(() => searchesIn("### X\n\n- **Score:**  `a` · near `a/b.ts`\n")).toThrow(/entry "X".*isn't in, home or not/)
  })
})
