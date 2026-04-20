import { createClient } from '@/lib/supabase/server'
import AdminLayout from '@/components/layout/AdminLayout'
import { VisitsView } from './VisitsView'
import { requireOrganization } from '@/lib/actions/organizations'

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
  
  const { organizationId } = await requireOrganization()

  const pageSize = 10
  const currentPage = parseInt(page)
  const from = (currentPage - 1) * pageSize
  const to = from + pageSize - 1

  // Fetch unique agents for this organization via organization_members
  const { data: memberData } = await supabase
    .from('organization_members')
    .select('user_id')
    .eq('organization_id', organizationId)

  const userIds = (memberData || []).map(m => m.user_id)

  const { data: profilesData } = await supabase
    .from('profiles')
    .select('id, full_name')
    .in('id', userIds)
    .order('full_name')

  const agents = (profilesData || []).map(p => ({
    id: p.id,
    full_name: p.full_name || 'Unnamed Agent'
  }))

  let supabaseQuery = supabase
    .from('visits')
    .select(`
      *,
      agent:profiles!visits_agent_id_fkey (
        full_name,
        email
      ),
      buyer:buyers (
        value_chains,
        county,
        location_lat,
        location_lng
      )
    `, { count: 'exact' })
    .eq('organization_id', organizationId)

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
    const buyer = (v as any).buyer as any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const details = v.visit_details as any
    return {
      ...v,
      agent_name: agent?.full_name || 'Unknown Agent',
      agent_email: agent?.email || 'Unknown Email',
      actual_date: v.checked_in_at,
      feedback: details?.buyer_feedback || null,
      active_farmers: details?.active_farmers || 0,
      
      // New fields for export (and potentially table display)
      value_chains: buyer?.value_chains || [],
      county: buyer?.county || 'N/A',
      location: buyer?.location_lat ? `${buyer.location_lat}, ${buyer.location_lng}` : 'N/A',
      contact_name: details?.contact_name || 'N/A',
      contact_phone: details?.phone || 'N/A',
      contact_designation: details?.contact_designation || 'N/A'
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
        agents={agents}
        categories={categories}
      />
    </AdminLayout>
  )
}
