/**
 * Barrel for the spell language server:  editor features (errors, outline, folding...)
 * in Language Server Protocol shapes, hosted on `SP.SpellProject` / `SP.SpellFile`.
 * - `FileAddresses` (type) is how an editor addresses spell files:  by URI.
 * - `SpellLanguageService` answers questions about a parsed file, in LSP shapes.
 * - `CompletionShapes`:  how a tag or an attribute chosen from the suggestion list is written whole.
 * - `MarkupIndent`:  how a drawing's markup is indented as a tree, for a paste and for Format Document.
 * - `CodeOrText`:  an attribute's value switched between text, `"blue"`, and code, `{its color}`.
 * - `SpellCSS`:  the `<css>` blocks in a file, edited as CSS.
 * - `HostNameCheck`:  the names a host fills by name in a project, an error when the code drops one.
 * - `SpellKeywords`:  a language pack's keywords, for accent fixes and colouring.
 * - `SpellTyping`:  the rules behind the typing helps, Enter's among them, for every editor.
 * - `AppAddresses`:  how the app's editors address files, `spell:/<file.path>`.
 * - `LspTexts`:  the labels it shows people, in the language of the file they're about (its name says it).
 * - `LANGUAGE_REQUESTS`:  the ONE table of requests the service answers, by name, for every editor.
 * - `SpellLanguageServer` wires both to an LSP connection.
 * - Browser-safe:  NO node imports, so the app's editor uses the service in-process.
 * - NOTE: deliberately left out, as node-only or with side effects the moment they're imported:
 *   - `SpellDiskWorkspace`:  the stdio server's workspace, loading from disk
 *   - `server.ts`:  the process entry, `yarn lsp:start`
 *   - `stdioGuard.ts`
 */
export * as LSP from "./"
export * from "./lsp.types"

export * from "./LspTexts"
export * from "./SpellKeywords"
export * from "./SpellTyping"
export * from "./AppAddresses"
export * from "./SpellLanguageService"
export * from "./SpellCSS"
export * from "./HostNames"
export * from "./CompletionShapes"
export * from "./MarkupIndent"
export * from "./CodeOrText"
export * from "./ScopeExplorer"
export * from "./LanguageRequests"
export * from "./SpellLanguageServer"
