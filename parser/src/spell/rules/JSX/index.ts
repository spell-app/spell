/**
 * The `JSX` rule module:  JSX -- elements (`<tag attr=.../>`), fragments (`<>...</>`), attributes, text, end tags,
 * and `{...}` expression containers, all tokenized up front by `P.JSXElementToken` & friends and re-parsed here.
 * - One rule class per file;  `JSX.en.ts` registers them on `JSX` (`JSX.parser.ts`),
 *   and each other language's `JSX.<lang>.ts` registers the same rules in its own words.
 * - NOTE: those files register them in TIE-BREAK order:
 *   when two rules match the same words with the same `priority` and length, the one registered first wins.
 *   Moving a line there can change what parses.
 */
export * from "./JSX.parser"
export * from "./JSX.shared"
// `SpellJSX` imports it, so it registers first:  a `<markdown>` is its own rule, not an element
export * from "./MarkdownBlock"
export * from "./SpellJSX"
export * from "./SpellJSXFragment"
export * from "./SpellJSXContent"
export * from "./SpellJSXAttribute"
export * from "./SpellJSXText"
export * from "./SpellJSXEndTag"
export * from "./SpellJSXExpression"
