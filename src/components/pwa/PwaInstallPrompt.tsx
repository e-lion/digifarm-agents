'use client'

import { useState, useEffect } from 'react'
import { X, Share, PlusSquare, Download } from 'lucide-react'
import { Button } from '@/components/ui/Button'
import { Card, CardContent } from '@/components/ui/Card'

export function PwaInstallPrompt() {
  const [showPrompt, setShowPrompt] = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [deferredPrompt, setDeferredPrompt] = useState<any>(null)
  const [platform, setPlatform] = useState<'ios' | 'android' | 'other'>('other')

  useEffect(() => {
    // 1. Check if already installed
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const isStandalone = window.matchMedia('(display-mode: standalone)').matches || (window.navigator as any).standalone
    if (isStandalone) return

    // 2. Check if we should hide it (dismissed recently)
    const lastDismissed = localStorage.getItem('pwa_prompt_dismissed')
    if (lastDismissed) {
      const diff = Date.now() - parseInt(lastDismissed)
      if (diff < 7 * 24 * 60 * 60 * 1000) return // Hide for 7 days
    }

    // 3. Platform detection
    const userAgent = window.navigator.userAgent.toLowerCase()
    if (/iphone|ipad|ipod/.test(userAgent)) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setPlatform('ios')
      // Show prompt after a short delay on iOS
      const timer = setTimeout(() => setShowPrompt(true), 3000)
      return () => clearTimeout(timer)
    }

    // 4. Listen for native prompt on Android/Chrome
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const handler = (e: any) => {
      e.preventDefault()
      setDeferredPrompt(e)
      setPlatform('android')
      setShowPrompt(true)
    }

    window.addEventListener('beforeinstallprompt', handler)
    return () => window.removeEventListener('beforeinstallprompt', handler)
  }, [])

  const handleInstall = async () => {
    if (!deferredPrompt) return

    deferredPrompt.prompt()
    const { outcome } = await deferredPrompt.userChoice
    if (outcome === 'accepted') {
      setShowPrompt(false)
    }
    setDeferredPrompt(null)
  }

  const dismiss = () => {
    setShowPrompt(false)
    localStorage.setItem('pwa_prompt_dismissed', Date.now().toString())
  }

  if (!showPrompt) return null

  return (
    <div className="fixed bottom-24 left-4 right-4 z-[2100] md:left-auto md:right-8 md:bottom-8 md:w-full md:max-w-[400px] animate-in fade-in slide-in-from-bottom-5 duration-500">
      <Card className="border-2 border-green-600 shadow-2xl overflow-hidden bg-white/95 backdrop-blur-md">
        <CardContent className="p-4">
          <button 
            onClick={dismiss}
            className="absolute top-2 right-2 p-1 text-gray-400 hover:text-gray-600 rounded-full hover:bg-gray-100 transition-colors"
          >
            <X className="h-4 w-4" />
          </button>

          <div className="flex gap-4">
            <div className="h-12 w-12 rounded-2xl bg-green-600 flex items-center justify-center shrink-0 shadow-lg shadow-green-600/20">
              <Download className="h-6 w-6 text-white" />
            </div>
            
            <div className="flex-1 pr-6">
              <h3 className="text-sm font-bold text-gray-900 leading-tight">Install DigiFarm Agent</h3>
              <p className="text-xs text-gray-500 mt-1 leading-relaxed">
                Install as an app for an easier experience and offline access.
              </p>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-gray-100">
            {platform === 'ios' ? (
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-xs text-gray-600 bg-gray-50 p-2.5 rounded-xl">
                  <div className="h-6 w-6 rounded-lg bg-white shadow-sm flex items-center justify-center shrink-0">
                    <Share className="h-3.5 w-3.5 text-blue-500" />
                  </div>
                  <span>Tap the <strong>Share</strong> button in Safari</span>
                </div>
                <div className="flex items-center gap-3 text-xs text-gray-600 bg-gray-50 p-2.5 rounded-xl">
                  <div className="h-6 w-6 rounded-lg bg-white shadow-sm flex items-center justify-center shrink-0">
                    <PlusSquare className="h-3.5 w-3.5 text-gray-700" />
                  </div>
                  <span>Scroll down and tap <strong>Add to Home Screen</strong></span>
                </div>
                <Button 
                  onClick={dismiss}
                  className="w-full h-10 rounded-xl text-xs font-bold"
                >
                  Got it!
                </Button>
              </div>
            ) : (
              <div className="flex gap-2">
                <Button 
                  onClick={handleInstall}
                  className="flex-1 h-11 rounded-xl bg-green-600 hover:bg-green-700 text-sm font-bold shadow-md shadow-green-600/20"
                >
                  Install Now
                </Button>
                <Button 
                  variant="outline"
                  onClick={dismiss}
                  className="h-11 px-4 rounded-xl border-gray-100 text-sm font-bold"
                >
                  Later
                </Button>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
      
      {/* Visual arrow pointing towards mobile nav if on mobile */}
      <div className="flex justify-center mt-2 animate-bounce opacity-50 md:hidden">
        <div className="w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[8px] border-t-green-600"></div>
      </div>
    </div>
  )
}
