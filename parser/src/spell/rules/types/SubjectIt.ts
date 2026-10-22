import { SubjectRule } from "./SubjectRule"

/**
 * `subject_it` rule:  `it`, as the subject of an outline body's line, e.g. `- it has a deck` -- see `SubjectRule`.
 * - Its word is its registered `syntax`, e.g. `it/i` in `types.en.ts`.
 */
export class SubjectIt extends SubjectRule {}
