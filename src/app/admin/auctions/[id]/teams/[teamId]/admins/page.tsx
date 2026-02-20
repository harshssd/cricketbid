'use client'

import { useState, useEffect } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Separator } from '@/components/ui/separator'
import {
  Shield, UserPlus, Trash2, Crown, Users, ArrowLeft, AlertCircle
} from 'lucide-react'
import { toast } from 'sonner'

interface TeamAdmin {
  id: string
  name: string
  email: string
  image?: string
  role: string
  source: 'team_captain' | 'team_member'
}

interface AdminData {
  teamId: string
  teamName: string
  admins: TeamAdmin[]
  canManage: boolean
}

export default function TeamAdminsPage() {
  const params = useParams()
  const router = useRouter()
  const auctionId = params.id as string
  const teamId = params.teamId as string

  const [adminData, setAdminData] = useState<AdminData | null>(null)
  const [loading, setLoading] = useState(true)
  const [addAdminOpen, setAddAdminOpen] = useState(false)
  const [removeAdminId, setRemoveAdminId] = useState<string | null>(null)
  const [changeCaptainOpen, setChangeCaptainOpen] = useState(false)
  const [newAdminEmail, setNewAdminEmail] = useState('')
  const [newAdminRole, setNewAdminRole] = useState<'CAPTAIN' | 'VICE_CAPTAIN'>('VICE_CAPTAIN')
  const [newCaptainId, setNewCaptainId] = useState('')
  const [submitting, setSubmitting] = useState(false)

  // Load team admins
  const loadAdmins = async () => {
    try {
      setLoading(true)
      const response = await fetch(`/api/auctions/${auctionId}/teams/${teamId}/admins`)

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to load team admins')
      }

      const data = await response.json()
      setAdminData(data)
    } catch (error) {
      console.error('Failed to load team admins:', error)
      toast.error(error instanceof Error ? error.message : 'Failed to load team admins')
      router.back()
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (auctionId && teamId) {
      loadAdmins()
    }
  }, [auctionId, teamId])

  // Add admin
  const handleAddAdmin = async () => {
    if (!newAdminEmail.trim()) {
      toast.error('Please enter an email address')
      return
    }

    try {
      setSubmitting(true)
      const response = await fetch(`/api/auctions/${auctionId}/teams/${teamId}/admins`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userEmail: newAdminEmail,
          role: newAdminRole
        })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to add admin')
      }

      const result = await response.json()
      toast.success(result.message)

      // Reset form and close dialog
      setNewAdminEmail('')
      setNewAdminRole('VICE_CAPTAIN')
      setAddAdminOpen(false)

      // Reload admins
      await loadAdmins()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to add admin')
    } finally {
      setSubmitting(false)
    }
  }

  // Remove admin
  const handleRemoveAdmin = async () => {
    if (!removeAdminId) return

    try {
      setSubmitting(true)
      const response = await fetch(`/api/auctions/${auctionId}/teams/${teamId}/admins`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: removeAdminId })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to remove admin')
      }

      const result = await response.json()
      toast.success(result.message)

      setRemoveAdminId(null)
      await loadAdmins()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to remove admin')
    } finally {
      setSubmitting(false)
    }
  }

  // Change team captain
  const handleChangeCaptain = async () => {
    if (!newCaptainId) {
      toast.error('Please select a new captain')
      return
    }

    try {
      setSubmitting(true)
      const response = await fetch(`/api/auctions/${auctionId}/teams/${teamId}/captain`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newCaptainId })
      })

      if (!response.ok) {
        const error = await response.json()
        throw new Error(error.error || 'Failed to change captain')
      }

      const result = await response.json()
      toast.success(result.message)

      setChangeCaptainOpen(false)
      setNewCaptainId('')
      await loadAdmins()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to change captain')
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 p-8 flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
      </div>
    )
  }

  if (!adminData) {
    return (
      <div className="min-h-screen bg-gray-50 p-8 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-12 h-12 mx-auto mb-4 text-red-500" />
          <h1 className="text-xl font-semibold mb-2">Team Not Found</h1>
          <p className="text-muted-foreground mb-4">Unable to load team admin data.</p>
          <Button onClick={() => router.back()}>Go Back</Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
          <Button variant="outline" size="sm" onClick={() => router.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-2">
              <Shield className="w-6 h-6" />
              Team Administrators
            </h1>
            <p className="text-muted-foreground">Manage {adminData.teamName} bidding access</p>
          </div>
        </div>

        {/* Permission Check */}
        {!adminData.canManage && (
          <Card className="mb-6 border-amber-200 bg-amber-50">
            <CardContent className="p-4">
              <div className="flex items-center gap-2 text-amber-800">
                <AlertCircle className="w-4 h-4" />
                <p className="text-sm">
                  You can view team admins but cannot make changes. Only auction owners and team captains can manage admins.
                </p>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Current Admins */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5" />
                  Current Administrators ({adminData.admins.length})
                </CardTitle>
                <CardDescription>
                  Users who can access the team's bidding interface
                </CardDescription>
              </div>
              {adminData.canManage && (
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => setChangeCaptainOpen(true)}>
                    <Crown className="w-4 h-4 mr-2" />
                    Change Captain
                  </Button>
                  <Button onClick={() => setAddAdminOpen(true)}>
                    <UserPlus className="w-4 h-4 mr-2" />
                    Add Admin
                  </Button>
                </div>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {adminData.admins.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Shield className="w-12 h-12 mx-auto mb-4 opacity-50" />
                <p>No administrators configured</p>
                <p className="text-sm">Add team admins to allow bidding interface access</p>
              </div>
            ) : (
              <div className="space-y-4">
                {adminData.admins.map((admin) => (
                  <div key={admin.id} className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50 hover:border-gray-300 transition-colors">
                    <div className="flex items-center gap-3">
                      <Avatar>
                        <AvatarImage src={admin.image} />
                        <AvatarFallback>
                          {admin.name.charAt(0).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium flex items-center gap-2">
                          {admin.name}
                          {admin.source === 'team_captain' && (
                            <Crown className="w-4 h-4 text-yellow-600" />
                          )}
                        </p>
                        <p className="text-sm text-muted-foreground">{admin.email}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <Badge variant={admin.role === 'CAPTAIN' ? 'default' : 'secondary'}>
                          {admin.role.replace('_', ' ')}
                        </Badge>
                        <p className="text-xs text-muted-foreground mt-1">
                          {admin.source === 'team_captain' ? 'Team Captain' : 'Team Member'}
                        </p>
                      </div>
                      {adminData.canManage && admin.source !== 'team_captain' && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="text-red-600 hover:text-red-700 hover:bg-red-50"
                          onClick={() => setRemoveAdminId(admin.id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Info Card */}
        <Card className="mt-6">
          <CardHeader>
            <CardTitle className="text-lg">How Team Admin Access Works</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4 text-sm">
            <div>
              <h4 className="font-medium mb-2">📋 Access Levels:</h4>
              <ul className="space-y-1 text-muted-foreground ml-4">
                <li>• <strong>Team Captain</strong>: Set in team settings, highest authority</li>
                <li>• <strong>Vice Captain</strong>: Added here, can access bidding interface</li>
                <li>• <strong>Auction Admins</strong>: Owners/moderators have access to all teams</li>
              </ul>
            </div>
            <div>
              <h4 className="font-medium mb-2">🔗 Bidding Access:</h4>
              <ul className="space-y-1 text-muted-foreground ml-4">
                <li>• All administrators can use the same team bidding URL</li>
                <li>• System automatically verifies their authorization when they log in</li>
                <li>• Bids are attributed to the actual user who placed them</li>
              </ul>
            </div>
          </CardContent>
        </Card>

        {/* Add Admin Dialog */}
        <Dialog open={addAdminOpen} onOpenChange={setAddAdminOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Team Administrator</DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="email">User Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="Enter user's email address"
                  value={newAdminEmail}
                  onChange={(e) => setNewAdminEmail(e.target.value)}
                />
              </div>
              <div>
                <Label>Admin Role</Label>
                <Select value={newAdminRole} onValueChange={(value: 'CAPTAIN' | 'VICE_CAPTAIN') => setNewAdminRole(value)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="VICE_CAPTAIN">Vice Captain</SelectItem>
                    <SelectItem value="CAPTAIN">Captain</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setAddAdminOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddAdmin} disabled={submitting}>
                  {submitting ? 'Adding...' : 'Add Admin'}
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>

        {/* Remove Admin Dialog */}
        <Dialog open={!!removeAdminId} onOpenChange={(open) => !open && setRemoveAdminId(null)}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="text-red-600">Remove Administrator</DialogTitle>
            </DialogHeader>
            <p>Are you sure you want to remove this user from team administrators? They will no longer be able to access the bidding interface.</p>
            <DialogFooter>
              <Button variant="outline" onClick={() => setRemoveAdminId(null)}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleRemoveAdmin} disabled={submitting}>
                {submitting ? 'Removing...' : 'Remove Admin'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Change Captain Dialog */}
        <Dialog open={changeCaptainOpen} onOpenChange={setChangeCaptainOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Crown className="w-5 h-5 text-yellow-600" />
                Change Team Captain
              </DialogTitle>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Select New Captain</Label>
                <Select value={newCaptainId} onValueChange={setNewCaptainId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Choose from current admins" />
                  </SelectTrigger>
                  <SelectContent>
                    {adminData?.admins
                      .filter(admin => admin.source !== 'team_captain')
                      .map((admin) => (
                        <SelectItem key={admin.id} value={admin.id}>
                          <div className="flex items-center gap-2">
                            <span>{admin.name}</span>
                            <Badge variant="secondary" className="text-xs">
                              {admin.role.replace('_', ' ')}
                            </Badge>
                          </div>
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
                <p className="text-sm text-muted-foreground mt-2">
                  The current captain will become a regular admin after this change.
                </p>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setChangeCaptainOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleChangeCaptain} disabled={submitting || !newCaptainId}>
                  {submitting ? 'Changing...' : 'Change Captain'}
                </Button>
              </DialogFooter>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  )
}