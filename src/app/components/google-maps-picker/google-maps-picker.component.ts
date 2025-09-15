import { 
  Component, 
  Input, 
  Output, 
  EventEmitter, 
  ViewChild, 
  ElementRef, 
  OnInit, 
  OnDestroy,
  AfterViewInit,
  PLATFORM_ID,
  Inject
} from '@angular/core';
import { isPlatformBrowser, CommonModule } from '@angular/common';
import { GoogleMapsService, PlaceResult, AddressComponents } from '../../services/Other/google-maps.service';
import { Subscription, Subject } from 'rxjs';
import { filter, debounceTime, distinctUntilChanged } from 'rxjs/operators';
import * as L from 'leaflet';

export interface MapPickerResult {
  formatted_address: string;
  components: AddressComponents;
  place_id: string;
  location?: { lat: number; lng: number };
}

@Component({
  selector: 'app-google-maps-picker',
  templateUrl: './google-maps-picker.component.html',
  styleUrls: ['./google-maps-picker.component.css'],
  standalone: true,
  imports: [CommonModule]
})
export class GoogleMapsPickerComponent implements OnInit, OnDestroy, AfterViewInit {
  @Input() mode: 'address' | 'area' = 'address';
  @Input() placeholder: string = 'Search for address...';
  @Input() initialValue: string = '';
  @Input() showMap: boolean = true;
  @Input() mapHeight: string = '300px';
  
  @Output() placeSelected = new EventEmitter<MapPickerResult>();
  @Output() placeCleared = new EventEmitter<void>();

  @ViewChild('searchInput', { static: false }) searchInput!: ElementRef<HTMLInputElement>;
  @ViewChild('mapContainer', { static: false }) mapContainer!: ElementRef<HTMLDivElement>;

  map: L.Map | null = null;
  marker: L.Marker | null = null;
  isBrowser: boolean = false;
  isMapLoaded = false;
  isSearching = false;
  searchResults: PlaceResult[] = [];
  selectedPlace: PlaceResult | null = null;
  
  private subscription = new Subscription();
  private searchSubject = new Subject<string>();

  constructor(
    private mapService: GoogleMapsService, // Keep the same service name for compatibility
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(this.platformId);
  }

  ngOnInit(): void {
    if (!this.isBrowser) return;

    // Setup search debouncing
    this.subscription.add(
      this.searchSubject
        .pipe(
          debounceTime(300),
          distinctUntilChanged(),
          filter(query => query.trim().length > 2)
        )
        .subscribe(query => {
          this.performSearch(query);
        })
    );

    // Wait for map service to load
    this.subscription.add(
      this.mapService.mapsLoaded$
        .pipe(filter(loaded => loaded))
        .subscribe(() => {
          this.isMapLoaded = true;
          this.initializeComponents();
        })
    );
  }

  ngAfterViewInit(): void {
    if (!this.isBrowser) return;

    if (this.mapService.isLoaded()) {
      this.isMapLoaded = true;
      this.initializeComponents();
    }
  }

  ngOnDestroy(): void {
    this.subscription.unsubscribe();
    if (this.map) {
      this.map.remove();
    }
  }

  private initializeComponents(): void {
    if (this.showMap && this.mapContainer?.nativeElement) {
      this.initializeMap();
    }

    // Set initial value if provided
    if (this.initialValue && this.searchInput?.nativeElement) {
      this.searchInput.nativeElement.value = this.initialValue;
    }
  }

  private initializeMap(): void {
    if (!this.mapContainer?.nativeElement) return;

    // Set map height
    this.mapContainer.nativeElement.style.height = this.mapHeight;

    // Create the map
    this.map = this.mapService.createMap(
      this.mapContainer.nativeElement,
      {
        center: [39.8283, -98.5795] as [number, number], // Center of USA
        zoom: 4
      }
    );

    // Add click event listener to the map
    if (this.map) {
      this.map.on('click', (e: L.LeafletMouseEvent) => {
        this.onMapClick(e);
      });
    }
  }

