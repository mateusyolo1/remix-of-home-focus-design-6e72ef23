/**
 * Hermes Weather Tool — wrapper sobre `src/lib/weather.ts`.
 * Resolve cidade por nome (geocoding) e devolve clima atual da Open-Meteo.
 * O parâmetro `when` é informativo (a API atual só expõe `current`); o Planner
 * pode formatar a resposta diferente para "hoje"/"amanhã" no futuro.
 */

import { fetchWeather, searchCity, type CurrentWeather, type GeoResult } from "@/lib/weather";

export type WeatherWhen = "now" | "today" | "tomorrow";

export type WeatherResult = {
  city: GeoResult;
  when: WeatherWhen;
  weather: CurrentWeather;
};

export async function getWeather(
  input: { city?: string; lat?: number; lon?: number; when?: WeatherWhen } = {},
): Promise<WeatherResult | { ok: false; reason: string }> {
  const when = input.when ?? "now";
  let city: GeoResult | null = null;
  if (input.lat != null && input.lon != null) {
    city = { name: input.city ?? "Atual", country: "", lat: input.lat, lon: input.lon };
  } else if (input.city) {
    const results = await searchCity(input.city);
    city = results[0] ?? null;
    if (!city) return { ok: false, reason: "city not found" };
  } else {
    return { ok: false, reason: "missing city or coords" };
  }
  const weather = await fetchWeather(city.lat, city.lon);
  if (!weather) return { ok: false, reason: "weather unavailable" };
  return { city, when, weather };
}
