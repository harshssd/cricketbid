import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { z } from 'zod'

const createClubTeamSchema = z.object({
  name: z.string().min(1, 'Team name is required'),
  description: z.string().optional(),
  primaryColor: z.string().default('#3B82F6'),
  secondaryColor: z.string().default('#1B2A4A'),
  logo: z.string().optional(),
  captainId: z.string().optional(),
  maxMembers: z.number().min(1).default(11),
})

const updateClubTeamSchema = createClubTeamSchema.partial().extend({
  id: z.string(),
  isActive: z.boolean().optional(),
})

// Create a new club team
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: clubId } = await params
    const body = await request.json()

    // Validate the request body
    const teamData = createClubTeamSchema.parse(body)

    // Check if club exists
    const club = await prisma.club.findUnique({
      where: { id: clubId },
      include: { _count: { select: { teams: true } } }
    })

    if (!club) {
      return NextResponse.json(
        { error: 'Club not found' },
        { status: 404 }
      )
    }

    // Create the team
    const team = await prisma.team.create({
      data: {
        ...teamData,
        clubId,
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
    console.error('Failed to create club team:', error)

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

// Get all teams for a club
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: clubId } = await params
    const { searchParams } = new URL(request.url)
    const includeInactive = searchParams.get('includeInactive') === 'true'

    const whereClause = {
      clubId,
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
    console.error('Failed to fetch club teams:', error)
    return NextResponse.json(
      { error: 'Failed to fetch teams' },
      { status: 500 }
    )
  }
}

// Update multiple teams or create/update/delete teams
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: clubId } = await params
    const body = await request.json()
    const { teams } = body

    if (!Array.isArray(teams)) {
      return NextResponse.json(
        { error: 'Teams must be an array' },
        { status: 400 }
      )
    }

    // Validate all teams
    const validatedTeams = teams.map(team => updateClubTeamSchema.parse(team))

    // Check if club exists
    const club = await prisma.club.findUnique({
      where: { id: clubId },
      include: { teams: true }
    })

    if (!club) {
      return NextResponse.json(
        { error: 'Club not found' },
        { status: 404 }
      )
    }

    // Process updates in a transaction
    const result = await prisma.$transaction(async (tx) => {
      const updatedTeams = []
      const existingTeamIds = club.teams.map(team => team.id)
      const providedTeamIds = validatedTeams
        .filter(team => team.id)
        .map(team => team.id!)

      // Update or create teams
      for (const teamData of validatedTeams) {
        const { id, ...updateData } = teamData

        if (id && existingTeamIds.includes(id)) {
          // Update existing team
          const updatedTeam = await tx.team.update({
            where: { id },
            data: updateData,
            include: {
              captain: { select: { id: true, name: true, email: true, image: true } },
              _count: { select: { members: true } }
            }
          })
          updatedTeams.push(updatedTeam)
        } else if (!id) {
          // Create new team - ensure required fields are present
          if (!updateData.name) {
            throw new Error('Team name is required when creating a new team')
          }

          const newTeam = await tx.team.create({
            data: {
              name: updateData.name,
              description: updateData.description,
              primaryColor: updateData.primaryColor || '#3B82F6',
              secondaryColor: updateData.secondaryColor || '#1B2A4A',
              logo: updateData.logo,
              captainId: updateData.captainId,
              maxMembers: updateData.maxMembers || 11,
              isActive: updateData.isActive ?? true,
              clubId,
            },
            include: {
              captain: { select: { id: true, name: true, email: true, image: true } },
              _count: { select: { members: true } }
            }
          })
          updatedTeams.push(newTeam)
        }
      }

      // Deactivate teams that are no longer in the list (soft delete)
      const teamsToDeactivate = existingTeamIds.filter(id => !providedTeamIds.includes(id))
      if (teamsToDeactivate.length > 0) {
        await tx.team.updateMany({
          where: { id: { in: teamsToDeactivate } },
          data: { isActive: false }
        })
      }

      return updatedTeams
    })

    return NextResponse.json({
      success: true,
      teams: result
    })

  } catch (error) {
    console.error('Failed to update club teams:', error)

    if (error instanceof z.ZodError) {
      return NextResponse.json({
        error: 'Validation error',
        details: error.issues
      }, { status: 400 })
    }

    return NextResponse.json({
      error: 'Failed to update teams',
      message: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 })
  }
}