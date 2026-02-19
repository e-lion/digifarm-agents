'use client'

import { useState } from 'react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { SearchableSelect } from '@/components/ui/SearchableSelect'
import * as z from 'zod'
import { useRouter } from 'next/navigation'
import dynamic from 'next/dynamic'
import { toast } from 'sonner'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { PhoneInput, isValidPhoneNumber } from '@/components/ui/PhoneInput'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { MapPin, CheckCircle, XCircle, WifiOff, AlertCircle } from 'lucide-react'
import booleanPointInPolygon from '@turf/boolean-point-in-polygon'
import distance from '@turf/distance'
import { point, polygon } from '@turf/helpers'
import { updateVisitAction, recordCheckInAction } from '@/lib/actions/visits'
import { updateBuyerLocation } from '@/lib/actions/buyers'

const formSchema = z.object({
  contact_id: z.string().optional(),
  contact_name: z.string().optional(),
  phone: z.string().optional(),
  contact_designation: z.string().optional(),
  active_farmers: z.number().min(0, 'Must be 0 or more'),
  is_potential_customer: z.union([z.literal('Yes'), z.literal('No'), z.literal('Maybe')], {
    message: "Please select if they are a potential customer"
  }),
  trade_volume: z.string().min(1, 'Volume is required'),
  buyer_feedback: z.string().optional(),
}).superRefine((data, ctx) => {
    // If adding a new contact (or no ID set which implies new), require name and phone
    if (!data.contact_id || data.contact_id === 'new') {
        if (!data.contact_name || data.contact_name.length < 2) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Name is required for new contact",
                path: ["contact_name"]
            })
        }
        if (!data.phone || !isValidPhoneNumber(data.phone)) {
             ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: "Valid phone number is required",
                path: ["phone"]
            })
        }
    }
})

type FormValues = z.infer<typeof formSchema>


const DynamicMap = dynamic(() => import('@/components/map/Map'), { 
  loading: () => <div className="h-48 w-full bg-gray-100 animate-pulse rounded-lg flex items-center justify-center text-xs text-gray-400">Loading map...</div>,
  ssr: false 
})

