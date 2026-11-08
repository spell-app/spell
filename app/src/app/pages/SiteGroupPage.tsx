import { onSettled } from "solid-js"

import { SP } from "spell/parser/spell"
import { SPACES } from "spell/app/spaces"
import { appTexts } from "spell/app/app/ui/AppTexts"
import { SpellPage } from "spell/app/app/solid"
import { ChooserToolbar, ProjectCards } from "./ProjectChooser"

/****************
 * ### `<SiteGroupPage>`
 * The sites of a project group, `/site/<group>`, e.g. `/site/owen@spell` (epic `mockup` T31):
 * a card per project that holds a site, each opening in the site editor.
 * - The home page's cards and look (`<ProjectCards>`), under its top bar.
 * - Which projects hold a site is the project list's to say (`SP.ProjectListEntry.isSite`):  nothing is compiled here.
 * - A group with none says so, and how to make one.
 ****************/
export function SiteGroupPage(props: { group: string }) {
  onSettled(() => {
    document.title = appTexts.text("appName")
  })
  return (
    <SpellPage id="ProjectChooser" fillWindow dark scrolling>
      <ChooserToolbar isHome={false} />
      <div class="Home">
        <ProjectCards
          id="sites"
          projectRoot={new SPACES.SpellProjectRoot(props.group as SP.ProjectRootPath)}
          heading={appTexts.text("siteGroupTitle")}
          line={appTexts.text("siteGroupLine")}
          empty={appTexts.text("siteGroupNone")}
          sitesOnly
        />
      </div>
    </SpellPage>
  )
}

/** The group `address` names exactly, e.g. `owen@spell`;  none when it's a project's, or nothing's. */
SiteGroupPage.groupAt = (address: string | undefined): string | undefined => {
  const path = address?.replace(/\/+$/, "")
  return path && SP.SpellSetup.groupFor(path)?.path === path ? path : undefined
}
