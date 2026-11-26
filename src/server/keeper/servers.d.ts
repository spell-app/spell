/**
 * Types for the Spell Servers page's pure parts (`servers.js`, plain JS the keeper serves as it is), for its tests.
 * - Only what the tests import;  the page itself needs none.
 */
import type { KeptServer } from "./keeper.types"

/** One section of the page:  its heading, its cards' servers (none for "Epics"), and its heading's level. */
export type ServersSection = { heading: string; servers: KeptServer[]; level: 2 | 3 }

export function sections(servers: KeptServer[]): ServersSection[]
export function factsOf(server: KeptServer, now?: number): string
export function upFor(iso: string, now?: number): string
export function groupOf(server: KeptServer): string
export function repoTitle(repo: string): string
export function actionOf(server: KeptServer): "start" | "restart" | undefined
