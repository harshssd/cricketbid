'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  Plus, Users, Edit, Trash2, Save, X, Crown, UserPlus,
  Settings, Eye, Archive, RotateCcw
} from 'lucide-react'

interface ClubMember {
  id: string
  name: string
  email: string
  image?: string
}

interface ClubTeam {
  id: string
  name: string
  description?: string
  primaryColor: string
  secondaryColor: string
  logo?: string
  captainId?: string
  captain?: ClubMember
  maxMembers: number
  isActive: boolean
  createdAt: string
  updatedAt: string
  _count: {
    members: number
    leagueTeams: number
  }
}

interface ClubTeamManagerProps {
  clubId: string
  members: ClubMember[]
  onTeamChange?: (teams: ClubTeam[]) => void
}

export function ClubTeamManager({ clubId, members, onTeamChange }: ClubTeamManagerProps) {
  const [teams, setTeams] = useState<ClubTeam[]>([])
  const [loading, setLoading] = useState(true)
  const [editingTeam, setEditingTeam] = useState<string | null>(null)
  const [creatingTeam, setCreatingTeam] = useState(false)
  const [showInactive, setShowInactive] = useState(false)

  // Form state for creating/editing teams
  const [teamForm, setTeamForm] = useState({
    name: '',
    description: '',
    captainId: '',
    maxMembers: 11,
    primaryColor: '#3B82F6',
    secondaryColor: '#1B2A4A'
  })

  // Load teams
  useEffect(() => {
    loadTeams()
  }, [clubId, showInactive])

  const loadTeams = async () => {
    try {
      const response = await fetch(`/api/clubs/${clubId}/teams?includeInactive=${showInactive}`)
      const data = await response.json()

      if (response.ok) {
        setTeams(data.teams || [])
        onTeamChange?.(data.teams || [])
      } else {
        console.error('Failed to load teams:', data.error)
      }
    } catch (error) {
      console.error('Error loading teams:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateTeam = async () => {
    try {
      const response = await fetch(`/api/clubs/${clubId}/teams`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(teamForm)
      })

      const data = await response.json()

      if (response.ok) {
        setTeams(prev => [...prev, data.team])
        setCreatingTeam(false)
        resetForm()
        onTeamChange?.([...teams, data.team])
      } else {
        console.error('Failed to create team:', data.error)
      }
    } catch (error) {
      console.error('Error creating team:', error)
    }
  }

  const handleUpdateTeam = async (teamId: string) => {
    const team = teams.find(t => t.id === teamId)
    if (!team) return

    try {
      const updatedTeams = teams.map(t =>
        t.id === teamId
          ? { ...t, ...teamForm, id: teamId }
          : t
      )

      const response = await fetch(`/api/clubs/${clubId}/teams`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teams: updatedTeams })
      })

      const data = await response.json()

      if (response.ok) {
        setTeams(data.teams)
        setEditingTeam(null)
        resetForm()
        onTeamChange?.(data.teams)
      } else {
        console.error('Failed to update team:', data.error)
      }
    } catch (error) {
      console.error('Error updating team:', error)
    }
  }

  const handleToggleTeamStatus = async (teamId: string) => {
    const team = teams.find(t => t.id === teamId)
    if (!team) return

    try {
      const updatedTeams = teams.map(t =>
        t.id === teamId
          ? { ...t, isActive: !t.isActive }
          : t
      )

      const response = await fetch(`/api/clubs/${clubId}/teams`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ teams: updatedTeams })
      })

      const data = await response.json()

      if (response.ok) {
        setTeams(data.teams)
        onTeamChange?.(data.teams)
      } else {
        console.error('Failed to toggle team status:', data.error)
      }
    } catch (error) {
      console.error('Error toggling team status:', error)
    }
  }

  const startEditing = (team: ClubTeam) => {
    setTeamForm({
      name: team.name,
      description: team.description || '',
      captainId: team.captainId || '',
      maxMembers: team.maxMembers,
      primaryColor: team.primaryColor,
      secondaryColor: team.secondaryColor
    })
    setEditingTeam(team.id)
  }

  const resetForm = () => {
    setTeamForm({
      name: '',
      description: '',
      captainId: '',
      maxMembers: 11,
      primaryColor: '#3B82F6',
      secondaryColor: '#1B2A4A'
    })
  }

  const cancelEditing = () => {
    setEditingTeam(null)
    setCreatingTeam(false)
    resetForm()
  }

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <Card key={i} className="animate-pulse">
            <CardContent className="p-4">
              <div className="h-4 bg-muted rounded w-1/3 mb-2" />
              <div className="h-3 bg-muted rounded w-2/3" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  const activeTeams = teams.filter(team => team.isActive)
  const inactiveTeams = teams.filter(team => !team.isActive)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold">Club Teams</h2>
          <p className="text-muted-foreground">
            Manage your club's teams and assign captains
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={showInactive ? "outline" : "ghost"}
            size="sm"
            onClick={() => setShowInactive(!showInactive)}
          >
            {showInactive ? <Eye className="h-4 w-4 mr-2" /> : <Archive className="h-4 w-4 mr-2" />}
            {showInactive ? 'Hide Inactive' : 'Show Inactive'}
          </Button>
          <Button onClick={() => setCreatingTeam(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Team
          </Button>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-primary">{activeTeams.length}</div>
            <div className="text-sm text-muted-foreground">Active Teams</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-success">
              {activeTeams.reduce((sum, team) => sum + team._count.members, 0)}
            </div>
            <div className="text-sm text-muted-foreground">Total Members</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4 text-center">
            <div className="text-2xl font-bold text-purple-600">
              {activeTeams.reduce((sum, team) => sum + team._count.leagueTeams, 0)}
            </div>
            <div className="text-sm text-muted-foreground">League Participations</div>
          </CardContent>
        </Card>
      </div>

      {/* Active Teams */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Active Teams</h3>
        {activeTeams.length === 0 ? (
          <Card className="p-8 text-center">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No active teams</h3>
            <p className="text-muted-foreground mb-4">
              Create your first team to start organizing your club members
            </p>
            <Button onClick={() => setCreatingTeam(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Create First Team
            </Button>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {activeTeams.map((team) => (
              <TeamCard
                key={team.id}
                team={team}
                members={members}
                editing={editingTeam === team.id}
                teamForm={teamForm}
                onFormChange={setTeamForm}
                onStartEdit={startEditing}
                onSave={() => handleUpdateTeam(team.id)}
                onCancel={cancelEditing}
                onToggleStatus={() => handleToggleTeamStatus(team.id)}
              />
            ))}
          </div>
        )}
      </div>

      {/* Inactive Teams */}
      {showInactive && inactiveTeams.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold text-muted-foreground">Inactive Teams</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {inactiveTeams.map((team) => (
              <TeamCard
                key={team.id}
                team={team}
                members={members}
                editing={false}
                teamForm={teamForm}
                onFormChange={setTeamForm}
                onStartEdit={startEditing}
                onSave={() => {}}
                onCancel={cancelEditing}
                onToggleStatus={() => handleToggleTeamStatus(team.id)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Create Team Dialog */}
      <Dialog open={creatingTeam} onOpenChange={setCreatingTeam}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Create New Team</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Team Name</label>
              <Input
                value={teamForm.name}
                onChange={(e) => setTeamForm({ ...teamForm, name: e.target.value })}
                placeholder="Enter team name"
              />
            </div>
            <div>
              <label className="text-sm font-medium">Description</label>
              <Textarea
                value={teamForm.description}
                onChange={(e) => setTeamForm({ ...teamForm, description: e.target.value })}
                placeholder="Team description (optional)"
                rows={3}
              />
            </div>
            <div>
              <label className="text-sm font-medium">Captain</label>
              <Select
                value={teamForm.captainId}
                onValueChange={(value) => setTeamForm({ ...teamForm, captainId: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select captain (optional)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">No captain</SelectItem>
                  {members.map((member) => (
                    <SelectItem key={member.id} value={member.id}>
                      {member.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium">Max Members</label>
              <Input
                type="number"
                min={1}
                max={50}
                value={teamForm.maxMembers}
                onChange={(e) => setTeamForm({ ...teamForm, maxMembers: parseInt(e.target.value) || 11 })}
              />
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={cancelEditing}>Cancel</Button>
              <Button onClick={handleCreateTeam} disabled={!teamForm.name.trim()}>
                <Plus className="h-4 w-4 mr-2" />
                Create Team
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

interface TeamCardProps {
  team: ClubTeam
  members: ClubMember[]
  editing: boolean
  teamForm: any
  onFormChange: (form: any) => void
  onStartEdit: (team: ClubTeam) => void
  onSave: () => void
  onCancel: () => void
  onToggleStatus: () => void
}

function TeamCard({
  team,
  members,
  editing,
  teamForm,
  onFormChange,
  onStartEdit,
  onSave,
  onCancel,
  onToggleStatus
}: TeamCardProps) {
  if (editing) {
    return (
      <Card className="border-primary bg-primary/10">
        <CardHeader>
          <div className="space-y-3">
            <Input
              value={teamForm.name}
              onChange={(e) => onFormChange({ ...teamForm, name: e.target.value })}
              placeholder="Team name"
              className="font-semibold"
            />
            <Textarea
              value={teamForm.description}
              onChange={(e) => onFormChange({ ...teamForm, description: e.target.value })}
              placeholder="Team description (optional)"
              rows={2}
            />
            <Select
              value={teamForm.captainId}
              onValueChange={(value) => onFormChange({ ...teamForm, captainId: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select captain (optional)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">No captain</SelectItem>
                {members.map((member) => (
                  <SelectItem key={member.id} value={member.id}>
                    {member.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex justify-end space-x-2">
            <Button variant="outline" size="sm" onClick={onCancel}>
              <X className="h-4 w-4 mr-1" />
              Cancel
            </Button>
            <Button size="sm" onClick={onSave}>
              <Save className="h-4 w-4 mr-1" />
              Save
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={`${!team.isActive ? 'opacity-60 border-dashed' : ''}`}>
      <CardHeader>
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <div className="flex items-center gap-2 mb-1">
              <CardTitle className="text-lg">{team.name}</CardTitle>
              {!team.isActive && <Badge variant="secondary">Inactive</Badge>}
            </div>
            {team.description && (
              <p className="text-sm text-muted-foreground">{team.description}</p>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Captain */}
        {team.captain && (
          <div className="flex items-center gap-2">
            <Crown className="h-4 w-4 text-yellow-500" />
            <Avatar className="h-6 w-6">
              <AvatarImage src={team.captain.image} />
              <AvatarFallback className="text-xs">
                {team.captain.name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <span className="text-sm font-medium">{team.captain.name}</span>
            <Badge variant="outline" className="text-xs">Captain</Badge>
          </div>
        )}

        {/* Stats */}
        <div className="grid grid-cols-3 gap-2 text-center text-sm">
          <div>
            <div className="font-bold">{team._count.members}</div>
            <div className="text-muted-foreground">Members</div>
          </div>
          <div>
            <div className="font-bold">{team.maxMembers}</div>
            <div className="text-muted-foreground">Max Size</div>
          </div>
          <div>
            <div className="font-bold">{team._count.leagueTeams}</div>
            <div className="text-muted-foreground">Leagues</div>
          </div>
        </div>

        {/* Actions */}
        <div className="flex justify-between items-center pt-2">
          <div className="flex space-x-1">
            {team.isActive && (
              <Button variant="outline" size="sm" onClick={() => onStartEdit(team)}>
                <Edit className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="outline"
              size="sm"
              onClick={onToggleStatus}
              className={team.isActive ? 'text-destructive hover:text-destructive' : 'text-success hover:text-success'}
            >
              {team.isActive ? <Archive className="h-4 w-4" /> : <RotateCcw className="h-4 w-4" />}
            </Button>
          </div>
          <Badge variant="outline" className="text-xs">
            Created {new Date(team.createdAt).toLocaleDateString()}
          </Badge>
        </div>
      </CardContent>
    </Card>
  )
}