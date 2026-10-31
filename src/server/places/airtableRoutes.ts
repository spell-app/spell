/**
 * An Airtable base behind the page server, so a program saying `family cookbook is an airtable at "appXXXXXXXXXXXXXX"` just works there:
 * a ROUTE MODULE of the kit's page server (epic `data` P19).
 * - Only with `AIRTABLE_BASE` and `AIRTABLE_KEY` in the page server's environment:  a base's id, and a personal access token.
 *   Nothing else registers, and nothing's loaded.
 * - It answers at `/api/places/<base>`, behind the page server's `Guard`, where a program's `RemotePlace` looks.
 * - ONE base, ONE key, called `AIRTABLE_KEY`:  a program naming another is told so.  More takes a `PlaceServer` of your own.
 * - Local only, as `Guard` is:  a hosted server is The Cloud's question.
 * - Node only.
 */
import type { RouteContext, RouteModule } from "spell/server/page"

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

const airtableRoutes: RouteModule = {
  name: "airtable",
  setup: (context) => serveAirtableBase(context, process.env)
}

export default airtableRoutes
