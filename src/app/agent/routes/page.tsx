import { createClient } from '@/lib/supabase/server'
import AgentLayout from '@/components/layout/AgentLayout'
import { RouteList } from '@/components/agent/RouteList'
import { redirect } from 'next/navigation'

export default async function RoutesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/')
  }

  return (
    <AgentLayout>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-2xl font-bold text-gray-900">Your Routes</h2>
      </div>

      <RouteList userId={user.id} />
    </AgentLayout>
  )
}
