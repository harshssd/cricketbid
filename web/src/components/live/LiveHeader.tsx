'use client'

import { motion } from 'framer-motion'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Users } from 'lucide-react'
import type { LiveAuctionProgress } from '@/hooks/useLiveAuction'

interface LiveHeaderProps {
  auctionName: string
  progress: LiveAuctionProgress
  isConnected: boolean
  showSquads?: boolean
  onToggleSquads?: () => void
}

export function LiveHeader({ auctionName, progress, isConnected, showSquads, onToggleSquads }: LiveHeaderProps) {
  const progressPct = progress.total > 0 ? (progress.sold / progress.total) * 100 : 0

  return (
    <div className="bg-card shadow-sm border-b">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center gap-3">
            {isConnected && (
              <span className="relative flex h-3 w-3 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-destructive opacity-75" />
                <span className="relative inline-flex rounded-full h-3 w-3 bg-destructive" />
              </span>
            )}
            <div>
              <h1 className="text-2xl font-bold text-foreground">
                {auctionName || 'Live Auction'}
              </h1>
              <p className="text-sm text-muted-foreground">
                {progress.sold}/{progress.total} players sold
              </p>
            </div>
          </div>

          <div className="flex items-center gap-4">
            {/* Desktop progress bar */}
            <div className="hidden lg:flex items-center gap-3">
              <div className="w-32 h-2 rounded-full bg-muted overflow-hidden">
                <motion.div
                  className="h-full rounded-full bg-primary"
                  initial={false}
                  animate={{ width: `${progressPct}%` }}
                  transition={{ type: 'spring', stiffness: 200, damping: 25 }}
                />
              </div>
            </div>
            {onToggleSquads && (
              <Button
                variant={showSquads ? 'default' : 'outline'}
                size="sm"
                onClick={onToggleSquads}
                className="gap-1.5"
              >
                <Users className="w-3.5 h-3.5" />
                Squads
              </Button>
            )}
            <Badge variant="default">Live</Badge>
          </div>
        </div>
      </div>
    </div>
  )
}
