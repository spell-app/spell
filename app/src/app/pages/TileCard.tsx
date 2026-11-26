import { Show, untrack } from "solid-js"
import type { JSX } from "@solidjs/web"

import { EditableText } from "./EditableText"
import { HomeArrangement } from "./HomeArrangement"

import "./TileCard.css"

/****************
 * ### `<TileCard>`
 * A card:  a coloured tile with an initial (or a picture), a title, and a quiet line under it.
 * - The home page's cards, one per project or way to start (`<ProjectCards>`), and the site editor's, one per page
 *   (`<SiteEditorPage>`, epic `mockup` P4):  ONE card, drawn the same way in both.
 * - It's a link when it has an `href` (a project:  a middle click opens a tab), else a button.
 * - What a click does is its owner's:  `onClick`, `onDblClick`.
 * - `drag`:  its owner's drag and drop, to move it among its row (the home page, in dev);  none:  a link drags as usual.
 * - `banner`:  its picture (or its tile) across its top, the text under it:  the home page's rows of examples,
 *   each a picture of its app running (epic `mockup` P18).
 * - `edit`:  its title and line changed where they are, the home page rearranged (epic `mockup` T51):
 *   it's neither a link nor a button then, so a click lands in its text, and only dragging moves it.
 * - `menu`:  a "..." menu at the left end of its text, on its title's line, the text moved over for it
 *   (epic `mockup` T47, I49):  a sibling of the card, not inside it, so a click on it never reaches the card's link.
 ****************/
export function TileCard(props: TileCardProps) {
  // read once:  a card has its menu for good, and its JSX is made once
  const menu = untrack(() => props.menu)
  if (!menu) return card()
  return (
    <div class="TileCardHolder">
      {card()}
      <div class="TileCardMenu">{menu}</div>
    </div>
  )

  /** The card itself:  a link, or a button. */
  function card() {
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
        <Show
          when={props.edit}
          fallback={
            <span class="text">
              <span class="title">
                {props.title}
                <Show when={props.badge}>
                  <ui-label class="badge" size="small" appearance="basic">
                    {props.badge}
                  </ui-label>
                </Show>
              </span>
              <Show when={props.line}>
                <span class="description">{props.line}</span>
              </Show>
            </span>
          }
        >
          {(edit) => (
            <span class="text">
              <EditableText
                class="title"
                value={props.title}
                label={edit().titleLabel}
                onSave={(text) => edit().onTitle(text)}
              />
              <EditableText
                class="description"
                value={props.line ?? ""}
                label={edit().lineLabel}
                placeholder={edit().lineLabel}
                limit={edit().lineLimit}
                onSave={(text) => edit().onLine(text)}
              />
            </span>
          )}
        </Show>
      </>
    )
    const classes = () => [
      "TileCard",
      "card",
      props.class,
      {
        selected: !!props.selected,
        banner: !!props.banner,
        dragging: !!props.drag?.dragging,
        "drop-here": !!props.drag?.dropHere
      }
    ]
    // being rearranged:  a plain box, dragged unless its text is being typed in
    if (untrack(() => props.edit)) {
      return (
        <div
          class={classes()}
          draggable={props.drag && !HomeArrangement.isEditingText ? "true" : undefined}
          onDragStart={(event) => props.drag?.onStart(event)}
          onDragOver={(event) => props.drag?.onOver(event)}
          onDragLeave={(event) => props.drag?.onLeave(event)}
          onDrop={(event) => props.drag?.onDrop(event)}
          onDragEnd={(event) => props.drag?.onEnd(event)}
        >
          {contents()}
        </div>
      )
    }
    return (
      <Show
        when={props.href}
        fallback={
          <button
            type="button"
            class={classes()}
            draggable={props.drag ? "true" : undefined}
            onDragStart={(event) => props.drag?.onStart(event)}
            onDragOver={(event) => props.drag?.onOver(event)}
            onDragLeave={(event) => props.drag?.onLeave(event)}
            onDrop={(event) => props.drag?.onDrop(event)}
            onDragEnd={(event) => props.drag?.onEnd(event)}
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
          draggable={props.drag ? "true" : undefined}
          onDragStart={(event) => props.drag?.onStart(event)}
          onDragOver={(event) => props.drag?.onOver(event)}
          onDragLeave={(event) => props.drag?.onLeave(event)}
          onDrop={(event) => props.drag?.onDrop(event)}
          onDragEnd={(event) => props.drag?.onEnd(event)}
          href={props.href}
          onClick={(event) => props.onClick?.(event)}
          onDblClick={(event) => props.onDblClick?.(event)}
        >
          {contents()}
        </a>
      </Show>
    )
  }
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
  /** A small label after its title:  a group's own page's, "Group page" (epic `editor` P47). */
  badge?: string
  /** What its tile's hue comes from:  a project's path, a page's name. */
  hueFrom: string
  /** A picture in place of its tile:  a page's screenshot. */
  picture?: string
  /** Its picture (or tile) across its top, big, the text under it;  default:  small, beside the text. */
  banner?: boolean
  /** Dragging it among its row:  its owner's handlers, and how it shows now. */
  drag?: TileCardDrag
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
  /**
   * Its title and line changed where they are:  the home page, rearranged (epic `mockup` T51).
   * - Read once, as it mounts:  the caller remounts it to change between the two.
   */
  edit?: TileCardEdit
  /** A "..." menu at the left end of its text, on its title's line:  the home page's own projects' (`<CardMenu>`). */
  menu?: JSX.Element
}

/** `<TileCard>`'s words, changed where they are:  its owner keeps them. */
export type TileCardEdit = {
  /** Its title, typed:  `""` puts its own back. */
  onTitle: (text: string) => void
  /** Its line, typed:  `""` puts its own back. */
  onLine: (text: string) => void
  /** What each is, for a screen reader;  the line's is its placeholder too. */
  titleLabel: string
  lineLabel: string
  /** The most characters its line shows whole:  past it, marked.  Default:  no limit. */
  lineLimit?: number
}

/** `<TileCard>`'s drag and drop:  its owner does the moving, the card shows it. */
export type TileCardDrag = {
  /** It's the card being dragged:  drawn faint. */
  dragging: boolean
  /** A dragged card would drop before it:  marked on its leading edge. */
  dropHere: boolean
  /** Its drag starts. */
  onStart: (event: DragEvent) => void
  /** A drag is over it:  call `preventDefault()` to take the drop. */
  onOver: (event: DragEvent) => void
  /** A drag left it. */
  onLeave: (event: DragEvent) => void
  /** Something was dropped on it. */
  onDrop: (event: DragEvent) => void
  /** Its own drag ended, dropped or not. */
  onEnd: (event: DragEvent) => void
}

/** A card that holds no project or page:  "Loading...", "No examples yet!". */
export function EmptyCard(props: { children: JSX.Element }) {
  return <div class="TileCard card empty">{props.children}</div>
}
