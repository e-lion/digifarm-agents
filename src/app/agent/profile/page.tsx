import { createClient } from '@/lib/supabase/server'
import AgentLayout from '@/components/layout/AgentLayout'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { User, Mail, Shield, LogOut } from 'lucide-react'
import { redirect } from 'next/navigation'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  const handleSignOut = async () => {
    'use server'
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/auth/login')
  }

  return (
    <AgentLayout>
      <div className="space-y-6">
        <div className="flex flex-col items-center justify-center py-6">
          <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-4">
            <User className="h-12 w-12 text-green-700" />
          </div>
          <h2 className="text-2xl font-bold text-gray-900">{profile?.full_name || 'Agent Name'}</h2>
          <p className="text-gray-500">{user.email}</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Account Details</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-900">Email Address</p>
                <p className="text-sm text-gray-500">{user.email}</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Shield className="h-5 w-5 text-gray-400" />
              <div>
                <p className="text-sm font-medium text-gray-900">Role</p>
                <p className="text-sm text-gray-500 uppercase">{profile?.role || 'Agent'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <form action={handleSignOut}>
          <Button 
            variant="danger" 
            className="w-full flex items-center justify-center gap-2 h-12"
            type="submit"
          >
            <LogOut className="h-5 w-5" />
            Sign Out
          </Button>
        </form>

        <div className="text-center pt-8">
          <p className="text-xs text-gray-400">AgriTech Agent PWA v1.0.0</p>
        </div>
      </div>
    </AgentLayout>
  )
}
