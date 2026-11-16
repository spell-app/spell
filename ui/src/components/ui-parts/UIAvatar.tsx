import { Show } from "solid-js"
import type { JSX } from "@solidjs/web"

import { E } from "spell/ui/core"
import { avatarVocabulary } from "./UIAvatar.en"

/****************
 * ### `UIAvatar`
 * The component behind `<ui-avatar>`:  a small picture of a person,
 * `<span class="avatar"><img part="image" alt=""></span>` from `src`, else the default slot (a slotted `<img>`).
 *
 * - `tooltip` is the picture's tooltip and its `alt`, by default `""`:  the person's name is almost always right next to it.
 * - On its own, it's a circle:  its picture, else its text, the person's initial, on the theme's primary colour
 *   (`UIParts.css`;  a top bar's "you", epic `mockup` I22).
 * - With a `link` it's a real link, `<a class="avatar">`, that Tab reaches, named by its `tooltip`.
 ****************/
export class UIAvatar extends E.PartComponent<typeof avatarVocabulary> {
  @E.proto static vocabulary = avatarVocabulary
  @E.protoMerged static elementSetup = { link: "its own" } satisfies Partial<E.ElementSetup>

  protected get rootTag(): string {
    return this.linkTo ? "a" : "span"
  }

  /** A link's name:  its `tooltip`, as its text may be only an initial. */
  protected get rootLabel(): string | undefined {
    return this.linkTo ? this.tooltip : undefined
  }

  protected content(): JSX.Element {
    return (
      <Show when={this.src} fallback={<slot />}>
        <img src={this.src} alt={this.tooltip ?? ""} title={this.tooltip} part={this.partForName("image")} />
      </Show>
    )
  }
}

/** The vocabulary's attribute getters, typed (see "Attributes" in `UIComponent`). */
export interface UIAvatar extends E.AttributeValues<typeof avatarVocabulary> {}
