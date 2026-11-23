import { core, Thing, List, App, Place, h } from "@spell/core"

export class Forecast extends Thing {
  static { this.declareProp("latitude", { type: "number" }) }
  get latitude() { return this.getProp("latitude") }
  set latitude(value) { this.setProp("latitude", value) }

  static { this.declareProp("longitude", { type: "number" }) }
  get longitude() { return this.getProp("longitude") }
  set longitude(value) { this.setProp("longitude", value) }

  static { this.declareProp("generationtimeMs", { type: "number" }) }
  get generationtimeMs() { return this.getProp("generationtimeMs") }
  set generationtimeMs(value) { this.setProp("generationtimeMs", value) }

  static { this.declareProp("utcOffsetSeconds", { type: "number" }) }
  get utcOffsetSeconds() { return this.getProp("utcOffsetSeconds") }
  set utcOffsetSeconds(value) { this.setProp("utcOffsetSeconds", value) }

  static { this.declareProp("timezone", { type: "text" }) }
  get timezone() { return this.getProp("timezone") }
  set timezone(value) { this.setProp("timezone", value) }

  static { this.declareProp("timezoneAbbreviation", { type: "text" }) }
  get timezoneAbbreviation() { return this.getProp("timezoneAbbreviation") }
  set timezoneAbbreviation(value) { this.setProp("timezoneAbbreviation", value) }

  static { this.declareProp("elevation", { type: "number" }) }
  get elevation() { return this.getProp("elevation") }
  set elevation(value) { this.setProp("elevation", value) }

  static { this.declareProp("current", { type: "Current" }) }
  get current() { return this.getProp("current") }
  set current(value) { this.setProp("current", value) }

  static { this.declareProp("hours", { itemType: "Hour", storedAs: "hourly", init: () => new List({ instanceType: "Hour" }) }) }
  get hours() { return this.getProp("hours") }
  set hours(value) { this.setProp("hours", value) }

  draw() {
    return h("ui-stack", { spacing: "lg" },
      h("ui-segment", { padded: "very" },
        h("ui-stack", { align: "center", spacing: "xs" },
          h("ui-emoji", { name: () => pictureTheWeatherCode(this.current?.weatherCode), size: "large" }),
          h("ui-statistic", { size: "huge" },
            h("ui-value", () => core.measureShown(this.current?.temperature, "Temperature", "celsius"))
          ),
          h("ui-text", { size: "large" }, () => nameTheWeatherCode(this.current?.weatherCode))
        )
      ),
      h("ui-segment",
        h("ui-stack", { class: "hours", direction: "horizontal", spacing: "lg" },
          () => core.drawItems(this.hours)
        )
      )
    )
  }

  static savedIn = {
    place: "open_meteo",
    collection: "forecasts",
    times: ["created", "modified"], select: ["latitude", "longitude", "current", "hours"] }

  static { this.declareProp("created", { type: "date" }) }
  get created() { return this.getProp("created") }
  set created(value) { this.setProp("created", value) }

  static { this.declareProp("modified", { type: "date" }) }
  get modified() { return this.getProp("modified") }
  set modified(value) { this.setProp("modified", value) }
}

export class Current extends Thing {
  static { this.declareProp("time", { type: "date" }) }
  get time() { return this.getProp("time") }
  set time(value) { this.setProp("time", value) }

  static { this.declareProp("interval", { type: "number" }) }
  get interval() { return this.getProp("interval") }
  set interval(value) { this.setProp("interval", value) }

  static { this.declareProp("temperature", { type: "number", storedAs: "temperature_2m" }) }
  get temperature() { return this.getProp("temperature") }
  set temperature(value) { this.setProp("temperature", value) }

  static { this.declareProp("weatherCode", { type: "number" }) }
  get weatherCode() { return this.getProp("weatherCode") }
  set weatherCode(value) { this.setProp("weatherCode", value) }
}

export class Hour extends Thing {
  static { this.declareProp("time", { type: "date" }) }
  get time() { return this.getProp("time") }
  set time(value) { this.setProp("time", value) }

  static { this.declareProp("temperature", { type: "number", storedAs: "temperature_2m" }) }
  get temperature() { return this.getProp("temperature") }
  set temperature(value) { this.setProp("temperature", value) }

  static { this.declareProp("weatherCode", { type: "number" }) }
  get weatherCode() { return this.getProp("weatherCode") }
  set weatherCode(value) { this.setProp("weatherCode", value) }

  draw() {
    return h("ui-stack", { align: "center", spacing: "xs" },
      h("ui-text", { size: "small", color: "grey" }, () => core.dateAs(this.time, "short time")),
      h("ui-emoji", { name: () => pictureTheWeatherCode(this.weatherCode), size: "small" }),
      h("ui-text", () => core.measureShown(this.temperature, "Temperature", "celsius"))
    )
  }
}