export default function VisitForm({ 
  visitId, 
  buyerId, 
  buyerName, 
  buyerType,
  targetPolygon,
  initialData,
  status,
  checkInLocation,
  isLocal,
  contactDesignations = [],
  existingContacts = []
}: { 
  visitId: string, 
  buyerId?: string,
  buyerName: string, 
  buyerType?: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  targetPolygon: any,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  initialData?: any,
  status?: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  checkInLocation?: any,
  isLocal?: boolean,
  contactDesignations?: string[],
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  existingContacts?: any[]
}) {
  const [isWithinRange, setIsWithinRange] = useState<boolean | null>(null)
  const [locationChecking, setLocationChecking] = useState(false)
  const [coords, setCoords] = useState<{lat: number, lng: number} | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [isOfflineSaved, setIsOfflineSaved] = useState(false)
  const [isUpdatingLocation, setIsUpdatingLocation] = useState(false)
  const [mapBounds, setMapBounds] = useState<[number, number][] | null>(null)
  const [distanceToTarget, setDistanceToTarget] = useState<number | null>(null)
  const [showNoLocationPrompt, setShowNoLocationPrompt] = useState(false)
  const [selectedContactId, setSelectedContactId] = useState<string>('new')
  const router = useRouter()


  // ... (parsePoint, savedCoords, getPolygonCenter, mapPolygons, mapMarkers helpers) ...
  // Helper to parse check_in_location from Supabase (can be WKT string or GeoJSON object)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
    
    return null
  }

  const savedCoords = parsePoint(checkInLocation)

  // Helper to get center of polygon for map default view
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getPolygonCenter = (poly: any): [number, number] => {
    try {
      const coords = poly.coordinates?.[0] || poly[0]
      if (coords && coords.length > 0) {
        // Return first point as a fallback center
        return [coords[0][1], coords[0][0]]
      }
    } catch {}
    return [-1.2921, 36.8219] // Nairobi fallback
  }

  // Helper to format polygon for our Map component
  const mapPolygons = targetPolygon ? [{
    id: 'target',
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
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

  const { register, handleSubmit, control, setValue, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      ...initialData,
      phone: initialData?.phone || '', 
      contact_designation: initialData?.contact_designation || '',
      agsi_business_type: initialData?.agsi_business_type || buyerType || "",
      contact_id: selectedContactId
    }
  })

  // Watch selected contact to toggle UI
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const selectedContact = existingContacts?.find((c: any) => c.id === selectedContactId)

  // Handle contact selection
  const handleContactSelect = (contactId: string) => {
      setSelectedContactId(contactId)
      setValue('contact_id', contactId)
      
      if (contactId === 'new') {
          setValue('contact_name', '')
          setValue('phone', '')
          setValue('contact_designation', '')
      } else {
           // Clear fields so validaton doesn't get confused, 
           // but technically we don't validate them if contact_id != 'new'
           setValue('contact_name', '')
           setValue('phone', '')
           setValue('contact_designation', '')
      }
  }

  // If completed, show summary
  if (status === 'completed' && initialData) {
    const summaryPolygons = targetPolygon ? [{
      id: 'target',
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
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
                   <label className="text-xs text-gray-500 uppercase">Designation</label>
                   <p className="font-medium">{initialData.contact_designation || '-'}</p>
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

  const handleUpdateBuyerLocation = async () => {
      if (!coords || !buyerId) {
          toast.error("Cannot update location: Missing coordinates or buyer ID")
          return
      }
      
      setIsUpdatingLocation(true)
      try {
          // 1. Update buyer location
          const result = await updateBuyerLocation(buyerId, coords.lat, coords.lng)
          
          if (!result.success) {
              toast.error(result.error || "Failed to update buyer location")
              return
          }

          toast.success("Buyer location updated")
          
          // 2. Proceed to check-in (now valid)
          // We can manually set isWithinRange to true to unlock the form
          setIsWithinRange(true)
          setShowNoLocationPrompt(false)
          
          // Also record check-in effectively
          if (visitId) {
             await recordCheckInAction(visitId, coords)
          }

      } catch (error) {
          console.error(error)
          toast.error('Failed to update location')
      } finally {
          setIsUpdatingLocation(false)
      }
  }

  const handleOffsiteVisit = async () => {
      if (!coords || !visitId) return
      
      setLocationChecking(true)
      try {
          // Record check-in at current location (even if out of range)
          const result = await recordCheckInAction(visitId, coords)
          if (result.success) {
              toast.success("Checked in as Offsite Visit")
              setIsWithinRange(true) // Allow proceeding
              setShowNoLocationPrompt(false)
          } else {
              toast.error(result.error || "Failed to check in")
          }
      } catch (error) {
          console.error(error)
          toast.error("An error occurred")
      } finally {
          setLocationChecking(false)
      }
  }

  const checkLocation = () => {
    setLocationChecking(true)
    setError(null)
    setIsWithinRange(null)
    setShowNoLocationPrompt(false)

    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser')
      setLocationChecking(false)
      return
    }

    const onLocationSuccess = (position: GeolocationPosition) => {
      const { latitude, longitude } = position.coords
      setCoords({ lat: latitude, lng: longitude })
      
      // Calculate bounds for map to show both agent and target
      const points: [number, number][] = [[latitude, longitude]]
      if (mapPolygons.length > 0) {
        points.push(...mapPolygons[0].coords)
      }
      if (points.length > 1) {
        setMapBounds(points)
      }
      
      
      if (!targetPolygon) {
        setShowNoLocationPrompt(true)
        setLocationChecking(false)
        return
      }

      try {
        const pt = point([longitude, latitude])
        const polyData = targetPolygon.coordinates || targetPolygon
        const poly = polygon(polyData)
        const isInside = booleanPointInPolygon(pt, poly)
        setIsWithinRange(isInside)
        
        if (isInside) {
          setDistanceToTarget(0)
          if (navigator.onLine && !isLocal) {
            recordCheckInAction(visitId, { lat: latitude, lng: longitude })
          } else {
             toast.info("Working offline. Location verified locally.")
          }
        } else {
          // Calculate distance to center for UI feedback
          const [centerLng, centerLat] = getPolygonCenter(targetPolygon).reverse()
          const centerPt = point([centerLng, centerLat])
          const dist = distance(pt, centerPt, { units: 'kilometers' })
          setDistanceToTarget(dist)
        }
      } catch (e) {
        console.error("Geo check error", e)
        setIsWithinRange(true)
      }
      setLocationChecking(false)
    }

    const onLocationError = () => {
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

  const handleOfflineSave = async (data: FormValues) => {
      // Append selected contact info if available to ensure it's saved in the record
      if (selectedContactId !== 'new' && selectedContact) {
          data.contact_name = selectedContact.name
          data.phone = selectedContact.phone
          data.contact_designation = selectedContact.designation
      }

      try {
          const { saveOfflineReport } = await import('@/lib/offline-storage')
          await saveOfflineReport({
              id: visitId,
              buyerName: buyerName,
              data: data,
              coords: coords,
              timestamp: Date.now()
          })
          
          window.dispatchEvent(new Event('offline-storage-updated'))
          
          toast.success("Report saved to outbox (Offline Mode)", {
              duration: 5000,
              icon: <WifiOff className="h-5 w-5 text-orange-500" />
          })
          
          setIsOfflineSaved(true)
      } catch (e) {
          console.error("Failed to save offline", e)
          alert("Failed to save report. Please try again.")
      }
  }

  const onSubmit = async (data: FormValues) => {
    // Manually inject selected contact details if not "new"
    if (selectedContactId !== 'new' && selectedContact) {
        data.contact_name = selectedContact.name
        data.phone = selectedContact.phone
        data.contact_designation = selectedContact.designation
    }

    // 1. Explicit Offline Check (or Local Draft)
    if (!navigator.onLine || isLocal) {
        await handleOfflineSave(data)
        return
    }

    // 2. Try Online Submission
    try {
        const result = await updateVisitAction(visitId, buyerName, data, coords)

        if (result.error) {
            // If it's a specific server error (not network), show it
            alert(result.error)
            return
        }
        router.push('/agent/routes')
    } catch (e) {
        // 3. Network/Server Error Fallback
        console.warn("Online submission failed, falling back to offline save", e)
        toast.info("Connection unstable. Saving locally instead.")
        await handleOfflineSave(data)
    }  
  }

  if (isOfflineSaved) {
    return (
        <div className="flex flex-col items-center justify-center p-8 text-center space-y-6 animate-in fade-in duration-500">
            <div className="h-20 w-20 bg-green-100 rounded-full flex items-center justify-center">
                <WifiOff className="h-10 w-10 text-green-600" />
            </div>
            <div className="space-y-2">
                <h3 className="text-xl font-bold text-gray-900">Report Saved Offline</h3>
                <p className="text-gray-500 max-w-xs mx-auto">Your visit report has been saved to the outbox and will sync automatically when you are back online.</p>
            </div>
            <Button onClick={() => router.push('/agent/routes')} className="w-full h-12 rounded-xl font-bold">
                Back to Routes
            </Button>
        </div>
    )
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
              bounds={mapBounds}
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

            {isWithinRange === false && coords && (
                <div className="space-y-3 p-4 bg-yellow-50 rounded-xl border border-yellow-200 animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-start gap-3">
                        <AlertCircle className="h-5 w-5 text-yellow-600 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                            <h4 className="font-semibold text-yellow-900">You are not at the designated location</h4>
                            <p className="text-sm text-yellow-700">
                                Distance: {distanceToTarget ? `${Math.round(distanceToTarget * 1000)}m` : 'Unknown'} away.
                                Allowable range is 100m.
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                         <Button 
                            type="button" 
                            variant="secondary"
                            onClick={handleUpdateBuyerLocation} 
                            disabled={!buyerId || isUpdatingLocation}
                            isLoading={isUpdatingLocation}
                            className="w-full border-yellow-300 text-yellow-800 bg-yellow-100 hover:bg-yellow-200"
                        >
                            Update Buyer Location
                        </Button>
                        <Button 
                            type="button" 
                            variant="outline"
                            onClick={handleOffsiteVisit} 
                            disabled={locationChecking}
                            isLoading={locationChecking}
                            className="w-full border-yellow-300 text-yellow-700 hover:bg-yellow-50"
                        >
                            Record Offsite Visit
                        </Button>
                    </div>
                </div>
            )}

            {showNoLocationPrompt && coords && (
                <div className="space-y-3 p-4 bg-blue-50 rounded-xl border border-blue-200 animate-in fade-in slide-in-from-top-2">
                    <div className="flex items-start gap-3">
                        <MapPin className="h-5 w-5 text-blue-600 shrink-0 mt-0.5" />
                        <div className="space-y-1">
                            <h4 className="font-semibold text-blue-900">Buyer Location Not Set</h4>
                            <p className="text-sm text-blue-700">
                                This buyer doesn&apos;t have a designated location. Is your current position the correct buyer location?
                            </p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                         <Button 
                            type="button" 
                            variant="secondary"
                            onClick={handleUpdateBuyerLocation} 
                            disabled={!buyerId || isUpdatingLocation}
                            isLoading={isUpdatingLocation}
                            className="w-full border-blue-300 text-blue-800 bg-blue-100 hover:bg-blue-200"
                        >
                            Yes, set as Buyer Location
                        </Button>
                        <Button 
                            type="button" 
                            variant="outline"
                            onClick={handleOffsiteVisit} 
                            disabled={locationChecking}
                            isLoading={locationChecking}
                            className="w-full border-blue-300 text-blue-700 hover:bg-blue-50"
                        >
                            No, this is a Remote Visit
                        </Button>
                    </div>
                </div>
            )}
            
            {error && <p className="text-xs text-red-500 font-medium">{error}</p>}
          </div>
        </CardContent>
      </Card>

      {isWithinRange && (
        <Card>
          <CardHeader>
            <CardTitle>Visit Report: {buyerName}</CardTitle>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
              
              {/* 1. Contact Management Section */}
              <div className="space-y-4">
                  <div className="flex justify-between items-center bg-gray-50 p-3 rounded-lg border border-gray-100">
                    <span className="text-sm font-medium text-gray-500">Buyer</span>
                    <span className="text-sm font-bold text-gray-900">{buyerName}</span>
                  </div>

                  <div className="space-y-2">
                       <label className="text-sm font-medium text-gray-700 block">Who did you meet?</label>
                       
                       {existingContacts && existingContacts.length > 0 ? (
                           <div className="grid gap-3">
                               {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                               {existingContacts.map((c: any) => (
                                   <div 
                                     key={c.id}
                                     onClick={() => handleContactSelect(c.id)}
                                     className={`p-3 rounded-xl border-2 cursor-pointer transition-all ${
                                         selectedContactId === c.id 
                                         ? 'border-green-600 bg-green-50' 
                                         : 'border-gray-100 hover:border-green-100 bg-white'
                                     }`}
                                   >
                                       <div className="flex items-center justify-between">
                                            <div>
                                                <p className={`font-bold ${selectedContactId === c.id ? 'text-green-900' : 'text-gray-900'}`}>{c.name}</p>
                                                <p className="text-sm text-gray-500 flex items-center gap-2">
                                                    <span>{c.designation || 'No Role'}</span>
                                                    <span>•</span>
                                                    <span>{c.phone}</span>
                                                </p>
                                            </div>
                                            {selectedContactId === c.id && <CheckCircle className="h-5 w-5 text-green-600" />}
                                       </div>
                                   </div>
                               ))}

                               {/* Option to Add New */}
                               <div 
                                 onClick={() => handleContactSelect('new')}
                                 className={`p-3 rounded-xl border-2 border-dashed cursor-pointer flex items-center justify-center gap-2 transition-all ${
                                     selectedContactId === 'new' 
                                     ? 'border-green-600 bg-green-50 text-green-700 font-medium' 
                                     : 'border-gray-300 text-gray-500 hover:border-green-400 hover:text-green-600'
                                 }`}
                               >
                                   <span>+ Add New Contact</span>
                               </div>
                           </div>
                       ) : (
                           // No existing contacts, default to new
                           <div className="p-3 bg-blue-50 text-blue-700 rounded-lg text-sm">
                               No existing contacts found. Please add one below.
                           </div>
                       )}
                  </div>

                  {/* Show inputs only if adding new */}
                  {(!existingContacts?.length || selectedContactId === 'new') && (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 animate-in fade-in slide-in-from-top-2 border-t border-gray-100 mt-2">
                           <div>
                            <label className="text-sm font-medium text-gray-700">Contact Name <span className="text-red-500">*</span></label>
                            <Input {...register('contact_name')} placeholder="e.g. John Doe" />
                            {errors.contact_name && <p className="text-xs text-red-500 mt-1">{errors.contact_name.message}</p>}
                          </div>

                          <div>
                            <label className="text-sm font-medium text-gray-700">Phone <span className="text-red-500">*</span></label>
                            <Controller
                              name="phone"
                              control={control}
                              render={({ field }) => (
                                <PhoneInput 
                                  value={field.value || ''} 
                                  onChange={field.onChange}
                                  placeholder="Enter phone number"
                                  error={errors.phone?.message}
                                />
                              )}
                            />
                          </div>

                          <div className="md:col-span-2">
                             <label className="text-sm font-medium text-gray-700">Designation</label>
                             <Controller
                                name="contact_designation"
                                control={control}
                                render={({ field }) => (
                                    <SearchableSelect
                                        options={contactDesignations}
                                        value={field.value || ""}
                                        onChange={field.onChange}
                                        placeholder="Select designation..."
                                    />
                                )}
                             />
                             {errors.contact_designation && <p className="text-xs text-red-500 mt-1">{errors.contact_designation.message}</p>}
                          </div>
                      </div>
                  )}
              </div>

              <div className="border-t border-gray-100 my-4"></div>

              {/* 2. Business Intelligence Section */}
              <div className="space-y-4">
                  <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                      Business Intelligence
                  </h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-700">Active Farmers</label>
                        <Input {...register('active_farmers', { valueAsNumber: true })} type="number" />
                        {errors.active_farmers && <p className="text-xs text-red-500 mt-1">{errors.active_farmers.message}</p>}
                      </div>

                      <div>
                        <label className="text-sm font-medium text-gray-700">Trade Volume / Month</label>
                        <Input {...register('trade_volume')} placeholder="e.g. 5000 units or 10 tons" />
                        {errors.trade_volume && <p className="text-xs text-red-500 mt-1">{errors.trade_volume.message}</p>}
                      </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700">Is this a qualifying lead?</label>
                    <div className="flex gap-4 mt-2">
                      {['Yes', 'No', 'Maybe'].map((option) => (
                        <label key={option} className="flex items-center gap-2 cursor-pointer bg-gray-50 px-3 py-2 rounded-lg border border-gray-200">
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
              </div>

              <div className="border-t border-gray-100 my-4"></div>

              {/* 3. Visit Summary Section */}
              <div className="space-y-4">
                  <h3 className="text-sm font-bold text-gray-900 flex items-center gap-2">
                      Visit Summary
                  </h3>
                  <div>
                    <label className="text-sm font-medium text-gray-700">Feedback / Notes</label>
                    <textarea 
                      {...register('buyer_feedback')}
                      className="flex min-h-[100px] w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2"
                      placeholder="Enter specific feedback, observations, or next steps..."
                    />
                  </div>
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
