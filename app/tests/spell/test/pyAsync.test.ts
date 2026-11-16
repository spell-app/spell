import { writeFileSync } from "fs"
import { describe, test, expect } from "vite-plus/test"

import { PY } from "spell/parser/py"
import { compiledFixture } from "spell/app/spaces/test"

/**
 * The `py` target's writer, `PY.PyWriter`, on asyncio (epic `python-target` P11, one target since P22):  a function that waits is
 * `async def`, and everything that calls it awaits it -- javascript calls them without waiting.
 * - Its whole output is pinned by the fixtures' `.snapshot.py`, and run by the core contract.
 */
describe("Python on asyncio", () => {
  // Solitaire, its cards its own
  const cards = compiledFixture("@spell/examples/Solitaire", PY.PyWriter.instance)
  if (process.env.SPELL_DUMP_ASYNC) writeFileSync(process.env.SPELL_DUMP_ASYNC, cards)

  test("a method that pauses waits:  `async def`, `await core.pause_for(...)`", () => {
    expect(cards).toContain("    async def turn_over_the_next_card(self) -> None:")
    expect(cards).toContain('        await core.pause_for(300, "msec")')
  })

  test("a method that calls one that waits waits too, and awaits it", () => {
    expect(cards).toContain("    async def restart_the_game(self) -> None:")
    expect(cards).toContain("        await self.turn_over_the_next_card()")
  })

  test("a getter that doesn't wait stays a plain property", () => {
    expect(cards).toMatch(/@property\n {4}def name\(self\) -> str:/)
  })

  // (a `create()` that waits was the deck's, which turned each card face down with a pause:  a two sided card
  // starts face down since the showcase, epic `elemental-spell`, so no fixture has one now)
  // (a card's click plays it, which may turn over the next card;  the pile's drop handler puts a card, which never
  // waits since `put a card on a pile` is Pile.spell's, epic `language` P56)
  test("a handler that calls one that waits is `async def` too", () => {
    expect(cards).toMatch(
      /\n {4}async def on_click\(self, event: ClickEvent\) -> None:\n.*\n {12}await self\.play\(\)\n/
    )
  })

  // (Solitaire's top level is empty since it deals in `when creating it`:  the frozen test project that tells a story waits)
  test("the top level runs what waits with asyncio.run()", () => {
    const story = compiledFixture("@spell/test/sending-events", PY.PyWriter.instance)
    expect(story).toMatch(/^from __future__ import annotations\n\nimport asyncio\n/)
    expect(story).toContain("asyncio.run(play_the_story())")
  })
})
