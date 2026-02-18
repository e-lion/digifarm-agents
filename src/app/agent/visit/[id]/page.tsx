import { createClient } from '@/lib/supabase/server'
import { VisitForm } from '@/components/forms/DynamicVisitForm'
import AgentLayout from '@/components/layout/AgentLayout'
import { notFound } from 'next/navigation'

export default async function VisitPage({ params }: { params: Promise<{ id: string }> }) {
  const supabase = await createClient()
  const { id } = await params
  
  const { data: visit, error } = await supabase
    .from('visits')
    .select('*')
    .eq('id', id)
    .single()

  if (error || !visit) {
    notFound()
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
