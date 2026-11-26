/**
 * What `<epic-bells>`' files share, and its route's shapes:  data and types only.
 */
import type { BellsValues, BellsView } from "spell/epic/bells"

import type { EpicJSXAttributes } from "spell/epic/components/epic-page/EpicPage.types"

import type { epicBellsVocabulary } from "./EpicBells.en"

/** Its vocabulary's type. */
export type EpicBellsVocabulary = typeof epicBellsVocabulary

/** A key of its words:  a step's key is one, and `<key>Sentence`. */
export type BellsTextKey = EpicBellsVocabulary["texts"][number]["key"]

/**
 * The page server's route for the switches (`epicRoutes`):
 * - `GET`:  answers a `BellsAnswer`
 * - `POST { values }`:  saves the settings' `bells` group as `values` says (`Bells.save()`), answers a `BellsAnswer`
 */
export const BELLS_API = "/api/epics/settings"

/** The route's answer. */
export type BellsAnswer = {
  /** the settings' `bells` group as merged now */
  values: BellsValues
  /** each step with whether it runs now, and why not */
  view: BellsView
}

// the tag its owner draws in its shadow root
declare module "@solidjs/web/types/jsx.js" {
  namespace JSX {
    interface IntrinsicElements {
      "epic-bells": EpicJSXAttributes
    }
  }
}
