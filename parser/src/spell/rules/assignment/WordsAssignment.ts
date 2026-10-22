import { AssignmentStatement } from "./AssignmentStatement"

/**
 * `words_assignment` rule:  `set start pile to ...` -- sets, or declares, a variable of several words
 * (epic page `outline-spell`, P26).
 * - The same as `set start-pile to ...`:  see `assignment` and `words_identifier`.
 * - Read after as those words:  `if start pile is the stock`, `add test card to start pile`.
 */
export class WordsAssignment extends AssignmentStatement {}
