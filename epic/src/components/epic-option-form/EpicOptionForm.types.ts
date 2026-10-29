/**
 * `<epic-option-form>` in JSX:  the tag the families that draw the form in their shadow roots write
 * (`<epic-choices>`' Add choice, `<epic-option>`'s pencil;  epic `epic-engine` P50).
 * - Types only.
 */
import type { EpicJSXAttributes } from "spell/epic/components/epic-page/EpicPage.types"

declare module "@solidjs/web/types/jsx.js" {
  namespace JSX {
    interface IntrinsicElements {
      "epic-option-form": EpicJSXAttributes
    }
  }
}
