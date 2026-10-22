/**
 * Every README example, run:  a test per command a page prints with its Output fold (`tools/readme-test.ts`).
 * - Run by `yarn readme:test` (the `readme` project, with `SPELL_README_TEST=1`);  skipped in `yarn kit:test`, since
 *   the examples need every repo cloned and take a minute.
 * - A failure shows the page and line in the test's name, and the diff of what it printed.
 */
import { describe, expect, test } from "vite-plus/test"

import { ReadmeTest } from "../../tools/readme-test.ts"

const readmes = new ReadmeTest()
const running = process.env.SPELL_README_TEST === "1"

for (const page of readmes.pages()) {
  const examples = readmes.examples(page)
  if (!examples.length) continue
  describe.skipIf(!running)(examples[0].page, () => {
    for (const example of examples) {
      test(`line ${example.line}:  ${example.commands.split("\n")[0]}`, { timeout: ReadmeTest.TIMEOUT * 1000 }, () => {
        const { printed } = readmes.run(example)
        // compared as text, so a failure shows a diff;  `matches()` decides, `...` and all
        if (!ReadmeTest.matches(example.expected, printed)) expect(printed.trimEnd()).toBe(example.expected.trimEnd())
      })
    }
  })
}
