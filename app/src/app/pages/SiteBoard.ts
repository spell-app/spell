import { SiteEdits, type SitePart, type SitePartPlace } from "./SiteEdits"

/****************
 * ### `SiteBoard`
 * How a site's parts lie on the site editor's board (epic `mockup` T31):  a block per section, each a grid of cards.
 * - A section is a top-level page with an address:  its card first, then every part under it, at any depth.
 *   - The site's other top-level parts (a dialog at the top, the not found and error pages) make a block with no
 *     section card, wherever they are in the file.
 * - A card's place is counted INSIDE its section, row and column from 1:
 *   so moving a section, or changing another, never renumbers anything.
 *   - A section's own card is always first:  a place written on it is ignored.
 *   - A card with no place follows the one before it;  a page with pages of its own starts a new line;
 *     and a line of them wraps at `FLOW_COLUMNS`.
 *   - A place another card has already taken goes to the next free one.
 * - A card's colour is its own, else that of the part it's under.
 * - Plain text and values in and out:  no parser and no DOM, so it's tested in node.
 * - Static and instance-free on purpose:  it holds nothing, as `SiteEdits` doesn't.
 ****************/
export class SiteBoard {
  /** The board's blocks, in the site's order. */
  static sectionsOf(parts: readonly SitePart[]): BoardSection[] {
    const blocks: { head?: SitePart; parts: SitePart[] }[] = []
    for (const part of parts) {
      if (SiteEdits.canNest(part)) blocks.push({ head: part, parts: [] })
      else if (blocks.at(-1) && !blocks.at(-1)!.head) blocks.at(-1)!.parts.push(part)
      else blocks.push({ parts: [part] })
    }
    return blocks.map(({ head, parts: loose }) => SiteBoard.laidOut(head, loose))
  }

  /**
   * Every spot of `section` a card can be dropped on:  its rows and columns, one more of each, past its section card.
   * - `isExtraRow`, `isExtraColumn`:  it's in that one more row or column, there only while a card is being moved.
   */
  static spotsOf(section: BoardSection): BoardSpot[] {
    const firstColumn = section.head ? 2 : 1
    const spots: BoardSpot[] = []
    for (let row = 1; row <= section.rows + 1; row++) {
      for (let column = firstColumn; column <= section.columns + 1; column++) {
        spots.push({ row, column, isExtraRow: row > section.rows, isExtraColumn: column > section.columns })
      }
    }
    return spots
  }

  /**
   * `text` with card `name` put at `drop`:  in that section, at that row and column.
   * - Whatever card is on that spot moves one to the right, and those touching it after, for those with a place.
   * - Its line moves too, to after the card before that spot, so the file, the tree and the board have one order.
   *   - First in a section:  the section's first part.
   *   - After a card with pages of its own:  that card's first page, so nothing comes between them.
   * - Going into another section it takes that section's colour, by being under it.
   * - throws `TypeError` for a card or section the site doesn't have, or a section's own card:  that moves as a section
   */
  static withCardDropped(text: string, name: string, drop: CardDrop): string {
    const sections = SiteBoard.sectionsOf(SiteEdits.partsIn(text) ?? [])
    const target = sections.find((section) => section.key === drop.section)
    const from = sections.find((section) => section.cards.some((card) => card.part.name === name))
    const card = from?.cards.find((each) => each.part.name === name)
    if (!target || !card) {
      throw new TypeError(
        `SiteBoard.withCardDropped():  no card "${name}" or section "${drop.section}";  pick one on the board`
      )
    }
    if (card.isSectionCard) {
      throw new TypeError(
        `SiteBoard.withCardDropped():  "${name}" is a section's card;  move it with SiteEdits.withPartMoved()`
      )
    }
    if (from === target && card.row === drop.row && card.column === drop.column) return text
    const carried = new Set(SiteEdits.allParts([card.part]).map((part) => part.name))
    const others = target.cards.filter((each) => !carried.has(each.part.name))
    let after = text
    for (const pushed of SiteBoard.pushedBy(others, drop)) {
      if (pushed.part.row !== undefined) {
        after = SiteEdits.withPartPlaced(after, pushed.part.name, { row: pushed.row, column: pushed.column + 1 })
      }
    }
    const place = SiteBoard.lineFor(target, others, name, drop)
    if (place) after = SiteEdits.withPartMoved(after, name, place)
    return SiteEdits.withPartPlaced(after, name, { row: drop.row, column: drop.column })
  }

