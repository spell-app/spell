/**
 * Two people on a live room, in two windows (epic `data` P13):  `yarn tsx scripts/live-room-demo.ts`, in the app folder, until you stop it.
 * - It runs the frozen test project, `@spell/test/live-room`, on the demo's servers.
 * - `yarn build:element` first:  the page needs its built `<spell-viewer>`.
 * - It prints the two addresses to open, each saying who's at it.  Its recipes are kept in a folder of the system's, between runs.
 */
import { tmpdir } from "node:os"
import { join } from "node:path"

import { startLiveRoomPages } from "spell/app/spaces/test/liveRoomPages"

const PORT = 4792

const demo = await startLiveRoomPages({ port: PORT, folder: join(tmpdir(), "spell-live-room") })
const page = demo.serve("english")
console.log(`Open these two, side by side:\n  ${page}?person=Ana\n  ${page}?person=Bo`)
console.log(`Spanish:\n  ${demo.serve("spanish")}?person=Ana\n  ${demo.serve("spanish")}?person=Bo`)
console.log("Ctrl-C stops it.")
