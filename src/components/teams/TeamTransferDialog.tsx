'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Checkbox } from '@/components/ui/checkbox'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Separator } from '@/components/ui/separator'
import { ArrowRight, Users, Crown, ExternalLink, AlertTriangle, CheckCircle } from 'lucide-react'
import { toast } from 'sonner'

interface User {
  id: string
  name: string
  email: string
  image?: string
}

interface TransferTarget {
  id: string
  name: string
  logo?: string
  _count: {
    teams: number
  }
}

interface Team {
  id: string
  name: string
  description?: string
  primaryColor: string
  secondaryColor: string
  logo?: string
  captain?: User
  sourceType?: 'CLUB' | 'LEAGUE' | 'AUCTION'
  sourceId?: string
  _count?: {
    members: number
  }
}

interface TransferOptions {
  availableTargets: {
    clubs?: TransferTarget[]
    leagues?: TransferTarget[]
  }
  validTransfers: {
    toClub: boolean
    toLeague: boolean
  }
}

interface TeamTransferDialogProps {
  team: Team
  fromType: 'AUCTION' | 'CLUB' | 'LEAGUE'
  open: boolean
  onOpenChange: (open: boolean) => void
  onTransferComplete?: (transferResult: any) => void
  availableMembers?: User[]
}

export function TeamTransferDialog({
  team,
  fromType,
  open,
  onOpenChange,
  onTransferComplete,
  availableMembers = []
}: TeamTransferDialogProps) {
  const [transferOptions, setTransferOptions] = useState<TransferOptions | null>(null)
  const [selectedTargetType, setSelectedTargetType] = useState<'CLUB' | 'LEAGUE' | ''>('')
  const [selectedTargetId, setSelectedTargetId] = useState('')
  const [preserveMembers, setPreserveMembers] = useState(false)
  const [newCaptainId, setNewCaptainId] = useState('')
  const [loading, setLoading] = useState(false)
  const [transferLoading, setTransferLoading] = useState(false)

  // Fetch transfer options when dialog opens
  useEffect(() => {
    if (open && team.id) {
      fetchTransferOptions()
    }
  }, [open, team.id, fromType])

  const fetchTransferOptions = async () => {
    try {
      setLoading(true)
      const response = await fetch(
        `/api/teams/transfer?teamId=${team.id}&fromType=${fromType}`
      )
      const data = await response.json()

      if (data.success) {
        setTransferOptions(data)
      }
    } catch (error) {
      console.error('Failed to fetch transfer options:', error)
      toast.error('Failed to load transfer options')
    } finally {
      setLoading(false)
    }
  }

  const handleTransfer = async () => {
    if (!selectedTargetType || !selectedTargetId) {
      toast.error('Please select a target to transfer to')
      return
    }

    try {
      setTransferLoading(true)
      const response = await fetch('/api/teams/transfer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromType,
          toType: selectedTargetType,
          teamId: team.id,
          targetId: selectedTargetId,
          preserveMembers,
          newCaptainId: newCaptainId || undefined,
        }),
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to transfer team')
      }

      const data = await response.json()

      if (data.success) {
        toast.success(data.message)
        onTransferComplete?.(data.transfer)
        onOpenChange(false)

        // Reset form
        setSelectedTargetType('')
        setSelectedTargetId('')
        setPreserveMembers(false)
        setNewCaptainId('')
      }
    } catch (error) {
      console.error('Failed to transfer team:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to transfer team')
    } finally {
      setTransferLoading(false)
    }
  }

  const getSourceTypeBadge = () => {
    switch (fromType) {
      case 'AUCTION':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-700">Auction Team</Badge>
      case 'CLUB':
        return <Badge variant="outline" className="bg-green-50 text-green-700">Club Team</Badge>
      case 'LEAGUE':
        return <Badge variant="outline" className="bg-blue-50 text-blue-700">League Team</Badge>
    }
  }

  const getTargetOptions = () => {
    if (!transferOptions) return []

    const options: { type: 'CLUB' | 'LEAGUE', targets: TransferTarget[] }[] = []

    if (transferOptions.validTransfers.toClub && transferOptions.availableTargets.clubs) {
      options.push({ type: 'CLUB', targets: transferOptions.availableTargets.clubs })
    }

    if (transferOptions.validTransfers.toLeague && transferOptions.availableTargets.leagues) {
      options.push({ type: 'LEAGUE', targets: transferOptions.availableTargets.leagues })
    }

    return options
  }

  const selectedTarget = transferOptions?.availableTargets[
    selectedTargetType === 'CLUB' ? 'clubs' : 'leagues'
  ]?.find(target => target.id === selectedTargetId)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Transfer Team</DialogTitle>
        </DialogHeader>

        <div className="space-y-6">
          {/* Team Info */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="w-6 h-6 rounded-full border-2 border-white shadow-sm"
                    style={{ backgroundColor: team.primaryColor }}
                  />
                  <div>
                    <CardTitle className="text-lg">{team.name}</CardTitle>
                    {team.description && (
                      <p className="text-sm text-muted-foreground mt-1">{team.description}</p>
                    )}
                  </div>
                </div>
                {getSourceTypeBadge()}
              </div>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="flex items-center gap-4">
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
                {team._count && (
                  <div className="flex items-center gap-1 text-sm text-muted-foreground">
                    <Users className="w-3 h-3" />
                    {team._count.members} members
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
            </div>
          ) : !transferOptions ? (
            <div className="text-center py-8 text-muted-foreground">
              <AlertTriangle className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>Failed to load transfer options</p>
            </div>
          ) : (
            <>
              {/* Target Selection */}
              <div className="space-y-4">
                <div>
                  <Label>Transfer Target Type</Label>
                  <Select value={selectedTargetType} onValueChange={(value: 'CLUB' | 'LEAGUE') => {
                    setSelectedTargetType(value)
                    setSelectedTargetId('')
                  }}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select target type" />
                    </SelectTrigger>
                    <SelectContent>
                      {transferOptions.validTransfers.toClub && (
                        <SelectItem value="CLUB">Transfer to Club</SelectItem>
                      )}
                      {transferOptions.validTransfers.toLeague && (
                        <SelectItem value="LEAGUE">Transfer to League</SelectItem>
                      )}
                    </SelectContent>
                  </Select>
                </div>

                {selectedTargetType && (
                  <div>
                    <Label>Select {selectedTargetType === 'CLUB' ? 'Club' : 'League'}</Label>
                    <Select value={selectedTargetId} onValueChange={setSelectedTargetId}>
                      <SelectTrigger>
                        <SelectValue placeholder={`Select a ${selectedTargetType.toLowerCase()}`} />
                      </SelectTrigger>
                      <SelectContent>
                        {getTargetOptions()
                          .find(option => option.type === selectedTargetType)
                          ?.targets.map((target) => (
                            <SelectItem key={target.id} value={target.id}>
                              <div className="flex items-center gap-2">
                                <span>{target.name}</span>
                                <span className="text-xs text-muted-foreground">
                                  ({target._count.teams} teams)
                                </span>
                              </div>
                            </SelectItem>
                          ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
              </div>

              {/* Transfer Preview */}
              {selectedTarget && (
                <Card className="bg-muted/30">
                  <CardHeader className="pb-3">
                    <CardTitle className="text-base flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-600" />
                      Transfer Preview
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="flex items-center gap-4">
                      <div className="text-center">
                        <div className="flex items-center gap-2 mb-2">
                          <div
                            className="w-4 h-4 rounded-full"
                            style={{ backgroundColor: team.primaryColor }}
                          />
                          <span className="font-medium">{team.name}</span>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {fromType}
                        </Badge>
                      </div>

                      <ArrowRight className="w-6 h-6 text-muted-foreground" />

                      <div className="text-center">
                        <div className="flex items-center gap-2 mb-2">
                          <ExternalLink className="w-4 h-4" />
                          <span className="font-medium">{selectedTarget.name}</span>
                        </div>
                        <Badge variant="outline" className="text-xs">
                          {selectedTargetType}
                        </Badge>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Transfer Options */}
              <div className="space-y-4">
                <Separator />

                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      checked={preserveMembers}
                      onCheckedChange={(checked) => setPreserveMembers(checked === true)}
                    />
                    <Label className="text-sm">
                      Transfer all team members to the new team
                    </Label>
                  </div>

                  {preserveMembers && availableMembers.length > 0 && (
                    <div>
                      <Label>Reassign Captain (Optional)</Label>
                      <Select value={newCaptainId} onValueChange={setNewCaptainId}>
                        <SelectTrigger>
                          <SelectValue placeholder="Keep current captain" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Keep current captain</SelectItem>
                          {availableMembers.map((member) => (
                            <SelectItem key={member.id} value={member.id}>
                              {member.name} ({member.email})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </div>
              </div>

              {/* Warning */}
              <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                <div className="flex items-start gap-3">
                  <AlertTriangle className="w-5 h-5 text-yellow-600 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-yellow-800">Transfer Warning</h4>
                    <p className="text-sm text-yellow-700 mt-1">
                      This action will transfer the team to a new context and mark the original team as inactive.
                      This action cannot be undone.
                    </p>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex justify-end gap-2 pt-4 border-t">
                <Button variant="outline" onClick={() => onOpenChange(false)}>
                  Cancel
                </Button>
                <Button
                  onClick={handleTransfer}
                  disabled={!selectedTargetType || !selectedTargetId || transferLoading}
                  className="bg-primary"
                >
                  {transferLoading ? 'Transferring...' : 'Transfer Team'}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}