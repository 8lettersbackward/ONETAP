
"use client";

import { useEffect, useRef } from 'react';
import L from 'leaflet';

interface SOSMapProps {
  latitude: number;
  longitude: number;
  label?: string;
}

export default function SOSMap({ latitude, longitude, label }: SOSMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);

  useEffect(() => {
    if (!mapRef.current) return;

    // Initialize map
    mapInstance.current = L.map(mapRef.current).setView([latitude, longitude], 15);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: '&copy; OpenStreetMap contributors'
    }).addTo(mapInstance.current);

    // Custom tactical marker icon
    const tacticalIcon = L.divIcon({
      className: 'tactical-marker',
      html: `
        <div class="relative">
          <div class="absolute -inset-4 bg-destructive/20 rounded-full animate-ping"></div>
          <div class="relative h-6 w-6 bg-destructive rounded-full border-2 border-white flex items-center justify-center">
            <div class="h-2 w-2 bg-white rounded-full"></div>
          </div>
        </div>
      `,
      iconSize: [24, 24],
      iconAnchor: [12, 12]
    });

    L.marker([latitude, longitude], { icon: tacticalIcon })
      .addTo(mapInstance.current)
      .bindPopup(`<b class="text-destructive uppercase font-bold">${label || 'SOS SIGNAL'}</b><br><span class="text-[10px] uppercase font-bold tracking-widest opacity-60">Critical Alert Detected</span>`)
      .openPopup();

    return () => {
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
      }
    };
  }, [latitude, longitude, label]);

  return (
    <div 
      ref={mapRef} 
      className="h-[420px] w-full rounded-xl z-10"
      style={{ isolation: 'isolate' }}
    />
  );
}
