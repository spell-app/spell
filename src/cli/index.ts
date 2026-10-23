/**
 * Barrel for the `spell` command's base (`spell/cli`, namespace `CLI`):  what every repo's commands build on.
 * - Node built-ins, commander and chalk only:  each repo's command list imports it, and `spell help` loads them all.
 *   So NOTHING here imports a command's work:  the commands themselves (`commands/`) are imported directly by the
 *   kit's own list, `cli/commands.ts`, when they run.
 * - NOTE: deliberately left out:  `main.ts`, the process entry (importing it runs the command line).
 */
export * as CLI from "."
export * from "./cli.types"

export * from "./findCheckout"
export * from "./run"
export * from "./tools"
export * from "./repos"
export * from "./program"
