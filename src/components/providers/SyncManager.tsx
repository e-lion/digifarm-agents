'use client'

import { useEffect, useState } from 'react'
import { getOfflineReports, removeOfflineReport, getOfflineNewVisits, removeOfflineNewVisit } from '@/lib/offline-storage'
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
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
        // --- 1. Sync Offline New Visits (Drafts) FIRST ---
        // We sync drafts first so that if there are reports for these drafts, 
        // the visits exist in Supabase before we try to update them.
        const draftsOnSyncStart = await getOfflineNewVisits()
        for (const draft of draftsOnSyncStart) {
            try {
                // eslint-disable-next-line @typescript-eslint/no-explicit-any
                const { id: tempId, ...payload } = draft as any
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

        // --- 2. Sync Offline Reports ---
        const remainingReports = await getOfflineReports()
        const currentDrafts = await getOfflineNewVisits()
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const currentDraftIds = currentDrafts.map((d: any) => d.id)

        for (const report of remainingReports) {
            try {
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
                    // IMPORTANT: Only purge if this isn't a draft that failed to sync above
                    if (!currentDraftIds.includes(report.id)) {
                        console.warn(`Terminal sync error: Report ${report.id} target not found and not in drafts. Purging.`)
                        await removeOfflineReport(report.id)
                    } else {
                        console.info(`Report ${report.id} target not found yet, but it's a pending draft. Skipping for now.`)
                    }
                } else {
                    console.error(`Failed to sync report ${report.id}:`, result.error)
                }
            } catch (e) {
                console.error(`Error syncing report ${report.id}`, e)
            }
        }

        if (syncedCount > 0) {
            toast.success(`Synced ${syncedCount} item(s) successfully!`)
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
