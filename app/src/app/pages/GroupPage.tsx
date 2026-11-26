import { Show, createSignal, onSettled } from "solid-js"

import { $fetch } from "spell/util"
import { SP } from "spell/parser/spell"
import { SPACES } from "spell/app/spaces"
import { appTexts } from "spell/app/app/ui/AppTexts"
import { SpellPage, trackProjectRoot } from "spell/app/app/solid"
import { ChooserToolbar, GroupCards, HomeSection, OrgSection } from "./ProjectChooser"

import "./GroupPage.css"

/****************
 * ### `<GroupPage>`
 * An org's page, `/@acme`, or one of its group's, `/@acme/org-spell` (epic `editor` P47, Q99 A):
 * the home page narrowed to that org or group, under the home page's top bar.
 * - A group's page:  its projects as cards, then its README (`README.md` in its folder), drawn as Markdown.
 *   - A group with no projects says so, and how to make one.
 * - An org's page:  every group of it, as the home page's section for that org (`<OrgSection>`).
 * - Shown at those addresses, and under `/run/` and `/edit/` too:  never a file.
 *   - A group that holds its own page, a project named `home` (`SPACES.GROUP_PAGE_PROJECT`, Q99 B), runs it instead at
 *     `/@acme/org-spell` and `/run/@acme/org-spell` (the server sends the run page, `editorPageFor()`);
 *     reached from inside the app, the page loads again so the server can (`showsOwnPage()`).
 *   - `/edit/@acme/org-spell` stays this page, the group's own page's card first, marked.
 * - Its look is the home page's (`ProjectChooser.css`), its own bits in `GroupPage.css`.
 ****************/
export function GroupPage(props: { page: SPACES.OrgPage; mode?: "edit" | "run" | "page" }) {
  onSettled(() => {
    document.title = props.page.group ? new SPACES.SpellProjectRoot(props.page.group).title : `@${props.page.org}`
    if (props.mode !== "edit" && props.page.group) showsOwnPage(props.page.group)
  })
  return (
    <SpellPage id="ProjectChooser" fillWindow dark scrolling>
      <ChooserToolbar isHome={false} />
      <div class="Home GroupPage">
        <Show when={props.page.group} keyed fallback={<OrgSection org={props.page.org} />}>
          {(group) => <OneGroup group={group} org={props.page.org} />}
        </Show>
      </div>
    </SpellPage>
  )
}

/**
 * One group's page:  its title and whose it is, its cards (its own page's first, marked), then its README.
 * - The README comes from the server (`SPACES.GROUP_README_URL`):  none, nothing shows.
 */
function OneGroup(props: { group: SP.ProjectRootPath; org: string }) {
  const projectRoot = new SPACES.SpellProjectRoot(props.group)
  const root = trackProjectRoot(() => projectRoot)
  // read once it's drawn, never holding the cards up while it comes
  const [readme, setReadme] = createSignal("")
  onSettled(() => {
    void readmeOf(props.group)
      .then((text) => setReadme(text ?? ""))
      .catch((error: unknown) => console.error("the group's README didn't show", error))
  })
  return (
    <>
      <HomeSection
        id="group"
        heading={projectRoot.title}
        line={appTexts.text("homeOrgLine", { org: props.org })}
        lineIcon="users"
      >
        <GroupCards
          projectRoot={projectRoot}
          root={root()}
          ownPage={SPACES.groupPages.includes(props.group)}
          empty={appTexts.text("groupPageNone", { folder: SPACES.folderNameOf(props.group) })}
        />
      </HomeSection>
      <Show when={readme()}>
        {(text) => (
          <section class="GroupReadme">
            <ui-markdown sanitized="" skip-title="" heading-offset="1">
              {text()}
            </ui-markdown>
          </section>
        )}
      </Show>
    </>
  )
}

/**
 * Group `group`'s README, its text;  `undefined` when it has none.
 * - NEVER throws:  a failure is one line in the console, and no README.
 */
async function readmeOf(group: string): Promise<string | undefined> {
  try {
    const url = SPACES.GROUP_README_URL + SP.SpellUrls.encodeAddress(group)
    const answer = await $fetch<SPACES.GroupReadme>({ url, format: "json", cache: "no-cache" })
    return answer.readme
  } catch (error) {
    console.error(`couldn't read ${group}'s README`, error)
    return undefined
  }
}

/**
 * A group holding its own page (`SPACES.groupPages`), reached from inside the app (`/@acme/org-spell` from the home
 * page's title):  load the address again, so the server sends the run page, which runs it (`editorPageFor()`).
 * - Once per address in a while:  a server that doesn't see the page sends this one back, and it stays.
 * - NEVER throws.
 */
function showsOwnPage(group: SP.ProjectRootPath): void {
  if (!SPACES.groupPages.includes(group)) return
  const key = `spell:group-page-load:${location.pathname}`
  try {
    const last = Number(sessionStorage.getItem(key) ?? 0)
    if (Date.now() - last < RELOAD_WAIT_MS) return
    sessionStorage.setItem(key, String(Date.now()))
  } catch {
    return
  }
  location.reload()
}

/** How long a group's address isn't loaded again after it was, so a server that sends this page back can't loop. */
const RELOAD_WAIT_MS = 10_000
