/**
 * The English vocabulary of `<ui-page>`:  every name the tag uses.
 * - A page is a ROOT (`UIRoot`):  its whole vocabulary is `<ui-root>`'s names, then these.
 * - The page frame (epic `ui-gaps` P10):  header, nav, main content, aside and footer, each the landmark screen
 *   readers jump between, for a drawing, which holds no native HTML.
 * - Pure data:  node reads it (`yarn site:data`, `yarn gen:root`).
 */

import type { E } from "spell/ui/core"
import { rootVocabulary } from "spell/ui/components/ui-root/UIRoot.en"

/****************
 * ### `pageOwnVocabulary`
 * The names `<ui-page>` adds to a root's.
 ****************/
const pageOwnVocabulary = {
  tag: "ui-page",
  topics: ["layout", "containers", "navigation"],
  aka: ["page", "app shell", "body", "layout", "frame", "landmarks", "holy grail layout"],
  noun: "page",
  description:
    "A page frames a whole window:  a header, navigation, the main content, a side column and a footer, each a " +
    "landmark screen readers jump between.  It's a root too:  it loads the components inside it.",
  slots: [
    { name: "", description: "The main content (`<main>`)." },
    { name: "header", description: "The page's header, across the top (`<header>`):  a title, a logo, a search." },
    { name: "nav", description: "The site's navigation (`<nav>`):  a column beside the content, on the start side." },
    { name: "aside", description: "Related content (`<aside>`):  a column on the end side." },
    { name: "footer", description: "The page's footer, across the bottom (`<footer>`)." }
  ],
  parts: [
    { name: "page", description: "The grid of regions." },
    { name: "skip", description: 'The "Skip to content" link, shown only while it has the keyboard\'s focus.' },
    { name: "header", description: "The header region." },
    { name: "nav", description: "The navigation region." },
    { name: "main", description: "The main content region." },
    { name: "aside", description: "The side region." },
    { name: "footer", description: "The footer region." }
  ],
  texts: [{ key: "skip", text: "Skip to content", description: "The first link of the page, for keyboards." }]
} as const

/****************
 * ### `pageVocabulary`
 * `<ui-page>`'s whole vocabulary:  a root's names, then its own.
 ****************/
export const pageVocabulary = {
  ...rootVocabulary,
  ...pageOwnVocabulary,
  slots: pageOwnVocabulary.slots,
  parts: [...rootVocabulary.parts, ...pageOwnVocabulary.parts],
  texts: [...rootVocabulary.texts, ...pageOwnVocabulary.texts]
} as const satisfies E.ComponentVocabulary
