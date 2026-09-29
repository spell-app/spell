import { assetUrl, IconBase, type Variant } from "./base"

declare const __SUFFIX__: string

/** URL -> callbacks waiting for its Resource Timing entry (mask images expose no load event). */
const waiting = new Map<string, (() => void)[]>()
/** URLs whose entry already arrived. */
const seen = new Set<string>()

const observer = new PerformanceObserver((list) => {
  for (const entry of list.getEntries()) {
    seen.add(entry.name)
    for (const done of waiting.get(entry.name) ?? []) done()
    waiting.delete(entry.name)
  }
})
observer.observe({ type: "resource", buffered: true })

/** Resolves once the browser finished fetching `url` (Resource Timing), or after 3 s. */
function loaded(url: string): Promise<void> {
  if (seen.has(url)) return Promise.resolve()
  return new Promise((resolve) => {
    const list = waiting.get(url) ?? []
    list.push(resolve)
    waiting.set(url, list)
    setTimeout(resolve, 3000)
  })
}

/**
 * Candidate 3a:  one SVG file per icon as a CSS mask.
 * - Zero JS beyond `--x-icon: url(...)`;  the browser fetches, decodes and caches the file.
 * - NOTE: the mask sits on an inner `<span class="glyph">`, not the contract's root span or an `<svg>`:  a mask
 *   on the root would also clip its `circular` / `bordered` / `inverted` background.
 * - Painted time is approximated:  Resource Timing `responseEnd` of the file, then two frames.
 */
export class XIconMask extends IconBase {
  protected async render(box: HTMLSpanElement, name: string, variant: Variant): Promise<void> {
    const url = assetUrl(`svg/${variant}/${name}.svg`)
    const glyph = document.createElement("span")
    glyph.className = "glyph"
    glyph.setAttribute("aria-hidden", "true")
    glyph.style.setProperty("--x-icon", `url("${url}")`)
    box.replaceChildren(glyph)
    await loaded(url)
  }
}

customElements.define(`x-icon-mask${__SUFFIX__}`, XIconMask)
