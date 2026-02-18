'use client'

import { useEffect, useState } from 'react'
import { getOfflineReports, removeOfflineReport, OfflineVisitReport } from '@/lib/offline-storage'
import { updateVisitAction } from '@/lib/actions/visits'
import { ConnectionStatus } from '@/components/ui/ConnectionStatus'
import { toast } from 'sonner'

export function SyncManager() {
  const [isOnline, setIsOnline] = useState(true)
  const [isSyncing, setIsSyncing] = useState(false)
  const [pendingCount, setPendingCount] = useState(0)

  // 1. Initial Load & Listeners
  useEffect(() => {
    setIsOnline(navigator.onLine)
    
    // Check pending count on mount
    checkPending()

    const handleOnline = () => {
      setIsOnline(true)
      toast.success("Back online!")
      syncReports()
    }

    const handleOffline = () => {
      setIsOnline(false)
      toast.error("You are offline. Reports will be saved locally.")
    }

    // Custom event to trigger a re-check of pending items (e.g. after a new save)
    const handleStorageUpdate = () => {
        checkPending()
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    window.addEventListener('offline-storage-updated', handleStorageUpdate)

    return () => {
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('offline-storage-updated', handleStorageUpdate)
    }
  }, [])

  const checkPending = async () => {
      const reports = await getOfflineReports()
      setPendingCount(reports.length)
  }

  const syncReports = async () => {
    const reports = await getOfflineReports()
    if (reports.length === 0) return

    setIsSyncing(true)
    let syncedCount = 0

    try {
        for (const report of reports) {
            try {
                // Determine if we are creating or updating based on context? 
                // Creating a visit happens online usually, but here we assume we are inside a visit workflow.
                // The offline-storage saves "data" which is the form payload.
                // We call the existing server action.
                
                // Note: The action requires buyerName.
                const result = await updateVisitAction(
                    report.id, 
                    report.buyerName, 
                    report.data, 
                    report.coords
                )

                if (result.success) {
                    await removeOfflineReport(report.id)
                    syncedCount++
                } else {
                    console.error(`Failed to sync report ${report.id}:`, result.error)
                }
            } catch (e) {
                console.error(`Error syncing report ${report.id}`, e)
            }
        }

        if (syncedCount > 0) {
            toast.success(`Synced ${syncedCount} report(s) successfully!`)
            await checkPending()
        }
    } finally {
        setIsSyncing(false)
    }
  }

  return <ConnectionStatus isOnline={isOnline} isSyncing={isSyncing} pendingCount={pendingCount} />
}
