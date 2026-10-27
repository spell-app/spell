/**
 * `spell/epic/phases` barrel:  a phase's stable id and the number people see (`PhaseIds`:  `p-epic-migrate`, `P7`),
 * and an epic page's stage, which decides what it shows (`PageStages`:  `overview`, `phases`, `building`), for
 * the elements AND the node tools.
 * - Node-safe:  works on whatever DOM it's handed (linkedom or the browser's), touches no DOM global.
 */
export * from "./PageStages"
export * from "./PhaseIds"
