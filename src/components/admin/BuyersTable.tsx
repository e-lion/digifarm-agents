'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { BuyerWithStats } from '@/lib/actions/buyers'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Search, Download, ChevronLeft, ChevronRight, User, Building2, MapPin, Phone } from 'lucide-react'

interface BuyersTableProps {
  initialBuyers: BuyerWithStats[]
}

export default function BuyersTable({ initialBuyers }: BuyersTableProps) {
  const [buyers, setBuyers] = useState<BuyerWithStats[]>(initialBuyers)
  const [search, setSearch] = useState('')
  const [currentPage, setCurrentPage] = useState(1)
  const itemsPerPage = 8 // Slightly reduced for better visual spacing

  // Filter logic
  const filteredBuyers = buyers.filter(buyer => 
    buyer.name.toLowerCase().includes(search.toLowerCase()) ||
    buyer.contact_name?.toLowerCase().includes(search.toLowerCase()) ||
    buyer.county?.toLowerCase().includes(search.toLowerCase()) ||
    buyer.value_chain?.toLowerCase().includes(search.toLowerCase())
  )

  // Pagination logic
  const totalPages = Math.ceil(filteredBuyers.length / itemsPerPage)
  const paginatedBuyers = filteredBuyers.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  )

  const handleExport = () => {
    // CSV Export
    const headers = ['Name', 'Contact Name', 'Phone', 'Value Chain', 'Business Type', 'County', 'Agent Count', 'Agent Names', 'Last Visited']
    const csvContent = [
      headers.join(','),
      ...filteredBuyers.map(b => [
        `"${b.name}"`,
        `"${b.contact_name || ''}"`,
        `"${b.phone || ''}"`,
        `"${b.value_chain || ''}"`,
        `"${b.business_type || ''}"`,
        `"${b.county || ''}"`,
        b.agent_count,
        `"${b.agent_names.join(', ')}"`,
        b.last_visited ? new Date(b.last_visited).toLocaleDateString() : ''
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
                    value={search}
                    onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
                    className="pl-10 h-10 bg-gray-50 border-gray-200 focus:bg-white transition-colors"
                />
            </div>
            <Button onClick={handleExport} variant="outline" className="flex items-center gap-2 h-10 border-gray-200 text-gray-700 hover:text-green-700 hover:border-green-200 hover:bg-green-50">
                <Download className="h-4 w-4" />
                Export Data
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
                <th className="px-6 py-4 uppercase text-xs tracking-wider">Contact Info</th>
                <th className="px-6 py-4 uppercase text-xs tracking-wider">Value Chain</th>
                <th className="px-6 py-4 uppercase text-xs tracking-wider">Location</th>
                <th className="px-6 py-4 uppercase text-xs tracking-wider text-center">Engagement</th>
                <th className="px-6 py-4 uppercase text-xs tracking-wider text-right">Last Visit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {paginatedBuyers.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-gray-400 bg-gray-50/30">
                    <div className="flex flex-col items-center gap-2">
                        <Building2 className="h-8 w-8 text-gray-300" />
                        <p>No buyers found matching your search.</p>
                    </div>
                  </td>
                </tr>
              ) : (
                paginatedBuyers.map((buyer) => (
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
                    <td className="px-6 py-4">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 text-gray-900 font-medium">
                            <User className="h-3 w-3 text-gray-400" />
                            {buyer.contact_name || '-'}
                        </div>
                        <div className="flex items-center gap-2 text-xs text-gray-500">
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
                    <td className="px-6 py-4 text-center">
                      <div className="flex flex-col items-center justify-center">
                        <div className="text-lg font-bold text-gray-900">{buyer.agent_count}</div>
                        <div className="text-[10px] text-gray-400 uppercase tracking-wide">Agents</div>
                      </div>
                    </td>
                    <td className="px-6 py-4 text-right">
                        {buyer.last_visited ? (
                            <div className="text-sm text-gray-900">
                                {new Date(buyer.last_visited).toLocaleDateString()}
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
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between px-6 py-4 border-t border-gray-100 bg-gray-50/30">
            <div className="text-sm text-gray-500">
              Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to <span className="font-medium">{Math.min(currentPage * itemsPerPage, filteredBuyers.length)}</span> of <span className="font-medium">{filteredBuyers.length}</span> buyers
            </div>
            <div className="flex gap-2">
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className="h-8 w-8 p-0"
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className="h-8 w-8 p-0"
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        )}
      </Card>
    </div>
  )
}
