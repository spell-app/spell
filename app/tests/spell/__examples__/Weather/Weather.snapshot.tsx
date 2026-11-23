import { core, Thing, List, App, Place, prop, derived, thing, drawn } from "@spell/core"
import { E, SpellElement } from "@spell/elements"

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
  @prop({ type: "number", declaredAt: { path: "/Weather.api.spell", start: 1422, end: 1448 } })
  accessor latitude!: number

  // - its "longitude" is a number
  @prop({ type: "number", declaredAt: { path: "/Weather.api.spell", start: 1450, end: 1477 } })
  accessor longitude!: number

  // - its "generationtime ms" is a number
  @prop({ type: "number", declaredAt: { path: "/Weather.api.spell", start: 1479, end: 1514 } })
  accessor generationtimeMs!: number

  // - its "utc offset seconds" is a number
  @prop({ type: "number", declaredAt: { path: "/Weather.api.spell", start: 1516, end: 1552 } })
  accessor utcOffsetSeconds!: number

  // - its "timezone" is text
  @prop({ type: "text", declaredAt: { path: "/Weather.api.spell", start: 1554, end: 1576 } })
  accessor timezone!: string

  // - its "timezone abbreviation" is text
  @prop({ type: "text", declaredAt: { path: "/Weather.api.spell", start: 1578, end: 1613 } })
  accessor timezoneAbbreviation!: string

  // - its "elevation" is a number
  @prop({ type: "number", declaredAt: { path: "/Weather.api.spell", start: 1615, end: 1642 } })
  accessor elevation!: number

  // - its "current" is a current
  @prop({ type: "Current", declaredAt: { path: "/Weather.api.spell", start: 1644, end: 1670 } })
  accessor current!: Current

  // - its "hours" is a list of hours, stored as "hourly"
  @prop({ itemType: "Hour", storedAs: "hourly", init: () => new List<Hour>({ instanceType: "Hour" }), declaredAt: { path: "/Weather.api.spell", start: 1672, end: 1722 } })
  accessor hours!: List<Hour>

  @drawn draw() {
    return (
      <ui-stack spacing="lg">
        <ui-segment padded="very">
          <ui-stack align="center" spacing="xs">
            <ui-emoji name={pictureTheWeatherCode(this.current?.weatherCode!)} size="large" />
            <ui-statistic size="huge">
              <ui-value>{core.measureShown(this.current?.temperature!, "Temperature", "celsius")}</ui-value>
            </ui-statistic>
            <ui-text size="large">{nameTheWeatherCode(this.current?.weatherCode!)}</ui-text>
          </ui-stack>
        </ui-segment>
        <ui-segment>
          <ui-stack class="hours" direction="horizontal" spacing="lg">{core.drawItems(this.hours)}</ui-stack>
        </ui-segment>
      </ui-stack>
    )
  }

  static savedIn = {
    place: "open_meteo",
    collection: "forecasts",
    times: ["created", "modified"], select: ["latitude", "longitude", "current", "hours"] }

  // - it lives in open meteo
  @prop({ type: "date", declaredAt: { path: "/Weather.api.spell", start: 1398, end: 1420 } })
  accessor created!: any /* spell: type unknown */

  // - it lives in open meteo
  @prop({ type: "date", declaredAt: { path: "/Weather.api.spell", start: 1398, end: 1420 } })
  accessor modified!: any /* spell: type unknown */
}

export class Current extends Thing {
  // - its "time" is a date
  @prop({ type: "date" })
  accessor time!: Date

  // - its "interval" is a duration in seconds
  @prop({ type: "number" })
  accessor interval!: number

  // - its "temperature" is a temperature in °C, stored as "temperature_2m"
  @prop({ type: "number", storedAs: "temperature_2m" })
  accessor temperature!: number

  /** in wmo code */
  // - its "weather code" is a number
  //   -- in wmo code
  @prop({ type: "number" })
  accessor weatherCode!: number
}

