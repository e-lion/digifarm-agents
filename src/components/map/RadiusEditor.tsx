'use client'

import { MapContainer, TileLayer, Marker, Circle, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { useState, useEffect } from 'react'

// Fix icons
const iconUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png'
const iconRetinaUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png'
const shadowUrl = 'https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png'

const DefaultIcon = L.icon({
  iconUrl,
  iconRetinaUrl,
  shadowUrl,
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  tooltipAnchor: [16, -28],
  shadowSize: [41, 41],
})
L.Marker.prototype.options.icon = DefaultIcon

interface RadiusEditorProps {
  onChange: (coords: [number, number] | null) => void
}

function MapEvents({ onClick }: { onClick: (e: L.LeafletMouseEvent) => void }) {
  const map = useMapEvents({
    click: onClick
  })

  useEffect(() => {
    map.locate().on("locationfound", function (e) {
      map.flyTo(e.latlng, map.getZoom())
    })
  }, [map])

  return (
    <div className="leaflet-bottom leaflet-left" style={{ pointerEvents: 'auto', marginBottom: '20px', marginLeft: '10px', zIndex: 1000 }}>
      <div className="leaflet-control leaflet-bar">
        <a 
          className="bg-white hover:bg-gray-100 text-gray-800 font-semibold p-2 border border-gray-400 rounded shadow flex items-center justify-center cursor-pointer"
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            map.locate({ setView: true })
          }}
          title="Locate Me"
          style={{ width: '34px', height: '34px' }}
        >
          <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="12" cy="12" r="10"></circle>
            <line x1="22" y1="12" x2="18" y2="12"></line>
            <line x1="6" y1="12" x2="2" y2="12"></line>
            <line x1="12" y1="6" x2="12" y2="2"></line>
            <line x1="12" y1="22" x2="12" y2="18"></line>
          </svg>
        </a>
      </div>
    </div>
  )
}

export default function RadiusEditor({ onChange }: RadiusEditorProps) {
  const [point, setPoint] = useState<[number, number] | null>(null)

  const handleMapClick = (e: L.LeafletMouseEvent) => {
    const newPoint: [number, number] = [e.latlng.lat, e.latlng.lng]
    setPoint(newPoint)
    onChange(newPoint)
  }

  return (
    <div className="relative h-[400px] w-full border rounded-xl overflow-hidden shadow-inner">
      <MapContainer 
        center={[-1.2921, 36.8219]} 
        zoom={13} 
        style={{ height: '100%', width: '100%' }}
        attributionControl={false}
      >
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
        <MapEvents onClick={handleMapClick} />
        
        {point && (
          <>
            <Marker position={point} />
            <Circle 
              center={point} 
              radius={100} 
              pathOptions={{ 
                color: '#16a34a', 
                fillColor: '#16a34a', 
                fillOpacity: 0.2,
                weight: 2
              }} 
            />
          </>
        )}
      </MapContainer>

      <div className="absolute top-4 left-4 z-[400] bg-white/95 p-3 rounded-xl shadow-lg border border-gray-100 text-xs font-medium text-gray-700">
        📍 Tap to drop a pin. A 1km radius will be set.
      </div>
    </div>
  )
}
