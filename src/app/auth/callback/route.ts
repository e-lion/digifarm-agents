import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') ?? '/agent/routes'
  const origin = requestUrl.origin

  if (code) {
    const supabase = await createClient()
    console.log(`Processing auth callback for code: ${code.substring(0, 8)}...`)
    try {
      const { error } = await supabase.auth.exchangeCodeForSession(code)
      
      if (!error) {
        console.log('Session exchanged successfully')
        const { data: { user } } = await supabase.auth.getUser()
        
        if (user?.email) {
          console.log(`Authenticated user: ${user.email}`)
          const { data: access, error: accessError } = await supabase
            .from('profile_access')
            .select('role')
            .eq('email', user.email)
            .maybeSingle()

          if (accessError) console.error('Error fetching profile_access:', accessError)

          if (!access) {
            console.warn(`User ${user.email} not found in profile_access`)
            await supabase.auth.signOut()
            return NextResponse.redirect(`${origin}/auth/login?error=UnauthorizedAccess`)
          }

          // Sync profile
          const { error: upsertError } = await supabase.from('profiles').upsert({
            id: user.id,
            email: user.email,
            role: access.role,
            full_name: user.user_metadata.full_name,
          })
          
          if (upsertError) console.error('Error upserting profile:', upsertError)
          
          if (access.role === 'admin') {
            return NextResponse.redirect(`${origin}/admin/dashboard`)
          }
        }
        
        return NextResponse.redirect(`${origin}${next}`)
      } else {
        console.error('Supabase auth error:', error)
      }
    } catch (err) {
      console.error('Fatal auth callback error:', err)
    }
  } else {
    console.warn('No code provided in auth callback')
  }

  return NextResponse.redirect(`${origin}/auth/login?error=AuthError`)
}
