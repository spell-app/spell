import { assetUrl, IconBase, type Variant } from "./base"

declare const __SUFFIX__: string

/** URL -> SVG text, in memory:  one fetch per icon per bundle copy, however many elements draw it. */
const cache = new Map<string, Promise<string>>()

/** Candidate 3b:  `fetch` the SVG file, inline it as `<svg>`, keep the text in an in-memory cache. */
export class XIconFetch extends IconBase {
  protected async render(box: HTMLSpanElement, name: string, variant: Variant): Promise<void> {
    const url = assetUrl(`svg/${variant}/${name}.svg`)
    let text = cache.get(url)
    if (!text) {
      text = fetch(url).then((response) => {
        if (!response.ok) throw new Error(`${response.status} ${url}`)
        return response.text()
      })
      cache.set(url, text)
      text.catch(() => cache.delete(url))
    }
    box.innerHTML = await text
    box.querySelector("svg")?.setAttribute("aria-hidden", "true")
  }
}

customElements.define(`x-icon-fetch${__SUFFIX__}`, XIconFetch)
