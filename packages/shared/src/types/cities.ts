export interface City {
  id: string;
  name: string;
  slug: string;
  countryName: string;
  countryCode: string;
  latitude: number;
  longitude: number;
  timezone: string;
  activeEventCount?: number;
}

export interface NearestCityResponse {
  city: City | null;
  distanceKm: number | null;
  matched: boolean;
}
