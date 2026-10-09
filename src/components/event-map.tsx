"use client";

import { useEffect, useState } from "react";
import Map, { Marker, Layer } from "react-map-gl/mapbox";
import "mapbox-gl/dist/mapbox-gl.css";
import { MapPin, Loader2 } from "lucide-react";

interface EventMapProps {
  address: string;
}

export function EventMap({ address }: EventMapProps) {
  const [coordinates, setCoordinates] = useState<{ lng: number; lat: number } | null>(null);
  const [loading, setLoading] = useState(true);
  
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  useEffect(() => {
    if (!token) {
      setLoading(false);
      return;
    }

    async function geocode() {
      try {
        const res = await fetch(`https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(address)}.json?access_token=${token}&limit=1`);
        const data = await res.json();
        if (data.features && data.features.length > 0) {
          const [lng, lat] = data.features[0].center;
          setCoordinates({ lng, lat });
        }
      } catch (err) {
        console.error("Geocoding error", err);
      } finally {
        setLoading(false);
      }
    }
    geocode();
  }, [address, token]);

  if (!token) {
    return (
      <div className="w-full h-[300px] bg-muted rounded-xl border border-border flex flex-col items-center justify-center p-6 text-center">
        <MapPin className="text-[var(--brand-500)] mb-2" size={24} />
        <p className="text-sm font-medium text-foreground">Mapa Indisponível</p>
        <p className="text-xs text-muted-fg mt-1">Configure o NEXT_PUBLIC_MAPBOX_TOKEN no .env</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="w-full h-[300px] bg-muted rounded-xl border border-border flex items-center justify-center">
        <Loader2 className="animate-spin text-[var(--brand-500)]" size={24} />
      </div>
    );
  }

  if (!coordinates) {
    return (
      <div className="w-full h-[300px] bg-muted rounded-xl border border-border flex items-center justify-center text-sm text-muted-fg">
        Localização não encontrada no mapa.
      </div>
    );
  }

  return (
    <div className="w-full h-[400px] rounded-xl overflow-hidden border border-border relative">
      <Map
        mapboxAccessToken={token}
        initialViewState={{
          longitude: coordinates.lng,
          latitude: coordinates.lat,
          zoom: 16.5,
          pitch: 65, // Perspectiva 3D inclinada
          bearing: -20, // Rotação da câmera
        }}
        mapStyle="mapbox://styles/mapbox/dark-v11"
        attributionControl={false}
      >
        <Layer
          id="3d-buildings"
          source="composite"
          source-layer="building"
          filter={['==', 'extrude', 'true']}
          type="fill-extrusion"
          minzoom={14}
          paint={{
            'fill-extrusion-color': '#2a2a35',
            'fill-extrusion-height': [
              'interpolate',
              ['linear'],
              ['zoom'],
              14,
              0,
              14.05,
              ['get', 'height']
            ],
            'fill-extrusion-base': [
              'interpolate',
              ['linear'],
              ['zoom'],
              14,
              0,
              14.05,
              ['get', 'min_height']
            ],
            'fill-extrusion-opacity': 0.7
          }}
        />
        
        <Marker longitude={coordinates.lng} latitude={coordinates.lat} anchor="bottom">
          <div className="relative flex flex-col items-center">
            {/* O "Pino" em si */}
            <div className="w-8 h-8 bg-[#3b82f6] rounded-full flex items-center justify-center shadow-[0_0_15px_rgba(59,130,246,0.5)] z-10">
              <MapPin size={16} className="text-white" fill="currentColor" />
            </div>
            {/* Sombra embaixo do pino */}
            <div className="absolute -bottom-1 w-5 h-2 bg-black/60 rounded-[100%] blur-[2px]"></div>
          </div>
        </Marker>
      </Map>
      
      {/* Botão de abrir rota igual do print (visual) */}
      <div className="absolute top-4 right-4 z-10">
        <a 
          href={`https://www.google.com/maps/search/?api=1&query=${coordinates.lat},${coordinates.lng}`}
          target="_blank"
          rel="noopener noreferrer"
          className="px-5 py-2.5 bg-[#1C1C1F] hover:bg-black text-white text-xs font-semibold rounded-lg shadow-xl transition-colors border border-white/5"
        >
          Abrir no mapa
        </a>
      </div>
    </div>
  );
}
