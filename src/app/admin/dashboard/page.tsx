import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Users, MapPin, CheckCircle, Clock } from 'lucide-react'
import AdminLayout from '@/components/layout/AdminLayout'

export default async function AdminDashboard() {
  const supabase = await createClient()
  
  // Fetch stats (mocking or real queries)
  const { count: agentCount } = await supabase.from('profiles').select('*', { count: 'exact', head: true }).eq('role', 'agent')
  const { count: visitCount } = await supabase.from('visits').select('*', { count: 'exact', head: true })
  const { count: completedCount } = await supabase.from('visits').select('*', { count: 'exact', head: true }).eq('status', 'completed')

  return (
    <AdminLayout>
      <div className="mb-8">
        <h2 className="text-3xl font-bold text-gray-900">Dashboard Overview</h2>
        <p className="text-gray-500">Welcome back, Admin.</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Agents</CardTitle>
            <Users className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{agentCount || 0}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total Visits</CardTitle>
            <MapPin className="h-4 w-4 text-gray-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{visitCount || 0}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Completed</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{completedCount || 0}</div>
          </CardContent>
        </Card>
        
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Pending</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">{(visitCount || 0) - (completedCount || 0)}</div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activity Table could go here */}
    </AdminLayout>
  )
}
