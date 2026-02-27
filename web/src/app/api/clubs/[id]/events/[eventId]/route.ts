import { getAuthenticatedUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { updateEventSchema } from '@/lib/validations/event'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

interface RouteParams {
  params: Promise<{ id: string; eventId: string }>
}

// GET /api/clubs/[id]/events/[eventId] - Get a single event with RSVPs
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = getAuthenticatedUser(request)
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { eventId } = await params
    const supabase = await createClient()

    const { data: event, error } = await supabase
      .from('club_events')
      .select(`
        *,
        creator:users!created_by(id, name, image),
        event_rsvps(id, user_id, status, responded_at, user:users(id, name, image))
      `)
      .eq('id', eventId)
      .maybeSingle()

    if (error || !event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    const rsvps = event.event_rsvps || []
    return NextResponse.json({
      event: {
        id: event.id,
        clubId: event.club_id,
        title: event.title,
        description: event.description,
        eventType: event.event_type,
        location: event.location,
        startsAt: event.starts_at,
        endsAt: event.ends_at,
        createdBy: event.created_by,
        creator: event.creator,
        createdAt: event.created_at,
        updatedAt: event.updated_at,
        rsvps,
        rsvpCounts: {
          going: rsvps.filter((r: { status: string }) => r.status === 'GOING').length,
          maybe: rsvps.filter((r: { status: string }) => r.status === 'MAYBE').length,
          notGoing: rsvps.filter((r: { status: string }) => r.status === 'NOT_GOING').length,
        },
        currentUserRsvp: rsvps.find(
          (r: { user_id: string }) => r.user_id === userId
        )?.status || null,
      },
    })
  } catch (error) {
    console.error('Failed to fetch event:', error)
    return NextResponse.json({ error: 'Failed to fetch event' }, { status: 500 })
  }
}

// PUT /api/clubs/[id]/events/[eventId] - Update an event
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = getAuthenticatedUser(request)
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { id: clubId, eventId } = await params
    const body = await request.json()
    const validated = updateEventSchema.parse(body)

    const supabase = await createClient()

    // Verify admin access
    const { data: membership } = await supabase
      .from('club_memberships')
      .select('role')
      .eq('club_id', clubId)
      .eq('user_id', userId)
      .maybeSingle()

    const { data: club } = await supabase
      .from('clubs')
      .select('owner_id')
      .eq('id', clubId)
      .maybeSingle()

    const isOwner = club?.owner_id === userId
    const isAdmin = membership?.role === 'OWNER' || membership?.role === 'ADMIN'

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: 'Only club owners and admins can update events' }, { status: 403 })
    }

    // Build update object with snake_case keys
    const updateData: Record<string, unknown> = {}
    if (validated.title !== undefined) updateData.title = validated.title
    if (validated.description !== undefined) updateData.description = validated.description
    if (validated.eventType !== undefined) updateData.event_type = validated.eventType
    if (validated.location !== undefined) updateData.location = validated.location
    if (validated.startsAt !== undefined) updateData.starts_at = validated.startsAt
    if (validated.endsAt !== undefined) updateData.ends_at = validated.endsAt

    const { data: event, error } = await supabase
      .from('club_events')
      .update(updateData)
      .eq('id', eventId)
      .eq('club_id', clubId)
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({ event })
  } catch (error) {
    console.error('Failed to update event:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.issues }, { status: 400 })
    }

    return NextResponse.json({ error: 'Failed to update event' }, { status: 500 })
  }
}

// DELETE /api/clubs/[id]/events/[eventId] - Delete an event
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = getAuthenticatedUser(request)
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { id: clubId, eventId } = await params
    const supabase = await createClient()

    // Verify admin access
    const { data: membership } = await supabase
      .from('club_memberships')
      .select('role')
      .eq('club_id', clubId)
      .eq('user_id', userId)
      .maybeSingle()

    const { data: club } = await supabase
      .from('clubs')
      .select('owner_id')
      .eq('id', clubId)
      .maybeSingle()

    const isOwner = club?.owner_id === userId
    const isAdmin = membership?.role === 'OWNER' || membership?.role === 'ADMIN'

    if (!isOwner && !isAdmin) {
      return NextResponse.json({ error: 'Only club owners and admins can delete events' }, { status: 403 })
    }

    const { error } = await supabase
      .from('club_events')
      .delete()
      .eq('id', eventId)
      .eq('club_id', clubId)

    if (error) {
      throw error
    }

    return NextResponse.json({ message: 'Event deleted' })
  } catch (error) {
    console.error('Failed to delete event:', error)
    return NextResponse.json({ error: 'Failed to delete event' }, { status: 500 })
  }
}
