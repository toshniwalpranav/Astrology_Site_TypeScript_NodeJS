export interface BirthDetails {
  name: string;
  dob: string; // YYYY-MM-DD
  tob: string; // HH:mm
  place: string;
  latitude?: string;
  longitude?: string;
}

export interface PlanetPosition {
  planet: string; // e.g. "Sun"
  short: string; // e.g. "Su" (used inside the chart)
  sign: string; // e.g. "Leo"
  house: number; // 1-12
  degree: string; // e.g. "14°22′"
  nakshatra: string;
}

export interface KundaliData {
  ascendant: string; // lagna sign name
  ascendantSign: number; // 1 (Aries) - 12 (Pisces)
  moonSign: string;
  nakshatra: string;
  planets: PlanetPosition[];
}