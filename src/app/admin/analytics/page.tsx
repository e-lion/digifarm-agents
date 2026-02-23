import { createClient } from '@/lib/supabase/server'
import AdminLayout from '@/components/layout/AdminLayout'
import { AnalyticsView } from './AnalyticsView'

export default async function AnalyticsPage({
  searchParams,
}: {
  searchParams: Promise<{ startDate?: string; endDate?: string }>;
}) {
  const supabase = await createClient()
  const params = await searchParams
  
  // Default date range: beginning of current week (Sunday) to end of current week (Saturday)
  const now = new Date()
  
  const dayOfWeek = now.getDay()
  
  const beginningOfWeek = new Date(now)
  beginningOfWeek.setDate(now.getDate() - dayOfWeek)
  const defaultStartDate = beginningOfWeek.toISOString().split('T')[0]

  const endOfWeek = new Date(beginningOfWeek)
  endOfWeek.setDate(beginningOfWeek.getDate() + 6)
  const defaultEndDate = endOfWeek.toISOString().split('T')[0]

  const startDate = params.startDate || defaultStartDate
  const endDate = params.endDate || defaultEndDate

  // Get current user to exclude self
  const { data: { user } } = await supabase.auth.getUser()

  // Fetch all agents (excluding current admin)
  const { data: allProfilesData } = await supabase
    .from('profiles')
    .select('id, full_name, email, role')
    .neq('id', user?.id)
    .neq('role', 'admin') // Only get agents
    .order('full_name', { ascending: true })

  const agents = allProfilesData || []

  // Fetch visits for the selected date range
  const { data: visitsData } = await supabase
    .from('visits')
    .select('*, buyers(location_lat, location_lng)')
    .gte('scheduled_date', startDate)
    .lte('scheduled_date', endDate)

  const visits = visitsData || []

  return (
    <AdminLayout>
      <div className="mb-0">
         <h2 className="text-2xl font-bold text-gray-900">Area Manager Dashboard</h2>
         <p className="text-gray-500">Comprehensive view of agent performance, visit reasons, and routes.</p>
      </div>

      <AnalyticsView 
        agents={agents} 
        visits={visits}
        startDate={startDate}
        endDate={endDate}
      />
    </AdminLayout>
  )
}
