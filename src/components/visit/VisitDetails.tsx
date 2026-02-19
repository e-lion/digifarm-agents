import VisitForm from '@/components/forms/VisitForm'
import { useEffect, useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getCachedPlannedVisit, getOfflineNewVisits } from '@/lib/offline-storage'
import { Loader2 } from 'lucide-react'
import { getContactDesignations, getBuyerContacts } from '@/lib/actions/buyers'

export function VisitDetails({ id }: { id: string }) {

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
        
        // Load designations
        if (navigator.onLine) {
            const dests = await getContactDesignations()
            setDesignations(dests)
        }

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

        // 2. Try online fetch
        if (navigator.onLine) {
            setLoadingStatus("Fetching from server...")
            const supabase = createClient()
            
            // Fetch visit
            const { data: visitData, error: visitError } = await supabase
                .from('visits')
                .select('*')
                .eq('id', cleanId)
                .single()
            
            if (!visitError && visitData) {
                // Fetch buyer details to get ID and potential pre-fill data
                const { data: buyerData } = await supabase
                    .from('buyers')
                    .select('id, contact_name, phone')
                    .eq('name', visitData.buyer_name)
                    .single()

                if (buyerData) {
                    // Fetch all existing contacts for this buyer
                    const buyerContacts = await getBuyerContacts(buyerData.id)
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
        targetPolygon={visit.polygon_coords} 
        initialData={visit.visit_details}
        status={visit.status}
        checkInLocation={visit.check_in_location}
        isLocal={visit.isLocal}
        contactDesignations={designations}
        existingContacts={contacts}
      />
    </>
  )
}
