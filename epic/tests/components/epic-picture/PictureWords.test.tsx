import { afterEach, describe, expect, test } from "vite-plus/test"
import { render } from "@solidjs/web"

import { PictureWords } from "spell/epic/components/epic-picture/PictureWords"

import "spell/epic/components/epic-picture"

let dispose: (() => void) | undefined

afterEach(() => {
  dispose?.()
  document.querySelector("#strip")?.remove()
})

describe("PictureWords.stripOf()", () => {
  test("a picture's x hands its label to `remove`:  heard by the picture's own listener, not an `on-epic-*` prop", () => {
    const box = document.body.appendChild(Object.assign(document.createElement("div"), { id: "strip" }))
    const removed: string[] = []
    dispose = render(
      () => PictureWords.stripOf(
        () => "see ![IMG1](tests/a.png) and ![IMG2](tests/b.png)",
        (label) => removed.push(label)
      ),
      box
    )
    const pictures = box.querySelectorAll("epic-picture")
    expect(pictures).toHaveLength(2)
    pictures[1]!.dispatchEvent(new CustomEvent("epic-picture-removed", { detail: { label: "IMG2" } }))
    expect(removed).toEqual(["IMG2"])
  })
})
