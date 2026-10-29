/**
 * Tests of `AuthorWords`:  the phrases that put a person's name on what they did, written and renamed one way.
 */
import { describe, expect, test } from "vite-plus/test"

import { AuthorWords } from "spell/epic/tool/AuthorWords"

describe("AuthorWords.rename()", () => {
  test("renames the name in each phrase the writers write, and counts them", () => {
    const written = [
      `M3 passed (${AuthorWords.run("Ana")})`,
      `<p>${AuthorWords.testRun("Ana")}, 10:02:  M3 failed.</p>`,
      `<img alt="${AuthorWords.screenshot("Ana")} of M3">`,
      `Q3 ${AuthorWords.picked("Ana", "B")}:  Bananas`,
      `T4 made from the page:  ${AuthorWords.newItem("Ana", "todo")}`,
      `canceled:  ${AuthorWords.droppedBy("Ana")}`,
      `J1 urgent ${AuthorWords.fromChip("Ana")}`,
      `<p>${AuthorWords.said("Ana")}  after the flight</p>`,
      `<p>${AuthorWords.noteLead("Ana", "2026-10-01 09:10", "revisit soon")}  why?</p>`
    ].join("\n")
    const { text, count } = AuthorWords.rename(written, "Ana", "Ana Lima")
    expect(count).toBe(9)
    expect(text).toBe(written.replaceAll("Ana", "Ana Lima"))
  })

  test("never the name in running text, nor a longer name", () => {
    const text = "<p>Ana said Ana's plan was fine;  Anabel picked B.</p>"
    expect(AuthorWords.rename(text, "Ana", "Bob")).toEqual({ text, count: 0 })
  })
})
