'use client'

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import * as z from 'zod'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Loader2, MapPin, CheckCircle, XCircle } from 'lucide-react'
// turf imports will be used but for now let's stub the check or expect the package
import booleanPointInPolygon from '@turf/boolean-point-in-polygon'
import { point, polygon } from '@turf/helpers'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { SearchableSelect } from '@/components/ui/SearchableSelect'

const KENYAN_VALUE_CHAINS = [
    "Maize", "Tea", "Coffee", "Dairy", "Sugarcane", "Potatoes", "Beans", 
    "Bananas", "Rice", "Wheat", "Sorghum", "Millet", "Avocado", "Mangoes", 
    "Macadamia", "Cashew Nuts", "Pyrethrum", "Cotton", "Sunflower", "Soya Beans",
    "Tomatoes", "Onions", "Cabbages", "Kales (Sukuma Wiki)", "Poultry", "Goats/Sheep"
]

const formSchema = z.object({
  contact_name: z.string().min(2, 'Name is required'),
  phone: z.string().regex(/^\+?[0-9]{10,14}$/, 'Invalid phone number'),
  value_chain: z.string().min(2, 'Value chain is required'),
  active_farmers: z.number().min(0, 'Must be 0 or more'),
  county: z.string().min(1, 'Select a county'),
  agsi_business_type: z.string().min(1, 'Select business type'),
  buyer_feedback: z.string().optional(),
})

type FormValues = z.infer<typeof formSchema>

const COUNTIES = [
  'Nairobi', 'Mombasa', 'Kisumu', 'Nakuru', 'Uasin Gishu', 'Kiambu', 'Machakos', 'Nyeri', 'Meru', 'Kakamega' 
  // ... add all 47
]

const BUSINESS_TYPES = ['Aggregator', 'Processor', 'Exporter', 'Input Supplier', 'Cooperative']

