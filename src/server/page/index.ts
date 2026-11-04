/**
 * `spell/server/page` barrel:  the page server, one per checkout, and its page editor.
 * - Opt-in:  NOT in `spell/server`'s barrel, since it brings `parse5` and loads route modules.
 * - Generic:  what it serves beyond the checkout and its epic folder (component sets, engine routes, page scripts,
 *   route modules, bundles) comes from every installed repo's `"pageServer"` part, merged (`pageServerSettings()`).
 * - NOTE: `cli.ts` is left out:  it's the `spell server` entry point, and runs on import.
 */
export * from "./page.types"
export * from "./settings"

export * from "./BundleBuild"
export * from "./PageEditor"
export * from "./PageServer"
export * from "./prune"
