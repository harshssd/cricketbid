import { getAuthenticatedUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { rsvpSchema } from '@/lib/validations/event'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

interface RouteParams {
  params: Promise<{ id: string; eventId: string }>
}

// POST /api/clubs/[id]/events/[eventId]/rsvp - Set or update RSVP
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = getAuthenticatedUser(request)
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { id: clubId, eventId } = await params
    const body = await request.json()
    const { status } = rsvpSchema.parse(body)

    const supabase = await createClient()

    // Verify user is a club member
    const { data: membership } = await supabase
      .from('club_memberships')
      .select('id')
      .eq('club_id', clubId)
      .eq('user_id', userId)
      .maybeSingle()

    const { data: club } = await supabase
      .from('clubs')
      .select('owner_id')
      .eq('id', clubId)
      .maybeSingle()

    if (!membership && club?.owner_id !== userId) {
      return NextResponse.json({ error: 'Only club members can RSVP' }, { status: 403 })
    }

    // Verify event exists and belongs to this club
    const { data: event } = await supabase
      .from('club_events')
      .select('id')
      .eq('id', eventId)
      .eq('club_id', clubId)
      .maybeSingle()

    if (!event) {
      return NextResponse.json({ error: 'Event not found' }, { status: 404 })
    }

    // Upsert RSVP
    const { data: rsvp, error } = await supabase
      .from('event_rsvps')
      .upsert(
        {
          event_id: eventId,
          user_id: userId,
          status,
          responded_at: new Date().toISOString(),
        },
        { onConflict: 'event_id,user_id' }
      )
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({ rsvp })
  } catch (error) {
    console.error('Failed to RSVP:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.issues }, { status: 400 })
    }

    return NextResponse.json({ error: 'Failed to RSVP' }, { status: 500 })
  }
}

// DELETE /api/clubs/[id]/events/[eventId]/rsvp - Remove RSVP
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = getAuthenticatedUser(request)
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { eventId } = await params
    const supabase = await createClient()

    const { error } = await supabase
      .from('event_rsvps')
      .delete()
      .eq('event_id', eventId)
      .eq('user_id', userId)

    if (error) {
      throw error
    }

    return NextResponse.json({ message: 'RSVP removed' })
  } catch (error) {
    console.error('Failed to remove RSVP:', error)
    return NextResponse.json({ error: 'Failed to remove RSVP' }, { status: 500 })
  }
}
