'use client'

import { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card'
import { Input } from '@/components/ui/Input'
import { Button } from '@/components/ui/Button'
import { Plus, ShieldCheck, Clock, Mail, ChevronDown } from 'lucide-react'
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
}

export function UsersView({ unifiedUsers = [] }: UsersViewProps) {
  const [isAdding, setIsAdding] = useState(false)

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
        <div className="flex flex-col md:flex-row justify-between items-end gap-4">
            <Card className="w-full md:w-[400px]">
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
                                            <span>Add User</span>
                                        </>
                                    )}
                                </Button>
                            </div>
                        </div>
                    </form>
                </CardContent>
            </Card>
        </div>

        <Card>
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
                                <tr key={user?.email || `user-${index}`} className="hover:bg-gray-50/50 transition-colors">
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
                                            onClick={() => toggleAccess(user.email, user.status)}
                                            className={user.status === 'activated' ? 'text-red-600 border-red-200 hover:bg-red-50' : ''}
                                        >
                                            {user.status === 'activated' ? 'Deactivate' : 'Activate'}
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
    </div>
  )
}
