import { afterEach, describe, expect, test, vi } from "vite-plus/test"
import { flush } from "solid-js"
import { render, type JSX } from "@solidjs/web"

import { LazyPiece } from "spell/app/app/solid/LazyPiece"

/** What a test drew, removed after it. */
const cleanups: (() => void)[] = []

afterEach(() => {
  for (const cleanup of cleanups.splice(0)) cleanup()
  vi.restoreAllMocks()
})

/** A view module that resolves when the test says:  `arrive()`. */
function slowModule() {
  let arrive!: () => void
  const arrived = new Promise<void>((resolve) => (arrive = resolve))
  const importer = vi.fn(async () => {
    await arrived
    return { Greeting: (props: { name: string }): JSX.Element => <p class="Greeting">Hi {props.name}</p> }
  })
  return { importer, arrive }
}

/** Draw `component` in a host on the page. */
function draw(component: () => JSX.Element): HTMLElement {
  const host = document.body.appendChild(document.createElement("div"))
  const dispose = render(component, host)
  cleanups.push(() => {
    dispose()
    host.remove()
  })
  flush()
  return host
}

describe("LazyPiece", () => {
  test("a view shows a loader until its module is in, then the view;  the module loads once", async () => {
    const { importer, arrive } = slowModule()
    const piece = new LazyPiece(importer)
    const Greeting = piece.view("Greeting")
    const host = draw(() => <Greeting name="Owen" />)
    expect(host.querySelector("ui-loader.LazyPieceLoading")).not.toBeNull()
    expect(host.querySelector(".Greeting")).toBeNull()
    arrive()
    await piece.load()
    await vi.waitFor(() => expect(host.querySelector(".Greeting")?.textContent).toBe("Hi Owen"))
    expect(host.querySelector("ui-loader")).toBeNull()
    expect(importer).toHaveBeenCalledOnce()
  })

  test("once the module is in, a view draws at once, no loader", async () => {
    const { importer, arrive } = slowModule()
    const piece = new LazyPiece(importer)
    arrive()
    await piece.load()
    expect(piece.module).toBeDefined()
    const Greeting = piece.view("Greeting")
    const host = draw(() => <Greeting name="you" />)
    expect(host.querySelector(".Greeting")?.textContent).toBe("Hi you")
    expect(host.querySelector("ui-loader")).toBeNull()
  })

  test("`ahead` starts the load when what opens it is pressed, before it's drawn", async () => {
    const { importer, arrive } = slowModule()
    const piece = new LazyPiece(importer)
    const button = document.body.appendChild(document.createElement("button"))
    cleanups.push(() => button.remove())
    piece.ahead(button)
    expect(importer).not.toHaveBeenCalled()
    button.dispatchEvent(new PointerEvent("pointerdown"))
    expect(importer).toHaveBeenCalledOnce()
    arrive()
    await piece.load()
    expect(importer).toHaveBeenCalledOnce()
  })
})
