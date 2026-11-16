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
 * - A group's section is headed by a line, its title in its colour (`<GroupHeader>`, epic `mockup` T36), not a card:
 *   its cards start a column to the left (`--SiteGrid-shift`), so the file's places stay as they were.
 * - A card takes its section's colour (`<ui-card background>`);  a page's is rounded, a dialog's square,
 *   a section's bold and bigger;  its thumbnail on top, when it has one.
 *   - Its title, after its page's icon when it has one, and under it its address (`iconOf`, `lineOf`;  epic `mockup`
 *     T34):  its own words in the card, not the card's `heading` shorthand, which can hold no icon.
 * - A click picks a card, a double click opens it:  `onPick`, `onOpen`.
 * - A page's card has a link in its corner, opening it in a tab of its own:  `newTabOf`.
 *   - The tab is named for its address (`tabNameFor()`), so a second click goes back to the same tab (`mockup` I19).
 * - Moving, with the kit's `Dragging`, each ONE step of the editor's history (`SiteWrites`):
 *   - a section's card, or a group's line:  up or down, the whole section before or after another, a line showing where;
 *     or onto a spot of another section, which it joins, its pages with it
 *   - any other card:  to a spot of its own section or another, the spot lit up
 *   - any card onto the middle of a page's card:  into that page, as its first page, the page's card lit up
 *     (the move the pages' tree beside the board had, until epic `mockup` I13);  its edges still mean its spot
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
            <Show when={SiteBoard.isGroup(section()) && section().cards[0]}>
              {(head) => <GroupHeader {...props} card={head()} section={section()} />}
            </Show>
            <div class="SiteGrid" style={{ "--SiteGrid-shift": SiteBoard.isGroup(section()) ? 1 : 0 }}>
              <For each={SiteBoard.spotsOf(section())} keyed={(spot) => `${spot.row}:${spot.column}`}>
                {(spot) => (
                  <div
                    class={["spot", { "extra-row": spot().isExtraRow, "extra-column": spot().isExtraColumn }]}
                    data-row={spot().row}
                    data-column={spot().column}
                    style={{ "--SiteCard-row": spot().row, "--SiteCard-column": spot().column }}
                  />
                )}
              </For>
              <For
                each={SiteBoard.isGroup(section()) ? section().cards.slice(1) : section().cards}
                keyed={(card) => card.part.name}
              >
                {(card) => <SiteCard {...props} card={card()} section={section()} />}
              </For>
            </div>
          </section>
        )}
      </For>
    </div>
  )
}

/**
 * A group's line over its section (epic `mockup` T36):  its title in its colour, quiet, as a heading is.
 * - A click picks the group, a double click opens its line;  a drag moves the whole group, its pages with it,
 *   before or after another section.
 */
