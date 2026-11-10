import { For, onSettled } from "solid-js"
import type { JSX } from "@solidjs/web"

import { SP } from "spell/parser/spell"
import { PROJECT_GROUPS, SPACES } from "spell/app/spaces"
import { appTexts } from "spell/app/app/ui/AppTexts"
import { SpellPage } from "spell/app/app/solid"
import { ChooserToolbar, ProjectCards } from "./ProjectChooser"

/****************
 * ### `<SitesHomePage>`
 * The sites home page, `/site`:  every site there is, a block of cards per project group.
 * - A group with no site shows nothing.
 * - Groups only in dev (the test fixtures, the editor's pieces) aren't listed:  their sites are test data.
 ****************/
export function SitesHomePage() {
  const groups = PROJECT_GROUPS.filter((group) => !group.devOnly)
  return (
    <SitesFrame>
      <header class="SitesHeader">
        <h1>{appTexts.text("siteGroupTitle")}</h1>
        <p>{appTexts.text("sitesHomeLine")}</p>
      </header>
      <For each={groups}>
        {(group) => (
          <ProjectCards
            id={group.domain}
            projectRoot={new SPACES.SpellProjectRoot(group.path)}
            sitesOnly
            hideWhenNone
          />
        )}
      </For>
    </SitesFrame>
  )
}

/****************
 * ### `<SiteGroupPage>`
 * The sites of a project group, `/site/<group>`, e.g. `/site/owen@spell` (epic `mockup` T31):
 * a card per project that holds a site, each opening in the site editor.
 * - The home page's cards and look (`<ProjectCards>`), under its top bar.
 * - Which projects hold a site is the project list's to say (`SP.ProjectListEntry.isSite`):  nothing is compiled here.
 * - A group with none says so, and how to make one.
 ****************/
export function SiteGroupPage(props: { group: string }) {
  return (
    <SitesFrame>
      <ProjectCards
        id="sites"
        projectRoot={new SPACES.SpellProjectRoot(props.group as SP.ProjectRootPath)}
        heading={appTexts.text("siteGroupTitle")}
        line={appTexts.text("siteGroupLine")}
        empty={appTexts.text("siteGroupNone")}
        sitesOnly
      />
    </SitesFrame>
  )
}

/** What the sites home page and a group's page share:  the home page's look, under its top bar. */
function SitesFrame(props: { children: JSX.Element }) {
  onSettled(() => {
    document.title = appTexts.text("appName")
  })
  return (
    <SpellPage id="ProjectChooser" fillWindow dark scrolling>
      <ChooserToolbar isHome={false} />
      <div class="Home">{props.children}</div>
    </SpellPage>
  )
}

/** The group `address` names exactly, e.g. `owen@spell`;  none when it's a project's, or nothing's. */
SiteGroupPage.groupAt = (address: string | undefined): string | undefined => {
  const path = address?.replace(/\/+$/, "")
  return path && SP.SpellSetup.groupFor(path)?.path === path ? path : undefined
}
