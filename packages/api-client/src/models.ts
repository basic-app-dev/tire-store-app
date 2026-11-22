/**
 * Frontend presentation models for the Automotive Platform.
 * Note: These are UI client interfaces decoupled from legacy backend implementations.
 * OpenAPI-generated contracts will supersede these when service contracts are published.
 */

export interface TireProduct {
  id: string;
  brand: string;
  model: string;
  width: number;
  aspectRatio: number;
  rimDiameter: number;
  season: 'all_season' | 'summer' | 'winter' | 'all_weather' | 'all_terrain' | string;
  priceCents: number;
  loadIndex?: number;
  speedRating?: string;
  warrantyMiles?: number;
  treadwearRating?: number;
  runFlat?: boolean;
  imageUrl?: string;
}

export interface StoreLocation {
  id: string;
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  phone: string;
  latitude: number;
  longitude: number;
  distanceMiles?: number;
}

export interface VehicleSelection {
  year?: number;
  make?: string;
  model?: string;
  trim?: string;
}

