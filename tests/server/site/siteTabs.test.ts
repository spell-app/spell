import { existsSync } from "node:fs"
import { join, resolve } from "node:path"
import { describe, expect, it } from "vite-plus/test"

import { contentFolderOf } from "spell/server/contentFolder"
import { CONTENT_SETTINGS, pageServerSettings } from "spell/server/page/settings"
import { litTab } from "spell/server/site/site.types"

/** The kit:  its tests are in its `tests/`. */
const KIT = resolve(import.meta.dirname, "../../..")

/** The epic repo's settings file, where the tabs are:  none in the kit's CI, which clones no epic repo. */
const CONTENT = contentFolderOf(KIT)

/**
 * The site header's tabs, as the kit's page server names them:  the epic repo's part of its settings
 * (`CONTENT_SETTINGS`'s `siteTabs`), which it hands every page it serves (`SPELL_SERVER.siteTabs`;  epic `repo-split` I4).
 * - the header's code (`SiteHeader`, `litTab()`) names none of them:  these pin the data
 * - spell-app's `package.json` held them until epic `repo-split` P16:  they describe the epic repo's areas
 */
const TABS = pageServerSettings(KIT).siteTabs ?? []

/** The tab the site header lights for page path `path` (`litTab()`). */
function litName(path: string): string | undefined {
  return litTab(TABS, path)?.name
}

