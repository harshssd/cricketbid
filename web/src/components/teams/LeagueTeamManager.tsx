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
import { Checkbox } from '@/components/ui/checkbox'
import { Plus, Edit, Users, Crown, ExternalLink, Import, Trash2, CheckCircle, AlertCircle } from 'lucide-react'
import { toast } from 'sonner'

interface User {
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
  captain?: User
  club: {
    name: string
    logo?: string
  }
  _count: {
    members: number
  }
  isActive: boolean
}

interface LeagueTeam {
  id: string
  name: string
  description?: string
  primaryColor: string
  secondaryColor: string
  logo?: string
  captain?: User
  captainId?: string
  maxMembers: number
  sourceType: 'CLUB' | 'LEAGUE' | 'AUCTION'
  sourceId?: string
  sourceClubTeam?: {
    id: string
    name: string
    club: {
      name: string
      logo?: string
    }
  }
  _count: {
    members: number
  }
  isActive: boolean
  createdAt: string
  updatedAt: string
}

interface LeagueTeamManagerProps {
  leagueId: string
  members: User[]
  onTeamChange?: (teams: LeagueTeam[]) => void
}

interface TeamFormData {
  name: string
  description: string
  primaryColor: string
  secondaryColor: string
  logo: string
  captainId: string
  maxMembers: number
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

export function LeagueTeamManager({ leagueId, members, onTeamChange }: LeagueTeamManagerProps) {
  const [teams, setTeams] = useState<LeagueTeam[]>([])
  const [availableClubTeams, setAvailableClubTeams] = useState<ClubTeam[]>([])
  const [selectedClubTeams, setSelectedClubTeams] = useState<string[]>([])
  const [editingTeam, setEditingTeam] = useState<string | null>(null)
  const [teamForm, setTeamForm] = useState<TeamFormData>(defaultTeamForm)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [isImportDialogOpen, setIsImportDialogOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [importLoading, setImportLoading] = useState(false)

  // Fetch league teams
  const fetchTeams = async () => {
    try {
      const response = await fetch(`/api/leagues/${leagueId}/teams`)
      const data = await response.json()

      if (data.teams) {
        setTeams(data.teams)
        onTeamChange?.(data.teams)
      }
    } catch (error) {
      console.error('Failed to fetch league teams:', error)
      toast.error('Failed to load teams')
    }
  }

  // Fetch available club teams for import
  const fetchClubTeams = async () => {
    try {
      setImportLoading(true)
      // Get all clubs first, then fetch their teams
      const clubsResponse = await fetch('/api/clubs')
      const clubsData = await clubsResponse.json()

      if (clubsData.clubs) {
        const allClubTeams: ClubTeam[] = []

        for (const club of clubsData.clubs) {
          const teamsResponse = await fetch(`/api/clubs/${club.id}/teams`)
          const teamsData = await teamsResponse.json()

          if (teamsData.teams) {
            // Filter out teams that are already imported
            const importedSourceIds = teams
              .filter(team => team.sourceType === 'CLUB')
              .map(team => team.sourceId)

            const availableTeams = teamsData.teams
              .filter((team: ClubTeam) => team.isActive && !importedSourceIds.includes(team.id))
              .map((team: ClubTeam) => ({
                ...team,
                club: { name: club.name, logo: club.logo }
              }))

            allClubTeams.push(...availableTeams)
          }
        }

        setAvailableClubTeams(allClubTeams)
      }
    } catch (error) {
      console.error('Failed to fetch club teams:', error)
      toast.error('Failed to load club teams')
    } finally {
      setImportLoading(false)
    }
  }

  useEffect(() => {
    fetchTeams()
  }, [leagueId])

  const handleCreateTeam = async () => {
    if (!teamForm.name.trim()) {
      toast.error('Team name is required')
      return
    }

    try {
      setLoading(true)
      const response = await fetch(`/api/leagues/${leagueId}/teams`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: teamForm.name,
          description: teamForm.description,
          primaryColor: teamForm.primaryColor,
          secondaryColor: teamForm.secondaryColor,
          logo: teamForm.logo,
          captainId: teamForm.captainId || undefined,
          maxMembers: teamForm.maxMembers,
        }),
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

  const handleImportTeams = async () => {
    if (selectedClubTeams.length === 0) {
      toast.error('Please select at least one team to import')
      return
    }

    try {
      setImportLoading(true)
      const response = await fetch(`/api/leagues/${leagueId}/teams`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'import_from_club',
          clubTeamIds: selectedClubTeams,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to import teams')
      }

      const data = await response.json()

      if (data.success && data.importedTeams) {
        setTeams(prev => [...prev, ...data.importedTeams])
        setSelectedClubTeams([])
        setIsImportDialogOpen(false)
        onTeamChange?.([...teams, ...data.importedTeams])
        toast.success(data.message || `Successfully imported ${data.importedTeams.length} teams`)

        // Refresh available club teams
        await fetchClubTeams()
      }
    } catch (error) {
      console.error('Failed to import teams:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to import teams')
    } finally {
      setImportLoading(false)
    }
  }

  const handleTeamToggle = (teamId: string, checked: boolean) => {
    setSelectedClubTeams(prev =>
      checked
        ? [...prev, teamId]
        : prev.filter(id => id !== teamId)
    )
  }

  const activeTeams = teams.filter(team => team.isActive)
  const inactiveTeams = teams.filter(team => !team.isActive)

  const getSourceBadge = (team: LeagueTeam) => {
    switch (team.sourceType) {
      case 'CLUB':
        return (
          <Badge variant="outline" className="text-xs">
            <ExternalLink className="w-3 h-3 mr-1" />
            {team.sourceClubTeam?.club.name}
          </Badge>
        )
      case 'AUCTION':
        return (
          <Badge variant="outline" className="text-xs bg-warning/10 text-warning">
            <Crown className="w-3 h-3 mr-1" />
            Auction
          </Badge>
        )
      case 'LEAGUE':
      default:
        return (
          <Badge variant="outline" className="text-xs bg-info/10 text-info-foreground">
            League
          </Badge>
        )
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">League Teams</h3>
          <p className="text-sm text-muted-foreground">
            {activeTeams.length} active teams
            {inactiveTeams.length > 0 && ` • ${inactiveTeams.length} inactive`}
          </p>
        </div>
        <div className="flex gap-2">
          <Dialog open={isImportDialogOpen} onOpenChange={setIsImportDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" onClick={fetchClubTeams}>
                <Import className="w-4 h-4 mr-2" />
                Import from Clubs
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Import Teams from Clubs</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                {importLoading ? (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                  </div>
                ) : availableClubTeams.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">
                    <AlertCircle className="w-12 h-12 mx-auto mb-4 opacity-50" />
                    <p>No club teams available for import</p>
                  </div>
                ) : (
                  <>
                    <div className="grid gap-3 max-h-96 overflow-y-auto">
                      {availableClubTeams.map((clubTeam) => (
                        <div key={clubTeam.id} className="flex items-center space-x-3 p-3 border rounded-lg">
                          <Checkbox
                            checked={selectedClubTeams.includes(clubTeam.id)}
                            onCheckedChange={(checked) => handleTeamToggle(clubTeam.id, checked === true)}
                          />
                          <div className="flex-1">
                            <div className="flex items-center gap-2">
                              <h4 className="font-medium">{clubTeam.name}</h4>
                              <Badge variant="outline" className="text-xs">
                                {clubTeam.club.name}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-4 mt-1 text-sm text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Users className="w-3 h-3" />
                                {clubTeam._count.members} members
                              </span>
                              {clubTeam.captain && (
                                <span className="flex items-center gap-1">
                                  <Crown className="w-3 h-3" />
                                  {clubTeam.captain.name}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    <div className="flex justify-between pt-4 border-t">
                      <p className="text-sm text-muted-foreground">
                        {selectedClubTeams.length} teams selected
                      </p>
                      <Button
                        onClick={handleImportTeams}
                        disabled={selectedClubTeams.length === 0 || importLoading}
                      >
                        {importLoading ? 'Importing...' : `Import ${selectedClubTeams.length} Teams`}
                      </Button>
                    </div>
                  </>
                )}
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="w-4 h-4 mr-2" />
                Create Team
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New League Team</DialogTitle>
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
                      {members.map((member) => (
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
        </div>
      </div>

      {/* Teams Display */}
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
              <p className="text-sm">Create a team or import from clubs to get started</p>
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
                      {getSourceBadge(team)}
                      {team.sourceType === 'CLUB' && team.sourceClubTeam && (
                        <span className="text-xs text-muted-foreground">
                          from {team.sourceClubTeam.name}
                        </span>
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
                      <Button variant="outline" size="sm" className="flex-1">
                        <Edit className="w-3 h-3 mr-1" />
                        Edit
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1">
                        <Users className="w-3 h-3 mr-1" />
                        Members
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
    </div>
  )
}