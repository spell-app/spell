import { core, Thing, List, App, Place, h } from "@spell/core"

core.heading("Open-Meteo:  the weather now, and hour by hour, for anywhere on Earth")
///////////////////////////////////////////////////////////////////////////
// ## Open-Meteo:  the weather now, and hour by hour, for anywhere on Earth
///////////////////////////////////////////////////////////////////////////
// A server other people run, and what it holds.  What's drawn from it is in Weather.spell.
// `open meteo` is what this wrote, from looking at the server:
//   spell place ingest https://api.open-meteo.com --into Weather.api.spell --name "open meteo" --no-ai
//     --collections "forecasts=/v1/forecast?latitude=52.52&longitude=13.41&current=temperature_2m,weather_code&hourly=temperature_2m,weather_code&forecast_hours=12&timezone=auto"
// `spell place update Weather.api.spell` looks again, and changes only this file and Weather.api.json5.
// It has no list of forecasts:  each is asked for by where it's for, `every forecast where its latitude is ... and its longitude is ...`.
// Its hours, the next 12, come as lists side by side, one of times and one of each measure:  each hour is read as one of each.
// Each temperature is in °C, and shows in the reader's own units:  °F in the US.
// Its weather is a WMO code, a number:  Sky.spell says what each one looks like.

export class Forecast extends Thing {
  // - its "latitude" is a number
  static { this.declareProp("latitude", { type: "number", declaredAt: { path: "/Weather.api.spell", start: 1422, end: 1448 } }) }
  get latitude() { return this.getProp("latitude") }
  set latitude(value) { this.setProp("latitude", value) }

  // - its "longitude" is a number
  static { this.declareProp("longitude", { type: "number", declaredAt: { path: "/Weather.api.spell", start: 1450, end: 1477 } }) }
  get longitude() { return this.getProp("longitude") }
  set longitude(value) { this.setProp("longitude", value) }

  // - its "generationtime ms" is a number
  static { this.declareProp("generationtimeMs", { type: "number", declaredAt: { path: "/Weather.api.spell", start: 1479, end: 1514 } }) }
  get generationtimeMs() { return this.getProp("generationtimeMs") }
  set generationtimeMs(value) { this.setProp("generationtimeMs", value) }

  // - its "utc offset seconds" is a number
  static { this.declareProp("utcOffsetSeconds", { type: "number", declaredAt: { path: "/Weather.api.spell", start: 1516, end: 1552 } }) }
  get utcOffsetSeconds() { return this.getProp("utcOffsetSeconds") }
  set utcOffsetSeconds(value) { this.setProp("utcOffsetSeconds", value) }

  // - its "timezone" is text
  static { this.declareProp("timezone", { type: "text", declaredAt: { path: "/Weather.api.spell", start: 1554, end: 1576 } }) }
  get timezone() { return this.getProp("timezone") }
  set timezone(value) { this.setProp("timezone", value) }

  // - its "timezone abbreviation" is text
  static { this.declareProp("timezoneAbbreviation", { type: "text", declaredAt: { path: "/Weather.api.spell", start: 1578, end: 1613 } }) }
  get timezoneAbbreviation() { return this.getProp("timezoneAbbreviation") }
  set timezoneAbbreviation(value) { this.setProp("timezoneAbbreviation", value) }

  // - its "elevation" is a number
  static { this.declareProp("elevation", { type: "number", declaredAt: { path: "/Weather.api.spell", start: 1615, end: 1642 } }) }
  get elevation() { return this.getProp("elevation") }
  set elevation(value) { this.setProp("elevation", value) }

  // - its "current" is a current
  static { this.declareProp("current", { type: "Current", declaredAt: { path: "/Weather.api.spell", start: 1644, end: 1670 } }) }
  get current() { return this.getProp("current") }
  set current(value) { this.setProp("current", value) }

  // - its "hours" is a list of hours, stored as "hourly"
  static { this.declareProp("hours", { itemType: "Hour", storedAs: "hourly", init: () => new List({ instanceType: "Hour" }), declaredAt: { path: "/Weather.api.spell", start: 1672, end: 1722 } }) }
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

  // - it lives in open meteo
  static { this.declareProp("created", { type: "date", declaredAt: { path: "/Weather.api.spell", start: 1398, end: 1420 } }) }
  get created() { return this.getProp("created") }
  set created(value) { this.setProp("created", value) }

  // - it lives in open meteo
  static { this.declareProp("modified", { type: "date", declaredAt: { path: "/Weather.api.spell", start: 1398, end: 1420 } }) }
  get modified() { return this.getProp("modified") }
  set modified(value) { this.setProp("modified", value) }
}

