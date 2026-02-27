'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { type OutcryBidEntry } from '@/hooks/useOpenOutcry'

interface OutcryBidFeedProps {
  bids: OutcryBidEntry[]
  currentTeamId?: string
  currencyIcon?: string
  maxItems?: number
}

export function OutcryBidFeed({
  bids,
  currentTeamId,
  currencyIcon = '\u{1FA99}',
  maxItems = 15,
}: OutcryBidFeedProps) {
  const displayBids = bids.slice(0, maxItems)

  if (displayBids.length === 0) {
    return (
      <div className="text-center py-6 text-muted-foreground text-sm">
        No bids yet. Waiting for first paddle raise...
      </div>
    )
  }

  return (
    <div className="space-y-1 max-h-[300px] overflow-y-auto pr-1">
      <AnimatePresence initial={false}>
        {displayBids.map((bid, index) => {
          const isLatest = index === 0
          const isMyTeam = bid.teamId === currentTeamId
          return (
            <motion.div
              key={`${bid.sequence}-${bid.teamId}`}
              initial={{ opacity: 0, x: -20, height: 0 }}
              animate={{ opacity: 1, x: 0, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2 }}
              className={`flex items-center justify-between px-3 py-2 rounded-lg text-sm ${
                isLatest
                  ? 'bg-primary/10 border border-primary/30'
                  : isMyTeam
                    ? 'bg-blue-500/5 border border-blue-500/20'
                    : 'bg-muted/30'
              }`}
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xs text-muted-foreground tabular-nums w-6 shrink-0">
                  #{bid.sequence}
                </span>
                <span className={`font-medium truncate ${isMyTeam ? 'text-blue-400' : 'text-foreground'}`}>
                  {bid.teamName}
                </span>
                {isLatest && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-primary text-primary-foreground shrink-0">
                    LEADING
                  </span>
                )}
              </div>
              <div className="flex items-center gap-1.5 shrink-0 ml-2">
                <span className="text-xs">{currencyIcon}</span>
                <span className="font-bold tabular-nums">{bid.amount}</span>
              </div>
            </motion.div>
          )
        })}
      </AnimatePresence>
    </div>
  )
}
