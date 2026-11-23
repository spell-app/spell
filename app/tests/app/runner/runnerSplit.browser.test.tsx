import { afterEach, describe, expect, test } from "vite-plus/test"
import { createSignal, flush } from "solid-js"
import { render } from "@solidjs/web"

import { ElementFixture } from "spell/test-helpers/ElementFixture"
import { uiReady } from "spell/app/app/solid"
import { runnerSplit } from "spell/app/app/runner/RunnerPane"

let cleanup: (() => void) | undefined

afterEach(() => {
  cleanup?.()
  cleanup = undefined
})

describe("runnerSplit()", () => {
  test("its panel's `ui-changed` (its own, not a control's inside) hands back the split;  once each, as `split` changes", async () => {
    await uiReady
    const host = document.body.appendChild(document.createElement("div"))
    const [split, setSplit] = createSignal(60)
    const heard: number[] = []
    const dispose = render(
      () => (
        <ui-split-panel {...runnerSplit(split(), "%", (value) => heard.push(value))}>
          <div class="control">a</div>
          <div>b</div>
        </ui-split-panel>
      ),
      host
    )
    cleanup = () => {
      dispose()
      host.remove()
    }
    flush()
    await ElementFixture.settle(host)
    const panel = host.querySelector("ui-split-panel")!
    const send = (target: Element, sizes: string) =>
      target.dispatchEvent(new CustomEvent("ui-changed", { detail: { sizes }, bubbles: true }))
    send(panel, "40%,60%")
    expect(heard).toEqual([40])
    // a control's own `ui-changed`, bubbling up through the panel:  no split
    send(panel.querySelector(".control")!, "10%,90%")
    expect(heard).toEqual([40])
    // the split changes:  the spread puts its new listener in place of the old one, never beside it
    setSplit(40)
    flush()
    send(panel, "30%,70%")
    expect(heard).toEqual([40, 30])
  })
})
