/**
 * Tests of `spell/cli/commandBlocks`:  a page's fenced blocks, an `sh` block's Output fold, and matching what was printed.
 * The README tester's own tests (`tests/tools/readme-test.test.ts`) cover it through `ReadmeTest` too.
 */
import { describe, expect, test } from "vite-plus/test"

import { fencedBlocks, outputMatches } from "spell/cli/commandBlocks"

describe("fencedBlocks()", () => {
  test("each block, its language and the rest of its line;  an sh block's Output fold, either way it's written", () => {
    const page = [
      "```ask NETBOX_TOKEN secret",
      "Paste it",
      "```",
      "",
      "```sh",
      "echo one",
      "```",
      "",
      "<details><summary>Output</summary>",
      "",
      "```text",
      "one",
      "```",
      "",
      "</details>",
      "",
      "- under a bullet:",
      "  ```sh",
      "  echo two",
      "  ```",
      "",
      "  <details>",
      "  <summary>Output</summary>",
      "",
      "  ```text",
      "  two",
      "  ```",
      "",
      "  </details>"
    ].join("\n")
    expect(fencedBlocks(page)).toEqual([
      { language: "ask", info: "NETBOX_TOKEN secret", line: 1, lastLine: 3, text: "Paste it" },
      { language: "sh", info: "", line: 5, lastLine: 13, text: "echo one", output: "one" },
      { language: "sh", info: "", line: 18, lastLine: 27, text: "echo two", output: "two" }
    ])
  })

  test("a block shown inside another is part of it", () => {
    const page = ["````markdown", "```sh", "rm -rf /", "```", "````"].join("\n")
    expect(fencedBlocks(page).map((block) => block.language)).toEqual(["markdown"])
  })
})

describe("outputMatches()", () => {
  test("`...` alone is any lines;  inside a line, any text;  colours and trailing spaces ignored", () => {
    expect(outputMatches("Added ...\n...\ndone", "\u001b[32mAdded netbox\u001b[0m  \nmore\nlines\ndone\n\n")).toBe(true)
    expect(outputMatches("Added ...\ndone", "Added netbox\nnot done")).toBe(false)
  })
})
