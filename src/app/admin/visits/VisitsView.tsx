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
import { Search, Filter, ExternalLink, Calendar, User, ShoppingBag, Tag, CheckCircle2, ChevronLeft, ChevronRight, Download, MessageSquare, Users } from 'lucide-react'

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
  active_farmers?: number
  activity_type?: string
  value_chains?: string[]
  county?: string
  location?: string
  contact_name?: string
  contact_phone?: string
  contact_designation?: string
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
        
        const headers = ['Buyer Name', 'Scheduled Date', 'Actual Date', 'Agent Name', 'Agent Email', 'Category', 'Reason', 'Active Farmers', 'Status', 'Value Chain', 'County/Location', 'Contact Person', 'Feedback']
        const csvContent = [
            headers.join(','),
            ...allVisits.map(v => [
                `"${v.buyer_name}"`,
                v.scheduled_date ? new Date(v.scheduled_date).toLocaleDateString() : '',
                v.actual_date ? new Date(v.actual_date).toLocaleDateString() : '',
                `"${v.agent_name}"`,
                v.agent_email,
                v.visit_category || 'General',
                v.activity_type || 'Unspecified',
                v.active_farmers || 0,
                v.status,
                `"${(v.value_chains || []).join('; ')}"`,
                `"${v.county || 'N/A'}${v.location !== 'N/A' ? ` (${v.location})` : ''}"`,
                `"${v.contact_name || 'N/A'} (${v.contact_designation || 'N/A'}) - ${v.contact_phone || 'N/A'}"`,
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

      <Card className="border-gray-100 shadow-sm overflow-hidden bg-white">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50/80 text-gray-500 font-medium border-b border-gray-100 uppercase tracking-wide text-[11px]">
                <tr>
                  <th className="px-6 py-4">Visit Details</th>
                  <th className="px-6 py-4">Customer</th>
                  <th className="px-6 py-4">Agent</th>
                  <th className="px-6 py-4">Context</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50/50 bg-white">
                {initialVisits.length > 0 ? (
                  initialVisits.map((visit) => (
                    <tr key={visit.id} className="hover:bg-gray-50/80 transition-all duration-200">
                      
                      {/* Visit Details (Dates + Status) */}
                      <td className="px-6 py-4 whitespace-nowrap align-top">
                        <div className="flex flex-col gap-1.5">
                           <span className={`inline-flex items-center w-fit px-2 py-0.5 rounded-full text-[10px] uppercase font-bold tracking-wider border ${getStatusColor(visit.status)}`}>
                             {visit.status === 'completed' && <CheckCircle2 className="h-3 w-3 mr-1" />}
                             {visit.status}
                           </span>
                           <div className="flex flex-col text-xs mt-1">
                              <span className="text-gray-500 flex flex-col">
                                 <span className="font-semibold text-gray-400 text-[10px] uppercase">Scheduled</span>
                                 {new Date(visit.scheduled_date).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric'})}
                              </span>
                              {visit.actual_date && (
                                <span className="text-green-700 flex flex-col mt-1.5">
                                    <span className="font-semibold text-green-600/60 text-[10px] uppercase">Visited On</span>
                                    {new Date(visit.actual_date).toLocaleDateString('en-KE', { day: 'numeric', month: 'short', year: 'numeric'})}
                                </span>
                              )}
                           </div>
                        </div>
                      </td>

                      {/* Customer Info */}
                      <td className="px-6 py-4 align-top max-w-[200px]">
                        <div className="flex flex-col">
                          <span className="font-semibold text-gray-900 truncate">{visit.buyer_name}</span>
                          <div className="flex items-center gap-2 mt-1">
                             <Badge variant="outline" className="text-[9px] uppercase font-bold tracking-wider text-gray-500 border-gray-200 bg-gray-50">
                               {visit.buyer_type || 'Unknown'}
                             </Badge>
                             <span className="text-[10px] flex items-center gap-1 text-blue-600 font-medium bg-blue-50 px-1.5 py-0.5 rounded">
                                <Users className="h-3 w-3" /> {visit.active_farmers || 0} Farmers
                             </span>
                          </div>
                        </div>
                      </td>

                      {/* Agent Info */}
                      <td className="px-6 py-4 align-top">
                        <div className="flex items-start gap-3">
                            <div className="h-8 w-8 rounded-full bg-gradient-to-br from-green-100 to-green-50 flex items-center justify-center border border-green-200">
                                <span className="text-green-700 font-bold text-xs">
                                  {visit.agent_name.charAt(0).toUpperCase()}
                                </span>
                            </div>
                            <div className="flex flex-col">
                              <span className="font-bold text-gray-900 text-sm leading-none mt-1">{visit.agent_name}</span>
                              <span className="text-[11px] text-gray-500 mt-1 truncate max-w-[150px]">{visit.agent_email}</span>
                            </div>
                        </div>
                      </td>

                      {/* Context (Category & Feedback) */}
                      <td className="px-6 py-4 align-top max-w-[250px]">
                         <div className="flex flex-col gap-2">
                            <div className="flex flex-wrap gap-2">
                              <Badge variant="secondary" className="w-fit bg-purple-50 text-purple-700 border border-purple-100 text-[10px]">
                                <Tag className="h-3 w-3 mr-1" />
                                {visit.visit_category || 'General'}
                              </Badge>
                              {visit.activity_type && (
                                <Badge variant="outline" className="w-fit text-gray-600 border-gray-200 text-[10px]">
                                  {visit.activity_type}
                                </Badge>
                              )}
                            </div>
                            {visit.feedback ? (
                              <div className="flex items-start gap-1.5 text-gray-600 bg-gray-50 p-2 rounded border border-gray-100 text-xs">
                                 <MessageSquare className="h-3 w-3 mt-0.5 shrink-0 text-gray-400" />
                                 <p className="line-clamp-2" title={visit.feedback}>{visit.feedback}</p>
                              </div>
                            ) : (
                              <span className="text-gray-400 text-xs italic ml-1">No feedback provided</span>
                            )}
                         </div>
                      </td>

                      {/* Actions */}
                      <td className="px-6 py-4 text-right align-middle">
                        <Link 
                          href={`/admin/visits/${visit.id}`}
                          className="inline-flex items-center gap-2 px-3 py-1.5 text-sm font-medium text-green-700 bg-green-50 hover:bg-green-100 border border-green-200 rounded-lg transition-colors"
                        >
                          View 
                          <ExternalLink className="h-3.5 w-3.5" />
                        </Link>
                      </td>

                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="px-6 py-16 text-center text-gray-500 bg-gray-50/50">
                       <div className="flex flex-col items-center justify-center space-y-3">
                          <ShoppingBag className="h-8 w-8 text-gray-300" />
                          <p className="text-sm font-medium text-gray-600">No visits found matching your criteria</p>
                       </div>
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
