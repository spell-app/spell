/**
 * The page server's authenticated places, a ROUTE MODULE of the kit's page server (epic `data` P19):
 * the ONE place a secret a place needs is held, and said missing.
 * - Every project's authenticated places, read for its pages with the secret added:  `AuthenticatedPlaces`, at
 *   `/api/places/projects/<project>/<place>`.  Its routes are made here;  the app's route module hands in the projects.
 * - An Airtable base, so a program saying `family cookbook is an airtable at "appXXXXXXXXXXXXXX"` just works there:
 *   one case of them (`serveAirtableBase()`).
 *   - Only with `AIRTABLE_BASE` and `AIRTABLE_KEY` in the page server's environment:  a base's id, and a personal
 *     access token.  Nothing else registers for it, and nothing's loaded.
 *   - It answers at `/api/places/<base>`, behind the page server's `Guard`, where a program's `RemotePlace` looks.
 *   - ONE base, ONE key, called `AIRTABLE_KEY`:  a program naming another is told so.  More takes a `PlaceServer` of your own.
 * - Its secrets:  the environment the page server started with, else the ones typed in once (`SRV.Secrets`).
 * - As the page server starts, each secret a place needs that isn't set is said, one line each, never a value.
 * - Local only, as `Guard` is:  a hosted server is The Cloud's question.
 * - Node only.
 */
import { SRV } from "spell/server"
import type { RouteContext, RouteModule } from "spell/server/page"

import { AuthenticatedPlaces } from "./AuthenticatedPlaces"

/** The name of the key it holds. */
export const AIRTABLE_KEY = "AIRTABLE_KEY"

/** The environment variable naming the base. */
export const AIRTABLE_BASE = "AIRTABLE_BASE"

/** Serve the base `from` names:  nothing, if it names none. */
export async function serveAirtableBase(
  { router, guard }: Pick<RouteContext, "router" | "guard">,
  from: Readonly<Record<string, string | undefined>>
): Promise<void> {
  const base = from[AIRTABLE_BASE]
  if (!base || !from[AIRTABLE_KEY]) return
  // By file, when it's wanted:  a page server with no base loads no place
  const { AirtablePlace, PlaceKeys, PlaceServer } = await import("spell/server/places")
  const keys = new PlaceKeys({ names: [AIRTABLE_KEY], from })
  const place = new AirtablePlace({
    base,
    keyNamed: AIRTABLE_KEY,
    keys,
    ...(from.AIRTABLE_URL && { url: from.AIRTABLE_URL })
  })
  new PlaceServer({ places: { [base]: place }, keys }).route(router, guard)
}

/**
 * The Airtable base `from` names, as one of the authenticated places:  for the secret that isn't set.
 * - A base named with no key:  said at startup, and nothing served.
 */
function airtableSource(from: Readonly<Record<string, string | undefined>>) {
  const base = from[AIRTABLE_BASE]
  const place = base && { project: `the page server's ${AIRTABLE_BASE}`, name: base, at: base, keyNamed: AIRTABLE_KEY }
  return { every: () => (place ? [place] : []) }
}

const placeRoutes: RouteModule = {
  name: "places",
  async setup(context) {
    // the environment, else the secrets typed in once (`spell runbook`)
    const secrets = new SRV.Secrets().withEnvironment()
    const places = AuthenticatedPlaces.for(context).addSource(airtableSource(secrets))
    await serveAirtableBase(context, secrets)
    // after every route module's setup:  the app's hands in its projects
    context.onListening(() => places.sayMissing())
  }
}

export default placeRoutes
