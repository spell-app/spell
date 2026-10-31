import { on } from "./on"

/**
 * What the app does with a `<ui-tree>`'s rows:  its own selection, and its own memory of what's open.
 * - Each tree's page decides what selecting a row means, so a row is handed what to do (`chooseRow()`),
 *   and the tree's own selecting is turned off (`treeChoosesRows`).
 * - Plain DOM:  no Solid, so a runner's bundle can take it, and node can read it.
 */

/** What each row does when it's selected. */
const choosers = new WeakMap<Element, (event: Event | undefined) => void>()

/** A `ref` for a row:  selecting it does `choose`, handed the click or key, with its keys held. */
export function chooseRow(choose: (event: Event | undefined) => void): (row: Element) => void {
  return (row) => choosers.set(row, choose)
}

/**
 * A `ref` for the tree:  a row selected does what `chooseRow()` gave it, not the tree's own selecting.
 * - The page says which rows are `selected`.
 */
export const treeChoosesRows = on<{ item: Element; originalEvent?: Event }>("ui-selecting", (event) => {
  event.preventDefault()
  choosers.get(event.detail.item)?.(event.detail.originalEvent)
})

/**
 * A `ref` for a row:  `toggle` when THIS row opens or closes.
 * - Those events bubble, so a row hears its children's too:  only its own count.
 */
export function whenRowToggled(toggle: () => void): (row: Element) => void {
  return (row) => {
    for (const type of ["ui-opening", "ui-closing"]) {
      row.addEventListener(type, (event) => {
        if (event.target === row) toggle()
      })
    }
  }
}
