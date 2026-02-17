import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { LoginView } from '@/components/auth/LoginView'

export default async function Home({ searchParams }: { searchParams: Promise<{ [key: string]: string | string[] | undefined }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (user) {
    redirect('/agent/routes')
  }

  const resolvedParams = await searchParams
  const error = typeof resolvedParams.error === 'string' ? resolvedParams.error : null

  return <LoginView error={error} />
}
