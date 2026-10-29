import { readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, test } from "vite-plus/test"

/** The pack's family folders. */
const COMPONENTS = fileURLToPath(new URL("../../src/components/", import.meta.url))

/**
 * "Owen" naming whoever looks at the page;  NOT a dated quote or rule (`Owen, 2026-10-25:  ...`, `Owen:  "..."`),
 * which is history.  The same search as the word list's "you" Score line (`agents/coherence/words.md`).
 */
const NAMES_OWEN = /\bOwen\b(?!(,\s+\d{4}-\d\d-\d\d|:\s+"))/

/** Every component's English text file, from the components folder:  `epic-item/EpicItem.en.ts` ... */
function vocabularyFiles(): string[] {
  return readdirSync(COMPONENTS, { recursive: true, encoding: "utf8" })
    .filter((path) => path.endsWith(".en.ts") && !path.includes("__pack"))
    .sort()
}

describe("the components' English text (epic `epic-friend` P3, Q7)", () => {
  test("says you, never Owen, to whoever is looking:  a name only in dated quotes", () => {
    const files = vocabularyFiles()
    expect(files.length).toBeGreaterThan(30)
    const hits = files.flatMap((file) =>
      readFileSync(join(COMPONENTS, file), "utf8")
        .split("\n")
        .flatMap((line, index) => (NAMES_OWEN.test(line) ? [`${file}:${index + 1}:  ${line.trim()}`] : []))
    )
    expect(hits).toEqual([])
  })
})
