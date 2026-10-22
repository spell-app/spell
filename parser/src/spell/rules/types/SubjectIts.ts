import { SubjectRule } from "./SubjectRule"

/**
 * `subject_its` rule:  `its`, as the subject of an outline body's line,
 * e.g. `- its "suit" is ...` -- see `SubjectRule`.
 * - Its word is its registered `syntax`, e.g. `its/i` in `types.en.ts`.
 */
export class SubjectIts extends SubjectRule {}
