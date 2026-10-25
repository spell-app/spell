import type { E } from "spell-ui/core"

/**
 * `<ui-calendar>` in Spanish:  `<es-calendario>`, with the names and texts only it uses (from `UICalendar.en.ts`).
 * - The names it shares with other tags (`size`, `color`, `ui-changing` ...) are translated once, for every tag:
 *   in `components.es.ts`, with the values every tag shares.
 * - Names stay ASCII (no accents):  tags and attributes are typed, and a tag can't hold every letter safely.
 */
export const calendarEs = {
  lang: "es",
  tag: "ui-calendar",
  name: "calendario",
  aka: ["calendario", "selector de fecha", "selector de hora", "fecha y hora", "rango de fechas"],
  attributes: {
    type: "tipo",
    "initial-date": "fecha-inicial",
    "first-day-of-week": "primer-dia-semana",
    today: "hoy",
    "disable-minute": "sin-minutos",
    "disable-month": "sin-meses",
    "disable-year": "sin-anios",
    "select-adjacent-days": "seleccionar-dias-adyacentes",
    "start-calendar": "calendario-inicio",
    "end-calendar": "calendario-fin",
    "disabled-dates": "fechas-desactivadas",
    "disabled-days-of-week": "dias-semana-desactivados"
  },
  parts: { calendar: "calendario", previous: "anterior", next: "siguiente", cell: "celda", today: "hoy" },
  texts: {
    calendarToday: "Hoy",
    calendarNow: "Ahora",
    calendarChooseDate: "Elegir fecha",
    calendarChooseTime: "Elegir hora",
    calendarPreviousYears: "Años anteriores",
    calendarNextYears: "Años siguientes",
    calendarPreviousYear: "Año anterior",
    calendarNextYear: "Año siguiente",
    calendarPreviousMonth: "Mes anterior",
    calendarNextMonth: "Mes siguiente",
    calendarPreviousDay: "Día anterior",
    calendarNextDay: "Día siguiente",
    calendarHours: "Horas",
    calendarMinutes: "Minutos"
  }
} as const satisfies E.TagDictionary
