'use client'

import { useState, useEffect } from 'react'

export interface AuctionListItem {
  id: string
  name: string
  description?: string
  status: 'DRAFT' | 'LOBBY' | 'LIVE' | 'COMPLETED' | 'ARCHIVED'
  visibility: 'PUBLIC' | 'PRIVATE'
  budgetPerTeam: number
  currencyName: string
  currencyIcon: string
  squadSize: number

  // Organization info
  league?: {
    name: string
  }

  // Owner info
  owner: {
    name: string
    email: string
  }

  // Stats
  teamCount: number
  playerCount: number
  participantCount: number
  playersAvailable: number
  playersSold: number
  playersUnsold: number
}

interface UseAuctionsOptions {
  status?: string
  visibility?: string
  page?: number
  limit?: number
  autoRefresh?: boolean
}

interface UseAuctionsReturn {
  auctions: AuctionListItem[]
  loading: boolean
  error: string | null
  pagination: {
    page: number
    limit: number
    total: number
    totalPages: number
    hasNext: boolean
    hasPrev: boolean
  }
  refetch: () => Promise<void>
}

export function useAuctions(options: UseAuctionsOptions = {}): UseAuctionsReturn {
  const {
    status = 'all',
    visibility = 'all',
    page = 1,
    limit = 12,
    autoRefresh = false
  } = options

  const [auctions, setAuctions] = useState<AuctionListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 12,
    total: 0,
    totalPages: 0,
    hasNext: false,
    hasPrev: false
  })

  const fetchAuctions = async () => {
    try {
      setLoading(true)
      setError(null)

      const params = new URLSearchParams({
        status,
        visibility,
        page: page.toString(),
        limit: limit.toString()
      })

      const response = await fetch(`/api/auctions?${params}`)

      if (!response.ok) {
        throw new Error('Failed to fetch auctions')
      }

      const data = await response.json()

      setAuctions(data.auctions)
      setPagination(data.pagination)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred'
      setError(errorMessage)
      console.error('Failed to fetch auctions:', err)
    } finally {
      setLoading(false)
    }
  }

  // Initial fetch and when dependencies change
  useEffect(() => {
    fetchAuctions()
  }, [status, visibility, page, limit])

  // Auto-refresh for live data
  useEffect(() => {
    if (!autoRefresh) return

    const interval = setInterval(() => {
      fetchAuctions()
    }, 30000) // Refresh every 30 seconds

    return () => clearInterval(interval)
  }, [autoRefresh, status, visibility, page, limit])

  return {
    auctions,
    loading,
    error,
    pagination,
    refetch: fetchAuctions
  }
}
