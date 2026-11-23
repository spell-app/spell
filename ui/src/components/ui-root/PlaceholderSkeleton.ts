// oxlint-disable-next-line spell-ui/no-solid-effect -- a static helper drawing plain DOM:  no members to decorate
import { createRenderEffect, type Accessor } from "solid-js"
import type { JSX } from "@solidjs/web"

import { E } from "spell/ui/core"
import { SkeletonShapes, type SkeletonShape } from "spell/element/SkeletonShapes"
import { placeholderVocabulary } from "spell/ui/components/ui-placeholder/UIPlaceholder.en"
import type { RootSkeleton } from "./UIRoot.types"

/****************
 * ### `PlaceholderSkeleton`
 * What `<ui-root display="skeleton">` draws while its components load:
 * one `<ui-placeholder>` per described element (`E.ComponentVocabulary.skeleton`),
 * in page order, stacked (inline ones side by side).
 * `UIRoot.Skeleton`, so an app swaps the look with one assignment or a subclass (`UIRoot.Skeleton = MySkeleton`).
 * - The `ui-placeholder` family is imported STATICALLY, by the root's barrel (`index.ts`):
 *   with `ui-loader`, the only families a root never loads on demand.
 *   Here, its box's vocabulary only;  the shapes inside come from `SkeletonShapes`, page-safe data shared with
 *   Spell's `loading="skeleton"`.
 * - Built with the DOM, not JSX:  Solid's JSX has no types for our tags.
 * - Sizes go through the placeholder's public tokens, so its own sheet draws them:
 *   `--ui-placeholder-max-width`, `--ui-placeholder-image-height`.
 * - The element's `size` scales its skeleton (`--ui-scale`), and `fluid` fills the width.
 * - Static:  an app swaps the CLASS (`UIRoot.Skeleton`), and it keeps no state of its own.
 ****************/
export class PlaceholderSkeleton {
  /** A `<div part>` holding a placeholder per skeleton, following `skeletons`. */
  static render(part: string, skeletons: Accessor<readonly RootSkeleton[]>): JSX.Element {
    const box = document.createElement("div")
    box.setAttribute("part", part)
    createRenderEffect(skeletons, (list) => {
      box.replaceChildren(...list.map((skeleton) => PlaceholderSkeleton.placeholder(skeleton)))
    })
    return box
  }

  /** The `<ui-placeholder>` standing for `element`. */
  static placeholder({ element, spec }: RootSkeleton): HTMLElement {
    const placeholder = PlaceholderSkeleton.create(placeholderVocabulary.tag)
    const style = placeholder.style
    const isFluid = E.Converters.boolean(element.getAttribute(FLUID), FLUID)
    if (isFluid) placeholder.setAttribute(FLUID, "")
    else if (spec.width) style.setProperty("--ui-placeholder-max-width", spec.width)
    const size = element.getAttribute(SIZE)
    if (size && size !== MEDIUM) style.setProperty("--ui-scale", `var(--ui-size-${size})`)
    if (spec.display === "inline") {
      style.display = "inline-block"
      style.verticalAlign = "top"
      style.marginInlineEnd = "0.5em"
      if (!isFluid && spec.width) style.width = spec.width
    }
    placeholder.append(...PlaceholderSkeleton.shapes(spec))
    return placeholder
  }

  /** The shapes inside:  `parts`, or one block `width` x `height` (`SkeletonShapes`, the one way a page draws them too). */
  private static shapes(spec: E.SkeletonSpec): HTMLElement[] {
    return SkeletonShapes.of(spec).map((shape) => PlaceholderSkeleton.made(shape))
  }

  /** `shape` as an element. */
  private static made(shape: SkeletonShape): HTMLElement {
    const element = PlaceholderSkeleton.create(shape.tag)
    for (const [name, value] of Object.entries(shape.attributes ?? {})) element.setAttribute(name, value)
    for (const [name, value] of Object.entries(shape.style ?? {})) element.style.setProperty(name, value)
    element.append(...(shape.children ?? []).map((child) => PlaceholderSkeleton.made(child)))
    return element
  }

  /** A new element named `tag`. */
  private static create(tag: string): HTMLElement {
    return document.createElement(tag)
  }
}

/** A class `UIRoot.Skeleton` accepts:  `PlaceholderSkeleton` or one shaped like it. */
export type RootSkeletonRenderer = Pick<typeof PlaceholderSkeleton, "render">

/** `fluid`:  read from the described element, set on its placeholder. */
const FLUID: E.AttributeName<typeof placeholderVocabulary> = "fluid"

/** `size`, read from the described element. */
const SIZE = "size"

/** The size that changes nothing. */
const MEDIUM = "medium"
