import { createClient } from '@/lib/supabase/server'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Plus } from 'lucide-react'
import AdminLayout from '@/components/layout/AdminLayout'
import { revalidatePath } from 'next/cache'

export default async function AgentsPage() {
  const supabase = await createClient()
  
  const { data: agents } = await supabase
    .from('profile_access')
    .select('*')
    .eq('role', 'agent')
    .order('created_at', { ascending: false })

  async function addAgent(formData: FormData) {
    'use server'
    const email = formData.get('email') as string
    if (!email) return

    const supabase = await createClient()
    const { error } = await supabase.from('profile_access').insert({ email, role: 'agent' })
    
    if (error) {
        console.error('Failed to add agent:', error)
        // In a real app, return extraction to show toast
    } else {
        revalidatePath('/admin/agents')
    }
  }

  return (
    <AdminLayout>
      <div className="mb-8 flex items-center justify-between">
        <div>
           <h2 className="text-2xl font-bold text-gray-900">Agent Management</h2>
           <p className="text-gray-500">Whitelist emails for agent access</p>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Add New Agent</CardTitle>
          </CardHeader>
          <CardContent>
            <form action={addAgent} className="flex gap-2">
              <Input name="email" type="email" placeholder="agent@example.com" required className="flex-1" />
              <Button type="submit">
                <Plus className="h-4 w-4 mr-2" />
                Add
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card>
             <CardHeader>
                <CardTitle>Whitelisted Agents</CardTitle>
             </CardHeader>
             <CardContent>
                <div className="space-y-2">
                    {agents?.map((agent) => (
                        <div key={agent.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg border border-gray-100">
                            <span className="text-sm font-medium">{agent.email}</span>
                            <span className="text-xs text-green-600 bg-green-100 px-2 py-1 rounded-full">Active</span>
                        </div>
                    ))}
                    {agents?.length === 0 && <p className="text-sm text-gray-500">No agents whitelisted yet.</p>}
                </div>
             </CardContent>
        </Card>
      </div>
    </AdminLayout>
  )
}
