import { Show } from "solid-js"
import { Dynamic, type JSX } from "@solidjs/web"

import { E, UIT } from "spell/ui/core"
import { headerVocabulary } from "./UIHeader.en"

/****************
 * ### `UIHeader`
 * The component behind `<ui-header>`:  a header, which is two things in one.
 *
 * - STANDALONE:  Fomantic's `ui header`, in the class grammar (`ui large red dividing header`):
 *   - on a `<div>`;
 *   - on `<h1>` ... `<h6>` with `level` (a page header, sized by its level unless `size` is set);
 *   - on `<a>` with `link`.
 * - OWNED (in a card, a modal ... or another header, whose sub header it then is):
 *   a bare `.header`, never `ui`, as Fomantic's `.ui.card > .content > .header`.
 * - `level` makes a real heading.  A linked heading is `<a role="heading" aria-level>`,
 *   since the link carries the class grammar.
 * - It is an OWNER too (`ownsParts:  header, content`):  a `<ui-header>` or `<ui-content>` inside it belongs to it.
 * - `icon` is two things, by whether it names one:
 *   - `icon="gear"`:  that glyph, drawn before the text
 *   - bare:  the `icon` class, Fomantic's icon header, its slotted icon large and centred above the text
 ****************/
export class UIHeader extends E.PartComponent<typeof headerVocabulary> {
  @E.proto static vocabulary = headerVocabulary
  @E.protoMerged static elementSetup = {
    // `disabled`:  only a look
    disabled: "its own"
  } satisfies Partial<E.ElementSetup>

  /** The glyph of a named `icon`;  bare `icon` is a layout, and has none. */
  readonly iconGlyph = new E.IconGlyph({ owner: this, name: () => this.icon })

  render(): JSX.Element {
    return (
      <Dynamic
        component={this.rootTag}
        class={this.rootClass}
        part={this.partForName("header")}
        href={this.linkTo}
        target={this.linkTarget}
        role={this.link && this.level ? "heading" : undefined}
        aria-level={this.link ? this.level : undefined}
      >
        <Show when={this.icon}>
          <span class={UIT.ICON_CLASS} part={this.partForName("icon")}>
            {this.iconGlyph.svg}
          </span>
        </Show>
        <slot />
      </Dynamic>
    )
  }

  /** `<a>` for `link`, `<hN>` for `level`, else `<div>`. */
  protected get rootTag(): string {
    if (this.link) return "a"
    const level = this.level ? (Number(this.level) as UIT.HeaderLevel) : undefined
    return level ? `h${level}` : "div"
  }

  /** Bare `icon`:  an icon header. */
  protected get extraClass(): string | undefined {
    return this.icon === "" ? UIT.ICON_CLASS : undefined
  }

  /** Standalone:  the class grammar;  owned:  the bare noun. */
  get rootClass(): string {
    return this.context.ownerNoun ? this.vocabulary.noun : super.rootClass
  }
}

/** The vocabulary's attribute getters, typed (see "Attributes" in `UIComponent`). */
export interface UIHeader extends E.AttributeValues<typeof headerVocabulary> {}
