/**
 * Hermes Weather Tool — wrapper sobre `src/lib/weather.ts`.
 *
 * Estratégia de localização (em ordem):
 *   1. lat/lon explícitos
 *   2. cidade pelo nome (geocoding Open-Meteo)
 *   3. geolocalização do navegador (com timeout curto, opt-in via flag)
 *   4. cidade salva no perfil (`fm.profile`)
 */

import { fetchWeather, searchCity, type CurrentWeather, type GeoResult } from "@/lib/weather";

export type WeatherWhen = "now" | "today" | "tomorrow";

export type WeatherResult = {
  city: GeoResult;
  when: WeatherWhen;
  weather: CurrentWeather;
  source: "explicit" | "city-name" | "gps" | "profile";
};

type ProfileCity = {
  name: string;
  state?: string;
  country?: string;
  latitude: number;
  longitude: number;
};

function readProfileCity(): ProfileCity | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem("fm.profile");
    if (!raw) return null;
    const p = JSON.parse(raw) as { city?: ProfileCity };
    return p.city && Number.isFinite(p.city.latitude) && Number.isFinite(p.city.longitude)
      ? p.city
      : null;
  } catch {
    return null;
  }
}

function getBrowserCoords(timeoutMs = 4000): Promise<{ lat: number; lon: number } | null> {
  if (typeof window === "undefined" || !navigator?.geolocation) return Promise.resolve(null);
  return new Promise((resolve) => {
    let done = false;
    const timer = window.setTimeout(() => {
      if (done) return;
      done = true;
      resolve(null);
    }, timeoutMs);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        if (done) return;
        done = true;
        window.clearTimeout(timer);
        resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude });
      },
      () => {
        if (done) return;
        done = true;
        window.clearTimeout(timer);
        resolve(null);
      },
      { timeout: timeoutMs, maximumAge: 5 * 60 * 1000, enableHighAccuracy: false },
    );
  });
}

export async function getWeather(
  input: {
    city?: string;
    lat?: number;
    lon?: number;
    when?: WeatherWhen;
    /** Tentar geolocalização do navegador antes do fallback de perfil. */
    useGeolocation?: boolean;
  } = {},
): Promise<WeatherResult | { ok: false; reason: string }> {
  const when = input.when ?? "now";
  let city: GeoResult | null = null;
  let source: WeatherResult["source"] = "explicit";

  if (input.lat != null && input.lon != null) {
    city = {
      id: 0,
      name: input.city ?? "Atual",
      country: "",
      latitude: input.lat,
      longitude: input.lon,
    };
    source = "explicit";
  } else if (input.city) {
    const results = await searchCity(input.city);
    city = results[0] ?? null;
    source = "city-name";
  }

  if (!city && input.useGeolocation) {
    const coords = await getBrowserCoords();
    if (coords) {
      city = { id: 0, name: "Sua localização", country: "", latitude: coords.lat, longitude: coords.lon };
      source = "gps";
    }
  }

  if (!city) {
    const pc = readProfileCity();
    if (pc) {
      city = {
        id: 0,
        name: pc.name,
        country: pc.country ?? "",
        latitude: pc.latitude,
        longitude: pc.longitude,
      };
      source = "profile";
    }
  }

  if (!city) return { ok: false, reason: "no location available" };

  const weather = await fetchWeather(city.latitude, city.longitude);
  if (!weather) return { ok: false, reason: "weather unavailable" };
  return { city, when, weather, source };
}
