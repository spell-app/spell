import { createSignal, Show } from "solid-js"

import { KnownFormat, LoadableFile } from "spell/util"

import { SPACES } from "spell/app/spaces"
import { appTexts } from "spell/app/app/ui/AppTexts"
import { SpellPage } from "./SpellPage"

import "./NamePage.css"

/** Where the editor reads and names this machine's person:  spaces' people routes (`peopleRoutes.ts`). */
const LOCAL_URL = "/api/people/local"

/**
 * WHO'S AT THIS MACHINE, as the editor knows it (epic `repo-split` P27):  read before it draws anything.
 * - The server says (`GET /api/people/local`):  the person and their org, from the app's settings and folder.
 * - Read once, at start-up (`index.tsx`);  never in the static build, whose person is `you@spell`.
 */
export const LocalPerson = {
  /**
   * Read who's here, and set them on spaces' models (`SPACES.setLocalPerson()`), with their org's groups.
   * - Resolves the server's answer;  `undefined` when it can't be read:  the editor goes on as `owen@spell`, as before.
   * - NEVER throws:  a failure is one line in the console.
   */
  async load(): Promise<SPACES.LocalPersonAnswer | undefined> {
    try {
      const answer = await localRequest("GET")
      LocalPerson.take(answer)
      return answer
    } catch (error) {
      console.error(`${LOCAL_URL} didn't answer, so this machine's person stays ${SPACES.localPerson.address}:`, error)
      return undefined
    }
  },

  /** Set what `answer` says on spaces' models:  the person, once named, every org group served, and their own pages. */
  take(answer: SPACES.LocalPersonAnswer): void {
    if (answer.id) SPACES.setLocalPerson({ id: answer.id, org: answer.org })
    SPACES.addOrgGroups(answer.orgGroups)
    SPACES.addGroupPages(answer.groupPages ?? [])
  },

  /**
   * Should the editor ask this machine's person's name before anything else?
   * - Only when nobody's named, and the page is served from this machine:  a name is kept in its app's folder.
   */
  asks(answer: SPACES.LocalPersonAnswer | undefined): boolean {
    return !!answer && !answer.id && THIS_MACHINE.test(location.hostname)
  }
}

/** The names a page served from this machine has:  `localhost`, `127.0.0.1`, `[::1]`. */
const THIS_MACHINE = /^(localhost|127\.0\.0\.1|\[::1\])$/

/****************
 * ### `<NamePage>`
 * The editor's first page on a machine nobody's named yet:  "Your name", their org on its right (`@acme`).
 * - Started from git's email (`alice@acme.com` => `alice`), and theirs to change.
 * - Says when that name already has a space here:  "alice@acme already has a space here:  that's you?"
 * - Start (or Enter) names them on the server (`POST /api/people/local`):  the app's me file and their `__me.json5`;
 *   then `onNamed`, and the editor draws.
 ****************/
export function NamePage(props: NamePageProps) {
  // the field starts as git's email makes it, and is then theirs:  never written again as they type
  const startingName = SPACES.personIdFor(props.local.email ?? "")
  const [typed, setTyped] = createSignal(startingName)
  const [error, setError] = createSignal<string>()
  const [isSaving, setIsSaving] = createSignal(false)
  const id = () => SPACES.personIdFor(typed())
  const isTaken = () => !!id() && props.local.people.includes(id())
  return (
    <SpellPage id="NamePage" fillWindow dark>
      <div class="NameCard">
        <h1>{appTexts.text("nameHeading")}</h1>
        <p class="line">{appTexts.text("nameLine", { org: `@${props.local.org}` })}</p>
        <ui-form>
          <ui-field>
            <label for="NamePage-name">{appTexts.text("yourName")}</label>
            <ui-input
              id="NamePage-name"
              name="name"
              label={`@${props.local.org}`}
              labeled="right"
              value={startingName}
              autofocus=""
              ref={(input: HTMLElement) => {
                input.addEventListener("ui-typed", (event) =>
                  setTyped((event as CustomEvent<{ value: string }>).detail.value)
                )
                input.addEventListener("keydown", (event) => {
                  if ((event as KeyboardEvent).key === "Enter") void start()
                })
              }}
            />
          </ui-field>
        </ui-form>
        <Show when={isTaken()}>
          <p class="taken">{appTexts.text("nameTaken", { address: `${id()}@${props.local.org}` })}</p>
        </Show>
        <Show when={error()}>
          <ui-message state="error" size="small">
            {error()}
          </ui-message>
        </Show>
        <ui-button color="primary" disabled={isSaving() || !id()} onClick={() => void start()}>
          {appTexts.text("nameStart")}
        </ui-button>
      </div>
    </SpellPage>
  )

  /** Name them on the server, then hand on;  a name with no letters, or a failure, is said on the page. */
  async function start() {
    if (isSaving()) return
    if (!id()) return setError(appTexts.text("nameNeeded"))
    setIsSaving(true)
    try {
      const answer = await localRequest("POST", { id: id() })
      LocalPerson.take(answer)
      props.onNamed()
    } catch (failure) {
      setError(failure instanceof Error ? failure.message : String(failure))
      setIsSaving(false)
    }
  }
}

/** Props for `<NamePage>`. */
export type NamePageProps = {
  /** Who's here, as the server says:  nobody named yet, their org, its people here, git's email. */
  local: SPACES.LocalPersonAnswer
  /** Called once they're named, and set on spaces' models. */
  onNamed: () => void
}

/** `GET` or `POST /api/people/local`, its answer read;  throws if it fails. */
function localRequest(method: "GET" | "POST", change?: SPACES.LocalPersonChange): Promise<SPACES.LocalPersonAnswer> {
  return LoadableFile.fetch<SPACES.LocalPersonAnswer>({
    url: LOCAL_URL,
    method,
    format: KnownFormat.json,
    ...(change && { contents: change, requestFormat: KnownFormat.json })
  })
}
