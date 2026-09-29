import { describe, expect, it } from "vitest"

import { I18n } from "./I18n"

describe("I18n", () => {
  it("ships the en pack and interpolates {name}", () => {
    const i18n = new I18n({ locale: "en-US" })
    expect(i18n.t("noResults")).toBe("No results found.")
    expect(i18n.t("addItem", { value: "Apples" })).toBe("Add Apples")
    expect(i18n.t("addItem")).toBe("Add {value}")
    expect(i18n.t("addItem", { other: 1 })).toBe("Add {value}")
  })

  it("falls back locale -> language -> en -> key", () => {
    const i18n = new I18n({ locale: "pt-BR" })
    i18n.register("pt", { close: "Fechar", cancel: "Cancelar" })
    i18n.register("pt-BR", { cancel: "Cancelar (BR)" })
    expect(i18n.t("cancel")).toBe("Cancelar (BR)")
    expect(i18n.t("close")).toBe("Fechar")
    expect(i18n.t("ok")).toBe("OK")
    expect(i18n.t("unknown.key")).toBe("unknown.key")
    expect(i18n.has("unknown.key")).toBe(false)
  })

  it("register() merges into an existing pack", () => {
    const i18n = new I18n({ locale: "en" })
    i18n.register("en", { close: "Dismiss" })
    expect(i18n.t("close")).toBe("Dismiss")
    expect(i18n.t("cancel")).toBe("Cancel")
  })

  it("formats dates and numbers for the locale", () => {
    const i18n = new I18n({ locale: "de-DE" })
    expect(i18n.formatNumber(1234.5)).toBe("1.234,5")
    expect(i18n.formatDate(new Date(Date.UTC(2026, 8, 28, 12)), { dateStyle: "short", timeZone: "UTC" })).toBe(
      "28.09.26"
    )
  })

  it("lists weekdays (Sunday first) and months", () => {
    const i18n = new I18n({ locale: "en-US" })
    expect(i18n.weekdays()).toEqual(["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"])
    expect(i18n.months("short").slice(0, 3)).toEqual(["Jan", "Feb", "Mar"])
    expect(new I18n({ locale: "fr" }).months()[0]).toBe("janvier")
  })

  it("knows the first day of the week and display names", () => {
    expect(new I18n({ locale: "en-US" }).firstDayOfWeek()).toBe(0)
    expect(new I18n({ locale: "en-GB" }).firstDayOfWeek()).toBe(1)
    expect(new I18n({ locale: "en" }).displayName("region", "DE")).toBe("Germany")
  })
})
