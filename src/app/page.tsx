import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { LoginView } from '@/components/auth/LoginView'

export default async function Home() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    redirect('/agent/routes')
  }

  return <LoginView />
}
