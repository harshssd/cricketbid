'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import { calculateNextBid, calculateIncrement, type OutcryConfig } from '@/lib/outcry-utils'

export interface OutcryBidEntry {
  id?: string
  teamId: string
  teamName: string
  amount: number
  sequence: number
  at: string
}

export interface UseOpenOutcryOptions {
  auctionId: string
  teamId: string
  roundId: string | null
  basePrice: number
  currentBidAmount: number
  currentBidTeamId: string | null
  bidCount: number
  outcryConfig: OutcryConfig
  budgetRemaining: number
  timerExpiresAt?: string | null
  enabled?: boolean
}

export interface UseOpenOutcryReturn {
  currentBid: number
  currentBidTeam: { id: string; name: string } | null
  nextBidAmount: number
  increment: number
  canRaise: boolean
  cantRaiseReason?: string
  timerSecondsLeft: number | null
  bidSequence: OutcryBidEntry[]
  raisePaddle: () => Promise<boolean>
  isRaising: boolean
}

export function useOpenOutcry(options: UseOpenOutcryOptions): UseOpenOutcryReturn {
  const {
    auctionId,
    teamId,
    roundId,
    basePrice: initialBasePrice,
    currentBidAmount: initialBidAmount,
    currentBidTeamId: initialBidTeamId,
    bidCount: initialBidCount,
    outcryConfig,
    budgetRemaining,
    timerExpiresAt: initialTimerExpiresAt,
    enabled = true,
  } = options

  // Local state that can be updated optimistically by realtime events
  const [currentBid, setCurrentBid] = useState(initialBidAmount)
  const [currentBidTeamId, setCurrentBidTeamId] = useState<string | null>(initialBidTeamId)
  const [currentBidTeamName, setCurrentBidTeamName] = useState<string | null>(null)
  const [bidCount, setBidCount] = useState(initialBidCount)
  const [timerExpiresAt, setTimerExpiresAt] = useState<string | null>(initialTimerExpiresAt || null)
  const [timerSecondsLeft, setTimerSecondsLeft] = useState<number | null>(null)
  const [bidSequence, setBidSequence] = useState<OutcryBidEntry[]>([])
  const [isRaising, setIsRaising] = useState(false)
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Sync from props when server data changes
  useEffect(() => {
    setCurrentBid(initialBidAmount)
    setCurrentBidTeamId(initialBidTeamId)
    setBidCount(initialBidCount)
    if (initialTimerExpiresAt) {
      setTimerExpiresAt(initialTimerExpiresAt)
    }
  }, [initialBidAmount, initialBidTeamId, initialBidCount, initialTimerExpiresAt])

  // Timer countdown
  useEffect(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current)
      timerRef.current = null
    }

    if (!timerExpiresAt) {
      setTimerSecondsLeft(null)
      return
    }

    const updateTimer = () => {
      const remaining = Math.max(0, Math.floor((new Date(timerExpiresAt).getTime() - Date.now()) / 1000))
      setTimerSecondsLeft(remaining)
      if (remaining <= 0 && timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }

    updateTimer()
    timerRef.current = setInterval(updateTimer, 250)

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current)
        timerRef.current = null
      }
    }
  }, [timerExpiresAt])

  // Fetch initial bid sequence + subscribe to realtime
  useEffect(() => {
    if (!enabled || !auctionId || !roundId) return

    // Fetch initial state
    fetch(`/api/auctions/${auctionId}/outcry/state`)
      .then(res => res.json())
      .then(data => {
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
        if (data.currentBid != null) setCurrentBid(data.currentBid)
        if (data.currentBidTeamId) setCurrentBidTeamId(data.currentBidTeamId)
        if (data.currentBidTeamName) setCurrentBidTeamName(data.currentBidTeamName)
        if (data.bidCount != null) setBidCount(data.bidCount)
        if (data.timerExpiresAt) setTimerExpiresAt(data.timerExpiresAt)
      })
      .catch(console.error)

    // Subscribe to outcry-bid events for optimistic updates
    const supabase = createClient()
    const channel = supabase.channel(`auction-${auctionId}`)

    channel
      .on('broadcast', { event: 'outcry-bid' }, ({ payload }) => {
        if (payload.roundId !== roundId) return

        // Optimistic update from broadcast
        setCurrentBid(payload.amount)
        setCurrentBidTeamId(payload.teamId)
        setCurrentBidTeamName(payload.teamName)
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
          // Add to front (most recent first), limit to 50
          return [entry, ...prev].slice(0, 50)
        })
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [enabled, auctionId, roundId])

  // Calculate derived values
  const basePrice = initialBasePrice
  const increment = outcryConfig
    ? calculateIncrement(currentBid, basePrice, outcryConfig)
    : basePrice
  const nextBidAmount = bidCount === 0
    ? basePrice
    : (outcryConfig ? calculateNextBid(currentBid, basePrice, outcryConfig) : currentBid + basePrice)

  // Can raise?
  let canRaise = true
  let cantRaiseReason: string | undefined

  if (!roundId) {
    canRaise = false
    cantRaiseReason = 'No active round'
  } else if (currentBidTeamId === teamId) {
    canRaise = false
    cantRaiseReason = 'Your team already leads'
  } else if (nextBidAmount > budgetRemaining) {
    canRaise = false
    cantRaiseReason = 'Insufficient budget'
  } else if (timerSecondsLeft !== null && timerSecondsLeft <= 0) {
    canRaise = false
    cantRaiseReason = 'Timer expired'
  } else if (isRaising) {
    canRaise = false
    cantRaiseReason = 'Submitting...'
  }

  const raisePaddle = useCallback(async (): Promise<boolean> => {
    if (!canRaise || !roundId) return false

    setIsRaising(true)
    try {
      const res = await fetch(`/api/auctions/${auctionId}/outcry/raise`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teamId }),
      })

      if (!res.ok) {
        const err = await res.json()
        console.error('[useOpenOutcry] Raise failed:', err)
        return false
      }

      const data = await res.json()

      // Optimistic local update (broadcast will also update, but this is instant)
      setCurrentBid(data.amount)
      setCurrentBidTeamId(teamId)
      setBidCount(data.sequence)
      if (data.timerExpiresAt) {
        setTimerExpiresAt(data.timerExpiresAt)
      }

      return true
    } catch (error) {
      console.error('[useOpenOutcry] Raise error:', error)
      return false
    } finally {
      setIsRaising(false)
    }
  }, [canRaise, roundId, auctionId, teamId])

  return {
    currentBid,
    currentBidTeam: currentBidTeamId
      ? { id: currentBidTeamId, name: currentBidTeamName || 'Unknown' }
      : null,
    nextBidAmount,
    increment,
    canRaise,
    cantRaiseReason,
    timerSecondsLeft,
    bidSequence,
    raisePaddle,
    isRaising,
  }
}