describe.skipIf(!CONTENT || !existsSync(join(CONTENT, CONTENT_SETTINGS)))(
  "the site header's tabs (the settings' `siteTabs`)",
  () => {
    it("are in Owen's order (Epic Pages, Sagas, Guides, Docs, Servers;  epic-engine), each list page its tab's home", () => {
      expect(TABS.map((tab) => tab.name)).toEqual(["Epic Pages", "Sagas", "Guides", "Docs", "Servers"])
      expect(TABS.map((tab) => tab.path)).toEqual([
        "epics/index.html",
        "sagas/index.html",
        "guides/index.html",
        "/_epic/docs/README-epics.md",
        "/_epic/servers/"
      ])
      // the Servers tab's red dot, from the server keeper (epic `epic-engine` P82)
      expect(TABS.find((tab) => tab.name === "Servers")?.dot).toBe("/api/servers/dot")
    })

    // epic `epic-engine` P46:  every page is served, so no tab is "only when served" (`serverOnly`, gone)
    it("the app in its own browser tab", () => {
      expect(TABS.filter((tab) => tab.ownTab).map((tab) => tab.name)).toEqual([])
    })

    it.each([
      // served by the page server
      ["/epics/index.html", "Epic Pages"],
      ["/epics/seo/seo.plan.html", "Epic Pages"],
      ["/epics/seo/details/q1.html", "Epic Pages"],
      ["/guides/index.html", "Guides"],
      ["/guides/solid/solid-2.html", "Guides"],
      // the epic tooling's READMEs (`docsRoutes`), a worktree's address too;  a folder named docs elsewhere lights none
      ["/_epic/docs/README-epics.md", "Docs"],
      ["/_epic/docs/epic/README-setup.md", "Docs"],
      ["/worktrees/w/_epic/docs/epic/README.md", "Docs"],
      // the server keeper's tab (epic `epic-engine` P82)
      ["/_epic/servers/", "Servers"],
      ["/worktrees/w/_epic/servers/", "Servers"],
      ["/docs/README.md", undefined],
      ["/brand/index.html", undefined],
      ["/brand/pony.html", undefined],
      ["/brand/compare.html", undefined],
      ["/brand/spell-design-system/Logo.spell.html", undefined],
      // the component sets:  their address, a worktree's, and their folder's (in the kit, beside spell-app:  `/_beside/...`,
      // or a file:// page)
      ["/components/ui/", undefined],
      ["/ui/docs/ui-card.html", undefined],
      ["/components/ui/ui-card.html", undefined],
      ["/_beside/ui/site/index.html", undefined],
      ["/_beside/ui/docs/ui-card.html", undefined],
      ["/Users/owen/www/spell/ui/docs/ui-card.html", undefined],
      ["/worktrees/w/components/ui/ui-card.html", undefined],
      ["/components/epics/", undefined],
      ["/components/epics/epic-item.html", undefined],
      ["/worktrees/w/components/epics/epic-item.html", undefined],
      ["/_beside/epic/src/docs/epic-item.html", undefined],
      ["/Users/owen/www/spell/epic/src/docs/index.html", undefined],
      ["/components/app/", undefined],
      ["/components/app/spell-viewer.html", undefined],
      ["/worktrees/w/components/app/", undefined],
      // App UI's folder, spell-app's:  served from the kit's root, a worktree's, or from disk
      ["/app/app/docs/index.html", undefined],
      ["/worktrees/w/app/app/docs/index.html", undefined],
      ["/Users/owen/www/spell/app/app/docs/index.html", undefined],
      // the brand's element set lights the Brand tab
      ["/components/brand/", undefined],
      ["/components/brand/brand-logo.html", undefined],
      ["/_beside/spell-brand/docs/brand-logo.html", undefined],
      // the old addresses:  no tab
      ["/ui/components/ui-card.html", undefined],
      ["/epic-ui/", undefined],
      ["/src/app/components/spell-viewer/SpellViewer.tsx", undefined],
      ["/packages/ui/docs/ui-card.html", undefined],
      // Epic UI's old element pages, until the merge:  guides
      ["/guides/epic-components/elements/epic-item.html", "Guides"],
      // no Templates tab since 2026-10-22 (Owen:  "we're not using it at this point"):  the templates' own list lights
      // none;  a template under an area's folder name lights that area's tab
      ["/templates/index.html", undefined],
      ["/templates/epics/plan.html", "Epic Pages"],
      ["/templates/goals/set/index.html", "Sagas"],
      // the saga pages, and the parked goal sets under the same tab (epic `epic-workflow` P15)
      ["/sagas/index.html", "Sagas"],
      ["/sagas/epics/epics.saga.html", "Sagas"],
      ["/goals/index.html", "Sagas"],
      ["/goals/spell/motivation/motivation.html", "Sagas"],
      ["/editor/", undefined],
      // the home and the scratch details pages:  no tab
      ["/pages/index.html", undefined],
      ["/pages/details/x.html", undefined],
      // a worktree's pages, from the main checkout's server:  inside the worktree, whatever it's called
      ["/worktrees/goals/epics/goals/goals.plan.html", "Epic Pages"],
      ["/worktrees/seo/guides/seo/seo.html", "Guides"],
      // from disk, in a checkout and in a worktree
      ["/Users/owen/www/spell-app/spell-app/guides/cli.html", "Guides"],
      ["/Users/owen/www/spell-app/spell-app/.claude/worktrees/brand/templates/durable.html", undefined],
      ["/Users/owen/www/spell-app/spell-app-dev/brand/pony.html", undefined],
      // older checkouts' paths (the docs package, before 2026-10-05):  their area folders still light their tabs;
      // a guide straight under the old folder lights none since the tabs became data (epic `repo-split` I4)
      ["/packages/docs/content/epics/seo/seo.html", "Epic Pages"],
      ["/packages/docs/content/templates/durable.html", undefined],
      ["/packages/docs/content/solid/solid-2.html", undefined],
      ["/packages/docs/content/index.html", undefined],
      ["/packages/docs/epics/seo/seo.html", "Epic Pages"],
      ["/packages/docs/solid/solid-2.html", undefined],
      // other folders' files
      ["/_beside/ui/AGENTS.md", undefined],
      ["/Users/owen/www/spell/src/server/AGENTS.md", undefined],
      ["/Users/owen/www/spell/app/src/app/docs.ts", undefined]
    ])("light %s:  %s", (path, tab) => {
      expect(litName(path)).toBe(tab)
    })
  }
)
