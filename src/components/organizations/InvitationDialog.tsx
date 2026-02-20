'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Mail, X, AlertCircle, CheckCircle, Users, Crown, Shield, Settings } from 'lucide-react'
import { toast } from 'sonner'
import { OrganizationRole } from '@/lib/types'

interface InvitationDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  organizationType: 'league' | 'club'
  organizationName: string
  organizationCode: string
  onInvitesSent?: (invites: OrganizationInvite[]) => void
}

interface OrganizationInvite {
  email: string
  role: OrganizationRole
  message?: string
}

const ROLE_OPTIONS: Array<{ value: OrganizationRole; label: string; description: string; icon: typeof Crown }> = [
  {
    value: 'MEMBER',
    label: 'Member',
    description: 'Can participate in auctions and view content',
    icon: Users
  },
  {
    value: 'MODERATOR',
    label: 'Moderator',
    description: 'Can manage auctions and moderate discussions',
    icon: Settings
  },
  {
    value: 'ADMIN',
    label: 'Admin',
    description: 'Can manage members and organization settings',
    icon: Shield
  },
  {
    value: 'OWNER',
    label: 'Owner',
    description: 'Full control over the organization',
    icon: Crown
  }
]

export default function InvitationDialog({
  open,
  onOpenChange,
  organizationType,
  organizationName,
  organizationCode,
  onInvitesSent
}: InvitationDialogProps) {
  const [invites, setInvites] = useState<OrganizationInvite[]>([])
  const [currentEmail, setCurrentEmail] = useState('')
  const [currentRole, setCurrentRole] = useState<OrganizationRole>('MEMBER')
  const [inviteMessage, setInviteMessage] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')

  const validateEmail = (email: string): boolean => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  }

  const addInvite = () => {
    setError('')

    if (!currentEmail.trim()) {
      setError('Please enter an email address')
      return
    }

    if (!validateEmail(currentEmail)) {
      setError('Please enter a valid email address')
      return
    }

    if (invites.some(invite => invite.email === currentEmail)) {
      setError('This email has already been added')
      return
    }

    const newInvite: OrganizationInvite = {
      email: currentEmail,
      role: currentRole,
      message: inviteMessage.trim() || undefined
    }

    setInvites(prev => [...prev, newInvite])
    setCurrentEmail('')
    setInviteMessage('')
    setError('')
  }

  const removeInvite = (email: string) => {
    setInvites(prev => prev.filter(invite => invite.email !== email))
  }

  const updateInviteRole = (email: string, role: OrganizationRole) => {
    setInvites(prev => prev.map(invite =>
      invite.email === email ? { ...invite, role } : invite
    ))
  }

  const sendInvitations = async () => {
    if (invites.length === 0) {
      setError('Please add at least one invitation')
      return
    }

    setIsLoading(true)
    setError('')
    setSuccess('')

    try {
      // TODO: Replace with actual API call
      console.log('Sending invitations:', {
        organizationType,
        organizationCode,
        invites
      })

      // Mock API call
      await new Promise(resolve => setTimeout(resolve, 2000))

      setSuccess(`Successfully sent ${invites.length} invitation${invites.length > 1 ? 's' : ''}!`)
      toast.success(`Invitations sent successfully!`)

      onInvitesSent?.(invites)

      // Reset form after success
      setTimeout(() => {
        setInvites([])
        setCurrentEmail('')
        setCurrentRole('MEMBER')
        setInviteMessage('')
        setSuccess('')
        onOpenChange(false)
      }, 2000)

    } catch (error) {
      console.error('Failed to send invitations:', error)
      setError('Failed to send invitations. Please try again.')
      toast.error('Failed to send invitations')
    } finally {
      setIsLoading(false)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      addInvite()
    }
  }

  const getRoleIcon = (role: OrganizationRole) => {
    const roleOption = ROLE_OPTIONS.find(option => option.value === role)
    const IconComponent = roleOption?.icon || Users
    return <IconComponent className="h-4 w-4" />
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

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Mail className="h-5 w-5 text-blue-600" />
            <span>Invite Members to {organizationName}</span>
          </DialogTitle>
          <DialogDescription>
            Invite people to join your {organizationType}. They will receive an email invitation
            and can accept to become a member.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Add New Invitation */}
          <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
            <div>
              <Label htmlFor="email" className="text-sm font-medium">
                Email Address *
              </Label>
              <Input
                id="email"
                type="email"
                value={currentEmail}
                onChange={(e) => setCurrentEmail(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Enter email address"
                className="mt-1"
              />
            </div>

            <div>
              <Label htmlFor="role" className="text-sm font-medium">
                Role *
              </Label>
              <Select value={currentRole} onValueChange={(value) => setCurrentRole(value as OrganizationRole)}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select a role" />
                </SelectTrigger>
                <SelectContent>
                  {ROLE_OPTIONS.map((role) => {
                    const IconComponent = role.icon
                    return (
                      <SelectItem key={role.value} value={role.value}>
                        <div className="flex items-center space-x-2">
                          <IconComponent className="h-4 w-4" />
                          <div>
                            <div className="font-medium">{role.label}</div>
                            <div className="text-xs text-gray-500">{role.description}</div>
                          </div>
                        </div>
                      </SelectItem>
                    )
                  })}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="message" className="text-sm font-medium">
                Personal Message (Optional)
              </Label>
              <Textarea
                id="message"
                value={inviteMessage}
                onChange={(e) => setInviteMessage(e.target.value)}
                placeholder="Add a personal message to the invitation..."
                rows={2}
                className="mt-1"
              />
            </div>

            <Button onClick={addInvite} className="w-full">
              <Mail className="h-4 w-4 mr-2" />
              Add Invitation
            </Button>
          </div>

          {/* Current Invitations */}
          {invites.length > 0 && (
            <div>
              <Label className="text-sm font-medium text-gray-900">
                Pending Invitations ({invites.length})
              </Label>
              <div className="mt-2 space-y-2 max-h-60 overflow-y-auto">
                {invites.map((invite, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between p-3 bg-white border rounded-lg"
                  >
                    <div className="flex items-center space-x-3">
                      <div className="flex-shrink-0">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          <Mail className="h-4 w-4 text-blue-600" />
                        </div>
                      </div>
                      <div>
                        <div className="font-medium text-sm">{invite.email}</div>
                        {invite.message && (
                          <div className="text-xs text-gray-500 mt-1">
                            "{invite.message}"
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Select
                        value={invite.role}
                        onValueChange={(value) => updateInviteRole(invite.email, value as OrganizationRole)}
                      >
                        <SelectTrigger className="w-32">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {ROLE_OPTIONS.map((role) => (
                            <SelectItem key={role.value} value={role.value}>
                              {role.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <Badge className={`text-xs ${getRoleBadgeColor(invite.role)}`}>
                        {getRoleIcon(invite.role)}
                        <span className="ml-1">{invite.role}</span>
                      </Badge>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeInvite(invite.email)}
                        className="h-8 w-8 p-0"
                      >
                        <X className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Error/Success Messages */}
          {error && (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          {success && (
            <Alert className="border-green-200 bg-green-50">
              <CheckCircle className="h-4 w-4 text-green-600" />
              <AlertDescription className="text-green-800">{success}</AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
          >
            Cancel
          </Button>
          <Button
            onClick={sendInvitations}
            disabled={isLoading || invites.length === 0}
          >
            {isLoading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />
                Sending...
              </>
            ) : (
              <>
                <Mail className="h-4 w-4 mr-2" />
                Send {invites.length} Invitation{invites.length !== 1 ? 's' : ''}
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}