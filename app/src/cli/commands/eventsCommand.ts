import { CLI } from "spell/cli"

/**
 * `spell events write | check`:  the events page's data, every event a page can listen for and the Spell line that
 * hears it (`EventsPage`, epic `language` P67).
 * - `write`:  writes `guides/events/events.json5` in the epic repo, if it changed.
 * - `check`:  writes nothing, and fails while it's stale.
 * - Loads no spell but what the page reads:  the vocabularies and the core's messages.
 */
export async function eventsCommand({ isCheck }: { isCheck: boolean }): Promise<number> {
  const { EventsPage } = await import("spell/app/cli/EventsPage")
  const isStale = await EventsPage.write({ isCheck })
  const file = EventsPage.dataFile()
  if (isCheck && isStale) {
    process.stderr.write(`${file} is stale:  run \`spell events write\`\n`)
    return CLI.EXIT.ERRORS
  }
  process.stdout.write(isStale ? `wrote ${file}\n` : "the events page's data is up to date\n")
  return CLI.EXIT.OK
}
