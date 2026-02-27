import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getAuthenticatedUser } from '@/lib/auth'
import { basicInfoSchema, auctionConfigSchema } from '@/lib/validations/auction'
import { z } from 'zod'

// Full auction creation schema
const createAuctionSchema = z.object({
  basicInfo: basicInfoSchema,
  leagueId: z.string().min(1, 'League is required'),
  config: auctionConfigSchema,
  biddingType: z.enum(['SEALED_TENDER', 'OPEN_OUTCRY']).default('SEALED_TENDER'),
  outcryConfig: z.object({
    rules: z.array(z.object({
      from_multiplier: z.number(),
      to_multiplier: z.number(),
      increment: z.number().min(1),
    })),
    timer_seconds: z.number().nullable(),
  }).optional(),
  teams: z.array(z.object({
    name: z.string().min(1, 'Team name is required'),
  })).optional().default([]),
  tiers: z.array(z.object({
    name: z.string().min(1, 'Tier name is required'),
    basePrice: z.number().min(1, 'Base price must be positive'),
    color: z.string().default('#3B82F6'),
    icon: z.string().optional(),
    minPerTeam: z.number().min(0).default(0),
    maxPerTeam: z.number().optional(),
    sortOrder: z.number().min(0),
  })).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate the request body
    const validatedData = createAuctionSchema.parse(body)

    // Get the authenticated user from the request headers (set by middleware)
    const { userId } = getAuthenticatedUser(request)
    if (!userId) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const supabase = await createClient()

    // Verify the league exists
    const { data: league, error: leagueError } = await supabase
      .from('leagues')
      .select('id')
      .eq('id', validatedData.leagueId)
      .single()

    if (leagueError || !league) {
      return NextResponse.json({ error: 'League not found' }, { status: 404 })
    }

    // Create the auction
    const { data: auction, error: auctionError } = await supabase
      .from('auctions')
      .insert({
        name: validatedData.basicInfo.name,
        description: validatedData.basicInfo.description,
        owner_id: userId,
        league_id: validatedData.leagueId,
        visibility: validatedData.basicInfo.visibility,
        budget_per_team: validatedData.config.budgetPerTeam,
        currency_name: validatedData.config.currencyName,
        currency_icon: validatedData.config.currencyIcon,
        squad_size: validatedData.config.squadSize,
        bidding_type: validatedData.biddingType,
        outcry_config: validatedData.biddingType === 'OPEN_OUTCRY' ? validatedData.outcryConfig : null,
        status: 'DRAFT',
      })
      .select()
      .single()

    if (auctionError) throw auctionError

    // Create teams
    let teams: any[] = []
    if (validatedData.teams.length > 0) {
      const teamRows = validatedData.teams.map((team) => ({
        auction_id: auction.id,
        name: team.name,
      }))

      const { data: createdTeams, error: teamsError } = await supabase
        .from('teams')
        .insert(teamRows)
        .select()

      if (teamsError) throw teamsError
      teams = createdTeams || []
    }

    // Create tiers if provided
    let tiers: any[] = []
    if (validatedData.tiers && validatedData.tiers.length > 0) {
      const tierRows = validatedData.tiers.map((tier) => ({
        auction_id: auction.id,
        name: tier.name,
        base_price: tier.basePrice,
        color: tier.color,
        icon: tier.icon,
        sort_order: tier.sortOrder,
        min_per_team: tier.minPerTeam,
        max_per_team: tier.maxPerTeam,
      }))

      const { data: createdTiers, error: tiersError } = await supabase
        .from('tiers')
        .insert(tierRows)
        .select()

      if (tiersError) throw tiersError
      tiers = createdTiers || []
    }

    return NextResponse.json({
      id: auction.id,
      message: 'Auction created successfully',
      auction,
      teams,
      tiers,
    }, { status: 201 })

  } catch (error) {
    console.error('Auction creation error:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Validation error',
        details: error.issues
      }, { status: 400 })
    }

    return NextResponse.json({
      error: 'Failed to create auction',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}
