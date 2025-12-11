'use client';

import { useEffect, useRef, useState } from 'react';
import mapboxgl from 'mapbox-gl';
import { MapPin, Layers, ZoomIn, ZoomOut } from 'lucide-react';
import { cn, HUBZONE_TYPES } from '@/lib/utils';

interface HubzoneMapProps {
  className?: string;
  onLocationSelect?: (lat: number, lng: number, address?: string) => void;
  markers?: Array<{
    lat: number;
    lng: number;
    isHubzone: boolean;
    label?: string;
  }>;
  showLegend?: boolean;
}

export default function HubzoneMap({
  className,
  onLocationSelect,
  markers = [],
  showLegend = true,
}: HubzoneMapProps) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const markersRef = useRef<mapboxgl.Marker[]>([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [showHubzoneLayers, setShowHubzoneLayers] = useState(true);

  useEffect(() => {
    if (!mapContainer.current || map.current) return;

    const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
    
    if (!token) {
      console.warn('Mapbox token not configured');
      return;
    }

    mapboxgl.accessToken = token;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: 'mapbox://styles/mapbox/light-v11',
      center: [-98.5795, 39.8283], // Center of US
      zoom: 4,
      pitch: 0,
      bearing: 0,
    });

    map.current.addControl(new mapboxgl.NavigationControl(), 'top-right');
    
    // Add geocoder search
    map.current.addControl(
      new mapboxgl.GeolocateControl({
        positionOptions: { enableHighAccuracy: true },
        trackUserLocation: false,
        showUserHeading: false,
      }),
      'top-right'
    );

    map.current.on('load', () => {
      setIsLoaded(true);
      
      // Add HUBZone layer from SBA (when available)
      addHubzoneLayers();
    });

    map.current.on('click', (e) => {
      if (onLocationSelect) {
        onLocationSelect(e.lngLat.lat, e.lngLat.lng);
      }
    });

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Update markers when prop changes
  useEffect(() => {
    if (!map.current || !isLoaded) return;

    // Clear existing markers
    markersRef.current.forEach((m) => m.remove());
    markersRef.current = [];

    // Add new markers
    markers.forEach((marker) => {
      const el = document.createElement('div');
      el.className = cn(
        'w-8 h-8 rounded-full flex items-center justify-center shadow-lg cursor-pointer',
        'transform -translate-x-1/2 -translate-y-1/2',
        marker.isHubzone ? 'bg-compliant' : 'bg-critical'
      );
      el.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z"/><circle cx="12" cy="10" r="3"/></svg>`;

      const mapboxMarker = new mapboxgl.Marker(el)
        .setLngLat([marker.lng, marker.lat])
        .addTo(map.current!);

      if (marker.label) {
        const popup = new mapboxgl.Popup({ offset: 25 }).setText(marker.label);
        mapboxMarker.setPopup(popup);
      }

      markersRef.current.push(mapboxMarker);
    });

    // Fit bounds if markers exist
    if (markers.length > 0) {
      const bounds = new mapboxgl.LngLatBounds();
      markers.forEach((m) => bounds.extend([m.lng, m.lat]));
      map.current.fitBounds(bounds, { padding: 100, maxZoom: 12 });
    }
  }, [markers, isLoaded]);

  const addHubzoneLayers = () => {
    if (!map.current) return;

    // In production, this would load actual HUBZone GeoJSON from SBA
    // For MVP, we'll add a placeholder layer
    
    // Add source for HUBZone boundaries (placeholder)
    map.current.addSource('hubzones-placeholder', {
      type: 'geojson',
      data: {
        type: 'FeatureCollection',
        features: [],
      },
    });

    map.current.addLayer({
      id: 'hubzones-fill',
      type: 'fill',
      source: 'hubzones-placeholder',
      paint: {
        'fill-color': '#1e40af',
        'fill-opacity': 0.2,
      },
    });

    map.current.addLayer({
      id: 'hubzones-outline',
      type: 'line',
      source: 'hubzones-placeholder',
      paint: {
        'line-color': '#1e40af',
        'line-width': 2,
      },
    });
  };

  const toggleHubzoneLayers = () => {
    if (!map.current) return;
    
    const visibility = showHubzoneLayers ? 'none' : 'visible';
    
    if (map.current.getLayer('hubzones-fill')) {
      map.current.setLayoutProperty('hubzones-fill', 'visibility', visibility);
    }
    if (map.current.getLayer('hubzones-outline')) {
      map.current.setLayoutProperty('hubzones-outline', 'visibility', visibility);
    }
    
    setShowHubzoneLayers(!showHubzoneLayers);
  };

  const handleZoom = (direction: 'in' | 'out') => {
    if (!map.current) return;
    const currentZoom = map.current.getZoom();
    map.current.zoomTo(direction === 'in' ? currentZoom + 1 : currentZoom - 1);
  };

  return (
    <div className={cn('relative rounded-xl overflow-hidden', className)}>
      {/* Map Container */}
      <div ref={mapContainer} className="w-full h-full min-h-[400px]" />

      {/* Loading State */}
      {!isLoaded && (
        <div className="absolute inset-0 bg-slate-100 flex items-center justify-center">
          <div className="flex flex-col items-center gap-3">
            <div className="w-10 h-10 border-4 border-hz-500 border-t-transparent rounded-full animate-spin" />
            <span className="text-sm text-slate-500">Loading map...</span>
          </div>
        </div>
      )}

      {/* Custom Controls */}
      <div className="absolute bottom-4 left-4 flex flex-col gap-2">
        <button
          onClick={toggleHubzoneLayers}
          className={cn(
            'p-2.5 rounded-lg shadow-lg transition-colors',
            showHubzoneLayers
              ? 'bg-hz-500 text-white'
              : 'bg-white text-slate-600 hover:bg-slate-50'
          )}
          title="Toggle HUBZone layers"
        >
          <Layers className="w-5 h-5" />
        </button>
      </div>

      {/* Legend */}
      {showLegend && (
        <div className="absolute bottom-4 right-4 bg-white/95 backdrop-blur-sm rounded-lg shadow-lg p-3 text-xs">
          <div className="font-semibold text-slate-700 mb-2">HUBZone Types</div>
          <div className="space-y-1.5">
            {Object.entries(HUBZONE_TYPES).map(([key, { label, color }]) => (
              <div key={key} className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-sm"
                  style={{ backgroundColor: color }}
                />
                <span className="text-slate-600">{label}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* No Token Warning */}
      {!process.env.NEXT_PUBLIC_MAPBOX_TOKEN && (
        <div className="absolute inset-0 bg-slate-100 flex items-center justify-center">
          <div className="text-center p-6">
            <MapPin className="w-12 h-12 text-slate-300 mx-auto mb-3" />
            <p className="text-slate-500 font-medium">Map requires Mapbox token</p>
            <p className="text-slate-400 text-sm mt-1">
              Add NEXT_PUBLIC_MAPBOX_TOKEN to .env.local
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
