import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { MapPin, Calendar, CheckCircle, ArrowRight } from 'lucide-react'
import Link from 'next/link'
import AgentLayout from '@/components/layout/AgentLayout'

export default async function RoutesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: visits } = await supabase
    .from('visits')
    .select('*')
    .eq('agent_id', user?.id)
    .order('scheduled_date', { ascending: true })

  return (
    <AgentLayout>
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-bold text-gray-900">Your Route</h2>
        <span className="text-sm font-medium text-gray-500">{new Date().toLocaleDateString()}</span>
      </div>

      <div className="space-y-4">
        {visits?.length === 0 ? (
          <div className="text-center py-12 text-gray-500">
            <MapPin className="h-12 w-12 mx-auto mb-4 text-gray-300" />
            <p>No visits scheduled for today.</p>
          </div>
        ) : (
          visits?.map((visit: any) => (
            <Card key={visit.id} className="overflow-hidden border-l-4 border-l-green-600">
              <CardContent className="p-4 flex items-center justify-between">
                <div className="space-y-1">
                  <h3 className="font-semibold text-gray-900">{visit.buyer_name}</h3>
                  <div className="flex items-center text-sm text-gray-500 gap-4">
                    <span className="flex items-center gap-1">
                      <Calendar className="h-4 w-4" />
                      {new Date(visit.scheduled_date).toLocaleDateString()}
                    </span>
                    <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                      visit.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                    }`}>
                      {visit.status}
                    </span>
                  </div>
                </div>
                
                <Link href={`/agent/visit/${visit.id}`}>
                  <Button size="sm" variant="outline" className="h-10 w-10 p-0 rounded-full">
                    <ArrowRight className="h-5 w-5" />
                  </Button>
                </Link>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </AgentLayout>
  )
}
