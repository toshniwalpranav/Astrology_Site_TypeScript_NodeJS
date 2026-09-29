import tzlookup from 'tz-lookup';
import { DateTime } from 'luxon';
import type { BirthDetails, KundaliData, PlanetPosition } from '@/types/kundali';

const BASE = 'https://api.prokerala.com';

const SIGNS = [
  'Aries', 'Taurus', 'Gemini', 'Cancer', 'Leo', 'Virgo',
  'Libra', 'Scorpio', 'Sagittarius', 'Capricorn', 'Aquarius', 'Pisces',
];

const NAKSHATRAS = [
  'Ashwini', 'Bharani', 'Krittika', 'Rohini', 'Mrigashira', 'Ardra', 'Punarvasu', 'Pushya', 'Ashlesha',
  'Magha', 'Purva Phalguni', 'Uttara Phalguni', 'Hasta', 'Chitra', 'Swati', 'Vishakha', 'Anuradha',
  'Jyeshtha', 'Mula', 'Purva Ashadha', 'Uttara Ashadha', 'Shravana', 'Dhanishta', 'Shatabhisha',
  'Purva Bhadrapada', 'Uttara Bhadrapada', 'Revati',
];

// Planets shown on the chart, with the ids the API uses (Rahu 101, Ketu 102, Ascendant 100).
const WANTED = [
  { id: 0, name: 'Sun', short: 'Su' },
  { id: 1, name: 'Moon', short: 'Mo' },
  { id: 4, name: 'Mars', short: 'Ma' },
  { id: 2, name: 'Mercury', short: 'Me' },
  { id: 5, name: 'Jupiter', short: 'Ju' },
  { id: 3, name: 'Venus', short: 'Ve' },
  { id: 6, name: 'Saturn', short: 'Sa' },
  { id: 101, name: 'Rahu', short: 'Ra' },
  { id: 102, name: 'Ketu', short: 'Ke' },
];

interface ApiPlanet {
  id?: number;
  name?: string;
  longitude?: number;
  degree?: number;
  rasi?: { id?: number };
}

let cachedToken: { value: string; expiresAt: number } | null = null;

// Same birth details give the same chart, so remember results to save credits (resets on server restart).
const cache = new Map<string, KundaliData>();

async function getToken(): Promise<string> {
  if (cachedToken && Date.now() < cachedToken.expiresAt - 60_000) return cachedToken.value;
  const clientId = process.env.PROKERALA_CLIENT_ID;
  const clientSecret = process.env.PROKERALA_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    throw new Error('Prokerala keys are missing. Add PROKERALA_CLIENT_ID and PROKERALA_CLIENT_SECRET to .env.local.');
  }
  const res = await fetch(`${BASE}/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ grant_type: 'client_credentials', client_id: clientId, client_secret: clientSecret }),
    cache: 'no-store',
  });
  if (!res.ok) throw new Error('Prokerala login failed. Check your client id and client secret.');
  const json = await res.json();
  cachedToken = { value: json.access_token, expiresAt: Date.now() + json.expires_in * 1000 };
  return json.access_token as string;
}

async function apiGet(path: string, params: Record<string, string>) {
  const token = await getToken();
  const res = await fetch(`${BASE}${path}?${new URLSearchParams(params)}`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: 'no-store',
  });
  if (res.status === 429) {
    throw new Error('Too many requests. The free plan allows 5 requests per minute, please try again in a minute.');
  }
  if (!res.ok) throw new Error(`Prokerala API error (status ${res.status}). Check your credits and app settings.`);
  return res.json();
}

const norm = (deg: number) => ((deg % 360) + 360) % 360;

// Full 0-360 longitude of a planet from the API item.
function fullLongitude(p: ApiPlanet): number | null {
  if (typeof p.longitude === 'number') return norm(p.longitude);
  if (typeof p.degree === 'number' && typeof p.rasi?.id === 'number') return norm(p.rasi.id * 30 + p.degree);
  return null;
}

export async function calculateKundaliViaApi(details: BirthDetails): Promise<KundaliData> {
  const lat = parseFloat(details.latitude ?? '');
  const lng = parseFloat(details.longitude ?? '');
  if (Number.isNaN(lat) || Number.isNaN(lng)) {
    throw new Error('Coordinates for the birth place are missing. Please choose another city.');
  }

  // Local birth time with the UTC offset that applied at that place and date.
  const local = DateTime.fromISO(`${details.dob}T${details.tob}`, { zone: tzlookup(lat, lng) });
  if (!local.isValid) throw new Error('Invalid date or time of birth.');
  const datetime = local.toISO({ suppressMilliseconds: true })!;
  const coordinates = `${lat},${lng}`;

  const key = `${datetime}|${coordinates}`;
  const hit = cache.get(key);
  if (hit) return hit;

  const json = await apiGet('/v2/astrology/planet-position', {
    ayanamsa: '1', // Lahiri
    coordinates,
    datetime,
    la: 'en',
  });
  const list: ApiPlanet[] = json?.data?.planet_position ?? [];

  const asc = list.find((p) => p.id === 100 || /ascendant|lagna/i.test(p.name ?? ''));
  const ascLon = asc ? fullLongitude(asc) : null;
  if (ascLon === null) throw new Error('The API response did not include the ascendant.');
  const ascIndex = Math.floor(ascLon / 30);

  const planets: PlanetPosition[] = WANTED.map((w) => {
    const item = list.find((p) => p.id === w.id) ?? list.find((p) => p.name?.toLowerCase() === w.name.toLowerCase());
    const lon = item ? fullLongitude(item) : null;
    if (lon === null) throw new Error(`The API response did not include ${w.name}.`);
    const signIndex = Math.floor(lon / 30);
    const inSign = lon % 30;
    const deg = Math.floor(inSign);
    const min = Math.floor((inSign - deg) * 60);
    return {
      planet: w.name,
      short: w.short,
      sign: SIGNS[signIndex],
      house: ((signIndex - ascIndex + 12) % 12) + 1, // whole-sign houses
      degree: `${deg}°${String(min).padStart(2, '0')}′`,
      nakshatra: NAKSHATRAS[Math.floor(lon / (360 / 27))],
    };
  });

  const moon = planets[1];
  const data: KundaliData = {
    ascendant: SIGNS[ascIndex],
    ascendantSign: ascIndex + 1,
    moonSign: moon.sign,
    nakshatra: moon.nakshatra,
    planets,
  };
  cache.set(key, data);
  return data;
}