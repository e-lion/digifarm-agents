'use client'

import { useState, useRef, useEffect } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import { getBuyersList, BuyerOption } from '@/lib/actions/buyers'
import { BuyerCard } from './BuyerCard'
import { Input } from '@/components/ui/Input'
import { EditContactDialog } from './EditContactDialog'

import { Search, Loader2, Plus } from 'lucide-react'
import Link from 'next/link'
import { useDebounce } from '@/hooks/use-debounce'

export function BuyerList() {
    const [search, setSearch] = useState('')
    const debouncedSearch = useDebounce(search, 500)
    const [selectedBuyer, setSelectedBuyer] = useState<BuyerOption | null>(null)
    const [isEditOpen, setIsEditOpen] = useState(false)
    const loadMoreRef = useRef<HTMLDivElement>(null)

    const {
        data,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
        isLoading,
        isError,
        refetch
    } = useInfiniteQuery({
        queryKey: ['buyers', debouncedSearch],
        queryFn: async ({ pageParam = 0 }) => {
            const result = await getBuyersList(debouncedSearch, 10, pageParam as number)
            return { ...result, nextCursor: (pageParam as number) + 10 }
        },
        getNextPageParam: (lastPage, allPages) => {
            const currentCount = allPages.flatMap(p => p.data).length
            if (currentCount < lastPage.count) {
                return lastPage.nextCursor
            }
            return undefined
        },
        initialPageParam: 0
    })

    // Intersection Observer for infinite scroll
    useEffect(() => {
        const observer = new IntersectionObserver(
            (entries) => {
                if (entries[0].isIntersecting && hasNextPage && !isFetchingNextPage) {
                    fetchNextPage()
                }
            },
            { threshold: 0.1 }
        )

        if (loadMoreRef.current) {
            observer.observe(loadMoreRef.current)
        }

        return () => observer.disconnect()
    }, [hasNextPage, isFetchingNextPage, fetchNextPage])


    const handleEdit = (buyer: BuyerOption) => {
        setSelectedBuyer(buyer)
        setIsEditOpen(true)
    }

    const allBuyers = data?.pages.flatMap(p => p.data) || []

    return (
        <div className="space-y-4 pb-20 relative min-h-[50vh]">
            <div className="sticky top-[57px] z-30 bg-gray-50 pt-2 pb-2 -mx-4 px-4 shadow-sm">
                 <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input 
                        placeholder="Search buyers..." 
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="pl-9 bg-white"
                    />
                </div>
            </div>

            {isLoading ? (
                <div className="flex justify-center py-8">
                    <Loader2 className="h-8 w-8 animate-spin text-green-600" />
                </div>
            ) : isError ? (
                <div className="text-center py-8 text-red-500">
                    Failed to load buyers. <button onClick={() => refetch()} className="underline text-red-600 font-medium ml-1">Retry</button>
                </div>
            ) : allBuyers.length === 0 ? (
                <div className="text-center py-12 text-gray-500 bg-white rounded-lg border border-dashed border-gray-300 mx-4">
                    No buyers found.
                </div>
            ) : (
                <div className="space-y-3 px-1">
                    {allBuyers.map((buyer) => (
                        <BuyerCard key={buyer.id} buyer={buyer} onEdit={handleEdit} />
                    ))}
                    
                    {/* Sentinel for infinite scroll */}
                    <div ref={loadMoreRef} className="h-10 flex justify-center items-center">
                        {isFetchingNextPage && <Loader2 className="h-5 w-5 animate-spin text-gray-400" />}
                    </div>
                </div>
            )}

            <Link href="/agent/buyers/new" className="fixed bottom-24 right-6 z-40 rounded-full h-14 w-14 shadow-xl bg-green-600 hover:bg-green-700 transition-transform active:scale-95 flex items-center justify-center text-white">
                <Plus className="h-6 w-6" />
            </Link>
            
            <EditContactDialog 
                buyer={selectedBuyer} 
                open={isEditOpen} 
                onOpenChange={setIsEditOpen} 
            />
        </div>
    )
}