function GroupHeader(props: SiteBoardViewProps & { card: BoardCard; section: BoardSection }) {
  const part = () => props.card.part
  return (
    <header
      class={["SiteGroupHeader", { selected: props.picked === part().name }]}
      data-part={part().name}
      style={{ "--SiteGroupHeader-color": props.card.color ? `var(--ui-${props.card.color})` : undefined }}
      onClick={() => props.onPick(part().name)}
      onDblClick={() => props.onOpen(part().name)}
      onPointerDown={(event: PointerEvent) => startMove(event, props.card, props.section)}
    >
      <h2>{props.titleOf(part())}</h2>
    </header>
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
      data-can-nest={SiteEdits.canNest(part()) ? "" : undefined}
      background={props.card.color as UICardJSXAttributes["background"]}
      image={props.thumbnailOf(part())}
      title={props.lineOf(part())}
      style={{ "--SiteCard-row": props.card.row, "--SiteCard-column": props.card.column }}
      onClick={() => props.onPick(part().name)}
      onDblClick={() => props.onOpen(part().name)}
      onPointerDown={(event: PointerEvent) => startMove(event, props.card, props.section)}
    >
      <div class="words">
        <div class="heading">
          <Show when={props.iconOf(part())}>{(icon) => <ui-icon class="icon" name={icon()} />}</Show>
          <span class="title">{props.titleOf(part())}</span>
        </div>
        <div class="line">{props.lineOf(part())}</div>
        <Show when={props.storiesLineOf(part())}>{(stories) => <div class="line stories">{stories()}</div>}</Show>
      </div>
      <Show when={props.newTabOf(part())}>
        {(link) => (
          <a
            class="new-tab"
            href={link().url}
            target={tabNameFor(link().url)}
            title={link().label}
            aria-label={link().label}
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

/** What starts a page's tab name:  a name starting `_` would be one of the browser's own (`_blank`). */
const TAB_NAME_PREFIX = "spell-page "

/**
 * The name of the tab `url` opens in, from a card's corner:  one per address, so the same page's link reuses its tab.
 * - The run's address names the project and the page, so two projects' `/` pages get two tabs.
 */
function tabNameFor(url: string): string {
  return `${TAB_NAME_PREFIX}${url}`
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
  /** A line of its own under that one, if it has one:  how many of a page's stories are done (`1 of 2 stories`). */
  storiesLineOf: (part: SitePart) => string | undefined
  /** The icon before its title, if it has one:  a page's, from its line (`icon "film"`). */
  iconOf: (part: SitePart) => string | undefined
  /** The address of its thumbnail, if it has one. */
  thumbnailOf: (part: SitePart) => string | undefined
  /** The link in a part's corner, opening it in a new tab, and what it says:  none for what has no page to open. */
  newTabOf: (part: SitePart) => { url: string; label: string } | undefined
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

/**
 * The attribute saying where a dragged card would land:
 * `spot` on a spot;  `before` or `after` on a section;  `into` on the page's card it would go in.
 */
const DROP_MARK = "data-drop"

/** A press on `card`:  if it's dragged, it moves, its section with it if it heads one. */
function startMove(event: PointerEvent, card: BoardCard, section: BoardSection): void {
  if (event.button !== 0) return
  const host = event.currentTarget as HTMLElement
  const board = host.closest(".SiteBoard") as HTMLElement
  const onlyBeside = card.isSectionCard && !SiteEdits.canGoUnder(card.part)
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
      // a group lands only beside another section:  no spots to show it
      if (onlyBeside) {
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
      const page = pageInto(x, y, card)
      if (page) {
        mark(page, "into")
        return
      }
      const spot = spotAt(x, y, card, section)
      if (spot || !card.isSectionCard) {
        mark(spot, "spot")
        return
      }
      const beside = sectionBeside(board, section, y)
      mark(beside?.element, beside?.where)
    },
    onDrop: () => {
      const landed = marked
      const where = landed?.getAttribute(DROP_MARK)
      stop()
      if (!landed) return
      if (where === "into") SiteWrites.movePart(card.part.name, { where, part: landed.dataset.part! })
      else if (where !== "spot")
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
 * The page card `card` would go INTO, as its first page, with the pointer at `x`, `y`:  only on that card's middle.
 * - Its edges, the outer `INTO_EDGE` of each side, still mean its spot:  the card there moves along to make room.
 * - None for a card that can't hold it (`SiteEdits.canNest()`, `canGoUnder()`), itself, or one of its own pages.
 */
function pageInto(x: number, y: number, card: BoardCard): HTMLElement | undefined {
  if (!SiteEdits.canGoUnder(card.part)) return undefined
  const host = document
    .elementsFromPoint(x, y)
    .find((each) => each.classList.contains("SiteCard") && each.hasAttribute("data-can-nest")) as
    | HTMLElement
    | undefined
  const name = host?.dataset.part
  if (!host || !name || SiteEdits.allParts([card.part]).some((part) => part.name === name)) return undefined
  // the host draws no box of its own (`display: contents`):  its card part does
  const box = (host.shadowRoot?.querySelector('[part~="card"]') ?? host).getBoundingClientRect()
  const across = (x - box.left) / box.width
  const down = (y - box.top) / box.height
  const isMiddle = (along: number) => along > INTO_EDGE && along < 1 - INTO_EDGE
  return isMiddle(across) && isMiddle(down) ? host : undefined
}

/** How much of a card, from each side, still means its spot rather than into it. */
const INTO_EDGE = 0.2

/**
 * The spot `card` would land on with the pointer at `x`, `y`:  none off the board, on its own spot,
 * in its own section for a section's card, or in another section when its part can't go under a page.
 */
function spotAt(x: number, y: number, card: BoardCard, section: BoardSection): HTMLElement | undefined {
  const spot = document.elementsFromPoint(x, y).find((each) => each.classList.contains("spot")) as
    | HTMLElement
    | undefined
  if (!spot) return undefined
  const isOwnSection = spot.closest<HTMLElement>(".SiteSection")?.dataset.section === section.key
  if (isOwnSection && card.isSectionCard) return undefined
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
