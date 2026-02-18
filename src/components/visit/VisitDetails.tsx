'use client'

import { VisitForm } from '@/components/forms/DynamicVisitForm'
import { useSearchParams } from 'next/navigation'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getCachedPlannedVisit, getOfflineNewVisits } from '@/lib/offline-storage'
import { Loader2 } from 'lucide-react'

export function VisitDetails({ id }: { id: string }) {
  const searchParams = useSearchParams()
  // const isDraft = searchParams.get('isDraft') === 'true' // Optional: if still needed for initial check
  
  const [visit, setVisit] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [loadingStatus, setLoadingStatus] = useState("Loading...")
  const [availableDrafts, setAvailableDrafts] = useState<any[]>([])

  useEffect(() => {
    async function loadVisit() {
      if (!id) return 

      try {
        setLoading(true)
        setLoadingStatus("Checking local drafts...")
        
        // 1. Check Offline Drafts (Priority)
        const drafts = await getOfflineNewVisits()
        setAvailableDrafts(drafts)
        
        const cleanId = id?.trim()
        console.log("Checking drafts for ID:", cleanId, "Found:", drafts.length)
        
        const draft = drafts.find(d => d.id === cleanId)
        if (draft) {
            console.log("Draft found:", draft)
            // Map flat draft fields to structural visit_details for the form
            // Ensure we handle both structure types if needed, but for now map flat to nested
            const mappedDraft = {
                ...draft,
                visit_details: draft.visit_details || {
                    contact_name: draft.contact_name,
                    phone: draft.phone,
                    active_farmers: draft.active_farmers,
                    is_potential_customer: draft.is_potential_customer,
                    trade_volume: draft.trade_volume,
                    buyer_feedback: draft.buyer_feedback,
                    agsi_business_type: draft.agsi_business_type
                }
            }
            setVisit(mappedDraft)
            setLoading(false)
            return
        }

        // 2. Try online fetch with timeout
        if (navigator.onLine) {
            setLoadingStatus("Fetching from server...")
            const supabase = createClient()
            
            // Create a timeout promise
            const timeoutPromise = new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Timeout')), 5000)
            )
            
            try {
                const fetchPromise = supabase
                    .from('visits')
                    .select('*')
                    .eq('id', cleanId)
                    .single()
                
                // Race against timeout
                const { data, error: fetchError } = await Promise.race([fetchPromise, timeoutPromise]) as any
                
                if (!fetchError && data) {
                    setVisit(data)
                    setLoading(false)
                    return
                }
            } catch (e) {
                console.warn("Server fetch timed out or failed, falling back to cache")
            }
        }

        // 3. Fallback to cached planned visits
        setLoadingStatus("Checking offline cache...")
        const cached = await getCachedPlannedVisit(cleanId)
        if (cached) {
            setVisit(cached)
        } else {
            setError("Visit not found offline")
        }
      } catch (e) {
        console.error("Failed to load visit:", e)
        setError("Error loading visit data")
      } finally {
        setLoading(false)
      }
    }

    loadVisit()
  }, [id])

  if (loading) {
    return (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-3">
             <Loader2 className="h-8 w-8 animate-spin text-green-600" />
             <p className="text-sm">{loadingStatus}</p>
        </div>
    )
  }

  if (error || !visit) {
    return (
        <div className="flex flex-col gap-4 p-4">
            <div className="text-center py-10 bg-white rounded-xl border-2 border-dashed border-gray-100">
                <p className="text-red-500 font-medium mb-2">{error || "Visit details unavailable."}</p>
                <p className="text-sm text-gray-500">ID: {id}</p>
            </div>
            
            {availableDrafts.length > 0 && (
                <div className="space-y-2">
                    <h3 className="text-sm font-medium text-gray-900">Available Offline Drafts</h3>
                    {availableDrafts.map((d) => (
                        <div 
                            key={d.id} 
                            onClick={() => window.location.href = `/agent/visit/details?id=${d.id}&isDraft=true`}
                            className="p-4 bg-white rounded-xl border border-gray-200 shadow-sm active:scale-95 transition-transform flex justify-between items-center"
                        >
                            <div>
                                <p className="font-bold text-gray-900">{d.buyer_name}</p>
                                <p className="text-xs text-gray-500">{new Date(d.timestamp || Date.now()).toLocaleTimeString()}</p>
                            </div>
                            <div className="px-2 py-1 bg-blue-100 text-blue-700 text-xs rounded-full">
                                Open
                            </div>
                        </div>
                    ))}
                </div>
            )}
            
            <button 
                onClick={() => window.location.reload()}
                className="w-full py-3 bg-gray-100 text-gray-700 font-medium rounded-xl"
            >
                Reload Page
            </button>
        </div>
    )
  }

  return (
    <>
      <div className="mb-4">
        <h2 className="text-xl font-bold text-gray-900">Visit Checklist</h2>
        <p className="text-sm text-gray-500">{visit.buyer_name}</p>
      </div>
      
      <VisitForm 
        visitId={visit.id} 
        buyerName={visit.buyer_name} 
        buyerType={visit.buyer_type}
        targetPolygon={visit.polygon_coords} 
        initialData={visit.visit_details}
        status={visit.status}
        checkInLocation={visit.check_in_location}
      />
    </>
  )
}
