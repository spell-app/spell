/**
 * `<epic-kickoff>` in JSX:  the tag `<epic-overview>` draws in its shadow root while the epic has no kickoff prompt
 * (epic `epic-engine` P75).
 * - Types only.
 */
import type { EpicJSXAttributes } from "spell/epic/components/epic-page/EpicPage.types"

declare module "@solidjs/web/types/jsx.js" {
  namespace JSX {
    interface IntrinsicElements {
      "epic-kickoff": EpicJSXAttributes
    }
  }
}
