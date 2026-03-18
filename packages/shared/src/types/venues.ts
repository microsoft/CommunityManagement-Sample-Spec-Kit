export interface Venue {
  id: string;
  name: string;
  address: string;
  cityId: string;
  cityName: string;
  citySlug: string;
  latitude: number;
  longitude: number;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateVenueRequest {
  name: string;
  address: string;
  cityId: string;
  latitude: number;
  longitude: number;
}

export interface UpdateVenueRequest {
  name?: string;
  address?: string;
  latitude?: number;
  longitude?: number;
}
