import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const { searchParams, origin: requestOrigin } = new URL(request.url)
  const origin = process.env.NEXT_PUBLIC_SITE_URL || requestOrigin
  const code = searchParams.get('code')
  const next = searchParams.get('next') ?? '/agent/routes'

  if (code) {
    const supabase = await createClient()
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    
    if (!error) {
      // Admin Gate Check
      const { data: { user } } = await supabase.auth.getUser()
      if (user?.email) {
        const { data: access } = await supabase
          .from('profile_access')
          .select('role')
          .eq('email', user.email) // Note: In production you might want .ilike() but verify DB collation
          .maybeSingle()

        if (!access) {
          // Identify is not allowed
          await supabase.auth.signOut()
          return NextResponse.redirect(`${origin}/auth/login?error=UnauthorizedAccess`)
        }

        // Sync profile if needed (idempotent upsert)
         await supabase.from('profiles').upsert({
             id: user.id,
             email: user.email,
             role: access.role,
             full_name: user.user_metadata.full_name,
         })
         
         // Redirect based on role
         if (access.role === 'admin') {
             return NextResponse.redirect(`${origin}/admin/dashboard`)
         }
      }
      
      return NextResponse.redirect(`${origin}${next}`)
    }
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/auth/login?error=AuthError`)
}
