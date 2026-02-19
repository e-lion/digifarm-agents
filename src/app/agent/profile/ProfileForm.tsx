'use client'

import { useActionState, useState } from 'react'
import { updateProfile } from './actions'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { MultiSelect } from '@/components/ui/MultiSelect'
import { kenyaCounties } from '@/lib/constants/counties'

import { User, Phone, Mail, Shield, Pencil, Save, X, MapPin } from 'lucide-react'

type ProfileData = {
  first_name: string | null
  last_name: string | null
  phone_number: string | null
  email: string
  role: string | null
  counties?: string[] | null
}

export default function ProfileForm({ profile, email }: { profile: ProfileData; email: string }) {
  const [isEditing, setIsEditing] = useState(false)
  const [selectedCounties, setSelectedCounties] = useState<string[]>(profile.counties || [])
  const [state, formAction, isPending] = useActionState(updateProfile, null)

  // Close edit mode on success (you might want a useEffect here to watch state.success)
  // For simplicity, we'll keep it manual or rely on key change if parent re-renders. 
  // But since we are using useActionState, the state updates. 
  
  if (state?.success && isEditing) {
      setIsEditing(false)
  }

  return (
    <>
      <div className="flex flex-col items-center justify-center py-6 relative">
         <div className="absolute top-0 right-0">
           {!isEditing && (
            <Button variant="outline" size="sm" onClick={() => setIsEditing(true)}>
              <Pencil className="h-4 w-4 mr-2" />
              Edit Profile
            </Button>
           )}
         </div>

        <div className="w-24 h-24 bg-green-100 rounded-full flex items-center justify-center mb-4">
          <User className="h-12 w-12 text-green-700" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900">
          {profile.first_name} {profile.last_name}
        </h2>
        <p className="text-gray-500">{email}</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Account Details</CardTitle>
        </CardHeader>
        <CardContent>
          {isEditing ? (
            <form action={formAction} className="space-y-4">
              {state?.error && (
                 <div className="p-3 bg-red-50 text-red-700 rounded-md text-sm">{state.error}</div>
              )}
               {state?.success && (
                 <div className="p-3 bg-green-50 text-green-700 rounded-md text-sm">{state.success}</div>
              )}

              <input type="hidden" name="counties" value={JSON.stringify(selectedCounties)} />

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label htmlFor="firstName" className="text-sm font-medium text-gray-700">First Name</label>
                  <input
                    id="firstName"
                    name="firstName"
                    defaultValue={profile.first_name || ''}
                    required
                    className="flex h-10 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
                <div className="space-y-2">
                  <label htmlFor="lastName" className="text-sm font-medium text-gray-700">Last Name</label>
                  <input
                    id="lastName"
                    name="lastName"
                    defaultValue={profile.last_name || ''}
                    required
                    className="flex h-10 w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                  />
                </div>
              </div>

              <div className="space-y-2">
                 <label htmlFor="phoneNumber" className="text-sm font-medium text-gray-700">Phone Number</label>
                 <div className="relative">
                    <Phone className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                    <input
                        id="phoneNumber"
                        name="phoneNumber"
                        defaultValue={profile.phone_number || ''}
                        required
                        className="flex h-10 w-full rounded-md border border-gray-300 pl-9 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500"
                    />
                 </div>
              </div>

              <div className="space-y-2">
                 <label className="text-sm font-medium text-gray-700">Operaring Counties</label>
                 <MultiSelect
                    options={kenyaCounties}
                    selected={selectedCounties}
                    onChange={setSelectedCounties}
                    placeholder="Select counties..."
                 />
                 <p className="text-xs text-gray-500">Select the counties where you operate.</p>
              </div>

              <div className="flex gap-3 pt-2">
                <Button type="submit" className="flex-1" disabled={isPending}>
                  <Save className="h-4 w-4 mr-2" />
                  {isPending ? 'Saving...' : 'Save Changes'}
                </Button>
                <Button type="button" variant="outline" className="flex-1" onClick={() => setIsEditing(false)}>
                  <X className="h-4 w-4 mr-2" />
                  Cancel
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-4">
               <div className="flex items-center gap-3">
                <Phone className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Phone Number</p>
                  <p className="text-sm text-gray-500">{profile.phone_number || 'Not set'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Mail className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Email Address</p>
                  <p className="text-sm text-gray-500">{email}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Shield className="h-5 w-5 text-gray-400" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Role</p>
                  <p className="text-sm text-gray-500 uppercase">{profile.role || 'Agent'}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-gray-400 mt-1" />
                <div>
                  <p className="text-sm font-medium text-gray-900">Operating Counties</p>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {profile.counties && profile.counties.length > 0 ? (
                        profile.counties.map(county => (
                            <span key={county} className="bg-gray-100 text-gray-600 px-2 py-0.5 rounded text-xs border border-gray-200">
                                {county}
                            </span>
                        ))
                    ) : (
                        <p className="text-sm text-gray-500 italic">No counties selected</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </>
  )
}
