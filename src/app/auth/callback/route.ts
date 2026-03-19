import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') ?? '/agent/routes'
  const origin = requestUrl.origin

  if (code) {
    const supabase = await createClient()
    try {
      const { error } = await supabase.auth.exchangeCodeForSession(code)
      
      if (!error) {
        const { data: { user } } = await supabase.auth.getUser()
        
        if (user?.email) {
          const { data: access } = await supabase
            .from('profile_access')
            .select('role') // Removed 'status' as it might not exist yet
            .eq('email', user.email)
            .maybeSingle()

          if (!access) {
            await supabase.auth.signOut()
            return NextResponse.redirect(`${origin}/auth/login?error=UnauthorizedAccess`)
          }

          // Sync profile
          await supabase.from('profiles').upsert({
            id: user.id,
            email: user.email,
            role: access.role,
            full_name: user.user_metadata.full_name,
          })
          
          if (access.role === 'admin') {
            return NextResponse.redirect(`${origin}/admin/dashboard`)
          }
        }
        
        return NextResponse.redirect(`${origin}${next}`)
      }
    } catch (err) {
      console.error('Auth callback error:', err)
    }
  }

  return NextResponse.redirect(`${origin}/auth/login?error=AuthError`)
}
