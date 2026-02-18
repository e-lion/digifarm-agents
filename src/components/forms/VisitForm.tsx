'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Loader2, MapPin, CheckCircle, XCircle } from 'lucide-react'
import booleanPointInPolygon from '@turf/boolean-point-in-polygon'
import { point, polygon } from '@turf/helpers'
import circle from '@turf/circle'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { SearchableSelect } from '@/components/ui/SearchableSelect'
import { updateVisitAction, recordCheckInAction } from '@/lib/actions/visits'
import dynamic from 'next/dynamic'

const KENYAN_VALUE_CHAINS = [
    "Maize", "Tea", "Coffee", "Dairy", "Sugarcane", "Potatoes", "Beans", 
    "Bananas", "Rice", "Wheat", "Sorghum", "Millet", "Avocado", "Mangoes", 
    "Macadamia", "Cashew Nuts", "Pyrethrum", "Cotton", "Sunflower", "Soya Beans",
    "Tomatoes", "Onions", "Cabbages", "Kales (Sukuma Wiki)", "Poultry", "Goats/Sheep"
]

const formSchema = z.object({
  contact_name: z.string().min(2, 'Name is required'),
  phone: z.string().regex(/^\+?[0-9]{10,14}$/, 'Invalid phone number'),
  active_farmers: z.number().min(0, 'Must be 0 or more'),
  is_potential_customer: z.enum(['Yes', 'No', 'Maybe'], {
    required_error: "Please select if they are a potential customer",
  }),
  trade_volume: z.string().min(1, 'Volume is required'),
  buyer_feedback: z.string().optional(),
})

type FormValues = z.infer<typeof formSchema>

const COUNTIES = [
  'Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Uasin Gishu', 'Kiambu', 'Machakos', 'Nyeri', 'Meru', 'Kakamega' 
]

const BUSINESS_TYPES = ['Aggregator', 'Processor', 'Exporter', 'Input Supplier', 'Cooperative']

const DynamicMap = dynamic(() => import('@/components/map/Map'), { 
  loading: () => <div className="h-48 w-full bg-gray-100 animate-pulse rounded-lg flex items-center justify-center text-xs text-gray-400">Loading map...</div>,
  ssr: false 
})

