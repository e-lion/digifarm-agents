'use server'

import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function submitOnboarding(prevState: any, formData: FormData) {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/')
  }

  const firstName = formData.get('firstName') as string
  const lastName = formData.get('lastName') as string
  const phoneNumber = formData.get('phoneNumber') as string

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
    })
    .eq('id', user.id)

  if (error) {
    return { error: 'Failed to update profile' }
  }

  revalidatePath('/', 'layout')
  redirect('/agent/routes')
}
