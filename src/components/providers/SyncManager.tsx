'use client'

import { useEffect, useState } from 'react'
import { getOfflineReports, removeOfflineReport, OfflineVisitReport, getOfflineNewVisits, removeOfflineNewVisit } from '@/lib/offline-storage'
import { updateVisitAction, createVisitAction } from '@/lib/actions/visits'
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

    // Proactive sync on mount if online
    if (navigator.onLine) {
        syncReports()
    }

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
        if (navigator.onLine) {
            syncReports() // Proactive sync when something new is saved while online
        }
    }

    // Periodic sync interval (e.g. every 30 seconds) to catch missed events
    const syncInterval = setInterval(() => {
        if (navigator.onLine) {
            syncReports()
        }
    }, 30000)

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOffline)
    window.addEventListener('offline-storage-updated', handleStorageUpdate)

    return () => {
      clearInterval(syncInterval)
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('offline-storage-updated', handleStorageUpdate)
    }
  }, [])

  const checkPending = async () => {
      try {
          const reports = await getOfflineReports()
          const drafts = await getOfflineNewVisits()
          setPendingCount(reports.length + drafts.length)
      } catch (e) {
          console.warn("Failed to check offline reports:", e)
      }
  }

  const syncReports = async () => {
    if (isSyncing) return

    const reports = await getOfflineReports()
    const drafts = await getOfflineNewVisits()
    if (reports.length === 0 && drafts.length === 0) return

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
                } else if (result.code === 'NOT_FOUND') {
                    console.warn(`Terminal sync error: Report ${report.id} target not found. Purging.`)
                    await removeOfflineReport(report.id)
                } else {
                    console.error(`Failed to sync report ${report.id}:`, result.error)
                }
            } catch (e) {
                console.error(`Error syncing report ${report.id}`, e)
            }
        }

        // --- 2. Sync Offline New Visits (Drafts) ---
        const drafts = await getOfflineNewVisits()
        for (const draft of drafts) {
            try {
                // Remove internal UI flag and preserve the ID for referential integrity
                const { isDraft, id: tempId, ...payload } = draft
                const result = await createVisitAction({ ...payload, id: tempId })
                
                if (result.success) {
                    await removeOfflineNewVisit(tempId)
                    syncedCount++
                } else {
                    console.error(`Failed to sync offline draft ${tempId}:`, result.error)
                }
            } catch (e) {
                console.error(`Error syncing offline draft`, e)
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

  const handleClear = async () => {
    if (confirm("Clear all pending syncs? This cannot be undone.")) {
        const { clearOfflineReports, clearOfflineNewVisits } = await import('@/lib/offline-storage')
        await clearOfflineReports()
        await clearOfflineNewVisits()
        checkPending()
        toast.info("Offline storage cleared.")
    }
  }

  return <ConnectionStatus isOnline={isOnline} isSyncing={isSyncing} pendingCount={pendingCount} onClear={handleClear} />
}