export class Current extends Thing {
  // - its "time" is a date
  static { this.declareProp("time", { type: "date" }) }
  get time() { return this.getProp("time") }
  set time(value) { this.setProp("time", value) }

  // - its "interval" is a duration in seconds
  static { this.declareProp("interval", { type: "number" }) }
  get interval() { return this.getProp("interval") }
  set interval(value) { this.setProp("interval", value) }

  // - its "temperature" is a temperature in °C, stored as "temperature_2m"
  static { this.declareProp("temperature", { type: "number", storedAs: "temperature_2m" }) }
  get temperature() { return this.getProp("temperature") }
  set temperature(value) { this.setProp("temperature", value) }

  /** in wmo code */
  // - its "weather code" is a number
  //   -- in wmo code
  static { this.declareProp("weatherCode", { type: "number" }) }
  get weatherCode() { return this.getProp("weatherCode") }
  set weatherCode(value) { this.setProp("weatherCode", value) }
}

export class Hour extends Thing {
  // - its "time" is a date
  static { this.declareProp("time", { type: "date" }) }
  get time() { return this.getProp("time") }
  set time(value) { this.setProp("time", value) }

  // - its "temperature" is a temperature in °C, stored as "temperature_2m"
  static { this.declareProp("temperature", { type: "number", storedAs: "temperature_2m" }) }
  get temperature() { return this.getProp("temperature") }
  set temperature(value) { this.setProp("temperature", value) }

  /** in wmo code */
  // - its "weather code" is a number
  //   -- in wmo code
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
core.heading("The sky:  what a weather code looks like")
//////////////////////////////////////////////
// ## The sky:  what a weather code looks like
//////////////////////////////////////////////
// Open-Meteo says the weather as a number, a WMO code:  0 a clear sky, 61 rain, 95 a thunderstorm.
// These two say each code as people do:  in a word or two, and as an emoji.

/** The weather in a word or two:  "Partly cloudy" */
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

/** The name of an emoji for it:  "sun", "cloud_with_rain" */
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
core.heading("Weather")
/////////////
// ## Weather
/////////////
// The weather in the city you pick:  now, big, then the next 12 hours.
// It comes from Open-Meteo, a server other people run:  Weather.api.spell, as `spell place ingest` wrote it.
// What each weather code looks like, in words and as an emoji, is in Sky.spell.

core.heading("The app:  a city to pick, and its forecast")
//## The app:  a city to pick, and its forecast

export class City extends Thing {
  // - its "name" is text
  static { this.declareProp("name", { type: "text" }) }
  get name() { return this.getProp("name") }
  set name(value) { this.setProp("name", value) }

  // - its "latitude" is a number
  static { this.declareProp("latitude", { type: "number" }) }
  get latitude() { return this.getProp("latitude") }
  set latitude(value) { this.setProp("latitude", value) }

  // - its "longitude" is a number
  static { this.declareProp("longitude", { type: "number" }) }
  get longitude() { return this.getProp("longitude") }
  set longitude(value) { this.setProp("longitude", value) }
}

export class Weather extends App {
  static elementTag = core.defineElement(this, "test-project", "App")

  // - its "cities" is a list of cities
  static { this.declareProp("cities", { itemType: "City", init: () => new List({ instanceType: "City" }) }) }
  get cities() { return this.getProp("cities") }
  set cities(value) { this.setProp("cities", value) }

  /** The city picked, by its name:  what the picker holds */
  // - its "place" is text
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

  /** The city's, from Open-Meteo:  asked for by where it is;  it answers with one */
  static { this.declareProp("forecasts", { declaredAt: { path: "/Weather.spell", start: 929, end: 1056 }, readsFrom: ["open_meteo"] }) }
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

core.heading("A city:  where it is on Earth")
//## A city:  where it is on Earth

core.heading("A forecast:  the weather now, big, then the next 12 hours in a row")
//## A forecast:  the weather now, big, then the next 12 hours in a row

core.heading("An hour:  its time, its weather and its temperature")
//## An hour:  its time, its weather and its temperature

// -----------
core.installStyles(undefined, `/* File styles.css:  what Spell UI's tags can't say yet.¬   - The hours to come are one row that scrolls sideways, each hour as wide as it needs. */¬.hours {¬  overflow-x: auto;¬}¬.hours > * {¬  flex: none;¬}¬`)
// -----------
if (!core.isCarryingOver) weather.start()
