'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { toast } from 'sonner'
import { Loader2, UserPlus } from 'lucide-react'

interface RegistrationFormProps {
  leagueId: string
  isAuthenticated: boolean
  registrationOpen: boolean
}

export function RegistrationForm({
  leagueId,
  isAuthenticated,
  registrationOpen,
}: RegistrationFormProps) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [teamName, setTeamName] = useState('')
  const [contactName, setContactName] = useState('')
  const [contactEmail, setContactEmail] = useState('')
  const [contactPhone, setContactPhone] = useState('')
  const [notes, setNotes] = useState('')

  if (!registrationOpen) {
    return (
      <Card className="border-white/[0.06] bg-white/[0.02]">
        <CardContent className="p-6 text-center">
          <p className="text-muted-foreground">Registration is not currently open for this tournament.</p>
        </CardContent>
      </Card>
    )
  }

  if (submitted) {
    return (
      <Card className="border-green-500/20 bg-green-500/5">
        <CardContent className="p-6 text-center">
          <UserPlus className="h-8 w-8 text-green-400 mx-auto mb-3" />
          <h3 className="font-semibold text-foreground mb-1">Registration Submitted!</h3>
          <p className="text-sm text-muted-foreground">
            Your team registration is pending approval from the tournament organizer.
          </p>
        </CardContent>
      </Card>
    )
  }

  const handleSubmit = async () => {
    if (!isAuthenticated) {
      router.push(`/auth/signin?redirect=/tournament/${leagueId}`)
      return
    }

    if (!teamName.trim() || !contactName.trim() || !contactEmail.trim()) {
      toast.error('Please fill in all required fields')
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch(`/api/leagues/${leagueId}/registrations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamName: teamName.trim(),
          contactName: contactName.trim(),
          contactEmail: contactEmail.trim(),
          contactPhone: contactPhone.trim() || undefined,
          notes: notes.trim() || undefined,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to register')
      }

      setSubmitted(true)
      toast.success('Team registered successfully!')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Registration failed')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <Card className="border-white/[0.06] bg-white/[0.02]">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <UserPlus className="h-5 w-5" />
          Register Your Team
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div>
          <Label htmlFor="reg-team-name">Team Name *</Label>
          <Input
            id="reg-team-name"
            value={teamName}
            onChange={(e) => setTeamName(e.target.value)}
            placeholder="Enter your team name"
          />
        </div>
        <div>
          <Label htmlFor="reg-contact-name">Contact Name *</Label>
          <Input
            id="reg-contact-name"
            value={contactName}
            onChange={(e) => setContactName(e.target.value)}
            placeholder="Team captain or manager"
          />
        </div>
        <div>
          <Label htmlFor="reg-contact-email">Contact Email *</Label>
          <Input
            id="reg-contact-email"
            type="email"
            value={contactEmail}
            onChange={(e) => setContactEmail(e.target.value)}
            placeholder="email@example.com"
          />
        </div>
        <div>
          <Label htmlFor="reg-contact-phone">Phone (optional)</Label>
          <Input
            id="reg-contact-phone"
            value={contactPhone}
            onChange={(e) => setContactPhone(e.target.value)}
            placeholder="+1 (555) 123-4567"
          />
        </div>
        <div>
          <Label htmlFor="reg-notes">Notes (optional)</Label>
          <Textarea
            id="reg-notes"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Anything the organizer should know?"
            rows={2}
          />
        </div>
        <Button onClick={handleSubmit} disabled={isSubmitting} className="w-full">
          {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
          {isAuthenticated ? 'Register Team' : 'Sign in to Register'}
        </Button>
      </CardContent>
    </Card>
  )
}
