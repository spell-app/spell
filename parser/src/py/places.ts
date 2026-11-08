/**
 * The kinds of place a Python program keeps things in (epic `data` P40), by their words, as a program's line says them:
 * what the `py` target can do (`SP.TARGETS`), so a project with a place of any other kind is refused as it compiles.
 * - `database on this device`:  a JSON file beside the compiled program, `<Program>.device.json`
 * - `data folder`, `sheet` and `excel file`:  through the page server's place routes, as a browser's page reaches them
 * - `spell_core`'s `place_kinds.py` makes each;  NOT the Atmosphere, a web server, GraphQL, Airtable, a Google sheet,
 *   a room or the cloud, yet
 */
export const PLACE_KINDS: readonly string[] = ["database on this device", "data folder", "sheet", "excel file"]
