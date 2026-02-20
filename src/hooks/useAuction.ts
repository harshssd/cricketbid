'use client'

import { useState, useEffect } from 'react'

export interface AuctionDetail {
  id: string
  name: string
  description?: string
  scheduledAt: Date
  timezone: string
  status: 'DRAFT' | 'LOBBY' | 'LIVE' | 'COMPLETED' | 'ARCHIVED'
  visibility: 'PUBLIC' | 'PRIVATE'
  passcode?: string
  primaryColor: string
  secondaryColor: string
  logo?: string
  banner?: string
  bgImage?: string
  font: string
  themePreset?: string
  tagline?: string
  budgetPerTeam: number
  currencyName: string
  currencyIcon: string
  squadSize: number
  createdAt: Date
  updatedAt: Date

  // Organization info
  league?: {
    id: string
    name: string
    code: string
    type: string
    logo?: string
    primaryColor: string
  }

  // Owner info
  owner: {
    id: string
    name: string
    email: string
    image?: string
  }

  // Teams with participants
  teamStats: Array<{
    id: string
    name: string
    primaryColor: string
    secondaryColor: string
    logo?: string
    budgetRemaining: number
    budgetSpent: number
    playerCount: number
    captains: Array<{
      id: string
      name: string
      email: string
      image?: string
    }>
  }>

  // Tier information
  tierStats: Array<{
    id: string
    name: string
    basePrice: number
    color: string
    icon?: string
    sortOrder: number
    minPerTeam: number
    maxPerTeam?: number
    playerCount: number
    playersAvailable: number
    playersSold: number
    playersUnsold: number
  }>

  // Player information
  players: Array<{
    id: string
    name: string
    image?: string
    playingRole: string
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
    assignedTeam?: {
      id: string
      name: string
      primaryColor: string
    }
  }>

  // Participation information
  participations: Array<{
    id: string
    role: 'OWNER' | 'MODERATOR' | 'CAPTAIN' | 'VIEWER'
    joinedAt: Date
    user: {
      id: string
      name: string
      email: string
      image?: string
    }
    team?: {
      id: string
      name: string
      primaryColor: string
    }
  }>

  // Statistics
  playerStats: {
    total: number
    available: number
    sold: number
    unsold: number
  }

  participationStats: {
    total: number
    owners: number
    moderators: number
    captains: number
    viewers: number
  }

  _count: {
    teams: number
    players: number
    participations: number
    rounds: number
  }
}

interface UseAuctionReturn {
  auction: AuctionDetail | null
  loading: boolean
  error: string | null
  refetch: () => Promise<void>
}

export function useAuction(auctionId: string): UseAuctionReturn {
  const [auction, setAuction] = useState<AuctionDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchAuction = async () => {
    if (!auctionId) return

    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/auctions/${auctionId}`)

      if (!response.ok) {
        if (response.status === 404) {
          throw new Error('Auction not found')
        }
        throw new Error('Failed to fetch auction details')
      }

      const data = await response.json()

      // Transform dates back to Date objects
      const transformedAuction: AuctionDetail = {
        ...data,
        scheduledAt: new Date(data.scheduledAt),
        createdAt: new Date(data.createdAt),
        updatedAt: new Date(data.updatedAt),
        participations: data.participations.map((p: any) => ({
          ...p,
          joinedAt: new Date(p.joinedAt)
        }))
      }

      setAuction(transformedAuction)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred'
      setError(errorMessage)
      console.error('Failed to fetch auction:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchAuction()
  }, [auctionId])

  return {
    auction,
    loading,
    error,
    refetch: fetchAuction
  }
}