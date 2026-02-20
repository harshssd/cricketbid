'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Link,
  Unlink,
  Search,
  User,
  CheckCircle,
  AlertCircle,
  Mail,
  Users,
  Loader2,
  Shield
} from 'lucide-react'
import { toast } from 'sonner'

interface Player {
  id: string
  name: string
  email?: string
  phone?: string
  playingRole: string
  isLinked: boolean
  linkVerified: boolean
  linkingMethod?: string
  linkedAt?: string
  linkedUser?: {
    id: string
    name: string
    email: string
    image?: string
  }
  auction: {
    id: string
    name: string
  }
  tier: {
    id: string
    name: string
    basePrice: number
    color: string
  }
}

interface User {
  id: string
  name: string
  email: string
  image?: string
}

interface LinkingSuggestion extends Player {
  matchType: 'email' | 'name'
  confidence: number
}

interface PlayerLinkingManagerProps {
  auctionId?: string
  userId?: string
  onLinkingChange?: () => void
}

export function PlayerLinkingManager({ auctionId, userId, onLinkingChange }: PlayerLinkingManagerProps) {
  const [players, setPlayers] = useState<Player[]>([])
  const [suggestions, setSuggestions] = useState<LinkingSuggestion[]>([])
  const [stats, setStats] = useState<any>({})
  const [loading, setLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedPlayer, setSelectedPlayer] = useState<Player | null>(null)
  const [selectedUser, setSelectedUser] = useState<User | null>(null)
  const [showLinkDialog, setShowLinkDialog] = useState(false)
  const [showUnlinkDialog, setShowUnlinkDialog] = useState(false)
  const [isLinking, setIsLinking] = useState(false)
  const [users, setUsers] = useState<User[]>([])
  const [userSearchQuery, setUserSearchQuery] = useState('')

  useEffect(() => {
    loadPlayersAndSuggestions()
  }, [auctionId, userId, searchQuery])

  const loadPlayersAndSuggestions = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (auctionId) params.append('auctionId', auctionId)
      if (userId) params.append('userId', userId)
      if (searchQuery) params.append('searchQuery', searchQuery)

      const response = await fetch(`/api/players/link?${params}`)
      const data = await response.json()

      if (data.success) {
        setPlayers(data.players || [])
        setSuggestions(data.suggestions || [])
        setStats(data.stats || {})
      } else {
        toast.error('Failed to load players')
      }
    } catch (error) {
      console.error('Error loading players:', error)
      toast.error('Failed to load players')
    } finally {
      setLoading(false)
    }
  }

  const searchUsers = async (query: string) => {
    if (!query.trim()) {
      setUsers([])
      return
    }

    try {
      // This would need to be implemented - a user search API
      const response = await fetch(`/api/users?search=${encodeURIComponent(query)}&limit=10`)
      const data = await response.json()

      if (data.success) {
        setUsers(data.users || [])
      }
    } catch (error) {
      console.error('Error searching users:', error)
    }
  }

  const handleLinkPlayer = async (player: Player, user: User, linkingMethod: string = 'MANUAL_LINK') => {
    try {
      setIsLinking(true)
      const response = await fetch('/api/players/link', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: player.id,
          userId: user.id,
          linkingMethod,
          verifyLink: true
        })
      })

      const data = await response.json()

      if (data.success) {
        toast.success('Player linked successfully')
        loadPlayersAndSuggestions()
        onLinkingChange?.()
        setShowLinkDialog(false)
        setSelectedPlayer(null)
        setSelectedUser(null)
      } else {
        toast.error(data.error || 'Failed to link player')
      }
    } catch (error) {
      console.error('Error linking player:', error)
      toast.error('Failed to link player')
    } finally {
      setIsLinking(false)
    }
  }

  const handleUnlinkPlayer = async (player: Player) => {
    try {
      setIsLinking(true)
      const response = await fetch('/api/players/link', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          playerId: player.id
        })
      })

      const data = await response.json()

      if (data.success) {
        toast.success('Player unlinked successfully')
        loadPlayersAndSuggestions()
        onLinkingChange?.()
        setShowUnlinkDialog(false)
        setSelectedPlayer(null)
      } else {
        toast.error(data.error || 'Failed to unlink player')
      }
    } catch (error) {
      console.error('Error unlinking player:', error)
      toast.error('Failed to unlink player')
    } finally {
      setIsLinking(false)
    }
  }

  const openLinkDialog = (player: Player) => {
    setSelectedPlayer(player)
    setShowLinkDialog(true)
    // Search for users with matching email if player has email
    if (player.email) {
      searchUsers(player.email)
    }
  }

  const openUnlinkDialog = (player: Player) => {
    setSelectedPlayer(player)
    setShowUnlinkDialog(true)
  }

  const getLinkingMethodBadge = (method?: string) => {
    const methodConfig = {
      'EMAIL_MATCH': { color: 'bg-green-100 text-green-800', icon: Mail, label: 'Email Match' },
      'MANUAL_LINK': { color: 'bg-blue-100 text-blue-800', icon: User, label: 'Manual Link' },
      'USER_CLAIM': { color: 'bg-purple-100 text-purple-800', icon: User, label: 'User Claim' },
      'INVITATION': { color: 'bg-yellow-100 text-yellow-800', icon: Mail, label: 'Invitation' },
    }

    const config = methodConfig[method as keyof typeof methodConfig]
    if (!config) return null

    const Icon = config.icon

    return (
      <Badge className={`${config.color} text-xs`}>
        <Icon className="w-3 h-3 mr-1" />
        {config.label}
      </Badge>
    )
  }

  const filteredPlayers = players.filter(player =>
    player.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    player.email?.toLowerCase().includes(searchQuery.toLowerCase())
  )

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-6">
      {/* Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-blue-600">{stats.totalPlayers || 0}</div>
            <p className="text-xs text-muted-foreground">Total Players</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-green-600">{stats.linkedPlayers || 0}</div>
            <p className="text-xs text-muted-foreground">Linked</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-orange-600">{stats.unlinkedPlayers || 0}</div>
            <p className="text-xs text-muted-foreground">Unlinked</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold text-purple-600">{suggestions.length}</div>
            <p className="text-xs text-muted-foreground">Suggestions</p>
          </CardContent>
        </Card>
      </div>

      {/* Linking Suggestions */}
      {suggestions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <AlertCircle className="h-5 w-5" />
              <span>Linking Suggestions</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {suggestions.map((suggestion) => (
                <div
                  key={suggestion.id}
                  className="flex items-center justify-between p-3 border rounded-lg bg-blue-50"
                >
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-8 w-8">
                      <AvatarFallback>{suggestion.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">{suggestion.name}</div>
                      <div className="text-sm text-muted-foreground">
                        {suggestion.matchType === 'email' ? 'Email match' : 'Name match'}
                        · {Math.round(suggestion.confidence * 100)}% confidence
                      </div>
                    </div>
                  </div>
                  <Button
                    size="sm"
                    onClick={() => openLinkDialog(suggestion)}
                    className="bg-blue-600 hover:bg-blue-700"
                  >
                    <Link className="h-4 w-4 mr-2" />
                    Link
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Search */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>Player Linking Management</span>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center space-x-2 mb-4">
            <Search className="h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search players by name or email..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="flex-1"
            />
          </div>

          <div className="space-y-3">
            {filteredPlayers.map((player) => (
              <div
                key={player.id}
                className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50"
              >
                <div className="flex items-center space-x-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={player.linkedUser?.image} alt={player.name} />
                    <AvatarFallback>{player.name.charAt(0)}</AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center space-x-2">
                      <div className="font-medium">{player.name}</div>
                      {player.isLinked && (
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground">
                      {player.playingRole} • {player.tier.name}
                      {player.email && ` • ${player.email}`}
                    </div>
                    {player.isLinked && player.linkedUser && (
                      <div className="text-sm text-blue-600 mt-1">
                        Linked to: {player.linkedUser.name} ({player.linkedUser.email})
                      </div>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  {player.linkingMethod && getLinkingMethodBadge(player.linkingMethod)}
                  {player.linkVerified && (
                    <Badge className="bg-green-100 text-green-800 text-xs">
                      <Shield className="w-3 h-3 mr-1" />
                      Verified
                    </Badge>
                  )}
                  {player.isLinked ? (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openUnlinkDialog(player)}
                    >
                      <Unlink className="h-4 w-4 mr-2" />
                      Unlink
                    </Button>
                  ) : (
                    <Button
                      size="sm"
                      onClick={() => openLinkDialog(player)}
                    >
                      <Link className="h-4 w-4 mr-2" />
                      Link
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {filteredPlayers.length === 0 && (
            <div className="text-center py-8 text-muted-foreground">
              No players found matching your search.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Link Player Dialog */}
      <Dialog open={showLinkDialog} onOpenChange={setShowLinkDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Link Player to User Account</DialogTitle>
            <DialogDescription>
              Link {selectedPlayer?.name} to a registered user account.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search users by name or email..."
                value={userSearchQuery}
                onChange={(e) => {
                  setUserSearchQuery(e.target.value)
                  searchUsers(e.target.value)
                }}
              />
            </div>

            <div className="max-h-60 overflow-y-auto">
              {users.map((user) => (
                <div
                  key={user.id}
                  className={`flex items-center justify-between p-3 border rounded-lg cursor-pointer transition-colors ${
                    selectedUser?.id === user.id ? 'bg-blue-50 border-blue-300' : 'hover:bg-gray-50'
                  }`}
                  onClick={() => setSelectedUser(user)}
                >
                  <div className="flex items-center space-x-3">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src={user.image} alt={user.name} />
                      <AvatarFallback>{user.name.charAt(0)}</AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">{user.name}</div>
                      <div className="text-sm text-muted-foreground">{user.email}</div>
                    </div>
                  </div>
                  {selectedUser?.id === user.id && (
                    <CheckCircle className="h-5 w-5 text-blue-600" />
                  )}
                </div>
              ))}
            </div>

            {users.length === 0 && userSearchQuery && (
              <div className="text-center py-4 text-muted-foreground">
                No users found matching your search.
              </div>
            )}
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowLinkDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={() => selectedPlayer && selectedUser && handleLinkPlayer(selectedPlayer, selectedUser)}
              disabled={!selectedUser || isLinking}
            >
              {isLinking ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Linking...
                </>
              ) : (
                <>
                  <Link className="h-4 w-4 mr-2" />
                  Link Player
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Unlink Player Dialog */}
      <Dialog open={showUnlinkDialog} onOpenChange={setShowUnlinkDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Unlink Player</DialogTitle>
            <DialogDescription>
              Are you sure you want to unlink {selectedPlayer?.name} from {selectedPlayer?.linkedUser?.name}?
              This action can be undone by linking the player again.
            </DialogDescription>
          </DialogHeader>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUnlinkDialog(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => selectedPlayer && handleUnlinkPlayer(selectedPlayer)}
              disabled={isLinking}
            >
              {isLinking ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Unlinking...
                </>
              ) : (
                <>
                  <Unlink className="h-4 w-4 mr-2" />
                  Unlink Player
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}