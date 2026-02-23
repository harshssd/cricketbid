'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Users, Search, Filter, Upload, Download,
  User, Trophy, Target, MoreVertical
} from 'lucide-react'
import { useAuction } from '@/hooks/useAuction'
import { PlayerImport } from '@/components/auction/PlayerImport'

interface Player {
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
  }
}

export default function AuctionPlayersPage() {
  const params = useParams()
  const auctionId = params.id as string

  const { auction, loading: auctionLoading, error: auctionError } = useAuction(auctionId)
  const [players, setPlayers] = useState<Player[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [showImport, setShowImport] = useState(false)

  // Filters
  const [searchQuery, setSearchQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [tierFilter, setTierFilter] = useState('all')
  const [roleFilter, setRoleFilter] = useState('all')

  const fetchPlayers = async () => {
    try {
      setLoading(true)
      setError(null)

      const response = await fetch(`/api/auctions/${auctionId}/players/import`)
      if (!response.ok) {
        throw new Error('Failed to fetch players')
      }

      const data = await response.json()
      setPlayers(data.players || [])
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch players'
      setError(errorMessage)
      console.error('Failed to fetch players:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPlayers()
  }, [auctionId])

  const handleImportComplete = (importedPlayers: Player[]) => {
    setShowImport(false)
    fetchPlayers() // Refresh the list
  }

  // Filter players
  const filteredPlayers = players.filter(player => {
    const matchesSearch = player.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         player.playingRole.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         player.customTags?.toLowerCase().includes(searchQuery.toLowerCase())

    const matchesStatus = statusFilter === 'all' || player.status.toLowerCase() === statusFilter

    const matchesTier = tierFilter === 'all' || player.tier.id === tierFilter

    const matchesRole = roleFilter === 'all' ||
                       player.playingRole.toLowerCase().includes(roleFilter.toLowerCase())

    return matchesSearch && matchesStatus && matchesTier && matchesRole
  })

  const playersByStatus = {
    total: players.length,
    available: players.filter(p => p.status === 'AVAILABLE').length,
    sold: players.filter(p => p.status === 'SOLD').length,
    unsold: players.filter(p => p.status === 'UNSOLD').length,
  }

  if (auctionLoading || loading) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-muted rounded w-1/3" />
          <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="h-20 bg-muted rounded" />
            ))}
          </div>
          <div className="h-12 bg-muted rounded" />
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {[...Array(8)].map((_, i) => (
              <div key={i} className="h-48 bg-muted rounded" />
            ))}
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
          <p className="text-muted-foreground">{auctionError || error}</p>
        </Card>
      </div>
    )
  }

  if (!auction) {
    return (
      <div className="container mx-auto px-4 py-8">
        <Card className="p-8 text-center">
          <h2 className="text-xl font-semibold mb-2">Auction Not Found</h2>
          <p className="text-muted-foreground">The requested auction could not be found.</p>
        </Card>
      </div>
    )
  }

  if (showImport) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <Button
            variant="outline"
            onClick={() => setShowImport(false)}
          >
            ← Back to Players
          </Button>
        </div>
        <PlayerImport
          auctionId={auctionId}
          tiers={auction.tierStats}
          existingPlayers={players.length}
          onImportComplete={handleImportComplete}
        />
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-8 space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold">{auction.name} - Players</h1>
          <p className="text-muted-foreground mt-1">
            Manage players for your auction
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => setShowImport(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Import Players
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold mb-1">{playersByStatus.total}</div>
            <div className="text-sm text-muted-foreground">Total Players</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-primary mb-1">{playersByStatus.available}</div>
            <div className="text-sm text-muted-foreground">Available</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-success mb-1">{playersByStatus.sold}</div>
            <div className="text-sm text-muted-foreground">Sold</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-destructive mb-1">{playersByStatus.unsold}</div>
            <div className="text-sm text-muted-foreground">Unsold</div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Search */}
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
              <Input
                placeholder="Search players..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>

            {/* Status Filter */}
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="available">Available</SelectItem>
                <SelectItem value="sold">Sold</SelectItem>
                <SelectItem value="unsold">Unsold</SelectItem>
              </SelectContent>
            </Select>

            {/* Tier Filter */}
            <Select value={tierFilter} onValueChange={setTierFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Tier" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Tiers</SelectItem>
                {auction.tierStats.map(tier => (
                  <SelectItem key={tier.id} value={tier.id}>
                    <div className="flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: tier.color }}
                      />
                      {tier.name}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Role Filter */}
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-full sm:w-40">
                <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Roles</SelectItem>
                <SelectItem value="batsman">Batsman</SelectItem>
                <SelectItem value="bowler">Bowler</SelectItem>
                <SelectItem value="all-rounder">All-rounder</SelectItem>
                <SelectItem value="wicket-keeper">Wicket-keeper</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Players Grid */}
      {filteredPlayers.length === 0 ? (
        <Card className="p-8 text-center">
          <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="text-lg font-semibold mb-2">
            {players.length === 0 ? 'No Players Added' : 'No Players Found'}
          </h3>
          <p className="text-muted-foreground mb-4">
            {players.length === 0
              ? "Get started by importing players to your auction."
              : "Try adjusting your search or filter criteria."
            }
          </p>
          {players.length === 0 && (
            <Button onClick={() => setShowImport(true)}>
              <Upload className="h-4 w-4 mr-2" />
              Import Players
            </Button>
          )}
        </Card>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {filteredPlayers.map((player) => (
            <Card key={player.id} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-start justify-between mb-3">
                  <div className="flex items-center gap-3 flex-1 min-w-0">
                    <Avatar className="h-12 w-12">
                      <AvatarImage src={player.image} alt={player.name} />
                      <AvatarFallback>
                        <User className="h-6 w-6" />
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold truncate">{player.name}</h3>
                      <p className="text-sm text-muted-foreground">{player.playingRole}</p>
                    </div>
                  </div>
                  <Button variant="ghost" size="sm">
                    <MoreVertical className="h-4 w-4" />
                  </Button>
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <Badge variant="secondary">
                      {player.status}
                    </Badge>
                    <div className="flex items-center gap-1">
                      <div
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: player.tier.color }}
                      />
                      <span className="text-sm text-muted-foreground">
                        {player.tier.name}
                      </span>
                    </div>
                  </div>

                  <div className="text-sm">
                    <div className="flex items-center justify-between">
                      <span className="text-muted-foreground">Base Price:</span>
                      <span className="font-medium">{player.tier.basePrice}</span>
                    </div>
                  </div>

                  {player.battingStyle && (
                    <div className="text-xs text-muted-foreground">
                      Batting: {player.battingStyle}
                    </div>
                  )}

                  {player.bowlingStyle && (
                    <div className="text-xs text-muted-foreground">
                      Bowling: {player.bowlingStyle}
                    </div>
                  )}

                  {player.customTags && (
                    <div className="flex flex-wrap gap-1 mt-2">
                      {player.customTags.split(',').map((tag, index) => (
                        <Badge key={index} variant="outline" className="text-xs">
                          {tag.trim()}
                        </Badge>
                      ))}
                    </div>
                  )}

                  {player.assignedTeam && (
                    <div className="flex items-center gap-2 pt-2 border-t">
                      <div className="w-3 h-3 rounded-full bg-primary" />
                      <span className="text-sm font-medium">
                        {player.assignedTeam.name}
                      </span>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}