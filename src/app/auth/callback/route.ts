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
          // 1. Check for any pending whitelists/invitations in profile_access
          const { data: accessEntries, error: accessError } = await supabase
            .from('profile_access')
            .select('organization_id, role')
            .eq('email', user.email)

          if (accessError) console.error('Error fetching profile_access:', accessError)

          // 2. Fetch or create profile
          const { data: existingProfile } = await supabase
            .from('profiles')
            .select('last_organization_id, role')
            .eq('id', user.id)
            .single()

          let lastOrgId = existingProfile?.last_organization_id
          let role = existingProfile?.role

          // 3. Link user to organizations if they were whitelisted
          if (accessEntries && accessEntries.length > 0) {
            for (const access of accessEntries) {
              await supabase.from('organization_members').upsert({
                organization_id: access.organization_id,
                user_id: user.id,
                role: access.role
              }, { onConflict: 'organization_id, user_id' })
              
              if (!lastOrgId) lastOrgId = access.organization_id
              // Use whitelisted role if available, prioritizing the first one
              if (!role) role = access.role
            }
          }

          // Default fallback for new users
          if (!role) role = 'agent'

          // 4. Sync profile with metadata and lastOrgId
          await supabase.from('profiles').upsert({
            id: user.id,
            email: user.email,
            last_organization_id: lastOrgId,
            full_name: user.user_metadata.full_name || user.user_metadata.name || 'User',
            role: role
          })
          
          // 5. Redirect based on role and onboarding status
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
