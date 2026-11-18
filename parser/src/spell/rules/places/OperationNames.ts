import { P } from "spell/parser/parser"

/**
 * `operation_names` rule:  the operations an `enabled operations are ...` line names, e.g. `add, change and delete`
 * (epic `data` P49).
 * - A comma list:  a space after a comma is no different, and `and` or `or` may join the last.
 * - Compiles to nothing by itself.
 */
export class OperationNames extends P.Repeat {}
