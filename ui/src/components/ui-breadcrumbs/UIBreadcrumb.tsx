import { Show } from "solid-js"
import { isServer, type JSX } from "@solidjs/web"

import { E } from "spell-ui/core"
import { breadcrumbVocabulary } from "./UIBreadcrumb.en"

import breadcrumbCSS from "./UIBreadcrumbs.css?inline"

/****************
 * ### `UIBreadcrumb`
 * The component behind `<ui-breadcrumb>`:  one step of the trail.
 *
 * - Its shadow DOM is its own leading divider, `<span class="divider" part="divider" aria-hidden="true">`,
 *   then the section around the `<slot>`:
 *   - `selected`:  `<span class="active section" part="section" aria-current="page">`:
 *     the current page, never a link, even with `link`
 *   - `link`:  `<a class="section" part="section" href target>`
 *   - else `<span class="section" part="section">`
 * - The divider is empty:  `UIBreadcrumbs.css` draws the breadcrumb's divider tokens into it,
 *   and hides it on the first section.
 *
 * - The ELEMENT is `role=listitem` (through `internals`),
 *   so the breadcrumb's `<ol>` owns real list items through its slot.
 ****************/
export class UIBreadcrumb extends E.UIComponent<typeof breadcrumbVocabulary> {
  @E.proto static vocabulary = breadcrumbVocabulary
  @E.protoMerged static elementSetup = {
    styleSheets: { breadcrumb: breadcrumbCSS },
    cssStates: ["selected"],
    aria: { role: "listitem" }
  } satisfies Partial<E.ElementSetup>

  render(): JSX.Element {
    const content = (
      <>
        <span class={DIVIDER} part={this.partForName("divider")} aria-hidden="true" />
        <Show when={this.link && !this.selected} fallback={this.plainSection()}>
          <a class={this.rootClass} part={this.partForName("section")} href={this.link} target={this.target}>
            <slot />
          </a>
        </Show>
      </>
    )
    // a server render (`spell-ui/static`) has no element to be the list item:
    // ONE root, which the flattener makes the `<li>` --
    // the class grammar's semantic form, `<li><span class="divider"></span><a class="section">`
    return isServer ? <span>{content}</span> : content
  }

  /** The section as text:  the current page (`aria-current`), or a level without a link. */
  private plainSection(): JSX.Element {
    return (
      <span class={this.rootClass} part={this.partForName("section")} aria-current={this.selected ? "page" : undefined}>
        <slot />
      </span>
    )
  }
}

/** The vocabulary's attribute getters, typed (see "Attributes" in `UIComponent`). */
export interface UIBreadcrumb extends E.AttributeValues<typeof breadcrumbVocabulary> {}

/** The class and part of a section's own leading divider. */
const DIVIDER = "divider"
