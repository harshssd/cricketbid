'use client'

import { useState, useEffect, useCallback } from 'react'
import { EventCard } from '@/components/events/EventCard'
import { EventForm } from '@/components/events/EventForm'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Calendar, Plus } from 'lucide-react'
import { toast } from 'sonner'
import type { EventType, RsvpStatus } from '@/lib/types'

interface EventData {
  id: string
  clubId: string
  title: string
  description?: string | null
  eventType: EventType
  location?: string | null
  startsAt: string
  endsAt?: string | null
  rsvpCounts: { going: number; maybe: number; notGoing: number }
  currentUserRsvp: RsvpStatus | null
}

interface EventListProps {
  clubId: string
  isAdmin: boolean
}

export function EventList({ clubId, isAdmin }: EventListProps) {
  const [events, setEvents] = useState<EventData[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showForm, setShowForm] = useState(false)
  const [editingEvent, setEditingEvent] = useState<EventData | null>(null)

  const fetchEvents = useCallback(async () => {
    try {
      const res = await fetch(`/api/clubs/${clubId}/events`)
      if (!res.ok) throw new Error('Failed to fetch events')
      const data = await res.json()
      setEvents(data.events || [])
    } catch (error) {
      console.error('Failed to load events:', error)
      toast.error('Failed to load events')
    } finally {
      setIsLoading(false)
    }
  }, [clubId])

  useEffect(() => {
    fetchEvents()
  }, [fetchEvents])

  const handleRsvp = async (eventId: string, status: RsvpStatus) => {
    try {
      const res = await fetch(`/api/clubs/${clubId}/events/${eventId}/rsvp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status }),
      })
      if (!res.ok) throw new Error('Failed to RSVP')
      toast.success(`RSVP updated to ${status.replace('_', ' ').toLowerCase()}`)
      fetchEvents()
    } catch (error) {
      toast.error('Failed to update RSVP')
    }
  }

  const handleDelete = async (eventId: string) => {
    if (!confirm('Are you sure you want to delete this event?')) return

    try {
      const res = await fetch(`/api/clubs/${clubId}/events/${eventId}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Failed to delete event')
      toast.success('Event deleted')
      fetchEvents()
    } catch (error) {
      toast.error('Failed to delete event')
    }
  }

  const handleEdit = (eventId: string) => {
    const event = events.find((e) => e.id === eventId)
    if (event) {
      setEditingEvent(event)
    }
  }

  if (isLoading) {
    return (
      <Card className="border-white/[0.06] bg-white/[0.02]">
        <CardContent className="p-6">
          <div className="flex items-center justify-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card className="border-white/[0.06] bg-white/[0.02]">
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Events
            </CardTitle>
            {isAdmin && (
              <Button size="sm" onClick={() => setShowForm(true)} className="gap-1">
                <Plus className="h-4 w-4" />
                New Event
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {events.length > 0 ? (
            <div className="space-y-3">
              {events.map((event) => (
                <EventCard
                  key={event.id}
                  id={event.id}
                  title={event.title}
                  description={event.description}
                  eventType={event.eventType}
                  location={event.location}
                  startsAt={event.startsAt}
                  endsAt={event.endsAt}
                  rsvpCounts={event.rsvpCounts}
                  currentUserRsvp={event.currentUserRsvp}
                  isAdmin={isAdmin}
                  onRsvp={handleRsvp}
                  onEdit={isAdmin ? handleEdit : undefined}
                  onDelete={isAdmin ? handleDelete : undefined}
                />
              ))}
            </div>
          ) : (
            <div className="text-center py-12">
              <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-medium text-foreground mb-2">No events yet</h3>
              <p className="text-muted-foreground mb-4">
                {isAdmin
                  ? 'Create your first event to get your club together.'
                  : 'No upcoming events scheduled.'}
              </p>
              {isAdmin && (
                <Button onClick={() => setShowForm(true)} className="gap-1">
                  <Plus className="h-4 w-4" />
                  Create Event
                </Button>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Create form */}
      <EventForm
        clubId={clubId}
        open={showForm}
        onOpenChange={setShowForm}
        onSuccess={fetchEvents}
      />

      {/* Edit form */}
      {editingEvent && (
        <EventForm
          clubId={clubId}
          open={!!editingEvent}
          onOpenChange={(open) => !open && setEditingEvent(null)}
          onSuccess={fetchEvents}
          initialData={editingEvent}
        />
      )}
    </>
  )
}
