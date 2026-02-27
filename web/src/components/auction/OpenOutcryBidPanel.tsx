'use client'

import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Gavel, Timer, TrendingUp, AlertCircle } from 'lucide-react'
import { useOpenOutcry, type UseOpenOutcryOptions } from '@/hooks/useOpenOutcry'
import { OutcryBidFeed } from './OutcryBidFeed'

interface OpenOutcryBidPanelProps extends UseOpenOutcryOptions {
  teamName: string
  currencyIcon?: string
  currencyName?: string
}

export function OpenOutcryBidPanel({
  teamName,
  currencyIcon = '\u{1FA99}',
  currencyName = 'Coins',
  ...outcryOptions
}: OpenOutcryBidPanelProps) {
  const {
    currentBid,
    currentBidTeam,
    nextBidAmount,
    increment,
    canRaise,
    cantRaiseReason,
    timerSecondsLeft,
    bidSequence,
    raisePaddle,
    isRaising,
  } = useOpenOutcry(outcryOptions)

  const isLeading = currentBidTeam?.id === outcryOptions.teamId
  const timerPercent = timerSecondsLeft !== null && outcryOptions.outcryConfig.timer_seconds
    ? (timerSecondsLeft / outcryOptions.outcryConfig.timer_seconds) * 100
    : null

  return (
    <div className="space-y-4">
      {/* Current Bid Display */}
      <div className={`relative rounded-xl border-2 p-5 ${
        isLeading
          ? 'border-emerald-500/50 bg-emerald-500/5'
          : currentBidTeam
            ? 'border-amber-500/50 bg-amber-500/5'
            : 'border-border bg-card/50'
      }`}>
        {/* Timer bar */}
        {timerPercent !== null && (
          <div className="absolute top-0 left-0 right-0 h-1 rounded-t-xl overflow-hidden bg-muted/30">
            <motion.div
              className={`h-full ${
                timerPercent > 50 ? 'bg-emerald-500' :
                timerPercent > 25 ? 'bg-amber-500' :
                'bg-red-500'
              }`}
              initial={false}
              animate={{ width: `${timerPercent}%` }}
              transition={{ duration: 0.3 }}
            />
          </div>
        )}

        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Gavel className="w-4 h-4" />
            <span>Current Bid</span>
          </div>
          {timerSecondsLeft !== null && (
            <div className={`flex items-center gap-1.5 text-sm font-mono ${
              timerSecondsLeft <= 5 ? 'text-red-400 animate-pulse' :
              timerSecondsLeft <= 10 ? 'text-amber-400' :
              'text-muted-foreground'
            }`}>
              <Timer className="w-3.5 h-3.5" />
              <span className="tabular-nums">{timerSecondsLeft}s</span>
            </div>
          )}
        </div>

        <div className="text-center">
          <div className="text-4xl font-bold tabular-nums mb-1">
            {currencyIcon} {currentBid}
          </div>
          {currentBidTeam ? (
            <div className={`text-sm font-medium ${isLeading ? 'text-emerald-400' : 'text-amber-400'}`}>
              {isLeading ? 'Your team leads!' : `${currentBidTeam.name} leads`}
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              Base Price - Waiting for first bid
            </div>
          )}
        </div>
      </div>

      {/* Raise Paddle Button */}
      <div className="space-y-2">
        <Button
          onClick={raisePaddle}
          disabled={!canRaise}
          className={`w-full h-16 text-lg font-bold transition-all ${
            canRaise
              ? 'bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25'
              : ''
          }`}
          size="lg"
        >
          {isRaising ? (
            <span className="flex items-center gap-2">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                className="w-5 h-5 border-2 border-current border-t-transparent rounded-full"
              />
              Raising...
            </span>
          ) : (
            <span className="flex items-center gap-2">
              <TrendingUp className="w-5 h-5" />
              RAISE PADDLE
              <span className="text-primary-foreground/80 ml-1">
                {currencyIcon} {nextBidAmount}
              </span>
            </span>
          )}
        </Button>

        {!canRaise && cantRaiseReason && (
          <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <AlertCircle className="w-3 h-3" />
            <span>{cantRaiseReason}</span>
          </div>
        )}

        <div className="flex items-center justify-between text-xs text-muted-foreground px-1">
          <span>Increment: +{increment} {currencyName}</span>
          <span>Budget: {currencyIcon} {outcryOptions.budgetRemaining}</span>
        </div>
      </div>

      {/* Live Bid Feed */}
      <div className="border rounded-xl p-3 bg-card/50">
        <div className="flex items-center gap-2 mb-3 text-sm font-semibold text-muted-foreground">
          <Gavel className="w-3.5 h-3.5" />
          Live Bid Feed
          {bidSequence.length > 0 && (
            <span className="text-xs font-normal">({bidSequence.length})</span>
          )}
        </div>
        <OutcryBidFeed
          bids={bidSequence}
          currentTeamId={outcryOptions.teamId}
          currencyIcon={currencyIcon}
        />
      </div>
    </div>
  )
}
