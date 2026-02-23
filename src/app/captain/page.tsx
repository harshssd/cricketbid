'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback } from '@/components/ui/avatar'
import {
  Users,
  Trophy,
  Coins,
  Clock,
  AlertCircle,
  CheckCircle,
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

interface PlayerBid {
  player: string
  amount: number
  timestamp: number
}

export default function CaptainPage() {
  const [selectedTeam, setSelectedTeam] = useState<string>('')
  const [auction, setAuction] = useState<AuctionState | null>(null)
  const [bidAmount, setBidAmount] = useState('')
  const [currentBid, setCurrentBid] = useState<PlayerBid | null>(null)
  const [message, setMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null)
  const [isLoading, setIsLoading] = useState(false)

  // Get auction ID and view config (handle SSR)
  const [activeAuctionId, setActiveAuctionId] = useState('')
  const { config: viewConfig } = useViewConfig(activeAuctionId, 'captain')

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setActiveAuctionId(localStorage.getItem('cricket-auction-active') || '')
    }
  }, [])

  useEffect(() => {
    // Load selected team from session storage
    const savedTeam = sessionStorage.getItem('captain-selected-team')
    if (savedTeam) {
      setSelectedTeam(savedTeam)
    }

    // Start polling for auction updates
    const interval = setInterval(pollAuctionState, 500)
    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    if (selectedTeam) {
      pollBidState()
    }
  }, [selectedTeam, auction])

  const pollAuctionState = () => {
    try {
      const activeAuctionId = localStorage.getItem('cricket-auction-active')
      if (activeAuctionId) {
        const auctionData = localStorage.getItem(`cricket-auction-${activeAuctionId}`)
        if (auctionData) {
          setAuction(JSON.parse(auctionData))
        }
      }
    } catch (error) {
      console.error('Failed to poll auction state:', error)
    }
  }

  const pollBidState = () => {
    try {
      const bidsData = localStorage.getItem('cricket-auction-bids')
      if (bidsData && selectedTeam) {
        const bids = JSON.parse(bidsData)
        const teamBid = bids[selectedTeam]
        if (teamBid) {
          setCurrentBid(teamBid)
        } else {
          setCurrentBid(null)
        }
      }
    } catch (error) {
      console.error('Failed to poll bid state:', error)
    }
  }

  const handleTeamSelection = (teamName: string) => {
    setSelectedTeam(teamName)
    sessionStorage.setItem('captain-selected-team', teamName)
  }

  const handlePlaceBid = () => {
    if (!auction || !selectedTeam || !bidAmount) return

    const currentPlayer = auction.auctionQueue[auction.auctionIndex]
    if (!currentPlayer) return

    const amount = parseInt(bidAmount)
    const team = auction.teams.find(t => t.name === selectedTeam)

    if (!team) {
      setMessage({ type: 'error', text: 'Team not found' })
      return
    }

    // Calculate max allowed bid (reserve calculation)
    const mandatoryRemaining = Math.max(0, 11 - team.players.length - 1)
    const reserveNeeded = mandatoryRemaining * 30
    const maxAllowedBid = team.coins - reserveNeeded

    // Validate bid
    if (amount > team.coins) {
      setMessage({ type: 'error', text: 'Bid exceeds available coins' })
      return
    }

    if (amount > maxAllowedBid) {
      setMessage({ type: 'error', text: `Bid exceeds max allowed (${maxAllowedBid}). Keep ${reserveNeeded} for mandatory slots.` })
      return
    }

    if (team.players.length >= 12) {
      setMessage({ type: 'error', text: 'Squad is full (12 players)' })
      return
    }

    setIsLoading(true)

    try {
      // Save bid to localStorage
      const bidsData = localStorage.getItem('cricket-auction-bids') || '{}'
      const bids = JSON.parse(bidsData)

      bids[selectedTeam] = {
        player: currentPlayer,
        amount: amount,
        timestamp: Date.now()
      }

      localStorage.setItem('cricket-auction-bids', JSON.stringify(bids))
      setCurrentBid(bids[selectedTeam])
      setMessage({ type: 'success', text: `Bid placed: ${amount} for ${currentPlayer}` })
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to place bid' })
    } finally {
      setIsLoading(false)
    }
  }

  const getCurrentPlayer = () => {
    if (!auction || auction.auctionIndex >= auction.auctionQueue.length) return null
    return auction.auctionQueue[auction.auctionIndex]
  }

  const getTeamData = () => {
    if (!auction || !selectedTeam) return null
    return auction.teams.find(t => t.name === selectedTeam)
  }

  const getCurrentPlayerTier = () => {
    const currentPlayer = getCurrentPlayer()
    if (!currentPlayer) return null

    // Find player tier from the default players list (you'd get this from your player pool)
    const playerTiers = {
      'Virat Kohli': { tier: 0, basePrice: 120 },
      'Babar Azam': { tier: 0, basePrice: 120 },
      'Steve Smith': { tier: 0, basePrice: 120 },
      'Kane Williamson': { tier: 0, basePrice: 120 },
      'Joe Root': { tier: 0, basePrice: 120 },
      'Rohit Sharma': { tier: 1, basePrice: 90 },
      'David Warner': { tier: 1, basePrice: 90 },
      'AB de Villiers': { tier: 1, basePrice: 90 },
      // ... would include all players from your DEFAULT_PLAYERS list
    }

    return playerTiers[currentPlayer as keyof typeof playerTiers] || { tier: 3, basePrice: 30 }
  }

  if (!auction) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-8">
          <CardContent className="text-center">
            <RefreshCw className="h-12 w-12 mx-auto mb-4 text-muted-foreground animate-spin" />
            <h1 className="text-xl font-bold mb-2">Loading Auction...</h1>
            <p className="text-muted-foreground">Connecting to auction system</p>
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
            <h1 className="text-xl font-bold mb-2">Auction Not Started</h1>
            <p className="text-muted-foreground">Please wait for the auctioneer to begin</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Team selection screen
  if (!selectedTeam) {
    return (
      <div className="min-h-screen bg-background py-8">
        <div className="max-w-4xl mx-auto px-4">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-foreground mb-2">Select Your Team</h1>
            <p className="text-muted-foreground">Choose the team you'll be captaining in {auction.name}</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {auction.teams.map((team, index) => (
              <Card key={index} className="hover:shadow-lg transition-shadow cursor-pointer"
                    onClick={() => handleTeamSelection(team.name)}>
                <CardContent className="p-6 text-center">
                  <Avatar className="h-16 w-16 mx-auto mb-4">
                    <AvatarFallback className="text-xl">
                      {team.name.slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <h3 className="text-xl font-bold mb-2">{team.name}</h3>
                  <div className="space-y-2 text-sm text-muted-foreground">
                    <div className="flex justify-between">
                      <span>Coins:</span>
                      <span className="font-medium">{team.coins}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Players:</span>
                      <span className="font-medium">{team.players.length}/12</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </div>
    )
  }

  const currentPlayer = getCurrentPlayer()
  const teamData = getTeamData()
  const playerInfo = getCurrentPlayerTier()

  if (!currentPlayer) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <Card className="p-8">
          <CardContent className="text-center">
            <Trophy className="h-12 w-12 mx-auto mb-4 text-yellow-500" />
            <h1 className="text-xl font-bold mb-2">Auction Complete</h1>
            <p className="text-muted-foreground">All players have been auctioned</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-card shadow-sm border-b">
        <div className="max-w-6xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-xl font-bold">{auction.name}</h1>
              <p className="text-sm text-muted-foreground">Captain Dashboard</p>
            </div>
            <div className="flex items-center space-x-4">
              <Badge variant="secondary">{selectedTeam}</Badge>
              <Button variant="outline" size="sm" onClick={() => setSelectedTeam('')}>
                Switch Team
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8 space-y-6">
        {/* Team Summary */}
        {(viewConfig.showTeamRemainingCoins || viewConfig.showTeamSquadSize || viewConfig.showTeamSpending) && (
          <Card>
            <CardContent className="p-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                {viewConfig.showTeamRemainingCoins && (
                  <div>
                    <div className="text-2xl font-bold text-primary">{teamData?.coins}</div>
                    <div className="text-sm text-muted-foreground">Coins Remaining</div>
                  </div>
                )}
                {viewConfig.showTeamSquadSize && (
                  <div>
                    <div className="text-2xl font-bold text-success">{teamData?.players.length}/12</div>
                    <div className="text-sm text-muted-foreground">Squad Size</div>
                  </div>
                )}
                {viewConfig.showTeamSpending && (
                  <div>
                    <div className="text-2xl font-bold text-primary">
                      {teamData ? teamData.originalCoins - teamData.coins : 0}
                    </div>
                    <div className="text-sm text-muted-foreground">Total Spent</div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Current Player */}
        {viewConfig.showCurrentPlayer && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <span>Now Auctioning</span>
                {viewConfig.showLiveStatus && (
                  <Badge className="bg-red-500 text-white animate-pulse">LIVE</Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-center mb-6">
                <h2 className="text-3xl font-bold mb-2">{currentPlayer}</h2>
                <div className="flex items-center justify-center space-x-4">
                  {viewConfig.showPlayerTier && (
                    <Badge>Tier {playerInfo?.tier}</Badge>
                  )}
                  {viewConfig.showPlayerBasePrice && (
                    <Badge variant="secondary">Base: {playerInfo?.basePrice}</Badge>
                  )}
                </div>
              </div>

            {/* Bid Form */}
            <div className="max-w-md mx-auto space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2">Bid Amount</label>
                <Input
                  type="number"
                  value={bidAmount}
                  onChange={(e) => setBidAmount(e.target.value)}
                  placeholder={`Min: ${playerInfo?.basePrice || 30}`}
                  min={playerInfo?.basePrice || 30}
                  max={teamData?.coins || 0}
                  className="text-center text-lg"
                />
              </div>

              {currentBid?.player === currentPlayer ? (
                <Button
                  onClick={handlePlaceBid}
                  disabled={isLoading || !bidAmount}
                  className="w-full bg-orange-600 hover:bg-orange-700"
                >
                  {isLoading ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-2" />}
                  Update Bid to {bidAmount}
                </Button>
              ) : (
                <Button
                  onClick={handlePlaceBid}
                  disabled={isLoading || !bidAmount}
                  className="w-full bg-green-600 hover:bg-green-700"
                >
                  {isLoading ? <RefreshCw className="h-4 w-4 mr-2 animate-spin" /> : <Coins className="h-4 w-4 mr-2" />}
                  Place Bid
                </Button>
              )}

              {currentBid?.player === currentPlayer && (
                <div className="text-center p-3 bg-info/10 rounded-lg">
                  <div className="flex items-center justify-center space-x-2">
                    <CheckCircle className="h-4 w-4 text-primary" />
                    <span className="text-sm font-medium text-info-foreground">
                      Active bid: {currentBid.amount} coins
                    </span>
                  </div>
                </div>
              )}

              {message && (
                <div className={`p-3 rounded-lg ${
                  message.type === 'success' ? 'bg-success/10 text-success-foreground' :
                  message.type === 'error' ? 'bg-destructive/10 text-destructive' :
                  'bg-info/10 text-info-foreground'
                }`}>
                  <div className="flex items-center space-x-2">
                    {message.type === 'error' && <AlertCircle className="h-4 w-4" />}
                    {message.type === 'success' && <CheckCircle className="h-4 w-4" />}
                    <span className="text-sm">{message.text}</span>
                  </div>
                </div>
              )}

              <div className="text-center text-xs text-muted-foreground">
                Max bid: {teamData ? teamData.coins - Math.max(0, 11 - teamData.players.length - 1) * 30 : 0} coins
                <br />
                (Reserve {Math.max(0, 11 - (teamData?.players.length || 0) - 1) * 30} for mandatory slots)
              </div>
            </div>
            </CardContent>
          </Card>
        )}

        {/* My Roster */}
        {viewConfig.showTeamPlayers && (
          <Card>
            <CardHeader>
              <CardTitle>My Roster ({teamData?.players.length || 0}/12)</CardTitle>
            </CardHeader>
            <CardContent>
              {teamData && teamData.players.length > 0 ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {teamData.players.map((player, i) => (
                    <div key={i} className="flex items-center justify-between p-3 bg-muted rounded-lg">
                      <div>
                        <div className="font-medium">{player.name}</div>
                        {viewConfig.showTeamPlayerDetails && (
                          <Badge className="text-xs">Tier {player.tier}</Badge>
                        )}
                      </div>
                      <div className="font-bold text-success">{player.price}</div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No players acquired yet</p>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}