  private onMapClick(e: L.LeafletMouseEvent): void {
    const lat = e.latlng.lat;
    const lng = e.latlng.lng;

    // Perform reverse geocoding
    this.reverseGeocode(lat, lng);
  }

  private reverseGeocode(lat: number, lng: number): void {
    // For reverse geocoding, we can use the same search endpoint with coordinates
    const query = `${lat},${lng}`;
    
    this.mapService.geocodeAddress(query)
      .then((results) => {
        if (results.length > 0) {
          const place = results[0];
          this.selectPlace(place);
        }
      })
      .catch((error) => {
        console.error('Reverse geocoding failed:', error);
      });
  }

  onInputChange(event: Event): void {
    const input = event.target as HTMLInputElement;
    const query = input.value.trim();
    
    if (!query) {
      this.clearSelection();
      this.searchResults = [];
      return;
    }

    this.searchSubject.next(query);
  }

  private performSearch(query: string): void {
    this.isSearching = true;
    this.searchResults = [];

    this.mapService.searchPlaces(query)
      .then((results) => {
        this.isSearching = false;
        this.searchResults = results;
        
        // If only one result, auto-select it
        if (results.length === 1) {
          this.selectPlace(results[0]);
        }
      })
      .catch((error) => {
        this.isSearching = false;
        console.error('Search failed:', error);
      });
  }

  selectSearchResult(place: PlaceResult): void {
    this.selectPlace(place);
    this.searchResults = [];
  }

  private selectPlace(place: PlaceResult): void {
    this.selectedPlace = place;
    
    // Update input value
    if (this.searchInput?.nativeElement) {
      this.searchInput.nativeElement.value = place.formatted_address;
    }

    // Extract address components
    const components = this.mode === 'address' 
      ? this.mapService.extractAddressComponents(place)
      : this.mapService.extractAreaComponents(place);

    // Update map if available
    if (this.map && place.geometry.location) {
      const location = {
        lat: place.geometry.location.lat(),
        lng: place.geometry.location.lng()
      };

      this.map.setView([location.lat, location.lng], this.mode === 'address' ? 16 : 11);

      // Update marker
      if (this.marker) {
        this.map.removeLayer(this.marker);
      }

      this.marker = this.mapService.addMarker(
        this.map,
        location,
        {
          title: place.formatted_address
        }
      );
    }

    // Emit the result
    const result: MapPickerResult = {
      formatted_address: place.formatted_address,
      components,
      place_id: place.place_id,
      location: place.geometry.location ? {
        lat: place.geometry.location.lat(),
        lng: place.geometry.location.lng()
      } : undefined
    };

    this.placeSelected.emit(result);
  }

  clearSelection(): void {
    if (this.searchInput?.nativeElement) {
      this.searchInput.nativeElement.value = '';
    }

    if (this.marker && this.map) {
      this.map.removeLayer(this.marker);
      this.marker = null;
    }

    if (this.map) {
      this.map.setView([39.8283, -98.5795], 4);
    }

    this.selectedPlace = null;
    this.searchResults = [];
    this.placeCleared.emit();
  }

  searchManually(): void {
    const query = this.searchInput?.nativeElement?.value?.trim();
    if (!query) return;

    this.performSearch(query);
  }

  // Helper method to get the current location
  getCurrentLocation(): void {
    if (!this.isBrowser) return;

    this.mapService.getCurrentLocation()
      .then(([lat, lng]) => {
        if (this.map) {
          this.map.setView([lat, lng], 16);
          
          // Add marker at current location
          if (this.marker) {
            this.map.removeLayer(this.marker);
          }
          
          this.marker = this.mapService.addMarker(
            this.map,
            { lat, lng },
            {
              title: 'Your Location'
            }
          );
        }
      })
      .catch((error) => {
        console.error('Error getting current location:', error);
      });
  }
} 