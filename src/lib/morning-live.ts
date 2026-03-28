export interface MorningWeather {
  location: string;
  timezone: string;
  temperatureC: number;
  apparentTemperatureC?: number;
  minTemperatureC?: number;
  maxTemperatureC?: number;
  precipitationChance?: number;
  windSpeedKph?: number;
  description: string;
}

export interface MorningHistoryEvent {
  year: number;
  text: string;
  title?: string;
  url?: string;
}

export interface MorningLiveData {
  weather: MorningWeather | null;
  event: MorningHistoryEvent | null;
}

interface GeocodeResult {
  name: string;
  country?: string;
  admin1?: string;
  latitude: number;
  longitude: number;
  timezone?: string;
}

function weatherCodeToText(code?: number) {
  const codes: Record<number, string> = {
    0: 'clear sky',
    1: 'mostly clear',
    2: 'partly cloudy',
    3: 'overcast',
    45: 'foggy',
    48: 'freezing fog',
    51: 'light drizzle',
    53: 'drizzle',
    55: 'dense drizzle',
    56: 'light freezing drizzle',
    57: 'freezing drizzle',
    61: 'light rain',
    63: 'rain',
    65: 'heavy rain',
    66: 'light freezing rain',
    67: 'freezing rain',
    71: 'light snow',
    73: 'snow',
    75: 'heavy snow',
    77: 'snow grains',
    80: 'rain showers',
    81: 'heavy showers',
    82: 'violent rain showers',
    85: 'snow showers',
    86: 'heavy snow showers',
    95: 'thunderstorm',
    96: 'thunderstorm with hail',
    99: 'severe thunderstorm with hail',
  };

  return code !== undefined && code in codes ? codes[code] : 'mixed weather';
}

function formatLocationLabel(result: GeocodeResult) {
  const pieces = [result.name, result.admin1, result.country].filter(Boolean);
  return pieces.join(', ');
}

async function fetchJson<T>(url: string, init?: RequestInit) {
  const response = await fetch(url, {
    ...init,
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Request failed: ${response.status}`);
  }

  return response.json() as Promise<T>;
}

async function geocodeLocation(location: string) {
  const params = new URLSearchParams({
    name: location,
    count: '1',
    language: 'en',
    format: 'json',
  });

  const data = await fetchJson<{ results?: GeocodeResult[] }>(
    `https://geocoding-api.open-meteo.com/v1/search?${params.toString()}`
  );

  return data.results?.[0] ?? null;
}

export async function fetchMorningWeather(location: string): Promise<MorningWeather | null> {
  if (!location.trim()) return null;

  try {
    const match = await geocodeLocation(location);
    if (!match) return null;

    const params = new URLSearchParams({
      latitude: String(match.latitude),
      longitude: String(match.longitude),
      current: [
        'temperature_2m',
        'apparent_temperature',
        'weather_code',
        'wind_speed_10m',
      ].join(','),
      daily: [
        'temperature_2m_max',
        'temperature_2m_min',
        'precipitation_probability_max',
      ].join(','),
      timezone: 'auto',
      forecast_days: '1',
    });

    const data = await fetchJson<{
      timezone?: string;
      current?: {
        temperature_2m?: number;
        apparent_temperature?: number;
        weather_code?: number;
        wind_speed_10m?: number;
      };
      daily?: {
        temperature_2m_max?: number[];
        temperature_2m_min?: number[];
        precipitation_probability_max?: number[];
      };
    }>(`https://api.open-meteo.com/v1/forecast?${params.toString()}`);

    const current = data.current;
    if (!current || typeof current.temperature_2m !== 'number') {
      return null;
    }

    return {
      location: formatLocationLabel(match),
      timezone: data.timezone || match.timezone || 'local time',
      temperatureC: Math.round(current.temperature_2m),
      apparentTemperatureC:
        typeof current.apparent_temperature === 'number'
          ? Math.round(current.apparent_temperature)
          : undefined,
      minTemperatureC:
        typeof data.daily?.temperature_2m_min?.[0] === 'number'
          ? Math.round(data.daily.temperature_2m_min[0])
          : undefined,
      maxTemperatureC:
        typeof data.daily?.temperature_2m_max?.[0] === 'number'
          ? Math.round(data.daily.temperature_2m_max[0])
          : undefined,
      precipitationChance:
        typeof data.daily?.precipitation_probability_max?.[0] === 'number'
          ? Math.round(data.daily.precipitation_probability_max[0])
          : undefined,
      windSpeedKph:
        typeof current.wind_speed_10m === 'number'
          ? Math.round(current.wind_speed_10m)
          : undefined,
      description: weatherCodeToText(current.weather_code),
    };
  } catch {
    return null;
  }
}

function pickHistoryEvent(
  data: {
    selected?: Array<{
      text?: string;
      year?: number;
      pages?: Array<{
        titles?: { normalized?: string; display?: string };
        content_urls?: { desktop?: { page?: string } };
      }>;
    }>;
  }
) {
  const item = data.selected?.find((entry) => entry.text && entry.year);
  if (!item?.text || !item.year) return null;

  const page = item.pages?.[0];
  return {
    year: item.year,
    text: item.text,
    title: page?.titles?.normalized || page?.titles?.display,
    url: page?.content_urls?.desktop?.page,
  } satisfies MorningHistoryEvent;
}

export async function fetchMorningHistoryEvent(): Promise<MorningHistoryEvent | null> {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');

  const urls = [
    `https://api.wikimedia.org/feed/v1/wikipedia/en/onthisday/selected/${month}/${day}`,
    `https://en.wikipedia.org/api/rest_v1/feed/onthisday/selected/${month}/${day}`,
  ];

  for (const url of urls) {
    try {
      const data = await fetchJson<{
        selected?: Array<{
          text?: string;
          year?: number;
          pages?: Array<{
            titles?: { normalized?: string; display?: string };
            content_urls?: { desktop?: { page?: string } };
          }>;
        }>;
      }>(url, {
        headers: {
          'Api-User-Agent': 'Victoria companion app',
        },
      });

      const event = pickHistoryEvent(data);
      if (event) return event;
    } catch {
      // Try the next endpoint.
    }
  }

  return null;
}

export async function fetchMorningLiveData({
  location,
  includeWeather,
}: {
  location: string;
  includeWeather: boolean;
}) {
  const [weather, event] = await Promise.all([
    includeWeather ? fetchMorningWeather(location) : Promise.resolve(null),
    fetchMorningHistoryEvent(),
  ]);

  return {
    weather,
    event,
  } satisfies MorningLiveData;
}
