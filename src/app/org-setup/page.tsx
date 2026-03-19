'use client'

import { createOrganization } from '@/lib/actions/organizations'
import { Loader2, Building2, Plus, ArrowRight } from 'lucide-react'
import { useState } from 'react'

export default function OrgSetupPage() {
  const [loading, setLoading] = useState(false)
  const [name, setName] = useState('')
  const [slug, setSlug] = useState('')

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const formData = new FormData()
      formData.append('name', name)
      formData.append('slug', slug)
      await createOrganization(formData)
    } catch (error) {
       console.error(error)
       alert('Failed to create organization. Please try a different slug.')
       setLoading(false)
    }
  }

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    setName(val)
    // Auto-slugify
    setSlug(val.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''))
  }

  return (
    <div className="min-h-screen bg-linear-to-br from-green-50 to-white flex items-center justify-center p-6">
      <div className="max-w-md w-full">
        <div className="text-center mb-10 space-y-2">
          <div className="bg-green-600 h-16 w-16 rounded-2xl flex items-center justify-center mx-auto shadow-lg shadow-green-200 mb-6">
            <Building2 className="text-white h-8 w-8" />
          </div>
          <h1 className="text-4xl font-extrabold text-gray-900 tracking-tight">Setup your workspace</h1>
          <p className="text-lg text-gray-600">Create your organization to start managing agents and routes.</p>
        </div>

        <div className="bg-white p-8 rounded-3xl shadow-xl shadow-gray-100 border border-gray-100 backdrop-blur-sm bg-white/80">
          <form onSubmit={handleCreate} className="space-y-6">
            <div className="space-y-2">
              <label htmlFor="name" className="text-sm font-semibold text-gray-700 ml-1">
                Organization Name
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                value={name}
                onChange={handleNameChange}
                placeholder="e.g. Acme Farms"
                className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-4 focus:ring-green-100 focus:border-green-600 outline-none transition-all placeholder:text-gray-400"
              />
            </div>

            <div className="space-y-2">
              <label htmlFor="slug" className="text-sm font-semibold text-gray-700 ml-1 flex justify-between">
                <span>Workspace URL</span>
                <span className="text-xs text-gray-400 font-normal">Must be unique</span>
              </label>
              <div className="relative group">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 font-medium">/</span>
                <input
                  id="slug"
                  name="slug"
                  type="text"
                  required
                  value={slug}
                  onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, ''))}
                  className="w-full pl-8 pr-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:ring-4 focus:ring-green-100 focus:border-green-600 outline-none transition-all placeholder:text-gray-400"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !name || !slug}
              className="w-full relative group bg-green-600 hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold py-4 px-6 rounded-2xl shadow-lg shadow-green-100 transition-all hover:-translate-y-0.5"
            >
              <div className="flex items-center justify-center gap-2">
                {loading ? (
                  <Loader2 className="h-5 w-5 animate-spin" />
                ) : (
                  <>
                    <Plus className="h-5 w-5" />
                    <span>Create Organization</span>
                    <ArrowRight className="h-4 w-4 opacity-0 -translate-x-2 group-hover:opacity-100 group-hover:translate-x-0 transition-all ml-1" />
                  </>
                )}
              </div>
            </button>
          </form>

          <div className="mt-8 pt-8 border-t border-gray-50 text-center">
             <p className="text-sm text-gray-500 italic">
               You can always create more organizations or invite team members later.
             </p>
          </div>
        </div>
      </div>
    </div>
  )
}
