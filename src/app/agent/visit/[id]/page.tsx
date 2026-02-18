'use client'

import { VisitForm } from '@/components/forms/DynamicVisitForm'
import { notFound, useSearchParams } from 'next/navigation'
import { useEffect, useState, use } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getCachedPlannedVisit, getOfflineNewVisits } from '@/lib/offline-storage'
import { Loader2 } from 'lucide-react'

export default function VisitPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params)
  const searchParams = useSearchParams()
  const isDraft = searchParams.get('isDraft') === 'true'
  
  const [visit, setVisit] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    async function loadVisit() {
      try {
        setLoading(true)
        
        // 1. Check Offline Drafts (Priority if isDraft is true, or fallback)
        const drafts = await getOfflineNewVisits()
        const draft = drafts.find(d => d.id === id)
        if (draft) {
            setVisit(draft)
            setLoading(false)
            return
        }

        // 2. Try online fetch
        if (navigator.onLine) {
            const supabase = createClient()
            const { data, error: fetchError } = await supabase
                .from('visits')
                .select('*')
                .eq('id', id)
                .single()
            
            if (!fetchError && data) {
                setVisit(data)
                setLoading(false)
                return
            }
        }

        // 3. Fallback to cached planned visits
        const cached = await getCachedPlannedVisit(id)
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
  }, [id, isDraft])

  if (loading) {
    return (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-3">
             <Loader2 className="h-8 w-8 animate-spin text-green-600" />
             <p className="text-sm">Loading visit details...</p>
        </div>
    )
  }

  if (error || !visit) {
    return (
        <div className="text-center py-20 bg-white rounded-xl border-2 border-dashed border-gray-100 mx-4">
            <p className="text-red-500 font-medium">{error || "Visit details unavailable offline."}</p>
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
