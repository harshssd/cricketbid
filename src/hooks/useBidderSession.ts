'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase'

// ── Types ─────────────────────────────────────────────────────────

export interface BidderPlayerInfo {
  id: string
  name: string
  image?: string
  playingRole: 'BATSMAN' | 'BOWLER' | 'ALL_ROUNDER' | 'WICKETKEEPER'
  battingStyle?: string
  bowlingStyle?: string
  customTags?: string
  tier: {
    id: string
    name: string
    basePrice: number
    color: string
  } | null
}

export interface BidderSquadPlayer {
  id: string
  name: string
  image?: string
  playingRole: string
  tier: {
    id: string
    name: string
    basePrice: number
    color: string
  } | null
  acquiredPrice: number
}

export interface BidderCurrentRound {
  id: string
  playerId?: string
  tierId: string
  status: 'OPEN' | 'CLOSED' | 'PENDING'
  timeRemaining: number | null
  maxTime: number
  player: BidderPlayerInfo | null
  tier: {
    id: string
    name: string
    basePrice: number
    color: string
  } | null
  myBid?: {
    amount: number
    submittedAt: string
    status: string
  }
  highestBid?: number
  totalBids: number
}

export interface AllTeamSquadEntry {
  id: string
  name: string
  budgetRemaining: number
  captainPlayer: { id: string; name: string; playingRole: string } | null
  players: Array<{ id: string; name: string; playingRole: string; acquiredPrice: number }>
  playerCount: number
  isCurrentTeam: boolean
}

export interface BidderSessionData {
  auction: {
    id: string
    name: string
    status: 'DRAFT' | 'LOBBY' | 'LIVE' | 'COMPLETED' | 'ARCHIVED'
    currencyName: string
    currencyIcon: string
    squadSize: number
  }
  team: {
    id: string
    name: string
    primaryColor?: string
    secondaryColor?: string
    logo?: string
    captainId?: string
  }
  currentRound: BidderCurrentRound | null
  budgetSummary: {
    totalBudget: number
    spent: number
    remaining: number
    percentRemaining: number
    slotsRemaining: number
    maxAllowableBid: number
  }
  squad: BidderSquadPlayer[]
  allTeamSquads: AllTeamSquadEntry[]
  auctionProgress: {
    totalPlayers: number
    soldPlayers: number
    availablePlayers: number
    currentRoundNumber: number
    totalRounds: number
  }
}

// ── Hook ──────────────────────────────────────────────────────────

interface UseBidderSessionOptions {
  pollingInterval?: number
}

interface UseBidderSessionReturn {
  session: BidderSessionData | null
  loading: boolean
  error: string | null
  timeLeft: number
  submitBid: (amount: number) => Promise<boolean>
  isSubmitting: boolean
  refresh: () => Promise<void>
}

export function useBidderSession(
  sessionId: string,
  options: UseBidderSessionOptions = {}
): UseBidderSessionReturn {
  const { pollingInterval = 3000 } = options

  const [session, setSession] = useState<BidderSessionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeLeft, setTimeLeft] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const mountedRef = useRef(true)

  const fetchSession = useCallback(async () => {
    if (!sessionId) return

    try {
      const response = await fetch(`/api/bid/${sessionId}`)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      const data = await response.json()
      if (!mountedRef.current) return

      setSession(data)
      setError(null)

      if (data.currentRound?.status === 'OPEN') {
        if (data.currentRound.timeRemaining === null) {
          // No timer — round stays open until auctioneer closes it
          setTimeLeft(Infinity)
        } else if (data.currentRound.timeRemaining > 0) {
          setTimeLeft(data.currentRound.timeRemaining)
        } else {
          setTimeLeft(0)
        }
      } else if (data.currentRound?.status !== 'OPEN') {
        setTimeLeft(0)
      }
    } catch (err) {
      if (!mountedRef.current) return
      const message = err instanceof Error ? err.message : 'Failed to load session'
      setError(message)
    } finally {
      if (mountedRef.current) {
        setLoading(false)
      }
    }
  }, [sessionId])

  const submitBid = useCallback(async (amount: number): Promise<boolean> => {
    if (!session?.currentRound) return false

    try {
      setIsSubmitting(true)
      const response = await fetch(`/api/bid/${sessionId}/bid`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          roundId: session.currentRound.id,
          playerId: session.currentRound.playerId,
          amount,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || 'Failed to submit bid')
      }

      // Refresh session data after successful bid
      await fetchSession()
      return true
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Bid failed'
      throw new Error(message)
    } finally {
      setIsSubmitting(false)
    }
  }, [session, sessionId, fetchSession])

  // Timer countdown (no-op when timeLeft is Infinity — round open indefinitely)
  useEffect(() => {
    if (timeLeft > 0 && timeLeft !== Infinity && session?.currentRound?.status === 'OPEN') {
      timerRef.current = setTimeout(() => {
        setTimeLeft(prev => Math.max(0, prev - 1))
      }, 1000)
    }
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [timeLeft, session?.currentRound?.status])

  // Initial fetch + polling
  useEffect(() => {
    mountedRef.current = true
    fetchSession()

    // Always poll when session is live, or poll initially to detect status changes
    const shouldPoll = !session || session.auction.status === 'LIVE' || session.auction.status === 'LOBBY'
    if (shouldPoll) {
      intervalRef.current = setInterval(fetchSession, pollingInterval)
    }

    return () => {
      mountedRef.current = false
      if (intervalRef.current) clearInterval(intervalRef.current)
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [sessionId, session?.auction.status, pollingInterval])

  // Supabase Realtime subscription for instant updates
  useEffect(() => {
    if (!session?.auction.id) return

    const supabase = createClient()
    const channel = supabase.channel(`auction-${session.auction.id}`)

    channel
      .on('broadcast', { event: 'auction-state' }, () => {
        // Auction state changed — re-fetch
        fetchSession()
      })
      .on('broadcast', { event: 'bid-update' }, () => {
        // New bid placed — re-fetch to get updated round data
        fetchSession()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [session?.auction.id, fetchSession])

  return {
    session,
    loading,
    error,
    timeLeft,
    submitBid,
    isSubmitting,
    refresh: fetchSession,
  }
}
