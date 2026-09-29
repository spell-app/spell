import { Icons } from "$/icons"

import { IconBase, type Variant } from "./base"

declare const __SUFFIX__: string

/** Candidate 1, today:  `Icons.get()` from `src/icons` (chunked data, JS chunks Vite emits from the JSON). */
export class XIconToday extends IconBase {
  protected async render(box: HTMLSpanElement, name: string, variant: Variant): Promise<void> {
    const data = await Icons.get(name, variant)
    if (!data) throw new Error("unknown icon")
    box.replaceChildren(Icons.svg(data))
  }
}

customElements.define(`x-icon-today${__SUFFIX__}`, XIconToday)
