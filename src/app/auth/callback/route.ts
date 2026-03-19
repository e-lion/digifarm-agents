import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'

export async function GET(request: Request) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') ?? '/'
  const origin = requestUrl.origin

  if (code) {
    const supabase = await createClient()
    try {
      const { error } = await supabase.auth.exchangeCodeForSession(code)
      
      if (!error) {
        const { data: { user } } = await supabase.auth.getUser()
        
        if (user?.email) {
          // 1. Fetch profile (Database trigger handles organizational linkage and role setup)
          const { data: profile } = await supabase
            .from('profiles')
            .select('last_organization_id, role')
            .eq('id', user.id)
            .single()

          const lastOrgId = profile?.last_organization_id
          
          // 2. Redirect based on role and onboarding status
          if (lastOrgId) {
             // If we have an org, go to dashboard or the 'next' param
             return NextResponse.redirect(`${origin}${next}`)
          } else {
             // No org found, user needs to create one
             return NextResponse.redirect(`${origin}/org-setup`)
          }
        }
      }
    } catch (err) {
      console.error('Fatal auth callback error:', err)
    }
  }

  return NextResponse.redirect(`${origin}/auth/login?error=AuthError`)
}
