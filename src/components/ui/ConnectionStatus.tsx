'use client'

import { Wifi, WifiOff, RefreshCw } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ConnectionStatusProps {
  isOnline: boolean
  isSyncing: boolean
  pendingCount: number
  onClear?: () => void
}

export function ConnectionStatus({ isOnline, isSyncing, pendingCount, onClear }: ConnectionStatusProps) {
  if (isOnline && pendingCount === 0 && !isSyncing) return null

  return (
    <div className={cn(
      "fixed top-14 left-0 right-0 z-30 flex items-center justify-center py-1 px-4 text-xs font-semibold transition-all duration-300",
      !isOnline ? "bg-red-500 text-white" : "bg-blue-600 text-white"
    )}>
      <div className="flex items-center gap-2">
        {!isOnline ? (
          <>
            <WifiOff className="h-3 w-3" />
            <span>You are offline. Reports will be saved locally.</span>
          </>
        ) : isSyncing ? (
          <>
            <RefreshCw className="h-3 w-3 animate-spin" />
            <span>Syncing {pendingCount} report{pendingCount !== 1 ? 's' : ''}...</span>
          </>
        ) : pendingCount > 0 ? (
           <>
            <RefreshCw className="h-3 w-3" />
            <span>{pendingCount} report{pendingCount !== 1 ? 's' : ''} waiting to sync</span>
            <button 
              onClick={(e) => {
                e.preventDefault()
                onClear?.()
              }}
              className="ml-2 underline hover:text-white/80"
            >
              Clear
            </button>
          </>
        ) : null}
      </div>
    </div>
  )
}
