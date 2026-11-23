import { P } from "spell/parser/parser"

/**
 * `searched_fields` rule:  the fields a server searches, by their words, e.g. `names and titles`:  see `SearchesWith`.
 * - Each field its member words, one or several:  `device ids and instance id`, `cook-time`.
 * - Compiles to nothing by itself.
 */
export class SearchedFields extends P.Repeat {}
