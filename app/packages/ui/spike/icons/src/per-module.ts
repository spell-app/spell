import { assetUrl, IconBase, type Variant } from "./base"

declare const __SUFFIX__: string

/** One icon module:  `export default [width, height, path]`. */
type IconModule = { default: [number, number, string] }

/**
 * Candidate 2:  one ES module per icon, URL computed from the (already canonical) name.
 * - No name -> loader index:  the module system is the cache (a module URL evaluates once per page, even from
 *   two bundles) and the HTTP cache is the persistent one.
 */
export class XIconModule extends IconBase {
  protected async render(box: HTMLSpanElement, name: string, variant: Variant): Promise<void> {
    const module = (await import(/* @vite-ignore */ assetUrl(`icons/${variant}/${name}.js`))) as IconModule
    const [width, height, path] = module.default
    box.innerHTML = IconBase.svgString(width, height, path)
  }
}

customElements.define(`x-icon-module${__SUFFIX__}`, XIconModule)
