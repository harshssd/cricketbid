'use client'

import { useState, useEffect, useCallback } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import {
  Plus, Edit, Users, Crown, Trash2, UserPlus, X, AlertTriangle, Lock, Copy, ExternalLink, Shield
} from 'lucide-react'
import { toast } from 'sonner'

interface User {
  id: string
  name: string
  email: string
  image?: string
}

interface PlayerInfo {
  id: string
  name: string
  image?: string
  playingRole: string
  status: string
  tier?: { name: string; color: string }
}

interface Team {
  id: string
  name: string
  description?: string
  primaryColor: string
  secondaryColor: string
  logo?: string
  captainId?: string
  budgetRemaining?: number
  captain?: User
  players: PlayerInfo[]
  _count: {
    players: number
    members: number
  }
}

interface AuctionTeamManagerProps {
  auctionId: string
  auctionName?: string
  availableMembers?: User[]
  onTeamChange?: () => void
}

interface TeamFormData {
  name: string
  description: string
  primaryColor: string
  secondaryColor: string
  captainId: string
}

const defaultForm: TeamFormData = {
  name: '',
  description: '',
  primaryColor: '#3B82F6',
  secondaryColor: '#1B2A4A',
  captainId: '',
}

export function AuctionTeamManager({
  auctionId,
  auctionName,
  availableMembers = [],
  onTeamChange,
}: AuctionTeamManagerProps) {
  const [teams, setTeams] = useState<Team[]>([])
  const [auctionStatus, setAuctionStatus] = useState<string>('DRAFT')
  const [budgetPerTeam, setBudgetPerTeam] = useState<number>(1000)
  const [loading, setLoading] = useState(false)
  const [updatingBudget, setUpdatingBudget] = useState(false)

  // Dialogs
  const [createOpen, setCreateOpen] = useState(false)
  const [editTeam, setEditTeam] = useState<Team | null>(null)
  const [deleteTeam, setDeleteTeam] = useState<Team | null>(null)
  const [playerAssignTeam, setPlayerAssignTeam] = useState<Team | null>(null)

  // Form state
  const [form, setForm] = useState<TeamFormData>(defaultForm)

  // Available players for assignment (not already on a team)
  const [availablePlayers, setAvailablePlayers] = useState<PlayerInfo[]>([])
  const [loadingPlayers, setLoadingPlayers] = useState(false)

  const isEditable = auctionStatus === 'DRAFT' || auctionStatus === 'LOBBY'

  const fetchTeams = useCallback(async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/auctions/${auctionId}/teams`)
      const data = await response.json()
      if (data.teams) {
        setTeams(data.teams)
        if (data.auctionStatus) setAuctionStatus(data.auctionStatus)
        if (data.budgetPerTeam) setBudgetPerTeam(data.budgetPerTeam)
      }
    } catch (error) {
      console.error('Failed to fetch teams:', error)
      toast.error('Failed to load teams')
    } finally {
      setLoading(false)
    }
  }, [auctionId])

  useEffect(() => {
    fetchTeams()
  }, [fetchTeams])

  const fetchAvailablePlayers = async () => {
    try {
      setLoadingPlayers(true)
      const response = await fetch(`/api/auctions/${auctionId}/players/import`)
      const data = await response.json()
      if (data.players) {
        // Filter to only unassigned players
        const unassigned = data.players.filter(
          (p: any) => !p.assignedTeam
        )
        setAvailablePlayers(unassigned)
      }
    } catch (error) {
      console.error('Failed to fetch players:', error)
    } finally {
      setLoadingPlayers(false)
    }
  }

  // --- Create Team ---
  const handleCreate = async () => {
    if (!form.name.trim()) {
      toast.error('Team name is required')
      return
    }

    try {
      setLoading(true)
      const response = await fetch(`/api/auctions/${auctionId}/teams`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teams: [
            ...teams.map(t => ({ id: t.id, name: t.name, primaryColor: t.primaryColor, secondaryColor: t.secondaryColor })),
            {
              name: form.name,
              description: form.description || undefined,
              primaryColor: form.primaryColor,
              secondaryColor: form.secondaryColor,
              captainId: form.captainId || undefined,
              budgetRemaining: budgetPerTeam,
            }
          ]
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create team')
      }

      toast.success(`Team "${form.name}" created`)
      setForm(defaultForm)
      setCreateOpen(false)
      await fetchTeams()
      onTeamChange?.()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create team')
    } finally {
      setLoading(false)
    }
  }

  // --- Edit Team ---
  const openEdit = (team: Team) => {
    setForm({
      name: team.name,
      description: team.description || '',
      primaryColor: team.primaryColor,
      secondaryColor: team.secondaryColor,
      captainId: team.captainId || '',
    })
    setEditTeam(team)
  }

  const handleEdit = async () => {
    if (!editTeam || !form.name.trim()) return

    try {
      setLoading(true)
      const response = await fetch(`/api/auctions/${auctionId}/teams/${editTeam.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: form.name,
          description: form.description || null,
          primaryColor: form.primaryColor,
          secondaryColor: form.secondaryColor,
          captainId: form.captainId || null,
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update team')
      }

      toast.success(`Team "${form.name}" updated`)
      setEditTeam(null)
      setForm(defaultForm)
      await fetchTeams()
      onTeamChange?.()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update team')
    } finally {
      setLoading(false)
    }
  }

  // --- Delete Team ---
  const handleDelete = async () => {
    if (!deleteTeam) return

    try {
      setLoading(true)
      const response = await fetch(`/api/auctions/${auctionId}/teams/${deleteTeam.id}`, {
        method: 'DELETE',
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to delete team')
      }

      toast.success(`Team "${deleteTeam.name}" deleted`)
      setDeleteTeam(null)
      await fetchTeams()
      onTeamChange?.()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to delete team')
    } finally {
      setLoading(false)
    }
  }

  // --- Assign Player ---
  const handleAssignPlayer = async (playerId: string) => {
    if (!playerAssignTeam) return

    try {
      const response = await fetch(
        `/api/auctions/${auctionId}/teams/${playerAssignTeam.id}/players`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playerIds: [playerId] })
        }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to assign player')
      }

      const data = await response.json()
      // Update local state
      setPlayerAssignTeam(prev => prev ? { ...prev, players: data.team.players, _count: data.team._count } : null)
      setAvailablePlayers(prev => prev.filter(p => p.id !== playerId))
      // Refresh teams list
      await fetchTeams()
      onTeamChange?.()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to assign player')
    }
  }

  // --- Remove Player ---
  const handleRemovePlayer = async (playerId: string) => {
    if (!playerAssignTeam) return

    try {
      const response = await fetch(
        `/api/auctions/${auctionId}/teams/${playerAssignTeam.id}/players`,
        {
          method: 'DELETE',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playerIds: [playerId] })
        }
      )

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to remove player')
      }

      const data = await response.json()
      const removedPlayer = playerAssignTeam.players.find(p => p.id === playerId)
      setPlayerAssignTeam(prev => prev ? { ...prev, players: data.team.players, _count: data.team._count } : null)
      if (removedPlayer) {
        setAvailablePlayers(prev => [...prev, removedPlayer])
      }
      await fetchTeams()
      onTeamChange?.()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to remove player')
    }
  }

  const openPlayerAssign = (team: Team) => {
    setPlayerAssignTeam(team)
    fetchAvailablePlayers()
  }

  // --- Update Budget ---
  const handleBudgetUpdate = async (newBudget: number) => {
    try {
      setUpdatingBudget(true)
      const response = await fetch(`/api/auctions/${auctionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          budgetPerTeam: newBudget
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to update budget')
      }

      setBudgetPerTeam(newBudget)
      await fetchTeams() // Refresh teams to show updated budgets
      onTeamChange?.()
      toast.success(`Budget updated to ${newBudget} coins per team`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update budget')
    } finally {
      setUpdatingBudget(false)
    }
  }

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text)
      toast.success('URL copied to clipboard')
    } catch (error) {
      toast.error('Failed to copy URL')
    }
  }

  const getCaptainUrl = (team: Team) => {
    const baseUrl = typeof window !== 'undefined' ? window.location.origin : 'http://localhost:3000'
    return `${baseUrl}/captain/${auctionId}-${team.id}`
  }

  // Shared form fields rendered inline (NOT as a nested component to avoid focus loss)
  const teamFormFields = (
    <>
      <div>
        <Label htmlFor="team-name">Team Name *</Label>
        <Input
          id="team-name"
          value={form.name}
          onChange={(e) => setForm(prev => ({ ...prev, name: e.target.value }))}
          placeholder="Enter team name"
        />
      </div>

      <div>
        <Label htmlFor="team-desc">Description</Label>
        <Textarea
          id="team-desc"
          value={form.description}
          onChange={(e) => setForm(prev => ({ ...prev, description: e.target.value }))}
          placeholder="Optional description"
          rows={2}
        />
      </div>

      {availableMembers.length > 0 && (
        <div>
          <Label>Captain</Label>
          <Select
            value={form.captainId}
            onValueChange={(value) => setForm(prev => ({ ...prev, captainId: value === 'none' ? '' : value }))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select a captain (optional)" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="none">No captain</SelectItem>
              {availableMembers.map((member) => (
                <SelectItem key={member.id} value={member.id}>
                  {member.name} ({member.email})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      )}
    </>
  )

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">
            Teams {auctionName ? `- ${auctionName}` : ''}
          </h3>
          <p className="text-sm text-muted-foreground">
            {teams.length} team{teams.length !== 1 ? 's' : ''} configured
            {!isEditable && (
              <span className="inline-flex items-center gap-1 ml-2 text-amber-600">
                <Lock className="w-3 h-3" /> Editing locked
              </span>
            )}
          </p>
        </div>

        {isEditable && (
          <Button onClick={() => { setForm(defaultForm); setCreateOpen(true) }}>
            <Plus className="w-4 h-4 mr-2" />
            Add Team
          </Button>
        )}
      </div>

      {/* Budget Configuration */}
      {isEditable && (
        <Card className="bg-info/10 border-info/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="font-medium text-info-foreground">Budget per Team</h4>
                <p className="text-sm text-info-foreground">
                  Set how many coins each team/captain starts with
                </p>
              </div>
              <div className="flex items-center gap-3">
                <div className="flex items-center gap-2">
                  <Input
                    type="number"
                    value={budgetPerTeam}
                    onChange={(e) => setBudgetPerTeam(parseInt(e.target.value) || 0)}
                    min="100"
                    max="10000"
                    step="50"
                    className="w-24 h-8 text-center"
                    disabled={updatingBudget}
                  />
                  <span className="text-sm text-info-foreground">coins</span>
                </div>
                <Button
                  size="sm"
                  onClick={() => handleBudgetUpdate(budgetPerTeam)}
                  disabled={updatingBudget || budgetPerTeam < 100 || budgetPerTeam > 10000}
                  className="bg-primary hover:bg-primary/90 text-primary-foreground"
                >
                  {updatingBudget ? 'Saving...' : 'Update'}
                </Button>
              </div>
            </div>
            <div className="mt-3 flex gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setBudgetPerTeam(600)}
                className="text-xs"
                disabled={updatingBudget}
              >
                600
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setBudgetPerTeam(1000)}
                className="text-xs"
                disabled={updatingBudget}
              >
                1000
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setBudgetPerTeam(1500)}
                className="text-xs"
                disabled={updatingBudget}
              >
                1500
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Captain URLs Section */}
      {teams.length > 0 && (
        <Card className="bg-success/10 border-success/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h4 className="font-medium text-success-foreground">Team Bidding Links</h4>
                <p className="text-sm text-success-foreground">
                  Share these unique URLs with team administrators (captains and vice-captains) to access the bidding interface
                </p>
              </div>
            </div>
            <div className="space-y-3">
              {teams.map((team) => (
                <div key={team.id} className="flex items-center justify-between p-3 bg-card rounded-lg border">
                  <div className="flex items-center gap-3">
                    <div
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: team.primaryColor }}
                    />
                    <div>
                      <p className="font-medium text-sm">{team.name}</p>
                      {team.captain && (
                        <p className="text-xs text-muted-foreground">Captain: {team.captain.name}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <code className="text-xs bg-muted px-2 py-1 rounded font-mono max-w-xs truncate">
                      {getCaptainUrl(team)}
                    </code>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(getCaptainUrl(team))}
                      className="h-8 w-8 p-0"
                    >
                      <Copy className="w-3 h-3" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => window.open(getCaptainUrl(team), '_blank')}
                      className="h-8 w-8 p-0"
                    >
                      <ExternalLink className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
            <div className="mt-4 p-3 bg-success/10 rounded-lg">
              <p className="text-xs text-success-foreground">
                <strong>Multi-Admin Access:</strong> Multiple users can access each team's bidding interface. The system checks for:
                1) Team captain (assigned in team settings), 2) Team members with Captain/Vice-Captain roles,
                3) Users with auction admin privileges (Owner/Moderator roles).
              </p>
              <p className="text-xs text-success-foreground mt-1">
                <strong>Setup:</strong> Use the "Admins" button on each team to configure who can access the bidding interface.
                All authorized users will be redirected to login if not authenticated.
              </p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Teams Grid */}
      {loading && teams.length === 0 ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      ) : teams.length === 0 ? (
        <div className="text-center py-12 text-muted-foreground">
          <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
          <p>No teams yet</p>
          {isEditable && <p className="text-sm">Add teams to get started</p>}
        </div>
      ) : (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {teams.map((team) => (
            <Card key={team.id} className="relative">
              {/* Color bar */}
              <div
                className="absolute top-0 left-0 right-0 h-1 rounded-t-lg"
                style={{
                  background: `linear-gradient(to right, ${team.primaryColor}, ${team.secondaryColor})`
                }}
              />

              <CardHeader className="pb-3 pt-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <CardTitle className="text-base font-medium flex items-center gap-2">
                      <div
                        className="w-3 h-3 rounded-full border"
                        style={{ backgroundColor: team.primaryColor }}
                      />
                      {team.name}
                    </CardTitle>
                    {team.description && (
                      <p className="text-sm text-muted-foreground mt-1">{team.description}</p>
                    )}
                  </div>
                  {team.budgetRemaining !== undefined && team.budgetRemaining !== null && (
                    <Badge variant="outline" className="text-xs shrink-0">
                      {team.budgetRemaining} coins
                    </Badge>
                  )}
                </div>
              </CardHeader>

              <CardContent className="py-2">
                <div className="space-y-3">
                  {/* Captain */}
                  {team.captain ? (
                    <div className="flex items-center gap-2">
                      <Avatar className="w-6 h-6">
                        <AvatarImage src={team.captain.image} />
                        <AvatarFallback className="text-xs">
                          {team.captain.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm">{team.captain.name}</span>
                      <Crown className="w-3 h-3 text-yellow-600" />
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground italic">No captain assigned</p>
                  )}

                  {/* Pre-assigned players */}
                  {team.players && team.players.length > 0 ? (
                    <div>
                      <p className="text-xs font-medium text-muted-foreground mb-1">
                        Pre-assigned Players ({team.players.length})
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {team.players.slice(0, 5).map((player) => (
                          <Badge key={player.id} variant="secondary" className="text-xs">
                            {player.name}
                          </Badge>
                        ))}
                        {team.players.length > 5 && (
                          <Badge variant="outline" className="text-xs">
                            +{team.players.length - 5} more
                          </Badge>
                        )}
                      </div>
                    </div>
                  ) : (
                    <p className="text-xs text-muted-foreground">No pre-assigned players</p>
                  )}
                </div>
              </CardContent>

              {isEditable && (
                <CardFooter className="pt-3 gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openEdit(team)}
                  >
                    <Edit className="w-3 h-3 mr-1" />
                    Edit
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openPlayerAssign(team)}
                  >
                    <UserPlus className="w-3 h-3 mr-1" />
                    Players
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => window.open(`/admin/auctions/${auctionId}/teams/${team.id}/admins`, '_blank')}
                    title="Manage team administrators who can access the bidding interface"
                  >
                    <Shield className="w-3 h-3 mr-1" />
                    Admins
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    className="text-destructive hover:text-destructive hover:bg-destructive/10 ml-auto"
                    onClick={() => setDeleteTeam(team)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </CardFooter>
              )}
            </Card>
          ))}
        </div>
      )}

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={(open) => { if (!open) { setCreateOpen(false); setForm(defaultForm) } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add New Team</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {teamFormFields}
            <DialogFooter>
              <Button variant="outline" onClick={() => { setCreateOpen(false); setForm(defaultForm) }}>
                Cancel
              </Button>
              <Button onClick={handleCreate} disabled={loading || !form.name.trim()}>
                {loading ? 'Saving...' : 'Create Team'}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editTeam} onOpenChange={(open) => { if (!open) { setEditTeam(null); setForm(defaultForm) } }}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Team</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            {teamFormFields}
            <DialogFooter>
              <Button variant="outline" onClick={() => { setEditTeam(null); setForm(defaultForm) }}>
                Cancel
              </Button>
              <Button onClick={handleEdit} disabled={loading || !form.name.trim()}>
                {loading ? 'Saving...' : 'Save Changes'}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTeam} onOpenChange={(open) => { if (!open) setDeleteTeam(null) }}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Delete Team
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <p>
              Are you sure you want to delete <strong>{deleteTeam?.name}</strong>?
            </p>
            {deleteTeam?.players && deleteTeam.players.length > 0 && (
              <p className="text-sm text-amber-600">
                {deleteTeam.players.length} pre-assigned player{deleteTeam.players.length !== 1 ? 's' : ''} will be unassigned.
              </p>
            )}
            <p className="text-sm text-muted-foreground">This action cannot be undone.</p>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTeam(null)}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={loading}>
              {loading ? 'Deleting...' : 'Delete Team'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Player Assignment Dialog */}
      <Dialog
        open={!!playerAssignTeam}
        onOpenChange={(open) => { if (!open) setPlayerAssignTeam(null) }}
      >
        <DialogContent className="sm:max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <UserPlus className="w-5 h-5" />
              Manage Players - {playerAssignTeam?.name}
            </DialogTitle>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-4">
            {/* Current players on this team */}
            <div>
              <h4 className="text-sm font-medium mb-2">
                Assigned Players ({playerAssignTeam?.players.length || 0})
              </h4>
              {playerAssignTeam?.players && playerAssignTeam.players.length > 0 ? (
                <div className="space-y-1">
                  {playerAssignTeam.players.map((player) => (
                    <div
                      key={player.id}
                      className="flex items-center justify-between p-2 rounded border bg-success/10 border-success/30"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium">{player.name}</span>
                        {player.tier && (
                          <Badge
                            variant="outline"
                            className="text-xs"
                            style={{ borderColor: player.tier.color, color: player.tier.color }}
                          >
                            {player.tier.name}
                          </Badge>
                        )}
                        <Badge variant="secondary" className="text-xs">
                          {player.playingRole.replace('_', ' ')}
                        </Badge>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-destructive hover:text-destructive hover:bg-destructive/10"
                        onClick={() => handleRemovePlayer(player.id)}
                      >
                        <X className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic p-2">
                  No players assigned yet. Add from the pool below.
                </p>
              )}
            </div>

            <Separator />

            {/* Available players to assign */}
            <div>
              <h4 className="text-sm font-medium mb-2">
                Available Players ({availablePlayers.length})
              </h4>
              {loadingPlayers ? (
                <div className="flex items-center justify-center py-4">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary" />
                </div>
              ) : availablePlayers.length > 0 ? (
                <div className="space-y-1">
                  {availablePlayers.map((player) => (
                    <div
                      key={player.id}
                      className="flex items-center justify-between p-2 rounded border hover:bg-muted"
                    >
                      <div className="flex items-center gap-2">
                        <span className="text-sm">{player.name}</span>
                        {player.tier && (
                          <Badge
                            variant="outline"
                            className="text-xs"
                            style={{ borderColor: player.tier.color, color: player.tier.color }}
                          >
                            {player.tier.name}
                          </Badge>
                        )}
                        <Badge variant="secondary" className="text-xs">
                          {player.playingRole.replace('_', ' ')}
                        </Badge>
                      </div>
                      <Button
                        variant="outline"
                        size="sm"
                        className="h-7 text-xs"
                        onClick={() => handleAssignPlayer(player.id)}
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Add
                      </Button>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground italic p-2">
                  No unassigned players in the auction pool. Import players first.
                </p>
              )}
            </div>
          </div>

          <DialogFooter className="mt-4">
            <Button variant="outline" onClick={() => setPlayerAssignTeam(null)}>
              Done
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
