import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const createLeagueTeamSchema = z.object({
  name: z.string().min(1, 'Team name is required'),
  description: z.string().optional(),
  primaryColor: z.string().default('#3B82F6'),
  secondaryColor: z.string().default('#1B2A4A'),
  logo: z.string().optional(),
  captainId: z.string().optional(),
  maxMembers: z.number().min(1).default(11),
})

const updateLeagueTeamSchema = createLeagueTeamSchema.partial().extend({
  id: z.string(),
  isActive: z.boolean().optional(),
})

// Create a new league team
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: leagueId } = await params
    const body = await request.json()

    // Validate the request body
    const teamData = createLeagueTeamSchema.parse(body)

    // Check if league exists
    const league = await prisma.league.findUnique({
      where: { id: leagueId },
      include: { _count: { select: { teams: true } } }
    })

    if (!league) {
      return NextResponse.json(
        { error: 'League not found' },
        { status: 404 }
      )
    }

    // Check team limit
    if (league.maxTeams && league._count.teams >= league.maxTeams) {
      return NextResponse.json(
        { error: `League is full. Maximum ${league.maxTeams} teams allowed.` },
        { status: 400 }
      )
    }

    // Create the team
    const team = await prisma.team.create({
      data: {
        name: teamData.name,
        description: teamData.description,
        primaryColor: teamData.primaryColor || '#3B82F6',
        secondaryColor: teamData.secondaryColor || '#1B2A4A',
        logo: teamData.logo,
        captainId: teamData.captainId,
        maxMembers: teamData.maxMembers || 11,
        isActive: true,
        leagueId,
      },
      include: {
        captain: { select: { id: true, name: true, email: true, image: true } },
        _count: { select: { members: true } }
      }
    })

    return NextResponse.json({
      success: true,
      team
    }, { status: 201 })

  } catch (error) {
    console.error('Failed to create league team:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Validation error',
        details: error.issues
      }, { status: 400 })
    }

    return NextResponse.json({
      error: 'Failed to create team',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}

// Get all teams for a league
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: leagueId } = await params
    const { searchParams } = new URL(request.url)
    const includeInactive = searchParams.get('includeInactive') === 'true'

    const whereClause = {
      leagueId,
      ...(includeInactive ? {} : { isActive: true })
    }

    const teams = await prisma.team.findMany({
      where: whereClause,
      include: {
        captain: {
          select: { id: true, name: true, email: true, image: true }
        },
        _count: {
          select: { members: true }
        }
      },
      orderBy: [
        { isActive: 'desc' },
        { createdAt: 'desc' }
      ]
    })

    return NextResponse.json({ teams })

  } catch (error) {
    console.error('Failed to fetch league teams:', error)
    return NextResponse.json(
      { error: 'Failed to fetch teams' },
      { status: 500 }
    )
  }
}

// Import teams from club
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: leagueId } = await params
    const body = await request.json()
    const { action, clubTeamIds } = body

    if (action !== 'import_from_club' || !Array.isArray(clubTeamIds)) {
      return NextResponse.json(
        { error: 'Invalid action or clubTeamIds' },
        { status: 400 }
      )
    }

    // Check if league exists
    const league = await prisma.league.findUnique({
      where: { id: leagueId },
      include: { _count: { select: { teams: true } } }
    })

    if (!league) {
      return NextResponse.json(
        { error: 'League not found' },
        { status: 404 }
      )
    }

    // Get club teams to import
    const clubTeams = await prisma.team.findMany({
      where: {
        id: { in: clubTeamIds },
        isActive: true,
        clubId: { not: null }
      },
      include: {
        captain: { select: { id: true, name: true, email: true, image: true } },
        club: { select: { name: true } }
      }
    })

    if (clubTeams.length === 0) {
      return NextResponse.json(
        { error: 'No valid club teams found' },
        { status: 404 }
      )
    }

    // Check team limit
    const totalAfterImport = league._count.teams + clubTeams.length
    if (league.maxTeams && totalAfterImport > league.maxTeams) {
      return NextResponse.json(
        { error: `Cannot import ${clubTeams.length} teams. League limit: ${league.maxTeams}, current: ${league._count.teams}` },
        { status: 400 }
      )
    }

    // Import teams in a transaction
    const importedTeams = await prisma.$transaction(async (tx) => {
      const teams = []

      for (const clubTeam of clubTeams) {
        // Check if already imported - skip this check for now as we don't have sourceId/sourceType fields
        const existingImport = await tx.team.findFirst({
          where: {
            leagueId,
            name: clubTeam.name
          }
        })

        if (existingImport) {
          continue // Skip if already imported
        }

        // Create league team from club team
        const leagueTeam = await tx.team.create({
          data: {
            leagueId,
            name: clubTeam.name,
            description: clubTeam.description,
            primaryColor: clubTeam.primaryColor,
            secondaryColor: clubTeam.secondaryColor,
            logo: clubTeam.logo,
            captainId: clubTeam.captainId,
            maxMembers: clubTeam.maxMembers,
            isActive: true
          },
          include: {
            captain: { select: { id: true, name: true, email: true, image: true } },
            _count: { select: { members: true } }
          }
        })

        teams.push(leagueTeam)
      }

      return teams
    })

    return NextResponse.json({
      success: true,
      importedTeams,
      message: `Successfully imported ${importedTeams.length} teams from clubs`
    })

  } catch (error) {
    console.error('Failed to import teams:', error)
    return NextResponse.json({
      error: 'Failed to import teams',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}