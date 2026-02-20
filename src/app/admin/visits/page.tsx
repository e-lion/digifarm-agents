import { createClient } from '@/lib/supabase/server'
import AdminLayout from '@/components/layout/AdminLayout'
import { VisitsView } from './VisitsView'

export default async function AdminVisitsPage({
  searchParams,
}: {
  searchParams: Promise<{ 
    page?: string; 
    query?: string; 
    status?: string;
    agentId?: string;
    category?: string;
    startDate?: string;
    endDate?: string;
  }>
}) {
  const { 
    page = '1', 
    query = '', 
    status = 'all',
    agentId = 'all',
    category = 'all',
    startDate = '',
    endDate = ''
  } = await searchParams
  const supabase = await createClient()

  const pageSize = 10
  const currentPage = parseInt(page)
  const from = (currentPage - 1) * pageSize
  const to = from + pageSize - 1

  // Fetch unique agents for filtering
  const { data: agentsData } = await supabase
    .from('profiles')
    .select('id, full_name')
    .in('id', (
      await supabase.from('visits').select('agent_id')
    ).data?.map(v => v.agent_id) || [])
    .order('full_name')

  let supabaseQuery = supabase
    .from('visits')
    .select(`
      *,
      agent:profiles!visits_agent_id_fkey (
        full_name,
        email
      )
    `, { count: 'exact' })

  // Apply filters
  if (status !== 'all') {
    supabaseQuery = supabaseQuery.eq('status', status)
  }

  if (agentId !== 'all') {
    supabaseQuery = supabaseQuery.eq('agent_id', agentId)
  }

  if (category !== 'all') {
    supabaseQuery = supabaseQuery.eq('visit_category', category)
  }

  if (startDate) {
    supabaseQuery = supabaseQuery.gte('scheduled_date', startDate)
  }

  if (endDate) {
    // Add time to cover the full day
    supabaseQuery = supabaseQuery.lte('scheduled_date', `${endDate}T23:59:59Z`)
  }

  if (query) {
    supabaseQuery = supabaseQuery.ilike('buyer_name', `%${query}%`)
  }

  const { data: visitsData, count, error } = await supabaseQuery
    .order('scheduled_date', { ascending: false })
    .range(from, to)

  if (error) {
    console.error('Error fetching visits:', error)
  }

  const visits = (visitsData || []).map(v => {
    const agent = v.agent as unknown as { full_name: string | null, email: string } | null
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const details = v.visit_details as any
    return {
      ...v,
      agent_name: agent?.full_name || 'Unknown Agent',
      agent_email: agent?.email || 'Unknown Email',
      actual_date: v.checked_in_at,
      feedback: details?.buyer_feedback || null,
      active_farmers: details?.active_farmers || 0
    }
  })

  // Distinct categories (manual for now as it's a short list, or could be dynamic)
  const categories = ['Repeat', 'First Time']

  return (
    <AdminLayout>
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Visits Management</h1>
        <p className="text-gray-500">View and analyze all agent activities</p>
      </div>

      <VisitsView 
        initialVisits={visits} 
        totalCount={count || 0}
        currentPage={currentPage}
        currentQuery={query}
        currentStatus={status}
        currentAgentId={agentId}
        currentCategory={category}
        currentStartDate={startDate}
        currentEndDate={endDate}
        agents={agentsData || []}
        categories={categories}
      />
    </AdminLayout>
  )
}
