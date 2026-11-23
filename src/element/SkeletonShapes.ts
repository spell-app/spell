import type { SkeletonPart, SkeletonSpec } from "./vocabulary.types"

/****************
 * ### `SkeletonShapes`
 * The `<ui-placeholder>` shapes a skeleton (`SkeletonSpec`) is drawn with, as plain data:  what `<ui-root
 * display="skeleton">` draws for a tag (Spell UI's `PlaceholderSkeleton`), and what a page draws while its data waits
 * (`loading="skeleton"`, Spell's `core.drawLooking()`).
 * - ONE way to turn a skeleton into shapes:  each drawer makes the elements its own way (the DOM, or `h()`).
 * - Pure data, page safe:  no DOM, no Spell UI import (its tags by name);  in the barrel's place by path,
 *   `spell/element/SkeletonShapes`, beside `SkeletonText`, which parses the text in node.
 * - Static:  pure work on a spec, no state.
 ****************/
export class SkeletonShapes {
  /**
   * The shapes inside a placeholder for `spec`:  its `parts`, top to bottom, or one block `width` x `height`.
   * - A block's height and the shapes' lengths go through the placeholder's public tokens and attributes.
   */
  static of(spec: SkeletonSpec): SkeletonShape[] {
    if (!spec.parts?.length) {
      const style = spec.height ? { [IMAGE_HEIGHT]: spec.height } : undefined
      return [{ tag: SKELETON_TAGS.image, ...(style && { style }) }]
    }
    return spec.parts.map((part) => SkeletonShapes.shape(part))
  }

  /** One part as a shape. */
  private static shape(part: SkeletonPart): SkeletonShape {
    switch (part.shape) {
      case "image":
        return { tag: SKELETON_TAGS.image, ...(part.ratio && { attributes: { [part.ratio]: "" } }) }
      case "header":
        return {
          tag: SKELETON_TAGS.header,
          ...(part.image && { attributes: { image: "" } }),
          children: SkeletonShapes.lines(HEADER_LINES)
        }
      case "paragraph":
        return { tag: SKELETON_TAGS.paragraph, children: SkeletonShapes.lines(part.lines ?? DEFAULT_LINES) }
      case "line":
        return { tag: SKELETON_TAGS.line, ...(part.length && { attributes: { length: part.length } }) }
    }
  }

  /** `count` lines. */
  private static lines(count: number): SkeletonShape[] {
    return Array.from({ length: count }, () => ({ tag: SKELETON_TAGS.line }))
  }
}

/** One shape of a skeleton, as an element to make:  its tag, attributes, custom properties and the shapes inside. */
export type SkeletonShape = {
  readonly tag: string
  readonly attributes?: Readonly<Record<string, string>>
  /** Custom properties, `--ui-placeholder-image-height`. */
  readonly style?: Readonly<Record<string, string>>
  readonly children?: readonly SkeletonShape[]
}

/** Spell UI's placeholder family, by name:  the box and its shapes. */
export const SKELETON_TAGS = {
  placeholder: "ui-placeholder",
  header: "ui-placeholder-header",
  paragraph: "ui-placeholder-paragraph",
  line: "ui-placeholder-line",
  image: "ui-placeholder-image"
} as const

/** Bars in a skeleton paragraph unless it says. */
const DEFAULT_LINES = 3

/** Bars in a skeleton header. */
const HEADER_LINES = 2

/** A part-less block's height, the placeholder image's public token. */
const IMAGE_HEIGHT = "--ui-placeholder-image-height"
