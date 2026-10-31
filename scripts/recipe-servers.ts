/**
 * The recipe box demo's two servers, on one port, until you stop them (epic `data` P4):
 * - `yarn tsx scripts/recipe-servers.ts`, at the kit's root
 * - `http://127.0.0.1:4791/recipes`, with versions in a field;  `http://127.0.0.1:4791/graphql`
 * - The demo's page is `/guides/data/experiments/recipe-box/recipe-box.html`, on the page server.
 */
import { createServer } from "node:http"

import { SRV } from "spell/server"
import { bothHandlers, RecipeBox } from "spell/server/test/recipeServers"

const PORT = 4791

const server = createServer(SRV.toListener(bothHandlers(new RecipeBox())))
await SRV.listenPreferred(server, { port: PORT, fallback: false })
console.log(`the recipe servers are on http://127.0.0.1:${PORT}:  /recipes and /graphql.  Ctrl-C stops them.`)
