import { createClient } from '@/lib/supabase/server'

import { Button } from '@/components/ui/Button'
import { LogOut } from 'lucide-react'
import { redirect } from 'next/navigation'

import ProfileForm from './ProfileForm'

export default async function ProfilePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    redirect('/auth/login')
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('first_name, last_name, phone_number, role, counties')
    .eq('id', user.id)
    .single()

  if (!profile) {
    redirect('/onboarding')
  }

  const handleSignOut = async () => {
    'use server'
    const supabase = await createClient()
    await supabase.auth.signOut()
    redirect('/auth/login')
  }

  return (
    <div className="space-y-6">
      {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
      <ProfileForm profile={profile as any} email={user.email!} />

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
        <p className="text-xs text-gray-400">DigiFarm Agent PWA v1.0.0</p>
      </div>
    </div>
  )
}