export class OpenMeteo extends Place {}
export const openMeteo = core.place(new OpenMeteo(), {
  name: "open_meteo",
  kind: "web server",
  at: "https://api.open-meteo.com",
  checkedEvery: 30,
  namesLike: "generationtime_ms",
  collections: { forecasts: { at: "/v1/forecast?current=temperature_2m,weather_code&hourly=temperature_2m,weather_code&forecast_hours=12&timezone=auto", askedBy: ["latitude", "longitude"] } }
})

// -----------
export function nameTheWeatherCode(code) {
  return core.asAction({ undoneAs: "Name the Weather Code" }, () => {
    if (code === 0) return "Clear"
    if (code <= 2) return "Partly cloudy"
    if (code === 3) return "Cloudy"
    if (code <= 48) return "Fog"
    if (code <= 67) return "Rain"
    if (code <= 77) return "Snow"
    if (code <= 82) return "Showers"
    if (code <= 86) return "Snow showers"
    return "Thunderstorms"
  })
}

export function pictureTheWeatherCode(code) {
  return core.asAction({ undoneAs: "Picture the Weather Code" }, () => {
    if (code === 0) return "sun"
    if (code <= 2) return "sun_behind_cloud"
    if (code === 3) return "cloud"
    if (code <= 48) return "fog"
    if (code <= 67) return "cloud_with_rain"
    if (code <= 77) return "cloud_with_snow"
    if (code <= 82) return "sun_behind_rain_cloud"
    if (code <= 86) return "cloud_with_snow"
    return "cloud_with_lightning_and_rain"
  })
}
// -----------
export class City extends Thing {
  static { this.declareProp("name", { type: "text" }) }
  get name() { return this.getProp("name") }
  set name(value) { this.setProp("name", value) }

  static { this.declareProp("latitude", { type: "number" }) }
  get latitude() { return this.getProp("latitude") }
  set latitude(value) { this.setProp("latitude", value) }

  static { this.declareProp("longitude", { type: "number" }) }
  get longitude() { return this.getProp("longitude") }
  set longitude(value) { this.setProp("longitude", value) }
}

export class Weather extends App {
  static elementTag = core.defineElement(this, "test-project", "App")

  static { this.declareProp("cities", { itemType: "City", init: () => new List({ instanceType: "City" }) }) }
  get cities() { return this.getProp("cities") }
  set cities(value) { this.setProp("cities", value) }

  static { this.declareProp("place", { type: "text" }) }
  get place() { return this.getProp("place") }
  set place(value) { this.setProp("place", value) }

  create() {
    core.append(this.cities, new City({
      name: "Berlin",
      latitude: 52.52,
      longitude: 13.41
    }))
    core.append(this.cities, new City({
      name: "New York",
      latitude: 40.71,
      longitude: -74.01
    }))
    core.append(this.cities, new City({
      name: "Tokyo",
      latitude: 35.68,
      longitude: 139.69
    }))
    core.append(this.cities, new City({
      name: "Buenos Aires",
      latitude: -34.6,
      longitude: -58.38
    }))
    this.place = "Berlin"
  }

  get city() {
    return core.getItemAt(core.filter(this.cities, (city) => city.name === this.place), 0)
  }

  static { this.declareProp("forecasts", { readsFrom: ["open_meteo"] }) }
  get forecasts() { return core.waitedValue(this, "forecasts", async () => {
    return await core.savedThings(Forecast, { filter: { latitude: this.city.latitude, longitude: this.city.longitude } })
  }, () => [this.city]) }

  draw() {
    return h("ui-container", { text: true },
      h("ui-stack", { spacing: "lg" },
        h("ui-form", { "prop:value": this },
          h("ui-select", { name: "place", "aria-label": "City" },
            () => core.drawEach(this.cities, (city) => h("ui-item", { value: () => city.name }, () => city.name))
          )
        ),
        () => core.drawRead(() => this.forecasts, (forecast) => core.drawThing(forecast), { waitingSay: () => "Asking Open-Meteo", failedSay: () => "Open-Meteo can't be reached just now." }),
        h("ui-text", { size: "small", color: "grey" },
          "From ",
          h("ui-link", { link: "https://open-meteo.com" }, "Open-Meteo"),
          ", in your own units."
        )
      )
    )
  }
}
export const weather = new Weather()

// -----------
core.installStyles(undefined, `/* File styles.css:  what Spell UI's tags can't say yet.¬   - The hours to come are one row that scrolls sideways, each hour as wide as it needs. */¬.hours {¬  overflow-x: auto;¬}¬.hours > * {¬  flex: none;¬}¬`)
// -----------
if (!core.isCarryingOver) weather.start()
