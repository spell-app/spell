/**
 * `spell publish`'s work (`spell/cli/publish`):  each repo's npm package built, staged, packed and checked, then
 * installed in a scratch project.
 * - NOT in the `spell/cli` barrel:  it loads esbuild, Solid's compiler, Lightning CSS and Playwright when it runs,
 *   and `spell help` must stay fast.  `spell publish`'s action imports it.
 */
export * from "./publish.types"

export * from "./PackageBuild"
export * from "./PublishedPackage"
export * from "./ScratchInstall"
export * from "./UIBundle"
export * from "./PluginPackage"
