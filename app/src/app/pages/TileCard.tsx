import { Show } from "solid-js"
import type { JSX } from "@solidjs/web"

import "./TileCard.css"

/****************
 * ### `<TileCard>`
 * A card:  a coloured tile with an initial (or a picture), a title, and a quiet line under it.
 * - The home page's cards, one per project or way to start (`<ProjectCards>`), and the site editor's, one per page
 *   (`<SiteEditorPage>`, epic `mockup` P4):  ONE card, drawn the same way in both.
 * - It's a link when it has an `href` (a project:  a middle click opens a tab), else a button.
 * - What a click does is its owner's:  `onClick`, `onDblClick`.
 ****************/
export function TileCard(props: TileCardProps) {
  const contents = () => (
    <>
      <Show
        when={props.picture}
        fallback={
          <span class="tile" style={{ "--TileCard-hue": TileCard.hueFor(props.hueFrom) }} aria-hidden="true">
            {props.title.charAt(0)}
          </span>
        }
      >
        <img class="picture" src={props.picture} alt="" />
      </Show>
      <span class="text">
        <span class="title">{props.title}</span>
        <Show when={props.line}>
          <span class="description">{props.line}</span>
        </Show>
      </span>
    </>
  )
  const classes = () => ["TileCard", "card", props.class, { selected: !!props.selected }]
  return (
    <Show
      when={props.href}
      fallback={
        <button
          type="button"
          class={classes()}
          aria-pressed={props.selected === undefined ? undefined : props.selected ? "true" : "false"}
          onClick={(event) => props.onClick?.(event)}
          onDblClick={(event) => props.onDblClick?.(event)}
        >
          {contents()}
        </button>
      }
    >
      <a
        class={classes()}
        href={props.href}
        onClick={(event) => props.onClick?.(event)}
        onDblClick={(event) => props.onDblClick?.(event)}
      >
        {contents()}
      </a>
    </Show>
  )
}

/** A hue, 0 to 359, worked out from `text`:  the same text always gets the same colour. */
TileCard.hueFor = (text: string): string => {
  let hash = 0
  for (const char of text) hash = (hash * 31 + char.charCodeAt(0)) % 360
  return `${hash}`
}

/** Props for `<TileCard>`. */
export type TileCardProps = {
  /** Its title, whose first letter its tile shows. */
  title: string
  /** The quiet line under its title. */
  line?: string
  /** What its tile's hue comes from:  a project's path, a page's name. */
  hueFrom: string
  /** A picture in place of its tile:  a page's screenshot. */
  picture?: string
  /** A link's address;  none:  it's a button. */
  href?: string
  /** It's the one picked. */
  selected?: boolean
  /** More classes, e.g. `empty`. */
  class?: string
  /** A click on it. */
  onClick?: (event: MouseEvent) => void
  /** A double click on it. */
  onDblClick?: (event: MouseEvent) => void
}

/** A card that holds no project or page:  "Loading...", "No examples yet!". */
export function EmptyCard(props: { children: JSX.Element }) {
  return <div class="TileCard card empty">{props.children}</div>
}
