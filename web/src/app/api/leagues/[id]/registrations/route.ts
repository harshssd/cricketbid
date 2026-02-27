import { getAuthenticatedUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { tournamentRegistrationSchema } from '@/lib/validations/tournament'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

// GET /api/leagues/[id]/registrations - List registrations (owner only)
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = getAuthenticatedUser(request)
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { id: leagueId } = await params
    const supabase = await createClient()

    // Verify ownership
    const { data: league } = await supabase
      .from('leagues')
      .select('owner_id')
      .eq('id', leagueId)
      .maybeSingle()

    if (!league) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 })
    }
    if (league.owner_id !== userId) {
      return NextResponse.json({ error: 'Only tournament owners can view registrations' }, { status: 403 })
    }

    const { data: registrations, error } = await supabase
      .from('tournament_registrations')
      .select('*')
      .eq('league_id', leagueId)
      .order('created_at', { ascending: false })

    if (error) throw error

    return NextResponse.json({ registrations: registrations || [] })
  } catch (error) {
    console.error('Failed to fetch registrations:', error)
    return NextResponse.json({ error: 'Failed to fetch registrations' }, { status: 500 })
  }
}

// POST /api/leagues/[id]/registrations - Register a team
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { userId } = getAuthenticatedUser(request)
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { id: leagueId } = await params
    const body = await request.json()
    const validated = tournamentRegistrationSchema.parse(body)

    const supabase = await createClient()

    // Verify tournament exists and registration is open
    const { data: league } = await supabase
      .from('leagues')
      .select('id, registration_status')
      .eq('id', leagueId)
      .maybeSingle()

    if (!league) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 })
    }
    if (league.registration_status === 'CLOSED') {
      return NextResponse.json({ error: 'Registration is closed for this tournament' }, { status: 400 })
    }

    const { data: registration, error } = await supabase
      .from('tournament_registrations')
      .insert({
        league_id: leagueId,
        team_name: validated.teamName,
        contact_name: validated.contactName,
        contact_email: validated.contactEmail,
        contact_phone: validated.contactPhone,
        notes: validated.notes,
        user_id: userId,
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ registration }, { status: 201 })
  } catch (error) {
    console.error('Failed to register:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.issues }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to register' }, { status: 500 })
  }
}
