/**
 * Tests of `LoadableBody`'s hand-in:  an owner with its own way to load a body's text (`LoadableBodyOwner.loadText()`).
 * What it does with `UI.sources` is tested through its owners (`UISection.test.tsx`, `UIAccordion.test.tsx`).
 */
import { afterEach, beforeAll, describe, expect, test, vi } from "vite-plus/test"

import { E, UI } from "spell/ui/core"

/** A plain owner of a `LoadableBody`, on `source`, its events kept;  `loadText` as given. */
function ownerOf(loadText?: E.LoadableBodyOwner["loadText"], source = "/body.html") {
  const domElement = document.body.appendChild(document.createElement("div"))
  const events: string[] = []
  const owner: E.LoadableBodyOwner = {
    domElement,
    source: () => source,
    select: () => undefined,
    target: () => domElement,
    send: (name) => {
      events.push(name)
      return true
    },
    ...(loadText && { loadText })
  }
  return { body: new E.LoadableBody(owner), domElement, events }
}

describe("LoadableBody, handed what loads its text", () => {
  beforeAll(async () => {
    await UI.load()
  })

  afterEach(() => {
    document.body.replaceChildren()
    vi.restoreAllMocks()
    UI.sources.forget()
  })

  test("takes its text from the owner, with no `UI.sources`:  `fresh` says which", async () => {
    const sources = vi.spyOn(UI.sources, "load")
    const asked: boolean[] = []
    const { body, domElement, events } = ownerOf(async (_source, { fresh }) => {
      asked.push(fresh)
      return `<p>${asked.length}</p>`
    })
    await body.load()
    expect(domElement.textContent).toBe("1")
    await body.reload()
    expect(domElement.textContent).toBe("2")
    expect(asked).toEqual([false, true])
    expect(sources).not.toHaveBeenCalled()
    expect(events).toContain(E.SourceEvent.loaded)
  })

  test("`undefined` for this source:  `UI.sources`, as if it had none", async () => {
    const sources = vi.spyOn(UI.sources, "load").mockResolvedValue({ url: "/body.html", text: "<p>from sources</p>" })
    const { body, domElement } = ownerOf(() => undefined)
    await body.load()
    expect(domElement.textContent).toBe("from sources")
    expect(sources).toHaveBeenCalledOnce()
  })

  test("a newer load aborts the older, whose answer is moot;  the old body stays up until the new one's in", async () => {
    const signals: AbortSignal[] = []
    const { body, domElement } = ownerOf((_source, { signal, fresh }) => {
      signals.push(signal)
      if (fresh) return Promise.resolve("<p>newest</p>")
      return new Promise((_resolve, reject) => signal.addEventListener("abort", () => reject(signal.reason)))
    })
    const first = body.load()
    await body.reload()
    expect(signals[0]!.aborted).toBe(true)
    expect(signals[1]!.aborted).toBe(false)
    await first
    expect(domElement.textContent).toBe("newest")
    expect(body.loadStatus).toBe(E.SourceStatus.loaded)
  })

  test("a failure of its own is the body's failure, and the next load tries again", async () => {
    let fails = true
    const { body, domElement, events } = ownerOf(async () => {
      if (fails) throw new E.SourceError("nope", { cause: { kind: "load", status: 404 } })
      return "<p>back</p>"
    })
    await expect(body.load()).rejects.toThrow("nope")
    expect(body.loadStatus).toBe(E.SourceStatus.error)
    expect(body.loadError?.kind).toBe("load")
    expect(events).toContain(E.SourceEvent.error)
    fails = false
    await body.load()
    expect(domElement.textContent).toBe("back")
    expect(body.loadError).toBeUndefined()
  })
})
