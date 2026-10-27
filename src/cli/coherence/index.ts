/**
 * `spell coherence score`'s work (`spell/cli/coherence`):  how coherent the code is, over every installed repo,
 * from the catalog's **Score:** searches, saved as snapshots so it trends (epic `coherence` P15).
 * - NOT in the `spell/cli` barrel:  `spell help` must stay fast.  `spell coherence`'s action imports it.
 * - Its position:  `coherence.types` <- `scoreSearches`, `RepoCode` <- `CoherenceScore`, `ScoreSnapshots`;
 *   it uses `spell/cli/map` for the repos and the code map.
 */
export * from "./coherence.types"

export * from "./scoreSearches"
export * from "./RepoCode"
export * from "./CoherenceScore"
export * from "./ScoreSnapshots"