export default function VisitForm({ 
  visitId, 
  buyerName, 
  buyerType,
  targetPolygon,
  initialData,
  status,
  checkInLocation
}: { 
  visitId: string, 
  buyerName: string, 
  buyerType?: string,
  targetPolygon: any,
  initialData?: any,
  status?: string,
  checkInLocation?: any
}) {
  const [isWithinRange, setIsWithinRange] = useState<boolean | null>(null)
  const [locationChecking, setLocationChecking] = useState(false)
  const [coords, setCoords] = useState<{lat: number, lng: number} | null>(null)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  // Helper to parse check_in_location from Supabase (can be WKT string or GeoJSON object)
  const parsePoint = (pt: any) => {
    if (!pt) return null
    
    // If it's a GeoJSON object (sometimes handled via Supabase/PostgREST naturally)
    if (typeof pt === 'object') {
      if (pt.type === 'Point' && Array.isArray(pt.coordinates)) {
        return { lat: pt.coordinates[1], lng: pt.coordinates[0] }
      }
      if (pt.coordinates && Array.isArray(pt.coordinates)) {
        return { lat: pt.coordinates[1], lng: pt.coordinates[0] }
      }
    }

    // If it's a string (WKT or HEX EWKB)
    if (typeof pt === 'string') {
      // WKT Handle: POINT(lng lat)
      if (pt.startsWith('POINT(')) {
        const match = pt.match(/\((.*)\)/)
        if (match) {
          const parts = match[1].trim().split(/\s+/)
          if (parts.length >= 2) {
            const [lng, lat] = parts.map(Number)
            return { lat, lng }
          }
        }
      }
      
      // HEX EWKB Handle (Standard PostGIS return format)
      // Usually starts with 0101 (Little Endian Point)
      if (/^[0-9A-Fa-f]+$/.test(pt) && pt.length >= 50) {
        try {
          // Point 4326 EWKB: [1 byte endian] [4 bytes type] [4 bytes SRID] [8 bytes X] [8 bytes Y]
          // Endian (01) + Type (01000020) + SRID (E6100000) = 9 bytes total before coords (18 hex chars)
          // X starts at char 18 (byte 9), Y starts at char 34 (byte 17)
          const hexToDouble = (hex: string, le: boolean) => {
            const bytes = new Uint8Array(hex.match(/.{1,2}/g)!.map(b => parseInt(b, 16)))
            if (!le) bytes.reverse() // Basic handled for big endian if needed
            const view = new DataView(bytes.buffer)
            return view.getFloat64(0, true) // Leaflet/PostGIS mostly LE
          }
          
          const isLittleEndian = pt.startsWith('01')
          const lng = hexToDouble(pt.substring(18, 34), isLittleEndian)
          const lat = hexToDouble(pt.substring(34, 50), isLittleEndian)
          
          if (!isNaN(lat) && !isNaN(lng)) {
            return { lat, lng }
          }
        } catch (e) {
          console.error("EWKB Parse Error:", e)
        }
      }
    }
    
    return null
  }

  const savedCoords = parsePoint(checkInLocation)

  // Helper to get center of polygon for map default view
  const getPolygonCenter = (poly: any): [number, number] => {
    try {
      const coords = poly.coordinates?.[0] || poly[0]
      if (coords && coords.length > 0) {
        // Return first point as a fallback center
        return [coords[0][1], coords[0][0]]
      }
    } catch (e) {}
    return [-1.2921, 36.8219] // Nairobi fallback
  }

  // If completed, show summary
  if (status === 'completed' && initialData) {
    const summaryPolygons = targetPolygon ? [{
      id: 'target',
      coords: targetPolygon.coordinates?.[0]?.map((c: any) => [c[1], c[0]]) || targetPolygon[0]?.map((c: any) => [c[1], c[0]]),
      color: '#16a34a',
      name: 'Designated Area'
    }] : []

    const summaryMarkers = savedCoords ? [{
      id: 'check-in',
      position: [savedCoords.lat, savedCoords.lng] as [number, number],
      popup: 'Check-in Location'
    }] : []

    const centerPoint = savedCoords ? [savedCoords.lat, savedCoords.lng] : getPolygonCenter(targetPolygon)

    return (
      <div className="space-y-6">
        <Card className="bg-green-50 border-green-200">
           <CardContent className="pt-6 flex items-center gap-4">
              <CheckCircle className="h-8 w-8 text-green-600" />
              <div>
                <h3 className="font-bold text-green-800">Visit Completed</h3>
                <p className="text-sm text-green-700">This visit report has been submitted.</p>
              </div>
           </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 text-center border-b mb-4">
            <CardTitle className="text-base text-gray-700">Audit Trail: Location Verification</CardTitle>
          </CardHeader>
          <CardContent>
             <div className="h-72 w-full rounded-2xl overflow-hidden border-4 border-white shadow-lg ring-1 ring-gray-200">
                <DynamicMap 
                  center={centerPoint as [number, number]}
                  zoom={17}
                  polygons={summaryPolygons}
                  markers={summaryMarkers}
                  hideLocate={true}
                />
             </div>
             {savedCoords ? (
               <p className="text-[10px] text-gray-400 mt-2 text-center uppercase tracking-widest font-mono">
                 GEOREF: {savedCoords.lat.toFixed(6)}, {savedCoords.lng.toFixed(6)}
               </p>
             ) : (
               <p className="text-[10px] text-red-400 mt-2 text-center uppercase tracking-widest">
                 ⚠️ No check-in location recorded
               </p>
             )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Report Details: {buyerName}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
             <div className="grid grid-cols-2 gap-4">
                <div>
                   <label className="text-xs text-gray-500 uppercase">Contact</label>
                   <p className="font-medium">{initialData.contact_name}</p>
                </div>
                <div>
                   <label className="text-xs text-gray-500 uppercase">Phone</label>
                   <p className="font-medium">{initialData.phone}</p>
                </div>
                <div>
                   <label className="text-xs text-gray-500 uppercase">Farmers</label>
                   <p className="font-medium">{initialData.active_farmers}</p>
                </div>
                <div>
                   <label className="text-xs text-gray-500 uppercase">Potential Customer</label>
                   <p className="font-medium">{initialData.is_potential_customer || 'Not specified'}</p>
                </div>
                <div>
                   <label className="text-xs text-gray-500 uppercase">Trade Volume / Month</label>
                   <p className="font-medium">{initialData.trade_volume || 'Not specified'}</p>
                </div>
             </div>
             
             {initialData.buyer_feedback && (
               <div className="pt-4 border-t">
                  <label className="text-xs text-gray-500 uppercase">Feedback</label>
                  <p className="text-gray-700 mt-1">{initialData.buyer_feedback}</p>
               </div>
             )}
          </CardContent>
        </Card>
        
        <div className="flex justify-center">
            <Button variant="secondary" onClick={() => router.push('/agent/routes')}>
                Back to Routes
            </Button>
        </div>
      </div>
    )
  }

  // Helper to format polygon for our Map component
  const mapPolygons = targetPolygon ? [{
    id: 'target',
    coords: targetPolygon.coordinates?.[0]?.map((c: any) => [c[1], c[0]]) || targetPolygon[0]?.map((c: any) => [c[1], c[0]]),
    color: isWithinRange === true ? '#16a34a' : '#dc2626',
    name: 'Designated Area'
  }] : []

  // Helper for agent marker
  const mapMarkers = coords ? [{
    id: 'agent',
    position: [coords.lat, coords.lng] as [number, number],
    popup: 'Your Location'
  }] : []

  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      ...initialData,
      agsi_business_type: initialData?.agsi_business_type || buyerType || ""
    }
  })
  
  const valueChain = watch('value_chain')

  // ... checkLocation remains same ...
  const checkLocation = () => {
    setLocationChecking(true)
    setError(null)

    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser')
      setLocationChecking(false)
      return
    }

    const onLocationSuccess = (position: GeolocationPosition) => {
      const { latitude, longitude } = position.coords
      setCoords({ lat: latitude, lng: longitude })
      
      
      if (!targetPolygon) {
        setIsWithinRange(true)
        setLocationChecking(false)
        
        // Generate 100m circle for this location since it wasn't set during creation
        try {
            const center = point([longitude, latitude])
            const circularPolygon = circle(center, 0.1, { units: 'kilometers', steps: 64 })
            recordCheckInAction(visitId, { lat: latitude, lng: longitude }, circularPolygon.geometry)
        } catch (e) {
            console.error("Error generating on-site polygon:", e)
            // Fallback to just recording check-in without polygon
            recordCheckInAction(visitId, { lat: latitude, lng: longitude })
        }
        return
      }

      try {
        const pt = point([longitude, latitude])
        const polyData = targetPolygon.coordinates || targetPolygon
        const poly = polygon(polyData)
        const isInside = booleanPointInPolygon(pt, poly)
        setIsWithinRange(isInside)
        
        if (isInside) {
          recordCheckInAction(visitId, { lat: latitude, lng: longitude })
        }
      } catch (e) {
        console.error("Geo check error", e)
        setIsWithinRange(true)
      }
      setLocationChecking(false)
    }

    const onLocationError = (err: GeolocationPositionError) => {
      navigator.geolocation.getCurrentPosition(
        onLocationSuccess,
        (err2) => {
          setError(`Location Unavailable: ${err2.message}`)
          setLocationChecking(false)
        },
        { enableHighAccuracy: false, timeout: 15000, maximumAge: 300000 }
      )
    }

    navigator.geolocation.getCurrentPosition(onLocationSuccess, onLocationError, { 
      enableHighAccuracy: true, timeout: 8000 
    })
  }

  const onSubmit = async (data: FormValues) => {
    const result = await updateVisitAction(visitId, buyerName, data, coords)

    if (result.error) {
      alert(result.error)
      return
    }
    router.push('/agent/routes')
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Location Verification</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Visual Map context */}
          <div className="h-64 w-full rounded-xl overflow-hidden border border-gray-100 shadow-inner relative group">
            <DynamicMap 
              center={coords ? [coords.lat, coords.lng] : getPolygonCenter(targetPolygon)}
              zoom={coords || targetPolygon ? 16 : 13}
              polygons={mapPolygons}
              markers={mapMarkers}
            />
            {!coords && (
              <div className="absolute inset-0 bg-black/5 flex items-center justify-center backdrop-blur-[1px]">
                <p className="text-xs font-medium text-gray-500 bg-white px-3 py-1.5 rounded-full shadow-sm">
                  Waiting for location...
                </p>
              </div>
            )}
          </div>

          <div className="flex flex-col items-center justify-center space-y-4 pt-2">
            <div className={`h-12 w-12 rounded-full flex items-center justify-center ${
              isWithinRange === true ? 'bg-green-100 text-green-600' : 
              isWithinRange === false ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-400'
            }`}>
              <MapPin className="h-6 w-6" />
            </div>
            
            <div className="text-center">
              {locationChecking ? (
                <p className="text-sm text-gray-500 animate-pulse">Verifying location...</p>
              ) : isWithinRange === true ? (
                <p className="text-sm font-semibold text-green-600 flex items-center gap-1">
                  <CheckCircle className="h-4 w-4" /> You are within the designated area
                </p>
              ) : isWithinRange === false ? (
                <div className="space-y-1">
                  <p className="text-sm font-semibold text-red-600 flex items-center justify-center gap-1">
                    <XCircle className="h-4 w-4" /> Area Verification Failed
                  </p>
                  <p className="text-xs text-gray-500 px-4">
                    Please move closer to the marked area on the map above to proceed.
                  </p>
                </div>
              ) : (
                <p className="text-sm text-gray-500">Please verify your location to start the report</p>
              )}
            </div>

            <Button 
              type="button" 
              variant={isWithinRange === true ? "outline" : "secondary"}
              onClick={checkLocation} 
              isLoading={locationChecking}
              className="w-full h-12 rounded-xl font-bold"
            >
              {isWithinRange === true ? "Re-verify Location" : "Start Check-in"}
            </Button>
            
            {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
          </div>
        </CardContent>
      </Card>

      {(isWithinRange || !targetPolygon) && (
        <Card>
          <CardHeader>
            <CardTitle>Visit Report: {buyerName}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border border-gray-100 mb-2">
                <span className="text-sm font-medium text-gray-500">Buyer</span>
                <span className="text-sm font-bold text-gray-900">{buyerName}</span>
              </div>

               <div>
                <label className="text-sm font-medium text-gray-700">Contact Name</label>
                <Input {...register('contact_name')} placeholder="e.g. John Doe" />
                {errors.contact_name && <p className="text-xs text-red-500 mt-1">{errors.contact_name.message}</p>}
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Phone</label>
                <Input {...register('phone')} placeholder="+254..." type="tel" />
                {errors.phone && <p className="text-xs text-red-500 mt-1">{errors.phone.message}</p>}
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Active Farmers</label>
                <Input {...register('active_farmers', { valueAsNumber: true })} type="number" />
                {errors.active_farmers && <p className="text-xs text-red-500 mt-1">{errors.active_farmers.message}</p>}
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Are they a potential customer? (Qualifying Lead)</label>
                <div className="flex gap-4 mt-2">
                  {['Yes', 'No', 'Maybe'].map((option) => (
                    <label key={option} className="flex items-center gap-2 cursor-pointer">
                      <input
                        type="radio"
                        value={option}
                        {...register('is_potential_customer')}
                        className="w-4 h-4 text-green-600 focus:ring-green-500 border-gray-300"
                      />
                      <span className="text-sm text-gray-700">{option}</span>
                    </label>
                  ))}
                </div>
                {errors.is_potential_customer && (
                  <p className="text-xs text-red-500 mt-1">{errors.is_potential_customer.message}</p>
                )}
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Trade Volume per Month</label>
                <Input {...register('trade_volume')} placeholder="e.g. 5000 units or 10 tons" />
                {errors.trade_volume && <p className="text-xs text-red-500 mt-1">{errors.trade_volume.message}</p>}
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Feedback</label>
                <textarea 
                  {...register('buyer_feedback')}
                  className="flex min-h-[100px] w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2"
                  placeholder="Additional notes..."
                />
              </div>

              <Button type="submit" className="w-full" isLoading={isSubmitting}>
                Submit Visit Report
              </Button>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
