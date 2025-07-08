import { Injectable, NgZone } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of, BehaviorSubject } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import * as L from 'leaflet';

export interface PlaceResult {
  formatted_address: string;
  place_id: string;
  geometry: {
    location: {
      lat: () => number;
      lng: () => number;
    };
  };
  address_components: any[];
  name?: string;
  types: string[];
}

export interface AddressComponents {
  streetAddress?: string;
  city?: string;
  state?: string;
  country?: string;
  postalCode?: string;
  latitude?: number;
  longitude?: number;
}

// Nominatim API response interface
interface NominatimResult {
  place_id: number;
  licence: string;
  osm_type: string;
  osm_id: number;
  boundingbox: string[];
  lat: string;
  lon: string;
  display_name: string;
  class: string;
  type: string;
  importance: number;
  icon?: string;
  address?: {
    house_number?: string;
    road?: string;
    neighbourhood?: string;
    suburb?: string;
    city?: string;
    county?: string;
    state?: string;
    postcode?: string;
    country?: string;
    country_code?: string;
  };
}

@Injectable({
  providedIn: 'root'
})
export class GoogleMapsService {
  private readonly NOMINATIM_BASE_URL = 'https://nominatim.openstreetmap.org';
  private mapsLoaded = new BehaviorSubject<boolean>(true); // Leaflet is always available
  public mapsLoaded$ = this.mapsLoaded.asObservable();

  constructor(private http: HttpClient, private zone: NgZone) {
    this.initializeLeaflet();
  }

  private initializeLeaflet(): void {
    // Configure Leaflet default icon paths
    delete (L.Icon.Default.prototype as any)._getIconUrl;
    L.Icon.Default.mergeOptions({
      iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon-2x.png',
      iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-icon.png',
      shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.9.4/images/marker-shadow.png'
    });
  }

  /**
   * Check if Maps service is loaded
   */
  isLoaded(): boolean {
    return this.mapsLoaded.value;
  }

  /**
   * Wait for Maps to load
   */
  waitForMapsToLoad(): Observable<boolean> {
    return this.mapsLoaded$;
  }

  /**
   * Initialize autocomplete for an input element
   */
  initializeAutocomplete(
    input: HTMLInputElement,
    options: any = {}
  ): any {
    // For OpenStreetMap, we'll handle this differently
    // Return a mock object that matches the expected interface
    return {
      addListener: (event: string, callback: Function) => {
        if (event === 'place_changed') {
          // Store the callback for later use
          (input as any)._autocompleteCallback = callback;
        }
      },
      getPlace: () => {
        // Return the selected place data
        return (input as any)._selectedPlace || null;
      }
    };
  }

  /**
   * Initialize area/region autocomplete
   */
  initializeAreaAutocomplete(
    input: HTMLInputElement,
    options: any = {}
  ): any {
    return this.initializeAutocomplete(input, options);
  }

  /**
   * Extract address components from a place result
   */
  extractAddressComponents(place: PlaceResult): AddressComponents {
    const components: AddressComponents = {};

    if (place.geometry && place.geometry.location) {
      components.latitude = place.geometry.location.lat();
      components.longitude = place.geometry.location.lng();
    }

    if (place.address_components) {
      place.address_components.forEach((component: any) => {
        const types = component.types;
        
        if (types.includes('street_number')) {
          components.streetAddress = component.long_name;
        } else if (types.includes('route')) {
          components.streetAddress = components.streetAddress 
            ? `${components.streetAddress} ${component.long_name}`
            : component.long_name;
        } else if (types.includes('locality')) {
          components.city = component.long_name;
        } else if (types.includes('administrative_area_level_1')) {
          components.state = component.long_name;
        } else if (types.includes('country')) {
          components.country = component.long_name;
        } else if (types.includes('postal_code')) {
          components.postalCode = component.long_name;
        }
      });
    }

    return components;
  }

  /**
   * Extract area components from a place result
   */
  extractAreaComponents(place: PlaceResult): AddressComponents {
    const components: AddressComponents = {};

    if (place.geometry && place.geometry.location) {
      components.latitude = place.geometry.location.lat();
      components.longitude = place.geometry.location.lng();
    }

    if (place.address_components) {
      place.address_components.forEach((component: any) => {
        const types = component.types;
        
        if (types.includes('locality')) {
          components.city = component.long_name;
        } else if (types.includes('administrative_area_level_1')) {
          components.state = component.long_name;
        } else if (types.includes('country')) {
          components.country = component.long_name;
        } else if (types.includes('postal_code')) {
          components.postalCode = component.long_name;
        }
      });
    }

    return components;
  }

