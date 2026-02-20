'use client'

import { MapContainer, TileLayer, Marker, Popup, useMapEvents } from 'react-leaflet'
import 'leaflet/dist/leaflet.css'
import L from 'leaflet'
import { useEffect, useState, useRef, useMemo } from 'react'
import { Locate, MapPin } from 'lucide-react'
import { Button } from '@/components/ui/Button'

// Fix for default marker icons in Next.js
const iconUrl = '/marker-icon.png?v=1'
const iconRetinaUrl = '/marker-icon-2x.png?v=1'
const shadowUrl = '/marker-shadow.png?v=1'

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

interface LocationPickerProps {
  value?: { lat: number, lng: number } | null
  onChange: (value: { lat: number, lng: number }) => void
  zoom?: number
}

function LocationMarker({ position, onChange }: { position: L.LatLngExpression | null, onChange: (pos: L.LatLng) => void }) {
  const markerRef = useRef<L.Marker>(null)

  const map = useMapEvents({
    click(e) {
      onChange(e.latlng)
      map.flyTo(e.latlng, map.getZoom())
    },
    locationfound(e) {
      onChange(e.latlng)
      map.flyTo(e.latlng, 16)
    },
  })

  useEffect(() => {
    if (position) {
      map.flyTo(position, map.getZoom())
    }
  }, [position, map])

  const eventHandlers = useMemo(
    () => ({
      dragend() {
        const marker = markerRef.current
        if (marker != null) {
          onChange(marker.getLatLng())
        }
      },
      add() {
        if (markerRef.current) {
            markerRef.current.openPopup()
        }
      }
    }),
    [onChange],
  )

  return position === null ? null : (
    <Marker
      draggable={true}
      eventHandlers={eventHandlers}
      position={position}
      ref={markerRef}
      icon={DefaultIcon}
    >
      <Popup>Buyer Location</Popup>
    </Marker>
  )
}

export default function BuyerLocationPicker({ value, onChange, zoom = 13 }: LocationPickerProps) {
  const [isLocating, setIsLocating] = useState(false)
  const [mounted, setMounted] = useState(false)

  // Only render on client to avoid hydration mismatch with Leaflet
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true)
  }, [])

  const handleLocate = () => {
    setIsLocating(true)
    if (!navigator.geolocation) {
       alert("Geolocation is not supported by your browser")
       setIsLocating(false)
       return
    }

    navigator.geolocation.getCurrentPosition(
        (position) => {
            const { latitude, longitude } = position.coords
            onChange({ lat: latitude, lng: longitude })
            setIsLocating(false)
        },
        (error) => {
            console.error("Error getting location", error)
            alert("Could not get your location. Please ensure location services are enabled.")
            setIsLocating(false)
        },
        { enableHighAccuracy: true, timeout: 10000 }
    )
  }

  // Default center (Nairobi) if no value
  const center = value ? [value.lat, value.lng] : [-1.2921, 36.8219]

  if (!mounted) return <div className="h-64 bg-gray-100 animate-pulse rounded-lg flex items-center justify-center text-gray-400">Loading Map...</div>

  return (
    <div className="space-y-2">
       <div className="h-64 w-full rounded-xl overflow-hidden border border-gray-200 shadow-sm relative group">
         <MapContainer
            center={center as L.LatLngExpression}
            zoom={zoom}
            scrollWheelZoom={false}
            style={{ height: '100%', width: '100%' }}
            attributionControl={false}
         >
            <TileLayer
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            />
            <LocationMarker 
                position={value ? [value.lat, value.lng] as L.LatLngExpression : null} 
                onChange={(pos) => onChange({ lat: pos.lat, lng: pos.lng })}
            />
         </MapContainer>
         
         <div className="absolute bottom-4 right-4 z-[400]">
             <Button 
                type="button" 
                size="sm" 
                variant="secondary" 
                className="rounded-full shadow-md bg-white hover:bg-gray-100"
                onClick={handleLocate}
                disabled={isLocating}
                title="Use Current Location"
             >
                 {isLocating ? <span className="animate-spin h-4 w-4 border-2 border-primary border-t-transparent rounded-full" /> : <Locate className="h-4 w-4 text-gray-700" />}
             </Button>
         </div>
       </div>
       
       <div className="flex items-center justify-between text-xs text-gray-500 px-1">
          <p className="flex items-center gap-1">
              <MapPin className="h-3 w-3" />
              {value ? `${value.lat.toFixed(6)}, ${value.lng.toFixed(6)}` : 'Tap map to pin location'}
          </p>
          {!value && <span className="text-gray-400 font-medium">Optional</span>}
       </div>
    </div>
  )
}
