import { describe, expect, test } from "vite-plus/test"

import { ElementFixture } from "spell/test-helpers/ElementFixture"
import { expectAccessible } from "spell/test-helpers/A11y"

import "spell/epic/components/epic-agents"

// the agents and the session's line, on a page:  `EpicPage.test.tsx`, "<epic-page> Agents running", "what Claude is doing"

describe("<epic-agents>", () => {
  test("no page served with a token, no list, nothing doing:  its tools are there, empty;  passes axe", async () => {
    const host = await ElementFixture.render(`<epic-agents></epic-agents>`)
    const box = host.shadowRoot!.querySelector("[part~='base']")!
    expect([box.className, box.childElementCount]).toEqual(["tools", 0])
    await expectAccessible(host)
  })
})
