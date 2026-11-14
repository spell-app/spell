import { Show } from "solid-js"
import type { JSX } from "@solidjs/web"

import { E } from "spell/ui/core"
import { containerVocabulary } from "./UIContainer.en"
// The grid family's vocabulary (pure data), for the inner grid's classes
import { gridVocabulary } from "spell/ui/components/ui-grid/UIGrid.en"

import gridCSS from "spell/ui/components/ui-grid/UIGrid.css?inline"
import containerCSS from "./UIContainer.css?inline"

/****************
 * ### `UIContainer`
 * The component behind `<ui-container>`:  a centred column of page width that holds a page's content.
 *
 * - Its shadow DOM is one box, `<div class="ui … container" part="container">`, around a slot for the content.
 * - `scrolling`:  the box is a keyboard stop (`tabindex=0`), as every scrollable region must be.
 * - `width`:  the box's width, a CSS length, through `--_container-set-width` and the class `set-width`
 *   (its rule in the sheet, centred and never wider than the page;  epic `language` T76).
 * - `columns`:  a grid box inside the container box, around the slot,
 *   `<div class="ui very compact seven column grid" part="grid">` (epic `language` T119).
 *   - Styled by the grid's OWN sheet, adopted here as is, so its children are cells exactly as in a
 *     `<ui-grid columns>`:  the same widths, gutters (`spacing`), tokens (`--ui-grid-*`) and stacking.
 *   - The grid's sheet comes FIRST, so the container's layers win where both style the DOM element (`:host`).
 *   - So the container box never carries `grid` or `column` class words (the vocabulary's header).
 * - `padding`, `size` and `inverted`:  a segment's, on the container box (`UIContainer.css`).
 ****************/
export class UIContainer extends E.UIComponent<typeof containerVocabulary> {
  @E.proto static vocabulary = containerVocabulary
  @E.protoMerged static elementSetup = {
    styleSheets: { grid: gridCSS, container: containerCSS }
  } satisfies Partial<E.ElementSetup>

  /** A width of its own (`width`):  the class its rule keys on. */
  protected override get extraClass(): string | undefined {
    return this.width ? SET_WIDTH : undefined
  }

  /** `columns` makes no class on the container box:  the inner grid's carry it (`gridClass`). */
  protected override classValue(name: E.AttributeName<typeof containerVocabulary>): unknown {
    return name === COLUMNS ? undefined : super.classValue(name)
  }

  /** With `columns`:  the inner grid box's classes, `ui very compact seven column grid`. */
  private get gridClass(): string | undefined {
    if (this.columns === undefined) return undefined
    return UIContainer.gridClassBuilder.build({ columns: this.columns, spacing: this.spacing })
  }

  /**
   * Builds the inner grid's classes:  the grid vocabulary narrowed to `columns` and `spacing`, noun `grid`.
   * - Static:  one per page, made on first use.
   */
  @E.lazy private static get gridClassBuilder(): E.ClassBuilder {
    return new E.ClassBuilder({
      ...gridVocabulary,
      attributes: gridVocabulary.attributes.filter(({ name }) => GRID_ATTRIBUTES.includes(name))
    })
  }

  render(): JSX.Element {
    return (
      <div
        class={this.rootClass}
        part={this.partForName("container")}
        tabindex={this.scrolling ? 0 : undefined}
        style={this.width ? { "--_container-set-width": this.width } : undefined}
      >
        <Show when={this.gridClass} fallback={<slot />}>
          {(gridClass) => (
            <div class={gridClass()} part={this.partForName("grid")}>
              <slot />
            </div>
          )}
        </Show>
      </div>
    )
  }
}

/** The vocabulary's attribute getters, typed (see "Attributes" in `UIComponent`). */
export interface UIContainer extends E.AttributeValues<typeof containerVocabulary> {}

/** The box's class while it has a width of its own:  `UIContainer.css` sizes it. */
const SET_WIDTH = "set-width"

/** The attribute that lays the children out as a grid. */
const COLUMNS = "columns"

/** The grid attributes the inner grid's classes are built from. */
const GRID_ATTRIBUTES: readonly string[] = [COLUMNS, "spacing"]
