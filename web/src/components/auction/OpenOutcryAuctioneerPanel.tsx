'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Gavel, Timer, TrendingUp, Undo2 } from 'lucide-react'
import { OutcryBidFeed } from './OutcryBidFeed'
import { createClient } from '@/lib/supabase'
import { calculateNextBid, calculateIncrement, type OutcryConfig } from '@/lib/outcry-utils'
import type { OutcryBidEntry } from '@/hooks/useOpenOutcry'

interface OpenOutcryAuctioneerPanelProps {
  auctionId: string
  roundId: string | null
  basePrice: number
  outcryConfig: OutcryConfig
  currencyIcon?: string
  currencyName?: string
  onSold: () => void
  onDefer: () => void
  onUnsold: () => void
  onUndoLast: () => void
  canUndo: boolean
}

export function OpenOutcryAuctioneerPanel({
  auctionId,
  roundId,
  basePrice,
  outcryConfig,
  currencyIcon = '\u{1FA99}',
  currencyName = 'Coins',
  onSold,
  onDefer,
  onUnsold,
  onUndoLast,
  canUndo,
}: OpenOutcryAuctioneerPanelProps) {
  const [currentBid, setCurrentBid] = useState(basePrice)
  const [currentBidTeamName, setCurrentBidTeamName] = useState<string | null>(null)
  const [currentBidTeamId, setCurrentBidTeamId] = useState<string | null>(null)
  const [bidCount, setBidCount] = useState(0)
  const [bidSequence, setBidSequence] = useState<OutcryBidEntry[]>([])
  const [timerExpiresAt, setTimerExpiresAt] = useState<string | null>(null)
  const [timerSecondsLeft, setTimerSecondsLeft] = useState<number | null>(null)

  // Fetch initial state
  const fetchState = useCallback(async () => {
    try {
      const res = await fetch(`/api/auctions/${auctionId}/outcry/state`)
      if (!res.ok) return
      const data = await res.json()
      if (data.currentBid != null) setCurrentBid(data.currentBid)
      if (data.currentBidTeamName) setCurrentBidTeamName(data.currentBidTeamName)
      if (data.currentBidTeamId) setCurrentBidTeamId(data.currentBidTeamId)
      if (data.bidCount != null) setBidCount(data.bidCount)
      if (data.timerExpiresAt) setTimerExpiresAt(data.timerExpiresAt)
      if (data.recentBids) {
        setBidSequence(data.recentBids.map((b: any) => ({
          id: b.id,
          teamId: b.teamId,
          teamName: b.teamName,
          amount: b.amount,
          sequence: b.sequence,
          at: b.at,
        })))
      }
    } catch (e) {
      console.error('[OpenOutcryAuctioneerPanel] Failed to fetch state:', e)
    }
  }, [auctionId])

  // Fetch on mount and when roundId changes
  useEffect(() => {
    if (!roundId) {
      setCurrentBid(basePrice)
      setCurrentBidTeamName(null)
      setCurrentBidTeamId(null)
      setBidCount(0)
      setBidSequence([])
      setTimerExpiresAt(null)
      return
    }
    fetchState()
  }, [roundId, fetchState, basePrice])

  // Subscribe to outcry-bid broadcast events
  useEffect(() => {
    if (!auctionId || !roundId) return

    const supabase = createClient()
    const channel = supabase.channel(`auction-${auctionId}`)

    channel
      .on('broadcast', { event: 'outcry-bid' }, ({ payload }) => {
        if (payload.roundId !== roundId) return

        setCurrentBid(payload.amount)
        setCurrentBidTeamName(payload.teamName)
        setCurrentBidTeamId(payload.teamId)
        setBidCount(prev => Math.max(prev, payload.sequence))

        if (payload.timerExpiresAt) {
          setTimerExpiresAt(payload.timerExpiresAt)
        }

        setBidSequence(prev => {
          const entry: OutcryBidEntry = {
            id: payload.bidId,
            teamId: payload.teamId,
            teamName: payload.teamName,
            amount: payload.amount,
            sequence: payload.sequence,
            at: new Date().toISOString(),
          }
          return [entry, ...prev].slice(0, 50)
        })
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [auctionId, roundId])

  // Timer countdown
  useEffect(() => {
    if (!timerExpiresAt) {
      setTimerSecondsLeft(null)
      return
    }

    const updateTimer = () => {
      const remaining = Math.max(0, Math.floor((new Date(timerExpiresAt).getTime() - Date.now()) / 1000))
      setTimerSecondsLeft(remaining)
    }

    updateTimer()
    const interval = setInterval(updateTimer, 250)
    return () => clearInterval(interval)
  }, [timerExpiresAt])

  const increment = outcryConfig
    ? calculateIncrement(currentBid, basePrice, outcryConfig)
    : basePrice
  const nextBidAmount = bidCount === 0
    ? basePrice
    : (outcryConfig ? calculateNextBid(currentBid, basePrice, outcryConfig) : currentBid + basePrice)

  const timerPercent = timerSecondsLeft !== null && outcryConfig.timer_seconds
    ? (timerSecondsLeft / outcryConfig.timer_seconds) * 100
    : null

  const hasBids = bidCount > 0 && currentBidTeamName

  return (
    <div className="space-y-4">
      {/* Current Bid Display */}
      <div className={`relative rounded-xl border-2 p-5 ${
        hasBids
          ? 'border-emerald-500/50 bg-emerald-500/5'
          : 'border-border bg-card/50'
      }`}>
        {/* Timer bar */}
        {timerPercent !== null && (
          <div className="absolute top-0 left-0 right-0 h-1.5 rounded-t-xl overflow-hidden bg-muted/30">
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
            {bidCount > 0 && (
              <span className="text-xs">({bidCount} bids)</span>
            )}
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
          {hasBids ? (
            <div className="text-sm font-medium text-emerald-400">
              {currentBidTeamName} leads
            </div>
          ) : (
            <div className="text-sm text-muted-foreground">
              Base Price - Waiting for first bid
            </div>
          )}
        </div>

        {hasBids && (
          <div className="flex items-center justify-center gap-1.5 mt-2 text-xs text-muted-foreground">
            <TrendingUp className="w-3 h-3" />
            <span>Next raise: {currencyIcon} {nextBidAmount} (+{increment})</span>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-col gap-2">
        <div className="grid grid-cols-3 gap-2">
          <Button
            className="h-14 text-lg font-bold bg-success hover:bg-success/90 text-success-foreground"
            disabled={!hasBids}
            onClick={onSold}
          >
            {hasBids ? (
              <span className="flex flex-col items-center leading-tight">
                <span>SOLD</span>
                <span className="text-[10px] font-normal opacity-80">
                  {currencyIcon} {currentBid}
                </span>
              </span>
            ) : (
              'SOLD'
            )}
          </Button>
          <Button
            variant="outline"
            className="h-14 text-lg font-bold"
            onClick={onDefer}
          >
            DEFER
          </Button>
          <Button
            className="h-14 text-lg font-bold bg-destructive hover:bg-destructive/90 text-destructive-foreground"
            onClick={onUnsold}
          >
            UNSOLD
          </Button>
        </div>
        <Button
          variant="ghost"
          size="sm"
          className="self-center text-muted-foreground"
          disabled={!canUndo}
          onClick={onUndoLast}
        >
          <Undo2 className="h-4 w-4 mr-1" />
          Undo Last
        </Button>
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
          currencyIcon={currencyIcon}
          maxItems={20}
        />
      </div>
    </div>
  )
}