  /** The cards a drop on `drop` pushes right:  the one on it, and those touching it after, right to left. */
  private static pushedBy(cards: readonly BoardCard[], drop: CardDrop): BoardCard[] {
    const pushed: BoardCard[] = []
    for (let column = drop.column; ; column++) {
      const card = cards.find((each) => each.row === drop.row && each.column === column)
      if (!card) return pushed.reverse()
      pushed.push(card)
    }
  }

  /** Where card `name`'s line goes for a drop on `drop`, among `others`, the target's other cards;  none:  it's there. */
  private static lineFor(
    target: BoardSection,
    others: readonly BoardCard[],
    name: string,
    drop: CardDrop
  ): SitePartPlace | undefined {
    const prior = others.filter((card) => isBefore(card, drop)).at(-1)
    const inFile = target.cards.map((card) => card.part.name)
    const at = inFile.indexOf(name)
    if (at >= 0 && inFile[at - 1] === prior?.part.name) return undefined
    if (prior) {
      return prior.isSectionCard || prior.part.parts.length
        ? { where: "into", part: prior.part.name }
        : { where: "after", part: prior.part.name }
    }
    return others[0] && { where: "before", part: others[0].part.name }
  }

  /** The block of `head` (none:  the site's top-level parts that aren't sections, `loose`), its cards placed. */
  private static laidOut(head: SitePart | undefined, loose: readonly SitePart[]): BoardSection {
    const firstColumn = head ? 2 : 1
    const taken = new Set<string>()
    const cards: BoardCard[] = []
    const put = (part: SitePart, color: string | undefined, row: number, column: number, isSectionCard: boolean) => {
      taken.add(`${row}:${column}`)
      cards.push({ part, color, row, column, isSectionCard })
    }
    if (head) put(head, head.color, 1, 1, true)
    let row = 1
    let column = firstColumn
    for (const { part, color } of withColors(head ? head.parts : loose, head?.color)) {
      const isPlaced = part.row !== undefined && part.column !== undefined
      if (isPlaced) {
        row = part.row!
        column = part.column!
      } else if (part.parts.length && column > firstColumn) {
        row++
        column = firstColumn
      }
      while (taken.has(`${row}:${column}`) || (!isPlaced && column > FLOW_COLUMNS)) {
        column++
        if (!isPlaced && column > FLOW_COLUMNS) {
          row++
          column = firstColumn
        }
      }
      put(part, color, row, column, false)
      column++
    }
    return {
      key: head?.name ?? cards[0]!.part.name,
      head,
      cards,
      rows: Math.max(...cards.map((card) => card.row)),
      columns: Math.max(...cards.map((card) => card.column))
    }
  }
}

/** How many columns of a section cards with no place of their own fill before wrapping. */
const FLOW_COLUMNS = 8

/** Is `card` before `spot`, reading a section left to right, then down? */
function isBefore(card: BoardCard, spot: { row: number; column: number }): boolean {
  return card.row < spot.row || (card.row === spot.row && card.column < spot.column)
}

/** Every part of `parts`, its pages' too, in the file's order, each with its colour:  its own, else what's above it. */
function withColors(parts: readonly SitePart[], above: string | undefined): { part: SitePart; color?: string }[] {
  return parts.flatMap((part) => {
    const color = part.color ?? above
    return [{ part, color }, ...withColors(part.parts, color)]
  })
}

/** One block of the board. */
export type BoardSection = {
  /** What says which block it is:  its section card's name, else its first card's. */
  key: string
  /** The page that heads it:  none for the block of the site's other top-level parts. */
  head?: SitePart
  /** Its cards, in the file's order, its section card first. */
  cards: BoardCard[]
  /** Its last row with a card. */
  rows: number
  /** Its last column with a card. */
  columns: number
}

/** One card on the board. */
export type BoardCard = {
  /** The part it stands for. */
  part: SitePart
  /** Its colour, one of Spell UI's:  its part's own, else what its part is under.  None:  a plain card. */
  color?: string
  /** Its row in its section, from 1. */
  row: number
  /** Its column in its section, from 1. */
  column: number
  /** Is it the card that heads its section? */
  isSectionCard: boolean
}

/** A spot of a section a card can be dropped on. */
export type BoardSpot = {
  /** Its row, from 1. */
  row: number
  /** Its column, from 1. */
  column: number
  /** Is it below the section's cards, drawn only while a card is being moved over that section? */
  isExtraRow: boolean
  /** Is it past the section's last column, drawn only while a card is being moved? */
  isExtraColumn: boolean
}

/** Where a card was dropped:  which section (`BoardSection.key`), and which row and column of it. */
export type CardDrop = { section: string; row: number; column: number }
