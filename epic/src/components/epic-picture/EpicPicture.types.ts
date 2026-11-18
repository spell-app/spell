/**
 * `<epic-picture>` in JSX:  the tag the families that draw typed words with pictures in their shadow roots write
 * (`PictureWords`, epic `epic-engine` P75:  `<epic-thread>`, `<epic-review>`, `<epic-choices>`, `<epic-kickoff>`).
 * - Types only.
 */
import type { EpicJSXAttributes } from "spell/epic/components/epic-page/EpicPage.types"

declare module "@solidjs/web/types/jsx.js" {
  namespace JSX {
    interface IntrinsicElements {
      "epic-picture": EpicJSXAttributes
    }
  }
}
