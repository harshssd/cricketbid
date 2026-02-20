'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { Crown, User, Users, AlertTriangle, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'

interface User {
  id: string
  name: string
  email: string
  image?: string
  currentRole?: 'CAPTAIN' | 'VICE_CAPTAIN' | 'PLAYER'
}

interface Team {
  id: string
  name: string
  type: 'AUCTION' | 'CLUB' | 'LEAGUE'
}

interface CaptainOptions {
  eligibleMembers: User[]
  currentCaptain?: User
  teamInfo: Team
}

interface CaptainAssignmentDialogProps {
  team: Team
  open: boolean
  onOpenChange: (open: boolean) => void
  onCaptainAssigned?: (captain: User | null) => void
}

export function CaptainAssignmentDialog({
  team,
  open,
  onOpenChange,
  onCaptainAssigned
}: CaptainAssignmentDialogProps) {
  const [captainOptions, setCaptainOptions] = useState<CaptainOptions | null>(null)
  const [selectedCaptainId, setSelectedCaptainId] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [assignLoading, setAssignLoading] = useState(false)

  // Fetch captain assignment options when dialog opens
  useEffect(() => {
    if (open && team.id) {
      fetchCaptainOptions()
    }
  }, [open, team.id, team.type])

  const fetchCaptainOptions = async () => {
    try {
      setLoading(true)
      const response = await fetch(
        `/api/teams/${team.id}/captain?teamType=${team.type}`
      )
      const data = await response.json()

      if (data.success) {
        setCaptainOptions(data)
        setSelectedCaptainId(data.currentCaptain?.id || '')
      }
    } catch (error) {
      console.error('Failed to fetch captain options:', error)
      toast.error('Failed to load team members')
    } finally {
      setLoading(false)
    }
  }

  const handleAssignCaptain = async () => {
    try {
      setAssignLoading(true)
      const response = await fetch(`/api/teams/${team.id}/captain`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          captainId: selectedCaptainId || undefined,
          teamType: team.type,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to assign captain')
      }

      const data = await response.json()

      if (data.success) {
        toast.success(data.message)

        // Find the selected captain from options
        const selectedCaptain = selectedCaptainId
          ? captainOptions?.eligibleMembers.find(member => member.id === selectedCaptainId) || null
          : null

        onCaptainAssigned?.(selectedCaptain)
        onOpenChange(false)
      }
    } catch (error) {
      console.error('Failed to assign captain:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to assign captain')
    } finally {
      setAssignLoading(false)
    }
  }

  const getTeamTypeBadge = () => {
    switch (team.type) {
      case 'AUCTION':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700">Auction Team</Badge>
      case 'CLUB':
        return <Badge variant="outline" className="bg-green-50 text-green-700">Club Team</Badge>
      case 'LEAGUE':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700">League Team</Badge>
    }
  }

  const selectedMember = captainOptions?.eligibleMembers.find(
    member => member.id === selectedCaptainId
  )

  const hasChanges = selectedCaptainId !== (captainOptions?.currentCaptain?.id || '')

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Assign Team Captain</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Team Info */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-lg">{team.name}</CardTitle>
                {getTeamTypeBadge()}
              </div>
            </CardHeader>
            {captainOptions?.currentCaptain && (
              <CardContent className="pt-0">
                <div className="flex items-center gap-3">
                  <Avatar className="w-8 h-8">
                    <AvatarImage src={captainOptions.currentCaptain.image} />
                    <AvatarFallback className="text-sm">
                      {captainOptions.currentCaptain.name.charAt(0).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <span className="font-medium">{captainOptions.currentCaptain.name}</span>
                      <Crown className="w-4 h-4 text-yellow-600" />
                    </div>
                    <p className="text-sm text-muted-foreground">Current Captain</p>
                  </div>
                </div>
              </CardContent>
            )}
          </Card>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : !captainOptions ? (
            <div className="text-center py-8 text-muted-foreground">
              <AlertTriangle className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Failed to load team members</p>
            </div>
          ) : (
            <>
              {/* Captain Selection */}
              <div className="space-y-4">
                <div>
                  <Label>Select Captain</Label>
                  <Select value={selectedCaptainId} onValueChange={setSelectedCaptainId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a team member as captain" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">No captain</SelectItem>
                      {captainOptions.eligibleMembers.map((member) => (
                        <SelectItem key={member.id} value={member.id}>
                          <div className="flex items-center gap-2">
                            <Avatar className="w-6 h-6">
                              <AvatarImage src={member.image} />
                              <AvatarFallback className="text-xs">
                                {member.name.charAt(0).toUpperCase()}
                              </AvatarFallback>
                            </Avatar>
                            <div className="flex flex-col">
                              <span>{member.name}</span>
                              <span className="text-xs text-muted-foreground">{member.email}</span>
                            </div>
                            {member.currentRole === 'CAPTAIN' && (
                              <Crown className="w-3 h-3 text-yellow-600" />
                            )}
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {/* Selected Member Preview */}
                {selectedMember && (
                  <Card className="bg-muted/30">
                    <CardHeader className="pb-3">
                      <CardTitle className="text-base flex items-center gap-2">
                        <Crown className="w-4 h-4 text-yellow-600" />
                        New Captain
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center gap-3">
                        <Avatar className="w-10 h-10">
                          <AvatarImage src={selectedMember.image} />
                          <AvatarFallback>
                            {selectedMember.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1">
                          <h4 className="font-medium">{selectedMember.name}</h4>
                          <p className="text-sm text-muted-foreground">{selectedMember.email}</p>
                          {selectedMember.currentRole && (
                            <Badge variant="outline" className="text-xs mt-1">
                              Current: {selectedMember.currentRole}
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )}

                {/* No Captain Selected */}
                {selectedCaptainId === '' && (
                  <Card className="bg-muted/30">
                    <CardContent className="pt-6">
                      <div className="text-center text-muted-foreground">
                        <User className="w-8 h-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No captain will be assigned</p>
                      </div>
                    </CardContent>
                  </Card>
                )}
              </div>

              {/* Team Members Summary */}
              <div className="space-y-3">
                <Separator />
                <div className="flex items-center justify-between text-sm">
                  <span className="text-muted-foreground">Team Members</span>
                  <div className="flex items-center gap-1">
                    <Users className="w-4 h-4" />
                    <span>{captainOptions.eligibleMembers.length}</span>
                  </div>
                </div>

                <div className="space-y-2 max-h-32 overflow-y-auto">
                  {captainOptions.eligibleMembers.map((member) => (
                    <div key={member.id} className="flex items-center justify-between text-sm">
                      <div className="flex items-center gap-2">
                        <Avatar className="w-5 h-5">
                          <AvatarImage src={member.image} />
                          <AvatarFallback className="text-xs">
                            {member.name.charAt(0).toUpperCase()}
                          </AvatarFallback>
                        </Avatar>
                        <span>{member.name}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        {member.currentRole === 'CAPTAIN' && (
                          <Crown className="w-3 h-3 text-yellow-600" />
                        )}
                        <Badge variant="outline" className="text-xs">
                          {member.currentRole || 'PLAYER'}
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleAssignCaptain}
                  disabled={!hasChanges || assignLoading}
                  className="bg-primary"
                >
                  {assignLoading ? 'Assigning...' : hasChanges ? 'Update Captain' : 'No Changes'}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}