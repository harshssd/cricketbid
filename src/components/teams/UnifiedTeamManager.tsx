'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Plus, Edit, Users, Crown, ArrowUpDown, Settings, Trash2, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'
import { TeamTransferDialog } from './TeamTransferDialog'
import { CaptainAssignmentDialog } from './CaptainAssignmentDialog'

interface User {
  id: string
  name: string
  email: string
  image?: string
}

interface TeamContext {
  id: string
  name: string
  logo?: string
}

interface Team {
  id: string
  name: string
  description?: string
  primaryColor: string
  secondaryColor: string
  logo?: string
  captainId?: string
  maxMembers: number
  isActive: boolean
  budgetRemaining?: number

  // Context associations
  clubId?: string
  leagueId?: string
  auctionId?: string

  // Relations
  captain?: User
  club?: TeamContext
  league?: TeamContext
  auction?: TeamContext
  _count: {
    members: number
  }

  createdAt: string
  updatedAt: string
}

interface UnifiedTeamManagerProps {
  // Context filter - if provided, only shows teams from this context
  contextType?: 'CLUB' | 'LEAGUE' | 'AUCTION'
  contextId?: string
  contextName?: string

  // Available members for captain assignment
  availableMembers?: User[]
  onTeamChange?: (teams: Team[]) => void
}

interface TeamFormData {
  name: string
  description: string
  primaryColor: string
  secondaryColor: string
  logo: string
  captainId: string
  maxMembers: number
  budgetRemaining?: number
}

const defaultTeamForm: TeamFormData = {
  name: '',
  description: '',
  primaryColor: '#3B82F6',
  secondaryColor: '#1B2A4A',
  logo: '',
  captainId: '',
  maxMembers: 11,
}

