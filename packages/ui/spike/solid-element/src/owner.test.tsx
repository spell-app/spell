/*!
 * @spell/solid-element -- MIT licence.
 * A fork of `@solidjs/element` and `component-register` (MIT, (c) Ryan Carniato).
 */

/** FIX 8:  the owner lookup crosses shadow roots. */

import { createContext, getOwner, useContext } from "solid-js"
import { render } from "@solidjs/web"
import { afterEach, describe, expect, it } from "vitest"

import { lookupOwner } from "./owner"
import { cleanup, mount, nextTag, reproduce } from "./testing"

describe("fix 8:  owner lookup across shadow roots", () => {
  afterEach(cleanup)

  reproduce(
    "an element created without JSX inside another element's shadow root sees the page's context",
    ({ customElement }) => {
      const Theme = createContext("missing")
      const outerTag = nextTag("outer")
      const innerTag = nextTag("inner")
      customElement(innerTag, {}, () => <span>{useContext(Theme)}</span>)
      customElement(outerTag, {}, () => <div />)
      /** The outer element, stamped as Solid's compiler stamps a custom element written in JSX. */
      function Outer() {
        const outer = document.createElement(outerTag) as HTMLElement & { _$owner?: unknown }
        outer._$owner = getOwner()!
        return outer
      }
      const root = mount()
      const dispose = render(
        () => (
          <Theme value="dark">
            <Outer />
          </Theme>
        ),
        root
      )
      const outer = root.querySelector(outerTag)! as HTMLElement & { _$owner?: unknown }
      // content arriving LATER, outside any render (a lazy template, `innerHTML`):  no `_$owner` stamp on it, and
      // no Solid owner current while it connects
      outer.shadowRoot!.querySelector("div")!.innerHTML = `<${innerTag}></${innerTag}>`
      const text = outer.shadowRoot!.querySelector(innerTag)!.shadowRoot!.textContent
      dispose()
      return { stamped: outer._$owner !== undefined, text }
    },
    { original: { stamped: true, text: "missing" }, fork: { stamped: true, text: "dark" } }
  )

  it("fork:  the walk never reads `host` off a non-ShadowRoot node (`<a>.host` is a URL part)", () => {
    const anchor = document.createElement("a")
    anchor.href = "https://example.com/"
    const child = document.createElement("span")
    anchor.append(child)
    expect(lookupOwner(child)).toBeUndefined()
  })
})
