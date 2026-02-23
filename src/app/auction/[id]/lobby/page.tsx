'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Users, Settings, Play, Clock, Crown, Shield,
  UserPlus, RefreshCw, AlertCircle, CheckCircle,
  Zap, Copy, Share2
} from 'lucide-react'
import { useAuction } from '@/hooks/useAuction'
import { useAuctionAccess } from '@/hooks/useAuctionAccess'

interface TeamParticipant {
  id: string
  name: string
  email: string
  image?: string
  role: 'OWNER' | 'MODERATOR' | 'CAPTAIN' | 'VIEWER'
  joinedAt: Date
}

interface LobbyTeam {
  id: string
  name: string
  budgetRemaining: number
  budgetSpent: number
  playerCount: number
  captains: TeamParticipant[]
  needsCaptain: boolean
}

export default function AuctionLobbyPage() {
  const params = useParams()
  const auctionId = params.id as string

  const { auction, loading: auctionLoading, error: auctionError, refetch } = useAuction(auctionId)
  const { permissions, user } = useAuctionAccess(auctionId)

  const [lobbyData, setLobbyData] = useState<{
    teams: LobbyTeam[]
    participants: TeamParticipant[]
    readyStatus: Record<string, boolean>
    canStart: boolean
  } | null>(null)

  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [isStarting, setIsStarting] = useState(false)

  // Real-time updates simulation (in real implementation, this would use WebSocket)
  useEffect(() => {
    fetchLobbyData()
    const interval = setInterval(fetchLobbyData, 5000) // Refresh every 5 seconds
    return () => clearInterval(interval)
  }, [auctionId])

  const fetchLobbyData = async () => {
    try {
      setError(null)

      // This would be a real API endpoint in implementation
      // For now, we'll simulate the data structure
      const simulatedData = {
        teams: auction?.teamStats.map(team => ({
          id: team.id,
          name: team.name,
          budgetRemaining: team.budgetRemaining,
          budgetSpent: team.budgetSpent,
          playerCount: team.playerCount,
          captains: team.captains.map((c: any) => ({ ...c, role: c.role || 'CAPTAIN', joinedAt: c.joinedAt || new Date() })),
          needsCaptain: team.captains.length === 0
        })) || [],
        participants: (auction?.participations || []).map((p: any) => ({
          id: p.id,
          name: p.user?.name || '',
          email: p.user?.email || '',
          image: p.user?.image,
          role: p.role,
          joinedAt: p.joinedAt,
          team: p.team,
        })),
        readyStatus: {},
        canStart: false
      }

      setLobbyData(simulatedData)
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch lobby data'
      setError(errorMessage)
      console.error('Failed to fetch lobby data:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleStartAuction = async () => {
    if (!permissions?.canModerate) return

    setIsStarting(true)
    try {
      // TODO: Implement actual auction start logic
      const response = await fetch(`/api/auctions/${auctionId}/start`, {
        method: 'POST'
      })

      if (response.ok) {
        // Redirect to live auction
        window.location.href = `/auction/${auctionId}/live`
      } else {
        throw new Error('Failed to start auction')
      }
    } catch (err) {
      console.error('Failed to start auction:', err)
      setError('Failed to start auction')
    } finally {
      setIsStarting(false)
    }
  }

  const handleAssignCaptain = async (teamId: string, userId: string) => {
    // TODO: Implement captain assignment
    console.log('Assign captain:', { teamId, userId })
  }

  const handleInviteParticipant = () => {
    // TODO: Implement participant invitation
    const shareUrl = `${window.location.origin}/auction/${auctionId}`
    navigator.clipboard.writeText(shareUrl)
    // Show toast notification
  }

  if (auctionLoading || loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-2 space-y-4">
              {[...Array(3)].map((_, i) => (
                <div key={i} className="h-48 bg-muted rounded" />
              ))}
            </div>
            <div className="space-y-4">
              <div className="h-32 bg-muted rounded" />
              <div className="h-48 bg-muted rounded" />
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (auctionError || error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="p-8 text-center">
          <h2 className="text-xl font-semibold text-destructive mb-2">Error</h2>
          <p className="text-muted-foreground mb-4">{auctionError || error}</p>
          <Button onClick={refetch}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
        </Card>
      </div>
    )
  }

  if (!auction || auction.status !== 'LOBBY') {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="p-8 text-center">
          <AlertCircle className="h-12 w-12 text-warning mx-auto mb-4" />
          <h2 className="text-xl font-semibold mb-2">Auction Not in Lobby</h2>
          <p className="text-muted-foreground mb-4">
            This auction is not currently in lobby status.
            Current status: <Badge>{auction?.status}</Badge>
          </p>
          <Button onClick={() => window.history.back()}>
            Go Back
          </Button>
        </Card>
      </div>
    )
  }

  const teamsNeedingCaptains = lobbyData?.teams.filter(team => team.needsCaptain).length || 0
  const totalParticipants = lobbyData?.participants.length || 0
  const readyCount = Object.values(lobbyData?.readyStatus || {}).filter(Boolean).length

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-3">
            <div className="p-2 bg-warning/10 rounded-lg">
              <Users className="h-6 w-6 text-warning" />
            </div>
            {auction.name} - Lobby
          </h1>
          <p className="text-muted-foreground mt-1">
            Waiting for all participants and final preparations before auction starts
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Badge variant="outline" className="bg-warning/10">
            <Clock className="h-4 w-4 mr-1" />
            Lobby
          </Badge>
          {permissions?.canModerate && (
            <Button
              onClick={handleStartAuction}
              disabled={isStarting || teamsNeedingCaptains > 0}
              className="bg-green-600 hover:bg-green-700"
            >
              {isStarting ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Starting...
                </>
              ) : (
                <>
                  <Play className="h-4 w-4 mr-2" />
                  Start Auction
                </>
              )}
            </Button>
          )}
        </div>
      </div>

      {/* Pre-start Checklist */}
      <Card>
        <CardHeader>
          <CardTitle>Pre-Auction Checklist</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-4 h-4 rounded-full ${auction.playerStats.total > 0 ? 'bg-green-500' : 'bg-red-500'}`} />
                <span>Players imported</span>
              </div>
              <span className="text-sm text-muted-foreground">
                {auction.playerStats.total} players
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-4 h-4 rounded-full ${teamsNeedingCaptains === 0 ? 'bg-green-500' : 'bg-red-500'}`} />
                <span>All teams have captains</span>
              </div>
              <span className="text-sm text-muted-foreground">
                {teamsNeedingCaptains === 0 ? 'Complete' : `${teamsNeedingCaptains} teams need captains`}
              </span>
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className={`w-4 h-4 rounded-full ${totalParticipants >= auction.teamStats.length ? 'bg-green-500' : 'bg-yellow-500'}`} />
                <span>Sufficient participants</span>
              </div>
              <span className="text-sm text-muted-foreground">
                {totalParticipants} participants
              </span>
            </div>
          </div>

          {teamsNeedingCaptains > 0 && (
            <Alert className="mt-4">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                {teamsNeedingCaptains} team{teamsNeedingCaptains > 1 ? 's' : ''} still need captain{teamsNeedingCaptains > 1 ? 's' : ''} assigned.
                The auction cannot start until all teams have captains.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Teams Section */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-semibold">Teams ({lobbyData?.teams.length})</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {lobbyData?.teams.map((team) => (
              <Card key={team.id} className="overflow-hidden">
                <div
                  className="h-16 p-4 flex items-center justify-between bg-gradient-to-br from-slate-700 to-slate-900"
                >
                  <div className="flex items-center gap-3 text-white">
                    <div>
                      <h3 className="font-semibold">{team.name}</h3>
                    </div>
                  </div>
                  {team.needsCaptain ? (
                    <Badge variant="destructive" className="text-xs">
                      Needs Captain
                    </Badge>
                  ) : (
                    <Badge className="bg-white/20 text-white text-xs">
                      Ready
                    </Badge>
                  )}
                </div>

                <CardContent className="p-4 space-y-3">
                  <div className="grid grid-cols-2 gap-4 text-center text-sm">
                    <div>
                      <div className="font-medium">{team.playerCount}</div>
                      <div className="text-muted-foreground">Players</div>
                    </div>
                    <div>
                      <div className="font-medium">{team.budgetRemaining}</div>
                      <div className="text-muted-foreground">Budget</div>
                    </div>
                  </div>

                  <Separator />

                  <div>
                    <div className="text-sm font-medium mb-2">Captains</div>
                    {team.captains.length === 0 ? (
                      <div className="text-center py-2">
                        <p className="text-sm text-muted-foreground">No captain assigned</p>
                        {permissions?.canModerate && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="mt-2"
                            onClick={() => handleAssignCaptain(team.id, '')}
                          >
                            <Crown className="h-4 w-4 mr-1" />
                            Assign Captain
                          </Button>
                        )}
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {team.captains.map((captain) => (
                          <div key={captain.id} className="flex items-center gap-2">
                            <Avatar className="h-6 w-6">
                              <AvatarImage src={captain.image} alt={captain.name} />
                              <AvatarFallback className="text-xs">
                                {captain.name.slice(0, 2).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium truncate">
                                {captain.name}
                              </div>
                            </div>
                            <Crown className="h-4 w-4 text-yellow-600" />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>

        {/* Participants Sidebar */}
        <div className="space-y-6">
          {/* Quick Actions */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                Quick Actions
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <Button
                variant="outline"
                className="w-full"
                onClick={handleInviteParticipant}
              >
                <UserPlus className="h-4 w-4 mr-2" />
                Invite Participants
              </Button>

              <Button
                variant="outline"
                className="w-full"
                onClick={() => window.open(`/auction/${auctionId}/players`, '_blank')}
              >
                <Settings className="h-4 w-4 mr-2" />
                Manage Players
              </Button>

              <Button
                variant="outline"
                className="w-full"
                onClick={() => {
                  const url = `${window.location.origin}/auction/${auctionId}`
                  navigator.clipboard.writeText(url)
                }}
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy Link
              </Button>
            </CardContent>
          </Card>

          {/* Participants List */}
          <Card>
            <CardHeader>
              <CardTitle>Participants ({totalParticipants})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {lobbyData?.participants.length === 0 ? (
                <div className="text-center py-4 text-muted-foreground">
                  <Users className="h-8 w-8 mx-auto mb-2" />
                  <p className="text-sm">No participants yet</p>
                </div>
              ) : (
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {lobbyData?.participants.map((participant) => (
                    <div key={participant.id} className="flex items-center gap-2 p-2 rounded-lg hover:bg-muted">
                      <Avatar className="h-8 w-8">
                        <AvatarImage src={participant.image} alt={participant.name} />
                        <AvatarFallback className="text-xs">
                          {participant.name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium truncate">
                          {participant.name}
                        </div>
                        <div className="text-xs text-muted-foreground truncate">
                          {participant.email}
                        </div>
                      </div>
                      <div className="flex items-center gap-1">
                        {participant.role === 'OWNER' && <Crown className="h-3 w-3 text-yellow-600" />}
                        {participant.role === 'MODERATOR' && <Shield className="h-3 w-3 text-primary" />}
                        <Badge variant="outline" className="text-xs">
                          {participant.role}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Auction Info */}
          <Card>
            <CardHeader>
              <CardTitle>Auction Info</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Teams:</span>
                <span className="font-medium">{auction.teamStats.length}</span>
              </div>
              <div className="flex justify-between">
                <span>Players:</span>
                <span className="font-medium">{auction.playerStats.total}</span>
              </div>
              <div className="flex justify-between">
                <span>Budget per team:</span>
                <span className="font-medium">{auction.budgetPerTeam}</span>
              </div>
              <div className="flex justify-between">
                <span>Squad size:</span>
                <span className="font-medium">{auction.squadSize}</span>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}