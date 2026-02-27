'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'
import type { EventType } from '@/lib/types'

interface EventFormProps {
  clubId: string
  open: boolean
  onOpenChange: (open: boolean) => void
  onSuccess: () => void
  initialData?: {
    id: string
    title: string
    description?: string | null
    eventType: EventType
    location?: string | null
    startsAt: string
    endsAt?: string | null
  }
}

export function EventForm({
  clubId,
  open,
  onOpenChange,
  onSuccess,
  initialData,
}: EventFormProps) {
  const isEditing = !!initialData
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [title, setTitle] = useState(initialData?.title || '')
  const [description, setDescription] = useState(initialData?.description || '')
  const [eventType, setEventType] = useState<EventType>(initialData?.eventType || 'PRACTICE')
  const [location, setLocation] = useState(initialData?.location || '')
  const [startsAt, setStartsAt] = useState(
    initialData?.startsAt
      ? new Date(initialData.startsAt).toISOString().slice(0, 16)
      : ''
  )
  const [endsAt, setEndsAt] = useState(
    initialData?.endsAt
      ? new Date(initialData.endsAt).toISOString().slice(0, 16)
      : ''
  )

  const handleSubmit = async () => {
    if (!title.trim()) {
      toast.error('Title is required')
      return
    }
    if (!startsAt) {
      toast.error('Start date/time is required')
      return
    }

    setIsSubmitting(true)
    try {
      const payload = {
        title: title.trim(),
        description: description.trim() || undefined,
        eventType,
        location: location.trim() || undefined,
        startsAt: new Date(startsAt).toISOString(),
        endsAt: endsAt ? new Date(endsAt).toISOString() : undefined,
      }

      const url = isEditing
        ? `/api/clubs/${clubId}/events/${initialData.id}`
        : `/api/clubs/${clubId}/events`
      const method = isEditing ? 'PUT' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || `Failed to ${isEditing ? 'update' : 'create'} event`)
      }

      toast.success(`Event ${isEditing ? 'updated' : 'created'} successfully`)
      onSuccess()
      onOpenChange(false)
      resetForm()
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Something went wrong')
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    if (!isEditing) {
      setTitle('')
      setDescription('')
      setEventType('PRACTICE')
      setLocation('')
      setStartsAt('')
      setEndsAt('')
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Edit Event' : 'Create Event'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Update the event details.' : 'Schedule a new event for your club.'}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label htmlFor="event-title">Title</Label>
            <Input
              id="event-title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Saturday Practice Session"
            />
          </div>
          <div>
            <Label htmlFor="event-type">Type</Label>
            <Select value={eventType} onValueChange={(v) => setEventType(v as EventType)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PRACTICE">Practice</SelectItem>
                <SelectItem value="MATCH">Match</SelectItem>
                <SelectItem value="SOCIAL">Social</SelectItem>
                <SelectItem value="OTHER">Other</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label htmlFor="event-description">Description (optional)</Label>
            <Textarea
              id="event-description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="What should members know about this event?"
              rows={3}
            />
          </div>
          <div>
            <Label htmlFor="event-location">Location (optional)</Label>
            <Input
              id="event-location"
              value={location}
              onChange={(e) => setLocation(e.target.value)}
              placeholder="e.g., Central Park Cricket Ground"
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="event-starts">Starts at</Label>
              <Input
                id="event-starts"
                type="datetime-local"
                value={startsAt}
                onChange={(e) => setStartsAt(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="event-ends">Ends at (optional)</Label>
              <Input
                id="event-ends"
                type="datetime-local"
                value={endsAt}
                onChange={(e) => setEndsAt(e.target.value)}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            {isEditing ? 'Update Event' : 'Create Event'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
