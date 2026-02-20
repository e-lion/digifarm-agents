'use client'

import VisitForm from '@/components/forms/VisitForm'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getCachedPlannedVisit, getOfflineNewVisits } from '@/lib/offline-storage'
import { Loader2, XCircle } from 'lucide-react'
import { getContactDesignations } from '@/lib/actions/buyers'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { useRouter } from 'next/navigation'

export function VisitDetails({ id, isAdmin = false }: { id: string, isAdmin?: boolean }) {
  const router = useRouter()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [visit, setVisit] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [loadingStatus, setLoadingStatus] = useState("Loading...")
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [availableDrafts, setAvailableDrafts] = useState<any[]>([])
  const [designations, setDesignations] = useState<string[]>([])
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [contacts, setContacts] = useState<any[]>([])

  useEffect(() => {
    async function loadData() {
      if (!id) return 

      try {
        setLoading(true)
        
        setLoadingStatus("Checking local drafts...")
        
        // 1. Check Offline Drafts (Priority)
        const drafts = await getOfflineNewVisits()
        setAvailableDrafts(drafts)
        
        const cleanId = id?.trim()
        
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const draft = drafts.find((d: any) => d.id === cleanId) as any
            if (draft) {
                const mappedDraft = {
                    ...draft,
                    isLocal: true,
                    visit_details: draft.visit_details || {
                        contact_name: draft.contact_name,
                        phone: draft.contact_phone, // Note: CreateVisitForm uses contact_phone, VisitForm uses phone
                        contact_designation: draft.contact_designation,
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

        // 2. Online fetch (Consolidated)
        if (navigator.onLine) {
            setLoadingStatus("Fetching from server...")
            const supabase = createClient()
            
            // Fetch everything in parallel to eliminate the waterfall
            // 1. Fetch designations
            // 2. Fetch visit with buyer details and contacts in a single query
            const [designationsData, visitResponse] = await Promise.all([
                getContactDesignations(),
                supabase
                    .from('visits')
                    .select('*, buyers:buyer_id(*, buyer_contacts(*))')
                    .eq('id', cleanId)
                    .single()
            ])

            setDesignations(designationsData)

            const { data: visitData, error: visitError } = visitResponse
            
            if (!visitError && visitData) {
                // Extract relational data
                const buyerData = Array.isArray(visitData.buyers) ? visitData.buyers[0] : visitData.buyers
                if (buyerData) {
                    const buyerContacts = buyerData.buyer_contacts || []
                    setContacts(buyerContacts)
                    
                    // Attach buyer_id to visit object
                    visitData.buyer_id = buyerData.id

                    // If visit_details is empty/null (not completed), fetch buyer details to pre-fill
                    if (!visitData.visit_details || Object.keys(visitData.visit_details).length === 0) {
                        visitData.visit_details = {
                            contact_name: buyerData.contact_name,
                            phone: buyerData.phone
                        }
                    }
                }

                setVisit(visitData)
                setLoading(false)
                return
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

    loadData()
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

  // Calculate if visit is in the past and still planned
  const today = new Date()
  const offset = today.getTimezoneOffset()
  const localToday = new Date(today.getTime() - (offset*60*1000))
  const todayString = localToday.toISOString().split('T')[0]
  
  const isExpired = visit?.status === 'planned' && visit?.scheduled_date < todayString && !isAdmin

  if (isExpired) {
    return (
      <div className="space-y-6">
        <div className="mb-4">
            <h2 className="text-xl font-bold text-gray-900">Visit Expired</h2>
            <p className="text-sm text-gray-500">{visit.buyer_name}</p>
        </div>

        <Card className="bg-amber-50 border-amber-200">
           <CardContent className="pt-6 flex flex-col items-center text-center gap-4">
              <div className="h-16 w-16 bg-amber-100 rounded-full flex items-center justify-center">
                 <XCircle className="h-8 w-8 text-amber-600" />
              </div>
              <div className="space-y-2">
                <h3 className="text-lg font-bold text-amber-900">This visit has expired</h3>
                <p className="text-sm text-amber-700 max-w-xs">
                  This visit was scheduled for <strong>{new Date(visit.scheduled_date).toLocaleDateString()}</strong> and was not completed. Historical planned visits cannot be modified.
                </p>
              </div>
              <Button onClick={() => router.push('/agent/routes')} variant="outline" className="border-amber-300 text-amber-800 hover:bg-amber-100">
                Back to Routes
              </Button>
           </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <>
      <div className="mb-4 flex flex-row items-center justify-between">
        <div>
            <h2 className="text-xl font-bold text-gray-900">Visit Checklist</h2>
            <p className="text-sm text-gray-500">{visit.buyer_name}</p>
        </div>
        {visit.visit_category && (
            <span className={`px-3 py-1 rounded-full text-xs font-medium border ${
                visit.visit_category === 'First Time' 
                    ? 'bg-green-50 text-green-700 border-green-200' 
                    : 'bg-blue-50 text-blue-700 border-blue-200'
            }`}>
                {visit.visit_category}
            </span>
        )}
      </div>
      
      <VisitForm 
        visitId={visit.id} 
        buyerId={visit.buyer_id}
        buyerName={visit.buyer_name} 
        buyerType={visit.buyer_type}
        buyerLocation={visit.buyers?.location_lat ? { lat: visit.buyers.location_lat, lng: visit.buyers.location_lng } : null} 
        initialData={visit.visit_details}
        status={visit.status}
        checkInLocation={visit.check_in_location}
        isLocal={visit.isLocal}
        contactDesignations={designations}
        existingContacts={contacts}
        isAdmin={isAdmin}
      />
    </>
  )
}
