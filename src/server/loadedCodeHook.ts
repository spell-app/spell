/**
 * Loaded FIRST in a background page server's process (`--import`, after `tsx`, by `PageServer.ensure()`):
 * notes every code file the server loads from here on (`LoadedCode.record()`, epic `epic-engine` I309).
 * - the root:  the process's folder, which `PidFile.ensure()` starts it in
 * - this file and `LoadedCode` aren't in the record themselves:  they load before the hook is in place
 */
import { LoadedCode } from "./LoadedCode"

LoadedCode.record(process.cwd())
