/**
 * `spell/server` barrel:  serving pages locally, and assembling them, for every package.  One namespace, `SRV`.
 * - The parts:
 *   - content types, safe paths, static folders
 *   - an Express-shaped router, with body parsing
 *   - ports, and openers (browser, Chrome tab, VS Code)
 *   - the git checkout a path is in, and its main checkout (`checkoutOf()`)
 *   - a file lock, file operations (save, create, rename, duplicate, delete), live reload, a write guard, pid files
 *   - `WebServer`, putting them together
 *   - ASSEMBLING pages (the kit's `assembler` until epic `repo-split` P14, Q43):  a page's link targets (`Linker`),
 *     formatting in memory (`formatHTML()`), the bundles built on demand (`Bundle`), the tooling's JSON5 data files
 *     (`DataFile`), the shared content folder (`contentFolderOf()`)
 * - Node only.  Beyond node's own modules:  `json5`, linkedom (`Linker`), and oxfmt (`formatHTML()`, loaded when it's
 *   first called);  esbuild comes in as a hook from the caller.
 * - NOTE: `page/` (the page server, its CLI, page edits) and `site/` (the site header, browser code) are NOT here:
 *   opt-in entry points `spell/server/page/...` and `spell/server/site/...`, since they bring dependencies and a CLI.
 */
export * from "./server.types"

export * from "./mime"
export * from "./safePath"
export * from "./ports"
export * from "./open"
export * from "./checkout"
export * from "./untilInterrupted"
export * from "./FileLock"
export * from "./FileOperations"

export * from "./Request"
export * from "./Reply"
export * from "./bodies"
export * from "./Router"
export * from "./listener"
export * from "./StaticHandler"
export * from "./proxy"
export * from "./liveClient"
export * from "./webSocket"
export * from "./LiveReload"
export * from "./Guard"
export * from "./PidFile"
export * from "./mainServer"
export * from "./WebServer"

export * from "./contentFolder"
export * from "./DataFile"
export * from "./Linker"
export * from "./format"
export * from "./Bundle"

export * as SRV from "."
