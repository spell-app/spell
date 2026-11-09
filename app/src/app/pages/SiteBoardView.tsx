import { For, Show, createMemo } from "solid-js"

import { Dragging } from "spell/util/Dragging"
import type { UICardJSXAttributes } from "spell/ui/jsx"
import { SiteBoard, type BoardCard, type BoardSection } from "./SiteBoard"
import { SiteEdits, type SitePart } from "./SiteEdits"
import { SiteWrites } from "./SiteWrites"

import "./SiteBoardView.css"

/****************
 * ### `<SiteBoardView>`
 * The site editor's board:  a block per section, one under the other, each a grid of `<ui-card>`s (`SiteBoard`).
 * - A card takes its section's colour (`<ui-card background>`);  a page's is rounded, a dialog's square,
 *   a section's bold and bigger;  a page's screenshot on top, when its line names one.
 * - A click picks a card, a double click opens it:  `onPick`, `onOpen`.
 * - A page's card has a link in its corner, to that page of the running site in a new tab:  `newTabUrlOf`.
 * - Moving, with the kit's `Dragging`, each ONE step of the editor's history (`SiteWrites`):
 *   - a section's card:  the whole section, before or after another, a line showing where
 *   - any other card:  to a spot of its own section or another, the spot lit up
 *   - Escape, or a drop anywhere else, moves nothing;  and a press that doesn't move is still a click.
 * - Each spot is an element behind the cards, in the same grid:  so what's under the pointer says where it would land.
 * - NOT `<TileCard>`:  that's the home page's, which keeps its letter tiles.
 ****************/
export function SiteBoardView(props: SiteBoardViewProps) {
  const sections = createMemo(() => SiteBoard.sectionsOf(props.parts))
  return (
    <div class="SiteBoard">
      <For each={sections()} keyed={(section) => section.key}>
        {(section) => (
          <section class="SiteSection" data-section={section().key} data-headed={section().head ? "" : undefined}>
            <For each={SiteBoard.spotsOf(section())} keyed={(spot) => `${spot.row}:${spot.column}`}>
              {(spot) => (
                <div
                  class={["spot", { "extra-row": spot().isExtraRow, "extra-column": spot().isExtraColumn }]}
                  data-row={spot().row}
                  data-column={spot().column}
                  style={{ "grid-row": spot().row, "grid-column": spot().column }}
                />
              )}
            </For>
            <For each={section().cards} keyed={(card) => card.part.name}>
              {(card) => <SiteCard {...props} card={card()} section={section()} />}
            </For>
          </section>
        )}
      </For>
    </div>
  )
}

/** One card of `<SiteBoardView>`:  a press on it may start moving it. */
function SiteCard(props: SiteBoardViewProps & { card: BoardCard; section: BoardSection }) {
  const part = () => props.card.part
  return (
    <ui-card
      class={[
        "SiteCard",
        `kind-${part().kind}`,
        { section: props.card.isSectionCard, selected: props.picked === part().name }
      ]}
      data-part={part().name}
      background={props.card.color as UICardJSXAttributes["background"]}
      image={props.pictureOf(part())}
      heading={props.titleOf(part())}
      description={props.lineOf(part())}
      title={props.lineOf(part())}
      style={{ "--SiteCard-row": props.card.row, "--SiteCard-column": props.card.column }}
      onClick={() => props.onPick(part().name)}
      onDblClick={() => props.onOpen(part().name)}
      onPointerDown={(event: PointerEvent) => startMove(event, props.card, props.section)}
    >
      <Show when={props.newTabUrlOf(part())}>
        {(url) => (
          <a
            class="new-tab"
            href={url()}
            target="_blank"
            title={props.newTabLabel}
            aria-label={props.newTabLabel}
            onClick={(event: MouseEvent) => event.stopPropagation()}
            onDblClick={(event: MouseEvent) => event.stopPropagation()}
            onPointerDown={(event: PointerEvent) => event.stopPropagation()}
          >
            <ui-icon name="up right from square" />
          </a>
        )}
      </Show>
    </ui-card>
  )
}

/** Props for `<SiteBoardView>`. */
export type SiteBoardViewProps = {
  /** The site's parts, nested as it nests them. */
  parts: readonly SitePart[]
  /** The name of the part picked, if any. */
  picked?: string
  /** What a part's card says. */
  titleOf: (part: SitePart) => string
  /** The quiet line under its title. */
  lineOf: (part: SitePart) => string
  /** The address of its picture, if it has one. */
  pictureOf: (part: SitePart) => string | undefined
  /** The address that opens a part in a new tab:  none for what has no page of its own. */
  newTabUrlOf: (part: SitePart) => string | undefined
  /** What that link says, to a tooltip and a screen reader. */
  newTabLabel: string
  /** A click on part `name`'s card. */
  onPick: (name: string) => void
  /** A double click on it. */
  onOpen: (name: string) => void
}

