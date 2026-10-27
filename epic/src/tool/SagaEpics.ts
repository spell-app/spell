import { existsSync, readdirSync, readFileSync } from "node:fs"
import { join } from "node:path"

import { parseHTML } from "linkedom"

// Import directly:  the `spell/server/site` barrel is browser code (the site header);  this file imports nothing
import { URGENT_SELECTOR } from "spell/epic/list/EpicState"
import { PhaseIds } from "spell/epic/phases"
import { localMinutes } from "spell/util/time"
import { FAVORITES_FILE, eventTimesIn, favoritesIn, lastWorked } from "spell/epic/list/EpicCards"

import { EpicConfig } from "spell/epic/config/EpicConfig"
import { DataFile } from "spell/epic/data/DataFile"

import type { SagaEpic, SagaEpicsAnswer } from "spell/epic/components/epic-cards/EpicCards.types"

import { PlanDocFiles } from "./PlanDocFiles"

/****************
 * ### `SagaEpics`
 * The epics serving a saga, as a saga page's Epics draws them (`<epic-cards>`, epic `epic-workflow` P15):
 * every epic page whose `<epic-page saga>` names it.
 * - GATHERED when asked, from each epic page's SKELETON (no parts):  its title, summary, phases' statuses, `updated`,
 *   `future`, `standing` and the items that need Owen -- what `spell/epic/list/EpicState` reads an epic's state from
 *   - and when it was last worked on (its `updated`, its log lines:  the doc's and its `parts/log.html`), and whether
 *     Owen starred it (`FAVORITES_FILE`):  its card is the Epics page's, `<epic-card>` (epic `epic-engine` I39)
 * - nothing kept:  an epic that joins or leaves the saga, or finishes a phase, shows on the next ask
 * - read by the page server (`GET /api/epics/saga?saga=<id>`, `epicRoutes.ts`), which `<epic-cards>` asks
 * - Node only (`node:fs`, linkedom):  NOT in the `spell-epic` barrel, imported by path.
 ****************/
export class SagaEpics {
  /** the content folder of checkout `root`'s repo (`EpicConfig.contentOf()`):  its `epics/` */
  readonly content: string

  /** The sagas' epics of the repo checkout `root` is in. */
  constructor(root: string) {
    this.content = EpicConfig.contentOf(root)
  }

  /**
   * Saga `saga`'s epics, by title:  each with its link from the saga page's folder (`sagas/<id>/`), its summary,
   * and the facts its state is read from.
   * - an epic page that won't parse is left out
   */
  of(saga: string): SagaEpicsAnswer {
    const epics = join(this.content, "epics")
    const names = existsSync(epics)
      ? readdirSync(epics, { withFileTypes: true })
          .filter((entry) => entry.isDirectory())
          .map((entry) => entry.name)
      : []
    const favorites = this.favorites()
    const found = names.flatMap((name): SagaEpic[] => {
      const file = PlanDocFiles.planDocIn(join(epics, name), name)
      if (!file) return []
      const epic = SagaEpics.read(name, readFileSync(file, "utf8"), file.endsWith(".plan.html"))
      if (epic?.saga !== saga) return []
      const log = join(epics, name, "parts", "log.html")
      const worked = lastWorked([epic.card.worked, ...(existsSync(log) ? eventTimesIn(readFileSync(log, "utf8")) : [])])
      return [{ ...epic.card, worked: worked && localMinutes(worked), favorite: favorites.has(name) }]
    })
    found.sort((a, b) => a.title.localeCompare(b.title, undefined, { numeric: true, sensitivity: "base" }))
    return { saga, epics: found }
  }

  /** The starred epics' names (`FAVORITES_FILE`);  none when it won't read.  NEVER throws. */
  favorites(): Set<string> {
    try {
      return favoritesIn(DataFile.read(join(this.content, FAVORITES_FILE)))
    } catch {
      return new Set()
    }
  }

  /**
   * Epic `name`'s card from its skeleton `html`, with the saga it names;  `undefined` when it holds no `<epic-page>`.
   * - `planName`:  its file is `<name>.plan.html` (else the older `<name>.html`), for its link
   */
  static read(name: string, html: string, planName = true): { saga: string | null; card: SagaEpic } | undefined {
    const { document } = parseHTML(html)
    const page = document.querySelector("epic-page")
    if (!page) return undefined
    const phases = Array.from(document.querySelectorAll('epic-section[kind="phases"] > epic-phase'))
    const active = phases.find((phase) => phase.getAttribute("status") === "active")
    const activeTitle = active?.getAttribute("title") ?? active?.querySelector(":scope > [slot=title]")?.textContent
    return {
      saga: page.getAttribute("saga"),
      card: {
        name,
        title: page.getAttribute("title") ?? name,
        href: `/epics/${name}/${name}${planName ? ".plan" : ""}.html`,
        summary: (document.querySelector("epic-summary")?.textContent ?? "").replace(/\s+/g, " ").trim(),
        facts: {
          phases: phases.map((phase) => phase.getAttribute("status") ?? "todo"),
          updated: page.getAttribute("updated"),
          future: page.hasAttribute("future"),
          standing: page.hasAttribute("standing"),
          urgent: Array.from(document.querySelectorAll(URGENT_SELECTOR), (item) => item.id),
          // its number as drawn (P7, P11.1), never its id:  phase ids may be words (P15's stable ids)
          active: active ? `${PhaseIds.labelOf(active)} · ${(activeTitle ?? "").trim()}` : undefined
        },
        // the doc's own:  its `updated` day and log lines;  `of()` adds its log part's
        worked: SagaEpics.worked([page.getAttribute("updated"), ...eventTimesIn(html)])
      }
    }
  }

  /** The latest of `values` (`lastWorked()`), local ISO;  `undefined` when none reads. */
  private static worked(values: (string | null)[]): string | undefined {
    const date = lastWorked(values)
    return date && localMinutes(date)
  }
}
