import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { basicInfoSchema, auctionConfigSchema } from '@/lib/validations/auction'
import { z } from 'zod'

// Full auction creation schema
const createAuctionSchema = z.object({
  basicInfo: basicInfoSchema,
  config: auctionConfigSchema,
  teams: z.array(z.object({
    name: z.string().min(1, 'Team name is required'),
    primaryColor: z.string().default('#3B82F6'),
    secondaryColor: z.string().default('#1B2A4A'),
    logo: z.string().optional(),
  })).min(2, 'At least 2 teams required'),
  tiers: z.array(z.object({
    name: z.string().min(1, 'Tier name is required'),
    basePrice: z.number().min(1, 'Base price must be positive'),
    color: z.string().default('#3B82F6'),
    icon: z.string().optional(),
    minPerTeam: z.number().min(0).default(0),
    maxPerTeam: z.number().optional(),
    sortOrder: z.number().min(0),
  })).optional(),
  branding: z.object({
    logo: z.string().optional(),
    banner: z.string().optional(),
    primaryColor: z.string().default('#1B2A4A'),
    secondaryColor: z.string().default('#3B82F6'),
    bgImage: z.string().optional(),
    font: z.string().default('system'),
    themePreset: z.string().optional(),
    tagline: z.string().optional(),
  }).optional(),
})

export async function POST(request: NextRequest) {
  try {
    const body = await request.json()

    // Validate the request body
    const validatedData = createAuctionSchema.parse(body)

    // For now, we'll use a mock user ID - in a real app, this would come from authentication
    const mockUserId = 'user_mock_123'

    // Create the auction in a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create the auction
      const auction = await tx.auction.create({
        data: {
          name: validatedData.basicInfo.name,
          description: validatedData.basicInfo.description,
          ownerId: mockUserId,
          scheduledAt: validatedData.basicInfo.scheduledAt || new Date(),
          timezone: validatedData.basicInfo.timezone || 'UTC',
          visibility: validatedData.basicInfo.visibility,
          passcode: validatedData.basicInfo.passcode,
          budgetPerTeam: validatedData.config.budgetPerTeam,
          currencyName: validatedData.config.currencyName,
          currencyIcon: validatedData.config.currencyIcon,
          squadSize: validatedData.config.squadSize,
          logo: validatedData.branding?.logo,
          banner: validatedData.branding?.banner,
          primaryColor: validatedData.branding?.primaryColor || '#1B2A4A',
          secondaryColor: validatedData.branding?.secondaryColor || '#3B82F6',
          bgImage: validatedData.branding?.bgImage,
          font: validatedData.branding?.font || 'system',
          themePreset: validatedData.branding?.themePreset,
          tagline: validatedData.branding?.tagline,
          status: 'DRAFT', // Start as draft
        }
      })

      // Create teams
      const teamPromises = validatedData.teams.map((team) =>
        tx.team.create({
          data: {
            auctionId: auction.id,
            name: team.name,
            primaryColor: team.primaryColor,
            secondaryColor: team.secondaryColor,
            logo: team.logo,
            budgetRemaining: validatedData.config.budgetPerTeam,
          }
        })
      )
      const teams = await Promise.all(teamPromises)

      // Create tiers if provided
      let tiers: any[] = []
      if (validatedData.tiers && validatedData.tiers.length > 0) {
        const tierPromises = validatedData.tiers.map((tier) =>
          tx.tier.create({
            data: {
              auctionId: auction.id,
              name: tier.name,
              basePrice: tier.basePrice,
              color: tier.color,
              icon: tier.icon,
              sortOrder: tier.sortOrder,
              minPerTeam: tier.minPerTeam,
              maxPerTeam: tier.maxPerTeam,
            }
          })
        )
        tiers = await Promise.all(tierPromises)
      }

      return { auction, teams, tiers }
    })

    return NextResponse.json({
      id: result.auction.id,
      message: 'Auction created successfully',
      auction: result.auction,
      teams: result.teams,
      tiers: result.tiers,
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