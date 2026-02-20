'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Plus, ShieldCheck, Clock, Mail, ChevronDown, Search, ChevronLeft, ChevronRight } from 'lucide-react'
import { toggleAccess, addAgent } from '@/lib/actions/users'

interface UnifiedUser {
  email: string
  role: string
  status: 'activated' | 'deactivated'
  fullName: string | null
  isRegistered: boolean
}

interface UsersViewProps {
  unifiedUsers: UnifiedUser[]
  totalCount: number
  currentPage: number
  currentQuery: string
}

export function UsersView({ 
  unifiedUsers = [], 
  totalCount, 
  currentPage, 
  currentQuery 
}: UsersViewProps) {
  const router = useRouter()
  const [isAdding, setIsAdding] = useState(false)
  const [isPending, startTransition] = useTransition()
  const [togglingEmail, setTogglingEmail] = useState<string | null>(null)
  const [searchTerm, setSearchTerm] = useState(currentQuery)

  const handleToggle = (email: string, currentStatus: 'activated' | 'deactivated') => {
    setTogglingEmail(email)
    startTransition(async () => {
        try {
            await toggleAccess(email, currentStatus)
        } catch (e) {
            console.error(e)
        } finally {
            setTogglingEmail(null)
        }
    })
  }

  // Debounced search effect
  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchTerm !== currentQuery) {
        router.push(`?page=1&query=${encodeURIComponent(searchTerm)}`)
      }
    }, 500)

    return () => clearTimeout(delayDebounceFn)
  }, [searchTerm, currentQuery, router])

  const totalPages = Math.ceil(totalCount / 10)

  const handlePageChange = (newPage: number) => {
    router.push(`?page=${newPage}&query=${encodeURIComponent(currentQuery)}`)
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
        <div className="flex flex-col lg:flex-row justify-between items-start gap-4">
            <Card className="w-full lg:w-[400px] shrink-0">
                <CardHeader className="pb-3">
                    <CardTitle className="text-lg">Add New User / Whitelist</CardTitle>
                </CardHeader>
                <CardContent>
                    <form 
                        action={async (formData) => {
                            setIsAdding(true)
                            try {
                                await addAgent(formData)
                            } catch (e) {
                                console.error(e)
                            } finally {
                                setIsAdding(false)
                            }
                        }} 
                        className="space-y-4"
                    >
                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-1">Email Address</label>
                            <div className="relative group">
                                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-green-600 transition-colors">
                                    <Mail className="h-4 w-4" />
                                </div>
                                <Input 
                                    name="email" 
                                    type="email" 
                                    placeholder="agent@example.com" 
                                    required 
                                    className="pl-11 h-12 bg-gray-50/50 border-gray-200 focus:bg-white transition-all duration-200" 
                                />
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-xs font-semibold text-gray-500 uppercase tracking-wider px-1">Assign Role</label>
                            <div className="flex gap-3">
                                <div className="relative flex-1 group">
                                    <div className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-green-600 transition-colors z-10">
                                        <ShieldCheck className="h-4 w-4" />
                                    </div>
                                    <select 
                                        name="role" 
                                        defaultValue="agent"
                                        className="flex h-12 w-full rounded-lg border border-gray-200 bg-gray-50/50 pl-11 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-600 focus:bg-white transition-all duration-200 appearance-none cursor-pointer"
                                    >
                                        <option value="agent">Agent</option>
                                        <option value="admin">Admin</option>
                                    </select>
                                    <div className="absolute right-4 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none group-focus-within:text-green-600 transition-colors">
                                        <ChevronDown className="h-4 w-4" />
                                    </div>
                                </div>
                                <Button type="submit" disabled={isAdding} className="h-12 px-6 shadow-sm">
                                    {isAdding ? (
                                        <Clock className="h-4 w-4 animate-spin" />
                                    ) : (
                                        <>
                                            <Plus className="h-4 w-4 mr-2" />
                                            <span>Add</span>
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </form>
                </CardContent>
            </Card>

            {/* Search Box */}
            <Card className="flex-1 w-full self-stretch flex items-center px-4">
                <div className="relative w-full">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input 
                        placeholder="Search by email..." 
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="pl-10 h-10 bg-gray-50/50 border-gray-200 focus:bg-white transition-colors"
                    />
                </div>
            </Card>
        </div>

        <Card className="border-none shadow-sm bg-white overflow-hidden">
            <CardHeader>
                <CardTitle>User Access Management</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="overflow-x-auto">
                    <table className="w-full">
                        <thead>
                            <tr className="border-b border-gray-100">
                                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">User</th>
                                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Role</th>
                                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Registration</th>
                                <th className="text-left py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                                <th className="text-right py-3 px-4 text-xs font-semibold text-gray-400 uppercase tracking-wider">Action</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-50">
                            {unifiedUsers?.map((user, index) => (
                                <tr key={user?.email || `user-${index}`} className="hover:bg-gray-50/80 transition-colors">
                                    <td className="py-3 px-4">
                                        <div className="flex flex-col">
                                            <span className="text-sm font-bold text-gray-900">{user.fullName || 'Pending Registration'}</span>
                                            <span className="text-xs text-gray-500">{user.email}</span>
                                        </div>
                                    </td>
                                    <td className="py-3 px-4">
                                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                            user.role === 'admin' ? 'bg-purple-100 text-purple-700' : 'bg-blue-100 text-blue-700'
                                        }`}>
                                            {user.role}
                                        </span>
                                    </td>
                                    <td className="py-3 px-4">
                                         <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                            user.isRegistered ? 'bg-green-100 text-green-700' : 'bg-yellow-100 text-yellow-700'
                                        }`}>
                                            {user.isRegistered ? 'Registered' : 'Pending'}
                                        </span>
                                    </td>
                                    <td className="py-3 px-4">
                                        <span className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                                            user.status === 'activated' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                                        }`}>
                                            {user.status}
                                        </span>
                                    </td>
                                    <td className="py-3 px-4 text-right">
                                        <Button 
                                            variant={user.status === 'activated' ? 'outline' : 'primary'}
                                            size="sm"
                                            onClick={() => handleToggle(user.email, user.status)}
                                            disabled={isPending && togglingEmail === user.email}
                                            className={user.status === 'activated' ? 'text-red-600 border-red-200 hover:bg-red-50' : ''}
                                        >
                                            {isPending && togglingEmail === user.email ? (
                                                <Clock className="h-4 w-4 animate-spin" />
                                            ) : (
                                                user.status === 'activated' ? 'Deactivate' : 'Activate'
                                            )}
                                        </Button>
                                    </td>
                                </tr>
                            ))}
                            {(unifiedUsers?.length || 0) === 0 && (
                                <tr>
                                    <td colSpan={5} className="py-8 text-center text-sm text-gray-500">No users found.</td>
                                </tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </CardContent>
        </Card>

        {/* Pagination Controls */}
        {totalCount > 0 && (
          <div className="flex items-center justify-between bg-white px-4 py-3 sm:px-6 rounded-lg border shadow-sm">
            <div className="flex flex-1 items-center justify-between">
              <div>
                <p className="text-sm text-gray-700">
                  Page <span className="font-medium">{currentPage}</span> of{' '}
                  <span className="font-medium">{Math.max(1, totalPages)}</span>
                  <span className="ml-2 text-gray-400">
                    | Showing <span className="font-medium">{(currentPage - 1) * 10 + 1}</span> to{' '}
                    <span className="font-medium">{Math.min(currentPage * 10, totalCount)}</span> of{' '}
                    <span className="font-medium">{totalCount}</span>
                  </span>
                </p>
              </div>
              {totalPages > 1 && (
                <div>
                  <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(Math.max(1, currentPage - 1))}
                      disabled={currentPage === 1}
                      className="rounded-l-md px-2 focus:z-20 h-9"
                    >
                      <ChevronLeft className="h-4 w-4" />
                      <span className="sr-only">Previous</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(Math.min(totalPages, currentPage + 1))}
                      disabled={currentPage === totalPages}
                      className="rounded-r-md px-2 focus:z-20 h-9"
                    >
                      <span className="sr-only">Next</span>
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
