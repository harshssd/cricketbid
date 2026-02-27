'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { LogIn, Check, Loader2 } from 'lucide-react'

interface JoinClubButtonProps {
  clubId: string
  isMember: boolean
  isAuthenticated: boolean
}

export function JoinClubButton({ clubId, isMember, isAuthenticated }: JoinClubButtonProps) {
  const router = useRouter()
  const [isJoining, setIsJoining] = useState(false)
  const [joined, setJoined] = useState(isMember)

  if (joined) {
    return (
      <Button variant="outline" disabled className="gap-2">
        <Check className="h-4 w-4" />
        Member
      </Button>
    )
  }

  const handleJoin = async () => {
    if (!isAuthenticated) {
      router.push(`/auth/signin?redirect=/explore`)
      return
    }

    setIsJoining(true)
    try {
      const res = await fetch(`/api/clubs/${clubId}/join`, {
        method: 'POST',
      })
      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to join club')
      }

      setJoined(true)
      toast.success(data.message || 'Successfully joined club!')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to join club')
    } finally {
      setIsJoining(false)
    }
  }

  return (
    <Button onClick={handleJoin} disabled={isJoining} className="gap-2">
      {isJoining ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <LogIn className="h-4 w-4" />
      )}
      {isAuthenticated ? 'Join Club' : 'Sign in to Join'}
    </Button>
  )
}
