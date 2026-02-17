import { createClient } from '@/lib/supabase/server'
import { PolygonEditor } from '@/components/map/DynamicPolygonEditor'
import CreateVisitForm from './CreateVisitForm'
import AgentLayout from '@/components/layout/AgentLayout'

export default async function NewVisitPage() {
  return (
    <AgentLayout>
      <div className="mb-4">
        <h2 className="text-xl font-bold text-gray-900">Plan New Visit</h2>
        <p className="text-sm text-gray-500">Define the buyer and location</p>
      </div>
      <CreateVisitForm />
    </AgentLayout>
  )
}
