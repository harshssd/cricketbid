import { getAuthenticatedUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { createEventSchema } from '@/lib/validations/event'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// GET /api/clubs/[id]/events - List events for a club
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = getAuthenticatedUser(request)
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { id: clubId } = await params
    const supabase = await createClient()
    const { searchParams } = new URL(request.url)
    const upcoming = searchParams.get('upcoming') === 'true'

    let query = supabase
      .from('club_events')
      .select(`
        *,
        creator:users!created_by(id, name, image),
        event_rsvps(id, user_id, status)
      `)
      .eq('club_id', clubId)

    if (upcoming) {
      query = query
        .gte('starts_at', new Date().toISOString())
        .order('starts_at', { ascending: true })
    } else {
      query = query.order('starts_at', { ascending: false })
    }

    const { data: events, error } = await query

    if (error) {
      throw error
    }

    // Transform and add RSVP counts + current user's RSVP
    const transformed = (events || []).map((event) => {
      const rsvps = event.event_rsvps || []
      return {
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
        rsvpCounts: {
          going: rsvps.filter((r: { status: string }) => r.status === 'GOING').length,
          maybe: rsvps.filter((r: { status: string }) => r.status === 'MAYBE').length,
          notGoing: rsvps.filter((r: { status: string }) => r.status === 'NOT_GOING').length,
        },
        currentUserRsvp: rsvps.find(
          (r: { user_id: string }) => r.user_id === userId
        )?.status || null,
      }
    })

    return NextResponse.json({ events: transformed })
  } catch (error) {
    console.error('Failed to fetch events:', error)
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 })
  }
}

// POST /api/clubs/[id]/events - Create a new event
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = getAuthenticatedUser(request)
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { id: clubId } = await params
    const body = await request.json()
    const validated = createEventSchema.parse(body)

    const supabase = await createClient()

    // Verify user has admin access to this club
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
      return NextResponse.json(
        { error: 'Only club owners and admins can create events' },
        { status: 403 }
      )
    }

    const { data: event, error } = await supabase
      .from('club_events')
      .insert({
        club_id: clubId,
        title: validated.title,
        description: validated.description,
        event_type: validated.eventType,
        location: validated.location,
        starts_at: validated.startsAt,
        ends_at: validated.endsAt,
        created_by: userId,
      })
      .select()
      .single()

    if (error) {
      throw error
    }

    return NextResponse.json({ event }, { status: 201 })
  } catch (error) {
    console.error('Failed to create event:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.issues }, { status: 400 })
    }

    return NextResponse.json({ error: 'Failed to create event' }, { status: 500 })
  }
}
