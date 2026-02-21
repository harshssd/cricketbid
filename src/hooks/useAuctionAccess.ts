'use client'

import { useState, useEffect } from 'react'

export interface AuctionPermissions {
  canView: boolean
  canJoin: boolean
  canModerate: boolean
  canManage: boolean
  role?: 'OWNER' | 'MODERATOR' | 'CAPTAIN' | 'VIEWER'
}

export interface AuthUser {
  id: string
  email: string
  name: string
  image?: string
}

interface UseAuctionAccessReturn {
  permissions: AuctionPermissions | null
  user: AuthUser | null
  loading: boolean
  error: string | null
  joinAuction: (role?: 'CAPTAIN' | 'VIEWER', teamId?: string) => Promise<boolean>
  checkAccess: () => Promise<void>
}

export function useAuctionAccess(auctionId: string): UseAuctionAccessReturn {
  const [permissions, setPermissions] = useState<AuctionPermissions | null>(null)
  const [user, setUser] = useState<AuthUser | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const checkAccess = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/auctions/${auctionId}/join`, {
        headers: {
          'Authorization': `Bearer ${getAuthToken()}`,
        }
      })

      if (!response.ok) {
        throw new Error('Failed to check auction access')
      }

      const data = await response.json()
      setPermissions(data.permissions)
      setUser(data.user)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred'
      setError(errorMessage)
      console.error('Failed to check auction access:', err)
    } finally {
      setLoading(false)
    }
  }

  const joinAuction = async (
    role: 'CAPTAIN' | 'VIEWER' = 'VIEWER',
    teamId?: string
  ): Promise<boolean> => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/auctions/${auctionId}/join`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${getAuthToken()}`,
        },
        body: JSON.stringify({
          role,
          teamId,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to join auction')
      }

      const data = await response.json()
      setPermissions(data.permissions)
      return true
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to join auction'
      setError(errorMessage)
      console.error('Failed to join auction:', err)
      return false
    } finally {
      setLoading(false)
    }
  }

  const getAuthToken = (): string | null => {
    // This would typically come from your authentication context
    // For now, return null to simulate unauthenticated state
    return null
  }

  useEffect(() => {
    checkAccess()
  }, [auctionId])

  return {
    permissions,
    user,
    loading,
    error,
    joinAuction,
    checkAccess,
  }
}
