import { cache } from 'react'
import { createClient } from '@/lib/supabase/server'

/**
 * Highly optimized profile fetcher that uses React.cache to ensure
 * the profile is only fetched once per request lifecycle.
 */
export const getProfile = cache(async () => {
  const supabase = await createClient()
  
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { user: null, profile: null }
  }

  const { data: profile, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .single()

  if (error) {
    console.error('Error fetching cached profile:', error)
    return { user, profile: null }
  }

  return { user, profile }
})
