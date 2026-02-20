'use client'

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Card, CardContent } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { useRouter, usePathname, useSearchParams } from 'next/navigation'
import Link from 'next/link'
import { Badge } from '@/components/ui/Badge'
import { Button } from '@/components/ui/Button'
import { debounce } from 'lodash'
import { getVisits } from '@/lib/actions/visits'
import { Search, Filter, ExternalLink, Calendar, User, ShoppingBag, Tag, CheckCircle2, ChevronLeft, ChevronRight, Download, MessageSquare } from 'lucide-react'

interface Visit {
  id: string
  buyer_name: string
  scheduled_date: string
  status: string
  visit_category: string
  buyer_type: string
  agent_name: string
  agent_email: string
  actual_date?: string
  feedback?: string
}

interface VisitsViewProps {
  initialVisits: Visit[]
  totalCount: number
  currentPage: number
  currentQuery: string
  currentStatus: string
  currentAgentId: string
  currentCategory: string
  currentStartDate: string
  currentEndDate: string
  agents: { id: string; full_name: string | null }[]
  categories: string[]
}

export function VisitsView({ 
  initialVisits, 
  totalCount, 
  currentPage, 
  currentQuery, 
  currentStatus,
  currentAgentId,
  currentCategory,
  currentStartDate,
  currentEndDate,
  agents,
  categories
}: VisitsViewProps) {
  const totalPages = Math.ceil(totalCount / 10)
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const [searchTerm, setSearchTerm] = useState(currentQuery)
  const [isExporting, setIsExporting] = useState(false)

  const createQueryString = useCallback(
    (updates: Record<string, string>) => {
      const params = new URLSearchParams(searchParams.toString())
      Object.entries(updates).forEach(([name, value]) => {
        if (value === 'all' || value === '') {
          params.delete(name)
        } else {
          params.set(name, value)
        }
      })
      if (!updates.page) {
        params.set('page', '1') // Reset to first page on search/filter
      }
      return params.toString()
    },
    [searchParams]
  )

  const debouncedSearch = useMemo(
    () =>
      debounce((query: string) => {
        router.push(`${pathname}?${createQueryString({ query })}`)
      }, 500),
    [router, pathname, createQueryString]
  )

  useEffect(() => {
    setSearchTerm(currentQuery)
  }, [currentQuery])

  const handleFilterChange = (name: string, value: string) => {
    router.push(`${pathname}?${createQueryString({ [name]: value })}`)
  }

  const handlePageChange = (page: number) => {
    router.push(`${pathname}?${createQueryString({ page: page.toString() })}`)
  }

  const handleExport = async () => {
    setIsExporting(true)
    try {
        const { visits: allVisits } = await getVisits(1, 10000, {
            query: currentQuery,
            status: currentStatus,
            agentId: currentAgentId,
            category: currentCategory,
            startDate: currentStartDate,
            endDate: currentEndDate
        })
        
        const headers = ['Buyer Name', 'Scheduled Date', 'Actual Date', 'Agent Name', 'Agent Email', 'Category', 'Status', 'Feedback']
        const csvContent = [
            headers.join(','),
            ...allVisits.map(v => [
                `"${v.buyer_name}"`,
                v.scheduled_date ? new Date(v.scheduled_date).toLocaleDateString() : '',
                v.actual_date ? new Date(v.actual_date).toLocaleDateString() : '',
                `"${v.agent_name}"`,
                v.agent_email,
                v.visit_category || 'General',
                v.status,
                `"${(v.feedback || '').replace(/"/g, '""')}"`
            ].join(','))
        ].join('\n')

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const link = document.createElement('a')
        const url = URL.createObjectURL(blob)
        link.setAttribute('href', url)
        link.setAttribute('download', `visits_export_${new Date().toISOString().split('T')[0]}.csv`)
        link.style.visibility = 'hidden'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    } catch (error) {
        console.error("Export failed:", error)
    } finally {
        setIsExporting(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'completed':
        return 'bg-green-100 text-green-700 border-green-200'
      case 'verified':
        return 'bg-blue-100 text-blue-700 border-blue-200'
      case 'checked-in':
        return 'bg-amber-100 text-amber-700 border-amber-200'
      case 'planned':
        return 'bg-gray-100 text-gray-700 border-gray-200'
      default:
        return 'bg-gray-100 text-gray-700 border-gray-200'
    }
  }

  return (
    <div className="space-y-6">
      <Card className="border-none shadow-sm bg-white">
        <CardContent className="p-4 flex flex-col gap-4">
          <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by buyer name..."
                value={searchTerm}
                onChange={(e) => {
                  setSearchTerm(e.target.value)
                  debouncedSearch(e.target.value)
                }}
                className="pl-10 bg-gray-50 border-gray-200 focus:bg-white transition-colors"
              />
            </div>

            <Button 
                onClick={handleExport} 
                disabled={isExporting}
                variant="outline" 
                className="flex items-center gap-2 h-10 border-gray-200 text-gray-700 hover:text-green-700 hover:border-green-200 hover:bg-green-50 w-full md:w-auto"
            >
                <Download className="h-4 w-4" />
                {isExporting ? 'Exporting...' : 'Export Data'}
            </Button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 pt-4 border-t border-gray-100">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                <Filter className="h-3 w-3" />
                Status
              </label>
              <select
                value={currentStatus}
                onChange={(e) => handleFilterChange('status', e.target.value)}
                className="w-full text-sm rounded-md border-gray-200 bg-gray-50 focus:ring-green-500 focus:border-green-500 py-2 transition-all hover:bg-white"
              >
                <option value="all">All Statuses</option>
                <option value="planned">Planned</option>
                <option value="checked-in">Checked-in</option>
                <option value="completed">Completed</option>
                <option value="verified">Verified</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                <User className="h-3 w-3" />
                Agent
              </label>
              <select
                value={currentAgentId}
                onChange={(e) => handleFilterChange('agentId', e.target.value)}
                className="w-full text-sm rounded-md border-gray-200 bg-gray-50 focus:ring-green-500 focus:border-green-500 py-2 transition-all hover:bg-white"
              >
                <option value="all">All Agents</option>
                {agents.map(a => (
                  <option key={a.id} value={a.id}>{a.full_name || 'Unnamed'}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                <Tag className="h-3 w-3" />
                Category
              </label>
              <select
                value={currentCategory}
                onChange={(e) => handleFilterChange('category', e.target.value)}
                className="w-full text-sm rounded-md border-gray-200 bg-gray-50 focus:ring-green-500 focus:border-green-500 py-2 transition-all hover:bg-white"
              >
                <option value="all">All Categories</option>
                {categories.map(c => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-gray-400 uppercase tracking-wider flex items-center gap-1.5">
                <Calendar className="h-3 w-3" />
                Date Range
              </label>
              <div className="flex items-center gap-2">
                <Input
                  type="date"
                  value={currentStartDate}
                  onChange={(e) => handleFilterChange('startDate', e.target.value)}
                  className="text-xs h-9 bg-gray-50 border-gray-200 p-1"
                />
                <span className="text-gray-300">-</span>
                <Input
                  type="date"
                  value={currentEndDate}
                  onChange={(e) => handleFilterChange('endDate', e.target.value)}
                  className="text-xs h-9 bg-gray-50 border-gray-200 p-1"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="border-none shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-500 font-medium border-b border-gray-100">
                <tr>
                  <th className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      Scheduled
                    </div>
                  </th>
                  <th className="px-6 py-4 whitespace-nowrap">
                    <div className="flex items-center gap-2">
                       <CheckCircle2 className="h-4 w-4" />
                       Visit Date
                    </div>
                  </th>
                  <th className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      Agent
                    </div>
                  </th>
                  <th className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <ShoppingBag className="h-4 w-4" />
                      Customer / Buyer
                    </div>
                  </th>
                  <th className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <Tag className="h-4 w-4" />
                      Category
                    </div>
                  </th>
                  <th className="px-6 py-4">Feedback</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 bg-white">
                {initialVisits.length > 0 ? (
                  initialVisits.map((visit) => (
                    <tr key={visit.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4 whitespace-nowrap text-gray-500 text-xs">
                        {new Date(visit.scheduled_date).toLocaleDateString('en-KE', {
                          day: 'numeric',
                          month: 'short',
                        })}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-gray-900 font-medium">
                        {visit.actual_date ? (
                          new Date(visit.actual_date).toLocaleDateString('en-KE', {
                            day: 'numeric',
                            month: 'short',
                            year: 'numeric'
                          })
                        ) : (
                          <span className="text-gray-300 italic">Not Visited</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-bold text-gray-900">{visit.agent_name}</span>
                          <span className="text-xs text-gray-400">{visit.agent_email}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col">
                          <span className="font-medium text-gray-700">{visit.buyer_name}</span>
                          <span className="text-[10px] uppercase font-semibold text-gray-400">
                            {visit.buyer_type || 'Unknown Type'}
                          </span>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-100 font-medium">
                          {visit.visit_category || 'General'}
                        </Badge>
                      </td>
                      <td className="px-6 py-4">
                        {visit.feedback ? (
                          <p className="text-xs text-gray-600 line-clamp-2 max-w-[200px]" title={visit.feedback}>
                            {visit.feedback}
                          </p>
                        ) : (
                          <span className="text-gray-300 italic">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${getStatusColor(visit.status)}`}>
                            {visit.status === 'completed' && <CheckCircle2 className="h-3 w-3 mr-1" />}
                            {visit.status}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link 
                          href={`/admin/visits/${visit.id}`}
                          className="inline-flex items-center justify-center p-2 text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        >
                          <ExternalLink className="h-4 w-4" />
                        </Link>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="px-6 py-12 text-center text-gray-500">
                      No visits found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Pagination Controls */}
      {initialVisits.length > 0 && (
        <div className="flex items-center justify-between bg-white px-4 py-3 sm:px-6 rounded-lg border shadow-sm">
          <div className="flex flex-1 justify-between sm:hidden">
            <Button
              variant="outline"
              disabled={currentPage <= 1}
              onClick={() => handlePageChange(currentPage - 1)}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              disabled={currentPage >= totalPages}
              onClick={() => handlePageChange(currentPage + 1)}
            >
              Next
            </Button>
          </div>
          <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
            <div>
              <p className="text-sm text-gray-700">
                Page <span className="font-medium">{currentPage}</span> of{' '}
                <span className="font-medium">{Math.max(1, totalPages)}</span>
                {totalCount > 0 && (
                  <span className="ml-2 text-gray-400">
                    | Showing <span className="font-medium">{(currentPage - 1) * 10 + 1}</span> to{' '}
                    <span className="font-medium">{Math.min(currentPage * 10, totalCount)}</span> of{' '}
                    <span className="font-medium">{totalCount}</span>
                  </span>
                )}
              </p>
            </div>
            {totalPages > 1 && (
              <div>
                <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                  <Button
                    variant="outline"
                    className="rounded-l-md px-2 h-9"
                    disabled={currentPage <= 1}
                    onClick={() => handlePageChange(currentPage - 1)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    className="rounded-r-md px-2 h-9"
                    disabled={currentPage >= totalPages}
                    onClick={() => handlePageChange(currentPage + 1)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </nav>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  )
}
