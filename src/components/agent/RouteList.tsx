'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useInfiniteQuery } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/Card'
import { cn } from '@/lib/utils'
import { Button } from '@/components/ui/Button'
import { MapPin, Calendar, CheckCircle, ArrowRight, Loader2, Filter, X } from 'lucide-react'
import Link from 'next/link'
import { Input } from '@/components/ui/Input'
import { getOfflineReports, getOfflineNewVisits, cachePlannedVisits } from '@/lib/offline-storage'
import { WifiOff, FileText } from 'lucide-react'

const PAGE_SIZE = 10

export function RouteList({ userId }: { userId: string }) {
  const [statusFilter, setStatusFilter] = useState<'all' | 'planned' | 'completed'>('all')
  const [dateFilter, setDateFilter] = useState('')
  const [offlineIds, setOfflineIds] = useState<string[]>([])
  const [offlineDrafts, setOfflineDrafts] = useState<any[]>([])
  const loadMoreRef = useRef<HTMLDivElement>(null)
  
  const supabase = createClient()

  const fetchVisits = async ({ pageParam = 0 }) => {
    let query = supabase
      .from('visits')
      .select('*')
      .eq('agent_id', userId)
      .order('status', { ascending: false })
      .order('scheduled_date', { ascending: false })
      .range(pageParam * PAGE_SIZE, (pageParam + 1) * PAGE_SIZE - 1)

    if (statusFilter !== 'all') {
      query = query.eq('status', statusFilter)
    }

    if (dateFilter) {
      query = query.eq('scheduled_date', dateFilter)
    }

    const { data, error } = await query
    if (error) throw error
    return data
  }

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    status,
    refetch
  } = useInfiniteQuery({
    queryKey: ['visits', userId, statusFilter, dateFilter],
    queryFn: fetchVisits,
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.length === PAGE_SIZE ? allPages.length : undefined
    },
  })

  const loadOfflineData = async () => {
    try {
      const reports = await getOfflineReports()
      setOfflineIds(reports.map(r => r.id))
      
      const drafts = await getOfflineNewVisits()
      setOfflineDrafts(drafts)
    } catch (e) {
      console.error("Failed to load offline data:", e)
    }
  }

  useEffect(() => {
    loadOfflineData()
    window.addEventListener('offline-storage-updated', loadOfflineData)
    return () => window.removeEventListener('offline-storage-updated', loadOfflineData)
  }, [])

  // Intersection Observer for Infinite Scroll
  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
          fetchNextPage()
        }
      },
      { threshold: 0.5 }
    )

    if (loadMoreRef.current) {
      observer.observe(loadMoreRef.current)
    }

    return () => observer.disconnect()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  // Cache planned visits when online
  useEffect(() => {
    if (navigator.onLine && data?.pages) {
      const allVisits = data.pages.flat()
      const planned = allVisits.filter(v => v.status === 'planned')
      if (planned.length > 0) {
        cachePlannedVisits(planned)
      }
    }
  }, [data])

  const remoteVisits = data?.pages.flat() || []
  
  // Merge drafts into the list
  // Note: Only show drafts if they match filters
  const filteredDrafts = offlineDrafts.filter(draft => {
      if (statusFilter !== 'all' && draft.status !== statusFilter) return false
      if (dateFilter && draft.scheduled_date.split('T')[0] !== dateFilter) return false
      return true
  })

  const visits = [...filteredDrafts, ...remoteVisits]

  return (
    <div className="space-y-6">
      {/* Filters Section */}
      <div className="sticky top-[53px] z-30 bg-gray-50/95 backdrop-blur-sm -mx-4 px-4 py-2 mb-4">
        <Card className="bg-white shadow-md border-gray-100">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
            <Filter className="h-4 w-4 text-green-600" />
            Filters
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-wider text-gray-400 font-bold ml-1">Status</label>
              <div className="relative group">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-hover:text-green-500 transition-colors pointer-events-none">
                  <CheckCircle className="h-4 w-4" />
                </div>
                <select 
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value as any)}
                  className="w-full h-11 pl-9 pr-8 rounded-xl border-2 border-gray-100 bg-gray-50/50 hover:border-green-200 hover:bg-white focus:border-green-600 focus:ring-4 focus:ring-green-600/10 transition-all duration-200 outline-none appearance-none text-sm font-medium"
                >
                  <option value="all">All States</option>
                  <option value="planned">Planned</option>
                  <option value="completed">Completed</option>
                </select>
                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none group-hover:text-green-600 transition-colors">
                  <ArrowRight className="h-3.5 w-3.5 rotate-90" />
                </div>
              </div>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-wider text-gray-400 font-bold ml-1">Date</label>
              <div className="relative group">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 group-hover:text-green-500 transition-colors pointer-events-none">
                  <Calendar className="h-4 w-4" />
                </div>
                <Input 
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  onClick={(e) => (e.target as any).showPicker?.()}
                  className="w-full h-11 pl-9 rounded-xl border-2 border-gray-100 bg-gray-50/50 hover:border-green-200 hover:bg-white focus:border-green-600 focus:ring-4 focus:ring-green-600/10 transition-all duration-200 cursor-pointer [appearance:none] [&::-webkit-calendar-picker-indicator]:hidden text-sm font-medium"
                />
                {dateFilter && (
                   <button 
                    onClick={() => setDateFilter('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-300 hover:text-red-500 rounded-full hover:bg-red-50 transition-colors"
                   >
                     <X className="h-3.5 w-3.5" />
                   </button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>

      {/* List Section */}
      <div className="space-y-6">
        {status === 'pending' ? (
          <div className="flex flex-col items-center justify-center py-20 text-gray-400 gap-3">
             <Loader2 className="h-8 w-8 animate-spin text-green-600" />
             <p className="text-sm">Loading your routes...</p>
          </div>
        ) : visits.length === 0 ? (
          <div className="text-center py-20 bg-white rounded-xl border-2 border-dashed border-gray-100">
            <MapPin className="h-12 w-12 mx-auto mb-4 text-gray-200" />
            <p className="text-gray-500 font-medium">No visits found matching filters.</p>
            <Button 
                variant="outline" 
                size="sm" 
                className="mt-4"
                onClick={() => { setStatusFilter('all'); setDateFilter(''); }}
            >
                Clear all filters
            </Button>
          </div>
        ) : (
          <>
            {visits.map((visit: any) => {
              const isOfflinePending = offlineIds.includes(visit.id)
              const isDraft = visit.isDraft
              return (
              <Link key={visit.id} href={`/agent/visit/${visit.id}${isDraft ? '?isDraft=true' : ''}`} className="block">
                <Card className={cn(
                    "overflow-hidden border-l-4 shadow-sm active:scale-[0.98] transition-all hover:shadow-md cursor-pointer",
                    isDraft ? "border-l-blue-400 bg-blue-50/10" :
                    isOfflinePending ? "border-l-orange-500" : "border-l-green-600"
                )}>
                  <CardContent className="p-4 flex items-center justify-between">
                    <div className="space-y-2">
                      <h3 className="font-bold text-gray-900 text-lg leading-tight">{visit.buyer_name}</h3>
                      <div className="flex flex-wrap items-center text-sm text-gray-500 gap-x-4 gap-y-1">
                        <span className="flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5 text-green-600" />
                          {new Date(visit.scheduled_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </span>
                        {offlineIds.includes(visit.id) ? (
                           <span className="px-2.5 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider bg-orange-100 text-orange-700 flex items-center gap-1">
                             <WifiOff className="h-3 w-3" /> Pending Sync
                           </span>
                        ) : (
                          <span className={`px-2.5 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider ${
                            isDraft ? 'bg-blue-100 text-blue-700' :
                            visit.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                          }`}>
                            {isDraft ? 'Offline Draft' : visit.status}
                          </span>
                        )}
                        {isDraft && (
                           <span className="flex items-center gap-1 text-[10px] text-blue-600 font-bold italic">
                             <FileText className="h-3 w-3" /> Will sync when online
                           </span>
                        )}
                      </div>
                    </div>
                    
                    <Button size="sm" variant="outline" className="h-10 w-10 p-0 rounded-full border-gray-200 group-hover:border-green-200 group-hover:bg-green-50">
                      <ArrowRight className="h-5 w-5 text-green-600" />
                    </Button>
                  </CardContent>
                </Card>
              </Link>
            )
          })}

            {/* Loading Indicator for scroll */}
            <div ref={loadMoreRef} className="py-8 flex justify-center">
              {isFetchingNextPage ? (
                <div className="flex items-center gap-2 text-gray-400 text-xs font-medium">
                   <Loader2 className="h-4 w-4 animate-spin" />
                   Loading more...
                </div>
              ) : hasNextPage ? (
                <div className="h-4" />
              ) : (
                <p className="text-xs text-gray-400 font-medium italic">End of routes</p>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