export class Hour extends Thing {
  // - its "time" is a date
  @prop({ type: "date" })
  accessor time!: Date

  // - its "temperature" is a temperature in °C, stored as "temperature_2m"
  @prop({ type: "number", storedAs: "temperature_2m" })
  accessor temperature!: number

  /** in wmo code */
  // - its "weather code" is a number
  //   -- in wmo code
  @prop({ type: "number" })
  accessor weatherCode!: number

  @drawn draw() {
    return (
      <ui-stack align="center" spacing="xs">
        <ui-text size="small" color="grey">{core.dateAs(this.time, "short time")}</ui-text>
        <ui-emoji name={pictureTheWeatherCode(this.weatherCode)} size="small" />
        <ui-text>{core.measureShown(this.temperature, "Temperature", "celsius")}</ui-text>
      </ui-stack>
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
export function nameTheWeatherCode(code: number) {
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
export function pictureTheWeatherCode(code: number) {
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
  @prop({ type: "text" })
  accessor name!: string

  // - its "latitude" is a number
  @prop({ type: "number" })
  accessor latitude!: number

  // - its "longitude" is a number
  @prop({ type: "number" })
  accessor longitude!: number
}

@thing
export class Weather extends App {
  static elementTag = core.defineElement(this, "test-project", "App")

  // - its "cities" is a list of cities
  @prop({ itemType: "City", init: () => new List<City>({ instanceType: "City" }) })
  accessor cities!: List<City>

  /** The city picked, by its name:  what the picker holds */
  // - its "place" is text
  @prop({ type: "text" })
  accessor place!: string

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

  @derived get city() {
    return core.getItemAt(core.filter(this.cities, (city: City) => city.name === this.place), 0)
  }

  /** The city's, from Open-Meteo:  asked for by where it is;  it answers with one */
  static { this.declareProp("forecasts", { declaredAt: { path: "/Weather.spell", start: 929, end: 1056 }, readsFrom: ["open_meteo"] }) }
  get forecasts() { return core.waitedValue(this, "forecasts", async () => {
    return await core.savedThings(Forecast, { filter: { latitude: this.city.latitude, longitude: this.city.longitude } })
  }, () => [this.city]) }

  @drawn draw() {
    return (
      <ui-container text={true}>
        <ui-stack spacing="lg">
          <ui-form prop:value={this}>
            <ui-select name="place" aria-label="City">
              {core.drawEach(this.cities, (city: City) => <ui-item value={city.name}>{city.name}</ui-item>)}
            </ui-select>
          </ui-form>
          {core.drawRead(() => this.forecasts, (forecast: Forecast) => core.drawThing(forecast), { waitingSay: () => "Asking Open-Meteo", failedSay: () => "Open-Meteo can't be reached just now." })}
          <ui-text size="small" color="grey">
            {"From "}
            <ui-link link="https://open-meteo.com">Open-Meteo</ui-link>
            , in your own units.
          </ui-text>
        </ui-stack>
      </ui-container>
    )
  }
}

/**
 * `<test-project-app>`:  a weather, drawn in its own element, e.g. by `draw the weather`.
 * - The page defines its tag with this class:  `core.useElement()`, below.
 * - Its attributes are its weather's properties;  its methods call its weather's.
 * - What every view's element does, e.g. drawing its weather, is `SpellElement`'s.
 */
export class WeatherElement extends SpellElement<Weather> {
  @E.proto static vocabulary = SpellElement.vocabularyFor("test-project-app", "weather", [
    { name: "cities", kind: "json", description: "Its cities." },
    { name: "place", kind: "string", description: "Its place." }
  ])

  create() {
    return this.currentThing?.create()
  }
}
core.useElement(Weather, WeatherElement)
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

// each view type's tag, for the JSX
declare module "@solidjs/web/types/jsx.js" {
  namespace JSX {
    interface IntrinsicElements {
      /** `WeatherElement` */
      "test-project-app": HTMLAttributes<HTMLElement> & { [attribute: string]: unknown }
    }
  }
}