export function UnifiedTeamManager({
  contextType,
  contextId,
  contextName,
  availableMembers = [],
  onTeamChange
}: UnifiedTeamManagerProps) {
  const [teams, setTeams] = useState<Team[]>([])
  const [editingTeam, setEditingTeam] = useState<string | null>(null)
  const [teamForm, setTeamForm] = useState<TeamFormData>(defaultTeamForm)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [transferTeam, setTransferTeam] = useState<Team | null>(null)
  const [captainAssignTeam, setCaptainAssignTeam] = useState<Team | null>(null)
  const [loading, setLoading] = useState(false)

  // Fetch teams
  const fetchTeams = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (contextType && contextId) {
        params.append(contextType.toLowerCase() + 'Id', contextId)
      }
      params.append('includeInactive', 'true')

      const response = await fetch(`/api/teams?${params}`)
      const data = await response.json()

      if (data.teams) {
        setTeams(data.teams)
        onTeamChange?.(data.teams)
      }
    } catch (error) {
      console.error('Failed to fetch teams:', error)
      toast.error('Failed to load teams')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchTeams()
  }, [contextType, contextId])

  const handleCreateTeam = async () => {
    if (!teamForm.name.trim()) {
      toast.error('Team name is required')
      return
    }

    if (!contextType || !contextId) {
      toast.error('Context information is required to create a team')
      return
    }

    try {
      setLoading(true)
      const createData = {
        ...teamForm,
        captainId: teamForm.captainId || undefined,
        [contextType.toLowerCase() + 'Id']: contextId,
      }

      if (contextType === 'AUCTION' && teamForm.budgetRemaining) {
        createData.budgetRemaining = teamForm.budgetRemaining
      }

      const response = await fetch('/api/teams', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(createData),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to create team')
      }

      const data = await response.json()

      if (data.success && data.team) {
        setTeams(prev => [...prev, data.team])
        setTeamForm(defaultTeamForm)
        setIsCreateDialogOpen(false)
        onTeamChange?.([...teams, data.team])
        toast.success('Team created successfully')
      }
    } catch (error) {
      console.error('Failed to create team:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to create team')
    } finally {
      setLoading(false)
    }
  }

  const getContextBadge = (team: Team) => {
    if (team.club) {
      return (
        <Badge variant="outline" className="text-xs bg-green-50 text-green-700">
          Club: {team.club.name}
        </Badge>
      )
    }
    if (team.league) {
      return (
        <Badge variant="outline" className="text-xs bg-blue-50 text-blue-700">
          League: {team.league.name}
        </Badge>
      )
    }
    if (team.auction) {
      return (
        <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-700">
          Auction: {team.auction.name}
        </Badge>
      )
    }
    return <Badge variant="outline" className="text-xs">No Context</Badge>
  }

  const getTeamType = (team: Team) => {
    if (team.clubId) return 'CLUB'
    if (team.leagueId) return 'LEAGUE'
    if (team.auctionId) return 'AUCTION'
    return 'UNKNOWN'
  }

  const activeTeams = teams.filter(team => team.isActive)
  const inactiveTeams = teams.filter(team => !team.isActive)

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">
            {contextType ? `${contextType} Teams${contextName ? ` - ${contextName}` : ''}` : 'All Teams'}
          </h3>
          <p className="text-sm text-muted-foreground">
            {activeTeams.length} active teams
            {inactiveTeams.length > 0 && ` • ${inactiveTeams.length} inactive`}
          </p>
        </div>

        {contextType && contextId && (
          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create Team
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Team</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label htmlFor="team-name">Team Name *</Label>
                  <Input
                    id="team-name"
                    value={teamForm.name}
                    onChange={(e) => setTeamForm(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="Enter team name"
                  />
                </div>

                <div>
                  <Label htmlFor="team-description">Description</Label>
                  <Textarea
                    id="team-description"
                    value={teamForm.description}
                    onChange={(e) => setTeamForm(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Optional team description"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="primary-color">Primary Color</Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        id="primary-color"
                        value={teamForm.primaryColor}
                        onChange={(e) => setTeamForm(prev => ({ ...prev, primaryColor: e.target.value }))}
                        className="w-16 h-10 p-1"
                      />
                      <Input
                        value={teamForm.primaryColor}
                        onChange={(e) => setTeamForm(prev => ({ ...prev, primaryColor: e.target.value }))}
                        placeholder="#3B82F6"
                      />
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="secondary-color">Secondary Color</Label>
                    <div className="flex gap-2">
                      <Input
                        type="color"
                        id="secondary-color"
                        value={teamForm.secondaryColor}
                        onChange={(e) => setTeamForm(prev => ({ ...prev, secondaryColor: e.target.value }))}
                        className="w-16 h-10 p-1"
                      />
                      <Input
                        value={teamForm.secondaryColor}
                        onChange={(e) => setTeamForm(prev => ({ ...prev, secondaryColor: e.target.value }))}
                        placeholder="#1B2A4A"
                      />
                    </div>
                  </div>
                </div>

                <div>
                  <Label htmlFor="captain">Captain</Label>
                  <Select
                    value={teamForm.captainId}
                    onValueChange={(value) => setTeamForm(prev => ({ ...prev, captainId: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a captain" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No captain</SelectItem>
                      {availableMembers.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          {member.name} ({member.email})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div>
                  <Label htmlFor="max-members">Maximum Members</Label>
                  <Input
                    type="number"
                    id="max-members"
                    value={teamForm.maxMembers}
                    onChange={(e) => setTeamForm(prev => ({ ...prev, maxMembers: parseInt(e.target.value) || 11 }))}
                    min="1"
                    max="50"
                  />
                </div>

                {contextType === 'AUCTION' && (
                  <div>
                    <Label htmlFor="budget">Budget (Optional)</Label>
                    <Input
                      type="number"
                      id="budget"
                      value={teamForm.budgetRemaining || ''}
                      onChange={(e) => setTeamForm(prev => ({
                        ...prev,
                        budgetRemaining: e.target.value ? parseInt(e.target.value) : undefined
                      }))}
                      min="0"
                      placeholder="Team budget for auction"
                    />
                  </div>
                )}

                <div className="flex justify-end gap-2 pt-4">
                  <Button
                    variant="outline"
                    onClick={() => {
                      setTeamForm(defaultTeamForm)
                      setIsCreateDialogOpen(false)
                    }}
                  >
                    Cancel
                  </Button>
                  <Button onClick={handleCreateTeam} disabled={loading}>
                    {loading ? 'Creating...' : 'Create Team'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Teams Display */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : (
        <Tabs defaultValue="active" className="w-full">
          <TabsList>
            <TabsTrigger value="active">
              Active Teams ({activeTeams.length})
            </TabsTrigger>
            {inactiveTeams.length > 0 && (
              <TabsTrigger value="inactive">
                Inactive Teams ({inactiveTeams.length})
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="active" className="space-y-4">
            {activeTeams.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No active teams yet</p>
                {contextType && contextId && (
                  <p className="text-sm">Create a team to get started</p>
                )}
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {activeTeams.map((team) => (
                  <Card key={team.id} className="relative">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-base font-medium">{team.name}</CardTitle>
                          {team.description && (
                            <p className="text-sm text-muted-foreground mt-1">{team.description}</p>
                          )}
                        </div>
                        <div
                          className="w-4 h-4 rounded-full border-2 border-white shadow-sm"
                          style={{ backgroundColor: team.primaryColor }}
                        />
                      </div>
                      <div className="flex items-center gap-2">
                        {!contextType && getContextBadge(team)}
                        {team.budgetRemaining && (
                          <Badge variant="outline" className="text-xs">
                            ${team.budgetRemaining}
                          </Badge>
                        )}
                      </div>
                    </CardHeader>

                    <CardContent className="py-3">
                      <div className="space-y-2">
                        {team.captain && (
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
                        )}

                        <div className="flex items-center justify-between text-sm text-muted-foreground">
                          <span className="flex items-center gap-1">
                            <Users className="w-3 h-3" />
                            {team._count.members}/{team.maxMembers}
                          </span>
                          <span className="text-xs">
                            {new Date(team.createdAt).toLocaleDateString()}
                          </span>
                        </div>
                      </div>
                    </CardContent>

                    <CardFooter className="pt-3">
                      <div className="flex gap-2 w-full">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setCaptainAssignTeam(team)}
                        >
                          <Crown className="w-3 h-3 mr-1" />
                          Captain
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => setTransferTeam(team)}
                        >
                          <ArrowUpDown className="w-3 h-3 mr-1" />
                          Transfer
                        </Button>
                        <Button variant="outline" size="sm">
                          <Edit className="w-3 h-3 mr-1" />
                          Edit
                        </Button>
                      </div>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {inactiveTeams.length > 0 && (
            <TabsContent value="inactive" className="space-y-4">
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {inactiveTeams.map((team) => (
                  <Card key={team.id} className="relative opacity-60">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <CardTitle className="text-base font-medium">{team.name}</CardTitle>
                          <Badge variant="secondary" className="text-xs mt-2">Inactive</Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent className="py-3">
                      <div className="space-y-2">
                        {team.captain && (
                          <div className="flex items-center gap-2">
                            <Avatar className="w-6 h-6">
                              <AvatarImage src={team.captain.image} />
                              <AvatarFallback className="text-xs">
                                {team.captain.name.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <span className="text-sm">{team.captain.name}</span>
                          </div>
                        )}
                      </div>
                    </CardContent>
                    <CardFooter className="pt-3">
                      <Button variant="outline" size="sm" className="w-full">
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Reactivate
                      </Button>
                    </CardFooter>
                  </Card>
                ))}
              </div>
            </TabsContent>
          )}
        </Tabs>
      )}

      {/* Transfer Dialog */}
      {transferTeam && (
        <TeamTransferDialog
          team={transferTeam}
          fromType={getTeamType(transferTeam) as any}
          open={!!transferTeam}
          onOpenChange={(open) => !open && setTransferTeam(null)}
          onTransferComplete={() => {
            fetchTeams()
            setTransferTeam(null)
          }}
          availableMembers={availableMembers}
        />
      )}

      {/* Captain Assignment Dialog */}
      {captainAssignTeam && (
        <CaptainAssignmentDialog
          team={{
            id: captainAssignTeam.id,
            name: captainAssignTeam.name,
            type: getTeamType(captainAssignTeam) as any
          }}
          open={!!captainAssignTeam}
          onOpenChange={(open) => !open && setCaptainAssignTeam(null)}
          onCaptainAssigned={() => {
            fetchTeams()
            setCaptainAssignTeam(null)
          }}
        />
      )}
    </div>
  )
}