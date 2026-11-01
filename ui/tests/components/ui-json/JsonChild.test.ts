import { describe, expect, test } from "vite-plus/test"

import { Fixture } from "spell/test-helpers/Fixture"
import { JsonChild } from "spell/ui/components/ui-json"

describe("JsonChild.of()", () => {
  test("finds the first application/json script child, and nothing else", () => {
    const host = Fixture.render(
      `<div><script type="text/plain">no</script><script type=" application/json ">{"label": "a"}</script>` +
        `<script type="application/json">{"label": "b"}</script></div>`
    )
    expect(JsonChild.textOf(host)).toBe('{"label": "a"}')
    expect(JsonChild.textOf(Fixture.render(`<div><p>{"label": "a"}</p></div>`))).toBeUndefined()
  })

  test("finds a `<ui-json>` child, in any language", () => {
    expect(JsonChild.of(Fixture.render(`<div><ui-json>1</ui-json></div>`))?.localName).toBe("ui-json")
    expect(JsonChild.of(Fixture.render(`<div><es-json>1</es-json></div>`))?.localName).toBe("es-json")
  })
})

describe("JsonChild.valueOf()", () => {
  test("parses a script child;  none, or blank text, is `undefined`", () => {
    const script = (text: string) => Fixture.render(`<div><script type="application/json">${text}</script></div>`)
    expect(JsonChild.valueOf(script('{"a": 1}'))).toEqual({ a: 1 })
    expect(JsonChild.valueOf(script("  "))).toBeUndefined()
    expect(JsonChild.valueOf(Fixture.render("<div></div>"))).toBeUndefined()
  })

  test("throws SyntaxError on invalid JSON", () => {
    const host = Fixture.render(`<div><script type="application/json">{nope}</script></div>`)
    expect(() => JsonChild.valueOf(host)).toThrow(SyntaxError)
  })
})
