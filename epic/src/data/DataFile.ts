// `DataFile`, the tooling's JSON5 data files:  the kit server's since epic `epic-eject` I5 (`spell/server/DataFile`),
// so spell-app's CLI reads the commands page's data without the engine.  Re-exported here, so the engine's own code
// keeps importing `spell-epic/data/DataFile`, and plain `node` (the docs tools' `details.js` ...) `../data/DataFile.ts`.
// - By the assembler's package entry (its `exports`, epic `repo-split` P6), through the `portal:` package:  plain
//   `node` loads it, types stripped
export { DataFile, type DataFileMove } from "spell/server/DataFile"
