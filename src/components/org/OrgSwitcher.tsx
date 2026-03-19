'use client'

import { useOrganization } from '@/components/providers/OrganizationProvider'
import { ChevronDown, Building2, Check, PlusCircle, LayoutDashboard } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import { cn } from '@/lib/utils'
import Link from 'next/link'

export function OrgSwitcher() {
  const { currentOrg, allOrgs, userRole, switchOrg, isPending } = useOrganization()
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  if (!currentOrg) return null

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={isPending}
        className={cn(
          "w-full flex items-center justify-between gap-3 px-4 py-3 rounded-xl transition-all duration-200 group",
          isOpen 
            ? "bg-green-50 border-green-200 ring-4 ring-green-100/50" 
            : "bg-white border-gray-100 hover:bg-gray-50 border",
          isPending && "opacity-50 cursor-not-allowed"
        )}
      >
        <div className="flex items-center gap-3 overflow-hidden">
          <div className="flex-shrink-0 w-8 h-8 rounded-lg bg-green-600 flex items-center justify-center text-white shadow-sm group-hover:scale-105 transition-transform">
            <Building2 className="w-4 h-4" />
          </div>
          <div className="flex flex-col items-start overflow-hidden">
            <span className="text-sm font-bold text-gray-900 truncate w-full">
              {currentOrg.name}
            </span>
            <span className="text-[10px] text-gray-500 uppercase tracking-wider font-semibold">
              Active Workspace
            </span>
          </div>
        </div>
        <ChevronDown className={cn(
          "w-4 h-4 text-gray-400 transition-transform duration-200",
          isOpen && "rotate-180"
        )} />
      </button>

      {isOpen && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl shadow-gray-200/50 border border-gray-100 py-2 z-50 animate-in fade-in zoom-in duration-200">
          <div className="px-3 py-2 mb-1">
            <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest px-2">
              Your Organizations
            </p>
          </div>
          
          <div className="max-h-[240px] overflow-y-auto px-2 space-y-1">
            {allOrgs.map((org) => {
              const isActive = org.id === currentOrg.id
              return (
                <button
                  key={org.id}
                  onClick={() => {
                    switchOrg(org.id)
                    setIsOpen(false)
                  }}
                  className={cn(
                    "w-full flex items-center justify-between gap-3 px-3 py-2.5 rounded-xl transition-colors",
                    isActive 
                      ? "bg-green-50 text-green-700 font-semibold" 
                      : "text-gray-600 hover:bg-gray-50"
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div className={cn(
                      "w-6 h-6 rounded flex items-center justify-center",
                      isActive ? "bg-green-600 text-white" : "bg-gray-100 text-gray-400"
                    )}>
                      <Building2 className="w-3.5 h-3.5" />
                    </div>
                    <span className="text-sm truncate max-w-[120px]">{org.name}</span>
                  </div>
                  {isActive && <Check className="w-4 h-4" />}
                </button>
              )
            })}
          </div>

          {userRole !== 'agent' && (
            <div className="border-t border-gray-50 mt-2 pt-2 px-2">
              <Link
                href="/org-setup"
                className="flex items-center gap-3 px-3 py-2.5 text-sm text-gray-600 hover:bg-gray-50 rounded-xl transition-colors"
                onClick={() => setIsOpen(false)}
              >
                <PlusCircle className="w-5 h-5 text-gray-400" />
                <span>Create New Org</span>
              </Link>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
