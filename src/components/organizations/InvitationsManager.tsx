'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Mail,
  Clock,
  Check,
  X,
  AlertCircle,
  Crown,
  Shield,
  Settings,
  Users,
  MoreHorizontal,
  RefreshCw,
  Copy,
  ExternalLink
} from 'lucide-react'
import { toast } from 'sonner'
import { OrganizationRole } from '@/lib/types'
import InvitationDialog from './InvitationDialog'

interface OrganizationInvite {
  id: string
  email: string
  role: OrganizationRole
  status: 'PENDING' | 'ACCEPTED' | 'DECLINED' | 'EXPIRED'
  message?: string
  invitedBy: {
    name: string
    email: string
  }
  invitedAt: Date
  expiresAt: Date
  respondedAt?: Date
}

interface InvitationsManagerProps {
  organizationType: 'league' | 'club'
  organizationId: string
  organizationName: string
  organizationCode: string
  userRole: OrganizationRole
  canInvite?: boolean
}

export default function InvitationsManager({
  organizationType,
  organizationId,
  organizationName,
  organizationCode,
  userRole,
  canInvite = true
}: InvitationsManagerProps) {
  const [invitations, setInvitations] = useState<OrganizationInvite[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showInviteDialog, setShowInviteDialog] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    loadInvitations()
  }, [organizationId])

  const loadInvitations = async () => {
    try {
      // Mock data for now - replace with actual API calls
      const mockInvitations: OrganizationInvite[] = [
        {
          id: '1',
          email: 'john.doe@example.com',
          role: 'MEMBER',
          status: 'PENDING',
          message: 'Welcome to our cricket league! Looking forward to having you join us.',
          invitedBy: {
            name: 'Admin User',
            email: 'admin@cricketbid.com'
          },
          invitedAt: new Date('2024-02-10'),
          expiresAt: new Date('2024-02-24')
        },
        {
          id: '2',
          email: 'jane.smith@example.com',
          role: 'MODERATOR',
          status: 'ACCEPTED',
          invitedBy: {
            name: 'Admin User',
            email: 'admin@cricketbid.com'
          },
          invitedAt: new Date('2024-02-08'),
          expiresAt: new Date('2024-02-22'),
          respondedAt: new Date('2024-02-09')
        },
        {
          id: '3',
          email: 'bob.wilson@example.com',
          role: 'ADMIN',
          status: 'DECLINED',
          invitedBy: {
            name: 'Owner User',
            email: 'owner@cricketbid.com'
          },
          invitedAt: new Date('2024-02-05'),
          expiresAt: new Date('2024-02-19'),
          respondedAt: new Date('2024-02-07')
        },
        {
          id: '4',
          email: 'alice.brown@example.com',
          role: 'MEMBER',
          status: 'EXPIRED',
          invitedBy: {
            name: 'Admin User',
            email: 'admin@cricketbid.com'
          },
          invitedAt: new Date('2024-01-20'),
          expiresAt: new Date('2024-02-03')
        }
      ]

      setInvitations(mockInvitations)
    } catch (error) {
      console.error('Failed to load invitations:', error)
      setError('Failed to load invitations')
    } finally {
      setIsLoading(false)
    }
  }

  const resendInvitation = async (inviteId: string) => {
    try {
      // TODO: Replace with actual API call
      console.log('Resending invitation:', inviteId)

      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Update the invitation status
      setInvitations(prev => prev.map(invite =>
        invite.id === inviteId
          ? {
              ...invite,
              status: 'PENDING',
              invitedAt: new Date(),
              expiresAt: new Date(Date.now() + 14 * 24 * 60 * 60 * 1000) // 14 days from now
            }
          : invite
      ))

      toast.success('Invitation resent successfully!')
    } catch (error) {
      console.error('Failed to resend invitation:', error)
      toast.error('Failed to resend invitation')
    }
  }

  const cancelInvitation = async (inviteId: string) => {
    try {
      // TODO: Replace with actual API call
      console.log('Canceling invitation:', inviteId)

      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 1000))

      // Remove the invitation
      setInvitations(prev => prev.filter(invite => invite.id !== inviteId))

      toast.success('Invitation canceled successfully!')
    } catch (error) {
      console.error('Failed to cancel invitation:', error)
      toast.error('Failed to cancel invitation')
    }
  }

  const copyInviteLink = (inviteId: string) => {
    const link = `${window.location.origin}/invite/${inviteId}`
    navigator.clipboard.writeText(link)
    toast.success('Invitation link copied to clipboard!')
  }

  const getRoleIcon = (role: OrganizationRole) => {
    switch (role) {
      case 'OWNER':
        return <Crown className="h-4 w-4 text-yellow-600" />
      case 'ADMIN':
        return <Shield className="h-4 w-4 text-blue-600" />
      case 'MODERATOR':
        return <Settings className="h-4 w-4 text-green-600" />
      default:
        return <Users className="h-4 w-4 text-gray-600" />
    }
  }

  const getRoleBadgeColor = (role: OrganizationRole) => {
    switch (role) {
      case 'OWNER':
        return 'bg-yellow-100 text-yellow-800 border-yellow-200'
      case 'ADMIN':
        return 'bg-blue-100 text-blue-800 border-blue-200'
      case 'MODERATOR':
        return 'bg-green-100 text-green-800 border-green-200'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-200'
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'PENDING':
        return <Badge className="bg-orange-100 text-orange-800"><Clock className="h-3 w-3 mr-1" />Pending</Badge>
      case 'ACCEPTED':
        return <Badge className="bg-green-100 text-green-800"><Check className="h-3 w-3 mr-1" />Accepted</Badge>
      case 'DECLINED':
        return <Badge className="bg-red-100 text-red-800"><X className="h-3 w-3 mr-1" />Declined</Badge>
      case 'EXPIRED':
        return <Badge className="bg-gray-100 text-gray-800"><AlertCircle className="h-3 w-3 mr-1" />Expired</Badge>
      default:
        return <Badge variant="secondary">{status}</Badge>
    }
  }

  const filteredInvitations = invitations
  const pendingCount = invitations.filter(i => i.status === 'PENDING').length
  const acceptedCount = invitations.filter(i => i.status === 'ACCEPTED').length

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center space-x-2">
                <Mail className="h-5 w-5" />
                <span>Invitations</span>
              </CardTitle>
              <CardDescription>
                Manage member invitations for {organizationName}
              </CardDescription>
            </div>
            <div className="flex items-center space-x-3">
              <Button
                variant="outline"
                size="sm"
                onClick={loadInvitations}
                disabled={isLoading}
              >
                <RefreshCw className="h-4 w-4 mr-2" />
                Refresh
              </Button>
              {canInvite && (
                <Button
                  onClick={() => setShowInviteDialog(true)}
                  size="sm"
                >
                  <Mail className="h-4 w-4 mr-2" />
                  Send Invites
                </Button>
              )}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-6">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {/* Summary Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-3 bg-gray-50 rounded-lg">
              <div className="text-2xl font-bold text-gray-900">{invitations.length}</div>
              <div className="text-sm text-gray-600">Total Invites</div>
            </div>
            <div className="text-center p-3 bg-orange-50 rounded-lg">
              <div className="text-2xl font-bold text-orange-700">{pendingCount}</div>
              <div className="text-sm text-gray-600">Pending</div>
            </div>
            <div className="text-center p-3 bg-green-50 rounded-lg">
              <div className="text-2xl font-bold text-green-700">{acceptedCount}</div>
              <div className="text-sm text-gray-600">Accepted</div>
            </div>
            <div className="text-center p-3 bg-red-50 rounded-lg">
              <div className="text-2xl font-bold text-red-700">
                {invitations.filter(i => i.status === 'DECLINED').length}
              </div>
              <div className="text-sm text-gray-600">Declined</div>
            </div>
          </div>

          {/* Invitations List */}
          {filteredInvitations.length > 0 ? (
            <div className="space-y-4">
              {filteredInvitations.map((invitation) => (
                <div
                  key={invitation.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-gray-50"
                >
                  <div className="flex items-center space-x-4">
                    <Avatar className="h-10 w-10">
                      <AvatarFallback>
                        {invitation.email.charAt(0).toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <div className="font-medium">{invitation.email}</div>
                      <div className="text-sm text-gray-500">
                        Invited by {invitation.invitedBy.name} • {invitation.invitedAt.toLocaleDateString()}
                        {invitation.status === 'PENDING' && (
                          <span> • Expires {invitation.expiresAt.toLocaleDateString()}</span>
                        )}
                        {invitation.respondedAt && (
                          <span> • Responded {invitation.respondedAt.toLocaleDateString()}</span>
                        )}
                      </div>
                      {invitation.message && (
                        <div className="text-sm text-gray-600 mt-1 max-w-md">
                          "{invitation.message}"
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-3">
                    <Badge className={`text-xs ${getRoleBadgeColor(invitation.role)}`}>
                      {getRoleIcon(invitation.role)}
                      <span className="ml-1">{invitation.role}</span>
                    </Badge>
                    {getStatusBadge(invitation.status)}
                    <div className="flex items-center space-x-1">
                      {invitation.status === 'PENDING' && canInvite && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyInviteLink(invitation.id)}
                            className="h-8 w-8 p-0"
                          >
                            <Copy className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => resendInvitation(invitation.id)}
                            className="h-8 w-8 p-0"
                          >
                            <RefreshCw className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => cancelInvitation(invitation.id)}
                            className="h-8 w-8 p-0 text-red-600 hover:text-red-700"
                          >
                            <X className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      {(invitation.status === 'EXPIRED' || invitation.status === 'DECLINED') && canInvite && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => resendInvitation(invitation.id)}
                          className="h-8 w-8 p-0"
                        >
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Mail className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No invitations yet</h3>
              <p className="text-gray-500 mb-4">
                Start inviting people to join your {organizationType}
              </p>
              {canInvite && (
                <Button onClick={() => setShowInviteDialog(true)}>
                  <Mail className="h-4 w-4 mr-2" />
                  Send First Invitation
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Invitation Dialog */}
      {canInvite && (
        <InvitationDialog
          open={showInviteDialog}
          onOpenChange={setShowInviteDialog}
          organizationType={organizationType}
          organizationName={organizationName}
          organizationCode={organizationCode}
          onInvitesSent={(invites) => {
            // Refresh invitations list after sending
            loadInvitations()
          }}
        />
      )}
    </>
  )
}