/** The attribute on the board while a card is being moved, showing every spot. */
const MOVING = "data-moving"

/** The attribute on the section the moving card is over, showing its one more row. */
const OPENED = "data-open"

/** The attribute on the card being moved. */
const BEING_MOVED = "data-being-moved"

/** The attribute saying where a dragged card would land:  `spot` on a spot;  `before` or `after` on a section. */
const DROP_MARK = "data-drop"

/** A press on `card`:  if it's dragged, it moves, its section with it if it heads one. */
function startMove(event: PointerEvent, card: BoardCard, section: BoardSection): void {
  if (event.button !== 0) return
  const host = event.currentTarget as HTMLElement
  const board = host.closest(".SiteBoard") as HTMLElement
  let marked: HTMLElement | undefined
  let opened: HTMLElement | undefined
  const mark = (element: HTMLElement | undefined, where?: string) => {
    marked?.removeAttribute(DROP_MARK)
    marked = element
    marked?.setAttribute(DROP_MARK, where!)
  }
  /** Section `element`, under the pointer, shows the one more row:  only it, so the sections above it stay still. */
  const open = (element: HTMLElement | undefined) => {
    if (!element || element === opened) return
    opened?.removeAttribute(OPENED)
    opened = element
    opened.setAttribute(OPENED, "")
  }
  const stop = () => {
    mark(undefined)
    opened?.removeAttribute(OPENED)
    board.removeAttribute(MOVING)
    host.removeAttribute(BEING_MOVED)
  }
  new Dragging(host, event, {
    carried: [host],
    follows: false,
    placing: (x, y) => {
      host.setAttribute(BEING_MOVED, "")
      scrollNearEdge(board.parentElement!, x, y)
      if (card.isSectionCard) {
        const beside = sectionBeside(board, section, y)
        mark(beside?.element, beside?.where)
        return
      }
      board.setAttribute(MOVING, "")
      open(
        document.elementsFromPoint(x, y).find((each) => each.classList.contains("SiteSection")) as
          | HTMLElement
          | undefined
      )
      mark(spotAt(x, y, card, section), "spot")
    },
    onDrop: () => {
      const landed = marked
      const where = landed?.getAttribute(DROP_MARK)
      stop()
      if (!landed) return
      if (card.isSectionCard)
        SiteWrites.movePart(card.part.name, { where: where as "before" | "after", part: landed.dataset.section! })
      else
        SiteWrites.dropCard(card.part.name, {
          section: landed.closest<HTMLElement>(".SiteSection")!.dataset.section!,
          row: Number(landed.dataset.row),
          column: Number(landed.dataset.column)
        })
    },
    onCancel: stop
  })
}

/**
 * The spot `card` would land on with the pointer at `x`, `y`:  none off the board, on its own spot,
 * or in another section when its part can't go under a page.
 */
function spotAt(x: number, y: number, card: BoardCard, section: BoardSection): HTMLElement | undefined {
  const spot = document.elementsFromPoint(x, y).find((each) => each.classList.contains("spot")) as
    | HTMLElement
    | undefined
  if (!spot) return undefined
  const isOwnSection = spot.closest<HTMLElement>(".SiteSection")?.dataset.section === section.key
  if (isOwnSection && Number(spot.dataset.row) === card.row && Number(spot.dataset.column) === card.column)
    return undefined
  return isOwnSection || SiteEdits.canGoUnder(card.part) ? spot : undefined
}

/** The headed section a section dragged to height `y` would land beside, and on which side:  none beside itself. */
function sectionBeside(board: HTMLElement, section: BoardSection, y: number) {
  for (const element of board.querySelectorAll<HTMLElement>(".SiteSection[data-headed]")) {
    const { top, bottom } = element.getBoundingClientRect()
    if (y < top - SECTION_REACH || y > bottom + SECTION_REACH) continue
    if (element.dataset.section === section.key) return undefined
    return { element, where: y < (top + bottom) / 2 ? "before" : "after" }
  }
  return undefined
}

/** A pointer near an edge of `pane` scrolls it, so a card can reach a section that's out of sight. */
function scrollNearEdge(pane: HTMLElement, x: number, y: number): void {
  const { left, right, top, bottom } = pane.getBoundingClientRect()
  if (y < top + EDGE) pane.scrollTop -= EDGE_STEP
  else if (y > bottom - EDGE) pane.scrollTop += EDGE_STEP
  if (x < left + EDGE) pane.scrollLeft -= EDGE_STEP
  else if (x > right - EDGE) pane.scrollLeft += EDGE_STEP
}

/** How near an edge of the board, in pixels, a dragged pointer scrolls it. */
const EDGE = 40

/** How far one pointer move near an edge scrolls, in pixels. */
const EDGE_STEP = 24

/** How far outside a section, in pixels, still counts as beside it:  half the gap between sections. */
const SECTION_REACH = 13
