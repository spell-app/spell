/// <reference types="node" />

/**
 * `yarn build`:  the Solid 2 host app and the shared vendored Solid, see `SharedBuild`.
 */

import { SharedBuild } from "./SharedBuild.ts"

await SharedBuild.all()
