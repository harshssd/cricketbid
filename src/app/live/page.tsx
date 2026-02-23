'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Users,
  Trophy,
  Clock,
  TrendingUp,
  Activity,
  Zap,
  RefreshCw
} from 'lucide-react'
import { useViewConfig } from '@/lib/view-config-manager'

interface Team {
  name: string
  coins: number
  originalCoins: number
  players: Array<{ name: string; price: number; tier: number }>
}

interface SoldPlayer {
  playerId: string
  playerName: string
  teamId: string
  teamName: string
  price: number
}

interface AuctionState {
  id: string
  name: string
  teams: Team[]
  auctionQueue: string[]
  auctionIndex: number
  auctionStarted: boolean
  soldPlayers: SoldPlayer[]
  unsoldPlayers: string[]
  deferredPlayers: string[]
  auctionHistory: Array<{ player: string; team: string; price: number; action: string }>
}

export default function LivePage() {
  const [auction, setAuction] = useState<AuctionState | null>(null)
  const [lastUpdate, setLastUpdate] = useState<Date>(new Date())

  // Get auction ID and view config (handle SSR)
  const [activeAuctionId, setActiveAuctionId] = useState('')
  const { config: viewConfig } = useViewConfig(activeAuctionId, 'public')

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setActiveAuctionId(localStorage.getItem('cricket-auction-active') || '')
    }
  }, [])

  useEffect(() => {
    // Start polling every 500ms
    const interval = setInterval(pollAuctionState, 500)
    pollAuctionState() // Initial load
    return () => clearInterval(interval)
  }, [])

  const pollAuctionState = () => {
    try {
      const activeAuctionId = localStorage.getItem('cricket-auction-active')
      if (activeAuctionId) {
        const auctionData = localStorage.getItem(`cricket-auction-${activeAuctionId}`)
        if (auctionData) {
          const parsedData = JSON.parse(auctionData)
          setAuction(parsedData)
          setLastUpdate(new Date())
        }
      }
    } catch (error) {
      console.error('Failed to poll auction state:', error)
    }
  }

  const getCurrentPlayer = () => {
    if (!auction || auction.auctionIndex >= auction.auctionQueue.length) return null
    return auction.auctionQueue[auction.auctionIndex]
  }

  const getCurrentPlayerInfo = () => {
    const currentPlayer = getCurrentPlayer()
    if (!currentPlayer) return null

    // Default player info (in real implementation, this would come from your player data)
    const playerTiers = {
      'Virat Kohli': { tier: 0, basePrice: 120, note: null },
      'Babar Azam': { tier: 0, basePrice: 120, note: null },
      'Steve Smith': { tier: 0, basePrice: 120, note: null },
      'AB de Villiers': { tier: 1, basePrice: 90, note: 'Limited' },
      // ... would include all players
    }

    return playerTiers[currentPlayer as keyof typeof playerTiers] || { tier: 3, basePrice: 30, note: null }
  }

  const getAuctionProgress = () => {
    if (!auction) return { sold: 0, remaining: 0, deferred: 0, progress: 0 }

    const sold = auction.soldPlayers.length
    const remaining = auction.auctionQueue.length - auction.auctionIndex
    const deferred = auction.deferredPlayers.length
    const progress = auction.auctionQueue.length > 0 ? (auction.auctionIndex / auction.auctionQueue.length) * 100 : 0

    return { sold, remaining, deferred, progress }
  }

  if (!auction) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-8">
          <CardContent className="text-center">
            <RefreshCw className="h-12 w-12 mx-auto mb-4 text-muted-foreground animate-spin" />
            <h1 className="text-xl font-bold mb-2">Connecting to Live Auction...</h1>
            <p className="text-muted-foreground">Please wait while we connect</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!auction.auctionStarted) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-8">
          <CardContent className="text-center">
            <Clock className="h-12 w-12 mx-auto mb-4 text-yellow-500" />
            <h1 className="text-xl font-bold mb-2">Auction Starting Soon</h1>
            <p className="text-muted-foreground">The auction will begin shortly</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const currentPlayer = getCurrentPlayer()
  const playerInfo = getCurrentPlayerInfo()
  const progress = getAuctionProgress()

  if (!currentPlayer) {
    return (
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="bg-card shadow-sm border-b">
          <div className="max-w-6xl mx-auto px-4 py-6">
            <div className="text-center">
              <h1 className="text-3xl font-bold text-foreground mb-2">{auction.name}</h1>
              <Badge className="bg-green-500 text-white text-lg px-4 py-2">
                <Trophy className="h-4 w-4 mr-2" />
                AUCTION COMPLETE
              </Badge>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-4 py-8">
          {/* Final Results */}
          <Card>
            <CardHeader>
              <CardTitle className="text-center">Final Results</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {auction.teams.map((team, index) => (
                  <Card key={index} className="border-2">
                    <CardHeader>
                      <CardTitle className="flex items-center justify-between">
                        <span>{team.name}</span>
                        <div className="text-right">
                          <div className="text-lg font-bold">{team.originalCoins - team.coins} spent</div>
                          <div className="text-sm text-muted-foreground">{team.coins} remaining</div>
                        </div>
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {team.players.map((player, i) => (
                          <div key={i} className="flex justify-between items-center p-2 bg-muted rounded">
                            <div>
                              <span className="font-medium">{player.name}</span>
                              <Badge className="ml-2 text-xs">T{player.tier}</Badge>
                            </div>
                            <span className="font-bold text-success">{player.price}</span>
                          </div>
                        ))}
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-6">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-foreground mb-2">{auction.name}</h1>
            {viewConfig.showLiveStatus && (
              <Badge className="bg-red-500 text-white text-lg px-4 py-2 animate-pulse">
                <Zap className="h-4 w-4 mr-2" />
                LIVE
              </Badge>
            )}
            {viewConfig.showLastUpdated && (
              <div className="text-sm text-muted-foreground mt-2">
                Last updated: {lastUpdate.toLocaleTimeString()}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        {/* Now Auctioning */}
        {viewConfig.showCurrentPlayer && (
          <Card className="border-2 border-red-500">
            <CardHeader>
              <CardTitle className="text-center">
                <Badge className="bg-red-500 text-white mb-4">NOW AUCTIONING</Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center">
                <h2 className="text-4xl font-bold mb-4">{currentPlayer}</h2>
                <div className="flex items-center justify-center space-x-4 mb-4">
                  {viewConfig.showPlayerTier && (
                    <Badge className="text-lg px-3 py-1">Tier {playerInfo?.tier}</Badge>
                  )}
                  {viewConfig.showPlayerBasePrice && (
                    <Badge variant="secondary" className="text-lg px-3 py-1">
                      Base: {playerInfo?.basePrice} coins
                    </Badge>
                  )}
                  {viewConfig.showPlayerNotes && playerInfo?.note && (
                    <Badge variant="outline" className="text-lg px-3 py-1">
                      {playerInfo.note}
                    </Badge>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Stats Bar */}
        <div className="grid grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-success">{progress.sold}</div>
              <div className="text-sm text-muted-foreground">Sold</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-primary">{progress.remaining}</div>
              <div className="text-sm text-muted-foreground">Remaining</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-warning">{progress.deferred}</div>
              <div className="text-sm text-muted-foreground">Deferred</div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 text-center">
              <div className="text-2xl font-bold text-primary">
                {auction.teams.reduce((sum, team) => sum + (team.originalCoins - team.coins), 0)}
              </div>
              <div className="text-sm text-muted-foreground">Total Spent</div>
            </CardContent>
          </Card>
        </div>

        {/* Progress Bar */}
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">Auction Progress</span>
              <span className="text-sm text-muted-foreground">{Math.round(progress.progress)}%</span>
            </div>
            <div className="w-full bg-muted rounded-full h-3">
              <div
                className="bg-primary h-3 rounded-full transition-all duration-300"
                style={{ width: `${progress.progress}%` }}
              />
            </div>
          </CardContent>
        </Card>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* All Teams */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Users className="h-5 w-5" />
                <span>All Teams ({auction.teams.length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {auction.teams.map((team, index) => (
                  <div key={index} className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback>{team.name.slice(0, 2).toUpperCase()}</AvatarFallback>
                        </Avatar>
                        <div>
                          <div className="font-medium">{team.name}</div>
                          <div className="text-sm text-muted-foreground">
                            {team.players.length} players • {team.coins} coins left
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-success">
                          {team.originalCoins - team.coins}
                        </div>
                        <div className="text-xs text-muted-foreground">spent</div>
                      </div>
                    </div>

                    {team.players.length > 0 && (
                      <div className="text-xs text-muted-foreground">
                        Latest: {team.players[team.players.length - 1]?.name} ({team.players[team.players.length - 1]?.price})
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Sales */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Activity className="h-5 w-5" />
                <span>Recent Sales</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              {auction.auctionHistory.length > 0 ? (
                <div className="space-y-3">
                  {auction.auctionHistory.slice(-10).reverse().map((sale, i) => (
                    <div key={i} className="flex justify-between items-center p-3 bg-muted rounded-lg">
                      <div>
                        <div className="font-medium">{sale.player}</div>
                        <div className="text-sm text-muted-foreground">to {sale.team}</div>
                      </div>
                      <div className="text-right">
                        <div className="font-bold text-success">{sale.price}</div>
                        <div className="text-xs text-muted-foreground">coins</div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No sales yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}