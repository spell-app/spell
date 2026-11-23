/**
 * Loaded FIRST in a background page server's process (`--import`, after `tsx`, by `PageServer.ensure()`):
 * notes every code file the server loads from here on (`LoadedCode.record()`, epic `epic-engine` I309).
 * - its record:  the file `LOADED_CODE_VARIABLE` names (`PidFile.codeFile`, by the spaces the server serves), taken
 *   out of the env so no process the server starts inherits it;  else Spell's own, in the process's folder, which
 *   `PidFile.ensure()` starts it in
 * - this file and `LoadedCode` aren't in the record themselves:  they load before the hook is in place
 */
import { LOADED_CODE_VARIABLE, LoadedCode } from "./LoadedCode"

const named = process.env[LOADED_CODE_VARIABLE]
delete process.env[LOADED_CODE_VARIABLE]
LoadedCode.record(named || LoadedCode.fileFor(process.cwd()))