export default function VisitForm({ 
  visitId, 
  buyerName, 
  targetPolygon,
  initialData,
  status
}: { 
  visitId: string, 
  buyerName: string, 
  targetPolygon: any,
  initialData?: any,
  status?: string
}) {
  const [isWithinRange, setIsWithinRange] = useState<boolean | null>(null)
  // ... existing state ...

  // If completed, show summary
  if (status === 'completed' && initialData) {
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
                   <label className="text-xs text-gray-500 uppercase">Value Chain</label>
                   <p className="font-medium">{initialData.value_chain}</p>
                </div>
                <div>
                   <label className="text-xs text-gray-500 uppercase">Farmers</label>
                   <p className="font-medium">{initialData.active_farmers}</p>
                </div>
                 <div>
                   <label className="text-xs text-gray-500 uppercase">County</label>
                   <p className="font-medium">{initialData.county}</p>
                </div>
                 <div>
                   <label className="text-xs text-gray-500 uppercase">Business Type</label>
                   <p className="font-medium">{initialData.agsi_business_type}</p>
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

  const [locationChecking, setLocationChecking] = useState(false)
  const [coords, setCoords] = useState<{lat: number, lng: number} | null>(null)
  const [error, setError] = useState<string | null>(null)
  const router = useRouter()

  const { register, handleSubmit, setValue, watch, formState: { errors, isSubmitting } } = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: initialData || {} // Pre-fill if editing allowed later
  })
  
  // Watch value for controlled component
  const valueChain = watch('value_chain')

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
      console.log("Check-in location found:", latitude, longitude)
      setCoords({ lat: latitude, lng: longitude })
      
      if (!targetPolygon) {
        setIsWithinRange(true)
        setLocationChecking(false)
        return
      }

      try {
        const pt = point([longitude, latitude])
        const poly = polygon(targetPolygon.coordinates || targetPolygon)
        const isInside = booleanPointInPolygon(pt, poly)
        setIsWithinRange(isInside)
      } catch (e) {
        console.error("Geo check error", e)
        setIsWithinRange(true)
      }
      setLocationChecking(false)
    }

    const onLocationError = (err: GeolocationPositionError) => {
      console.warn("High accuracy check-in failed, retrying low accuracy...", err)
      
      // Retry with low accuracy, permissive timeout and cache
      navigator.geolocation.getCurrentPosition(
        onLocationSuccess,
        (err2) => {
          console.error("All location attempts failed", err2)
          setError(`Location Unavailable: ${err2.message}. Please ensure GPS/Location services are enabled.`)
          setLocationChecking(false)
        },
        { enableHighAccuracy: false, timeout: 15000, maximumAge: 300000 }
      )
    }

    // Try high accuracy first, but with a reasonable timeout
    navigator.geolocation.getCurrentPosition(
      onLocationSuccess,
      onLocationError,
      { enableHighAccuracy: true, timeout: 8000, maximumAge: 60000 }
    )
  }

  const onSubmit = async (data: FormValues) => {
    // ... existing submit logic ...
    const supabase = createClient()
    
    // In a real PWA, you'd save to IndexedDB here if offline
    // For now, simple direct submission
    
    const { error } = await supabase
      .from('visits')
      .update({
        status: 'completed',
        visit_details: data,
        check_in_location: coords ? `POINT(${coords.lng} ${coords.lat})` : null,
      })
      .eq('id', visitId)

    if (error) {
      alert('Failed to submit visit')
      return
    }

    router.push('/agent/routes')
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Check-in Required</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center space-y-4 py-4">
            <div className={`h-16 w-16 rounded-full flex items-center justify-center ${
              isWithinRange === true ? 'bg-green-100 text-green-600' : 
              isWithinRange === false ? 'bg-red-100 text-red-600' : 'bg-gray-100 text-gray-400'
            }`}>
              <MapPin className="h-8 w-8" />
            </div>
            
            <div className="text-center">
              {locationChecking ? (
                <p className="text-sm text-gray-500">Verifying location...</p>
              ) : isWithinRange === true ? (
                <p className="text-sm font-medium text-green-600 flex items-center gap-1">
                  <CheckCircle className="h-4 w-4" /> You are at the location
                </p>
              ) : isWithinRange === false ? (
                <p className="text-sm font-medium text-red-600 flex items-center gap-1">
                  <XCircle className="h-4 w-4" /> You are not within the designated area
                </p>
              ) : (
                <p className="text-sm text-gray-500">Please verify your location to start</p>
              )}
            </div>

            <Button 
              type="button" 
              variant="secondary" 
              onClick={checkLocation} 
              isLoading={locationChecking}
              className="w-full"
            >
              Verified Check-in
            </Button>
            
            {error && <p className="text-xs text-red-500">{error}</p>}
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

              <div className="z-50 relative">
                <label className="text-sm font-medium text-gray-700">Value Chain</label>
                <SearchableSelect 
                   options={KENYAN_VALUE_CHAINS}
                   value={valueChain} 
                   onChange={(val) => setValue('value_chain', val, { shouldValidate: true })}
                   placeholder="Search..."
                />
                {/* Hidden input to register with react-hook-form if needed, but setValue handles it */}
                <input type="hidden" {...register('value_chain')} />
                {errors.value_chain && <p className="text-xs text-red-500 mt-1">{errors.value_chain.message}</p>}
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">Active Farmers</label>
                <Input {...register('active_farmers', { valueAsNumber: true })} type="number" />
                {errors.active_farmers && <p className="text-xs text-red-500 mt-1">{errors.active_farmers.message}</p>}
              </div>

              <div>
                <label className="text-sm font-medium text-gray-700">County</label>
                <select 
                  {...register('county')}
                  className="flex h-12 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2"
                >
                  <option value="">Select County</option>
                  {COUNTIES.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
                {errors.county && <p className="text-xs text-red-500 mt-1">{errors.county.message}</p>}
              </div>

               <div>
                <label className="text-sm font-medium text-gray-700">Agri-business Type</label>
                <select 
                  {...register('agsi_business_type')}
                  className="flex h-12 w-full rounded-lg border border-gray-300 bg-white px-3 py-2 text-base focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-green-600 focus-visible:ring-offset-2"
                >
                  <option value="">Select Type</option>
                  {BUSINESS_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
                {errors.agsi_business_type && <p className="text-xs text-red-500 mt-1">{errors.agsi_business_type.message}</p>}
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
