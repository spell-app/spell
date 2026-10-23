import { SpellSetup } from "spell-lang/spell/SpellSetup"
import type { SP } from "spell-lang/spell"

/**
 * A TEST DOUBLE of spell-app's project groups (spaces' `models/projectGroups.ts`):  the groups a spell address can
 * name, registered as this file loads.
 * - Why:  spell's own tests of its addresses and URLs (`SpellLocation`, `SpellUrls`) need groups registered, and the
 *   real ones are spaces', in spell-app, which spell-lang's tests never read (epic `repo-split` C11).
 * - Only what those tests read:  each group's address, space and domain;  the rest is filler.
 * - The real list's own test, and the tests that load projects from disk, are spell-app's (its `tests/spaces/`,
 *   `tests/spell/`).
 */
const GROUPS: Array<Pick<SP.ProjectRootSpec, "path" | "space" | "domain">> = [
  { path: "owen@spell", space: "owen@spell", domain: "projects" },
  { path: "@spell/examples", space: "@spell", domain: "examples" },
  { path: "@spell/guides", space: "@spell", domain: "guides" },
  { path: "@spell/library", space: "@spell", domain: "library" },
  { path: "@spell/test", space: "@spell", domain: "fixtures" }
]

for (const group of GROUPS)
  SpellSetup.addProjectRoot({
    ...group,
    title: group.domain,
    Type: "Project",
    type: "project",
    description: `${group.path}:  a test double's group`,
    icon: "app store ios"
  } as SP.ProjectRootSpec)
