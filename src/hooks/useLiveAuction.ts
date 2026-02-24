'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { createClient } from '@/lib/supabase'
import type { AuctionState } from '@/lib/auction-realtime'

export type ViewState = 'connecting' | 'waiting' | 'player_up' | 'sold_celebration' | 'between_bids' | 'auction_complete'

export interface PlayerDetails {
  name: string
  image?: string | null
  playingRole: string
  battingStyle?: string | null
  bowlingStyle?: string | null
  tier?: { name: string; color: string; basePrice: number } | null
}

export interface LiveTeamCaptain {
  name: string
  role?: string
}

export interface LiveTeam {
  name: string
  color: string
  coins: number
  originalCoins: number
  players: Array<{ name: string; price: number; role?: string }>
  captain?: LiveTeamCaptain | null
}

export interface LastSoldEvent {
  player: string
  team: string
  teamColor: string
  price: number
}

export interface LiveAuctionProgress {
  sold: number
  total: number
  unsold: number
}

const TEAM_COLORS = [
  '#3b82f6', '#ef4444', '#22c55e', '#f59e0b',
  '#8b5cf6', '#ec4899', '#06b6d4', '#f97316',
]

export function useLiveAuction(auctionId: string) {
  const [viewState, setViewState] = useState<ViewState>('connecting')
  const [auctionState, setAuctionState] = useState<AuctionState | null>(null)
  const [playerMap, setPlayerMap] = useState<Map<string, PlayerDetails>>(new Map())
  const [auctionName, setAuctionName] = useState('')
  const [isConnected, setIsConnected] = useState(false)
  const [lastSoldEvent, setLastSoldEvent] = useState<LastSoldEvent | null>(null)

  const [teamCaptainMap, setTeamCaptainMap] = useState<Map<string, LiveTeamCaptain>>(new Map())

  const mountedRef = useRef(true)
  const prevSoldCountRef = useRef(0)
  const prevAuctionIndexRef = useRef(0)
  const isFirstStateRef = useRef(true)
  const timersRef = useRef<NodeJS.Timeout[]>([])
  const teamColorMapRef = useRef<Map<string, string>>(new Map())
  const handleStateRef = useRef<(state: AuctionState) => void>(() => {})
  const viewStateRef = useRef<ViewState>('connecting')

  const setView = useCallback((v: ViewState) => {
    viewStateRef.current = v
    setViewState(v)
  }, [])

  const clearTimers = useCallback(() => {
    timersRef.current.forEach(t => clearTimeout(t))
    timersRef.current = []
  }, [])

  const getTeamColor = useCallback((teamName: string) => {
    if (teamColorMapRef.current.has(teamName)) {
      return teamColorMapRef.current.get(teamName)!
    }
    const idx = teamColorMapRef.current.size % TEAM_COLORS.length
    const color = TEAM_COLORS[idx]
    teamColorMapRef.current.set(teamName, color)
    return color
  }, [])

  // Fetch auction data from REST API, build AuctionState, and feed to handleState
  const fetchAndHandleState = useCallback(async () => {
    try {
      const res = await fetch(`/api/auctions/${auctionId}`)
      if (!res.ok) throw new Error('Failed to fetch')
      const data = await res.json()

      if (!mountedRef.current) return

      setAuctionName(data.name)

      const map = new Map<string, PlayerDetails>()
      for (const p of data.players || []) {
        const details: PlayerDetails = {
          name: p.name,
          image: p.image,
          playingRole: p.playingRole || 'BATSMAN',
          battingStyle: p.battingStyle,
          bowlingStyle: p.bowlingStyle,
          tier: p.tier,
        }
        map.set(p.name, details)
        // Also index by ID for formal model lookups
        map.set(p.id, details)
      }
      setPlayerMap(map)

      const captainMap = new Map<string, LiveTeamCaptain>()
      for (const team of data.teams || []) {
        getTeamColor(team.name)
        if (team.captainPlayer) {
          captainMap.set(team.name, {
            name: team.captainPlayer.name,
            role: team.captainPlayer.playingRole,
          })
        }
      }
      setTeamCaptainMap(captainMap)

      // Build AuctionState from the REST API data
      const queueState = data.queueState || {}
      const soldPlayers = (data.players || [])
        .filter((p: any) => p.status === 'SOLD' && p.assignedTeam)
        .map((p: any) => {
          const team = (data.teams || []).find((t: any) => t.id === p.assignedTeam?.id)
          const result = (team?.players || []).find((tp: any) => tp.id === p.id)
          return {
            playerId: p.id,
            playerName: p.name,
            teamId: p.assignedTeam.id,
            teamName: p.assignedTeam.name,
            price: result?.price || 0,
          }
        })

      const state: AuctionState = {
        id: data.id || auctionId,
        name: data.name || '',
        status: data.status || 'DRAFT',
        teams: (data.teams || []).map((t: any) => ({
          id: t.id,
          name: t.name,
          coins: t.budgetRemaining ?? data.budgetPerTeam ?? 0,
          originalCoins: data.budgetPerTeam ?? 0,
          players: (t.players || []).map((p: any) => ({
            id: p.id || '',
            name: p.name || 'Unknown',
            price: p.price || 0,
          })),
        })),
        currentRound: null,
        soldPlayers,
        unsoldPlayers: queueState.unsoldPlayers || [],
        deferredPlayers: queueState.deferredPlayers || [],
        auctionHistory: queueState.auctionHistory || [],
        auctionQueue: queueState.auctionQueue || [],
        auctionIndex: queueState.auctionIndex ?? 0,
        auctionStarted: queueState.auctionStarted ?? false,
        lastUpdated: new Date().toISOString(),
      }

      // Deliver via the handleState ref so view transitions work correctly
      handleStateRef.current(state)
    } catch (err) {
      console.error('Failed to fetch auction data:', err)
    }
  }, [auctionId, getTeamColor])

  // Initial fetch on mount
  useEffect(() => {
    mountedRef.current = true
    fetchAndHandleState()
    return () => { mountedRef.current = false }
  }, [fetchAndHandleState])

  // handleState: process AuctionState into view transitions
  useEffect(() => {
    mountedRef.current = true
    isFirstStateRef.current = true

    const handleState = (state: AuctionState) => {
      if (!mountedRef.current) return

      setIsConnected(true)
      setAuctionState(state)

      const soldCount = state.soldPlayers?.length || 0
      const auctionIdx = state.auctionIndex ?? 0
      const queueLen = state.auctionQueue?.length || 0

      // First state received — no transitions, just set the right view
      if (isFirstStateRef.current) {
        isFirstStateRef.current = false
        prevSoldCountRef.current = soldCount
        prevAuctionIndexRef.current = auctionIdx

        if (!state.auctionStarted) {
          setView('waiting')
        } else if (auctionIdx >= queueLen && queueLen > 0) {
          setView('auction_complete')
        } else {
          setView('player_up')
        }
        return
      }

      // Not started
      if (!state.auctionStarted) {
        clearTimers()
        setView('waiting')
        prevSoldCountRef.current = soldCount
        prevAuctionIndexRef.current = auctionIdx
        return
      }

      // Auction complete
      if (auctionIdx >= queueLen && queueLen > 0) {
        clearTimers()
        setView('auction_complete')
        prevSoldCountRef.current = soldCount
        prevAuctionIndexRef.current = auctionIdx
        return
      }

      // Detect new sale from sold count growth
      if (soldCount > prevSoldCountRef.current) {
        const latestSold = state.soldPlayers[soldCount - 1]

        if (latestSold) {
          clearTimers()
          setLastSoldEvent({
            player: latestSold.playerName,
            team: latestSold.teamName,
            teamColor: getTeamColor(latestSold.teamName),
            price: latestSold.price,
          })
          setView('sold_celebration')

          const t1 = setTimeout(() => {
            if (!mountedRef.current) return
            setView('between_bids')
          }, 3500)
          timersRef.current.push(t1)
        }

        prevSoldCountRef.current = soldCount
        prevAuctionIndexRef.current = auctionIdx
        return
      }

      // Detect index advance without sale (unsold/deferred)
      if (auctionIdx > prevAuctionIndexRef.current) {
        clearTimers()
        setView('between_bids')

        prevSoldCountRef.current = soldCount
        prevAuctionIndexRef.current = auctionIdx
        return
      }

      // Fallthrough: advance from between_bids when next player is ready
      if (viewStateRef.current === 'between_bids'
        && state.auctionStarted
        && auctionIdx < queueLen) {
        setView('player_up')
      }

      // Update refs
      prevSoldCountRef.current = soldCount
      prevAuctionIndexRef.current = auctionIdx
    }

    handleStateRef.current = handleState
  }, [getTeamColor, clearTimers, setView])

  // Direct Supabase realtime subscription (same pattern as bidder)
  // On any broadcast event, re-fetch from REST API for reliable state
  useEffect(() => {
    if (!auctionId) return

    const supabase = createClient()
    const channel = supabase.channel(`auction-${auctionId}`)

    channel
      .on('broadcast', { event: 'auction-state' }, () => {
        fetchAndHandleState()
      })
      .on('broadcast', { event: 'bid-update' }, () => {
        fetchAndHandleState()
      })
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [auctionId, fetchAndHandleState])

  // Poll as fallback (every 10s)
  useEffect(() => {
    if (!auctionId) return

    const poll = setInterval(fetchAndHandleState, 10000)
    return () => clearInterval(poll)
  }, [auctionId, fetchAndHandleState])

  // Derived values
  const currentPlayerName = auctionState?.auctionStarted
    && auctionState.auctionIndex < (auctionState.auctionQueue?.length || 0)
    ? auctionState.auctionQueue[auctionState.auctionIndex]
    : null

  // Look up by ID first (formal model uses IDs), then by name (legacy)
  const currentPlayer: PlayerDetails | null = currentPlayerName
    ? playerMap.get(currentPlayerName) || { name: currentPlayerName, playingRole: 'BATSMAN' }
    : null

  const teams: LiveTeam[] = (auctionState?.teams || []).map((t) => ({
    name: t.name,
    color: getTeamColor(t.name),
    coins: t.coins,
    originalCoins: t.originalCoins,
    players: t.players.map(p => ({
      name: p.name,
      price: p.price,
      role: playerMap.get(p.name)?.playingRole || playerMap.get(p.id)?.playingRole,
    })),
    captain: teamCaptainMap.get(t.name) || null,
  }))

  // Exclude captain players from the queue total
  const captainNames = new Set([...teamCaptainMap.values()].map(c => c.name))
  const queueTotal = auctionState?.auctionQueue
    ? auctionState.auctionQueue.filter((id: string) => {
        const player = playerMap.get(id)
        return !player || !captainNames.has(player.name)
      }).length
    : 0

  const progress: LiveAuctionProgress = {
    sold: auctionState?.soldPlayers?.length || 0,
    total: queueTotal,
    unsold: auctionState?.unsoldPlayers?.length || 0,
  }

  return {
    viewState,
    auctionName: auctionName || auctionState?.name || '',
    currentPlayer,
    teams,
    lastSoldEvent,
    progress,
    isConnected,
  }
}
