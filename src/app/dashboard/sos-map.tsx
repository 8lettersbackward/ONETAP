
"use client";

import { useEffect, useRef, useMemo } from 'react';
import L from 'leaflet';
import { Target } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SOSMapProps {
  latitude: number | string;
  longitude: number | string;
  label?: string;
}

export default function SOSMap({ latitude, longitude, label }: SOSMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<L.Map | null>(null);
  const markerRef = useRef<L.Marker | null>(null);
  const mounted = useRef(true);

  const { lat, lng, isValid } = useMemo(() => {
    const latVal = typeof latitude === 'string' ? parseFloat(latitude) : latitude;
    const lngVal = typeof longitude === 'string' ? parseFloat(longitude) : longitude;
    
    const valid = !isNaN(latVal) && 
                  !isNaN(lngVal) && 
                  isFinite(latVal) && 
                  isFinite(lngVal) &&
                  latVal !== 0 && 
                  lngVal !== 0;

    return { lat: latVal, lng: lngVal, isValid: valid };
  }, [latitude, longitude]);

  const resetView = () => {
    if (mapInstance.current && isValid) {
      mapInstance.current.setView([lat, lng], 15, { animate: true });
    }
  };

  useEffect(() => {
    mounted.current = true;
    if (!mapRef.current || !isValid || mapInstance.current) return;

    try {
      const map = L.map(mapRef.current, {
        zoomControl: false,
        scrollWheelZoom: true,
        attributionControl: false
      }).setView([lat, lng], 15);

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        attribution: '&copy; OpenStreetMap contributors'
      }).addTo(map);

      L.control.zoom({ position: 'bottomright' }).addTo(map);

      mapInstance.current = map;

      const timer1 = setTimeout(() => {
        if (mounted.current && mapInstance.current) mapInstance.current.invalidateSize();
      }, 100);
      const timer2 = setTimeout(() => {
        if (mounted.current && mapInstance.current) mapInstance.current.invalidateSize();
      }, 500);

      return () => {
        clearTimeout(timer1);
        clearTimeout(timer2);
      };
    } catch (error) {
      console.warn("Tactical Map Initialization Error:", error);
    }

    return () => {
      mounted.current = false;
      if (mapInstance.current) {
        mapInstance.current.remove();
        mapInstance.current = null;
        markerRef.current = null;
      }
    };
  }, []);

  useEffect(() => {
    if (!mapInstance.current || !isValid) return;

    const tacticalIcon = L.divIcon({
      className: 'tactical-marker',
      html: `
        <div class="relative">
          <div class="absolute -inset-8 bg-destructive/20 rounded-full animate-ping"></div>
          <div class="absolute -inset-4 bg-destructive/10 rounded-full animate-pulse"></div>
          <div class="relative h-10 w-10 bg-destructive rounded-full border-2 border-white flex items-center justify-center shadow-[0_0_15px_rgba(239,68,68,0.5)]">
            <div class="h-3 w-3 bg-white rounded-full animate-pulse"></div>
          </div>
        </div>
      `,
      iconSize: [40, 40],
      iconAnchor: [20, 20]
    });

    const popupContent = `
      <div class="p-2 min-w-[140px]">
        <b class="text-destructive uppercase font-black text-[10px] block mb-1 tracking-wider">${label || 'SOS SIGNAL'}</b>
        <span class="text-[8px] uppercase font-bold tracking-widest text-slate-800">Critical Alert Detected</span>
        <div class="mt-3 p-2 bg-slate-50 rounded-lg text-[8px] font-mono text-slate-600 border border-slate-100 shadow-inner">
          LAT: ${lat.toFixed(6)}<br/>
          LNG: ${lng.toFixed(6)}
        </div>
      </div>
    `;

    if (markerRef.current) {
      markerRef.current.setLatLng([lat, lng]).setPopupContent(popupContent);
    } else {
      markerRef.current = L.marker([lat, lng], { icon: tacticalIcon })
        .addTo(mapInstance.current)
        .bindPopup(popupContent, {
          closeButton: false,
          offset: [0, -10],
          className: 'tactical-popup'
        });
      
      markerRef.current.openPopup();
    }

    mapInstance.current.panTo([lat, lng], { animate: true });

  }, [lat, lng, label, isValid]);

  if (!isValid) {
    return (
      <div className="h-[200px] sm:h-[250px] md:h-[350px] w-full rounded-[2rem] bg-[#ECF0F3] flex flex-col items-center justify-center neo-inset border border-black/5">
        <div className="p-8 bg-white/50 rounded-full mb-4 shadow-inner">
           <div className="h-10 w-10 border-4 border-primary/10 border-t-primary rounded-full animate-spin" />
        </div>
        <p className="text-[10px] font-bold uppercase tracking-[0.4em] text-primary/60">Awaiting Signal Fix...</p>
      </div>
    );
  }

  return (
    <div className="relative h-[200px] sm:h-[250px] md:h-[350px] w-full rounded-[2rem] overflow-hidden group border border-black/5 shadow-inner">
      <div 
        ref={mapRef} 
        className="h-full w-full z-10"
        style={{ isolation: 'isolate' }}
      />
      <div className="absolute top-4 right-4 z-[20] flex flex-col gap-2">
        <Button 
          size="icon" 
          variant="secondary" 
          className="h-10 w-10 neo-btn bg-white/90 hover:bg-white transition-all shadow-lg"
          onClick={resetView}
          title="Recenter Signal"
        >
          <Target className="h-5 w-5 text-primary" />
        </Button>
      </div>
      <style jsx global>{`
        .leaflet-popup-content-wrapper {
          border-radius: 1.5rem;
          padding: 0;
          background: #ffffff;
          box-shadow: 10px 10px 20px rgba(0,0,0,0.1);
          border: 1px solid rgba(0, 0, 0, 0.05);
        }
        .leaflet-popup-content {
          margin: 12px;
        }
        .leaflet-popup-tip {
          display: none;
        }
        .leaflet-control-zoom {
          border: none !important;
          box-shadow: 6px 6px 15px rgba(0,0,0,0.1) !important;
          margin-bottom: 24px !important;
          margin-right: 16px !important;
        }
        .leaflet-control-zoom-in, .leaflet-control-zoom-out {
          background-color: white !important;
          border-radius: 0.75rem !important;
          margin-bottom: 2px;
          border: none !important;
          color: #3b82f6 !important;
          font-weight: bold !important;
          width: 32px !important;
          height: 32px !important;
          line-height: 32px !important;
        }
      `}</style>
    </div>
  );
}
