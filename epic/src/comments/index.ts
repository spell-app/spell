/**
 * `spell-epic/comments`:  a comment's THREAD, as every page that draws one works it out (epic `epic-engine` P3):
 * `ThreadFacts`.
 * - Pure, node-safe at import:  the `<epic-thread>` family, the docs runtime's comments (`spell-doc-comments.js`) and
 *   the epic tool's `CommentList` import it.
 * - NOT in the `spell-epic` barrel:  the comments' own script (`spell-comments.js`) imports this alone, and holds no
 *   Spell UI.
 */
export * from "./ThreadFacts"
