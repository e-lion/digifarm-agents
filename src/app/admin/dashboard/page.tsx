import { createClient } from '@/lib/supabase/server'
import AdminLayout from '@/components/layout/AdminLayout'
import DashboardClient from './DashboardClient'

export default async function AdminDashboard() {
  const supabase = await createClient()
  
  // Default date range: beginning of current week (Sunday) to end of current week (Saturday)
  const now = new Date()
  const dayOfWeek = now.getDay()
  const beginningOfWeek = new Date(now)
  beginningOfWeek.setDate(now.getDate() - dayOfWeek)
  const defaultStartDate = beginningOfWeek.toISOString().split('T')[0]

  const endOfWeek = new Date(beginningOfWeek)
  endOfWeek.setDate(beginningOfWeek.getDate() + 6)
  const defaultEndDate = endOfWeek.toISOString().split('T')[0]
  
  // Fetch stats and agents
  const { data: agents } = await supabase.from('profiles').select('id, full_name').eq('role', 'agent')
  
  // Fetch all visits with related buyer and profile info
  const { data: visits } = await supabase
    .from('visits')
    .select('id, buyer_name, status, scheduled_date, agent_id, check_in_location, profiles(full_name), buyers(location_lat, location_lng)')

  return (
    <AdminLayout>
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900">Dashboard Overview</h2>
        <p className="text-gray-500">Welcome back, Admin.</p>
      </div>

      <DashboardClient 
         agents={agents || []}
         initialVisits={visits || []}
         initialStartDate={defaultStartDate}
         initialEndDate={defaultEndDate}
         totalAgentCount={agents?.length || 0}
      />
    </AdminLayout>
  )
}