  /**
   * Geocode an address string using Nominatim
   */
  geocodeAddress(address: string): Promise<PlaceResult[]> {
    return new Promise((resolve, reject) => {
      if (!address.trim()) {
        resolve([]);
        return;
      }

      const url = `${this.NOMINATIM_BASE_URL}/search`;
      const params = {
        q: address,
        format: 'json',
        addressdetails: '1',
        limit: '10',
        countrycodes: 'us,ca,gb,au'
      };

      this.http.get<NominatimResult[]>(url, { params }).subscribe({
        next: (results) => {
          const placeResults = results.map(result => this.convertNominatimToPlaceResult(result));
          resolve(placeResults);
        },
        error: (error) => {
          console.error('Error geocoding address:', error);
          reject(error);
        }
      });
    });
  }

  /**
   * Search for places by text using Nominatim
   */
  searchPlaces(query: string): Promise<PlaceResult[]> {
    return this.geocodeAddress(query);
  }

  /**
   * Get place details by place ID
   */
  getPlaceDetails(placeId: string): Promise<PlaceResult> {
    return new Promise((resolve, reject) => {
      const url = `${this.NOMINATIM_BASE_URL}/details`;
      const params = {
        place_id: placeId,
        format: 'json',
        addressdetails: '1'
      };

      this.http.get<NominatimResult>(url, { params }).subscribe({
        next: (result) => {
          const placeResult = this.convertNominatimToPlaceResult(result);
          resolve(placeResult);
        },
        error: (error) => {
          console.error('Error getting place details:', error);
          reject(error);
        }
      });
    });
  }

  /**
   * Create a Leaflet map
   */
  createMap(
    container: HTMLElement,
    options: any = {}
  ): L.Map | null {
    if (!container) return null;

    const defaultOptions = {
      center: options.center || [39.8283, -98.5795] as [number, number],
      zoom: options.zoom || 4,
      zoomControl: true,
      attributionControl: true
    };

    const map = L.map(container, defaultOptions);
    
    // Add OpenStreetMap tile layer
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '© <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
      maxZoom: 19
    }).addTo(map);

    return map;
  }

  /**
   * Add a marker to the map
   */
  addMarker(
    map: L.Map,
    position: { lat: number; lng: number },
    options: any = {}
  ): L.Marker | null {
    if (!map) return null;

    const marker = L.marker([position.lat, position.lng], {
      title: options.title,
      draggable: options.draggable || false
    }).addTo(map);

    if (options.title) {
      marker.bindPopup(options.title);
    }

    return marker;
  }

  /**
   * Convert Nominatim result to PlaceResult format
   */
  private convertNominatimToPlaceResult(result: NominatimResult): PlaceResult {
    const addressComponents = this.extractAddressComponentsFromNominatim(result.address);
    
    return {
      place_id: result.place_id.toString(),
      name: this.extractPlaceName(result),
      formatted_address: result.display_name,
      geometry: {
        location: {
          lat: () => parseFloat(result.lat),
          lng: () => parseFloat(result.lon)
        }
      },
      types: [result.class, result.type],
      address_components: addressComponents
    };
  }

  private extractPlaceName(result: NominatimResult): string {
    if (result.address?.house_number && result.address?.road) {
      return `${result.address.house_number} ${result.address.road}`;
    }
    if (result.address?.road) {
      return result.address.road;
    }
    if (result.address?.neighbourhood) {
      return result.address.neighbourhood;
    }
    if (result.address?.suburb) {
      return result.address.suburb;
    }
    if (result.address?.city) {
      return result.address.city;
    }
    return result.display_name.split(',')[0];
  }

  private extractAddressComponentsFromNominatim(address: any): any[] {
    if (!address) return [];

    const components = [];
    
    if (address.house_number) {
      components.push({
        long_name: address.house_number,
        short_name: address.house_number,
        types: ['street_number']
      });
    }
    
    if (address.road) {
      components.push({
        long_name: address.road,
        short_name: address.road,
        types: ['route']
      });
    }
    
    if (address.neighbourhood) {
      components.push({
        long_name: address.neighbourhood,
        short_name: address.neighbourhood,
        types: ['neighborhood']
      });
    }
    
    if (address.suburb) {
      components.push({
        long_name: address.suburb,
        short_name: address.suburb,
        types: ['sublocality']
      });
    }
    
    if (address.city) {
      components.push({
        long_name: address.city,
        short_name: address.city,
        types: ['locality']
      });
    }
    
    if (address.county) {
      components.push({
        long_name: address.county,
        short_name: address.county,
        types: ['administrative_area_level_2']
      });
    }
    
    if (address.state) {
      components.push({
        long_name: address.state,
        short_name: address.state,
        types: ['administrative_area_level_1']
      });
    }
    
    if (address.postcode) {
      components.push({
        long_name: address.postcode,
        short_name: address.postcode,
        types: ['postal_code']
      });
    }
    
    if (address.country) {
      components.push({
        long_name: address.country,
        short_name: address.country_code || address.country,
        types: ['country']
      });
    }
    
    return components;
  }

  /**
   * Get current location
   */
  getCurrentLocation(): Promise<[number, number]> {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by this browser.'));
        return;
      }

      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve([position.coords.latitude, position.coords.longitude]);
        },
        (error) => {
          reject(error);
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 0
        }
      );
    });
  }
} 