'use client'

import { useState, useEffect, useRef, useCallback } from 'react'

// ── Types ─────────────────────────────────────────────────────────

export interface PlayerInfo {
  id: string
  name: string
  image?: string
  playingRole: 'BATSMAN' | 'BOWLER' | 'ALL_ROUNDER' | 'WICKETKEEPER'
  battingStyle?: string
  bowlingStyle?: string
  customTags?: string
  status: 'AVAILABLE' | 'SOLD' | 'UNSOLD'
  tier: {
    id: string
    name: string
    basePrice: number
    color: string
  }
}

export interface SquadPlayer extends PlayerInfo {
  acquiredPrice: number
  acquiredAt: string
  roundId: string
}

export interface TeamInfo {
  id: string
  name: string
  primaryColor?: string
  secondaryColor?: string
  logo?: string
  remainingBudget: number
  totalBudget: number
  playerCount: number
  squadSize: number
  captain?: {
    id: string
    name: string
    image?: string
  }
}

export interface TierRequirement {
  id: string
  name: string
  basePrice: number
  color: string
  icon?: string
  sortOrder: number
  minPerTeam: number
  maxPerTeam: number
  totalPlayers: number
  availablePlayers: number
  acquiredCount: number
  fulfilled: boolean
}

export interface CurrentRound {
  id: string
  playerId: string
  tierId: string
  status: 'OPEN' | 'CLOSED' | 'PENDING'
  timeRemaining: number
  maxTime: number
  player: PlayerInfo
  tier: {
    id: string
    name: string
    basePrice: number
    color: string
  }
  myBid?: {
    amount: number
    submittedAt: string
    status: 'SUBMITTED' | 'WINNING' | 'OUTBID'
  }
  highestBid?: number
  totalBids: number
}

export interface BidHistoryEntry {
  roundId: string
  playerId: string
  playerName: string
  playerRole: string
  tierName: string
  tierColor: string
  bidAmount: number
  wasWinning: boolean
  result: 'WON' | 'LOST' | 'PENDING'
  winningAmount?: number
  submittedAt: string
}

export interface BudgetAnalytics {
  totalBudget: number
  spent: number
  remaining: number
  percentSpent: number
  percentRemaining: number
  slotsRemaining: number
  mandatoryReserve: number
  maxAllowableBid: number
  avgSpendPerPlayer: number
  avgRemainingPerSlot: number
  budgetHealth: 'healthy' | 'caution' | 'critical'
}

export interface SquadComposition {
  batsmen: number
  bowlers: number
  allRounders: number
  wicketkeepers: number
  total: number
  targetSize: number
}

export interface AuctionProgress {
  totalPlayers: number
  soldPlayers: number
  unsoldPlayers: number
  availablePlayers: number
  currentRoundNumber: number
  totalRounds: number
}

export interface SwitchableTeam {
  id: string
  name: string
  primaryColor?: string
  secondaryColor?: string
  playerCount: number
}

export interface CaptainSessionData {
  id: string
  accessRole: 'CAPTAIN' | 'VICE_CAPTAIN' | 'AUCTION_ADMIN' | 'AUCTION_OWNER'
  isAdminViewing: boolean
  switchableTeams?: SwitchableTeam[]
  auction: {
    id: string
    name: string
    status: 'DRAFT' | 'LOBBY' | 'LIVE' | 'COMPLETED' | 'ARCHIVED'
    currencyName: string
    currencyIcon: string
    squadSize: number
  }
  team: TeamInfo
  currentRound?: CurrentRound
  squad: SquadPlayer[]
  bidHistory: BidHistoryEntry[]
  tierRequirements: TierRequirement[]
  budgetAnalytics: BudgetAnalytics
  squadComposition: SquadComposition
  auctionProgress: AuctionProgress
  otherTeams: Array<{
    id: string
    name: string
    playerCount: number
    primaryColor?: string
  }>
  isConnected: boolean
}

// ── Hook ──────────────────────────────────────────────────────────

export interface TeamSelectionOption {
  id: string
  name: string
  primaryColor?: string
  secondaryColor?: string
  captainName?: string
  playerCount: number
}

interface UseCaptainSessionOptions {
  pollingInterval?: number
  enabled?: boolean
}

interface UseCaptainSessionReturn {
  session: CaptainSessionData | null
  loading: boolean
  error: string | null
  timeLeft: number
  submitBid: (amount: number) => Promise<boolean>
  isSubmitting: boolean
  refresh: () => Promise<void>
  needsTeamSelection: boolean
  teamOptions: TeamSelectionOption[]
  auctionIdForSelection: string | null
}

export function useCaptainSession(
  sessionId: string,
  options: UseCaptainSessionOptions = {}
): UseCaptainSessionReturn {
  const { pollingInterval = 15000, enabled = true } = options

  const [session, setSession] = useState<CaptainSessionData | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [timeLeft, setTimeLeft] = useState(0)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [needsTeamSelection, setNeedsTeamSelection] = useState(false)
  const [teamOptions, setTeamOptions] = useState<TeamSelectionOption[]>([])
  const [auctionIdForSelection, setAuctionIdForSelection] = useState<string | null>(null)

  const intervalRef = useRef<NodeJS.Timeout | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const mountedRef = useRef(true)

  const fetchSession = useCallback(async () => {
    if (!sessionId || !enabled) return

    try {
      const response = await fetch(`/api/captain/${sessionId}`)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error || `HTTP ${response.status}`)
      }

      const data = await response.json()
      if (!mountedRef.current) return

      // Handle team selection response
      if (data.needsTeamSelection) {
        setNeedsTeamSelection(true)
        setTeamOptions(data.teams || [])
        setAuctionIdForSelection(data.auctionId)
        setLoading(false)
        return
      }

      setNeedsTeamSelection(false)
      setSession(data)
      setError(null)

      if (data.currentRound?.status === 'OPEN' && data.currentRound.timeRemaining > 0) {
        setTimeLeft(data.currentRound.timeRemaining)
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
  }, [sessionId, enabled])

  const submitBid = useCallback(async (amount: number): Promise<boolean> => {
    if (!session?.currentRound) return false

    // Build the proper sessionId for bid endpoint (needs auctionId_teamId format)
    const bidSessionId = `${session.auction.id}_${session.team.id}`

    try {
      setIsSubmitting(true)
      const response = await fetch(`/api/captain/${bidSessionId}/bid`, {
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

  // Timer countdown
  useEffect(() => {
    if (timeLeft > 0 && session?.currentRound?.status === 'OPEN') {
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

    if (session?.auction.status === 'LIVE') {
      intervalRef.current = setInterval(fetchSession, pollingInterval)
    }

    return () => {
      mountedRef.current = false
      if (intervalRef.current) clearInterval(intervalRef.current)
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [sessionId, session?.auction.status, pollingInterval])

  return {
    session,
    loading,
    error,
    timeLeft,
    submitBid,
    isSubmitting,
    refresh: fetchSession,
    needsTeamSelection,
    teamOptions,
    auctionIdForSelection,
  }
}
