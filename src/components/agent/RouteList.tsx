'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useInfiniteQuery } from '@tanstack/react-query'
import { Card, CardContent } from '@/components/ui/Card'
import { Button } from '@/components/ui/Button'
import { MapPin, Calendar, CheckCircle, ArrowRight, Loader2, Filter, X } from 'lucide-react'
import Link from 'next/link'
import { Input } from '@/components/ui/Input'

const PAGE_SIZE = 10

export function RouteList({ userId }: { userId: string }) {
  const [statusFilter, setStatusFilter] = useState<'all' | 'planned' | 'completed'>('all')
  const [dateFilter, setDateFilter] = useState('')
  const loadMoreRef = useRef<HTMLDivElement>(null)
  
  const supabase = createClient()

  const fetchVisits = async ({ pageParam = 0 }) => {
    let query = supabase
      .from('visits')
      .select('*')
      .eq('agent_id', userId)
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

  const visits = data?.pages.flat() || []

  return (
    <div className="space-y-6">
      {/* Filters Section */}
      <Card className="bg-white sticky top-16 z-30 shadow-sm border-gray-100">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-2 text-sm font-medium text-gray-700 mb-1">
            <Filter className="h-4 w-4 text-green-600" />
            Filters
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-wider text-gray-400 font-bold ml-1">Status</label>
              <select 
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as any)}
                className="w-full h-10 px-3 rounded-lg border border-gray-200 text-sm focus:ring-2 focus:ring-green-500 focus:border-green-500 outline-none bg-gray-50"
              >
                <option value="all">All States</option>
                <option value="planned">Planned</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <div className="space-y-1">
              <label className="text-[10px] uppercase tracking-wider text-gray-400 font-bold ml-1">Date</label>
              <div className="relative">
                <Input 
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="w-full h-10 bg-gray-50 border-gray-200"
                />
                {dateFilter && (
                   <button 
                    onClick={() => setDateFilter('')}
                    className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-gray-400 hover:text-gray-600"
                   >
                     <X className="h-3 w-3" />
                   </button>
                )}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* List Section */}
      <div className="space-y-4">
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
            {visits.map((visit: any) => (
              <Card key={visit.id} className="overflow-hidden border-l-4 border-l-green-600 shadow-sm active:scale-[0.98] transition-transform">
                <CardContent className="p-4 flex items-center justify-between">
                  <div className="space-y-2">
                    <h3 className="font-bold text-gray-900 text-lg leading-tight">{visit.buyer_name}</h3>
                    <div className="flex flex-wrap items-center text-sm text-gray-500 gap-x-4 gap-y-1">
                      <span className="flex items-center gap-1.5">
                        <Calendar className="h-3.5 w-3.5 text-green-600" />
                        {new Date(visit.scheduled_date).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider ${
                        visit.status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                      }`}>
                        {visit.status}
                      </span>
                    </div>
                  </div>
                  
                  <Link href={`/agent/visit/${visit.id}`}>
                    <Button size="sm" variant="outline" className="h-10 w-10 p-0 rounded-full border-gray-200">
                      <ArrowRight className="h-5 w-5 text-green-600" />
                    </Button>
                  </Link>
                </CardContent>
              </Card>
            ))}

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
