import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { LoginView } from '@/components/auth/LoginView'

export default async function Home({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (profile?.role === 'admin') {
      redirect('/admin/dashboard')
    } else {
      redirect('/agent/routes')
    }
  }

  const resolvedParams = await searchParams
  const error = typeof resolvedParams.error === 'string' ? resolvedParams.error : null

  return <LoginView error={error} />
}
