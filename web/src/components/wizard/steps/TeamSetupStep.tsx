'use client'

import { useEffect, useState } from 'react'
import { WizardStep } from '@/components/wizard/WizardStep'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Button } from '@/components/ui/button'
import { TeamsFormData, TeamFormData } from '@/lib/validations/auction'
import { Users, Mail, Trophy } from 'lucide-react'
import { createBrowserClient } from '@supabase/ssr'

interface TeamSetupStepProps {
  teams: TeamsFormData
  teamCount: number
  onChange: (teams: TeamsFormData) => void
  onInitialize: (count: number) => void
  leagueId?: string
  errors?: Record<string, string[]>
}

export function TeamSetupStep({ teams, teamCount, onChange, onInitialize, leagueId, errors = {} }: TeamSetupStepProps) {
  const [leagueTeamsLoaded, setLeagueTeamsLoaded] = useState(false)

  // Initialize teams — prefer league's existing teams if available
  useEffect(() => {
    if (teams.length > 0 || leagueTeamsLoaded) return

    if (leagueId) {
      loadLeagueTeams()
    } else if (teamCount > 0) {
      onInitialize(teamCount)
    }
  }, [teams.length, teamCount, leagueId, leagueTeamsLoaded])

  const loadLeagueTeams = async () => {
    try {
      const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
      const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
      if (!supabaseUrl || !supabaseKey || supabaseUrl.includes('your-project')) {
        onInitialize(teamCount)
        return
      }

      const supabase = createBrowserClient(supabaseUrl, supabaseKey)

      // Fetch teams from the most recent auction in this league
      const { data: auctionData } = await supabase
        .from('auctions')
        .select('id')
        .eq('league_id', leagueId)
        .order('created_at', { ascending: false })
        .limit(1)
        .single()

      if (auctionData) {
        const { data: teamsData } = await supabase
          .from('teams')
          .select('name')
          .eq('auction_id', auctionData.id)

        if (teamsData && teamsData.length > 0) {
          const leagueTeams: TeamsFormData = teamsData.map(t => ({
            name: t.name,
            captainEmail: undefined,
          }))
          onChange(leagueTeams)
          setLeagueTeamsLoaded(true)
          return
        }
      }

      // No previous auction teams found — fall back to default init
      onInitialize(teamCount)
    } catch (error) {
      console.error('Failed to load league teams:', error)
      onInitialize(teamCount)
    } finally {
      setLeagueTeamsLoaded(true)
    }
  }

  const handleTeamChange = (index: number, field: keyof TeamFormData, value: string) => {
    const updatedTeams = [...teams]
    updatedTeams[index] = {
      ...updatedTeams[index],
      [field]: value
    }
    onChange(updatedTeams)
  }

  const getFieldError = (teamIndex: number, field: string) => {
    return errors[`teams.${teamIndex}.${field}`]?.[0] || errors[`${teamIndex}.${field}`]?.[0]
  }

  const resetToDefaults = () => {
    const resetTeams = teams.map((team, index) => ({
      ...team,
      name: `Team ${index + 1}`,
    }))
    onChange(resetTeams)
  }

  if (teams.length === 0) {
    return (
      <WizardStep
        title="Team Setup"
        description="Configure your teams and assign captains"
        errors={errors}
      >
        <Card>
          <CardContent className="p-8 text-center">
            <Users className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">Initializing Teams...</h3>
            <p className="text-muted-foreground">
              Setting up {teamCount} teams with default configurations.
            </p>
          </CardContent>
        </Card>
      </WizardStep>
    )
  }

  return (
    <WizardStep
      title="Team Setup"
      description={`Configure your ${teams.length} teams and assign captains`}
      errors={errors}
    >
      <div className="space-y-6">
        {/* Action Bar */}
        <div className="flex justify-between items-center">
          <div className="flex items-center space-x-2 text-sm text-muted-foreground">
            <Trophy className="h-4 w-4" />
            <span>{teams.length} teams configured</span>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={resetToDefaults}
            className="text-xs"
          >
            Reset to Defaults
          </Button>
        </div>

        {/* Teams Grid */}
        <div className="grid gap-6">
          {teams.map((team, index) => (
            <Card key={index} className="relative">
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Team {index + 1}</CardTitle>
                <CardDescription>
                  Configure team identity and assign a captain
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {/* Team Name */}
                  <div className="space-y-2">
                    <Label htmlFor={`team-name-${index}`}>Team Name</Label>
                    <Input
                      id={`team-name-${index}`}
                      placeholder={`Team ${index + 1}`}
                      maxLength={50}
                      value={team.name || ''}
                      onChange={(e) => handleTeamChange(index, 'name', e.target.value)}
                      className={getFieldError(index, 'name') ? 'border-destructive' : ''}
                    />
                    {getFieldError(index, 'name') && (
                      <p className="text-sm text-destructive">{getFieldError(index, 'name')}</p>
                    )}
                  </div>

                  {/* Captain Email */}
                  <div className="space-y-2">
                    <Label htmlFor={`captain-email-${index}`}>
                      <div className="flex items-center space-x-1">
                        <Mail className="h-3 w-3" />
                        <span>Captain Email (Optional)</span>
                      </div>
                    </Label>
                    <Input
                      id={`captain-email-${index}`}
                      type="email"
                      placeholder="captain@example.com"
                      value={team.captainEmail || ''}
                      onChange={(e) => handleTeamChange(index, 'captainEmail', e.target.value)}
                      className={getFieldError(index, 'captainEmail') ? 'border-destructive' : ''}
                    />
                    {getFieldError(index, 'captainEmail') && (
                      <p className="text-sm text-destructive">{getFieldError(index, 'captainEmail')}</p>
                    )}
                  </div>
                </div>

              </CardContent>
            </Card>
          ))}
        </div>

        {/* Team Setup Tips */}
        <Card className="border-info/30 bg-info/10">
          <CardHeader>
            <CardTitle className="text-info-foreground flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>Team Setup Tips</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-info-foreground space-y-2">
            <ul className="list-disc list-inside space-y-1">
              <li>
                <strong>Team Names:</strong> Choose memorable names that reflect your league's personality
              </li>
              <li>
                <strong>Captain Emails:</strong> Captains will receive auction invites and have bidding access
              </li>
              <li>
                <strong>Add Captains Later:</strong> You can always add or change captain emails after creating the auction
              </li>
            </ul>
          </CardContent>
        </Card>
      </div>
    </WizardStep>
  )
}