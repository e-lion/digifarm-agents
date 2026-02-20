'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { BuyerWithStats, getBuyers } from '@/lib/actions/buyers'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'
import { Search, Download, ChevronLeft, ChevronRight, User, Building2, MapPin, Phone } from 'lucide-react'

interface BuyersTableProps {
  buyers: BuyerWithStats[]
  totalCount: number
  currentPage: number
  itemsPerPage: number
  currentSearch: string
}

export default function BuyersTable({ 
  buyers, 
  totalCount, 
  currentPage, 
  itemsPerPage, 
  currentSearch 
}: BuyersTableProps) {
  const router = useRouter()
  const [searchTerm, setSearchTerm] = useState(currentSearch)
  const [isExporting, setIsExporting] = useState(false)

  // Sync internal state with URL params if they change externally (e.g. back button)
  useEffect(() => {
    setSearchTerm(currentSearch)
  }, [currentSearch])

  // Debounced search effect
  useEffect(() => {
    if (searchTerm === currentSearch) return

    const delayDebounceFn = setTimeout(() => {
      router.push(`?page=1&size=${itemsPerPage}&search=${encodeURIComponent(searchTerm)}`)
    }, 500)

    return () => clearTimeout(delayDebounceFn)
  }, [searchTerm, currentSearch, itemsPerPage, router])

  const totalPages = Math.ceil(totalCount / itemsPerPage)

  const handlePageChange = (newPage: number) => {
    router.push(`?page=${newPage}&size=${itemsPerPage}&search=${encodeURIComponent(currentSearch)}`)
  }

  const handlePageSizeChange = (newSize: number) => {
    router.push(`?page=1&size=${newSize}&search=${encodeURIComponent(currentSearch)}`)
  }

  const handleExport = async () => {
    setIsExporting(true)
    try {
        // Fetch all matching buyers for export
        const { buyers: allBuyers } = await getBuyers(1, 10000, currentSearch)
        
        // CSV Export
        const headers = ['Name', 'Created At', 'Contact Name', 'Phone', 'Value Chain', 'Business Type', 'County', 'Agent Names', 'Latest Agent', 'Latest Status', 'Date Visited']
        const csvContent = [
        headers.join(','),
        ...allBuyers.map(b => [
            `"${b.name}"`,
            b.created_at ? new Date(b.created_at).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '',
            `"${b.contact_name || ''}"`,
            `"${b.phone || ''}"`,
            `"${b.value_chain || ''}"`,
            `"${b.business_type || ''}"`,
            `"${b.county || ''}"`,
            `"${b.agent_names.join(', ')}"`,
            `"${b.latest_visit_agent_name || ''}"`,
            `"${b.latest_visit_status || ''}"`,
            b.latest_visit_checked_in_at || b.last_visited ? new Date(b.latest_visit_checked_in_at || b.last_visited!).toLocaleString('en-GB', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : ''
        ].join(','))
        ].join('\n')

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
        const link = document.createElement('a')
        const url = URL.createObjectURL(blob)
        link.setAttribute('href', url)
        link.setAttribute('download', 'buyers_export.csv')
        link.style.visibility = 'hidden'
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    } catch (error) {
        console.error("Export failed", error)
    } finally {
        setIsExporting(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Controls */}
      <Card className="border-none shadow-sm bg-white">
        <CardContent className="p-4 flex flex-col sm:flex-row justify-between gap-4 items-center">
             <div className="relative w-full sm:max-w-md">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input 
                    placeholder="Search buyers by name, county, or value chain..." 
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10 h-10 bg-gray-50 border-gray-200 focus:bg-white transition-colors"
                />
            </div>
            <Button 
                onClick={handleExport} 
                disabled={isExporting}
                variant="outline" 
                className="flex items-center gap-2 h-10 border-gray-200 text-gray-700 hover:text-green-700 hover:border-green-200 hover:bg-green-50"
            >
                <Download className="h-4 w-4" />
                {isExporting ? 'Exporting...' : 'Export Data'}
            </Button>
        </CardContent>
      </Card>

      {/* Table Card */}
      <Card className="border-none shadow-sm bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="bg-gray-50/50 text-gray-500 font-medium border-b border-gray-100">
              <tr>
                <th className="px-6 py-4 uppercase text-xs tracking-wider">Buyer Details</th>
                <th className="px-6 py-4 uppercase text-xs tracking-wider">Created</th>
                <th className="px-6 py-4 uppercase text-xs tracking-wider">Contact Info</th>
                <th className="px-6 py-4 uppercase text-xs tracking-wider">Value Chain</th>
                <th className="px-6 py-4 uppercase text-xs tracking-wider">Location</th>
                <th className="px-6 py-4 uppercase text-xs tracking-wider">Agent Engagement</th>
                <th className="px-6 py-4 uppercase text-xs tracking-wider text-right">Date Visited</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {buyers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-400 bg-gray-50/30">
                    <div className="flex flex-col items-center gap-2">
                        <Building2 className="h-8 w-8 text-gray-300" />
                        <p>No buyers found matching your search.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                buyers.map((buyer) => (
                  <tr key={buyer.id} className="hover:bg-gray-50/80 transition-colors group">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="h-10 w-10 rounded-full bg-green-100 flex items-center justify-center text-green-700 font-bold shrink-0">
                            {buyer.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                            <div className="font-semibold text-gray-900">{buyer.name}</div>
                            <div className="text-xs text-gray-500 flex items-center gap-1">
                                <Building2 className="h-3 w-3" />
                                {buyer.business_type || 'Unknown Type'}
                            </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-xs text-gray-500">
                        {new Date(buyer.created_at).toLocaleDateString()}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-gray-900 font-medium whitespace-nowrap">
                            <User className="h-3 w-3 text-gray-400" />
                            {buyer.contact_name || '-'}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-400">
                            <Phone className="h-3 w-3" />
                            {buyer.phone || '-'}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700 border border-blue-100">
                        {buyer.value_chain || 'N/A'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                        <div className="flex items-center gap-1.5 text-gray-600">
                            <MapPin className="h-3.5 w-3.5 text-gray-400" />
                            {buyer.county || '-'}
                        </div>
                    </td>
                    <td className="px-6 py-4">
                      {buyer.latest_visit_agent_name ? (
                        <div className="space-y-1">
                          <div className="text-xs font-medium text-gray-900 flex items-center gap-1.5">
                            <User className="h-3 w-3 text-green-600" />
                            {buyer.latest_visit_agent_name}
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold tracking-tighter ${
                              buyer.latest_visit_status === 'completed' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'
                            }`}>
                              {buyer.latest_visit_status}
                            </span>
                          </div>
                        </div>
                      ) : (
                        <span className="text-xs text-gray-400 italic">No visits planned</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                        {buyer.latest_visit_checked_in_at || buyer.latest_visit_completed_at || buyer.last_visited ? (
                            <div className="text-xs text-gray-500">
                                {new Date(buyer.latest_visit_checked_in_at || buyer.latest_visit_completed_at || buyer.last_visited!).toLocaleString('en-GB', { 
                                  day: '2-digit', 
                                  month: 'short', 
                                  hour: '2-digit', 
                                  minute: '2-digit' 
                                })}
                            </div>
                        ) : (
                            <span className="text-xs text-gray-400 italic">Never</span>
                        )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        
      </Card>

      {/* Pagination & Page Size */}
      {totalCount > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between px-6 py-4 rounded-lg border shadow-sm bg-white gap-4">
          <div className="flex flex-col sm:flex-row items-center gap-4 text-sm text-gray-700">
            <p>
              Page <span className="font-medium">{currentPage}</span> of{' '}
              <span className="font-medium">{Math.max(1, totalPages)}</span>
              <span className="ml-2 text-gray-400">
                | Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
                <span className="font-medium">{Math.min(currentPage * itemsPerPage, totalCount)}</span> of{' '}
                <span className="font-medium">{totalCount}</span>
              </span>
            </p>
            
            <div className="flex items-center gap-2">
              <span className="hidden sm:inline text-gray-300">|</span>
              <span className="text-gray-500">Rows per page:</span>
              <select 
                  value={itemsPerPage}
                  onChange={(e) => handlePageSizeChange(Number(e.target.value))}
                  className="h-8 w-16 rounded border-gray-200 text-sm focus:ring-green-500 focus:border-green-500 bg-transparent"
              >
                  <option value={8}>8</option>
                  <option value={16}>16</option>
                  <option value={32}>32</option>
                  <option value={64}>64</option>
              </select>
            </div>
          </div>

          <div className="flex gap-2">
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="h-9 w-9 p-0"
            >
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="h-9 w-9 p-0"
            >
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
