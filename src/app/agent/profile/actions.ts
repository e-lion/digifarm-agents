'use server'

import { createClient } from '@/lib/supabase/server'
import { revalidatePath } from 'next/cache'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function updateProfile(prevState: any, formData: FormData) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    return { error: 'Unauthorized' }
  }

  const firstName = formData.get('firstName') as string
  const lastName = formData.get('lastName') as string
  const phoneNumber = formData.get('phoneNumber') as string
  const countiesRaw = formData.get('counties') as string
  
  let counties: string[] = []
  if (countiesRaw) {
      try {
          counties = JSON.parse(countiesRaw)
      } catch (e) {
          console.error("Failed to parse counties", e)
      }
  }

  if (!firstName || !lastName || !phoneNumber) {
    return { error: 'All fields are required' }
  }

  const { error } = await supabase
    .from('profiles')
    .update({
      first_name: firstName,
      last_name: lastName,
      phone_number: phoneNumber,
      full_name: `${firstName} ${lastName}`,
      counties: counties
    })
    .eq('id', user.id)

  if (error) {
    return { error: 'Failed to update profile' }
  }

  revalidatePath('/agent/profile')
  return { success: 'Profile updated successfully' }
}
