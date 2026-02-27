import { getAuthenticatedUser } from '@/lib/auth'
import { createClient } from '@/lib/supabase/server'
import { updateRegistrationStatusSchema } from '@/lib/validations/tournament'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

interface RouteParams {
  params: Promise<{ id: string; regId: string }>
}

// PUT /api/leagues/[id]/registrations/[regId] - Approve/reject a registration
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { userId } = getAuthenticatedUser(request)
    if (!userId) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 })
    }

    const { id: leagueId, regId } = await params
    const body = await request.json()
    const { status } = updateRegistrationStatusSchema.parse(body)

    const supabase = await createClient()

    // Verify ownership
    const { data: league } = await supabase
      .from('leagues')
      .select('owner_id')
      .eq('id', leagueId)
      .maybeSingle()

    if (!league || league.owner_id !== userId) {
      return NextResponse.json({ error: 'Only tournament owners can manage registrations' }, { status: 403 })
    }

    const { data: registration, error } = await supabase
      .from('tournament_registrations')
      .update({ status })
      .eq('id', regId)
      .eq('league_id', leagueId)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json({ registration })
  } catch (error) {
    console.error('Failed to update registration:', error)
    if (error instanceof z.ZodError) {
      return NextResponse.json({ error: 'Validation error', details: error.issues }, { status: 400 })
    }
    return NextResponse.json({ error: 'Failed to update registration' }, { status: 500 })
  }
}
