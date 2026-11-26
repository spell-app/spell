/****************
 * ### `PhaseMoves`
 * A to-do phase MOVED to another place:  where it lands, and the phases put in their new order (epic `epic-engine`
 * P34, I480).
 * - Only phases still to do (and dropped ones:  nothing was built under them, I228) TRADE places;  a started or done
 *   phase keeps its place, and so its number, which its commits and log say.
 *   - a move past one doesn't stop at it:  the to-do phases between take each other's places, around it
 *   - e.g. P51, P54 and P57 to do, P52, P53, P55 and P56 done:  P57 moved to P51 takes P51's place, P51 moves to
 *     P54's, P54 to P57's;  the done ones stay where they are
 *   - Why (Owen, 2026-11-26, I480:  "Dragging to reorder phases doesn't always seem to work"):  the page hides done
 *     phases by default, and a drag over one was refused with nothing to say why
 * - `to` a place a started phase holds:  the nearest place a to-do phase holds, back towards `from`
 * - STATIC, pure, node-safe:  the epic tool (`PlanDoc.movePhase()`) and the page's drag (`PhaseDrag`) both move by it,
 *   on whatever DOM they're handed (linkedom or the browser's), so the page shows the order the file will have
 ****************/
export class PhaseMoves {
  /** May a phase of `status` trade places with a moved one (`todo`, `dropped`;  `todo` when it has none)? */
  static canTrade(status: string | null | undefined): boolean {
    return TRADES.includes(status ?? "todo")
  }

  /** May a phase of `status` be moved itself:  only one still to do (`todo` when it has none). */
  static canMove(status: string | null | undefined): boolean {
    return (status ?? "todo") === "todo"
  }

  /**
   * Where the phase at place `from` lands, moved towards place `to` (both from 1), the phases' `statuses` in order:
   * `to` itself when a to-do (or dropped) phase holds it, else the nearest such place back towards `from`:
   * `from` when no such place lies between (it stays);  `undefined` when it can't move at all:  it isn't to do, or a
   * place is out of range.
   */
  static landing(statuses: readonly (string | null | undefined)[], from: number, to: number): number | undefined {
    const count = statuses.length
    if (![from, to].every((n) => Number.isInteger(n) && n >= 1 && n <= count)) return undefined
    if (!PhaseMoves.canMove(statuses[from - 1])) return undefined
    const step = to > from ? -1 : 1
    for (let place = to; place !== from; place += step) if (PhaseMoves.canTrade(statuses[place - 1])) return place
    return from
  }

  /**
   * Move the phase at place `from` to `to` among `phases` (every phase, in page order:  their `status`), in the DOM:
   * the phases that trade places between take each other's, the rest stay;  returns where it landed.
   * - throws for a move that can't be (`landing()`), changing nothing
   */
  static move(phases: readonly Element[], from: number, to: number): number {
    const statuses = phases.map((phase) => phase.getAttribute("status"))
    const landed = PhaseMoves.landing(statuses, from, to)
    if (landed === undefined) throw new RangeError(`PhaseMoves.move():  the phase at ${from} can't move to ${to}`)
    if (landed === from) return from
    const [low, high] = from < landed ? [from, landed] : [landed, from]
    // the places that trade, low to high:  the moved one's, and every to-do (or dropped) one's between
    const places: number[] = []
    for (let place = low; place <= high; place++)
      if (place === from || PhaseMoves.canTrade(statuses[place - 1])) places.push(place)
    const trading = places.map((place) => phases[place - 1]!)
    const moved = phases[from - 1]!
    const order = trading.filter((phase) => phase !== moved)
    order.splice(places.indexOf(landed), 0, moved)
    // each place held by a marker while the phases are out, so the others between stay exactly where they are
    const markers = trading.map((phase) => {
      const marker = phase.ownerDocument.createComment("")
      phase.replaceWith(marker)
      return marker
    })
    markers.forEach((marker, index) => marker.replaceWith(order[index]!))
    return landed
  }
}

/** The statuses whose phases trade places with a moved one. */
const TRADES: readonly string[] = ["todo", "dropped"]
