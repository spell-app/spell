/**
 * The page layout family:  defines `<ui-page-layout>`, and exports its component.
 * - SIDE EFFECT:  importing it defines the tag, and the button it draws to show its drawer at a narrow width.
 * - Also the library's `spell/ui/ui-page-layout` entry.
 */

import { UIPageLayout } from "./UIPageLayout"

import "spell/ui/components/ui-button"

UIPageLayout.define()

export { UIPageLayout, DOMPageLayoutElement } from "./UIPageLayout"
